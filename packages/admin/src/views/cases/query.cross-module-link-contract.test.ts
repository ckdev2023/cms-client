// ── Test Ownership ──────────────────────────────────────────────
// Owner: cross-module link builder contract (p0-fe-012-01).
// Covers: CASE_CROSS_MODULE_LINK_CONTRACT frozen shape, builder
//   function output alignment, and consumer scenario coverage.
// Does NOT test: individual builder unit behaviour (→ query.detail-deeplink.test),
//   tab schema (→ query.tab-schema.test), create query (→ query.family-entry-contract.test).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  buildCaseDetailHref,
  buildCaseDetailRoute,
  buildCaseListHref,
  buildCaseListRoute,
  buildCaseCreateHref,
  buildCaseCreateRoute,
  buildCustomerDetailHref,
  CASE_CROSS_MODULE_LINK_CONTRACT,
  CASE_DETAIL_QUERY_PARAM_KEYS,
  DEFAULT_CASE_DETAIL_TAB,
} from "./query";
import { CASE_DETAIL_TAB_KEYS } from "./constants";
import { CASE_DETAIL_NAV_PROTOCOL } from "./model/CaseAdapterTypes";

// ─── Contract Shape Freeze ───────────────────────────────────────

describe("CASE_CROSS_MODULE_LINK_CONTRACT frozen shape (p0-fe-012-01)", () => {
  it("has exactly the expected top-level keys", () => {
    const keys = Object.keys(CASE_CROSS_MODULE_LINK_CONTRACT).sort();
    expect(keys).toEqual([
      "consumers",
      "defaultTab",
      "pathPatterns",
      "routeNames",
      "tabQueryKey",
    ]);
  });

  it("routeNames match router definition", () => {
    expect(CASE_CROSS_MODULE_LINK_CONTRACT.routeNames).toEqual({
      caseList: "cases",
      caseDetail: "case-detail",
      caseCreate: "case-create",
    });
  });

  it("pathPatterns match router definition", () => {
    expect(CASE_CROSS_MODULE_LINK_CONTRACT.pathPatterns).toEqual({
      caseList: "/cases",
      caseDetail: "/cases/:id",
      caseCreate: "/cases/create",
    });
  });

  it("tabQueryKey matches CASE_DETAIL_NAV_PROTOCOL", () => {
    expect(CASE_CROSS_MODULE_LINK_CONTRACT.tabQueryKey).toBe(
      CASE_DETAIL_NAV_PROTOCOL.tabQueryKey,
    );
  });

  it("defaultTab matches CASE_DETAIL_NAV_PROTOCOL and DEFAULT_CASE_DETAIL_TAB", () => {
    expect(CASE_CROSS_MODULE_LINK_CONTRACT.defaultTab).toBe(
      CASE_DETAIL_NAV_PROTOCOL.defaultTab,
    );
    expect(CASE_CROSS_MODULE_LINK_CONTRACT.defaultTab).toBe(
      DEFAULT_CASE_DETAIL_TAB,
    );
  });

  it("consumers has exactly 14 entries", () => {
    const consumers = Object.keys(
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers,
    ).sort();
    expect(consumers).toEqual([
      "caseCreateBreadcrumb",
      "caseCreateListNavigation",
      "caseCreateSuccessRedirect",
      "caseDetailBreadcrumb",
      "caseDetailNotFoundBackLink",
      "caseListCreateButton",
      "caseTableRow",
      "customerCasesTab",
      "customerTableRow",
      "customerTableRowCreate",
      "dashboardQuickActionCreateCase",
      "dashboardWorkPanel",
      "documentTableRow",
      "sharedExpiryRiskPanel",
    ]);
  });

  it("each consumer has builder, scenario, tab, and description", () => {
    for (const [key, consumer] of Object.entries(
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers,
    )) {
      expect(consumer).toHaveProperty("builder");
      expect(consumer).toHaveProperty("scenario");
      expect(consumer).toHaveProperty("description");
      expect(typeof consumer.builder).toBe("string");
      expect(typeof consumer.scenario).toBe("string");
      expect(typeof consumer.description).toBe("string");
      expect(consumer.description.length).toBeGreaterThan(0);
      if (consumer.tab !== undefined) {
        expect(CASE_DETAIL_TAB_KEYS as readonly string[]).toContain(
          consumer.tab,
        );
      }
      void key;
    }
  });
});

