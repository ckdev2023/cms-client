/**
 * base_profile から顧客名を抽出する。
 *
 * fallback 順序: name → familyName+givenName → lastName+firstName → null
 *
 * @param baseProfile base_profile JSON
 * @returns 顧客名、取得不可時は null
 */
export function extractCustomerName(baseProfile: unknown): string | null {
  if (!baseProfile || typeof baseProfile !== "object") return null;
  const bp = baseProfile as Record<string, unknown>;

  if (typeof bp.name === "string" && bp.name.trim()) return bp.name;

  if (typeof bp.familyName === "string") {
    const given = typeof bp.givenName === "string" ? bp.givenName : "";
    const full = `${bp.familyName} ${given}`.trim();
    if (full) return full;
  }

  if (typeof bp.lastName === "string") {
    const first = typeof bp.firstName === "string" ? bp.firstName : "";
    const full = `${bp.lastName} ${first}`.trim();
    if (full) return full;
  }

  return null;
}
