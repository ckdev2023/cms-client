/* eslint-disable jsdoc/require-param-description, jsdoc/require-returns, jsdoc/require-description */
/**
 * 案件写入路径校验与字段归一化辅助函数。
 *
 * 拆分自 `cases.service.ts`：
 * - P0 stage / 状态枚举常量
 * - 字段合并与归一化（pickDefined / resolveCaseUpdateFields）
 * - 校验（validateCaseEnums / validateDueAt / assertNotArchived）
 * - 状态流转辅助（resolveRequestedCaseStage / 等）
 * - case_no 自动编号工具
 * - INSERT 参数构建
 */
import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from "@nestjs/common";

import type { Case } from "../model/coreEntities";
import type {
  CaseCreateInput,
  CaseUpdateInput,
  CaseTransitionInput,
} from "./cases.types";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import {
  STAGE_TO_PHASE_DEFAULT,
  isBusinessPhase,
  isTerminalPhase,
} from "./businessPhase";

// PG SQLSTATE → 人类可读原因；落在表内即视为客户输入类错误，统一映射为 400。
// 23xxx 为 integrity constraint violation；22xxx 为 data exception。
const PG_CLIENT_ERROR_REASONS: Readonly<Record<string, string>> = {
  "23503": "foreign key violation",
  "23505": "unique constraint violation",
  "23514": "check constraint violation",
  "23502": "not null violation",
  "22P02": "invalid input format",
  "22008": "datetime field overflow",
  "22007": "invalid datetime format",
};

/**
 * 将建案过程中抛出的异常分流为：
 * - HttpException → 原样抛出
 * - 已知 PG SQLSTATE → 400 BadRequestException（客户输入类）
 * - 其他 → 500 InternalServerErrorException + 控制台日志
 * @param error
 * @param input
 */
export function wrapCreateError(error: unknown, input: CaseCreateInput): never {
  if (error instanceof HttpException) throw error;

  const pgCode = (error as { code?: string }).code;
  const reason = pgCode ? PG_CLIENT_ERROR_REASONS[pgCode] : undefined;
  if (pgCode && reason) {
    const pgMessage = error instanceof Error ? error.message : String(error);
    throw new BadRequestException({
      code: CASE_WRITE_ERROR_CODES.CREATE_FAILED,
      detail: {
        source: "pg",
        constraint: (error as { constraint?: string }).constraint ?? null,
        pgCode,
        pgMessage,
      },
      message: `Failed to create case: ${reason}`,
    });
  }

  const errMsg = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error(
    `[CasesService.create] unexpected error for customer=${input.customerId} caseType=${input.caseTypeCode}:`,
    error,
  );
  throw new InternalServerErrorException({
    code: CASE_WRITE_ERROR_CODES.CREATE_FAILED,
    detail: errMsg,
    message: "Failed to create case",
  });
}

/**
 * P0 案件阶段枚举（S1–S9）。
 * 与 04-核心流程与状态流转.md §1.2 对齐。
 */
export const P0_CASE_STAGES = new Set([
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6",
  "S7",
  "S8",
  "S9",
]);

/**
 * P0 案件阶段流转矩阵（无 Template 时使用）。
 *
 * S9 为终态，不允许继续流转。
 * S1–S6 不得直接跳到 S9（业务约束：未提交入管不得归档）。
 * S7→S9 需要显式 closeReason（失败结案路径）；S8→S9 为正常归档。
 * 补正在 S7 内闭环，不回退主阶段。
 *
 * @see 04-核心流程与状态流转.md §1.2
 * @see BUG-063
 */
export const DEFAULT_CASE_TRANSITIONS: Record<string, string[]> = {
  S1: ["S2"],
  S2: ["S3"],
  S3: ["S2", "S4"],
  S4: ["S3", "S5"],
  S5: ["S3", "S4", "S6"],
  S6: ["S5", "S7"],
  S7: ["S8", "S9"],
  S8: ["S9"],
  S9: [],
};

/**
 * P0 下签后子阶段枚举。
 *
 * P0 存储策略：stage 值写入正式列 `post_approval_stage`，
 * 并兼容回写 `metadata.post_approval_stage`，
 * 对应时间戳写入专用列（`overseas_visa_start_at` / `entry_confirmed_at`）。
 * P1 启用 CaseWorkflowStep 后迁移为正式实体记录。
 */
export const POST_APPROVAL_STAGES = new Set([
  "waiting_final_payment",
  "coe_sent",
  "overseas_visa_applying",
  "entry_success",
]);

export const CASE_PRIORITIES = new Set([
  "low",
  "normal",
  "medium",
  "high",
  "urgent",
]);

export const CASE_RISK_LEVELS = new Set(["none", "low", "medium", "high"]);

export const CASE_RESULT_OUTCOMES = new Set([
  "pending",
  "approved",
  "rejected",
  "withdrawn",
  "visa_rejected",
]);

