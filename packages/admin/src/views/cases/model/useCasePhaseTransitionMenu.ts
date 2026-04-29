import { ref, computed, type Ref } from "vue";
import type { CaseDetail } from "../types";
import type { BusinessPhaseId } from "../constantsBusinessPhase";
import { BUSINESS_PHASES } from "../constantsBusinessPhase";
import type { CaseRepository } from "./CaseRepository";
import { CaseRepositoryError } from "./CaseRepository";

const PHASE_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  CONSULTING: ["CONTRACTED"],
  CONTRACTED: ["WAITING_MATERIAL"],
  WAITING_MATERIAL: ["MATERIAL_PREPARING"],
  MATERIAL_PREPARING: ["REVIEWING"],
  REVIEWING: ["APPLYING"],
  APPLYING: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "NEED_SUPPLEMENT"],
  NEED_SUPPLEMENT: ["SUPPLEMENT_PROCESSING"],
  SUPPLEMENT_PROCESSING: ["UNDER_REVIEW"],
  APPROVED: ["WAITING_PAYMENT"],
  REJECTED: ["CLOSED_FAILED"],
  WAITING_PAYMENT: ["COE_SENT"],
  COE_SENT: ["VISA_APPLYING"],
  VISA_APPLYING: ["SUCCESS", "VISA_REJECTED"],
  SUCCESS: ["RESIDENCE_PERIOD_RECORDED"],
  VISA_REJECTED: ["CLOSED_FAILED"],
  RESIDENCE_PERIOD_RECORDED: ["RENEWAL_REMINDER_SCHEDULED"],
  RENEWAL_REMINDER_SCHEDULED: ["CLOSED_SUCCESS"],
  CLOSED_SUCCESS: [],
  CLOSED_FAILED: [],
};

const TERMINAL_PHASES: ReadonlySet<string> = new Set([
  "CLOSED_SUCCESS",
  "CLOSED_FAILED",
]);

/**
 * 判断业务阶段是否为终态。
 *
 * @param phase - 业务阶段代码
 * @returns 是否为终态（CLOSED_SUCCESS 或 CLOSED_FAILED）
 */
export function isTerminalPhase(phase: string): boolean {
  return TERMINAL_PHASES.has(phase);
}

/**
 * 取得当前阶段可推进的目标阶段列表。
 *
 * @param currentPhase - 当前业务阶段代码
 * @returns 可达目标阶段数组，未知阶段返回空数组
 */
export function getAvailablePhaseTargets(
  currentPhase: string,
): readonly string[] {
  return PHASE_TRANSITIONS[currentPhase] ?? [];
}

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

function extractErrorMessage(e: unknown): string {
  if (e instanceof CaseRepositoryError) {
    return e.serverErrorCode ?? e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

async function doPerformTransition(
  input: PhaseTransitionMenuInput,
  state: {
    submitting: Ref<boolean>;
    errorMessage: Ref<string | null>;
    menuOpen: Ref<boolean>;
  },
  toPhase: string,
  opts?: { closeReason?: string; resultOutcome?: string },
): Promise<boolean> {
  if (state.submitting.value) return false;
  state.submitting.value = true;
  state.errorMessage.value = null;
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
    state.errorMessage.value = extractErrorMessage(e);
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

  const availableTargets = computed<readonly string[]>(() => {
    const phase = input.detail.value?.businessPhase;
    if (!phase) return [];
    return getAvailablePhaseTargets(phase);
  });

  const state = { submitting, errorMessage, menuOpen };

  return {
    menuOpen,
    availableTargets,
    submitting,
    errorMessage,
    openMenu: () => {
      errorMessage.value = null;
      menuOpen.value = true;
    },
    closeMenu: () => {
      menuOpen.value = false;
    },
    performTransition: (toPhase, opts) =>
      doPerformTransition(input, state, toPhase, opts),
  };
}
