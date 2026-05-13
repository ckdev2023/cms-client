import type { RelatedParty } from "../types-detail";
import {
  readString,
  stripBracketPrefixesForInitials,
} from "./CaseAdapterShared";

const ROLE_PRIMARY_APPLICANT = "cases.detail.info.relatedParties.rolePrimary";
const AVATAR_STYLE_GRADIENT = "gradient";

function deriveInitials(name: string): string {
  const cleaned = stripBracketPrefixesForInitials(name);
  const parts = cleaned.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase() || "??";
}

/**
 * deep-link から主申請人（＝顧客）を RelatedParty として構築する。
 *
 * 後続の case-parties adapter で扶養者/保証人/雇主等を追加予定。
 *
 * @param dl - deep-link レコード（null 許容）
 * @returns 主申請人の RelatedParty 配列
 */
export function buildRelatedPartiesFromDeepLink(
  dl: Record<string, unknown> | null,
): RelatedParty[] {
  if (!dl) return [];
  const customerName = readString(dl, "customerName");
  if (!customerName) return [];
  return [
    {
      initials: deriveInitials(customerName),
      name: customerName,
      role: ROLE_PRIMARY_APPLICANT,
      detail: "",
      avatarStyle: AVATAR_STYLE_GRADIENT,
    },
  ];
}
