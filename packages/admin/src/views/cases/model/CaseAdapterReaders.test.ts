// ── Test Ownership ──────────────────────────────────────────────
// Owner: HTTP URL / search-params construction (buildCaseListSearchParams,
//   buildCaseDetailPath), frozen field-mapping contract, and customer
//   downstream reuse query contract.
// Does NOT test: Vue Router query (→ query.test.ts), response mapping,
//   write payloads, or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  buildCaseListSearchParams,
  buildCaseDetailPath,
} from "./CaseAdapterReaders";
import {
  CASE_LIST_PARAM_KEYS,
  CASE_LIST_HTTP_FIELD_MAP,
  CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS,
  _ASSERT_FROZEN_KEYS,
} from "./CaseAdapterTypes";

describe("buildCaseListSearchParams", () => {
  it("always includes view=summary", () => {
    const params = buildCaseListSearchParams({});
    expect(params.get("view")).toBe("summary");
  });

  it("maps owner to ownerUserId", () => {
    const params = buildCaseListSearchParams({ owner: "user-1" });
    expect(params.get("ownerUserId")).toBe("user-1");
  });

  it("maps group to groupId", () => {
    const params = buildCaseListSearchParams({ group: "tokyo-1" });
    expect(params.get("groupId")).toBe("tokyo-1");
  });

  it("maps risk to riskLevel", () => {
    const params = buildCaseListSearchParams({ risk: "high" });
    expect(params.get("riskLevel")).toBe("high");
  });

  it("passes customerId through", () => {
    const params = buildCaseListSearchParams({ customerId: "cust-001" });
    expect(params.get("customerId")).toBe("cust-001");
  });

  it("passes scope, stage, search through", () => {
    const params = buildCaseListSearchParams({
      scope: "all",
      stage: "S3",
      search: "技人国",
    });
    expect(params.get("scope")).toBe("all");
    expect(params.get("stage")).toBe("S3");
    expect(params.get("search")).toBe("技人国");
  });

  it("trims search value", () => {
    const params = buildCaseListSearchParams({ search: "  test  " });
    expect(params.get("search")).toBe("test");
  });

  it("omits empty/falsy values", () => {
    const params = buildCaseListSearchParams({
      scope: "",
      search: "",
      stage: "",
      owner: "",
      group: "",
      risk: "",
    });
    expect(params.has("scope")).toBe(false);
    expect(params.has("search")).toBe(false);
    expect(params.has("stage")).toBe(false);
    expect(params.has("ownerUserId")).toBe(false);
    expect(params.has("groupId")).toBe(false);
    expect(params.has("riskLevel")).toBe(false);
  });

  it("includes page and limit as strings", () => {
    const params = buildCaseListSearchParams({ page: 2, limit: 25 });
    expect(params.get("page")).toBe("2");
    expect(params.get("limit")).toBe("25");
  });

  it("omits page/limit when not provided", () => {
    const params = buildCaseListSearchParams({ stage: "S3" });
    expect(params.has("page")).toBe(false);
    expect(params.has("limit")).toBe(false);
  });

  it("builds combined params for full filter scenario", () => {
    const params = buildCaseListSearchParams({
      scope: "group",
      search: "技人国",
      stage: "S3",
      owner: "user-1",
      group: "tokyo-1",
      risk: "high",
      customerId: "cust-001",
      page: 1,
      limit: 50,
    });
    expect(params.get("scope")).toBe("group");
    expect(params.get("search")).toBe("技人国");
    expect(params.get("stage")).toBe("S3");
    expect(params.get("ownerUserId")).toBe("user-1");
    expect(params.get("groupId")).toBe("tokyo-1");
    expect(params.get("riskLevel")).toBe("high");
    expect(params.get("customerId")).toBe("cust-001");
    expect(params.get("page")).toBe("1");
    expect(params.get("limit")).toBe("50");
    expect(params.get("view")).toBe("summary");
  });

  it("supports customer downstream reuse via customerId-only query", () => {
    const params = buildCaseListSearchParams({ customerId: "cust-001" });
    expect(params.get("customerId")).toBe("cust-001");
    expect(params.get("view")).toBe("summary");
    const keys = Array.from(params.keys());
    expect(keys).toEqual(["customerId", "view"]);
  });

  it("omits customerId when empty", () => {
    const params = buildCaseListSearchParams({ customerId: "" });
    expect(params.has("customerId")).toBe(false);
  });

  it("does not serialize validation (client-side only filter)", () => {
    const params = buildCaseListSearchParams({
      stage: "S3",
    } as Record<string, unknown>);
    expect(params.has("validation")).toBe(false);
    expect(params.has("validationStatus")).toBe(false);
  });

  it("customer downstream: customerId + page + limit produces minimal query", () => {
    const params = buildCaseListSearchParams({
      customerId: "cust-downstream",
      page: 1,
      limit: 20,
    });
    expect(params.get("customerId")).toBe("cust-downstream");
    expect(params.get("page")).toBe("1");
    expect(params.get("limit")).toBe("20");
    expect(params.get("view")).toBe("summary");
    expect(params.has("scope")).toBe(false);
    expect(params.has("search")).toBe(false);
    expect(params.has("stage")).toBe(false);
  });

  it("customer downstream: customerId-only is valid (no extra params)", () => {
    const params = buildCaseListSearchParams({ customerId: "cust-001" });
    const keys = Array.from(params.keys()).sort();
    expect(keys).toEqual(["customerId", "view"]);
  });
});

