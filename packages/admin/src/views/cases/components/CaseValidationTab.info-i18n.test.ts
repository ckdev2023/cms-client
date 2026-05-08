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

function buildInfoOnlyValidation(infoItems: GateItem[]): ValidationData {
  return {
    lastTime: "2026/05/01 09:00",
    blocking: [],
    warnings: [],
    info: infoItems,
  };
}

function buildDetail(infoItems: GateItem[]): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    validation: buildInfoOnlyValidation(infoItems),
    submissionPackages: [],
    correctionPackage: null,
  };
}

function mountTab(locale: Locale, infoItems: GateItem[]) {
  return mount(CaseValidationTab, {
    props: {
      detail: buildDetail(infoItems),
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

const RAW_KEY_PATTERN = /cases\.\w+\.\w+/;

const I18N_INFO_ITEM: GateItem = {
  gate: "C",
  title: "",
  titleKey: "cases.validation.checks.generated_documents_present.title",
  noteKey: "cases.validation.checks.generated_documents_present.message",
};

const LEGACY_INFO_ITEM: GateItem = {
  gate: "C",
  title: "申請理由書尚未完成",
  note: "不阻断提交，但建议在提交前完善",
};

describe("CaseValidationTab info branch i18n", () => {
  describe("i18n keyed info item — zh-CN", () => {
    it("renders translated title", () => {
      const html = mountTab("zh-CN", [I18N_INFO_ITEM]).html();
      expect(html).toContain("需要至少生成一份文书");
    });

    it("renders translated note", () => {
      const html = mountTab("zh-CN", [I18N_INFO_ITEM]).html();
      expect(html).toContain("提交前需要至少生成一份文书");
    });

    it("does not leak raw i18n keys", () => {
      const html = mountTab("zh-CN", [I18N_INFO_ITEM]).html();
      expect(html).not.toMatch(RAW_KEY_PATTERN);
    });
  });

  describe("i18n keyed info item — ja-JP", () => {
    it("renders translated title", () => {
      const html = mountTab("ja-JP", [I18N_INFO_ITEM]).html();
      expect(html).toContain("文書が1件以上必要");
    });

    it("renders translated note", () => {
      const html = mountTab("ja-JP", [I18N_INFO_ITEM]).html();
      expect(html).toContain("提出前に少なくとも1件の文書を生成してください");
    });

    it("does not leak raw i18n keys", () => {
      const html = mountTab("ja-JP", [I18N_INFO_ITEM]).html();
      expect(html).not.toMatch(RAW_KEY_PATTERN);
    });
  });

  describe("i18n keyed info item — en-US", () => {
    it("renders translated title", () => {
      const html = mountTab("en-US", [I18N_INFO_ITEM]).html();
      expect(html).toContain("At least one document required");
    });

    it("renders translated note", () => {
      const html = mountTab("en-US", [I18N_INFO_ITEM]).html();
      expect(html).toContain(
        "At least one generated document is required before submission",
      );
    });

    it("does not leak raw i18n keys", () => {
      const html = mountTab("en-US", [I18N_INFO_ITEM]).html();
      expect(html).not.toMatch(RAW_KEY_PATTERN);
    });
  });

  describe("legacy info item (title/note only, no keys) — no regression", () => {
    it("zh-CN renders plain title and note", () => {
      const html = mountTab("zh-CN", [LEGACY_INFO_ITEM]).html();
      expect(html).toContain("申請理由書尚未完成");
      expect(html).toContain("不阻断提交，但建议在提交前完善");
    });

    it("ja-JP renders plain title and note", () => {
      const html = mountTab("ja-JP", [LEGACY_INFO_ITEM]).html();
      expect(html).toContain("申請理由書尚未完成");
      expect(html).toContain("不阻断提交，但建议在提交前完善");
    });

    it("en-US renders plain title and note", () => {
      const html = mountTab("en-US", [LEGACY_INFO_ITEM]).html();
      expect(html).toContain("申請理由書尚未完成");
      expect(html).toContain("不阻断提交，但建议在提交前完善");
    });
  });
});
