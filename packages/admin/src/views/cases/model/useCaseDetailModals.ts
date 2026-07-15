/**
 * 案件详情页的弹窗状态与提交编排 —— 自 `CaseDetailView.vue` 抽出。
 *
 * 抽出动因（B4）：CaseDetailView 是方案书点名的「上帝组件」，其 script 段近六成
 * 是弹窗的 open/submitting 状态与提交 handler，与页面壳的职责（布局 + Tab 路由）
 * 无关。抽出后壳只负责把状态接到模板上。
 *
 * 本文件是**逐字搬运**，不改任何语义：五个弹窗各自的开关时机、提交后是否关闭、
 * 以及 submission package 用 `createSpErrorI18nKey` 判定而非布尔返回值这类
 * 差异，全部原样保留。
 *
 * 已知可简化项（另立批次，不在本批夹带）：edit / task / deadline 三者的
 * 「open + submitting + 成功才关闭」形状完全一致，可归一为一个提交型弹窗状态机；
 * submission package 与 form generate 因判定方式与额外 preset 状态而不同形。
 */
import { ref, type Ref } from "vue";
import type { useI18n } from "vue-i18n";

import type { FormTemplate } from "../detail/tabs/forms/types";
import type { useCaseDetailModel } from "./useCaseDetailModel";
import type { useCaseValidationActions } from "./useCaseValidationActions";
import type { TaskPriorityChoice } from "./CaseAdapterTaskWriteBuilders";
import type { MessageChannelChoice } from "./CaseAdapterMessageWriteBuilders";
import type { DeadlineKindChoice } from "./CaseAdapterReminderWriteBuilders";

type DetailModel = ReturnType<typeof useCaseDetailModel>;
type ValidationActions = ReturnType<typeof useCaseValidationActions>;

/** 弹窗编排所需的依赖，全部由 CaseDetailView 注入。 */
export interface UseCaseDetailModalsDeps {
  /** 详情聚合（failureCloseout 读取自此）。 */
  detail: DetailModel["detail"];
  /** i18n 翻译函数（删除草稿文书的确认文案）。 */
  t: ReturnType<typeof useI18n>["t"];
  /** 写操作：更新案件字段。 */
  updateCaseFields: DetailModel["updateCaseFields"];
  /** 写操作：失败结案。 */
  failureClose: DetailModel["failureClose"];
  /** 业务阶段流转菜单。 */
  phaseMenu: DetailModel["phaseMenu"];
  /** 写操作：创建任务。 */
  createTask: DetailModel["createTask"];
  /** 写操作：创建期限提醒。 */
  createReminder: DetailModel["createReminder"];
  /** 写操作：登记文书。 */
  createGeneratedDocument: DetailModel["createGeneratedDocument"];
  /** 写操作：删除草稿文书。 */
  deleteDraftGeneratedDocument: DetailModel["deleteDraftGeneratedDocument"];
  /** 写操作：发布沟通记录。 */
  publishMessage: DetailModel["publishMessage"];
  /** 校验/提交包 actions（提交包创建与其错误码）。 */
  validationActions: ValidationActions;
}

/**
 * 装配案件详情页的五个弹窗（编辑 / 提交包 / 任务 / 期限 / 文书登记）
 * 及阶段流转、失败结案、发布沟通记录三个直通 handler。
 *
 * @param deps - 详情模型与校验 actions 提供的写能力
 * @returns 各弹窗的开关状态与提交 handler，供模板直接绑定
 */
function useDirectActions(deps: UseCaseDetailModalsDeps) {
  const { detail, failureClose, phaseMenu } = deps;

  /** 失败结案：取详情里的失败原因标签，缺失时不带原因。 */
  function failureCloseCase(): void {
    const fc = detail.value?.failureCloseout;
    if (!fc) return;
    const reason = fc.reasonLabel ?? fc.reasonCode ?? undefined;
    failureClose(reason);
  }

  /**
   * 提交业务阶段流转请求。
   *
   * @param payload - 流转载荷
   * @param payload.toPhase - 目标阶段
   * @param payload.closeReason - 关闭原因
   * @param payload.resultOutcome - 结果
   */
  function onPhaseSubmit(payload: {
    toPhase: string;
    closeReason?: string;
    resultOutcome?: string;
  }): void {
    void phaseMenu.performTransition(payload.toPhase, {
      closeReason: payload.closeReason,
      resultOutcome: payload.resultOutcome,
    });
  }

  return { failureCloseCase, onPhaseSubmit };
}

