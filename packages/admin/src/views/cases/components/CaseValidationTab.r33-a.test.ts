import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n, type I18n } from "vue-i18n";
import CaseValidationTab from "./CaseValidationTab.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail, GateItem, ValidationData } from "../types-detail";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

type Locale = "zh-CN" | "en-US" | "ja-JP";

function makeI18n(locale: Locale): I18n {
  return createI18n({
    legacy: false,
    locale,
    messages: FULL_MESSAGES,
  });
}

function buildValidation(): ValidationData {
  const blockingItem: GateItem = {
    gate: "A",
    title: "",
    titleKey: "cases.validation.blockingSummary",
    titleParams: { count: 1 },
    noteKey: "cases.validation.refReport",
  };
  const warningItem: GateItem = {
    gate: "B",
    title: "",
    titleKey: "cases.validation.warningSummary",
    titleParams: { count: 2 },
    noteKey: "cases.validation.refReport",
  };
  return {
    lastTime: "2026/04/20 10:00",
    blocking: [blockingItem],
    warnings: [warningItem],
    info: [],
    retriggerNote: "cases.validation.lastFailed",
  };
}

function buildDetail(): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    validation: buildValidation(),
    submissionPackages: [],
    correctionPackage: null,
  };
}

function mountTab(locale: Locale) {
  return mount(CaseValidationTab, {
    props: {
      detail: buildDetail(),
      readonly: false,
      rerunLoading: false,
      rerunError: null,
    },
    global: {
      plugins: [makeI18n(locale)],
      stubs: {
        Card: {
          template:
            "<section><header><slot name='header' /></header><slot /><footer><slot name='footer' /></footer></section>",
        },
        Button: {
          template: '<button :disabled="disabled"><slot /></button>',
          props: ["disabled", "ariaBusy", "variant", "tone", "size", "title"],
        },
        Chip: {
          template: "<span class='chip'><slot /></span>",
          props: ["tone", "size"],
        },
        CaseValidationSupport: { template: "<div />" },
      },
    },
  });
}

describe("R33-A: no Japanese hardcode or raw i18n key leaks in CaseValidationTab", () => {
  const JP_HARDCODE_PATTERN = /件の阻断項目/;
  const RAW_KEY_PATTERN = /cases\.\w+\.\w+/;

  describe("zh-CN locale", () => {
    it("renders translated blocking summary", () => {
      const html = mountTab("zh-CN").html();
      expect(html).toContain("1 项阻断未处理");
    });

    it("renders translated warning summary", () => {
      const html = mountTab("zh-CN").html();
      expect(html).toContain("2 项警告未处理");
    });

    it("does not contain Japanese hardcode", () => {
      const html = mountTab("zh-CN").html();
      expect(html).not.toMatch(JP_HARDCODE_PATTERN);
    });

    it("does not leak raw i18n keys", () => {
      const html = mountTab("zh-CN").html();
      expect(html).not.toMatch(RAW_KEY_PATTERN);
    });
  });

  describe("en-US locale", () => {
    it("renders translated blocking summary", () => {
      const html = mountTab("en-US").html();
      expect(html).toContain("1 blocking items");
    });

    it("renders translated warning summary", () => {
      const html = mountTab("en-US").html();
      expect(html).toContain("2 warning items");
    });

    it("does not contain Japanese hardcode", () => {
      const html = mountTab("en-US").html();
      expect(html).not.toMatch(JP_HARDCODE_PATTERN);
    });

    it("does not leak raw i18n keys", () => {
      const html = mountTab("en-US").html();
      expect(html).not.toMatch(RAW_KEY_PATTERN);
    });
  });

  describe("ja-JP locale", () => {
    it("renders translated blocking summary", () => {
      const html = mountTab("ja-JP").html();
      expect(html).toContain("1 件の阻断項目");
    });

    it("renders translated warning summary", () => {
      const html = mountTab("ja-JP").html();
      expect(html).toContain("2 件の警告項目");
    });

    it("does not leak raw i18n keys", () => {
      const html = mountTab("ja-JP").html();
      expect(html).not.toMatch(RAW_KEY_PATTERN);
    });
  });

  describe("retriggerNote rendering", () => {
    it("zh-CN renders translated retrigger message", () => {
      const html = mountTab("zh-CN").html();
      expect(html).toContain("上次检查有未通过项");
    });

    it("en-US renders translated retrigger message", () => {
      const html = mountTab("en-US").html();
      expect(html).toContain("Blocking items were found");
    });

    it("ja-JP renders translated retrigger message", () => {
      const html = mountTab("ja-JP").html();
      expect(html).toContain("前回の検証で不合格項目");
    });
  });

  describe("noteKey rendering", () => {
    it("zh-CN renders translated refReport note", () => {
      const html = mountTab("zh-CN").html();
      expect(html).toContain("详细请参阅检查报告");
    });

    it("en-US renders translated refReport note", () => {
      const html = mountTab("en-US").html();
      expect(html).toContain("See the validation report for details");
    });

    it("ja-JP renders translated refReport note", () => {
      const html = mountTab("ja-JP").html();
      expect(html).toContain("詳細は検証レポートを参照");
    });
  });
});
