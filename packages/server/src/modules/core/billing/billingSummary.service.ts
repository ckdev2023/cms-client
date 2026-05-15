import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import type { BillingPlanStatus } from "../model/billingEntities";
import type { BillingListSummaryDto } from "../cases/cases.types-billing";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";

/** 全组织收费汇总查询入参。 */
export type BillingSummaryInput = {
  status?: BillingPlanStatus;
  groupId?: string;
  ownerId?: string;
  q?: string;
  from?: string;
  to?: string;
};

type SummaryRow = {
  total_due: string | number;
  total_received: string | number;
  overdue_amount: string | number;
};

const VALID_STATUSES: ReadonlySet<string> = new Set([
  "due",
  "partial",
  "paid",
  "overdue",
]);

/**
 * 全组织收费汇总 service（§2.2）。
 */
@Injectable()
export class BillingSummaryService {
  /**
   * 初始化全组织收费汇总 service。
   *
   * @param pool - PostgreSQL 连接池
   */
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  /**
   * 获取全组织收费汇总四指标。
   *
   * @param ctx - 请求上下文
   * @param input - 可选过滤
   * @param nowOverride - 测试注入：替换 overdue 判定中的 now()
   * @returns BillingListSummaryDto
   */
  async getSummary(
    ctx: RequestContext,
    input: BillingSummaryInput = {},
    nowOverride?: string,
  ): Promise<BillingListSummaryDto> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const where: string[] = [];
    const params: unknown[] = [];

    applyFilters(where, params, input);

    const whereClause = where.length > 0 ? `where ${where.join(" and ")}` : "";

    const nowIdx = params.length + 1;
    const nowExpr = nowOverride ? `$${String(nowIdx)}::timestamptz` : "now()";
    if (nowOverride) params.push(nowOverride);

    const sql = `
      select
        coalesce(sum(
          case
            when coalesce(br.amount_due, 0) > 0 then br.amount_due
            else coalesce(bp.paid, 0)
          end
        ), 0) as total_due,
        coalesce(sum(bp.paid), 0) as total_received,
        coalesce(sum(
          case when br.due_date < ${nowExpr}
               and br.status in ('due', 'partial', 'overdue')
          then br.amount_due - bp.paid
          else 0 end
        ), 0) as overdue_amount
      from billing_records br
      join cases c
        on c.id = br.case_id
        and coalesce(c.metadata->>'_status', '') is distinct from 'deleted'
      left join customers cu on cu.id = c.customer_id
      left join lateral (
        select coalesce(sum(pr.amount_received), 0) as paid
        from payment_records pr
        where pr.billing_record_id = br.id
          and pr.record_status = 'valid'
      ) bp on true
      ${whereClause}`;

    const result = await tenantDb.query<SummaryRow>(sql, params);
    const row = result.rows[0] as SummaryRow | undefined;

    const totalDue = Number(row?.total_due ?? 0);
    const totalReceived = Number(row?.total_received ?? 0);
    const overdueAmount = Number(row?.overdue_amount ?? 0);

    return {
      totalDue,
      totalReceived,
      totalOutstanding: Math.max(totalDue - totalReceived, 0),
      overdueAmount: Math.max(overdueAmount, 0),
    };
  }
}

function applyFilters(
  where: string[],
  params: unknown[],
  input: BillingSummaryInput,
): void {
  if (input.status) {
    if (!VALID_STATUSES.has(input.status)) return;
    params.push(input.status);
    where.push(`br.status = $${String(params.length)}`);
  }
  if (input.groupId) {
    params.push(input.groupId);
    where.push(`c.group_id = $${String(params.length)}`);
  }
  if (input.ownerId) {
    params.push(input.ownerId);
    where.push(`c.owner_user_id = $${String(params.length)}`);
  }
  if (input.q && input.q.length > 0) {
    const qNorm = input.q.trim().toLowerCase();
    params.push(qNorm);
    const exactCaseId = `$${String(params.length)}`;
    params.push(`%${qNorm}%`);
    const likePattern = `$${String(params.length)}`;
    where.push(
      `(lower(c.id::text) = ${exactCaseId} or lower(c.case_no) like ${likePattern} or lower(c.case_name) like ${likePattern} or lower(cu.base_profile->>'displayName') like ${likePattern} or lower(br.milestone_name) like ${likePattern})`,
    );
  }
  if (input.from) {
    params.push(input.from);
    where.push(`br.due_date >= $${String(params.length)}`);
  }
  if (input.to) {
    params.push(input.to);
    where.push(`br.due_date <= $${String(params.length)}`);
  }
}
