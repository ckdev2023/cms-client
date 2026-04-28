// ── Test Ownership ──────────────────────────────────────────────
// Owner: cross-module link focused regression (p0-fe-012-03).
// Covers: entry navigation round-trips, back-link consistency,
//   and tab query preservation across all CASE_CROSS_MODULE_LINK_CONTRACT
//   consumers. Validates that customers/documents/dashboard/cases
//   internal entry points produce navigation targets that survive
//   build → parse → resolve cycles.
// Does NOT test: individual builder unit behaviour (→ query.detail-deeplink.test),
//   contract shape freeze (→ query.cross-module-link-contract.test),
//   tab schema (→ query.tab-schema.test), create query params (→ query.family-entry-contract.test).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import type { LocationQuery } from "vue-router";
import {
  buildCaseDetailHref,
  buildCaseDetailRoute,
  buildCaseDetailQuery,
  buildCaseListHref,
  buildCaseListRoute,
  buildCaseCreateHref,
  buildCaseCreateRoute,
  buildCustomerDetailHref,
  parseCaseDetailQuery,
  parseCaseListQuery,
  parseCaseCreateQuery,
  resolveDetailTab,
  CASE_CROSS_MODULE_LINK_CONTRACT,
  DEFAULT_CASE_DETAIL_TAB,
} from "./query";
import { CASE_DETAIL_TAB_KEYS } from "./constants";
import type { CaseDetailTab } from "./types";

// ─── Helpers ─────────────────────────────────────────────────────

