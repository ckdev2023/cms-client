// ── Test Ownership ──────────────────────────────────────────────
// Owner: adaptCaseSummaryResult convenience adapter and customer
//   downstream reuse contract regression (p0-fe-002b-06/07/08).
// Does NOT test: adaptCaseListResult / adaptCaseSummaryCards core
//   logic (→ CaseAdapterMappers.test), detail aggregate, mutation
//   results, write builders, or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  adaptCaseListResult,
  adaptCaseSummaryCards,
  adaptCaseSummaryResult,
} from "./CaseAdapterMappers";
import {
  CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS,
  CUSTOMER_DOWNSTREAM_FIELD_MAP,
} from "./CaseAdapterTypes";
import {
  adaptCustomerCaseListResult,
  CUSTOMER_CASE_UPSTREAM_CONTRACT,
} from "../../customers/model/CustomerAdapterMappers";

// ─── Shared Fixtures ────────────────────────────────────────────

function flatRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "case-001",
    customerId: "cust-001",
    caseTypeCode: "visa",
    stage: "S3",
    groupId: "group-1",
    ownerUserId: "user-1",
    caseName: "技人国更新",
    caseNo: "CASE-001",
    riskLevel: "low",
    billingUnpaidAmountCached: 50000,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    dueAt: "2026-06-01",
    customerName: "張伟",
    groupName: "Tokyo-1",
    ownerDisplayName: "担当太郎",
    assistantDisplayName: null,
    ...overrides,
  };
}

function wrappedRow(
  caseOverrides: Record<string, unknown> = {},
  wrapperOverrides: Record<string, unknown> = {},
) {
  const caseRecord = {
    id: "case-001",
    customerId: "cust-001",
    caseTypeCode: "visa",
    stage: "S3",
    groupId: "group-1",
    ownerUserId: "user-1",
    caseName: "技人国更新",
    caseNo: "CASE-001",
    riskLevel: "low",
    billingUnpaidAmountCached: 50000,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    dueAt: "2026-06-01",
    ...caseOverrides,
  };
  return {
    case: caseRecord,
    customerName: "張伟",
    groupName: "Tokyo-1",
    latestValidation: null,
    ...wrapperOverrides,
  };
}

// ─── adaptCaseSummaryResult ────────────────────────────────────

