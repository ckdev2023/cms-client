import { describe, expect, it, vi } from "vitest";
import { createCaseRepository } from "./CaseRepository";
import type { CaseRepository } from "./CaseRepository";
import {
  buildBillingRiskAckPayload,
  buildCreateCasePayload,
  buildPostApprovalPayload,
  buildTransitionPayload,
  buildUpdateCasePayload,
  type CaseBillingRiskAckInput,
  type CaseCreateInput,
  type CasePostApprovalInput,
  type CaseTransitionInput,
  type CaseUpdateInput,
} from "./CaseAdapter";

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
    totalReceived: 0,
  },
  tasks: [],
  communicationLogs: [],
  caseParties: [],
  generatedDocuments: [],
  submissionPackages: [],
  validationRuns: [],
  reviewRecords: [],
  paymentRecords: [],
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

function mutationRow(id = "case-001") {
  return { ...MOCK_CASE_ROW, id };
}

describe("auth header for all operations (p0-fe-002f-03)", () => {
  const TOKEN = "focused-jwt-token";
  const AUTH_HEADER = `Bearer ${TOKEN}`;

  function expectAuthHeader(
    run: (repo: CaseRepository) => Promise<unknown>,
    responseBody: unknown = mutationRow(),
  ) {
    return async () => {
      const request = createRequestMock((_, init) => {
        const headers = init?.headers as Record<string, string>;
        expect(headers.Authorization).toBe(AUTH_HEADER);
        return jsonResponse(responseBody);
      });
      const repo = createCaseRepository({ request, getToken: () => TOKEN });
      await run(repo);
      expect(request).toHaveBeenCalled();
    };
  }

  it(
    "getDetailAggregate sends auth header",
    expectAuthHeader((r) => r.getDetailAggregate("case-001"), MOCK_AGGREGATE),
  );

  it(
    "createCase sends auth header",
    expectAuthHeader((r) =>
      r.createCase({
        customerId: "c1",
        caseTypeCode: "visa",
        ownerUserId: "u1",
      }),
    ),
  );

  it(
    "updateCase sends auth header",
    expectAuthHeader((r) => r.updateCase("case-001", { caseName: "x" })),
  );

  it(
    "transitionCase sends auth header",
    expectAuthHeader((r) => r.transitionCase("case-001", { toStage: "S4" })),
  );

  it(
    "acknowledgeBillingRisk sends auth header",
    expectAuthHeader((r) =>
      r.acknowledgeBillingRisk("case-001", { reasonCode: "client_confirmed" }),
    ),
  );

  it(
    "updatePostApprovalStage sends auth header",
    expectAuthHeader((r) =>
      r.updatePostApprovalStage("case-001", { stage: "entry_success" }),
    ),
  );

  it(
    "deleteCase sends auth header",
    expectAuthHeader((r) => r.deleteCase("case-001"), { ok: true }),
  );
});

