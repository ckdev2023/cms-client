import type {
  DocumentListItem,
  DocumentSummaryCardData,
  DocumentSummaryCardKey,
  ReferenceCandidate,
  SharedExpiryRiskData,
} from "./types";
import { STATUS_SORT_PRIORITY } from "./constants";
import { isSelectableForBatch } from "./validation";

// ─── Summary Card Derivation (P0-CONTRACT §5) ───────────────────

/**
 * 从资料项列表派生 4 张摘要卡数据。
 *
 * - 待审核：status = uploaded_reviewing
 * - 缺件：status ∈ {pending, rejected}
 * - 过期：status = expired
 * - 共享版本过期风险：sharedExpiryRisk = true
 *
 * @param items - 资料项列表（只需 status 与 sharedExpiryRisk）
 * @returns 4 张摘要卡数据
 */
export function deriveDocumentSummaryCards(
  items: readonly Pick<DocumentListItem, "status" | "sharedExpiryRisk">[],
): DocumentSummaryCardData[] {
  let pendingReview = 0;
  let missing = 0;
  let expired = 0;
  let sharedExpiryRisk = 0;

  for (const item of items) {
    if (item.status === "uploaded_reviewing") pendingReview++;
    if (item.status === "pending" || item.status === "rejected") missing++;
    if (item.status === "expired") expired++;
    if (item.sharedExpiryRisk) sharedExpiryRisk++;
  }

  return [
    {
      key: "pendingReview",
      variant: "info",
      value: pendingReview,
      label: "待审核",
    },
    {
      key: "missing",
      variant: "warning",
      value: missing,
      label: "缺件",
    },
    {
      key: "expired",
      variant: "danger",
      value: expired,
      label: "过期",
    },
    {
      key: "sharedExpiryRisk",
      variant: "neutral",
      value: sharedExpiryRisk,
      label: "共享版本过期风险",
    },
  ];
}

// ─── Sort comparator (P0-CONTRACT §3.1) ─────────────────────────

/**
 * 比较两个资料项的默认排序权重：状态优先级 → 截止日升序（无截止日置底）。
 *
 * @param a - 左侧资料项
 * @param b - 右侧资料项
 * @returns 负值表示 a 优先，正值表示 b 优先，0 表示相等
 */
export function compareDocumentItems(
  a: Pick<DocumentListItem, "status" | "dueDate">,
  b: Pick<DocumentListItem, "status" | "dueDate">,
): number {
  const pa = STATUS_SORT_PRIORITY[a.status] ?? 99;
  const pb = STATUS_SORT_PRIORITY[b.status] ?? 99;
  if (pa !== pb) return pa - pb;

  if (a.dueDate === b.dueDate) return 0;
  if (a.dueDate === null) return 1;
  if (b.dueDate === null) return -1;
  return a.dueDate < b.dueDate ? -1 : 1;
}

/**
 * 按状态优先级 → 截止日升序（无截止日置底）排序，返回新数组。
 *
 * @param items - 待排序的资料项列表
 * @returns 排序后的新数组
 */
export function sortDocumentsByDefault<
  T extends Pick<DocumentListItem, "status" | "dueDate">,
>(items: readonly T[]): T[] {
  return [...items].sort(compareDocumentItems);
}

// ─── Selectable filter ──────────────────────────────────────────

/**
 * 返回可被批量操作选中的资料项（approved/waived 不可选）。
 *
 * @param items - 资料项列表
 * @returns 可选中的子集
 */
export function getSelectableItems<T extends Pick<DocumentListItem, "status">>(
  items: readonly T[],
): T[] {
  return items.filter((item) => isSelectableForBatch(item.status));
}

// ─── Case option derivation ─────────────────────────────────────

/**
 *
 */
export interface CaseOption {
  /**
   *
   */
  value: string;
  /**
   *
   */
  label: string;
}

/**
 * 从资料项列表去重提取案件选项。
 *
 * @param items - 资料项列表
 * @returns 去重后的案件选项
 */
export function deriveCaseOptions(
  items: readonly Pick<DocumentListItem, "caseId" | "caseName">[],
): CaseOption[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    if (!seen.has(item.caseId)) {
      seen.set(item.caseId, item.caseName);
    }
  }
  return Array.from(seen, ([value, label]) => ({ value, label }));
}

