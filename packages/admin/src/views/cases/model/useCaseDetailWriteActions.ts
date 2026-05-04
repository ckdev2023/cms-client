// ─── Write Action Helpers (p1-fe-001-02) ─────────────────────────
// 从 useCaseDetailModel 分离的写操作编排逻辑。
// 职责：feedback 状态管理 + 各 write action 的 async 编排。

import { ref } from "vue";
import { CaseRepositoryError } from "./CaseRepository";
import type { CaseRepository } from "./CaseRepository";
import {
  resolveWriteErrorI18nKey,
  isGateBlockError,
} from "./CaseWriteErrorMapping";
import type { MessageChannelChoice } from "./CaseAdapterMessageWriteBuilders";
import type { DeadlineKindChoice } from "./CaseAdapterReminderWriteBuilders";
import type { TaskPriorityChoice } from "./CaseAdapterTaskWriteBuilders";
import type { SubmissionPackageCreateInput } from "./CaseRepositoryWriteSide";

/**
 * 写操作反馈状态——在 UI 层展示操作结果或门禁阻断提示。
 */
export interface WriteActionFeedback {
  /** 是否正在提交。 */
  submitting: boolean;
  /** 人类可读错误信息（原始 Error.message）。 */
  errorMessage: string | null;
  /** 已解析的 i18n key（用于前端国际化展示）。 */
  errorI18nKey: string | null;
  /** 服务端原始错误码。 */
  serverErrorCode: string | null;
  /** 是否为门禁级阻断（需前置操作才能继续）。 */
  isGateBlock: boolean;
}

const EMPTY_FEEDBACK: WriteActionFeedback = {
  submitting: false,
  errorMessage: null,
  errorI18nKey: null,
  serverErrorCode: null,
  isGateBlock: false,
};

/**
 * 构造提交中占位 feedback。
 *
 * @returns submitting=true 的 feedback 对象
 */
function createSubmittingFeedback(): WriteActionFeedback {
  return { ...EMPTY_FEEDBACK, submitting: true };
}

/**
 * 从异常构建错误 feedback。
 *
 * @param e - 捕获到的异常
 * @returns 包含错误码与门禁标记的 feedback
 */
function createErrorFeedback(e: unknown): WriteActionFeedback {
  const message = e instanceof Error ? e.message : String(e);
  const serverCode =
    e instanceof CaseRepositoryError ? (e.serverErrorCode ?? null) : null;
  return {
    submitting: false,
    errorMessage: message,
    errorI18nKey: resolveWriteErrorI18nKey(serverCode ?? undefined),
    serverErrorCode: serverCode,
    isGateBlock: isGateBlockError(serverCode ?? undefined),
  };
}

// ─── Action Delegates ────────────────────────────────────────────

type RunFn = (action: () => Promise<void>) => Promise<boolean>;

/** 写操作代理函数的最小依赖。 */
interface ActionCoreDeps {
  /** 案件仓储实例。 */
  repo: CaseRepository;
  /** 获取当前案件 ID。 */
  getCaseId: () => string;
}

/**
 * 执行阶段流转。
 *
 * @param deps - 核心依赖
 * @param run - runAction 执行器
 * @param toStage - 目标阶段
 * @param closeReason - 可选关闭原因
 * @returns 是否成功
 */
function doTransitionStage(
  deps: ActionCoreDeps,
  run: RunFn,
  toStage: string,
  closeReason?: string,
): Promise<boolean> {
  return run(() =>
    deps.repo
      .transitionCase(deps.getCaseId(), {
        toStage,
        closeReason: closeReason ?? undefined,
      })
      .then(() => undefined),
  );
}

/**
 * 执行 BMV 业务子步骤流转。
 *
 * @param deps - 核心依赖
 * @param run - runAction 执行器
 * @param toStepCode - 目标子步骤
 * @returns 是否成功
 */
function doTransitionWorkflowStep(
  deps: ActionCoreDeps,
  run: RunFn,
  toStepCode: string,
): Promise<boolean> {
  return run(() =>
    deps.repo
      .transitionWorkflowStep(deps.getCaseId(), { toStepCode })
      .then(() => undefined),
  );
}

/**
 * 推进下签后阶段。
 *
 * @param deps - 核心依赖
 * @param run - runAction 执行器
 * @param stage - 目标审后阶段
 * @returns 是否成功
 */
