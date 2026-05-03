/**
 * CaseCommsLogsAdapter — messages / log 独立 adapter（p0-fe-002e-01 落地）。
 *
 * 本 adapter 完全自包含，拥有独立的解析器（`asRecord` / `pickOptionalString` 等），
 * 不依赖 `CaseAdapterShared` 或其他 adapter 文件。
 *
 * 职责：
 * - `adaptCaseMessageDto` / `adaptCaseMessageListResult`：
 *   将 `/api/communication-logs` DTO 适配为 `MessageItem`。
 * - `adaptCaseLogDto` / `adaptCaseLogListResult`：
 *   将 `/api/timeline` DTO 适配为 `LogEntry`。
 * - `resolveMessageType` / `resolveLogCategory`：
 *   分类映射（对齐 P0-CONTRACT-DETAIL §7 / §13）。
 *
 * 其他配套模块 adapter（documents / forms / validation / billing / tasks / deadlines）
 * 的接缝定义在 `CaseAdapterSupportSeams.ts`，待 p0-fe-006b / p0-fe-006d 填充。
 */

import type { LogCategoryKey, MessageTypeKey } from "../types";
import type { LogEntry, MessageItem, TimelineEntry } from "../types-detail";
import { formatDateTime } from "../../../shared/model/formatDateTime";
import { buildCaseTimelineMessageResult } from "./CaseCommsTimelineBuilders";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pickOptionalString(
  record: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = normalizeOptionalString(record[key]);
    if (value) return value;
  }
  return null;
}

function readStringField(
  record: Record<string, unknown>,
  key: string,
): string | null {
  return typeof record[key] === "string" ? record[key] : null;
}

// ────────────────────────────────────────────────────────────────
// CommunicationLog → MessageItem
// ────────────────────────────────────────────────────────────────

const CHANNEL_FIELDS = ["channelType", "channel_type"];
const SUMMARY_FIELDS = ["contentSummary", "content_summary", "subject"];
const DETAIL_FIELDS = ["fullContent", "full_content"];
const CREATED_AT_FIELDS = ["createdAt", "created_at"];
const CREATED_BY_DISPLAY_FIELDS = [
  "createdByDisplayName",
  "created_by_display_name",
  "createdByName",
  "created_by_name",
];
const FOLLOW_UP_DUE_FIELDS = ["followUpDueAt", "follow_up_due_at"];

const MESSAGE_TYPE_I18N_KEYS: Record<MessageTypeKey, string> = {
  internal: "cases.detail.messages.types.internal",
  client_visible: "cases.detail.messages.types.client_visible",
  phone: "cases.detail.messages.types.phone",
  meeting: "cases.detail.messages.types.meeting",
  auto_email: "cases.detail.messages.types.auto_email",
};

/** @deprecated T2.6 完成後削除 — view 層が typeLabelKey + t() に切替え次第不要。 */
const MESSAGE_TYPE_DISPLAY_LABELS: Record<MessageTypeKey, string> = {
  internal: "内部备注",
  client_visible: "客户可见",
  phone: "電話記録",
  meeting: "対面",
  auto_email: "メール",
};

const AVATAR_STYLES: readonly string[] = [
  "background:linear-gradient(135deg,#6366f1,#818cf8)",
  "background:linear-gradient(135deg,#f59e0b,#fbbf24)",
  "background:linear-gradient(135deg,#10b981,#34d399)",
  "background:linear-gradient(135deg,#ef4444,#f87171)",
  "background:linear-gradient(135deg,#8b5cf6,#a78bfa)",
];

function deriveAvatarStyle(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_STYLES[Math.abs(hash) % AVATAR_STYLES.length];
}

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "??";
}

/**
 * 根据 `channelType` + `visibleToClient` 推导消息类型。
 *
 * 规则（对齐 P0-CONTRACT-DETAIL §7）：
 * - phone → phone
 * - meeting → meeting
 * - email → auto_email
 * - 其余（wechat / line / other）按 visibleToClient 分内部/客户可见
 * @param channelType - 沟通渠道类型
 * @param visibleToClient - 是否客户可见
 * @returns 映射后的消息类型键
 */
export function resolveMessageType(
  channelType: string | null,
  visibleToClient: unknown,
): MessageTypeKey {
  const normalized = channelType?.toLowerCase();
  if (normalized === "phone") return "phone";
  if (normalized === "meeting") return "meeting";
  if (normalized === "email") return "auto_email";
  return visibleToClient === true ? "client_visible" : "internal";
}

function resolveFollowUpAction(
  record: Record<string, unknown>,
): string | undefined {
  const followUpRequired =
    record.followUpRequired === true || record.follow_up_required === true;
  return followUpRequired
    ? (pickOptionalString(record, FOLLOW_UP_DUE_FIELDS) ?? "跟進待")
    : undefined;
}

function resolveDisplayTime(iso: string, locale: string | undefined): string {
  if (!locale) return iso;
  return formatDateTime(iso, locale) || iso;
}

