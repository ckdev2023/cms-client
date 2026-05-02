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
      currentPhase: "WAITING_MATERIAL",
      availableTargets: ["MATERIAL_PREPARING", "CLOSED_FAILED"],
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

describe("BUG-200: PhaseTransitionPopover mid-cancel chip and payload", () => {
  it("selecting MID_CASE_WITHDRAWAL chip syncs closeReason to preset label", async () => {
    const wrapper = mountPopover();
    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    await items[1].trigger("click");

    await wrapper
      .find('[data-testid="cancel-preset-MID_CASE_WITHDRAWAL"]')
      .trigger("click");

    expect(
      wrapper
        .find('[data-testid="cancel-preset-MID_CASE_WITHDRAWAL"]')
        .classes(),
    ).toContain("phase-popover__preset-chip--active");

    const submitBtn = wrapper.findAll("button").at(-1)!;
    await submitBtn.trigger("click");

    const payload = wrapper.emitted("submit")![0][0] as Record<string, unknown>;
    expect(payload).toEqual({
      toPhase: "CLOSED_FAILED",
      closeReason: "中途撤案",
      resultOutcome: "failure",
    });
  });

  it("selecting CLIENT_LOST_CONTACT chip produces correct payload", async () => {
    const wrapper = mountPopover();
    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    await items[1].trigger("click");

    await wrapper
      .find('[data-testid="cancel-preset-CLIENT_LOST_CONTACT"]')
      .trigger("click");

    const submitBtn = wrapper.findAll("button").at(-1)!;
    await submitBtn.trigger("click");

    const payload = wrapper.emitted("submit")![0][0] as Record<string, unknown>;
    expect(payload).toEqual({
      toPhase: "CLOSED_FAILED",
      closeReason: "客户失联",
      resultOutcome: "failure",
    });
  });

  it("selecting SWITCHED_TO_OTHER_FIRM chip produces correct payload", async () => {
    const wrapper = mountPopover();
    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    await items[1].trigger("click");

    await wrapper
      .find('[data-testid="cancel-preset-SWITCHED_TO_OTHER_FIRM"]')
      .trigger("click");

    const submitBtn = wrapper.findAll("button").at(-1)!;
    await submitBtn.trigger("click");

    const payload = wrapper.emitted("submit")![0][0] as Record<string, unknown>;
    expect(payload).toEqual({
      toPhase: "CLOSED_FAILED",
      closeReason: "改委托其他事务所",
      resultOutcome: "failure",
    });
  });

  it("selecting OTHER chip without text blocks submit with validation error", async () => {
    const wrapper = mountPopover();
    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    await items[1].trigger("click");

    await wrapper.find('[data-testid="cancel-preset-OTHER"]').trigger("click");

    expect(wrapper.find('[data-testid="close-reason-input"]').exists()).toBe(
      true,
    );

    const submitBtn = wrapper.findAll("button").at(-1)!;
    await submitBtn.trigger("click");

    expect(wrapper.emitted("submit")).toBeFalsy();
    expect(
      wrapper.find('[data-testid="close-reason-validation-error"]').exists(),
    ).toBe(true);
  });

  it("selecting OTHER chip with free text submits the custom reason", async () => {
    const wrapper = mountPopover();
    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    await items[1].trigger("click");

    await wrapper.find('[data-testid="cancel-preset-OTHER"]').trigger("click");

    const input = wrapper.find('[data-testid="close-reason-input"]');
    await input.setValue("客户个人原因");

    const submitBtn = wrapper.findAll("button").at(-1)!;
    await submitBtn.trigger("click");

    const payload = wrapper.emitted("submit")![0][0] as Record<string, unknown>;
    expect(payload).toEqual({
      toPhase: "CLOSED_FAILED",
      closeReason: "客户个人原因",
      resultOutcome: "failure",
    });
  });

  it("switching from one preset to another updates closeReason", async () => {
    const wrapper = mountPopover();
    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    await items[1].trigger("click");

    await wrapper
      .find('[data-testid="cancel-preset-MID_CASE_WITHDRAWAL"]')
      .trigger("click");
    await wrapper
      .find('[data-testid="cancel-preset-CLIENT_LOST_CONTACT"]')
      .trigger("click");

    const submitBtn = wrapper.findAll("button").at(-1)!;
    await submitBtn.trigger("click");

    const payload = wrapper.emitted("submit")![0][0] as Record<string, unknown>;
    expect(payload.closeReason).toBe("客户失联");
  });

  it("selecting a preset clears previous validation error", async () => {
    const wrapper = mountPopover();
    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    await items[1].trigger("click");

    const submitBtn = wrapper.findAll("button").at(-1)!;
    await submitBtn.trigger("click");
    expect(
      wrapper.find('[data-testid="close-reason-validation-error"]').exists(),
    ).toBe(true);

    await wrapper
      .find('[data-testid="cancel-preset-MID_CASE_WITHDRAWAL"]')
      .trigger("click");
    expect(
      wrapper.find('[data-testid="close-reason-validation-error"]').exists(),
    ).toBe(false);
  });

  it("non-CLOSED_FAILED target does not include closeReason or resultOutcome", async () => {
    const wrapper = mountPopover();
    const items = wrapper.findAll('[data-testid="phase-target-item"]');
    await items[0].trigger("click");

    expect(wrapper.find('[data-testid="cancel-reason-presets"]').exists()).toBe(
      false,
    );

    const submitBtn = wrapper.findAll("button").at(-1)!;
    await submitBtn.trigger("click");

    const payload = wrapper.emitted("submit")![0][0] as Record<string, unknown>;
    expect(payload).toEqual({
      toPhase: "MATERIAL_PREPARING",
      closeReason: undefined,
      resultOutcome: undefined,
    });
  });
});
