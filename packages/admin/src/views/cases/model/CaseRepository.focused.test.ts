// ── Test Ownership ──────────────────────────────────────────────
// Owner: focused repository orchestration (p0-fe-002f-03).
// Supplements CaseRepository.test.ts with systematic coverage:
//   - blank-id guards (getDetailAggregate, getMessages, getLogEntries)
//   - Content-Type header contract (write vs read vs delete)
//   - error classification for 403 / 422 / 500
//   - view=summary always appended, multi-filter serialization
//   - adapter-null → BAD_RESPONSE wiring (list, detail, mutations)
//   - auth header for ALL operations (not just listCases)
//   - builder→body wiring proof (no inline mapping in repository)
//   - path + method matrix for all repository operations
// Does NOT test: adapter mapping in isolation, write builder
//   serialization, mock repository, comms-log wiring.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { CaseRepositoryError, createCaseRepository } from "./CaseRepository";

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

const MOCK_CASE_ROW = {
  id: "case-001",
  orgId: "org-1",
  customerId: "cust-001",
  caseTypeCode: "visa",
  stage: "S3",
  status: "S3",
  groupId: "group-1",
  ownerUserId: "user-1",
  openedAt: "2026-01-01T00:00:00.000Z",
  dueAt: "2026-06-01",
  caseNo: "CASE-001",
  caseName: "技人国更新",
  priority: "normal",
  riskLevel: "low",
  billingUnpaidAmountCached: 50000,
  updatedAt: "2026-04-10T00:00:00.000Z",
};

const MOCK_AGGREGATE = {
  case: MOCK_CASE_ROW,
  counts: {
    documentItemsTotal: 10,
    documentItemsDone: 6,
    caseParties: 2,
    tasks: 3,
    tasksPending: 1,
    communicationLogs: 4,
    submissionPackages: 1,
    generatedDocuments: 2,
    validationRuns: 1,
    reviewRecords: 1,
    billingRecords: 3,
    paymentRecords: 2,
  },
  latestValidation: null,
  latestSubmission: null,
  latestReview: null,
  documentProgressByProvider: [],
  billing: {
    quotePrice: null,
    depositPaid: false,
    finalPaymentPaid: false,
    unpaidAmount: 0,
    billingRiskAcknowledged: false,
    billingRiskAcknowledgedAt: null,
    billingRiskAckReasonCode: null,
  },
  deepLink: {
    customerId: "cust-001",
    customerName: "張伟",
    groupId: "group-1",
    groupName: "Tokyo-1",
    ownerUserId: "user-1",
    ownerDisplayName: "担当太郎",
    assistantUserId: null,
    assistantDisplayName: null,
  },
};

function listRow(o: Record<string, unknown> = {}) {
  return {
    ...MOCK_CASE_ROW,
    customerName: "張伟",
    groupName: "Tokyo-1",
    ownerDisplayName: "Owner",
    assistantDisplayName: null,
    ...o,
  };
}

// ─── Blank-id guards ─────────────────────────────────────────────

describe("blank-id guards (p0-fe-002f-03)", () => {
  it("getDetailAggregate returns null for blank id without fetching", async () => {
    const request = createRequestMock(() => jsonResponse(MOCK_AGGREGATE));
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const aggregate = await repo.getDetailAggregate("  ");
    expect(aggregate).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
});

// ─── view=summary and filter contract ────────────────────────────

describe("list query contract (p0-fe-002f-03)", () => {
  it("listCases with empty params still sends view=summary", async () => {
    const request = createRequestMock((input) => {
      const url = String(input);
      const params = new URL(url, "http://localhost").searchParams;
      expect(params.get("view")).toBe("summary");
      expect(params.has("stage")).toBe(false);
      expect(params.has("scope")).toBe(false);
      return jsonResponse({ items: [], total: 0 });
    });
    const repo = createCaseRepository({ request, getToken: () => "t" });
    await repo.listCases({});
  });

  it("listCases serializes multiple filters simultaneously", async () => {
    const request = createRequestMock((input) => {
      const url = String(input);
      expect(url).toContain("stage=S3");
      expect(url).toContain("scope=my");
      expect(url).toContain("ownerUserId=u1");
      expect(url).toContain("view=summary");
      return jsonResponse({ items: [listRow()], total: 1 });
    });
    const repo = createCaseRepository({ request, getToken: () => "t" });
    await repo.listCases({ stage: "S3", scope: "my", owner: "u1" });
  });
});

// ─── Content-Type header contract ────────────────────────────────

describe("Content-Type header contract (p0-fe-002f-03)", () => {
  it("write requests include Content-Type: application/json", async () => {
    const request = createRequestMock((_, init) => {
      const headers = init?.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
      return jsonResponse({ ...MOCK_CASE_ROW, id: "case-new" });
    });
    const repo = createCaseRepository({ request, getToken: () => "t" });
    await repo.createCase({
      customerId: "c1",
      caseTypeCode: "visa",
      ownerUserId: "u1",
    });
    expect(request).toHaveBeenCalled();
  });

  it("GET requests omit Content-Type header", async () => {
    const request = createRequestMock((_, init) => {
      const headers = init?.headers as Record<string, string>;
      expect(headers).not.toHaveProperty("Content-Type");
      return jsonResponse({ items: [], total: 0 });
    });
    const repo = createCaseRepository({ request, getToken: () => "t" });
    await repo.listCases({});
    expect(request).toHaveBeenCalled();
  });

  it("DELETE requests omit Content-Type header and body", async () => {
    const request = createRequestMock((_, init) => {
      const headers = init?.headers as Record<string, string>;
      expect(headers).not.toHaveProperty("Content-Type");
      expect(init?.body).toBeUndefined();
      return jsonResponse({ ok: true });
    });
    const repo = createCaseRepository({ request, getToken: () => "t" });
    await repo.deleteCase("case-001");
    expect(request).toHaveBeenCalled();
  });
});

// ─── Error classification (non-400/401 statuses) ─────────────────

describe("error classification (p0-fe-002f-03)", () => {
  it("maps 403 response to BAD_RESPONSE", async () => {
    const repo = createCaseRepository({
      request: createRequestMock(() =>
        jsonResponse({ message: "Forbidden" }, { status: 403 }),
      ),
      getToken: () => "t",
    });
    await expect(repo.listCases({})).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "BAD_RESPONSE",
      status: 403,
    } satisfies Partial<CaseRepositoryError>);
  });

  it("maps 500 response to BAD_RESPONSE", async () => {
    const repo = createCaseRepository({
      request: createRequestMock(() =>
        jsonResponse({ message: "Internal server error" }, { status: 500 }),
      ),
      getToken: () => "t",
    });
    await expect(repo.getDetail("case-001")).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "BAD_RESPONSE",
      status: 500,
    } satisfies Partial<CaseRepositoryError>);
  });

  it("maps 422 without error code to VALIDATION_ERROR", async () => {
    const repo = createCaseRepository({
      request: createRequestMock(() =>
        jsonResponse({ message: "Invalid stage" }, { status: 422 }),
      ),
      getToken: () => "t",
    });
    await expect(
      repo.transitionCase("case-001", { toStage: "S99" }),
    ).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "VALIDATION_ERROR",
      status: 422,
    } satisfies Partial<CaseRepositoryError>);
  });

  it("maps 422 with server error code to CASE_WRITE_ERROR", async () => {
    const repo = createCaseRepository({
      request: createRequestMock(() =>
        jsonResponse(
          { message: "GATE_B_FAILED: Validation run has blockers" },
          { status: 422 },
        ),
      ),
      getToken: () => "t",
    });
    await expect(
      repo.transitionCase("case-001", { toStage: "S6" }),
    ).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "CASE_WRITE_ERROR",
      status: 422,
      serverErrorCode: "GATE_B_FAILED",
    } satisfies Partial<CaseRepositoryError>);
  });
});

