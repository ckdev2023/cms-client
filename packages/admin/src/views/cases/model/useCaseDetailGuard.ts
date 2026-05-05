import { computed, type Ref } from "vue";
import type { CaseDetail, CaseDetailTab } from "../types";
import { isTerminalPhase } from "./businessPhaseTransitions";

const TERMINAL_ACCESSIBLE_TABS: ReadonlySet<CaseDetailTab> = new Set([
  "log",
  "overview",
  "forms",
  "documents",
]);

/**
 * 终态案件下判断指定 tab 是否可访问。
 *
 * @param tabKey - tab 键名
 * @param terminal - 是否处于终态
 * @returns 终态下仅 log / overview / forms / documents 可访问（后两者 readonly）；非终态全部可访问
 */
export function isTabAccessibleInTerminal(
  tabKey: CaseDetailTab,
  terminal: boolean,
): boolean {
  if (!terminal) return true;
  return TERMINAL_ACCESSIBLE_TABS.has(tabKey);
}

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

  /**
   * 判断指定 tab 在当前案件状态下是否可访问。
   *
   * @param tabKey - tab 键名
   * @returns 终态下仅 log / overview / forms / documents 可访问（后两者 readonly）；非终态全部可访问
   */
  function isTabAccessible(tabKey: CaseDetailTab): boolean {
    return isTabAccessibleInTerminal(tabKey, isTerminal.value);
  }

  return {
    isReadonly,
    isTerminal,
    canEdit,
    canTransition,
    canAddTask,
    canPublishMessage,
    canAddDeadline,
    canGenerateForm,
    isTabAccessible,
  };
}
