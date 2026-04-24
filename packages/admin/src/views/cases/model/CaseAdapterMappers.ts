import type { CaseListItem, CaseSummaryCardData } from "../types";
import type { CaseListResult, CaseSummaryResult } from "./CaseAdapterTypes";
import {
  CASE_SUMMARY_CARD_KEYS,
  CASE_SUMMARY_CARD_VARIANTS,
} from "./CaseAdapterTypes";
import {
  asRecord,
  formatDate,
  readNullableString,
  readNumber,
  readString,
  resolveRiskStatus,
  resolveStageId,
  resolveValidationStatus,
} from "./CaseAdapterShared";

// ─── List DTO → CaseListItem mapping (frozen by p0-fe-002b-04/05) ─
// 支持两种响应结构：
//   1. Summary 格式 (view=summary)：{ case: {...}, customerName, groupName, latestValidation }
//   2. Flat 格式（无 view）：所有字段平铺在同一层
// customer 下游最小字段集见 CaseAdapterTypes.CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS。
//
// 基础字段（002b-04）：id / name / type / applicant / customerId / groupId / groupLabel / stageId / ownerId
// 派生状态（002b-05）：validationStatus / riskStatus / dueDate / unpaidAmount / updatedAtLabel

function adaptCaseListItemDto(value: unknown): CaseListItem | null {
  const record = asRecord(value);
  if (!record) return null;

  const caseRecord = asRecord(record.case) ?? record;
  const id = readString(caseRecord, "id");
  if (!id) return null;

  const stage = readString(caseRecord, "stage");
  const stageId = resolveStageId(stage);
  const riskLevel = readString(caseRecord, "riskLevel");
  const dueAt = readNullableString(caseRecord, "dueAt");

  return {
    id,
    name:
      readString(caseRecord, "caseName") ||
      readString(caseRecord, "caseNo") ||
      id,
    type: readString(caseRecord, "caseTypeCode"),
    applicant:
      readString(record, "customerName") ||
      readString(caseRecord, "customerId"),
    customerId: readString(caseRecord, "customerId") || undefined,
    groupId: readString(caseRecord, "groupId"),
    groupLabel: readString(record, "groupName"),
    stageId,
    stageLabel: stageId,
    ownerId: readString(caseRecord, "ownerUserId"),
    completionPercent: 0,
    completionLabel: "",
    validationStatus: resolveValidationStatus(record.latestValidation),
    validationLabel: "",
    blockerCount: 0,
    unpaidAmount: readNumber(caseRecord, "billingUnpaidAmountCached"),
    updatedAtLabel: formatDate(readNullableString(caseRecord, "updatedAt")),
    dueDate: dueAt ?? "",
    dueDateLabel: formatDate(dueAt),
    riskStatus: resolveRiskStatus(riskLevel),
    riskLabel: riskLevel || "low",
    visibleScopes: ["all"],
  };
}

/**
 * 将案件列表原始响应适配为类型化结果。
 *
 * @param value - 列表接口返回的原始 JSON
 * @returns 适配后的列表结果，格式无效时返回 `null`
 */
export function adaptCaseListResult(value: unknown): CaseListResult | null {
  const record = asRecord(value);
  if (!record) return null;

  if (!Array.isArray(record.items)) return null;

  const items = record.items
    .map((item) => adaptCaseListItemDto(item))
    .filter((item): item is CaseListItem => item !== null);

  const total = readNumber(record, "total");
  const page = readNumber(record, "page");
  const limit = readNumber(record, "limit");
  return {
    items,
    total: total || items.length,
    page: page || 1,
    limit: limit || items.length,
  };
}

// ─── Summary Cards (frozen by p0-fe-002b-06) ────────────────────
// 聚合口径：
//   activeCases     — stageId !== "S9" 的计数
//   failedValidations — validationStatus === "failed" 的计数（含 S9）
//   dueSoon         — 非 S9 且 dueDate 在 [today, today+7] 的计数
//   unpaidTotal     — 非 S9 的 unpaidAmount 求和
// 字段来源全部为 CaseListItem，与列表模型一致。

const SUMMARY_LABELS: Record<(typeof CASE_SUMMARY_CARD_KEYS)[number], string> =
  {
    activeCases: "进行中案件",
    failedValidations: "检查未通过",
    dueSoon: "即将到期",
    unpaidTotal: "待收金额",
  };

/**
 * 根据案件列表生成仪表板汇总卡片。
 *
 * @param items - 已适配的案件列表项
 * @returns 四张汇总卡片（进行中、校验失败、即将到期、未收金额）
 */
export function adaptCaseSummaryCards(
  items: CaseListItem[],
): CaseSummaryCardData[] {
  const active = items.filter((c) => c.stageId !== "S9");
  const failedValidations = items.filter(
    (c) => c.validationStatus === "failed",
  ).length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dueSoon = active.filter((c) => {
    if (!c.dueDate) return false;
    const due = new Date(c.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = (due.getTime() - todayStart.getTime()) / 86_400_000;
    return diffDays >= 0 && diffDays <= 7;
  }).length;
  const unpaidTotal = active.reduce((sum, c) => sum + c.unpaidAmount, 0);

  return [
    {
      key: "activeCases",
      variant: CASE_SUMMARY_CARD_VARIANTS.activeCases,
      value: active.length,
      label: SUMMARY_LABELS.activeCases,
    },
    {
      key: "failedValidations",
      variant: CASE_SUMMARY_CARD_VARIANTS.failedValidations,
      value: failedValidations,
      label: SUMMARY_LABELS.failedValidations,
    },
    {
      key: "dueSoon",
      variant: CASE_SUMMARY_CARD_VARIANTS.dueSoon,
      value: dueSoon,
      label: SUMMARY_LABELS.dueSoon,
    },
    {
      key: "unpaidTotal",
      variant: CASE_SUMMARY_CARD_VARIANTS.unpaidTotal,
      value: unpaidTotal,
      label: SUMMARY_LABELS.unpaidTotal,
    },
  ];
}

/**
 * 将列表原始响应一次性适配为汇总视图结果（列表 + 汇总卡片）。
 *
 * @param value - 列表接口返回的原始 JSON
 * @returns 汇总结果，格式无效时返回 `null`
 */
export function adaptCaseSummaryResult(
  value: unknown,
): CaseSummaryResult | null {
  const listResult = adaptCaseListResult(value);
  if (!listResult) return null;

  return {
    items: listResult.items,
    total: listResult.total,
    cards: adaptCaseSummaryCards(listResult.items),
  };
}
