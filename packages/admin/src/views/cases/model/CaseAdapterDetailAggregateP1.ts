import type { CaseStageId } from "../types";
import type {
  FailureCloseoutInfo,
  PreSignBlocker,
  PreSignGateInfo,
  SurveyQuoteStatus,
  SurveyQuoteStatusKey,
  WorkflowStepSummary,
} from "../types-detail";
import { buildFinalPaymentGate } from "./CaseAdapterFinalPaymentGate";
import {
  buildResidencePeriodPanel,
  buildReminderSchedulePanel,
  buildSuccessCloseoutInfo,
} from "./CaseAdapterResidenceReminder";
import {
  buildSupplementRoundInfo,
  buildReminderFailureInfo,
} from "./CaseAdapterSupplementReminder";
import { isBizManagementVisaCaseTypeCode } from "../../../shared/model/caseTypeI18n";
import {
  asRecord,
  formatDate,
  readNullableString,
  readNumber,
  readString,
  resolveStageId,
  resolveStageLabel,
} from "./CaseAdapterShared";

/** P1 聚合派生所需的 aggregate slice 子集。 */
export interface P1AggregateSlices {
  /** tab counts 统计。 */
  counts: Record<string, unknown> | null;
  /** 当前在留期间与续签提醒上下文。 */
  currentResidencePeriod: Record<string, unknown> | null;
  /** 成功关案检查结果。 */
  successCloseoutCheck: Record<string, unknown> | null;
}

/** P1 业务字段派生前置数值。 */
export interface P1DerivedMetrics {
  /** 报价金额。 */
  quotePrice: number;
  /** 尾款是否已支付。 */
  finalPaymentPaid: boolean;
  /** 是否存在尾款类收费节点（与 server 聚合 billing 一致）。 */
  finalPaymentMilestoneMatched: boolean;
  /** 未收金额。 */
  unpaidAmount: number;
  /** 是否已进行欠款风险确认。 */
  billingRiskAck: boolean;
}

const BMV_STEP_BLUEPRINT: ReadonlyArray<{
  stepCode: string;
  label: string;
  parentStage: string;
  sortOrder: number;
}> = [
  {
    stepCode: "WAITING_MATERIAL",
    label: "等待资料",
    parentStage: "S2",
    sortOrder: 1,
  },
  {
    stepCode: "MATERIAL_PREPARING",
    label: "资料准备中",
    parentStage: "S3",
    sortOrder: 2,
  },
  { stepCode: "REVIEWING", label: "内部审核", parentStage: "S4", sortOrder: 3 },
  { stepCode: "APPLYING", label: "申请提交", parentStage: "S5", sortOrder: 4 },
  {
    stepCode: "UNDER_REVIEW",
    label: "审查中",
    parentStage: "S5",
    sortOrder: 5,
  },
  {
    stepCode: "NEED_SUPPLEMENT",
    label: "需要补正",
    parentStage: "S5",
    sortOrder: 6,
  },
  {
    stepCode: "SUPPLEMENT_PROCESSING",
    label: "补正处理中",
    parentStage: "S5",
    sortOrder: 7,
  },
  { stepCode: "APPROVED", label: "已下签", parentStage: "S6", sortOrder: 8 },
  {
    stepCode: "WAITING_PAYMENT",
    label: "等待尾款",
    parentStage: "S7",
    sortOrder: 9,
  },
  {
    stepCode: "COE_SENT",
    label: "COE寄送",
    parentStage: "S7",
    sortOrder: 10,
  },
  {
    stepCode: "VISA_APPLYING",
    label: "海外返签申请中",
    parentStage: "S7",
    sortOrder: 11,
  },
  {
    stepCode: "ENTRY_SUCCESS",
    label: "入境成功",
    parentStage: "S8",
    sortOrder: 12,
  },
  {
    stepCode: "VISA_REJECTED",
    label: "签证拒否",
    parentStage: "S9",
    sortOrder: 13,
  },
  {
    stepCode: "RESIDENCE_PERIOD_RECORDED",
    label: "在留期间已录入",
    parentStage: "S8",
    sortOrder: 14,
  },
  {
    stepCode: "RENEWAL_REMINDER_SCHEDULED",
    label: "续签提醒已设置",
    parentStage: "S8",
    sortOrder: 15,
  },
];

const BMV_STEP_MAP = new Map(BMV_STEP_BLUEPRINT.map((s) => [s.stepCode, s]));
const FAILURE_STEP_CODES: ReadonlySet<string> = new Set(["VISA_REJECTED"]);

