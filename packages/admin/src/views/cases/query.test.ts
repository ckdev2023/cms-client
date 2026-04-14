import { describe, expect, it } from "vitest";
import type { LocationQuery } from "vue-router";
import {
  buildCaseListQuery,
  parseCaseCreateQuery,
  parseCaseListQuery,
  type CaseListQueryParams,
} from "./query";
import { DEFAULT_CASE_LIST_FILTERS } from "./constants";

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
});
