import { describe, expect, it, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import {
  registerUserAliases,
  clearUserAliases,
} from "../../../shared/model/useOrgUserOptions";
import LeadConvertCaseDialog from "./LeadConvertCaseDialog.vue";

const TEST_USER_ID = "00000000-0000-4000-8000-00000000000a";

let cleanup: (() => void) | null = null;

function q(selector: string): HTMLElement | null {
  return document.body.querySelector(selector);
}

function qAll(selector: string): NodeListOf<HTMLElement> {
  return document.body.querySelectorAll(selector);
}

function mountDialog(props: Record<string, unknown> = {}) {
  registerUserAliases([
    { id: TEST_USER_ID, displayName: "Suzuki Taro" },
    { id: "user-2", displayName: "Tanaka Hanako" },
  ]);
  const wrapper = mount(LeadConvertCaseDialog, {
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

describe("LeadConvertCaseDialog", () => {
  it("renders dialog title", () => {
    mountDialog();
    expect(q(".convert-case-dialog__title")).not.toBeNull();
  });

  it("renders confirm and cancel buttons", () => {
    mountDialog();
    const buttons = qAll(".convert-case-dialog__actions button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("emits close when cancel is clicked", async () => {
    const wrapper = mountDialog();
    const buttons = qAll(".convert-case-dialog__actions button");
    buttons[0].click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("confirm button is disabled when caseTypeCode and ownerUserId are empty", () => {
    mountDialog();
    const buttons = qAll(".convert-case-dialog__actions button");
    const confirmBtn = buttons[buttons.length - 1] as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  it("defaults ownerUserId from prop", () => {
    mountDialog({ ownerUserId: TEST_USER_ID });
    const selects = qAll(".convert-case-dialog__select");
    const ownerSelect = selects[1] as HTMLSelectElement;
    expect(ownerSelect.value).toBe(TEST_USER_ID);
  });

  it("resolves intendedCaseType to default caseTypeCode via businessType mapping", () => {
    mountDialog({ intendedCaseType: "business-management-visa" });
    const selects = qAll(".convert-case-dialog__select");
    const caseTypeSelect = selects[0] as HTMLSelectElement;
    expect(caseTypeSelect.value).toBe("business_manager_visa");
  });

  it("caseTypeCode defaults to empty when intendedCaseType is unrecognized", () => {
    mountDialog({ intendedCaseType: "unknown-type" });
    const selects = qAll(".convert-case-dialog__select");
    const caseTypeSelect = selects[0] as HTMLSelectElement;
    expect(caseTypeSelect.value).toBe("");
  });

  it("defaults groupId from prop", () => {
    mountDialog({ groupId: "group-123" });
    const input = q(".convert-case-dialog__input") as HTMLInputElement;
    expect(input.value).toBe("group-123");
  });

  it("disables confirm button when submitting=true", () => {
    mountDialog({ submitting: true });
    const buttons = qAll(".convert-case-dialog__actions button");
    const confirmBtn = buttons[buttons.length - 1] as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  it("emits close when backdrop is clicked", async () => {
    const wrapper = mountDialog();
    const backdrop = q(".convert-case-backdrop") as HTMLElement;
    backdrop.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits confirm with full payload when form is valid", async () => {
    const wrapper = mountDialog({
      ownerUserId: TEST_USER_ID,
      intendedCaseType: "business-management-visa",
      groupId: "grp-01",
    });
    await wrapper.vm.$nextTick();

    const buttons = qAll(".convert-case-dialog__actions button");
    const confirmBtn = buttons[buttons.length - 1] as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);

    confirmBtn.click();
    await wrapper.vm.$nextTick();

    const events = wrapper.emitted("confirm");
    expect(events).toBeTruthy();
    const payload = events![0][0] as Record<string, unknown>;
    expect(payload.caseTypeCode).toBe("business_manager_visa");
    expect(payload.ownerUserId).toBe(TEST_USER_ID);
    expect(payload.groupId).toBe("grp-01");
  });

  it("excludes groupId from payload when empty", async () => {
    const wrapper = mountDialog({
      ownerUserId: TEST_USER_ID,
      intendedCaseType: "business-management-visa",
    });
    await wrapper.vm.$nextTick();

    const buttons = qAll(".convert-case-dialog__actions button");
    const confirmBtn = buttons[buttons.length - 1] as HTMLButtonElement;
    confirmBtn.click();
    await wrapper.vm.$nextTick();

    const events = wrapper.emitted("confirm");
    expect(events).toBeTruthy();
    const payload = events![0][0] as Record<string, unknown>;
    expect(payload.groupId).toBeUndefined();
  });
});
