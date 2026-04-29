// ── Test Ownership ──────────────────────────────────────────────
// Owner: Vue Router LocationQuery ↔ list/create URL state only,
//   plus frozen contract assertions for the query key set.
// Does NOT test: HTTP URLSearchParams (→ CaseAdapterReaders.test),
//   request bodies (→ CaseAdapterWriteBuilders.test), or repository
//   orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import type { LocationQuery } from "vue-router";
import {
  buildCaseListQuery,
  parseCaseCreateQuery,
  parseCaseListQuery,
  CASE_LIST_QUERY_PARAM_KEYS,
  _ASSERT_QUERY_FROZEN_KEYS,
  type CaseListQueryParams,
} from "./query";
import { DEFAULT_CASE_LIST_FILTERS } from "./constants";
import { CASE_LIST_PARAM_KEYS } from "./model/CaseAdapterTypes";

// ─── parseCaseListQuery ─────────────────────────────────────────

describe("parseCaseListQuery", () => {
  it("returns defaults for empty query", () => {
    const result = parseCaseListQuery({});
    expect(result.scope).toBe(DEFAULT_CASE_LIST_FILTERS.scope);
    expect(result.search).toBe("");
    expect(result.stage).toBe("");
    expect(result.owner).toBe("");
    expect(result.group).toBe("");
    expect(result.risk).toBe("");
    expect(result.validation).toBe("");
    expect(result.customerId).toBeUndefined();
  });

  it("parses valid scope", () => {
    expect(parseCaseListQuery({ scope: "all" }).scope).toBe("all");
    expect(parseCaseListQuery({ scope: "group" }).scope).toBe("group");
    expect(parseCaseListQuery({ scope: "mine" }).scope).toBe("mine");
  });

  it("falls back to default scope for invalid value", () => {
    expect(parseCaseListQuery({ scope: "bogus" }).scope).toBe(
      DEFAULT_CASE_LIST_FILTERS.scope,
    );
  });

  it("parses valid stage IDs", () => {
    expect(parseCaseListQuery({ stage: "S1" }).stage).toBe("S1");
    expect(parseCaseListQuery({ stage: "S9" }).stage).toBe("S9");
  });

  it("falls back to empty string for invalid stage", () => {
    expect(parseCaseListQuery({ stage: "S99" }).stage).toBe("");
  });

  it("parses valid risk values", () => {
    expect(parseCaseListQuery({ risk: "normal" }).risk).toBe("normal");
    expect(parseCaseListQuery({ risk: "critical" }).risk).toBe("critical");
  });

  it("falls back to empty string for invalid risk", () => {
    expect(parseCaseListQuery({ risk: "unknown" }).risk).toBe("");
  });

  it("parses valid validation values", () => {
    expect(parseCaseListQuery({ validation: "passed" }).validation).toBe(
      "passed",
    );
    expect(parseCaseListQuery({ validation: "failed" }).validation).toBe(
      "failed",
    );
  });

  it("falls back to empty string for invalid validation", () => {
    expect(parseCaseListQuery({ validation: "nope" }).validation).toBe("");
  });

  it("passes through search, owner, and group as-is", () => {
    const result = parseCaseListQuery({
      search: "李娜",
      owner: "suzuki",
      group: "tokyo-1",
    });
    expect(result.search).toBe("李娜");
    expect(result.owner).toBe("suzuki");
    expect(result.group).toBe("tokyo-1");
  });

  it("extracts customerId when present", () => {
    expect(parseCaseListQuery({ customerId: "cust-002" }).customerId).toBe(
      "cust-002",
    );
  });

  it("returns undefined customerId for empty string", () => {
    expect(parseCaseListQuery({ customerId: "" }).customerId).toBeUndefined();
  });

  it("handles array values by taking first string or empty", () => {
    const query: LocationQuery = { scope: ["all", "mine"] };
    const result = parseCaseListQuery(query);
    expect(result.scope).toBe(DEFAULT_CASE_LIST_FILTERS.scope);
  });
});

// ─── buildCaseListQuery ─────────────────────────────────────────

