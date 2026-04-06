/**
 * Jest 全局初始化。
 *
 * 目标：
 * - 禁止测试中发起真实网络请求，避免不稳定与污染外部环境
 * - 需要网络请求的测试必须显式 mock global.fetch
 */

const originalFetch = global.fetch;

if (typeof originalFetch === "function") {
  global.fetch = (async () => {
    throw new Error(
      "门禁：测试中禁止真实网络请求。请 mock global.fetch 或使用注入的 repository stub。",
    );
  }) as typeof fetch;
}

export {};
