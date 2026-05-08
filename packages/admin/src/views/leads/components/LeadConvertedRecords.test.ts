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

  it("rendersGroupLabelForCustomer — resolves catalog slug to localized label (R-FLOW5-A-8)", () => {
    const conversion: LeadConversionInfo = {
      dedupResult: null,
      convertedCustomer: {
        id: "CUS-1",
        customerNo: "CUS-202605-0013",
        name: "R-FLOW-04 鈴木次郎",
        group: "tokyo-1",
        convertedAt: "2026-05-07T20:37:00Z",
        convertedBy: "Admin",
      },
      convertedCase: null,
      conversions: [],
    };

    const wrapper = mountRecords(conversion);
    const meta = wrapper.find(".converted-record__meta").text();

    expect(meta).toContain("东京一组");
    expect(meta).not.toMatch(/CUS-202605-0013\s*·\s*·/);
  });

  it("rendersCaseNoForCase — case meta shows caseNo · group · formatted convertedAt (R-FLOW5-A-8)", () => {
    const conversion: LeadConversionInfo = {
      dedupResult: null,
      convertedCustomer: null,
      convertedCase: {
        id: "11a18544-56bd-4f74-95d6-fc135bad5b46",
        title: "CASE-202605-0009",
        caseNo: "CASE-202605-0009",
        type: "dependent_visa",
        group: "tokyo-1",
        convertedAt: "2026-05-07T20:37:00Z",
        convertedBy: "Admin",
      },
      conversions: [],
    };

    const wrapper = mountRecords(conversion);
    const metas = wrapper.findAll(".converted-record__meta");
    expect(metas.length).toBeGreaterThan(0);
    const caseMeta = metas[metas.length - 1].text();

    expect(caseMeta).toContain("CASE-202605-0009");
    expect(caseMeta).toContain("东京一组");
    expect(caseMeta).toContain("2026");
    expect(caseMeta).not.toContain("11a18544-56bd-4f74");
  });

  it("falls back to case id when title is empty (R-FLOW5-A-8)", () => {
    const conversion: LeadConversionInfo = {
      dedupResult: null,
      convertedCustomer: null,
      convertedCase: {
        id: "11a18544-56bd-4f74-95d6-fc135bad5b46",
        title: "",
        type: "dependent_visa",
        group: "tokyo-1",
        convertedAt: "2026-05-07T20:37:00Z",
        convertedBy: "Admin",
      },
      conversions: [],
    };

    const wrapper = mountRecords(conversion);
    const caseMeta = wrapper.findAll(".converted-record__meta").pop()!.text();

    expect(caseMeta).toContain("11a18544-56bd-4f74");
  });

  it("NEW-V5-2: case card shows title in name row and caseNo in meta row (no duplicate)", () => {
    const conversion: LeadConversionInfo = {
      dedupResult: null,
      convertedCustomer: null,
      convertedCase: {
        id: "8d8279a8-fd8e-4f1f-b58e-7f6d4d3fa6dd",
        title: "R-FLOW-V5 走查申请人 · 家族滞在",
        caseNo: "CASE-202605-0011",
        type: "dependent_visa",
        group: "tokyo-1",
        convertedAt: "2026-05-08T17:22:00Z",
        convertedBy: "Admin",
      },
      conversions: [],
    };

    const wrapper = mountRecords(conversion);
    const caseName = wrapper.findAll(".converted-record__name").pop()!.text();
    const caseMeta = wrapper.findAll(".converted-record__meta").pop()!.text();

    expect(caseName).toContain("R-FLOW-V5 走查申请人 · 家族滞在");
    expect(caseName).not.toContain("CASE-202605-0011");
    expect(caseMeta).toContain("CASE-202605-0011");
    expect(caseMeta).not.toContain("R-FLOW-V5 走查申请人");
    expect(caseMeta).not.toContain("8d8279a8-fd8e-4f1f");
  });

  it("NEW-V5-2: case card uses buildFallbackName with typeLabel when title missing (NEW-V6-1 upgrade)", () => {
    const conversion: LeadConversionInfo = {
      dedupResult: null,
      convertedCustomer: null,
      convertedCase: {
        id: "8d8279a8-fd8e-4f1f-b58e-7f6d4d3fa6dd",
        title: "",
        caseNo: "CASE-202605-0011",
        type: "dependent_visa",
        group: "tokyo-1",
        convertedAt: "2026-05-08T17:22:00Z",
        convertedBy: "Admin",
      },
      conversions: [],
    };

    const wrapper = mountRecords(conversion);
    const caseName = wrapper.findAll(".converted-record__name").pop()!.text();

    expect(caseName).not.toContain("8d8279a8-fd8e-4f1f");
    expect(caseName).toBeTruthy();
  });

  it("NEW-V6-1: case card uses buildFallbackName when title is missing but applicantName + caseTypeCode present", () => {
    const conversion: LeadConversionInfo = {
      dedupResult: null,
      convertedCustomer: null,
      convertedCase: {
        id: "aaaa-bbbb-cccc",
        title: "CASE-202605-0020",
        caseNo: "CASE-202605-0020",
        applicantName: "R-FLOW-V6 走查申請人",
        type: "dependent_visa",
        group: "tokyo-1",
        convertedAt: "2026-05-08T18:00:00Z",
        convertedBy: "Admin",
      },
      conversions: [],
    };

    const wrapper = mountRecords(conversion);
    const caseName = wrapper.findAll(".converted-record__name").pop()!.text();

    expect(caseName).toContain("R-FLOW-V6 走查申請人");
    expect(caseName).not.toContain("CASE-202605-0020");
    expect(caseName).not.toContain("aaaa-bbbb-cccc");
  });

  it("NEW-V6-1: case card falls back to caseNo when both title and applicantName are missing", () => {
    const conversion: LeadConversionInfo = {
      dedupResult: null,
      convertedCustomer: null,
      convertedCase: {
        id: "aaaa-bbbb-cccc",
        title: "",
        caseNo: "CASE-202605-0021",
        type: "unknown_type_xxx",
        group: "tokyo-1",
        convertedAt: "2026-05-08T18:00:00Z",
        convertedBy: "Admin",
      },
      conversions: [],
    };

    const wrapper = mountRecords(conversion);
    const caseName = wrapper.findAll(".converted-record__name").pop()!.text();

    expect(caseName).toBe("CASE-202605-0021");
  });

  it("NEW-V6-1: case card falls back to id when title, applicantName, and caseNo are all missing", () => {
    const conversion: LeadConversionInfo = {
      dedupResult: null,
      convertedCustomer: null,
      convertedCase: {
        id: "aaaa-bbbb-cccc-dddd",
        title: "",
        caseNo: "",
        type: "",
        group: "",
        convertedAt: "2026-05-08T18:00:00Z",
        convertedBy: "Admin",
      },
      conversions: [],
    };

    const wrapper = mountRecords(conversion);
    const caseName = wrapper.findAll(".converted-record__name").pop()!.text();

    expect(caseName).toBe("aaaa-bbbb-cccc-dddd");
  });

  it("emits viewCustomer when customer button is clicked (P1-3)", async () => {
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
    const btn = wrapper
      .findAll("button")
      .find((b) =>
        b
          .text()
          .includes(i18n.global.t("leads.detail.conversionTab.viewCustomer")),
      );
    expect(btn).toBeTruthy();
    await btn!.trigger("click");
    expect(wrapper.emitted("viewCustomer")).toHaveLength(1);
  });

  it("emits viewCase when case button is clicked (P1-3)", async () => {
    const conversion: LeadConversionInfo = {
      dedupResult: null,
      convertedCustomer: null,
      convertedCase: {
        id: "CAS-1",
        title: "CASE-202605-0001",
        type: "dependent_visa",
        group: "Tokyo-1",
        convertedAt: "2026-05-02T10:00:00Z",
        convertedBy: "Admin",
      },
      conversions: [],
    };

    const wrapper = mountRecords(conversion);
    const btn = wrapper
      .findAll("button")
      .find((b) =>
        b.text().includes(i18n.global.t("leads.detail.conversionTab.viewCase")),
      );
    expect(btn).toBeTruthy();
    await btn!.trigger("click");
    expect(wrapper.emitted("viewCase")).toHaveLength(1);
  });
});
