// ── Test Ownership ──────────────────────────────────────────────
// Owner: customer → cases cross-module query builder + adapter reuse
//   boundary (p0-fe-009-01).
//
// Validates:
//   1. HTTP query params align between customer and cases sides
//   2. Customer adapter handles both flat and wrapped (summary) DTOs
//   3. Navigation route contract is consistent
//
// Does NOT test:
//   - Cases-side adapter logic → CaseAdapterMappers.test
//   - Cases-side list query → CaseListContractIntegration.test
//   - Customer model state management → useCustomerCasesModel.test
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
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

// ─── Fixtures ────────────────────────────────────────────────────

function flatCaseDto(overrides: Record<string, unknown> = {}) {
  return {
    id: "case-cross-001",
    customerId: "cust-cross",
    caseName: "経営管理ビザ更新",
    caseNo: "CASE-X001",
    caseTypeCode: "business-management",
    stage: "S4",
    ownerUserId: "user-cross",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    groupId: "group-1",
    riskLevel: "low",
    billingUnpaidAmountCached: 50000,
    dueAt: "2026-06-01",
    ...overrides,
  };
}

function wrappedCaseDto(
  caseOverrides: Record<string, unknown> = {},
  wrapperOverrides: Record<string, unknown> = {},
) {
  const { customerName, groupName, ...caseFields } = {
    ...flatCaseDto(caseOverrides),
    customerName: "田中太郎",
    groupName: "Tokyo-A",
  };
  return {
    case: caseFields,
    customerName,
    groupName,
    latestValidation: null,
    ...wrapperOverrides,
  };
}

function apiResponse(
  items: unknown[],
  overrides: Record<string, unknown> = {},
) {
  return { items, total: items.length, page: 1, limit: 50, ...overrides };
}

// ─── 1. HTTP Query Param Alignment ──────────────────────────────

describe("HTTP query param alignment (p0-fe-009-01)", () => {
  it("CUSTOMER_CASES_SHARED_HTTP_PARAMS.customerIdKey matches cases-side HTTP field map", () => {
    expect(CUSTOMER_CASES_SHARED_HTTP_PARAMS.customerIdKey).toBe(
      CASE_LIST_HTTP_FIELD_MAP.customerId,
    );
  });

  it("cases-side buildCaseListSearchParams always sets view=summary", () => {
    const sp = buildCaseListSearchParams({ customerId: "cust-test" });
    expect(sp.get(CUSTOMER_CASES_SHARED_HTTP_PARAMS.viewKey)).toBe(
      CUSTOMER_CASES_SHARED_HTTP_PARAMS.viewValue,
    );
  });

  it("cases-side search params preserve customerId verbatim", () => {
    const sp = buildCaseListSearchParams({ customerId: "cust-exact-id" });
    expect(sp.get("customerId")).toBe("cust-exact-id");
  });

  it("customerId-only query produces minimal param set", () => {
    const sp = buildCaseListSearchParams({ customerId: "cust-only" });
    const keys = Array.from(sp.keys()).sort();
    expect(keys).toEqual(["customerId", "view"]);
  });
});

// ─── 2. Customer Adapter: Flat DTO ──────────────────────────────

describe("customer adapter: flat DTO (p0-fe-009-01)", () => {
  it("parses canonical flat DTO into CustomerCase", () => {
    const result = adaptCustomerCaseListResult(apiResponse([flatCaseDto()]));
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);

    const c = result![0];
    expect(c.id).toBe("case-cross-001");
    expect(c.name).toBe("経営管理ビザ更新");
    expect(c.type).toBe("business-management");
    expect(c.stage).toBe("S4");
    expect(c.owner).toBe("user-cross");
    expect(c.status).toBe("active");
    expect(c.createdAt).toBe("2026-04-01T00:00:00.000Z");
    expect(c.updatedAt).toBe("2026-04-10T00:00:00.000Z");
  });

  it("handles DTO with only minimum fields", () => {
    const minimal = {
      id: "case-min",
      caseName: "最小集",
      caseTypeCode: "visa",
      stage: "S2",
      ownerUserId: "user-min",
      customerId: "cust-min",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-02",
    };

    const result = adaptCustomerCaseListResult(apiResponse([minimal]));
    expect(result).not.toBeNull();
    expect(result![0].id).toBe("case-min");
    expect(result![0].name).toBe("最小集");
  });

  it("multiple items with same customerId are all preserved", () => {
    const items = [
      flatCaseDto({ id: "c1" }),
      flatCaseDto({ id: "c2", stage: "S7" }),
      flatCaseDto({ id: "c3", stage: "S9" }),
    ];
    const result = adaptCustomerCaseListResult(apiResponse(items));
    expect(result).toHaveLength(3);
    expect(result!.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
  });
});

