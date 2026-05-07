import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale } from "../../../i18n";
import LeadConvertedRecords from "./LeadConvertedRecords.vue";
import type { LeadConversionInfo } from "../types";

function mountRecords(conversion: LeadConversionInfo) {
  return mount(LeadConvertedRecords, {
    global: { plugins: [i18n] },
    props: { conversion },
  });
}

describe("LeadConvertedRecords", () => {
  setAppLocale("zh-CN");

  it("renders customerNo in meta when present (B-2)", () => {
    const conversion: LeadConversionInfo = {
      dedupResult: null,
      convertedCustomer: {
        id: "CUS-1",
        customerNo: "CUS-202605-0001",
        name: "田中 花子",
        group: "Tokyo-1",
        convertedAt: "2026-05-01T10:00:00Z",
        convertedBy: "Admin",
      },
      convertedCase: null,
      conversions: [],
    };

    const wrapper = mountRecords(conversion);
    const meta = wrapper.find(".converted-record__meta").text();

    expect(meta).toContain("CUS-202605-0001");
    expect(meta).not.toContain("CUS-1");
  });

  it("falls back to id when customerNo is empty (B-2)", () => {
    const conversion: LeadConversionInfo = {
      dedupResult: null,
      convertedCustomer: {
        id: "CUS-1",
        customerNo: "",
        name: "佐藤",
        group: "",
        convertedAt: "2026-05-01",
        convertedBy: "Admin",
      },
      convertedCase: null,
      conversions: [],
    };

    const wrapper = mountRecords(conversion);
    const meta = wrapper.find(".converted-record__meta").text();

    expect(meta).toContain("CUS-1");
  });

  it("renders convertedAt with formatDateTime (B-2)", () => {
    const conversion: LeadConversionInfo = {
      dedupResult: null,
      convertedCustomer: {
        id: "CUS-1",
        customerNo: "CUS-202605-0001",
        name: "田中 花子",
        group: "Tokyo-1",
        convertedAt: "2026-05-01T10:00:00Z",
        convertedBy: "Admin",
      },
      convertedCase: null,
      conversions: [],
    };

    const wrapper = mountRecords(conversion);
    const meta = wrapper.find(".converted-record__meta").text();

    expect(meta).toContain("2026");
    expect(meta).not.toBe("");
  });
});
