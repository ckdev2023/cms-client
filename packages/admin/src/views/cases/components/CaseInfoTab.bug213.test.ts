import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseInfoTab from "./CaseInfoTab.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail } from "../types-detail";

type Locale = "zh-CN" | "ja-JP" | "en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

function buildDetail(overrides: Partial<CaseDetail> = {}): CaseDetail {
  return { ...CASE_DETAIL_SAMPLES.work, ...overrides };
}

function mountTab(detail: CaseDetail, locale: Locale = "zh-CN") {
  return mount(CaseInfoTab, {
    props: { detail, readonly: false },
    global: {
      plugins: [makeI18n(locale)],
      stubs: {
        Card: {
          template: '<section><slot name="header" /><slot /></section>',
          props: ["title", "padding"],
        },
      },
    },
  });
}

describe("CaseInfoTab BUG-213 — case ID / type / application type i18n", () => {
  describe("case ID prefers caseNo over raw UUID", () => {
    it("displays caseNo when available", () => {
      const w = mountTab(
        buildDetail({ id: "a1b2c3d4-uuid", caseNo: "CASE-202604-0018" }),
      );
      const html = w.html();
      expect(html).toContain("CASE-202604-0018");
      expect(html).not.toContain("a1b2c3d4-uuid");
    });

    it("falls back to id when caseNo is absent", () => {
      const detail = buildDetail({ id: "fallback-id" });
      delete (detail as Partial<CaseDetail>).caseNo;
      const w = mountTab(detail);
      expect(w.html()).toContain("fallback-id");
    });
  });

  describe("caseType is translated, not raw enum", () => {
    const RAW_ENUM = "biz_mgmt_cert_4m";

    for (const locale of ["zh-CN", "ja-JP", "en-US"] as const) {
      it(`${locale}: raw enum "${RAW_ENUM}" does not appear as text`, () => {
        const w = mountTab(buildDetail({ caseType: RAW_ENUM }), locale);
        expect(w.html()).not.toContain(RAW_ENUM);
      });

      it(`${locale}: translated label is rendered`, () => {
        const w = mountTab(buildDetail({ caseType: RAW_ENUM }), locale);
        const expected =
          FULL_MESSAGES[locale].cases.constants.caseTypes[RAW_ENUM];
        expect(w.html()).toContain(expected);
      });
    }

    it("unknown caseType falls back to raw value gracefully", () => {
      const w = mountTab(buildDetail({ caseType: "unknown_type_xyz" }));
      expect(w.html()).toContain("unknown_type_xyz");
    });
  });

  describe("applicationType is translated, not raw enum", () => {
    const RAW_ENUM = "certification";

    for (const locale of ["zh-CN", "ja-JP", "en-US"] as const) {
      it(`${locale}: raw enum "${RAW_ENUM}" does not appear as text`, () => {
        const w = mountTab(buildDetail({ applicationType: RAW_ENUM }), locale);
        expect(w.html()).not.toContain(RAW_ENUM);
      });

      it(`${locale}: translated label is rendered`, () => {
        const w = mountTab(buildDetail({ applicationType: RAW_ENUM }), locale);
        const expected =
          FULL_MESSAGES[locale].cases.constants.applicationTypes[RAW_ENUM];
        expect(w.html()).toContain(expected);
      });
    }

    it("unknown applicationType falls back to raw value gracefully", () => {
      const w = mountTab(buildDetail({ applicationType: "unknown_app_type" }));
      expect(w.html()).toContain("unknown_app_type");
    });
  });

  describe("empty values show dash placeholder", () => {
    it("empty caseType shows dash", () => {
      const w = mountTab(buildDetail({ caseType: "" }));
      const fields = w.findAll(".info-tab__value");
      const caseTypeField = fields[1];
      expect(caseTypeField.text()).toBe("—");
    });

    it("empty applicationType shows dash", () => {
      const w = mountTab(buildDetail({ applicationType: "" }));
      const fields = w.findAll(".info-tab__value");
      const appTypeField = fields[2];
      expect(appTypeField.text()).toBe("—");
    });
  });
});
