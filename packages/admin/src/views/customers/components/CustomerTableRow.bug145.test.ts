import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import { clearGroupAliases } from "../../../shared/model/useGroupOptions";
import CustomerTableRow from "./CustomerTableRow.vue";
import type { CustomerSummary } from "../types";

/**
 * BUG-145 [P1][BE]：`POST /api/customers` 直连若回退到 UUID 作 customerNumber，
 * admin 列表必须用 `—` 占位，不得直显 36-char UUID（与 BUG-136 同款防御）。
 */

const SAMPLE_UUID = "2d233e59-3af5-4af5-ae2d-7f0ae2eefd3c";

const BASE_CUSTOMER: CustomerSummary = {
  id: SAMPLE_UUID,
  displayName: "R12 keiei probe customer 2",
  legalName: "Yamada Taro 2",
  furigana: "ヤマダ タロウ",
  customerNumber: "CUS-202604-0042",
  phone: "",
  email: "",
  totalCases: 0,
  activeCases: 0,
  lastContactDate: null,
  lastContactChannel: null,
  owner: { initials: "Lo", name: "Local Admin" },
  referralSource: "",
  group: "tokyo-1",
  bmvProfile: null,
};

const originalLocale = i18n.global.locale.value as AppLocale;

function mountRow(customer: CustomerSummary) {
  return mount(CustomerTableRow, {
    props: { customer },
    global: { plugins: [i18n] },
  });
}

function readMetaText(wrapper: ReturnType<typeof mountRow>): string {
  const meta = wrapper.find(".customer-row__meta");
  expect(meta.exists()).toBe(true);
  return meta.text().trim();
}

describe("CustomerTableRow — BUG-145 customerNumber UUID fallback", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
    clearGroupAliases();
  });

  afterEach(() => {
    setAppLocale(originalLocale);
    clearGroupAliases();
  });

  it("renders `CUS-YYYYMM-NNNN` customer number directly", () => {
    const wrapper = mountRow({ ...BASE_CUSTOMER });
    expect(readMetaText(wrapper)).toBe("CUS-202604-0042");
  });

  it("hides UUID-shaped customerNumber with `—` placeholder", () => {
    const wrapper = mountRow({
      ...BASE_CUSTOMER,
      customerNumber: SAMPLE_UUID,
    });
    expect(readMetaText(wrapper)).toBe("—");
  });

  it("hides customerNumber when it equals customer.id (DTO fallback)", () => {
    const wrapper = mountRow({
      ...BASE_CUSTOMER,
      customerNumber: BASE_CUSTOMER.id,
    });
    expect(readMetaText(wrapper)).toBe("—");
  });

  it("hides empty/whitespace customerNumber with `—`", () => {
    const wrapper = mountRow({
      ...BASE_CUSTOMER,
      customerNumber: "   ",
    });
    expect(readMetaText(wrapper)).toBe("—");
  });
});
