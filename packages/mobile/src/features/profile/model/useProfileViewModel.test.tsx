import { renderHook, waitFor, act } from "@testing-library/react-native";
import React from "react";

import { AppContainerProvider } from "@app/container/AppContainerContext";
import type { AppContainer } from "@app/container/AppContainer";
import type { ProfileRepository } from "@domain/profile/ProfileRepository";
import type { HttpClient } from "@infra/http/HttpClient";
import type { Logger } from "@infra/log/Logger";
import type { KVStorage } from "@infra/storage/KVStorage";
import { AppError } from "@shared/errors/AppError";

import { useProfileViewModel } from "./useProfileViewModel";

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

const mockUser = {
  id: "u1",
  name: "Taro",
  preferredLanguage: "ja",
  email: "taro@example.com",
  phone: null,
  status: "active",
};

function createTestContainer(
  profileRepository: ProfileRepository,
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
    documentRepository: {} as never,
    profileRepository,
  };
}

function makeWrapper(repo: ProfileRepository) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AppContainerProvider value={createTestContainer(repo)}>
        {children}
      </AppContainerProvider>
    );
  };
}

test("load profile success", async () => {
  const repo: ProfileRepository = {
    async getProfile() {
      return mockUser;
    },
    async updateProfile() {
      return mockUser;
    },
    async logout() {},
  };

  const { result } = renderHook(() => useProfileViewModel(), {
    wrapper: makeWrapper(repo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("success");
  });

  if (result.current.state.status === "success") {
    expect(result.current.state.user.name).toBe("Taro");
  }
});

test("update profile", async () => {
  const updated = { ...mockUser, name: "Jiro" };
  const repo: ProfileRepository = {
    async getProfile() {
      return mockUser;
    },
    async updateProfile() {
      return updated;
    },
    async logout() {},
  };

  const { result } = renderHook(() => useProfileViewModel(), {
    wrapper: makeWrapper(repo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("success");
  });

  await act(async () => {
    await result.current.updateProfile({ name: "Jiro" });
  });

  if (result.current.state.status === "success") {
    expect(result.current.state.user.name).toBe("Jiro");
  }
});

test("logout calls repository", async () => {
  let loggedOut = false;
  const repo: ProfileRepository = {
    async getProfile() {
      return mockUser;
    },
    async updateProfile() {
      return mockUser;
    },
    async logout() {
      loggedOut = true;
    },
  };

  const { result } = renderHook(() => useProfileViewModel(), {
    wrapper: makeWrapper(repo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("success");
  });

  await act(async () => {
    await result.current.logout();
  });

  expect(loggedOut).toBe(true);
});

test("load profile error", async () => {
  const repo: ProfileRepository = {
    async getProfile() {
      throw new AppError({ code: "UNAUTHORIZED", message: "no auth" });
    },
    async updateProfile() {
      return mockUser;
    },
    async logout() {},
  };

  const { result } = renderHook(() => useProfileViewModel(), {
    wrapper: makeWrapper(repo),
  });

  await waitFor(() => {
    expect(result.current.state.status).toBe("error");
  });

  if (result.current.state.status === "error") {
    expect(result.current.state.error.code).toBe("UNAUTHORIZED");
  }
});
