import { BadRequestException } from "@nestjs/common";
import { createTenantDb } from "../tenancy/tenantDb";
import { resolveCustomerBmvProfile } from "./customers.dto-mappers";
import {
  CUSTOMER_COLS,
  activeCustomerPredicate,
  mapCustomerRow,
} from "./customers.utils";
/**
 * 写入 bmvProfile 补丁到客户 base_profile。
 * @param pool - PostgreSQL 连接池。
 * @param ctx - 请求上下文。
 * @param id - 客户 ID。
 * @param currentProfile - 当前 bmvProfile 状态。
 * @param patch - 要合并的补丁字段。
 * @returns 更新后的客户实体。
 */
export async function patchBmvProfile(pool, ctx, id, currentProfile, patch) {
  const nextProfile = resolveCustomerBmvProfile({
    bmvProfile: { ...currentProfile, ...patch },
  });
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);
  const result = await tenantDb.query(
    `update customers
     set base_profile = jsonb_set(
           coalesce(base_profile, '{}'::jsonb) - 'bmv_profile',
           '{bmvProfile}', $2::jsonb, true),
         updated_at = now()
     where id = $1 and ${activeCustomerPredicate()}
     returning ${CUSTOMER_COLS}`,
    [id, JSON.stringify(nextProfile)],
  );
  const row = result.rows.at(0);
  if (!row)
    throw new BadRequestException("Failed to update customer BMV state");
  return mapCustomerRow(row);
}
/**
 * 从客户实体中提取 BMV Profile，不存在时返回默认值。
 * @param customer - 客户实体。
 * @returns 当前 BMV Profile。
 */
export function getCurrentBmvProfile(customer) {
  return resolveCustomerBmvProfile(customer.baseProfile);
}
//# sourceMappingURL=customers.bmv-patch.js.map
