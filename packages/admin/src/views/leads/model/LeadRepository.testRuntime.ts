import { createLeadRepository, type LeadRepository } from "./LeadRepository";

/**
 *
 */
export interface LeadTestRuntime {
  /**
   *
   */
  repository: LeadRepository;
  /**
   *
   */
  requests: Array<{
    /**
     *
     */
    url: string;
    /**
     *
     */
    method: string;
    /**
     *
     */
    body?: unknown;
  }>;
  /**
   *
   */
  setResponse: (body: unknown, status?: number) => void;
  /**
   *
   */
  setError: (status: number, body?: unknown) => void;
}

/**
 * 创建用于单测的 LeadRepository 实例和配套工具。
 *
 * 提供 stub fetch 和请求捕获机制，使用时无需手动构造 mock fetch。
 *
 * @returns 包含 repository 实例、请求记录和响应控制器的测试运行时
 */
export function createLeadTestRuntime(): LeadTestRuntime {
  let nextResponse: { body: unknown; status: number } = {
    body: { id: "test-lead-id" },
    status: 200,
  };

  const requests: LeadTestRuntime["requests"] = [];

  const stubFetch: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const method = init?.method ?? "GET";
    let body: unknown;
    if (init?.body && typeof init.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }

    requests.push({ url, method, body });

    const responseBody = JSON.stringify(nextResponse.body);
    return new Response(responseBody, {
      status: nextResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  };

  const repository = createLeadRepository({
    request: stubFetch,
    getToken: () => "test-token",
    apiPath: "/api/admin/leads",
  });

  return {
    repository,
    requests,
    setResponse(body: unknown, status = 200) {
      nextResponse = { body, status };
    },
    setError(status: number, body?: unknown) {
      nextResponse = {
        body: body ?? { message: `Error ${status}` },
        status,
      };
    },
  };
}
