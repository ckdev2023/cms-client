import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseEditModal from "./CaseEditModal.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import {
  registerUserAliases,
  clearUserAliases,
} from "../../../shared/model/useOrgUserOptions";

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
  const w = mount(CaseEditModal, {
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

beforeEach(() => {
  registerUserAliases([{ id: "u1", displayName: "User 1" }]);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  clearUserAliases();
});

describe("CaseEditModal Escape key close (R27-M)", () => {
  it("emits close when Escape is pressed on the backdrop", async () => {
    const w = mountModal();
    const backdrop = w.find("[data-testid='case-edit-modal-backdrop']");
    await backdrop.trigger("keydown", { key: "Escape" });
    expect(w.emitted("close")).toBeTruthy();
    expect(w.emitted("close")!.length).toBe(1);
  });

  it("emits close when Escape is pressed while an input is focused", async () => {
    const w = mountModal();
    const input = w.find("#case-edit-caseName");
    await input.trigger("keydown", { key: "Escape" });
    expect(w.emitted("close")).toBeTruthy();
  });

  it("does NOT emit close when Escape is pressed while submitting", async () => {
    const w = mountModal({ submitting: true });
    const backdrop = w.find("[data-testid='case-edit-modal-backdrop']");
    await backdrop.trigger("keydown", { key: "Escape" });
    expect(w.emitted("close")).toBeFalsy();
  });

  it("backdrop has tabindex=-1 for programmatic focus", () => {
    const w = mountModal();
    const backdrop = w.find("[data-testid='case-edit-modal-backdrop']");
    expect(backdrop.attributes("tabindex")).toBe("-1");
  });
});
