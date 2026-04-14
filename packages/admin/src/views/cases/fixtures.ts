import type {
  CaseListItem,
  CaseOwnerOption,
  CaseSampleKey,
  CaseScope,
  CaseSummaryCardData,
} from "./types";
import { CASE_OWNER_OPTIONS } from "./constants";

// ─── Viewer Context ─────────────────────────────────────────────

/**
 *
 */
export interface CaseViewerContext {
  /**
   *
   */
  ownerId: string;
  /**
   *
   */
  ownerLabel: string;
  /**
   *
   */
  groupId: string;
  /**
   *
   */
  groupLabel: string;
}

export const CURRENT_CASE_VIEWER: CaseViewerContext = {
  ownerId: "suzuki",
  ownerLabel: "Suzuki",
  groupId: "tokyo-1",
  groupLabel: "东京一组",
};

// ─── Owner Lookup ───────────────────────────────────────────────

export const OWNER_BY_ID: Record<string, CaseOwnerOption> = Object.fromEntries(
  CASE_OWNER_OPTIONS.map((o) => [o.value, o]),
);

/**
 * 按 ID 查找负责人选项。
 *
 * @param id - 负责人 ID
 * @returns 匹配的选项或 undefined
 */
export function findOwnerOption(id: string): CaseOwnerOption | undefined {
  return OWNER_BY_ID[id];
}

// ─── Scope Filter ───────────────────────────────────────────────

/**
 * 按范围过滤案件列表。
 *
 * @param items - 全量案件列表
 * @param scope - 可见范围
 * @returns 范围内可见的案件
 */
export function filterByScope(
  items: CaseListItem[],
  scope: CaseScope,
): CaseListItem[] {
  return items.filter((c) => c.visibleScopes.includes(scope));
}

// ─── List Items ─────────────────────────────────────────────────

