// ── Test Ownership ──────────────────────────────────────────────
// Owner: list query/search-params + list/summary adapter + customer
//   downstream reuse — cross-layer contract integration (p0-fe-002b-08).
//
// Purpose: lock the shared contract across the full 002b chain:
//   query.ts (002b-01) → CaseAdapterReaders (002b-02/03)
//     → CaseAdapterMappers (002b-04/05/06) → customer downstream (002b-07)
//
// Does NOT re-test individual layer logic (covered by per-layer tests):
//   - Core filter serialization     → CaseAdapterReaders.core-filters.test
//   - Customer/summary page params  → CaseAdapterReaders.customer-summary-page.test
//   - Base field mapping            → CaseAdapterMappers.base-fields.test
//   - Derived status mapping        → CaseAdapterMappers.derived-status.test
//   - Summary card aggregation      → CaseAdapterMappers.summary-cards.test
//   - Cross-adapter field maps      → CaseListSummaryDownstream.test
// ────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LocationQuery } from "vue-router";

import {
  parseCaseListQuery,
  buildCaseListQuery,
  CASE_LIST_QUERY_PARAM_KEYS,
  _ASSERT_QUERY_FROZEN_KEYS,
  type CaseListQueryParams,
} from "../query";
import { DEFAULT_CASE_LIST_FILTERS } from "../constants";
import { buildCaseListSearchParams } from "./CaseAdapterReaders";
import {
  adaptCaseListResult,
  adaptCaseSummaryCards,
  adaptCaseSummaryResult,
} from "./CaseAdapterMappers";
import {
  CASE_LIST_PARAM_KEYS,
  CASE_LIST_HTTP_FIELD_MAP,
  CASE_LIST_BASE_FIELD_MAP,
  CASE_LIST_BASE_TARGET_KEYS,
  CASE_LIST_DERIVED_FIELD_MAP,
  CASE_LIST_DERIVED_TARGET_KEYS,
  CASE_SUMMARY_CARD_KEYS,
  CASE_SUMMARY_CARD_FIELD_USAGE,
  CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS,
  CUSTOMER_DOWNSTREAM_FIELD_MAP,
  _ASSERT_FROZEN_KEYS,
} from "./CaseAdapterTypes";
import {
  adaptCustomerCaseListResult,
  CUSTOMER_CASE_UPSTREAM_CONTRACT,
} from "../../customers/model/CustomerAdapterMappers";

// ─── Helpers ────────────────────────────────────────────────────

function stripValidation(
  parsed: CaseListQueryParams,
): Omit<CaseListQueryParams, "validation"> {
  const { validation, ...rest } = parsed;
  void validation;
  return rest;
}

// ─── Canonical DTO Fixture ──────────────────────────────────────

function canonicalFlatDto(overrides: Record<string, unknown> = {}) {
  return {
    id: "case-integration-001",
    customerId: "cust-integration",
    caseTypeCode: "business_manager",
    stage: "S4",
    groupId: "group-tokyo",
    ownerUserId: "user-integration",
    caseName: "経営管理ビザ更新",
    caseNo: "CASE-INT-001",
    riskLevel: "medium",
    billingUnpaidAmountCached: 65000,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-04-15T09:00:00.000Z",
    dueAt: "2026-04-25",
    customerName: "田中太郎",
    groupName: "Tokyo-A",
    latestValidation: { status: "passed", executedAt: "2026-04-10" },
    ...overrides,
  };
}

function canonicalWrappedDto(
  caseOverrides: Record<string, unknown> = {},
  wrapperOverrides: Record<string, unknown> = {},
) {
  const { customerName, groupName, latestValidation, ...caseFields } =
    canonicalFlatDto(caseOverrides);
  return {
    case: caseFields,
    customerName,
    groupName,
    latestValidation,
    ...wrapperOverrides,
  };
}

function canonicalApiResponse(
  items: unknown[] = [canonicalFlatDto()],
  overrides: Record<string, unknown> = {},
) {
  return { items, total: items.length, page: 1, limit: 50, ...overrides };
}

