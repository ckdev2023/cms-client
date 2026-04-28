import { ref } from "vue";
import type { CaseBillingRow, CollectionResult } from "../types";

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
 *
 */
export interface BulkCollectDataSource {
  /**
   *
   */
  bulkCollect(caseIds: string[]): Promise<CollectionResult>;
}

/**
 *
 */
export interface UseBillingBulkActionsDeps {
  /**
   *
   */
  dataSource: BulkCollectDataSource;
}

const EMPTY_RESULT: CollectionResult = {
  success: 0,
  skipped: 0,
  failed: 0,
  details: [],
};

function extractUniqueCaseIds(
  selectedIds: Set<string>,
  rows: CaseBillingRow[],
): string[] {
  const seen = new Set<string>();
  const caseIds: string[] = [];
  for (const row of rows) {
    if (!selectedIds.has(row.id)) continue;
    if (seen.has(row.caseId)) continue;
    seen.add(row.caseId);
    caseIds.push(row.caseId);
  }
  return caseIds;
}

function buildErrorFallback(caseIds: string[]): CollectionResult {
  return {
    success: 0,
    skipped: 0,
    failed: caseIds.length,
    details: caseIds.map((id) => ({
      caseNo: id,
      result: "failed" as const,
      reason: "system-error" as const,
    })),
  };
}

/**
 * 批量催款操作管理——通过注入的 dataSource 调用服务端 bulkCollect API。
 *
 * @param deps - 数据源依赖
 * @returns 加载态、结果、抽屉开关与操作方法
 */
export function useBillingBulkActions(deps: UseBillingBulkActionsDeps) {
  const loading = ref(false);
  const lastResult = ref<CollectionResult | null>(null);
  const drawerOpen = ref(false);

  async function executeBulkCollection(
    selectedIds: Set<string>,
    rows: CaseBillingRow[],
  ): Promise<CollectionResult> {
    const caseIds = extractUniqueCaseIds(selectedIds, rows);
    if (caseIds.length === 0) {
      lastResult.value = EMPTY_RESULT;
      return EMPTY_RESULT;
    }
    loading.value = true;
    try {
      const result = await deps.dataSource.bulkCollect(caseIds);
      lastResult.value = result;
      return result;
    } catch (e) {
      lastResult.value = buildErrorFallback(caseIds);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function clearResult() {
    lastResult.value = null;
    drawerOpen.value = false;
  }

  return {
    loading,
    lastResult,
    drawerOpen,
    canCollect,
    executeBulkCollection,
    openDrawer: () => {
      drawerOpen.value = true;
    },
    closeDrawer: () => {
      drawerOpen.value = false;
    },
    clearResult,
  };
}
