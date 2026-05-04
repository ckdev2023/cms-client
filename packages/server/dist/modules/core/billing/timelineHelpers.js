/**
 * 在事务内写入 timeline_logs（billing 模块共享）。
 *
 * @param tx - 事务连接
 * @param ctx - 请求上下文
 * @param input - timeline 写入参数
 */
export async function writeTimelineInTx(tx, ctx, input) {
  await tx.query(
    `insert into timeline_logs(org_id, entity_type, entity_id, action, actor_user_id, payload)
     values ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      ctx.orgId,
      input.entityType,
      input.entityId,
      input.action,
      ctx.userId,
      JSON.stringify(input.payload),
    ],
  );
}
//# sourceMappingURL=timelineHelpers.js.map
