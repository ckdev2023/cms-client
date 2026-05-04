import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseValidationTab from "./CaseValidationTab.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail } from "../types-detail";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

function makeI18n() {
  return createI18n({
    legacy: false,
    locale: "zh-CN",
    messages: FULL_MESSAGES,
  });
}

function buildDetail(overrides: Partial<CaseDetail> = {}): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    validation: {
      lastTime: "2026/04/06 15:30",
      blocking: [],
      warnings: [],
      info: [],
    },
    submissionPackages: [],
    correctionPackage: null,
    ...overrides,
  };
}

function mountTab(props: {
  readonly?: boolean;
  rerunLoading?: boolean;
  rerunError?: string | null;
}) {
  return mount(CaseValidationTab, {
    props: {
      detail: buildDetail(),
      readonly: props.readonly ?? false,
      rerunLoading: props.rerunLoading ?? false,
      rerunError: props.rerunError ?? null,
    },
    global: {
      plugins: [makeI18n()],
      stubs: {
        Card: {
          template:
            "<section><header><slot name='header' /></header><slot /><footer><slot name='footer' /></footer></section>",
        },
        Button: {
          template:
            '<button :disabled="disabled" :aria-busy="ariaBusy" @click="$emit(\'click\')"><slot /></button>',
          props: ["disabled", "ariaBusy", "variant", "tone", "size", "title"],
          emits: ["click"],
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

describe("R32-C: CaseValidationTab rerun button wiring", () => {
  it("rerun button is enabled when not loading and not readonly", () => {
    const wrapper = mountTab({ rerunLoading: false });
    const buttons = wrapper.findAll("button");
    const recheckBtn = buttons.find((b) => b.text().includes("重新检查"));

    expect(recheckBtn).toBeDefined();
    expect(recheckBtn!.attributes("disabled")).toBeUndefined();
  });

  it("rerun button is disabled during loading", () => {
    const wrapper = mountTab({ rerunLoading: true });
    const buttons = wrapper.findAll("button");
    const recheckBtn = buttons.find((b) => b.text().includes("重新检查"));

    expect(recheckBtn).toBeDefined();
    expect(recheckBtn!.attributes("disabled")).toBeDefined();
    expect(recheckBtn!.attributes("aria-busy")).toBe("true");
  });

  it("rerun button is not rendered in readonly mode", () => {
    const wrapper = mountTab({ readonly: true });
    const buttons = wrapper.findAll("button");
    const recheckBtn = buttons.find((b) => b.text().includes("重新检查"));

    expect(recheckBtn).toBeUndefined();
  });

  it("clicking rerun button emits rerun-validation", async () => {
    const wrapper = mountTab({ rerunLoading: false });
    const buttons = wrapper.findAll("button");
    const recheckBtn = buttons.find((b) => b.text().includes("重新检查"));

    expect(recheckBtn).toBeDefined();
    await recheckBtn!.trigger("click");

    expect(wrapper.emitted("rerun-validation")).toHaveLength(1);
  });

  it("no comingSoon title attribute on rerun button", () => {
    const wrapper = mountTab({ rerunLoading: false });
    const buttons = wrapper.findAll("button");
    const recheckBtn = buttons.find((b) => b.text().includes("重新检查"));

    expect(recheckBtn).toBeDefined();
    expect(recheckBtn!.attributes("title")).toBeUndefined();
  });
});