function extractTabFromHref(href: string): string | undefined {
  const match = href.match(/[?&]tab=([^&#]*)/);
  return match?.[1];
}

function extractCustomerIdFromHref(href: string): string | undefined {
  const match = href.match(/[?&]customerId=([^&#]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

function hrefToLocationQuery(href: string): LocationQuery {
  const qIdx = href.indexOf("?");
  if (qIdx < 0) return {};
  const hashIdx = href.indexOf("#", qIdx);
  const qs =
    hashIdx > qIdx ? href.slice(qIdx + 1, hashIdx) : href.slice(qIdx + 1);
  const result: LocationQuery = {};
  for (const pair of qs.split("&")) {
    const [k, v] = pair.split("=");
    if (k) result[decodeURIComponent(k)] = v ? decodeURIComponent(v) : "";
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════
//  Entry Navigation: customer → case list
// ═══════════════════════════════════════════════════════════════════

describe("entry: customer table row → case list (p0-fe-012-03)", () => {
  it("href contains customerId and round-trips through parseCaseListQuery", () => {
    const href = buildCaseListHref({ customerId: "cust-entry-001" });
    expect(href).toMatch(/^#\/cases/);

    const customerId = extractCustomerIdFromHref(href);
    expect(customerId).toBe("cust-entry-001");

    const query = hrefToLocationQuery(href);
    const parsed = parseCaseListQuery(query);
    expect(parsed.customerId).toBe("cust-entry-001");
  });

  it("route round-trips customerId through query", () => {
    const route = buildCaseListRoute({ customerId: "cust-rt-001" });
    const parsed = parseCaseListQuery((route.query as LocationQuery) ?? {});
    expect(parsed.customerId).toBe("cust-rt-001");
  });

  it("href and route produce consistent customerId", () => {
    const customerId = "cust-consistency-001";
    const href = buildCaseListHref({ customerId });
    const route = buildCaseListRoute({ customerId });

    expect(extractCustomerIdFromHref(href)).toBe(customerId);
    expect(route.query).toEqual({ customerId });
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Entry Navigation: customer → case detail
// ═══════════════════════════════════════════════════════════════════

describe("entry: customer cases tab → case detail (p0-fe-012-03)", () => {
  it("route targets case-detail with correct caseId", () => {
    const route = buildCaseDetailRoute("case-from-cust-001");
    expect(route.name).toBe("case-detail");
    expect(route.params.id).toBe("case-from-cust-001");
    expect(route.query).toBeUndefined();
  });

  it("route with tab round-trips through parseCaseDetailQuery", () => {
    const route = buildCaseDetailRoute("case-tab-001", "billing");
    const parsed = parseCaseDetailQuery((route.query ?? {}) as LocationQuery);
    expect(parsed.tab).toBe("billing");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Entry Navigation: customer → case create
// ═══════════════════════════════════════════════════════════════════

describe("entry: customer detail → case create (p0-fe-012-03)", () => {
  it("single create: route carries customerId through query", () => {
    const route = buildCaseCreateRoute({ customerId: "cust-create-001" });
    expect(route.name).toBe("case-create");
    expect(route.query?.customerId).toBe("cust-create-001");
  });

  it("single create: href round-trips customerId through parseCaseCreateQuery", () => {
    const href = buildCaseCreateHref({ customerId: "cust-create-002" });
    const query = hrefToLocationQuery(href);
    const parsed = parseCaseCreateQuery(query, "");
    expect(parsed.customerId).toBe("cust-create-002");
    expect(parsed.familyBulkMode).toBe(false);
  });

  it("family bulk: route carries hash #family-bulk", () => {
    const route = buildCaseCreateRoute({ customerId: "cust-fam-001" }, true);
    expect(route.name).toBe("case-create");
    expect(route.hash).toBe("#family-bulk");
    expect(route.query?.customerId).toBe("cust-fam-001");
  });

  it("family bulk: href round-trips through parseCaseCreateQuery", () => {
    const href = buildCaseCreateHref({ customerId: "cust-fam-002" }, true);
    expect(href).toContain("#family-bulk");

    const hashIdx = href.lastIndexOf("#family-bulk");
    const hash = href.slice(hashIdx);

    const qStart = href.indexOf("?");
    const qEnd = hashIdx > qStart ? hashIdx : href.length;
    const qs = href.slice(qStart + 1, qEnd);
    const query: LocationQuery = {};
    for (const pair of qs.split("&")) {
      const [k, v] = pair.split("=");
      if (k) query[decodeURIComponent(k)] = v ? decodeURIComponent(v) : "";
    }

    const parsed = parseCaseCreateQuery(query, hash);
    expect(parsed.customerId).toBe("cust-fam-002");
    expect(parsed.familyBulkMode).toBe(true);
  });

  it("href and route produce consistent targets for same customerId", () => {
    const params = { customerId: "cust-both-001" };
    const href = buildCaseCreateHref(params);
    const route = buildCaseCreateRoute(params);

    expect(href).toContain("customerId=cust-both-001");
    expect(route.query?.customerId).toBe("cust-both-001");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Entry Navigation: document → case detail with tab
// ═══════════════════════════════════════════════════════════════════

describe("entry: document table row → case detail documents tab (p0-fe-012-03)", () => {
  it("href targets documents tab and round-trips through parse → resolve", () => {
    const consumer = CASE_CROSS_MODULE_LINK_CONTRACT.consumers.documentTableRow;
    const href = buildCaseDetailHref("doc-case-001", consumer.tab);
    expect(href).toContain("tab=documents");

    const extracted = extractTabFromHref(href);
    expect(extracted).toBe("documents");

    const query = hrefToLocationQuery(href);
    const parsed = parseCaseDetailQuery(query);
    const resolved = resolveDetailTab(parsed.tab);
    expect(resolved).toBe("documents");
  });
});

describe("entry: shared expiry risk panel → case detail overview (p0-fe-012-03)", () => {
  it("href has no tab param, resolves to overview default", () => {
    const href = buildCaseDetailHref("risk-case-001");
    expect(href).not.toContain("tab=");

    const query = hrefToLocationQuery(href);
    const parsed = parseCaseDetailQuery(query);
    expect(resolveDetailTab(parsed.tab)).toBe("overview");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Entry Navigation: case internal consumers (p0-fe-012-02 migration)
// ═══════════════════════════════════════════════════════════════════

describe("entry: case table row → case detail (p0-fe-012-03)", () => {
  it("href targets case detail without tab, resolves to overview", () => {
    const href = buildCaseDetailHref("case-row-001");
    expect(href).toBe("#/cases/case-row-001");
    expect(href).not.toContain("tab=");

    const query = hrefToLocationQuery(href);
    const parsed = parseCaseDetailQuery(query);
    expect(resolveDetailTab(parsed.tab)).toBe("overview");
  });
});

describe("entry: case list create button → case create (p0-fe-012-03)", () => {
  it("route targets case-create with no query", () => {
    const route = buildCaseCreateRoute({});
    expect(route.name).toBe("case-create");
    expect(route.query).toBeUndefined();
  });
});

describe("entry: case create → back to case list (p0-fe-012-03)", () => {
  it("without customerId: route targets cases list, no query", () => {
    const route = buildCaseListRoute();
    expect(route.name).toBe("cases");
    expect(route.query).toBeUndefined();
  });

  it("with customerId: route carries customerId and round-trips", () => {
    const route = buildCaseListRoute({ customerId: "cust-back-001" });
    expect(route.name).toBe("cases");
    const parsed = parseCaseListQuery((route.query as LocationQuery) ?? {});
    expect(parsed.customerId).toBe("cust-back-001");
  });
});

describe("entry: case create success → case detail (p0-fe-012-03)", () => {
  it("route targets case-detail with new case ID", () => {
    const route = buildCaseDetailRoute("new-case-001");
    expect(route.name).toBe("case-detail");
    expect(route.params.id).toBe("new-case-001");
    expect(route.query).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Breadcrumb & Not-Found Back-Links
// ═══════════════════════════════════════════════════════════════════

describe("breadcrumb and back-link → case list (p0-fe-012-03)", () => {
  it("case detail breadcrumb produces bare #/cases", () => {
    expect(buildCaseListHref()).toBe("#/cases");
  });

  it("case create breadcrumb produces bare #/cases", () => {
    expect(buildCaseListHref()).toBe("#/cases");
  });

  it("case detail 404 back-link produces bare #/cases", () => {
    expect(buildCaseListHref()).toBe("#/cases");
  });

  it("all breadcrumb/back-link hrefs use hash-based convention", () => {
    expect(buildCaseListHref()).toMatch(/^#\//);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Back-Link: case detail → customer detail
// ═══════════════════════════════════════════════════════════════════

describe("back-link: case detail → customer detail (p0-fe-012-03)", () => {
  it("produces customer detail href with cases tab", () => {
    const href = buildCustomerDetailHref("cust-back-001", "cases");
    expect(href).toBe("#/customers/cust-back-001?tab=cases");
  });

  it("produces bare customer detail href when no tab specified", () => {
    const href = buildCustomerDetailHref("cust-back-002");
    expect(href).toBe("#/customers/cust-back-002");
    expect(href).not.toContain("tab=");
  });

  it("empty customerId falls back to customer list", () => {
    expect(buildCustomerDetailHref("")).toBe("#/customers");
  });

  it("back-link uses hash-based convention matching forward links", () => {
    const forward = buildCaseDetailHref("case-001");
    const back = buildCustomerDetailHref("cust-001", "cases");
    expect(forward).toMatch(/^#\//);
    expect(back).toMatch(/^#\//);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Tab Query Consistency Across Consumers
// ═══════════════════════════════════════════════════════════════════

describe("tab query consistency across all entry points (p0-fe-012-03)", () => {
  it("every CASE_DETAIL_TAB_KEYS value round-trips through href → parse → resolve", () => {
    for (const tab of CASE_DETAIL_TAB_KEYS) {
      const href = buildCaseDetailHref("case-tab-rt", tab);
      const query = hrefToLocationQuery(href);
      const parsed = parseCaseDetailQuery(query);
      const resolved = resolveDetailTab(parsed.tab);
      expect(resolved).toBe(tab);
    }
  });

  it("every CASE_DETAIL_TAB_KEYS value round-trips through route → parse → resolve", () => {
    for (const tab of CASE_DETAIL_TAB_KEYS) {
      const route = buildCaseDetailRoute("case-tab-rt", tab);
      const routeQuery = (route.query ?? {}) as LocationQuery;
      const parsed = parseCaseDetailQuery(routeQuery);
      const resolved = resolveDetailTab(parsed.tab);
      expect(resolved).toBe(tab);
    }
  });

  it("href and route builders agree on tab presence for every tab", () => {
    for (const tab of CASE_DETAIL_TAB_KEYS) {
      const href = buildCaseDetailHref("case-agree", tab);
      const route = buildCaseDetailRoute("case-agree", tab);

      const hrefHasTab = href.includes("tab=");
      const routeHasTab = route.query !== undefined;

      if (tab === DEFAULT_CASE_DETAIL_TAB) {
        expect(hrefHasTab).toBe(false);
        expect(routeHasTab).toBe(false);
      } else {
        expect(hrefHasTab).toBe(true);
        expect(routeHasTab).toBe(true);
      }
    }
  });

  it("buildCaseDetailQuery omits default tab, includes non-default", () => {
    for (const tab of CASE_DETAIL_TAB_KEYS) {
      const query = buildCaseDetailQuery({ tab });
      if (tab === DEFAULT_CASE_DETAIL_TAB) {
        expect(query.tab).toBeUndefined();
      } else {
        expect(query.tab).toBe(tab);
      }
    }
  });

  it("consumer-declared tabs match builder output", () => {
    const consumers = CASE_CROSS_MODULE_LINK_CONTRACT.consumers;
    for (const [key, consumer] of Object.entries(consumers)) {
      if (consumer.tab !== undefined) {
        const href = buildCaseDetailHref(
          "verify-tab",
          consumer.tab as CaseDetailTab,
        );
        const extracted = extractTabFromHref(href);
        expect(extracted).toBe(consumer.tab);
      }
      void key;
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Cross-Module Round-Trip: full navigation chain
// ═══════════════════════════════════════════════════════════════════

describe("full navigation chain regression (p0-fe-012-03)", () => {
  it("customer → case list → case detail → customer back-link", () => {
    const customerId = "cust-chain-001";
    const caseId = "case-chain-001";

    const listHref = buildCaseListHref({ customerId });
    expect(listHref).toContain(`customerId=${customerId}`);

    const listQuery = hrefToLocationQuery(listHref);
    const listParsed = parseCaseListQuery(listQuery);
    expect(listParsed.customerId).toBe(customerId);

    const detailRoute = buildCaseDetailRoute(caseId);
    expect(detailRoute.params.id).toBe(caseId);

    const backHref = buildCustomerDetailHref(customerId, "cases");
    expect(backHref).toBe(`#/customers/${customerId}?tab=cases`);
  });

  it("customer → case create → success → case detail", () => {
    const customerId = "cust-chain-002";
    const newCaseId = "case-new-chain-001";

    const createRoute = buildCaseCreateRoute({ customerId });
    expect(createRoute.name).toBe("case-create");
    expect(createRoute.query?.customerId).toBe(customerId);

    const detailRoute = buildCaseDetailRoute(newCaseId);
    expect(detailRoute.name).toBe("case-detail");
    expect(detailRoute.params.id).toBe(newCaseId);
  });

  it("document → case detail documents → switch to billing → URL update", () => {
    const caseId = "doc-chain-001";

    const docHref = buildCaseDetailHref(caseId, "documents");
    expect(docHref).toContain("tab=documents");

    const switchQuery = buildCaseDetailQuery({ tab: "billing" });
    expect(switchQuery.tab).toBe("billing");

    const parsed = parseCaseDetailQuery(switchQuery as LocationQuery);
    expect(resolveDetailTab(parsed.tab)).toBe("billing");
  });

  it("case list create button → case create → back to list", () => {
    const createRoute = buildCaseCreateRoute({});
    expect(createRoute.name).toBe("case-create");

    const listRoute = buildCaseListRoute();
    expect(listRoute.name).toBe("cases");
    expect(listRoute.query).toBeUndefined();
  });

  it("case list create button → case create with customerId → back to filtered list", () => {
    const customerId = "cust-filtered-001";

    const createRoute = buildCaseCreateRoute({ customerId });
    expect(createRoute.query?.customerId).toBe(customerId);

    const listRoute = buildCaseListRoute({ customerId });
    expect(listRoute.query).toEqual({ customerId });

    const listParsed = parseCaseListQuery(listRoute.query as LocationQuery);
    expect(listParsed.customerId).toBe(customerId);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Contract ↔ Builder Alignment (every consumer's declared builder exists)
// ═══════════════════════════════════════════════════════════════════

describe("contract consumers use real builder functions (p0-fe-012-03)", () => {
  const builderMap: Record<string, unknown> = {
    buildCaseDetailHref,
    buildCaseDetailRoute,
    buildCaseListHref,
    buildCaseListRoute,
    buildCaseCreateHref,
    buildCaseCreateRoute,
    buildCustomerDetailHref,
  };

  const NON_FUNCTION_BUILDERS = new Set(["API-driven"]);

  it("every function-based consumer references an exported builder", () => {
    for (const [key, consumer] of Object.entries(
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers,
    )) {
      if (NON_FUNCTION_BUILDERS.has(consumer.builder)) continue;
      if (consumer.builder.includes(".")) continue;
      expect(Object.keys(builderMap).includes(consumer.builder)).toBe(true);
      expect(typeof builderMap[consumer.builder]).toBe("function");
      void key;
    }
  });

  it("constant-ref builders reference valid contract paths", () => {
    for (const [key, consumer] of Object.entries(
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers,
    )) {
      if (!consumer.builder.includes(".")) continue;
      expect(typeof consumer.builder).toBe("string");
      expect(consumer.builder.length).toBeGreaterThan(0);
      void key;
    }
  });
});
