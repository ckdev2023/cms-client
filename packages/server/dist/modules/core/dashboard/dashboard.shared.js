/**
 * manager / owner は管理者ロールとみなす。
 *
 * @param role ユーザーロール文字列。
 * @returns manager または owner の場合 true。
 */
export function isManagerRole(role) {
  return role === "manager" || role === "owner";
}
/**
 * 向 SQL 参数数组追加一个参数并返回其占位符。
 *
 * @param params SQL 参数数组。
 * @param value 待追加的参数值。
 * @returns PostgreSQL 占位符字符串。
 */
export function pushParam(params, value) {
  params.push(value);
  return `$${String(params.length)}`;
}
/**
 * 生成 group 过滤的 SQL 片段。
 *
 * `scope=group` 时用 `groupId` 限定 `cases.group_id`；其他 scope 返回空。
 *
 * @param scope 当前查询范围。
 * @param groupId 当前选中 group ID（仅 scope=group 时有效）。
 * @param params SQL 参数数组。
 * @param alias 案件表别名。
 * @returns 可拼接到 `where` 子句中的 SQL 片段。
 */
export function buildGroupClause(scope, groupId, params, alias = "c") {
  if (scope !== "group" || !groupId) return "";
  const ph = pushParam(params, groupId);
  return `and ${alias}.group_id = ${ph}`;
}
/**
 * 生成案件相关查询的范围过滤片段。
 *
 * @param scope 当前查询范围。
 * @param userId 当前登录用户 ID。
 * @param params SQL 参数数组。
 * @param alias 案件表别名。
 * @returns 可拼接到 `where` 子句中的 SQL 片段。
 */
export function buildCaseScopeClause(scope, userId, params, alias = "c") {
  if (scope !== "mine") return "";
  const userParam = pushParam(params, userId);
  return `and (${alias}.owner_user_id = ${userParam} or ${alias}.assistant_user_id = ${userParam})`;
}
/**
 * 生成任务相关查询的范围过滤片段。
 *
 * @param scope 当前查询范围。
 * @param userId 当前登录用户 ID。
 * @param params SQL 参数数组。
 * @param taskAlias 任务表别名。
 * @param caseAlias 案件表别名。
 * @returns 可拼接到 `where` 子句中的 SQL 片段。
 */
export function buildTaskScopeClause(
  scope,
  userId,
  params,
  taskAlias = "t",
  caseAlias = "c",
) {
  if (scope !== "mine") return "";
  const userParam = pushParam(params, userId);
  return `and (
    ${taskAlias}.assignee_user_id = ${userParam}
    or ${caseAlias}.owner_user_id = ${userParam}
    or ${caseAlias}.assistant_user_id = ${userParam}
  )`;
}
/**
 * 从聚合查询结果中读取数字计数。
 *
 * @param rows 数据库返回的计数行。
 * @returns 规范化后的数字计数。
 */
export function readCount(rows) {
  const raw = rows[0]?.count ?? 0;
  const count = Number(raw);
  return Number.isFinite(count) ? count : 0;
}
//# sourceMappingURL=dashboard.shared.js.map