function useMessageAndDocActions(deps: UseCaseDetailModalsDeps) {
  const { t, publishMessage, deleteDraftGeneratedDocument } = deps;

  /**
   * 发布沟通记录。
   *
   * @param payload - 消息载荷
   * @param payload.content - 内容
   * @param payload.channelChoice - 渠道
   */
  function onPublishMessage(payload: {
    content: string;
    channelChoice: MessageChannelChoice;
  }): void {
    void publishMessage(payload);
  }

  /**
   * 删除草稿文书（需浏览器确认）。
   *
   * @param docId - 生成文书 ID
   */
  async function onDeleteDraftGeneratedDoc(docId: string): Promise<void> {
    if (!window.confirm(t("cases.detail.forms.deleteDraftConfirm"))) return;
    await deleteDraftGeneratedDocument(docId);
  }

  return { onPublishMessage, onDeleteDraftGeneratedDoc };
}

function useEditModal(deps: UseCaseDetailModalsDeps) {
  const { updateCaseFields } = deps;
  const editModalOpen = ref(false);
  const editSaving = ref(false);

  /**
   * 保存案件编辑表单。
   *
   * @param fields - 表单字段
   */
  async function onSaveCaseEdit(
    fields: Parameters<DetailModel["updateCaseFields"]>[0],
  ): Promise<void> {
    editSaving.value = true;
    const ok = await updateCaseFields({ ...fields });
    editSaving.value = false;
    if (ok) editModalOpen.value = false;
  }

  return { editModalOpen, editSaving, onSaveCaseEdit };
}

function useSubmissionPackageModal(deps: UseCaseDetailModalsDeps) {
  const { validationActions } = deps;
  const spCreateModalOpen = ref(false);

  /** 打开新建提交包弹窗。 */
  function openSpCreateModal(): void {
    spCreateModalOpen.value = true;
  }

  /** 关闭新建提交包弹窗。 */
  function closeSpCreateModal(): void {
    spCreateModalOpen.value = false;
  }

  /**
   * 提交包弹窗确认提交：触发创建 action，无错误则关闭弹窗。
   *
   * @param payload - 弹窗收集到的提交日时与提交对象（机关名）。
   * @param payload.submittedAt - 提交日时 ISO-8601 字符串。
   * @param payload.authorityName - 提交对象（机关名）。
   */
  async function onSubmissionPackageCreate(payload: {
    submittedAt: string;
    authorityName: string;
  }): Promise<void> {
    await validationActions.createSubmissionPackage(payload);
    if (validationActions.createSpErrorI18nKey.value === null) {
      closeSpCreateModal();
    }
  }

  return {
    spCreateModalOpen,
    openSpCreateModal,
    closeSpCreateModal,
    onSubmissionPackageCreate,
  };
}

function useTaskModal(deps: UseCaseDetailModalsDeps) {
  const { createTask } = deps;
  const taskModalOpen = ref(false);
  const taskModalSubmitting = ref(false);

  /** 打开创建任务弹窗（替代原 router.push 到 /tasks 的死循环）。 */
  function openCreateTaskModal(): void {
    taskModalOpen.value = true;
  }

  /**
   * 提交任务创建表单。
   *
   * @param payload - 任务创建数据
   * @param payload.title - 任务标题
   * @param payload.description - 任务描述
   * @param payload.priority - 优先级
   * @param payload.dueAt - 截止日期
   * @param payload.assigneeUserId - 负责人 ID
   */
  async function onTaskSubmit(payload: {
    title: string;
    description?: string;
    priority: TaskPriorityChoice;
    dueAt?: string;
    assigneeUserId?: string;
  }): Promise<void> {
    taskModalSubmitting.value = true;
    const ok = await createTask(payload);
    taskModalSubmitting.value = false;
    if (ok) taskModalOpen.value = false;
  }

  return {
    taskModalOpen,
    taskModalSubmitting,
    openCreateTaskModal,
    onTaskSubmit,
  };
}

