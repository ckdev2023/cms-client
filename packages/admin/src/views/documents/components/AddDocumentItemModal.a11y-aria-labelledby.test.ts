import { describe, it, expect, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import AddDocumentItemModal from "./AddDocumentItemModal.vue";
import documentsZhCN from "../../../i18n/messages/documents/zh-CN";

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
    messages: { "zh-CN": { documents: documentsZhCN } },
  });
}

let wrapper: VueWrapper | null = null;

function mountModal(overrides: Record<string, unknown> = {}) {
  const w = mount(AddDocumentItemModal, {
    global: {
      plugins: [makeI18n()],
      stubs: { Teleport: true, Button: BUTTON_STUB },
    },
    props: {
      open: true,
      name: "",
      ownerSide: "",
      dueAt: "",
      note: "",
      canSubmit: false,
      submitting: false,
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

describe("AddDocumentItemModal aria-labelledby (R30-D)", () => {
  it("dialog container has aria-labelledby pointing to the title id", () => {
    const w = mountModal();
    const dialog = w.find("[role='dialog']");
    expect(dialog.attributes("aria-labelledby")).toBe("adim-title");
  });

  it("dialog container has aria-modal=true", () => {
    const w = mountModal();
    const dialog = w.find("[role='dialog']");
    expect(dialog.attributes("aria-modal")).toBe("true");
  });

  it("title element has the matching id", () => {
    const w = mountModal();
    const title = w.find("#adim-title");
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
