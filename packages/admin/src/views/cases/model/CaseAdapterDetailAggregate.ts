import type { CaseStageId } from "../types";
import type {
  CaseDetailAggregate,
  CaseDetailTabCounts,
} from "./CaseAdapterDetailContracts";
import { buildP1Fields, EMPTY_LISTS } from "./CaseAdapterDetailAggregateP1";
import { CASE_DETAIL_TAB_COUNTS_KEYS } from "./CaseAdapterDetailContracts";
import { nextActionsForPhase } from "./CaseAdapterPhaseActions";
import {
  asRecord,
  formatDate,
  isDeadlineDanger,
  readBoolean,
  readNullableString,
  readNumber,
  readString,
  resolveStageBadge,
  resolveStageId,
  resolveStageLabel,
  toDateInputValue,
} from "./CaseAdapterShared";
import { buildCustomerLocalizedNames } from "./CaseAdapterCustomerLocale";
import { buildTeamFromDeepLink } from "./CaseAdapterTeam";
import { buildTransitionGuards } from "./CaseAdapterTransitionGuards";

// ─── Aggregate Slices (p0-fe-002c-01) ────────────────────────────

interface AggregateSlices {
  caseRecord: Record<string, unknown>;
  deepLink: Record<string, unknown> | null;
  counts: Record<string, unknown> | null;
  billing: Record<string, unknown> | null;
  latestValidation: Record<string, unknown> | null;
  latestSubmission: Record<string, unknown> | null;
  latestReview: Record<string, unknown> | null;
  providerProgressRaw: unknown[];
  failureCloseoutCheck: Record<string, unknown> | null;
  currentResidencePeriod: Record<string, unknown> | null;
  successCloseoutCheck: Record<string, unknown> | null;
  documentTemplateMissing: boolean;
}

function parseAggregateSlices(
  record: Record<string, unknown>,
): AggregateSlices | null {
  const caseRecord = asRecord(record.case);
  if (!caseRecord) return null;
  if (!readString(caseRecord, "id")) return null;
  return {
    caseRecord,
    deepLink: asRecord(record.deepLink),
    counts: asRecord(record.counts),
    billing: asRecord(record.billing),
    latestValidation: asRecord(record.latestValidation),
    latestSubmission: asRecord(record.latestSubmission),
    latestReview: asRecord(record.latestReview),
    providerProgressRaw: Array.isArray(record.documentProgressByProvider)
      ? (record.documentProgressByProvider as unknown[])
      : [],
    failureCloseoutCheck: asRecord(record.failureCloseoutCheck),
    currentResidencePeriod: asRecord(record.currentResidencePeriod),
    successCloseoutCheck: asRecord(record.successCloseoutCheck),
    documentTemplateMissing: record.documentTemplateMissing === true,
  };
}

const KNOWN_PROVIDER_ROLES = new Set([
  "applicant",
  "office",
  "employer",
  "agent",
  "unknown",
]);

function resolveProviderRole(raw: string): string {
  return raw !== "" && KNOWN_PROVIDER_ROLES.has(raw) ? raw : "unspecified";
}

