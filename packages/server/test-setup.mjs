/**
 * 后端测试环境初始化入口
 * 拦截所有的 fetch 和原生 http/https 请求，防止测试代码误调外部 API
 */

// 1. 保存原始 fetch
const originalFetch = global.fetch;

// 2. 拦截原生的 fetch
global.fetch = new Proxy(originalFetch, {
  apply: function (target, thisArg, argumentsList) {
    const url = argumentsList[0];

    // 如果是请求本地测试服务器 (localhost / 127.0.0.1 且带有端口号)，则放行
    // 这是为了让 http-smoke.test 等本地集成测试正常工作
    if (
      typeof url === "string" &&
      (url.includes("://127.0.0.1:") || url.includes("://localhost:"))
    ) {
      return Reflect.apply(target, thisArg, argumentsList);
    }

    console.error(
      `\n[门禁拦截] 测试代码中禁止发起真实外部网络请求 (URL: ${url})\n`,
    );
    throw new Error(
      `\n[门禁拦截] 测试代码中禁止发起真实外部网络请求 (URL: ${url})\n`,
    );
  },
});
