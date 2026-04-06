import { renderHook, waitFor, act } from "@testing-library/react-native";
import React from "react";

import { AppContainerProvider } from "@app/container/AppContainerContext";
import type { AppContainer } from "@app/container/AppContainer";
import type { InboxRepository } from "@domain/inbox/InboxRepository";
import type { HttpClient } from "@infra/http/HttpClient";
import type { Logger } from "@infra/log/Logger";
import type { KVStorage } from "@infra/storage/KVStorage";

import { useConversationViewModel } from "./useConversationViewModel";

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

const mockMsg = {
  id: "m1",
  senderType: "app_user" as const,
  originalText: "hello",
  originalLanguage: "en",
  translatedText: "こんにちは",
  translationStatus: "done",
  createdAt: "2026-04-01",
};

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

test("load messages success", async () => {
  const repo: InboxRepository = {
    async listConversations() {
      return [];
    },
    async getMessages() {
      return [mockMsg];
    },
    async sendMessage() {
      return mockMsg;
    },
  };

  const { result } = renderHook(() => useConversationViewModel("conv1"), {
    wrapper: makeWrapper(repo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("success");
  });

  if (result.current.state.status === "success") {
    expect(result.current.state.messages).toHaveLength(1);
    expect(result.current.state.messages[0]?.originalText).toBe("hello");
  }
});

test("send message refreshes list", async () => {
  let callCount = 0;
  const repo: InboxRepository = {
    async listConversations() {
      return [];
    },
    async getMessages() {
      callCount++;
      return [mockMsg];
    },
    async sendMessage() {
      return mockMsg;
    },
  };

  const { result } = renderHook(() => useConversationViewModel("conv1"), {
    wrapper: makeWrapper(repo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("success");
  });

  const before = callCount;

  await act(async () => {
    await result.current.sendMessage("new msg");
  });

  expect(callCount).toBeGreaterThan(before);
});
