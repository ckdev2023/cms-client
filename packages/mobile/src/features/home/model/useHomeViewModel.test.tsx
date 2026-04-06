import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { AppContainerProvider } from "@app/container/AppContainerContext";
import type { AppContainer } from "@app/container/AppContainer";
import type { HomeRepository } from "@domain/home/HomeRepository";
import type { HttpClient } from "@infra/http/HttpClient";
import type { Logger } from "@infra/log/Logger";
import type { KVStorage } from "@infra/storage/KVStorage";

import { useHomeViewModel } from "./useHomeViewModel";

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

function createTestContainer(params: {
  homeRepository: HomeRepository;
}): AppContainer {
  return {
    logger: new NoopLogger(),
    httpClient: {} as unknown as HttpClient,
    storage: new NoopStorage(),
    homeRepository: params.homeRepository,
    authRepository: {} as never,
    caseRepository: {} as never,
    inboxRepository: {} as never,
    documentRepository: {} as never,
    profileRepository: {} as never,
  };
}

test("load todo success", async () => {
  const homeRepository: HomeRepository = {
    async getSampleTodo() {
      return { id: 1, title: "hello", completed: false };
    },
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppContainerProvider value={createTestContainer({ homeRepository })}>
      {children}
    </AppContainerProvider>
  );

  const { result } = renderHook(() => useHomeViewModel(), { wrapper });

  await waitFor(() => {
    expect(result.current.state.status).toBe("success");
  });

  expect(result.current.state).toEqual({
    status: "success",
    todo: { id: 1, title: "hello", completed: false },
  });
});
