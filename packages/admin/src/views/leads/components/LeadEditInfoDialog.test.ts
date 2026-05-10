import { describe, expect, it, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import LeadEditInfoDialog from "./LeadEditInfoDialog.vue";
import type { LeadDetail, OwnerOption, SelectOption } from "../types";
import type { LeadMutationFailure } from "../model/useLeadDetailModel";

let cleanup: (() => void) | null = null;

function q(selector: string): HTMLElement | null {
  return document.body.querySelector(selector);
}

function qAll(selector: string): NodeListOf<HTMLElement> {
  return document.body.querySelectorAll(selector);
}

const OWNER_OPTIONS: OwnerOption[] = [
  {
    value: "00000000-0000-4000-8000-000000000011",
    label: "Local Admin",
    initials: "LA",
    avatarClass: "bg-sky-100 text-sky-700",
  },
];

const GROUP_OPTIONS: SelectOption[] = [
  { value: "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c", label: "tokyo-1" },
];

const BASE_LEAD: LeadDetail = {
  id: "LEAD-TEST",
  name: "李华",
  status: "following",
  ownerId: "00000000-0000-4000-8000-000000000011",
  ownerLabel: "Local Admin",
  ownerInitials: "LA",
  ownerAvatarClass: "bg-sky-100 text-sky-700",
  groupId: "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c",
  groupLabel: "tokyo-1",
  intendedCaseType: "family-stay",
  banner: null,
  buttons: "normal",
  readonly: false,
  conversationId: null,
  info: {
    id: "LEAD-TEST",
    leadNo: "",
    name: "李华",
    phone: "080-2222-3333",
    email: "li.hua@example.com",
    source: "referral",
    createdVia: "admin",
    referrer: "佐藤弁護士",
    businessType: "family-stay",
    group: "tokyo-1",
    owner: "Local Admin",
    language: "zh",
    note: "配偶在日永住者",
  },
  followups: [],
  conversion: {
    dedupResult: null,
    convertedCustomer: null,
    convertedCase: null,
    conversions: [],
  },
  log: [],
};

function mountDialog(
  props: Partial<{
    lead: LeadDetail;
    ownerOptions: OwnerOption[];
    groupOptions: SelectOption[];
    submitting: boolean;
    error: LeadMutationFailure | null;
  }> = {},
) {
  const wrapper = mount(LeadEditInfoDialog, {
    global: { plugins: [i18n] },
    props: {
      lead: props.lead ?? BASE_LEAD,
      ownerOptions: props.ownerOptions ?? OWNER_OPTIONS,
      groupOptions: props.groupOptions ?? GROUP_OPTIONS,
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

describe("LeadEditInfoDialog (R2-B-4)", () => {
  it("renders the dialog with title", () => {
    mountDialog();
    expect(q("[data-testid='lead-edit-info-dialog']")).not.toBeNull();
    expect(q(".lead-edit-dialog__title")).not.toBeNull();
  });

  it("pre-fills name from lead.info", () => {
    mountDialog();
    const nameInput = q(
      "[data-testid='lead-edit-info-dialog-name']",
    ) as HTMLInputElement;
    expect(nameInput.value).toBe("李华");
  });

  it("pre-fills owner select from lead.ownerId (real UUID, not catalog short code)", () => {
    mountDialog();
    const ownerSelect = q(
      "[data-testid='lead-edit-info-dialog-owner']",
    ) as HTMLSelectElement;
    expect(ownerSelect.value).toBe("00000000-0000-4000-8000-000000000011");
  });

  it("pre-fills group select from lead.groupId (real UUID, not catalog short code)", () => {
    mountDialog();
    const groupSelect = q(
      "[data-testid='lead-edit-info-dialog-group']",
    ) as HTMLSelectElement;
    expect(groupSelect.value).toBe("ef21fdd2-1ffc-4a27-8b47-a640d6bd021c");
  });

  it("disables confirm when no fields are changed", () => {
    mountDialog();
    const btn = q(
      "[data-testid='lead-edit-info-dialog-confirm']",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("disables confirm when name is cleared", async () => {
    const wrapper = mountDialog();
    const nameInput = q(
      "[data-testid='lead-edit-info-dialog-name']",
    ) as HTMLInputElement;
    nameInput.value = "";
    nameInput.dispatchEvent(new Event("input"));
    await wrapper.vm.$nextTick();

    const btn = q(
      "[data-testid='lead-edit-info-dialog-confirm']",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("emits confirm with only changed fields (patch semantics)", async () => {
    const wrapper = mountDialog();
    const nameInput = q(
      "[data-testid='lead-edit-info-dialog-name']",
    ) as HTMLInputElement;
    nameInput.value = "李华改名";
    nameInput.dispatchEvent(new Event("input"));
    await wrapper.vm.$nextTick();

    const confirmBtn = q(
      "[data-testid='lead-edit-info-dialog-confirm']",
    ) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);
    confirmBtn.click();
    await wrapper.vm.$nextTick();

    const emitted = wrapper.emitted("confirm");
    expect(emitted).toBeTruthy();
    const payload = emitted![0][0] as Record<string, unknown>;
    expect(payload).toEqual({ name: "李华改名" });
  });

  it("emits confirm with null when group is cleared (explicit unset)", async () => {
    const wrapper = mountDialog();
    const groupSelect = q(
      "[data-testid='lead-edit-info-dialog-group']",
    ) as HTMLSelectElement;
    groupSelect.value = "";
    groupSelect.dispatchEvent(new Event("change"));
    await wrapper.vm.$nextTick();

    const confirmBtn = q(
      "[data-testid='lead-edit-info-dialog-confirm']",
    ) as HTMLButtonElement;
    confirmBtn.click();
    await wrapper.vm.$nextTick();

    const emitted = wrapper.emitted("confirm");
    expect(emitted).toBeTruthy();
    const payload = emitted![0][0] as Record<string, unknown>;
    expect(payload).toEqual({ groupId: null });
  });

  it("renders inline error block when error prop is provided", () => {
    const error: LeadMutationFailure = {
      kind: "generic",
      messageKey: "leads.errors.updateFailed",
    };
    mountDialog({ error });
    const errorBox = q("[data-testid='lead-edit-info-dialog-error']");
    expect(errorBox).not.toBeNull();
    expect(errorBox?.getAttribute("role")).toBe("alert");
    expect(errorBox?.getAttribute("aria-live")).toBe("assertive");
    expect((errorBox?.textContent ?? "").trim().length).toBeGreaterThan(0);
  });

  it("emits close on cancel click", async () => {
    const wrapper = mountDialog();
    const buttons = qAll(".lead-edit-dialog__actions button");
    buttons[0].click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits close on backdrop click", async () => {
    const wrapper = mountDialog();
    const backdrop = q(".lead-edit-backdrop") as HTMLElement;
    backdrop.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("disables confirm when submitting=true", async () => {
    mountDialog({ submitting: true });
    const btn = q(
      "[data-testid='lead-edit-info-dialog-confirm']",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("pre-fills source dropdown with sourceChannel value for admin-created lead (R3-D-2)", () => {
    const lead: LeadDetail = {
      ...BASE_LEAD,
      info: {
        ...BASE_LEAD.info,
        source: "web",
        createdVia: "admin",
      },
    };
    mountDialog({ lead });
    const sourceSelect = q(
      "select[name='leadEditInfo.source']",
    ) as HTMLSelectElement;
    expect(sourceSelect.value).toBe("web");
  });

  it("pre-fills businessType dropdown when intendedCaseType is canonical kebab-case", () => {
    mountDialog({
      lead: { ...BASE_LEAD, intendedCaseType: "family-stay" },
    });
    const sel = q(
      "select[name='leadEditInfo.businessType']",
    ) as HTMLSelectElement;
    expect(sel.value).toBe("family-stay");
  });

  it("pre-fills businessType dropdown when intendedCaseType is legacy snake_case (family_stay)", () => {
    mountDialog({
      lead: { ...BASE_LEAD, intendedCaseType: "family_stay" },
    });
    const sel = q(
      "select[name='leadEditInfo.businessType']",
    ) as HTMLSelectElement;
    expect(sel.value).toBe("family-stay");
  });

  it("emits close on Escape key (modal keyboard a11y)", async () => {
    const wrapper = mountDialog();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("does NOT emit close on Escape while submitting (prevent accidental abort)", async () => {
    const wrapper = mountDialog({ submitting: true });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close")).toBeFalsy();
  });
});
