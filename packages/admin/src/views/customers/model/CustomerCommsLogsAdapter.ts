import type {
  CommChannel,
  CommVisibility,
  CustomerComm,
  CustomerLog,
  LogType,
} from "../types";
import {
  asRecord,
  normalizeOptionalString,
  pickOptionalString,
  readStringField,
} from "./CustomerAdapterShared";

const COMM_CHANNEL_FIELDS = ["channelType", "channel_type"];
const COMM_SUMMARY_FIELDS = ["contentSummary", "content_summary", "subject"];
const COMM_DETAIL_FIELDS = ["fullContent", "full_content"];
const COMM_CREATED_AT_FIELDS = ["createdAt", "created_at"];
const COMM_CREATED_BY_FIELDS = ["createdBy", "created_by"];
const COMM_FOLLOW_UP_FIELDS = ["followUpDueAt", "follow_up_due_at"];
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

const BMV_QUESTIONNAIRE_ACTIONS = [
  "customer.bmv_questionnaire_sent",
  "customer.bmv.questionnaire_sent",
];
const BMV_QUOTE_ACTIONS = [
  "customer.bmv_quote_generated",
  "customer.bmv.quote_generated",
];
const BMV_SIGNED_ACTIONS = ["customer.bmv_signed", "customer.bmv.signed"];

const QUESTIONNAIRE_STATUS_LABELS: Record<string, string> = {
  not_started: "未发送",
  sent: "已发送",
  returned: "已回收",
};
const QUOTE_STATUS_LABELS: Record<string, string> = {
  not_started: "未生成",
  generated: "已生成",
  confirmed: "已确认",
};
const SIGN_STATUS_LABELS: Record<string, string> = {
  not_started: "未签约",
  pending: "待签约",
  signed: "已签约",
};

function matchesAction(action: string, candidates: string[]): boolean {
  return candidates.includes(action);
}

function isBmvTimelineAction(action: string): boolean {
  return (
    matchesAction(action, BMV_QUESTIONNAIRE_ACTIONS) ||
    matchesAction(action, BMV_QUOTE_ACTIONS) ||
    matchesAction(action, BMV_SIGNED_ACTIONS)
  );
}

function normalizeCommChannel(value: unknown): CommChannel | null {
  switch (normalizeOptionalString(value)?.toLowerCase()) {
    case "wechat":
      return "wechat";
    case "phone":
      return "phone";
    case "email":
      return "email";
    case "meeting":
      return "meeting";
    case "line":
      return "line";
    case "other":
      return "other";
    default:
      return null;
  }
}

function normalizeCommVisibility(value: unknown): CommVisibility {
  if (value === true) return "customer";
  if (value === false) return "internal";

  return normalizeOptionalString(value)?.toLowerCase() === "customer"
    ? "customer"
    : "internal";
}

function readPayloadRecord(value: unknown): Record<string, unknown> {
  return asRecord(value) ?? {};
}

function readTimelineEntityMessage(
  payload: Record<string, unknown>,
  keys: string[],
): string | null {
  const direct = pickOptionalString(payload, keys);
  if (direct) return direct;

  const after = asRecord(payload.after);
  const before = asRecord(payload.before);
  return (
    pickOptionalString(after ?? {}, keys) ??
    pickOptionalString(before ?? {}, keys)
  );
}

function formatStatusLabel(
  value: string | null,
  labels: Record<string, string>,
): string | null {
  if (!value) return null;
  return labels[value] ?? value;
}

function buildStatusTransition(
  label: string,
  before: string | null,
  after: string | null,
  labels: Record<string, string>,
): string | null {
  const beforeLabel = formatStatusLabel(before, labels);
  const afterLabel = formatStatusLabel(after, labels);
  if (beforeLabel && afterLabel && beforeLabel !== afterLabel) {
    return `${label}：${beforeLabel} → ${afterLabel}`;
  }
  if (afterLabel) return `${label}：${afterLabel}`;
  if (beforeLabel) return `${label}：${beforeLabel}`;
  return null;
}

function joinTimelineMessage(summary: string, details: string[]): string {
  return details.length > 0 ? `${summary}：${details.join("；")}` : summary;
}

function buildBmvCommSummary(action: string): string | null {
  if (matchesAction(action, BMV_QUESTIONNAIRE_ACTIONS)) {
    return "发送经营管理签问卷";
  }
  if (matchesAction(action, BMV_QUOTE_ACTIONS)) return "生成经营管理签报价";
  if (matchesAction(action, BMV_SIGNED_ACTIONS)) return "确认经营管理签签约";
  return null;
}

