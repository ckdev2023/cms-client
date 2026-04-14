import { describe, expect, it } from "vitest";
import {
  detectDuplicates,
  useCasePartyPicker,
  type UseCasePartyPickerDeps,
} from "./useCasePartyPicker";
import { SAMPLE_CREATE_CUSTOMERS } from "../fixtures";

const FIXED_ID = "test-new-id";
const FIXED_NOW = "2026-04-14T00:00:00.000Z";

function createPicker(
  customers: readonly (typeof SAMPLE_CREATE_CUSTOMERS)[number][] = SAMPLE_CREATE_CUSTOMERS,
) {
  const deps: UseCasePartyPickerDeps = {
    existingCustomers: () => customers,
    generateId: () => FIXED_ID,
    now: () => FIXED_NOW,
  };
  return useCasePartyPicker(deps);
}

function fillValidForm(
  picker: ReturnType<typeof createPicker>,
  overrides: Partial<{
    name: string;
    role: string;
    groupId: string;
    phone: string;
    email: string;
  }> = {},
) {
  picker.setField("name", overrides.name ?? "New Person");
  picker.setField("role", overrides.role ?? "主申请人");
  picker.setField("groupId", overrides.groupId ?? "tokyo-1");
  if (overrides.phone !== undefined) {
    picker.setField("phone", overrides.phone);
  } else if (overrides.email !== undefined) {
    picker.setField("email", overrides.email);
  } else {
    picker.setField("phone", "090-0000-0000");
  }
}

// ─── detectDuplicates (pure) ────────────────────────────────

describe("detectDuplicates", () => {
  it("returns empty when no contact provided", () => {
    expect(detectDuplicates(SAMPLE_CREATE_CUSTOMERS, "", "")).toEqual([]);
  });

  it("detects duplicate by phone substring", () => {
    const hits = detectDuplicates(SAMPLE_CREATE_CUSTOMERS, "080-1111-2222", "");
    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe("cust-001");
  });

  it("detects duplicate by email substring", () => {
    const hits = detectDuplicates(
      SAMPLE_CREATE_CUSTOMERS,
      "",
      "chen.mei@email.com",
    );
    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe("cust-002");
  });

  it("is case insensitive", () => {
    const hits = detectDuplicates(
      SAMPLE_CREATE_CUSTOMERS,
      "",
      "LI.NA@EMAIL.COM",
    );
    expect(hits).toHaveLength(1);
  });

  it("returns empty on no match", () => {
    expect(
      detectDuplicates(SAMPLE_CREATE_CUSTOMERS, "999-9999-9999", ""),
    ).toEqual([]);
  });
});

// ─── useCasePartyPicker ─────────────────────────────────────