/** 认定后跟踪期子步骤：结案后若仍滞留于此，会与「已归档」状态矛盾，需对齐或冻结展示。 */
const POST_APPROVAL_STALE_WORKFLOW_STEPS: ReadonlySet<string> = new Set([
  "WAITING_PAYMENT",
  "COE_SENT",
  "VISA_APPLYING",
]);

function visaRejectedLikeFailure(
  failureCloseoutCheck: Record<string, unknown> | null,
  caseRecord: Record<string, unknown>,
): boolean {
  if (failureCloseoutCheck && failureCloseoutCheck.isFailurePath === true) {
    const attribution = asRecord(failureCloseoutCheck.attribution);
    const code = attribution
      ? readNullableString(attribution, "reasonCode")
      : null;
    if (code === "VISA_REJECTED" || code === "APPLICATION_REJECTED") {
      return true;
    }
    if (code != null) {
      return false;
    }
  }
  const ro = readNullableString(caseRecord, "resultOutcome");
  return ro === "visa_rejected";
}

function reconcileWorkflowStepForTerminalPhases(
  caseRecord: Record<string, unknown>,
  resolvedStepCode: string | null,
  failureCloseoutCheck: Record<string, unknown> | null,
): { code: string | null; inactiveAtTerminalFailure: boolean } {
  if (
    !resolvedStepCode ||
    !POST_APPROVAL_STALE_WORKFLOW_STEPS.has(resolvedStepCode)
  ) {
    return { code: resolvedStepCode, inactiveAtTerminalFailure: false };
  }

  const bp = readString(caseRecord, "businessPhase");

  if (bp === "CLOSED_FAILED") {
    if (visaRejectedLikeFailure(failureCloseoutCheck, caseRecord)) {
      return { code: "VISA_REJECTED", inactiveAtTerminalFailure: false };
    }
    return { code: resolvedStepCode, inactiveAtTerminalFailure: true };
  }

  if (bp === "CLOSED_SUCCESS") {
    return {
      code: "RENEWAL_REMINDER_SCHEDULED",
      inactiveAtTerminalFailure: false,
    };
  }

  return { code: resolvedStepCode, inactiveAtTerminalFailure: false };
}

/** `businessPhase` 与业务子步骤 `code` 不一致时的别名（如 `SUCCESS` → `ENTRY_SUCCESS`）。 */
const BUSINESS_PHASE_WORKFLOW_FALLBACK: Readonly<Record<string, string>> = {
  SUCCESS: "ENTRY_SUCCESS",
};

function isP1WorkflowCaseType(caseTypeCode: string): boolean {
  if (isBizManagementVisaCaseTypeCode(caseTypeCode)) return true;
  const n = caseTypeCode.trim().toLowerCase().replace(/-/g, "_");
  return n === "work";
}

/**
 * 当服务端未返回 `currentWorkflowStepCode` 时，对 P1 流程案件依 `businessPhase` 推断子步骤。
 *
 * @param caseRecord - 案件 DTO
 * @returns 推断得到的子步骤代码；无法推断时为 `null`
 */
export function resolveWorkflowStepCode(
  caseRecord: Record<string, unknown>,
): string | null {
  const raw = readNullableString(caseRecord, "currentWorkflowStepCode");
  if (raw && BMV_STEP_MAP.has(raw)) {
    return raw;
  }

  const caseTypeCode = readString(caseRecord, "caseTypeCode");
  if (!isP1WorkflowCaseType(caseTypeCode)) {
    return null;
  }

  const bp = readNullableString(caseRecord, "businessPhase");
  if (!bp) {
    return null;
  }
  const candidate = BUSINESS_PHASE_WORKFLOW_FALLBACK[bp] ?? bp;
  return BMV_STEP_MAP.has(candidate) ? candidate : null;
}

const STATUS_TONE_MAP: Record<
  SurveyQuoteStatusKey,
  "muted" | "warning" | "success"
> = {
  not_started: "muted",
  in_progress: "warning",
  completed: "success",
};

export const EMPTY_LISTS = {
  timeline: [] as never[],
  team: [] as never[],
  relatedParties: [] as never[],
  deadlines: [] as never[],
  submissionPackages: [] as never[],
  correctionPackage: null,
  doubleReview: [] as never[],
  reviewEnabled: false,
  documents: [] as never[],
  forms: { templates: [] as never[], generated: [] as never[] },
  tasks: [] as never[],
  logEntries: [] as never[],
  messages: [] as never[],
};

