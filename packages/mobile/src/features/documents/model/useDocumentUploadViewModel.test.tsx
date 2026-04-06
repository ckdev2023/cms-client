import { renderHook, act } from "@testing-library/react-native";
import React from "react";

import { AppContainerProvider } from "@app/container/AppContainerContext";
import type { AppContainer } from "@app/container/AppContainer";
import type { DocumentRepository } from "@domain/documents/DocumentRepository";
import type { HttpClient } from "@infra/http/HttpClient";
import type { Logger } from "@infra/log/Logger";
import type { KVStorage } from "@infra/storage/KVStorage";
import { AppError } from "@shared/errors/AppError";

import { useDocumentUploadViewModel } from "./useDocumentUploadViewModel";

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

test("upload success", async () => {
  const repo: DocumentRepository = {
    async listMyDocuments() {
      return [];
    },
    async uploadDocument() {
      return {
        id: "d1",
        fileName: "f.pdf",
        docType: "general",
        status: "pending",
        uploadedAt: "2026-04-01",
        fileKey: "k",
      };
    },
    async getDownloadUrl() {
      return "";
    },
  };

  const { result } = renderHook(() => useDocumentUploadViewModel(), {
    wrapper: makeWrapper(repo),
  });

  expect(result.current.state.status).toBe("idle");

  await act(async () => {
    await result.current.upload({
      fileName: "f.pdf",
      contentType: "application/pdf",
      data: "abc",
    });
  });

  expect(result.current.state.status).toBe("success");
});

test("upload error", async () => {
  const repo: DocumentRepository = {
    async listMyDocuments() {
      return [];
    },
    async uploadDocument() {
      throw new AppError({ code: "SERVER", message: "upload failed" });
    },
    async getDownloadUrl() {
      return "";
    },
  };

  const { result } = renderHook(() => useDocumentUploadViewModel(), {
    wrapper: makeWrapper(repo),
  });

  await act(async () => {
    await result.current.upload({
      fileName: "f.pdf",
      contentType: "application/pdf",
      data: "abc",
    });
  });

  expect(result.current.state.status).toBe("error");
  if (result.current.state.status === "error") {
    expect(result.current.state.error.code).toBe("SERVER");
  }
});
