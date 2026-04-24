/**
 * CaseCommsLogsAdapter — messages / log 独立 adapter（p0-fe-002a-04 确认独立）。
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
 * 的接缝定义在 `CaseAdapterSupportSeams.ts`，待后续子任务实现。
 */

import type { LogCategoryKey, MessageTypeKey } from "../types";
import type { LogEntry, MessageItem } from "../types-detail";

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
const CREATED_BY_FIELDS = ["createdBy", "created_by"];
const FOLLOW_UP_DUE_FIELDS = ["followUpDueAt", "follow_up_due_at"];

const MESSAGE_TYPE_LABELS: Record<MessageTypeKey, string> = {
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

/**
 * 适配单条沟通记录 DTO 为案件消息模型。
 *
 * @param value - 后端 /api/communication-logs 返回的单条记录
 * @returns 适配成功后的 MessageItem；无法识别时返回 null
 */
export function adaptCaseMessageDto(value: unknown): MessageItem | null {
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
  const author = pickOptionalString(record, CREATED_BY_FIELDS) ?? "System";
  const body =
    pickOptionalString(record, SUMMARY_FIELDS) ??
    pickOptionalString(record, DETAIL_FIELDS) ??
    "";

  const followUpRequired =
    record.followUpRequired === true || record.follow_up_required === true;
  const actionLabel = followUpRequired
    ? (pickOptionalString(record, FOLLOW_UP_DUE_FIELDS) ?? "跟進待")
    : undefined;

  return {
    id,
    avatar: deriveInitials(author),
    avatarStyle: deriveAvatarStyle(author),
    author,
    type,
    typeLabel: MESSAGE_TYPE_LABELS[type],
    body,
    time: createdAt,
    actionLabel,
  };
}

/**
 * 适配沟通记录列表响应为消息数组。
 *
 * @param value - 后端返回的沟通记录列表（数组或带 items 的分页对象）
 * @returns 适配后的消息数组；无法识别时返回 null
 */
export function adaptCaseMessageListResult(
  value: unknown,
): MessageItem[] | null {
  const items = readArrayOrItems(value);
  if (!items) return null;

  const adapted = items
    .map((item) => adaptCaseMessageDto(item))
    .filter((item): item is MessageItem => item !== null);
  return adapted.length === items.length ? adapted : null;
}

// ────────────────────────────────────────────────────────────────
// TimelineLog → LogEntry
// ────────────────────────────────────────────────────────────────

const TIMELINE_CREATED_AT_FIELDS = ["createdAt", "created_at"];
const TIMELINE_ACTOR_FIELDS = ["actorUserId", "actor_user_id"];

const LOG_CATEGORY_LABELS: Record<Exclude<LogCategoryKey, "all">, string> = {
  operation: "操作日志",
  review: "審核日志",
  status: "状態変更",
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

const OBJECT_TYPE_LABELS: Record<string, string> = {
  case: "案件",
  communication_log: "沟通記録",
  document_item: "資料",
  document_file: "文件",
  task: "任務",
  billing_record: "収費",
  payment_record: "入金",
  review_record: "復核",
  validation_run: "校験",
  submission_package: "提出包",
  generated_document: "文書",
  reminder: "提醒",
  case_party: "関連人",
};

function resolveObjectType(action: string): string {
  const dot = action.indexOf(".");
  if (dot < 0) return action;
  const prefix = action.slice(0, dot);
  return OBJECT_TYPE_LABELS[prefix] ?? prefix;
}

function buildGroupTransferMessage(payload: Record<string, unknown>): string {
  const fromGroup = pickOptionalString(payload, ["fromGroupName", "fromGroup"]);
  const toGroup = pickOptionalString(payload, ["toGroupName", "toGroup"]);
  const reason = pickOptionalString(payload, ["reason"]);
  const parts = [
    "案件転組",
    fromGroup && toGroup ? `${fromGroup} → ${toGroup}` : null,
    reason ? `理由：${reason}` : null,
  ].filter(Boolean);
  return parts.join("；");
}

function labelWithSuffix(
  label: string,
  payload: Record<string, unknown>,
  keys: string[],
): string {
  const suffix = pickOptionalString(payload, keys);
  return suffix ? `${label}：${suffix}` : label;
}

function buildStageChangeMessage(payload: Record<string, unknown>): string {
  const from = pickOptionalString(payload, ["from", "fromStage"]);
  const to = pickOptionalString(payload, ["to", "toStage"]);
  return from && to ? `段階変更：${from} → ${to}` : "段階変更";
}

type TimelineMessageBuilder = (p: Record<string, unknown>) => string;

const TIMELINE_MESSAGE_BUILDERS: Record<string, TimelineMessageBuilder> = {
  "case.created": (p) =>
    labelWithSuffix("案件作成", p, ["caseTypeCode", "case_type_code"]),
  "case.updated": () => "案件情報更新",
  "case.deleted": () => "案件削除",
  "case.status_changed": buildStageChangeMessage,
  "case.stage_changed": buildStageChangeMessage,
  "case.billing_risk_acknowledged": (p) =>
    labelWithSuffix("未収金リスク確認", p, ["reasonCode", "reason_code"]),
  "case.post_approval_stage_changed": (p) =>
    labelWithSuffix("許可後段階変更", p, ["stage", "toStage"]),
  "case.cross_group_created": (p) => labelWithSuffix("越境建案", p, ["reason"]),
  "case.group_transferred": buildGroupTransferMessage,
  "communication_log.created": (p) =>
    labelWithSuffix("沟通記録追加", p, ["channelType", "channel_type"]),
  "communication_log.updated": () => "沟通記録更新",
};

function buildCaseTimelineMessage(
  action: string,
  payload: Record<string, unknown>,
): string {
  const builder = TIMELINE_MESSAGE_BUILDERS[action];
  return builder ? builder(payload) : action;
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
  const actor = pickOptionalString(record, TIMELINE_ACTOR_FIELDS) ?? "System";
  const payload = readPayloadRecord(record.payload);
  const text = buildCaseTimelineMessage(action, payload);

  return {
    type: category,
    avatar: deriveInitials(actor),
    avatarStyle: deriveAvatarStyle(actor),
    text,
    category: LOG_CATEGORY_LABELS[category],
    categoryChip: CATEGORY_CHIP_MAP[category],
    objectType: resolveObjectType(action),
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
  return adapted.length === items.length ? adapted : null;
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
