import type {
  DocumentRequirementStatus,
  DocumentRequirement,
} from "./UserDocument";

/**
 * P0 资料项状态合法转移表（P0/04 §3 + prototype 対齐）。
 */
export const DOCUMENT_STATUS_TRANSITIONS: Record<
  DocumentRequirementStatus,
  DocumentRequirementStatus[]
> = {
  not_sent: ["waiting_upload", "waived"],
  waiting_upload: ["uploaded_reviewing", "waived"],
  uploaded_reviewing: ["approved", "revision_required", "waived"],
  approved: ["expired", "uploaded_reviewing"],
  revision_required: ["uploaded_reviewing", "waived"],
  expired: ["uploaded_reviewing"],
  waived: ["not_sent"],
};

/**
 * Legacy → P0 compat 映射（与 prototype documents-config 对齐）。
 */
const COMPAT_STATUS_MAP: Record<string, DocumentRequirementStatus> = {
  done: "approved",
  idle: "not_sent",
  submitted: "uploaded_reviewing",
  reviewed: "approved",
  rejected: "revision_required",
  pending: "waiting_upload",
  missing: "not_sent",
  not_sent: "not_sent",
  waiting_upload: "waiting_upload",
  uploaded_reviewing: "uploaded_reviewing",
  approved: "approved",
  revision_required: "revision_required",
  expired: "expired",
  waived: "waived",
};

const ALL_P0_STATUSES: ReadonlySet<string> = new Set<DocumentRequirementStatus>(
  [
    "not_sent",
    "waiting_upload",
    "uploaded_reviewing",
    "approved",
    "revision_required",
    "waived",
    "expired",
  ],
);

/**
 * 将原始状态码归一化为 P0 枚举值。未识别值回退为 `not_sent`。
 *
 * @param raw - 原始状态码（可能为 legacy 或 P0）
 * @returns P0 枚举值
 */
export function normalizeDocumentStatus(
  raw: string | null | undefined,
): DocumentRequirementStatus {
  if (!raw) return "not_sent";
  return COMPAT_STATUS_MAP[raw] ?? "not_sent";
}

/**
 * 判断值是否属于 P0 合法状态枚举。
 *
 * @param value - 待检查的字符串
 * @returns 是否为 P0 状态
 */
export function isP0DocumentStatus(
  value: string,
): value is DocumentRequirementStatus {
  return ALL_P0_STATUSES.has(value);
}

/**
 * 返回某状态可合法转移到的目标列表。
 *
 * @param from - 当前状态
 * @returns 合法目标状态数组
 */
export function allowedTransitions(
  from: DocumentRequirementStatus,
): DocumentRequirementStatus[] {
  return DOCUMENT_STATUS_TRANSITIONS[from] ?? [];
}

/**
 * 判断一次状态转移是否合法。
 *
 * @param from - 当前状态
 * @param to - 目标状态
 * @returns 是否允许转移
 */
export function isValidTransition(
  from: DocumentRequirementStatus,
  to: DocumentRequirementStatus,
): boolean {
  return allowedTransitions(from).includes(to);
}

const ACTIONABLE_STATUSES: ReadonlySet<DocumentRequirementStatus> = new Set([
  "not_sent",
  "waiting_upload",
  "uploaded_reviewing",
  "revision_required",
  "expired",
]);

/**
 * 需要行动的状态（未完成且非终态/已豁免）。
 *
 * @param status - 资料项状态
 * @returns 是否需要行动
 */
export function isActionableStatus(status: DocumentRequirementStatus): boolean {
  return ACTIONABLE_STATUSES.has(status);
}

/**
 * 排序权重（数值越小越优先）。
 */
export const DOCUMENT_STATUS_SORT_PRIORITY: Record<
  DocumentRequirementStatus,
  number
> = {
  uploaded_reviewing: 0,
  revision_required: 1,
  expired: 2,
  waiting_upload: 3,
  not_sent: 4,
  approved: 5,
  waived: 6,
};

/**
 *
 */
export type CompletionRate = {
  /**
   *
   */
  approved: number;
  /**
   *
   */
  requiredTotal: number;
  /**
   *
   */
  rate: number;
};

/**
 * P0/03 §7.1 完成率：approved 必交项 / 必交总数（waived 剔除分母）。
 *
 * @param requirements - 资料项列表（仅需 requiredFlag 与 status）
 * @returns 完成率对象
 */
export function computeCompletionRate(
  requirements: Pick<DocumentRequirement, "requiredFlag" | "status">[],
): CompletionRate {
  let approved = 0;
  let requiredTotal = 0;

  for (const r of requirements) {
    if (!r.requiredFlag) continue;
    if (r.status === "waived") continue;
    requiredTotal++;
    if (r.status === "approved") approved++;
  }

  return {
    approved,
    requiredTotal,
    rate: requiredTotal === 0 ? 1 : approved / requiredTotal,
  };
}
