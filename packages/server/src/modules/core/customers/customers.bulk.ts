import { BadRequestException } from "@nestjs/common";
import type { Pool } from "pg";

import type { Customer } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import type { TimelineWriteInput } from "../timeline/timeline.service";
import type { CustomerQueryRow } from "./customers.types";
import {
  CUSTOMER_COLS,
  activeCustomerPredicate,
  getCustomerOwnerUserId,
  normalizeDistinctIds,
  normalizeOptionalString,
  validateBaseProfile,
} from "./customers.utils";

type TimelineWriter = {
  write: (ctx: RequestContext, input: TimelineWriteInput) => Promise<void>;
};

type CustomerBulkDeps = {
  ctx: RequestContext;
  customerIds: string[];
  pool: Pool;
  timelineService: TimelineWriter;
  getByIds: (ctx: RequestContext, ids: string[]) => Promise<Customer[]>;
};

/**
 * 批量调整客户负责人。
 * @param root0 批量操作依赖。
 * @param root0.ctx 请求上下文。
 * @param root0.customerIds 客户 ID 集合。
 * @param root0.pool PostgreSQL 连接池。
 * @param root0.timelineService 用于写入 Timeline 事件的服务。
 * @param root0.getByIds 用于按 ID 读取客户实体的函数。
 * @param ownerUserId 新负责人 ID。
 * @returns 成功更新的客户数量。
 */
export async function bulkAssignOwner(
  { ctx, customerIds, pool, timelineService, getByIds }: CustomerBulkDeps,
  ownerUserId: string,
): Promise<number> {
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);
  const normalizedIds = normalizeDistinctIds(customerIds, "customerIds");
  const customers = await getByIds(ctx, normalizedIds);
  assertCustomersFound(customers, normalizedIds);
  for (const customer of customers) {
    const nextBaseProfile = validateBaseProfile(customer.type, {
      ...customer.baseProfile,
      owner_user_id: ownerUserId,
    });
    await updateCustomerBaseProfile(
      tenantDb,
      customer.id,
      nextBaseProfile,
      "Failed to assign owner to customer",
    );
    await timelineService.write(ctx, {
      entityType: "customer",
      entityId: customer.id,
      action: "customer.owner_assigned",
      payload: {
        beforeOwnerUserId: getCustomerOwnerUserId(customer),
        afterOwnerUserId: ownerUserId,
      },
    });
  }
  return customers.length;
}

/**
 * 批量调整客户分组。
 * @param root0 批量操作依赖。
 * @param root0.ctx 请求上下文。
 * @param root0.customerIds 客户 ID 集合。
 * @param root0.pool PostgreSQL 连接池。
 * @param root0.timelineService 用于写入 Timeline 事件的服务。
 * @param root0.getByIds 用于按 ID 读取客户实体的函数。
 * @param group 新分组编码。
 * @returns 成功更新的客户数量。
 */
export async function bulkChangeGroup(
  { ctx, customerIds, pool, timelineService, getByIds }: CustomerBulkDeps,
  group: string,
): Promise<number> {
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);
  const normalizedIds = normalizeDistinctIds(customerIds, "customerIds");
  const customers = await getByIds(ctx, normalizedIds);
  assertCustomersFound(customers, normalizedIds);
  for (const customer of customers) {
    const beforeGroup = normalizeOptionalString(customer.baseProfile.group);
    const nextBaseProfile = validateBaseProfile(customer.type, {
      ...customer.baseProfile,
      group,
    });
    await updateCustomerBaseProfile(
      tenantDb,
      customer.id,
      nextBaseProfile,
      "Failed to change customer group",
    );
    await timelineService.write(ctx, {
      entityType: "customer",
      entityId: customer.id,
      action: "customer.group_changed",
      payload: {
        beforeGroup,
        afterGroup: group,
      },
    });
  }
  return customers.length;
}

function assertCustomersFound(
  customers: Customer[],
  normalizedIds: string[],
): void {
  if (customers.length !== normalizedIds.length) {
    throw new BadRequestException("Some customers were not found or deleted");
  }
}

async function updateCustomerBaseProfile(
  tenantDb: ReturnType<typeof createTenantDb>,
  customerId: string,
  nextBaseProfile: Customer["baseProfile"],
  errorMessage: string,
): Promise<void> {
  const result = await tenantDb.query<CustomerQueryRow>(
    `
      update customers
      set base_profile = $2::jsonb,
          updated_at = now()
      where id = $1 and ${activeCustomerPredicate()}
      returning ${CUSTOMER_COLS}
    `,
    [customerId, JSON.stringify(nextBaseProfile)],
  );
  if (!result.rows.at(0)) {
    throw new BadRequestException(errorMessage);
  }
}
