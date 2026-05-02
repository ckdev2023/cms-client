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
      currentPhase: "UNDER_REVIEW",
      availableTargets: ["APPROVED", "REJECTED", "NEED_SUPPLEMENT"],
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

describe("PhaseTransitionPopover", () => {
  it("renders available targets with arrow format including current phase", () => {
    const wrapper = mountPopover();
    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    expect(items).toHaveLength(3);
    expect(items[0].text()).toBe("审查中（入管） → 已批准");
    expect(items[1].text()).toBe("审查中（入管） → 已拒否");
    expect(items[2].text()).toBe("审查中（入管） → 需要补充");
  });

  it("renders ja-JP translations with arrow format", () => {
    const wrapper = mountPopover({}, "ja-JP");
    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    expect(items).toHaveLength(3);
    expect(items[0].text()).toBe("審査中（入管） → 許可済み");
  });

  it("renders current phase subtitle", () => {
    const wrapper = mountPopover();
    const subtitle = wrapper.find('[data-testid="phase-current-label"]');
    expect(subtitle.exists()).toBe(true);
    expect(subtitle.text()).toBe("当前：审查中（入管）");
  });

  it("falls back to target-only labels when currentPhase is null", () => {
    const wrapper = mountPopover({ currentPhase: null });
    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    expect(items[0].text()).toBe("已批准");
    expect(wrapper.find('[data-testid="phase-current-label"]').exists()).toBe(
      false,
    );
  });

  it("does not render when menuOpen is false", () => {
    const wrapper = mountPopover({ menuOpen: false });
    expect(
      wrapper.find('[data-testid="phase-transition-popover"]').exists(),
    ).toBe(false);
  });

  it("emits submit with toPhase when non-terminal phase selected", async () => {
    const wrapper = mountPopover();
    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    await items[0].trigger("click");

    const submitBtn = wrapper.findAll("button").at(-1)!;
    await submitBtn.trigger("click");

    expect(wrapper.emitted("submit")).toBeTruthy();
    const payload = wrapper.emitted("submit")![0][0] as Record<string, unknown>;
    expect(payload).toEqual({
      toPhase: "APPROVED",
      closeReason: undefined,
      resultOutcome: undefined,
    });
  });

  it("blocks submit when CLOSED_FAILED selected with empty closeReason", async () => {
    const wrapper = mountPopover({
      availableTargets: ["CLOSED_FAILED"],
    });
    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    await items[0].trigger("click");

    const submitBtn = wrapper.findAll("button").at(-1)!;
    await submitBtn.trigger("click");

    expect(wrapper.emitted("submit")).toBeFalsy();
    expect(
      wrapper.find('[data-testid="close-reason-validation-error"]').exists(),
    ).toBe(true);
  });

  it("allows submit for CLOSED_FAILED when closeReason is filled", async () => {
    const wrapper = mountPopover({
      availableTargets: ["CLOSED_FAILED"],
    });
    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    await items[0].trigger("click");

    const input = wrapper.find('[data-testid="close-reason-input"]');
    await input.setValue("BMV-VISA-REJECTED");

    const submitBtn = wrapper.findAll("button").at(-1)!;
    await submitBtn.trigger("click");

    expect(wrapper.emitted("submit")).toBeTruthy();
    const payload = wrapper.emitted("submit")![0][0] as Record<string, unknown>;
    expect(payload).toEqual({
      toPhase: "CLOSED_FAILED",
      closeReason: "BMV-VISA-REJECTED",
      resultOutcome: "failure",
    });
  });

  it("displays error message when errorMessage prop is set", () => {
    const wrapper = mountPopover({ errorMessage: "Server error" });
    const errorEl = wrapper.find('[data-testid="phase-transition-error"]');
    expect(errorEl.exists()).toBe(true);
    expect(errorEl.text()).toContain("Server error");
  });

  it("emits close when cancel button clicked", async () => {
    const wrapper = mountPopover();
    const cancelBtn = wrapper.findAll("button").at(-2)!;
    await cancelBtn.trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("shows close reason input only for CLOSED_FAILED", async () => {
    const wrapper = mountPopover({
      availableTargets: ["APPROVED", "CLOSED_FAILED"],
    });

    await wrapper
      .findAll('[data-testid="phase-target-item"]')[0]
      .trigger("click");
    expect(wrapper.find('[data-testid="close-reason-input"]').exists()).toBe(
      false,
    );

    await wrapper
      .findAll('[data-testid="phase-target-item"]')[1]
      .trigger("click");
    expect(wrapper.find('[data-testid="close-reason-input"]').exists()).toBe(
      true,
    );
  });
});
