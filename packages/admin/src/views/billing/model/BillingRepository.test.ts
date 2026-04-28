import { describe, expect, it, vi } from "vitest";
import { createBillingRepository } from "./BillingRepository";

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

function repo(request: typeof fetch) {
  return createBillingRepository({ request, getToken: () => "test-token" });
}

// ─── getList ────────────────────────────────────────────────────

describe("getList", () => {
  it("calls GET /api/billing-plans with filters", async () => {
    const request = createRequestMock((input) => {
      const url = String(input);
      expect(url).toContain("/api/billing-plans");
      expect(url).toContain("status=overdue");
      expect(url).toContain("page=2");
      expect(url).toContain("limit=20");
      return jsonResponse({
        items: [
          {
            id: "bp-1",
            amountDue: 100000,
            paidAmount: 50000,
            unpaidAmount: 50000,
            status: "overdue",
          },
        ],
        total: 1,
      });
    });

    const r = repo(request);
    const result = await r.getList({
      status: "overdue",
      page: 2,
      limit: 20,
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("calls GET /api/billing-plans without filters", async () => {
    const request = createRequestMock((input) => {
      expect(String(input)).toBe("/api/billing-plans");
      return jsonResponse({ items: [], total: 0 });
    });

    const result = await repo(request).getList();
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

// ─── getSummary ─────────────────────────────────────────────────

describe("getSummary", () => {
  it("calls GET /api/billing-summary and adapts result", async () => {
    const request = createRequestMock((input) => {
      expect(String(input)).toContain("/api/billing-summary");
      return jsonResponse({
        totalDue: 500000,
        totalReceived: 200000,
        totalOutstanding: 300000,
        overdueAmount: 100000,
      });
    });

    const result = await repo(request).getSummary();
    expect(result.totalDue).toBe(500000);
    expect(result.totalReceived).toBe(200000);
    expect(result.totalOutstanding).toBe(300000);
    expect(result.overdueAmount).toBe(100000);
  });

  it("passes filter params", async () => {
    const request = createRequestMock((input) => {
      const url = String(input);
      expect(url).toContain("status=due");
      expect(url).toContain("groupId=g1");
      return jsonResponse({
        totalDue: 0,
        totalReceived: 0,
        totalOutstanding: 0,
        overdueAmount: 0,
      });
    });

    await repo(request).getSummary({ status: "due", groupId: "g1" });
    expect(request).toHaveBeenCalledTimes(1);
  });
});

// ─── getPaymentLog ──────────────────────────────────────────────

describe("getPaymentLog", () => {
  it("calls GET /api/payment-records and adapts result", async () => {
    const request = createRequestMock((input) => {
      expect(String(input)).toContain("/api/payment-records");
      return jsonResponse({
        items: [
          {
            id: "pr-1",
            amountReceived: 50000,
            receivedAt: "2026-01-01",
            recordStatus: "valid",
            recordedByDisplayName: "Admin",
          },
        ],
        total: 1,
      });
    });

    const result = await repo(request).getPaymentLog();
    expect(result.items).toHaveLength(1);
    expect(result.entries).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("passes recordStatus and date filters", async () => {
    const request = createRequestMock((input) => {
      const url = String(input);
      expect(url).toContain("recordStatus=reversed");
      expect(url).toContain("from=2026-01-01");
      expect(url).toContain("to=2026-06-30");
      return jsonResponse({ items: [], total: 0 });
    });

    await repo(request).getPaymentLog({
      recordStatus: "reversed",
      from: "2026-01-01",
      to: "2026-06-30",
    });
  });
});

// ─── createPayment ──────────────────────────────────────────────

describe("createPayment", () => {
  it("calls POST /api/payment-records with body", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/payment-records");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init?.body as string);
      expect(body.billingPlanId).toBe("bp-1");
      expect(body.amountReceived).toBe(50000);
      return jsonResponse({ id: "pr-new" });
    });

    const result = await repo(request).createPayment({
      billingPlanId: "bp-1",
      amountReceived: 50000,
      receivedAt: "2026-04-01",
    });
    expect(result.id).toBe("pr-new");
  });
});

// ─── voidPayment ────────────────────────────────────────────────

describe("voidPayment", () => {
  it("calls POST /api/payment-records/:id/void", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/payment-records/pr-1/void");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init?.body as string);
      expect(body.reasonCode).toBe("duplicate");
      return jsonResponse({ id: "pr-1" });
    });

    const result = await repo(request).voidPayment("pr-1", {
      reasonCode: "duplicate",
    });
    expect(result.id).toBe("pr-1");
  });
});

// ─── reversePayment ─────────────────────────────────────────────

describe("reversePayment", () => {
  it("calls POST /api/payment-records/:id/reverse", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/payment-records/pr-1/reverse");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init?.body as string);
      expect(body.reasonCode).toBe("bank_error");
      expect(body.reasonNote).toBe("refund");
      return jsonResponse({ id: "pr-1" });
    });

    const result = await repo(request).reversePayment("pr-1", {
      reasonCode: "bank_error",
      reasonNote: "refund",
    });
    expect(result.id).toBe("pr-1");
  });
});

// ─── bulkCollect ────────────────────────────────────────────────

describe("bulkCollect", () => {
  it("calls POST /api/billing-collections/bulk with caseIds", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/billing-collections/bulk");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init?.body as string);
      expect(body.caseIds).toEqual(["c1", "c2"]);
      return jsonResponse({
        success: 1,
        skipped: 1,
        failed: 0,
        details: [
          { caseNo: "CAS-001", result: "success", taskId: "t-1" },
          { caseNo: "CAS-002", result: "skipped", reason: "not-overdue" },
        ],
      });
    });

    const result = await repo(request).bulkCollect(["c1", "c2"]);
    expect(result.success).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.details).toHaveLength(2);
    expect(result.details[1].reason).toBe("not-overdue");
  });
});

