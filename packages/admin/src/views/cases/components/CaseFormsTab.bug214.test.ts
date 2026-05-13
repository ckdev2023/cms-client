import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseFormsTab from "./CaseFormsTab.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

const CARD_STUB = {
  template:
    "<section><header><slot name='header' /></header><slot /><footer><slot name='footer' /></footer></section>",
};

const SHELL_TOPBAR_COMING_SOON: Record<string, string> = {
  "zh-CN": "建设中",
  "ja-JP": "準備中",
  "en-US": "Coming soon",
};

function makeI18n(locale: string, messages: Record<string, unknown>) {
  return createI18n({
    legacy: false,
    locale,
    messages: {
      [locale]: {
        cases: messages,
        shell: {
          topbar: { comingSoon: SHELL_TOPBAR_COMING_SOON[locale] ?? "" },
        },
      },
    },
  });
}

function mountTab(
  locale = "zh-CN",
  messages: Record<string, unknown> = casesZhCN,
  readonly = false,
) {
  return mount(CaseFormsTab, {
    props: { detail: CASE_DETAIL_SAMPLES.work, readonly },
    global: {
      plugins: [makeI18n(locale, messages)],
      stubs: {
        Card: CARD_STUB,
        Button: {
          template: "<button v-bind='$attrs'><slot /></button>",
          props: ["variant", "tone", "size", "pill", "disabled"],
        },
      },
    },
  });
}

const HARDCODED_ZH_ONLY = [
  "可用模板",
  "已登记文书",
  "版本历史",
  "暂无可用文书模板或登记记录",
];

describe("BUG-214 CaseFormsTab i18n", () => {
  it("zh-CN renders expected i18n text, not raw keys", () => {
    const w = mountTab("zh-CN", casesZhCN);
    const text = w.text();
    expect(text).toContain("文书管理");
    expect(text).toContain("登记文书");
    expect(text).not.toContain("cases.detail.forms.title");
  });

  it("ja-JP does not leak Chinese-only hardcoded text", () => {
    const w = mountTab("ja-JP", casesJaJP);
    const text = w.text();
    for (const zh of HARDCODED_ZH_ONLY) {
      expect(text).not.toContain(zh);
    }
    expect(text).toContain("文書管理");
    expect(text).toContain("文書を登録");
  });

  it("en-US does not leak Chinese or Japanese hardcoded text", () => {
    const w = mountTab("en-US", casesEnUS);
    const text = w.text();
    for (const zh of HARDCODED_ZH_ONLY) {
      expect(text).not.toContain(zh);
    }
    expect(text).toContain("Document Management");
    expect(text).toContain("Register Document");
  });

  it("template row emits open-generate-modal with selected template", async () => {
    const w = mountTab();
    const tpl = CASE_DETAIL_SAMPLES.work.forms.templates[0]!;
    const rowBtns = w.findAll("button").filter((b) => b.text() === "登记文书");
    expect(rowBtns.length).toBeGreaterThanOrEqual(2);
    const rowBtn = rowBtns[1];
    expect(rowBtn).toBeTruthy();
    await rowBtn!.trigger("click");
    const ev = w.emitted("open-generate-modal")!;
    expect(ev).toHaveLength(1);
    expect(ev[0]![0]).toEqual(tpl);
  });

  it("register button emits open-generate-modal on click", async () => {
    const w = mountTab();
    const buttons = w.findAll("button");
    const genBtn = buttons.find((b) => b.text().includes("登记文书"));
    expect(genBtn).toBeTruthy();
    await genBtn!.trigger("click");
    const ev = w.emitted("open-generate-modal")!;
    expect(ev).toHaveLength(1);
    expect(ev[0]).toEqual([]);
  });

  it("register button is hidden in readonly mode", () => {
    const w = mountTab("zh-CN", casesZhCN, true);
    const buttons = w.findAll("button");
    const genBtn = buttons.find((b) => b.text().includes("登记文书"));
    expect(genBtn).toBeUndefined();
  });

  it("empty state text uses i18n in all 3 locales", () => {
    const emptyDetail = {
      ...CASE_DETAIL_SAMPLES.work,
      forms: { templates: [], generated: [] },
    };

    const locales = [
      {
        locale: "zh-CN",
        messages: casesZhCN,
        expected: "暂无可用文书模板或登记记录",
      },
      {
        locale: "ja-JP",
        messages: casesJaJP,
        expected: "利用可能なテンプレートまたは登録記録がありません",
      },
      {
        locale: "en-US",
        messages: casesEnUS,
        expected: "No templates or registered documents available",
      },
    ];

    for (const { locale, messages, expected } of locales) {
      const w = mount(CaseFormsTab, {
        props: { detail: emptyDetail, readonly: false },
        global: {
          plugins: [makeI18n(locale, messages)],
          stubs: {
            Card: CARD_STUB,
            Button: { template: "<button><slot /></button>" },
          },
        },
      });
      expect(w.text()).toContain(expected);
    }
  });
});
