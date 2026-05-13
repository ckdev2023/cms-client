import { BadRequestException } from "@nestjs/common";
import { Pool } from "pg";

import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";

/**
 * Gate-C：案件仍存在未完结 task 时阻止进入提出済み（S7）。
 *
 * @param pool - 数据库连接池
 * @param ctx - 租户请求上下文
 * @param caseId - 案件 ID
 */
export async function assertGateCNoOpenCaseTasks(
  pool: Pool,
  ctx: RequestContext,
  caseId: string,
): Promise<void> {
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);
  const result = await tenantDb.query<{ id: string }>(
    `
      select id from tasks
      where org_id = $1 and case_id = $2
        and status not in ('completed', 'cancelled')
      limit 1
    `,
    [ctx.orgId, caseId],
  );
  if (result.rows.at(0)) {
    throw new BadRequestException(
      `${CASE_WRITE_ERROR_CODES.GATE_C_OPEN_TASKS}: S6→S7 requires all case tasks to be completed or cancelled before formal submission`,
    );
  }
}
