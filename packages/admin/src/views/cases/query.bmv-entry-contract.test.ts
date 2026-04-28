// ── Test Ownership ──────────────────────────────────────────────
// Owner: BMV entry query/source context contract (G0).
//
// Purpose: freeze the minimal field set for BMV case creation entry,
// covering:
//   1. BMV_ENTRY_CONTRACT frozen shape and field counts
//   2. All contract fields are valid CASE_CREATE_QUERY_PARAM_KEYS members
//   3. templateCode round-trip through build → parse
//   4. templateCode='bmv' locks template in parsed context
//   5. Invalid / missing templateCode → undefined
//   6. templateCode takes priority over templateId
//   7. Full BMV entry scenario: build → parse → model (templateLocked)
//
// Does NOT re-test:
//   - General query key set → CustomerCreateCaseEntryContract.test
//   - Family bulk entry → query.family-entry-contract.test
//   - Customer defaults inheritance → useCreateCaseModel.customer-defaults.test
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  BMV_ENTRY_CONTRACT,
  CASE_CREATE_QUERY_PARAM_KEYS,
  parseCaseCreateQuery,
  buildCaseCreateQuery,
  buildCaseCreateRoute,
  buildCaseCreateHref,
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
//  1. FROZEN CONTRACT SHAPE (G0)
// ═══════════════════════════════════════════════════════════════════

