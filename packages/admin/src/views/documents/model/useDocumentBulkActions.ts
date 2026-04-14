import { ref, computed } from "vue";
import type { DocumentListItem } from "../types";

/**
 * 批量操作类型。
 */
export type BulkActionType = "remind" | "approve" | "waive";

/**
 * 资料列表批量操作 model。
 *
 * 三种操作：批量催办（remind）、批量审核通过（approve）、批量标记 waived（waive）。
 * 各操作在 P0 阶段只做本地行为 + toast 回调，不发起真实请求。
 *
 * @param deps - 依赖注入
 * @param deps.getSelectedItems - 获取当前选中的资料项
 * @param deps.clearSelection - 清除选择状态
 * @param deps.onToast - 操作完成后的 toast 回调
 * @returns 批量操作状态与方法
 */
export function useDocumentBulkActions(deps: {
  getSelectedItems: () => Pick<DocumentListItem, "id" | "status">[];
  clearSelection: () => void;
  onToast: (action: BulkActionType, count: number) => void;
}) {
  const loading = ref(false);

  const selectedRemindable = computed(() =>
    deps
      .getSelectedItems()
      .filter((i) => i.status === "pending" || i.status === "rejected"),
  );

  const selectedApprovable = computed(() =>
    deps.getSelectedItems().filter((i) => i.status === "uploaded_reviewing"),
  );

  const canRemind = computed(() => selectedRemindable.value.length > 0);
  const canApprove = computed(() => selectedApprovable.value.length > 0);
  const canWaive = computed(() => deps.getSelectedItems().length > 0);

  function bulkRemind() {
    const count = selectedRemindable.value.length;
    if (count === 0) return;
    deps.onToast("remind", count);
    deps.clearSelection();
  }

  function bulkApprove() {
    const count = selectedApprovable.value.length;
    if (count === 0) return;
    deps.onToast("approve", count);
    deps.clearSelection();
  }

  function bulkWaive() {
    const items = deps.getSelectedItems();
    if (items.length === 0) return;
    deps.onToast("waive", items.length);
    deps.clearSelection();
  }

  return {
    loading,
    canRemind,
    canApprove,
    canWaive,
    bulkRemind,
    bulkApprove,
    bulkWaive,
  };
}
