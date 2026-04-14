import { mapServerCaseToSummary, mapServerCaseToDetail } from "./CaseApi";

function stubServerCase(overrides?: Record<string, unknown>) {
  return {
    id: "c1",
    orgId: "org1",
    customerId: "cust1",
    caseTypeCode: "家族滞在",
    status: "S3",
    stage: "S3",
    ownerUserId: "user1",
    openedAt: "2026-04-01T00:00:00.000Z",
    dueAt: "2026-06-01",
    metadata: {},
    caseNo: "CASE-001",
    caseName: "テストケース",
    caseSubtype: null,
    applicationType: "recognition",
    companyId: null,
    priority: "normal",
    riskLevel: "low",
    assistantUserId: "assist1",
    sourceChannel: "web",
    signedAt: "2026-04-02",
    acceptedAt: "2026-04-03",
    submissionDate: null,
    resultDate: null,
    residenceExpiryDate: null,
    archivedAt: null,
    resultOutcome: null,
    quotePrice: 300000,
    depositPaidCached: true,
    finalPaymentPaidCached: false,
    billingUnpaidAmountCached: 150000,
    billingRiskAcknowledgedBy: null,
    billingRiskAcknowledgedAt: null,
    billingRiskAckReasonCode: null,
    billingRiskAckReasonNote: null,
    billingRiskAckEvidenceUrl: null,
    postApprovalStage: null,
    overseasVisaStartAt: null,
    entryConfirmedAt: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-05T00:00:00.000Z",
    ...overrides,
  };
}

describe("mapServerCaseToSummary", () => {
  it("renames server fields to domain fields", () => {
    const raw = stubServerCase();
    const summary = mapServerCaseToSummary(raw);

    expect(summary.stage).toBe("S3");
    expect(summary.principalUserId).toBe("user1");
    expect(summary.caseType).toBe("家族滞在");
    expect(summary.nextDeadlineDueAt).toBe("2026-06-01");
  });

  it("maps all P0 summary fields", () => {
    const raw = stubServerCase();
    const summary = mapServerCaseToSummary(raw);

    expect(summary).toEqual({
      id: "c1",
      caseNo: "CASE-001",
      caseName: "テストケース",
      caseType: "家族滞在",
      applicationType: "recognition",
      stage: "S3",
      priority: "normal",
      riskLevel: "low",
      customerId: "cust1",
      principalUserId: "user1",
      resultOutcome: null,
      nextDeadlineDueAt: "2026-06-01",
      billingUnpaidAmountCached: 150000,
      depositPaidCached: true,
      finalPaymentPaidCached: false,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-05T00:00:00.000Z",
    });
  });

  it("defaults caseNo to empty string when server returns null", () => {
    const raw = stubServerCase({ caseNo: null });
    const summary = mapServerCaseToSummary(raw);
    expect(summary.caseNo).toBe("");
  });

  it.each(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9"] as const)(
    "maps stage %s from server status",
    (stage) => {
      const raw = stubServerCase({ status: stage });
      expect(mapServerCaseToSummary(raw).stage).toBe(stage);
    },
  );

  it("maps resultOutcome values", () => {
    for (const outcome of ["approved", "rejected", "withdrawn"] as const) {
      const raw = stubServerCase({ resultOutcome: outcome });
      expect(mapServerCaseToSummary(raw).resultOutcome).toBe(outcome);
    }
  });
});

