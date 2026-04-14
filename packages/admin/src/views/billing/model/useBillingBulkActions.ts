import { ref } from "vue";
import type {
  CaseBillingRow,
  CollectionResult,
  CollectionResultDetail,
} from "../types";

/**
 * 判断行是否可参与催款（仅逾期行）。
 *
 * @param row - 收费行
 * @returns 是否可催款
 */
export function canCollect(row: CaseBillingRow): boolean {
  return row.status === "overdue";
}

/**
 * 将选中行映射为三段式催款结果。
 *
 * @param selected - 选中的行列表
 * @returns 催款结果
 */
function buildCollectionResult(selected: CaseBillingRow[]): CollectionResult {
  const details: CollectionResultDetail[] = selected.map((r) =>
    canCollect(r)
      ? {
          caseNo: r.caseNo,
          result: "success" as const,
          taskId: `TSK-${String(Date.now()).slice(-4)}`,
        }
      : {
          caseNo: r.caseNo,
          result: "skipped" as const,
          reason: "not-overdue" as const,
        },
  );
  return {
    success: details.filter((d) => d.result === "success").length,
    skipped: details.filter((d) => d.result === "skipped").length,
    failed: details.filter((d) => d.result === "failed").length,
    details,
  };
}

/**
 * 批量催款操作管理。
 *
 * 仅逾期行可生成催款任务；非逾期行自动跳过并标注原因。
 *
 * @returns 加载态、最近一次结果、执行与清除方法
 */
export function useBillingBulkActions() {
  const loading = ref(false);
  const lastResult = ref<CollectionResult | null>(null);

  /**
   * 对选中行执行批量催款。
   *
   * @param selectedIds - 选中行 ID 集合
   * @param rows - 完整行列表
   * @returns 催款结果（success / skipped / failed）
   */
  async function executeBulkCollection(
    selectedIds: Set<string>,
    rows: CaseBillingRow[],
  ): Promise<CollectionResult> {
    loading.value = true;
    try {
      const result = buildCollectionResult(
        rows.filter((r) => selectedIds.has(r.id)),
      );
      lastResult.value = result;
      return result;
    } finally {
      loading.value = false;
    }
  }

  /** 清除上次催款结果。 */
  function clearResult() {
    lastResult.value = null;
  }

  return {
    loading,
    lastResult,
    canCollect,
    executeBulkCollection,
    clearResult,
  };
}
