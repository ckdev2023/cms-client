/**
 * customers 表客户显示名 SQL 表达式（公用，避免跨模块漂移）。
 *
 * customers 表无 `name` 列，只有 `base_profile jsonb`；
 * 该表达式按优先级从 jsonb 中取第一个非空名称。
 *
 * @param alias - customers 表别名，默认 `cu`
 * @returns SQL 表达式字符串
 */
export function customerNameExpr(alias = "cu"): string {
  return `coalesce(
  nullif(trim(${alias}.base_profile->>'displayName'), ''),
  nullif(trim(${alias}.base_profile->>'display_name'), ''),
  nullif(trim(${alias}.base_profile->>'name'), ''),
  nullif(trim(${alias}.base_profile->>'name_cn'), ''),
  nullif(trim(${alias}.base_profile->>'name_en'), ''),
  nullif(trim(${alias}.base_profile->>'name_jp'), ''),
  ''
)`;
}
