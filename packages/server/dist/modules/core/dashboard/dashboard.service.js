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
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { createTenantDb } from "../tenancy/tenantDb";
import {
  buildCaseScopeClause,
  buildGroupClause,
  buildTaskScopeClause,
  isManagerRole,
  readCount,
} from "./dashboard.shared";
import {
  mapDeadlineItem,
  mapRiskItem,
  mapSubmissionItem,
  mapTodoItem,
} from "./dashboard.workItem";
import {
  findPrimaryGroupId,
  isGroupMember,
  loadOrgActiveGroups,
  loadUserGroups,
} from "./dashboard.groups";
/**
 * 聚合仪表盘摘要与面板数据的领域服务。
 */
let DashboardService = class DashboardService {
  pool;
  /**
   * 创建仪表盘服务。
   *
   * @param pool PostgreSQL 连接池。
   */
  constructor(pool) {
    this.pool = pool;
  }
  /**
   * 按当前租户与用户上下文加载仪表盘摘要。
   *
   * @param ctx 请求上下文，包含组织与用户信息。
   * @param input 查询条件，包含范围、时间窗口与数量限制。
   * @returns 仪表盘摘要与四类面板数据。
   */
  async getSummary(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction(async (tx) => {
      const effectiveInput = await this.resolveEffectiveInput(tx, ctx, input);
      return this.buildDashboardSummary(
        this.createLoadContext(tx, ctx, effectiveInput),
      );
    });
  }
  /**
   * 返回当前用户可见的 active group 列表。
   * viewer/staff 仅看到自己所属 group；manager/owner 额外补全 org 内其他 active group。
   * @param ctx 请求上下文。
   * @returns group 选项列表。
   */
  async listVisibleGroups(ctx) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction(async (tx) => {
      const myGroups = await loadUserGroups(tx, ctx.userId);
      if (!isManagerRole(ctx.role)) return myGroups;
      const myGroupIds = new Set(myGroups.map((g) => g.id));
      const orgGroups = await loadOrgActiveGroups(tx);
      const extras = orgGroups
        .filter((g) => !myGroupIds.has(g.id))
        .map((g) => ({
          id: g.id,
          name: g.name,
          isPrimary: false,
          isMember: false,
        }));
      return [...myGroups, ...extras];
    });
  }
  async resolveEffectiveInput(tx, ctx, input) {
    if (input.scope !== "group") {
      return { ...input, groupId: undefined };
    }
    if (input.groupId) {
      const allowed = await isGroupMember(tx, ctx.userId, input.groupId);
      if (!allowed) {
        throw new BadRequestException("NO_GROUP_ACCESS");
      }
      return input;
    }
    const primaryGroupId = await findPrimaryGroupId(tx, ctx.userId);
    if (!primaryGroupId) {
      throw new BadRequestException("NO_PRIMARY_GROUP");
    }
    return { ...input, groupId: primaryGroupId };
  }
  createLoadContext(tx, ctx, input) {
    return {
      tx,
      orgId: ctx.orgId,
      userId: ctx.userId,
      scope: input.scope,
      groupId: input.groupId,
      timeWindow: input.timeWindow,
      limit: input.limit ?? 5,
    };
  }
  async buildDashboardSummary(context) {
    return {
      scope: context.scope,
      timeWindow: context.timeWindow,
      ...(context.scope === "group" && context.groupId
        ? { effectiveGroupId: context.groupId }
        : {}),
      summary: await this.loadSummaryCounts(context),
      panels: await this.loadPanels(context),
    };
  }
  async loadSummaryCounts(context) {
    return {
      todayTasks: await this.loadTodayTasksCount(context),
      upcomingCases: await this.loadUpcomingCasesCount(context),
      pendingSubmissions: await this.loadPendingSubmissionsCount(context),
      riskCases: await this.loadRiskCasesCount(context),
    };
  }
  async loadPanels(context) {
    return {
      todo: await this.loadTodoItems(context),
      deadlines: await this.loadDeadlineItems(context),
      submissions: await this.loadSubmissionItems(context),
      risks: await this.loadRiskItems(context),
    };
  }
  async loadTodayTasksCount(context) {
    const { tx, orgId, scope, userId, groupId } = context;
    const params = [orgId];
    const scopeClause = buildTaskScopeClause(scope, userId, params);
    const groupClause = buildGroupClause(scope, groupId, params);
    const result = await tx.query(
      `select count(*)::text as count
       from tasks t
       left join cases c on c.id = t.case_id and c.org_id = t.org_id
       where t.org_id = $1
         and t.status in ('pending', 'in_progress')
         and (c.id is null or c.archived_at is null)
         ${scopeClause}
         ${groupClause}`,
      params,
    );
    return readCount(result.rows);
  }
  async loadUpcomingCasesCount(context) {
    const { tx, orgId, scope, userId, groupId, timeWindow } = context;
    const params = [orgId, timeWindow];
    const scopeClause = buildCaseScopeClause(scope, userId, params);
    const groupClause = buildGroupClause(scope, groupId, params);
    const result = await tx.query(
      `select count(*)::text as count
       from cases c
       where c.org_id = $1
         and c.archived_at is null
         and c.due_at is not null
         and c.due_at <= now() + make_interval(days => $2::int)
         ${scopeClause}
         ${groupClause}`,
      params,
    );
    return readCount(result.rows);
  }
  async loadPendingSubmissionsCount(context) {
    const { tx, orgId, scope, userId, groupId } = context;
    const params = [orgId];
    const scopeClause = buildCaseScopeClause(scope, userId, params);
    const groupClause = buildGroupClause(scope, groupId, params);
    const result = await tx.query(
      `select count(*)::text as count
       from cases c
       where c.org_id = $1
         and c.archived_at is null
         and coalesce(c.stage, c.status) = 'S6'
         ${scopeClause}
         ${groupClause}`,
      params,
    );
    return readCount(result.rows);
  }
  async loadRiskCasesCount(context) {
    const { tx, orgId, scope, userId, groupId } = context;
    const params = [orgId];
    const scopeClause = buildCaseScopeClause(scope, userId, params);
    const groupClause = buildGroupClause(scope, groupId, params);
    const result = await tx.query(
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
         ${scopeClause}
         ${groupClause}`,
      params,
    );
    return readCount(result.rows);
  }
  async loadTodoItems(context) {
    const { tx, orgId, scope, userId, groupId, limit } = context;
    const params = [orgId, limit];
    const scopeClause = buildTaskScopeClause(scope, userId, params);
    const groupClause = buildGroupClause(scope, groupId, params);
    const result = await tx.query(
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
         ${groupClause}
       order by
         case when t.priority = 'high' then 0 when t.priority = 'normal' then 1 else 2 end,
         t.due_at nulls last,
         t.created_at desc
       limit $2`,
      params,
    );
    return result.rows.map(mapTodoItem);
  }
  async loadDeadlineItems(context) {
    const { tx, orgId, scope, userId, groupId, timeWindow, limit } = context;
    const params = [orgId, timeWindow, limit];
    const scopeClause = buildCaseScopeClause(scope, userId, params);
    const groupClause = buildGroupClause(scope, groupId, params);
    const result = await tx.query(
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
         ${groupClause}
       order by c.due_at asc, c.updated_at desc
       limit $3`,
      params,
    );
    return result.rows.map(mapDeadlineItem);
  }
  async loadSubmissionItems(context) {
    const { tx, orgId, scope, userId, groupId, limit } = context;
    const params = [orgId, limit];
    const scopeClause = buildCaseScopeClause(scope, userId, params);
    const groupClause = buildGroupClause(scope, groupId, params);
    const result = await tx.query(
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
         ${groupClause}
       order by c.due_at nulls last, c.updated_at desc
       limit $2`,
      params,
    );
    return result.rows.map(mapSubmissionItem);
  }
  async loadRiskItems(context) {
    const { tx, orgId, scope, userId, groupId, limit } = context;
    const params = [orgId, limit];
    const scopeClause = buildCaseScopeClause(scope, userId, params);
    const groupClause = buildGroupClause(scope, groupId, params);
    const result = await tx.query(
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
         ${groupClause}
       order by
         case when c.billing_unpaid_amount_cached::numeric > 0 then 0 when lv.result_status = 'failed' then 1 else 2 end,
         c.due_at nulls last,
         c.updated_at desc
       limit $2`,
      params,
    );
    return result.rows.map(mapRiskItem);
  }
};
DashboardService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __metadata("design:paramtypes", [Pool]),
  ],
  DashboardService,
);
export { DashboardService };
//# sourceMappingURL=dashboard.service.js.map
