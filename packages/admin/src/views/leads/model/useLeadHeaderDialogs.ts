import { ref, type Ref } from "vue";
import type { LeadStatusInput, LeadUpdateInput } from "./LeadAdapter";
import type { LeadMutationFailure } from "./useLeadMutationActions";

interface ToastLike {
  add(input: {
    title: string;
    description?: string;
    tone?: "success" | "error" | "info" | "warning";
  }): unknown;
}

type Translator = (key: string, params?: Record<string, unknown>) => string;

/**
 * 线索详情头部三个二级弹窗（编辑信息 / 调整状态 / 标记流失）的依赖。
 */
export interface LeadHeaderDialogsDeps {
  /**
   * vue-i18n 的 `t`：用于查 toast 文案 key
   */
  t: Translator;
  /**
   * 全局 Toast 控制器（测试场景下可能为 null）
   */
  toast: ToastLike | null;
  /**
   * 转入 useLeadDetailModel 暴露的对应 mutate 方法
   */
  updateLead: (input: LeadUpdateInput) => Promise<LeadMutationFailure | null>;
  /**
   * 转入 useLeadDetailModel 暴露的对应 mutate 方法
   */
  transitionStatus: (
    input: LeadStatusInput,
  ) => Promise<LeadMutationFailure | null>;
  /**
   * 转入 useLeadDetailModel 暴露的对应 mutate 方法
   */
  markLost: (lostReason: string) => Promise<LeadMutationFailure | null>;
}

interface DialogState {
  visible: Ref<boolean>;
  error: Ref<LeadMutationFailure | null>;
  open: () => void;
  close: () => void;
}

function createDialogState(): DialogState {
  const visible = ref(false);
  const error = ref<LeadMutationFailure | null>(null);
  return {
    visible,
    error,
    open(): void {
      error.value = null;
      visible.value = true;
    },
    close(): void {
      visible.value = false;
      error.value = null;
    },
  };
}

function fireFailureToast(
  toast: ToastLike | null,
  t: Translator,
  failure: LeadMutationFailure,
  failureTitleKey: string,
): void {
  toast?.add({
    title: t(failureTitleKey),
    description: t(failure.messageKey),
    tone: "error",
  });
}

async function runEditInfoConfirm(
  state: DialogState,
  deps: LeadHeaderDialogsDeps,
  input: LeadUpdateInput,
): Promise<void> {
  state.error.value = null;
  const failure = await deps.updateLead(input);
  if (failure === null) {
    state.visible.value = false;
    deps.toast?.add({
      title: deps.t("leads.toast.updateSuccess.title"),
      description: deps.t("leads.toast.updateSuccess.description"),
      tone: "success",
    });
    return;
  }
  state.error.value = failure;
  fireFailureToast(
    deps.toast,
    deps.t,
    failure,
    "leads.errors.updateFailedToast.title",
  );
}

async function runChangeStatusConfirm(
  state: DialogState,
  deps: LeadHeaderDialogsDeps,
  input: LeadStatusInput,
): Promise<void> {
  state.error.value = null;
  const failure = await deps.transitionStatus(input);
  if (failure === null) {
    state.visible.value = false;
    deps.toast?.add({
      title: deps.t("leads.toast.transitionSuccess.title"),
      description: deps.t("leads.toast.transitionSuccess.description", {
        status: deps.t(`leads.list.status.${input.toStatus}`),
      }),
      tone: "success",
    });
    return;
  }
  state.error.value = failure;
  fireFailureToast(
    deps.toast,
    deps.t,
    failure,
    "leads.errors.transitionFailedToast.title",
  );
}

async function runMarkLostConfirm(
  state: DialogState,
  deps: LeadHeaderDialogsDeps,
  reason: string,
): Promise<void> {
  state.error.value = null;
  const failure = await deps.markLost(reason);
  if (failure === null) {
    state.visible.value = false;
    deps.toast?.add({
      title: deps.t("leads.toast.markLostSuccess.title"),
      description: deps.t("leads.toast.markLostSuccess.description"),
      tone: "success",
    });
    return;
  }
  state.error.value = failure;
  fireFailureToast(
    deps.toast,
    deps.t,
    failure,
    "leads.errors.markLostFailedToast.title",
  );
}

/**
 * 暴露线索详情头部 3 个 R2-B-4 弹窗的状态与回调，供页面模板直接绑定。
 *
 * - 每个弹窗维护：可见性、生效错误、open/close、handleConfirm。
 * - 成功后由 mutator 的返回值（null）触发；失败时保留 inline 错误并触发 toast。
 *
 * @param deps i18n / toast / mutate 方法依赖
 * @returns 弹窗状态与处理函数
 */
export function useLeadHeaderDialogs(deps: LeadHeaderDialogsDeps) {
  const editInfo = createDialogState();
  const changeStatus = createDialogState();
  const markLost = createDialogState();

  return {
    showEditInfoDialog: editInfo.visible,
    editInfoError: editInfo.error,
    openEditInfoDialog: editInfo.open,
    closeEditInfoDialog: editInfo.close,
    handleEditInfoConfirm: (input: LeadUpdateInput) =>
      runEditInfoConfirm(editInfo, deps, input),

    showChangeStatusDialog: changeStatus.visible,
    changeStatusError: changeStatus.error,
    openChangeStatusDialog: changeStatus.open,
    closeChangeStatusDialog: changeStatus.close,
    handleChangeStatusConfirm: (input: LeadStatusInput) =>
      runChangeStatusConfirm(changeStatus, deps, input),

    showMarkLostDialog: markLost.visible,
    markLostError: markLost.error,
    openMarkLostDialog: markLost.open,
    closeMarkLostDialog: markLost.close,
    handleMarkLostConfirm: (reason: string) =>
      runMarkLostConfirm(markLost, deps, reason),
  };
}
