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

function makeI18n(locale: string, messages: Record<string, unknown>) {
  return createI18n({
    legacy: false,
    locale,
    messages: { [locale]: { cases: messages } },
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
  "已生成文书",
  "导出",
  "版本历史",
  "暂无可用文书模板或生成记录",
];

describe("BUG-214 CaseFormsTab i18n", () => {
  it("zh-CN renders expected i18n text, not raw keys", () => {
    const w = mountTab("zh-CN", casesZhCN);
    const text = w.text();
    expect(text).toContain("文书管理");
    expect(text).toContain("生成文书");
    expect(text).not.toContain("cases.detail.forms.title");
  });

  it("ja-JP does not leak Chinese-only hardcoded text", () => {
    const w = mountTab("ja-JP", casesJaJP);
    const text = w.text();
    for (const zh of HARDCODED_ZH_ONLY) {
      expect(text).not.toContain(zh);
    }
    expect(text).toContain("文書管理");
    expect(text).toContain("文書を生成");
  });

  it("en-US does not leak Chinese or Japanese hardcoded text", () => {
    const w = mountTab("en-US", casesEnUS);
    const text = w.text();
    for (const zh of HARDCODED_ZH_ONLY) {
      expect(text).not.toContain(zh);
    }
    expect(text).toContain("Document Management");
    expect(text).toContain("Generate Document");
  });

  it("generate button emits open-generate-modal on click", async () => {
    const w = mountTab();
    const buttons = w.findAll("button");
    const genBtn = buttons.find((b) => b.text().includes("生成文书"));
    expect(genBtn).toBeTruthy();
    await genBtn!.trigger("click");
    expect(w.emitted("open-generate-modal")).toBeTruthy();
  });

  it("generate button is hidden in readonly mode", () => {
    const w = mountTab("zh-CN", casesZhCN, true);
    const buttons = w.findAll("button");
    const genBtn = buttons.find((b) => b.text().includes("生成文书"));
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
        expected: "暂无可用文书模板或生成记录",
      },
      {
        locale: "ja-JP",
        messages: casesJaJP,
        expected: "利用可能なテンプレートまたは生成記録がありません",
      },
      {
        locale: "en-US",
        messages: casesEnUS,
        expected: "No templates or generated documents available",
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
