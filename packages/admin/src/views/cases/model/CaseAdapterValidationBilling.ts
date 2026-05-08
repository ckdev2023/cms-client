/** 校验、收费、提交、复核适配器 — p0-fe-006b-02。 */

import type {
  BillingData,
  DoubleReviewEntry,
  GateItem,
  PaymentRow,
  PaymentRowKind,
  SubmissionPackage,
  ValidationData,
} from "../types-detail";
import {
  asRecord,
  formatDate,
  readNullableString,
  readNumber,
  readOptionalString,
  readString,
} from "./CaseAdapterShared";
import { resolveMilestoneI18nKey } from "./billingMilestoneI18n";

export { resolveMilestoneI18nKey } from "./billingMilestoneI18n";

/**
 * 提取数组或 `{ items }` 形式。
 *
 * @param value - 原始 JSON
 * @returns 数组或 `null`
 */
function readArrayOrItems(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  const r = asRecord(value);
  return r && Array.isArray(r.items) ? (r.items as unknown[]) : null;
}

export {
  buildCaseBillingPlansUrl,
  buildCaseBillingTabAggregateUrl,
  buildCasePaymentRecordsUrl,
  buildCaseReviewRecordsUrl,
  buildCaseSubmissionPackagesUrl,
  buildCaseValidationRunsUrl,
} from "./CaseAdapterValidationUrls";

function resolveGateTitle(
  r: Record<string, unknown>,
  titleKey: string | undefined,
): string {
  if (titleKey) return "";
  return (
    readString(r, "title") ||
    readString(r, "rule") ||
    readString(r, "code") ||
    readString(r, "message") ||
    readString(r, "description")
  );
}

function resolveGateNote(
  r: Record<string, unknown>,
  titleKey: string | undefined,
): string | undefined {
  if (titleKey) return undefined;
  const explicitNote = readNullableString(r, "note");
  if (explicitNote != null) return explicitNote;
  const primaryTitle =
    readString(r, "title") || readString(r, "rule") || readString(r, "code");
  const fallbackText = readString(r, "message") || readString(r, "description");
  return primaryTitle && fallbackText ? fallbackText : undefined;
}

function adaptGateItemDto(
  value: unknown,
  defaultGate: string,
): GateItem | null {
  const r = asRecord(value);
  if (!r) return null;

  const titleKey = readOptionalString(r, "titleKey");
  const messageKey = readOptionalString(r, "messageKey");
  const title = resolveGateTitle(r, titleKey);
  if (!titleKey && !title) return null;

  return {
    gate: readString(r, "gate") || defaultGate,
    title,
    titleKey,
    fix: readOptionalString(r, "fix"),
    note: resolveGateNote(r, titleKey),
    noteKey: messageKey,
    assignee: readOptionalString(r, "assignee"),
    deadline: readOptionalString(r, "deadline"),
    actionLabel: readOptionalString(r, "actionLabel"),
    actionTab: readOptionalString(r, "actionTab"),
  };
}

function parseGateArray(raw: unknown, defaultGate: string): GateItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => adaptGateItemDto(item, defaultGate))
    .filter((item): item is GateItem => item !== null);
}

function findLatestRun(items: unknown[]): Record<string, unknown> | null {
  let latest: Record<string, unknown> | null = null;
  let latestTime = "";
  for (const item of items) {
    const r = asRecord(item);
    if (!r) continue;
    const executedAt = readString(r, "executedAt");
    if (executedAt > latestTime || !latest) {
      latestTime = executedAt;
      latest = r;
    }
  }
  return latest;
}

/**
 * 适配校验运行列表为门禁视图模型。
 *
 * @param value - 原始 JSON
 * @returns 校验数据或 `null`
 */
export function adaptCaseValidationData(value: unknown): ValidationData | null {
  const items = readArrayOrItems(value);
  if (!items) return null;

  const latest = findLatestRun(items);
  if (!latest) {
    return { lastTime: "", blocking: [], warnings: [], info: [] };
  }

  const executedAt = readNullableString(latest, "executedAt");
  const report = asRecord(latest.reportPayload);

  let blocking: GateItem[];
  let warnings: GateItem[];
  let info: GateItem[];

  if (report) {
    blocking = parseGateArray(report.blocking, "A");
    warnings = parseGateArray(report.warnings, "B");
    info = parseGateArray(report.info, "C");
  } else {
    blocking = [];
    warnings = [];
    info = [];
  }

  if (blocking.length === 0 && readNumber(latest, "blockingCount") > 0) {
    blocking.push({
      gate: "A",
      title: "",
      titleKey: "cases.validation.blockingSummary",
      titleParams: { count: readNumber(latest, "blockingCount") },
      noteKey: "cases.validation.refReport",
    });
  }
  if (warnings.length === 0 && readNumber(latest, "warningCount") > 0) {
    warnings.push({
      gate: "B",
      title: "",
      titleKey: "cases.validation.warningSummary",
      titleParams: { count: readNumber(latest, "warningCount") },
      noteKey: "cases.validation.refReport",
    });
  }

  const status = readString(latest, "resultStatus");
  const retriggerNote =
    status === "failed" ? "cases.validation.lastFailed" : undefined;

  return {
    lastTime: formatDate(executedAt),
    blocking,
    warnings,
    info,
    retriggerNote,
  };
}

