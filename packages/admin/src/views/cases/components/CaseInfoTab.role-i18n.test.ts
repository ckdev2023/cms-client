import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseInfoTab from "./CaseInfoTab.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail, RelatedParty } from "../types-detail";

type Locale = "zh-CN" | "ja-JP" | "en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

const ROLE_I18N_KEY = "cases.detail.info.relatedParties.rolePrimary";
const RAW_KEY_PATTERN = /cases\.\w+\.\w+/;

const EXPECTED_TRANSLATIONS: Record<Locale, string> = {
  "zh-CN": "主申请人",
  "ja-JP": "主申請者",
  "en-US": "Primary applicant",
};

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

function buildDetail(parties: RelatedParty[]): CaseDetail {
  return { ...CASE_DETAIL_SAMPLES.work, relatedParties: parties };
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

describe("CaseInfoTab role i18n — party.role renders translated text", () => {
  const i18nParty: RelatedParty = {
    initials: "KS",
    name: "金 秀明",
    role: ROLE_I18N_KEY,
    detail: "韩国籍 · 1990/03/15",
    avatarStyle: "gradient",
  };

  for (const locale of ["zh-CN", "ja-JP", "en-US"] as const) {
    it(`${locale}: renders translated role "${EXPECTED_TRANSLATIONS[locale]}"`, () => {
      const w = mountTab(buildDetail([i18nParty]), locale);
      const roleEl = w.find(".info-tab__party-role");
      expect(roleEl.text()).toBe(EXPECTED_TRANSLATIONS[locale]);
    });

    it(`${locale}: does not leak raw i18n key`, () => {
      const w = mountTab(buildDetail([i18nParty]), locale);
      const roleEl = w.find(".info-tab__party-role");
      expect(roleEl.text()).not.toMatch(RAW_KEY_PATTERN);
    });
  }
});

describe("CaseInfoTab role i18n — plain text role passes through", () => {
  const plainTextParty: RelatedParty = {
    initials: "YS",
    name: "吉田 誠",
    role: "扶養者",
    detail: "日本籍",
    avatarStyle: "gradient",
  };

  it("renders plain text role as-is when te() returns false", () => {
    const w = mountTab(buildDetail([plainTextParty]), "zh-CN");
    const roleEl = w.find(".info-tab__party-role");
    expect(roleEl.text()).toBe("扶養者");
  });

  it("does not attempt translation for non-key strings", () => {
    const w = mountTab(buildDetail([plainTextParty]), "ja-JP");
    const roleEl = w.find(".info-tab__party-role");
    expect(roleEl.text()).toBe("扶養者");
  });
});

describe("CaseInfoTab — risk level chip (list parity)", () => {
  it("shows mapped risk label from detail.riskLevel", () => {
    const detail = { ...CASE_DETAIL_SAMPLES.work };
    const w = mountTab(detail, "zh-CN");
    const chip = w.find(".info-tab__risk-chip");
    expect(chip.exists()).toBe(true);
    expect(chip.attributes("data-risk-status")).toBe("normal");
    expect(chip.text()).toBe("正常");
  });
});
