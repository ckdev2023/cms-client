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
import type { CaseCreateSourceContext } from "../types-create";

function createDeps(
  overrides: Partial<UseCreateCaseModelDeps> = {},
): UseCreateCaseModelDeps {
  return {
    templates: () => SAMPLE_CREATE_TEMPLATES,
    customers: () => SAMPLE_CREATE_CUSTOMERS,
    familyScenario: () => FAMILY_SCENARIO,
    ownerOptions: () => CASE_OWNER_OPTIONS,
    groupOptions: () => CASE_GROUP_OPTIONS,
    sourceContext: { familyBulkMode: false },
    defaultGroup: "tokyo-1",
    defaultOwner: "suzuki",
    ...overrides,
  };
}

const FAMILY_BULK_CTX_KNOWN: CaseCreateSourceContext = {
  customerId: "cust-002",
  familyBulkMode: true,
};

const FAMILY_BULK_CTX_UNKNOWN: CaseCreateSourceContext = {
  customerId: "cust-family-unknown",
  customerName: "伊藤太郎",
  customerKana: "イトウ タロウ",
  customerGroup: "tokyo-2",
  customerGroupLabel: "東京二組",
  customerContact: "090-5555-0000",
  familyBulkMode: true,
};

describe("family bulk edge cases (p0-fe-011-03)", () => {
  it("family bulk without customerId: no primary customer, no group inheritance", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { familyBulkMode: true },
        defaultGroup: "osaka",
      }),
    );
    expect(m.primaryCustomer.value).toBeNull();
    expect(m.draft.group).toBe("osaka");
    expect(m.familyContextComplete.value).toBe(false);
  });

  it("family bulk with empty selectedRelations → falls back to defaults", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: {
          customerId: "cust-002",
          familyBulkMode: true,
          selectedRelations: [],
        },
      }),
    );
    expect(m.additionalParties.value.length).toBe(
      FAMILY_SCENARIO.defaultDraftParties.length,
    );
  });

  it("switching template away from family disables family bulk scenario", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    expect(m.isFamilyBulkScenario.value).toBe(true);

    m.selectTemplate("work");
    expect(m.isFamilyTemplate.value).toBe(false);
    expect(m.isFamilyBulkScenario.value).toBe(false);
  });

  it("re-selecting family template re-activates bulk scenario (but does not re-seed)", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    const initialPartyCount = m.additionalParties.value.length;

    m.selectTemplate("work");
    m.selectTemplate("family");

    expect(m.isFamilyBulkScenario.value).toBe(true);
    expect(m.additionalParties.value.length).toBe(initialPartyCount);
  });

  it("group override in family bulk mode: isGroupOverridden correct", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_UNKNOWN }),
    );
    expect(m.draft.group).toBe("tokyo-2");
    expect(m.isGroupOverridden.value).toBe(false);

    m.setGroup("tokyo-1");
    expect(m.isGroupOverridden.value).toBe(true);
    expect(m.draft.inheritedGroup).toBe("tokyo-2");
  });
});
