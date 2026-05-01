import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
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

const ALWAYS_VISIBLE_IDS = [
  "case-create-name",
  "case-create-role",
  "case-create-groupId",
  "case-create-phone",
  "case-create-email",
  "case-create-note",
];

function mountModal(overrides: Record<string, unknown> = {}) {
  return mount(CaseCreateModal, {
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
  });
}

describe("CaseCreateModal — a11y label association", () => {
  it("every input/select has an id, name, and a matching label[for]", () => {
    const wrapper = mountModal();

    for (const id of ALWAYS_VISIBLE_IDS) {
      const control = wrapper.find(`#${id}`);
      expect(control.exists(), `control #${id} should exist`).toBe(true);
      expect(control.attributes("name")).toBeTruthy();

      const label = wrapper.find(`label[for="${id}"]`);
      expect(label.exists(), `label[for="${id}"] should exist`).toBe(true);
    }
  });

  it("dedupe confirmReason field has id/name/label[for] when visible", () => {
    const wrapper = mountModal({
      showDuplicateConfirmation: true,
      duplicateHits: [{ id: "1", name: "Test", contact: "test@example.com" }],
    });

    const control = wrapper.find("#case-create-confirmReason");
    expect(control.exists()).toBe(true);
    expect(control.attributes("name")).toBe("confirmReason");

    const label = wrapper.find('label[for="case-create-confirmReason"]');
    expect(label.exists()).toBe(true);
  });

  it("dedupe confirmReason field is absent when showDuplicateConfirmation=false", () => {
    const wrapper = mountModal({ showDuplicateConfirmation: false });
    expect(wrapper.find("#case-create-confirmReason").exists()).toBe(false);
  });
});