function buildBmvCommDetail(
  action: string,
  payload: Record<string, unknown>,
): string {
  if (matchesAction(action, BMV_QUESTIONNAIRE_ACTIONS)) {
    return (
      buildStatusTransition(
        "问卷",
        pickOptionalString(payload, ["beforeQuestionnaireStatus"]),
        pickOptionalString(payload, ["afterQuestionnaireStatus"]),
        QUESTIONNAIRE_STATUS_LABELS,
      ) ?? ""
    );
  }

  if (matchesAction(action, BMV_QUOTE_ACTIONS)) {
    return [
      buildStatusTransition(
        "问卷",
        pickOptionalString(payload, ["beforeQuestionnaireStatus"]),
        pickOptionalString(payload, ["afterQuestionnaireStatus"]),
        QUESTIONNAIRE_STATUS_LABELS,
      ),
      buildStatusTransition(
        "报价",
        pickOptionalString(payload, ["beforeQuoteStatus"]),
        pickOptionalString(payload, ["afterQuoteStatus"]),
        QUOTE_STATUS_LABELS,
      ),
    ]
      .filter((item): item is string => item !== null)
      .join("；");
  }

  if (matchesAction(action, BMV_SIGNED_ACTIONS)) {
    return [
      buildStatusTransition(
        "报价",
        pickOptionalString(payload, ["beforeQuoteStatus"]),
        pickOptionalString(payload, ["afterQuoteStatus"]),
        QUOTE_STATUS_LABELS,
      ),
      buildStatusTransition(
        "签约",
        pickOptionalString(payload, ["beforeSignStatus"]),
        pickOptionalString(payload, ["afterSignStatus"]),
        SIGN_STATUS_LABELS,
      ),
    ]
      .filter((item): item is string => item !== null)
      .join("；");
  }

  return "";
}

function resolveBmvCommType(
  action: string,
  payload: Record<string, unknown>,
): CommChannel {
  if (matchesAction(action, BMV_QUESTIONNAIRE_ACTIONS)) {
    return (
      normalizeCommChannel(
        pickOptionalString(payload, [
          "channelType",
          "channel",
          "deliveryChannel",
        ]),
      ) ?? "other"
    );
  }
  if (matchesAction(action, BMV_SIGNED_ACTIONS)) return "meeting";
  return "other";
}

function resolveBmvCommVisibility(action: string): CommVisibility {
  return matchesAction(action, BMV_SIGNED_ACTIONS) ? "internal" : "customer";
}

function resolveLogType(action: string): LogType {
  if (matchesAction(action, BMV_QUESTIONNAIRE_ACTIONS)) return "comm";
  if (matchesAction(action, BMV_QUOTE_ACTIONS)) return "info";
  if (matchesAction(action, BMV_SIGNED_ACTIONS)) return "case";
  if (action.startsWith("contact_person.")) return "relation";
  if (action.startsWith("case.")) return "case";
  if (action.startsWith("communication_log.")) return "comm";
  return "info";
}

function buildCustomerTimelineMessage(
  action: string,
  payload: Record<string, unknown>,
): string | null {
  if (action === "customer.group_changed") {
    const afterGroup = pickOptionalString(payload, ["afterGroup"]);
    return afterGroup ? `调整客户分组：${afterGroup}` : "调整客户分组";
  }

  switch (action) {
    case "customer.created":
      return "创建客户";
    case "customer.updated":
      return "更新客户信息";
    case "customer.owner_assigned":
      return "调整客户负责人";
    case "customer.deleted":
      return "删除客户";
    default:
      return null;
  }
}

function buildContactTimelineMessage(
  action: string,
  payload: Record<string, unknown>,
): string | null {
  const name = readTimelineEntityMessage(payload, ["name"]);
  if (action === "contact_person.created") {
    return name ? `新增关联人：${name}` : "新增关联人";
  }
  if (action === "contact_person.updated") {
    return name ? `更新关联人：${name}` : "更新关联人";
  }
  if (action === "contact_person.deleted") {
    return name ? `删除关联人：${name}` : "删除关联人";
  }
  return null;
}

function buildCaseTimelineMessage(
  action: string,
  payload: Record<string, unknown>,
): string | null {
  if (action === "case.created") {
    const caseTypeCode = readTimelineEntityMessage(payload, ["caseTypeCode"]);
    return caseTypeCode ? `创建案件：${caseTypeCode}` : "创建案件";
  }
  if (action === "case.status_changed") {
    const from = pickOptionalString(payload, ["from"]);
    const to = pickOptionalString(payload, ["to"]);
    return from && to ? `案件状态变更：${from} → ${to}` : "案件状态变更";
  }
  if (action === "case.updated") return "更新案件信息";
  if (action === "case.deleted") return "删除案件";
  return null;
}

function buildCommunicationTimelineMessage(
  action: string,
  payload: Record<string, unknown>,
): string | null {
  if (action === "communication_log.created") {
    const channel = normalizeCommChannel(
      pickOptionalString(payload, ["channelType"]),
    );
    return channel ? `新增沟通记录：${channel}` : "新增沟通记录";
  }
  if (action === "communication_log.updated") return "更新沟通记录";
  return null;
}

function buildBmvTimelineMessage(
  action: string,
  payload: Record<string, unknown>,
): string | null {
  const summary = buildBmvCommSummary(action);
  if (!summary) return null;

  const detail = buildBmvCommDetail(action, payload);
  return joinTimelineMessage(summary, detail ? [detail] : []);
}

