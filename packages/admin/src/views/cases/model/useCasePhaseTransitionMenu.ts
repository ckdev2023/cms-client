import { ref, computed, type Ref } from "vue";
import type { CaseDetail } from "../types";
import type { BusinessPhaseId } from "../constantsBusinessPhase";
import { BUSINESS_PHASES } from "../constantsBusinessPhase";
import type { CaseRepository } from "./CaseRepository";
import { CaseRepositoryError } from "./CaseRepository";
import { getAvailablePhaseTargets } from "./businessPhaseTransitions";

export {
  getAvailablePhaseTargets,
  isTerminalPhase,
} from "./businessPhaseTransitions";

/**
 * 判断字符串是否为合法的业务阶段代码。
 *
 * @param v - 待校验字符串
 * @returns 是否为合法的 BusinessPhaseId
 */
export function isValidBusinessPhase(v: string): v is BusinessPhaseId {
  return (BUSINESS_PHASES as readonly string[]).includes(v);
}

/**
 * 阶段流转菜单的响应式状态。
 */
export interface PhaseTransitionMenuState {
  /**
   *
   */
  menuOpen: Ref<boolean>;
  /**
   *
   */
  availableTargets: Ref<readonly string[]>;
  /**
   *
   */
  submitting: Ref<boolean>;
  /**
   *
   */
  errorMessage: Ref<string | null>;
  /**
   * 服务端返回的错误码（如 `CASE_TRANSITION_NOT_ALLOWED`），用于 i18n 映射。
   */
  errorCode: Ref<string | null>;
  /**
   *
   */
  openMenu: () => void;
  /**
   *
   */
  closeMenu: () => void;
  /**
   *
   */
  performTransition: (
    toPhase: string,
    opts?: { closeReason?: string; resultOutcome?: string },
  ) => Promise<boolean>;
}

interface PhaseTransitionMenuInput {
  detail: Ref<CaseDetail | null>;
  repo: CaseRepository;
  getCaseId: () => string;
  onSuccess: () => Promise<void>;
}

/**
 * 从异常中提取服务端错误码与原始消息。
 *
 * @param e - 捕获到的异常对象
 * @returns 错误码与原始消息
 */
export function extractErrorCode(e: unknown): {
  code: string | null;
  raw: string;
} {
  if (e instanceof CaseRepositoryError) {
    return {
      code: e.serverErrorCode ?? null,
      raw: e.message,
    };
  }
  return {
    code: null,
    raw: e instanceof Error ? e.message : String(e),
  };
}

async function doPerformTransition(
  input: PhaseTransitionMenuInput,
  state: {
    submitting: Ref<boolean>;
    errorMessage: Ref<string | null>;
    errorCode: Ref<string | null>;
    menuOpen: Ref<boolean>;
  },
  toPhase: string,
  opts?: { closeReason?: string; resultOutcome?: string },
): Promise<boolean> {
  if (state.submitting.value) return false;
  state.submitting.value = true;
  state.errorMessage.value = null;
  state.errorCode.value = null;
  try {
    await input.repo.transitionPhase(input.getCaseId(), {
      toPhase,
      closeReason: opts?.closeReason,
      resultOutcome: opts?.resultOutcome,
    });
    state.menuOpen.value = false;
    await input.onSuccess();
    return true;
  } catch (e) {
    const extracted = extractErrorCode(e);
    state.errorCode.value = extracted.code;
    state.errorMessage.value = extracted.raw;
    return false;
  } finally {
    state.submitting.value = false;
  }
}

/**
 * 阶段流转菜单 composable — 管理 popover 状态与阶段推进操作。
 *
 * @param input - composable 依赖
 * @param input.detail - 当前案件详情响应式引用
 * @param input.repo - 案件仓储实例
 * @param input.getCaseId - 获取当前案件 ID
 * @param input.onSuccess - 流转成功后的回调
 * @returns 菜单响应式状态与操作方法
 */
export function useCasePhaseTransitionMenu(
  input: PhaseTransitionMenuInput,
): PhaseTransitionMenuState {
  const menuOpen = ref(false);
  const submitting = ref(false);
  const errorMessage = ref<string | null>(null);
  const errorCode = ref<string | null>(null);

  const availableTargets = computed<readonly string[]>(() => {
    const phase = input.detail.value?.businessPhase;
    if (!phase) return [];
    return getAvailablePhaseTargets(phase);
  });

  const state = { submitting, errorMessage, errorCode, menuOpen };

  return {
    menuOpen,
    availableTargets,
    submitting,
    errorMessage,
    errorCode,
    openMenu: () => {
      errorMessage.value = null;
      errorCode.value = null;
      menuOpen.value = true;
    },
    closeMenu: () => {
      menuOpen.value = false;
    },
    performTransition: (toPhase, opts) =>
      doPerformTransition(input, state, toPhase, opts),
  };
}
