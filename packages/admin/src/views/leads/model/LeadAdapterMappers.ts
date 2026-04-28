/**
 * LeadAdapterMappers — 线索响应适配层。
 *
 * 将服务端 JSON 响应转换为类型化视图模型：
 * - 列表：`adaptLeadListResult`
 * - 详情：`adaptLeadDetailAggregate`
 * - 写入结果：`adaptLeadMutationResult`
 * - 去重结果：`adaptLeadDedupResult`
 */

import { getCurrentLocale, type AppLocale } from "../../../i18n";
import type { LeadSummary, LeadStatus } from "../types";
import type {
  LeadBasicInfo,
  LeadDetail,
  LeadFollowupRecord,
  LeadLogEntry,
  LeadConversionInfo,
  FollowupChannel,
  BannerPresetKey,
  HeaderButtonPresetKey,
} from "../types-detail";
import { getFollowupChannelLabel } from "../types-detail";
import type {
  LeadListResult,
  LeadMutationResult,
  LeadDetailAggregate,
  LeadDedupResult,
} from "./LeadAdapterTypes";

// ─── Shared helpers ─────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, key: string): string {
  const v = record[key];
  return typeof v === "string" ? v : "";
}

function readNullableString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const v = record[key];
  if (v === null || v === undefined) return null;
  return typeof v === "string" ? v : null;
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const v = record[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return 0;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

function parseIsoDate(isoString: string | null): Date | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function hasExplicitTime(isoString: string | null): boolean {
  return Boolean(isoString && /[T ][0-9]{2}:[0-9]{2}/.test(isoString));
}

function formatMonthDay(date: Date): string {
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatTime(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function startOfDayMs(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

function formatRelativeDayLabel(locale: AppLocale, daysAgo: number): string {
  if (daysAgo === 0) {
    switch (locale) {
      case "en-US":
        return "Today";
      case "ja-JP":
        return "今日";
      default:
        return "今天";
    }
  }

  if (daysAgo === 1) {
    switch (locale) {
      case "en-US":
        return "Yesterday";
      case "ja-JP":
        return "昨日";
      default:
        return "昨天";
    }
  }

  switch (locale) {
    case "en-US":
      return `${daysAgo} days ago`;
    case "ja-JP":
      return `${daysAgo} 日前`;
    default:
      return `${daysAgo} 天前`;
  }
}

function formatNextFollowUpLabel(isoString: string | null): string {
  const date = parseIsoDate(isoString);
  return date ? formatMonthDay(date) : "";
}

function formatUpdatedAtLabel(
  isoString: string | null,
  now: Date = new Date(),
): string {
  if (!isoString) return "";
  const date = parseIsoDate(isoString);
  if (!date) return "";

  const diffDays = Math.floor(
    (startOfDayMs(now) - startOfDayMs(date)) / 86400000,
  );

  if (diffDays >= 0 && diffDays <= 3) {
    const relative = formatRelativeDayLabel(getCurrentLocale(), diffDays);
    return hasExplicitTime(isoString)
      ? `${relative} ${formatTime(date)}`
      : relative;
  }

  return hasExplicitTime(isoString)
    ? `${formatMonthDay(date)} ${formatTime(date)}`
    : formatMonthDay(date);
}

// ─── List item adapter ──────────────────────────────────────────

function resolveRowHighlight(
  status: LeadStatus,
  convertedCustomerId: string | null,
): "warning" | "dimmed" | null {
  if (status === "lost") return "dimmed";
  if (status === "signed" && !convertedCustomerId) return "warning";
  return null;
}

function readLeadIdentity(r: Record<string, unknown>) {
  return {
    id: readString(r, "id"),
    name: readString(r, "name"),
    phone: readString(r, "phone"),
    email: readString(r, "email"),
    referrer: readString(r, "referrer"),
  };
}

function readLeadClassification(r: Record<string, unknown>) {
  const bt = readString(r, "businessType") || readString(r, "intendedCaseType");
  const src = readString(r, "source") || readString(r, "sourceChannel");
  return {
    businessType: bt,
    businessTypeLabel: readString(r, "businessTypeLabel") || bt,
    source: src,
    sourceLabel: readString(r, "sourceLabel") || src,
  };
}

function readLeadSchedule(r: Record<string, unknown>) {
  const nfu =
    readNullableString(r, "nextFollowUpAt") ??
    readNullableString(r, "nextFollowUp");
  const ua = readNullableString(r, "updatedAt");
  return {
    nextAction: readString(r, "nextAction"),
    nextFollowUp: nfu ?? "",
    nextFollowUpLabel: formatNextFollowUpLabel(nfu),
    updatedAt: ua ?? "",
    updatedAtLabel: formatUpdatedAtLabel(ua),
  };
}

function adaptLeadListItemDto(value: unknown): LeadSummary | null {
  const r = asRecord(value);
  if (!r) return null;

  const identity = readLeadIdentity(r);
  if (!identity.id) return null;

  const status = (readString(r, "status") || "new") as LeadStatus;
  const classification = readLeadClassification(r);
  const schedule = readLeadSchedule(r);
  const convertedCustomerId = readNullableString(r, "convertedCustomerId");

  return {
    ...identity,
    ...classification,
    ...schedule,
    status,
    ownerId: readString(r, "ownerUserId") || readString(r, "ownerId"),
    groupId: readString(r, "groupId"),
    convertedCustomerId,
    convertedCaseId: readNullableString(r, "convertedCaseId"),
    dedupHint: readNullableString(r, "dedupHint"),
    rowHighlight: resolveRowHighlight(status, convertedCustomerId),
  };
}

/**
 * 将线索列表原始响应适配为类型化结果。
 *
 * @param value - 列表接口返回的原始 JSON
 * @returns 适配后的列表结果，格式无效时返回 `null`
 */
export function adaptLeadListResult(value: unknown): LeadListResult | null {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.items)) return null;

  const items = record.items
    .map(adaptLeadListItemDto)
    .filter((item): item is LeadSummary => item !== null);

  return {
    items,
    total: readNumber(record, "total") || items.length,
    page: readNumber(record, "page") || 1,
    limit: readNumber(record, "limit") || items.length,
  };
}

// ─── Detail aggregate adapter ───────────────────────────────────

function deriveBanner(
  status: LeadStatus,
  convertedCustomerId: string | null,
): BannerPresetKey {
  if (status === "lost") return "lost";
  if (status === "signed" && !convertedCustomerId) return "signedNotConverted";
  return null;
}

function deriveButtonPreset(
  status: LeadStatus,
  convertedCustomerId: string | null,
  convertedCaseId: string | null,
): HeaderButtonPresetKey {
  if (status === "lost") return "lost";
  if (convertedCaseId) return "convertedCase";
  if (convertedCustomerId) return "convertedCustomer";
  if (status === "signed" && !convertedCustomerId) return "signedNotConverted";
  return "normal";
}

function adaptFollowupDto(value: unknown): LeadFollowupRecord | null {
  const r = asRecord(value);
  if (!r) return null;
  const summary = readString(r, "summary");
  if (!summary) return null;

  const channel = readString(r, "channel") as FollowupChannel;
  return {
    channel,
    channelLabel: getFollowupChannelLabel(channel),
    summary,
    conclusion: readString(r, "conclusion"),
    nextAction: readString(r, "nextAction"),
    nextFollowUp:
      readNullableString(r, "nextFollowUpAt") ?? readString(r, "nextFollowUp"),
    time: readString(r, "createdAt") || readString(r, "time"),
    operator:
      readString(r, "createdByDisplayName") || readString(r, "operator"),
  };
}

function adaptLogEntryDto(value: unknown): LeadLogEntry | null {
  const r = asRecord(value);
  if (!r) return null;
  const logType = readString(r, "logType") || readString(r, "type");
  if (!logType) return null;

  return {
    type: logType as LeadLogEntry["type"],
    operator:
      readString(r, "createdByDisplayName") || readString(r, "operator"),
    time: readString(r, "createdAt") || readString(r, "time"),
    fromValue: readString(r, "fromValue"),
    toValue: readString(r, "toValue"),
    chipClass: readString(r, "chipClass") || "bg-gray-100 text-gray-700",
  };
}

function adaptBasicInfo(r: Record<string, unknown>): LeadBasicInfo {
  return {
    id: readString(r, "id"),
    name: readString(r, "name"),
    phone: readString(r, "phone"),
    email: readString(r, "email"),
    source:
      readString(r, "sourceLabel") ||
      readString(r, "source") ||
      readString(r, "sourceChannel"),
    referrer: readString(r, "referrer"),
    businessType:
      readString(r, "businessTypeLabel") ||
      readString(r, "businessType") ||
      readString(r, "intendedCaseType"),
    group:
      readString(r, "groupLabel") ||
      readString(r, "groupName") ||
      readString(r, "groupId"),
    owner:
      readString(r, "ownerLabel") ||
      readString(r, "ownerDisplayName") ||
      readString(r, "ownerUserId"),
    language: readString(r, "language"),
    note: readString(r, "note"),
  };
}

function adaptConversionInfo(value: unknown): LeadConversionInfo {
  const empty: LeadConversionInfo = {
    dedupResult: null,
    convertedCustomer: null,
    convertedCase: null,
    conversions: [],
  };
  const r = asRecord(value);
  if (!r) return empty;

  return {
    dedupResult: null,
    convertedCustomer: r.convertedCustomer
      ? (r.convertedCustomer as LeadConversionInfo["convertedCustomer"])
      : null,
    convertedCase: r.convertedCase
      ? (r.convertedCase as LeadConversionInfo["convertedCase"])
      : null,
    conversions: Array.isArray(r.conversions)
      ? (r.conversions as LeadConversionInfo["conversions"])
      : [],
  };
}

/**
 * 将线索详情聚合原始响应适配为类型化结果。
 *
 * @param value - 详情接口返回的原始 JSON
 * @returns 详情聚合，格式无效时返回 `null`
 */
export function adaptLeadDetailAggregate(
  value: unknown,
): LeadDetailAggregate | null {
  const record = asRecord(value);
  if (!record) return null;

  const leadRecord = asRecord(record.lead) ?? record;
  const id = readString(leadRecord, "id");
  if (!id) return null;

  const status = (readString(leadRecord, "status") || "new") as LeadStatus;
  const convertedCustomerId = readNullableString(
    leadRecord,
    "convertedCustomerId",
  );
  const convertedCaseId = readNullableString(leadRecord, "convertedCaseId");

  const rawFollowups = Array.isArray(record.followups) ? record.followups : [];
  const followups = rawFollowups
    .map(adaptFollowupDto)
    .filter((f): f is LeadFollowupRecord => f !== null);

  const rawLogs = Array.isArray(record.logs) ? record.logs : [];
  const logs = rawLogs
    .map(adaptLogEntryDto)
    .filter((l): l is LeadLogEntry => l !== null);

  const isReadonly = status === "lost" || readBoolean(leadRecord, "readonly");

  const detail: LeadDetail = {
    id,
    name: readString(leadRecord, "name"),
    status,
    ownerId:
      readString(leadRecord, "ownerUserId") ||
      readString(leadRecord, "ownerId"),
    ownerLabel:
      readString(leadRecord, "ownerLabel") ||
      readString(leadRecord, "ownerDisplayName"),
    ownerInitials: readString(leadRecord, "ownerInitials"),
    ownerAvatarClass: readString(leadRecord, "ownerAvatarClass"),
    groupId: readString(leadRecord, "groupId"),
    groupLabel:
      readString(leadRecord, "groupLabel") ||
      readString(leadRecord, "groupName"),
    banner: deriveBanner(status, convertedCustomerId),
    buttons: deriveButtonPreset(status, convertedCustomerId, convertedCaseId),
    readonly: isReadonly,
    conversationId: readNullableString(leadRecord, "conversationId"),
    info: adaptBasicInfo(leadRecord),
    followups,
    conversion: adaptConversionInfo(record.conversion),
    log: logs,
  };

  return { detail, followups, logs };
}

// ─── Mutation result adapter ────────────────────────────────────

/**
 * 从写入响应中提取变更结果。
 *
 * @param value - 创建/更新/流转接口返回的原始 JSON
 * @returns 包含 `id` 的变更结果，格式无效时返回 `null`
 */
export function adaptLeadMutationResult(
  value: unknown,
): LeadMutationResult | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record, "id");
  return id ? { id } : null;
}

// ─── Dedup result adapter ───────────────────────────────────────

/**
 * 适配去重查询结果。
 *
 * @param value - 去重接口返回的原始 JSON
 * @returns 去重结果，格式无效时返回 `null`
 */
export function adaptLeadDedupResult(value: unknown): LeadDedupResult | null {
  const record = asRecord(value);
  if (!record) return null;

  return {
    leads: Array.isArray(record.leads)
      ? (record.leads as LeadDedupResult["leads"])
      : [],
    customers: Array.isArray(record.customers)
      ? (record.customers as LeadDedupResult["customers"])
      : [],
  };
}
