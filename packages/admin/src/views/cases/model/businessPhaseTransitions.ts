/**
 * admin 侧 PHASE_TRANSITIONS 权威副本。
 *
 * 必须与 server `packages/server/src/modules/core/cases/businessPhase.ts`
 * 的 PHASE_TRANSITIONS 表逐字一致；跨包一致性测试
 * `businessPhase.admin-consistency.test.ts` 会自动守门。
 */

import type { BusinessPhaseId } from "../constantsBusinessPhase";

export const PHASE_TRANSITIONS: Readonly<
  Record<BusinessPhaseId, readonly BusinessPhaseId[]>
> = {
  CONSULTING: ["CONTRACTED", "CLOSED_FAILED"],
  CONTRACTED: ["WAITING_MATERIAL", "CLOSED_FAILED"],
  WAITING_MATERIAL: ["MATERIAL_PREPARING", "CLOSED_FAILED"],
  MATERIAL_PREPARING: ["REVIEWING", "CLOSED_FAILED"],
  REVIEWING: ["APPLYING", "CLOSED_FAILED"],
  APPLYING: ["UNDER_REVIEW", "CLOSED_FAILED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "NEED_SUPPLEMENT", "CLOSED_FAILED"],
  NEED_SUPPLEMENT: ["SUPPLEMENT_PROCESSING", "CLOSED_FAILED"],
  SUPPLEMENT_PROCESSING: ["UNDER_REVIEW", "CLOSED_FAILED"],
  APPROVED: ["WAITING_PAYMENT"],
  REJECTED: ["CLOSED_FAILED"],
  WAITING_PAYMENT: ["COE_SENT", "CLOSED_FAILED"],
  COE_SENT: ["VISA_APPLYING", "CLOSED_FAILED"],
  VISA_APPLYING: ["SUCCESS", "VISA_REJECTED", "CLOSED_FAILED"],
  SUCCESS: ["RESIDENCE_PERIOD_RECORDED"],
  VISA_REJECTED: ["CLOSED_FAILED"],
  RESIDENCE_PERIOD_RECORDED: ["RENEWAL_REMINDER_SCHEDULED"],
  RENEWAL_REMINDER_SCHEDULED: ["CLOSED_SUCCESS"],
  CLOSED_SUCCESS: [],
  CLOSED_FAILED: [],
};

const TERMINAL_PHASES: ReadonlySet<BusinessPhaseId> = new Set<BusinessPhaseId>([
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
  return TERMINAL_PHASES.has(phase as BusinessPhaseId);
}

/**
 * 取得当前阶段可推进的目标阶段列表。
 *
 * @param currentPhase - 当前业务阶段代码
 * @returns 可达目标阶段数组，未知阶段返回空数组
 */
export function getAvailablePhaseTargets(
  currentPhase: string,
): readonly BusinessPhaseId[] {
  return PHASE_TRANSITIONS[currentPhase as BusinessPhaseId] ?? [];
}
