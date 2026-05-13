import type { TeamMember } from "../types-detail";
import {
  readNullableString,
  readString,
  stripBracketPrefixesForInitials,
} from "./CaseAdapterShared";

const TEAM_GRADIENT_OWNER = "from-[var(--primary)] to-[var(--primary-hover)]";
const TEAM_GRADIENT_ASSISTANT = "from-[var(--success)] to-[#28a745]";

function deriveInitials(name: string): string {
  const cleaned = stripBracketPrefixesForInitials(name);
  const parts = cleaned.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase() || "??";
}

/**
 * deep-link データから TeamMember 列表を構築する。
 *
 * @param dl - deep-link 原始数据
 * @returns TeamMember 列表
 */
export function buildTeamFromDeepLink(
  dl: Record<string, unknown> | null,
): TeamMember[] {
  if (!dl) return [];
  const ownerName = readString(dl, "ownerDisplayName");
  const assistantName = readNullableString(dl, "assistantDisplayName");
  const members: TeamMember[] = [];
  if (ownerName) {
    members.push({
      initials: deriveInitials(ownerName),
      name: ownerName,
      role: "cases.detail.overview.sidebar.teamRoleOwner",
      subtitle: "",
      gradient: TEAM_GRADIENT_OWNER,
    });
  }
  if (assistantName) {
    members.push({
      initials: deriveInitials(assistantName),
      name: assistantName,
      role: "cases.detail.overview.sidebar.teamRoleAssistant",
      subtitle: "",
      gradient: TEAM_GRADIENT_ASSISTANT,
    });
  }
  return members;
}
