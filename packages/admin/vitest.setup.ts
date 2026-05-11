import { afterAll, afterEach, beforeEach, vi } from "vitest";
import { _resetDefaultPermissionsStoreForTest } from "./src/shared/model/PermissionsStore";

// 强制拦截所有的 fetch 请求，防止在测试中发起真实网络请求
const originalFetch = global.fetch;

global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
  const url = String(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
  );
  if (url.includes("/checklist-preview")) {
    const u = new URL(url, "http://localhost");
    const caseTypeCode = u.searchParams.get("caseTypeCode") ?? "";
    return Promise.resolve(
      new Response(
        JSON.stringify({ caseTypeCode, count: 10, requiredCount: 8 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
  }
  // eslint-disable-next-line no-console
  console.error(`\n[门禁拦截] 测试代码中禁止发起真实网络请求 (URL: ${url})\n`);
  throw new Error(
    `\n[门禁拦截] 测试代码中禁止发起真实网络请求 (URL: ${url})\n`,
  );
});

beforeEach(() => {
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  }
});

afterEach(() => {
  _resetDefaultPermissionsStoreForTest();
  vi.clearAllMocks();
});

afterAll(() => {
  global.fetch = originalFetch;
});
