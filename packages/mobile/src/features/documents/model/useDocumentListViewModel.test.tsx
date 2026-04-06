import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { AppContainerProvider } from "@app/container/AppContainerContext";
import type { AppContainer } from "@app/container/AppContainer";
import type { DocumentRepository } from "@domain/documents/DocumentRepository";
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

function createTestContainer(
  documentRepository: DocumentRepository,
): AppContainer {
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
    documentRepository,
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

test("load documents success", async () => {
  const repo: DocumentRepository = {
    async listMyDocuments() {
      return [
        {
          id: "d1",
          fileName: "passport.pdf",
          docType: "passport",
          status: "received",
          uploadedAt: "2026-04-01",
        },
      ];
    },
    async uploadDocument() {
      return {
        id: "d2",
        fileName: "f",
        docType: "g",
        status: "pending",
        uploadedAt: "",
        fileKey: "k",
      };
    },
    async getDownloadUrl() {
      return "https://example.com";
    },
  };

  const { result } = renderHook(() => useDocumentListViewModel(), {
    wrapper: makeWrapper(repo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("success");
  });

  if (result.current.state.status === "success") {
    expect(result.current.state.documents).toHaveLength(1);
  }
});

test("load documents error", async () => {
  const repo: DocumentRepository = {
    async listMyDocuments() {
      throw new AppError({ code: "NETWORK", message: "fail" });
    },
    async uploadDocument() {
      return {
        id: "d2",
        fileName: "f",
        docType: "g",
        status: "pending",
        uploadedAt: "",
        fileKey: "k",
      };
    },
    async getDownloadUrl() {
      return "";
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
