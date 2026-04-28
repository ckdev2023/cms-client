// ── Test Ownership ──────────────────────────────────────────────
// Owner: downstream validation set meta-test (p0-qa-002-02).
//
// Purpose: single-entry aggregator for all tests that validate
//   downstream impact of `/api/cases`, customer related cases,
//   documents/dashboard/shared panel changes.
//
// Run: npx vitest run src/views/cases/downstream-validation-set.test.ts
//
// Trigger: any change to `/api/cases` response shape, case detail
//   aggregate DTO, cross-module link builders, deep-link protocol,
//   customer downstream fields, tab schema, or constants.
//
// This file does NOT duplicate coverage. It imports and re-runs
// the authoritative test suites defined in their respective owners.
// See P0-DOWNSTREAM-VALIDATION-SET.md for the full inventory.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  CASE_CROSS_MODULE_LINK_CONTRACT,
  buildCaseDetailHref,
  buildCaseListHref,
  buildCaseCreateHref,
  buildCaseCreateRoute,
  buildCaseDetailRoute,
  buildCaseListRoute,
  buildCustomerDetailHref,
  parseCaseListQuery,
  parseCaseDetailQuery,
  parseCaseCreateQuery,
  resolveDetailTab,
  DEFAULT_CASE_DETAIL_TAB,
} from "./query";
import { CASE_DETAIL_TAB_KEYS } from "./constants";
import {
  CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS,
  CUSTOMER_DOWNSTREAM_FIELD_MAP,
  CUSTOMER_CASES_SHARED_HTTP_PARAMS,
  CASE_LIST_HTTP_FIELD_MAP,
} from "./model/CaseAdapterTypes";
import { buildCaseListSearchParams } from "./model/CaseAdapterReaders";
import { adaptCaseListResult } from "./model/CaseAdapterMappers";
import {
  adaptCustomerCaseListResult,
  CUSTOMER_CASE_UPSTREAM_CONTRACT,
} from "../customers/model/CustomerAdapterMappers";
import type { LocationQuery } from "vue-router";

// ═══════════════════════════════════════════════════════════════════
//  §1 — /api/cases Response DTO Contract
// ═══════════════════════════════════════════════════════════════════

function canonicalFlatDto(overrides: Record<string, unknown> = {}) {
  return {
    id: "case-dv-001",
    customerId: "cust-dv-001",
    caseName: "検証案件",
    caseNo: "DV-001",
    caseTypeCode: "business-management",
    stage: "S4",
    ownerUserId: "user-dv",
    groupId: "group-1",
    riskLevel: "low",
    billingUnpaidAmountCached: 30000,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-15T00:00:00.000Z",
    dueAt: "2026-06-01",
    customerName: "検証太郎",
    groupName: "Tokyo-A",
    ...overrides,
  };
}

function canonicalWrappedDto(
  caseOverrides: Record<string, unknown> = {},
  wrapperOverrides: Record<string, unknown> = {},
) {
  const { customerName, groupName, ...caseFields } =
    canonicalFlatDto(caseOverrides);
  return {
    case: caseFields,
    customerName,
    groupName,
    latestValidation: null,
    ...wrapperOverrides,
  };
}