function adaptProviderProgress(raw: unknown[]) {
  return raw
    .map((p) => {
      const pr = asRecord(p);
      if (!pr) return null;
      const rawRole = readString(pr, "providerRole");
      const role = resolveProviderRole(rawRole);
      return {
        label: rawRole,
        labelKey: `cases.detail.providers.${role}`,
        providerRole: role,
        done: readNumber(pr, "done"),
        total: readNumber(pr, "total"),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
}

// ─── Tab Counts (p0-fe-002c-02) ──────────────────────────────────
const EMPTY_TAB_COUNTS: CaseDetailTabCounts = {
  documentItemsTotal: 0,
  documentItemsDone: 0,
  questionnaireItemsTotal: 0,
  questionnaireItemsDone: 0,
  caseParties: 0,
  tasks: 0,
  tasksPending: 0,
  communicationLogs: 0,
  submissionPackages: 0,
  generatedDocuments: 0,
  validationRuns: 0,
  reviewRecords: 0,
  billingRecords: 0,
  paymentRecords: 0,
};

function buildTabCounts(
  counts: Record<string, unknown> | null,
): CaseDetailTabCounts {
  if (!counts) return { ...EMPTY_TAB_COUNTS };
  const result = {} as Record<string, number>;
  for (const key of CASE_DETAIL_TAB_COUNTS_KEYS) {
    result[key] = readNumber(counts, key);
  }
  return result as unknown as CaseDetailTabCounts;
}

// ─── Risk / Billing / Validation blocks ──────────────────────────
function buildRiskBlock(
  blockingCount: number,
  unpaidAmount: number,
  latestValidation: Record<string, unknown> | null,
  latestReview: Record<string, unknown> | null,
  dueAt: string | null,
) {
  const vs = latestValidation ? readString(latestValidation, "status") : "";
  const bKey = "cases.detail.overview.risk.blockingDetail";
  const arrearsKey =
    unpaidAmount > 0 ? "cases.detail.arrearsYes" : "cases.detail.arrearsNo";
  const fDue = dueAt ? formatDate(dueAt) : "";
  return {
    blockingCount: blockingCount > 0 ? String(blockingCount) : "0",
    blockingDetail: "",
    blockingDetailLoc:
      blockingCount > 0
        ? { key: bKey, params: { count: blockingCount } }
        : { key: "cases.detail.overview.risk.noBlocking" },
    arrearsStatus: arrearsKey,
    arrearsStatusLoc: { key: arrearsKey },
    arrearsDetail: unpaidAmount > 0 ? `¥${unpaidAmount.toLocaleString()}` : "",
    arrearsDetailLoc:
      unpaidAmount > 0
        ? {
            key: "cases.detail.overview.risk.arrearsAmount",
            params: { amount: `¥${unpaidAmount.toLocaleString()}` },
          }
        : undefined,
    deadlineAlert: "",
    deadlineAlertDetail: "",
    deadlineAlertLoc: dueAt
      ? {
          key: "cases.detail.overview.risk.deadlineAlert",
          params: { date: fDue },
        }
      : { key: "cases.detail.overview.risk.noDeadline" },
    lastValidation: "",
    lastValidationLoc: vs
      ? { key: `cases.detail.overview.risk.lastValidation.${vs}` }
      : { key: "cases.detail.overview.risk.notValidated" },
    reviewStatus: latestReview ? readString(latestReview, "decision") : "",
  };
}

function buildBillingBlock(
  quotePrice: number,
  unpaidAmount: number,
  totalReceived: number,
) {
  const received = totalReceived > 0 ? totalReceived : 0;
  return {
    total: quotePrice ? `¥${quotePrice.toLocaleString()}` : "—",
    received: received > 0 ? `¥${received.toLocaleString()}` : "¥0",
    outstanding: unpaidAmount > 0 ? `¥${unpaidAmount.toLocaleString()}` : "¥0",
    payments: [] as never[],
  };
}

function buildRiskConfirmation(
  billing: Record<string, unknown> | null,
  acknowledged: boolean,
  unpaidAmount: number,
) {
  if (!acknowledged || !billing) return null;
  return {
    confirmedBy: readString(billing, "billingRiskAckReasonCode"),
    reason: readString(billing, "billingRiskAckReasonCode"),
    evidence: "",
    time: formatDate(readNullableString(billing, "billingRiskAcknowledgedAt")),
    amount: unpaidAmount > 0 ? `¥${unpaidAmount.toLocaleString()}` : "",
  };
}

function buildValidationHint(blockingCount: number, warningCount: number) {
  if (blockingCount > 0) {
    return {
      text: "",
      key: "cases.detail.overview.validationHint.blockingWarning",
      params: { b: blockingCount, w: warningCount },
    };
  }
  if (warningCount > 0) {
    return {
      text: "",
      key: "cases.detail.overview.validationHint.warningOnly",
      params: { w: warningCount },
    };
  }
  return { text: "", key: "", params: undefined };
}

// ─── Deep-link fields (p0-fe-002c-03) ────────────────────────────
function buildDeepLinkFields(dl: Record<string, unknown> | null) {
  return {
    customerId: dl ? readString(dl, "customerId") : "",
    customerName: dl ? readString(dl, "customerName") : "",
    customerLocalizedNames: buildCustomerLocalizedNames(dl),
    groupId: dl ? readNullableString(dl, "groupId") : null,
    groupName: dl ? readNullableString(dl, "groupName") : null,
    ownerUserId: dl ? readString(dl, "ownerUserId") : "",
    ownerDisplayName: dl ? readString(dl, "ownerDisplayName") : "",
    assistantUserId: dl ? readNullableString(dl, "assistantUserId") : null,
    assistantDisplayName: dl
      ? readNullableString(dl, "assistantDisplayName")
      : null,
  };
}

// ─── Derived Metrics ─────────────────────────────────────────────
interface DerivedMetrics {
  docTotal: number;
  docDone: number;
  progressPercent: number;
  unpaidAmount: number;
  quotePrice: number;
  depositPaid: boolean;
  finalPaymentPaid: boolean;
  totalReceived: number;
  blockingCount: number;
  warningCount: number;
  billingRiskAck: boolean;
}

function deriveCaseMetrics(slices: AggregateSlices): DerivedMetrics {
  const { counts, billing, latestValidation } = slices;
  const docTotal = counts ? readNumber(counts, "documentItemsTotal") : 0;
  const docDone = counts ? readNumber(counts, "documentItemsDone") : 0;
  const progressPercent =
    docTotal > 0 ? Math.round((docDone / docTotal) * 100) : 0;
  const unpaidAmount = billing ? readNumber(billing, "unpaidAmount") : 0;
  const quotePrice = billing ? readNumber(billing, "quotePrice") : 0;
  const totalReceived = billing ? readNumber(billing, "totalReceived") : 0;
  return {
    docTotal,
    docDone,
    progressPercent,
    unpaidAmount,
    quotePrice,
    depositPaid: billing ? readBoolean(billing, "depositPaid") : false,
    finalPaymentPaid: billing
      ? readBoolean(billing, "finalPaymentPaid")
      : false,
    totalReceived,
    blockingCount: latestValidation
      ? readNumber(latestValidation, "blockingCount")
      : 0,
    warningCount: latestValidation
      ? readNumber(latestValidation, "warningCount")
      : 0,
    billingRiskAck: billing
      ? readBoolean(billing, "billingRiskAcknowledged")
      : false,
  };
}

// ─── Detail Header (p0-fe-002c-02) ──────────────────────────────
function resolveTitle(caseRecord: Record<string, unknown>, id: string) {
  return (
    readString(caseRecord, "caseName") || readString(caseRecord, "caseNo") || id
  );
}

function extractCaseNo(
  caseRecord: Record<string, unknown>,
): string | undefined {
  const raw = caseRecord["caseNo"];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

function dlStr(dl: Record<string, unknown> | null, key: string) {
  return dl ? readString(dl, key) : "";
}

function formatYen(amount: number) {
  return amount > 0 ? `¥${amount.toLocaleString()}` : "";
}

function buildValidationBlock(lv: Record<string, unknown> | null) {
  return {
    lastTime: lv ? formatDate(readNullableString(lv, "executedAt")) : "",
    blocking: [] as never[],
    warnings: [] as never[],
    info: [] as never[],
  };
}

function buildTitleFallbackParts(
  id: string,
  caseNo: string | undefined,
  caseRecord: Record<string, unknown>,
  deepLink: Record<string, unknown> | null,
) {
  return {
    applicant: dlStr(deepLink, "customerName"),
    caseTypeCode: readString(caseRecord, "caseTypeCode"),
    caseNo,
    id,
  };
}

function buildHeaderBillingMeta(m: DerivedMetrics) {
  return {
    billingAmount: m.quotePrice ? `¥${m.quotePrice.toLocaleString()}` : "—",
    billingMeta: formatYen(m.unpaidAmount) || "",
    billingMetaKey: m.unpaidAmount > 0 ? "cases.detail.unpaidLabel" : "",
    billingMetaParams:
      m.unpaidAmount > 0 ? { amount: formatYen(m.unpaidAmount) } : undefined,
    billingStatusKey: m.unpaidAmount > 0 ? "unpaid" : "paid",
  };
}

function buildDetailHeader(
  id: string,
  stageId: CaseStageId,
  dueAt: string | null,
  m: DerivedMetrics,
  caseRecord: Record<string, unknown>,
  deepLink: Record<string, unknown> | null,
) {
  const dKey = "cases.detail.overview.deadlineMeta";
  const fDue = dueAt ? formatDate(dueAt) : "";
  const caseNo = extractCaseNo(caseRecord);
  return {
    id,
    caseNo,
    title: resolveTitle(caseRecord, id),
    titleFallbackParts: buildTitleFallbackParts(
      id,
      caseNo,
      caseRecord,
      deepLink,
    ),
    client: dlStr(deepLink, "customerName"),
    owner: dlStr(deepLink, "ownerDisplayName"),
    agency: "",
    stage: resolveStageLabel(stageId),
    stageCode: stageId,
    stageMeta: stageId,
    statusBadge: resolveStageBadge(stageId),
    deadline: formatDate(dueAt),
    deadlineMeta: "",
    deadlineMetaLoc: dueAt ? { key: dKey, params: { date: fDue } } : undefined,
    deadlineDanger: isDeadlineDanger(dueAt),
    progressPercent: m.progressPercent,
    progressCount: `${m.docDone}/${m.docTotal}`,
    ...buildHeaderBillingMeta(m),
    docsCounter: `${m.docDone}/${m.docTotal}`,
    readonly: stageId === "S9",
    customerId: dlStr(deepLink, "customerId"),
    groupId: dlStr(deepLink, "groupId"),
    groupName: dlStr(deepLink, "groupName"),
    caseType: readString(caseRecord, "caseTypeCode"),
    applicationType: readString(caseRecord, "applicationType"),
    businessPhase: readString(caseRecord, "businessPhase"),
    acceptedDate: formatDate(readNullableString(caseRecord, "acceptedAt")),
    acceptedDateInput: toDateInputValue(
      readNullableString(caseRecord, "acceptedAt"),
    ),
    targetDate: formatDate(dueAt),
    targetDateInput: toDateInputValue(dueAt),
    priority: readString(caseRecord, "priority"),
    riskLevel: readString(caseRecord, "riskLevel"),
    ownerUserId: dlStr(deepLink, "ownerUserId"),
    assistantUserId: dlStr(deepLink, "assistantUserId"),
    jurisdictionAuthority: readString(caseRecord, "jurisdictionAuthority"),
    remark: readString(caseRecord, "remark"),
    customerLocalizedNames: buildCustomerLocalizedNames(deepLink),
  };
}

function resolveClosedAt(caseRecord: Record<string, unknown>): string {
  return readNullableString(caseRecord, "archivedAt") ?? "";
}

function buildP1WithGuards(
  caseRecord: Record<string, unknown>,
  slices: AggregateSlices,
  m: DerivedMetrics,
  stageId: CaseStageId,
) {
  const p1 = buildP1Fields(
    caseRecord,
    slices,
    m,
    slices.failureCloseoutCheck,
    stageId,
  );
  const isBmv = p1.workflowStep != null || p1.visaPlan != null;
  const bp = readString(caseRecord, "businessPhase");
  return {
    ...p1,
    transitionGuards: buildTransitionGuards(
      bp,
      m.unpaidAmount,
      m.billingRiskAck,
      isBmv,
    ),
  };
}

// ─── Detail assembly ─────────────────────────────────────────────
function assembleDetail(slices: AggregateSlices, m: DerivedMetrics) {
  const { caseRecord, deepLink, billing, latestValidation, latestReview } =
    slices;
  const id = readString(caseRecord, "id");
  const stageId = resolveStageId(readString(caseRecord, "stage"));
  const dueAt = readNullableString(caseRecord, "dueAt");
  const vh = buildValidationHint(m.blockingCount, m.warningCount);
  return {
    ...buildDetailHeader(id, stageId, dueAt, m, caseRecord, deepLink),
    providerProgress: adaptProviderProgress(slices.providerProgressRaw),
    risk: buildRiskBlock(
      m.blockingCount,
      m.unpaidAmount,
      latestValidation,
      latestReview,
      dueAt,
    ),
    nextAction: "",
    validationHint: "",
    validationHintLoc: vh.key ? { key: vh.key, params: vh.params } : undefined,
    overviewActions: nextActionsForPhase(
      readString(caseRecord, "businessPhase"),
      stageId,
    ),
    billing: buildBillingBlock(m.quotePrice, m.unpaidAmount, m.totalReceived),
    validation: buildValidationBlock(latestValidation),
    riskConfirmationRecord: buildRiskConfirmation(
      billing,
      m.billingRiskAck,
      m.unpaidAmount,
    ),
    ...EMPTY_LISTS,
    documentTemplateMissing: slices.documentTemplateMissing,
    team: buildTeamFromDeepLink(deepLink),
    ...buildP1WithGuards(caseRecord, slices, m, stageId),
    closeReason: readNullableString(caseRecord, "closeReason"),
    closedAt: resolveClosedAt(caseRecord),
    closedBy: deepLink
      ? readNullableString(deepLink, "ownerDisplayName")
      : null,
  };
}

// ─── Public adapter ──────────────────────────────────────────────
/**
 * 将聚合 DTO 适配为客户端详情模型。
 *
 * @param value - `GET /cases/:id/aggregate` 返回的原始 JSON
 * @returns 类型化的详情聚合，格式无效时返回 `null`
 */
export function adaptCaseDetailAggregate(
  value: unknown,
): CaseDetailAggregate | null {
  const record = asRecord(value);
  if (!record) return null;
  const slices = parseAggregateSlices(record);
  if (!slices) return null;

  return {
    detail: assembleDetail(slices, deriveCaseMetrics(slices)),
    tabCounts: buildTabCounts(slices.counts),
    ...buildDeepLinkFields(slices.deepLink),
  };
}

export { buildTeamFromDeepLink } from "./CaseAdapterTeam";
export { buildTransitionGuards } from "./CaseAdapterTransitionGuards";
