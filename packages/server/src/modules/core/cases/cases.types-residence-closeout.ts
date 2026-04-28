// ────────────────────────────────────────────────────────────────
// P1 当前有效期聚合 + 成功結案前置条件
//
// 統一口径：
//   - 当前有效期摘要 → CaseDetailAggregateDto.currentResidencePeriod
//   - 成功結案前置条件 → CaseDetailAggregateDto.successCloseoutCheck
//
// 成功結案（S8 → S9, resultOutcome = approved / success）前置条件：
//   1. 入境確認済み（entryConfirmedAt != null）
//   2. 在留期間録入済み（is_current = true の residence_period が存在）
//   3. 续签提醒已生成（reminder_created = true）
//   4. 提醒创建失败時、成功結案を blocking
//
// 権威来源：
//   - P1/01 §3 M8（在留期間・自動提醒）
//   - P1/02 §3.3（core/cases M8 server tasks）
//   - cases.types-overseas-step.ts ENTRY_SUCCESS_FOLLOW_UP
// ────────────────────────────────────────────────────────────────

import type { Case } from "../model/coreEntities";
import type { ResidencePeriod } from "../model/coreEntities";

// ─── 当前有効期摘要（detail aggregate 子结构）─────────────────

/**
 * 案件当前在留期間摘要 — 嵌入 CaseDetailAggregateDto。
 *
 * 来源：residence_periods 表中 case_id 匹配且 is_current = true 的记录。
 * 若不存在，CaseDetailAggregateDto.currentResidencePeriod = null。
 */
export type CaseResidencePeriodSummary = {
  id: string;
  visaType: string;
  statusOfResidence: string;
  periodYears: number | null;
  periodLabel: string | null;
  validFrom: string;
  validUntil: string;
  cardNumber: string | null;
  entryDate: string | null;
  reminderCreated: boolean;
};

/**
 * 从 ResidencePeriod 实体提取 summary。
 * @param period - 在留期间实体。
 * @returns 供案件详情使用的在留期间摘要。
 */
export function toResidencePeriodSummary(
  period: ResidencePeriod,
): CaseResidencePeriodSummary {
  return {
    id: period.id,
    visaType: period.visaType,
    statusOfResidence: period.statusOfResidence,
    periodYears: period.periodYears,
    periodLabel: period.periodLabel,
    validFrom: period.validFrom,
    validUntil: period.validUntil,
    cardNumber: period.cardNumber,
    entryDate: period.entryDate,
    reminderCreated: period.reminderCreated,
  };
}

// ─── 成功結案前置条件 ────────────────────────────────────────

export const SUCCESS_CLOSEOUT_PRECONDITION_CODES = {
  ENTRY_CONFIRMED: "ENTRY_CONFIRMED",
  RESIDENCE_PERIOD_RECORDED: "RESIDENCE_PERIOD_RECORDED",
  RENEWAL_REMINDER_SCHEDULED: "RENEWAL_REMINDER_SCHEDULED",
} as const;

/**
 *
 */
export type SuccessCloseoutPreconditionCode =
  (typeof SUCCESS_CLOSEOUT_PRECONDITION_CODES)[keyof typeof SUCCESS_CLOSEOUT_PRECONDITION_CODES];

/**
 *
 */
export type SuccessCloseoutPreconditionStatus = {
  code: SuccessCloseoutPreconditionCode;
  label: string;
  satisfied: boolean;
};

/**
 * 成功結案前置条件检查結果。
 *
 * allSatisfied = false → admin 不得提供 "成功結案" 按钮。
 * preconditions 按固定顺序排列，admin 可直接渲染为检查清单。
 */
export type SuccessCloseoutCheckResult = {
  allSatisfied: boolean;
  preconditions: SuccessCloseoutPreconditionStatus[];
};

/**
 * 成功結案前置条件检查输入。
 *
 * 由 getDetailAggregate 在组装阶段收集后传入纯函数。
 */
export type SuccessCloseoutCheckInput = {
  caseEntity: Case;
  currentResidencePeriod: CaseResidencePeriodSummary | null;
};

const BMV_CASE_TYPE_CODE = "business_manager_visa";

/**
 * 判定该 case 是否需要经营管理签成功結案前置条件检查。
 *
 * 仅 BMV 案件且当前处于 S8 阶段（ENTRY_SUCCESS 以后）时返回 true。
 * @param caseEntity - 待检查的案件实体。
 * @returns 是否需要执行成功结案前置条件检查。
 */
export function requiresSuccessCloseoutCheck(caseEntity: Case): boolean {
  if (caseEntity.caseTypeCode !== BMV_CASE_TYPE_CODE) return false;
  const stage = caseEntity.stage ?? caseEntity.status;
  return stage === "S8";
}

/**
 * 纯函数 — 检查经営管理签成功結案前置条件。
 *
 * 规则（对齐 ENTRY_SUCCESS_FOLLOW_UP.requiredBeforeSuccessClose）：
 *   1. entryConfirmedAt 非空 → 入境已确认
 *   2. currentResidencePeriod 非空 → 在留期間已录入
 *   3. currentResidencePeriod.reminderCreated = true → 续签提醒已生成
 *
 * 任一条件不满足 → allSatisfied = false → 不得进入成功結案。
 * @param input - 成功结案前置条件检查输入。
 * @returns 前置条件检查结果与逐项状态。
 */
export function checkSuccessCloseoutPreconditions(
  input: SuccessCloseoutCheckInput,
): SuccessCloseoutCheckResult {
  const { caseEntity, currentResidencePeriod } = input;

  const entryConfirmed: SuccessCloseoutPreconditionStatus = {
    code: SUCCESS_CLOSEOUT_PRECONDITION_CODES.ENTRY_CONFIRMED,
    label: "入境確認済み",
    satisfied: caseEntity.entryConfirmedAt !== null,
  };

  const residencePeriodRecorded: SuccessCloseoutPreconditionStatus = {
    code: SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED,
    label: "在留期間記録済み",
    satisfied: currentResidencePeriod !== null,
  };

  const renewalReminderScheduled: SuccessCloseoutPreconditionStatus = {
    code: SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
    label: "续签提醒生成済み",
    satisfied: currentResidencePeriod?.reminderCreated === true,
  };

  const preconditions = [
    entryConfirmed,
    residencePeriodRecorded,
    renewalReminderScheduled,
  ];

  return {
    allSatisfied: preconditions.every((p) => p.satisfied),
    preconditions,
  };
}