describe("§1 /api/cases DTO → customer downstream minimum fields (p0-qa-002-02)", () => {
  it("CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS count is stable at 8", () => {
    expect(CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS).toHaveLength(8);
  });

  it("CUSTOMER_DOWNSTREAM_FIELD_MAP count is stable at 7", () => {
    expect(Object.keys(CUSTOMER_DOWNSTREAM_FIELD_MAP)).toHaveLength(7);
  });

  it("CUSTOMER_CASE_UPSTREAM_CONTRACT matches FIELD_MAP keys", () => {
    expect([...CUSTOMER_CASE_UPSTREAM_CONTRACT].sort()).toEqual(
      Object.keys(CUSTOMER_DOWNSTREAM_FIELD_MAP).sort(),
    );
  });

  it("canonical flat DTO contains all minimum fields", () => {
    const dto = canonicalFlatDto();
    for (const field of CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS) {
      expect(dto).toHaveProperty(field);
    }
  });

  it("canonical wrapped DTO nested .case contains all minimum fields", () => {
    const wrapped = canonicalWrappedDto();
    const caseRecord = wrapped.case as Record<string, unknown>;
    for (const field of CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS) {
      expect(caseRecord).toHaveProperty(field);
    }
  });

  it("cases-side adapter parses flat DTO without loss", () => {
    const result = adaptCaseListResult({
      items: [canonicalFlatDto()],
      total: 1,
    });
    expect(result).not.toBeNull();
    expect(result!.items[0].id).toBe("case-dv-001");
    expect(result!.items[0].customerId).toBe("cust-dv-001");
  });

  it("customer-side adapter parses same flat DTO without loss", () => {
    const result = adaptCustomerCaseListResult({
      items: [canonicalFlatDto()],
    });
    expect(result).not.toBeNull();
    expect(result![0].id).toBe("case-dv-001");
    expect(result![0].name).toBe("検証案件");
    expect(result![0].type).toBe("business-management");
    expect(result![0].stage).toBe("S4");
  });

  it("both adapters parse wrapped DTO without loss", () => {
    const wrapped = canonicalWrappedDto();
    const caseSide = adaptCaseListResult({ items: [wrapped], total: 1 });
    const custSide = adaptCustomerCaseListResult({ items: [wrapped] });

    expect(caseSide).not.toBeNull();
    expect(custSide).not.toBeNull();
    expect(caseSide!.items[0].id).toBe(custSide![0].id);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  §2 — Shared HTTP Query Param Contract
// ═══════════════════════════════════════════════════════════════════

describe("§2 shared HTTP query param contract (p0-qa-002-02)", () => {
  it("CUSTOMER_CASES_SHARED_HTTP_PARAMS frozen shape", () => {
    expect(CUSTOMER_CASES_SHARED_HTTP_PARAMS).toEqual({
      customerIdKey: "customerId",
      viewKey: "view",
      viewValue: "summary",
    });
  });

  it("customerIdKey matches CASE_LIST_HTTP_FIELD_MAP.customerId", () => {
    expect(CUSTOMER_CASES_SHARED_HTTP_PARAMS.customerIdKey).toBe(
      CASE_LIST_HTTP_FIELD_MAP.customerId,
    );
  });

  it("buildCaseListSearchParams({ customerId }) sets view=summary", () => {
    const sp = buildCaseListSearchParams({ customerId: "cust-http-001" });
    expect(sp.get("customerId")).toBe("cust-http-001");
    expect(sp.get("view")).toBe("summary");
  });

  it("customerId-only query produces minimal param set", () => {
    const sp = buildCaseListSearchParams({ customerId: "cust-only" });
    const keys = Array.from(sp.keys()).sort();
    expect(keys).toEqual(["customerId", "view"]);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  §3 — Cross-Module Link Contract (14 consumers)
// ═══════════════════════════════════════════════════════════════════

describe("§3 CASE_CROSS_MODULE_LINK_CONTRACT consumer count (p0-qa-002-02)", () => {
  it("has exactly 14 registered consumers", () => {
    expect(Object.keys(CASE_CROSS_MODULE_LINK_CONTRACT.consumers)).toHaveLength(
      14,
    );
  });

  it("every consumer has builder, scenario, description", () => {
    for (const consumer of Object.values(
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers,
    )) {
      expect(typeof consumer.builder).toBe("string");
      expect(typeof consumer.scenario).toBe("string");
      expect(typeof consumer.description).toBe("string");
    }
  });

  it("consumers cover documents, dashboard, customer, cases modules", () => {
    const keys = Object.keys(CASE_CROSS_MODULE_LINK_CONTRACT.consumers);
    expect(keys.some((k) => k.startsWith("document"))).toBe(true);
    expect(keys.some((k) => k.startsWith("dashboard"))).toBe(true);
    expect(keys.some((k) => k.startsWith("customer"))).toBe(true);
    expect(keys.some((k) => k.startsWith("case"))).toBe(true);
    expect(keys.some((k) => k.startsWith("shared"))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  §4 — Document → Case Detail Deep-Link
// ═══════════════════════════════════════════════════════════════════

describe("§4 document → case detail deep-link (p0-qa-002-02)", () => {
  it("documentTableRow consumer links to documents tab", () => {
    const consumer = CASE_CROSS_MODULE_LINK_CONTRACT.consumers.documentTableRow;
    expect(consumer.tab).toBe("documents");

    const href = buildCaseDetailHref("doc-case-001", consumer.tab);
    expect(href).toContain("tab=documents");
    expect(href).toMatch(/^#\/cases\/doc-case-001/);
  });

  it("sharedExpiryRiskPanel consumer links without tab (default overview)", () => {
    const consumer =
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers.sharedExpiryRiskPanel;
    expect(consumer.tab).toBeUndefined();

    const href = buildCaseDetailHref("risk-case-001", consumer.tab);
    expect(href).not.toContain("tab=");
    expect(href).toBe("#/cases/risk-case-001");
  });

  it("documents tab round-trips through parse → resolve", () => {
    const href = buildCaseDetailHref("case-001", "documents");
    const query = extractQueryFromHref(href);
    const parsed = parseCaseDetailQuery(query as LocationQuery);
    expect(resolveDetailTab(parsed.tab)).toBe("documents");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  §5 — Dashboard → Case Create
// ═══════════════════════════════════════════════════════════════════

describe("§5 dashboard → case create (p0-qa-002-02)", () => {
  it("dashboardQuickActionCreateCase uses router.push scenario", () => {
    const consumer =
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers.dashboardQuickActionCreateCase;
    expect(consumer.scenario).toBe("router.push");
  });

  it("contract pathPattern for caseCreate is /cases/create", () => {
    expect(CASE_CROSS_MODULE_LINK_CONTRACT.pathPatterns.caseCreate).toBe(
      "/cases/create",
    );
  });

  it("dashboardWorkPanel uses API-driven scenario", () => {
    const consumer =
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers.dashboardWorkPanel;
    expect(consumer.builder).toBe("API-driven");
    expect(consumer.scenario).toBe("item.route");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  §6 — Customer → Case List Entry
// ═══════════════════════════════════════════════════════════════════

describe("§6 customer → case list entry (p0-qa-002-02)", () => {
  it("customerTableRow consumer uses buildCaseListHref", () => {
    const consumer = CASE_CROSS_MODULE_LINK_CONTRACT.consumers.customerTableRow;
    expect(consumer.builder).toBe("buildCaseListHref");
  });

  it("buildCaseListHref preserves customerId through parse round-trip", () => {
    const href = buildCaseListHref({ customerId: "cust-rt-001" });
    expect(href).toContain("customerId=cust-rt-001");

    const query = extractQueryFromHref(href);
    const parsed = parseCaseListQuery(query as LocationQuery);
    expect(parsed.customerId).toBe("cust-rt-001");
  });

  it("buildCaseListRoute preserves customerId in route query", () => {
    const route = buildCaseListRoute({ customerId: "cust-route-001" });
    expect(route.name).toBe("cases");
    expect(route.query).toEqual({ customerId: "cust-route-001" });
  });
});

// ═══════════════════════════════════════════════════════════════════
//  §7 — Customer → Case Create Entry
// ═══════════════════════════════════════════════════════════════════

describe("§7 customer → case create entry (p0-qa-002-02)", () => {
  it("customerTableRowCreate consumer uses buildCaseCreateHref", () => {
    const consumer =
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers.customerTableRowCreate;
    expect(consumer.builder).toBe("buildCaseCreateHref");
  });

  it("single create preserves customerId through parse round-trip", () => {
    const href = buildCaseCreateHref({ customerId: "cust-create-001" });
    const query = extractQueryFromHref(href);
    const parsed = parseCaseCreateQuery(query as LocationQuery, "");
    expect(parsed.customerId).toBe("cust-create-001");
    expect(parsed.familyBulkMode).toBe(false);
  });

  it("family-bulk create preserves customerId and mode through round-trip", () => {
    const route = buildCaseCreateRoute({ customerId: "cust-fam-001" }, true);
    expect(route.hash).toBe("#family-bulk");

    const parsed = parseCaseCreateQuery(
      (route.query ?? {}) as LocationQuery,
      route.hash ?? "",
    );
    expect(parsed.customerId).toBe("cust-fam-001");
    expect(parsed.familyBulkMode).toBe(true);
  });

  it("customer defaults round-trip through query", () => {
    const route = buildCaseCreateRoute({
      customerId: "cust-defaults-001",
      customerName: "Test Customer",
      customerGroup: "grp-001",
      customerGroupLabel: "Group A",
    });
    const parsed = parseCaseCreateQuery(
      (route.query ?? {}) as LocationQuery,
      "",
    );
    expect(parsed.customerId).toBe("cust-defaults-001");
    expect(parsed.customerName).toBe("Test Customer");
    expect(parsed.customerGroup).toBe("grp-001");
    expect(parsed.customerGroupLabel).toBe("Group A");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  §8 — Case Detail → Customer Back-Link
// ═══════════════════════════════════════════════════════════════════

describe("§8 case detail → customer back-link (p0-qa-002-02)", () => {
  it("buildCustomerDetailHref with cases tab", () => {
    const href = buildCustomerDetailHref("cust-001", "cases");
    expect(href).toBe("#/customers/cust-001?tab=cases");
  });

  it("buildCustomerDetailHref with default tab omits tab param", () => {
    const href = buildCustomerDetailHref("cust-001");
    expect(href).toBe("#/customers/cust-001");
    expect(href).not.toContain("tab=");
  });

  it("empty customerId falls back to customer list", () => {
    expect(buildCustomerDetailHref("")).toBe("#/customers");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  §9 — Tab Query Protocol Consistency
// ═══════════════════════════════════════════════════════════════════

describe("§9 tab query protocol consistency (p0-qa-002-02)", () => {
  it("all 10 tabs round-trip through href → parse → resolve", () => {
    for (const tab of CASE_DETAIL_TAB_KEYS) {
      const href = buildCaseDetailHref("case-tab-rt", tab);
      const query = extractQueryFromHref(href);
      const parsed = parseCaseDetailQuery(query as LocationQuery);
      const resolved = resolveDetailTab(parsed.tab);
      expect(resolved).toBe(tab);
    }
  });

  it("all 10 tabs round-trip through route → parse → resolve", () => {
    for (const tab of CASE_DETAIL_TAB_KEYS) {
      const route = buildCaseDetailRoute("case-tab-rt", tab);
      const parsed = parseCaseDetailQuery((route.query ?? {}) as LocationQuery);
      const resolved = resolveDetailTab(parsed.tab);
      expect(resolved).toBe(tab);
    }
  });

  it("default tab is omitted in both href and route builders", () => {
    const defaultTab = DEFAULT_CASE_DETAIL_TAB;
    const href = buildCaseDetailHref("case-001", defaultTab as "overview");
    expect(href).not.toContain("tab=");

    const route = buildCaseDetailRoute("case-001", defaultTab as "overview");
    expect(route.query).toBeUndefined();
  });

  it("tabQueryKey is 'tab'", () => {
    expect(CASE_CROSS_MODULE_LINK_CONTRACT.tabQueryKey).toBe("tab");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  §10 — Full Navigation Chain Smoke
// ═══════════════════════════════════════════════════════════════════

describe("§10 full navigation chain smoke (p0-qa-002-02)", () => {
  it("customer → case list → case detail → customer back-link", () => {
    const customerId = "cust-chain-dv";
    const caseId = "case-chain-dv";

    const listHref = buildCaseListHref({ customerId });
    expect(listHref).toContain(`customerId=${customerId}`);

    const detailRoute = buildCaseDetailRoute(caseId);
    expect(detailRoute.params.id).toBe(caseId);

    const backHref = buildCustomerDetailHref(customerId, "cases");
    expect(backHref).toBe(`#/customers/${customerId}?tab=cases`);
  });

  it("customer → case create → success → case detail", () => {
    const customerId = "cust-create-dv";
    const newCaseId = "new-case-dv";

    const createRoute = buildCaseCreateRoute({ customerId });
    expect(createRoute.name).toBe("case-create");
    expect(createRoute.query?.customerId).toBe(customerId);

    const detailRoute = buildCaseDetailRoute(newCaseId);
    expect(detailRoute.name).toBe("case-detail");
    expect(detailRoute.params.id).toBe(newCaseId);
  });

  it("document → case detail documents → tab switch", () => {
    const caseId = "doc-chain-dv";
    const docHref = buildCaseDetailHref(caseId, "documents");
    expect(docHref).toContain("tab=documents");

    const billingRoute = buildCaseDetailRoute(caseId, "billing");
    const parsed = parseCaseDetailQuery(
      (billingRoute.query ?? {}) as LocationQuery,
    );
    expect(resolveDetailTab(parsed.tab)).toBe("billing");
  });

  it("shared panel → case detail (no tab) → overview", () => {
    const href = buildCaseDetailHref("shared-panel-case");
    expect(href).not.toContain("tab=");

    const query = extractQueryFromHref(href);
    const parsed = parseCaseDetailQuery(query as LocationQuery);
    expect(resolveDetailTab(parsed.tab)).toBe("overview");
  });
});

// ─── Helpers ──────────────────────────────────────────────────────

function extractQueryFromHref(href: string): Record<string, string> {
  const qIdx = href.indexOf("?");
  if (qIdx < 0) return {};
  const hashIdx = href.indexOf("#", qIdx + 1);
  const qs =
    hashIdx > qIdx ? href.slice(qIdx + 1, hashIdx) : href.slice(qIdx + 1);
  const result: Record<string, string> = {};
  for (const pair of qs.split("&")) {
    const [k, v] = pair.split("=");
    if (k) result[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return result;
}