describe("adaptCaseSummaryResult", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("combines list result with summary cards in a single call", () => {
    const result = adaptCaseSummaryResult({
      items: [
        flatRow({ stage: "S3" }),
        flatRow({ id: "case-002", stage: "S9" }),
      ],
      total: 2,
      page: 1,
      limit: 50,
    });

    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(2);
    expect(result!.total).toBe(2);
    expect(result!.cards).toHaveLength(4);
    expect(result!.cards.find((c) => c.key === "activeCases")!.value).toBe(1);
  });

  it("returns null for invalid input", () => {
    expect(adaptCaseSummaryResult(null)).toBeNull();
    expect(adaptCaseSummaryResult("bad")).toBeNull();
    expect(adaptCaseSummaryResult({ items: "not-array" })).toBeNull();
  });

  it("returns empty cards for empty list", () => {
    const result = adaptCaseSummaryResult({
      items: [],
      total: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(0);
    expect(result!.cards).toHaveLength(4);
    expect(result!.cards.every((c) => c.value === 0)).toBe(true);
  });

  it("summary cards are consistent with adaptCaseSummaryCards", () => {
    const payload = {
      items: [
        flatRow({
          stage: "S3",
          billingUnpaidAmountCached: 50000,
          dueAt: "2026-04-22",
        }),
        flatRow({ id: "case-002", stage: "S5" }),
      ],
      total: 2,
    };

    const summaryResult = adaptCaseSummaryResult(payload);
    const listResult = adaptCaseListResult(payload);
    const separateCards = adaptCaseSummaryCards(listResult!.items);

    expect(summaryResult!.cards).toEqual(separateCards);
  });
});

// ─── Customer downstream reuse contract (p0-fe-002b-07) ─────────
// 这些测试锁定 cases list adapter 对 customer 下游的最小字段集承诺。
// 如果 adaptCaseListResult 演进时破坏了这些字段，测试会报错，
// 提醒同步校准 CustomerAdapterMappers.adaptCustomerCaseDto。

describe("customer downstream reuse contract", () => {
  it("flat response preserves CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS", () => {
    const result = adaptCaseListResult({
      items: [
        flatRow({
          id: "case-downstream-001",
          customerId: "cust-downstream",
          stage: "S4",
          ownerUserId: "owner-42",
          updatedAt: "2026-04-15T00:00:00.000Z",
        }),
      ],
      total: 1,
    });

    expect(result).not.toBeNull();
    const item = result!.items[0];

    for (const field of CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS) {
      if (field === "id") expect(item.id).toBe("case-downstream-001");
      if (field === "customerId")
        expect(item.customerId).toBe("cust-downstream");
      if (field === "stage") expect(item.stageId).toBe("S4");
      if (field === "ownerUserId") expect(item.ownerId).toBe("owner-42");
      if (field === "updatedAt") expect(item.updatedAtLabel).toBeTruthy();
    }
  });

  it("wrapped (summary) response also preserves minimum fields", () => {
    const result = adaptCaseListResult({
      items: [
        wrappedRow(
          {
            id: "case-downstream-002",
            customerId: "cust-downstream",
            stage: "S6",
            ownerUserId: "owner-99",
            updatedAt: "2026-04-12T00:00:00.000Z",
          },
          { customerName: "田中太郎", groupName: "Osaka" },
        ),
      ],
      total: 1,
    });

    expect(result).not.toBeNull();
    const item = result!.items[0];
    expect(item.id).toBe("case-downstream-002");
    expect(item.customerId).toBe("cust-downstream");
    expect(item.stageId).toBe("S6");
    expect(item.ownerId).toBe("owner-99");
    expect(item.updatedAtLabel).toBeTruthy();
    expect(item.applicant).toBe("田中太郎");
  });

  it("customerId-only query yields items with customerId preserved", () => {
    const result = adaptCaseListResult({
      items: [
        flatRow({ customerId: "cust-shared" }),
        flatRow({ id: "case-002", customerId: "cust-shared" }),
      ],
      total: 2,
    });

    expect(result).not.toBeNull();
    expect(
      result!.items.every((item) => item.customerId === "cust-shared"),
    ).toBe(true);
  });

  it("adapter produces name fallback chain for customer display", () => {
    const withName = adaptCaseListResult({
      items: [flatRow({ caseName: "経営管理", caseNo: "NO-1" })],
      total: 1,
    });
    expect(withName!.items[0].name).toBe("経営管理");

    const withNo = adaptCaseListResult({
      items: [flatRow({ caseName: "", caseNo: "NO-1" })],
      total: 1,
    });
    expect(withNo!.items[0].name).toBe("NO-1");

    const withIdOnly = adaptCaseListResult({
      items: [flatRow({ caseName: "", caseNo: "" })],
      total: 1,
    });
    expect(withIdOnly!.items[0].name).toBe("case-001");
  });

  it("adapter produces stage and owner for customer cases tab display", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ stage: "S7", ownerUserId: "user-display" })],
      total: 1,
    });
    expect(result!.items[0].stageId).toBe("S7");
    expect(result!.items[0].ownerId).toBe("user-display");
  });

  it("all CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS are present in canonical flat DTO", () => {
    const canonicalDto = flatRow();
    for (const field of CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS) {
      expect(canonicalDto).toHaveProperty(field);
    }
  });

  it("all CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS are present in canonical wrapped DTO", () => {
    const wrapped = wrappedRow();
    const caseRecord = wrapped.case as Record<string, unknown>;
    for (const field of CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS) {
      if (field === "customerId" || field === "id") {
        expect(caseRecord).toHaveProperty(field);
      } else {
        expect(caseRecord).toHaveProperty(field);
      }
    }
  });
});

// ─── Cross-adapter contract (p0-fe-002b-07) ─────────────────────
// These tests verify that the cases-side DTO can be consumed by the
// customer-side adapter (adaptCustomerCaseListResult) without loss
// of essential data. If the cases DTO shape changes, both adapters
// must stay aligned.

