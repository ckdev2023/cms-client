import { describe, expect, it, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import LeadChangeStatusDialog from "./LeadChangeStatusDialog.vue";
import type { LeadStatus } from "../types";
import type { LeadMutationFailure } from "../model/useLeadDetailModel";

let cleanup: (() => void) | null = null;

function q(selector: string): HTMLElement | null {
  return document.body.querySelector(selector);
}

function qAll(selector: string): NodeListOf<HTMLElement> {
  return document.body.querySelectorAll(selector);
}

function mountDialog(
  props: Partial<{
    currentStatus: LeadStatus;
    submitting: boolean;
    error: LeadMutationFailure | null;
  }> = {},
) {
  const wrapper = mount(LeadChangeStatusDialog, {
    global: { plugins: [i18n] },
    props: {
      currentStatus: props.currentStatus ?? "following",
      submitting: props.submitting ?? false,
      error: props.error ?? null,
    },
    attachTo: document.body,
  });
  cleanup = () => wrapper.unmount();
  return wrapper;
}

afterEach(() => {
  cleanup?.();
  cleanup = null;
});

describe("LeadChangeStatusDialog (R2-B-4)", () => {
  it("renders dialog title", () => {
    mountDialog();
    expect(q("[data-testid='lead-change-status-dialog']")).not.toBeNull();
  });

  it("populates options from LEAD_STATUS_TRANSITIONS, excluding lost", () => {
    mountDialog({ currentStatus: "following" });
    const select = q(
      "[data-testid='lead-change-status-dialog-select']",
    ) as HTMLSelectElement;
    const values = Array.from(select.options)
      .map((o) => o.value)
      .filter((v) => v !== "");
    expect(values).toContain("pending_sign");
    expect(values).not.toContain("lost");
    expect(values).not.toContain("converted_case");
  });

  it("shows empty message and hides select when current status has no eligible transitions (converted_case)", () => {
    mountDialog({ currentStatus: "converted_case" });
    expect(q("[data-testid='lead-change-status-dialog-empty']")).not.toBeNull();
    expect(q("[data-testid='lead-change-status-dialog-select']")).toBeNull();
  });

  it("shows empty message when status=signed (signed -> only converted_case/lost which are filtered)", () => {
    mountDialog({ currentStatus: "signed" });
    expect(q("[data-testid='lead-change-status-dialog-empty']")).not.toBeNull();
    expect(q("[data-testid='lead-change-status-dialog-select']")).toBeNull();
  });

  it("disables confirm button until a status is chosen", () => {
    mountDialog({ currentStatus: "following" });
    const btn = q(
      "[data-testid='lead-change-status-dialog-confirm']",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("emits confirm with toStatus when a status is chosen and confirm clicked", async () => {
    const wrapper = mountDialog({ currentStatus: "new" });
    const select = q(
      "[data-testid='lead-change-status-dialog-select']",
    ) as HTMLSelectElement;
    select.value = "following";
    select.dispatchEvent(new Event("change"));
    await wrapper.vm.$nextTick();

    const btn = q(
      "[data-testid='lead-change-status-dialog-confirm']",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    btn.click();
    await wrapper.vm.$nextTick();

    const emitted = wrapper.emitted("confirm");
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toEqual({ toStatus: "following" });
  });

  it("renders inline error block when error prop is provided", () => {
    const error: LeadMutationFailure = {
      kind: "generic",
      messageKey: "leads.errors.transitionFailed",
    };
    mountDialog({ currentStatus: "following", error });
    const errorBox = q("[data-testid='lead-change-status-dialog-error']");
    expect(errorBox).not.toBeNull();
    expect(errorBox?.getAttribute("role")).toBe("alert");
    expect((errorBox?.textContent ?? "").trim().length).toBeGreaterThan(0);
  });

  it("emits close on cancel click", async () => {
    const wrapper = mountDialog();
    const buttons = qAll(".lead-change-status-dialog__actions button");
    buttons[0].click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits close on backdrop click", async () => {
    const wrapper = mountDialog();
    const backdrop = q(".lead-change-status-backdrop") as HTMLElement;
    backdrop.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("disables confirm when submitting=true", async () => {
    const wrapper = mountDialog({
      currentStatus: "new",
      submitting: true,
    });
    const select = q(
      "[data-testid='lead-change-status-dialog-select']",
    ) as HTMLSelectElement;
    select.value = "following";
    select.dispatchEvent(new Event("change"));
    await wrapper.vm.$nextTick();

    const btn = q(
      "[data-testid='lead-change-status-dialog-confirm']",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
