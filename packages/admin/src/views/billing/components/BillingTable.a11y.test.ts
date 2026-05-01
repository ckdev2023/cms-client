import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import BillingTable from "./BillingTable.vue";
import type { CaseBillingRow } from "../types";

const ROW: CaseBillingRow = {
  id: "billing-a11y-1",
  caseId: "case-a11y-1",
  caseName: "A11y Probe",
  caseNo: "CASE-202604-A001",
  client: { name: "Test Client", type: "個人" },
  group: "tokyo-1",
  owner: "Admin",
  amountDue: 100000,
  amountReceived: 50000,
  amountOutstanding: 50000,
  status: "overdue",
  nextNode: { name: "残金", dueDate: "2026-04-01" },
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAcknowledgedByDisplayName: null,
};

function mountTable(rows: CaseBillingRow[] = [ROW]) {
  return mount(BillingTable, {
    props: { rows },
    global: { plugins: [i18n] },
  });
}

describe("BillingTable — a11y checkbox hit area", () => {
  it("wraps header select-all checkbox in ui-checkbox-hit label", () => {
    const wrapper = mountTable();

    const headerCheckbox = wrapper.find("thead input[type='checkbox']");
    expect(headerCheckbox.exists()).toBe(true);

    const parentLabel = headerCheckbox.element.closest("label");
    expect(parentLabel).not.toBeNull();
    expect(parentLabel!.classList.contains("ui-checkbox-hit")).toBe(true);
  });

  it("wraps each row checkbox in ui-checkbox-hit label", () => {
    const rows: CaseBillingRow[] = [
      ROW,
      { ...ROW, id: "billing-a11y-2", status: "due" },
    ];
    const wrapper = mountTable(rows);

    const rowCheckboxes = wrapper.findAll("tbody input[type='checkbox']");
    expect(rowCheckboxes.length).toBe(rows.length);

    for (const cb of rowCheckboxes) {
      const parentLabel = cb.element.closest("label");
      expect(parentLabel).not.toBeNull();
      expect(parentLabel!.classList.contains("ui-checkbox-hit")).toBe(true);
    }
  });
});