// ─── 1. Query → SearchParams Pipeline ────────────────────────────

describe("query → searchParams pipeline (p0-fe-002b-08)", () => {
  it("parseCaseListQuery output (minus validation) feeds buildCaseListSearchParams correctly", () => {
    const routeQuery: LocationQuery = {
      scope: "group",
      search: "経営管理",
      stage: "S4",
      owner: "suzuki",
      group: "tokyo-1",
      risk: "attention",
      validation: "passed",
      customerId: "cust-001",
    };

    const parsed = parseCaseListQuery(routeQuery);
    expect(parsed.validation).toBe("passed");

    const httpFields = stripValidation(parsed);
    const sp = buildCaseListSearchParams({
      ...httpFields,
      page: 1,
      limit: 25,
    });

    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.scope)).toBe("group");
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.search)).toBe("経営管理");
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.stage)).toBe("S4");
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.owner)).toBe("suzuki");
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.group)).toBe("tokyo-1");
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.risk)).toBe("attention");
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.customerId)).toBe("cust-001");
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.page)).toBe("1");
    expect(sp.get(CASE_LIST_HTTP_FIELD_MAP.limit)).toBe("25");
    expect(sp.get("view")).toBe("summary");
    expect(sp.has("validation")).toBe(false);
  });

  it("default filters produce scope + view=summary (scope defaults to 'mine')", () => {
    const parsed = parseCaseListQuery({});
    expect(parsed.scope).toBe(DEFAULT_CASE_LIST_FILTERS.scope);

    const sp = buildCaseListSearchParams(stripValidation(parsed));

    const keys = Array.from(sp.keys()).sort();
    expect(keys).toEqual(["scope", "view"]);
    expect(sp.get("scope")).toBe(DEFAULT_CASE_LIST_FILTERS.scope);
  });

  it("buildCaseListQuery → parseCaseListQuery round-trip preserves all non-default fields", () => {
    const original = parseCaseListQuery({
      scope: "all",
      search: "テスト",
      stage: "S5",
      owner: "tanaka",
      group: "osaka",
      risk: "critical",
      validation: "failed",
      customerId: "cust-roundtrip",
    });

    const serialized = buildCaseListQuery(original);
    const restored = parseCaseListQuery(serialized as LocationQuery);

    expect(restored).toEqual(original);
  });

  it("customer deeplink: customerId-only URL → customerId + default scope + view", () => {
    const parsed = parseCaseListQuery({ customerId: "cust-deep" });
    const sp = buildCaseListSearchParams(stripValidation(parsed));

    const keys = Array.from(sp.keys()).sort();
    expect(keys).toEqual(["customerId", "scope", "view"]);
    expect(sp.get("customerId")).toBe("cust-deep");
    expect(sp.get("scope")).toBe(DEFAULT_CASE_LIST_FILTERS.scope);
  });
});

// ─── 2. SearchParams → List Adapter Pipeline ────────────────────