const DEFAULT_CASE_PREFIX = "CASE";

/**
 * 若 v 不为 undefined 则取 v，否则取 fallback（区别于 ?? 以保留 null）。
 * @param v
 * @param fallback
 */
export function pickDefined<T>(v: T | undefined, fallback: T): T {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return v !== undefined ? v : fallback;
}

/**
 *
 * @param date
 */
export function formatCaseYearMonth(date: Date): string {
  return `${String(date.getFullYear())}${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 *
 * @param prefix
 * @param date
 * @param seq
 */
export function formatCaseNo(prefix: string, date: Date, seq: number): string {
  return `${prefix}-${formatCaseYearMonth(date)}-${String(seq).padStart(4, "0")}`;
}

/**
 *
 * @param settings
 */
export function resolveCasePrefix(settings: unknown): string {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return DEFAULT_CASE_PREFIX;
  }
  const value = (settings as Record<string, unknown>).case_prefix;
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : DEFAULT_CASE_PREFIX;
}

/**
 *
 * @param error
 */
export function isCaseNoConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const pgError = error as { code?: unknown; constraint?: unknown };
  return (
    pgError.code === "23505" && pgError.constraint === "uq_cases_org_case_no"
  );
}

/**
 * 将 CaseUpdateInput 与 current Case 合并，返回各字段的最终值。
 * @param input
 * @param current
 */
export function resolveCaseUpdateFields(input: CaseUpdateInput, current: Case) {
  return {
    caseTypeCode: input.caseTypeCode ?? current.caseTypeCode,
    ownerUserId: input.ownerUserId ?? current.ownerUserId,
    groupId: pickDefined(input.groupId, current.groupId),
    dueAt: pickDefined(input.dueAt, current.dueAt),
    metadata: input.metadata ?? current.metadata,
    caseNo: current.caseNo,
    caseName: pickDefined(input.caseName, current.caseName),
    caseSubtype: pickDefined(input.caseSubtype, current.caseSubtype),
    applicationType: pickDefined(
      input.applicationType,
      current.applicationType,
    ),
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    companyId: pickDefined(input.companyId, current.companyId),
    priority: input.priority ?? current.priority,
    riskLevel: input.riskLevel ?? current.riskLevel,
    assistantUserId: pickDefined(
      input.assistantUserId,
      current.assistantUserId,
    ),
    sourceChannel: pickDefined(input.sourceChannel, current.sourceChannel),
    signedAt: pickDefined(input.signedAt, current.signedAt),
    acceptedAt: pickDefined(input.acceptedAt, current.acceptedAt),
    submissionDate: pickDefined(input.submissionDate, current.submissionDate),
    resultDate: pickDefined(input.resultDate, current.resultDate),
    residenceExpiryDate: pickDefined(
      input.residenceExpiryDate,
      current.residenceExpiryDate,
    ),
    archivedAt: pickDefined(input.archivedAt, current.archivedAt),
    resultOutcome: pickDefined(input.resultOutcome, current.resultOutcome),
    quotePrice: pickDefined(input.quotePrice, current.quotePrice),
    visaPlan: pickDefined(input.visaPlan, current.visaPlan),
    overseasVisaStartAt: pickDefined(
      input.overseasVisaStartAt,
      current.overseasVisaStartAt,
    ),
    entryConfirmedAt: pickDefined(
      input.entryConfirmedAt,
      current.entryConfirmedAt,
    ),
  };
}

/**
 *
 * @param input
 * @param input.stage
 * @param input.status
 * @param input.priority
 * @param input.riskLevel
 * @param input.resultOutcome
 */
export function validateCaseEnums(input: {
  stage?: string;
  status?: string;
  priority?: string;
  riskLevel?: string;
  resultOutcome?: string | null;
}): void {
  resolveRequestedCaseStage(input);
  if (input.priority !== undefined && !CASE_PRIORITIES.has(input.priority)) {
    throw new BadRequestException("Invalid priority");
  }
  if (input.riskLevel !== undefined && !CASE_RISK_LEVELS.has(input.riskLevel)) {
    throw new BadRequestException("Invalid riskLevel");
  }
  if (
    input.resultOutcome !== null &&
    input.resultOutcome !== undefined &&
    !CASE_RESULT_OUTCOMES.has(input.resultOutcome)
  ) {
    throw new BadRequestException("Invalid resultOutcome");
  }
}

/**
 *
 * @param input
 * @param input.stage
 * @param input.status
 */
export function resolveRequestedCaseStage(input: {
  stage?: string;
  status?: string;
}): string | undefined {
  if (
    input.stage !== undefined &&
    input.status !== undefined &&
    input.stage !== input.status
  ) {
    throw new BadRequestException("stage and status must match");
  }

  const requestedStage = input.stage ?? input.status;
  if (requestedStage === undefined) return undefined;
  if (!P0_CASE_STAGES.has(requestedStage)) {
    throw new BadRequestException(
      `Invalid ${input.stage !== undefined ? "stage" : "status"}`,
    );
  }
  return requestedStage;
}

/**
 * S9 归档后写保护 — 对齐 P0 权威基线 §8。
 * 案件进入 S9 后除日志外全字段只读。
 * @param current
 */
export function assertNotArchived(current: Case): void {
  const stage = current.stage ?? current.status;
  if (stage === "S9") {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.S9_READONLY +
        ": Case is archived (S9) and read-only",
    );
  }
}

/**
 *
 * @param input
 */
export function resolveRequestedTransitionStage(
  input: CaseTransitionInput,
): string {
  if (
    input.toStage !== undefined &&
    input.toStatus !== undefined &&
    input.toStage !== input.toStatus
  ) {
    throw new BadRequestException("toStage and toStatus must match");
  }

  const requestedStage = input.toStage ?? input.toStatus;
  if (!requestedStage) {
    throw new BadRequestException("Invalid toStage");
  }
  if (!P0_CASE_STAGES.has(requestedStage)) {
    throw new BadRequestException(
      `Invalid ${input.toStage !== undefined ? "toStage" : "toStatus"}`,
    );
  }
  return requestedStage;
}

/**
 *
 * @param stage
 */
export function resolveInitialBusinessPhase(stage: string): string {
  if (stage in STAGE_TO_PHASE_DEFAULT) {
    return STAGE_TO_PHASE_DEFAULT[stage as keyof typeof STAGE_TO_PHASE_DEFAULT];
  }
  return "CONSULTING";
}

/**
 * stage 流转时推导新的 businessPhase。
 * S9 + closeReason → CLOSED_FAILED（失败结案）；S9 无 closeReason → CLOSED_SUCCESS。
 * 其余阶段走默认映射。
 * @param toStage
 * @param closeReason
 */
export function resolveTransitionBusinessPhase(
  toStage: string,
  closeReason: string | null,
): string {
  if (toStage === "S9" && closeReason) {
    return "CLOSED_FAILED";
  }
  return resolveInitialBusinessPhase(toStage);
}

/**
 *
 * @param fromStage
 * @param toStage
 * @param newPhase
 * @param currentBusinessPhase
 */
export function buildTransitionPayload(
  fromStage: string,
  toStage: string,
  newPhase: string,
  currentBusinessPhase: string,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    from: fromStage,
    to: toStage,
    businessPhase: newPhase,
  };
  if (
    fromStage === "S1" &&
    isBusinessPhase(currentBusinessPhase) &&
    isTerminalPhase(currentBusinessPhase)
  ) {
    payload.synthesized = "data_repair";
  }
  return payload;
}

/**
 *
 * @param fromStage
 * @param toStage
 * @param closeReason
 */
export function assertCloseReasonForNonCompletionArchive(
  fromStage: string,
  toStage: string,
  closeReason: string | null,
): void {
  if (toStage === "S9" && fromStage !== "S8" && !closeReason) {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.CLOSE_REASON_REQUIRED +
        ": closeReason is required when archiving from a non-completion stage",
    );
  }
}

/**
 * 将 CaseCreateInput 展平为 insert 参数数组。
 * @param orgId
 * @param input
 */
export function buildInsertCaseParams(
  orgId: string,
  input: CaseCreateInput,
): unknown[] {
  const workflowStage = resolveRequestedCaseStage(input) ?? "S1";
  const nullableFields = [
    input.caseNo,
    input.caseName,
    input.caseSubtype,
    input.applicationType,
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    input.companyId,
  ].map((v) => v ?? null);
  const nullableTail = [
    input.assistantUserId,
    input.sourceChannel,
    input.signedAt,
    input.acceptedAt,
    input.submissionDate,
    input.resultDate,
    input.residenceExpiryDate,
  ].map((v) => v ?? null);

  return [
    orgId,
    input.customerId,
    input.caseTypeCode,
    workflowStage,
    workflowStage,
    input.groupId ?? null,
    input.ownerUserId,
    input.dueAt ?? null,
    JSON.stringify(input.metadata ?? {}),
    ...nullableFields,
    input.priority ?? "normal",
    input.riskLevel ?? "low",
    ...nullableTail,
    input.resultOutcome ?? null,
    input.quotePrice ?? null,
    input.visaPlan ?? null,
    resolveInitialBusinessPhase(workflowStage),
  ];
}

/** 校验 dueAt 日期合法性。
 * @param dueAt 到期日期 */
export function validateDueAt(dueAt: string | null | undefined): void {
  if (!dueAt) return;
  if (isNaN(new Date(dueAt).getTime()))
    throw new BadRequestException("Invalid dueAt date");
}
