import { createTenantDb } from "../tenancy/tenantDb";
import { buildCustomerDetailSelect } from "./customers.query";
import { activeCustomerPredicate, mapCustomerRow } from "./customers.utils";
/**
 * 创建 BMV 流程依赖对象。
 * @param pool PostgreSQL 连接池。
 * @param timelineService Timeline 服务。
 * @param ctx 请求上下文。
 * @param id 客户 ID。
 * @returns BMV 操作所需依赖集合。
 */
export function createCustomerBmvDeps(pool, timelineService, ctx, id) {
  return {
    ctx,
    id,
    pool,
    timelineService,
    getEntity: (requestContext, customerId) =>
      getCustomerEntity(requestContext, customerId, pool),
  };
}
/**
 * 读取客户实体。
 * @param ctx 请求上下文。
 * @param id 客户 ID。
 * @param pool PostgreSQL 连接池。
 * @returns 客户实体；不存在时返回 `null`。
 */
export async function getCustomerEntity(ctx, id, pool) {
  const row = await getCustomerRowById(ctx, id, pool);
  return row ? mapCustomerRow(row) : null;
}
/**
 * 按 ID 查询客户详情行。
 * @param ctx 请求上下文。
 * @param id 客户 ID。
 * @param pool PostgreSQL 连接池。
 * @returns 客户查询行；不存在时返回 `null`。
 */
export async function getCustomerRowById(ctx, id, pool) {
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);
  const result = await tenantDb.query(
    `select ${buildCustomerDetailSelect("c")} from customers c
     where c.id = $1 and ${activeCustomerPredicate("c")} limit 1`,
    [id],
  );
  return result.rows.at(0) ?? null;
}
//# sourceMappingURL=customers.service.deps.js.map
