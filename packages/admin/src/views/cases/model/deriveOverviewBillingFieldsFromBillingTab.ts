import type { BillingData, CaseDetail } from "../types-detail";

function parseYenAmount(raw: string): number {
  const m = /^¥([\d,]+)/.exec(String(raw).trim());
  if (!m) return NaN;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function formatYenAmount(amount: number): string {
  return amount > 0 ? `¥${amount.toLocaleString()}` : "";
}

function resolveOverviewBillingAmount(billing: BillingData): string {
  const totalStr = String(billing.total).trim();
  const receivedNum = parseYenAmount(billing.received);
  const outstandingNum = parseYenAmount(billing.outstanding);
  const hasDisplayTotal = totalStr !== "" && totalStr !== "—";
  if (hasDisplayTotal) return billing.total;
  if (
    Number.isFinite(receivedNum) &&
    Number.isFinite(outstandingNum) &&
    outstandingNum <= 0 &&
    receivedNum > 0
  ) {
    return billing.received;
  }
  return billing.total;
}

function unpaidFromOutstanding(billing: BillingData): number {
  const outstandingNum = parseYenAmount(billing.outstanding);
  return Number.isFinite(outstandingNum) && outstandingNum > 0
    ? outstandingNum
    : 0;
}

/**
 * 收费 tab 数据就绪后，使概览「财务状况」卡片与收费区块一致。
 *
 * @param billing — `getBillingData` 返回值（可与 billing-tab aggregate summary 合并）
 * @returns 用于写入 `CaseDetail` 头字段的收费摘要（金额主文案与欠费 meta）
 */
export function deriveOverviewBillingFieldsFromBillingTab(
  billing: BillingData,
): Pick<
  CaseDetail,
  | "billingAmount"
  | "billingMeta"
  | "billingMetaKey"
  | "billingMetaParams"
  | "billingStatusKey"
> {
  const unpaidAmount = unpaidFromOutstanding(billing);
  const billingAmount = resolveOverviewBillingAmount(billing);

  return {
    billingAmount,
    billingMeta: formatYenAmount(unpaidAmount) || "",
    billingMetaKey: unpaidAmount > 0 ? "cases.detail.unpaidLabel" : "",
    billingMetaParams:
      unpaidAmount > 0 ? { amount: formatYenAmount(unpaidAmount) } : undefined,
    billingStatusKey: unpaidAmount > 0 ? "unpaid" : "paid",
  };
}