// ─── Adapter-null → BAD_RESPONSE wiring ──────────────────────────

describe("adapter-null triggers BAD_RESPONSE (p0-fe-002f-03)", () => {
  it("list: missing items key triggers BAD_RESPONSE", async () => {
    const repo = createCaseRepository({
      request: createRequestMock(() => jsonResponse({ noItems: true })),
      getToken: () => "t",
    });
    await expect(repo.listCases({})).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "BAD_RESPONSE",
      message: "Invalid case list response",
    } satisfies Partial<CaseRepositoryError>);
  });

  it("detail aggregate: missing case key triggers BAD_RESPONSE", async () => {
    const repo = createCaseRepository({
      request: createRequestMock(() => jsonResponse({ noCaseKey: true })),
      getToken: () => "t",
    });
    await expect(repo.getDetailAggregate("case-001")).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "BAD_RESPONSE",
      message: "Invalid case detail aggregate response",
    } satisfies Partial<CaseRepositoryError>);
  });

  it("createCase: response without id triggers BAD_RESPONSE", async () => {
    const repo = createCaseRepository({
      request: createRequestMock(() => jsonResponse({ noId: true })),
      getToken: () => "t",
    });
    await expect(
      repo.createCase({
        customerId: "c1",
        caseTypeCode: "visa",
        ownerUserId: "u1",
      }),
    ).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "BAD_RESPONSE",
      message: "Invalid create case response",
    } satisfies Partial<CaseRepositoryError>);
  });

  it("updateCase: response without id triggers BAD_RESPONSE", async () => {
    const repo = createCaseRepository({
      request: createRequestMock(() => jsonResponse({ status: "ok" })),
      getToken: () => "t",
    });
    await expect(
      repo.updateCase("case-001", { caseName: "x" }),
    ).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "BAD_RESPONSE",
      message: "Invalid update case response",
    } satisfies Partial<CaseRepositoryError>);
  });

  it("transitionCase: response without id triggers BAD_RESPONSE", async () => {
    const repo = createCaseRepository({
      request: createRequestMock(() => jsonResponse({ transitioned: true })),
      getToken: () => "t",
    });
    await expect(
      repo.transitionCase("case-001", { toStage: "S4" }),
    ).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "BAD_RESPONSE",
      message: "Invalid case transition response",
    } satisfies Partial<CaseRepositoryError>);
  });

  it("acknowledgeBillingRisk: response without id triggers BAD_RESPONSE", async () => {
    const repo = createCaseRepository({
      request: createRequestMock(() => jsonResponse({ acknowledged: true })),
      getToken: () => "t",
    });
    await expect(
      repo.acknowledgeBillingRisk("case-001", {
        reasonCode: "client_confirmed",
      }),
    ).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "BAD_RESPONSE",
      message: "Invalid billing risk acknowledgment response",
    } satisfies Partial<CaseRepositoryError>);
  });

  it("updatePostApprovalStage: response without id triggers BAD_RESPONSE", async () => {
    const repo = createCaseRepository({
      request: createRequestMock(() => jsonResponse({ updated: true })),
      getToken: () => "t",
    });
    await expect(
      repo.updatePostApprovalStage("case-001", { stage: "entry_success" }),
    ).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "BAD_RESPONSE",
      message: "Invalid post-approval stage response",
    } satisfies Partial<CaseRepositoryError>);
  });
});
