// ── Test Ownership ──────────────────────────────────────────────
// Owner: detail page tab query parsing/serialization and cross-module
//   deep-link builders (p0-fe-002c-03).
// Covers: parseCaseDetailQuery, buildCaseDetailQuery,
//   buildCaseDetailHref, buildCaseDetailRoute, buildCustomerDetailHref,
//   and frozen contract assertions for the detail nav protocol.
// Does NOT test: list query, create query, HTTP URLSearchParams, or
//   repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import type { LocationQuery } from "vue-router";
import {
  parseCaseDetailQuery,
  buildCaseDetailQuery,
  buildCaseDetailHref,
  buildCaseDetailRoute,
  buildCustomerDetailHref,
  buildCustomerDetailHrefFromCase,
  CASE_DETAIL_QUERY_PARAM_KEYS,
  _ASSERT_DETAIL_QUERY_FROZEN_KEYS,
  type CaseDetailQueryParams,
} from "./query";
import { CASE_DETAIL_TAB_KEYS } from "./constants";
import { CASE_DETAIL_NAV_PROTOCOL } from "./model/CaseAdapterTypes";

// ─── parseCaseDetailQuery ───────────────────────────────────────

describe("parseCaseDetailQuery", () => {
  it("returns undefined tab for empty query", () => {
    const result = parseCaseDetailQuery({});
    expect(result.tab).toBeUndefined();
  });

  it("parses valid tab values", () => {
    for (const tab of CASE_DETAIL_TAB_KEYS) {
      expect(parseCaseDetailQuery({ tab }).tab).toBe(tab);
    }
  });

  it("returns undefined tab for invalid value", () => {
    expect(parseCaseDetailQuery({ tab: "bogus" }).tab).toBeUndefined();
    expect(parseCaseDetailQuery({ tab: "S1" }).tab).toBeUndefined();
  });

  it("handles array value by taking first string", () => {
    const query: LocationQuery = { tab: ["overview", "billing"] };
    const result = parseCaseDetailQuery(query);
    expect(result.tab).toBeUndefined();
  });

  it("handles empty string as undefined", () => {
    expect(parseCaseDetailQuery({ tab: "" }).tab).toBeUndefined();
  });
});

// ─── buildCaseDetailQuery ───────────────────────────────────────

describe("buildCaseDetailQuery", () => {
  it("omits tab when undefined", () => {
    expect(buildCaseDetailQuery({}).tab).toBeUndefined();
  });

  it("omits overview tab (default)", () => {
    expect(buildCaseDetailQuery({ tab: "overview" }).tab).toBeUndefined();
  });

  it("includes non-default tabs", () => {
    expect(buildCaseDetailQuery({ tab: "billing" }).tab).toBe("billing");
    expect(buildCaseDetailQuery({ tab: "documents" }).tab).toBe("documents");
    expect(buildCaseDetailQuery({ tab: "log" }).tab).toBe("log");
  });

  it("round-trips with parseCaseDetailQuery for non-default tab", () => {
    const tabs = CASE_DETAIL_TAB_KEYS.filter((t) => t !== "overview");
    for (const tab of tabs) {
      const query = buildCaseDetailQuery({ tab });
      const parsed = parseCaseDetailQuery(query as LocationQuery);
      expect(parsed.tab).toBe(tab);
    }
  });

  it("round-trips for overview (both produce undefined/no-tab state)", () => {
    const query = buildCaseDetailQuery({ tab: "overview" });
    const parsed = parseCaseDetailQuery(query as LocationQuery);
    expect(parsed.tab).toBeUndefined();
  });
});

// ─── buildCaseDetailHref ────────────────────────────────────────

describe("buildCaseDetailHref", () => {
  it("builds basic href without tab", () => {
    expect(buildCaseDetailHref("case-001")).toBe("#/cases/case-001");
  });

  it("omits tab query for overview", () => {
    expect(buildCaseDetailHref("case-001", "overview")).toBe(
      "#/cases/case-001",
    );
  });

  it("appends tab query for non-overview tabs", () => {
    expect(buildCaseDetailHref("case-001", "billing")).toBe(
      "#/cases/case-001?tab=billing",
    );
    expect(buildCaseDetailHref("case-001", "documents")).toBe(
      "#/cases/case-001?tab=documents",
    );
  });

  it("URI-encodes caseId with special characters", () => {
    expect(buildCaseDetailHref("case/001")).toBe("#/cases/case%2F001");
  });
});

// ─── buildCaseDetailRoute ───────────────────────────────────────

describe("buildCaseDetailRoute", () => {
  it("builds route object with name and params", () => {
    const route = buildCaseDetailRoute("case-001");
    expect(route.name).toBe("case-detail");
    expect(route.params.id).toBe("case-001");
    expect(route.query).toBeUndefined();
  });

  it("omits query for overview tab", () => {
    const route = buildCaseDetailRoute("case-001", "overview");
    expect(route.query).toBeUndefined();
  });

  it("includes query for non-overview tabs", () => {
    const route = buildCaseDetailRoute("case-001", "billing");
    expect(route.query).toEqual({ tab: "billing" });
  });

  it("omits query when tab is undefined", () => {
    const route = buildCaseDetailRoute("case-001", undefined);
    expect(route.query).toBeUndefined();
  });
});

