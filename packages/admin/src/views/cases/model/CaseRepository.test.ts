// Test Ownership: real HTTP repository orchestration (fetch, auth, error, wiring). Not tested: adapter mapping, write builder serialization, mock repository.
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

const MOCK_DEEP_LINK = {
  customerId: "cust-001",
  customerName: "张伟",
  groupId: "group-1",
  groupName: "Tokyo-1",
  ownerUserId: "user-1",
  ownerDisplayName: "担当太郎",
  assistantUserId: null,
  assistantDisplayName: null,
};
const MOCK_COUNTS = {
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
};
const MOCK_BILLING = {
  quotePrice: 300000,
  depositPaid: true,
  finalPaymentPaid: false,
  unpaidAmount: 50000,
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAckReasonCode: null,
};
const MOCK_VALIDATION = {
  id: "vr-1",
  status: "passed",
  executedAt: "2026-04-01T00:00:00.000Z",
  blockingCount: 0,
  warningCount: 1,
};
const MOCK_AGGREGATE = {
  case: MOCK_CASE_ROW,
  counts: MOCK_COUNTS,
  latestValidation: MOCK_VALIDATION,
  latestSubmission: null,
  latestReview: null,
  documentProgressByProvider: [
    { providerRole: "applicant", total: 5, done: 3 },
  ],
  billing: MOCK_BILLING,
  deepLink: MOCK_DEEP_LINK,
};
function emptyCounts() {
  return Object.fromEntries(Object.keys(MOCK_COUNTS).map((k) => [k, 0]));
}
function emptyBilling() {
  return {
    quotePrice: null,
    depositPaid: false,
    finalPaymentPaid: false,
    unpaidAmount: 0,
    billingRiskAcknowledged: false,
    billingRiskAcknowledgedAt: null,
    billingRiskAckReasonCode: null,
  };
}
function listRow(o: Record<string, unknown> = {}) {
  return {
    ...MOCK_CASE_ROW,
    customerName: "张伟",
    groupName: "Tokyo-1",
    ownerDisplayName: "Owner",
    assistantDisplayName: null,
    ...o,
  };
}

