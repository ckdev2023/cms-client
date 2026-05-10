import type { Ref } from "vue";
import type { ComposerTranslation } from "vue-i18n";
import type { LeadStatus, LeadSummary } from "../types";
import type { useLeadBulkActions } from "./useLeadBulkActions";
import type { useLeadToast } from "./useLeadToast";

type BulkController = ReturnType<typeof useLeadBulkActions>;
type ToastController = ReturnType<typeof useLeadToast>;

interface OwnerOption {
  value: string;
  label: string;
}

/** `useLeadBulkHandlers` 组合层依赖。 */
export interface UseLeadBulkHandlersDeps {
  /** 国际化翻译函数。 */
  t: ComposerTranslation;
  /** 选中行 ID 集合。 */
  selectedIds: Ref<Set<string>>;
  /** 当前列表。 */
  leads: Ref<LeadSummary[]>;
  /** 主负责人选项（带 UUID）。 */
  apiOwnerOptions: Ref<readonly OwnerOption[]>;
  /** 静态负责人选项（用于兜底显示名）。 */
  ownerOptions: Ref<readonly OwnerOption[]>;
  /** 批量操作控制器。 */
  bulk: BulkController;
  /** 全局轻提示控制器。 */
  toast: ToastController;
  /** 清空选择。 */
  clearSelection: () => void;
  /** 刷新列表。 */
  fetchLeads: () => Promise<void>;
}

function resolveOwnerLabel(
  deps: UseLeadBulkHandlersDeps,
  ownerId: string,
): string {
  return (
    deps.apiOwnerOptions.value.find((o) => o.value === ownerId)?.label ??
    deps.ownerOptions.value.find((o) => o.value === ownerId)?.label ??
    ownerId
  );
}

async function assignOwner(deps: UseLeadBulkHandlersDeps, ownerId: string) {
  const result = await deps.bulk.assignOwner(
    deps.selectedIds.value,
    deps.leads.value,
    ownerId,
  );
  deps.toast.show({
    title: deps.t("leads.list.toast.bulkAssign.title"),
    description: deps.t("leads.list.toast.bulkAssign.description", {
      count: result.success,
      owner: resolveOwnerLabel(deps, ownerId),
    }),
  });
  deps.clearSelection();
  await deps.fetchLeads();
}

async function adjustFollowUp(deps: UseLeadBulkHandlersDeps, date: string) {
  const result = await deps.bulk.adjustFollowUp(
    deps.selectedIds.value,
    deps.leads.value,
    date,
  );
  deps.toast.show({
    title: deps.t("leads.list.toast.bulkFollowUp.title"),
    description: deps.t("leads.list.toast.bulkFollowUp.description", {
      count: result.success,
      date,
    }),
  });
  deps.clearSelection();
  await deps.fetchLeads();
}

async function markStatus(deps: UseLeadBulkHandlersDeps, status: LeadStatus) {
  const result = await deps.bulk.markStatus(
    deps.selectedIds.value,
    deps.leads.value,
    status,
  );
  deps.toast.show({
    title: deps.t("leads.list.toast.bulkStatus.title"),
    description: deps.t("leads.list.toast.bulkStatus.description", {
      success: result.success,
      skipped: result.skipped,
    }),
  });
  deps.clearSelection();
  await deps.fetchLeads();
}

async function bulkTags(deps: UseLeadBulkHandlersDeps, tags: string[]) {
  const result = await deps.bulk.bulkTags(
    deps.selectedIds.value,
    deps.leads.value,
    tags,
  );
  deps.toast.show({
    title: deps.t("leads.list.toast.bulkTags.title"),
    description: deps.t("leads.list.toast.bulkTags.description", {
      count: result.success,
      tags: tags.join(", "),
    }),
  });
  deps.clearSelection();
  await deps.fetchLeads();
}

async function bulkExport(
  deps: UseLeadBulkHandlersDeps,
  format: "csv" | "xlsx",
) {
  const result = await deps.bulk.bulkExport(
    deps.selectedIds.value,
    deps.leads.value,
    format,
  );
  deps.toast.show({
    title: deps.t("leads.list.toast.bulkExport.title"),
    description: deps.t("leads.list.toast.bulkExport.description", {
      count: result.success,
      format: format.toUpperCase(),
    }),
  });
  deps.clearSelection();
}

/**
 * 把列表页五个批量操作收敛到组合层：调用底层 bulk → toast → 清选 → 刷新。
 *
 * @param deps - 注入的依赖
 * @returns 五个批量处理函数
 */
export function useLeadBulkHandlers(deps: UseLeadBulkHandlersDeps) {
  return {
    handleAssignOwner: (ownerId: string) => assignOwner(deps, ownerId),
    handleAdjustFollowUp: (date: string) => adjustFollowUp(deps, date),
    handleMarkStatus: (status: LeadStatus) => markStatus(deps, status),
    handleBulkTags: (tags: string[]) => bulkTags(deps, tags),
    handleBulkExport: (format: "csv" | "xlsx") => bulkExport(deps, format),
  };
}