function useDeadlineModal(deps: UseCaseDetailModalsDeps) {
  const { createReminder } = deps;
  const deadlineModalOpen = ref(false);
  const deadlineModalSubmitting = ref(false);

  /** 打开创建期限弹窗。 */
  function openCreateDeadlineModal(): void {
    deadlineModalOpen.value = true;
  }

  /**
   * 提交期限创建表单。
   *
   * @param payload - 期限表单数据
   * @param payload.targetType - 目标类型
   * @param payload.remindAt - 提醒日期
   * @param payload.kind - 期限分类
   * @param payload.memo - 备注
   */
  async function onDeadlineSubmit(payload: {
    targetType: "case" | "case_party_residence";
    remindAt: string;
    kind: DeadlineKindChoice;
    memo: string;
  }): Promise<void> {
    deadlineModalSubmitting.value = true;
    const ok = await createReminder(payload);
    deadlineModalSubmitting.value = false;
    if (ok) deadlineModalOpen.value = false;
  }

  return {
    deadlineModalOpen,
    deadlineModalSubmitting,
    openCreateDeadlineModal,
    onDeadlineSubmit,
  };
}

function useFormGenerateModal(deps: UseCaseDetailModalsDeps) {
  const { createGeneratedDocument } = deps;
  const formGenModalOpen = ref(false);
  const formGenModalSubmitting = ref(false);
  const formGenModalPreset: Ref<FormTemplate | null> = ref(null);

  /**
   * 打开登记文书弹窗。
   *
   * @param template - 可选；从模板行入口打开时传入该行模板，用于预填标题并提交 templateId。
   */
  function openGenerateFormModal(template?: FormTemplate): void {
    formGenModalPreset.value = template ?? null;
    formGenModalOpen.value = true;
  }

  /**
   * 关闭登记文书弹窗并清除模板上下文，避免下一次从顶部入口误用上一次模板。
   */
  function closeGenerateFormModal(): void {
    formGenModalOpen.value = false;
    formGenModalPreset.value = null;
  }

  /**
   * 提交文书登记表单。
   *
   * @param payload - 文书登记数据
   * @param payload.title - 标题
   * @param payload.fileUrl - 外部资源 URL
   * @param payload.templateId - 可选；从模板行打开时由弹窗填入，发往 `POST /generated-documents`
   */
  async function onFormGenSubmit(payload: {
    title: string;
    fileUrl: string;
    templateId?: string;
  }): Promise<void> {
    formGenModalSubmitting.value = true;
    const ok = await createGeneratedDocument({
      title: payload.title,
      fileUrl: payload.fileUrl,
      ...(payload.templateId ? { templateId: payload.templateId } : {}),
    });
    formGenModalSubmitting.value = false;
    if (ok) closeGenerateFormModal();
  }

  return {
    formGenModalOpen,
    formGenModalSubmitting,
    formGenModalPreset,
    openGenerateFormModal,
    closeGenerateFormModal,
    onFormGenSubmit,
  };
}

/**
 * 装配案件详情页的五个弹窗（编辑 / 提交包 / 任务 / 期限 / 文书登记）
 * 及阶段流转、失败结案、发布沟通记录三个直通 handler。
 *
 * 本函数只做组合：每个弹窗自成一个小函数，既满足 max-lines-per-function，
 * 也让「哪个弹窗依赖哪个写操作」一目了然。
 *
 * @param deps - 详情模型与校验 actions 提供的写能力
 * @returns 各弹窗的开关状态与提交 handler，供模板直接绑定
 */
export function useCaseDetailModals(deps: UseCaseDetailModalsDeps) {
  return {
    ...useDirectActions(deps),
    ...useMessageAndDocActions(deps),
    ...useEditModal(deps),
    ...useSubmissionPackageModal(deps),
    ...useTaskModal(deps),
    ...useDeadlineModal(deps),
    ...useFormGenerateModal(deps),
  };
}
