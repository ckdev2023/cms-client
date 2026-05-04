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

describe("AddDocumentItemModal Escape key close (R30-E)", () => {
  it("emits close when Escape is pressed on the backdrop", async () => {
    const w = mountModal();
    const backdrop = w.find("[data-testid='adim-backdrop']");
    await backdrop.trigger("keydown", { key: "Escape" });
    expect(w.emitted("close")).toBeTruthy();
    expect(w.emitted("close")!.length).toBe(1);
  });

  it("emits close when Escape is pressed while an input is focused", async () => {
    const w = mountModal();
    const input = w.find("#doc-addItem-name");
    await input.trigger("keydown", { key: "Escape" });
    expect(w.emitted("close")).toBeTruthy();
  });

  it("backdrop has tabindex=-1 for programmatic focus", () => {
    const w = mountModal();
    const backdrop = w.find("[data-testid='adim-backdrop']");
    expect(backdrop.attributes("tabindex")).toBe("-1");
  });
});
