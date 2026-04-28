import { describe, expect, it, vi } from "vitest";
import { createCaseRepository } from "./CaseRepository";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function createRequestMock(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response,
) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(input, init),
  ) as unknown as typeof fetch;
}

const PLAN_1 = {
  id: "bp-001",
  milestoneName: "着手金",
  amountDue: 100000,
  paidAmount: 50000,
  status: "partial",
  dueDate: "2026-04-01",
};

const PLAN_2 = {
  id: "bp-002",
  milestoneName: "尾款",
  amountDue: 200000,
  paidAmount: 0,
  status: "due",
  dueDate: "2026-06-01",
};

const PAYMENT_VALID = {
  id: "pr-001",
  billingPlanId: "bp-001",
  amountReceived: 50000,
  receivedAt: "2026-04-10T10:00:00.000Z",
  recordStatus: "valid",
  milestoneName: "着手金",
  voidReasonCode: null,
  voidedByDisplayName: null,
};

const PAYMENT_VOIDED = {
  id: "pr-002",
  billingPlanId: "bp-001",
  amountReceived: 20000,
  receivedAt: "2026-04-05T10:00:00.000Z",
  recordStatus: "voided",
  milestoneName: "着手金",
  voidReasonCode: "duplicate",
  voidedByDisplayName: "管理者太郎",
};

const PAYMENT_REVERSED = {
  id: "pr-003",
  billingPlanId: "bp-001",
  amountReceived: 30000,
  receivedAt: "2026-04-08T10:00:00.000Z",
  recordStatus: "reversed",
  milestoneName: "着手金",
  voidReasonCode: "bank_error",
  voidedByDisplayName: "管理者次郎",
};

const AGGREGATE_BODY = {
  summary: {
    quotePrice: 300000,
    totalDue: 300000,
    totalReceived: 50000,
    unpaidAmount: 250000,
  },
  plans: [PLAN_1, PLAN_2],
  recentPayments: [PAYMENT_VALID, PAYMENT_VOIDED, PAYMENT_REVERSED],
};

