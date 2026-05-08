import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import {
  clearGroupAliases,
  registerGroupAliases,
} from "../../../shared/model/useGroupOptions";
import CustomerTableRow from "./CustomerTableRow.vue";
import type { CustomerSummary } from "../types";

/**
 * BUG-136 [P1][FE/data]：`CustomerListView` 「所属分组」列在真实 DB Group 下
 * 显示原始 UUID，因为 `useGroupOptions.ts` 静态 catalog 与 `/api/groups` 未对齐。
 *
 * 用例锁定：
 * - UUID 未注册别名 → 渲染占位符 `—`，不得直显 36-char UUID。
 * - UUID 注册到 catalog 内 slug（如 `tokyo-1`）→ 渲染 DB name 原文（R2-B-3）。
 * - UUID 注册到 catalog 外分组名（如 `MyCustomGroup`）→ 渲染服务端原名。
 *
 * R-CONSULT-02 R2-B-3 调整：原契约「alias UUID → catalog 三语本地化」已
 * 被废弃；现在 alias 路径以 `/api/groups` 返回的 `name` 为权威值。
 */

const SAMPLE_UUID = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";

const BASE_CUSTOMER: CustomerSummary = {
  id: "cust-bug-136",
  displayName: "R6试探客户",
  legalName: "R6試探客戶",
  furigana: "アールロクシタンキャク",
  customerNumber: "C-2026-0001",
  phone: "",
  email: "",
  totalCases: 0,
  activeCases: 0,
  lastContactDate: null,
  lastContactChannel: null,
  owner: { initials: "Lo", name: "Local Admin" },
  referralSource: "",
  group: SAMPLE_UUID,
  bmvProfile: null,
};

const originalLocale = i18n.global.locale.value as AppLocale;

function mountRow(group: string) {
  return mount(CustomerTableRow, {
    props: { customer: { ...BASE_CUSTOMER, group } },
    global: { plugins: [i18n] },
  });
}

function readGroupChipText(wrapper: ReturnType<typeof mountRow>): string {
  const chips = wrapper.findAll(".ui-chip");
  expect(chips.length).toBeGreaterThan(0);
  return chips[chips.length - 1].text();
}

describe("CustomerTableRow — BUG-136 group UUID rendering", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
    clearGroupAliases();
  });

  afterEach(() => {
    setAppLocale(originalLocale);
    clearGroupAliases();
  });

  it("hides raw UUID with `—` placeholder when no alias registered", () => {
    const wrapper = mountRow(SAMPLE_UUID);
    const chipText = readGroupChipText(wrapper);
    expect(chipText).not.toContain(SAMPLE_UUID);
    expect(chipText).toBe("—");
  });

  it("B-0: renders localized catalog label when alias maps UUID to catalog slug", async () => {
    registerGroupAliases([{ id: SAMPLE_UUID, name: "tokyo-1" }]);
    const wrapper = mountRow(SAMPLE_UUID);
    await wrapper.vm.$nextTick();
    expect(readGroupChipText(wrapper)).toBe("东京一组");
  });

  it("renders raw server-side name when alias points outside catalog", async () => {
    registerGroupAliases([{ id: SAMPLE_UUID, name: "MyCustomGroup" }]);
    const wrapper = mountRow(SAMPLE_UUID);
    await wrapper.vm.$nextTick();
    expect(readGroupChipText(wrapper)).toBe("MyCustomGroup");
  });

  it("re-renders to localized label after alias is registered post-mount (B-0)", async () => {
    const wrapper = mountRow(SAMPLE_UUID);
    expect(readGroupChipText(wrapper)).toBe("—");

    registerGroupAliases([{ id: SAMPLE_UUID, name: "tokyo-1" }]);
    await wrapper.vm.$nextTick();

    expect(readGroupChipText(wrapper)).toBe("东京一组");
  });

  it("B-0: alias-path display is locale-dependent when DB name matches catalog", async () => {
    registerGroupAliases([{ id: SAMPLE_UUID, name: "tokyo-1" }]);
    const wrapper = mountRow(SAMPLE_UUID);
    await wrapper.vm.$nextTick();
    expect(readGroupChipText(wrapper)).toBe("东京一组");

    setAppLocale("en-US");
    await wrapper.vm.$nextTick();
    expect(readGroupChipText(wrapper)).toBe("Tokyo Team 1");

    setAppLocale("ja-JP");
    await wrapper.vm.$nextTick();
    expect(readGroupChipText(wrapper)).toBe("東京一組");
  });

  it("keeps existing static catalog slug rendering localized (fixture path BC)", () => {
    const wrapper = mountRow("tokyo-1");
    expect(readGroupChipText(wrapper)).toBe("东京一组");
  });

  it("appends disabled suffix to localized label when alias points to a disabled catalog group (B-0)", async () => {
    registerGroupAliases([{ id: SAMPLE_UUID, name: "osaka" }]);
    const wrapper = mountRow(SAMPLE_UUID);
    await wrapper.vm.$nextTick();
    expect(readGroupChipText(wrapper)).toBe("大阪组（已停用）");
  });
});
