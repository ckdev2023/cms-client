function decodeBase64UrlToString(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    return atob(`${normalized}${padding}`);
  } catch {
    return null;
  }
}

/**
 * JWT 的 `exp` 字段（秒）转换为毫秒时间戳；无法解析时返回 `null`。
 *
 * @param token - JWT 字符串
 * @returns 过期时间毫秒或 `null`
 */
export function readTokenExpiryMs(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const payloadText = decodeBase64UrlToString(parts[1] ?? "");
  if (!payloadText) return null;

  try {
    const payload = JSON.parse(payloadText) as { exp?: unknown };
    return typeof payload.exp === "number" && Number.isFinite(payload.exp)
      ? payload.exp * 1000
      : null;
  } catch {
    return null;
  }
}
