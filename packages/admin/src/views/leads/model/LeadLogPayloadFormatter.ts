/**
 * LeadLogPayloadFormatter — 服务端 lead_logs 行 → UI LeadLogEntry 的纯映射。
 *
 * H-5 修复（2026-05-06）：把 server 端 `logType + payload + createdByDisplayName`
 * 转换为 UI 可直接渲染的 `{ category, fromValue, toValue, chipClass }`：
 * - 让用户看到「谁做的」（actor）
 * - 让用户看到「改了什么」（payload diff）
 *
 * 设计要点：
 * - **纯函数**：不依赖 vue / i18n / store；上层组件自己负责本地化与 owner/group
 *   反解（与 H-9 / R2-B-3 解耦）。
 * - **server 真实 logType 全覆盖**：`created` / `field_change` / `status_change` /
 *   `followup_added` / `converted_customer` / `converted_case` / `owner_assigned` /
 *   `tags_updated` / `exported`。
 * - **向后兼容 fixture 类型**：`status` / `owner` / `group` / `info` 直接透传，
 *   保证 `LEAD_DETAIL_SAMPLES` 不被破坏。
 */

import type { LeadLogType } from "../types-detail";
import { getLeadStatusLabel } from "../types";

/**
 * 安全读取 payload 中的标量字段。
 *
 * @param value 任意值。
 * @returns 字符串形式；非标量返回空字符串。
 */
function readNestedString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

/** field_change payload 项典型结构：`{ <field>: { from, to } }` */
type FieldDiff = { from: unknown; to: unknown };

function isFieldDiff(value: unknown): value is FieldDiff {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return "from" in r || "to" in r;
}

/** 以 LeadLogType 为分类时使用的 chipClass（与 fixture 的 Tailwind 调色板一致）。 */
const CHIP_BY_CATEGORY: Record<LeadLogType, string> = {
  status: "bg-sky-100 text-sky-700",
  owner: "bg-emerald-100 text-emerald-700",
  group: "bg-violet-100 text-violet-700",
  info: "bg-gray-100 text-gray-700",
};

const EMPTY_VALUE = "—";

/** 输入行抽象（与 server `LeadLog` 字段子集对齐）。 */
export interface LeadLogPayloadInput {
  /** 服务端 logType；包含 fixture legacy 短码。 */
  logType: string;
  /** 服务端 payload；通常是 `Record<string, unknown>`。 */
  payload: Record<string, unknown>;
}

/** 格式化后供 UI 直接渲染的四元组。 */
export interface LeadLogPayloadView {
  /** 4 大分类：status / owner / group / info；不识别时归类 info。 */
  category: LeadLogType;
  /** 变更前文案（无前值时使用占位符 `—`）。 */
  fromValue: string;
  /** 变更后文案（无后值时使用占位符 `—`）。 */
  toValue: string;
  /** 与分类匹配的 chip Tailwind class（fixture 同源）。 */
  chipClass: string;
}

function buildView(
  category: LeadLogType,
  fromValue: string,
  toValue: string,
): LeadLogPayloadView {
  return {
    category,
    fromValue: fromValue || EMPTY_VALUE,
    toValue: toValue || EMPTY_VALUE,
    chipClass: CHIP_BY_CATEGORY[category],
  };
}

/**
 * 优先选取 ownerUserId / groupId 字段并归为对应分类。
 *
 * @param payload 服务端 field_change 的 payload。
 * @returns 视图模型；payload 不含明确字段时归为 info。
 */
function formatFieldChange(
  payload: Record<string, unknown>,
): LeadLogPayloadView {
  const ownerDiff = payload.ownerUserId;
  if (isFieldDiff(ownerDiff)) {
    return buildView(
      "owner",
      readNestedString(ownerDiff.from),
      readNestedString(ownerDiff.to),
    );
  }

  const groupDiff = payload.groupId;
  if (isFieldDiff(groupDiff)) {
    return buildView(
      "group",
      readNestedString(groupDiff.from),
      readNestedString(groupDiff.to),
    );
  }

  for (const key of Object.keys(payload)) {
    const v = payload[key];
    if (isFieldDiff(v)) {
      return buildView(
        "info",
        readNestedString(v.from),
        readNestedString(v.to),
      );
    }
  }

  return buildView("info", "", "");
}

function formatStatusChange(
  payload: Record<string, unknown>,
): LeadLogPayloadView {
  const fromCode = readNestedString(payload.from);
  const toCode = readNestedString(payload.to);
  return buildView(
    "status",
    fromCode ? getLeadStatusLabel(fromCode) : "",
    toCode ? getLeadStatusLabel(toCode) : "",
  );
}

/**
 * 把 server 真实 logType 映射为 view，使用 dispatch table 控制
 * `formatLeadLogPayload` 复杂度。
 */
const SERVER_TYPE_HANDLERS: Record<
  string,
  (payload: Record<string, unknown>) => LeadLogPayloadView
> = {
  status_change: formatStatusChange,
  field_change: formatFieldChange,
  created: () => buildView("status", "", getLeadStatusLabel("new")),
  converted_customer: (payload) =>
    buildView(
      "status",
      getLeadStatusLabel("signed"),
      readNestedString(payload.customerId),
    ),
  converted_case: (payload) =>
    buildView(
      "status",
      getLeadStatusLabel("signed"),
      readNestedString(payload.caseId),
    ),
  owner_assigned: (payload) =>
    buildView("owner", "", readNestedString(payload.ownerUserId)),
  followup_added: (payload) =>
    buildView("info", "", readNestedString(payload.channel)),
  tags_updated: (payload) => {
    const tags = payload.tags;
    const joined = Array.isArray(tags) ? tags.map(String).join(", ") : "";
    return buildView("info", "", joined);
  },
  exported: () => buildView("info", "", ""),
};

const LEGACY_TYPES: ReadonlySet<LeadLogType> = new Set([
  "status",
  "owner",
  "group",
  "info",
]);

function isLegacyType(logType: string): logType is LeadLogType {
  return LEGACY_TYPES.has(logType as LeadLogType);
}

function formatLegacy(category: LeadLogType): LeadLogPayloadView {
  return {
    category,
    fromValue: "",
    toValue: "",
    chipClass: CHIP_BY_CATEGORY[category],
  };
}

/**
 * 把服务端 lead_logs 行格式化为可直接渲染的 view-model。
 *
 * 调用方拿到结果后只需补 `time` / `operator` 两个字段即可形成完整
 * `LeadLogEntry`（参考 `LeadAdapterMappers.adaptLogEntryDto`）。
 *
 * @param input 服务端 logType + payload。
 * @returns 分类 + 显示用 from/to + chipClass。
 */
export function formatLeadLogPayload(
  input: LeadLogPayloadInput,
): LeadLogPayloadView {
  const { logType, payload } = input;
  if (isLegacyType(logType)) return formatLegacy(logType);
  const handler = SERVER_TYPE_HANDLERS[logType];
  return handler ? handler(payload) : buildView("info", "", "");
}
