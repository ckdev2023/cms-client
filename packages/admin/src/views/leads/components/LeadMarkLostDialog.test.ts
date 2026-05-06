import { describe, expect, it, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import LeadMarkLostDialog from "./LeadMarkLostDialog.vue";
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
    submitting: boolean;
    error: LeadMutationFailure | null;
  }> = {},
) {
  const wrapper = mount(LeadMarkLostDialog, {
    global: { plugins: [i18n] },
    props: {
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

describe("LeadMarkLostDialog (R2-B-4)", () => {
  it("renders dialog title and required reason field", () => {
    mountDialog();
    expect(q("[data-testid='lead-mark-lost-dialog']")).not.toBeNull();
    expect(q("[data-testid='lead-mark-lost-dialog-reason']")).not.toBeNull();
  });

  it("disables confirm button until reason is filled (lostReason required)", () => {
    mountDialog();
    const btn = q(
      "[data-testid='lead-mark-lost-dialog-confirm']",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("disables confirm when reason is only whitespace", async () => {
    const wrapper = mountDialog();
    const textarea = q(
      "[data-testid='lead-mark-lost-dialog-reason']",
    ) as HTMLTextAreaElement;
    textarea.value = "   ";
    textarea.dispatchEvent(new Event("input"));
    await wrapper.vm.$nextTick();

    const btn = q(
      "[data-testid='lead-mark-lost-dialog-confirm']",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("emits confirm with trimmed reason string when filled", async () => {
    const wrapper = mountDialog();
    const textarea = q(
      "[data-testid='lead-mark-lost-dialog-reason']",
    ) as HTMLTextAreaElement;
    textarea.value = "  客户已签约竞品  ";
    textarea.dispatchEvent(new Event("input"));
    await wrapper.vm.$nextTick();

    const btn = q(
      "[data-testid='lead-mark-lost-dialog-confirm']",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    btn.click();
    await wrapper.vm.$nextTick();

    const emitted = wrapper.emitted("confirm");
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toBe("客户已签约竞品");
  });

  it("renders inline error block when error prop is provided", () => {
    const error: LeadMutationFailure = {
      kind: "generic",
      messageKey: "leads.errors.markLostFailed",
    };
    mountDialog({ error });
    const errorBox = q("[data-testid='lead-mark-lost-dialog-error']");
    expect(errorBox).not.toBeNull();
    expect(errorBox?.getAttribute("role")).toBe("alert");
    expect((errorBox?.textContent ?? "").trim().length).toBeGreaterThan(0);
  });

  it("emits close on cancel click", async () => {
    const wrapper = mountDialog();
    const buttons = qAll(".lead-mark-lost-dialog__actions button");
    buttons[0].click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits close on backdrop click", async () => {
    const wrapper = mountDialog();
    const backdrop = q(".lead-mark-lost-backdrop") as HTMLElement;
    backdrop.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("disables confirm when submitting=true", async () => {
    const wrapper = mountDialog({ submitting: true });
    const textarea = q(
      "[data-testid='lead-mark-lost-dialog-reason']",
    ) as HTMLTextAreaElement;
    textarea.value = "客户失联";
    textarea.dispatchEvent(new Event("input"));
    await wrapper.vm.$nextTick();

    const btn = q(
      "[data-testid='lead-mark-lost-dialog-confirm']",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
