// ── Test Ownership ──────────────────────────────────────────────
// Owner: buildCaseListSearchParams customer/summary/page/limit
//   serialization — customerId, page, limit, view=summary.
// Frozen by p0-fe-002b-03.
// Does NOT test: core filters (→ CaseAdapterReaders.core-filters.test),
//   contract key-set freeze (→ CaseAdapterReaders.test), Vue Router
//   query (→ query.test), write payloads, or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { buildCaseListSearchParams } from "./CaseAdapterReaders";
import {
  type CaseListParams,
  CASE_LIST_HTTP_FIELD_MAP,
  CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS,
} from "./CaseAdapterTypes";

// ─── customerId Serialization (p0-fe-002b-03) ──────────────────

describe("customerId serialization", () => {
  it("serializes valid customerId to HTTP key 'customerId'", () => {
    const sp = buildCaseListSearchParams({ customerId: "cust-001" });
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.customerId)).toBe("cust-001");
  });

  it("HTTP key for customerId is 'customerId'", () => {
    expect(CASE_LIST_HTTP_FIELD_MAP.customerId).toBe("customerId");
  });

  it("omits customerId when empty string", () => {
    const sp = buildCaseListSearchParams({ customerId: "" });
    expect(sp.has("customerId")).toBe(false);
  });

  it("omits customerId when undefined", () => {
    const sp = buildCaseListSearchParams({});
    expect(sp.has("customerId")).toBe(false);
  });

  it("omits customerId when null (defensive)", () => {
    const sp = buildCaseListSearchParams({
      customerId: null as unknown as string,
    });
    expect(sp.has("customerId")).toBe(false);
  });

  it("trims whitespace from customerId", () => {
    const sp = buildCaseListSearchParams({ customerId: " cust-002 " });
    expect(sp.get("customerId")).toBe("cust-002");
  });

  it("omits customerId when whitespace-only", () => {
    const sp = buildCaseListSearchParams({ customerId: "   " });
    expect(sp.has("customerId")).toBe(false);
  });

  it("preserves UUID-style customerId", () => {
    const sp = buildCaseListSearchParams({
      customerId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    });
    expect(sp.get("customerId")).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
  });
});

// ─── page Serialization (p0-fe-002b-03) ─────────────────────────

describe("page serialization", () => {
  it("serializes page number to string", () => {
    const sp = buildCaseListSearchParams({ page: 3 });
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.page)).toBe("3");
  });

  it("serializes page=0", () => {
    const sp = buildCaseListSearchParams({ page: 0 });
    expect(sp.get("page")).toBe("0");
  });

  it("serializes page=1", () => {
    const sp = buildCaseListSearchParams({ page: 1 });
    expect(sp.get("page")).toBe("1");
  });

  it("omits page when undefined", () => {
    const sp = buildCaseListSearchParams({});
    expect(sp.has("page")).toBe(false);
  });

  it("omits page when not a number (defensive)", () => {
    const sp = buildCaseListSearchParams({
      page: "2" as unknown as number,
    });
    expect(sp.has("page")).toBe(false);
  });

  it("HTTP key for page is 'page'", () => {
    expect(CASE_LIST_HTTP_FIELD_MAP.page).toBe("page");
  });
});

// ─── limit Serialization (p0-fe-002b-03) ────────────────────────

describe("limit serialization", () => {
  it("serializes limit number to string", () => {
    const sp = buildCaseListSearchParams({ limit: 25 });
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.limit)).toBe("25");
  });

  it("serializes limit=0", () => {
    const sp = buildCaseListSearchParams({ limit: 0 });
    expect(sp.get("limit")).toBe("0");
  });

  it("serializes common page sizes", () => {
    for (const size of [10, 20, 25, 50, 100]) {
      const sp = buildCaseListSearchParams({ limit: size });
      expect(sp.get("limit")).toBe(String(size));
    }
  });

  it("omits limit when undefined", () => {
    const sp = buildCaseListSearchParams({});
    expect(sp.has("limit")).toBe(false);
  });

  it("omits limit when not a number (defensive)", () => {
    const sp = buildCaseListSearchParams({
      limit: "50" as unknown as number,
    });
    expect(sp.has("limit")).toBe(false);
  });

  it("HTTP key for limit is 'limit'", () => {
    expect(CASE_LIST_HTTP_FIELD_MAP.limit).toBe("limit");
  });
});

// ─── view=summary Hardcoding (p0-fe-002b-03) ───────────────────

