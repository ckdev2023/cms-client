import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import CustomerTableRow from "./CustomerTableRow.vue";
import type { CustomerSummary } from "../types";

/**
 * BUG-146（BUG-089 R4 闭环回退）：customers 列表 owner 列全空。
 *
 * server 修复后 `customer.owner.name` 会带回 `users.name`（如 `Local Admin`），
 * 即便不在静态 fixture catalog 内，第六列必须直接渲染 server 提供的姓名。
 */

const BASE_CUSTOMER: CustomerSummary = {
  id: "cust-bug-146",
  displayName: "R6试探客户",
  legalName: "R6試探客戶",
  furigana: "アールロクシタンキャク",
  customerNumber: "CUS-202604-0001",
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

function mountRow(owner: CustomerSummary["owner"]) {
  return mount(CustomerTableRow, {
    props: { customer: { ...BASE_CUSTOMER, owner } },
    global: { plugins: [i18n] },
  });
}

function readOwnerCellText(wrapper: ReturnType<typeof mountRow>): string {
  const cells = wrapper.findAll("td");
  expect(cells.length).toBeGreaterThanOrEqual(6);
  return cells[5].text().trim();
}

describe("CustomerTableRow — BUG-146 owner column wiring", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  afterEach(() => {
    setAppLocale(originalLocale);
  });

  it("renders backend owner name when user is outside static catalog (Local Admin)", () => {
    const wrapper = mountRow({ initials: "LA", name: "Local Admin" });
    expect(readOwnerCellText(wrapper)).toContain("Local Admin");
  });

  it("renders backend owner name in en-US locale without catalog match", async () => {
    const wrapper = mountRow({ initials: "LA", name: "Local Admin" });
    setAppLocale("en-US");
    await wrapper.vm.$nextTick();
    expect(readOwnerCellText(wrapper)).toContain("Local Admin");
  });

  it("still localizes catalog owners (suzuki → 铃木) when name matches a catalog id", () => {
    const wrapper = mountRow({ initials: "S", name: "suzuki" });
    expect(readOwnerCellText(wrapper)).toContain("铃木");
  });

  it("uses backend initials when not provided by catalog match", () => {
    const wrapper = mountRow({ initials: "LA", name: "Local Admin" });
    expect(readOwnerCellText(wrapper)).toContain("LA");
  });
});