describe("BMV_ENTRY_CONTRACT frozen shape (G0)", () => {
  it("has exactly the expected top-level keys", () => {
    const keys = Object.keys(BMV_ENTRY_CONTRACT).sort();
    expect(keys).toEqual([
      "lockedTemplateCode",
      "optionalFields",
      "recommendedFields",
      "requiredFields",
      "templateLockBehavior",
    ]);
  });

  it("lockedTemplateCode is bmv", () => {
    expect(BMV_ENTRY_CONTRACT.lockedTemplateCode).toBe("bmv");
  });

  it("requiredFields has exactly 2 fields", () => {
    expect(BMV_ENTRY_CONTRACT.requiredFields).toHaveLength(2);
    expect(BMV_ENTRY_CONTRACT.requiredFields).toContain("templateCode");
    expect(BMV_ENTRY_CONTRACT.requiredFields).toContain("customerId");
  });

  it("recommendedFields has exactly 5 fields", () => {
    expect(BMV_ENTRY_CONTRACT.recommendedFields).toHaveLength(5);
  });

  it("optionalFields has exactly 7 fields", () => {
    expect(BMV_ENTRY_CONTRACT.optionalFields).toHaveLength(7);
  });

  it("templateLockBehavior documents readonly and indicator", () => {
    expect(
      BMV_ENTRY_CONTRACT.templateLockBehavior.templateSelectorReadonly,
    ).toBe(true);
    expect(BMV_ENTRY_CONTRACT.templateLockBehavior.lockedIndicatorVisible).toBe(
      true,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
//  2. CONTRACT FIELDS ⊆ QUERY PARAM KEYS (G0)
// ═══════════════════════════════════════════════════════════════════

describe("BMV contract fields alignment with CASE_CREATE_QUERY_PARAM_KEYS (G0)", () => {
  it("all required fields exist in CASE_CREATE_QUERY_PARAM_KEYS", () => {
    for (const field of BMV_ENTRY_CONTRACT.requiredFields) {
      expect(CASE_CREATE_QUERY_PARAM_KEYS as readonly string[]).toContain(
        field,
      );
    }
  });

  it("all recommended fields exist in CASE_CREATE_QUERY_PARAM_KEYS", () => {
    for (const field of BMV_ENTRY_CONTRACT.recommendedFields) {
      expect(CASE_CREATE_QUERY_PARAM_KEYS as readonly string[]).toContain(
        field,
      );
    }
  });

  it("all optional fields exist in CASE_CREATE_QUERY_PARAM_KEYS", () => {
    for (const field of BMV_ENTRY_CONTRACT.optionalFields) {
      expect(CASE_CREATE_QUERY_PARAM_KEYS as readonly string[]).toContain(
        field,
      );
    }
  });

  it("no duplicate fields across required/recommended/optional", () => {
    const all = [
      ...BMV_ENTRY_CONTRACT.requiredFields,
      ...BMV_ENTRY_CONTRACT.recommendedFields,
      ...BMV_ENTRY_CONTRACT.optionalFields,
    ];
    const unique = new Set(all);
    expect(unique.size).toBe(all.length);
  });

  it("union covers a consistent subset of query params", () => {
    const allContractFields = [
      ...BMV_ENTRY_CONTRACT.requiredFields,
      ...BMV_ENTRY_CONTRACT.recommendedFields,
      ...BMV_ENTRY_CONTRACT.optionalFields,
    ];
    const uniqueFields = [...new Set(allContractFields)];
    expect(uniqueFields).toHaveLength(allContractFields.length);
    expect(uniqueFields.length).toBe(14);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  3. templateCode ROUND-TRIP (G0)
// ═══════════════════════════════════════════════════════════════════

describe("templateCode round-trip (G0)", () => {
  it("templateCode='bmv' survives build → parse round-trip", () => {
    const query = buildCaseCreateQuery({
      templateCode: "bmv",
      customerId: "cust-bmv-001",
    });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(ctx.templateCode).toBe("bmv");
    expect(ctx.customerId).toBe("cust-bmv-001");
  });

  it("templateCode='family' survives round-trip", () => {
    const query = buildCaseCreateQuery({ templateCode: "family" });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(ctx.templateCode).toBe("family");
  });

  it("templateCode='work' survives round-trip", () => {
    const query = buildCaseCreateQuery({ templateCode: "work" });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(ctx.templateCode).toBe("work");
  });

  it("missing templateCode produces undefined in parsed context", () => {
    const query = buildCaseCreateQuery({ customerId: "cust-bmv-002" });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(ctx.templateCode).toBeUndefined();
  });

  it("invalid templateCode produces undefined in parsed context", () => {
    const ctx = parseCaseCreateQuery(
      { templateCode: "invalid-template" } as Record<string, string>,
      "",
    );
    expect(ctx.templateCode).toBeUndefined();
  });

  it("empty templateCode produces undefined in parsed context", () => {
    const ctx = parseCaseCreateQuery(
      { templateCode: "" } as Record<string, string>,
      "",
    );
    expect(ctx.templateCode).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  4. buildCaseCreateRoute / buildCaseCreateHref WITH templateCode
// ═══════════════════════════════════════════════════════════════════

describe("route & href builders with templateCode (G0)", () => {
  it("buildCaseCreateRoute includes templateCode in query", () => {
    const route = buildCaseCreateRoute({
      templateCode: "bmv",
      customerId: "cust-bmv-003",
    });
    expect(route.name).toBe("case-create");
    expect(route.query).toBeDefined();
    expect(route.query!.templateCode).toBe("bmv");
    expect(route.query!.customerId).toBe("cust-bmv-003");
  });

  it("buildCaseCreateRoute omits templateCode when absent", () => {
    const route = buildCaseCreateRoute({ customerId: "cust-bmv-004" });
    expect(route.query?.templateCode).toBeUndefined();
  });

  it("buildCaseCreateHref includes templateCode in query string", () => {
    const href = buildCaseCreateHref({
      templateCode: "bmv",
      customerId: "cust-bmv-005",
    });
    expect(href).toContain("templateCode=bmv");
    expect(href).toContain("customerId=cust-bmv-005");
    expect(href).toMatch(/^#\/cases\/create\?/);
  });

  it("buildCaseCreateHref omits templateCode when absent", () => {
    const href = buildCaseCreateHref({ customerId: "cust-bmv-006" });
    expect(href).not.toContain("templateCode");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  5. templateCode PRIORITY OVER templateId (G0)
// ═══════════════════════════════════════════════════════════════════

describe("templateCode priority over templateId (G0)", () => {
  it("both templateCode and templateId present → both parsed independently", () => {
    const query = buildCaseCreateQuery({
      templateCode: "bmv",
      templateId: "family",
    });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(ctx.templateCode).toBe("bmv");
    expect(ctx.templateId).toBe("family");
  });

  it("model resolves to templateCode when both are present", () => {
    const ctx = parseCaseCreateQuery(
      { templateCode: "bmv", templateId: "family" } as Record<string, string>,
      "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.draft.templateId).toBe("biz_mgmt_cert_4m");
  });

  it("model resolves to templateId when templateCode is absent", () => {
    const ctx = parseCaseCreateQuery(
      { templateId: "work" } as Record<string, string>,
      "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.draft.templateId).toBe("work");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  6. templateLocked FLAG IN MODEL (G0)
// ═══════════════════════════════════════════════════════════════════

describe("templateLocked flag in model (G0)", () => {
  it("templateLocked=true when templateCode is present", () => {
    const ctx = parseCaseCreateQuery(
      { templateCode: "bmv", customerId: "cust-bmv-010" } as Record<
        string,
        string
      >,
      "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.templateLocked.value).toBe(true);
    expect(m.draft.templateId).toBe("biz_mgmt_cert_4m");
  });

  it("templateLocked=false when templateCode is absent", () => {
    const ctx = parseCaseCreateQuery(
      { customerId: "cust-bmv-011" } as Record<string, string>,
      "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.templateLocked.value).toBe(false);
  });

  it("templateLocked=false when no source context fields", () => {
    const m = useCreateCaseModel(createDeps());
    expect(m.templateLocked.value).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  7. FULL BMV ENTRY SCENARIO E2E (G0 + G3)
// ═══════════════════════════════════════════════════════════════════

describe("full BMV entry scenario E2E (G0 + G3)", () => {
  it("BMV entry: build → parse → model with locked template", () => {
    const query = buildCaseCreateQuery({
      templateCode: "bmv",
      customerId: "cust-002",
      sourceLeadId: "lead-bmv-001",
      customerName: "経営太郎",
      customerGroup: "tokyo-1",
      customerGroupLabel: "東京一組",
    });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");

    expect(ctx.templateCode).toBe("bmv");
    expect(ctx.customerId).toBe("cust-002");
    expect(ctx.sourceLeadId).toBe("lead-bmv-001");
    expect(ctx.customerName).toBe("経営太郎");
    expect(ctx.familyBulkMode).toBe(false);

    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));

    expect(m.draft.templateId).toBe("biz_mgmt_cert_4m");
    expect(m.templateLocked.value).toBe(true);
    expect(m.primaryCustomer.value).not.toBeNull();
  });

  it("BMV status fields survive round-trip and unlock gate for synthesized customer", () => {
    const query = buildCaseCreateQuery({
      templateCode: "bmv",
      templateId: "bmv",
      customerId: "cust-bmv-synth-001",
      customerName: "経営太郎",
      bmvQuestionnaireStatus: "returned",
      bmvQuoteStatus: "confirmed",
      bmvSignStatus: "signed",
      bmvIntakeStatus: "ready_for_case_creation",
    });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));

    expect(ctx.bmvQuestionnaireStatus).toBe("returned");
    expect(ctx.bmvQuoteStatus).toBe("confirmed");
    expect(ctx.bmvSignStatus).toBe("signed");
    expect(ctx.bmvIntakeStatus).toBe("ready_for_case_creation");
    expect(m.primaryCustomer.value?.id).toBe("cust-bmv-synth-001");
    expect(m.preSignGate.value.passed).toBe(true);
  });

  it("BMV entry with only required fields still works", () => {
    const query = buildCaseCreateQuery({
      templateCode: "bmv",
      customerId: "cust-missing-999",
    });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));

    expect(m.draft.templateId).toBe("biz_mgmt_cert_4m");
    expect(m.templateLocked.value).toBe(true);
  });

  it("BMV entry with ownerUserId pre-fills draft.owner (G3)", () => {
    const query = buildCaseCreateQuery({
      templateCode: "bmv",
      customerId: "cust-002",
      sourceLeadId: "lead-bmv-001",
      ownerUserId: "takahashi-k",
      customerGroup: "tokyo-1",
      customerGroupLabel: "東京一組",
    });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(ctx.ownerUserId).toBe("takahashi-k");

    const m = useCreateCaseModel(
      createDeps({ sourceContext: ctx, defaultOwner: "suzuki" }),
    );
    expect(m.draft.owner).toBe("takahashi-k");
  });

  it("BMV entry without ownerUserId falls back to defaultOwner (G3)", () => {
    const query = buildCaseCreateQuery({
      templateCode: "bmv",
      customerId: "cust-002",
    });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(ctx.ownerUserId).toBeUndefined();

    const m = useCreateCaseModel(
      createDeps({ sourceContext: ctx, defaultOwner: "suzuki" }),
    );
    expect(m.draft.owner).toBe("suzuki");
  });

  it("ownerUserId round-trips through build → parse (G3)", () => {
    const query = buildCaseCreateQuery({
      templateCode: "bmv",
      customerId: "cust-bmv-020",
      ownerUserId: "yamada-s",
    });
    const ctx = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(ctx.ownerUserId).toBe("yamada-s");
  });

  it("empty ownerUserId produces undefined in parsed context (G3)", () => {
    const ctx = parseCaseCreateQuery(
      { templateCode: "bmv", ownerUserId: "" } as Record<string, string>,
      "",
    );
    expect(ctx.ownerUserId).toBeUndefined();
  });
});
