import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale } from "../../../i18n";
import LeadConversionTab from "./LeadConversionTab.vue";
import type { LeadConversionInfo, HeaderButtonStates } from "../types";
import { HEADER_BUTTON_PRESETS } from "../types";

const EMPTY_CONVERSION: LeadConversionInfo = {
  dedupResult: null,
  convertedCustomer: null,
  convertedCase: null,
  conversions: [],
};

function mountTab(
  conversion: LeadConversionInfo,
  buttonStates: HeaderButtonStates = HEADER_BUTTON_PRESETS.normal,
  readonly = false,
) {
  return mount(LeadConversionTab, {
    global: { plugins: [i18n] },
    props: { conversion, buttonStates, readonly },
  });
}

describe("LeadConversionTab", () => {
  setAppLocale("zh-CN");

  it("shows action cards when no conversion exists and not readonly", () => {
    const wrapper = mountTab(EMPTY_CONVERSION);

    expect(wrapper.find(".conversion-tab__actions").exists()).toBe(true);
    expect(
      wrapper.findComponent({ name: "LeadConvertedRecords" }).exists(),
    ).toBe(false);
  });

  it("convertedCase hides action cards and renders LeadConvertedRecords", () => {
    const conversion: LeadConversionInfo = {
      dedupResult: null,
      convertedCustomer: {
        id: "CUS-1",
        customerNo: "CUS-202605-0001",
        name: "田中 花子",
        group: "Tokyo-1",
        convertedAt: "2026-05-01",
        convertedBy: "Admin",
      },
      convertedCase: {
        id: "CAS-1",
        title: "CASE-202605-0001",
        type: "dependent_visa",
        group: "Tokyo-1",
        convertedAt: "2026-05-02",
        convertedBy: "Admin",
      },
      conversions: [],
    };

    const wrapper = mountTab(conversion, HEADER_BUTTON_PRESETS.convertedCase);

    expect(wrapper.find(".conversion-tab__actions").exists()).toBe(false);
    expect(
      wrapper.findComponent({ name: "LeadConvertedRecords" }).exists(),
    ).toBe(true);
  });

  it("convertedCustomer only — shows records but hides action cards", () => {
    const conversion: LeadConversionInfo = {
      dedupResult: null,
      convertedCustomer: {
        id: "CUS-2",
        customerNo: "",
        name: "佐藤",
        group: "",
        convertedAt: "2026-05-01",
        convertedBy: "Admin",
      },
      convertedCase: null,
      conversions: [],
    };

    const wrapper = mountTab(
      conversion,
      HEADER_BUTTON_PRESETS.convertedCustomer,
    );

    expect(wrapper.find(".conversion-tab__actions").exists()).toBe(false);
    expect(
      wrapper.findComponent({ name: "LeadConvertedRecords" }).exists(),
    ).toBe(true);
  });
});
