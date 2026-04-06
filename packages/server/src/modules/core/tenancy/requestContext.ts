import type { Role } from "../auth/roles";
import crypto from "node:crypto";

import { isUuid } from "./uuid";

/**
 * 请求上下文（租户边界 + 身份 + 角色）。
 */
export type RequestContext = {
  orgId: string;
  userId: string;
  role: Role;
};

/**
 * 鉴权输入：用于从请求里提取 orgId/userId（role 以 DB 为准）。
 */
export type RequestAuthInput = {
  orgId: string;
  userId: string;
};

declare module "http" {
  interface IncomingMessage {
    requestContext?: RequestContext;
    requestAuthInput?: RequestAuthInput;
  }
}

type AuthConfig = {
  jwtSecret?: string;
  allowInsecureHeaders: boolean;
};

/**
 * 从请求头解析 RequestContext。
 *
 * 约束：
 * - 目前使用 header 传递身份信息，后续可替换为 JWT/session
 *
 * @param headers 请求头
 * @returns 上下文或 null
 */
export function parseRequestContext(headers: Record<string, unknown>): {
  orgId: string | null;
  userId: string | null;
  role: unknown;
} {
  const orgId =
    typeof headers["x-org-id"] === "string" ? headers["x-org-id"] : null;
  const userId =
    typeof headers["x-user-id"] === "string" ? headers["x-user-id"] : null;
  const role = headers["x-role"];

  return { orgId, userId, role };
}

let _cachedAuthConfig: AuthConfig | null = null;

/**
 * 从环境变量读取鉴权配置（模块级缓存，进程内只解析一次）。
 *
 * @returns 鉴权配置
 */
export function readAuthConfigFromEnv(): AuthConfig {
  if (_cachedAuthConfig) return _cachedAuthConfig;

  const jwtSecretRaw = process.env.AUTH_JWT_SECRET;
  const jwtSecret =
    jwtSecretRaw && jwtSecretRaw.length > 0 ? jwtSecretRaw : undefined;

  // P8: 生产环境要求 JWT 密钥至少 32 字符（256 bit）
  if (
    process.env.NODE_ENV === "production" &&
    jwtSecret !== undefined &&
    jwtSecret.length < 32
  ) {
    throw new Error(
      "AUTH_JWT_SECRET must be at least 32 characters in production",
    );
  }

  const allowRaw = process.env.AUTH_ALLOW_INSECURE_HEADERS;
  const allowInsecureHeaders =
    allowRaw === "1" || allowRaw === "true" || allowRaw === "yes";

  _cachedAuthConfig = { jwtSecret, allowInsecureHeaders };
  return _cachedAuthConfig;
}

/**
 * 仅用于测试：重置 AuthConfig 缓存。
 *
 * @internal
 */
export function _resetAuthConfigCacheForTest(): void {
  _cachedAuthConfig = null;
}

/**
 * 从请求头提取并校验鉴权输入。
 *
 * 支持：
 * - Authorization: Bearer <JWT>（HS256）
 * - 开发兜底：当 allowInsecureHeaders=true 时允许 x-org-id/x-user-id
 *
 * @param headers 请求头
 * @param config 鉴权配置
 * @returns 鉴权输入或 null
 */
export function parseVerifiedRequestAuthInputFromHeaders(
  headers: Record<string, unknown> | undefined,
  config: AuthConfig,
): RequestAuthInput | null {
  if (!headers) return null;

  const authHeader =
    typeof headers.authorization === "string"
      ? headers.authorization
      : typeof headers.Authorization === "string"
        ? headers.Authorization
        : null;

  if (authHeader) {
    const token = parseBearerToken(authHeader);
    if (!token) return null;
    if (!config.jwtSecret) return null;
    return verifyHs256Jwt(token, config.jwtSecret);
  }

  if (!config.allowInsecureHeaders) return null;
  const parsed = parseRequestContext(headers);
  if (!parsed.orgId || !parsed.userId) return null;
  if (!isUuid(parsed.orgId) || !isUuid(parsed.userId)) return null;
  return { orgId: parsed.orgId, userId: parsed.userId };
}

function parseBearerToken(value: string): string | null {
  const trimmed = value.trim();
  const prefix = "Bearer ";
  if (!trimmed.startsWith(prefix)) return null;
  const token = trimmed.slice(prefix.length).trim();
  return token.length > 0 ? token : null;
}

function verifyHs256Jwt(
  token: string,
  secret: string,
): RequestAuthInput | null {
  const parts = parseJwtParts(token);
  if (!parts) return null;

  const header = decodeBase64UrlJsonObject(parts.headerB64);
  if (!header) return null;
  if (header.alg !== "HS256") return null;

  const signingInput = `${parts.headerB64}.${parts.payloadB64}`;
  if (!verifyHs256Signature(signingInput, secret, parts.sigB64)) return null;

  const payload = decodeBase64UrlJsonObject(parts.payloadB64);
  if (!payload) return null;

  return extractAuthInputFromPayload(payload);
}

function parseJwtParts(token: string): {
  headerB64: string;
  payloadB64: string;
  sigB64: string;
} | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  if (!headerB64 || !payloadB64 || !sigB64) return null;
  return { headerB64, payloadB64, sigB64 };
}

function decodeBase64UrlJsonObject(
  value: string,
): Record<string, unknown> | null {
  const json = base64UrlDecodeToString(value);
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return null;
  return parsed as Record<string, unknown>;
}

function verifyHs256Signature(
  signingInput: string,
  secret: string,
  sigB64: string,
): boolean {
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64url");
  return timingSafeEqualString(expectedSig, sigB64);
}

/**
 * 从 JWT payload 提取鉴权输入，并校验有效性。
 *
 * @param payload JWT payload
 * @returns 鉴权输入或 null
 */
// eslint-disable-next-line complexity
export function extractAuthInputFromPayload(
  payload: Record<string, unknown>,
): RequestAuthInput | null {
  const orgId = typeof payload.orgId === "string" ? payload.orgId : null;
  const userId = typeof payload.userId === "string" ? payload.userId : null;
  const exp = typeof payload.exp === "number" ? payload.exp : null;
  const nbf = typeof payload.nbf === "number" ? payload.nbf : null;

  if (!orgId || !userId || !isUuid(orgId) || !isUuid(userId)) return null;
  if (!exp || !Number.isFinite(exp)) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec >= exp) return null;

  // nbf（Not Before）：若 token 声明了此字段，当前时间必须已过 nbf
  if (nbf !== null && Number.isFinite(nbf) && nowSec < nbf) return null;

  return { orgId, userId };
}

function base64UrlDecodeToString(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function timingSafeEqualString(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}