function doAdvancePostApproval(
  deps: ActionCoreDeps,
  run: RunFn,
  stage: string,
): Promise<boolean> {
  return run(() =>
    deps.repo
      .updatePostApprovalStage(deps.getCaseId(), { stage })
      .then(() => undefined),
  );
}

/**
 * 确认欠款风险。
 *
 * @param deps - 核心依赖
 * @param run - runAction 执行器
 * @param reasonCode - 确认原因代码
 * @param reasonNote - 可选备注
 * @param evidenceUrl - 可选证据链接
 * @param onClose - 关闭弹窗回调
 * @returns 是否成功
 */
function doAckBillingRisk(
  deps: ActionCoreDeps,
  run: RunFn,
  reasonCode: string,
  reasonNote: string | undefined,
  evidenceUrl: string | undefined,
  onClose: () => void,
): Promise<boolean> {
  return run(async () => {
    await deps.repo.acknowledgeBillingRisk(deps.getCaseId(), {
      reasonCode,
      reasonNote,
      evidenceUrl,
    });
    onClose();
  });
}

/**
 * 更新案件字段（如 visaPlan / quotePrice 等 P1 字段）。
 *
 * @param deps - 核心依赖
 * @param run - runAction 执行器
 * @param fields - 要更新的字段对象
 * @returns 是否成功
 */
function doUpdateCaseFields(
  deps: ActionCoreDeps,
  run: RunFn,
  fields: Record<string, unknown>,
): Promise<boolean> {
  return run(() =>
    deps.repo.updateCase(deps.getCaseId(), fields).then(() => undefined),
  );
}

/**
 * 重试创建续签提醒。
 *
 * @param deps - 核心依赖
 * @param run - runAction 执行器
 * @returns 是否成功
 */
function doRetryReminderCreation(
  deps: ActionCoreDeps,
  run: RunFn,
): Promise<boolean> {
  return run(() =>
    deps.repo.retryReminderCreation(deps.getCaseId()).then(() => undefined),
  );
}

/**
 * 执行失败结案（流转到 S9 + 失败归因）。
 *
 * @param deps - 核心依赖
 * @param run - runAction 执行器
 * @param closeReason - 可选关闭原因（closeReasonRequired=true 时必填）
 * @returns 是否成功
 */
function doFailureClose(
  deps: ActionCoreDeps,
  run: RunFn,
  closeReason?: string,
): Promise<boolean> {
  return run(() =>
    deps.repo
      .transitionCase(deps.getCaseId(), {
        toStage: "S9",
        closeReason: closeReason ?? undefined,
      })
      .then(() => undefined),
  );
}

function doPublishMessage(
  deps: ActionCoreDeps,
  run: RunFn,
  payload: { content: string; channelChoice: MessageChannelChoice },
): Promise<boolean> {
  return run(() =>
    deps.repo
      .createCommunicationLog({
        caseId: deps.getCaseId(),
        content: payload.content,
        channelChoice: payload.channelChoice,
      })
      .then(() => undefined),
  );
}

function doCreateReminder(
  deps: ActionCoreDeps,
  run: RunFn,
  payload: {
    targetType: "case" | "case_party_residence";
    remindAt: string;
    kind: DeadlineKindChoice;
    memo: string;
  },
): Promise<boolean> {
  return run(() =>
    deps.repo
      .createReminder({
        caseId: deps.getCaseId(),
        targetType: payload.targetType,
        targetId: deps.getCaseId(),
        remindAt: payload.remindAt,
        kind: payload.kind,
        memo: payload.memo,
      })
      .then(() => undefined),
  );
}

function doCreateGeneratedDocument(
  deps: ActionCoreDeps,
  run: RunFn,
  payload: { title: string; templateId: string | null; outputFormat: string },
): Promise<boolean> {
  return run(() =>
    deps.repo
      .createGeneratedDocument({
        caseId: deps.getCaseId(),
        title: payload.title,
        templateId: payload.templateId,
        outputFormat: payload.outputFormat,
      })
      .then(() => undefined),
  );
}

function doCreateTask(
  deps: ActionCoreDeps,
  run: RunFn,
  payload: {
    title: string;
    description?: string;
    priority: TaskPriorityChoice;
    dueAt?: string;
    assigneeUserId?: string;
  },
): Promise<boolean> {
  return run(() =>
    deps.repo
      .createTask({
        caseId: deps.getCaseId(),
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        dueAt: payload.dueAt,
        assigneeUserId: payload.assigneeUserId,
      })
      .then(() => undefined),
  );
}

