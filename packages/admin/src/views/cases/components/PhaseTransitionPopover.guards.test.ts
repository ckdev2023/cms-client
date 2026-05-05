import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import PhaseTransitionPopover from "./PhaseTransitionPopover.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

function makeI18n(locale: "zh-CN" | "ja-JP" | "en-US" = "zh-CN") {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

function mountPopover(
  props: Record<string, unknown> = {},
  locale: "zh-CN" | "ja-JP" | "en-US" = "zh-CN",
) {
  return mount(PhaseTransitionPopover, {
    props: {
      menuOpen: true,
      currentPhase: "SUCCESS",
      availableTargets: ["RESIDENCE_PERIOD_RECORDED"],
      submitting: false,
      errorMessage: null,
      ...props,
    },
    global: {
      plugins: [makeI18n(locale)],
      stubs: {
        Teleport: true,
        Button: {
          template:
            '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          props: ["variant", "tone", "size", "disabled"],
          emits: ["click"],
        },
      },
    },
  });
}

describe("PhaseTransitionPopover — transition guards disabled rendering", () => {
  const GUARD = {
    RESIDENCE_PERIOD_RECORDED: {
      key: "cases.detail.phaseMenu.guards.successCloseoutBlocked",
      params: { amount: "¥200,000" },
    },
  };

  it("renders guard hint text for disabled target", () => {
    const wrapper = mountPopover({ transitionGuards: GUARD });
    const hint = wrapper.find('[data-testid="phase-guard-hint"]');
    expect(hint.exists()).toBe(true);
    expect(hint.text()).toContain("¥200,000");
    expect(hint.text()).toContain("未收余款");
  });

  it("sets aria-disabled on guarded target", () => {
    const wrapper = mountPopover({ transitionGuards: GUARD });
    const item = wrapper.find('[data-testid="phase-target-item"]');
    expect(item.attributes("aria-disabled")).toBe("true");
  });

  it("applies disabled CSS class on guarded target", () => {
    const wrapper = mountPopover({ transitionGuards: GUARD });
    const item = wrapper.find('[data-testid="phase-target-item"]');
    expect(item.classes()).toContain("phase-popover__item--disabled");
  });

  it("disabled target is not selectable", async () => {
    const wrapper = mountPopover({ transitionGuards: GUARD });
    const item = wrapper.find('[data-testid="phase-target-item"]');
    await item.trigger("click");

    const submitBtn = wrapper.findAll("button").at(-1)!;
    await submitBtn.trigger("click");

    expect(wrapper.emitted("submit")).toBeFalsy();
  });

  it("no guard hint when no transitionGuards", () => {
    const wrapper = mountPopover({ transitionGuards: {} });
    expect(wrapper.find('[data-testid="phase-guard-hint"]').exists()).toBe(
      false,
    );
    const item = wrapper.find('[data-testid="phase-target-item"]');
    expect(item.classes()).not.toContain("phase-popover__item--disabled");
    expect(item.attributes("aria-disabled")).toBeUndefined();
  });

  it("selectable target without guard can be submitted", async () => {
    const wrapper = mountPopover({ transitionGuards: {} });
    const item = wrapper.find('[data-testid="phase-target-item"]');
    await item.trigger("click");

    const submitBtn = wrapper.findAll("button").at(-1)!;
    await submitBtn.trigger("click");

    expect(wrapper.emitted("submit")).toBeTruthy();
    const payload = wrapper.emitted("submit")![0][0] as Record<string, unknown>;
    expect(payload).toEqual({
      toPhase: "RESIDENCE_PERIOD_RECORDED",
      closeReason: undefined,
      resultOutcome: undefined,
    });
  });

  it("renders guard in en-US locale", () => {
    const wrapper = mountPopover({ transitionGuards: GUARD }, "en-US");
    const hint = wrapper.find('[data-testid="phase-guard-hint"]');
    expect(hint.exists()).toBe(true);
    expect(hint.text()).toContain("Outstanding balance");
  });

  it("renders guard in ja-JP locale", () => {
    const wrapper = mountPopover({ transitionGuards: GUARD }, "ja-JP");
    const hint = wrapper.find('[data-testid="phase-guard-hint"]');
    expect(hint.exists()).toBe(true);
    expect(hint.text()).toContain("未収残高");
  });

  it("mixed targets: guarded disabled + non-guarded selectable", async () => {
    const wrapper = mountPopover({
      currentPhase: "UNDER_REVIEW",
      availableTargets: ["APPROVED", "REJECTED"],
      transitionGuards: {
        APPROVED: {
          key: "cases.detail.phaseMenu.guards.successCloseoutBlocked",
          params: { amount: "¥100,000" },
        },
      },
    });

    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    expect(items).toHaveLength(2);

    expect(items[0].classes()).toContain("phase-popover__item--disabled");
    expect(items[1].classes()).not.toContain("phase-popover__item--disabled");

    await items[0].trigger("click");
    expect(items[0].classes().includes("phase-popover__item--selected")).toBe(
      false,
    );

    await items[1].trigger("click");
    await wrapper.vm.$nextTick();
    const updatedItems = wrapper.findAll('[data-testid="phase-target-item"]');
    expect(updatedItems[1].classes()).toContain(
      "phase-popover__item--selected",
    );
  });
});
