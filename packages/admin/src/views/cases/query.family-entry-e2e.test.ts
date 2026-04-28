import { describe, expect, it } from "vitest";
import {
  parseCaseCreateQuery,
  buildCaseCreateQuery,
  buildCaseCreateRoute,
} from "./query";
import {
  useCreateCaseModel,
  type UseCreateCaseModelDeps,
} from "./model/useCreateCaseModel";
import {
  SAMPLE_CREATE_CUSTOMERS,
  SAMPLE_CREATE_TEMPLATES,
  FAMILY_SCENARIO,
} from "./fixtures-create";
import { CASE_GROUP_OPTIONS, CASE_OWNER_OPTIONS } from "./constants";

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

describe("full family entry scenario E2E (p0-fe-011-01)", () => {
  it("contacts tab: customerId + relations → family bulk model ready", () => {
    const relations = [
      { id: "r1", name: "鈴木花子", relationType: "spouse", roleTitle: "配偶" },
      { id: "r2", name: "鈴木太郎", relationType: "child", roleTitle: "子女" },
    ];
    const query = buildCaseCreateQuery({
      customerId: "cust-002",
      customerName: "陳美",
      customerGroup: "tokyo-1",
      customerGroupLabel: "东京一组",
      customerContact: "chen.mei@email.com",
      relationIds: relations.map((r) => r.id).join(","),
      selectedRelations: JSON.stringify(relations),
    });
    const route = buildCaseCreateRoute(query, true);
    const ctx = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));

    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.draft.templateId).toBe("family");
    expect(m.primaryCustomer.value!.id).toBe("cust-002");
    expect(m.additionalParties.value.length).toBeGreaterThan(0);
    expect(m.isFamilyBulkScenario.value).toBe(true);
    expect(m.effectiveTitle.value).toContain("（批量）");
  });

  it("customer detail: customerId only → family bulk with default parties", () => {
    const query = buildCaseCreateQuery({
      customerId: "cust-002",
      customerName: "陳美",
      customerGroup: "tokyo-1",
      customerGroupLabel: "东京一组",
    });
    const ctx = parseCaseCreateQuery(
      query as Record<string, string>,
      "#family-bulk",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));

    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.primaryCustomer.value!.name).toBe("陈美");
    expect(m.additionalParties.value.length).toBe(
      FAMILY_SCENARIO.defaultDraftParties.length,
    );
  });

  it("minimal entry: only customerId + hash → degraded but functional", () => {
    const ctx = parseCaseCreateQuery(
      { customerId: "cust-002" } as Record<string, string>,
      "#family-bulk",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));

    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.draft.templateId).toBe("family");
    expect(m.primaryCustomer.value!.id).toBe("cust-002");
    expect(m.additionalParties.value.length).toBe(
      FAMILY_SCENARIO.defaultDraftParties.length,
    );
  });

  it("only hash without customerId → family bulk but no primary customer", () => {
    const ctx = parseCaseCreateQuery({}, "#family-bulk");
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));

    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.primaryCustomer.value).toBeNull();
    expect(m.draft.templateId).toBe("family");
  });
});
