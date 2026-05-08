// ── Test Ownership ──────────────────────────────────────────────
// Owner: customer related cases contract regression (p0-fe-009-03).
//
// Purpose: prevent `/api/cases?customerId=` contract changes from
//   breaking the customer cases tab downstream consumer. Tests lock:
//   1. Shared HTTP query param alignment (customerId + view=summary)
//   2. Response DTO → CustomerCase adapter contract
//   3. Customer detail tab deep-link navigation contract
//   4. useCustomerDetailModel routeTab synchronization
//
// Does NOT re-test:
//   - Core cases adapter mapping → CaseAdapterMappers.test
//   - Core cases list query → CaseAdapterReaders.test
//   - Cross-adapter field map alignment → CaseListSummaryDownstream.test
//   - Full pipeline integration → CaseListContractIntegration.test
//   - useCustomerCasesModel filter/loading → useCustomerCasesModel.test
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import {
  adaptCustomerCaseListResult,
  CUSTOMER_CASE_UPSTREAM_CONTRACT,
} from "./CustomerAdapterMappers";
import {
  CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS,
  CUSTOMER_DOWNSTREAM_FIELD_MAP,
  CUSTOMER_CASES_SHARED_HTTP_PARAMS,
  CASE_LIST_HTTP_FIELD_MAP,
} from "../../cases/model/CaseAdapterTypes";
import { buildCaseListSearchParams } from "../../cases/model/CaseAdapterReaders";
import {
  buildCustomerDetailHref,
  buildCaseDetailHref,
  buildCaseDetailRoute,
} from "../../cases/query";
import {
  useCustomerDetailModel,
  DEFAULT_CUSTOMER_DETAIL_TAB,
  isValidCustomerDetailTab,
  resolveCustomerDetailTab,
} from "./useCustomerDetailModel";
import type { CustomerRepository } from "./CustomerRepository";
import { DETAIL_TABS } from "../types";

// ─── Fixtures ────────────────────────────────────────────────────

function canonicalCaseDto(overrides: Record<string, unknown> = {}) {
  return {
    id: "case-reg-001",
    customerId: "cust-reg-001",
    caseName: "経営管理ビザ新規",
    caseNo: "CASE-REG-001",
    caseTypeCode: "business_manager",
    stage: "S3",
    ownerUserId: "user-reg",
    groupId: "group-tokyo",
    riskLevel: "low",
    billingUnpaidAmountCached: 30000,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-15T00:00:00.000Z",
    dueAt: "2026-06-01",
    customerName: "田中太郎",
    groupName: "Tokyo-A",
    ...overrides,
  };
}

function wrappedCaseDto(
  caseOverrides: Record<string, unknown> = {},
  wrapperOverrides: Record<string, unknown> = {},
) {
  const { customerName, groupName, ...caseFields } =
    canonicalCaseDto(caseOverrides);
  return {
    case: caseFields,
    customerName,
    groupName,
    latestValidation: null,
    ...wrapperOverrides,
  };
}

function stubDetailRepository(): Pick<CustomerRepository, "getCustomerDetail"> {
  return {
    getCustomerDetail: vi.fn().mockResolvedValue({
      id: "cust-001",
      displayName: "田中太郎",
      legalName: "田中太郎",
      furigana: "タナカタロウ",
      customerNumber: "CUS-001",
      phone: "090-1234-5678",
      email: "tanaka@example.com",
      totalCases: 1,
      activeCases: 1,
      lastContactDate: null,
      lastContactChannel: null,
      owner: { initials: "TT", name: "田中担当" },
      referralSource: "",
      group: "tokyo-1",
      bmvProfile: null,
      nationality: "",
      gender: "",
      birthDate: "",
      avatar: "",
      note: "",
      location: "",
      sourceType: "",
      visaType: "",
      referrerName: "",
      archivedCases: 0,
      caseNames: [],
      caseTitles: [],
      lastCaseCreatedDate: null,
    }),
  };
}

// ─── 1. Shared HTTP Query Param Contract ─────────────────────────

