import { describe, it, expect, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseDeadlineCreateModal from "./CaseDeadlineCreateModal.vue";

import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

type Locale = "zh-CN" | "ja-JP" | "en-US";

function makeI18n(locale: Locale) {
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

const STUBS = {
  Button: {
    template: '<button v-bind="$attrs"><slot /></button>',
    inheritAttrs: true,
  },
  teleport: true,
};

let currentWrapper: VueWrapper<any> | null = null;

function mountModal(locale: Locale = "zh-CN", open = true) {
  const wrapper = mount(CaseDeadlineCreateModal, {
    props: { open, caseId: "case-001", submitting: false },
    global: {
      plugins: [makeI18n(locale)],
      stubs: STUBS,
    },
  });
  currentWrapper = wrapper;
  return wrapper;
}

afterEach(() => {
  currentWrapper?.unmount();
  currentWrapper = null;
});

describe("CaseDeadlineCreateModal (BUG-215)", () => {
  it("renders modal when open=true", () => {
    const wrapper = mountModal();
    expect(wrapper.find('[data-testid="deadline-create-modal"]').exists()).toBe(
      true,
    );
  });

  it("does not render modal when open=false", () => {
    const wrapper = mountModal("zh-CN", false);
    expect(wrapper.find('[data-testid="deadline-create-modal"]').exists()).toBe(
      false,
    );
  });

  it("emits close when cancel button clicked", async () => {
    const wrapper = mountModal();
    const buttons = wrapper.findAll("button");
    const cancelBtn = buttons.find((b) =>
      b.text().includes(casesZhCN.deadlines.createModal.cancel),
    );
    expect(cancelBtn).toBeTruthy();
    await cancelBtn!.trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("submit button is disabled without remindAt", () => {
    const wrapper = mountModal();
    const submitBtn = wrapper.find('[data-testid="deadline-submit-btn"]');
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.attributes("disabled")).toBeDefined();
  });

  it("emits submit with correct payload when form is filled", async () => {
    const wrapper = mountModal();

    const dateInput = wrapper.find('[data-testid="deadline-remind-at"]');
    await dateInput.setValue("2026-06-15");

    const kindSelect = wrapper.find('[data-testid="deadline-kind"]');
    await kindSelect.setValue("renewal_reminder");

    const targetSelect = wrapper.find('[data-testid="deadline-target-type"]');
    await targetSelect.setValue("case_party_residence");

    const memo = wrapper.find('[data-testid="deadline-memo"]');
    await memo.setValue("test memo");

    const submitBtn = wrapper.find('[data-testid="deadline-submit-btn"]');
    await submitBtn.trigger("click");

    const emitted = wrapper.emitted("submit");
    expect(emitted).toHaveLength(1);
    const payload = emitted![0][0] as Record<string, unknown>;
    expect(payload.targetType).toBe("case_party_residence");
    expect(payload.kind).toBe("renewal_reminder");
    expect(payload.memo).toBe("test memo");
    expect(payload.remindAt).toBeTruthy();
  });

  it("resets form when modal reopens", async () => {
    const wrapper = mountModal();

    const dateInput = wrapper.find('[data-testid="deadline-remind-at"]');
    await dateInput.setValue("2026-06-15");

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });

    const refreshedInput = wrapper.find('[data-testid="deadline-remind-at"]');
    expect((refreshedInput.element as HTMLInputElement).value).toBe("");
  });

  it.each(["zh-CN", "ja-JP", "en-US"] as Locale[])(
    "renders localized title in %s",
    (locale) => {
      const wrapper = mountModal(locale);
      const title = wrapper.find(".deadline-modal__title");
      expect(title.exists()).toBe(true);
      expect(title.text()).toBeTruthy();
      if (locale !== "zh-CN") {
        expect(title.text()).not.toBe("添加期限");
      }
    },
  );
});
