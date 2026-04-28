// ── Test Ownership ──────────────────────────────────────────────
// Owner: customer → cases shared query & adapter contract (p0-fe-009-01).
// Covers:
//   - HTTP query param alignment between CustomerRepository.listRelatedCases
//     and cases-side CASE_LIST_HTTP_FIELD_MAP
//   - adapter field alignment with CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS
//   - CUSTOMER_CASES_QUERY_HTTP_CONTRACT frozen values
//   - cross-adapter DTO shape compatibility
// Does NOT test: individual adapter mapper logic (→ CustomerAdapter.test),
//   cases list adapter (→ CaseAdapterMappers.test), repository orchestration
//   (→ CustomerRepository.test), or UI model composable (→ useCustomerCasesModel.test).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  CUSTOMER_CASES_QUERY_HTTP_CONTRACT,
  CUSTOMER_CASES_API_PATH,
} from "./CustomerAdapterTypes";
import {
  CUSTOMER_CASE_UPSTREAM_CONTRACT,
  adaptCustomerCaseListResult,
} from "./CustomerAdapterMappers";
import {
  CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS,
  CUSTOMER_DOWNSTREAM_FIELD_MAP,
  CASE_LIST_HTTP_FIELD_MAP,
} from "../../cases/model/CaseAdapterTypes";

// ─── HTTP Query Contract Alignment ──────────────────────────────

describe("HTTP query contract alignment (p0-fe-009-01)", () => {
  it("CUSTOMER_CASES_QUERY_HTTP_CONTRACT.customerId matches cases-side HTTP field map", () => {
    expect(CUSTOMER_CASES_QUERY_HTTP_CONTRACT.customerId).toBe(
      CASE_LIST_HTTP_FIELD_MAP.customerId,
    );
  });

  it("CUSTOMER_CASES_QUERY_HTTP_CONTRACT.view is 'summary'", () => {
    expect(CUSTOMER_CASES_QUERY_HTTP_CONTRACT.view).toBe("summary");
  });

  it("CUSTOMER_CASES_API_PATH is '/api/cases'", () => {
    expect(CUSTOMER_CASES_API_PATH).toBe("/api/cases");
  });

  it("contract constant matches hardcoded expectations", () => {
    expect(CUSTOMER_CASES_QUERY_HTTP_CONTRACT).toEqual({
      customerId: "customerId",
      view: "summary",
    });
  });
});

// ─── Adapter Field Contract Alignment ───────────────────────────

describe("adapter field contract alignment (p0-fe-009-01)", () => {
  it("CUSTOMER_CASE_UPSTREAM_CONTRACT matches DOWNSTREAM_FIELD_MAP keys", () => {
    const upstreamKeys = [...CUSTOMER_CASE_UPSTREAM_CONTRACT].sort();
    const downstreamKeys = Object.keys(CUSTOMER_DOWNSTREAM_FIELD_MAP).sort();
    expect(upstreamKeys).toEqual(downstreamKeys);
  });

  it("CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS is a superset of UPSTREAM_CONTRACT + customerId", () => {
    const minFields = new Set(CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS);
    for (const field of CUSTOMER_CASE_UPSTREAM_CONTRACT) {
      expect(minFields.has(field)).toBe(true);
    }
    expect(minFields.has("customerId")).toBe(true);
  });

  it("CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS has exactly 8 fields", () => {
    expect(CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS).toHaveLength(8);
  });
});

// ─── Cross-Adapter DTO Compatibility ────────────────────────────

describe("cross-adapter DTO compatibility (p0-fe-009-01)", () => {
  function canonicalCaseDto(overrides: Record<string, unknown> = {}) {
    return {
      id: "case-contract-001",
      caseName: "契約テスト案件",
      caseTypeCode: "business-management",
      stage: "S3",
      ownerUserId: "user-contract",
      customerId: "cust-contract",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-15T00:00:00.000Z",
      groupId: "group-1",
      riskLevel: "low",
      billingUnpaidAmountCached: 30000,
      dueAt: "2026-06-01",
      ...overrides,
    };
  }

  it("customer adapter parses cases-side canonical flat DTO", () => {
    const result = adaptCustomerCaseListResult({
      items: [canonicalCaseDto()],
    });
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("case-contract-001");
    expect(result![0].name).toBe("契約テスト案件");
    expect(result![0].type).toBe("business-management");
    expect(result![0].stage).toBe("S3");
    expect(result![0].status).toBe("active");
  });

  it("customer adapter parses cases-side wrapped (summary) DTO", () => {
    const wrappedItem = {
      case: {
        id: "case-wrapped-001",
        caseName: "ラップ形式テスト",
        caseTypeCode: "visa",
        stage: "S5",
        ownerUserId: "user-wrapped",
        customerId: "cust-wrapped",
        createdAt: "2026-03-01",
        updatedAt: "2026-04-10",
      },
      customerName: "田中太郎",
      groupName: "Osaka",
      latestValidation: null,
    };

    const result = adaptCustomerCaseListResult({ items: [wrappedItem] });
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("case-wrapped-001");
    expect(result![0].name).toBe("ラップ形式テスト");
  });

  it("customer adapter handles DTO with only minimum fields", () => {
    const minimalDto: Record<string, unknown> = {};
    for (const field of CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS) {
      if (field === "id") minimalDto.id = "case-min";
      else if (field === "caseName") minimalDto.caseName = "最小集テスト";
      else if (field === "caseTypeCode") minimalDto.caseTypeCode = "visa";
      else if (field === "stage") minimalDto.stage = "S2";
      else if (field === "ownerUserId") minimalDto.ownerUserId = "user-min";
      else if (field === "customerId") minimalDto.customerId = "cust-min";
      else if (field === "createdAt") minimalDto.createdAt = "2026-01-01";
      else if (field === "updatedAt") minimalDto.updatedAt = "2026-01-02";
    }

    const result = adaptCustomerCaseListResult({ items: [minimalDto] });
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("case-min");
  });

  it("customer adapter maps fields according to DOWNSTREAM_FIELD_MAP", () => {
    const dto = canonicalCaseDto();
    const result = adaptCustomerCaseListResult({ items: [dto] })!;
    const c = result[0];

    expect(c.id).toBe(dto.id);
    expect(c.name).toBe(dto.caseName);
    expect(c.type).toBe(dto.caseTypeCode);
    expect(c.stage).toBe(dto.stage);
    expect(c.owner).toBe(dto.ownerUserId);
    expect(c.createdAt).toBe(dto.createdAt);
    expect(c.updatedAt).toBe(dto.updatedAt);
  });

  it("archived case DTO is correctly recognized by customer adapter", () => {
    const result = adaptCustomerCaseListResult({
      items: [canonicalCaseDto({ archivedAt: "2026-04-20T00:00:00.000Z" })],
    });
    expect(result).not.toBeNull();
    expect(result![0].status).toBe("archived");
  });

  it("empty items array returns empty result", () => {
    const result = adaptCustomerCaseListResult({ items: [] });
    expect(result).not.toBeNull();
    expect(result).toHaveLength(0);
  });

  it("array response (without items wrapper) is also handled", () => {
    const result = adaptCustomerCaseListResult([canonicalCaseDto()]);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
  });
});
