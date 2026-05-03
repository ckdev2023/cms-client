import { describe, it, expect, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseFormGenerateModal from "./CaseFormGenerateModal.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";

const BUTTON_STUB = {
  template:
    "<button @click='$emit(\"click\")' :disabled='disabled'><slot /></button>",
  emits: ["click"],
  props: ["variant", "tone", "size", "disabled"],
};

function makeI18n() {
  return createI18n({
    legacy: false,
    locale: "zh-CN",
    messages: { "zh-CN": { cases: casesZhCN } },
  });
}

let wrapper: VueWrapper | null = null;

function mountModal(overrides: Record<string, unknown> = {}) {
  const w = mount(CaseFormGenerateModal, {
    global: {
      plugins: [makeI18n()],
      stubs: { Teleport: true, Button: BUTTON_STUB },
    },
    props: { open: true, submitting: false, ...overrides },
    attachTo: document.body,
  });
  wrapper = w;
  return w;
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("CaseFormGenerateModal aria-labelledby (R27-N)", () => {
  it("dialog container has aria-labelledby pointing to the title id", () => {
    const w = mountModal();
    const dialog = w.find("[role='dialog']");
    expect(dialog.attributes("aria-labelledby")).toBe(
      "case-form-generate-title",
    );
  });

  it("title element has the matching id", () => {
    const w = mountModal();
    const title = w.find("#case-form-generate-title");
    expect(title.exists()).toBe(true);
    expect(title.text()).toBeTruthy();
  });

  it("aria-labelledby value matches an existing element id", () => {
    const w = mountModal();
    const dialog = w.find("[role='dialog']");
    const labelledbyId = dialog.attributes("aria-labelledby");
    const target = w.find(`#${labelledbyId}`);
    expect(target.exists()).toBe(true);
  });
});
