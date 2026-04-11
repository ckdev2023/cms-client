import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { AppContainerProvider } from "@app/container/AppContainerContext";
import type { AppContainer } from "@app/container/AppContainer";
import type { DocumentRepository } from "@domain/documents/DocumentRepository";
import type { DocumentRequirement } from "@domain/documents/UserDocument";
import type { HttpClient } from "@infra/http/HttpClient";
import type { Logger } from "@infra/log/Logger";
import type { KVStorage } from "@infra/storage/KVStorage";
import { AppError } from "@shared/errors/AppError";

import { useDocumentListViewModel } from "./useDocumentListViewModel";

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

function stubRequirement(
  overrides?: Partial<DocumentRequirement>,
): DocumentRequirement {
  return {
    id: "req-1",
    caseId: "case-1",
    category: "客户資料",
    itemName: "パスポート",
    itemCode: "passport",
    requiredFlag: true,
    providedByRole: null,
    assigneeUserId: null,
    dueDate: null,
    status: "waiting_upload",
    clientVisibleFlag: true,
    clientActionRequired: true,
    latestVersionId: null,
    reviewCommentLatest: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function stubRepo(
  requirements: DocumentRequirement[] = [],
): DocumentRepository {
  return {
    async listRequirements() {
      return requirements;
    },
    async getRequirementVersions() {
      return [];
    },
    async registerVersion() {
      return {} as never;
    },
    async listMyDocuments() {
      return [];
    },
    async uploadDocument() {
      return {} as never;
    },
    async getDownloadUrl() {
      return "";
    },
    async reviewFileVersion() {
      return {} as never;
    },
  };
}

function createTestContainer(repo: DocumentRepository): AppContainer {
  return {
    logger: new NoopLogger(),
    httpClient: {} as unknown as HttpClient,
    storage: new NoopStorage(),
    homeRepository: {
      getSampleTodo: async () => ({ id: 1, title: "", completed: false }),
    },
    authRepository: {} as never,
    caseRepository: {} as never,
    inboxRepository: {} as never,
    documentRepository: repo,
    profileRepository: {} as never,
  };
}

function makeWrapper(repo: DocumentRepository) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AppContainerProvider value={createTestContainer(repo)}>
        {children}
      </AppContainerProvider>
    );
  };
}

test("load requirements success with completion rate", async () => {
  const reqs = [
    stubRequirement({ id: "r1", status: "approved", requiredFlag: true }),
    stubRequirement({
      id: "r2",
      status: "waiting_upload",
      requiredFlag: true,
    }),
  ];
  const repo = stubRepo(reqs);

  const { result } = renderHook(() => useDocumentListViewModel(), {
    wrapper: makeWrapper(repo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("success");
  });

  if (result.current.state.status === "success") {
    expect(result.current.state.requirements).toHaveLength(2);
    expect(result.current.state.completion.rate).toBe(0.5);
  }
});

test("load requirements error", async () => {
  const repo: DocumentRepository = {
    ...stubRepo(),
    async listRequirements() {
      throw new AppError({ code: "NETWORK", message: "fail" });
    },
  };

  const { result } = renderHook(() => useDocumentListViewModel(), {
    wrapper: makeWrapper(repo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("error");
  });

  if (result.current.state.status === "error") {
    expect(result.current.state.error.code).toBe("NETWORK");
  }
});

test("sorts by status priority (uploaded_reviewing first)", async () => {
  const reqs = [
    stubRequirement({ id: "r1", status: "approved" }),
    stubRequirement({ id: "r2", status: "uploaded_reviewing" }),
    stubRequirement({ id: "r3", status: "waiting_upload" }),
  ];
  const repo = stubRepo(reqs);

  const { result } = renderHook(() => useDocumentListViewModel(), {
    wrapper: makeWrapper(repo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("success");
  });

  if (result.current.state.status === "success") {
    expect(result.current.state.requirements[0]?.id).toBe("r2");
    expect(result.current.state.requirements[2]?.id).toBe("r1");
  }
});