describe("path and method matrix (p0-fe-002f-03)", () => {
  interface CallRecord {
    url: string;
    method: string;
  }

  function captureCall(
    run: (repo: CaseRepository) => Promise<unknown>,
    responseBody: unknown = mutationRow(),
  ): Promise<CallRecord> {
    return new Promise((resolve) => {
      const request = createRequestMock((input, init) => {
        resolve({ url: String(input), method: init?.method ?? "GET" });
        return jsonResponse(responseBody);
      });
      const repo = createCaseRepository({ request, getToken: () => "t" });
      run(repo);
    });
  }

  it("listCases → GET /api/cases?…", async () => {
    const call = await captureCall((r) => r.listCases({ stage: "S3" }), {
      items: [listRow()],
      total: 1,
    });
    expect(call.method).toBe("GET");
    expect(call.url).toMatch(/^\/api\/cases\?/);
    expect(call.url).toContain("stage=S3");
  });

  it("getDetailAggregate → GET /api/cases/:id/aggregate", async () => {
    const call = await captureCall(
      (r) => r.getDetailAggregate("case-001"),
      MOCK_AGGREGATE,
    );
    expect(call.method).toBe("GET");
    expect(call.url).toBe("/api/cases/case-001/aggregate");
  });

  it("createCase → POST /api/cases", async () => {
    const call = await captureCall((r) =>
      r.createCase({
        customerId: "c1",
        caseTypeCode: "visa",
        ownerUserId: "u1",
      }),
    );
    expect(call.method).toBe("POST");
    expect(call.url).toBe("/api/cases");
  });

  it("updateCase → PATCH /api/cases/:id", async () => {
    const call = await captureCall((r) =>
      r.updateCase("case-001", { caseName: "x" }),
    );
    expect(call.method).toBe("PATCH");
    expect(call.url).toBe("/api/cases/case-001");
  });

  it("transitionCase → POST /api/cases/:id/transition", async () => {
    const call = await captureCall((r) =>
      r.transitionCase("case-001", { toStage: "S4" }),
    );
    expect(call.method).toBe("POST");
    expect(call.url).toBe("/api/cases/case-001/transition");
  });

  it("acknowledgeBillingRisk → POST /api/cases/:id/billing-risk-ack", async () => {
    const call = await captureCall((r) =>
      r.acknowledgeBillingRisk("case-001", { reasonCode: "client_confirmed" }),
    );
    expect(call.method).toBe("POST");
    expect(call.url).toBe("/api/cases/case-001/billing-risk-ack");
  });

  it("updatePostApprovalStage → POST /api/cases/:id/post-approval-stage", async () => {
    const call = await captureCall((r) =>
      r.updatePostApprovalStage("case-001", { stage: "entry_success" }),
    );
    expect(call.method).toBe("POST");
    expect(call.url).toBe("/api/cases/case-001/post-approval-stage");
  });

  it("deleteCase → DELETE /api/cases/:id", async () => {
    const call = await captureCall((r) => r.deleteCase("case-001"), {
      ok: true,
    });
    expect(call.method).toBe("DELETE");
    expect(call.url).toBe("/api/cases/case-001");
  });

  it("getDetailAggregate encodes special characters in id", async () => {
    const call = await captureCall(
      (r) => r.getDetailAggregate("case/special&id"),
      MOCK_AGGREGATE,
    );
    expect(call.url).toBe("/api/cases/case%2Fspecial%26id/aggregate");
  });
});

describe("builder→body wiring proof (p0-fe-002f-03)", () => {
  function captureBody(
    run: (repo: CaseRepository) => Promise<unknown>,
  ): Promise<unknown> {
    return new Promise((resolve) => {
      const request = createRequestMock((_, init) => {
        resolve(init?.body ? JSON.parse(init.body as string) : undefined);
        return jsonResponse(mutationRow());
      });
      const repo = createCaseRepository({ request, getToken: () => "t" });
      run(repo);
    });
  }

  it("createCase body matches buildCreateCasePayload output", async () => {
    const input: CaseCreateInput = {
      customerId: "c1",
      caseTypeCode: "visa",
      ownerUserId: "u1",
      groupId: "g1",
      crossGroupReason: "transferred",
      dueAt: "2026-12-31",
      caseName: "  テスト案件  ",
    };
    const body = await captureBody((r) => r.createCase(input));
    expect(body).toEqual(buildCreateCasePayload(input));
  });

  it("updateCase body matches buildUpdateCasePayload output", async () => {
    const input: CaseUpdateInput = {
      caseName: "Updated",
      groupId: "g-new",
      groupTransferReason: "reassigned",
      dueAt: null,
    };
    const body = await captureBody((r) => r.updateCase("case-001", input));
    expect(body).toEqual(buildUpdateCasePayload(input));
  });

  it("transitionCase body matches buildTransitionPayload output", async () => {
    const input: CaseTransitionInput = {
      toStage: "S9",
      closeReason: "completed",
    };
    const body = await captureBody((r) => r.transitionCase("case-001", input));
    expect(body).toEqual(buildTransitionPayload(input));
  });

  it("acknowledgeBillingRisk body matches buildBillingRiskAckPayload output", async () => {
    const input: CaseBillingRiskAckInput = {
      reasonCode: "client_confirmed",
      reasonNote: "phone call",
      evidenceUrl: "https://example.com/proof.pdf",
    };
    const body = await captureBody((r) =>
      r.acknowledgeBillingRisk("case-001", input),
    );
    expect(body).toEqual(buildBillingRiskAckPayload(input));
  });

  it("updatePostApprovalStage body matches buildPostApprovalPayload output", async () => {
    const input: CasePostApprovalInput = { stage: "coe_sent" };
    const body = await captureBody((r) =>
      r.updatePostApprovalStage("case-001", input),
    );
    expect(body).toEqual(buildPostApprovalPayload(input));
  });

  it("deleteCase sends no body", async () => {
    const body = await captureBody((r) => r.deleteCase("case-001"));
    expect(body).toBeUndefined();
  });
});
