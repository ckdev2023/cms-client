// ── Test Ownership ──────────────────────────────────────────────
// Owner: customer → case create entry query contract (p0-fe-010-01).
// Covers:
//   - CaseCreateQueryParams frozen key set alignment
//   - buildCaseCreateQuery / buildCaseCreateRoute / buildCaseCreateHref
//     round-trip with parseCaseCreateQuery
//   - CUSTOMER_CREATE_CASE_ENTRY_CONTRACT alignment with cases-side constants
//   - customer detail single / batch create scenarios
//   - contacts tab batch create with relation serialization
// Does NOT test: case create model (→ useCreateCaseModel.test),
//   case repository (→ CaseRepository.test), customer gate model
//   (→ useCustomerCreateCaseGateModel.test).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  parseCaseCreateQuery,
  buildCaseCreateQuery,
  buildCaseCreateRoute,
  buildCaseCreateHref,
  CASE_CREATE_QUERY_PARAM_KEYS,
  type CaseCreateQueryParams,
} from "../../cases/query";
import { CUSTOMER_CREATE_CASE_ENTRY_CONTRACT } from "./CustomerAdapterTypes";

// ─── Frozen Key Set ─────────────────────────────────────────────

describe("CaseCreateQueryParams frozen key set (p0-fe-010-01, p0-fe-010-02)", () => {
  it("has exactly 16 keys", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toHaveLength(16);
  });

  it("includes customerId", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain("customerId");
  });

  it("includes sourceLeadId", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain("sourceLeadId");
  });

  it("includes relationIds", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain("relationIds");
  });

  it("includes selectedRelations", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain("selectedRelations");
  });

  it("includes templateId", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain("templateId");
  });

  it("includes customerName (p0-fe-010-02)", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain("customerName");
  });

  it("includes customerKana (p0-fe-010-02)", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain("customerKana");
  });

  it("includes customerGroup (p0-fe-010-02)", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain("customerGroup");
  });

  it("includes customerGroupLabel (p0-fe-010-02)", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain("customerGroupLabel");
  });

  it("includes customerContact (p0-fe-010-02)", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain("customerContact");
  });

  it("includes bmvQuestionnaireStatus (bug-039)", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain("bmvQuestionnaireStatus");
  });

  it("includes bmvQuoteStatus (bug-039)", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain("bmvQuoteStatus");
  });

  it("includes bmvSignStatus (bug-039)", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain("bmvSignStatus");
  });

  it("includes bmvIntakeStatus (bug-039)", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain("bmvIntakeStatus");
  });
});

// ─── Cross-Module Contract Alignment ────────────────────────────

describe("customer → case create entry contract alignment (p0-fe-010-01)", () => {
  it("CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.customerIdKey matches CASE_CREATE_QUERY_PARAM_KEYS", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain(
      CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.customerIdKey,
    );
  });

  it("CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.relationIdsKey matches CASE_CREATE_QUERY_PARAM_KEYS", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain(
      CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.relationIdsKey,
    );
  });

  it("CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.selectedRelationsKey matches CASE_CREATE_QUERY_PARAM_KEYS", () => {
    expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain(
      CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.selectedRelationsKey,
    );
  });

  it("CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.routeName is case-create", () => {
    expect(CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.routeName).toBe("case-create");
  });

  it("CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.familyBulkHash is #family-bulk", () => {
    expect(CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.familyBulkHash).toBe(
      "#family-bulk",
    );
  });

  it("contract constant is frozen and stable", () => {
    expect(CUSTOMER_CREATE_CASE_ENTRY_CONTRACT).toEqual({
      customerIdKey: "customerId",
      relationIdsKey: "relationIds",
      selectedRelationsKey: "selectedRelations",
      familyBulkHash: "#family-bulk",
      routeName: "case-create",
      customerDefaultKeys: [
        "customerName",
        "customerKana",
        "customerGroup",
        "customerGroupLabel",
        "customerContact",
      ],
    });
  });
});

// ─── buildCaseCreateQuery ───────────────────────────────────────

