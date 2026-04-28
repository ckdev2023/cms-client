/**
 * 配套模块 adapter seam — 边界冻结于 p0-fe-002a-04，落地于 p0-fe-002e。
 *
 * 本文件声明 detail tabs 中各支撑模块的类型出口与 adapter 函数接缝。
 *
 * 已独立实现（p0-fe-002e-01）：
 * - messages / log → `CaseCommsLogsAdapter`（独立文件，自带解析器，不混入 detail 主链）
 *
 * 已实现（p0-fe-006b-01）：
 * - documents        → `adaptCaseDocumentGroups` + `buildCaseDocumentItemsUrl`
 * - forms            → `adaptCaseFormsData` + `buildCaseGeneratedDocumentsUrl`
 *
 * 已实现（p0-fe-006b-02）：
 * - validation       → `adaptCaseValidationData` + `buildCaseValidationRunsUrl`
 * - billing          → `adaptCaseBillingData` + `buildCaseBillingPlansUrl` + `buildCasePaymentRecordsUrl`
 * - submissionPkgs   → `adaptCaseSubmissionPackages` + `buildCaseSubmissionPackagesUrl`
 * - doubleReview     → `adaptCaseDoubleReviewEntries` + `buildCaseReviewRecordsUrl`
 *
 * 已实现（p0-fe-006d-01）：
 * - tasks            → `adaptCaseTaskList` + `buildCaseTasksUrl`
 *
 * 已实现（p0-fe-006d-02）：
 * - deadlines        → `adaptCaseDeadlineList` + `buildCaseRemindersUrl`
 *
 * p0-fe-002e-03 边界约束：此阶段只建 seam，不提前实现所有 tabs 的最终字段映射。
 * 每个 seam 定义 `adaptXxx(value: unknown): T | null` 签名，
 * 消费者通过此签名接线，后续只需填充实现而不改变接口。
 */

import type {
  DocumentGroup,
  DocumentItem,
  DocumentItemActions,
  FormsData,
  FormGenerated,
  TaskItem,
} from "../types-detail";
import {
  asRecord,
  formatDate,
  readNullableString,
  readNumber,
  readString,
} from "./CaseAdapterShared";

// ─── Type re-exports ────────────────────────────────────────────

export type {
  DocumentItem,
  DocumentGroup,
  DocumentFileVersion,
  DocumentReviewRecord,
  DocumentReminderRecord,
  DocumentItemActions,
} from "../types-detail";

export type { FormTemplate, FormGenerated, FormsData } from "../types-detail";

export type {
  GateItem,
  ValidationData,
  SubmissionPackage,
  CorrectionPackage,
  DoubleReviewEntry,
} from "../types-detail";

export type { PaymentRow, BillingData } from "../types-detail";

export type { TaskItem } from "../types-detail";

export type { DeadlineItem } from "../types-detail";
export * from "./CaseAdapterDeadlineSeams";

// ─── Seam Registry (frozen by p0-fe-002e-03) ────────────────────
// 机器可读的接缝清单：函数名 → 填充任务 ID。
// contract tests 依据此清单断言：集合完整、全部返回 null。
// 新增或移除 seam 时须同步更新此清单与 CaseAdapterSupportSeams.test.ts。
//
// p0-fe-006b-01：adaptCaseDocumentGroups / adaptCaseFormsData 已实现，
// 从注册表移除。
// p0-fe-006b-02：adaptCaseValidationData / adaptCaseBillingData /
// adaptCaseSubmissionPackages / adaptCaseDoubleReviewEntries 已实现，
// 从注册表移除。
// p0-fe-006d-01：adaptCaseTaskList 已实现，从注册表移除。
// p0-fe-006d-02：adaptCaseDeadlineList 已实现，从注册表移除。

/**
 * 配套模块 adapter seam 注册表——用于 contract tests 断言接缝集合完整性。
 *
 * 全部 seam 均已填充实现（p0-fe-006d-02 完成后注册表为空）。
 */
export const SUPPORT_SEAM_REGISTRY = {} as const;

export const SUPPORT_SEAM_FUNCTION_NAMES = Object.keys(
  SUPPORT_SEAM_REGISTRY,
) as (keyof typeof SUPPORT_SEAM_REGISTRY)[];

// ─── Internal helpers ───────────────────────────────────────────

function readArrayOrItems(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  const r = asRecord(value);
  return r && Array.isArray(r.items) ? (r.items as unknown[]) : null;
}

// ─── Documents adapter (p0-fe-006b-01) ──────────────────────────

const OWNER_SIDE_LABELS: Record<string, string> = {
  applicant: "申請者提供",
  customer: "顧客提供",
  office: "事務所準備",
};