describe("mapServerCaseToDetail", () => {
  it("includes all summary fields plus detail-only fields", () => {
    const raw = stubServerCase();
    const detail = mapServerCaseToDetail(raw, [], []);

    expect(detail.stage).toBe("S3");
    expect(detail.principalUserId).toBe("user1");
    expect(detail.primaryAssistantUserId).toBe("assist1");
    expect(detail.sourceChannel).toBe("web");
    expect(detail.signedAt).toBe("2026-04-02");
    expect(detail.acceptedAt).toBe("2026-04-03");
    expect(detail.quotePrice).toBe(300000);
  });

  it("extracts postApprovalStage from metadata", () => {
    const raw = stubServerCase({
      metadata: { post_approval_stage: "coe_sent" },
    });
    const detail = mapServerCaseToDetail(raw, [], []);
    expect(detail.postApprovalStage).toBe("coe_sent");
  });

  it("prefers formal postApprovalStage over metadata", () => {
    const raw = stubServerCase({
      postApprovalStage: "entry_success",
      metadata: { post_approval_stage: "coe_sent" },
    });
    expect(mapServerCaseToDetail(raw, [], []).postApprovalStage).toBe(
      "entry_success",
    );
  });

  it("falls back to metadata when formal postApprovalStage is none", () => {
    const raw = stubServerCase({
      postApprovalStage: "none",
      metadata: { post_approval_stage: "overseas_visa_applying" },
    });
    expect(mapServerCaseToDetail(raw, [], []).postApprovalStage).toBe(
      "overseas_visa_applying",
    );
  });

  it("defaults postApprovalStage to null when metadata is empty", () => {
    const raw = stubServerCase({ metadata: {} });
    const detail = mapServerCaseToDetail(raw, [], []);
    expect(detail.postApprovalStage).toBeNull();
  });

  it.each([
    "waiting_final_payment",
    "coe_sent",
    "overseas_visa_applying",
    "entry_success",
  ] as const)(
    "maps postApprovalStage=%s from metadata",
    (postApprovalStage) => {
      const raw = stubServerCase({
        metadata: { post_approval_stage: postApprovalStage },
      });
      expect(mapServerCaseToDetail(raw, [], []).postApprovalStage).toBe(
        postApprovalStage,
      );
    },
  );

  it("maps billing risk acknowledgement fields", () => {
    const raw = stubServerCase({
      billingRiskAcknowledgedBy: "admin1",
      billingRiskAcknowledgedAt: "2026-04-10T10:00:00.000Z",
      billingRiskAckReasonCode: "client_promise",
      billingRiskAckReasonNote: "口頭確認済み",
      billingRiskAckEvidenceUrl: "https://example.com/evidence.pdf",
    });
    const detail = mapServerCaseToDetail(raw, [], []);

    expect(detail.billingRiskAcknowledgedBy).toBe("admin1");
    expect(detail.billingRiskAcknowledgedAt).toBe("2026-04-10T10:00:00.000Z");
    expect(detail.billingRiskAckReasonCode).toBe("client_promise");
    expect(detail.billingRiskAckReasonNote).toBe("口頭確認済み");
    expect(detail.billingRiskAckEvidenceUrl).toBe(
      "https://example.com/evidence.pdf",
    );
  });

  it("maps overseas visa / entry timestamps", () => {
    const raw = stubServerCase({
      overseasVisaStartAt: "2026-05-01",
      entryConfirmedAt: "2026-06-15",
    });
    const detail = mapServerCaseToDetail(raw, [], []);

    expect(detail.overseasVisaStartAt).toBe("2026-05-01");
    expect(detail.entryConfirmedAt).toBe("2026-06-15");
  });

  it("passes through documents and timeline", () => {
    const docs = [
      {
        id: "d1",
        name: "パスポート",
        status: "approved" as const,
        requiredFlag: true,
        providedByRole: null,
      },
      {
        id: "d2",
        name: "在留カード",
        status: "waiting_upload" as const,
        requiredFlag: true,
        providedByRole: "client",
      },
    ];
    const timeline = [
      { id: "t1", action: "created", createdAt: "2026-04-01" },
      { id: "t2", action: "stage_changed", createdAt: "2026-04-02" },
    ];
    const raw = stubServerCase();
    const detail = mapServerCaseToDetail(raw, docs, timeline);

    expect(detail.documents).toHaveLength(2);
    expect(detail.documents[0]?.status).toBe("approved");
    expect(detail.documents[1]?.status).toBe("waiting_upload");
    expect(detail.timeline).toHaveLength(2);
    expect(detail.timeline[1]?.action).toBe("stage_changed");
  });

  it("handles null metadata gracefully", () => {
    const raw = stubServerCase({ metadata: null });
    const detail = mapServerCaseToDetail(raw, [], []);
    expect(detail.postApprovalStage).toBeNull();
  });
});