describe("buildCaseListQuery", () => {
  it("omits default scope", () => {
    const result = buildCaseListQuery({
      ...DEFAULT_CASE_LIST_FILTERS,
    });
    expect(result.scope).toBeUndefined();
  });

  it("includes non-default scope", () => {
    const result = buildCaseListQuery({
      ...DEFAULT_CASE_LIST_FILTERS,
      scope: "all",
    });
    expect(result.scope).toBe("all");
  });

  it("omits empty string fields", () => {
    const result = buildCaseListQuery({ ...DEFAULT_CASE_LIST_FILTERS });
    expect(result.search).toBeUndefined();
    expect(result.stage).toBeUndefined();
    expect(result.owner).toBeUndefined();
    expect(result.group).toBeUndefined();
    expect(result.risk).toBeUndefined();
    expect(result.validation).toBeUndefined();
    expect(result.customerId).toBeUndefined();
  });

  it("includes non-empty fields", () => {
    const result = buildCaseListQuery({
      scope: "all",
      search: "test",
      stage: "S4",
      owner: "tanaka",
      group: "osaka",
      risk: "critical",
      validation: "failed",
      customerId: "cust-001",
    });
    expect(result.scope).toBe("all");
    expect(result.search).toBe("test");
    expect(result.stage).toBe("S4");
    expect(result.owner).toBe("tanaka");
    expect(result.group).toBe("osaka");
    expect(result.risk).toBe("critical");
    expect(result.validation).toBe("failed");
    expect(result.customerId).toBe("cust-001");
  });

  it("round-trips with parseCaseListQuery for non-default values", () => {
    const original: CaseListQueryParams = {
      scope: "all",
      search: "王浩",
      stage: "S5",
      owner: "li",
      group: "tokyo-2",
      risk: "critical",
      validation: "failed",
      phase: "",
      customerId: "cust-003",
    };
    const query = buildCaseListQuery(original);
    const parsed = parseCaseListQuery(query as LocationQuery);
    expect(parsed).toEqual(original);
  });
});

// ─── parseCaseCreateQuery ───────────────────────────────────────

describe("parseCaseCreateQuery", () => {
  it("returns empty context for no params", () => {
    const result = parseCaseCreateQuery({}, "");
    expect(result.sourceLeadId).toBeUndefined();
    expect(result.customerId).toBeUndefined();
    expect(result.familyBulkMode).toBe(false);
  });

  it("extracts sourceLeadId", () => {
    const result = parseCaseCreateQuery({ sourceLeadId: "lead-42" }, "");
    expect(result.sourceLeadId).toBe("lead-42");
  });

  it("extracts customerId", () => {
    const result = parseCaseCreateQuery({ customerId: "cust-001" }, "");
    expect(result.customerId).toBe("cust-001");
  });

  it("extracts templateId when valid", () => {
    const result = parseCaseCreateQuery({ templateId: "bmv" }, "");
    expect(result.templateId).toBe("bmv");
  });

  it("ignores invalid templateId", () => {
    const result = parseCaseCreateQuery({ templateId: "bogus" }, "");
    expect(result.templateId).toBeUndefined();
  });

  it("extracts relationIds and selectedRelations", () => {
    const result = parseCaseCreateQuery(
      {
        relationIds: "rel-001, rel-002",
        selectedRelations: JSON.stringify([
          {
            id: "rel-001",
            name: "田中花子",
            relationType: "spouse",
            tags: ["紧急联系人"],
          },
        ]),
      },
      "",
    );

    expect(result.relationIds).toEqual(["rel-001", "rel-002"]);
    expect(result.selectedRelations).toEqual([
      {
        id: "rel-001",
        name: "田中花子",
        relationType: "spouse",
        kind: "customer",
        roleTitle: undefined,
        phone: undefined,
        email: undefined,
        tags: ["紧急联系人"],
        note: undefined,
      },
    ]);
  });

  it("preserves explicit selected relation kind", () => {
    const result = parseCaseCreateQuery(
      {
        selectedRelations: JSON.stringify([
          {
            id: "cp-001",
            name: "田中顾问",
            relationType: "agent",
            kind: "contact_person",
          },
        ]),
      },
      "",
    );

    expect(result.selectedRelations).toEqual([
      {
        id: "cp-001",
        name: "田中顾问",
        relationType: "agent",
        kind: "contact_person",
        roleTitle: undefined,
        phone: undefined,
        email: undefined,
        tags: undefined,
        note: undefined,
      },
    ]);
  });

  it("detects family bulk mode from hash", () => {
    const result = parseCaseCreateQuery({}, "#family-bulk");
    expect(result.familyBulkMode).toBe(true);
  });

  it("does not activate family bulk mode for other hashes", () => {
    expect(parseCaseCreateQuery({}, "#other").familyBulkMode).toBe(false);
    expect(parseCaseCreateQuery({}, "").familyBulkMode).toBe(false);
  });

  it("returns undefined for empty sourceLeadId", () => {
    expect(
      parseCaseCreateQuery({ sourceLeadId: "" }, "").sourceLeadId,
    ).toBeUndefined();
  });

  it("ignores invalid selectedRelations payload", () => {
    const result = parseCaseCreateQuery(
      {
        relationIds: " rel-001 , rel-001 ",
        selectedRelations: "{bad-json}",
      },
      "",
    );

    expect(result.relationIds).toEqual(["rel-001"]);
    expect(result.selectedRelations).toBeUndefined();
  });
});