// ─── buildCustomerDetailHref ────────────────────────────────────

describe("buildCustomerDetailHref", () => {
  it("builds customer detail href", () => {
    expect(buildCustomerDetailHref("cust-001")).toBe("#/customers/cust-001");
  });

  it("falls back to customer list for empty id", () => {
    expect(buildCustomerDetailHref("")).toBe("#/customers");
  });

  it("URI-encodes customerId with special characters", () => {
    expect(buildCustomerDetailHref("cust/001")).toBe("#/customers/cust%2F001");
  });
});

describe("buildCustomerDetailHrefFromCase", () => {
  it("delegates when customer differs from case id", () => {
    expect(buildCustomerDetailHrefFromCase("cust-1", "case-99")).toBe(
      "#/customers/cust-1",
    );
  });

  it("falls back to customer list when customerId equals case id", () => {
    expect(buildCustomerDetailHrefFromCase("case-uu", "case-uu")).toBe(
      "#/customers",
    );
  });

  it("falls back to customer list when customerId is blank", () => {
    expect(buildCustomerDetailHrefFromCase("", "case-uu")).toBe("#/customers");
  });

  it("passes tab when safe", () => {
    expect(buildCustomerDetailHrefFromCase("cust-2", "case-uu", "cases")).toBe(
      "#/customers/cust-2?tab=cases",
    );
    expect(buildCustomerDetailHrefFromCase("case-uu", "case-uu", "cases")).toBe(
      "#/customers",
    );
  });
});

// ─── Contract Freeze — CaseDetailQueryParams (p0-fe-002c-03) ────

describe("contract freeze — CaseDetailQueryParams key set", () => {
  it("compile-time assertion passes (key sets match)", () => {
    expect(_ASSERT_DETAIL_QUERY_FROZEN_KEYS).toBe(true);
  });

  it("CASE_DETAIL_QUERY_PARAM_KEYS enumerates exactly 1 key", () => {
    expect(CASE_DETAIL_QUERY_PARAM_KEYS).toHaveLength(1);
    expect(CASE_DETAIL_QUERY_PARAM_KEYS).toEqual(["tab"]);
  });

  it("tab key matches CASE_DETAIL_NAV_PROTOCOL.tabQueryKey", () => {
    expect(CASE_DETAIL_QUERY_PARAM_KEYS[0]).toBe(
      CASE_DETAIL_NAV_PROTOCOL.tabQueryKey,
    );
  });

  it("parseCaseDetailQuery returns all detail query param keys", () => {
    const result = parseCaseDetailQuery({});
    for (const key of CASE_DETAIL_QUERY_PARAM_KEYS) {
      expect(key in result).toBe(true);
    }
  });

  it("buildCaseDetailQuery accepts all detail query param keys", () => {
    const input: CaseDetailQueryParams = { tab: "billing" };
    const result = buildCaseDetailQuery(input);
    expect(typeof result).toBe("object");
    for (const key of CASE_DETAIL_QUERY_PARAM_KEYS) {
      expect(key in input).toBe(true);
    }
  });

  it("CASE_DETAIL_NAV_PROTOCOL.defaultTab is overview", () => {
    expect(CASE_DETAIL_NAV_PROTOCOL.defaultTab).toBe("overview");
  });
});

// ─── Contract Freeze — Deep-Link Navigation Protocol (p0-fe-002c-03) ─

describe("contract freeze — deep-link navigation protocol", () => {
  it("buildCaseDetailHref uses CASE_DETAIL_NAV_PROTOCOL.tabQueryKey", () => {
    const href = buildCaseDetailHref("case-001", "billing");
    expect(href).toContain(`${CASE_DETAIL_NAV_PROTOCOL.tabQueryKey}=billing`);
  });

  it("buildCaseDetailRoute uses CASE_DETAIL_NAV_PROTOCOL.tabQueryKey", () => {
    const route = buildCaseDetailRoute("case-001", "billing");
    expect(route.query).toHaveProperty(
      CASE_DETAIL_NAV_PROTOCOL.tabQueryKey,
      "billing",
    );
  });

  it("default tab (overview) is omitted from both href and route query", () => {
    const href = buildCaseDetailHref(
      "case-001",
      CASE_DETAIL_NAV_PROTOCOL.defaultTab as "overview",
    );
    expect(href).not.toContain("tab=");

    const route = buildCaseDetailRoute(
      "case-001",
      CASE_DETAIL_NAV_PROTOCOL.defaultTab as "overview",
    );
    expect(route.query).toBeUndefined();
  });
});
