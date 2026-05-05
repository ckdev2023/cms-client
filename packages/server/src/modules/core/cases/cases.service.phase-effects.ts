/* eslint-disable jsdoc/require-param-description, jsdoc/require-returns, jsdoc/require-description */
/**
 * 工作流步骤 / businessPhase 流转副作用纯函数集合。
 *
 * 拆分自 `cases.service.ts`：
 * - workflow_step 流转的目标合法性 + 平行约束校验
 * - 海外返签步骤的自动打戳与结果态收敛
 * - businessPhase 推进的时间戳副作用与 supplement 计次
 * - phase 终态 → S9 映射
 * - timeline payload 构造
 */
import { BadRequestException } from "@nestjs/common";

import type { Case } from "../model/coreEntities";
import {
  PhaseTransitionError,
  assertPhaseTransition,
  isBusinessPhase,
} from "./businessPhase";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import {
  isBmvWorkflowStep,
  isValidStepTransition,
  checkParallelBoundary,
  type BmvWorkflowStep,
} from "./cases.workflow-step";
import { BMV_CASE_TYPE } from "./cases.template-bmv";
import {
  OVERSEAS_STEP_CODES,
  type OverseasStepCode,
} from "./cases.types-overseas-step";

import type { PhaseTransitionInput } from "./cases.types";

const OVERSEAS_STEP_CODE_SET: ReadonlySet<string> = new Set(
  Object.values(OVERSEAS_STEP_CODES),
);

/**
 *
 * @param code
 */
export function isOverseasStepCode(code: string): code is OverseasStepCode {
  return OVERSEAS_STEP_CODE_SET.has(code);
}

/**
 * @param current 当前案件 @param toStepCode 目标步骤编码 @returns 已校验的 BMV 步骤
 * @param toStepCode
 */
export function validateWorkflowStepTransitionTarget(
  current: Case,
  toStepCode: string,
): BmvWorkflowStep {
  if (current.caseTypeCode !== BMV_CASE_TYPE) {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_NOT_APPLICABLE +
        ": Workflow step transitions are only available for BMV cases",
    );
  }
  if (!isBmvWorkflowStep(toStepCode)) {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_TRANSITION_INVALID +
        `: Invalid target step code: ${toStepCode}`,
    );
  }
  const fromStepCode = current.currentWorkflowStepCode;
  if (fromStepCode !== null) {
    if (!isBmvWorkflowStep(fromStepCode)) {
      throw new BadRequestException(
        CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_TRANSITION_INVALID +
          `: Current step code is invalid: ${fromStepCode}`,
      );
    }
    if (!isValidStepTransition(fromStepCode, toStepCode)) {
      throw new BadRequestException(
        CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_TRANSITION_INVALID +
          `: Transition from ${fromStepCode} to ${toStepCode} is not allowed`,
      );
    }
  }
  const currentStage = current.stage ?? current.status;
  const boundary = checkParallelBoundary(toStepCode, currentStage);
  if (!boundary.compatible) {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_PARALLEL_BOUNDARY +
        `: ${boundary.reason ?? "Parallel boundary violated"}`,
    );
  }
  return toStepCode;
}

/**
 *
 */
export type OverseasStepEffects = {
  stampCoeSent: boolean;
  stampOverseasVisa: boolean;
  stampEntryConfirmed: boolean;
  resultOutcome: string | null;
};

/**
 * 解析海外返签步骤流转的附加副作用（自动打戳 + 结果态收敛）。
 *
 * - COE_SENT → stamp coe_sent_at（首次写入）
 * - VISA_APPLYING → stamp overseas_visa_start_at（首次写入）
 * - ENTRY_SUCCESS → stamp entry_confirmed_at（首次写入）
 * - VISA_REJECTED → set result_outcome = 'rejected'
 * @param current
 * @param toStepCode
 */
export function resolveOverseasStepEffects(
  current: Case,
  toStepCode: string,
): OverseasStepEffects {
  return {
    stampCoeSent:
      toStepCode === OVERSEAS_STEP_CODES.COE_SENT && !current.coeSentAt,
    stampOverseasVisa:
      toStepCode === OVERSEAS_STEP_CODES.VISA_APPLYING &&
      !current.overseasVisaStartAt,
    stampEntryConfirmed:
      toStepCode === OVERSEAS_STEP_CODES.ENTRY_SUCCESS &&
      !current.entryConfirmedAt,
    resultOutcome:
      toStepCode === OVERSEAS_STEP_CODES.VISA_REJECTED ? "rejected" : null,
  };
}

/**
 *
 */
export type PhaseStampEffects = {
  stampCoeSent: boolean;
  stampOverseasVisa: boolean;
  stampEntryConfirmed: boolean;
};

/**
 * 解析 businessPhase 推进时应附带的时间戳副作用（首次进入才打戳）。
 *
 * - COE_SENT → stamp coe_sent_at
 * - VISA_APPLYING → stamp overseas_visa_start_at
 * - SUCCESS → stamp entry_confirmed_at
 *
 * 与 `resolveOverseasStepEffects` 共享语义但作用于业务维度 phase 推进通路；
 * 二者各司其职：workflow_step 维度在 `transitionWorkflowStep` 内打戳，
 * businessPhase 维度在 `transitionPhase` 内打戳。
 *
 * @param current 当前 case
 * @param toPhase 目标 phase（已经过合法性校验）
 * @returns 三个 stamping 标志的布尔组合
 * @see BUG-098
 */