function buildWorkflowStepSummary(
  stepCode: string | null,
  opts?: { workflowStepInactiveAtTerminalFailure?: boolean },
): WorkflowStepSummary | null {
  if (!stepCode) return null;
  const bp = BMV_STEP_MAP.get(stepCode);
  if (!bp) return null;
  const parentStageId = resolveStageId(bp.parentStage);
  const inactive = opts?.workflowStepInactiveAtTerminalFailure === true;
  return {
    stepCode: bp.stepCode,
    stepLabel: bp.label,
    parentStage: bp.parentStage,
    parentStageLabel: resolveStageLabel(parentStageId),
    sortOrder: bp.sortOrder,
    isFailureStep: FAILURE_STEP_CODES.has(bp.stepCode),
    ...(inactive ? { workflowStepInactiveAtTerminalFailure: true } : {}),
  };
}

function buildFailureCloseoutInfo(
  failureCloseoutCheck: Record<string, unknown> | null,
): FailureCloseoutInfo | null {
  if (!failureCloseoutCheck || failureCloseoutCheck.isFailurePath !== true) {
    return null;
  }

  const attribution = asRecord(failureCloseoutCheck.attribution);
  return {
    isFailurePath: true,
    reasonCode: attribution
      ? readNullableString(attribution, "reasonCode")
      : null,
    reasonLabel: attribution
      ? readNullableString(attribution, "reasonLabel")
      : null,
    canDirectClose: attribution ? attribution.canDirectClose === true : false,
    closeReasonRequired: attribution
      ? attribution.closeReasonRequired === true
      : false,
  };
}

function buildBmvFields(
  caseRecord: Record<string, unknown>,
  resolvedWorkflowStepCode: string | null,
  workflowStepOpts?: { workflowStepInactiveAtTerminalFailure?: boolean },
) {
  return {
    workflowStep: buildWorkflowStepSummary(
      resolvedWorkflowStepCode,
      workflowStepOpts,
    ),
    visaPlan: readNullableString(caseRecord, "visaPlan"),
    supplementCount: readNumber(caseRecord, "supplementCount"),
    resultOutcome: readNullableString(caseRecord, "resultOutcome"),
    postApprovalStage: readNullableString(caseRecord, "postApprovalStage"),
    coeIssuedDate: formatDate(readNullableString(caseRecord, "coeIssuedAt")),
    coeExpiryDate: formatDate(readNullableString(caseRecord, "coeExpiryDate")),
    overseasVisaStartDate: formatDate(
      readNullableString(caseRecord, "overseasVisaStartAt"),
    ),
    entryConfirmedDate: formatDate(
      readNullableString(caseRecord, "entryConfirmedAt"),
    ),
  };
}

function deriveSurveyQuoteStatusKey(
  done: number,
  total: number,
): SurveyQuoteStatusKey {
  if (done <= 0) return "not_started";
  if (done >= total) return "completed";
  return "in_progress";
}

function buildSurveyStatus(
  questionnaireTotal: number,
  questionnaireDone: number,
  isBmv: boolean,
): SurveyQuoteStatus | null {
  if (!isBmv || questionnaireTotal <= 0) return null;
  const statusKey = deriveSurveyQuoteStatusKey(
    questionnaireDone,
    questionnaireTotal,
  );
  return {
    statusKey,
    statusLabel: statusKey,
    tone: STATUS_TONE_MAP[statusKey],
    progressLabel: `${questionnaireDone}/${questionnaireTotal}`,
  };
}

function buildQuoteStatus(
  quotePrice: number,
  isBmv: boolean,
): SurveyQuoteStatus | null {
  if (!isBmv) return null;
  const statusKey: SurveyQuoteStatusKey =
    quotePrice > 0 ? "completed" : "not_started";
  return {
    statusKey,
    statusLabel: statusKey,
    tone: STATUS_TONE_MAP[statusKey],
    progressLabel: quotePrice > 0 ? `¥${quotePrice.toLocaleString()}` : "—",
  };
}

/**
 * 详情页「签约前门禁」：仅案件仍在 S1 时有意义；进入 S2 以后案件已成立，
 * 继续展示「不能签约建案」会误导办案人员（走查：S7 仍显示门禁未通过）。
 *
 * @param survey - 问卷进度摘要；非 completed 时记一条阻断。
 * @param quote - 报价状态摘要；非 completed 时记一条阻断。
 * @param isBmv - 是否为 BMV / 问卷报价链路案件；否则不展示 pre-sign。
 * @param stageId - 管理层阶段 `S1`–`S9`；仅 `S1` 返回门禁对象。
 * @returns 阻断列表与是否通过；非 BMV 或非 S1 时返回 `null`。
 */
