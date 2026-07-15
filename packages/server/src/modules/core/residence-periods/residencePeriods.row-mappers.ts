/**
 * residence_periods 行映射叶子模块。
 *
 * 从 `residencePeriods.service.ts` 抽出（拆分批次 S1 解环）：
 * `cases.service.detail-queries` 只需要行映射能力；直接依赖 service 会在
 * cases ↔ residence-periods 之间形成文件级循环（经 cases/public barrel）。
 * 本文件保持叶子属性：除实体类型与 Nest 异常外不得 import 任何业务模块。
 */
import { BadRequestException } from "@nestjs/common";

import type { ResidencePeriod } from "../model/coreEntities";

/** residence_periods 查询行结构（列别名见 service 内 RESIDENCE_PERIOD_COLS）。 */
export type ResidencePeriodQueryRow = {
  id: string;
  org_id: string;
  case_id: string;
  customer_id: string;
  visa_type: string;
  status_of_residence: string;
  period_years: unknown;
  period_label: string | null;
  valid_from: unknown;
  valid_until: unknown;
  card_number: string | null;
  is_current: boolean;
  entry_date: unknown;
  reminder_created: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: unknown;
  updated_at: unknown;
};

/**
 * 归一化日期值为 `YYYY-MM-DD`（BUG-068：本地时区安全，不经 UTC 转换）。
 * @param value 字符串或 Date
 * @returns 日期字符串（YYYY-MM-DD）
 */
export function toDateOnlyString(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) {
    const y = String(value.getFullYear());
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  throw new BadRequestException("Invalid date value");
}

function toTimestampString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  throw new BadRequestException("Invalid timestamp value");
}

function toNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * 把 residence_periods 查询行映射为 ResidencePeriod 实体。
 * @param row 查询行
 * @returns ResidencePeriod 实体
 */
export function mapResidencePeriodRow(
  row: ResidencePeriodQueryRow,
): ResidencePeriod {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    customerId: row.customer_id,
    visaType: row.visa_type,
    statusOfResidence: row.status_of_residence,
    periodYears: toNullableInteger(row.period_years),
    periodLabel: row.period_label,
    validFrom: toDateOnlyString(row.valid_from),
    validUntil: toDateOnlyString(row.valid_until),
    cardNumber: row.card_number,
    isCurrent: row.is_current,
    entryDate: row.entry_date ? toDateOnlyString(row.entry_date) : null,
    reminderCreated: row.reminder_created,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}