export function resolvePhaseStampEffects(
  current: Case,
  toPhase: string,
): PhaseStampEffects {
  return {
    stampCoeSent: toPhase === "COE_SENT" && !current.coeSentAt,
    stampOverseasVisa:
      toPhase === "VISA_APPLYING" && !current.overseasVisaStartAt,
    stampEntryConfirmed: toPhase === "SUCCESS" && !current.entryConfirmedAt,
  };
}

/**
 * 判断 businessPhase 推进是否应递增 `supplement_count`。
 *
 * 业务规范：补资料循环以「重新进入 NEED_SUPPLEMENT」为一次循环计次。
 * 仅当来源为 UNDER_REVIEW、目标为 NEED_SUPPLEMENT 时计为新一轮补资料。
 * `supplement_count_cached` 仅作快速读取缓存，真相源仍为 SubmissionPackage 数量。
 *
 * @param fromPhase 当前 phase
 * @param toPhase 目标 phase
 * @returns 是否应将 supplement_count + 1
 * @see BUG-099
 */
export function shouldIncrementSupplementCount(
  fromPhase: string,
  toPhase: string,
): boolean {
  return fromPhase === "UNDER_REVIEW" && toPhase === "NEED_SUPPLEMENT";
}

/**
 * 终态 phase → S9 映射。非终态返回 null（stage 不动）。
 * @param phase
 */
export function mapPhaseToTerminalStage(phase: string): string | null {
  if (phase === "CLOSED_SUCCESS" || phase === "CLOSED_FAILED") return "S9";
  return null;
}

/**
 *
 */
export type PhaseTransitionSideEffects = {
  stamps: PhaseStampEffects;
  incrementSupplement: boolean;
  closeReason: string | null;
  resultOutcome: string | null;
};

/**
 * CLOSED_FAILED 必须提供 closeReason。
 * @param toPhase
 * @param closeReason
 */
export function assertCloseReasonForFailedPhase(
  toPhase: string,
  closeReason: string | null | undefined,
): void {
  if (toPhase === "CLOSED_FAILED" && !closeReason) {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.CLOSE_REASON_REQUIRED +
        ": closeReason is required when transitioning to CLOSED_FAILED",
    );
  }
}

/**
 * 校验目标 phase 合法性 + state-machine 转换合法性。
 * @param fromPhase
 * @param toPhase
 */
export function assertValidPhaseTransitionInput(
  fromPhase: string,
  toPhase: string,
): void {
  if (!isBusinessPhase(toPhase)) {
    throw new BadRequestException(`Invalid target phase: ${toPhase}`);
  }
  try {
    assertPhaseTransition(fromPhase, toPhase);
  } catch (e) {
    if (e instanceof PhaseTransitionError) {
      throw new BadRequestException(e.message);
    }
    throw e;
  }
}

/**
 * 组装 phase 推进时所需的全部副作用（stamps + 计次 + close 字段）。
 * @param current
 * @param fromPhase
 * @param toPhase
 * @param input
 */
export function buildPhaseTransitionEffects(
  current: Case,
  fromPhase: string,
  toPhase: string,
  input: PhaseTransitionInput,
): PhaseTransitionSideEffects {
  const closeReason: string | null =
    toPhase === "CLOSED_FAILED" ? (input.closeReason ?? null) : null;
  const resultOutcome: string | null =
    toPhase === "CLOSED_SUCCESS"
      ? "success"
      : toPhase === "CLOSED_FAILED"
        ? (input.resultOutcome ?? "failure")
        : null;

  return {
    stamps: resolvePhaseStampEffects(current, toPhase),
    incrementSupplement: shouldIncrementSupplementCount(fromPhase, toPhase),
    closeReason,
    resultOutcome,
  };
}

/**
 *
 * @param fromPhase
 * @param toPhase
 * @param updated
 * @param effects
 */
export function buildPhaseTransitionTimelinePayload(
  fromPhase: string,
  toPhase: string,
  updated: Case,
  effects: PhaseTransitionSideEffects,
): Record<string, unknown> {
  const { stamps, incrementSupplement } = effects;
  return {
    from: fromPhase,
    to: toPhase,
    coeSentAt: stamps.stampCoeSent ? updated.coeSentAt : null,
    overseasVisaStartAt: stamps.stampOverseasVisa
      ? updated.overseasVisaStartAt
      : null,
    entryConfirmedAt: stamps.stampEntryConfirmed
      ? updated.entryConfirmedAt
      : null,
    ...(incrementSupplement
      ? { supplementCount: updated.supplementCount }
      : {}),
    ...(effects.closeReason !== null
      ? { closeReason: effects.closeReason }
      : {}),
    ...(effects.resultOutcome !== null
      ? { resultOutcome: effects.resultOutcome }
      : {}),
  };
}