// ─── getBillingPlanNodes ────────────────────────────────────────

describe("getBillingPlanNodes", () => {
  it("calls GET /api/billing-plans with caseId and extracts nodes", async () => {
    const request = createRequestMock((input) => {
      const url = String(input);
      expect(url).toContain("/api/billing-plans");
      expect(url).toContain("caseId=case-1");
      expect(url).toContain("limit=200");
      return jsonResponse({
        items: [
          {
            id: "bp-1",
            milestoneName: "着手金",
            amountDue: 100000,
            status: "due",
          },
          {
            id: "bp-2",
            milestoneName: "尾款",
            amountDue: 200000,
            status: "partial",
          },
        ],
        total: 2,
      });
    });

    const nodes = await repo(request).getBillingPlanNodes("case-1");
    expect(nodes).toHaveLength(2);
    expect(nodes[0].name).toBe("着手金");
    expect(nodes[1].name).toBe("尾款");
  });
});

// ─── acknowledgeBillingRisk ─────────────────────────────────────

describe("acknowledgeBillingRisk", () => {
  it("calls POST /api/cases/:caseId/billing-risk-ack", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/cases/case-1/billing-risk-ack");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init?.body as string);
      expect(body.reasonCode).toBe("customer_promise");
      expect(body.reasonNote).toBe("confirmed");
      expect(body.evidenceUrl).toBe("https://example.com/receipt");
      return jsonResponse({ id: "case-1" });
    });

    const result = await repo(request).acknowledgeBillingRisk("case-1", {
      reasonCode: "customer_promise",
      reasonNote: "confirmed",
      evidenceUrl: "https://example.com/receipt",
    });
    expect(result.id).toBe("case-1");
  });
});

// ─── getCaseBillingRiskAck ──────────────────────────────────────

describe("getCaseBillingRiskAck", () => {
  it("fetches aggregate endpoint and extracts billingRiskAck from summary", async () => {
    const request = createRequestMock((input) => {
      expect(String(input)).toContain(
        "/api/cases/case-1/billing-tab-aggregate",
      );
      return jsonResponse({
        summary: {
          billingRiskAck: {
            acknowledged: true,
            acknowledgedAt: "2026-04-20T00:00:00Z",
            acknowledgedByDisplayName: "Manager",
            reasonCode: "customer_promise",
            reasonNote: "ok",
            evidenceUrl: null,
          },
        },
        plans: [],
        recentPayments: [],
      });
    });

    const result = await repo(request).getCaseBillingRiskAck("case-1");
    expect(result).not.toBeNull();
    expect(result!.acknowledged).toBe(true);
    expect(result!.acknowledgedAt).toBe("2026-04-20T00:00:00Z");
    expect(result!.acknowledgedByDisplayName).toBe("Manager");
    expect(result!.reasonCode).toBe("customer_promise");
  });

  it("returns unacknowledged status when billingRiskAck.acknowledged is false", async () => {
    const request = createRequestMock(() =>
      jsonResponse({
        summary: {
          billingRiskAck: {
            acknowledged: false,
            acknowledgedAt: null,
            acknowledgedByDisplayName: null,
            reasonCode: null,
            reasonNote: null,
            evidenceUrl: null,
          },
        },
        plans: [],
        recentPayments: [],
      }),
    );

    const result = await repo(request).getCaseBillingRiskAck("case-1");
    expect(result).not.toBeNull();
    expect(result!.acknowledged).toBe(false);
    expect(result!.acknowledgedAt).toBeNull();
  });

  it("throws when aggregate body has no valid billingRiskAck", async () => {
    const request = createRequestMock(() =>
      jsonResponse({
        summary: { billingRiskAck: null },
        plans: [],
        recentPayments: [],
      }),
    );

    await expect(
      repo(request).getCaseBillingRiskAck("case-1"),
    ).rejects.toThrow();
  });
});

// ─── error handling ─────────────────────────────────────────────

describe("error handling", () => {
  it("throws on non-200 response for getList", async () => {
    const request = createRequestMock(() =>
      jsonResponse({ message: "Not Found" }, { status: 404 }),
    );

    await expect(repo(request).getList()).rejects.toThrow();
  });

  it("throws on non-200 response for createPayment", async () => {
    const request = createRequestMock(() =>
      jsonResponse({ message: "Bad Request" }, { status: 400 }),
    );

    await expect(
      repo(request).createPayment({
        billingPlanId: "bp-1",
        amountReceived: 100,
        receivedAt: "2026-01-01",
      }),
    ).rejects.toThrow();
  });

  it("throws on network error for bulkCollect", async () => {
    const request = vi.fn().mockRejectedValue(new Error("Network error"));

    await expect(
      repo(request as unknown as typeof fetch).bulkCollect(["c1"]),
    ).rejects.toThrow();
  });
});

// ─── authorization header ───────────────────────────────────────

describe("authorization", () => {
  it("includes Bearer token in request header", async () => {
    const request = createRequestMock((_input, init) => {
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.["Authorization"]).toBe("Bearer test-token");
      return jsonResponse({ items: [], total: 0 });
    });

    await repo(request).getList();
  });
});
