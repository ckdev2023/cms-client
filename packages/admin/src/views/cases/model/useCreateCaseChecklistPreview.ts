import { ref, watch, computed, type Ref, type ComputedRef } from "vue";
import type { CaseRepository } from "./CaseRepository";

/** checklist 预览状态。 */
export type ChecklistPreviewState =
  | "idle"
  | "loading"
  | "ok"
  | "empty"
  | "error";

/**
 *
 */
export interface ChecklistPreviewResult {
  /** 当前 caseTypeCode 的 checklist 条数（未请求时为 null）。 */
  checklistCount: Ref<number | null>;
  /** 预览状态。 */
  previewState: ComputedRef<ChecklistPreviewState>;
  /** checklist 为 0 时为 true（加载中或未请求则为 false）。 */
  checklistEmpty: ComputedRef<boolean>;
  /** 手动触发重新请求。 */
  refresh: () => Promise<void>;
}

/**
 * 在案件创建流程中预览 checklist 条数——模板切换时自动拉取。
 *
 * @param caseTypeCode - 响应式的案件类型代码（由 draft.templateId 派生）
 * @param repo - CaseRepository 实例
 * @returns 预览状态与条数 ref
 */
export function useCreateCaseChecklistPreview(
  caseTypeCode: Ref<string> | ComputedRef<string>,
  repo: CaseRepository,
): ChecklistPreviewResult {
  const checklistCount = ref<number | null>(null);
  const loading = ref(false);
  const errored = ref(false);

  async function fetchPreview(code?: string) {
    const c = code ?? (caseTypeCode as Ref<string>).value;
    if (!c) {
      checklistCount.value = null;
      return;
    }
    loading.value = true;
    errored.value = false;
    try {
      checklistCount.value = await repo.previewChecklistCount(c);
    } catch {
      errored.value = true;
      checklistCount.value = null;
    } finally {
      loading.value = false;
    }
  }

  watch(
    () => (caseTypeCode as Ref<string>).value,
    (code) => void fetchPreview(code),
    { immediate: true },
  );

  const previewState = computed<ChecklistPreviewState>(() => {
    if (loading.value) return "loading";
    if (errored.value) return "error";
    if (checklistCount.value === null) return "idle";
    return checklistCount.value > 0 ? "ok" : "empty";
  });

  const checklistEmpty = computed(() => previewState.value === "empty");

  return {
    checklistCount,
    previewState,
    checklistEmpty,
    refresh: () => fetchPreview(),
  };
}
