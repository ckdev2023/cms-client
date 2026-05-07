/**
 * ConversationRepository — 会话仓储接口与工厂。
 *
 * 仓储只做请求编排与错误归一化：
 * - URL 构造委托给 `buildConversationXxxPath`
 * - 请求体构造委托给 `buildXxxPayload`
 * - 响应适配委托给 `adaptXxx`
 * - 错误归一化由 `ConversationRepositorySupport.requestAndAdapt` 统一处理
 */

import type { MessageItem } from "../types";
import {
  adaptConversationListResult,
  adaptConversationDetailAggregate,
  adaptConversationMutationResult,
  adaptConversationMessagesResult,
  buildConversationListSearchParams,
  buildConversationDetailPath,
  buildConversationMessagesPath,
  buildConversationAssignPath,
  buildConversationClosePath,
  buildConversationReopenPath,
  buildRetryTranslationPath,
  buildAssignPayload,
  buildSendMessagePayload,
  buildRetryTranslationPayload,
  type ConversationListParams,
  type ConversationListResult,
  type ConversationMutationResult,
  type ConversationDetailAggregate,
  type ConversationMessagesResult,
  type ConversationAssignInput,
  type ConversationSendMessageInput,
  type ConversationRetryTranslationInput,
} from "./ConversationAdapter";
import {
  ConversationRepositoryError,
  createRuntime,
  requestAndAdapt,
  type ConversationRepositoryFactoryInput,
  type ConversationRepositoryRuntime,
} from "./ConversationRepositorySupport";

// ─── Responsibility Boundary ────────────────────────────────────
// ConversationRepository is request-orchestration only.
// ConversationRepository MUST NOT contain inline field mapping, raw body
// construction, or response parsing logic.

/**
 *
 */
export interface ConversationRepository {
  /**
   *
   */
  listConversations(
    params: ConversationListParams,
  ): Promise<ConversationListResult>;

  /**
   *
   */
  getDetail(id: string): Promise<ConversationDetailAggregate | null>;

  /**
   *
   */
  getMessages(
    conversationId: string,
    page?: number,
    limit?: number,
    preferredLanguage?: string,
  ): Promise<ConversationMessagesResult>;

  /**
   *
   */
  assign(
    id: string,
    input: ConversationAssignInput,
  ): Promise<ConversationMutationResult>;

  /**
   *
   */
  sendMessage(
    conversationId: string,
    input: ConversationSendMessageInput,
  ): Promise<ConversationMutationResult>;

  /**
   *
   */
  close(id: string): Promise<ConversationMutationResult>;

  /**
   *
   */
  reopen(id: string): Promise<ConversationMutationResult>;

  /**
   *
   */
  retryTranslation(
    conversationId: string,
    input: ConversationRetryTranslationInput,
  ): Promise<ConversationMutationResult>;
}

export { ConversationRepositoryError };

// ─── Method factories ───────────────────────────────────────────

function createListConversations(runtime: ConversationRepositoryRuntime) {
  return async (
    params: ConversationListParams,
  ): Promise<ConversationListResult> => {
    const query = buildConversationListSearchParams(params).toString();
    const url = query ? `${runtime.apiPath}?${query}` : runtime.apiPath;
    return requestAndAdapt({
      runtime,
      url,
      method: "GET",
      adapt: adaptConversationListResult,
      errorMessage: "Invalid conversation list response",
    });
  };
}

function createGetDetail(runtime: ConversationRepositoryRuntime) {
  return async (id: string): Promise<ConversationDetailAggregate | null> => {
    const normalizedId = id.trim();
    if (!normalizedId) return null;

    return requestAndAdapt({
      runtime,
      url: buildConversationDetailPath(runtime.apiPath, normalizedId),
      method: "GET",
      adapt: adaptConversationDetailAggregate,
      errorMessage: "Invalid conversation detail response",
    });
  };
}