describe("useCasePartyPicker", () => {
  describe("initial state", () => {
    it("starts closed", () => {
      expect(createPicker().isOpen.value).toBe(false);
    });

    it("has null lastResult", () => {
      expect(createPicker().lastResult.value).toBeNull();
    });
  });

  // ─── Open / Close ─────────────────────────────────────────

  describe("open / close", () => {
    it("opens in primary mode", () => {
      const p = createPicker();
      p.open("primary");
      expect(p.isOpen.value).toBe(true);
      expect(p.mode.value).toBe("primary");
    });

    it("opens in related mode", () => {
      const p = createPicker();
      p.open("related");
      expect(p.mode.value).toBe("related");
    });

    it("resets form on open", () => {
      const p = createPicker();
      p.open("primary");
      p.setField("name", "Test");
      p.close();
      p.open("related");
      expect(p.form.name).toBe("");
    });

    it("resets duplicate state on open", () => {
      const p = createPicker();
      p.open("primary");
      fillValidForm(p, { phone: "080-1111-2222" });
      p.attemptSave();
      expect(p.showDuplicateConfirmation.value).toBe(true);
      p.close();
      p.open("primary");
      expect(p.showDuplicateConfirmation.value).toBe(false);
      expect(p.duplicateHits.value).toHaveLength(0);
    });

    it("closes modal", () => {
      const p = createPicker();
      p.open("primary");
      p.close();
      expect(p.isOpen.value).toBe(false);
    });
  });

  // ─── Validation ───────────────────────────────────────────

  describe("validation", () => {
    it("requires name", () => {
      const p = createPicker();
      p.open("primary");
      expect(p.formErrors.value.name).toBeTruthy();
    });

    it("requires role", () => {
      const p = createPicker();
      p.open("primary");
      expect(p.formErrors.value.role).toBeTruthy();
    });

    it("requires groupId", () => {
      const p = createPicker();
      p.open("primary");
      expect(p.formErrors.value.groupId).toBeTruthy();
    });

    it("requires at least phone or email", () => {
      const p = createPicker();
      p.open("primary");
      expect(p.formErrors.value.phone).toBeTruthy();
      expect(p.formErrors.value.email).toBeTruthy();
    });

    it("passes with phone only", () => {
      const p = createPicker();
      p.open("primary");
      fillValidForm(p, { phone: "080-1234-5678" });
      expect(p.isFormValid.value).toBe(true);
      expect(p.formErrors.value.phone).toBeUndefined();
    });

    it("passes with email only", () => {
      const p = createPicker();
      p.open("primary");
      fillValidForm(p, { email: "test@example.com" });
      expect(p.isFormValid.value).toBe(true);
      expect(p.formErrors.value.email).toBeUndefined();
    });

    it("canSave is false when form is invalid", () => {
      const p = createPicker();
      p.open("primary");
      expect(p.canSave.value).toBe(false);
    });

    it("canSave is true when form is valid and no duplicates", () => {
      const p = createPicker();
      p.open("primary");
      fillValidForm(p);
      expect(p.canSave.value).toBe(true);
    });
  });

  // ─── Duplicate detection ──────────────────────────────────

  describe("duplicate detection", () => {
    it("enters duplicate confirmation on phone match", () => {
      const p = createPicker();
      p.open("primary");
      fillValidForm(p, { phone: "080-1111-2222" });

      const result = p.attemptSave();
      expect(result).toBeNull();
      expect(p.showDuplicateConfirmation.value).toBe(true);
      expect(p.duplicateHits.value).toHaveLength(1);
      expect(p.duplicateHits.value[0].id).toBe("cust-001");
    });

    it("enters duplicate confirmation on email match", () => {
      const p = createPicker();
      p.open("primary");
      fillValidForm(p, { email: "li.na@email.com" });

      expect(p.attemptSave()).toBeNull();
      expect(p.showDuplicateConfirmation.value).toBe(true);
    });

    it("canSave requires reason in duplicate confirmation", () => {
      const p = createPicker();
      p.open("primary");
      fillValidForm(p, { phone: "080-1111-2222" });
      p.attemptSave();

      expect(p.canSave.value).toBe(false);
      p.setConfirmReason("确认需要创建新客户");
      expect(p.canSave.value).toBe(true);
    });

    it("saves with duplicate confirmation and records audit", () => {
      const p = createPicker();
      p.open("primary");
      fillValidForm(p, { phone: "080-1111-2222" });

      p.attemptSave();
      p.setConfirmReason("客户确认为不同人");

      const result = p.attemptSave();
      expect(result).toBeTruthy();
      expect(result!.duplicateConfirmation).toBeTruthy();
      expect(result!.duplicateConfirmation!.reason).toBe("客户确认为不同人");
      expect(result!.duplicateConfirmation!.confirmedAt).toBe(FIXED_NOW);
      expect(result!.duplicateConfirmation!.hits).toHaveLength(1);
    });

    it("resets duplicate state when phone changes", () => {
      const p = createPicker();
      p.open("primary");
      fillValidForm(p, { phone: "080-1111-2222" });
      p.attemptSave();
      expect(p.showDuplicateConfirmation.value).toBe(true);

      p.setField("phone", "090-9999-9999");
      expect(p.showDuplicateConfirmation.value).toBe(false);
      expect(p.duplicateHits.value).toHaveLength(0);
      expect(p.confirmReason.value).toBe("");
    });

    it("resets duplicate state when email changes", () => {
      const p = createPicker();
      p.open("primary");
      fillValidForm(p, { email: "li.na@email.com" });
      p.attemptSave();
      expect(p.showDuplicateConfirmation.value).toBe(true);

      p.setField("email", "other@example.com");
      expect(p.showDuplicateConfirmation.value).toBe(false);
    });

    it("blocks save when in confirmation but no reason", () => {
      const p = createPicker();
      p.open("primary");
      fillValidForm(p, { phone: "080-1111-2222" });
      p.attemptSave();
      expect(p.attemptSave()).toBeNull();
    });
  });

  // ─── attemptSave (success) ────────────────────────────────

  describe("attemptSave", () => {
    it("returns null when form is invalid", () => {
      const p = createPicker();
      p.open("primary");
      expect(p.attemptSave()).toBeNull();
    });

    it("creates customer and closes modal", () => {
      const p = createPicker();
      p.open("primary");
      fillValidForm(p);

      const result = p.attemptSave();
      expect(result).toBeTruthy();
      expect(result!.customer.id).toBe(FIXED_ID);
      expect(result!.customer.name).toBe("New Person");
      expect(result!.customer.group).toBe("tokyo-1");
      expect(result!.customer.groupLabel).toBe("东京一组");
      expect(result!.mode).toBe("primary");
      expect(result!.isNewlyCreated).toBe(true);
      expect(result!.duplicateConfirmation).toBeNull();
      expect(p.isOpen.value).toBe(false);
    });

    it("formats contact from phone and email", () => {
      const p = createPicker();
      p.open("primary");
      fillValidForm(p);
      p.setField("phone", "090-1234");
      p.setField("email", "a@b.com");

      const result = p.attemptSave();
      expect(result!.customer.contact).toBe("090-1234 / a@b.com");
    });

    it("preserves mode in result", () => {
      const p = createPicker();
      p.open("related");
      fillValidForm(p);
      expect(p.attemptSave()!.mode).toBe("related");
    });
  });

  // ─── selectExisting ───────────────────────────────────────

  describe("selectExisting", () => {
    it("returns existing customer and closes modal", () => {
      const p = createPicker();
      p.open("primary");

      const result = p.selectExisting(SAMPLE_CREATE_CUSTOMERS[0]);
      expect(result.customer).toEqual(SAMPLE_CREATE_CUSTOMERS[0]);
      expect(result.isNewlyCreated).toBe(false);
      expect(result.duplicateConfirmation).toBeNull();
      expect(p.isOpen.value).toBe(false);
    });

    it("preserves mode in result", () => {
      const p = createPicker();
      p.open("related");

      const result = p.selectExisting(SAMPLE_CREATE_CUSTOMERS[1]);
      expect(result.mode).toBe("related");
    });
  });

  // ─── lastResult ───────────────────────────────────────────

  describe("lastResult", () => {
    it("tracks last save result", () => {
      const p = createPicker();
      p.open("primary");
      fillValidForm(p);
      p.attemptSave();

      expect(p.lastResult.value).toBeTruthy();
      expect(p.lastResult.value!.customer.name).toBe("New Person");
    });

    it("tracks last selectExisting result", () => {
      const p = createPicker();
      p.open("primary");
      p.selectExisting(SAMPLE_CREATE_CUSTOMERS[0]);

      expect(p.lastResult.value).toBeTruthy();
      expect(p.lastResult.value!.customer.id).toBe("cust-001");
    });

    it("resets on open", () => {
      const p = createPicker();
      p.open("primary");
      fillValidForm(p);
      p.attemptSave();
      expect(p.lastResult.value).toBeTruthy();

      p.open("related");
      expect(p.lastResult.value).toBeNull();
    });
  });
});
