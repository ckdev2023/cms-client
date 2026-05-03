import { describe, it, expect, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseDeadlineCreateModal from "./CaseDeadlineCreateModal.vue";

import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

const BUTTON_STUB = {
  template: '<button v-bind="$attrs"><slot /></button>',
  inheritAttrs: true,
};

function makeI18n(locale = "zh-CN") {
  return createI18n({
    legacy: false,
    locale,
    messages: {
      "zh-CN": { cases: casesZhCN },
      "ja-JP": { cases: casesJaJP },
      "en-US": { cases: casesEnUS },
    },
  });
}

let wrapper: VueWrapper<InstanceType<typeof CaseDeadlineCreateModal>> | null =
  null;

function mountModal(overrides: Record<string, unknown> = {}, locale = "zh-CN") {
  const w = mount(CaseDeadlineCreateModal, {
    global: {
      plugins: [makeI18n(locale)],
      stubs: { Teleport: true, Button: BUTTON_STUB },
    },
    props: {
      open: true,
      caseId: "case-001",
      submitting: false,
      ...overrides,
    },
  });
  wrapper = w;
  return w;
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("CaseDeadlineCreateModal errorMessageKey (BUG-R27-F)", () => {
  it("shows role=alert error bar when errorMessageKey is set", () => {
    const w = mountModal({
      errorMessageKey: "cases.writeErrors.reminderCreateFailed",
    });
    const alert = w.find('[role="alert"]');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toBe(casesZhCN.writeErrors.reminderCreateFailed);
  });

  it("does not show error bar when errorMessageKey is null", () => {
    const w = mountModal({ errorMessageKey: null });
    expect(w.find('[role="alert"]').exists()).toBe(false);
  });

  it("does not show error bar when errorMessageKey is undefined", () => {
    const w = mountModal();
    expect(w.find('[role="alert"]').exists()).toBe(false);
  });

  it("preserves input values when error is displayed (submitting=false)", async () => {
    const w = mountModal();

    const dateInput = w.find('[data-testid="deadline-remind-at"]');
    await dateInput.setValue("2026-07-01");
    const memoInput = w.find('[data-testid="deadline-memo"]');
    await memoInput.setValue("important deadline");
    const kindSelect = w.find('[data-testid="deadline-kind"]');
    await kindSelect.setValue("renewal_reminder");

    await w.setProps({
      errorMessageKey: "cases.writeErrors.reminderCreateFailed",
    });

    expect((dateInput.element as HTMLInputElement).value).toBe("2026-07-01");
    expect((memoInput.element as HTMLTextAreaElement).value).toBe(
      "important deadline",
    );
    expect((kindSelect.element as HTMLSelectElement).value).toBe(
      "renewal_reminder",
    );
    expect(w.find('[role="alert"]').exists()).toBe(true);
  });

  it("shows localized error text in ja-JP", () => {
    const w = mountModal(
      { errorMessageKey: "cases.writeErrors.reminderCreateFailed" },
      "ja-JP",
    );
    const alert = w.find('[role="alert"]');
    expect(alert.text()).toBe(casesJaJP.writeErrors.reminderCreateFailed);
  });

  it("shows localized error text in en-US", () => {
    const w = mountModal(
      { errorMessageKey: "cases.writeErrors.reminderCreateFailed" },
      "en-US",
    );
    const alert = w.find('[role="alert"]');
    expect(alert.text()).toBe(casesEnUS.writeErrors.reminderCreateFailed);
  });

  it("error bar has data-testid for integration targeting", () => {
    const w = mountModal({
      errorMessageKey: "cases.writeErrors.reminderInvalidCaseId",
    });
    const bar = w.find('[data-testid="deadline-error-bar"]');
    expect(bar.exists()).toBe(true);
    expect(bar.text()).toBe(casesZhCN.writeErrors.reminderInvalidCaseId);
  });

  it("error bar disappears when errorMessageKey changes to null", async () => {
    const w = mountModal({
      errorMessageKey: "cases.writeErrors.reminderCreateFailed",
    });
    expect(w.find('[role="alert"]').exists()).toBe(true);

    await w.setProps({ errorMessageKey: null });
    expect(w.find('[role="alert"]').exists()).toBe(false);
  });
});