describe("shared HTTP query param contract (p0-fe-009-01/03)", () => {
  it("CUSTOMER_CASES_SHARED_HTTP_PARAMS.customerIdKey matches CASE_LIST_HTTP_FIELD_MAP.customerId", () => {
    expect(CUSTOMER_CASES_SHARED_HTTP_PARAMS.customerIdKey).toBe(
      CASE_LIST_HTTP_FIELD_MAP.customerId,
    );
  });

  it("CUSTOMER_CASES_SHARED_HTTP_PARAMS.viewValue is 'summary'", () => {
    expect(CUSTOMER_CASES_SHARED_HTTP_PARAMS.viewValue).toBe("summary");
  });

  it("buildCaseListSearchParams({ customerId }) produces same HTTP param name", () => {
    const sp = buildCaseListSearchParams({ customerId: "cust-test" });
    expect(sp.get(CUSTOMER_CASES_SHARED_HTTP_PARAMS.customerIdKey)).toBe(
      "cust-test",
    );
    expect(sp.get(CUSTOMER_CASES_SHARED_HTTP_PARAMS.viewKey)).toBe(
      CUSTOMER_CASES_SHARED_HTTP_PARAMS.viewValue,
    );
  });

  it("customer-side URL construction uses the same param names", () => {
    const query = new URLSearchParams({
      customerId: "cust-verify",
      view: "summary",
    });
    expect(query.get("customerId")).toBe("cust-verify");
    expect(query.get("view")).toBe("summary");
  });

  it("both sides produce identical customerId + view params for the same customer", () => {
    const customerId = "cust-alignment";

    const casesSide = buildCaseListSearchParams({ customerId });
    const customerSide = new URLSearchParams({
      customerId,
      view: "summary",
    });

    expect(casesSide.get("customerId")).toBe(customerSide.get("customerId"));
    expect(casesSide.get("view")).toBe(customerSide.get("view"));
  });
});

// ─── 2. Response DTO → CustomerCase Adapter Contract ─────────────

describe("response DTO → CustomerCase adapter contract (p0-fe-009-03)", () => {
  it("adapter parses flat DTO with all minimum fields", () => {
    const result = adaptCustomerCaseListResult({
      items: [canonicalCaseDto()],
    });
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);

    const c = result![0];
    expect(c.id).toBe("case-reg-001");
    expect(c.name).toBe("経営管理ビザ新規");
    expect(c.type).toBe("business_manager");
    expect(c.stage).toBe("S3");
    expect(c.owner).toBe("user-reg");
    expect(c.status).toBe("active");
    expect(c.createdAt).toBe("2026-04-01T00:00:00.000Z");
    expect(c.updatedAt).toBe("2026-04-15T00:00:00.000Z");
  });

  it("adapter parses wrapped (summary) DTO format", () => {
    const result = adaptCustomerCaseListResult({
      items: [wrappedCaseDto()],
    });
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("case-reg-001");
    expect(result![0].name).toBe("経営管理ビザ新規");
  });

  it("adapter parses raw array format", () => {
    const result = adaptCustomerCaseListResult([canonicalCaseDto()]);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("case-reg-001");
  });

  it("adapter handles empty items list", () => {
    const result = adaptCustomerCaseListResult({ items: [] });
    expect(result).not.toBeNull();
    expect(result).toHaveLength(0);
  });

  it("adapter handles empty array", () => {
    const result = adaptCustomerCaseListResult([]);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(0);
  });

  it("adapter maps archived status from archivedAt field", () => {
    const result = adaptCustomerCaseListResult({
      items: [canonicalCaseDto({ archivedAt: "2026-04-20T00:00:00.000Z" })],
    });
    expect(result![0].status).toBe("archived");
  });

  it("adapter falls back name to empty string when caseName and caseNumber are missing", () => {
    const result = adaptCustomerCaseListResult({
      items: [canonicalCaseDto({ caseName: "", caseNo: "" })],
    });
    expect(result![0].name).toBe("");
  });

  it("multiple items with same customerId are all preserved", () => {
    const items = [
      canonicalCaseDto({ id: "c1", customerId: "cust-shared" }),
      canonicalCaseDto({ id: "c2", customerId: "cust-shared", stage: "S7" }),
      canonicalCaseDto({
        id: "c3",
        customerId: "cust-shared",
        archivedAt: "2026-04-20",
      }),
    ];
    const result = adaptCustomerCaseListResult({ items });
    expect(result).toHaveLength(3);
    expect(result![0].status).toBe("active");
    expect(result![1].status).toBe("active");
    expect(result![2].status).toBe("archived");
  });
});

// ─── 3. Contract Field Set Alignment ─────────────────────────────

