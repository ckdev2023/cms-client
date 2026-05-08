/**
 * customers 表客户显示名 SQL 表达式（公用，避免跨模块漂移）。
 *
 * customers 表无 `name` 列，只有 `base_profile jsonb`；
 * 该表达式按优先级从 jsonb 中取第一个非空名称。
 *
 * 字段顺序与 `CUSTOMER_NAME_FIELDS` (customers.utils.ts) /
 * `resolveDisplayName` (customers.dto-mappers.ts) 保持一致，避免
 * SQL 聚合（如 `buildCaseNamesExpr`）和 TS DTO 在「客户没有 displayName /
 * legalName，仅写入 name_jp / name_cn」场景下双源漂移。
 *
 * 典型场景：`leads.admin.convert.convertLeadToCustomer` 仅写入
 * `name_jp` / `name_cn`，未写 `displayName` / `legalName`，导致
 * `buildCaseNamesExpr` 的客户名前缀为空、最终降级到只显示
 * `case_type_code`（如 `dependent_visa`）。
 *
 * @param alias - customers 表别名，默认 `cu`
 * @returns SQL 表达式字符串
 */
export function customerNameExpr(alias = "cu"): string {
  return `coalesce(
  nullif(trim(${alias}.base_profile->>'displayName'), ''),
  nullif(trim(${alias}.base_profile->>'display_name'), ''),
  nullif(trim(${alias}.base_profile->>'legalName'), ''),
  nullif(trim(${alias}.base_profile->>'legal_name'), ''),
  nullif(trim(${alias}.base_profile->>'name'), ''),
  nullif(trim(${alias}.base_profile->>'name_cn'), ''),
  nullif(trim(${alias}.base_profile->>'name_en'), ''),
  nullif(trim(${alias}.base_profile->>'name_jp'), ''),
  ''
)`;
}