const BILLING_STATUS_LABELS: Record<string, string> = {
  due: "応収",
  partial: "部分回款",
  paid: "已結清",
  overdue: "欠款",
};

const PAYMENT_ROW_KIND_TYPE_LABELS: Record<PaymentRowKind, string> = {
  plan: "応収",
  payment: "入金",
  voided: "作废入金",
  reversed: "冲正入金",
};

function adaptBillingPlanToPaymentRow(value: unknown): PaymentRow | null {
  const r = asRecord(value);
  if (!r) return null;
  const amountDue = readNumber(r, "amountDue");
  const status = readString(r, "status") || "due";
  const dueDate = readNullableString(r, "dueDate");
  const milestoneName = readString(r, "milestoneName");

  return {
    date: formatDate(dueDate),
    type: milestoneName || "収費ノード",
    typeI18nKey: resolveMilestoneI18nKey(milestoneName),
    amount: amountDue > 0 ? `¥${amountDue.toLocaleString()}` : "¥0",
    status,
    statusLabel: BILLING_STATUS_LABELS[status] ?? status,
    kind: "plan",
  };
}

function resolvePaymentKind(recordStatus: string): PaymentRowKind {
  if (recordStatus === "voided") return "voided";
  if (recordStatus === "reversed") return "reversed";
  return "payment";
}