describe("buildCaseCreateQuery (p0-fe-010-01)", () => {
  it("serializes customerId only", () => {
    const query = buildCaseCreateQuery({ customerId: "cust-001" });
    expect(query.customerId).toBe("cust-001");
    expect(query.sourceLeadId).toBeUndefined();
    expect(query.relationIds).toBeUndefined();
    expect(query.selectedRelations).toBeUndefined();
  });

  it("serializes all fields when present", () => {
    const params: CaseCreateQueryParams = {
      customerId: "cust-002",
      sourceLeadId: "lead-001",
      relationIds: "r1,r2,r3",
      selectedRelations:
        '[{"id":"r1","name":"テスト","relationType":"spouse"}]',
      templateId: "bmv",
    };
    const query = buildCaseCreateQuery(params);
    expect(query.customerId).toBe("cust-002");
    expect(query.sourceLeadId).toBe("lead-001");
    expect(query.relationIds).toBe("r1,r2,r3");
    expect(query.selectedRelations).toBe(params.selectedRelations);
    expect(query.templateId).toBe("bmv");
  });

  it("omits empty-string fields", () => {
    const query = buildCaseCreateQuery({ customerId: "", sourceLeadId: "" });
    expect(query.customerId).toBeUndefined();
    expect(query.sourceLeadId).toBeUndefined();
  });

  it("omits undefined fields", () => {
    const query = buildCaseCreateQuery({});
    expect(Object.values(query).every((v) => v === undefined)).toBe(true);
  });
});

// ─── buildCaseCreateRoute ───────────────────────────────────────

describe("buildCaseCreateRoute (p0-fe-010-01)", () => {
  it("returns route name = case-create", () => {
    const route = buildCaseCreateRoute({ customerId: "cust-001" });
    expect(route.name).toBe(CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.routeName);
  });

  it("single create: no hash", () => {
    const route = buildCaseCreateRoute({ customerId: "cust-001" });
    expect(route.hash).toBeUndefined();
  });

  it("single create: includes customerId in query", () => {
    const route = buildCaseCreateRoute({ customerId: "cust-001" });
    expect(route.query?.customerId).toBe("cust-001");
  });

  it("batch create: sets #family-bulk hash", () => {
    const route = buildCaseCreateRoute({ customerId: "cust-001" }, true);
    expect(route.hash).toBe(CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.familyBulkHash);
  });

  it("batch create with relations: includes all query fields", () => {
    const route = buildCaseCreateRoute(
      {
        customerId: "cust-001",
        relationIds: "r1,r2",
        selectedRelations: '[{"id":"r1","name":"A","relationType":"spouse"}]',
      },
      true,
    );
    expect(route.query?.customerId).toBe("cust-001");
    expect(route.query?.relationIds).toBe("r1,r2");
    expect(route.query?.selectedRelations).toBeDefined();
    expect(route.hash).toBe("#family-bulk");
  });

  it("empty params: no query in route", () => {
    const route = buildCaseCreateRoute({});
    expect(route.query).toBeUndefined();
    expect(route.hash).toBeUndefined();
  });
});

// ─── buildCaseCreateHref ────────────────────────────────────────

