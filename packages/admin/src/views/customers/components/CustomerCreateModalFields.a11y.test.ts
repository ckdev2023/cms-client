import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import CustomerCreateModalFields from "./CustomerCreateModalFields.vue";

function mountFields() {
  return mount(CustomerCreateModalFields, {
    props: {
      fields: {
        customerType: "individual",
        displayName: "",
        group: "",
        legalName: "",
        kana: "",
        gender: "",
        birthDate: "",
        nationality: "",
        phone: "",
        email: "",
        location: "",
        sourceType: "",
        visaType: "",
        referrerName: "",
        avatar: "",
        note: "",
        representativeName: "",
      },
      groupOptions: [],
    },
    global: { plugins: [i18n] },
  });
}

describe("CustomerCreateModalFields — a11y: every input/select has id and name", () => {
  it("all <input> elements have id and name attributes", () => {
    const w = mountFields();
    const inputs = w.findAll("input");
    expect(inputs.length).toBeGreaterThanOrEqual(5);
    for (const input of inputs) {
      const id = input.attributes("id");
      const name = input.attributes("name");
      expect(id || name, `input missing id or name`).toBeTruthy();
    }
  });

  it("all <select> elements have id and name attributes", () => {
    const w = mountFields();
    const selects = w.findAll("select");
    expect(selects.length).toBeGreaterThanOrEqual(1);
    for (const select of selects) {
      expect(select.attributes("id"), `select missing id`).toBeTruthy();
      expect(select.attributes("name"), `select missing name`).toBeTruthy();
    }
  });

  it("each input/select is associated with a label", () => {
    const w = mountFields();
    const controls = [...w.findAll("input"), ...w.findAll("select")];
    for (const ctrl of controls) {
      const id = ctrl.attributes("id");
      if (!id) continue;
      const labelFor = w.find(`label[for="${id}"]`);
      const wrappingLabel = ctrl.element.closest("label");
      const wrappingFieldset = ctrl.element.closest("fieldset");
      expect(
        labelFor.exists() ||
          wrappingLabel !== null ||
          wrappingFieldset !== null,
        `control#${id} has no associated label`,
      ).toBe(true);
    }
  });
});
