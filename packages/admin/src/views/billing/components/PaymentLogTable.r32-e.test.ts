import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import { formatDateTime } from "../../../shared/model/formatDateTime";
import PaymentLogTable from "./PaymentLogTable.vue";
import type { PaymentLogEntry } from "../types";

const ISO_TIMESTAMP = "2026-04-15T09:30:00.000Z";

const ENTRY: PaymentLogEntry = {
  id: "pay-r32e-1",
  date: ISO_TIMESTAMP,
  caseNo: "CASE-202604-R32E",
  caseName: "R32-E Probe",
  amount: 150000,
  node: "着手金",
  receipt: false,
  recordStatus: "valid",
  operator: "Admin",
  note: "",
};

const originalLocale = i18n.global.locale.value as AppLocale;

function mountTable(entries: PaymentLogEntry[] = [ENTRY]) {
  return mount(PaymentLogTable, {
    props: { entries },
    global: { plugins: [i18n] },
  });
}

function readDateCell(wrapper: ReturnType<typeof mount>): string {
  const dateCells = wrapper.findAll(".payment-log__col--date");
  const bodyCell = dateCells.find((el) => !el.element.closest("thead"));
  return bodyCell?.text() ?? "";
}

describe("PaymentLogTable — R32-E date formatting", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  afterEach(() => {
    setAppLocale(originalLocale);
  });

  it("renders zh-CN formatted date instead of raw ISO", () => {
    const wrapper = mountTable();
    const text = readDateCell(wrapper);

    const expected = formatDateTime(ISO_TIMESTAMP, "zh-CN");
    expect(expected).not.toBe("");
    expect(text).toBe(expected);
    expect(text).not.toContain("T09:30:00");
  });

  it("renders en-US formatted date after locale switch", async () => {
    setAppLocale("en-US");
    const wrapper = mountTable();
    await wrapper.vm.$nextTick();

    const text = readDateCell(wrapper);
    const expected = formatDateTime(ISO_TIMESTAMP, "en-US");
    expect(expected).not.toBe("");
    expect(text).toBe(expected);
    expect(text).not.toContain("T09:30:00");
  });

  it("renders ja-JP formatted date after locale switch", async () => {
    setAppLocale("ja-JP");
    const wrapper = mountTable();
    await wrapper.vm.$nextTick();

    const text = readDateCell(wrapper);
    const expected = formatDateTime(ISO_TIMESTAMP, "ja-JP");
    expect(expected).not.toBe("");
    expect(text).toBe(expected);
    expect(text).not.toContain("T09:30:00");
  });

  it("does not render raw ISO string in any locale", async () => {
    const wrapper = mountTable();

    for (const loc of ["zh-CN", "en-US", "ja-JP"] as AppLocale[]) {
      setAppLocale(loc);
      await wrapper.vm.$nextTick();
      const text = readDateCell(wrapper);
      expect(text).not.toContain("2026-04-15T09:30:00");
      expect(text).not.toBe(ISO_TIMESTAMP);
    }
  });
});