describe("buildCaseCreateHref (p0-fe-010-01)", () => {
  it("base path starts with #/cases/create", () => {
    const href = buildCaseCreateHref({});
    expect(href).toBe("#/cases/create");
  });

  it("includes customerId query param", () => {
    const href = buildCaseCreateHref({ customerId: "cust-001" });
    expect(href).toContain("customerId=cust-001");
    expect(href).toMatch(/^#\/cases\/create\?/);
  });

  it("family bulk mode appends #family-bulk", () => {
    const href = buildCaseCreateHref({ customerId: "cust-001" }, true);
    expect(href).toContain("#family-bulk");
    expect(href).toContain("customerId=cust-001");
  });

  it("family bulk without query still appends #family-bulk", () => {
    const href = buildCaseCreateHref({}, true);
    expect(href).toContain("#family-bulk");
  });

  it("encodes special characters in customerId", () => {
    const href = buildCaseCreateHref({ customerId: "cust/001&x=1" });
    expect(href).not.toContain("cust/001&x=1");
    expect(href).toContain(encodeURIComponent("cust/001&x=1"));
  });
});

// ─── Round-Trip: build → parse ──────────────────────────────────

describe("round-trip: buildCaseCreateQuery → parseCaseCreateQuery (p0-fe-010-01)", () => {
  it("customerId-only round-trips", () => {
    const query = buildCaseCreateQuery({ customerId: "cust-rt" });
    const parsed = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(parsed.customerId).toBe("cust-rt");
    expect(parsed.familyBulkMode).toBe(false);
  });

  it("full params round-trip (non-bulk)", () => {
    const original: CaseCreateQueryParams = {
      customerId: "cust-full",
      sourceLeadId: "lead-full",
      relationIds: "r1,r2,r3",
      selectedRelations: JSON.stringify([
        { id: "r1", name: "田中", relationType: "spouse" },
      ]),
      templateId: "bmv",
    };
    const query = buildCaseCreateQuery(original);
    const parsed = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(parsed.customerId).toBe("cust-full");
    expect(parsed.sourceLeadId).toBe("lead-full");
    expect(parsed.relationIds).toEqual(["r1", "r2", "r3"]);
    expect(parsed.selectedRelations).toHaveLength(1);
    expect(parsed.selectedRelations![0].id).toBe("r1");
    expect(parsed.templateId).toBe("bmv");
    expect(parsed.familyBulkMode).toBe(false);
  });

  it("invalid templateId is ignored during parse", () => {
    const parsed = parseCaseCreateQuery(
      { customerId: "cust-bad-template", templateId: "unknown" },
      "",
    );
    expect(parsed.customerId).toBe("cust-bad-template");
    expect(parsed.templateId).toBeUndefined();
  });

  it("family bulk mode round-trips via hash", () => {
    const query = buildCaseCreateQuery({ customerId: "cust-bulk" });
    const parsed = parseCaseCreateQuery(
      query as Record<string, string>,
      "#family-bulk",
    );
    expect(parsed.customerId).toBe("cust-bulk");
    expect(parsed.familyBulkMode).toBe(true);
  });

  it("empty params round-trip produces no source context", () => {
    const query = buildCaseCreateQuery({});
    const parsed = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(parsed.customerId).toBeUndefined();
    expect(parsed.sourceLeadId).toBeUndefined();
    expect(parsed.relationIds).toBeUndefined();
    expect(parsed.selectedRelations).toBeUndefined();
    expect(parsed.familyBulkMode).toBe(false);
  });
});

// ─── Customer Detail Scenario: Single Create ────────────────────

describe("customer detail single create scenario (p0-fe-010-01)", () => {
  it("builds route matching CustomerDetailView.handleCreateCase pattern", () => {
    const customerId = "cust-detail-001";
    const route = buildCaseCreateRoute({ customerId });

    expect(route.name).toBe("case-create");
    expect(route.query?.customerId).toBe(customerId);
    expect(route.hash).toBeUndefined();

    const parsed = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    expect(parsed.customerId).toBe(customerId);
    expect(parsed.familyBulkMode).toBe(false);
  });
});

// ─── Customer Detail Scenario: Batch Create ─────────────────────

describe("customer detail batch create scenario (p0-fe-010-01)", () => {
  it("builds route matching CustomerDetailView.handleBatchCreateCase pattern", () => {
    const customerId = "cust-batch-001";
    const route = buildCaseCreateRoute({ customerId }, true);

    expect(route.name).toBe("case-create");
    expect(route.query?.customerId).toBe(customerId);
    expect(route.hash).toBe("#family-bulk");

    const parsed = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    expect(parsed.customerId).toBe(customerId);
    expect(parsed.familyBulkMode).toBe(true);
  });
});

// ─── Contacts Tab Scenario: Batch with Relations ────────────────

describe("contacts tab batch create with relations scenario (p0-fe-010-01)", () => {
  it("builds route matching CustomerContactsTab.handleBatchCreate pattern", () => {
    const customerId = "cust-contacts-001";
    const relations = [
      { id: "r1", name: "田中花子", relationType: "spouse" },
      { id: "r2", name: "田中太郎", relationType: "child" },
    ];

    const route = buildCaseCreateRoute(
      {
        customerId,
        relationIds: relations.map((r) => r.id).join(","),
        selectedRelations: JSON.stringify(
          relations.map((r) => ({
            id: r.id,
            name: r.name,
            relationType: r.relationType,
          })),
        ),
      },
      true,
    );

    expect(route.name).toBe("case-create");
    expect(route.hash).toBe("#family-bulk");
    expect(route.query?.customerId).toBe(customerId);
    expect(route.query?.relationIds).toBe("r1,r2");

    const parsed = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    expect(parsed.customerId).toBe(customerId);
    expect(parsed.relationIds).toEqual(["r1", "r2"]);
    expect(parsed.selectedRelations).toHaveLength(2);
    expect(parsed.selectedRelations![0].name).toBe("田中花子");
    expect(parsed.selectedRelations![1].name).toBe("田中太郎");
    expect(parsed.familyBulkMode).toBe(true);
  });
});
