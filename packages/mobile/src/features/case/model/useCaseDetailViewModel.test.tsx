import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { AppContainerProvider } from "@app/container/AppContainerContext";
import type { AppContainer } from "@app/container/AppContainer";
import type { CaseRepository } from "@domain/case/CaseRepository";
import type { CaseSummary, CaseDetail } from "@domain/case/Case";
import type { HttpClient } from "@infra/http/HttpClient";
import type { Logger } from "@infra/log/Logger";
import type { KVStorage } from "@infra/storage/KVStorage";
import { AppError } from "@shared/errors/AppError";

import { useCaseDetailViewModel } from "./useCaseDetailViewModel";

class NoopLogger implements Logger {
  info() {}
  warn() {}
  error() {}
}

class NoopStorage implements KVStorage {
  async getString() {
    return null;
  }
  async setString() {}
  async delete() {}
}

function stubSummary(overrides?: Partial<CaseSummary>): CaseSummary {
  return {
    id: "c1",
    caseNo: "CASE-001",
    caseName: null,
    caseType: "家族滞在",
    applicationType: "recognition",
    stage: "S2",
    priority: null,
    riskLevel: null,
    customerId: "cust1",
    principalUserId: "user1",
    resultOutcome: null,
    nextDeadlineDueAt: "2026-05-01",
    billingUnpaidAmountCached: null,
    depositPaidCached: false,
    finalPaymentPaidCached: false,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function stubDetail(overrides?: Partial<CaseDetail>): CaseDetail {
  return {
    ...stubSummary(),
    sourceLeadId: null,
    groupId: "g1",
    primaryAssistantUserId: null,
    sourceChannel: null,
    signedAt: null,
    acceptedAt: null,
    dueAt: null,
    quotePrice: null,
    submissionDate: null,
    resultDate: null,
    residenceExpiryDate: null,
    employerName: null,
    closeReason: null,
    archiveReason: null,
    archivedAt: null,
    nextAction: null,
    nextActionDueAt: null,
    hasBlockingIssueFlag: false,
    postApprovalStage: null,
    overseasVisaStartAt: null,
    entryConfirmedAt: null,
    billingRiskAcknowledgedBy: null,
    billingRiskAcknowledgedAt: null,
    billingRiskAckReasonCode: null,
    billingRiskAckReasonNote: null,
    billingRiskAckEvidenceUrl: null,
    documents: [
      {
        id: "d1",
        name: "パスポート",
        status: "waiting_upload",
        requiredFlag: true,
        providedByRole: null,
      },
    ],
    timeline: [{ id: "t1", action: "created", createdAt: "2026-04-01" }],
    ...overrides,
  };
}

function createTestContainer(caseRepository: CaseRepository): AppContainer {
  return {
    logger: new NoopLogger(),
    httpClient: {} as unknown as HttpClient,
    storage: new NoopStorage(),
    homeRepository: {
      getSampleTodo: async () => ({ id: 1, title: "", completed: false }),
    },
    authRepository: {} as never,
    caseRepository,
    inboxRepository: {} as never,
    documentRepository: {} as never,
    profileRepository: {} as never,
  };
}

function makeWrapper(caseRepository: CaseRepository) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AppContainerProvider value={createTestContainer(caseRepository)}>
        {children}
      </AppContainerProvider>
    );
  };
}

