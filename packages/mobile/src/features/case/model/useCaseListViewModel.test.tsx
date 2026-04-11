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

import { useCaseListViewModel } from "./useCaseListViewModel";

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
    stage: "S1",
    priority: null,
    riskLevel: null,
    customerId: "cust1",
    principalUserId: "user1",
    resultOutcome: null,
    nextDeadlineDueAt: null,
    billingUnpaidAmountCached: null,
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
    employerName: null,
    closeReason: null,
    archiveReason: null,
    archivedAt: null,
    nextAction: null,
    nextActionDueAt: null,
    hasBlockingIssueFlag: false,
    documents: [],
    timeline: [],
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

test("load cases success", async () => {
  const caseRepo: CaseRepository = {
    async listMyCases() {
      return [stubSummary()];
    },
    async getCaseDetail() {
      return stubDetail();
    },
  };

  const { result } = renderHook(() => useCaseListViewModel(), {
    wrapper: makeWrapper(caseRepo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("success");
  });

  if (result.current.state.status === "success") {
    expect(result.current.state.cases).toHaveLength(1);
    expect(result.current.state.cases[0]?.id).toBe("c1");
  }
});

test("load cases error", async () => {
  const caseRepo: CaseRepository = {
    async listMyCases() {
      throw new AppError({ code: "NETWORK", message: "fail" });
    },
    async getCaseDetail() {
      return stubDetail();
    },
  };

  const { result } = renderHook(() => useCaseListViewModel(), {
    wrapper: makeWrapper(caseRepo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("error");
  });

  if (result.current.state.status === "error") {
    expect(result.current.state.error.code).toBe("NETWORK");
  }
});