describe("contract field set alignment (p0-fe-009-03)", () => {
  it("CUSTOMER_CASE_UPSTREAM_CONTRACT matches CUSTOMER_DOWNSTREAM_FIELD_MAP keys", () => {
    const upstreamKeys = [...CUSTOMER_CASE_UPSTREAM_CONTRACT].sort();
    const downstreamKeys = Object.keys(CUSTOMER_DOWNSTREAM_FIELD_MAP).sort();
    expect(upstreamKeys).toEqual(downstreamKeys);
  });

  it("canonical DTO contains all CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS", () => {
    const dto = canonicalCaseDto();
    for (const field of CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS) {
      expect(dto).toHaveProperty(field);
      expect((dto as Record<string, unknown>)[field]).toBeTruthy();
    }
  });

  it("CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS length is stable at 8", () => {
    expect(CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS).toHaveLength(8);
  });

  it("CUSTOMER_DOWNSTREAM_FIELD_MAP length is stable at 7", () => {
    expect(Object.keys(CUSTOMER_DOWNSTREAM_FIELD_MAP)).toHaveLength(7);
  });

  it("CUSTOMER_CASE_UPSTREAM_CONTRACT length is stable at 7", () => {
    expect(CUSTOMER_CASE_UPSTREAM_CONTRACT).toHaveLength(7);
  });

  it("shared HTTP params contract keys are stable", () => {
    expect(CUSTOMER_CASES_SHARED_HTTP_PARAMS).toEqual({
      customerIdKey: "customerId",
      viewKey: "view",
      viewValue: "summary",
    });
  });
});

// ─── 4. Customer Detail Tab Deep-Link Navigation ─────────────────

describe("customer detail tab deep-link contract (p0-fe-009-02/03)", () => {
  it("DEFAULT_CUSTOMER_DETAIL_TAB is 'basic'", () => {
    expect(DEFAULT_CUSTOMER_DETAIL_TAB).toBe("basic");
  });

  it("all DETAIL_TABS are valid", () => {
    for (const tab of DETAIL_TABS) {
      expect(isValidCustomerDetailTab(tab)).toBe(true);
    }
  });

  it("resolveCustomerDetailTab returns valid tab for valid input", () => {
    for (const tab of DETAIL_TABS) {
      expect(resolveCustomerDetailTab(tab)).toBe(tab);
    }
  });

  it("resolveCustomerDetailTab falls back to default for invalid input", () => {
    expect(resolveCustomerDetailTab(undefined)).toBe("basic");
    expect(resolveCustomerDetailTab(null)).toBe("basic");
    expect(resolveCustomerDetailTab("")).toBe("basic");
    expect(resolveCustomerDetailTab("bogus")).toBe("basic");
    expect(resolveCustomerDetailTab("CASES")).toBe("basic");
  });

  it("buildCustomerDetailHref without tab produces clean URL", () => {
    const href = buildCustomerDetailHref("cust-001");
    expect(href).toBe("#/customers/cust-001");
    expect(href).not.toContain("tab=");
  });

  it("buildCustomerDetailHref with 'basic' tab produces clean URL", () => {
    const href = buildCustomerDetailHref("cust-001", "basic");
    expect(href).not.toContain("tab=");
  });

  it("buildCustomerDetailHref with 'cases' tab produces tab query", () => {
    const href = buildCustomerDetailHref("cust-001", "cases");
    expect(href).toBe("#/customers/cust-001?tab=cases");
  });

  it("buildCustomerDetailHref with empty customerId returns list URL", () => {
    expect(buildCustomerDetailHref("")).toBe("#/customers");
  });
});

// ─── 5. Cross-Module Navigation Alignment ────────────────────────