describe("CaseRepository.getBillingTabAggregate", () => {
  it("calls /api/cases/:id/billing-tab-aggregate and returns raw body", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/cases/case-001/billing-tab-aggregate");
      expect(init?.method).toBe("GET");
      return jsonResponse(AGGREGATE_BODY);
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.getBillingTabAggregate("case-001");
    expect(result).toBeDefined();
    expect((result as Record<string, unknown>).plans).toHaveLength(2);
  });

  it("returns null for empty caseId", async () => {
    const request = createRequestMock(() => jsonResponse(null));
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.getBillingTabAggregate("  ");
    expect(result).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
});

describe("CaseRepository.getBillingData — aggregate path", () => {
  it("uses aggregate endpoint on first screen load", async () => {
    const request = createRequestMock((input) => {
      expect(String(input)).toBe("/api/cases/case-001/billing-tab-aggregate");
      return jsonResponse(AGGREGATE_BODY);
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.getBillingData("case-001");

    expect(result.total).toBe("¥300,000");
    expect(result.received).toBe("¥50,000");
    expect(result.outstanding).toBe("¥250,000");
    expect(result.payments.length).toBeGreaterThanOrEqual(2);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("merges plan rows and payment rows in time-desc order", async () => {
    const request = createRequestMock(() => jsonResponse(AGGREGATE_BODY));
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.getBillingData("case-001");

    const kinds = result.payments.map((r) => r.kind ?? "plan");
    expect(kinds).toContain("plan");
    expect(kinds).toContain("payment");
    expect(kinds).toContain("voided");
    expect(kinds).toContain("reversed");

    const dates = result.payments.map((r) => r.date);
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i] >= dates[i + 1]).toBe(true);
    }
  });

  it("voided/reversed rows have strikethrough=true", async () => {
    const request = createRequestMock(() => jsonResponse(AGGREGATE_BODY));
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.getBillingData("case-001");

    const mutedRows = result.payments.filter(
      (r) => r.kind === "voided" || r.kind === "reversed",
    );
    for (const row of mutedRows) {
      expect(row.strikethrough).toBe(true);
    }
  });

  it("reversed row note contains reasonCode and operator name (D10)", async () => {
    const request = createRequestMock(() => jsonResponse(AGGREGATE_BODY));
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.getBillingData("case-001");

    const reversedRow = result.payments.find((r) => r.kind === "reversed");
    expect(reversedRow).toBeDefined();
    expect(reversedRow!.note).toContain("bank_error");
    expect(reversedRow!.note).toContain("管理者次郎");
    expect(reversedRow!.type).toBe("冲正入金");
  });

  it("totalPaid computed from valid payments only (voided/reversed excluded)", async () => {
    const request = createRequestMock(() => jsonResponse(AGGREGATE_BODY));
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.getBillingData("case-001");

    expect(result.received).toBe("¥50,000");
  });
});

describe("CaseRepository.getBillingData — fallback path", () => {
  it("falls back to plans+payments dual fetch when aggregate returns 404", async () => {
    let callCount = 0;
    const request = createRequestMock((input) => {
      callCount++;
      const url = String(input);
      if (url.includes("billing-tab-aggregate")) {
        return jsonResponse({ message: "Not Found" }, { status: 404 });
      }
      if (url.includes("billing-plans")) {
        return jsonResponse({ items: [PLAN_1, PLAN_2], total: 2 });
      }
      if (url.includes("payment-records")) {
        return jsonResponse({
          items: [PAYMENT_VALID],
          total: 1,
        });
      }
      return jsonResponse(null);
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.getBillingData("case-001");

    expect(callCount).toBe(3);
    expect(result.total).toBe("¥300,000");
    expect(result.received).toBe("¥50,000");
    expect(result.payments.length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to plans+payments dual fetch when aggregate returns 500", async () => {
    let callCount = 0;
    const request = createRequestMock((input) => {
      callCount++;
      const url = String(input);
      if (url.includes("billing-tab-aggregate")) {
        return jsonResponse(
          { message: "Internal Server Error" },
          { status: 500 },
        );
      }
      if (url.includes("billing-plans")) {
        return jsonResponse({ items: [PLAN_1], total: 1 });
      }
      if (url.includes("payment-records")) {
        return jsonResponse({ items: [], total: 0 });
      }
      return jsonResponse(null);
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.getBillingData("case-001");

    expect(callCount).toBe(3);
    expect(result.total).toBe("¥100,000");
  });

  it("falls back when aggregate throws network error", async () => {
    let callCount = 0;
    const request = createRequestMock((input) => {
      callCount++;
      const url = String(input);
      if (url.includes("billing-tab-aggregate")) {
        throw new Error("Connection refused");
      }
      if (url.includes("billing-plans")) {
        return jsonResponse({ items: [PLAN_2], total: 1 });
      }
      if (url.includes("payment-records")) {
        return jsonResponse({ items: [], total: 0 });
      }
      return jsonResponse(null);
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.getBillingData("case-001");

    expect(callCount).toBe(3);
    expect(result.total).toBe("¥200,000");
  });

  it("legacy path tolerates payment-records failure (returns empty payments)", async () => {
    const request = createRequestMock((input) => {
      const url = String(input);
      if (url.includes("billing-tab-aggregate")) {
        return jsonResponse({ message: "Not Found" }, { status: 404 });
      }
      if (url.includes("billing-plans")) {
        return jsonResponse({
          items: [PLAN_1],
          total: 1,
        });
      }
      if (url.includes("payment-records")) {
        return jsonResponse(
          { message: "Service Unavailable" },
          { status: 503 },
        );
      }
      return jsonResponse(null);
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.getBillingData("case-001");

    expect(result.total).toBe("¥100,000");
    expect(result.received).toBe("¥50,000");
  });

  it("returns EMPTY_BILLING for empty caseId", async () => {
    const request = createRequestMock(() => jsonResponse(null));
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.getBillingData("  ");

    expect(result.total).toBe("—");
    expect(result.received).toBe("¥0");
    expect(result.outstanding).toBe("¥0");
    expect(result.payments).toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });
});

describe("CaseRepository.getBillingData — aggregate+fallback output consistency", () => {
  it("aggregate path and legacy path produce consistent summary for same data", async () => {
    const aggregateRequest = createRequestMock(() =>
      jsonResponse({
        plans: [PLAN_1],
        recentPayments: [PAYMENT_VALID],
      }),
    );
    const aggregateRepo = createCaseRepository({
      request: aggregateRequest,
      getToken: () => "t",
    });
    const aggregateResult = await aggregateRepo.getBillingData("case-001");

    const legacyRequest = createRequestMock((input) => {
      const url = String(input);
      if (url.includes("billing-tab-aggregate")) {
        return jsonResponse({ message: "Not Found" }, { status: 404 });
      }
      if (url.includes("billing-plans")) {
        return jsonResponse({ items: [PLAN_1], total: 1 });
      }
      if (url.includes("payment-records")) {
        return jsonResponse({ items: [PAYMENT_VALID], total: 1 });
      }
      return jsonResponse(null);
    });
    const legacyRepo = createCaseRepository({
      request: legacyRequest,
      getToken: () => "t",
    });
    const legacyResult = await legacyRepo.getBillingData("case-001");

    expect(aggregateResult.total).toBe(legacyResult.total);
    expect(aggregateResult.received).toBe(legacyResult.received);
    expect(aggregateResult.outstanding).toBe(legacyResult.outstanding);
    expect(aggregateResult.payments.length).toBe(legacyResult.payments.length);
  });
});
