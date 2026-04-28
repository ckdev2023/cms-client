import { BadRequestException } from "@nestjs/common";
import type { Pool } from "pg";

import type { Customer } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import {
  createDefaultCustomerBmvProfile,
  resolveCustomerBmvProfile,
} from "./customers.dto-mappers";
import type { CustomerBmvProfile, CustomerQueryRow } from "./customers.types";
import {
  CUSTOMER_COLS,
  activeCustomerPredicate,
  mapCustomerRow,
} from "./customers.utils";

type CustomerBmvProfilePatch = Partial<
  Omit<CustomerBmvProfile, "intakeStatus">
>;

/**
 * 写入 bmvProfile 补丁到客户 base_profile。
 * @param pool - PostgreSQL 连接池。
 * @param ctx - 请求上下文。
 * @param id - 客户 ID。
 * @param currentProfile - 当前 bmvProfile 状态。
 * @param patch - 要合并的补丁字段。
 * @returns 更新后的客户实体。
 */
export async function patchBmvProfile(
  pool: Pool,
  ctx: RequestContext,
  id: string,
  currentProfile: CustomerBmvProfile,
  patch: CustomerBmvProfilePatch,
): Promise<Customer> {
  const nextProfile =
    resolveCustomerBmvProfile({
      bmvProfile: { ...currentProfile, ...patch },
    }) ?? createDefaultCustomerBmvProfile();
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);
  const result = await tenantDb.query<CustomerQueryRow>(
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
export function getCurrentBmvProfile(customer: Customer): CustomerBmvProfile {
  return (
    resolveCustomerBmvProfile(customer.baseProfile) ??
    createDefaultCustomerBmvProfile()
  );
}