// ─── buildCaseDetailHref alignment ───────────────────────────────

describe("buildCaseDetailHref cross-module alignment (p0-fe-012-01)", () => {
  it("documentTableRow: produces #/cases/:id?tab=documents", () => {
    const consumer = CASE_CROSS_MODULE_LINK_CONTRACT.consumers.documentTableRow;
    expect(consumer.builder).toBe("buildCaseDetailHref");
    expect(consumer.tab).toBe("documents");

    const href = buildCaseDetailHref("case-001", consumer.tab);
    expect(href).toBe("#/cases/case-001?tab=documents");
  });

  it("sharedExpiryRiskPanel: produces #/cases/:id (default tab omitted)", () => {
    const consumer =
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers.sharedExpiryRiskPanel;
    expect(consumer.builder).toBe("buildCaseDetailHref");
    expect(consumer.tab).toBeUndefined();

    const href = buildCaseDetailHref("case-risk-001", consumer.tab);
    expect(href).toBe("#/cases/case-risk-001");
    expect(href).not.toContain("tab=");
  });

  it("hash-based path prefix matches createWebHashHistory convention", () => {
    expect(buildCaseDetailHref("any-id")).toMatch(/^#\/cases\//);
  });
});

// ─── buildCaseDetailRoute alignment ──────────────────────────────

describe("buildCaseDetailRoute cross-module alignment (p0-fe-012-01)", () => {
  it("customerCasesTab: produces route with name=case-detail, no tab query", () => {
    const consumer = CASE_CROSS_MODULE_LINK_CONTRACT.consumers.customerCasesTab;
    expect(consumer.builder).toBe("buildCaseDetailRoute");
    expect(consumer.tab).toBeUndefined();

    const route = buildCaseDetailRoute("case-002");
    expect(route.name).toBe(
      CASE_CROSS_MODULE_LINK_CONTRACT.routeNames.caseDetail,
    );
    expect(route.params.id).toBe("case-002");
    expect(route.query).toBeUndefined();
  });

  it("caseCreateSuccessRedirect: produces route with name=case-detail", () => {
    const consumer =
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers.caseCreateSuccessRedirect;
    expect(consumer.builder).toBe("buildCaseDetailRoute");

    const route = buildCaseDetailRoute("new-case-001");
    expect(route.name).toBe(
      CASE_CROSS_MODULE_LINK_CONTRACT.routeNames.caseDetail,
    );
  });

  it("route name matches contract.routeNames.caseDetail", () => {
    const route = buildCaseDetailRoute("any-id", "billing");
    expect(route.name).toBe(
      CASE_CROSS_MODULE_LINK_CONTRACT.routeNames.caseDetail,
    );
  });
});

// ─── buildCaseListHref alignment ─────────────────────────────────

describe("buildCaseListHref cross-module alignment (p0-fe-012-01)", () => {
  it("customerTableRow: produces #/cases?customerId=xxx", () => {
    const consumer = CASE_CROSS_MODULE_LINK_CONTRACT.consumers.customerTableRow;
    expect(consumer.builder).toBe("buildCaseListHref");

    const href = buildCaseListHref({ customerId: "cust-001" });
    expect(href).toBe("#/cases?customerId=cust-001");
  });

  it("without customerId produces bare #/cases", () => {
    expect(buildCaseListHref()).toBe("#/cases");
    expect(buildCaseListHref({})).toBe("#/cases");
  });

  it("URI-encodes customerId with special characters", () => {
    const href = buildCaseListHref({ customerId: "cust/001" });
    expect(href).toBe("#/cases?customerId=cust%2F001");
  });

  it("hash-based path prefix matches createWebHashHistory convention", () => {
    expect(buildCaseListHref()).toMatch(/^#\/cases/);
  });
});

// ─── buildCaseListRoute alignment ────────────────────────────────

describe("buildCaseListRoute cross-module alignment (p0-fe-012-01)", () => {
  it("produces route with name=cases", () => {
    const route = buildCaseListRoute();
    expect(route.name).toBe(
      CASE_CROSS_MODULE_LINK_CONTRACT.routeNames.caseList,
    );
    expect(route.query).toBeUndefined();
  });

  it("includes customerId query when provided", () => {
    const route = buildCaseListRoute({ customerId: "cust-001" });
    expect(route.name).toBe(
      CASE_CROSS_MODULE_LINK_CONTRACT.routeNames.caseList,
    );
    expect(route.query).toEqual({ customerId: "cust-001" });
  });

  it("omits query for empty customerId", () => {
    const route = buildCaseListRoute({ customerId: "" });
    expect(route.query).toBeUndefined();
  });
});

// ─── buildCaseCreateHref alignment ───────────────────────────────

describe("buildCaseCreateHref cross-module alignment (p0-fe-012-01)", () => {
  it("customerTableRowCreate: produces #/cases/create?customerId=xxx", () => {
    const consumer =
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers.customerTableRowCreate;
    expect(consumer.builder).toBe("buildCaseCreateHref");

    const href = buildCaseCreateHref({ customerId: "cust-001" });
    expect(href).toBe("#/cases/create?customerId=cust-001");
  });

  it("hash-based path prefix matches createWebHashHistory convention", () => {
    expect(buildCaseCreateHref({})).toMatch(/^#\/cases\/create/);
  });
});

// ─── buildCustomerDetailHref (back-link) ─────────────────────────

describe("buildCustomerDetailHref back-link alignment (p0-fe-012-01)", () => {
  it("case detail → customer detail back-link", () => {
    const href = buildCustomerDetailHref("cust-001", "cases");
    expect(href).toBe("#/customers/cust-001?tab=cases");
  });

  it("omits tab for default (basic)", () => {
    expect(buildCustomerDetailHref("cust-001")).toBe("#/customers/cust-001");
    expect(buildCustomerDetailHref("cust-001", "basic")).toBe(
      "#/customers/cust-001",
    );
  });
});

// ─── Newly migrated internal consumers (p0-fe-012-02) ────────────

describe("caseTableRow alignment (p0-fe-012-02)", () => {
  it("contract entry uses buildCaseDetailHref with no fixed tab", () => {
    const consumer = CASE_CROSS_MODULE_LINK_CONTRACT.consumers.caseTableRow;
    expect(consumer.builder).toBe("buildCaseDetailHref");
    expect(consumer.scenario).toBe("href");
    expect(consumer.tab).toBeUndefined();
  });

  it("produces #/cases/:id (default tab omitted)", () => {
    const href = buildCaseDetailHref("case-row-001");
    expect(href).toBe("#/cases/case-row-001");
    expect(href).not.toContain("tab=");
  });
});

describe("caseListCreateButton alignment (p0-fe-012-02)", () => {
  it("contract entry uses buildCaseCreateRoute", () => {
    const consumer =
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers.caseListCreateButton;
    expect(consumer.builder).toBe("buildCaseCreateRoute");
    expect(consumer.scenario).toBe("router.push");
  });

  it("produces route with name=case-create and no query", () => {
    const route = buildCaseCreateRoute({});
    expect(route.name).toBe(
      CASE_CROSS_MODULE_LINK_CONTRACT.routeNames.caseCreate,
    );
    expect(route.query).toBeUndefined();
  });
});

describe("caseCreateListNavigation alignment (p0-fe-012-02)", () => {
  it("contract entry uses buildCaseListRoute", () => {
    const consumer =
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers.caseCreateListNavigation;
    expect(consumer.builder).toBe("buildCaseListRoute");
    expect(consumer.scenario).toBe("router.push");
  });

  it("without customerId produces route name=cases, no query", () => {
    const route = buildCaseListRoute();
    expect(route.name).toBe(
      CASE_CROSS_MODULE_LINK_CONTRACT.routeNames.caseList,
    );
    expect(route.query).toBeUndefined();
  });

  it("with customerId produces route name=cases, customerId query", () => {
    const route = buildCaseListRoute({ customerId: "cust-nav-001" });
    expect(route.name).toBe(
      CASE_CROSS_MODULE_LINK_CONTRACT.routeNames.caseList,
    );
    expect(route.query).toEqual({ customerId: "cust-nav-001" });
  });
});

describe("caseDetailBreadcrumb alignment (p0-fe-012-02)", () => {
  it("contract entry uses buildCaseListHref", () => {
    const consumer =
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers.caseDetailBreadcrumb;
    expect(consumer.builder).toBe("buildCaseListHref");
    expect(consumer.scenario).toBe("href");
  });

  it("produces #/cases (bare list link)", () => {
    expect(buildCaseListHref()).toBe("#/cases");
  });
});

describe("caseDetailNotFoundBackLink alignment (p0-fe-012-02)", () => {
  it("contract entry uses buildCaseListHref", () => {
    const consumer =
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers.caseDetailNotFoundBackLink;
    expect(consumer.builder).toBe("buildCaseListHref");
    expect(consumer.scenario).toBe("href");
  });
});

describe("caseCreateBreadcrumb alignment (p0-fe-012-02)", () => {
  it("contract entry uses buildCaseListHref", () => {
    const consumer =
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers.caseCreateBreadcrumb;
    expect(consumer.builder).toBe("buildCaseListHref");
    expect(consumer.scenario).toBe("href");
  });
});

// ─── Protocol Consistency ────────────────────────────────────────

describe("cross-module protocol consistency (p0-fe-012-01)", () => {
  it("tabQueryKey is used consistently across detail query params", () => {
    expect(CASE_DETAIL_QUERY_PARAM_KEYS).toContain(
      CASE_CROSS_MODULE_LINK_CONTRACT.tabQueryKey,
    );
  });

  it("all detail tab keys are deep-linkable via both href and route builders", () => {
    for (const tab of CASE_DETAIL_TAB_KEYS) {
      const href = buildCaseDetailHref("test-case", tab);
      expect(typeof href).toBe("string");
      expect(href.startsWith("#/cases/")).toBe(true);

      const route = buildCaseDetailRoute("test-case", tab);
      expect(route.name).toBe(
        CASE_CROSS_MODULE_LINK_CONTRACT.routeNames.caseDetail,
      );
    }
  });

  it("href and route builders produce consistent navigation targets for same input", () => {
    const caseId = "case-consistency-001";
    const tab = "billing" as const;

    const href = buildCaseDetailHref(caseId, tab);
    const route = buildCaseDetailRoute(caseId, tab);

    expect(href).toContain(caseId);
    expect(href).toContain(`tab=${tab}`);
    expect(route.params.id).toBe(caseId);
    expect(route.query).toEqual({ tab });
  });

  it("default tab is omitted in both href and route builders", () => {
    const defaultTab = CASE_CROSS_MODULE_LINK_CONTRACT.defaultTab;

    const href = buildCaseDetailHref("case-001", defaultTab as "overview");
    expect(href).not.toContain("tab=");

    const route = buildCaseDetailRoute("case-001", defaultTab as "overview");
    expect(route.query).toBeUndefined();
  });

  it("list href and route produce consistent navigation targets", () => {
    const customerId = "cust-consistency-001";

    const href = buildCaseListHref({ customerId });
    const route = buildCaseListRoute({ customerId });

    expect(href).toContain(`customerId=${customerId}`);
    expect(route.query).toEqual({ customerId });
  });

  it("dashboard work panel consumer is API-driven, not hardcoded", () => {
    const consumer =
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers.dashboardWorkPanel;
    expect(consumer.builder).toBe("API-driven");
    expect(consumer.scenario).toBe("item.route");
  });

  it("dashboard quick action createCase uses contract pathPattern", () => {
    const consumer =
      CASE_CROSS_MODULE_LINK_CONTRACT.consumers.dashboardQuickActionCreateCase;
    expect(consumer.scenario).toBe("router.push");
    expect(CASE_CROSS_MODULE_LINK_CONTRACT.pathPatterns.caseCreate).toBe(
      "/cases/create",
    );
  });
});
