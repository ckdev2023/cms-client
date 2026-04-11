import { beforeAll, afterAll, afterEach, vi } from "vitest";

// 强制拦截所有的 fetch 请求，防止在测试中发起真实网络请求
const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = vi.fn().mockImplementation((url) => {
    // eslint-disable-next-line no-console
    console.error(
      `\n[门禁拦截] 测试代码中禁止发起真实网络请求 (URL: ${url})\n`,
    );
    throw new Error(
      `\n[门禁拦截] 测试代码中禁止发起真实网络请求 (URL: ${url})\n`,
    );
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  global.fetch = originalFetch;
});