/**
 * 适配单条沟通记录 DTO 为案件消息模型。
 *
 * @param value - 后端 /api/communication-logs 返回的单条记录
 * @param locale - BCP 47 locale；传入时 `time` 为格式化后的展示时间，不传时回退为原始 ISO
 * @returns 适配成功后的 MessageItem；无法识别时返回 null
 */
export function adaptCaseMessageDto(
  value: unknown,
  locale?: string,
): MessageItem | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = readStringField(record, "id");
  const channelType = pickOptionalString(record, CHANNEL_FIELDS);
  const createdAt = pickOptionalString(record, CREATED_AT_FIELDS);
  if (!id || !createdAt) return null;

  const type = resolveMessageType(
    channelType,
    record.visibleToClient ?? record.visible_to_client,
  );
  const author =
    pickOptionalString(record, CREATED_BY_DISPLAY_FIELDS) ?? "System";
  const body =
    pickOptionalString(record, SUMMARY_FIELDS) ??
    pickOptionalString(record, DETAIL_FIELDS) ??
    "";

  return {
    id,
    avatar: deriveInitials(author),
    avatarStyle: deriveAvatarStyle(author),
    author,
    type,
    typeLabelKey: MESSAGE_TYPE_I18N_KEYS[type],
    typeLabel: MESSAGE_TYPE_DISPLAY_LABELS[type],
    body,
    time: resolveDisplayTime(createdAt, locale),
    timeIso: createdAt,
    actionLabel: resolveFollowUpAction(record),
  };
}

/**
 * 适配沟通记录列表响应为消息数组。
 *
 * @param value - 后端返回的沟通记录列表（数组或带 items 的分页对象）
 * @param locale - BCP 47 locale；传入时 `time` 为格式化后的展示时间，不传时回退为原始 ISO
 * @returns 适配后的消息数组；无法识别时返回 null
 */
export function adaptCaseMessageListResult(
  value: unknown,
  locale?: string,
): MessageItem[] | null {
  const items = readArrayOrItems(value);
  if (!items) return null;

  const adapted = items
    .map((item) => adaptCaseMessageDto(item, locale))
    .filter((item): item is MessageItem => item !== null);
  return adapted.length === items.length ? adapted : null;
}

// ────────────────────────────────────────────────────────────────
// TimelineLog → LogEntry
// ────────────────────────────────────────────────────────────────

const TIMELINE_CREATED_AT_FIELDS = ["createdAt", "created_at"];
const TIMELINE_ACTOR_FIELDS = [
  "actorDisplayName",
  "actor_display_name",
  "actorName",
  "actor_name",
  "actorUserId",
  "actor_user_id",
];

function resolveTimelineActor(record: Record<string, unknown>): string {
  return pickOptionalString(record, TIMELINE_ACTOR_FIELDS) ?? "System";
}

const LOG_CATEGORY_KEYS: Record<Exclude<LogCategoryKey, "all">, string> = {
  operation: "cases.log.category.operation",
  review: "cases.log.category.review",
  status: "cases.log.category.status",
};

const CATEGORY_CHIP_MAP: Record<Exclude<LogCategoryKey, "all">, string> = {
  operation: "chip-muted",
  review: "chip-warning",
  status: "chip-primary",
};

const DOT_COLOR_MAP: Record<Exclude<LogCategoryKey, "all">, string> = {
  operation: "var(--muted)",
  review: "var(--warning)",
  status: "var(--primary)",
};

const STATUS_CHANGE_ACTIONS = new Set([
  "case.status_changed",
  "case.stage_changed",
  "case.phase_transitioned",
  "case.billing_risk_acknowledged",
  "case.post_approval_stage_changed",
]);

const REVIEW_ACTIONS = new Set([
  "review_record.created",
  "review_record.approved",
  "review_record.rejected",
  "validation_run.created",
  "validation_run.passed",
  "validation_run.failed",
]);

/**
 * 根据 timeline action 推导日志分类。
 *
 * P0-CONTRACT-DETAIL §13：
 * - status：阶段/状态变更、风险确认、下签后子阶段变更
 * - review：校验运行、复核记录
 * - operation：其余操作（CRUD、沟通、资料、任务、收费等）
 * @param action - 时间线 action 字符串
 * @returns 映射后的日志分类
 */
export function resolveLogCategory(
  action: string,
): Exclude<LogCategoryKey, "all"> {
  if (STATUS_CHANGE_ACTIONS.has(action)) return "status";
  if (REVIEW_ACTIONS.has(action)) return "review";
  return "operation";
}

const OBJECT_TYPE_KEYS: Record<string, string> = {
  case: "cases.log.objectType.case",
  communication_log: "cases.log.objectType.communicationLog",
  document_item: "cases.log.objectType.documentItem",
  document_file: "cases.log.objectType.documentFile",
  task: "cases.log.objectType.task",
  billing_record: "cases.log.objectType.billingRecord",
  payment_record: "cases.log.objectType.paymentRecord",
  review_record: "cases.log.objectType.reviewRecord",
  validation_run: "cases.log.objectType.validationRun",
  submission_package: "cases.log.objectType.submissionPackage",
  generated_document: "cases.log.objectType.generatedDocument",
  reminder: "cases.log.objectType.reminder",
  case_party: "cases.log.objectType.caseParty",
};