const DOC_STATUS_LABELS: Record<string, string> = {
  pending: "未送信",
  waiting_upload: "登記待ち",
  uploaded_reviewing: "審査中",
  approved: "承認済み",
  revision_required: "要修正",
  waived: "免除",
  expired: "期限切れ",
};

const REMIND_ELIGIBLE = new Set([
  "pending",
  "waiting_upload",
  "revision_required",
]);
const WAIVE_ELIGIBLE = new Set(["pending", "waiting_upload"]);
const REGISTER_ELIGIBLE = new Set([
  "pending",
  "waiting_upload",
  "revision_required",
]);

function deriveDocumentActions(status: string): DocumentItemActions {
  return {
    canApprove: status === "uploaded_reviewing",
    canReject: status === "uploaded_reviewing",
    canRemind: REMIND_ELIGIBLE.has(status),
    canWaive: WAIVE_ELIGIBLE.has(status),
    canRegister: REGISTER_ELIGIBLE.has(status),
  };
}

function adaptDocumentItemDto(value: unknown): DocumentItem | null {
  const r = asRecord(value);
  if (!r) return null;
  const name = readString(r, "name");
  if (!name) return null;

  const status = readString(r, "status");
  const dueAt = readNullableString(r, "dueAt");
  const checklistCode = readString(r, "checklistItemCode");

  const metaParts: string[] = [];
  if (checklistCode) metaParts.push(checklistCode);
  if (dueAt) metaParts.push(`期限: ${formatDate(dueAt)}`);

  return {
    name,
    meta: metaParts.join(" · "),
    status,
    statusLabel: DOC_STATUS_LABELS[status] ?? status,
    canWaive: WAIVE_ELIGIBLE.has(status),
    actions: deriveDocumentActions(status),
  };
}

/**
 * 适配 `/api/document-items?caseId=xxx` 返回值为按提交方分组的资料列表。
 *
 * @param value - 原始 JSON（`{ items: [...], total }` 或数组）
 * @returns 按 ownerSide 分组的资料列表，格式无效时返回 `null`
 */
export function adaptCaseDocumentGroups(
  value: unknown,
): DocumentGroup[] | null {
  const items = readArrayOrItems(value);
  if (!items) return null;

  const grouped = new Map<string, DocumentItem[]>();
  for (const raw of items) {
    const r = asRecord(raw);
    if (!r) continue;
    const ownerSide = readString(r, "ownerSide") || "applicant";
    const adapted = adaptDocumentItemDto(raw);
    if (!adapted) continue;

    let group = grouped.get(ownerSide);
    if (!group) {
      group = [];
      grouped.set(ownerSide, group);
    }
    group.push(adapted);
  }

  return Array.from(grouped.entries()).map(([key, groupItems]) => ({
    group: OWNER_SIDE_LABELS[key] ?? key,
    count: `${groupItems.length} 件`,
    items: groupItems,
  }));
}

// ─── Forms adapter (p0-fe-006b-01) ──────────────────────────────

const GEN_DOC_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  final: "確定済み",
  exported: "出力済み",
};

const GEN_DOC_STATUS_TONES: Record<string, string> = {
  draft: "muted",
  final: "success",
  exported: "primary",
};

function adaptGeneratedDocumentDto(value: unknown): FormGenerated | null {
  const r = asRecord(value);
  if (!r) return null;
  const title = readString(r, "title");
  if (!title) return null;

  const status = readString(r, "status");
  const outputFormat = readString(r, "outputFormat");
  const versionNo = readNumber(r, "versionNo");
  const generatedAt = readNullableString(r, "generatedAt");
  const generatedBy = readNullableString(r, "generatedByDisplayName");

  const metaParts: string[] = [];
  if (outputFormat) metaParts.push(outputFormat.toUpperCase());
  if (versionNo > 0) metaParts.push(`v${versionNo}`);
  if (generatedBy) metaParts.push(generatedBy);
  if (generatedAt) metaParts.push(formatDate(generatedAt));

  return {
    name: title,
    meta: metaParts.join(" · "),
    tone: GEN_DOC_STATUS_TONES[status] ?? "muted",
    statusLabel: GEN_DOC_STATUS_LABELS[status] ?? status,
  };
}

/**
 * 适配 `/api/generated-documents?caseId=xxx` 返回值为文书模板与生成记录。
 *
 * P0 阶段 `templates` 始终为空（模板系统在 P1 落地）。
 *
 * @param value - 原始 JSON（`{ items: [...], total }` 或数组）
 * @returns 文书数据，格式无效时返回 `null`
 */
