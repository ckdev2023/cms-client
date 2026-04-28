import type { DeadlineItem } from "../types-detail";
import {
  asRecord,
  formatDate,
  readNullableString,
  readString,
} from "./CaseAdapterShared";

function readArrayOrItems(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  const r = asRecord(value);
  return r && Array.isArray(r.items) ? (r.items as unknown[]) : null;
}

function deriveApiPrefix(casesApiPath: string): string {
  return casesApiPath.replace(/\/cases\/?$/, "");
}

const TARGET_TYPE_TITLES: Record<string, string> = {
  case: "案件期限",
  customer: "顧客関連期限",
  requirement: "資料提出期限",
  deadline: "手続き期限",
  billing_plan: "支払期限",
};

const SEND_STATUS_LABELS: Record<string, string> = {
  pending: "未送信",
  sent: "送信済み",
  failed: "送信失敗",
  canceled: "取消済み",
};

const DEFAULT_REMAINING = { label: "—", severity: "muted" } as const;

function computeRemaining(remindAt: string): {
  label: string;
  severity: string;
} {
  try {
    const target = new Date(remindAt);
    if (Number.isNaN(target.getTime())) return { ...DEFAULT_REMAINING };
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const days = Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
    if (days < 0)
      return { label: `${Math.abs(days)}日超過`, severity: "danger" };
    if (days === 0) return { label: "本日", severity: "danger" };
    if (days <= 7) return { label: `あと${days}日`, severity: "danger" };
    if (days <= 30) return { label: `あと${days}日`, severity: "warning" };
    if (days <= 90) return { label: `あと${days}日`, severity: "primary" };
    return { label: `あと${days}日`, severity: "muted" };
  } catch {
    return { ...DEFAULT_REMAINING };
  }
}

function resolveReminderTitle(
  payload: Record<string, unknown> | null,
  targetType: string,
): string {
  return (
    (payload ? readString(payload, "title") : "") ||
    TARGET_TYPE_TITLES[targetType] ||
    "期限"
  );
}

function buildReminderDesc(
  payload: Record<string, unknown> | null,
  targetType: string,
  sendStatus: string,
): string {
  const descParts: string[] = [];
  const payloadDesc = payload ? readString(payload, "description") : "";
  if (payloadDesc) descParts.push(payloadDesc);
  if (sendStatus) descParts.push(SEND_STATUS_LABELS[sendStatus] ?? sendStatus);
  return descParts.join(" · ") || targetType;
}

function adaptReminderDto(value: unknown): DeadlineItem | null {
  const r = asRecord(value);
  if (!r) return null;
  const id = readString(r, "id");
  if (!id) return null;

  const remindAt = readNullableString(r, "remindAt");
  const targetType = readString(r, "targetType") || "case";
  const sendStatus = readString(r, "sendStatus");
  const payload = asRecord(r.payloadSnapshot);
  const remainingState = remindAt
    ? computeRemaining(remindAt)
    : DEFAULT_REMAINING;

  return {
    id,
    title: resolveReminderTitle(payload, targetType),
    desc: buildReminderDesc(payload, targetType, sendStatus),
    date: remindAt ? formatDate(remindAt) : "—",
    remaining: remainingState.label,
    severity: remainingState.severity,
  };
}

/**
 * 适配 `/api/reminders?caseId=xxx` 返回值为期限列表。
 *
 * @param value - 原始 JSON（`{ items: [...], total }` 或数组）
 * @returns 期限列表，格式无效时返回 `null`
 */
export function adaptCaseDeadlineList(value: unknown): DeadlineItem[] | null {
  const items = readArrayOrItems(value);
  if (!items) return null;

  return items
    .map(adaptReminderDto)
    .filter((item): item is DeadlineItem => item !== null);
}

/**
 * 构建提醒列表 URL。
 *
 * @param casesApiPath - cases API 基路径（如 `/api/cases`）
 * @param caseId - 案件 ID
 * @returns 完整 URL，如 `/api/reminders?caseId=case-001`
 */
export function buildCaseRemindersUrl(
  casesApiPath: string,
  caseId: string,
): string {
  return `${deriveApiPrefix(casesApiPath)}/reminders?caseId=${encodeURIComponent(caseId)}`;
}
