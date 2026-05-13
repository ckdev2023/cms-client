import { describe, it, expect, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseRiskConfirmModal from "./CaseRiskConfirmModal.vue";
import CaseFormGenerateModal from "./CaseFormGenerateModal.vue";
import CaseDeadlineCreateModal from "./CaseDeadlineCreateModal.vue";
import CaseMessagesTab from "./CaseMessagesTab.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";

const BUTTON_STUB = {
  template:
    "<button @click='$emit(\"click\")' :disabled='disabled'><slot /></button>",
  emits: ["click"],
  props: ["variant", "tone", "size", "disabled"],
};

const CARD_STUB = {
  template: '<div><slot name="header" /><slot /></div>',
  props: ["padding", "hoverable"],
};

const CHIP_STUB = {
  template: "<span><slot /></span>",
  props: ["tone"],
};

function makeI18n() {
  return createI18n({
    legacy: false,
    locale: "zh-CN",
    messages: { "zh-CN": { cases: casesZhCN } },
  });
}

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("CaseRiskConfirmModal form fields have id and name (R27-O)", () => {
  function mountModal() {
    const w = mount(CaseRiskConfirmModal, {
      global: {
        plugins: [makeI18n()],
        stubs: { Teleport: true, Transition: false, Button: BUTTON_STUB },
      },
      props: { visible: true },
      attachTo: document.body,
    });
    wrapper = w;
    return w;
  }

  it.each([
    ["textarea", "#riskReason", "reason"],
    ["input", "#riskPerson", "person"],
    ["input", "#riskEvidence", "evidence"],
  ])("%s %s has name=%s", (_tag, selector, expectedName) => {
    const w = mountModal();
    const el = w.find(selector);
    expect(el.exists()).toBe(true);
    expect(el.attributes("name")).toBe(expectedName);
  });
});

describe("CaseFormGenerateModal labels have for attributes (R27-O)", () => {
  function mountModal() {
    const w = mount(CaseFormGenerateModal, {
      global: {
        plugins: [makeI18n()],
        stubs: { Teleport: true, Button: BUTTON_STUB },
      },
      props: { open: true, caseName: "Test", submitting: false },
      attachTo: document.body,
    });
    wrapper = w;
    return w;
  }

  it.each([
    ["form-gen-docTitle", "docTitle"],
    ["form-gen-fileUrl", "fileUrl"],
  ])("label[for=%s] points to input with name=%s", (id, name) => {
    const w = mountModal();
    const input = w.find(`#${id}`);
    expect(input.exists()).toBe(true);
    expect(input.attributes("name")).toBe(name);
    const label = w.find(`label[for="${id}"]`);
    expect(label.exists()).toBe(true);
  });
});

describe("CaseDeadlineCreateModal labels have for attributes (R27-O)", () => {
  function mountModal() {
    const w = mount(CaseDeadlineCreateModal, {
      global: {
        plugins: [makeI18n()],
        stubs: { Teleport: true, Button: BUTTON_STUB },
      },
      props: { open: true, caseId: "c-1", submitting: false },
      attachTo: document.body,
    });
    wrapper = w;
    return w;
  }

  it.each([
    ["deadline-targetType", "targetType"],
    ["deadline-remindAt", "remindAt"],
    ["deadline-kind", "kind"],
    ["deadline-memo", "memo"],
  ])("label[for=%s] points to input with name=%s", (id, name) => {
    const w = mountModal();
    const input = w.find(`#${id}`);
    expect(input.exists()).toBe(true);
    expect(input.attributes("name")).toBe(name);
    const label = w.find(`label[for="${id}"]`);
    expect(label.exists()).toBe(true);
  });
});

describe("CaseMessagesTab filter radios have id (R27-O)", () => {
  function mountTab() {
    const w = mount(CaseMessagesTab, {
      global: {
        plugins: [makeI18n()],
        stubs: { Card: CARD_STUB, Chip: CHIP_STUB },
      },
      props: {
        detail: { id: "c-1", messages: [] },
        readonly: false,
      },
      attachTo: document.body,
    });
    wrapper = w;
    return w;
  }

  it("every filter radio has a unique id and shared name", () => {
    const w = mountTab();
    const radios = w.findAll("input[type='radio'][name='msgFilter']");
    expect(radios.length).toBeGreaterThan(0);

    const ids = new Set<string>();
    for (const radio of radios) {
      const id = radio.attributes("id");
      expect(id).toBeTruthy();
      expect(id).toMatch(/^msgFilter-/);
      expect(ids.has(id!)).toBe(false);
      ids.add(id!);
    }
  });
});
