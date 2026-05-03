import { describe, it, expect, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import PhaseTransitionPopover from "./PhaseTransitionPopover.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";

const BUTTON_STUB = {
  template:
    '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  props: ["variant", "tone", "size", "disabled"],
  emits: ["click"],
};

function makeI18n() {
  return createI18n({
    legacy: false,
    locale: "zh-CN",
    messages: { "zh-CN": { cases: casesZhCN } },
  });
}

let wrapper: VueWrapper | null = null;

function mountPopover(overrides: Record<string, unknown> = {}) {
  const w = mount(PhaseTransitionPopover, {
    global: {
      plugins: [makeI18n()],
      stubs: { Teleport: true, Button: BUTTON_STUB },
    },
    props: {
      menuOpen: true,
      currentPhase: "WAITING_MATERIAL",
      availableTargets: ["UNDER_REVIEW", "CLOSED_FAILED"],
      submitting: false,
      errorMessage: null,
      ...overrides,
    },
    attachTo: document.body,
  });
  wrapper = w;
  return w;
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("PhaseTransitionPopover Escape key close (R27-M)", () => {
  it("emits close when Escape is pressed on the backdrop", async () => {
    const w = mountPopover();
    const backdrop = w.find(
      "[data-testid='phase-transition-popover-backdrop']",
    );
    await backdrop.trigger("keydown", { key: "Escape" });
    expect(w.emitted("close")).toBeTruthy();
    expect(w.emitted("close")!.length).toBe(1);
  });

  it("emits close when Escape is pressed while an inner element is focused", async () => {
    const w = mountPopover();
    const items = w.findAll("[data-testid='phase-target-item']");
    expect(items.length).toBeGreaterThan(0);
    await items[0].trigger("keydown", { key: "Escape" });
    expect(w.emitted("close")).toBeTruthy();
  });

  it("does NOT emit close when Escape is pressed while submitting", async () => {
    const w = mountPopover({ submitting: true });
    const backdrop = w.find(
      "[data-testid='phase-transition-popover-backdrop']",
    );
    await backdrop.trigger("keydown", { key: "Escape" });
    expect(w.emitted("close")).toBeFalsy();
  });

  it("backdrop has tabindex=-1 for programmatic focus", () => {
    const w = mountPopover();
    const backdrop = w.find(
      "[data-testid='phase-transition-popover-backdrop']",
    );
    expect(backdrop.attributes("tabindex")).toBe("-1");
  });
});
