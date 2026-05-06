import { ref, type Ref } from "vue";
import type { LeadRepository } from "./LeadRepository";
import type { LeadStatusInput, LeadUpdateInput } from "./LeadAdapter";

/**
 * 通用线索写入失败结果。
 *
 * - `messageKey` 为面向用户的 i18n key（如 `leads.errors.updateFailed`）。
 * - `fallbackMessage` 保留 server 原始错误文本，仅用于调试 / 录屏诊断，
 *   不应直接展示给终端用户。
 */
export interface LeadMutationFailure {
  /**
   *
   */
  kind: "generic";
  /**
   *
   */
  messageKey: string;
  /**
   *
   */
  fallbackMessage?: string;
}

/**
 * 头部按钮行为对应的 i18n 错误前缀。
 *
 * 三类操作共享同一个 `LeadMutationFailure` 联合类型，
 * 通过 messageKey 区分文案。
 */
const LEAD_MUTATION_FAIL_KEYS = {
  update: "leads.errors.updateFailed",
  transition: "leads.errors.transitionFailed",
  markLost: "leads.errors.markLostFailed",
} as const;

function toMutationFailure(
  messageKey: string,
  error: unknown,
): LeadMutationFailure {
  const fallbackMessage =
    error instanceof Error && error.message ? error.message : undefined;
  return { kind: "generic", messageKey, fallbackMessage };
}

interface MutationRefs {
  leadId: Ref<string>;
  repo: LeadRepository;
  fetchDetail: () => Promise<void>;
  updateSubmitting: Ref<boolean>;
  transitionSubmitting: Ref<boolean>;
  markLostSubmitting: Ref<boolean>;
}

async function doUpdateLead(
  refs: MutationRefs,
  input: LeadUpdateInput,
): Promise<LeadMutationFailure | null> {
  const id = refs.leadId.value?.trim();
  if (!id || refs.updateSubmitting.value) return null;
  refs.updateSubmitting.value = true;
  try {
    await refs.repo.updateLead(id, input);
    await refs.fetchDetail();
    return null;
  } catch (error) {
    return toMutationFailure(LEAD_MUTATION_FAIL_KEYS.update, error);
  } finally {
    refs.updateSubmitting.value = false;
  }
}

async function doTransitionStatus(
  refs: MutationRefs,
  input: LeadStatusInput,
): Promise<LeadMutationFailure | null> {
  const id = refs.leadId.value?.trim();
  if (!id || refs.transitionSubmitting.value) return null;
  refs.transitionSubmitting.value = true;
  try {
    await refs.repo.transitionLead(id, input);
    await refs.fetchDetail();
    return null;
  } catch (error) {
    return toMutationFailure(LEAD_MUTATION_FAIL_KEYS.transition, error);
  } finally {
    refs.transitionSubmitting.value = false;
  }
}

async function doMarkLost(
  refs: MutationRefs,
  lostReason: string,
): Promise<LeadMutationFailure | null> {
  const id = refs.leadId.value?.trim();
  if (!id || refs.markLostSubmitting.value) return null;
  refs.markLostSubmitting.value = true;
  try {
    await refs.repo.transitionLead(id, {
      toStatus: "lost",
      lostReason,
    });
    await refs.fetchDetail();
    return null;
  } catch (error) {
    return toMutationFailure(LEAD_MUTATION_FAIL_KEYS.markLost, error);
  } finally {
    refs.markLostSubmitting.value = false;
  }
}

/**
 * 线索详情页头部三个按钮（编辑信息 / 调整状态 / 标记流失）共享的 mutation 编排。
 *
 * - 成功后统一调用 `fetchDetail()` 以刷新页面。
 * - 失败统一返回 `LeadMutationFailure`，供调用方做 inline 错误展示与 toast。
 *
 * @param leadId 当前线索 ID（响应式）
 * @param repo  线索仓库（默认走 createLeadRepository）
 * @param fetchDetail 详情刷新函数
 * @returns mutate 方法及其 submitting 标志
 */
export function useLeadMutationActions(
  leadId: Ref<string>,
  repo: LeadRepository,
  fetchDetail: () => Promise<void>,
) {
  const updateSubmitting = ref(false);
  const transitionSubmitting = ref(false);
  const markLostSubmitting = ref(false);

  const refs: MutationRefs = {
    leadId,
    repo,
    fetchDetail,
    updateSubmitting,
    transitionSubmitting,
    markLostSubmitting,
  };

  return {
    updateSubmitting,
    transitionSubmitting,
    markLostSubmitting,
    updateLead: (input: LeadUpdateInput) => doUpdateLead(refs, input),
    transitionStatus: (input: LeadStatusInput) =>
      doTransitionStatus(refs, input),
    markLost: (lostReason: string) => doMarkLost(refs, lostReason),
  };
}
