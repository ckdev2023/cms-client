import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseOverviewSidebar from "./CaseOverviewSidebar.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";

const i18n = createI18n({
  legacy: false,
  locale: "zh-CN",
  messages: { "zh-CN": { cases: casesZhCN } },
});

describe("CaseOverviewSidebar — 终态下提交前校验 CTA", () => {
  it("非终态：校验按钮可点", () => {
    const w = mount(CaseOverviewSidebar, {
      props: { detail: CASE_DETAIL_SAMPLES.work, isTerminal: false },
      global: {
        plugins: [i18n],
        stubs: {
          Card: { template: "<section><slot /></section>" },
          Button: {
            props: ["disabled", "title"],
            template:
              '<button :disabled="disabled" :title="title"><slot /></button>',
          },
        },
      },
    });
    const btn = w.find(".overview-sidebar__validation-hint-btn");
    expect(btn.attributes("disabled")).toBeUndefined();
  });

  it("终态：校验按钮禁用且带说明 title", () => {
    const w = mount(CaseOverviewSidebar, {
      props: { detail: CASE_DETAIL_SAMPLES.work, isTerminal: true },
      global: {
        plugins: [i18n],
        stubs: {
          Card: { template: "<section><slot /></section>" },
          Button: {
            props: ["disabled", "title"],
            template:
              '<button :disabled="disabled" :title="title"><slot /></button>',
          },
        },
      },
    });
    const btn = w.find(".overview-sidebar__validation-hint-btn");
    expect(btn.attributes("disabled")).toBeDefined();
    expect(btn.attributes("title")).toContain("结案");
  });
});
