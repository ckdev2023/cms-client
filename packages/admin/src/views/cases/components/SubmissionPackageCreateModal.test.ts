import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import SubmissionPackageCreateModal from "./SubmissionPackageCreateModal.vue";
import casesEnUS from "../../../i18n/messages/cases/en-US";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";

const BUTTON_STUB = {
  template:
    "<button @click='$emit(\"click\")' :disabled='disabled'><slot /></button>",
  emits: ["click"],
  props: ["variant", "tone", "size", "disabled"],
};

function makeI18n(locale = "zh-CN") {
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

function mountModal(open = true, defaultAuthorityName: string | null = null) {
  return mount(SubmissionPackageCreateModal, {
    props: { open, defaultAuthorityName },
    global: {
      plugins: [makeI18n()],
      stubs: {
        Button: BUTTON_STUB,
        Teleport: { template: "<div><slot /></div>" },
      },
    },
  });
}

describe("SubmissionPackageCreateModal", () => {
  it("renders dialog title and required fields when open", () => {
    const wrapper = mountModal(true);
    expect(
      wrapper.get('[data-testid="submission-package-create-modal"]'),
    ).toBeTruthy();
    expect(wrapper.get('[data-testid="sp-submittedAt"]')).toBeTruthy();
    expect(wrapper.get('[data-testid="sp-authorityName"]')).toBeTruthy();
  });

  it("disables submit when authorityName is empty", async () => {
    const wrapper = mountModal(true);
    const submit = wrapper.get('[data-testid="sp-submit"]')
      .element as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("emits submit with submittedAt(ISO) and trimmed authorityName", async () => {
    const wrapper = mountModal(true);
    await wrapper
      .get('[data-testid="sp-authorityName"]')
      .setValue("  Tokyo Immigration  ");
    await wrapper
      .get('[data-testid="sp-submittedAt"]')
      .setValue("2026-05-09T14:30");
    await wrapper.get('[data-testid="sp-submit"]').trigger("click");
    const events = wrapper.emitted("submit");
    expect(events).toBeTruthy();
    expect(events?.[0]?.[0]).toEqual({
      submittedAt: new Date("2026-05-09T14:30").toISOString(),
      authorityName: "Tokyo Immigration",
    });
  });

  it("emits close on cancel button click", async () => {
    const wrapper = mountModal(true);
    const buttons = wrapper.findAll("button");
    const cancelBtn = buttons.find((b) => b.text().includes("取消"));
    expect(cancelBtn).toBeTruthy();
    await cancelBtn?.trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("prefills authorityName with defaultAuthorityName when modal opens", async () => {
    const wrapper = mountModal(true, "東京入管");
    const input = wrapper.get('[data-testid="sp-authorityName"]')
      .element as HTMLInputElement;
    expect(input.value).toBe("東京入管");
  });

  it("does not render when open is false", () => {
    const wrapper = mountModal(false);
    expect(
      wrapper.find('[data-testid="submission-package-create-modal"]').exists(),
    ).toBe(false);
  });
});
