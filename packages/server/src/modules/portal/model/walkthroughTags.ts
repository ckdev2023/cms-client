/**
 * Walkthrough / QA / 临时调试残留 tag 的公共过滤口径。
 *
 * 命中规则：以 `R<数字>-`、`R<数字>_`、`test-`、`test_`、`mcp-`、`mcp_`、
 * `tmp-`、`tmp_` 开头（大小写不敏感）。这些标签只用于 chrome-devtools-mcp
 * 走查、临时手测灌库等内部场景，对运营/客户没有任何业务含义；为了避免
 * 「R5-walk」之类的串泄漏到 admin / portal UI，这里在读取出口统一兜底。
 *
 * SQL 同义模式（PostgreSQL POSIX `~*`）：`^(R[0-9]+|test|mcp|tmp)[-_]`，
 * 与 `seedTagsCleanup` 的清理子句保持一致。
 */
export const WALKTHROUGH_TAG_PATTERN = /^(R\d+|test|mcp|tmp)[-_]/i;

/**
 * 过滤掉 walkthrough / QA 测试模式 tag，保留真实业务 tag。
 *
 * @param tags - 原始 tag 数组（保持原顺序、不去重）
 * @returns 已剥离 walkthrough 模式后的 tag 数组
 */
export function sanitizeWalkthroughTags(tags: readonly string[]): string[] {
  return tags.filter((t) => !WALKTHROUGH_TAG_PATTERN.test(t));
}
