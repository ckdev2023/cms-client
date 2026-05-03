import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseDeadlinesTab from "./CaseDeadlinesTab.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail } from "../types-detail";

import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

type Locale = "zh-CN" | "ja-JP" | "en-US";

function makeI18n(locale: Locale) {
  return createI18n({
    legacy: false,
    locale,
    messages: {
      "zh-CN": { cases: casesZhCN },
      "ja-JP": { cases: casesJaJP },
      "en-US": { cases: casesEnUS },
    },
  });
}

const STUBS = {
  Card: {
    template:
      '<section><header><slot name="header" /></header><slot /><footer><slot name="footer" /></footer></section>',
  },
  Button: {
    template: '<button v-bind="$attrs"><slot /></button>',
    inheritAttrs: true,
  },
  CaseCloseoutChecklist: { template: "<div />" },
};

function buildDetail(overrides: Partial<CaseDetail> = {}): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    residencePeriod: {
      residenceStatus: "技術・人文知識・国際業務",
      periodLabel: "1年",
      startDate: "2025-04-01",
      endDate: "2026-03-31",
      statusLabel: "有効",
      tone: "success" as const,
      cardNumber: "AB12345678CD",
      entryDate: "2025-04-15",
      recordMeta: "Updated 2025-04-20",
    },
    reminderSchedule: {
      statusLabel: "リマインダー設定済み",
      tone: "primary" as const,
      reminderDate: "2026-03-31",
      reminders: [{ severity: "warning", label: "90日前", date: "2025-12-31" }],
      recordMeta: "Auto-generated",
    },
    deadlines: [],
    ...overrides,
  };
}

function mountTab(locale: Locale, detail?: CaseDetail) {
  return mount(CaseDeadlinesTab, {
    props: { detail: detail ?? buildDetail(), readonly: false },
    global: {
      plugins: [makeI18n(locale)],
      stubs: STUBS,
    },
  });
}

describe("CaseDeadlinesTab i18n (BUG-215)", () => {
  const LOCALES: Locale[] = ["zh-CN", "ja-JP", "en-US"];

  it.each(LOCALES)(
    "title does not display raw Chinese text in %s",
    (locale) => {
      const wrapper = mountTab(locale);
      const title = wrapper.find(".deadlines-tab__title");
      if (locale !== "zh-CN") {
        expect(title.text()).not.toBe("关键期限");
      }
      expect(title.text()).toBeTruthy();
    },
  );

  it.each(LOCALES)(
    "add button does not display raw Chinese text in %s",
    (locale) => {
      const wrapper = mountTab(locale);
      const buttons = wrapper.findAll("button");
      const addBtn = buttons.find((b) => b.text().trim().length > 0);
      if (locale !== "zh-CN" && addBtn) {
        expect(addBtn.text()).not.toContain("添加期限");
      }
    },
  );

  it.each(LOCALES)(
    "card label does not display raw Japanese text in %s when locale is not ja",
    (locale) => {
      const wrapper = mountTab(locale);
      const html = wrapper.html();
      if (locale === "en-US") {
        expect(html).toContain("Card:");
        expect(html).toContain("Entry date:");
      }
    },
  );

  it.each(LOCALES)(
    "residence period placeholder does not display raw Chinese in %s",
    (locale) => {
      const detail = buildDetail({ residencePeriod: undefined });
      const wrapper = mountTab(locale, detail);
      const placeholder = wrapper.find(".deadlines-tab__summary-placeholder");
      if (locale !== "zh-CN") {
        expect(placeholder.text()).not.toBe("尚未录入在留期间");
      }
      expect(placeholder.text()).toBeTruthy();
    },
  );

  it.each(LOCALES)(
    "reminder schedule placeholder does not display raw Chinese in %s",
    (locale) => {
      const detail = buildDetail({ reminderSchedule: undefined });
      const wrapper = mountTab(locale, detail);
      const placeholders = wrapper.findAll(
        ".deadlines-tab__summary-placeholder",
      );
      const reminderPlaceholder = placeholders[placeholders.length - 1];
      if (locale !== "zh-CN" && reminderPlaceholder) {
        expect(reminderPlaceholder.text()).not.toBe("尚未设置续签提醒");
      }
      if (reminderPlaceholder) {
        expect(reminderPlaceholder.text()).toBeTruthy();
      }
    },
  );

  it.each(LOCALES)(
    "reminder setting label does not display raw Chinese in %s",
    (locale) => {
      const wrapper = mountTab(locale);
      const html = wrapper.html();
      if (locale !== "zh-CN") {
        expect(html).not.toContain("到期前提醒设定");
      }
    },
  );

  it("emits open-create-deadline when add button clicked", async () => {
    const wrapper = mountTab("zh-CN");
    const buttons = wrapper.findAll("button");
    const addBtn = buttons.find((b) =>
      b.text().includes(casesZhCN.deadlines.summary.addDeadline),
    );
    expect(addBtn).toBeTruthy();
    await addBtn!.trigger("click");
    expect(wrapper.emitted("open-create-deadline")).toHaveLength(1);
  });

  it("hides add button when readonly", () => {
    const wrapper = mount(CaseDeadlinesTab, {
      props: { detail: buildDetail(), readonly: true },
      global: {
        plugins: [makeI18n("zh-CN")],
        stubs: STUBS,
      },
    });
    const buttons = wrapper.findAll("button");
    const addBtn = buttons.find((b) =>
      b.text().includes(casesZhCN.deadlines.summary.addDeadline),
    );
    expect(addBtn).toBeUndefined();
  });
});
