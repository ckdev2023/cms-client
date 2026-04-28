/**
 * 双层状态机 — businessPhase 业务维度。
 *
 * 与 P0 的 S1-S9 操作维度并行：
 *   - Case.stage (S1-S9) 驱动 Gate/SLA/报表
 *   - Case.business_phase 表达业务语义阶段
 *   - 两者独立推进，stageToPhaseDefault 仅用于迁移回填
 *
 * 权威来源：计划 §3 双层状态机 mermaid 图。
 */

import type { P0Stage } from "./cases.workflow-step";

// ── businessPhase 枚举 ──

export const BUSINESS_PHASES = [
  "CONSULTING",
  "CONTRACTED",
  "WAITING_MATERIAL",
  "MATERIAL_PREPARING",
  "REVIEWING",
  "APPLYING",
  "UNDER_REVIEW",
  "NEED_SUPPLEMENT",
  "SUPPLEMENT_PROCESSING",
  "APPROVED",
  "REJECTED",
  "WAITING_PAYMENT",
  "COE_SENT",
  "VISA_APPLYING",
  "SUCCESS",
  "VISA_REJECTED",
  "RESIDENCE_PERIOD_RECORDED",
  "RENEWAL_REMINDER_SCHEDULED",
  "CLOSED_SUCCESS",
  "CLOSED_FAILED",
] as const;

/** 业务维度阶段枚举值类型。 */
export type BusinessPhase = (typeof BUSINESS_PHASES)[number];

const PHASE_SET: ReadonlySet<string> = new Set(BUSINESS_PHASES);

/**
 * 判断字符串是否为合法 businessPhase。
 * @param value 待判断值
 * @returns 是否为合法 phase
 */
export function isBusinessPhase(value: string): value is BusinessPhase {
  return PHASE_SET.has(value);
}

// ── Phase 转换图 ──

export const PHASE_TRANSITIONS: Readonly<
  Record<BusinessPhase, readonly BusinessPhase[]>
> = {
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

// ── S1-S9 → 默认 phase 映射（迁移回填用） ──

export const STAGE_TO_PHASE_DEFAULT: Readonly<Record<P0Stage, BusinessPhase>> =
  {
    S1: "CONSULTING",
    S2: "WAITING_MATERIAL",
    S3: "MATERIAL_PREPARING",
    S4: "REVIEWING",
    S5: "APPLYING",
    S6: "APPROVED",
    S7: "WAITING_PAYMENT",
    S8: "SUCCESS",
    S9: "CLOSED_SUCCESS",
  };

// ── 终态判定 ──

const TERMINAL_PHASES: ReadonlySet<BusinessPhase> = new Set([
  "CLOSED_SUCCESS",
  "CLOSED_FAILED",
]);

/**
 * 判断 phase 是否为终态（CLOSED_SUCCESS / CLOSED_FAILED）。
 * @param phase 待判断的 businessPhase
 * @returns 是否为终态
 */
export function isTerminalPhase(phase: BusinessPhase): boolean {
  return TERMINAL_PHASES.has(phase);
}

// ── 转换校验 ──

/** phase 流转校验失败时抛出的错误。 */
export class PhaseTransitionError extends Error {
  /**
   * 创建 PhaseTransitionError 实例。
   * @param from 来源 phase
   * @param to 目标 phase
   * @param reason 自定义错误描述
   */
  constructor(
    public readonly from: string,
    public readonly to: string,
    reason?: string,
  ) {
    super(reason ?? `Invalid phase transition: ${from} → ${to}`);
    this.name = "PhaseTransitionError";
  }
}

/**
 * 校验 phase 流转合法性，不合法则抛出 PhaseTransitionError。
 *
 * 校验内容：
 *   1. from / to 必须是合法 phase
 *   2. CLOSED_* 终态不允许再流转
 *   3. to 必须在 PHASE_TRANSITIONS[from] 中
 * @param from 来源 phase
 * @param to 目标 phase
 */
export function assertPhaseTransition(from: string, to: string): void {
  if (!isBusinessPhase(from)) {
    throw new PhaseTransitionError(from, to, `Unknown source phase: ${from}`);
  }
  if (!isBusinessPhase(to)) {
    throw new PhaseTransitionError(from, to, `Unknown target phase: ${to}`);
  }
  if (isTerminalPhase(from)) {
    throw new PhaseTransitionError(
      from,
      to,
      `Terminal phase ${from} does not allow further transitions`,
    );
  }
  const allowed = PHASE_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new PhaseTransitionError(from, to);
  }
}