export const SAMPLE_CASE_LIST: CaseListItem[] = [
  {
    id: "CAS-2026-0181",
    name: "李娜 家族滞在更新",
    type: "家族滞在 / 更新",
    applicant: "李娜",
    customerId: "cust-001",
    groupId: "tokyo-1",
    groupLabel: "东京一组",
    stageId: "S2",
    stageLabel: "资料收集中",
    ownerId: "suzuki",
    completionPercent: 83,
    completionLabel: "10 / 12 必交通过",
    validationStatus: "pending",
    validationLabel: "待检查",
    blockerCount: 0,
    unpaidAmount: 120000,
    updatedAtLabel: "今天 09:20",
    dueDate: "2026-04-18",
    dueDateLabel: "04-18",
    riskStatus: "attention",
    riskLabel: "关注",
    sampleKey: "family",
    visibleScopes: ["mine", "group", "all"],
  },
  {
    id: "CAS-2026-0187",
    name: "陈太太 家族滞在认定",
    type: "家族滞在 / 认定",
    applicant: "陈太太",
    customerId: "cust-002",
    groupId: "tokyo-1",
    groupLabel: "东京一组",
    stageId: "S2",
    stageLabel: "资料收集中",
    ownerId: "suzuki",
    completionPercent: 61,
    completionLabel: "11 / 18 必交通过",
    validationStatus: "pending",
    validationLabel: "待检查",
    blockerCount: 0,
    unpaidAmount: 120000,
    updatedAtLabel: "今天 11:05",
    dueDate: "2026-04-14",
    dueDateLabel: "04-14",
    riskStatus: "attention",
    riskLabel: "关注",
    batchLabel: "家族签批量开始办案",
    casePartySummary: "关联人：陈美（扶养者），陈建国（保证人）",
    materialSummary: "共用扶养者在留卡与课税证明，亲属关系证明待补齐",
    sampleKey: "family",
    visibleScopes: ["mine", "group", "all"],
  },
  {
    id: "CAS-2026-0188",
    name: "陈小宝 家族滞在认定",
    type: "家族滞在 / 认定",
    applicant: "陈小宝",
    customerId: "cust-002",
    groupId: "tokyo-1",
    groupLabel: "东京一组",
    stageId: "S3",
    stageLabel: "资料待补 / 审核中",
    ownerId: "suzuki",
    completionPercent: 68,
    completionLabel: "13 / 19 必交通过",
    validationStatus: "failed",
    validationLabel: "未通过",
    blockerCount: 2,
    unpaidAmount: 120000,
    updatedAtLabel: "今天 11:05",
    dueDate: "2026-04-14",
    dueDateLabel: "04-14",
    riskStatus: "critical",
    riskLabel: "高风险",
    batchLabel: "家族签批量开始办案",
    casePartySummary: "关联人：陈美（扶养者），陈建国（保证人）",
    materialSummary: "出生证明待补齐，历史附件版本将在提交包中锁定",
    sampleKey: "gate-fail",
    visibleScopes: ["mine", "group", "all"],
  },
  {
    id: "CAS-2026-0191",
    name: "王浩 技人国认定",
    type: "技人国 / 认定",
    applicant: "王浩",
    customerId: "cust-003",
    groupId: "tokyo-2",
    groupLabel: "东京二组",
    stageId: "S4",
    stageLabel: "文书制作中",
    ownerId: "tanaka",
    completionPercent: 92,
    completionLabel: "11 / 12 必交通过",
    validationStatus: "passed",
    validationLabel: "已通过",
    blockerCount: 0,
    unpaidAmount: 0,
    updatedAtLabel: "昨天 18:40",
    dueDate: "2026-04-21",
    dueDateLabel: "04-21",
    riskStatus: "normal",
    riskLabel: "正常",
    sampleKey: "work",
    visibleScopes: ["group", "all"],
  },
  {
    id: "CAS-2026-0204",
    name: "Global Talent 在留资格变更",
    type: "技人国 / 变更",
    applicant: "Liu Chen",
    groupId: "tokyo-2",
    groupLabel: "东京二组",
    stageId: "S5",
    stageLabel: "提交前检查",
    ownerId: "li",
    completionPercent: 100,
    completionLabel: "14 / 14 必交通过",
    validationStatus: "failed",
    validationLabel: "未通过",
    blockerCount: 1,
    unpaidAmount: 90000,
    updatedAtLabel: "2 小时前",
    dueDate: "2026-04-12",
    dueDateLabel: "04-12",
    riskStatus: "critical",
    riskLabel: "高风险",
    sampleKey: "gate-fail",
    visibleScopes: ["all"],
  },
  {
    id: "CAS-2026-0209",
    name: "佐藤健 技人国更新",
    type: "技人国 / 更新",
    applicant: "佐藤健",
    groupId: "osaka",
    groupLabel: "大阪组",
    stageId: "S7",
    stageLabel: "已递交待回执",
    ownerId: "sato",
    completionPercent: 100,
    completionLabel: "16 / 16 必交通过",
    validationStatus: "passed",
    validationLabel: "已通过",
    blockerCount: 0,
    unpaidAmount: 30000,
    updatedAtLabel: "3 天前",
    dueDate: "2026-04-26",
    dueDateLabel: "04-26",
    riskStatus: "attention",
    riskLabel: "关注",
    sampleKey: "work",
    visibleScopes: ["all"],
  },
  {
    id: "CAS-2026-0232",
    name: "陈太太 家族滞在认定(批量)",
    type: "家族滞在 / 认定",
    applicant: "陈太太",
    customerId: "cust-002",
    groupId: "tokyo-1",
    groupLabel: "东京一组",
    stageId: "S3",
    stageLabel: "资料待补 / 审核中",
    ownerId: "suzuki",
    completionPercent: 54,
    completionLabel: "7 / 13 资料已收齐",
    validationStatus: "failed",
    validationLabel: "未通过",
    blockerCount: 1,
    unpaidAmount: 180000,
    updatedAtLabel: "今天 10:30",
    dueDate: "2026-06-03",
    dueDateLabel: "06-03",
    riskStatus: "critical",
    riskLabel: "高风险",
    sampleKey: "family",
    visibleScopes: ["mine", "group", "all"],
  },
  {
    id: "CAS-2026-0240",
    name: "佐藤美咲 经营管理签认定",
    type: "经营管理签 / 认定",
    applicant: "佐藤美咲",
    customerId: "cust-004",
    groupId: "tokyo-2",
    groupLabel: "东京二组",
    stageId: "S8",
    stageLabel: "认定通过待收尾款",
    ownerId: "tanaka",
    completionPercent: 100,
    completionLabel: "13 / 13 资料已收齐",
    validationStatus: "passed",
    validationLabel: "已通过",
    blockerCount: 0,
    unpaidAmount: 600000,
    updatedAtLabel: "08-12 09:30",
    dueDate: "2026-08-14",
    dueDateLabel: "08-14",
    riskStatus: "attention",
    riskLabel: "关注",
    sampleKey: "arrears",
    visibleScopes: ["mine", "group", "all"],
  },
  {
    id: "CAS-2026-0245",
    name: "陈小宝 家族滞在认定(补正)",
    type: "家族滞在 / 认定",
    applicant: "陈小宝",
    customerId: "cust-002",
    groupId: "tokyo-1",
    groupLabel: "东京一组",
    stageId: "S8",
    stageLabel: "补资料处理中",
    ownerId: "suzuki",
    completionPercent: 100,
    completionLabel: "19 / 19 必交通过",
    validationStatus: "pending",
    validationLabel: "待检查",
    blockerCount: 0,
    unpaidAmount: 120000,
    updatedAtLabel: "07-27 18:00",
    dueDate: "2026-07-29",
    dueDateLabel: "07-29",
    riskStatus: "attention",
    riskLabel: "关注",
    sampleKey: "correction",
    visibleScopes: ["mine", "group", "all"],
  },
  {
    id: "CAS-2025-1178",
    name: "Smith John 家族滞在更新",
    type: "家族滞在 / 更新",
    applicant: "Smith John",
    groupId: "tokyo-1",
    groupLabel: "东京一组",
    stageId: "S9",
    stageLabel: "已归档",
    ownerId: "tanaka",
    completionPercent: 100,
    completionLabel: "18 / 18 必交通过",
    validationStatus: "passed",
    validationLabel: "已通过",
    blockerCount: 0,
    unpaidAmount: 0,
    updatedAtLabel: "2026-03-25",
    dueDate: "2026-03-18",
    dueDateLabel: "03-18",
    riskStatus: "normal",
    riskLabel: "正常",
    sampleKey: "archived",
    visibleScopes: ["group", "all"],
  },
];

