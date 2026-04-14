import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale } from "../../../i18n";
import CustomerTable from "./CustomerTable.vue";
import type { CustomerSummary } from "../types";

const ROWS: CustomerSummary[] = [
  {
    id: "c1",
    displayName: "田中太郎",
    legalName: "田中太郎",
    furigana: "タナカタロウ",
    customerNumber: "C-001",
    phone: "090-1111-2222",
    email: "tanaka@example.com",
    totalCases: 3,
    activeCases: 1,
    lastContactDate: "2025-04-10",
    lastContactChannel: "電話",
    owner: { initials: "YS", name: "山田翔太" },
    referralSource: "紹介",
    group: "東京一組",
  },
  {
    id: "c2",
    displayName: "陈明",
    legalName: "陈明",
    furigana: "チンメイ",
    customerNumber: "C-002",
    phone: "080-3333-4444",
    email: "chen@example.com",
    totalCases: 2,
    activeCases: 0,
    lastContactDate: null,
    lastContactChannel: null,
    owner: { initials: "TK", name: "高橋健太" },
    referralSource: "",
    group: "大阪組",
  },
];

describe("CustomerTable", () => {
  beforeEach(() => {
    setAppLocale("en-US");
  });

  function factory(props: Record<string, unknown> = {}) {
    return mount(CustomerTable, {
      props: {
        customers: ROWS,
        selectedIds: new Set<string>(),
        allSelected: false,
        indeterminate: false,
        ...props,
      },
      global: { plugins: [i18n] },
    });
  }

  it("renders a table with thead and tbody", () => {
    const w = factory();
    expect(w.find("table").exists()).toBe(true);
    expect(w.find("thead").exists()).toBe(true);
    expect(w.find("tbody").exists()).toBe(true);
  });

  it("renders 9 column headers", () => {
    const w = factory();
    expect(w.findAll("th")).toHaveLength(9);
  });

  it("renders a row per customer", () => {
    const w = factory();
    expect(w.findAll("tbody tr")).toHaveLength(2);
  });

  it("renders empty state when no customers", () => {
    const w = factory({ customers: [] });
    expect(w.find(".customer-empty-state").exists()).toBe(true);
  });

  it("header checkbox reflects allSelected prop", () => {
    const w = factory({ allSelected: true });
    const cb = w.find(".customer-table__checkbox").element as HTMLInputElement;
    expect(cb.checked).toBe(true);
  });

  it("header checkbox is not checked when allSelected is false", () => {
    const w = factory({ allSelected: false });
    const cb = w.find(".customer-table__checkbox").element as HTMLInputElement;
    expect(cb.checked).toBe(false);
  });

  it("emits selectAll when header checkbox changes", async () => {
    const w = factory();
    const cb = w.find(".customer-table__checkbox");
    await cb.setValue(true);
    expect(w.emitted("selectAll")).toBeTruthy();
    expect(w.emitted("selectAll")![0]).toEqual([true]);
  });

  it("emits selectRow when a row checkbox changes", async () => {
    const w = factory();
    const rowCheckboxes = w.findAll(".customer-row__checkbox");
    await rowCheckboxes[0].setValue(true);
    expect(w.emitted("selectRow")).toBeTruthy();
    expect(w.emitted("selectRow")![0]).toEqual(["c1", true]);
  });

  it("marks row checkbox as checked when selectedIds contains it", () => {
    const w = factory({ selectedIds: new Set(["c1"]) });
    const rowCheckboxes = w.findAll(".customer-row__checkbox");
    expect((rowCheckboxes[0].element as HTMLInputElement).checked).toBe(true);
    expect((rowCheckboxes[1].element as HTMLInputElement).checked).toBe(false);
  });

  it("renders clickable links for case summary and create-case action", () => {
    const w = factory();
    const caseLinks = w.findAll(".customer-row__cases-link");
    const actionLinks = w.findAll(".customer-row__actions a");
    expect(caseLinks[0].attributes("href")).toBe("#/cases?customerId=c1");
    expect(actionLinks[1].attributes("href")).toBe(
      "#/cases/create?customerId=c1",
    );
  });
});
