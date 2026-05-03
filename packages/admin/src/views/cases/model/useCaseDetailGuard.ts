import { computed, type Ref } from "vue";
import type { CaseDetail } from "../types";
import { isTerminalPhase } from "./businessPhaseTransitions";

/**
 * 案件详情页统一权限守门 composable。
 *
 * 从案件 `detail` 响应式引用派生只读/终态/操作权限，
 * 供 `CaseDetailView` 及所有子 tab 共享同一守门逻辑。
 *
 * @param detail - 响应式案件详情（可为 null，即尚未加载）
 * @returns 只读/终态/操作权限的响应式状态集合
 */
export function useCaseDetailGuard(detail: Ref<CaseDetail | null>) {
  const isReadonly = computed(() => detail.value?.readonly === true);
  const isTerminal = computed(() =>
    isTerminalPhase(detail.value?.businessPhase ?? ""),
  );

  const canEdit = computed(() => !isReadonly.value);
  const canTransition = computed(() => !isReadonly.value);
  const canAddTask = computed(() => !isReadonly.value);
  const canPublishMessage = computed(() => !isReadonly.value);
  const canAddDeadline = computed(() => !isReadonly.value);
  const canGenerateForm = computed(() => !isReadonly.value);

  return {
    isReadonly,
    isTerminal,
    canEdit,
    canTransition,
    canAddTask,
    canPublishMessage,
    canAddDeadline,
    canGenerateForm,
  };
}