// ─── Sample Key → Case ID ───────────────────────────────────────

export const SAMPLE_KEY_TO_CASE_ID: Record<CaseSampleKey, string> = {
  work: "CAS-2026-0191",
  family: "CAS-2026-0232",
  "gate-fail": "CAS-2026-0204",
  arrears: "CAS-2026-0240",
  correction: "CAS-2026-0245",
  archived: "CAS-2025-1178",
};

// ─── Summary Cards ──────────────────────────────────────────────

export const SAMPLE_SUMMARY_CARDS: CaseSummaryCardData[] = [
  { key: "activeCases", variant: "primary", value: 18, label: "进行中案件" },
  {
    key: "failedValidations",
    variant: "info",
    value: 3,
    label: "检查未通过",
  },
  { key: "dueSoon", variant: "warning", value: 5, label: "即将到期" },
  {
    key: "unpaidTotal",
    variant: "neutral",
    value: 480000,
    label: "待收金额",
  },
];

/**
 * 从案件列表推导概览卡片数据。
 *
 * @param items - 当前可见案件列表
 * @returns 4 张概览卡片数据
 */
export function deriveCaseSummaryCards(
  items: CaseListItem[],
): CaseSummaryCardData[] {
  const active = items.filter((c) => c.stageId !== "S9");
  const failedValidations = items.filter(
    (c) => c.validationStatus === "failed",
  );
  const dueSoon = active.filter((c) => {
    if (!c.dueDate) return false;
    const diff =
      (new Date(c.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff >= 0;
  });
  const unpaidTotal = active.reduce((sum, c) => sum + c.unpaidAmount, 0);

  return [
    {
      key: "activeCases",
      variant: "primary",
      value: active.length,
      label: "进行中案件",
    },
    {
      key: "failedValidations",
      variant: "info",
      value: failedValidations.length,
      label: "检查未通过",
    },
    {
      key: "dueSoon",
      variant: "warning",
      value: dueSoon.length,
      label: "即将到期",
    },
    {
      key: "unpaidTotal",
      variant: "neutral",
      value: unpaidTotal,
      label: "待收金额",
    },
  ];
}

// ─── Re-export create fixtures from separate file ───────────────

export {
  SAMPLE_CREATE_CUSTOMERS,
  SAMPLE_CREATE_TEMPLATES,
  FAMILY_SCENARIO,
} from "./fixtures-create";
export { SAMPLE_CREATE_TEMPLATES as SAMPLE_TEMPLATES } from "./fixtures-create";