describe("CaseRepository", () => {
  it("lists cases with auth header and query params", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toContain("/api/cases?");
      expect(String(input)).toContain("stage=S3");
      expect(String(input)).toContain("view=summary");
      expect(init?.method).toBe("GET");
      expect(init?.headers).toEqual({
        Accept: "application/json",
        Authorization: "Bearer token-1",
      });
      return jsonResponse({ items: [listRow()], total: 1, page: 1, limit: 50 });
    });
    const repo = createCaseRepository({ request, getToken: () => "token-1" });
    const result = await repo.listCases({ stage: "S3" });
    expect(result.total).toBe(1);
    expect(result.items[0]?.id).toBe("case-001");
    expect(result.items[0]?.name).toBe("技人国更新");
    expect(result.items[0]?.stageId).toBe("S3");
    expect(result.items[0]?.unpaidAmount).toBe(50000);
  });

  it("lists cases with customerId filter", async () => {
    const request = createRequestMock((input) => {
      expect(String(input)).toContain("customerId=cust-001");
      return jsonResponse({ items: [listRow({ groupName: null })], total: 1 });
    });
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.listCases({ customerId: "cust-001" });
    expect(result.items).toHaveLength(1);
  });

  it("gets case detail aggregate via /aggregate endpoint", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/cases/case-001/aggregate");
      expect(init?.method).toBe("GET");

      return jsonResponse(MOCK_AGGREGATE);
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const aggregate = await repo.getDetailAggregate("case-001");

    expect(aggregate).not.toBeNull();
    expect(aggregate!.detail.id).toBe("case-001");
    expect(aggregate!.detail.title).toBe("技人国更新");
    expect(aggregate!.detail.stageCode).toBe("S3");
    expect(aggregate!.detail.progressPercent).toBe(60);
    expect(aggregate!.detail.progressCount).toBe("6/10");
    expect(aggregate!.customerName).toBe("张伟");
    expect(aggregate!.ownerDisplayName).toBe("担当太郎");
    expect(aggregate!.detail.providerProgress).toEqual([
      { label: "applicant", done: 3, total: 5 },
    ]);
  });

  it("getDetail returns detail from aggregate", async () => {
    const request = createRequestMock(() =>
      jsonResponse({
        case: MOCK_CASE_ROW,
        counts: emptyCounts(),
        latestValidation: null,
        latestSubmission: null,
        latestReview: null,
        documentProgressByProvider: [],
        billing: emptyBilling(),
        deepLink: {
          ...MOCK_DEEP_LINK,
          customerName: "Test",
          groupId: null,
          groupName: null,
          ownerUserId: "u1",
          ownerDisplayName: "Owner",
        },
      }),
    );

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const detail = await repo.getDetail("case-001");
    expect(detail).not.toBeNull();
    expect(detail!.id).toBe("case-001");
  });

  it("getDetail returns null for empty id", async () => {
    const request = createRequestMock(() => jsonResponse(null));
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const detail = await repo.getDetail("  ");
    expect(detail).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it("creates case with payload and returns id", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/cases");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init?.body as string);
      expect(body.customerId).toBe("cust-001");
      expect(body.caseTypeCode).toBe("visa");
      expect(body.ownerUserId).toBe("u1");
      expect(body.groupId).toBe("group-1");
      expect(body.crossGroupReason).toBe("transferred");
      return jsonResponse({ ...MOCK_CASE_ROW, id: "case-new" });
    });
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.createCase({
      customerId: "cust-001",
      caseTypeCode: "visa",
      ownerUserId: "u1",
      groupId: "group-1",
      crossGroupReason: "transferred",
    });
    expect(result.id).toBe("case-new");
  });

  it("updates case with payload", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/cases/case-001");
      expect(init?.method).toBe("PATCH");
      const body = JSON.parse(init?.body as string);
      expect(body.caseName).toBe("Updated Name");
      expect(body.groupId).toBe("g-new");
      expect(body.groupTransferReason).toBe("reassigned");
      return jsonResponse({ ...MOCK_CASE_ROW, id: "case-001" });
    });
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.updateCase("case-001", {
      caseName: "Updated Name",
      groupId: "g-new",
      groupTransferReason: "reassigned",
    });
    expect(result.id).toBe("case-001");
  });

  it("transitions case with toStage and closeReason", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/cases/case-001/transition");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init?.body as string);
      expect(body.toStage).toBe("S9");
      expect(body.closeReason).toBe("completed");

      return jsonResponse({ ...MOCK_CASE_ROW, id: "case-001", stage: "S9" });
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.transitionCase("case-001", {
      toStage: "S9",
      closeReason: "completed",
    });
    expect(result.id).toBe("case-001");
  });

  it("acknowledges billing risk", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/cases/case-001/billing-risk-ack");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init?.body as string);
      expect(body.reasonCode).toBe("client_confirmed");

      return jsonResponse({ ...MOCK_CASE_ROW, id: "case-001" });
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.acknowledgeBillingRisk("case-001", {
      reasonCode: "client_confirmed",
      reasonNote: "phone call",
    });
    expect(result.id).toBe("case-001");
  });

  it("updates post-approval stage", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/cases/case-001/post-approval-stage");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init?.body as string);
      expect(body.stage).toBe("entry_success");

      return jsonResponse({ ...MOCK_CASE_ROW, id: "case-001" });
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.updatePostApprovalStage("case-001", {
      stage: "entry_success",
    });
    expect(result.id).toBe("case-001");
  });

  it("deletes case", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/cases/case-001");
      expect(init?.method).toBe("DELETE");
      return jsonResponse({ ok: true });
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    await expect(repo.deleteCase("case-001")).resolves.toBeUndefined();
  });

  it("computes summary cards from list items", () => {
    const base = {
      type: "visa",
      applicant: "X",
      groupId: "g",
      groupLabel: "G",
      ownerId: "o",
      completionLabel: "",
      validationLabel: "",
      updatedAtLabel: "",
      dueDate: "",
      dueDateLabel: "",
      riskStatus: "normal" as const,
      riskLabel: "",
      businessPhase: "CONSULTING",
      visibleScopes: ["all" as const],
    };
    const repo = createCaseRepository({});
    const cards = repo.getSummaryCards([
      {
        ...base,
        id: "c1",
        name: "A",
        stageId: "S3",
        stageLabel: "S3",
        completionPercent: 50,
        validationStatus: "failed",
        blockerCount: 1,
        unpaidAmount: 100000,
      },
      {
        ...base,
        id: "c2",
        name: "B",
        applicant: "Y",
        stageId: "S9",
        stageLabel: "S9",
        completionPercent: 100,
        validationStatus: "passed",
        blockerCount: 0,
        unpaidAmount: 0,
      },
    ]);

    expect(cards).toHaveLength(4);
    const activeCard = cards.find((c) => c.key === "activeCases");
    expect(activeCard?.value).toBe(1);
    const unpaidCard = cards.find((c) => c.key === "unpaidTotal");
    expect(unpaidCard?.value).toBe(100000);
    const failedCard = cards.find((c) => c.key === "failedValidations");
    expect(failedCard?.value).toBe(1);
  });

  it("maps 401 response to UNAUTHORIZED error", async () => {
    const repo = createCaseRepository({
      request: createRequestMock(() =>
        jsonResponse({ message: "Token expired" }, { status: 401 }),
      ),
      getToken: () => "expired-token",
    });

    await expect(repo.listCases({})).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "UNAUTHORIZED",
      status: 401,
    } satisfies Partial<CaseRepositoryError>);
  });

  it("maps 400 response to VALIDATION_ERROR", async () => {
    const repo = createCaseRepository({
      request: createRequestMock(() =>
        jsonResponse({ message: "customerId is required" }, { status: 400 }),
      ),
      getToken: () => "t",
    });

    await expect(
      repo.createCase({
        customerId: "",
        caseTypeCode: "visa",
        ownerUserId: "u",
      }),
    ).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "VALIDATION_ERROR",
      status: 400,
      message: "customerId is required",
    } satisfies Partial<CaseRepositoryError>);
  });

  it("maps 400 response with server error code to CASE_WRITE_ERROR", async () => {
    const repo = createCaseRepository({
      request: createRequestMock(() =>
        jsonResponse(
          {
            message: "CASE_S9_READONLY: Case is archived (S9) and read-only",
          },
          { status: 400 },
        ),
      ),
      getToken: () => "t",
    });

    await expect(
      repo.updateCase("case-001", { caseName: "x" }),
    ).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "CASE_WRITE_ERROR",
      status: 400,
      serverErrorCode: "CASE_S9_READONLY",
    } satisfies Partial<CaseRepositoryError>);
  });

  it("maps network failure to NETWORK error", async () => {
    const repo = createCaseRepository({
      request: createRequestMock(() => {
        throw new Error("Connection refused");
      }),
      getToken: () => "t",
    });

    await expect(repo.listCases({})).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "NETWORK",
    } satisfies Partial<CaseRepositoryError>);
  });

  it("maps invalid response body to BAD_RESPONSE error", async () => {
    const repo = createCaseRepository({
      request: createRequestMock(() => jsonResponse("not-an-object")),
      getToken: () => "t",
    });

    await expect(repo.listCases({})).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "BAD_RESPONSE",
    } satisfies Partial<CaseRepositoryError>);
  });

  it("sends auth header when token is available", async () => {
    const request = createRequestMock((_, init) => {
      expect(init?.headers).toEqual(
        expect.objectContaining({
          Authorization: "Bearer my-jwt",
        }),
      );
      return jsonResponse({ items: [], total: 0 });
    });

    const repo = createCaseRepository({
      request,
      getToken: () => "my-jwt",
    });
    await repo.listCases({});
    expect(request).toHaveBeenCalled();
  });

  it("omits auth header when no token", async () => {
    const request = createRequestMock((_, init) => {
      const headers = init?.headers as Record<string, string>;
      expect(headers).not.toHaveProperty("Authorization");
      return jsonResponse({ items: [], total: 0 });
    });

    const repo = createCaseRepository({
      request,
      getToken: () => null,
    });
    await repo.listCases({});
    expect(request).toHaveBeenCalled();
  });

  it("uses custom apiPath when provided", async () => {
    const request = createRequestMock((input) => {
      expect(String(input)).toContain("/custom/cases?");
      return jsonResponse({ items: [], total: 0 });
    });

    const repo = createCaseRepository({
      request,
      getToken: () => "t",
      apiPath: "/custom/cases",
    });
    await repo.listCases({});
  });
});