export function adaptCaseFormsData(value: unknown): FormsData | null {
  const items = readArrayOrItems(value);
  if (!items) return null;

  const generated = items
    .map(adaptGeneratedDocumentDto)
    .filter((item): item is FormGenerated => item !== null);

  return { templates: [], generated };
}

// ─── URL builders (p0-fe-006b-01) ───────────────────────────────

function deriveApiPrefix(casesApiPath: string): string {
  return casesApiPath.replace(/\/cases\/?$/, "");
}

/**
 * 构建资料项列表 URL。
 *
 * @param casesApiPath - cases API 基路径（如 `/api/cases`）
 * @param caseId - 案件 ID
 * @returns 完整 URL，如 `/api/document-items?caseId=case-001`
 */
export function buildCaseDocumentItemsUrl(
  casesApiPath: string,
  caseId: string,
): string {
  return `${deriveApiPrefix(casesApiPath)}/document-items?caseId=${encodeURIComponent(caseId)}`;
}

/**
 * 构建生成文书列表 URL。
 *
 * @param casesApiPath - cases API 基路径（如 `/api/cases`）
 * @param caseId - 案件 ID
 * @returns 完整 URL，如 `/api/generated-documents?caseId=case-001`
 */
export function buildCaseGeneratedDocumentsUrl(
  casesApiPath: string,
  caseId: string,
): string {
  return `${deriveApiPrefix(casesApiPath)}/generated-documents?caseId=${encodeURIComponent(caseId)}`;
}

// ─── Validation / Billing / Submission / Review (p0-fe-006b-02) ──
// 实现已迁移至 CaseAdapterValidationBilling.ts 以遵守 max-lines 约束。

export {
  adaptCaseValidationData,
  adaptCaseBillingData,
  adaptCaseSubmissionPackages,
  adaptCaseDoubleReviewEntries,
  buildCaseValidationRunsUrl,
  buildCaseReviewRecordsUrl,
  buildCaseBillingPlansUrl,
  buildCasePaymentRecordsUrl,
  buildCaseSubmissionPackagesUrl,
  buildCaseBillingTabAggregateUrl,
} from "./CaseAdapterValidationBilling";

// ─── Tasks adapter (p0-fe-006d-01) ──────────────────────────────

const TASK_DONE_STATUSES = new Set(["completed", "cancelled"]);

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "warning",
  high: "warning",
  normal: "primary",
  low: "success",
};

function deriveDueColor(dueAt: string | null, done: boolean): string {
  if (done || !dueAt) return "muted";
  try {
    const due = new Date(dueAt);
    if (Number.isNaN(due.getTime())) return "muted";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffDays = (due.getTime() - today.getTime()) / 86_400_000;
    if (diffDays < 0) return "danger";
    if (diffDays <= 3) return "warning";
    return "muted";
  } catch {
    return "muted";
  }
}

function adaptTaskDto(value: unknown): TaskItem | null {
  const r = asRecord(value);
  if (!r) return null;
  const id = readString(r, "id");
  const title = readString(r, "title");
  if (!id || !title) return null;

  const status = readString(r, "status") || "pending";
  const done = TASK_DONE_STATUSES.has(status);
  const dueAt = readNullableString(r, "dueAt");
  const priority = readString(r, "priority") || "normal";
  const assigneeUserId = readNullableString(r, "assigneeUserId");

  return {
    id,
    label: title,
    done,
    status,
    due: dueAt ? formatDate(dueAt) : "",
    assignee: assigneeUserId ? assigneeUserId.charAt(0).toUpperCase() : "—",
    color: PRIORITY_COLOR[priority] ?? "primary",
    dueColor: deriveDueColor(dueAt, done),
  };
}

/**
 * 适配 `/api/tasks?caseId=xxx` 返回值为任务列表。
 *
 * @param value - 原始 JSON（`{ items: [...], total }` 或数组）
 * @returns 任务列表，格式无效时返回 `null`
 */
export function adaptCaseTaskList(value: unknown): TaskItem[] | null {
  const items = readArrayOrItems(value);
  if (!items) return null;

  return items
    .map(adaptTaskDto)
    .filter((item): item is TaskItem => item !== null);
}

/**
 * 构建任务列表 URL。
 *
 * @param casesApiPath - cases API 基路径（如 `/api/cases`）
 * @param caseId - 案件 ID
 * @returns 完整 URL，如 `/api/tasks?caseId=case-001`
 */
export function buildCaseTasksUrl(
  casesApiPath: string,
  caseId: string,
): string {
  return `${deriveApiPrefix(casesApiPath)}/tasks?caseId=${encodeURIComponent(caseId)}`;
}