describe("searchParams → list adapter pipeline (p0-fe-002b-08)", () => {
  it("canonical flat DTO adapts with all base and derived fields populated", () => {
    const result = adaptCaseListResult(canonicalApiResponse());
    expect(result).not.toBeNull();

    const item = result!.items[0];

    for (const key of CASE_LIST_BASE_TARGET_KEYS) {
      expect(item).toHaveProperty(key);
    }
    for (const key of CASE_LIST_DERIVED_TARGET_KEYS) {
      expect(item).toHaveProperty(key);
    }

    expect(item.id).toBe("case-integration-001");
    expect(item.name).toBe("経営管理ビザ更新");
    expect(item.type).toBe("business_manager");
    expect(item.applicant).toBe("田中太郎");
    expect(item.customerId).toBe("cust-integration");
    expect(item.groupId).toBe("group-tokyo");
    expect(item.groupLabel).toBe("Tokyo-A");
    expect(item.stageId).toBe("S4");
    expect(item.ownerId).toBe("user-integration");
    expect(item.validationStatus).toBe("passed");
    expect(item.riskStatus).toBe("attention");
    expect(item.unpaidAmount).toBe(65000);
    expect(item.dueDate).toBe("2026-04-25");
    expect(item.dueDateLabel).toBeTruthy();
    expect(item.updatedAtLabel).toBeTruthy();
  });

  it("canonical wrapped DTO produces identical fields", () => {
    const flatResult = adaptCaseListResult(canonicalApiResponse());
    const wrappedResult = adaptCaseListResult(
      canonicalApiResponse([canonicalWrappedDto()]),
    );

    expect(flatResult).not.toBeNull();
    expect(wrappedResult).not.toBeNull();

    const flatItem = flatResult!.items[0];
    const wrappedItem = wrappedResult!.items[0];

    const flatRec = flatItem as unknown as Record<string, unknown>;
    const wrappedRec = wrappedItem as unknown as Record<string, unknown>;
    for (const key of CASE_LIST_BASE_TARGET_KEYS) {
      expect(wrappedRec[key]).toEqual(flatRec[key]);
    }
    for (const key of CASE_LIST_DERIVED_TARGET_KEYS) {
      expect(wrappedRec[key]).toEqual(flatRec[key]);
    }
  });

  it("mixed flat + wrapped items in single response are all adapted", () => {
    const result = adaptCaseListResult(
      canonicalApiResponse([
        canonicalFlatDto({ id: "flat-1" }),
        canonicalWrappedDto({ id: "wrapped-1" }),
        canonicalFlatDto({ id: "flat-2", stage: "S9" }),
      ]),
    );

    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(3);
    expect(result!.items.map((i) => i.id)).toEqual([
      "flat-1",
      "wrapped-1",
      "flat-2",
    ]);
  });
});

// ─── 3. Summary Pipeline ─────────────────────────────────────────

describe("summary pipeline consistency (p0-fe-002b-08)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("adaptCaseSummaryResult equals adaptCaseListResult + adaptCaseSummaryCards", () => {
    const payload = canonicalApiResponse([
      canonicalFlatDto({ id: "c1", stage: "S3", dueAt: "2026-04-22" }),
      canonicalFlatDto({
        id: "c2",
        stage: "S5",
        billingUnpaidAmountCached: 30000,
      }),
      canonicalFlatDto({ id: "c3", stage: "S9" }),
    ]);

    const summaryResult = adaptCaseSummaryResult(payload);
    const listResult = adaptCaseListResult(payload);
    const separateCards = adaptCaseSummaryCards(listResult!.items);

    expect(summaryResult).not.toBeNull();
    expect(summaryResult!.items).toEqual(listResult!.items);
    expect(summaryResult!.total).toBe(listResult!.total);
    expect(summaryResult!.cards).toEqual(separateCards);
  });

  it("summary cards use only fields present on CaseListItem", () => {
    const sampleItem = adaptCaseListResult(canonicalApiResponse())!.items[0];
    for (const [, usage] of Object.entries(CASE_SUMMARY_CARD_FIELD_USAGE)) {
      expect(sampleItem).toHaveProperty(usage.field);
    }
  });

  it("empty response produces zero-value cards without errors", () => {
    const result = adaptCaseSummaryResult({ items: [], total: 0 });
    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(0);
    expect(result!.cards).toHaveLength(4);
    expect(result!.cards.every((c) => c.value === 0)).toBe(true);
  });
});

// ─── 4. Customer Downstream Full Contract ───────────────────────