function resolveObjectTypeKey(action: string): string {
  const dot = action.indexOf(".");
  if (dot < 0) return action;
  const prefix = action.slice(0, dot);
  return OBJECT_TYPE_KEYS[prefix] ?? prefix;
}

/**
 * 适配单条时间线日志 DTO 为案件日志条目。
 *
 * @param value - 后端 /api/timeline 返回的单条记录
 * @returns 适配成功后的 LogEntry；无法识别时返回 null
 */
export function adaptCaseLogDto(value: unknown): LogEntry | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = readStringField(record, "id");
  const action = readStringField(record, "action");
  const createdAt = pickOptionalString(record, TIMELINE_CREATED_AT_FIELDS);
  if (!id || !action || !createdAt) return null;

  const category = resolveLogCategory(action);
  const actor = resolveTimelineActor(record);
  const payload = readPayloadRecord(record.payload);
  const msg = buildCaseTimelineMessageResult(action, payload);

  return {
    type: category,
    avatar: deriveInitials(actor),
    avatarStyle: deriveAvatarStyle(actor),
    text: msg.key,
    textParams: msg.params,
    category: LOG_CATEGORY_KEYS[category],
    categoryChip: CATEGORY_CHIP_MAP[category],
    objectType: resolveObjectTypeKey(action),
    time: createdAt,
    dotColor: DOT_COLOR_MAP[category],
  };
}

/**
 * 适配时间线日志列表响应为日志条目数组。
 *
 * @param value - 后端返回的时间线日志数组或带 items 的列表对象
 * @returns 适配后的日志条目数组；无法识别时返回 null
 */
export function adaptCaseLogListResult(value: unknown): LogEntry[] | null {
  const items = readArrayOrItems(value);
  if (!items) return null;

  const adapted = items
    .map((item) => adaptCaseLogDto(item))
    .filter((item): item is LogEntry => item !== null);
  return adapted;
}

// ────────────────────────────────────────────────────────────────
// LogEntry → Overview TimelineEntry (D1)
// ────────────────────────────────────────────────────────────────

const OVERVIEW_TIMELINE_COLOR_MAP: Record<string, string> = {
  status: "var(--primary)",
  review: "var(--warning)",
  operation: "var(--muted)",
};
const OVERVIEW_TIMELINE_COLOR_FALLBACK = "var(--muted)";

/**
 * 从 LogEntry 列表导出概览 timeline 摘要。
 *
 * @param entries - adaptCaseLogListResult 输出的日志条目
 * @param limit - 最多返回条数（默认 5）
 * @returns 按时间倒序排列、截取前 N 条的 TimelineEntry 数组
 */
export function buildOverviewTimelineFromLog(
  entries: readonly LogEntry[],
  limit = 5,
): TimelineEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (a.time > b.time) return -1;
    if (a.time < b.time) return 1;
    return 0;
  });

  const top = sorted.slice(0, limit);

  return top.map((e) => ({
    color:
      OVERVIEW_TIMELINE_COLOR_MAP[e.type] ?? OVERVIEW_TIMELINE_COLOR_FALLBACK,
    text: e.text,
    meta: e.time,
  }));
}

// ────────────────────────────────────────────────────────────────
// URL builders (extracted from CaseRepository — p0-fe-002f-02)
// ────────────────────────────────────────────────────────────────

function deriveApiPrefix(casesApiPath: string): string {
  return casesApiPath.replace(/\/cases\/?$/, "");
}

/**
 * 构建获取指定案件沟通记录的完整请求 URL。
 *
 * @param casesApiPath - 案件 API 基础路径，例如 `/api/cases`。
 * @param caseId - 要查询的案件 ID。
 * @returns 带查询参数的完整 URL。
 */
export function buildCaseMessagesUrl(
  casesApiPath: string,
  caseId: string,
): string {
  return `${deriveApiPrefix(casesApiPath)}/communication-logs?caseId=${encodeURIComponent(caseId)}`;
}

/**
 * 构建获取指定案件时间线日志的完整请求 URL。
 *
 * @param casesApiPath - 案件 API 基础路径，例如 `/api/cases`。
 * @param caseId - 要查询的案件 ID。
 * @returns 带查询参数的完整 URL。
 */
export function buildCaseLogEntriesUrl(
  casesApiPath: string,
  caseId: string,
): string {
  return `${deriveApiPrefix(casesApiPath)}/timeline?entityType=case&entityId=${encodeURIComponent(caseId)}`;
}

// ────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────

function readArrayOrItems(value: unknown): unknown[] | null {
  const record = asRecord(value);
  return Array.isArray(value)
    ? value
    : record && Array.isArray(record.items)
      ? (record.items as unknown[])
      : null;
}

function readPayloadRecord(value: unknown): Record<string, unknown> {
  return asRecord(value) ?? {};
}
