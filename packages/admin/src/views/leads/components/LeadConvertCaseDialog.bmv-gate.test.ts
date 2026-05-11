import { describe, expect, it, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import {
  registerUserAliases,
  clearUserAliases,
} from "../../../shared/model/useOrgUserOptions";
import LeadConvertCaseDialog from "./LeadConvertCaseDialog.vue";
import type { LeadConvertCaseFailure } from "../model/useLeadDetailModel";

const TEST_USER_ID = "00000000-0000-4000-8000-00000000000a";

let cleanup: (() => void) | null = null;

function q(selector: string): HTMLElement | null {
  return document.body.querySelector(selector);
}

function qAll(selector: string): NodeListOf<HTMLElement> {
  return document.body.querySelectorAll(selector);
}

function mountDialog(props: Record<string, unknown> = {}) {
  registerUserAliases([{ id: TEST_USER_ID, displayName: "Local Admin" }]);
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

describe("LeadConvertCaseDialog — inline error rendering (R2-B-5)", () => {
  it("does NOT render any error block when error is null", () => {
    mountDialog({ error: null });
    expect(q("[data-testid='bmv-gate-blocker-list']")).toBeNull();
    expect(q("[data-testid='convert-case-dialog-error']")).toBeNull();
  });

  it("renders BmvGateBlockerList with one item per distinct blocker code", async () => {
    const error: LeadConvertCaseFailure = {
      kind: "bmvGate",
      serverErrorCode: "CASE_BMV_GATE_BLOCKED",
      blockers: [
        { code: "BMV_QUESTIONNAIRE_NOT_RETURNED" },
        { code: "BMV_QUOTE_NOT_CONFIRMED" },
        { code: "BMV_NOT_SIGNED" },
        { code: "BMV_INTAKE_NOT_READY" },
      ],
    };
    mountDialog({ error });

    const list = q("[data-testid='bmv-gate-blocker-list']");
    expect(list).not.toBeNull();
    expect(list?.getAttribute("role")).toBe("alert");
    expect(list?.getAttribute("aria-live")).toBe("assertive");

    const items = qAll(".bmv-gate-blocker-list__item");
    expect(items.length).toBe(4);
    for (const item of items) {
      expect(item.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      expect(item.textContent).not.toContain("leads.errors.bmvGate.");
    }
  });

  it("renders generic inline error message when error.kind = generic", () => {
    const error: LeadConvertCaseFailure = {
      kind: "generic",
      messageKey: "leads.errors.convertCaseFailed",
    };
    mountDialog({ error });

    const generic = q("[data-testid='convert-case-dialog-error']");
    expect(generic).not.toBeNull();
    expect(generic?.getAttribute("role")).toBe("alert");
    expect(generic?.getAttribute("aria-live")).toBe("assertive");
    expect(generic?.textContent?.trim().length).toBeGreaterThan(0);

    expect(q("[data-testid='bmv-gate-blocker-list']")).toBeNull();
  });

  it("does NOT emit close when an error is present (dialog stays open)", async () => {
    const error: LeadConvertCaseFailure = {
      kind: "bmvGate",
      serverErrorCode: "CASE_BMV_GATE_BLOCKED",
      blockers: [{ code: "BMV_NOT_SIGNED" }],
    };
    const wrapper = mountDialog({ error });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeFalsy();
  });

  it("still allows the user to dismiss the dialog via the cancel button", async () => {
    const error: LeadConvertCaseFailure = {
      kind: "bmvGate",
      serverErrorCode: "CASE_BMV_GATE_BLOCKED",
      blockers: [{ code: "BMV_NOT_SIGNED" }],
    };
    const wrapper = mountDialog({ error });
    const buttons = qAll(".convert-case-dialog__actions button");
    buttons[0].click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits clearError when case type changes after a BMV gate failure", async () => {
    const error: LeadConvertCaseFailure = {
      kind: "bmvGate",
      serverErrorCode: "CASE_BMV_GATE_BLOCKED",
      blockers: [{ code: "BMV_NOT_SIGNED" }],
    };
    const wrapper = mountDialog({
      ownerUserId: TEST_USER_ID,
      intendedCaseType: "business-management-visa",
      error,
    });
    await wrapper.vm.$nextTick();

    const select = document.body.querySelector(
      "#convert-case-type",
    ) as HTMLSelectElement;
    select.value = "dependent_visa";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("clearError")).toBeTruthy();
  });

  it("shows BMV recovery deep-link when convertedCustomerId is provided", () => {
    const error: LeadConvertCaseFailure = {
      kind: "bmvGate",
      serverErrorCode: "CASE_BMV_GATE_BLOCKED",
      blockers: [{ code: "BMV_NOT_SIGNED" }],
    };
    mountDialog({
      error,
      convertedCustomerId: "cust-resume-01",
      ownerUserId: TEST_USER_ID,
    });

    const link = q("[data-testid='bmv-gate-recovery-link']");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toContain("cust-resume-01");
    expect(link?.getAttribute("href")).toContain("#/customers/");
  });

  it("主按钮在必填项满足但未清除门禁错误时应保持禁用，清除 error 后方可提交", async () => {
    const error: LeadConvertCaseFailure = {
      kind: "bmvGate",
      serverErrorCode: "CASE_BMV_GATE_BLOCKED",
      blockers: [{ code: "BMV_NOT_SIGNED" }],
    };
    const wrapper = mountDialog({
      ownerUserId: TEST_USER_ID,
      intendedCaseType: "business-management-visa",
      error,
    });
    await wrapper.vm.$nextTick();

    const buttons = qAll(".convert-case-dialog__actions button");
    const confirmBtn = buttons[buttons.length - 1] as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
    confirmBtn.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("confirm")).toBeFalsy();

    await wrapper.setProps({ error: null });
    await wrapper.vm.$nextTick();

    expect(confirmBtn.disabled).toBe(false);
    confirmBtn.click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("confirm")).toBeTruthy();
  });
});
