/**
 *
 */
export type CaseMessageChipTone = "neutral" | "primary" | "success" | "warning";

export const CASE_MESSAGE_CHIP_TONE_MAP: Record<string, CaseMessageChipTone> = {
  internal: "success",
  client_visible: "warning",
  phone: "primary",
  meeting: "primary",
  auto_email: "neutral",
};

const MESSAGE_AVATAR_BG: Record<string, string> = {
  primary: "var(--color-primary-6)",
  success: "var(--color-success, #22c55e)",
  warning: "#f59e0b",
  surface: "var(--color-bg-3)",
};

/**
 * 头像背景色。
 * @param style - 头像样式键。
 * @returns 用于背景的 CSS 颜色字符串。
 */
export function caseMessageAvatarBg(style: string): string {
  return MESSAGE_AVATAR_BG[style] ?? "var(--color-primary-6)";
}

/**
 * 头像前景（文字）色。
 * @param style - 头像样式键。
 * @returns 用于文字着色的 CSS 颜色字符串。
 */
export function caseMessageAvatarColor(style: string): string {
  return style === "surface" ? "var(--color-text-2)" : "#fff";
}
