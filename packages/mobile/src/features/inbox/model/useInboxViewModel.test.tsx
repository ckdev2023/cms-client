import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { AppContainerProvider } from "@app/container/AppContainerContext";
import type { AppContainer } from "@app/container/AppContainer";
import type { InboxRepository } from "@domain/inbox/InboxRepository";
import type { HttpClient } from "@infra/http/HttpClient";
import type { Logger } from "@infra/log/Logger";
import type { KVStorage } from "@infra/storage/KVStorage";
import { AppError } from "@shared/errors/AppError";

import { useInboxViewModel } from "./useInboxViewModel";

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

function createTestContainer(inboxRepository: InboxRepository): AppContainer {
  return {
    logger: new NoopLogger(),
    httpClient: {} as unknown as HttpClient,
    storage: new NoopStorage(),
    homeRepository: {
      getSampleTodo: async () => ({ id: 1, title: "", completed: false }),
    },
    authRepository: {} as never,
    caseRepository: {} as never,
    inboxRepository,
    documentRepository: {} as never,
    profileRepository: {} as never,
  };
}

function makeWrapper(inboxRepository: InboxRepository) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AppContainerProvider value={createTestContainer(inboxRepository)}>
        {children}
      </AppContainerProvider>
    );
  };
}

test("load conversations success", async () => {
  const repo: InboxRepository = {
    async listConversations() {
      return [
        {
          id: "conv1",
          channel: "web",
          preferredLanguage: "ja",
          status: "open",
          createdAt: "2026-04-01",
        },
      ];
    },
    async getMessages() {
      return [];
    },
    async sendMessage() {
      return {
        id: "m1",
        senderType: "app_user" as const,
        originalText: "",
        originalLanguage: "ja",
        translatedText: null,
        translationStatus: "done",
        createdAt: "",
      };
    },
  };

  const { result } = renderHook(() => useInboxViewModel(), {
    wrapper: makeWrapper(repo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("success");
  });

  if (result.current.state.status === "success") {
    expect(result.current.state.conversations).toHaveLength(1);
  }
});

test("load conversations error", async () => {
  const repo: InboxRepository = {
    async listConversations() {
      throw new AppError({ code: "NETWORK", message: "fail" });
    },
    async getMessages() {
      return [];
    },
    async sendMessage() {
      return {
        id: "m1",
        senderType: "app_user" as const,
        originalText: "",
        originalLanguage: "ja",
        translatedText: null,
        translationStatus: "done",
        createdAt: "",
      };
    },
  };

  const { result } = renderHook(() => useInboxViewModel(), {
    wrapper: makeWrapper(repo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("error");
  });

  if (result.current.state.status === "error") {
    expect(result.current.state.error.code).toBe("NETWORK");
  }
});
