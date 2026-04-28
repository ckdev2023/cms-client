// ── Test Ownership ──────────────────────────────────────────────
// Owner: tab deep-link regression (p0-fe-003-03).
// Covers: end-to-end deep-link lifecycle scenarios across
//   query.ts ↔ useCaseDetailModel ↔ CaseDetailView wiring:
//   - 首屏 (initial load): empty URL → overview default
//   - 切 tab (tab switch): switchTab → buildCaseDetailQuery → round-trip
//   - 刷新 (refresh): URL with tab → parse → model init → correct tab
//   - 分享链接 (shared link): buildCaseDetailHref → extract → parse → correct tab
//   - 非法 query 回退 (invalid query fallback): malformed/illegal values → overview
// Does NOT test: individual function unit behaviour (→ query.tab-schema.test,
//   query.detail-deeplink.test), adapter mapping (→ CaseAdapterDetailAggregate.test),
//   repository HTTP (→ CaseRepository.test).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { ref } from "vue";
import type { LocationQuery } from "vue-router";
import {
  parseCaseDetailQuery,
  buildCaseDetailQuery,
  buildCaseDetailHref,
  buildCaseDetailRoute,
  resolveDetailTab,
  DEFAULT_CASE_DETAIL_TAB,
} from "./query";
import { CASE_DETAIL_TAB_KEYS } from "./constants";
import { CASE_DETAIL_NAV_PROTOCOL } from "./model/CaseAdapterTypes";
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

function simulateUrlQuery(tab?: string): LocationQuery {
  if (tab === undefined) return {};
  return { tab };
}