function createGetMessages(runtime: ConversationRepositoryRuntime) {
  return async (
    conversationId: string,
    page?: number,
    limit?: number,
    preferredLanguage?: string,
  ): Promise<ConversationMessagesResult> => {
    const normalizedId = conversationId.trim();
    if (!normalizedId)
      return { items: [] as MessageItem[], total: 0, page: 1, limit: 50 };

    let url = buildConversationMessagesPath(runtime.apiPath, normalizedId);
    const sp = new URLSearchParams();
    if (page && page > 0) sp.set("page", String(page));
    if (limit && limit > 0) sp.set("limit", String(limit));
    const query = sp.toString();
    if (query) url = `${url}?${query}`;

    return requestAndAdapt({
      runtime,
      url,
      method: "GET",
      adapt: (v) => adaptConversationMessagesResult(v, preferredLanguage),
      errorMessage: "Invalid messages response",
    });
  };
}

function createAssign(runtime: ConversationRepositoryRuntime) {
  return async (
    id: string,
    input: ConversationAssignInput,
  ): Promise<ConversationMutationResult> =>
    requestAndAdapt({
      runtime,
      url: buildConversationAssignPath(runtime.apiPath, id),
      method: "PATCH",
      body: buildAssignPayload(input),
      adapt: adaptConversationMutationResult,
      errorMessage: "Invalid assign response",
    });
}

function createSendMessage(runtime: ConversationRepositoryRuntime) {
  return async (
    conversationId: string,
    input: ConversationSendMessageInput,
  ): Promise<ConversationMutationResult> =>
    requestAndAdapt({
      runtime,
      url: buildConversationMessagesPath(runtime.apiPath, conversationId),
      method: "POST",
      body: buildSendMessagePayload(input),
      adapt: adaptConversationMutationResult,
      errorMessage: "Invalid send message response",
    });
}

function createClose(runtime: ConversationRepositoryRuntime) {
  return async (id: string): Promise<ConversationMutationResult> =>
    requestAndAdapt({
      runtime,
      url: buildConversationClosePath(runtime.apiPath, id),
      method: "PATCH",
      adapt: adaptConversationMutationResult,
      errorMessage: "Invalid close response",
    });
}

function createReopen(runtime: ConversationRepositoryRuntime) {
  return async (id: string): Promise<ConversationMutationResult> =>
    requestAndAdapt({
      runtime,
      url: buildConversationReopenPath(runtime.apiPath, id),
      method: "PATCH",
      adapt: adaptConversationMutationResult,
      errorMessage: "Invalid reopen response",
    });
}

function createRetryTranslation(runtime: ConversationRepositoryRuntime) {
  return async (
    conversationId: string,
    input: ConversationRetryTranslationInput,
  ): Promise<ConversationMutationResult> =>
    requestAndAdapt({
      runtime,
      url: buildRetryTranslationPath(
        runtime.apiPath,
        conversationId,
        input.messageId,
      ),
      method: "POST",
      body: buildRetryTranslationPayload(),
      adapt: adaptConversationMutationResult,
      errorMessage: "Invalid retry translation response",
    });
}

// ─── Factory ────────────────────────────────────────────────────

/**
 * 创建基于 HTTP 请求的真实 ConversationRepository。
 *
 * @param input - 可选的 fetch、令牌提供者和 API 路径覆盖
 * @returns 实现所有会话操作的仓库实例
 */
export function createConversationRepository(
  input: ConversationRepositoryFactoryInput = {},
): ConversationRepository {
  const runtime = createRuntime(input);

  return {
    listConversations: createListConversations(runtime),
    getDetail: createGetDetail(runtime),
    getMessages: createGetMessages(runtime),
    assign: createAssign(runtime),
    sendMessage: createSendMessage(runtime),
    close: createClose(runtime),
    reopen: createReopen(runtime),
    retryTranslation: createRetryTranslation(runtime),
  };
}

// ─── Test Runtime Factory ───────────────────────────────────────

/**
 *
 */
export interface ConversationTestRuntime {
  /**
   *
   */
  repository: ConversationRepository;
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
 * 创建用于单测的 ConversationRepository 实例和配套工具。
 *
 * 提供 stub fetch 和请求捕获机制。
 *
 * @returns 包含 repository 实例、请求记录和响应控制器的测试运行时
 */
export function createConversationTestRuntime(): ConversationTestRuntime {
  let nextResponse: { body: unknown; status: number } = {
    body: { id: "test-conversation-id" },
    status: 200,
  };

  const requests: ConversationTestRuntime["requests"] = [];

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

  const repository = createConversationRepository({
    request: stubFetch,
    getToken: () => "test-token",
    apiPath: "/api/admin/conversations",
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
