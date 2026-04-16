import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb, type TenantDbTx } from "../tenancy/tenantDb";
import {
  buildCaseScopeClause,
  buildTaskScopeClause,
  mapDeadlineItem,
  mapRiskItem,
  mapSubmissionItem,
  mapTodoItem,
  normalizeScope,
  readCount,
  type CountRow,
  type DashboardScope,
  type DashboardSummary,
  type DashboardTimeWindow,
  type DashboardWorkItem,
  type DeadlineRow,
  type RiskRow,
  type SubmissionRow,
  type TodoRow,
} from "./dashboard.shared";

type DashboardQueryScope = Exclude<DashboardScope, "group">;

type DashboardSummaryInput = {
  scope: DashboardScope;
  timeWindow: DashboardTimeWindow;
  limit?: number;
};

type DashboardLoadContext = {
  tx: TenantDbTx;
  orgId: string;
  userId: string;
  requestedScope: DashboardScope;
  queryScope: DashboardQueryScope;
  timeWindow: DashboardTimeWindow;
  limit: number;
};

/**
 * 聚合仪表盘摘要与面板数据的领域服务。
 */
@Injectable()
export class DashboardService {
  /**
   * 创建仪表盘服务。
   *
   * @param pool PostgreSQL 连接池。
   */
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  /**
   * 按当前租户与用户上下文加载仪表盘摘要。
   *
   * @param ctx 请求上下文，包含组织与用户信息。
   * @param input 查询条件，包含范围、时间窗口与数量限制。
   * @returns 仪表盘摘要与四类面板数据。
   */
  async getSummary(
    ctx: RequestContext,
    input: DashboardSummaryInput,
  ): Promise<DashboardSummary> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction((tx) =>
      this.buildDashboardSummary(this.createLoadContext(tx, ctx, input)),
    );
  }

  private createLoadContext(
    tx: TenantDbTx,
    ctx: RequestContext,
    input: DashboardSummaryInput,
  ): DashboardLoadContext {
    return {
      tx,
      orgId: ctx.orgId,
      userId: ctx.userId,
      requestedScope: input.scope,
      queryScope: normalizeScope(input.scope),
      timeWindow: input.timeWindow,
      limit: input.limit ?? 5,
    };
  }

  private async buildDashboardSummary(
    context: DashboardLoadContext,
  ): Promise<DashboardSummary> {
    return {
      scope: context.requestedScope,
      timeWindow: context.timeWindow,
      summary: await this.loadSummaryCounts(context),
      panels: await this.loadPanels(context),
    };
  }

  private async loadSummaryCounts(
    context: DashboardLoadContext,
  ): Promise<DashboardSummary["summary"]> {
    return {
      todayTasks: await this.loadTodayTasksCount(
        context.tx,
        context.orgId,
        context.queryScope,
        context.userId,
      ),
      upcomingCases: await this.loadUpcomingCasesCount(
        context.tx,
        context.orgId,
        context.queryScope,
        context.userId,
        context.timeWindow,
      ),
      pendingSubmissions: await this.loadPendingSubmissionsCount(
        context.tx,
        context.orgId,
        context.queryScope,
        context.userId,
      ),
      riskCases: await this.loadRiskCasesCount(
        context.tx,
        context.orgId,
        context.queryScope,
        context.userId,
      ),
    };
  }

  private async loadPanels(
    context: DashboardLoadContext,
  ): Promise<DashboardSummary["panels"]> {
    return {
      todo: await this.loadTodoItems(
        context.tx,
        context.orgId,
        context.queryScope,
        context.userId,
        context.limit,
      ),
      deadlines: await this.loadDeadlineItems(
        context.tx,
        context.orgId,
        context.queryScope,
        context.userId,
        context.timeWindow,
        context.limit,
      ),
      submissions: await this.loadSubmissionItems(
        context.tx,
        context.orgId,
        context.queryScope,
        context.userId,
        context.limit,
      ),
      risks: await this.loadRiskItems(
        context.tx,
        context.orgId,
        context.queryScope,
        context.userId,
        context.limit,
      ),
    };
  }

  private async loadTodayTasksCount(
    tx: TenantDbTx,
    orgId: string,
    scope: DashboardQueryScope,
    userId: string,
  ): Promise<number> {
    const params: unknown[] = [orgId];
    const scopeClause = buildTaskScopeClause(scope, userId, params);
    const result = await tx.query<CountRow>(
      `select count(*)::text as count
       from tasks t
       left join cases c on c.id = t.case_id and c.org_id = t.org_id
       where t.org_id = $1
         and t.status in ('pending', 'in_progress')
         and (c.id is null or c.archived_at is null)
         ${scopeClause}`,
      params,
    );
    return readCount(result.rows);
  }

  private async loadUpcomingCasesCount(
    tx: TenantDbTx,
    orgId: string,
    scope: DashboardQueryScope,
    userId: string,
    timeWindow: DashboardTimeWindow,
  ): Promise<number> {
    const params: unknown[] = [orgId, timeWindow];
    const scopeClause = buildCaseScopeClause(scope, userId, params);
    const result = await tx.query<CountRow>(
      `select count(*)::text as count
       from cases c
       where c.org_id = $1
         and c.archived_at is null
         and c.due_at is not null
         and c.due_at <= now() + make_interval(days => $2::int)
         ${scopeClause}`,
      params,
    );
    return readCount(result.rows);
  }

  private async loadPendingSubmissionsCount(
    tx: TenantDbTx,
    orgId: string,
    scope: DashboardQueryScope,
    userId: string,
  ): Promise<number> {
    const params: unknown[] = [orgId];
    const scopeClause = buildCaseScopeClause(scope, userId, params);
    const result = await tx.query<CountRow>(
      `select count(*)::text as count
       from cases c
       where c.org_id = $1
         and c.archived_at is null
         and coalesce(c.stage, c.status) = 'S6'
         ${scopeClause}`,
      params,
    );
    return readCount(result.rows);
  }

  private async loadRiskCasesCount(
    tx: TenantDbTx,
    orgId: string,
    scope: DashboardQueryScope,
    userId: string,
  ): Promise<number> {
    const params: unknown[] = [orgId];
    const scopeClause = buildCaseScopeClause(scope, userId, params);
    const result = await tx.query<CountRow>(
      `with latest_validation as (
         select distinct on (vr.case_id)
           vr.case_id,
           vr.result_status
         from validation_runs vr
         where vr.org_id = $1
         order by vr.case_id, vr.executed_at desc, vr.created_at desc
       )
       select count(*)::text as count
       from cases c
       left join latest_validation lv on lv.case_id = c.id
       where c.org_id = $1
         and c.archived_at is null
         and (
           c.risk_level = 'high'
           or c.billing_unpaid_amount_cached::numeric > 0
           or lv.result_status = 'failed'
         )
         ${scopeClause}`,
      params,
    );
    return readCount(result.rows);
  }

  private async loadTodoItems(
    tx: TenantDbTx,
    orgId: string,
    scope: DashboardQueryScope,
    userId: string,
    limit: number,
  ): Promise<DashboardWorkItem[]> {
    const params: unknown[] = [orgId, limit];
    const scopeClause = buildTaskScopeClause(scope, userId, params);
    const result = await tx.query<TodoRow>(
      `select
         t.id,
         t.title,
         t.case_id,
         c.case_no,
         c.case_name,
         u.name as assignee_name,
         t.due_at,
         t.priority,
         t.status
       from tasks t
       left join cases c on c.id = t.case_id and c.org_id = t.org_id
       left join users u on u.id = t.assignee_user_id and u.org_id = t.org_id
       where t.org_id = $1
         and t.status in ('pending', 'in_progress')
         and (c.id is null or c.archived_at is null)
         ${scopeClause}
       order by
         case when t.priority = 'high' then 0 when t.priority = 'normal' then 1 else 2 end,
         t.due_at nulls last,
         t.created_at desc
       limit $2`,
      params,
    );
    return result.rows.map(mapTodoItem);
  }

  private async loadDeadlineItems(
    tx: TenantDbTx,
    orgId: string,
    scope: DashboardQueryScope,
    userId: string,
    timeWindow: DashboardTimeWindow,
    limit: number,
  ): Promise<DashboardWorkItem[]> {
    const params: unknown[] = [orgId, timeWindow, limit];
    const scopeClause = buildCaseScopeClause(scope, userId, params);
    const result = await tx.query<DeadlineRow>(
      `select
         c.id,
         c.case_no,
         c.case_name,
         u.name as owner_name,
         c.due_at,
         coalesce(c.stage, c.status) as status,
         ceil(extract(epoch from (c.due_at - now())) / 86400.0)::int as days_left
       from cases c
       left join users u on u.id = c.owner_user_id and u.org_id = c.org_id
       where c.org_id = $1
         and c.archived_at is null
         and c.due_at is not null
         and c.due_at <= now() + make_interval(days => $2::int)
         ${scopeClause}
       order by c.due_at asc, c.updated_at desc
       limit $3`,
      params,
    );
    return result.rows.map(mapDeadlineItem);
  }

  private async loadSubmissionItems(
    tx: TenantDbTx,
    orgId: string,
    scope: DashboardQueryScope,
    userId: string,
    limit: number,
  ): Promise<DashboardWorkItem[]> {
    const params: unknown[] = [orgId, limit];
    const scopeClause = buildCaseScopeClause(scope, userId, params);
    const result = await tx.query<SubmissionRow>(
      `with latest_validation as (
         select distinct on (vr.case_id)
           vr.case_id,
           vr.result_status
         from validation_runs vr
         where vr.org_id = $1
         order by vr.case_id, vr.executed_at desc, vr.created_at desc
       ),
       latest_review as (
         select distinct on (rr.case_id)
           rr.case_id,
           rr.decision
         from review_records rr
         where rr.org_id = $1
         order by rr.case_id, rr.reviewed_at desc, rr.created_at desc
       )
       select
         c.id,
         c.case_no,
         c.case_name,
         u.name as owner_name,
         c.due_at,
         lv.result_status as validation_status,
         lr.decision as review_decision
       from cases c
       left join users u on u.id = c.owner_user_id and u.org_id = c.org_id
       left join latest_validation lv on lv.case_id = c.id
       left join latest_review lr on lr.case_id = c.id
       where c.org_id = $1
         and c.archived_at is null
         and coalesce(c.stage, c.status) = 'S6'
         ${scopeClause}
       order by c.due_at nulls last, c.updated_at desc
       limit $2`,
      params,
    );
    return result.rows.map(mapSubmissionItem);
  }

  private async loadRiskItems(
    tx: TenantDbTx,
    orgId: string,
    scope: DashboardQueryScope,
    userId: string,
    limit: number,
  ): Promise<DashboardWorkItem[]> {
    const params: unknown[] = [orgId, limit];
    const scopeClause = buildCaseScopeClause(scope, userId, params);
    const result = await tx.query<RiskRow>(
      `with latest_validation as (
         select distinct on (vr.case_id)
           vr.case_id,
           vr.result_status
         from validation_runs vr
         where vr.org_id = $1
         order by vr.case_id, vr.executed_at desc, vr.created_at desc
       )
       select
         c.id,
         c.case_no,
         c.case_name,
         u.name as owner_name,
         c.due_at,
         c.risk_level,
         lv.result_status as validation_status,
         c.billing_unpaid_amount_cached as unpaid_amount
       from cases c
       left join users u on u.id = c.owner_user_id and u.org_id = c.org_id
       left join latest_validation lv on lv.case_id = c.id
       where c.org_id = $1
         and c.archived_at is null
         and (
           c.risk_level = 'high'
           or c.billing_unpaid_amount_cached::numeric > 0
           or lv.result_status = 'failed'
         )
         ${scopeClause}
       order by
         case when c.billing_unpaid_amount_cached::numeric > 0 then 0 when lv.result_status = 'failed' then 1 else 2 end,
         c.due_at nulls last,
         c.updated_at desc
       limit $2`,
      params,
    );
    return result.rows.map(mapRiskItem);
  }
}