function doCompleteTask(
  deps: ActionCoreDeps,
  run: RunFn,
  taskId: string,
): Promise<boolean> {
  return run(() => deps.repo.completeTask(taskId).then(() => undefined));
}

function doCreateSubmissionPackage(
  deps: ActionCoreDeps,
  run: RunFn,
  input: Omit<SubmissionPackageCreateInput, "caseId">,
): Promise<boolean> {
  return run(() =>
    deps.repo
      .createSubmissionPackage({ ...input, caseId: deps.getCaseId() })
      .then(() => undefined),
  );
}

// ─── Factory ─────────────────────────────────────────────────────

function buildChildWriteActions(core: ActionCoreDeps, run: RunFn) {
  return {
    publishMessage: (payload: {
      content: string;
      channelChoice: MessageChannelChoice;
    }) => doPublishMessage(core, run, payload),
    createReminder: (payload: {
      targetType: "case" | "case_party_residence";
      remindAt: string;
      kind: DeadlineKindChoice;
      memo: string;
    }) => doCreateReminder(core, run, payload),
    createGeneratedDocument: (payload: {
      title: string;
      templateId: string | null;
      outputFormat: string;
    }) => doCreateGeneratedDocument(core, run, payload),
    createTask: (payload: {
      title: string;
      description?: string;
      priority: TaskPriorityChoice;
      dueAt?: string;
      assigneeUserId?: string;
    }) => doCreateTask(core, run, payload),
    completeTask: (taskId: string) => doCompleteTask(core, run, taskId),
  };
}

/**
 * 创建写操作编排器——管理 feedback 状态并暴露各种 write action。
 *
 * @param deps - 依赖注入
 * @param deps.repo - 案件仓储实例
 * @param deps.getCaseId - 获取当前案件 ID 的函数
 * @param deps.getReadonly - 获取当前是否只读的函数
 * @param deps.onSuccess - 写操作成功后的回调（通常 refetch detail）
 * @param deps.onRiskModalClose - 收费风险确认成功后关闭弹窗的回调
 * @returns 写操作 feedback ref 和各种 write action 方法
 */
export function createWriteActions(deps: {
  repo: CaseRepository;
  getCaseId: () => string;
  getReadonly: () => boolean;
  onSuccess: () => Promise<void>;
  onRiskModalClose: () => void;
}) {
  const writeFeedback = ref<WriteActionFeedback>({ ...EMPTY_FEEDBACK });

  /** 清除反馈状态。 */
  function clearWriteFeedback(): void {
    writeFeedback.value = { ...EMPTY_FEEDBACK };
  }

  /**
   * 通用写操作执行器——包装 submitting / success / error 生命周期。
   *
   * @param action - 实际写操作
   * @returns 操作是否成功
   */
  async function runAction(action: () => Promise<void>): Promise<boolean> {
    if (deps.getReadonly() || writeFeedback.value.submitting) return false;
    writeFeedback.value = createSubmittingFeedback();
    try {
      await action();
      writeFeedback.value = { ...EMPTY_FEEDBACK };
      await deps.onSuccess();
      return true;
    } catch (e) {
      writeFeedback.value = createErrorFeedback(e);
      return false;
    }
  }

  const core: ActionCoreDeps = { repo: deps.repo, getCaseId: deps.getCaseId };

  return {
    writeFeedback,
    clearWriteFeedback,
    transitionStage: (s: string, r?: string) =>
      doTransitionStage(core, runAction, s, r),
    transitionWorkflowStep: (c: string) =>
      doTransitionWorkflowStep(core, runAction, c),
    advancePostApprovalStage: (s: string) =>
      doAdvancePostApproval(core, runAction, s),
    acknowledgeBillingRisk: (code: string, note?: string, url?: string) =>
      doAckBillingRisk(core, runAction, code, note, url, deps.onRiskModalClose),
    updateCaseFields: (fields: Record<string, unknown>) =>
      doUpdateCaseFields(core, runAction, fields),
    retryReminderCreation: () => doRetryReminderCreation(core, runAction),
    failureClose: (closeReason?: string) =>
      doFailureClose(core, runAction, closeReason),
    createSubmissionPackage: (
      input: Omit<SubmissionPackageCreateInput, "caseId">,
    ) => doCreateSubmissionPackage(core, runAction, input),
    ...buildChildWriteActions(core, runAction),
  };
}