// ─── Summary Card Key → variant lookup ──────────────────────────

export const SUMMARY_CARD_VARIANTS: Record<
  DocumentSummaryCardKey,
  DocumentSummaryCardData["variant"]
> = {
  pendingReview: "info",
  missing: "warning",
  expired: "danger",
  sharedExpiryRisk: "neutral",
};

// ─── Demo Data (covers all 6 statuses, all 4 providers) ─────────

export const SAMPLE_DOCUMENTS: DocumentListItem[] = [
  {
    id: "doc-001",
    name: "パスポート写し",
    caseId: "case-001",
    caseName: "A2026-001 経営管理ビザ新規",
    provider: "main_applicant",
    status: "uploaded_reviewing",
    dueDate: "2026-04-20",
    dueDateLabel: "2026-04-20",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: "A2026-001/main_applicant/passport/20260409_passport.pdf",
    sharedExpiryRisk: false,
    referenceCount: 1,
  },
  {
    id: "doc-002",
    name: "在留カード写し",
    caseId: "case-001",
    caseName: "A2026-001 経営管理ビザ新規",
    provider: "main_applicant",
    status: "pending",
    dueDate: "2026-04-25",
    dueDateLabel: "2026-04-25",
    lastReminderAt: "2026-04-10 14:30",
    lastReminderAtLabel: "2026-04-10 14:30",
    relativePath: null,
    sharedExpiryRisk: false,
    referenceCount: 1,
  },
  {
    id: "doc-003",
    name: "雇用契約書",
    caseId: "case-002",
    caseName: "A2026-002 技人国更新",
    provider: "employer_org",
    status: "approved",
    dueDate: "2026-04-15",
    dueDateLabel: "2026-04-15",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: "A2026-002/employer_org/contract/20260401_contract.pdf",
    sharedExpiryRisk: false,
    referenceCount: 2,
  },
  {
    id: "doc-004",
    name: "納税証明書",
    caseId: "case-002",
    caseName: "A2026-002 技人国更新",
    provider: "main_applicant",
    status: "rejected",
    dueDate: "2026-04-18",
    dueDateLabel: "2026-04-18",
    lastReminderAt: "2026-04-12 09:00",
    lastReminderAtLabel: "2026-04-12 09:00",
    relativePath: "A2026-002/main_applicant/tax_cert/20260405_tax.pdf",
    sharedExpiryRisk: false,
    referenceCount: 1,
  },
  {
    id: "doc-005",
    name: "課税証明書（3ヶ月以内）",
    caseId: "case-001",
    caseName: "A2026-001 経営管理ビザ新規",
    provider: "main_applicant",
    status: "expired",
    dueDate: "2026-03-31",
    dueDateLabel: "已过期",
    lastReminderAt: "2026-04-01 10:00",
    lastReminderAtLabel: "2026-04-01 10:00",
    relativePath: "A2026-001/main_applicant/tax_income/20260201_kazei.pdf",
    sharedExpiryRisk: true,
    referenceCount: 3,
  },
  {
    id: "doc-006",
    name: "身元保証書",
    caseId: "case-003",
    caseName: "A2026-003 家族滞在新規",
    provider: "dependent_guarantor",
    status: "waived",
    dueDate: null,
    dueDateLabel: "—",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: null,
    sharedExpiryRisk: false,
    referenceCount: 0,
  },
  {
    id: "doc-007",
    name: "登記簿謄本",
    caseId: "case-001",
    caseName: "A2026-001 経営管理ビザ新規",
    provider: "office_internal",
    status: "uploaded_reviewing",
    dueDate: "2026-04-22",
    dueDateLabel: "2026-04-22",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: "A2026-001/office_internal/registry/20260410_registry.pdf",
    sharedExpiryRisk: false,
    referenceCount: 1,
  },
  {
    id: "doc-008",
    name: "事業計画書",
    caseId: "case-001",
    caseName: "A2026-001 経営管理ビザ新規",
    provider: "office_internal",
    status: "pending",
    dueDate: null,
    dueDateLabel: "—",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: null,
    sharedExpiryRisk: false,
    referenceCount: 1,
  },
  {
    id: "doc-009",
    name: "住民票",
    caseId: "case-002",
    caseName: "A2026-002 技人国更新",
    provider: "main_applicant",
    status: "uploaded_reviewing",
    dueDate: "2026-04-28",
    dueDateLabel: "2026-04-28",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: "A2026-002/main_applicant/juminhyo/20260412_juminhyo.pdf",
    sharedExpiryRisk: false,
    referenceCount: 1,
  },
  {
    id: "doc-010",
    name: "給与明細（直近3ヶ月）",
    caseId: "case-002",
    caseName: "A2026-002 技人国更新",
    provider: "employer_org",
    status: "approved",
    dueDate: "2026-05-01",
    dueDateLabel: "2026-05-01",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: "A2026-002/employer_org/payslip/20260408_payslip.pdf",
    sharedExpiryRisk: false,
    referenceCount: 1,
  },
  {
    id: "doc-011",
    name: "戸籍謄本",
    caseId: "case-003",
    caseName: "A2026-003 家族滞在新規",
    provider: "dependent_guarantor",
    status: "pending",
    dueDate: "2026-05-05",
    dueDateLabel: "2026-05-05",
    lastReminderAt: "2026-04-08 11:00",
    lastReminderAtLabel: "2026-04-08 11:00",
    relativePath: null,
    sharedExpiryRisk: false,
    referenceCount: 1,
  },
  {
    id: "doc-012",
    name: "会社決算書（直近2期）",
    caseId: "case-001",
    caseName: "A2026-001 経営管理ビザ新規",
    provider: "employer_org",
    status: "expired",
    dueDate: "2026-03-20",
    dueDateLabel: "已过期",
    lastReminderAt: "2026-03-25 16:00",
    lastReminderAtLabel: "2026-03-25 16:00",
    relativePath: "A2026-001/employer_org/financial/20250401_kessan.pdf",
    sharedExpiryRisk: true,
    referenceCount: 2,
  },
];