describe("buildCaseDetailPath", () => {
  it("builds path with encoded id", () => {
    expect(buildCaseDetailPath("/api/cases", "case-001")).toBe(
      "/api/cases/case-001",
    );
  });

  it("encodes special characters in id", () => {
    expect(buildCaseDetailPath("/api/cases", "id/with space")).toBe(
      "/api/cases/id%2Fwith%20space",
    );
  });
});

// ─── Contract Freeze (p0-fe-002b-01) ────────────────────────────
// These tests lock the three-layer query contract. If any of them
// break, the change MUST be coordinated across query.ts,
// CaseAdapterReaders, CaseAdapterTypes, and CustomerRepository.

describe("contract freeze — CaseListParams key set", () => {
  it("compile-time assertion passes (key sets match)", () => {
    expect(_ASSERT_FROZEN_KEYS).toBe(true);
  });

  it("CASE_LIST_PARAM_KEYS enumerates exactly 9 keys", () => {
    expect(CASE_LIST_PARAM_KEYS).toHaveLength(9);
    expect([...CASE_LIST_PARAM_KEYS].sort()).toEqual([
      "customerId",
      "group",
      "limit",
      "owner",
      "page",
      "risk",
      "scope",
      "search",
      "stage",
    ]);
  });

  it("CASE_LIST_HTTP_FIELD_MAP covers every param key", () => {
    for (const key of CASE_LIST_PARAM_KEYS) {
      expect(CASE_LIST_HTTP_FIELD_MAP).toHaveProperty(key);
      expect(typeof CASE_LIST_HTTP_FIELD_MAP[key]).toBe("string");
    }
  });

  it("CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS are non-empty", () => {
    expect(CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS.length).toBeGreaterThan(0);
    for (const field of CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS) {
      expect(typeof field).toBe("string");
    }
  });
});

describe("contract freeze — HTTP field mapping matches builder", () => {
  it("buildCaseListSearchParams maps admin keys to server keys per CASE_LIST_HTTP_FIELD_MAP", () => {
    const params = buildCaseListSearchParams({
      scope: "group",
      search: "test",
      stage: "S3",
      owner: "user-1",
      group: "tokyo-1",
      risk: "high",
      customerId: "cust-001",
      page: 1,
      limit: 50,
    });

    expect(params.get(CASE_LIST_HTTP_FIELD_MAP.scope)).toBe("group");
    expect(params.get(CASE_LIST_HTTP_FIELD_MAP.search)).toBe("test");
    expect(params.get(CASE_LIST_HTTP_FIELD_MAP.stage)).toBe("S3");
    expect(params.get(CASE_LIST_HTTP_FIELD_MAP.owner)).toBe("user-1");
    expect(params.get(CASE_LIST_HTTP_FIELD_MAP.group)).toBe("tokyo-1");
    expect(params.get(CASE_LIST_HTTP_FIELD_MAP.risk)).toBe("high");
    expect(params.get(CASE_LIST_HTTP_FIELD_MAP.customerId)).toBe("cust-001");
    expect(params.get(CASE_LIST_HTTP_FIELD_MAP.page)).toBe("1");
    expect(params.get(CASE_LIST_HTTP_FIELD_MAP.limit)).toBe("50");
  });

  it("buildCaseListSearchParams always hardcodes view=summary", () => {
    expect(buildCaseListSearchParams({}).get("view")).toBe("summary");
    expect(
      buildCaseListSearchParams({ customerId: "cust-001" }).get("view"),
    ).toBe("summary");
  });

  it("buildCaseListSearchParams produces no unexpected keys for full input", () => {
    const params = buildCaseListSearchParams({
      scope: "all",
      search: "x",
      stage: "S1",
      owner: "u",
      group: "g",
      risk: "r",
      customerId: "c",
      page: 1,
      limit: 10,
    });
    const expectedServerKeys = new Set([
      ...Object.values(CASE_LIST_HTTP_FIELD_MAP),
      "view",
    ]);
    const actualKeys = new Set(params.keys());
    expect(actualKeys).toEqual(expectedServerKeys);
  });
});