describe("view=summary hardcoding", () => {
  it("always includes view=summary for empty params", () => {
    const sp = buildCaseListSearchParams({});
    expect(sp.get("view")).toBe("summary");
  });

  it("always includes view=summary when customerId is set", () => {
    const sp = buildCaseListSearchParams({ customerId: "cust-001" });
    expect(sp.get("view")).toBe("summary");
  });

  it("always includes view=summary when page/limit are set", () => {
    const sp = buildCaseListSearchParams({ page: 2, limit: 20 });
    expect(sp.get("view")).toBe("summary");
  });

  it("always includes view=summary for full filter scenario", () => {
    const sp = buildCaseListSearchParams({
      scope: "all",
      search: "test",
      stage: "S3",
      owner: "user-1",
      group: "tokyo-1",
      risk: "critical",
      customerId: "cust-001",
      page: 1,
      limit: 50,
    });
    expect(sp.get("view")).toBe("summary");
  });

  it("view is not overridable via CaseListParams (no view field)", () => {
    const sp = buildCaseListSearchParams({
      scope: "mine",
    } as CaseListParams);
    expect(sp.get("view")).toBe("summary");
  });
});

// ─── Customer Downstream Reuse (p0-fe-002b-03) ─────────────────
// CustomerRepository.listRelatedCases constructs:
//   new URLSearchParams({ customerId: normalizedCustomerId })
// This hardcodes the HTTP param name "customerId". The assertion below
// locks that both sides use the same server param name. If the cases
// adapter renames the HTTP key, the customer downstream must update
// its hardcoded string in sync.

describe("customer downstream shared contract", () => {
  it("CASE_LIST_HTTP_FIELD_MAP.customerId matches customer downstream hardcoded param name", () => {
    const caseSideParamName = CASE_LIST_HTTP_FIELD_MAP.customerId;
    const customerDownstreamParamName = "customerId";
    expect(caseSideParamName).toBe(customerDownstreamParamName);
  });

  it("customerId-only query produces minimal output: customerId + view", () => {
    const sp = buildCaseListSearchParams({ customerId: "cust-001" });
    const keys = Array.from(sp.keys()).sort();
    expect(keys).toEqual(["customerId", "view"]);
  });

  it("customerId + page + limit produces exactly 4 keys", () => {
    const sp = buildCaseListSearchParams({
      customerId: "cust-downstream",
      page: 1,
      limit: 20,
    });
    const keys = Array.from(sp.keys()).sort();
    expect(keys).toEqual(["customerId", "limit", "page", "view"]);
  });

  it("customerId + page + limit values are correct", () => {
    const sp = buildCaseListSearchParams({
      customerId: "cust-downstream",
      page: 1,
      limit: 20,
    });
    expect(sp.get("customerId")).toBe("cust-downstream");
    expect(sp.get("page")).toBe("1");
    expect(sp.get("limit")).toBe("20");
    expect(sp.get("view")).toBe("summary");
  });

  it("no core filters leak into customerId-only query", () => {
    const sp = buildCaseListSearchParams({ customerId: "cust-001" });
    expect(sp.has("scope")).toBe(false);
    expect(sp.has("search")).toBe(false);
    expect(sp.has("stage")).toBe(false);
    expect(sp.has("ownerUserId")).toBe(false);
    expect(sp.has("groupId")).toBe(false);
    expect(sp.has("riskLevel")).toBe(false);
  });

  it("CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS includes id and customerId", () => {
    expect(CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS).toContain("id");
    expect(CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS).toContain("customerId");
  });

  it("CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS is frozen (exactly 8 fields)", () => {
    expect(CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS).toHaveLength(8);
    expect([...CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS].sort()).toEqual([
      "caseName",
      "caseTypeCode",
      "createdAt",
      "customerId",
      "id",
      "ownerUserId",
      "stage",
      "updatedAt",
    ]);
  });
});

// ─── Combined Scenarios (p0-fe-002b-03) ─────────────────────────
// These verify that customerId/page/limit/view interact correctly
// with core filters and with each other.

describe("combined scenarios", () => {
  it("customerId coexists with core filters", () => {
    const sp = buildCaseListSearchParams({
      scope: "group",
      stage: "S5",
      customerId: "cust-combined",
      page: 2,
      limit: 25,
    });
    expect(sp.get("scope")).toBe("group");
    expect(sp.get("stage")).toBe("S5");
    expect(sp.get("customerId")).toBe("cust-combined");
    expect(sp.get("page")).toBe("2");
    expect(sp.get("limit")).toBe("25");
    expect(sp.get("view")).toBe("summary");
  });

  it("page without limit is valid", () => {
    const sp = buildCaseListSearchParams({ page: 3 });
    expect(sp.get("page")).toBe("3");
    expect(sp.has("limit")).toBe(false);
    expect(sp.get("view")).toBe("summary");
  });

  it("limit without page is valid", () => {
    const sp = buildCaseListSearchParams({ limit: 100 });
    expect(sp.has("page")).toBe(false);
    expect(sp.get("limit")).toBe("100");
    expect(sp.get("view")).toBe("summary");
  });

  it("all customer/summary/page params empty → only view=summary", () => {
    const sp = buildCaseListSearchParams({
      customerId: "",
    });
    const keys = Array.from(sp.keys());
    expect(keys).toEqual(["view"]);
  });
});
