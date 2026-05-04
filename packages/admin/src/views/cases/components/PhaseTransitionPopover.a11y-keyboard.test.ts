import { describe, it, expect, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import PhaseTransitionPopover from "./PhaseTransitionPopover.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesEnUS from "../../../i18n/messages/cases/en-US";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";

const BUTTON_STUB = {
  template:
    '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  props: ["variant", "tone", "size", "disabled"],
  emits: ["click"],
};

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "en-US": { cases: casesEnUS },
  "ja-JP": { cases: casesJaJP },
};

function makeI18n(locale: "zh-CN" | "en-US" | "ja-JP" = "zh-CN") {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

let wrapper: VueWrapper | null = null;

function mountPopover(
  overrides: Record<string, unknown> = {},
  locale: "zh-CN" | "en-US" | "ja-JP" = "zh-CN",
) {
  const w = mount(PhaseTransitionPopover, {
    global: {
      plugins: [makeI18n(locale)],
      stubs: { Teleport: true, Button: BUTTON_STUB },
    },
    props: {
      menuOpen: true,
      currentPhase: "UNDER_REVIEW",
      availableTargets: ["APPROVED", "REJECTED", "NEED_SUPPLEMENT"],
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

describe("PhaseTransitionPopover a11y: aria-labelledby", () => {
  it("dialog has aria-labelledby pointing to the title id", () => {
    const w = mountPopover();
    const dialog = w.find('[data-testid="phase-transition-popover"]');
    expect(dialog.attributes("aria-labelledby")).toBe("phase-popover-title");

    const title = w.find("#phase-popover-title");
    expect(title.exists()).toBe(true);
    expect(title.text()).toBeTruthy();
  });
});

describe("PhaseTransitionPopover a11y: close button aria-label", () => {
  it.each([
    ["zh-CN", "关闭"],
    ["en-US", "Close"],
    ["ja-JP", "閉じる"],
  ] as const)("close button has aria-label in %s", (locale, expected) => {
    const w = mountPopover({}, locale);
    const closeBtn = w.find(".phase-popover__close-btn");
    expect(closeBtn.attributes("aria-label")).toBe(expected);
  });
});

describe("PhaseTransitionPopover a11y: listbox + option roles", () => {
  it("list has role=listbox", () => {
    const w = mountPopover();
    const list = w.find(".phase-popover__list");
    expect(list.attributes("role")).toBe("listbox");
  });

  it("each phase item has role=option and tabindex=0", () => {
    const w = mountPopover();
    const items = w.findAll('[data-testid="phase-target-item"]');
    expect(items.length).toBe(3);
    for (const item of items) {
      expect(item.attributes("role")).toBe("option");
      expect(item.attributes("tabindex")).toBe("0");
    }
  });

  it("aria-selected reflects the selected phase", async () => {
    const w = mountPopover();
    const items = w.findAll('[data-testid="phase-target-item"]');

    for (const item of items) {
      expect(item.attributes("aria-selected")).toBe("false");
    }

    await items[1].trigger("click");
    const updated = w.findAll('[data-testid="phase-target-item"]');
    expect(updated[1].attributes("aria-selected")).toBe("true");
    expect(updated[0].attributes("aria-selected")).toBe("false");
  });
});

describe("PhaseTransitionPopover a11y: keyboard interaction on phase items", () => {
  it("Enter key selects a phase", async () => {
    const w = mountPopover();
    const items = w.findAll('[data-testid="phase-target-item"]');

    await items[0].trigger("keydown", { key: "Enter" });

    const updated = w.findAll('[data-testid="phase-target-item"]');
    expect(updated[0].attributes("aria-selected")).toBe("true");
  });

  it("Space key selects a phase", async () => {
    const w = mountPopover();
    const items = w.findAll('[data-testid="phase-target-item"]');

    await items[2].trigger("keydown", { key: " " });

    const updated = w.findAll('[data-testid="phase-target-item"]');
    expect(updated[2].attributes("aria-selected")).toBe("true");
  });

  it("Enter on phase item + submit emits correct payload", async () => {
    const w = mountPopover();
    const items = w.findAll('[data-testid="phase-target-item"]');
    await items[0].trigger("keydown", { key: "Enter" });

    const submitBtn = w.findAll("button").at(-1)!;
    await submitBtn.trigger("click");

    expect(w.emitted("submit")).toBeTruthy();
    const payload = w.emitted("submit")![0][0] as Record<string, unknown>;
    expect(payload.toPhase).toBe("APPROVED");
  });
});
