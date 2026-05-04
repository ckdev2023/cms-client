import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseEditModal from "./CaseEditModal.vue";
import CaseDeadlineCreateModal from "./CaseDeadlineCreateModal.vue";
import CaseTaskCreateModal from "./CaseTaskCreateModal.vue";
import CaseFormGenerateModal from "./CaseFormGenerateModal.vue";
import CaseCloseReasonModal from "./CaseCloseReasonModal.vue";
import PhaseTransitionPopover from "./PhaseTransitionPopover.vue";
import CaseCreateModal from "./CaseCreateModal.vue";
import casesEnUS from "../../../i18n/messages/cases/en-US";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
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

const USER_PICKER_STUB = {
  template: "<select></select>",
  props: ["modelValue", "disabled", "placeholder"],
};

const DATE_INPUT_STUB = {
  template: "<input type='date' />",
  props: ["modelValue", "disabled"],
};

function makeI18n(locale: string) {
  return createI18n({
    legacy: false,
    locale,
    messages: {
      "en-US": { cases: casesEnUS },
      "ja-JP": { cases: casesJaJP },
      "zh-CN": { cases: casesZhCN },
    },
  });
}

const GLOBAL_STUBS = {
  Teleport: true,
  Button: BUTTON_STUB,
  UserPicker: USER_PICKER_STUB,
  DateInput: DATE_INPUT_STUB,
};

interface ModalSpec {
  name: string;

  component: any;
  props: Record<string, unknown>;
  closeBtnSelector: string;
}

const MODAL_SPECS: ModalSpec[] = [
  {
    name: "CaseEditModal",
    component: CaseEditModal,
    props: { open: true, submitting: false },
    closeBtnSelector: ".case-edit-modal__close",
  },
  {
    name: "CaseDeadlineCreateModal",
    component: CaseDeadlineCreateModal,
    props: { open: true, submitting: false },
    closeBtnSelector: ".deadline-modal__close",
  },
  {
    name: "CaseTaskCreateModal",
    component: CaseTaskCreateModal,
    props: { open: true, submitting: false },
    closeBtnSelector: ".task-create-modal__close",
  },
  {
    name: "CaseFormGenerateModal",
    component: CaseFormGenerateModal,
    props: { open: true, submitting: false },
    closeBtnSelector: ".form-gen-modal__close",
  },
  {
    name: "CaseCloseReasonModal",
    component: CaseCloseReasonModal,
    props: { open: true },
    closeBtnSelector: ".close-reason-modal__close-btn",
  },
  {
    name: "PhaseTransitionPopover",
    component: PhaseTransitionPopover,
    props: { menuOpen: true, submitting: false },
    closeBtnSelector: ".phase-popover__close-btn",
  },
  {
    name: "CaseCreateModal",
    component: CaseCreateModal,
    props: {
      open: true,
      form: { name: "", role: "", groupId: "", phone: "", email: "", note: "" },
      formErrors: {},
      showDuplicateConfirmation: false,
      duplicateHits: [],
      confirmReason: "",
      canSave: false,
    },
    closeBtnSelector: ".ccm__close",
  },
];

let wrapper: VueWrapper | null = null;

beforeEach(() => {
  registerUserAliases([{ id: "u1", displayName: "User 1" }]);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  clearUserAliases();
});

describe("All modal close buttons have aria-label (R30-M)", () => {
  for (const spec of MODAL_SPECS) {
    describe(spec.name, () => {
      it("close button has a non-empty aria-label", () => {
        wrapper = mount(spec.component, {
          global: { plugins: [makeI18n("zh-CN")], stubs: GLOBAL_STUBS },
          props: spec.props,
          attachTo: document.body,
        });
        const btn = wrapper.find(spec.closeBtnSelector);
        expect(btn.exists()).toBe(true);
        const label = btn.attributes("aria-label");
        expect(label).toBeTruthy();
        expect(label).not.toContain("cases.common.");
      });

      it("close button SVG has aria-hidden=true", () => {
        wrapper = mount(spec.component, {
          global: { plugins: [makeI18n("zh-CN")], stubs: GLOBAL_STUBS },
          props: spec.props,
          attachTo: document.body,
        });
        const btn = wrapper.find(spec.closeBtnSelector);
        const svg = btn.find("svg");
        if (svg.exists()) {
          expect(svg.attributes("aria-hidden")).toBe("true");
        }
      });

      it.each([
        ["en-US", "Close"],
        ["ja-JP", "閉じる"],
        ["zh-CN", "关闭"],
      ])("aria-label resolves correctly in %s", (locale, expected) => {
        wrapper = mount(spec.component, {
          global: { plugins: [makeI18n(locale)], stubs: GLOBAL_STUBS },
          props: spec.props,
          attachTo: document.body,
        });
        const btn = wrapper.find(spec.closeBtnSelector);
        const label = btn.attributes("aria-label");
        expect(label).toBe(expected);
      });
    });
  }
});
