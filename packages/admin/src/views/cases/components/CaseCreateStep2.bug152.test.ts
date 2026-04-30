// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-152 — i18n primary applicant role hint
//   Covers: CaseCreateStep2 selected primary customer card renders the
//   locale-appropriate label when `roleHint` carries the i18n key
//   `cases.create.step2.primaryRole` (not the JA literal "主申請人").
// Does NOT test: dropdown wiring (→ bug139 test), data adapter
//   (→ useCustomerDropdownData.test), source-context synthesis
//   (→ useCreateCaseModel.customer-defaults.test).
// ────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import CaseCreateStep2 from "./CaseCreateStep2.vue";
import type { CaseCreateCustomerOption } from "../types";

const PRIMARY_ROLE_KEY = "cases.create.step2.primaryRole";
const originalLocale = i18n.global.locale.value as AppLocale;

function buildCustomer(
  overrides: Partial<CaseCreateCustomerOption> = {},
): CaseCreateCustomerOption {
  return {
    id: "cust-bug-152",
    name: "鈴木一郎",
    kana: "スズキ イチロウ",
    group: "tokyo-1",
    groupLabel: "东京一组",
    roleHint: PRIMARY_ROLE_KEY,
    summary: "",
    contact: "suzuki@example.com",
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

function mountStep2(customer: CaseCreateCustomerOption) {
  const model = createModelStub(customer);
  return mount(CaseCreateStep2, {
    attachTo: document.body,
    props: {
      model: model as never,
      customerOptions: [customer],
      customersLoading: false,
      customersError: null,
      customersLoaded: true,
    },
    global: { plugins: [i18n] },
  });
}

describe("CaseCreateStep2 — BUG-152 i18n primary role rendering", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  afterEach(() => {
    document.body.innerHTML = "";
    setAppLocale(originalLocale);
  });

  it("renders zh-CN translation for primary role i18n key", () => {
    const wrapper = mountStep2(buildCustomer());
    const partyText = wrapper.find(".party").text();
    expect(partyText).toContain("主申请人");
    expect(partyText).not.toContain(PRIMARY_ROLE_KEY);
  });

  it("renders en-US translation when locale switches", async () => {
    const wrapper = mountStep2(buildCustomer());
    setAppLocale("en-US");
    await wrapper.vm.$nextTick();
    const partyText = wrapper.find(".party").text();
    expect(partyText).toContain("Primary applicant");
    expect(partyText).not.toContain(PRIMARY_ROLE_KEY);
  });

  it("renders ja-JP translation when locale switches", async () => {
    const wrapper = mountStep2(buildCustomer());
    setAppLocale("ja-JP");
    await wrapper.vm.$nextTick();
    const partyText = wrapper.find(".party").text();
    expect(partyText).toContain("主申請者");
    expect(partyText).not.toContain(PRIMARY_ROLE_KEY);
  });

  it("falls back to literal when roleHint is a free-form string (e.g. picker quick-create)", () => {
    const wrapper = mountStep2(buildCustomer({ roleHint: "扶养者" }));
    const partyText = wrapper.find(".party").text();
    expect(partyText).toContain("扶养者");
  });

  it("does not leak the JA literal when locale=zh-CN and roleHint is the i18n key", () => {
    const wrapper = mountStep2(buildCustomer());
    const partyText = wrapper.find(".party").text();
    expect(partyText).not.toContain("主申請人");
  });
});
