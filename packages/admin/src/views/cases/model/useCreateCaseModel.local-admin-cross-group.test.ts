import { describe, expect, it } from "vitest";
import {
  useCreateCaseModel,
  type UseCreateCaseModelDeps,
} from "./useCreateCaseModel";
import {
  SAMPLE_CREATE_CUSTOMERS,
  SAMPLE_CREATE_TEMPLATES,
  FAMILY_SCENARIO,
} from "../fixtures-create";
import { CASE_GROUP_OPTIONS, CASE_OWNER_OPTIONS } from "../constants";
import type { CaseOwnerOption } from "../types";

const LOCAL_ADMIN: CaseOwnerOption = {
  value: "admin-global",
  label: "Global Admin",
  initials: "GA",
  avatarClass: "bg-rose-100 text-rose-700",
  group: null,
};

const GROUPED_OWNER: CaseOwnerOption = {
  value: "suzuki",
  label: "Suzuki",
  initials: "S",
  avatarClass: "bg-sky-100 text-sky-700",
  group: "tokyo-1",
};

const ownersWithAdmin: readonly CaseOwnerOption[] = [
  ...CASE_OWNER_OPTIONS,
  LOCAL_ADMIN,
];

function createDeps(
  overrides: Partial<UseCreateCaseModelDeps> = {},
): UseCreateCaseModelDeps {
  return {
    templates: () => SAMPLE_CREATE_TEMPLATES,
    customers: () => SAMPLE_CREATE_CUSTOMERS,
    familyScenario: () => FAMILY_SCENARIO,
    ownerOptions: () => ownersWithAdmin,
    groupOptions: () => CASE_GROUP_OPTIONS,
    sourceContext: { familyBulkMode: false },
    defaultGroup: "tokyo-1",
    defaultOwner: "suzuki",
    ...overrides,
  };
}

function createModel(overrides: Partial<UseCreateCaseModelDeps> = {}) {
  return useCreateCaseModel(createDeps(overrides));
}

describe("BUG-203: Local Admin cross-group exemption", () => {
  it("grouped owner triggers needsGroupOverrideReason on cross-group", () => {
    const m = createModel({ defaultOwner: GROUPED_OWNER.value });
    m.setOwner(GROUPED_OWNER.value);
    m.setGroup("osaka");
    expect(m.isGroupOverridden.value).toBe(true);
    expect(m.needsGroupOverrideReason.value).toBe(true);
  });

  it("Local Admin (group=null) skips needsGroupOverrideReason even when group overridden", () => {
    const m = createModel({ defaultOwner: LOCAL_ADMIN.value });
    m.setOwner(LOCAL_ADMIN.value);
    m.setGroup("osaka");
    expect(m.isGroupOverridden.value).toBe(true);
    expect(m.needsGroupOverrideReason.value).toBe(false);
  });

  it("Local Admin can proceed step 3 without groupOverrideReason", () => {
    const m = createModel({ defaultOwner: LOCAL_ADMIN.value });
    m.setOwner(LOCAL_ADMIN.value);
    m.setGroup("osaka");
    m.setDueDate("2026-06-01");
    m.setAmount("100000");
    expect(m.canProceedStep3.value).toBe(true);
  });

  it("grouped owner is blocked at step 3 without groupOverrideReason on cross-group", () => {
    const m = createModel({ defaultOwner: GROUPED_OWNER.value });
    m.setOwner(GROUPED_OWNER.value);
    m.setGroup("osaka");
    m.setDueDate("2026-06-01");
    m.setAmount("100000");
    expect(m.canProceedStep3.value).toBe(false);

    m.setGroupOverrideReason("客户要求");
    expect(m.canProceedStep3.value).toBe(true);
  });

  it("switching owner from grouped to Local Admin clears the requirement", () => {
    const m = createModel({ defaultOwner: GROUPED_OWNER.value });
    m.setOwner(GROUPED_OWNER.value);
    m.setGroup("osaka");
    expect(m.needsGroupOverrideReason.value).toBe(true);

    m.setOwner(LOCAL_ADMIN.value);
    expect(m.needsGroupOverrideReason.value).toBe(false);
  });

  it("switching owner from Local Admin to grouped restores the requirement", () => {
    const m = createModel({ defaultOwner: LOCAL_ADMIN.value });
    m.setOwner(LOCAL_ADMIN.value);
    m.setGroup("osaka");
    expect(m.needsGroupOverrideReason.value).toBe(false);

    m.setOwner(GROUPED_OWNER.value);
    expect(m.needsGroupOverrideReason.value).toBe(true);
  });

  it("owner with group=undefined (legacy) still requires reason", () => {
    const legacyOwner: CaseOwnerOption = {
      value: "legacy-user",
      label: "Legacy",
      initials: "LG",
      avatarClass: "bg-gray-100 text-gray-700",
    };
    const m = createModel({
      ownerOptions: () => [...ownersWithAdmin, legacyOwner],
      defaultOwner: legacyOwner.value,
    });
    m.setOwner(legacyOwner.value);
    m.setGroup("osaka");
    expect(m.isGroupOverridden.value).toBe(true);
    expect(m.needsGroupOverrideReason.value).toBe(true);
  });
});