test("load case detail success", async () => {
  const detail = stubDetail();
  const caseRepo: CaseRepository = {
    async listMyCases() {
      return [];
    },
    async getCaseDetail() {
      return detail;
    },
  };

  const { result } = renderHook(() => useCaseDetailViewModel("c1"), {
    wrapper: makeWrapper(caseRepo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("success");
  });

  if (result.current.state.status === "success") {
    expect(result.current.state.caseDetail.id).toBe("c1");
    expect(result.current.state.caseDetail.documents).toHaveLength(1);
    expect(result.current.state.caseDetail.timeline).toHaveLength(1);
  }
});

test("exposes post-approval stage and COE timestamps", async () => {
  const detail = stubDetail({
    stage: "S8",
    resultOutcome: "approved",
    postApprovalStage: "overseas_visa_applying",
    overseasVisaStartAt: "2026-05-01",
    entryConfirmedAt: null,
  });
  const caseRepo: CaseRepository = {
    async listMyCases() {
      return [];
    },
    async getCaseDetail() {
      return detail;
    },
  };

  const { result } = renderHook(() => useCaseDetailViewModel("c1"), {
    wrapper: makeWrapper(caseRepo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("success");
  });

  if (result.current.state.status === "success") {
    expect(result.current.state.caseDetail.postApprovalStage).toBe(
      "overseas_visa_applying",
    );
    expect(result.current.state.caseDetail.overseasVisaStartAt).toBe(
      "2026-05-01",
    );
    expect(result.current.state.caseDetail.entryConfirmedAt).toBeNull();
  }
});

test("exposes billing risk acknowledgement fields", async () => {
  const detail = stubDetail({
    billingRiskAcknowledgedBy: "admin1",
    billingRiskAcknowledgedAt: "2026-04-10T10:00:00.000Z",
    billingRiskAckReasonCode: "client_promise",
    billingRiskAckReasonNote: "口頭確認済み",
    billingRiskAckEvidenceUrl: "https://example.com/evidence.pdf",
    billingUnpaidAmountCached: 50000,
  });
  const caseRepo: CaseRepository = {
    async listMyCases() {
      return [];
    },
    async getCaseDetail() {
      return detail;
    },
  };

  const { result } = renderHook(() => useCaseDetailViewModel("c1"), {
    wrapper: makeWrapper(caseRepo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("success");
  });

  if (result.current.state.status === "success") {
    const cd = result.current.state.caseDetail;
    expect(cd.billingRiskAcknowledgedBy).toBe("admin1");
    expect(cd.billingRiskAcknowledgedAt).toBe("2026-04-10T10:00:00.000Z");
    expect(cd.billingRiskAckReasonCode).toBe("client_promise");
    expect(cd.billingRiskAckReasonNote).toBe("口頭確認済み");
    expect(cd.billingRiskAckEvidenceUrl).toBe(
      "https://example.com/evidence.pdf",
    );
    expect(cd.billingUnpaidAmountCached).toBe(50000);
  }
});

test("exposes documents with P0 statuses", async () => {
  const detail = stubDetail({
    documents: [
      {
        id: "d1",
        name: "パスポート",
        status: "approved",
        requiredFlag: true,
        providedByRole: null,
      },
      {
        id: "d2",
        name: "在留カード",
        status: "revision_required",
        requiredFlag: true,
        providedByRole: "client",
      },
      {
        id: "d3",
        name: "住民票",
        status: "waived",
        requiredFlag: false,
        providedByRole: null,
      },
    ],
  });
  const caseRepo: CaseRepository = {
    async listMyCases() {
      return [];
    },
    async getCaseDetail() {
      return detail;
    },
  };

  const { result } = renderHook(() => useCaseDetailViewModel("c1"), {
    wrapper: makeWrapper(caseRepo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("success");
  });

  if (result.current.state.status === "success") {
    const docs = result.current.state.caseDetail.documents;
    expect(docs).toHaveLength(3);
    expect(docs.map((d) => d.status)).toEqual([
      "approved",
      "revision_required",
      "waived",
    ]);
  }
});

test("load case detail error", async () => {
  const caseRepo: CaseRepository = {
    async listMyCases() {
      return [];
    },
    async getCaseDetail() {
      throw new AppError({ code: "NOT_FOUND", message: "not found" });
    },
  };

  const { result } = renderHook(() => useCaseDetailViewModel("c1"), {
    wrapper: makeWrapper(caseRepo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("error");
  });

  if (result.current.state.status === "error") {
    expect(result.current.state.error.code).toBe("NOT_FOUND");
  }
});
