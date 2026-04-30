import { describe, expect, it } from "vitest";
import {
  useCreateCaseModel,
  type UseCreateCaseModelDeps,
} from "./useCreateCaseModel";
import { parseCaseCreateQuery, buildCaseCreateQuery } from "../query-create";
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

function simulateCustomerEntry(customerId: string): CaseCreateSourceContext {
  const query = buildCaseCreateQuery({ customerId });
  return parseCaseCreateQuery(query as Record<string, string>, "");
}

function simulateCustomerEntryWithDefaults(
  customerId: string,
  defaults: { name?: string; group?: string },
): CaseCreateSourceContext {
  const query = buildCaseCreateQuery({
    customerId,
    ...(defaults.name ? { customerName: defaults.name } : {}),
    ...(defaults.group ? { customerGroup: defaults.group } : {}),
  });
  return parseCaseCreateQuery(query as Record<string, string>, "");
}

// eslint-disable-next-line no-restricted-syntax -- BUG-092 待立项跟踪后再启用
describe.skip("tryPreselectPrimary on async customer dropdown load (BUG-092)", () => {
  it("preselects primary when customers populate after init (only customerId in URL)", () => {
    const ctx = simulateCustomerEntry("cust-001");
    const m = useCreateCaseModel(
      createDeps({ sourceContext: ctx, customers: () => [] }),
    );
    expect(m.primaryCustomer.value).toBeNull();
    const updated = m.tryPreselectPrimary(SAMPLE_CREATE_CUSTOMERS);
    expect(updated).toBe(true);
    expect(m.primaryCustomer.value?.id).toBe("cust-001");
    expect(m.primaryCustomer.value?.name).toBe("李娜");
    expect(m.draft.inheritedGroup).toBe("tokyo-1");
  });

  it("inherits group from late-loaded customer record", () => {
    const ctx = simulateCustomerEntry("cust-003");
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: ctx,
        customers: () => [],
        defaultGroup: "tokyo-1",
      }),
    );
    expect(m.draft.group).toBe("tokyo-1");
    m.tryPreselectPrimary(SAMPLE_CREATE_CUSTOMERS);
    expect(m.draft.group).toBe("tokyo-2");
    expect(m.draft.inheritedGroup).toBe("tokyo-2");
  });

  it("returns false and does not change primary when sourceContext.customerId missing", () => {
    const m = useCreateCaseModel(createDeps());
    const updated = m.tryPreselectPrimary(SAMPLE_CREATE_CUSTOMERS);
    expect(updated).toBe(false);
    expect(m.primaryCustomer.value).toBeNull();
  });

  it("returns false when source customer not in dropdown response", () => {
    const ctx = simulateCustomerEntry("cust-not-in-list");
    const m = useCreateCaseModel(
      createDeps({ sourceContext: ctx, customers: () => [] }),
    );
    const updated = m.tryPreselectPrimary(SAMPLE_CREATE_CUSTOMERS);
    expect(updated).toBe(false);
    expect(m.primaryCustomer.value).toBeNull();
  });

  it("does not override when user has manually picked a different customer", () => {
    const ctx = simulateCustomerEntry("cust-001");
    const m = useCreateCaseModel(
      createDeps({ sourceContext: ctx, customers: () => [] }),
    );
    const other = SAMPLE_CREATE_CUSTOMERS.find((c) => c.id === "cust-003")!;
    m.setPrimaryCustomer(other);
    const updated = m.tryPreselectPrimary(SAMPLE_CREATE_CUSTOMERS);
    expect(updated).toBe(false);
    expect(m.primaryCustomer.value?.id).toBe("cust-003");
  });

  it("upgrades synthesized primary to canonical record once dropdown loads", () => {
    const ctx = simulateCustomerEntryWithDefaults("cust-001", {
      name: "李娜",
      group: "tokyo-1",
    });
    const m = useCreateCaseModel(
      createDeps({ sourceContext: ctx, customers: () => [] }),
    );
    expect(m.primaryCustomer.value?.id).toBe("cust-001");
    expect(m.primaryCustomer.value?.contact).toBe("");
    const updated = m.tryPreselectPrimary(SAMPLE_CREATE_CUSTOMERS);
    expect(updated).toBe(true);
    expect(m.primaryCustomer.value?.contact).toContain("li.na@email.com");
  });

  it("is idempotent — second call with same list does nothing", () => {
    const ctx = simulateCustomerEntry("cust-001");
    const m = useCreateCaseModel(
      createDeps({ sourceContext: ctx, customers: () => [] }),
    );
    expect(m.tryPreselectPrimary(SAMPLE_CREATE_CUSTOMERS)).toBe(true);
    expect(m.tryPreselectPrimary(SAMPLE_CREATE_CUSTOMERS)).toBe(false);
  });
});
