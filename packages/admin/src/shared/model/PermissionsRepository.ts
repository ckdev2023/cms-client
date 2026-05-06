import { getRegisteredToken } from "./tokenProvider";

/**
 * `/me/permissions` レスポンスの型。
 */
export interface MyPermissionsResponse {
  /**
   *
   */
  permissions: string[];
  /**
   *
   */
  role: string;
  /**
   *
   */
  userId: string;
}

/**
 * 権限リポジトリのファクトリ依存。
 */
export interface PermissionsRepositoryFactoryInput {
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
 * 権限リポジトリインターフェース。
 */
export interface PermissionsRepository {
  /**
   *
   */
  fetchMyPermissions(): Promise<MyPermissionsResponse>;
}

function getDefaultRequest(): typeof fetch {
  return (...args) => globalThis.fetch(...args);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function adaptResponse(body: unknown): MyPermissionsResponse | null {
  if (!isRecord(body)) return null;
  if (!Array.isArray(body.permissions)) return null;
  const permissions = body.permissions.filter(
    (p): p is string => typeof p === "string",
  );
  return {
    permissions,
    role: typeof body.role === "string" ? body.role : "",
    userId: typeof body.userId === "string" ? body.userId : "",
  };
}

/**
 * 创建权限仓储实例。
 *
 * @param input - 工厂依赖（省略时使用默认值）
 * @returns 权限仓储实例
 */
export function createPermissionsRepository(
  input: PermissionsRepositoryFactoryInput = {},
): PermissionsRepository {
  const request = input.request ?? getDefaultRequest();
  const getToken = input.getToken ?? getRegisteredToken;
  const apiBase = input.apiBase ?? "/api/users";

  return {
    async fetchMyPermissions(): Promise<MyPermissionsResponse> {
      const token = getToken();
      const response = await request(`${apiBase}/me/permissions`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        return { permissions: [], role: "", userId: "" };
      }

      const body: unknown = await response.json();
      return adaptResponse(body) ?? { permissions: [], role: "", userId: "" };
    },
  };
}
