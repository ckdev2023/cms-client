import type {
  DocumentItemStatus,
  DocumentListItem,
  DocumentProviderType,
} from "../types";

/**
 * 后端 `document_items` 行（DTO）状态在前端的标准映射。
 *
 * - `pending` / `waiting_upload` → `pending`（资料中心视为缺件）
 * - `uploaded_reviewing` → `uploaded_reviewing`
 * - `revision_required` → `rejected`（资料中心展示为退回补正）
 * - `approved` → `approved`（过期判定由 `dueAt` 与当前时间叠加，由 `mapBackendStatus` 处理）
 * - `waived` → `waived`
 */
const BACKEND_STATUS_MAP: Record<string, DocumentItemStatus> = {
  pending: "pending",
  waiting_upload: "pending",
  uploaded_reviewing: "uploaded_reviewing",
  revision_required: "rejected",
  rejected: "rejected",
  approved: "approved",
  waived: "waived",
  expired: "expired",
};

/**
 * `owner_side` → 资料中心 4 类提供方的归一化映射。
 */
const OWNER_SIDE_PROVIDER_MAP: Record<string, DocumentProviderType> = {
  applicant: "main_applicant",
  main_applicant: "main_applicant",
  guarantor: "dependent_guarantor",
  dependent_guarantor: "dependent_guarantor",
  family: "dependent_guarantor",
  employer: "employer_org",
  employer_org: "employer_org",
  company: "employer_org",
  office: "office_internal",
  office_internal: "office_internal",
  internal: "office_internal",
};

/**
 * 后端 `document_items` 行（与 `documentItems.service.ts` `DocumentItem` 对齐）。
 */
export interface DocumentItemDtoLike {
  /**
   *
   */
  id: string;
  /**
   *
   */
  caseId: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  status: string;
  /**
   *
   */
  ownerSide: string;
  /**
   *
   */
  dueAt: string | null;
  /**
   *
   */
  lastFollowUpAt: string | null;
}

/** 案件摘要 → 用于补齐 `DocumentListItem.caseName`。 */
export type CaseNameLookup = (caseId: string) => string | undefined;

/**
 * 将后端状态归一化到资料中心枚举；当 `approved` + `dueAt` 已过期时升级为 `expired`。
 *
 * @param backendStatus - 后端 `document_items.status` 值
 * @param dueAt - 截止日 ISO 字符串或 `null`
 * @param now - 当前时间（默认 `new Date()`，便于测试注入）
 * @returns 前端枚举值；未识别时回退到 `pending`
 */
export function mapBackendStatus(
  backendStatus: string,
  dueAt: string | null,
  now: Date = new Date(),
): DocumentItemStatus {
  const mapped = BACKEND_STATUS_MAP[backendStatus] ?? "pending";
  if (mapped === "approved" && dueAt) {
    const due = Date.parse(dueAt);
    if (Number.isFinite(due) && due < now.getTime()) {
      return "expired";
    }
  }
  return mapped;
}

/**
 * 将 `owner_side` 字符串映射到 4 类资料提供方枚举；未识别时回退到 `main_applicant`。
 *
 * @param ownerSide - 后端 `document_items.owner_side` 值
 * @returns 资料提供方枚举
 */
export function mapOwnerSideToProvider(
  ownerSide: string,
): DocumentProviderType {
  return OWNER_SIDE_PROVIDER_MAP[ownerSide] ?? "main_applicant";
}

/**
 * 将 ISO 时间戳归一化为 `YYYY-MM-DD` 字符串；非法/缺失时返回 `null`。
 *
 * @param value - 后端返回的 ISO 时间戳或 `null`
 * @returns 归一化后的日期字符串；无效时返回 `null`
 */
function toIsoDate(value: string | null): string | null {
  if (!value) return null;
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return null;
  return new Date(ts).toISOString().slice(0, 10);
}

/**
 * 将 ISO 时间戳归一化为 `YYYY-MM-DD HH:mm` 字符串（UTC）；非法/缺失时返回 `null`。
 *
 * @param value - 后端返回的 ISO 时间戳或 `null`
 * @returns 归一化后的"日期 时间"字符串；无效时返回 `null`
 */
function toIsoMinute(value: string | null): string | null {
  if (!value) return null;
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return null;
  const d = new Date(ts);
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
    d.getUTCHours(),
  )}:${pad(d.getUTCMinutes())}`;
}

/**
 * 把后端 `document_items` 行 + 案件名 → `DocumentListItem`。
 *
 * 与 SAMPLE_DOCUMENTS 形态对齐；后端尚未建模的字段（`sharedExpiryRisk` / `referenceCount` /
 * `relativePath`）目前给出可展示的兜底值。
 *
 * @param row - 后端资料项 DTO
 * @param caseNameOf - 案件名查询函数（`caseId` → `caseName`）
 * @param now - 当前时间，便于过期判定（默认 `new Date()`）
 * @returns 资料中心列表行
 */
export function adaptDocumentItem(
  row: DocumentItemDtoLike,
  caseNameOf: CaseNameLookup,
  now: Date = new Date(),
): DocumentListItem {
  const status = mapBackendStatus(row.status, row.dueAt, now);
  const dueDate = toIsoDate(row.dueAt);
  const lastReminderAt = toIsoMinute(row.lastFollowUpAt);
  const caseName = caseNameOf(row.caseId) ?? row.caseId;

  return {
    id: row.id,
    name: row.name,
    caseId: row.caseId,
    caseName,
    provider: mapOwnerSideToProvider(row.ownerSide),
    status,
    dueDate,
    dueDateLabel: dueDate ?? "—",
    lastReminderAt,
    lastReminderAtLabel: lastReminderAt ?? "—",
    relativePath: null,
    sharedExpiryRisk: false,
    referenceCount: 1,
  };
}

/**
 * 批量适配后端资料项数组，过滤掉 `status === "deleted"`（理论上后端已过滤，做一次保险）。
 *
 * @param rows - 资料项 DTO 列表
 * @param caseNameOf - 案件名查询函数
 * @param now - 当前时间
 * @returns 资料中心列表行数组
 */
export function adaptDocumentItems(
  rows: readonly DocumentItemDtoLike[],
  caseNameOf: CaseNameLookup,
  now: Date = new Date(),
): DocumentListItem[] {
  return rows
    .filter((row) => row.status !== "deleted")
    .map((row) => adaptDocumentItem(row, caseNameOf, now));
}
