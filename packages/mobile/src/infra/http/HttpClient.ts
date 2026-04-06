import { HttpError } from "@shared/http/HttpError";

/**
 * HTTP 请求参数。
 */
export type HttpRequest = {
  /**
   * 请求 URL。
   */
  url: string;
  /**
   * 请求方法。
   */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /**
   * 请求头。
   */
  headers?: Record<string, string>;
  /**
   * 请求体（会被 JSON.stringify）。
   */
  body?: unknown;
  /**
   * 超时时间（毫秒）。
   */
  timeoutMs?: number;
};

/**
 * HTTP 响应结果。
 *
 * @template T 响应数据类型
 */
export type HttpResponse<T> = {
  /**
   * 是否成功（HTTP 2xx）。
   */
  ok: boolean;
  /**
   * HTTP 状态码。
   */
  status: number;
  /**
   * 响应数据。
   */
  data: T;
  /**
   * 响应头。
   */
  headers: Headers;
};

/**
 * 基于 fetch 的 JSON HTTP 客户端。
 *
 * 职责：
 * - 统一超时控制（AbortController）
 * - 统一错误建模（抛出 HttpError）
 *
 * 说明：
 * - 该实现位于 infra 层，业务不可直接依赖；通过 app 容器注入到 data 层使用
 */
export class HttpClient {
  /**
   * 发起 JSON 请求并解析响应。
   *
   * @template T 响应数据类型
   * @param request 请求参数
   * @returns 响应结果
   */
  async requestJson<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    const controller = new AbortController();
    const timeout = this.createTimeout(controller, request.timeoutMs ?? 15_000);

    try {
      const response = await this.fetchResponse(request, controller.signal);
      const data = await this.readJsonBody(response, request.url);
      this.assertOk(response, request.url);
      return this.buildResponse<T>(response, data);
    } catch (e: unknown) {
      throw this.toHttpError(e, request.url);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * 创建请求超时定时器。
   *
   * @param controller 终止控制器
   * @param timeoutMs 超时时间（毫秒）
   * @returns 定时器句柄
   */
  private createTimeout(
    controller: AbortController,
    timeoutMs: number,
  ): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      controller.abort();
    }, timeoutMs);
  }

  /**
   * 构建请求头。
   *
   * @param request 请求参数
   * @returns 请求头对象
   */
  private buildHeaders(request: HttpRequest): Record<string, string> {
    return {
      Accept: "application/json",
      ...(request.body == null ? {} : { "Content-Type": "application/json" }),
      ...(request.headers ?? {}),
    };
  }

  /**
   * 发起网络请求（不做解析与错误映射）。
   *
   * @param request 请求参数
   * @param signal 终止信号
   * @returns fetch Response
   */
  private async fetchResponse(
    request: HttpRequest,
    signal: AbortSignal,
  ): Promise<Response> {
    return fetch(request.url, {
      method: request.method,
      headers: this.buildHeaders(request),
      body: request.body == null ? undefined : JSON.stringify(request.body),
      signal,
    });
  }

  /**
   * 读取并解析 JSON body。
   *
   * @param response fetch Response
   * @param url 请求 URL（用于错误信息）
   * @returns 解析后的 JSON（可能为 null）
   */
  private async readJsonBody(
    response: Response,
    url: string,
  ): Promise<unknown> {
    const text = await response.text();
    if (text.length === 0) return null;

    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new HttpError({
        reason: "INVALID_JSON",
        message: "Invalid JSON response",
        status: response.status,
        url,
      });
    }
  }

  /**
   * 确保响应成功，否则抛出 HttpError。
   *
   * @param response fetch Response
   * @param url 请求 URL
   */
  private assertOk(response: Response, url: string): void {
    if (response.ok) return;
    throw new HttpError({
      reason: "BAD_STATUS",
      message: `HTTP ${response.status}`,
      status: response.status,
      url,
    });
  }

  /**
   * 组装返回结构。
   *
   * @template T 响应数据类型
   * @param response fetch Response
   * @param data 数据体
   * @returns HttpResponse
   */
  private buildResponse<T>(response: Response, data: unknown): HttpResponse<T> {
    return {
      ok: true,
      status: response.status,
      data: data as T,
      headers: response.headers,
    };
  }

  /**
   * 将未知异常统一映射为 HttpError。
   *
   * @param e 原始异常
   * @param url 请求 URL
   * @returns HttpError
   */
  private toHttpError(e: unknown, url: string): HttpError {
    if (e instanceof HttpError) return e;
    if (e instanceof DOMException && e.name === "AbortError") {
      return new HttpError({
        reason: "TIMEOUT",
        message: "Request timeout",
        url,
      });
    }
    if (e instanceof Error) {
      return new HttpError({
        reason: "NETWORK",
        message: e.message,
        url,
      });
    }
    return new HttpError({
      reason: "UNKNOWN",
      message: "Unknown error",
      url,
    });
  }
}
