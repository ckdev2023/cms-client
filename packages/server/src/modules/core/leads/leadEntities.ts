/**
 * Lead 管理側（admin/staff）専用エンティティ。
 *
 * lead_followups / lead_logs テーブルに対応。
 * portal 側 Lead 本体は portal/model/portalEntities.ts で管理。
 */

// ── Lead Status ──

export const LEAD_P0_STATUSES = [
  "new",
  "following",
  "pending_sign",
  "signed",
  "converted_case",
  "lost",
] as const;

/**
 *
 */
export type LeadP0Status = (typeof LEAD_P0_STATUSES)[number];

/**
 * P0 合法状态遷移ホワイトリスト。
 *
 * 運用効率を優先し、非終態（new / following / pending_sign / signed）の
 * 4 つは互いに任意切替を許可する：
 * - 前向き飛び越し（例：new → signed）— 顧客が一気に複数段階を
 *   スキップした際、運営担当が実際の進度に合わせて状態を直接補正できる。
 * - 後ろ向き訂正（例：signed → following）— 誤入力をやり直せる。
 *
 * 終態関連は従来通り：
 * - 任意の非終態 → `lost`（`lost_reason` が必須、`validateTransition` で強制）。
 * - `signed` → `converted_case`（案件作成は専用フローを通る）。
 * - `converted_case` は終態（出 transition なし）。
 * - `lost` → `following`（復活経路は従来通り、直接 `signed` などへは遷移不可）。
 */
export const LEAD_STATUS_TRANSITIONS: ReadonlyMap<
  LeadP0Status,
  ReadonlySet<LeadP0Status>
> = new Map([
  [
    "new",
    new Set<LeadP0Status>(["following", "pending_sign", "signed", "lost"]),
  ],
  [
    "following",
    new Set<LeadP0Status>(["new", "pending_sign", "signed", "lost"]),
  ],
  [
    "pending_sign",
    new Set<LeadP0Status>(["new", "following", "signed", "lost"]),
  ],
  [
    "signed",
    new Set<LeadP0Status>([
      "new",
      "following",
      "pending_sign",
      "converted_case",
      "lost",
    ]),
  ],
  ["converted_case", new Set<LeadP0Status>([])],
  ["lost", new Set<LeadP0Status>(["following"])],
]);

/**
 * 判断给定值是否为合法的 Lead P0 状态。
 * @param value 待判断的值。
 * @returns 当 value 属于 LeadP0Status 时返回 true。
 */
export function isLeadP0Status(value: unknown): value is LeadP0Status {
  return (
    typeof value === "string" &&
    (LEAD_P0_STATUSES as readonly string[]).includes(value)
  );
}

// ── Followup Channel ──

export const LEAD_FOLLOWUP_CHANNELS = [
  "phone",
  "email",
  "wechat",
  "line",
  "onsite",
  "other",
] as const;

/**
 *
 */
export type LeadFollowupChannel = (typeof LEAD_FOLLOWUP_CHANNELS)[number];

/**
 * 判断给定值是否为合法的跟进渠道。
 * @param value 待判断的值。
 * @returns 当 value 属于 LeadFollowupChannel 时返回 true。
 */
export function isLeadFollowupChannel(
  value: unknown,
): value is LeadFollowupChannel {
  return (
    typeof value === "string" &&
    (LEAD_FOLLOWUP_CHANNELS as readonly string[]).includes(value)
  );
}

// ── LeadFollowup Entity ──

/**
 *
 */
export type LeadFollowup = {
  id: string;
  leadId: string;
  channel: string;
  summary: string | null;
  conclusion: string | null;
  nextAction: string | null;
  nextFollowUpAt: string | null;
  createdBy: string | null;
  createdAt: string;
};

// ── LeadLog Entity ──

/**
 *
 */
export type LeadLog = {
  id: string;
  leadId: string;
  logType: string;
  payload: Record<string, unknown>;
  createdBy: string | null;
  createdByDisplayName: string | null;
  createdAt: string;
};

// ── DB Row Types ──

/**
 *
 */
export type LeadFollowupQueryRow = {
  id: string;
  lead_id: string;
  channel: string;
  summary: string | null;
  conclusion: string | null;
  next_action: string | null;
  next_follow_up_at: unknown;
  created_by: string | null;
  created_at: unknown;
};

/**
 *
 */
export type LeadLogQueryRow = {
  id: string;
  lead_id: string;
  log_type: string;
  payload: unknown;
  created_by: string | null;
  created_by_display_name: string | null;
  created_at: unknown;
};

// ── Value Helpers ──

function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function requireTimestampString(value: unknown, field: string): string {
  const s = toTimestampStringOrNull(value);
  if (!s) throw new Error(`Invalid timestamp: ${field}`);
  return s;
}

function normalizePayload(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

// ── Map Functions ──

/**
 * 将 Lead 跟进记录查询行映射为领域实体。
 * @param r LeadFollowup 查询结果行。
 * @returns 映射后的 LeadFollowup 实体。
 */
export function mapLeadFollowupRow(r: LeadFollowupQueryRow): LeadFollowup {
  return {
    id: r.id,
    leadId: r.lead_id,
    channel: r.channel,
    summary: r.summary,
    conclusion: r.conclusion,
    nextAction: r.next_action,
    nextFollowUpAt: toTimestampStringOrNull(r.next_follow_up_at),
    createdBy: r.created_by,
    createdAt: requireTimestampString(r.created_at, "created_at"),
  };
}

/**
 * 将 Lead 日志查询行映射为领域实体。
 * @param r LeadLog 查询结果行。
 * @returns 映射后的 LeadLog 实体。
 */
export function mapLeadLogRow(r: LeadLogQueryRow): LeadLog {
  return {
    id: r.id,
    leadId: r.lead_id,
    logType: r.log_type,
    payload: normalizePayload(r.payload),
    createdBy: r.created_by,
    createdByDisplayName: r.created_by_display_name ?? null,
    createdAt: requireTimestampString(r.created_at, "created_at"),
  };
}
