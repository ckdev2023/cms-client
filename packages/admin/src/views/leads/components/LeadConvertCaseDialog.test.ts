import { describe, expect, it, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import {
  registerUserAliases,
  clearUserAliases,
} from "../../../shared/model/useOrgUserOptions";
import {
  registerGroupAliases,
  clearGroupAliases,
} from "../../../shared/model/useGroupOptions";
import LeadConvertCaseDialog from "./LeadConvertCaseDialog.vue";

const TEST_USER_ID = "00000000-0000-4000-8000-00000000000a";
const TEST_GROUP_ID = "grp-01";
const TEST_GROUP_ID_2 = "grp-nagoya";

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
  registerGroupAliases([
    { id: TEST_GROUP_ID, name: "Tokyo Team A" },
    { id: TEST_GROUP_ID_2, name: "Nagoya Branch" },
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
  clearGroupAliases();
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
    mountDialog({ groupId: TEST_GROUP_ID });
    const selects = qAll(".convert-case-dialog__select");
    const groupSelect = selects[2] as HTMLSelectElement;
    expect(groupSelect.value).toBe(TEST_GROUP_ID);
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
      groupId: TEST_GROUP_ID,
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
    expect(payload.groupId).toBe(TEST_GROUP_ID);
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

  it("group select renders fetched options and binds form.groupId", () => {
    mountDialog({ groupId: TEST_GROUP_ID });
    const groupSelect = q("#convert-case-group") as HTMLSelectElement;
    expect(groupSelect).not.toBeNull();
    expect(groupSelect.tagName).toBe("SELECT");

    const options = groupSelect.querySelectorAll("option");
    expect(options.length).toBe(3);
    expect(options[0].value).toBe("");
    expect(options[1].value).toBe(TEST_GROUP_ID);
    expect(options[1].textContent?.trim()).toBe("Tokyo Team A");
    expect(options[2].value).toBe(TEST_GROUP_ID_2);
    expect(options[2].textContent?.trim()).toBe("Nagoya Branch");

    expect(groupSelect.value).toBe(TEST_GROUP_ID);
  });

  it("syncs ownerUserId from prop update when form is not dirty", async () => {
    const wrapper = mountDialog({ ownerUserId: "" });
    await wrapper.vm.$nextTick();

    const ownerSelect = q("#convert-case-owner") as HTMLSelectElement;
    expect(ownerSelect.value).toBe("");

    await wrapper.setProps({ ownerUserId: TEST_USER_ID });
    await wrapper.vm.$nextTick();

    expect(ownerSelect.value).toBe(TEST_USER_ID);
  });

  it("does not overwrite ownerUserId after user interaction", async () => {
    const wrapper = mountDialog({ ownerUserId: "" });
    await wrapper.vm.$nextTick();

    const ownerSelect = q("#convert-case-owner") as HTMLSelectElement;
    const option = ownerSelect.querySelector(
      `option[value="${TEST_USER_ID}"]`,
    ) as HTMLOptionElement;
    option.selected = true;
    ownerSelect.dispatchEvent(new Event("change"));
    await wrapper.vm.$nextTick();

    await wrapper.setProps({ ownerUserId: "user-2" });
    await wrapper.vm.$nextTick();

    expect(ownerSelect.value).toBe(TEST_USER_ID);
  });

  it("blocks confirm when caseType is set but ownerUserId is empty", async () => {
    const wrapper = mountDialog({
      intendedCaseType: "business-management-visa",
    });
    await wrapper.vm.$nextTick();

    const buttons = qAll(".convert-case-dialog__actions button");
    const confirmBtn = buttons[buttons.length - 1] as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);

    confirmBtn.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("confirm")).toBeFalsy();
  });
});