describe("cross-adapter contract (p0-fe-002b-07)", () => {
  it("CUSTOMER_DOWNSTREAM_FIELD_MAP keys match MINIMUM_FIELDS minus customerId", () => {
    const mapKeys = Object.keys(CUSTOMER_DOWNSTREAM_FIELD_MAP).sort();
    const minFieldsWithoutCustomerId = [...CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS]
      .filter((f) => f !== "customerId")
      .sort();
    expect(mapKeys).toEqual(minFieldsWithoutCustomerId);
  });

  it("CUSTOMER_CASE_UPSTREAM_CONTRACT matches FIELD_MAP keys", () => {
    const upstreamKeys = [...CUSTOMER_CASE_UPSTREAM_CONTRACT].sort();
    const mapKeys = Object.keys(CUSTOMER_DOWNSTREAM_FIELD_MAP).sort();
    expect(upstreamKeys).toEqual(mapKeys);
  });

  it("customer adapter parses canonical flat case DTO into CustomerCase", () => {
    const canonicalDto = {
      id: "case-cross-001",
      caseName: "経営管理ビザ",
      caseNo: "CASE-X001",
      caseTypeCode: "business-management",
      stage: "S4",
      ownerUserId: "user-cross",
      customerId: "cust-cross",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-10T00:00:00.000Z",
      groupId: "group-1",
      riskLevel: "low",
      billingUnpaidAmountCached: 50000,
      dueAt: "2026-06-01",
    };

    const result = adaptCustomerCaseListResult({ items: [canonicalDto] });
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);

    const customerCase = result![0];
    expect(customerCase.id).toBe("case-cross-001");
    expect(customerCase.name).toBe("経営管理ビザ");
    expect(customerCase.type).toBe("business-management");
    expect(customerCase.stage).toBe("S4");
    expect(customerCase.owner).toBe("user-cross");
    expect(customerCase.createdAt).toBe("2026-04-01T00:00:00.000Z");
    expect(customerCase.updatedAt).toBe("2026-04-10T00:00:00.000Z");
    expect(customerCase.status).toBe("active");
  });

  it("customer adapter handles DTO with only minimum fields", () => {
    const minimalDto: Record<string, unknown> = {
      id: "case-minimal",
      caseName: "最小集テスト",
      caseTypeCode: "visa",
      stage: "S2",
      ownerUserId: "user-min",
      customerId: "cust-min",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-02",
    };

    const result = adaptCustomerCaseListResult({ items: [minimalDto] });
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("case-minimal");
    expect(result![0].name).toBe("最小集テスト");
    expect(result![0].type).toBe("visa");
    expect(result![0].stage).toBe("S2");
    expect(result![0].owner).toBe("user-min");
    expect(result![0].createdAt).toBe("2026-01-01");
    expect(result![0].updatedAt).toBe("2026-01-02");
  });

  it("both adapters read the same canonical DTO without error", () => {
    const payload = {
      items: [
        flatRow({
          id: "case-dual-001",
          caseName: "双方適配テスト",
          caseTypeCode: "work-visa",
          stage: "S5",
          ownerUserId: "user-dual",
          customerId: "cust-dual",
          createdAt: "2026-03-15T00:00:00.000Z",
          updatedAt: "2026-04-15T00:00:00.000Z",
        }),
      ],
      total: 1,
    };

    const caseSideResult = adaptCaseListResult(payload);
    expect(caseSideResult).not.toBeNull();
    expect(caseSideResult!.items[0].id).toBe("case-dual-001");
    expect(caseSideResult!.items[0].customerId).toBe("cust-dual");

    const customerSideResult = adaptCustomerCaseListResult(payload);
    expect(customerSideResult).not.toBeNull();
    expect(customerSideResult![0].id).toBe("case-dual-001");
  });

  it("removing a minimum field from DTO degrades customer adapter gracefully", () => {
    const dtoWithoutCaseName = {
      id: "case-degrade",
      caseTypeCode: "visa",
      stage: "S3",
      ownerUserId: "user-deg",
      customerId: "cust-deg",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-02",
    };

    const result = adaptCustomerCaseListResult({
      items: [dtoWithoutCaseName],
    });
    expect(result).not.toBeNull();
    expect(result![0].name).toBe("case-degrade");
  });
});