function extractTabFromHref(href: string): string | undefined {
  const match = href.match(/[?&]tab=([^&#]*)/);
  return match?.[1];
}

// ─── 首屏 (Initial Load) ─────────────────────────────────────────

describe("首屏 — initial load with no tab query", () => {
  it("empty URL query → parseCaseDetailQuery returns undefined tab", () => {
    const parsed = parseCaseDetailQuery({});
    expect(parsed.tab).toBeUndefined();
  });

  it("undefined tab → resolveDetailTab returns overview", () => {
    expect(resolveDetailTab(undefined)).toBe("overview");
  });

  it("model defaults to overview when no routeTab provided", () => {
    const caseId = ref(firstCaseId());
    const { activeTab } = useCaseDetailModel(caseId, { repo: detailRepo });
    expect(activeTab.value).toBe("overview");
  });

  it("model defaults to overview when routeTab is undefined ref", () => {
    const caseId = ref(firstCaseId());
    const routeTab = ref<string | undefined>(undefined);
    const { activeTab } = useCaseDetailModel(caseId, {
      repo: detailRepo,
      routeTab,
    });
    expect(activeTab.value).toBe("overview");
  });

  it("buildCaseDetailQuery omits tab when overview → clean URL on first load", () => {
    const query = buildCaseDetailQuery({ tab: "overview" });
    expect(query.tab).toBeUndefined();
  });

  it("buildCaseDetailHref produces no tab param for first-load URL", () => {
    const href = buildCaseDetailHref(firstCaseId());
    expect(href).not.toContain("tab=");
  });
});

// ─── 切 tab (Tab Switching) ──────────────────────────────────────

describe("切 tab — user switches tab and URL updates", () => {
  it("switchTab updates activeTab and fires onTabChange", () => {
    const tabChanges: CaseDetailTab[] = [];
    const caseId = ref(firstCaseId());
    const { activeTab, switchTab } = useCaseDetailModel(caseId, {
      repo: detailRepo,
      onTabChange: (tab) => tabChanges.push(tab),
    });

    switchTab("billing");
    expect(activeTab.value).toBe("billing");
    expect(tabChanges).toEqual(["billing"]);
  });

  it("onTabChange tab → buildCaseDetailQuery → URL round-trip preserves tab", () => {
    const nonDefaultTabs = CASE_DETAIL_TAB_KEYS.filter(
      (t) => t !== DEFAULT_CASE_DETAIL_TAB,
    );
    for (const tab of nonDefaultTabs) {
      const query = buildCaseDetailQuery({ tab });
      const parsed = parseCaseDetailQuery(query as LocationQuery);
      expect(parsed.tab).toBe(tab);
    }
  });

  it("switching to overview tab → buildCaseDetailQuery omits tab → clean URL", () => {
    const query = buildCaseDetailQuery({ tab: "overview" });
    expect(query.tab).toBeUndefined();
    const parsed = parseCaseDetailQuery(query as LocationQuery);
    expect(parsed.tab).toBeUndefined();
    expect(resolveDetailTab(parsed.tab)).toBe("overview");
  });

  it("sequential tab switches produce correct URL queries", () => {
    const tabChanges: CaseDetailTab[] = [];
    const caseId = ref(firstCaseId());
    const { activeTab, switchTab } = useCaseDetailModel(caseId, {
      repo: detailRepo,
      onTabChange: (tab) => tabChanges.push(tab),
    });

    const sequence: CaseDetailTab[] = [
      "billing",
      "documents",
      "log",
      "overview",
      "messages",
    ];
    for (const tab of sequence) {
      switchTab(tab);
      expect(activeTab.value).toBe(tab);
      const query = buildCaseDetailQuery({ tab });
      const parsed = parseCaseDetailQuery(query as LocationQuery);
      expect(resolveDetailTab(parsed.tab)).toBe(tab);
    }
    expect(tabChanges).toEqual(sequence);
  });

  it("all 10 tabs survive switchTab → build → parse → resolve cycle", () => {
    const caseId = ref(firstCaseId());
    const { activeTab, switchTab } = useCaseDetailModel(caseId, {
      repo: detailRepo,
    });

    for (const tab of CASE_DETAIL_TAB_KEYS) {
      switchTab(tab);
      expect(activeTab.value).toBe(tab);
      const query = buildCaseDetailQuery({ tab });
      const parsed = parseCaseDetailQuery(query as LocationQuery);
      expect(resolveDetailTab(parsed.tab)).toBe(tab);
    }
  });
});

// ─── 刷新 (Refresh / Page Reload) ───────────────────────────────

describe("刷新 — page refresh preserves tab from URL", () => {
  it("URL with ?tab=billing → model initializes to billing", () => {
    const urlQuery = simulateUrlQuery("billing");
    const parsed = parseCaseDetailQuery(urlQuery);
    const caseId = ref(firstCaseId());
    const routeTab = ref<string | undefined>(parsed.tab);
    const { activeTab } = useCaseDetailModel(caseId, {
      repo: detailRepo,
      routeTab,
    });

    expect(activeTab.value).toBe("billing");
  });

  it("refresh round-trip for every tab", () => {
    for (const tab of CASE_DETAIL_TAB_KEYS) {
      const query = buildCaseDetailQuery({ tab });
      const urlQuery = simulateUrlQuery(query.tab);
      const parsed = parseCaseDetailQuery(urlQuery);
      const resolved = resolveDetailTab(parsed.tab);
      expect(resolved).toBe(tab);

      const caseId = ref(firstCaseId());
      const routeTab = ref<string | undefined>(resolved);
      const { activeTab } = useCaseDetailModel(caseId, {
        repo: detailRepo,
        routeTab,
      });
      expect(activeTab.value).toBe(tab);
    }
  });

  it("empty URL on refresh → overview (same as fresh load)", () => {
    const parsed = parseCaseDetailQuery({});
    const caseId = ref(firstCaseId());
    const routeTab = ref<string | undefined>(parsed.tab);
    const { activeTab } = useCaseDetailModel(caseId, {
      repo: detailRepo,
      routeTab,
    });
    expect(activeTab.value).toBe("overview");
  });
});

// ─── 分享链接 (Shared / External Links) ─────────────────────────

describe("分享链接 — shared links with tab target", () => {
  it("buildCaseDetailHref for non-default tab → extractable tab param", () => {
    const href = buildCaseDetailHref("case-001", "billing");
    const extracted = extractTabFromHref(href);
    expect(extracted).toBe("billing");
  });

  it("all non-default tabs produce shareable hrefs", () => {
    const nonDefault = CASE_DETAIL_TAB_KEYS.filter(
      (t) => t !== DEFAULT_CASE_DETAIL_TAB,
    );
    for (const tab of nonDefault) {
      const href = buildCaseDetailHref("case-001", tab);
      const extracted = extractTabFromHref(href);
      expect(extracted).toBe(tab);
    }
  });

  it("overview tab produces no tab param in shared href (clean URL)", () => {
    const href = buildCaseDetailHref("case-001", "overview");
    expect(extractTabFromHref(href)).toBeUndefined();
  });

  it("buildCaseDetailRoute for non-default tab → model can consume query.tab", () => {
    const route = buildCaseDetailRoute("case-001", "documents");
    const routeTab = route.query?.[CASE_DETAIL_NAV_PROTOCOL.tabQueryKey];
    expect(routeTab).toBe("documents");

    const caseId = ref(firstCaseId());
    const routeTabRef = ref<string | undefined>(routeTab);
    const { activeTab } = useCaseDetailModel(caseId, {
      repo: detailRepo,
      routeTab: routeTabRef,
    });
    expect(activeTab.value).toBe("documents");
  });

  it("shared link end-to-end: href → extract tab → URL query → parse → model", () => {
    const targetTab: CaseDetailTab = "messages";
    const caseId = firstCaseId();

    const href = buildCaseDetailHref(caseId, targetTab);
    const tabFromUrl = extractTabFromHref(href)!;
    const urlQuery = simulateUrlQuery(tabFromUrl);
    const parsed = parseCaseDetailQuery(urlQuery);
    const resolved = resolveDetailTab(parsed.tab);

    expect(resolved).toBe(targetTab);

    const caseIdRef = ref(caseId);
    const routeTab = ref<string | undefined>(resolved);
    const model = useCaseDetailModel(caseIdRef, {
      repo: detailRepo,
      routeTab,
    });
    expect(model.activeTab.value).toBe(targetTab);
  });

  it("buildCaseDetailRoute without tab → model defaults to overview", () => {
    const route = buildCaseDetailRoute("case-001");
    expect(route.query).toBeUndefined();

    const caseId = ref(firstCaseId());
    const routeTab = ref<string | undefined>(undefined);
    const { activeTab } = useCaseDetailModel(caseId, {
      repo: detailRepo,
      routeTab,
    });
    expect(activeTab.value).toBe("overview");
  });
});

// ─── 非法 query 回退 (Invalid Query Fallback) ───────────────────

describe("非法 query 回退 — invalid/malicious tab values fall back to overview", () => {
  const invalidValues = [
    { label: "empty string", value: "" },
    { label: "random string", value: "bogus" },
    { label: "uppercase tab", value: "OVERVIEW" },
    { label: "mixed case", value: "Billing" },
    { label: "leading space", value: " overview" },
    { label: "trailing space", value: "overview " },
    { label: "numeric", value: "123" },
    { label: "stage code", value: "S1" },
    { label: "null string", value: "null" },
    { label: "undefined string", value: "undefined" },
    { label: "SQL injection attempt", value: "' OR 1=1 --" },
    { label: "script injection", value: "<script>alert(1)</script>" },
    { label: "URL encoded", value: "%6Fverview" },
    { label: "tab with hyphen", value: "tab-overview" },
    { label: "dotted path", value: "overview.billing" },
    { label: "unicode chars", value: "\u6982\u89C8" },
  ];

  for (const { label, value } of invalidValues) {
    it(`${label}: "${value}" → parse → resolve → overview`, () => {
      const parsed = parseCaseDetailQuery({ tab: value });
      const resolved = resolveDetailTab(parsed.tab);
      expect(resolved).toBe("overview");
    });
  }

  it("invalid tab in URL → model falls back to overview", () => {
    for (const { value } of invalidValues) {
      const urlQuery = simulateUrlQuery(value);
      const parsed = parseCaseDetailQuery(urlQuery);
      const caseId = ref(firstCaseId());
      const routeTab = ref<string | undefined>(parsed.tab);
      const { activeTab } = useCaseDetailModel(caseId, {
        repo: detailRepo,
        routeTab,
      });
      expect(activeTab.value).toBe("overview");
    }
  });

  it("array value in query → falls back to overview", () => {
    const query: LocationQuery = { tab: ["billing", "documents"] };
    const parsed = parseCaseDetailQuery(query);
    expect(resolveDetailTab(parsed.tab)).toBe("overview");
  });

  it("null in query → falls back to overview", () => {
    const query: LocationQuery = { tab: null };
    const parsed = parseCaseDetailQuery(query);
    expect(resolveDetailTab(parsed.tab)).toBe("overview");
  });

  it("shared href with invalid tab → model falls back to overview", () => {
    const href = "#/cases/case-001?tab=INVALID";
    const tabFromUrl = extractTabFromHref(href)!;
    const urlQuery = simulateUrlQuery(tabFromUrl);
    const parsed = parseCaseDetailQuery(urlQuery);
    const resolved = resolveDetailTab(parsed.tab);
    expect(resolved).toBe("overview");

    const caseId = ref(firstCaseId());
    const routeTab = ref<string | undefined>(resolved);
    const model = useCaseDetailModel(caseId, {
      repo: detailRepo,
      routeTab,
    });
    expect(model.activeTab.value).toBe("overview");
  });
});

// ─── routeTab External Change (Browser Back/Forward) ─────────────

describe("browser navigation — routeTab changes simulate back/forward", () => {
  it("external tab change syncs model without firing onTabChange", async () => {
    const tabChanges: CaseDetailTab[] = [];
    const caseId = ref(firstCaseId());
    const routeTab = ref<string | undefined>("overview");
    const { activeTab } = useCaseDetailModel(caseId, {
      repo: detailRepo,
      routeTab,
      onTabChange: (tab) => tabChanges.push(tab),
    });

    expect(activeTab.value).toBe("overview");

    routeTab.value = "billing";
    await Promise.resolve();
    expect(activeTab.value).toBe("billing");
    expect(tabChanges).toHaveLength(0);
  });

  it("back to overview via routeTab undefined", async () => {
    const caseId = ref(firstCaseId());
    const routeTab = ref<string | undefined>("billing");
    const { activeTab } = useCaseDetailModel(caseId, {
      repo: detailRepo,
      routeTab,
    });

    expect(activeTab.value).toBe("billing");

    routeTab.value = undefined;
    await Promise.resolve();
    expect(activeTab.value).toBe("overview");
  });

  it("external invalid tab change → falls back to overview", async () => {
    const caseId = ref(firstCaseId());
    const routeTab = ref<string | undefined>("billing");
    const { activeTab } = useCaseDetailModel(caseId, {
      repo: detailRepo,
      routeTab,
    });

    expect(activeTab.value).toBe("billing");

    routeTab.value = "INVALID";
    await Promise.resolve();
    expect(activeTab.value).toBe("overview");
  });

  it("rapid external tab changes settle to last valid value", async () => {
    const caseId = ref(firstCaseId());
    const routeTab = ref<string | undefined>("overview");
    const { activeTab } = useCaseDetailModel(caseId, {
      repo: detailRepo,
      routeTab,
    });

    routeTab.value = "billing";
    routeTab.value = "documents";
    routeTab.value = "log";
    await Promise.resolve();
    expect(activeTab.value).toBe("log");
  });
});

// ─── Protocol Contract Alignment ─────────────────────────────────

describe("protocol contract alignment", () => {
  it("CASE_DETAIL_NAV_PROTOCOL.tabQueryKey is used in href builder", () => {
    const href = buildCaseDetailHref("case-001", "billing");
    expect(href).toContain(`${CASE_DETAIL_NAV_PROTOCOL.tabQueryKey}=`);
  });

  it("CASE_DETAIL_NAV_PROTOCOL.tabQueryKey is used in route builder", () => {
    const route = buildCaseDetailRoute("case-001", "billing");
    expect(route.query).toHaveProperty(CASE_DETAIL_NAV_PROTOCOL.tabQueryKey);
  });

  it("CASE_DETAIL_NAV_PROTOCOL.defaultTab matches DEFAULT_CASE_DETAIL_TAB", () => {
    expect(CASE_DETAIL_NAV_PROTOCOL.defaultTab).toBe(DEFAULT_CASE_DETAIL_TAB);
  });

  it("all 10 CASE_DETAIL_TAB_KEYS are deep-linkable", () => {
    expect(CASE_DETAIL_TAB_KEYS).toHaveLength(10);
    for (const tab of CASE_DETAIL_TAB_KEYS) {
      const href = buildCaseDetailHref("case-001", tab);
      expect(typeof href).toBe("string");
      expect(href.startsWith("#/cases/")).toBe(true);

      const route = buildCaseDetailRoute("case-001", tab);
      expect(route.name).toBe("case-detail");
      expect(route.params.id).toBe("case-001");

      const query = buildCaseDetailQuery({ tab });
      const parsed = parseCaseDetailQuery(query as LocationQuery);
      expect(resolveDetailTab(parsed.tab)).toBe(tab);
    }
  });
});