function buildPaymentNote(r: Record<string, unknown>): string | undefined {
  const parts: string[] = [];
  const code = readNullableString(r, "voidReasonCode");
  if (code) parts.push(code);
  const name = readNullableString(r, "voidedByDisplayName");
  if (name) parts.push(name);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function adaptPaymentRecordToPaymentRow(value: unknown): PaymentRow | null {
  const r = asRecord(value);
  if (!r) return null;

  const recordStatus = readString(r, "recordStatus") || "valid";
  const amountReceived = readNumber(r, "amountReceived");
  const kind = resolvePaymentKind(recordStatus);
  const isMuted = kind === "voided" || kind === "reversed";

  return {
    date: formatDate(readNullableString(r, "receivedAt")),
    type: PAYMENT_ROW_KIND_TYPE_LABELS[kind],
    amount: formatYenAmount(amountReceived),
    status: isMuted ? recordStatus : "paid",
    statusLabel: isMuted ? PAYMENT_ROW_KIND_TYPE_LABELS[kind] : "已結清",
    kind,
    milestoneName:
      readNullableString(r, "milestoneName") ??
      readNullableString(r, "billingPlanMilestoneName") ??
      undefined,
    note: buildPaymentNote(r),
    strikethrough: isMuted,
  };
}

function sortPaymentRows(rows: PaymentRow[]): PaymentRow[] {
  const KIND_ORDER: Record<string, number> = {
    payment: 0,
    voided: 1,
    reversed: 1,
    plan: 2,
  };
  return rows.sort((a, b) => {
    if (a.date !== b.date) return a.date > b.date ? -1 : 1;
    return (
      (KIND_ORDER[a.kind ?? "plan"] ?? 2) - (KIND_ORDER[b.kind ?? "plan"] ?? 2)
    );
  });
}

function formatYenAmount(amount: number): string {
  return amount > 0 ? `¥${amount.toLocaleString()}` : "¥0";
}

function unwrapArrayField(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value as unknown[];
  const r = asRecord(value);
  return r && Array.isArray(r.items) ? (r.items as unknown[]) : null;
}

function sumField(items: unknown[], key: string): number {
  let sum = 0;
  for (const item of items) {
    const r = asRecord(item);
    if (r) sum += readNumber(r, key);
  }
  return sum;
}

function sumValidPaymentAmounts(payments: unknown[]): number {
  let sum = 0;
  for (const p of payments) {
    const r = asRecord(p);
    if (!r) continue;
    if ((readString(r, "recordStatus") || "valid") === "valid") {
      sum += readNumber(r, "amountReceived");
    }
  }
  return sum;
}

function collectPaymentRows(payments: unknown[] | null): PaymentRow[] {
  if (!payments) return [];
  return payments
    .map(adaptPaymentRecordToPaymentRow)
    .filter((row): row is PaymentRow => row !== null);
}

/**
 * 适配收费计划与入金记录为收费 tab 视图模型。
 *
 * 合并策略（§3.4）：plans → 応収行，payments → 入金/作废/冲正行，
 * 排序 date desc, kind asc。plan 行与 payment 行不去重。
 *
 * @param value - 原始 JSON
 * @returns 收费汇总与节点明细，格式无效时返回 `null`
 */
export function adaptCaseBillingData(value: unknown): BillingData | null {
  const r = asRecord(value);
  if (!r) return null;

  const plans = unwrapArrayField(r.plans) ?? readArrayOrItems(value);
  if (!plans) return null;

  const payments = unwrapArrayField(r.payments);
  const planRows = plans
    .map(adaptBillingPlanToPaymentRow)
    .filter(Boolean) as PaymentRow[];
  const allRows = sortPaymentRows([
    ...planRows,
    ...collectPaymentRows(payments),
  ]);

  const totalDue = sumField(plans, "amountDue");
  const hasPayments = payments !== null && payments.length > 0;
  const totalPaid = hasPayments
    ? sumValidPaymentAmounts(payments!)
    : sumField(plans, "paidAmount");

  return {
    total: totalDue > 0 ? `¥${totalDue.toLocaleString()}` : "—",
    received: formatYenAmount(totalPaid),
    outstanding: formatYenAmount(Math.max(0, totalDue - totalPaid)),
    payments: allRows,
  };
}

const SUBMISSION_KIND_LABELS: Record<string, string> = {
  initial: "初回提出",
  supplement: "補正提出",
};

function adaptSubmissionPackageDto(value: unknown): SubmissionPackage | null {
  const r = asRecord(value);
  if (!r) return null;
  const id = readString(r, "id");
  if (!id) return null;

  const submissionNo = readNumber(r, "submissionNo");
  const kind = readString(r, "submissionKind") || "initial";
  const submittedAt = readNullableString(r, "submittedAt");
  const authorityName = readNullableString(r, "authorityName");
  const acceptanceNo = readNullableString(r, "acceptanceNo");

  const summaryParts: string[] = [];
  summaryParts.push(
    `#${submissionNo || "?"} ${SUBMISSION_KIND_LABELS[kind] ?? kind}`,
  );
  if (authorityName) summaryParts.push(authorityName);
  if (acceptanceNo) summaryParts.push(`受理番号: ${acceptanceNo}`);

  return {
    id,
    status: acceptanceNo ? "受理済み" : "提出済み",
    locked: true,
    date: formatDate(submittedAt),
    summary: summaryParts.join(" · "),
  };
}

/**
 * 适配提交包列表。
 *
 * @param value - `/api/submission-packages?caseId=xxx` 返回的原始 JSON
 * @returns 提交包列表，格式无效时返回 `null`
 */
export function adaptCaseSubmissionPackages(
  value: unknown,
): SubmissionPackage[] | null {
  const items = readArrayOrItems(value);
  if (!items) return null;
  return items
    .map(adaptSubmissionPackageDto)
    .filter((pkg): pkg is SubmissionPackage => pkg !== null);
}

const DECISION_LABELS: Record<string, string> = {
  approved: "承認",
  rejected: "却下",
};

const DECISION_BADGES: Record<string, string> = {
  approved: "badge-green",
  rejected: "badge-red",
};

function deriveInitials(displayName: string | null): string {
  if (!displayName) return "?";
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return displayName.slice(0, 2).toUpperCase();
}

function adaptReviewRecordDto(value: unknown): DoubleReviewEntry | null {
  const r = asRecord(value);
  if (!r) return null;
  const id = readString(r, "id");
  if (!id) return null;
  const decision = readString(r, "decision");
  const reviewerName =
    readNullableString(r, "reviewerDisplayName") ??
    readNullableString(r, "reviewerUserId") ??
    "不明";
  const reviewedAt = readNullableString(r, "reviewedAt");
  const comment = readNullableString(r, "comment");

  return {
    initials: deriveInitials(reviewerName),
    name: reviewerName,
    verdict: DECISION_LABELS[decision] ?? decision,
    verdictBadge: DECISION_BADGES[decision] ?? "badge-gray",
    time: formatDate(reviewedAt),
    comment: decision === "approved" ? comment : null,
    rejectReason: decision === "rejected" ? comment : null,
  };
}

/**
 * 适配复核记录列表。格式无效时返回 `null`。
 *
 * @param value - 原始 JSON
 * @returns 复核记录列表
 */
export function adaptCaseDoubleReviewEntries(
  value: unknown,
): DoubleReviewEntry[] | null {
  const items = readArrayOrItems(value);
  if (!items) return null;
  return items
    .map(adaptReviewRecordDto)
    .filter((entry): entry is DoubleReviewEntry => entry !== null);
}