// ─── Contract Freeze (p0-fe-002b-01) ────────────────────────────
// These tests lock the query.ts ↔ CaseAdapterTypes key-set boundary.
// Breaking these means a coordinated update is needed.

describe("contract freeze — CaseListQueryParams key set", () => {
  it("compile-time assertion passes (key sets match)", () => {
    expect(_ASSERT_QUERY_FROZEN_KEYS).toBe(true);
  });

  it("CASE_LIST_QUERY_PARAM_KEYS enumerates exactly 9 keys", () => {
    expect(CASE_LIST_QUERY_PARAM_KEYS).toHaveLength(9);
    expect([...CASE_LIST_QUERY_PARAM_KEYS].sort()).toEqual([
      "customerId",
      "group",
      "owner",
      "phase",
      "risk",
      "scope",
      "search",
      "stage",
      "validation",
    ]);
  });

  it("CaseListQueryParams keys are a superset of CaseListParams filter keys", () => {
    const queryKeys = new Set(CASE_LIST_QUERY_PARAM_KEYS);
    const httpFilterKeys = CASE_LIST_PARAM_KEYS.filter(
      (k) => k !== "page" && k !== "limit",
    );
    for (const key of httpFilterKeys) {
      expect(queryKeys.has(key)).toBe(true);
    }
  });

  it("validation is in query params but NOT in HTTP params", () => {
    expect(CASE_LIST_QUERY_PARAM_KEYS).toContain("validation");
    expect(CASE_LIST_PARAM_KEYS).not.toContain("validation");
  });

  it("page and limit are in HTTP params but NOT in query params", () => {
    expect(CASE_LIST_PARAM_KEYS).toContain("page");
    expect(CASE_LIST_PARAM_KEYS).toContain("limit");
    expect(CASE_LIST_QUERY_PARAM_KEYS).not.toContain("page");
    expect(CASE_LIST_QUERY_PARAM_KEYS).not.toContain("limit");
  });

  it("parseCaseListQuery returns all query param keys", () => {
    const result = parseCaseListQuery({});
    const returnedKeys = Object.keys(result).sort();
    expect(returnedKeys).toEqual([...CASE_LIST_QUERY_PARAM_KEYS].sort());
  });

  it("buildCaseListQuery accepts all query param keys", () => {
    const input: CaseListQueryParams = {
      scope: "all",
      search: "test",
      stage: "S1",
      owner: "u",
      group: "g",
      risk: "critical",
      validation: "passed",
      phase: "UNDER_REVIEW",
      customerId: "c",
    };
    const result = buildCaseListQuery(input);
    expect(typeof result).toBe("object");
    for (const key of CASE_LIST_QUERY_PARAM_KEYS) {
      expect(key in input).toBe(true);
    }
  });
});