// ─── 3. Customer Adapter: Wrapped (Summary) DTO ─────────────────

describe("customer adapter: wrapped summary DTO (p0-fe-009-01)", () => {
  it("parses wrapped summary DTO into CustomerCase", () => {
    const result = adaptCustomerCaseListResult(apiResponse([wrappedCaseDto()]));
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);

    const c = result![0];
    expect(c.id).toBe("case-cross-001");
    expect(c.name).toBe("経営管理ビザ更新");
    expect(c.type).toBe("business-management");
    expect(c.stage).toBe("S4");
    expect(c.owner).toBe("user-cross");
    expect(c.createdAt).toBe("2026-04-01T00:00:00.000Z");
    expect(c.updatedAt).toBe("2026-04-10T00:00:00.000Z");
  });

  it("handles mixed flat + wrapped items", () => {
    const items = [
      flatCaseDto({ id: "flat-1" }),
      wrappedCaseDto({ id: "wrapped-1" }),
      flatCaseDto({ id: "flat-2" }),
    ];
    const result = adaptCustomerCaseListResult(apiResponse(items));
    expect(result).toHaveLength(3);
    expect(result!.map((c) => c.id)).toEqual(["flat-1", "wrapped-1", "flat-2"]);
  });

  it("derives status from nested archivedAt in wrapped format", () => {
    const result = adaptCustomerCaseListResult(
      apiResponse([wrappedCaseDto({ archivedAt: "2026-03-01T00:00:00.000Z" })]),
    );
    expect(result).not.toBeNull();
    expect(result![0].status).toBe("archived");
  });

  it("wrapped DTO without archivedAt defaults to active", () => {
    const result = adaptCustomerCaseListResult(apiResponse([wrappedCaseDto()]));
    expect(result![0].status).toBe("active");
  });
});

// ─── 4. Contract Surface Lock ───────────────────────────────────

describe("cross-module contract surface lock (p0-fe-009-01)", () => {
  it("CUSTOMER_DOWNSTREAM_FIELD_MAP keys match upstream contract", () => {
    const downstreamKeys = Object.keys(CUSTOMER_DOWNSTREAM_FIELD_MAP).sort();
    const upstreamKeys = [...CUSTOMER_CASE_UPSTREAM_CONTRACT].sort();
    expect(downstreamKeys).toEqual(upstreamKeys);
  });

  it("shared HTTP params contract is stable", () => {
    expect(CUSTOMER_CASES_SHARED_HTTP_PARAMS).toEqual({
      customerIdKey: "customerId",
      viewKey: "view",
      viewValue: "summary",
    });
  });

  it("minimum fields count is stable", () => {
    expect(CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS).toHaveLength(8);
    expect(Object.keys(CUSTOMER_DOWNSTREAM_FIELD_MAP)).toHaveLength(7);
    expect(CUSTOMER_CASE_UPSTREAM_CONTRACT).toHaveLength(7);
  });

  it("canonical flat DTO contains all minimum fields", () => {
    const dto = flatCaseDto();
    for (const field of CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS) {
      expect(dto).toHaveProperty(field);
    }
  });

  it("canonical wrapped DTO nested case contains all minimum fields", () => {
    const wrapped = wrappedCaseDto();
    const caseRecord = wrapped.case as Record<string, unknown>;
    for (const field of CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS) {
      expect(caseRecord).toHaveProperty(field);
    }
  });
});
