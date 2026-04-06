import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { AppContainerProvider } from "@app/container/AppContainerContext";
import type { AppContainer } from "@app/container/AppContainer";
import type { CaseRepository } from "@domain/case/CaseRepository";
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
  const detail = {
    id: "c1",
    caseTypeCode: "visa",
    status: "in_progress",
    dueAt: "2026-05-01",
    documents: [{ id: "d1", name: "Passport", status: "pending" }],
    timeline: [{ id: "t1", action: "created", createdAt: "2026-04-01" }],
  };
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