describe("customer downstream full contract (p0-fe-002b-08)", () => {
  it("customerId query param flows through to HTTP and back through both adapters", () => {
    const customerId = "cust-downstream-e2e";
    const sp = buildCaseListSearchParams({ customerId });
    expect(sp.get("customerId")).toBe(customerId);

    const dto = canonicalFlatDto({ customerId });
    const payload = canonicalApiResponse([dto]);

    const caseSide = adaptCaseListResult(payload);
    expect(caseSide).not.toBeNull();
    expect(caseSide!.items[0].customerId).toBe(customerId);

    const customerSide = adaptCustomerCaseListResult(payload);
    expect(customerSide).not.toBeNull();
    expect(customerSide![0].id).toBe(dto.id);
  });

  it("all CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS are present in canonical DTO", () => {
    const dto = canonicalFlatDto();
    for (const field of CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS) {
      expect(dto).toHaveProperty(field);
      expect((dto as Record<string, unknown>)[field]).toBeTruthy();
    }
  });

  it("cases adapter and customer adapter both succeed on the same canonical DTO", () => {
    const dto = canonicalFlatDto();
    const payload = canonicalApiResponse([dto]);

    const caseSide = adaptCaseListResult(payload);
    const customerSide = adaptCustomerCaseListResult(payload);

    expect(caseSide).not.toBeNull();
    expect(customerSide).not.toBeNull();
    expect(caseSide!.items).toHaveLength(1);
    expect(customerSide).toHaveLength(1);

    expect(caseSide!.items[0].id).toBe(dto.id);
    expect(customerSide![0].id).toBe(dto.id);
    expect(customerSide![0].name).toBe("経営管理ビザ更新");
    expect(customerSide![0].type).toBe("business_manager");
    expect(customerSide![0].stage).toBe("S4");
    expect(customerSide![0].owner).toBe("user-integration");
  });

  it("both adapters handle flat and wrapped (summary) DTO formats", () => {
    const flatPayload = canonicalApiResponse([canonicalFlatDto()]);
    const wrappedPayload = canonicalApiResponse([canonicalWrappedDto()]);

    for (const payload of [flatPayload, wrappedPayload]) {
      const caseSide = adaptCaseListResult(payload);
      expect(caseSide).not.toBeNull();
      expect(caseSide!.items[0].id).toBe("case-integration-001");

      const customerSide = adaptCustomerCaseListResult(payload);
      expect(customerSide).not.toBeNull();
      expect(customerSide![0].id).toBe("case-integration-001");
    }
  });

  it("multiple items with same customerId are all preserved by both adapters", () => {
    const items = [
      canonicalFlatDto({ id: "c1", customerId: "cust-shared" }),
      canonicalFlatDto({ id: "c2", customerId: "cust-shared", stage: "S7" }),
      canonicalFlatDto({ id: "c3", customerId: "cust-shared", stage: "S9" }),
    ];
    const payload = canonicalApiResponse(items);

    const caseSide = adaptCaseListResult(payload);
    expect(caseSide!.items).toHaveLength(3);
    expect(caseSide!.items.every((i) => i.customerId === "cust-shared")).toBe(
      true,
    );

    const customerSide = adaptCustomerCaseListResult(payload);
    expect(customerSide).toHaveLength(3);
    expect(customerSide!.every((i) => i.id.startsWith("c"))).toBe(true);
  });

  it("CUSTOMER_DOWNSTREAM_FIELD_MAP and CUSTOMER_CASE_UPSTREAM_CONTRACT are aligned", () => {
    const downstreamMapKeys = Object.keys(CUSTOMER_DOWNSTREAM_FIELD_MAP).sort();
    const upstreamKeys = [...CUSTOMER_CASE_UPSTREAM_CONTRACT].sort();
    expect(downstreamMapKeys).toEqual(upstreamKeys);
  });

  it("customer adapter gracefully handles DTO with only minimum fields", () => {
    const minimalDto: Record<string, unknown> = {};
    for (const field of CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS) {
      if (field === "id") minimalDto.id = "case-minimal";
      else if (field === "customerId") minimalDto.customerId = "cust-minimal";
      else if (field === "caseName") minimalDto.caseName = "最小集";
      else if (field === "caseTypeCode") minimalDto.caseTypeCode = "visa";
      else if (field === "stage") minimalDto.stage = "S2";
      else if (field === "ownerUserId") minimalDto.ownerUserId = "user-min";
      else if (field === "createdAt") minimalDto.createdAt = "2026-01-01";
      else if (field === "updatedAt") minimalDto.updatedAt = "2026-01-02";
    }

    const customerSide = adaptCustomerCaseListResult({ items: [minimalDto] });
    expect(customerSide).not.toBeNull();
    expect(customerSide![0].id).toBe("case-minimal");

    const caseSide = adaptCaseListResult({ items: [minimalDto], total: 1 });
    expect(caseSide).not.toBeNull();
    expect(caseSide!.items[0].id).toBe("case-minimal");
  });
});

