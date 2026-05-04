var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
      return Reflect.metadata(k, v);
  };
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { createTenantDb } from "../tenancy/tenantDb";
const VALID_STATUSES = new Set(["due", "partial", "paid", "overdue"]);
/**
 * 全组织收费汇总 service（§2.2）。
 */
let BillingSummaryService = class BillingSummaryService {
  pool;
  /**
   * 初始化全组织收费汇总 service。
   *
   * @param pool - PostgreSQL 连接池
   */
  constructor(pool) {
    this.pool = pool;
  }
  /**
   * 获取全组织收费汇总四指标。
   *
   * @param ctx - 请求上下文
   * @param input - 可选过滤
   * @param nowOverride - 测试注入：替换 overdue 判定中的 now()
   * @returns BillingListSummaryDto
   */
  async getSummary(ctx, input = {}, nowOverride) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const where = [];
    const params = [];
    applyFilters(where, params, input);
    const whereClause = where.length > 0 ? `where ${where.join(" and ")}` : "";
    const nowIdx = params.length + 1;
    const nowExpr = nowOverride ? `$${String(nowIdx)}::timestamptz` : "now()";
    if (nowOverride) params.push(nowOverride);
    const sql = `
      select
        coalesce(sum(br.amount_due), 0) as total_due,
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
    const result = await tenantDb.query(sql, params);
    const row = result.rows[0];
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
};
BillingSummaryService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __metadata("design:paramtypes", [Pool]),
  ],
  BillingSummaryService,
);
export { BillingSummaryService };
function applyFilters(where, params, input) {
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
    params.push(`%${input.q.toLowerCase()}%`);
    const qi = `$${String(params.length)}`;
    where.push(
      `(lower(c.case_no) like ${qi} or lower(c.case_name) like ${qi} or lower(cu.base_profile->>'displayName') like ${qi} or lower(br.milestone_name) like ${qi})`,
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
//# sourceMappingURL=billingSummary.service.js.map
