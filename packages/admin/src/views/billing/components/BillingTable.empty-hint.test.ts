import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import BillingTable from "./BillingTable.vue";
import type { CaseBillingRow } from "../types";

const NON_OVERDUE_ROW: CaseBillingRow = {
  id: "billing-hint-1",
  caseId: "case-hint-1",
  caseName: "Hint Probe",
  caseNo: "CASE-202604-H001",
  client: { name: "Client A", type: "個人" },
  group: "tokyo-1",
  owner: "Admin",
  amountDue: 100000,
  amountReceived: 100000,
  amountOutstanding: 0,
  status: "paid",
  nextNode: null,
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAcknowledgedByDisplayName: null,
};

function makeRows(count: number): CaseBillingRow[] {
  return Array.from({ length: count }, (_, i) => ({
    ...NON_OVERDUE_ROW,
    id: `billing-hint-${i + 1}`,
    caseId: `case-hint-${i + 1}`,
    status: i % 2 === 0 ? ("paid" as const) : ("due" as const),
  }));
}

const originalLocale = i18n.global.locale.value as AppLocale;

function mountTable(rows: CaseBillingRow[], selectableCount: number) {
  return mount(BillingTable, {
    props: { rows, selectableCount },
    global: { plugins: [i18n] },
  });
}

describe("BillingTable — bulk empty hint", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  afterEach(() => {
    setAppLocale(originalLocale);
  });

  it("shows empty hint when rows exist but selectableCount is 0", () => {
    const rows = makeRows(6);
    const wrapper = mountTable(rows, 0);

    const hint = wrapper.find(".bulk-empty-hint");
    expect(hint.exists()).toBe(true);
    expect(hint.attributes("role")).toBe("note");
    expect(hint.text()).toBe("当前没有逾期应收，无法发起批量催款");
  });

  it("does not show empty hint when selectableCount > 0", () => {
    const rows: CaseBillingRow[] = [
      { ...NON_OVERDUE_ROW, status: "overdue", id: "overdue-1" },
    ];
    const wrapper = mountTable(rows, 1);

    expect(wrapper.find(".bulk-empty-hint").exists()).toBe(false);
  });

  it("does not show empty hint when rows are empty", () => {
    const wrapper = mountTable([], 0);

    expect(wrapper.find(".bulk-empty-hint").exists()).toBe(false);
  });

  it("sets title on select-all checkbox when selectableCount is 0", () => {
    const rows = makeRows(3);
    const wrapper = mountTable(rows, 0);

    const selectAll = wrapper.find("thead input[type='checkbox']");
    expect(selectAll.exists()).toBe(true);
    expect(selectAll.attributes("title")).toBe(
      "当前没有逾期应收，无法发起批量催款",
    );
  });

  it("omits title on select-all checkbox when selectableCount > 0", () => {
    const rows: CaseBillingRow[] = [
      { ...NON_OVERDUE_ROW, status: "overdue", id: "overdue-1" },
    ];
    const wrapper = mountTable(rows, 1);

    const selectAll = wrapper.find("thead input[type='checkbox']");
    expect(selectAll.attributes("title")).toBeUndefined();
  });

  it("renders localized hint text per locale", async () => {
    const rows = makeRows(2);
    const wrapper = mountTable(rows, 0);

    expect(wrapper.find(".bulk-empty-hint").text()).toBe(
      "当前没有逾期应收，无法发起批量催款",
    );

    setAppLocale("ja-JP");
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".bulk-empty-hint").text()).toBe(
      "現在、延滞中の請求がないため、一括督促はできません",
    );

    setAppLocale("en-US");
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".bulk-empty-hint").text()).toBe(
      "No overdue receivables — bulk collection is unavailable",
    );
  });
});
