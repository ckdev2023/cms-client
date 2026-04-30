import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import {
  clearGroupAliases,
  registerGroupAliases,
} from "../../../shared/model/useGroupOptions";
import CaseCreateStep2 from "./CaseCreateStep2.vue";
import type { CaseCreateCustomerOption } from "../types";

/**
 * BUG-139 [P1][FE/data]：建案向导 Step2 主申请人下拉 + 选中卡片
 * 直显 group UUID，是 R11 BUG-136 修复对 case 链路的覆盖遗漏。
 *
 * 用例锁定：
 * - 下拉选项文本不得出现 36 字符 UUID（应通过别名表 + locale 翻译）。
 * - 选中卡片副本不得出现 UUID（应实时根据 raw `group` 重新解析）。
 * - 别名注册时机晚于选项注入也能触发再渲染（运行期 ref 反应性）。
 * - 切换 locale 时下拉与卡片同步切换语言。
 */

const SAMPLE_UUID = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";
const originalLocale = i18n.global.locale.value as AppLocale;

function buildCustomer(
  overrides: Partial<CaseCreateCustomerOption> = {},
): CaseCreateCustomerOption {
  return {
    id: "cust-bug-139",
    name: "R6试探客户",
    kana: "アール ロク",
    group: SAMPLE_UUID,
    groupLabel: SAMPLE_UUID,
    roleHint: "主申請人",
    summary: "",
    contact: "r6@example.com",
    bmvQuestionnaireStatus: null,
    bmvQuoteStatus: null,
    bmvSignStatus: null,
    bmvIntakeStatus: null,
    ...overrides,
  };
}

function createModelStub(primary: CaseCreateCustomerOption | null) {
  return {
    primaryCustomer: { value: primary },
    isFamilyBulkScenario: { value: false },
    familyApplicants: { value: [] },
    familySupporters: { value: [] },
    additionalParties: { value: [] },
    currentTemplate: { value: undefined },
    setPrimaryCustomer: vi.fn(),
    removeRelatedParty: vi.fn(),
  };
}

function mountStep2(
  customer: CaseCreateCustomerOption,
  options: { selected?: boolean } = {},
) {
  const model = createModelStub(options.selected === false ? null : customer);
  return mount(CaseCreateStep2, {
    attachTo: document.body,
    props: {
      model: model as never,
      customerOptions: [customer],
      customersLoading: false,
      customersError: null,
      customersLoaded: true,
    },
    global: {
      plugins: [i18n],
    },
  });
}

describe("CaseCreateStep2 — BUG-139 group UUID rendering", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
    clearGroupAliases();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    setAppLocale(originalLocale);
    clearGroupAliases();
  });

  it("hides raw UUID with `—` in dropdown when alias is missing", () => {
    const customer = buildCustomer({ groupLabel: "—" });
    const wrapper = mountStep2(customer, { selected: false });
    const optionTexts = wrapper.findAll("option").map((o) => o.text());
    for (const text of optionTexts) {
      expect(text).not.toContain(SAMPLE_UUID);
    }
  });

  it("renders localized catalog label in dropdown when alias maps UUID to catalog", async () => {
    registerGroupAliases([{ id: SAMPLE_UUID, name: "tokyo-1" }]);
    const customer = buildCustomer({ groupLabel: "东京一组" });
    const wrapper = mountStep2(customer, { selected: false });
    await wrapper.vm.$nextTick();
    const optionTexts = wrapper.findAll("option").map((o) => o.text());
    expect(optionTexts.some((t) => t.includes("东京一组"))).toBe(true);
    for (const text of optionTexts) {
      expect(text).not.toContain(SAMPLE_UUID);
    }
  });

  it("renders translated label on selected primary customer card", async () => {
    registerGroupAliases([{ id: SAMPLE_UUID, name: "tokyo-1" }]);
    const customer = buildCustomer({ groupLabel: "东京一组" });
    const wrapper = mountStep2(customer);
    await wrapper.vm.$nextTick();
    const partyText = wrapper.find(".party").text();
    expect(partyText).toContain("R6试探客户");
    expect(partyText).toContain("东京一组");
    expect(partyText).not.toContain(SAMPLE_UUID);
  });

  it("re-renders selected card when alias is registered after mount", async () => {
    const customer = buildCustomer();
    const wrapper = mountStep2(customer);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".party").text()).not.toContain(SAMPLE_UUID);
    expect(wrapper.find(".party").text()).toContain("—");

    registerGroupAliases([{ id: SAMPLE_UUID, name: "tokyo-1" }]);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".party").text()).toContain("东京一组");
  });

  it("respects locale switch on selected card after alias is registered", async () => {
    registerGroupAliases([{ id: SAMPLE_UUID, name: "tokyo-1" }]);
    const customer = buildCustomer();
    const wrapper = mountStep2(customer);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".party").text()).toContain("东京一组");

    setAppLocale("en-US");
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".party").text()).toContain("Tokyo Team 1");

    setAppLocale("ja-JP");
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".party").text()).toContain("東京一組");
  });
});
