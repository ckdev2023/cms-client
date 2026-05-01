const LABEL_ALIASES: Record<string, string> = {
  "経営・管理": "business_manager",
  経営管理: "business_manager",
  "技術・人文知識・国際業務": "engineer_humanities_intl_visa",
  家族滞在: "dependent_visa",
};

/**
 * server payload_snapshot.statusOfResidence 字面量 → caseTypes typeCode 反向映射。
 * 已知 ja-JP 標签命中返 typeCode；未命中返 null。
 *
 * @param raw - server 端原始在留资格标签文本。
 * @returns 匹配到的 typeCode；未命中返回 null。
 */
export function residenceLabelToCode(raw: string): string | null {
  return LABEL_ALIASES[raw.trim()] ?? null;
}
