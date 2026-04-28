import { getAdminAccessToken } from "../../../auth/model/adminSession";
import type { OrgSettings } from "../types";

/**
 * 组织设置仓储工厂依赖。
 */
export interface OrgSettingsRepositoryFactoryInput {
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
  apiPath?: string;
}

/**
 * 组织设置更新载荷。
 */
export interface OrgSettingsUpdateInput {
  /**
   *
   */
  visibility?: Partial<OrgSettings["visibility"]>;
  /**
   *
   */
  storageRoot?: Pick<OrgSettings["storageRoot"], "rootLabel" | "rootPath">;
}

/**
 * 组织设置仓储接口。
 */
export interface OrgSettingsRepository {
  /**
   *
   */
  getOrgSettings(): Promise<OrgSettings>;
  /**
   *
   */
  updateOrgSettings(input: OrgSettingsUpdateInput): Promise<OrgSettings>;
}

/**
 * 组织设置请求错误。
 */
export class OrgSettingsRepositoryError extends Error {
  /**
   *
   */
  readonly status?: number;

  /**
   * 创建组织设置请求错误。
   *
   * @param message - 错误消息
   * @param status - HTTP 状态码
   * @param options - 额外错误上下文
   * @param options.cause - 原始异常
   */
  constructor(
    message: string,
    status?: number,
    options?: {
      /**
       *
       */
      cause?: unknown;
    },
  ) {
    super(message, options);
    this.name = "OrgSettingsRepositoryError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : value === null ? null : null;
}

/**
 * 将接口响应适配为前端组织设置模型。
 *
 * @param value - 原始响应值
 * @returns 适配后的组织设置；无法识别时返回 `null`
 */
export function adaptOrgSettings(value: unknown): OrgSettings | null {
  if (!isRecord(value)) return null;
  const visibility = isRecord(value.visibility) ? value.visibility : null;
  const storageRoot = isRecord(value.storageRoot) ? value.storageRoot : null;
  if (!visibility || !storageRoot) return null;

  return {
    visibility: {
      allowCrossGroupCaseCreate: visibility.allowCrossGroupCaseCreate === true,
      allowPrincipalViewCrossGroupCollab:
        visibility.allowPrincipalViewCrossGroupCollab === true,
    },
    storageRoot: {
      rootLabel: readNullableString(storageRoot.rootLabel),
      rootPath: readNullableString(storageRoot.rootPath),
      updatedBy: readNullableString(storageRoot.updatedBy),
      updatedAt: readNullableString(storageRoot.updatedAt),
    },
  };
}

function getDefaultRequest(): typeof fetch {
  return (...args) => globalThis.fetch(...args);
}

async function requestAndAdapt(
  runtime: Required<OrgSettingsRepositoryFactoryInput>,
  input: { method: "GET" | "PATCH"; body?: unknown },
): Promise<OrgSettings> {
  let response: Response;
  const token = runtime.getToken();

  try {
    response = await runtime.request(runtime.apiPath, {
      method: input.method,
      headers: {
        Accept: "application/json",
        ...(input.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: input.body !== undefined ? JSON.stringify(input.body) : undefined,
    });
  } catch (cause) {
    throw new OrgSettingsRepositoryError(
      "Org settings request failed",
      undefined,
      {
        cause,
      },
    );
  }

  const text = await response.text();
  const body = text.trim() ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) {
    throw new OrgSettingsRepositoryError(
      `Org settings request failed with status ${response.status}`,
      response.status,
    );
  }

  const adapted = adaptOrgSettings(body);
  if (!adapted) {
    throw new OrgSettingsRepositoryError(
      "Invalid organization settings response",
      response.status,
    );
  }
  return adapted;
}

/**
 * 组织设置仓储：读取/更新当前组织的 settings。
 *
 * @param input - 可选运行时依赖覆盖
 * @returns 组织设置仓储实例
 */
export function createOrgSettingsRepository(
  input: OrgSettingsRepositoryFactoryInput = {},
): OrgSettingsRepository {
  const runtime: Required<OrgSettingsRepositoryFactoryInput> = {
    request: input.request ?? getDefaultRequest(),
    getToken: input.getToken ?? getAdminAccessToken,
    apiPath: input.apiPath ?? "/api/organizations/current/settings",
  };

  return {
    getOrgSettings() {
      return requestAndAdapt(runtime, { method: "GET" });
    },
    updateOrgSettings(patch: OrgSettingsUpdateInput) {
      return requestAndAdapt(runtime, { method: "PATCH", body: patch });
    },
  };
}