function buildTimelineMessage(
  action: string,
  payload: Record<string, unknown>,
): string {
  return (
    buildBmvTimelineMessage(action, payload) ??
    buildCustomerTimelineMessage(action, payload) ??
    buildContactTimelineMessage(action, payload) ??
    buildCaseTimelineMessage(action, payload) ??
    buildCommunicationTimelineMessage(action, payload) ??
    action
  );
}

function adaptArrayOrItemsResult<T>(
  value: unknown,
  adaptItem: (item: unknown) => T | null,
): T[] | null {
  const items = readArrayOrItems(value);
  if (!items) return null;

  const adapted = items
    .map((item) => adaptItem(item))
    .filter((item): item is T => item !== null);
  return adapted.length === items.length ? adapted : null;
}

function readArrayOrItems(value: unknown): unknown[] | null {
  const record = asRecord(value);
  return Array.isArray(value)
    ? value
    : record && Array.isArray(record.items)
      ? (record.items as unknown[])
      : null;
}

/**
 * 适配单条沟通记录 DTO 为前端沟通记录模型。
 *
 * @param value - 后端返回的沟通记录原始数据
 * @returns 适配成功后的沟通记录；无法识别时返回 `null`
 */
export function adaptCommunicationLogDto(value: unknown): CustomerComm | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = readStringField(record, "id");
  const type = normalizeCommChannel(
    pickOptionalString(record, COMM_CHANNEL_FIELDS),
  );
  const occurredAt = pickOptionalString(record, COMM_CREATED_AT_FIELDS);
  if (!id || !type || !occurredAt) return null;

  const summary = pickOptionalString(record, COMM_SUMMARY_FIELDS) ?? "沟通记录";
  const detail = pickOptionalString(record, COMM_DETAIL_FIELDS) ?? "";
  const nextAction =
    record.followUpRequired === true || record.follow_up_required === true
      ? (pickOptionalString(record, COMM_FOLLOW_UP_FIELDS) ?? "跟进待办")
      : "";

  return {
    id,
    type,
    visibility: normalizeCommVisibility(
      record.visibleToClient ?? record.visible_to_client,
    ),
    occurredAt,
    actor: pickOptionalString(record, COMM_CREATED_BY_FIELDS) ?? "System",
    summary,
    detail,
    nextAction,
  };
}

/**
 * 适配沟通记录列表响应。
 *
 * @param value - 后端返回的沟通记录列表或带 `items` 的分页对象
 * @returns 适配后的沟通记录数组；无法识别时返回 `null`
 */
export function adaptCommunicationLogListResult(
  value: unknown,
): CustomerComm[] | null {
  return adaptArrayOrItemsResult(value, adaptCommunicationLogDto);
}

/**
 * 适配单条时间线日志 DTO 为前端操作日志模型。
 *
 * @param value - 后端返回的时间线日志原始数据
 * @returns 适配成功后的操作日志；无法识别时返回 `null`
 */
export function adaptTimelineLogDto(value: unknown): CustomerLog | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = readStringField(record, "id");
  const action = readStringField(record, "action");
  const at = pickOptionalString(record, TIMELINE_CREATED_AT_FIELDS);
  if (!id || !action || !at) return null;

  const payload = readPayloadRecord(record.payload);
  return {
    id,
    type: resolveLogType(action),
    actor: resolveTimelineActor(record),
    at,
    message: buildTimelineMessage(action, payload),
  };
}

/**
 * 适配时间线日志列表响应。
 *
 * @param value - 后端返回的时间线日志数组或带 `items` 的列表对象
 * @returns 适配后的操作日志数组；无法识别时返回 `null`
 */
export function adaptTimelineLogListResult(
  value: unknown,
): CustomerLog[] | null {
  return adaptArrayOrItemsResult(value, adaptTimelineLogDto);
}

/**
 * 从客户时间线中提取经营管理签相关动作，并虚拟为沟通记录时间线。
 *
 * @param value - 时间线响应原始值
 * @returns 仅包含经营管理签关键动作的沟通记录数组；无法识别时返回 `null`
 */
export function adaptTimelineBmvCommListResult(
  value: unknown,
): CustomerComm[] | null {
  const items = readArrayOrItems(value);
  if (!items) return null;

  const adapted: CustomerComm[] = [];
  for (const item of items) {
    const record = asRecord(item);
    if (!record) return null;

    const action = readStringField(record, "action");
    if (!action) return null;
    if (!isBmvTimelineAction(action)) continue;

    const id = readStringField(record, "id");
    const occurredAt = pickOptionalString(record, TIMELINE_CREATED_AT_FIELDS);
    if (!id || !occurredAt) return null;

    const payload = readPayloadRecord(record.payload);
    adapted.push({
      id,
      type: resolveBmvCommType(action, payload),
      visibility: resolveBmvCommVisibility(action),
      occurredAt,
      actor: resolveTimelineActor(record),
      summary: buildBmvCommSummary(action) ?? action,
      detail: buildBmvCommDetail(action, payload),
      nextAction: "",
    });
  }

  return adapted;
}
