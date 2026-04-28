// ── Test Ownership ──────────────────────────────────────────────
// Owner: family bulk entry query/source context contract (p0-fe-011-01).
//
// Purpose: freeze the minimal field set for family bulk case creation
// entry, covering:
//   1. FAMILY_BULK_ENTRY_CONTRACT frozen shape and field counts
//   2. All contract fields are valid CASE_CREATE_QUERY_PARAM_KEYS members
//   3. Activation hash matches parseCaseCreateQuery behavior
//   4. Required/recommended/optional field coverage in parse round-trip
//   5. SELECTED_RELATION_REQUIRED_FIELDS vs parseSelectedRelation behavior
//   6. Degraded mode: missing recommended fields → correct fallbacks
//   7. Full family entry scenario E2E: build → parse → model
//
// Does NOT re-test:
//   - General query key set → CustomerCreateCaseEntryContract.test
//   - Customer defaults inheritance → useCreateCaseModel.customer-defaults.test
//   - Family bulk submit flow → useCreateCaseModel.family-bulk-submit.test
//   - Customer entry regression → CustomerCreateCaseEntryRegression.test
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  FAMILY_BULK_ENTRY_CONTRACT,
  SELECTED_RELATION_REQUIRED_FIELDS,
  CASE_CREATE_QUERY_PARAM_KEYS,
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

// ─── Helpers ─────────────────────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════════════
//  1. FROZEN CONTRACT SHAPE (p0-fe-011-01)
// ═══════════════════════════════════════════════════════════════════

