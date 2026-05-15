import type { BillingData } from "../types-detail";
import { asRecord, readNumber } from "./CaseAdapterShared";

function formatYenAmount(amount: number): string {
  return amount > 0 ? `¥${amount.toLocaleString()}` : "¥0";
}

function readFiniteQuotePrice(record: Record<string, unknown>): number {
  const quoteRaw = record["quotePrice"];
  if (
    quoteRaw !== null &&
    quoteRaw !== undefined &&
    typeof quoteRaw === "number" &&
    Number.isFinite(quoteRaw)
  ) {
    return quoteRaw;
  }
  return 0;
}

function resolveBillingTabTotalDisplay(
  base: BillingData,
  totalDue: number,
  totalReceived: number,
  unpaidAmount: number,
  quotePrice: number,
): string {
  if (totalDue > 0) return `¥${totalDue.toLocaleString()}`;
  if (quotePrice > 0) return `¥${quotePrice.toLocaleString()}`;
  if (totalReceived > 0 && unpaidAmount <= 0 && base.total === "—") {
    return formatYenAmount(totalReceived);
  }
  return base.total;
}

/**
 * 将 `billing-tab-aggregate.summary`（CaseBillingSummaryFull）并入收费 tab 顶部三张统计卡片，
 * 与后端 SQL 汇总口径一致。
 *
 * @param base — `adaptCaseBillingData` 生成的表格行及占位聚合值。
 * @param summary — `/api/cases/:id/billing-tab-aggregate` 返回体中的 `summary` 字段。
 * @returns 覆盖统计数值后的收费视图模型。
 */
export function applyBillingSummaryFullToBillingData(
  base: BillingData,
  summary: unknown,
): BillingData {
  const r = asRecord(summary);
  if (!r) return base;

  const totalDue = readNumber(r, "totalDue");
  const totalReceived = readNumber(r, "totalReceived");
  const unpaidAmount = readNumber(r, "unpaidAmount");

  const quotePrice = readFiniteQuotePrice(r);

  const totalDisplay = resolveBillingTabTotalDisplay(
    base,
    totalDue,
    totalReceived,
    unpaidAmount,
    quotePrice,
  );

  return {
    ...base,
    total: totalDisplay,
    received: formatYenAmount(totalReceived),
    outstanding: formatYenAmount(Math.max(0, unpaidAmount)),
  };
}
