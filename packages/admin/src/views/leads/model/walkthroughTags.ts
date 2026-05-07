/**
 * Walkthrough / QA / 临时调试残留 tag 的客户端兜底过滤口径，与 server 端
 * `packages/server/src/modules/portal/model/walkthroughTags.ts` 保持一致。
 *
 * 命中规则：以 `R<数字>-`、`R<数字>_`、`test-`、`test_`、`mcp-`、`mcp_`、
 * `tmp-`、`tmp_` 开头（大小写不敏感）。这些标签来自 chrome-devtools-mcp
 * 走查、临时手测灌库等内部场景，运营/客户都不该看到。
 *
 * 服务端在 `mapLeadRow` 出口已经过滤一次；这里在 admin 适配层再做一次
 * 兜底，避免任何上游疏漏（脏数据、未来 R6 / R7 / test-* 等新串）泄漏到
 * 列表 chip / 详情 chip / 筛选选项里。
 */
const WALKTHROUGH_TAG_PATTERN = /^(R\d+|test|mcp|tmp)[-_]/i;

/**
 * 过滤掉 walkthrough / QA 测试模式 tag，保留真实业务 tag。
 *
 * @param tags - 原始 tag 数组（保持原顺序、不去重）
 * @returns 已剥离 walkthrough 模式后的 tag 数组
 */
export function sanitizeWalkthroughTags(tags: readonly string[]): string[] {
  return tags.filter((t) => !WALKTHROUGH_TAG_PATTERN.test(t));
}
