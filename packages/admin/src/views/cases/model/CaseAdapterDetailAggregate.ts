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
} from "./CaseAdapterShared";
import { buildCustomerLocalizedNames } from "./CaseAdapterCustomerLocale";

// ─── Aggregate Slices (p0-fe-002c-01) ────────────────────────────
// 与 server CaseDetailAggregateDto 的 8 个顶层键一一对应。
// latestSubmission / latestReview 本阶段仅读取概要信息用于
// overview 区域提示，不提前填充完整的 validation / review tabs。

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
) {
  return {
    blockingCount: blockingCount > 0 ? String(blockingCount) : "0",
    blockingDetail: blockingCount > 0 ? `${blockingCount} blocking issues` : "",
    arrearsStatus:
      unpaidAmount > 0 ? "cases.detail.arrearsYes" : "cases.detail.arrearsNo",
    arrearsDetail: unpaidAmount > 0 ? `¥${unpaidAmount.toLocaleString()}` : "",
    deadlineAlert: "",
    deadlineAlertDetail: "",
    lastValidation: latestValidation
      ? readString(latestValidation, "status")
      : "",
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
  if (blockingCount > 0)
    return `${blockingCount} blocking, ${warningCount} warning`;
  if (warningCount > 0) return `${warningCount} warning`;
  return "";
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

/**
 * 从 case slice 抽取业务编号 `caseNo`，去除两侧空白并把空白值视为缺失。
 *
 * BUG-128 / BUG-130：detail header 必须暴露原始业务编号给面包屑/列表行使用，
 * 不可与 `id` (UUID) 合并；`detail.id` 仍保留 UUID 用于 hover/复制等场景。
 *
 * @param caseRecord - case slice 记录
 * @returns 业务编号字符串；缺失或空白时返回 `undefined`
 */
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

function buildDetailHeader(
  id: string,
  stageId: CaseStageId,
  dueAt: string | null,
  m: DerivedMetrics,
  caseRecord: Record<string, unknown>,
  deepLink: Record<string, unknown> | null,
) {
  return {
    id,
    caseNo: extractCaseNo(caseRecord),
    title: resolveTitle(caseRecord, id),
    client: dlStr(deepLink, "customerName"),
    owner: dlStr(deepLink, "ownerDisplayName"),
    agency: "",
    stage: resolveStageLabel(stageId),
    stageCode: stageId,
    stageMeta: stageId,
    statusBadge: resolveStageBadge(stageId),
    deadline: formatDate(dueAt),
    deadlineMeta: dueAt ? `Due: ${formatDate(dueAt)}` : "",
    deadlineDanger: isDeadlineDanger(dueAt),
    progressPercent: m.progressPercent,
    progressCount: `${m.docDone}/${m.docTotal}`,
    billingAmount: m.quotePrice ? `¥${m.quotePrice.toLocaleString()}` : "—",
    billingMeta: formatYen(m.unpaidAmount) || "",
    billingMetaKey: m.unpaidAmount > 0 ? "cases.detail.unpaidLabel" : "",
    billingMetaParams:
      m.unpaidAmount > 0 ? { amount: formatYen(m.unpaidAmount) } : undefined,
    billingStatusKey: m.unpaidAmount > 0 ? "unpaid" : "paid",
    docsCounter: `${m.docDone}/${m.docTotal}`,
    readonly: stageId === "S9",
    customerId: dlStr(deepLink, "customerId"),
    groupId: dlStr(deepLink, "groupId"),
    groupName: dlStr(deepLink, "groupName"),
    caseType: readString(caseRecord, "caseTypeCode"),
    applicationType: readString(caseRecord, "applicationType"),
    businessPhase: readString(caseRecord, "businessPhase"),
    acceptedDate: formatDate(readNullableString(caseRecord, "acceptedAt")),
    targetDate: formatDate(dueAt),
    priority: readString(caseRecord, "priority"),
    riskLevel: readString(caseRecord, "riskLevel"),
    ownerUserId: dlStr(deepLink, "ownerUserId"),
    assistantUserId: dlStr(deepLink, "assistantUserId"),
    jurisdictionAuthority: readString(caseRecord, "jurisdictionAuthority"),
    remark: readString(caseRecord, "remark"),
    customerLocalizedNames: buildCustomerLocalizedNames(deepLink),
  };
}

// ─── Team from deep-link (R27-R) ─────────────────────────────────

const TEAM_GRADIENT_OWNER = "from-[var(--primary)] to-[var(--primary-hover)]";
const TEAM_GRADIENT_ASSISTANT = "from-[var(--success)] to-[#28a745]";

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "??";
}

/**
 * deep-link 数据中提取 owner / assistant 组装为 TeamMember 列表。
 *
 * @param dl - deep-link 原始数据对象，为 null 时返回空数组。
 * @returns 提取到的团队成员列表。
 */
export function buildTeamFromDeepLink(
  dl: Record<string, unknown> | null,
): import("../types-detail").TeamMember[] {
  if (!dl) return [];
  const ownerName = readString(dl, "ownerDisplayName");
  const assistantName = readNullableString(dl, "assistantDisplayName");

  const members: import("../types-detail").TeamMember[] = [];

  if (ownerName) {
    members.push({
      initials: deriveInitials(ownerName),
      name: ownerName,
      role: "cases.detail.overview.sidebar.teamRoleOwner",
      subtitle: "",
      gradient: TEAM_GRADIENT_OWNER,
    });
  }

  if (assistantName) {
    members.push({
      initials: deriveInitials(assistantName),
      name: assistantName,
      role: "cases.detail.overview.sidebar.teamRoleAssistant",
      subtitle: "",
      gradient: TEAM_GRADIENT_ASSISTANT,
    });
  }

  return members;
}

// ─── Public adapter ──────────────────────────────────────────────

/**
 * 将聚合 DTO 适配为客户端详情模型。
 *
 * 覆盖 server `CaseDetailAggregateDto` 全部 8 个 slice。
 * header / overview / info / read-only 主链已稳定；
 * tabs 内部列表仍以 `EMPTY_LISTS` 占位，跟随后续批次各自落地。
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

  const { caseRecord, deepLink, billing, latestValidation, latestReview } =
    slices;
  const id = readString(caseRecord, "id");
  const stageId = resolveStageId(readString(caseRecord, "stage"));
  const dueAt = readNullableString(caseRecord, "dueAt");
  const m = deriveCaseMetrics(slices);

  const detail = {
    ...buildDetailHeader(id, stageId, dueAt, m, caseRecord, deepLink),
    providerProgress: adaptProviderProgress(slices.providerProgressRaw),
    risk: buildRiskBlock(
      m.blockingCount,
      m.unpaidAmount,
      latestValidation,
      latestReview,
    ),
    nextAction: "",
    validationHint: buildValidationHint(m.blockingCount, m.warningCount),
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
    team: buildTeamFromDeepLink(deepLink),
    ...buildP1Fields(
      caseRecord,
      slices,
      m,
      slices.failureCloseoutCheck,
      stageId,
    ),
    closeReason: readNullableString(caseRecord, "closeReason"),
    closedAt: formatDate(readNullableString(caseRecord, "archivedAt")),
    closedBy: deepLink
      ? readNullableString(deepLink, "ownerDisplayName")
      : null,
  };

  return {
    detail,
    tabCounts: buildTabCounts(slices.counts),
    ...buildDeepLinkFields(deepLink),
  };
}
