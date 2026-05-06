import { describe, expect, it, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import LeadConvertCustomerDialog from "./LeadConvertCustomerDialog.vue";

let cleanup: (() => void) | null = null;

function q(selector: string): HTMLElement | null {
  return document.body.querySelector(selector);
}

function qAll(selector: string): NodeListOf<HTMLElement> {
  return document.body.querySelectorAll(selector);
}

function mountDialog(props: Record<string, unknown> = {}) {
  const wrapper = mount(LeadConvertCustomerDialog, {
    global: { plugins: [i18n] },
    props,
    attachTo: document.body,
  });
  cleanup = () => wrapper.unmount();
  return wrapper;
}

afterEach(() => {
  cleanup?.();
  cleanup = null;
});

describe("LeadConvertCustomerDialog", () => {
  it("renders dialog title", () => {
    mountDialog();
    expect(q(".convert-customer-dialog__title")).not.toBeNull();
  });

  it("renders confirm and cancel buttons", () => {
    mountDialog();
    const buttons = qAll(".convert-customer-dialog__actions button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("emits close when cancel is clicked", async () => {
    const wrapper = mountDialog();
    const buttons = qAll(".convert-customer-dialog__actions button");
    buttons[0].click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits confirm with empty input when no fields are filled", async () => {
    const wrapper = mountDialog();
    const buttons = qAll(".convert-customer-dialog__actions button");
    const confirmBtn = buttons[buttons.length - 1];
    confirmBtn.click();
    await wrapper.vm.$nextTick();
    const events = wrapper.emitted("confirm");
    expect(events).toBeTruthy();
    expect(events![0][0]).toEqual({});
  });

  it("emits confirm with customerId when filled", async () => {
    const wrapper = mountDialog();
    const input = q(".convert-customer-dialog__input") as HTMLInputElement;
    expect(input).not.toBeNull();
    input.value = "CUS-12345";
    input.dispatchEvent(new Event("input"));
    await wrapper.vm.$nextTick();

    const buttons = qAll(".convert-customer-dialog__actions button");
    buttons[buttons.length - 1].click();
    await wrapper.vm.$nextTick();

    const events = wrapper.emitted("confirm");
    expect(events).toBeTruthy();
    const payload = events![0][0] as Record<string, unknown>;
    expect(payload.customerId).toBe("CUS-12345");
  });

  it("emits confirm with localizedNames when name fields are filled", async () => {
    const wrapper = mountDialog({ defaultLocale: "ja" });
    const inputs = qAll(".convert-customer-dialog__input");
    const jaInput = inputs[2] as HTMLInputElement;
    jaInput.value = "田中太郎";
    jaInput.dispatchEvent(new Event("input"));
    await wrapper.vm.$nextTick();

    const buttons = qAll(".convert-customer-dialog__actions button");
    buttons[buttons.length - 1].click();
    await wrapper.vm.$nextTick();

    const events = wrapper.emitted("confirm");
    expect(events).toBeTruthy();
    const payload = events![0][0] as Record<string, unknown>;
    expect(payload.localizedNames).toBeDefined();
    const names = payload.localizedNames as Record<string, unknown>;
    expect(names.ja).toBe("田中太郎");
    expect(names.defaultLocale).toBe("ja");
  });

  it("defaults defaultLocale select to zh when not provided", () => {
    mountDialog();
    const select = q(".convert-customer-dialog__select") as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.value).toBe("zh");
  });

  it("uses provided defaultLocale prop", () => {
    mountDialog({ defaultLocale: "en" });
    const select = q(".convert-customer-dialog__select") as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.value).toBe("en");
  });

  it("disables confirm button when submitting=true", () => {
    mountDialog({ submitting: true });
    const buttons = qAll(".convert-customer-dialog__actions button");
    const confirmBtn = buttons[buttons.length - 1] as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  it("emits close when backdrop is clicked", async () => {
    const wrapper = mountDialog();
    const backdrop = q(".convert-customer-backdrop") as HTMLElement;
    expect(backdrop).not.toBeNull();
    backdrop.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();
  });
});