function buildPreSignGate(
  survey: SurveyQuoteStatus | null,
  quote: SurveyQuoteStatus | null,
  isBmv: boolean,
  stageId: CaseStageId,
): PreSignGateInfo | null {
  if (!isBmv || stageId !== "S1") return null;
  const blockers: PreSignBlocker[] = [];
  if (!survey || survey.statusKey !== "completed") {
    blockers.push({ code: "survey_incomplete", label: "survey_incomplete" });
  }
  if (!quote || quote.statusKey !== "completed") {
    blockers.push({ code: "quote_unconfirmed", label: "quote_unconfirmed" });
  }
  return { passed: blockers.length === 0, blockers };
}

function resolveBmvWorkflowFields(
  caseRecord: Record<string, unknown>,
  failureCloseoutCheck: Record<string, unknown> | null,
) {
  const resolvedWorkflowStepCode = resolveWorkflowStepCode(caseRecord);
  const reconciled = reconcileWorkflowStepForTerminalPhases(
    caseRecord,
    resolvedWorkflowStepCode,
    failureCloseoutCheck,
  );
  const bmv = buildBmvFields(
    caseRecord,
    reconciled.code,
    reconciled.inactiveAtTerminalFailure
      ? { workflowStepInactiveAtTerminalFailure: true }
      : undefined,
  );
  return { reconciled, bmv };
}

/**
 * 基于 aggregate 主链数据补充 P1/BMV 专属字段。
 *
 * @param caseRecord - 原始案件 DTO
 * @param slices - P1 相关 aggregate slice
 * @param metrics - 计费与问卷派生数值
 * @param failureCloseoutCheck - 失败关案检查结果
 * @param stageId - 当前阶段 ID
 * @returns 可直接 merge 到 detail 模型的 P1 字段
 */
export function buildP1Fields(
  caseRecord: Record<string, unknown>,
  slices: P1AggregateSlices,
  metrics: P1DerivedMetrics,
  failureCloseoutCheck: Record<string, unknown> | null,
  stageId: CaseStageId,
) {
  const { reconciled, bmv } = resolveBmvWorkflowFields(
    caseRecord,
    failureCloseoutCheck,
  );
  const isBmv = bmv.workflowStep != null || bmv.visaPlan != null;
  const isReadonly = stageId === "S9";
  const questionnaireTotal = slices.counts
    ? readNumber(slices.counts, "questionnaireItemsTotal")
    : 0;
  const questionnaireDone = slices.counts
    ? readNumber(slices.counts, "questionnaireItemsDone")
    : 0;
  const surveyStatus = buildSurveyStatus(
    questionnaireTotal,
    questionnaireDone,
    isBmv,
  );
  const quoteStatus = buildQuoteStatus(metrics.quotePrice, isBmv);

  return {
    ...bmv,
    quotePriceRaw: metrics.quotePrice,
    quotePriceLabel:
      metrics.quotePrice > 0 ? `¥${metrics.quotePrice.toLocaleString()}` : "",
    surveyStatus,
    quoteStatus,
    preSignGate: buildPreSignGate(surveyStatus, quoteStatus, isBmv, stageId),
    failureCloseout: buildFailureCloseoutInfo(failureCloseoutCheck),
    finalPaymentGate: buildFinalPaymentGate(reconciled.code, isBmv, {
      finalPaymentPaid: metrics.finalPaymentPaid,
      finalPaymentMilestoneMatched: metrics.finalPaymentMilestoneMatched,
      unpaidAmount: metrics.unpaidAmount,
      billingRiskAck: metrics.billingRiskAck,
    }),
    residencePeriod: buildResidencePeriodPanel(slices.currentResidencePeriod),
    reminderSchedule: buildReminderSchedulePanel(slices.currentResidencePeriod),
    successCloseout: buildSuccessCloseoutInfo(slices.successCloseoutCheck),
    supplementRound: isBmv
      ? buildSupplementRoundInfo(caseRecord, isReadonly)
      : null,
    reminderFailure: isBmv
      ? buildReminderFailureInfo(slices.currentResidencePeriod, isReadonly)
      : null,
  };
}
