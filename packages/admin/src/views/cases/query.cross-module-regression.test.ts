// ── Test Ownership ──────────────────────────────────────────────
// Owner: cross-module link regression (p0-fe-012-03).
// Covers: end-to-end cross-module navigation round-trips,
//   entry point → target page parsing, back-link consistency,
//   and tab query alignment across modules:
//   - customer → case list entry (customerId preservation)
//   - customer → case create entry (customerId + family-bulk)
//   - customer → case detail → customer back-link round-trip
//   - document row → case detail documents tab resolution
//   - shared panel → case detail default tab resolution
//   - case create success → case detail redirect
//   - breadcrumb / not-found back-links → case list
//   - tab query consistency across all cross-module entry points
// Does NOT test: individual builder unit behaviour (→ query.detail-deeplink.test),
//   contract shape freeze (→ query.cross-module-link-contract.test),
//   deep-link lifecycle (→ query.deeplink-regression.test).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { ref } from "vue";
import type { LocationQuery } from "vue-router";
import {
  buildCaseDetailHref,
  buildCaseDetailRoute,
  buildCaseListHref,
  buildCaseListRoute,
  buildCaseCreateHref,
  buildCaseCreateRoute,
  buildCustomerDetailHref,
  parseCaseListQuery,
  parseCaseDetailQuery,
  parseCaseCreateQuery,
  resolveDetailTab,
  DEFAULT_CASE_DETAIL_TAB,
  CASE_CROSS_MODULE_LINK_CONTRACT,
} from "./query";
import { CASE_DETAIL_TAB_ALIASES, CASE_DETAIL_TAB_KEYS } from "./constants";
import { useCaseDetailModel } from "./model/useCaseDetailModel";
import {
  createDetailRepoStub,
  createMockAggregate,
  createMockDetail,
} from "./model/useCaseDetailModel.test-support";
import { createMockCaseRepository } from "./repository";
import type { CaseDetailTab } from "./types";

// ─── Shared Helpers ──────────────────────────────────────────────

const listRepo = createMockCaseRepository();
const { repo: detailRepo } = createDetailRepoStub(async (id) =>
  createMockAggregate(createMockDetail({ id })),
);

function firstCaseId(): string {
  const item = listRepo
    .listCases({
      scope: "all",
      search: "",
      stage: "",
      owner: "",
      group: "",
      risk: "",
      validation: "",
    })
    .find((c) => c.sampleKey === "work");
  return item!.id;
}

