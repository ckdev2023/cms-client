import { renderHook, act } from "@testing-library/react-native";
import React from "react";

import { AppContainerProvider } from "@app/container/AppContainerContext";
import type { AppContainer } from "@app/container/AppContainer";
import type { AuthRepository } from "@domain/auth/AuthRepository";
import type { HttpClient } from "@infra/http/HttpClient";
import type { Logger } from "@infra/log/Logger";
import type { KVStorage } from "@infra/storage/KVStorage";
import { AppError } from "@shared/errors/AppError";

import { useLoginViewModel } from "./useLoginViewModel";

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
  authRepository: AuthRepository;
}): AppContainer {
  return {
    logger: new NoopLogger(),
    httpClient: {} as unknown as HttpClient,
    storage: new NoopStorage(),
    homeRepository: {
      getSampleTodo: async () => ({ id: 1, title: "", completed: false }),
    },
    authRepository: params.authRepository,
    caseRepository: {} as never,
    inboxRepository: {} as never,
    documentRepository: {} as never,
    profileRepository: {} as never,
  };
}

function makeWrapper(authRepository: AuthRepository) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AppContainerProvider value={createTestContainer({ authRepository })}>
        {children}
      </AppContainerProvider>
    );
  };
}

test("initial state is idle", () => {
  const authRepo: AuthRepository = {
    async requestCode() {},
    async verifyCode() {
      return {
        token: "t",
        user: {
          id: "1",
          name: "A",
          preferredLanguage: "ja",
          email: null,
          phone: null,
          status: "active",
        },
      };
    },
    async getMe() {
      return {
        id: "1",
        name: "A",
        preferredLanguage: "ja",
        email: null,
        phone: null,
        status: "active",
      };
    },
  };
  const { result } = renderHook(() => useLoginViewModel(), {
    wrapper: makeWrapper(authRepo),
  });
  expect(result.current.state.status).toBe("idle");
});

test("requestCode: idle → requesting_code → code_sent", async () => {
  const authRepo: AuthRepository = {
    async requestCode() {},
    async verifyCode() {
      return {
        token: "t",
        user: {
          id: "1",
          name: "A",
          preferredLanguage: "ja",
          email: null,
          phone: null,
          status: "active",
        },
      };
    },
    async getMe() {
      return {
        id: "1",
        name: "A",
        preferredLanguage: "ja",
        email: null,
        phone: null,
        status: "active",
      };
    },
  };
  const { result } = renderHook(() => useLoginViewModel(), {
    wrapper: makeWrapper(authRepo),
  });

  await act(async () => {
    await result.current.requestCode("test@example.com");
  });

  expect(result.current.state.status).toBe("code_sent");
});

test("verifyCode: code_sent → verifying → success", async () => {
  const authRepo: AuthRepository = {
    async requestCode() {},
    async verifyCode() {
      return {
        token: "tok",
        user: {
          id: "1",
          name: "A",
          preferredLanguage: "ja",
          email: null,
          phone: null,
          status: "active",
        },
      };
    },
    async getMe() {
      return {
        id: "1",
        name: "A",
        preferredLanguage: "ja",
        email: null,
        phone: null,
        status: "active",
      };
    },
  };
  const { result } = renderHook(() => useLoginViewModel(), {
    wrapper: makeWrapper(authRepo),
  });

  await act(async () => {
    await result.current.verifyCode("test@example.com", "123456");
  });

  expect(result.current.state.status).toBe("success");
  if (result.current.state.status === "success") {
    expect(result.current.state.token).toBe("tok");
  }
});

test("requestCode error: idle → error", async () => {
  const authRepo: AuthRepository = {
    async requestCode() {
      throw new AppError({ code: "NETWORK", message: "fail" });
    },
    async verifyCode() {
      return {
        token: "t",
        user: {
          id: "1",
          name: "A",
          preferredLanguage: "ja",
          email: null,
          phone: null,
          status: "active",
        },
      };
    },
    async getMe() {
      return {
        id: "1",
        name: "A",
        preferredLanguage: "ja",
        email: null,
        phone: null,
        status: "active",
      };
    },
  };
  const { result } = renderHook(() => useLoginViewModel(), {
    wrapper: makeWrapper(authRepo),
  });

  await act(async () => {
    await result.current.requestCode("test@example.com");
  });

  expect(result.current.state.status).toBe("error");
  if (result.current.state.status === "error") {
    expect(result.current.state.error.code).toBe("NETWORK");
    expect(result.current.state.previousStatus).toBe("idle");
  }
});

test("verifyCode error: code_sent → error", async () => {
  const authRepo: AuthRepository = {
    async requestCode() {},
    async verifyCode() {
      throw new AppError({ code: "UNAUTHORIZED", message: "bad code" });
    },
    async getMe() {
      return {
        id: "1",
        name: "A",
        preferredLanguage: "ja",
        email: null,
        phone: null,
        status: "active",
      };
    },
  };
  const { result } = renderHook(() => useLoginViewModel(), {
    wrapper: makeWrapper(authRepo),
  });

  await act(async () => {
    await result.current.verifyCode("test@example.com", "wrong");
  });

  expect(result.current.state.status).toBe("error");
  if (result.current.state.status === "error") {
    expect(result.current.state.error.code).toBe("UNAUTHORIZED");
    expect(result.current.state.previousStatus).toBe("code_sent");
  }
});
