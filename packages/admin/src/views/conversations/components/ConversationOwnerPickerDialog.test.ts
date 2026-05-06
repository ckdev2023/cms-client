import { describe, expect, it, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import {
  registerUserAliases,
  clearUserAliases,
} from "../../../shared/model/useOrgUserOptions";
import ConversationOwnerPickerDialog from "./ConversationOwnerPickerDialog.vue";

const USER_A = "00000000-0000-4000-8000-00000000000a";
const USER_B = "00000000-0000-4000-8000-00000000000b";

let cleanup: (() => void) | null = null;

function q(selector: string): HTMLElement | null {
  return document.body.querySelector(selector);
}

function qAll(selector: string): NodeListOf<HTMLElement> {
  return document.body.querySelectorAll(selector);
}

function mountDialog(props: Record<string, unknown> = {}) {
  registerUserAliases([
    { id: USER_A, displayName: "Suzuki Taro" },
    { id: USER_B, displayName: "Tanaka Hanako" },
  ]);
  const wrapper = mount(ConversationOwnerPickerDialog, {
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
  clearUserAliases();
});

describe("ConversationOwnerPickerDialog", () => {
  it("renders dialog with role=alertdialog", () => {
    mountDialog();
    expect(q('[role="alertdialog"]')).not.toBeNull();
  });

  it("renders title for assign when no currentOwnerUserId", () => {
    mountDialog();
    const title = q(".owner-picker__title");
    expect(title).not.toBeNull();
    expect(title!.textContent!.trim()).toBeTruthy();
  });

  it("renders title for reassign when currentOwnerUserId is provided", () => {
    mountDialog({ currentOwnerUserId: USER_A });
    const title = q(".owner-picker__title");
    expect(title).not.toBeNull();
    expect(title!.textContent!.trim()).toBeTruthy();
  });

  it("pre-selects currentOwnerUserId when provided", () => {
    mountDialog({ currentOwnerUserId: USER_A });
    const select = q(".owner-picker__select") as HTMLSelectElement;
    expect(select.value).toBe(USER_A);
  });

  it("defaults to first user option when currentOwnerUserId is not provided", () => {
    mountDialog();
    const select = q(".owner-picker__select") as HTMLSelectElement;
    expect(select.value).toBe(USER_A);
  });

  it("emits pick with selected userId when confirm is clicked", async () => {
    const wrapper = mountDialog({ currentOwnerUserId: USER_B });
    const buttons = qAll(".owner-picker__actions button");
    const confirmBtn = buttons[buttons.length - 1];
    confirmBtn.click();
    await wrapper.vm.$nextTick();
    const events = wrapper.emitted("pick");
    expect(events).toBeTruthy();
    expect(events![0][0]).toBe(USER_B);
  });

  it("emits pick with changed selection", async () => {
    const wrapper = mountDialog({ currentOwnerUserId: USER_A });
    const select = q(".owner-picker__select") as HTMLSelectElement;
    select.value = USER_B;
    select.dispatchEvent(new Event("change"));
    await wrapper.vm.$nextTick();

    const buttons = qAll(".owner-picker__actions button");
    buttons[buttons.length - 1].click();
    await wrapper.vm.$nextTick();

    const events = wrapper.emitted("pick");
    expect(events).toBeTruthy();
    expect(events![0][0]).toBe(USER_B);
  });

  it("emits close when cancel is clicked", async () => {
    const wrapper = mountDialog();
    const buttons = qAll(".owner-picker__actions button");
    buttons[0].click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits close when backdrop is clicked", async () => {
    const wrapper = mountDialog();
    const backdrop = q(".owner-picker__backdrop") as HTMLElement;
    backdrop.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("disables confirm button when no user is selected", () => {
    registerUserAliases([]);
    const wrapper = mount(ConversationOwnerPickerDialog, {
      global: { plugins: [i18n] },
      props: {},
      attachTo: document.body,
    });
    const buttons = qAll(".owner-picker__actions button");
    const confirmBtn = buttons[buttons.length - 1] as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
    wrapper.unmount();
  });

  it("renders user options in the select dropdown", () => {
    mountDialog();
    const options = qAll(".owner-picker__select option");
    expect(options.length).toBe(2);
    expect(options[0].textContent!.trim()).toBe("Suzuki Taro");
    expect(options[1].textContent!.trim()).toBe("Tanaka Hanako");
  });
});