function extractQueryFromHref(href: string): Record<string, string> {
  const qIdx = href.indexOf("?");
  if (qIdx < 0) return {};
  const qs = href.slice(qIdx + 1).split("#")[0];
  const result: Record<string, string> = {};
  for (const pair of qs.split("&")) {
    const [k, v] = pair.split("=");
    if (k) result[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return result;
}

function extractPathFromHref(href: string): string {
  const withoutHash = href.startsWith("#") ? href.slice(1) : href;
  const qIdx = withoutHash.indexOf("?");
  return qIdx < 0 ? withoutHash : withoutHash.slice(0, qIdx);
}

// ─── Customer → Case List Entry ──────────────────────────────────

describe("customer → case list entry round-trip (p0-fe-012-03)", () => {
  it("customerTableRow href preserves customerId through parse", () => {
    const customerId = "cust-rt-001";
    const href = buildCaseListHref({ customerId });
    const params = extractQueryFromHref(href);

    const parsed = parseCaseListQuery(params as LocationQuery);
    expect(parsed.customerId).toBe(customerId);
  });

  it("customerTableRow href with special chars survives encode→parse", () => {
    const customerId = "cust/special&id=test";
    const href = buildCaseListHref({ customerId });

    expect(href).toContain(encodeURIComponent(customerId));
    const params = extractQueryFromHref(href);
    expect(params.customerId).toBe(customerId);
  });

  it("case list route preserves customerId for router.push consumers", () => {
    const customerId = "cust-route-001";
    const route = buildCaseListRoute({ customerId });

    const parsed = parseCaseListQuery((route.query ?? {}) as LocationQuery);
    expect(parsed.customerId).toBe(customerId);
  });

  it("empty customerId produces bare case list URL", () => {
    const href = buildCaseListHref();
    expect(extractPathFromHref(href)).toBe("/cases");
    expect(extractQueryFromHref(href)).toEqual({});

    const parsed = parseCaseListQuery({});
    expect(parsed.customerId).toBeUndefined();
  });
});

// ─── Customer → Case Create Entry ────────────────────────────────

describe("customer → case create entry round-trip (p0-fe-012-03)", () => {
  it("single create entry preserves customerId through parse", () => {
    const params = { customerId: "cust-create-001" };
    const href = buildCaseCreateHref(params);

    const query = extractQueryFromHref(href);
    const parsed = parseCaseCreateQuery(query as LocationQuery, "");
    expect(parsed.customerId).toBe(params.customerId);
    expect(parsed.familyBulkMode).toBe(false);
  });

  it("family-bulk entry preserves customerId and familyBulkMode", () => {
    const params = { customerId: "cust-family-001" };
    const href = buildCaseCreateHref(params, true);

    expect(href).toContain("#family-bulk");
    const query = extractQueryFromHref(href);
    const parsed = parseCaseCreateQuery(query as LocationQuery, "#family-bulk");
    expect(parsed.customerId).toBe(params.customerId);
    expect(parsed.familyBulkMode).toBe(true);
  });

  it("route-based create entry preserves customerId", () => {
    const params = { customerId: "cust-route-create" };
    const route = buildCaseCreateRoute(params);

    expect(route.name).toBe("case-create");
    const parsed = parseCaseCreateQuery(
      (route.query ?? {}) as LocationQuery,
      route.hash ?? "",
    );
    expect(parsed.customerId).toBe(params.customerId);
  });

  it("family-bulk route entry preserves hash and customerId", () => {
    const params = { customerId: "cust-fb-route" };
    const route = buildCaseCreateRoute(params, true);

    expect(route.hash).toBe("#family-bulk");
    const parsed = parseCaseCreateQuery(
      (route.query ?? {}) as LocationQuery,
      route.hash ?? "",
    );
    expect(parsed.customerId).toBe(params.customerId);
    expect(parsed.familyBulkMode).toBe(true);
  });

  it("create entry with customer defaults preserves all fields", () => {
    const params = {
      customerId: "cust-defaults-001",
      customerName: "Test Customer",
      customerGroup: "grp-001",
      customerGroupLabel: "Group A",
    };
    const route = buildCaseCreateRoute(params);
    const parsed = parseCaseCreateQuery(
      (route.query ?? {}) as LocationQuery,
      "",
    );
    expect(parsed.customerId).toBe(params.customerId);
    expect(parsed.customerName).toBe(params.customerName);
    expect(parsed.customerGroup).toBe(params.customerGroup);
    expect(parsed.customerGroupLabel).toBe(params.customerGroupLabel);
  });
});

// ─── Customer → Case Detail → Customer Back-Link Round-Trip ──────

describe("customer → case detail → customer back-link round-trip (p0-fe-012-03)", () => {
  it("case detail back-link to customer preserves customerId", () => {
    const customerId = "cust-backlink-001";
    const backHref = buildCustomerDetailHref(customerId, "cases");

    expect(backHref).toBe(`#/customers/${customerId}?tab=cases`);
    expect(extractPathFromHref(backHref)).toBe(`/customers/${customerId}`);
    expect(extractQueryFromHref(backHref)).toEqual({ tab: "cases" });
  });

  it("full round-trip: customer list → case detail → customer back-link", () => {
    const customerId = "cust-roundtrip-001";
    const caseId = firstCaseId();

    const listHref = buildCaseListHref({ customerId });
    expect(listHref).toContain(`customerId=${customerId}`);

    const detailRoute = buildCaseDetailRoute(caseId);
    expect(detailRoute.params.id).toBe(caseId);

    const backHref = buildCustomerDetailHref(customerId);
    expect(extractPathFromHref(backHref)).toBe(`/customers/${customerId}`);
  });

  it("empty customerId back-link falls back to customer list", () => {
    const backHref = buildCustomerDetailHref("");
    expect(backHref).toBe("#/customers");
  });

  it("case create success → case detail → customer back-link chain", () => {
    const customerId = "cust-create-success";
    const caseId = "new-case-001";

    const detailRoute = buildCaseDetailRoute(caseId);
    expect(detailRoute.name).toBe("case-detail");
    expect(detailRoute.params.id).toBe(caseId);

    const backHref = buildCustomerDetailHref(customerId, "cases");
    expect(backHref).toContain(customerId);
    expect(backHref).toContain("tab=cases");
  });
});

// ─── Document Row → Case Detail Documents Tab ────────────────────

describe("document row → case detail documents tab (p0-fe-012-03)", () => {
  it("document table row links to documents tab", () => {
    const consumer = CASE_CROSS_MODULE_LINK_CONTRACT.consumers.documentTableRow;
    const href = buildCaseDetailHref("case-doc-001", consumer.tab);

    expect(href).toContain("tab=documents");

    const query = extractQueryFromHref(href);
    const parsed = parseCaseDetailQuery(query as LocationQuery);
    expect(parsed.tab).toBe("documents");
  });

  it("documents tab survives parse → resolve → model lifecycle", () => {
    const href = buildCaseDetailHref(firstCaseId(), "documents");
    const query = extractQueryFromHref(href);
    const parsed = parseCaseDetailQuery(query as LocationQuery);
    const resolved = resolveDetailTab(parsed.tab);
    expect(resolved).toBe("documents");

    const caseId = ref(firstCaseId());
    const routeTab = ref<string | undefined>(resolved);
    const { activeTab } = useCaseDetailModel(caseId, {
      repo: detailRepo,
      routeTab,
    });
    expect(activeTab.value).toBe("documents");
  });
});

// ─── Shared Panel → Case Detail Default Tab ──────────────────────

describe("shared panel → case detail default tab (p0-fe-012-03)", () => {
  it("shared expiry risk panel links without tab → overview default", () => {
    const consumer =
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers.sharedExpiryRiskPanel;
    const href = buildCaseDetailHref("case-risk-001", consumer.tab);

    expect(href).not.toContain("tab=");

    const query = extractQueryFromHref(href);
    const parsed = parseCaseDetailQuery(query as LocationQuery);
    const resolved = resolveDetailTab(parsed.tab);
    expect(resolved).toBe("overview");
  });

  it("model initializes to overview from panel entry", () => {
    const caseId = ref(firstCaseId());
    const routeTab = ref<string | undefined>(undefined);
    const { activeTab } = useCaseDetailModel(caseId, {
      repo: detailRepo,
      routeTab,
    });
    expect(activeTab.value).toBe("overview");
  });
});

// ─── Breadcrumb & Not-Found Back-Links ───────────────────────────

describe("breadcrumb and not-found back-links (p0-fe-012-03)", () => {
  it("case detail breadcrumb produces bare case list href", () => {
    const href = buildCaseListHref();
    expect(href).toBe("#/cases");
    expect(extractQueryFromHref(href)).toEqual({});
  });

  it("case create breadcrumb produces bare case list href", () => {
    const href = buildCaseListHref();
    expect(href).toBe("#/cases");
  });

  it("not-found back-link produces bare case list href", () => {
    const href = buildCaseListHref();
    expect(href).toBe("#/cases");
  });

  it("case create navigateToList with customerId preserves customerId", () => {
    const customerId = "cust-nav-list";
    const route = buildCaseListRoute({ customerId });
    expect(route.name).toBe("cases");
    expect(route.query).toEqual({ customerId });

    const parsed = parseCaseListQuery((route.query ?? {}) as LocationQuery);
    expect(parsed.customerId).toBe(customerId);
  });

  it("case create navigateToList without customerId produces clean route", () => {
    const route = buildCaseListRoute();
    expect(route.name).toBe("cases");
    expect(route.query).toBeUndefined();
  });
});

// ─── Tab Query Consistency Across All Entry Points ───────────────

describe("tab query consistency across cross-module entries (p0-fe-012-03)", () => {
  it("tabQueryKey is consistent between contract and detail parsers", () => {
    const tabKey = CASE_CROSS_MODULE_LINK_CONTRACT.tabQueryKey;
    expect(tabKey).toBe("tab");

    for (const tab of CASE_DETAIL_TAB_KEYS) {
      const href = buildCaseDetailHref("test-case", tab);
      const hrefQuery = extractQueryFromHref(href);

      if (tab === DEFAULT_CASE_DETAIL_TAB) {
        expect(hrefQuery[tabKey]).toBeUndefined();
      } else {
        expect(hrefQuery[tabKey]).toBe(tab);
      }

      const parsed = parseCaseDetailQuery(hrefQuery as LocationQuery);
      const resolved = resolveDetailTab(parsed.tab);
      expect(resolved).toBe(tab);
    }
  });

  it("href and route builders produce matching tab targets for all tabs", () => {
    for (const tab of CASE_DETAIL_TAB_KEYS) {
      const href = buildCaseDetailHref("case-001", tab);
      const route = buildCaseDetailRoute("case-001", tab);

      const hrefQuery = extractQueryFromHref(href);
      const hrefTab = resolveDetailTab(hrefQuery.tab);
      const routeTab = resolveDetailTab(route.query?.tab);

      expect(hrefTab).toBe(routeTab);
      expect(hrefTab).toBe(tab);
    }
  });

  it("all consumers with fixed tab produce correct tab in output", () => {
    const consumers = CASE_CROSS_MODULE_LINK_CONTRACT.consumers;
    for (const [key, consumer] of Object.entries(consumers)) {
      if (consumer.tab === undefined) continue;
      if (consumer.builder === "API-driven") continue;

      const href = buildCaseDetailHref("case-001", consumer.tab);
      const query = extractQueryFromHref(href);
      const parsed = parseCaseDetailQuery(query as LocationQuery);
      expect(resolveDetailTab(parsed.tab)).toBe(consumer.tab);
      void key;
    }
  });

  it("default tab is consistently omitted across all builders", () => {
    const defaultTab = DEFAULT_CASE_DETAIL_TAB;

    const href = buildCaseDetailHref("case-001", defaultTab);
    expect(href).not.toContain("tab=");

    const route = buildCaseDetailRoute("case-001", defaultTab);
    expect(route.query).toBeUndefined();
  });
});

// ─── Tab Alias Resolution (BUG-116) ─────────────────────────────

describe("tab alias resolution — timeline → log (BUG-116)", () => {
  it('resolveDetailTab("timeline") returns "log"', () => {
    expect(resolveDetailTab("timeline")).toBe("log");
  });

  it('resolveDetailTab("Timeline") returns DEFAULT (case-sensitive)', () => {
    expect(resolveDetailTab("Timeline")).toBe(DEFAULT_CASE_DETAIL_TAB);
  });

  it('resolveDetailTab("messages") still returns "messages" (whitelist not degraded)', () => {
    expect(resolveDetailTab("messages")).toBe("messages");
  });

  it("all aliased keys resolve to their target", () => {
    for (const [alias, target] of Object.entries(CASE_DETAIL_TAB_ALIASES)) {
      expect(resolveDetailTab(alias)).toBe(target);
    }
  });

  it("alias does not appear in CASE_DETAIL_TAB_KEYS (write-side stays canonical)", () => {
    for (const alias of Object.keys(CASE_DETAIL_TAB_ALIASES)) {
      expect((CASE_DETAIL_TAB_KEYS as readonly string[]).includes(alias)).toBe(
        false,
      );
    }
  });
});

// ─── Cross-Module Model Integration ──────────────────────────────

describe("cross-module entry → model integration (p0-fe-012-03)", () => {
  const tabCases: Array<{
    label: string;
    tab: CaseDetailTab | undefined;
    expected: CaseDetailTab;
  }> = [
    {
      label: "documents tab from document row",
      tab: "documents",
      expected: "documents",
    },
    {
      label: "overview from shared panel (no tab)",
      tab: undefined,
      expected: "overview",
    },
    {
      label: "overview from customer cases tab (no tab)",
      tab: undefined,
      expected: "overview",
    },
    {
      label: "billing tab from cross-module link",
      tab: "billing",
      expected: "billing",
    },
    {
      label: "validation tab from cross-module link",
      tab: "validation",
      expected: "validation",
    },
  ];

  for (const { label, tab, expected } of tabCases) {
    it(`${label}: model resolves to ${expected}`, () => {
      const href = buildCaseDetailHref(firstCaseId(), tab);
      const query = extractQueryFromHref(href);
      const parsed = parseCaseDetailQuery(query as LocationQuery);
      const resolved = resolveDetailTab(parsed.tab);

      const caseId = ref(firstCaseId());
      const routeTab = ref<string | undefined>(resolved);
      const { activeTab } = useCaseDetailModel(caseId, {
        repo: detailRepo,
        routeTab,
      });
      expect(activeTab.value).toBe(expected);
    });
  }

  it("10 tabs all resolve correctly from cross-module href → model", () => {
    for (const tab of CASE_DETAIL_TAB_KEYS) {
      const href = buildCaseDetailHref(firstCaseId(), tab);
      const query = extractQueryFromHref(href);
      const parsed = parseCaseDetailQuery(query as LocationQuery);
      const resolved = resolveDetailTab(parsed.tab);

      const caseId = ref(firstCaseId());
      const routeTab = ref<string | undefined>(resolved);
      const { activeTab } = useCaseDetailModel(caseId, {
        repo: detailRepo,
        routeTab,
      });
      expect(activeTab.value).toBe(tab);
    }
  });
});