// ─── 5. Master Contract Surface Lock ─────────────────────────────

describe("master contract surface lock (p0-fe-002b-08)", () => {
  it("compile-time assertions pass", () => {
    expect(_ASSERT_QUERY_FROZEN_KEYS).toBe(true);
    expect(_ASSERT_FROZEN_KEYS).toBe(true);
  });

  it("frozen key set sizes are stable", () => {
    expect(CASE_LIST_QUERY_PARAM_KEYS).toHaveLength(8);
    expect(CASE_LIST_PARAM_KEYS).toHaveLength(9);
    expect(Object.keys(CASE_LIST_BASE_FIELD_MAP)).toHaveLength(10);
    expect(CASE_LIST_BASE_TARGET_KEYS).toHaveLength(10);
    expect(Object.keys(CASE_LIST_DERIVED_FIELD_MAP)).toHaveLength(5);
    expect(CASE_LIST_DERIVED_TARGET_KEYS).toHaveLength(8);
    expect(CASE_SUMMARY_CARD_KEYS).toHaveLength(4);
    expect(CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS).toHaveLength(8);
    expect(Object.keys(CUSTOMER_DOWNSTREAM_FIELD_MAP)).toHaveLength(7);
    expect(CUSTOMER_CASE_UPSTREAM_CONTRACT).toHaveLength(7);
  });

  it("HTTP field map covers all param keys", () => {
    for (const key of CASE_LIST_PARAM_KEYS) {
      expect(CASE_LIST_HTTP_FIELD_MAP).toHaveProperty(key);
    }
  });

  it("derived field map targets sum to 8", () => {
    const allTargets = Object.values(CASE_LIST_DERIVED_FIELD_MAP).flat();
    expect(allTargets).toHaveLength(8);
  });

  it("summary card field usage covers all card keys", () => {
    for (const key of CASE_SUMMARY_CARD_KEYS) {
      expect(CASE_SUMMARY_CARD_FIELD_USAGE).toHaveProperty(key);
    }
  });

  it("validation is in query-only; page/limit are in HTTP-only", () => {
    expect(CASE_LIST_QUERY_PARAM_KEYS).toContain("validation");
    expect(CASE_LIST_PARAM_KEYS).not.toContain("validation");
    expect(CASE_LIST_PARAM_KEYS).toContain("page");
    expect(CASE_LIST_PARAM_KEYS).toContain("limit");
    expect(CASE_LIST_QUERY_PARAM_KEYS).not.toContain("page");
    expect(CASE_LIST_QUERY_PARAM_KEYS).not.toContain("limit");
  });

  it("query filter keys (minus validation/customerId) are a subset of HTTP param keys", () => {
    const queryFilterKeys = CASE_LIST_QUERY_PARAM_KEYS.filter(
      (k) => k !== "validation" && k !== "customerId",
    );
    for (const key of queryFilterKeys) {
      expect(
        CASE_LIST_PARAM_KEYS.includes(
          key as (typeof CASE_LIST_PARAM_KEYS)[number],
        ),
      ).toBe(true);
    }
  });

  it("customerId appears in both query params and HTTP params", () => {
    expect(CASE_LIST_QUERY_PARAM_KEYS).toContain("customerId");
    expect(CASE_LIST_PARAM_KEYS).toContain("customerId");
    expect(CASE_LIST_HTTP_FIELD_MAP.customerId).toBe("customerId");
  });

  it("base + derived target keys are non-overlapping", () => {
    const allTargetKeys = new Set([
      ...CASE_LIST_BASE_TARGET_KEYS,
      ...CASE_LIST_DERIVED_TARGET_KEYS,
    ]);
    expect(allTargetKeys.size).toBe(
      CASE_LIST_BASE_TARGET_KEYS.length + CASE_LIST_DERIVED_TARGET_KEYS.length,
    );
  });
});
