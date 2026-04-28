// ─── P1 Residence Period & Reminder Adapter (p1-fe-004-02) ───────
// server `currentResidencePeriod` + `successCloseoutCheck` →
// admin `ResidencePeriod` / `ReminderSchedule` / `SuccessCloseoutInfo`.
// 独立ファイルに分離し max-lines を遵守。

import type {
  ResidencePeriod,
  ReminderSchedule,
  SuccessCloseoutInfo,
  SuccessCloseoutPrecondition,
} from "../types-detail";
import {
  asRecord,
  formatDate,
  readBoolean,
  readNullableString,
  readString,
} from "./CaseAdapterShared";

// ─── Residence Period Panel ──────────────────────────────────────

const REMINDER_DAYS_BEFORE = [180, 90, 30] as const;

function computeExpiryDaysFromNow(validUntilIso: string): number {
  const now = new Date();
  const until = new Date(validUntilIso);
  return Math.ceil((until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function resolveResidenceTone(daysRemaining: number): string {
  if (daysRemaining <= 0) return "danger";
  if (daysRemaining <= 90) return "warning";
  return "success";
}

function resolveResidenceStatusLabel(daysRemaining: number): string {
  if (daysRemaining <= 0) return "期限切れ";
  if (daysRemaining <= 30) return "期限 30 日以内";
  if (daysRemaining <= 90) return "期限 90 日以内";
  if (daysRemaining <= 180) return "期限 180 日以内";
  return "有効";
}

function buildResidencePeriodRecordMeta(rp: Record<string, unknown>): string {
  const parts: string[] = [];
  const card = readNullableString(rp, "cardNumber");
  if (card) parts.push(`カード: ${card}`);
  const entry = readNullableString(rp, "entryDate");
  if (entry) parts.push(`入国日: ${formatDate(entry)}`);
  const reminderCreated = readBoolean(rp, "reminderCreated");
  parts.push(reminderCreated ? "提醒: 已设置" : "提醒: 未设置");
  return parts.join(" · ");
}

/**
 * server `currentResidencePeriod` → admin `ResidencePeriod` 表示モデル。
 *
 * @param rp - server aggregate 中 `currentResidencePeriod` スライス
 * @returns 適応済み表示モデル、入力が null / 無効時は null
 */
export function buildResidencePeriodPanel(
  rp: Record<string, unknown> | null,
): ResidencePeriod | null {
  if (!rp) return null;
  const id = readString(rp, "id");
  if (!id) return null;

  const validUntil = readString(rp, "validUntil");
  const daysRemaining = validUntil
    ? computeExpiryDaysFromNow(validUntil)
    : Infinity;

  return {
    id,
    tone: resolveResidenceTone(daysRemaining),
    statusLabel: resolveResidenceStatusLabel(daysRemaining),
    residenceStatus: readString(rp, "statusOfResidence"),
    visaType: readString(rp, "visaType"),
    periodLabel: readNullableString(rp, "periodLabel"),
    startDate: formatDate(readNullableString(rp, "validFrom")),
    endDate: formatDate(readNullableString(rp, "validUntil")),
    cardNumber: readNullableString(rp, "cardNumber"),
    entryDate: readNullableString(rp, "entryDate")
      ? formatDate(readNullableString(rp, "entryDate"))
      : null,
    reminderCreated: readBoolean(rp, "reminderCreated"),
    recordMeta: buildResidencePeriodRecordMeta(rp),
  };
}

// ─── Reminder Schedule Panel ─────────────────────────────────────

function computeReminderSeverity(daysUntilReminder: number): string {
  if (daysUntilReminder <= 0) return "danger";
  if (daysUntilReminder <= 30) return "warning";
  return "primary";
}

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * server `currentResidencePeriod` → admin `ReminderSchedule` 表示モデル。
 *
 * @param rp - server aggregate 中 `currentResidencePeriod` スライス
 * @returns 適応済み表示モデル、入力が null / validUntil 未設定時は null
 */
export function buildReminderSchedulePanel(
  rp: Record<string, unknown> | null,
): ReminderSchedule | null {
  if (!rp) return null;
  const validUntil = readString(rp, "validUntil");
  if (!validUntil) return null;

  const reminderCreated = readBoolean(rp, "reminderCreated");
  const tone = reminderCreated ? "success" : "neutral";
  const statusLabel = reminderCreated ? "設定済み" : "未設定";
  const now = new Date();

  const reminders = REMINDER_DAYS_BEFORE.map((daysBefore) => {
    const remindDate = subtractDays(validUntil, daysBefore);
    const remindDateObj = new Date(remindDate);
    const daysUntilReminder = Math.ceil(
      (remindDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      label: `${daysBefore} 日前`,
      date: formatDate(remindDate),
      severity: computeReminderSeverity(daysUntilReminder),
    };
  });

  return {
    tone,
    statusLabel,
    reminderDate: formatDate(validUntil),
    reminders,
    recordMeta: reminderCreated
      ? "180/90/30 日前リマインダー生成済み"
      : "リマインダー未生成",
  };
}

// ─── Success Closeout Info ───────────────────────────────────────

/**
 * server `successCloseoutCheck` → admin `SuccessCloseoutInfo` 表示モデル。
 *
 * @param sc - server aggregate 中 `successCloseoutCheck` スライス
 * @returns 適応済み表示モデル、入力が null / 無効時は null
 */
export function buildSuccessCloseoutInfo(
  sc: Record<string, unknown> | null,
): SuccessCloseoutInfo | null {
  if (!sc) return null;

  const preconditionsRaw = sc.preconditions;
  if (!Array.isArray(preconditionsRaw)) return null;

  const preconditions: SuccessCloseoutPrecondition[] = preconditionsRaw
    .map((p) => {
      const pr = asRecord(p);
      if (!pr) return null;
      return {
        code: readString(pr, "code"),
        label: readString(pr, "label"),
        satisfied: pr.satisfied === true,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null && !!p.code);

  return {
    allSatisfied: sc.allSatisfied === true,
    preconditions,
  };
}
