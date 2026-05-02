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

function makeI18n() {
  return createI18n({
    legacy: false,
    locale: "zh-CN",
    messages: FULL_MESSAGES,
  });
}

function mountPopover(props: Record<string, unknown> = {}) {
  return mount(PhaseTransitionPopover, {
    props: {
      menuOpen: true,
      currentPhase: "UNDER_REVIEW",
      availableTargets: ["APPROVED", "REJECTED", "CLOSED_FAILED"],
      submitting: false,
      errorMessage: null,
      ...props,
    },
    global: {
      plugins: [makeI18n()],
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

describe("BUG-192: PhaseTransitionPopover state reset on menuOpen toggle", () => {
  it("resets selectedPhase when menuOpen goes from true to false", async () => {
    const wrapper = mountPopover();

    await wrapper
      .findAll('[data-testid="phase-target-item"]')[0]
      .trigger("click");

    expect(
      wrapper.findAll('[data-testid="phase-target-item"]')[0].classes(),
    ).toContain("phase-popover__item--selected");

    await wrapper.setProps({ menuOpen: false });
    await wrapper.setProps({ menuOpen: true });

    for (const item of wrapper.findAll('[data-testid="phase-target-item"]')) {
      expect(item.classes()).not.toContain("phase-popover__item--selected");
    }
  });

  it("resets closeReason when menuOpen goes from true to false", async () => {
    const wrapper = mountPopover();

    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    await items[2].trigger("click");

    const otherChip = wrapper.find('[data-testid="cancel-preset-OTHER"]');
    await otherChip.trigger("click");

    const input = wrapper.find('[data-testid="close-reason-input"]');
    await input.setValue("some-reason");
    expect((input.element as HTMLInputElement).value).toBe("some-reason");

    await wrapper.setProps({ menuOpen: false });
    await wrapper.setProps({ menuOpen: true });

    expect(wrapper.find('[data-testid="close-reason-input"]').exists()).toBe(
      false,
    );
  });

  it("resets validationError when menuOpen goes from true to false", async () => {
    const wrapper = mountPopover({
      availableTargets: ["CLOSED_FAILED"],
    });

    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    await items[0].trigger("click");

    const submitBtn = wrapper.findAll("button").at(-1)!;
    await submitBtn.trigger("click");
    expect(
      wrapper.find('[data-testid="close-reason-validation-error"]').exists(),
    ).toBe(true);

    await wrapper.setProps({ menuOpen: false });
    await wrapper.setProps({ menuOpen: true });

    expect(
      wrapper.find('[data-testid="close-reason-validation-error"]').exists(),
    ).toBe(false);
  });

  it("submit button is disabled after reopen (no phase selected)", async () => {
    const wrapper = mountPopover();

    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    await items[0].trigger("click");

    const submitBtnBefore = wrapper.findAll("button").at(-1)!;
    expect(submitBtnBefore.attributes("disabled")).toBeUndefined();

    await wrapper.setProps({ menuOpen: false });
    await wrapper.setProps({ menuOpen: true });

    const submitBtnAfter = wrapper.findAll("button").at(-1)!;
    expect(submitBtnAfter.attributes("disabled")).toBeDefined();
  });
});