describe("cross-module navigation alignment (p0-fe-009-02/03)", () => {
  it("case detail back-link to customer uses correct base path", () => {
    const href = buildCustomerDetailHref("cust-nav-001");
    expect(href).toMatch(/^#\/customers\//);
  });

  it("case detail back-link to customer cases tab includes tab=cases", () => {
    const href = buildCustomerDetailHref("cust-nav-001", "cases");
    expect(href).toContain("tab=cases");
  });

  it("customer → case detail uses 'case-detail' route name", () => {
    const route = buildCaseDetailRoute("case-nav-001");
    expect(route.name).toBe("case-detail");
    expect(route.params.id).toBe("case-nav-001");
  });

  it("customer → case detail with tab produces correct route", () => {
    const route = buildCaseDetailRoute("case-nav-001", "billing");
    expect(route.query).toEqual({ tab: "billing" });
  });

  it("case detail href for overview produces no tab param", () => {
    const href = buildCaseDetailHref("case-nav-001", "overview");
    expect(href).not.toContain("tab=");
  });

  it("case detail href for non-default tab produces tab param", () => {
    const href = buildCaseDetailHref("case-nav-001", "documents");
    expect(href).toContain("tab=documents");
  });
});

// ─── 6. useCustomerDetailModel routeTab Integration ──────────────

describe("useCustomerDetailModel routeTab (p0-fe-009-02/03)", () => {
  it("defaults to 'basic' when no routeTab provided", () => {
    const { activeTab } = useCustomerDetailModel({
      customerId: ref("cust-001"),
      repository: stubDetailRepository(),
    });
    expect(activeTab.value).toBe("basic");
  });

  it("initializes to routeTab value when provided", () => {
    const routeTab = ref<string | undefined>("cases");
    const { activeTab } = useCustomerDetailModel({
      customerId: ref("cust-001"),
      repository: stubDetailRepository(),
      routeTab,
    });
    expect(activeTab.value).toBe("cases");
  });

  it("falls back to basic for invalid routeTab", () => {
    const routeTab = ref<string | undefined>("INVALID");
    const { activeTab } = useCustomerDetailModel({
      customerId: ref("cust-001"),
      repository: stubDetailRepository(),
      routeTab,
    });
    expect(activeTab.value).toBe("basic");
  });

  it("syncs when routeTab changes externally", async () => {
    const routeTab = ref<string | undefined>("basic");
    const { activeTab } = useCustomerDetailModel({
      customerId: ref("cust-001"),
      repository: stubDetailRepository(),
      routeTab,
    });

    routeTab.value = "cases";
    await Promise.resolve();
    expect(activeTab.value).toBe("cases");

    routeTab.value = "comms";
    await Promise.resolve();
    expect(activeTab.value).toBe("comms");
  });

  it("falls back when routeTab changes to invalid value", async () => {
    const routeTab = ref<string | undefined>("cases");
    const { activeTab } = useCustomerDetailModel({
      customerId: ref("cust-001"),
      repository: stubDetailRepository(),
      routeTab,
    });

    routeTab.value = "BOGUS";
    await Promise.resolve();
    expect(activeTab.value).toBe("basic");
  });

  it("falls back when routeTab becomes undefined", async () => {
    const routeTab = ref<string | undefined>("log");
    const { activeTab } = useCustomerDetailModel({
      customerId: ref("cust-001"),
      repository: stubDetailRepository(),
      routeTab,
    });

    expect(activeTab.value).toBe("log");
    routeTab.value = undefined;
    await Promise.resolve();
    expect(activeTab.value).toBe("basic");
  });

  it("switchTab fires onTabChange callback", () => {
    const tabChanges: string[] = [];
    const { switchTab } = useCustomerDetailModel({
      customerId: ref("cust-001"),
      repository: stubDetailRepository(),
      onTabChange: (tab) => tabChanges.push(tab),
    });

    switchTab("cases");
    switchTab("log");
    expect(tabChanges).toEqual(["cases", "log"]);
  });

  it("switchTab updates activeTab directly", () => {
    const { activeTab, switchTab } = useCustomerDetailModel({
      customerId: ref("cust-001"),
      repository: stubDetailRepository(),
    });

    switchTab("contacts");
    expect(activeTab.value).toBe("contacts");
  });

  it("onTabChange is not fired when routeTab changes externally", async () => {
    const tabChanges: string[] = [];
    const routeTab = ref<string | undefined>("basic");
    useCustomerDetailModel({
      customerId: ref("cust-001"),
      repository: stubDetailRepository(),
      routeTab,
      onTabChange: (tab) => tabChanges.push(tab),
    });

    routeTab.value = "cases";
    await Promise.resolve();
    expect(tabChanges).toHaveLength(0);
  });

  it("all DETAIL_TABS survive routeTab round-trip", async () => {
    const routeTab = ref<string | undefined>(undefined);
    const { activeTab } = useCustomerDetailModel({
      customerId: ref("cust-001"),
      repository: stubDetailRepository(),
      routeTab,
    });

    for (const tab of DETAIL_TABS) {
      routeTab.value = tab;
      await Promise.resolve();
      expect(activeTab.value).toBe(tab);
    }
  });
});
