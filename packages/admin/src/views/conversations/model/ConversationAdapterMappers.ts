/**
 * ConversationAdapterMappers — 会话响应适配层。
 *
 * 将服务端 JSON 响应转换为类型化视图模型：
 * - 列表：`adaptConversationListResult`
 * - 详情：`adaptConversationDetailAggregate`
 * - 消息列表：`adaptConversationMessagesResult`
 * - 写入结果：`adaptConversationMutationResult`
 */

import type {
  ConversationListItem,
  ConversationDetail,
  ConversationStatus,
  LinkedEntitySummary,
  MessageItem,
  MessageKind,
  MessageVisibleScope,
  SenderType,
  TranslationStatus,
} from "../types";
import type {
  ConversationListResult,
  ConversationMutationResult,
  ConversationDetailAggregate,
  ConversationMessagesResult,
} from "./ConversationAdapterTypes";

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

function formatDateLabel(isoString: string): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (isToday) return `今天 ${time}`;
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${month}-${day} ${time}`;
  } catch {
    return "";
  }
}

const VALID_STATUSES = new Set<ConversationStatus>(["open", "closed"]);
const VALID_KINDS = new Set<MessageKind>([
  "text",
  "system_event",
  "intake_link",
  "quote_link",
  "sign_link",
]);
const VALID_SCOPES = new Set<MessageVisibleScope>([
  "internal_only",
  "client_visible",
]);
const VALID_SENDER_TYPES = new Set<SenderType>(["app_user", "staff"]);
const VALID_TRANSLATION_STATUSES = new Set<TranslationStatus>([
  "none",
  "pending",
  "completed",
  "failed",
]);

// ─── Linked entity adapter ──────────────────────────────────────

function adaptLinkedEntity(value: unknown): LinkedEntitySummary | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record, "id");
  if (!id) return null;
  const typeRaw = readString(record, "type");
  if (typeRaw !== "lead" && typeRaw !== "customer" && typeRaw !== "case")
    return null;
  return {
    id,
    label: readString(record, "label"),
    type: typeRaw,
  };
}

// ─── Message adapter ────────────────────────────────────────────

function adaptMessageItem(value: unknown): MessageItem | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = readString(record, "id");
  if (!id) return null;

  const kindRaw = readString(record, "kind") || "text";
  const kind: MessageKind = VALID_KINDS.has(kindRaw as MessageKind)
    ? (kindRaw as MessageKind)
    : "text";

  const scopeRaw = readString(record, "visibleScope") || "client_visible";
  const visibleScope: MessageVisibleScope = VALID_SCOPES.has(
    scopeRaw as MessageVisibleScope,
  )
    ? (scopeRaw as MessageVisibleScope)
    : "client_visible";

  const senderTypeRaw = readString(record, "senderType") || "app_user";
  const senderType: SenderType = VALID_SENDER_TYPES.has(
    senderTypeRaw as SenderType,
  )
    ? (senderTypeRaw as SenderType)
    : "app_user";

  const translationRaw = readString(record, "translationStatus") || "none";
  const translationStatus: TranslationStatus = VALID_TRANSLATION_STATUSES.has(
    translationRaw as TranslationStatus,
  )
    ? (translationRaw as TranslationStatus)
    : "none";

  const createdAt = readString(record, "createdAt");

  return {
    id,
    conversationId: readString(record, "conversationId"),
    senderType,
    senderName: readString(record, "senderName"),
    content: readString(record, "content"),
    kind,
    visibleScope,
    translationStatus,
    translatedContent: readNullableString(record, "translatedContent"),
    createdAt,
    createdAtLabel: formatDateLabel(createdAt),
  };
}

// ─── List item adapter ──────────────────────────────────────────

function adaptListItem(value: unknown): ConversationListItem | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = readString(record, "id");
  if (!id) return null;

  const statusRaw = readString(record, "status") || "open";
  const status: ConversationStatus = VALID_STATUSES.has(
    statusRaw as ConversationStatus,
  )
    ? (statusRaw as ConversationStatus)
    : "open";

  const lastMessageAt = readString(record, "lastMessageAt");

  return {
    id,
    channel: readString(record, "channel"),
    preferredLanguage: readString(record, "preferredLanguage"),
    status,
    ownerUserId: readNullableString(record, "ownerUserId"),
    ownerLabel: readString(record, "ownerLabel"),
    lastMessagePreview: readString(record, "lastMessagePreview"),
    lastMessageAt,
    lastMessageAtLabel: formatDateLabel(lastMessageAt),
    unreadCountUser: readNumber(record, "unreadCountUser"),
    unreadCountStaffTenant: readNumber(record, "unreadCountStaffTenant"),
    unreadCountStaffOwner: readNumber(record, "unreadCountStaffOwner"),
    linkedEntity: adaptLinkedEntity(record.linkedEntity),
    appUserName: readString(record, "appUserName"),
  };
}

// ─── Public adapters ────────────────────────────────────────────

/**
 * 将列表 JSON 响应转换为 `ConversationListResult`。
 *
 * @param value - 原始 JSON 响应体
 * @returns 类型化列表结果，或无效时返回 null
 */
export function adaptConversationListResult(
  value: unknown,
): ConversationListResult | null {
  const record = asRecord(value);
  if (!record) return null;

  const rawItems = record.items;
  const items: ConversationListItem[] = Array.isArray(rawItems)
    ? rawItems.map(adaptListItem).filter((i): i is ConversationListItem => !!i)
    : [];

  return {
    items,
    total: readNumber(record, "total"),
    page: readNumber(record, "page"),
    limit: readNumber(record, "limit"),
  };
}

/**
 * 将详情 JSON 响应转换为 `ConversationDetailAggregate`。
 *
 * @param value - 原始 JSON 响应体
 * @returns 类型化详情聚合，或无效时返回 null
 */
export function adaptConversationDetailAggregate(
  value: unknown,
): ConversationDetailAggregate | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = readString(record, "id");
  if (!id) return null;

  const statusRaw = readString(record, "status") || "open";
  const status: ConversationStatus = VALID_STATUSES.has(
    statusRaw as ConversationStatus,
  )
    ? (statusRaw as ConversationStatus)
    : "open";

  const rawMessages = record.messages;
  const messages: MessageItem[] = Array.isArray(rawMessages)
    ? rawMessages.map(adaptMessageItem).filter((m): m is MessageItem => !!m)
    : [];

  const detail: ConversationDetail = {
    id,
    channel: readString(record, "channel"),
    preferredLanguage: readString(record, "preferredLanguage"),
    status,
    ownerUserId: readNullableString(record, "ownerUserId"),
    ownerLabel: readString(record, "ownerLabel"),
    leadId: readNullableString(record, "leadId"),
    customerId: readNullableString(record, "customerId"),
    caseId: readNullableString(record, "caseId"),
    appUserName: readString(record, "appUserName"),
    linkedLead: adaptLinkedEntity(record.linkedLead),
    linkedCustomer: adaptLinkedEntity(record.linkedCustomer),
    linkedCase: adaptLinkedEntity(record.linkedCase),
    messages,
    unreadCountUser: readNumber(record, "unreadCountUser"),
    unreadCountStaffTenant: readNumber(record, "unreadCountStaffTenant"),
    unreadCountStaffOwner: readNumber(record, "unreadCountStaffOwner"),
    createdAt: readString(record, "createdAt"),
  };

  return { detail, messages };
}

/**
 * 将消息列表 JSON 响应转换为 `ConversationMessagesResult`。
 *
 * @param value - 原始 JSON 响应体
 * @returns 类型化消息列表结果，或无效时返回 null
 */
export function adaptConversationMessagesResult(
  value: unknown,
): ConversationMessagesResult | null {
  const record = asRecord(value);
  if (!record) return null;

  const rawItems = record.items;
  const items: MessageItem[] = Array.isArray(rawItems)
    ? rawItems.map(adaptMessageItem).filter((m): m is MessageItem => !!m)
    : [];

  return {
    items,
    total: readNumber(record, "total"),
    page: readNumber(record, "page"),
    limit: readNumber(record, "limit"),
  };
}

/**
 * 将写入操作 JSON 响应转换为 `ConversationMutationResult`。
 *
 * @param value - 原始 JSON 响应体
 * @returns 写入结果，或无效时返回 null
 */
export function adaptConversationMutationResult(
  value: unknown,
): ConversationMutationResult | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = readString(record, "id");
  if (!id) return null;

  return { id };
}
