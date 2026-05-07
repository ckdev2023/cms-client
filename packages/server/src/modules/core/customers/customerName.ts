function readNonEmpty(bp: Record<string, unknown>, key: string): string | null {
  const v = bp[key];
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed ? trimmed : null;
}

function readPaired(
  bp: Record<string, unknown>,
  primary: string,
  secondary: string,
): string | null {
  const head = bp[primary];
  if (typeof head !== "string") return null;
  const tail = bp[secondary];
  const tailStr = typeof tail === "string" ? tail : "";
  const full = `${head} ${tailStr}`.trim();
  return full ? full : null;
}

/**
 * base_profile から顧客名を抽出する。
 *
 * fallback 順序: name → familyName+givenName → lastName+firstName → fullName → displayName → null
 *
 * @param baseProfile base_profile JSON
 * @returns 顧客名、取得不可時は null
 */
export function extractCustomerName(baseProfile: unknown): string | null {
  if (!baseProfile || typeof baseProfile !== "object") return null;
  const bp = baseProfile as Record<string, unknown>;
  return (
    readNonEmpty(bp, "name") ??
    readPaired(bp, "familyName", "givenName") ??
    readPaired(bp, "lastName", "firstName") ??
    readNonEmpty(bp, "fullName") ??
    readNonEmpty(bp, "displayName")
  );
}
