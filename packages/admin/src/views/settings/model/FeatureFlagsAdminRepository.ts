import { getAdminAccessToken } from "../../../auth/model/adminSession";
import type { FeatureFlagDefinition } from "./featureFlagCatalog";

/**
 * サーバーから返る feature flag 行（DB レコード相当）。
 */
export interface FeatureFlagRow {
  /**
   *
   */
  id: string;
  /**
   *
   */
  orgId: string;
  /**
   *
   */
  key: string;
  /**
   *
   */
  enabled: boolean;
  /**
   *
   */
  payload: Record<string, unknown>;
  /**
   *
   */
  createdAt: string;
  /**
   *
   */
  updatedAt: string;
}

/**
 * resolve エンドポイントの応答。
 */
export type FeatureFlagResolution =
  | {
      key: string;
      enabled: false;
      used: false;
      reason: "missing" | "disabled" | "rollout";
    }
  | { key: string; enabled: true; used: true };

/**
 *
 */
export interface FeatureFlagsAdminRepositoryFactoryInput {
  /**
   *
   */
  request?: typeof fetch;
  /**
   *
   */
  getToken?: () => string | null;
  /**
   *
   */
  apiBase?: string;
}

/**
 *
 */
export class FeatureFlagsAdminRepositoryError extends Error {
  /**
   *
   */
  readonly status?: number;

  /**
   * Feature flag 操作中产生的错误。
   *
   * @param message - 错误消息
   * @param status - HTTP 状态码
   * @param options - 附加选项
   * @param options.cause - 原始错误
   */
  constructor(
    message: string,
    status?: number,
    options?: {
      cause?: unknown;
    },
  ) {
    super(message, options);
    this.name = "FeatureFlagsAdminRepositoryError";
    this.status = status;
  }
}

/**
 *
 */
export interface FeatureFlagsAdminRepository {
  /**
   *
   */
  listFlags(): Promise<FeatureFlagRow[]>;
  /**
   *
   */
  resolveFlag(key: string): Promise<FeatureFlagResolution>;
  /**
   *
   */
  upsertFlag(input: {
    /**
     *
     */
    key: string; /**
     *
     */
    enabled: boolean;
  }): Promise<FeatureFlagRow>;
  /**
   *
   */
  resetFlag(
    key: string,
    definition: FeatureFlagDefinition,
  ): Promise<FeatureFlagRow>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 将未知值安全转换为 {@link FeatureFlagRow}。
 *
 * @param value - 待解析的值
 * @returns 转换结果；格式不合法则返回 `null`
 */
export function adaptFeatureFlagRow(value: unknown): FeatureFlagRow | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.key !== "string")
    return null;
  if (typeof value.enabled !== "boolean") return null;

  return {
    id: value.id,
    orgId: typeof value.orgId === "string" ? value.orgId : "",
    key: value.key,
    enabled: value.enabled,
    payload: isRecord(value.payload)
      ? (value.payload as Record<string, unknown>)
      : {},
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
  };
}

/**
 * 将未知值安全转换为 {@link FeatureFlagResolution}。
 *
 * @param value - 待解析的值
 * @returns 转换结果；格式不合法则返回 `null`
 */
export function adaptFeatureFlagResolution(
  value: unknown,
): FeatureFlagResolution | null {
  if (!isRecord(value)) return null;
  if (typeof value.key !== "string" || typeof value.enabled !== "boolean")
    return null;

  if (value.enabled) {
    return { key: value.key, enabled: true, used: true };
  }

  const reason = value.reason;
  if (reason !== "missing" && reason !== "disabled" && reason !== "rollout")
    return null;

  return { key: value.key, enabled: false, used: false, reason };
}

type ResolvedRuntime = Required<FeatureFlagsAdminRepositoryFactoryInput>;

function getDefaultRequest(): typeof fetch {
  return (...args) => globalThis.fetch(...args);
}

function authHeaders(
  token: string | null,
  hasBody: boolean,
): Record<string, string> {
  return {
    Accept: "application/json",
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchJson(
  runtime: ResolvedRuntime,
  path: string,
  init: { method: string; body?: unknown },
): Promise<unknown> {
  let response: Response;
  const token = runtime.getToken();
  const url = `${runtime.apiBase}${path}`;

  try {
    response = await runtime.request(url, {
      method: init.method,
      headers: authHeaders(token, init.body !== undefined),
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch (cause) {
    throw new FeatureFlagsAdminRepositoryError(
      "Feature flag request failed",
      undefined,
      { cause },
    );
  }

  const text = await response.text();
  const body = text.trim() ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const msg =
      isRecord(body) && typeof body.message === "string"
        ? body.message
        : `Feature flag request failed with status ${response.status}`; // i18n-skip
    throw new FeatureFlagsAdminRepositoryError(msg, response.status);
  }
  return body;
}

async function listFlags(runtime: ResolvedRuntime): Promise<FeatureFlagRow[]> {
  const body = await fetchJson(runtime, "", { method: "GET" });
  if (!isRecord(body) || !Array.isArray(body.flags)) {
    throw new FeatureFlagsAdminRepositoryError(
      "Invalid feature flags list response",
    );
  }
  return body.flags
    .map(adaptFeatureFlagRow)
    .filter((r): r is FeatureFlagRow => r !== null);
}

async function resolveFlag(
  runtime: ResolvedRuntime,
  key: string,
): Promise<FeatureFlagResolution> {
  const query = new URLSearchParams({ key });
  const body = await fetchJson(runtime, `/resolve?${query.toString()}`, {
    method: "GET",
  });
  const resolution = adaptFeatureFlagResolution(body);
  if (!resolution) {
    throw new FeatureFlagsAdminRepositoryError(
      "Invalid feature flag resolve response",
    );
  }
  return resolution;
}

async function upsertFlag(
  runtime: ResolvedRuntime,
  flagInput: { key: string; enabled: boolean },
): Promise<FeatureFlagRow> {
  const body = await fetchJson(runtime, "", {
    method: "POST",
    body: { key: flagInput.key, enabled: flagInput.enabled },
  });
  const row = adaptFeatureFlagRow(body);
  if (!row) {
    throw new FeatureFlagsAdminRepositoryError(
      "Invalid feature flag upsert response",
    );
  }
  return row;
}

/**
 * 创建 {@link FeatureFlagsAdminRepository} 实例。
 *
 * @param input - 运行时依赖注入选项
 * @returns 仓库实例
 */
export function createFeatureFlagsAdminRepository(
  input: FeatureFlagsAdminRepositoryFactoryInput = {},
): FeatureFlagsAdminRepository {
  const runtime: ResolvedRuntime = {
    request: input.request ?? getDefaultRequest(),
    getToken: input.getToken ?? getAdminAccessToken,
    apiBase: input.apiBase ?? "/api/feature-flags",
  };

  const repo: FeatureFlagsAdminRepository = {
    listFlags: () => listFlags(runtime),
    resolveFlag: (key) => resolveFlag(runtime, key),
    upsertFlag: (i) => upsertFlag(runtime, i),
    resetFlag: (key, def) =>
      upsertFlag(runtime, { key, enabled: def.recommendedDefaultEnabled }),
  };
  return repo;
}