/** テスト契約で使用されるエイリアス。 */
export { SAMPLE_DOCUMENTS as SAMPLE_DOCUMENT_LIST };

// ─── Pre-computed static summary cards ──────────────────────────

export const SAMPLE_DOCUMENT_SUMMARY_CARDS =
  deriveDocumentSummaryCards(SAMPLE_DOCUMENTS);

// ─── Static case options (for filters) ──────────────────────────

export const CASE_OPTIONS: CaseOption[] = deriveCaseOptions(SAMPLE_DOCUMENTS);

// ─── Reference candidates (P0-CONTRACT §8.4 demo) ──────────────

export const SAMPLE_REFERENCE_CANDIDATES: ReferenceCandidate[] = [
  {
    id: "ref-001",
    sourceCaseId: "case-002",
    sourceCaseName: "A2026-002 技人国更新",
    sourceDocName: "課税証明書（3ヶ月以内）",
    version: 2,
    reviewedAt: "2026-03-15",
    expiryDate: "2026-06-15",
  },
  {
    id: "ref-002",
    sourceCaseId: "case-003",
    sourceCaseName: "A2026-003 家族滞在新規",
    sourceDocName: "課税証明書（3ヶ月以内）",
    version: 1,
    reviewedAt: "2026-02-20",
    expiryDate: "2026-05-20",
  },
];

// ─── Shared expiry risk (P0-CONTRACT §9 demo) ───────────────────

export const SAMPLE_RISK_DATA: SharedExpiryRiskData = {
  versionInfo: "課税証明書（3ヶ月以内） v1 — 有効期限: 2026-03-31（已过期）",
  affectedCases: [
    {
      caseId: "case-001",
      caseName: "A2026-001 経営管理ビザ新規",
      docName: "課税証明書",
    },
    {
      caseId: "case-002",
      caseName: "A2026-002 技人国更新",
      docName: "課税証明書",
    },
    {
      caseId: "case-003",
      caseName: "A2026-003 家族滞在新規",
      docName: "課税証明書",
    },
  ],
  suggestedAction: "请通知客户提供新版课税证明，更新后所有引用案件将自动恢复。",
};