describe("FAMILY_BULK_ENTRY_CONTRACT frozen shape (p0-fe-011-01)", () => {
  it("has exactly the expected top-level keys", () => {
    const keys = Object.keys(FAMILY_BULK_ENTRY_CONTRACT).sort();
    expect(keys).toEqual([
      "activationHash",
      "defaultTemplateId",
      "fallbackBehavior",
      "optionalFields",
      "recommendedFields",
      "requiredFields",
    ]);
  });

  it("activationHash is #family-bulk", () => {
    expect(FAMILY_BULK_ENTRY_CONTRACT.activationHash).toBe("#family-bulk");
  });

  it("defaultTemplateId is family", () => {
    expect(FAMILY_BULK_ENTRY_CONTRACT.defaultTemplateId).toBe("family");
  });

  it("requiredFields has exactly 1 field", () => {
    expect(FAMILY_BULK_ENTRY_CONTRACT.requiredFields).toHaveLength(1);
    expect(FAMILY_BULK_ENTRY_CONTRACT.requiredFields).toContain("customerId");
  });

  it("recommendedFields has exactly 4 fields", () => {
    expect(FAMILY_BULK_ENTRY_CONTRACT.recommendedFields).toHaveLength(4);
  });

  it("optionalFields has exactly 4 fields", () => {
    expect(FAMILY_BULK_ENTRY_CONTRACT.optionalFields).toHaveLength(4);
  });

  it("fallbackBehavior documents all 3 degraded modes", () => {
    const keys = Object.keys(
      FAMILY_BULK_ENTRY_CONTRACT.fallbackBehavior,
    ).sort();
    expect(keys).toEqual([
      "noCustomerGroup",
      "noCustomerName",
      "noSelectedRelations",
    ]);
  });

  it("SELECTED_RELATION_REQUIRED_FIELDS has exactly 3 fields", () => {
    expect(SELECTED_RELATION_REQUIRED_FIELDS).toHaveLength(3);
    expect(SELECTED_RELATION_REQUIRED_FIELDS).toContain("id");
    expect(SELECTED_RELATION_REQUIRED_FIELDS).toContain("name");
    expect(SELECTED_RELATION_REQUIRED_FIELDS).toContain("relationType");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  2. CONTRACT FIELDS ⊆ QUERY PARAM KEYS (p0-fe-011-01)
// ═══════════════════════════════════════════════════════════════════

describe("contract fields alignment with CASE_CREATE_QUERY_PARAM_KEYS (p0-fe-011-01)", () => {
  it("all required fields exist in CASE_CREATE_QUERY_PARAM_KEYS", () => {
    for (const field of FAMILY_BULK_ENTRY_CONTRACT.requiredFields) {
      expect(CASE_CREATE_QUERY_PARAM_KEYS as readonly string[]).toContain(
        field,
      );
    }
  });

  it("all recommended fields exist in CASE_CREATE_QUERY_PARAM_KEYS", () => {
    for (const field of FAMILY_BULK_ENTRY_CONTRACT.recommendedFields) {
      expect(CASE_CREATE_QUERY_PARAM_KEYS as readonly string[]).toContain(
        field,
      );
    }
  });

  it("all optional fields exist in CASE_CREATE_QUERY_PARAM_KEYS", () => {
    for (const field of FAMILY_BULK_ENTRY_CONTRACT.optionalFields) {
      expect(CASE_CREATE_QUERY_PARAM_KEYS as readonly string[]).toContain(
        field,
      );
    }
  });

  it("union of required + recommended + optional covers a consistent subset of query params", () => {
    const allContractFields = [
      ...FAMILY_BULK_ENTRY_CONTRACT.requiredFields,
      ...FAMILY_BULK_ENTRY_CONTRACT.recommendedFields,
      ...FAMILY_BULK_ENTRY_CONTRACT.optionalFields,
    ];
    const uniqueFields = [...new Set(allContractFields)];
    expect(uniqueFields).toHaveLength(allContractFields.length);
    expect(uniqueFields.length).toBe(9);
  });

  it("no duplicate fields across required/recommended/optional", () => {
    const all = [
      ...FAMILY_BULK_ENTRY_CONTRACT.requiredFields,
      ...FAMILY_BULK_ENTRY_CONTRACT.recommendedFields,
      ...FAMILY_BULK_ENTRY_CONTRACT.optionalFields,
    ];
    const unique = new Set(all);
    expect(unique.size).toBe(all.length);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  3. ACTIVATION HASH BEHAVIOR (p0-fe-011-01)
// ═══════════════════════════════════════════════════════════════════

describe("activation hash behavior (p0-fe-011-01)", () => {
  it("parseCaseCreateQuery sets familyBulkMode=true for #family-bulk hash", () => {
    const ctx = parseCaseCreateQuery(
      { customerId: "cust-001" },
      FAMILY_BULK_ENTRY_CONTRACT.activationHash,
    );
    expect(ctx.familyBulkMode).toBe(true);
  });

  it("parseCaseCreateQuery sets familyBulkMode=false for empty hash", () => {
    const ctx = parseCaseCreateQuery({ customerId: "cust-001" }, "");
    expect(ctx.familyBulkMode).toBe(false);
  });

  it("parseCaseCreateQuery sets familyBulkMode=false for unrelated hash", () => {
    const ctx = parseCaseCreateQuery({ customerId: "cust-001" }, "#other");
    expect(ctx.familyBulkMode).toBe(false);
  });

  it("buildCaseCreateRoute with familyBulk=true produces matching hash", () => {
    const route = buildCaseCreateRoute({ customerId: "cust-001" }, true);
    expect(route.hash).toBe(FAMILY_BULK_ENTRY_CONTRACT.activationHash);
  });

  it("buildCaseCreateRoute without familyBulk omits hash", () => {
    const route = buildCaseCreateRoute({ customerId: "cust-001" });
    expect(route.hash).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  4. REQUIRED FIELD ROUND-TRIP (p0-fe-011-01)
// ═══════════════════════════════════════════════════════════════════

describe("required field round-trip (p0-fe-011-01)", () => {
  it("customerId survives build → parse round-trip", () => {
    const query = buildCaseCreateQuery({ customerId: "cust-family-001" });
    const ctx = parseCaseCreateQuery(
      query as Record<string, string>,
      "#family-bulk",
    );
    expect(ctx.customerId).toBe("cust-family-001");
    expect(ctx.familyBulkMode).toBe(true);
  });

  it("missing customerId produces undefined in parsed context", () => {
    const query = buildCaseCreateQuery({});
    const ctx = parseCaseCreateQuery(
      query as Record<string, string>,
      "#family-bulk",
    );
    expect(ctx.customerId).toBeUndefined();
    expect(ctx.familyBulkMode).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  5. RECOMMENDED FIELD ROUND-TRIP (p0-fe-011-01)
// ═══════════════════════════════════════════════════════════════════

describe("recommended field round-trip (p0-fe-011-01)", () => {
  it("customerName survives round-trip", () => {
    const query = buildCaseCreateQuery({
      customerId: "cust-fam",
      customerName: "佐藤",
    });
    const ctx = parseCaseCreateQuery(
      query as Record<string, string>,
      "#family-bulk",
    );
    expect(ctx.customerName).toBe("佐藤");
  });

  it("customerGroup survives round-trip", () => {
    const query = buildCaseCreateQuery({
      customerId: "cust-fam",
      customerGroup: "tokyo-2",
    });
    const ctx = parseCaseCreateQuery(
      query as Record<string, string>,
      "#family-bulk",
    );
    expect(ctx.customerGroup).toBe("tokyo-2");
  });

  it("customerGroupLabel survives round-trip", () => {
    const query = buildCaseCreateQuery({
      customerId: "cust-fam",
      customerGroupLabel: "東京二組",
    });
    const ctx = parseCaseCreateQuery(
      query as Record<string, string>,
      "#family-bulk",
    );
    expect(ctx.customerGroupLabel).toBe("東京二組");
  });

  it("selectedRelations JSON survives round-trip", () => {
    const relations = [
      { id: "r1", name: "田中", relationType: "spouse" },
      { id: "r2", name: "鈴木", relationType: "child" },
    ];
    const query = buildCaseCreateQuery({
      customerId: "cust-fam",
      selectedRelations: JSON.stringify(relations),
    });
    const ctx = parseCaseCreateQuery(
      query as Record<string, string>,
      "#family-bulk",
    );
    expect(ctx.selectedRelations).toHaveLength(2);
    expect(ctx.selectedRelations![0].id).toBe("r1");
    expect(ctx.selectedRelations![0].name).toBe("田中");
    expect(ctx.selectedRelations![0].relationType).toBe("spouse");
    expect(ctx.selectedRelations![1].id).toBe("r2");
  });

  it("all recommended fields present in full family query", () => {
    const query = buildCaseCreateQuery({
      customerId: "cust-full-fam",
      customerName: "山田太郎",
      customerGroup: "tokyo-1",
      customerGroupLabel: "東京一組",
      selectedRelations: JSON.stringify([
        { id: "r1", name: "山田花子", relationType: "spouse" },
      ]),
    });
    const ctx = parseCaseCreateQuery(
      query as Record<string, string>,
      "#family-bulk",
    );
    expect(ctx.customerName).toBeDefined();
    expect(ctx.customerGroup).toBeDefined();
    expect(ctx.customerGroupLabel).toBeDefined();
    expect(ctx.selectedRelations).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  6. SELECTED RELATION PARSE BEHAVIOR (p0-fe-011-01)
// ═══════════════════════════════════════════════════════════════════

describe("selectedRelation parse requirements (p0-fe-011-01)", () => {
  it("relation with all 3 required fields is accepted", () => {
    const query = buildCaseCreateQuery({
      selectedRelations: JSON.stringify([
        { id: "r1", name: "テスト", relationType: "spouse" },
      ]),
    });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(ctx.selectedRelations).toHaveLength(1);
  });

  it("relation missing id is rejected", () => {
    const query = buildCaseCreateQuery({
      selectedRelations: JSON.stringify([
        { name: "テスト", relationType: "spouse" },
      ]),
    });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(ctx.selectedRelations).toBeUndefined();
  });

  it("relation missing name is rejected", () => {
    const query = buildCaseCreateQuery({
      selectedRelations: JSON.stringify([{ id: "r1", relationType: "spouse" }]),
    });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(ctx.selectedRelations).toBeUndefined();
  });

  it("relation missing relationType is rejected", () => {
    const query = buildCaseCreateQuery({
      selectedRelations: JSON.stringify([{ id: "r1", name: "テスト" }]),
    });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(ctx.selectedRelations).toBeUndefined();
  });

  it("optional relation fields (roleTitle, phone, email, tags, note) are preserved", () => {
    const query = buildCaseCreateQuery({
      selectedRelations: JSON.stringify([
        {
          id: "r1",
          name: "テスト",
          relationType: "spouse",
          roleTitle: "配偶",
          phone: "090-1111",
          email: "test@test.com",
          tags: ["家族"],
          note: "備考",
        },
      ]),
    });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");
    const r = ctx.selectedRelations![0];
    expect(r.roleTitle).toBe("配偶");
    expect(r.phone).toBe("090-1111");
    expect(r.email).toBe("test@test.com");
    expect(r.tags).toEqual(["家族"]);
    expect(r.note).toBe("備考");
  });

  it("invalid JSON for selectedRelations → undefined", () => {
    const ctx = parseCaseCreateQuery(
      { selectedRelations: "not-valid-json{" },
      "",
    );
    expect(ctx.selectedRelations).toBeUndefined();
  });

  it("non-array JSON for selectedRelations → undefined", () => {
    const ctx = parseCaseCreateQuery(
      { selectedRelations: JSON.stringify({ id: "r1" }) },
      "",
    );
    expect(ctx.selectedRelations).toBeUndefined();
  });

  it("empty array for selectedRelations → undefined", () => {
    const ctx = parseCaseCreateQuery(
      { selectedRelations: JSON.stringify([]) },
      "",
    );
    expect(ctx.selectedRelations).toBeUndefined();
  });

  it("mixed valid/invalid relations → only valid ones kept", () => {
    const query = buildCaseCreateQuery({
      selectedRelations: JSON.stringify([
        { id: "r1", name: "有効", relationType: "spouse" },
        { id: "", name: "無効ID", relationType: "child" },
        { id: "r3", name: "有効2", relationType: "parent" },
      ]),
    });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(ctx.selectedRelations).toHaveLength(2);
    expect(ctx.selectedRelations![0].id).toBe("r1");
    expect(ctx.selectedRelations![1].id).toBe("r3");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  7. DEGRADED MODE FALLBACKS (p0-fe-011-01)
// ═══════════════════════════════════════════════════════════════════

describe("degraded mode fallbacks (p0-fe-011-01)", () => {
  it("no selectedRelations → model seeds from FAMILY_SCENARIO.defaultDraftParties", () => {
    const ctx = parseCaseCreateQuery(
      { customerId: "cust-002" } as Record<string, string>,
      "#family-bulk",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));

    expect(ctx.selectedRelations).toBeUndefined();
    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.additionalParties.value.length).toBe(
      FAMILY_SCENARIO.defaultDraftParties.length,
    );
  });

  it("no customerName → synthesize returns null → primaryCustomer from list or null", () => {
    const ctx = parseCaseCreateQuery(
      { customerId: "cust-missing-999" } as Record<string, string>,
      "#family-bulk",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));

    expect(ctx.customerName).toBeUndefined();
    expect(m.primaryCustomer.value).toBeNull();
  });

  it("no customerGroup → group falls back to deps.defaultGroup", () => {
    const ctx = parseCaseCreateQuery(
      {
        customerId: "cust-no-group-999",
        customerName: "テスト太郎",
      } as Record<string, string>,
      "#family-bulk",
    );
    const m = useCreateCaseModel(
      createDeps({ sourceContext: ctx, defaultGroup: "osaka" }),
    );

    expect(ctx.customerGroup).toBeUndefined();
    expect(m.primaryCustomer.value).not.toBeNull();
    expect(m.draft.group).toBe("osaka");
  });

  it("with selectedRelations → model seeds from relations instead of scenario", () => {
    const relations = [{ id: "r1", name: "関係者A", relationType: "spouse" }];
    const query = buildCaseCreateQuery({
      customerId: "cust-002",
      selectedRelations: JSON.stringify(relations),
    });
    const ctx = parseCaseCreateQuery(
      query as Record<string, string>,
      "#family-bulk",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));

    expect(m.additionalParties.value.length).toBeGreaterThan(0);
    expect(m.additionalParties.value[0].name).toBe("関係者A");
  });
});
