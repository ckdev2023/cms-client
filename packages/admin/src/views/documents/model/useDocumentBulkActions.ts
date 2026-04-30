import { ref, computed, type Ref } from "vue";
import type { DocumentListItem } from "../types";
import type {
  DocumentRepository,
  WaiveParams,
} from "./DocumentRepositoryTypes";

/**
 * 批量操作类型。
 */
export type BulkActionType = "remind" | "approve" | "waive";

/**
 *
 */
export interface BulkActionResult {
  /**
   *
   */
  action: BulkActionType;
  /**
   *
   */
  successCount: number;
  /**
   *
   */
  failedCount: number;
  /**
   *
   */
  failedIds: ReadonlySet<string>;
}

/**
 *
 */
export interface BulkActionsDeps {
  /**
   *
   */
  getSelectedItems: () => Pick<DocumentListItem, "id" | "status">[];
  /**
   *
   */
  clearSelection: () => void;
  /**
   *
   */
  repository: Pick<DocumentRepository, "transition" | "followUp" | "waive">;
  /**
   *
   */
  onSuccess?: (result: BulkActionResult) => void;
  /**
   *
   */
  onError?: (action: BulkActionType, error: unknown) => void;
}

function settleAndCollectFailures<T extends { id: string }>(
  items: T[],
  results: PromiseSettledResult<unknown>[],
): Set<string> {
  const failed = new Set<string>();
  results.forEach((r, i) => {
    if (r.status === "rejected") failed.add(items[i].id);
  });
  return failed;
}

function buildResult(
  action: BulkActionType,
  items: { id: string }[],
  failed: Set<string>,
): BulkActionResult {
  return {
    action,
    successCount: items.length - failed.size,
    failedCount: failed.size,
    failedIds: failed,
  };
}

async function executeBulk(
  action: BulkActionType,
  items: { id: string }[],
  call: (item: { id: string }) => Promise<unknown>,
  deps: BulkActionsDeps,
  loading: Ref<boolean>,
  failedIds: Ref<ReadonlySet<string>>,
) {
  if (items.length === 0) return;
  loading.value = true;
  try {
    const results = await Promise.allSettled(items.map(call));
    const failed = settleAndCollectFailures(items, results);
    failedIds.value = failed;
    deps.onSuccess?.(buildResult(action, items, failed));
    if (failed.size === 0) deps.clearSelection();
  } catch (error) {
    deps.onError?.(action, error);
  } finally {
    loading.value = false;
  }
}

function setupSelectionComputeds(
  deps: Pick<BulkActionsDeps, "getSelectedItems">,
) {
  const selectedRemindable = computed(() =>
    deps
      .getSelectedItems()
      .filter((i) => i.status === "pending" || i.status === "rejected"),
  );
  const selectedApprovable = computed(() =>
    deps.getSelectedItems().filter((i) => i.status === "uploaded_reviewing"),
  );
  return {
    selectedRemindable,
    selectedApprovable,
    canRemind: computed(() => selectedRemindable.value.length > 0),
    canApprove: computed(() => selectedApprovable.value.length > 0),
    canWaive: computed(() => deps.getSelectedItems().length > 0),
  };
}

/**
 * 资料列表批量操作 model（Promise.allSettled + 错误聚合 + 失败行 id 集合）。
 *
 * @param deps - 依赖注入
 * @returns 批量操作状态与方法
 */
export function useDocumentBulkActions(deps: BulkActionsDeps) {
  const loading = ref(false);
  const failedIds = ref<ReadonlySet<string>>(new Set<string>());
  const sel = setupSelectionComputeds(deps);
  const exec = (
    a: BulkActionType,
    items: { id: string }[],
    fn: (i: { id: string }) => Promise<unknown>,
  ) => executeBulk(a, items, fn, deps, loading, failedIds);

  return {
    loading,
    failedIds,
    canRemind: sel.canRemind,
    canApprove: sel.canApprove,
    canWaive: sel.canWaive,
    clearFailedIds: () => {
      failedIds.value = new Set();
    },
    bulkRemind: () =>
      exec("remind", sel.selectedRemindable.value, (i) =>
        deps.repository.followUp(i.id),
      ),
    bulkApprove: () =>
      exec("approve", sel.selectedApprovable.value, (i) =>
        deps.repository.transition(i.id, { toStatus: "approved" }),
      ),
    bulkWaive: (waiveParams: WaiveParams) =>
      exec("waive", deps.getSelectedItems(), (i) =>
        deps.repository.waive(i.id, waiveParams),
      ),
  };
}
