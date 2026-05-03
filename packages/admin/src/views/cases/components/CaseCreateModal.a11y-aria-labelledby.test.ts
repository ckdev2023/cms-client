import { describe, it, expect, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import CaseCreateModal from "./CaseCreateModal.vue";
import type { QuickCreateCustomerForm } from "../model/useCasePartyPicker";

const EMPTY_FORM: QuickCreateCustomerForm = {
  name: "",
  role: "",
  groupId: "",
  phone: "",
  email: "",
  note: "",
};

let wrapper: VueWrapper | null = null;

function mountModal(overrides: Record<string, unknown> = {}) {
  const w = mount(CaseCreateModal, {
    global: {
      plugins: [i18n],
      stubs: { Teleport: true },
    },
    props: {
      open: true,
      form: EMPTY_FORM,
      formErrors: {},
      showDuplicateConfirmation: false,
      duplicateHits: [],
      confirmReason: "",
      canSave: false,
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

describe("CaseCreateModal aria-labelledby (R27-N)", () => {
  it("dialog container has aria-labelledby pointing to the title id", () => {
    const w = mountModal();
    const dialog = w.find("[role='dialog']");
    expect(dialog.attributes("aria-labelledby")).toBe(
      "case-create-modal-title",
    );
  });

  it("title element has the matching id", () => {
    const w = mountModal();
    const title = w.find("#case-create-modal-title");
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
