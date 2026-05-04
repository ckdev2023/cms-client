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
/* eslint-disable jsdoc/require-jsdoc */
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";
import { CasesService } from "../cases/cases.service";
import { createTenantDb } from "../tenancy/tenantDb";
import { TasksService } from "../tasks/tasks.service";
import { TimelineService } from "../timeline/timeline.service";
let BillingCollectionsService = class BillingCollectionsService {
  pool;
  casesService;
  tasksService;
  timelineService;
  constructor(pool, casesService, tasksService, timelineService) {
    this.pool = pool;
    this.casesService = casesService;
    this.tasksService = tasksService;
    this.timelineService = timelineService;
  }
  async bulkCollect(ctx, caseIds) {
    const details = [];
    let success = 0;
    let skipped = 0;
    let failed = 0;
    for (const caseId of caseIds) {
      const detail = await this.processCase(ctx, caseId);
      details.push(detail);
      if (detail.result === "success") success++;
      else if (detail.result === "skipped") skipped++;
      else failed++;
    }
    return { success, skipped, failed, details };
  }
  // eslint-disable-next-line max-lines-per-function
  async processCase(ctx, caseId) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    // 提前查 case_no（含软删/已归档），保证后续所有早返回都能在 drawer 明细里
    // 显示「哪个案件被跳过」，而不是一串 null。RLS 仍约束跨 org 访问。
    const caseNoResult = await tenantDb.query(
      `select case_no from cases where id = $1 limit 1`,
      [caseId],
    );
    const caseNo = caseNoResult.rows.at(0)?.case_no ?? null;
    try {
      await this.casesService.assertCanEditCase(ctx, caseId);
    } catch (e) {
      if (e instanceof NotFoundException) {
        return { caseNo, result: "skipped", reason: "case-not-found" };
      }
      if (e instanceof ForbiddenException) {
        return { caseNo, result: "skipped", reason: "no-permission" };
      }
      throw e;
    }
    const planResult = await tenantDb.query(
      `select br.id, br.case_id, br.milestone_name,
              c.owner_user_id, c.case_no
       from billing_records br
       join cases c on c.id = br.case_id
       where br.case_id = $1
         and br.status in ('due', 'partial', 'overdue')
         and br.due_date < now()
       order by br.due_date asc
       limit 1`,
      [caseId],
    );
    const plan = planResult.rows.at(0);
    if (!plan) {
      return { caseNo, result: "skipped", reason: "not-overdue" };
    }
    const dupResult = await tenantDb.query(
      `select id from tasks
       where task_type = 'collection'
         and source_type = 'billing_plan'
         and source_id = $1
         and status in ('pending', 'in_progress')
       limit 1`,
      [plan.id],
    );
    if (dupResult.rows.length > 0) {
      return { caseNo, result: "skipped", reason: "duplicate-task" };
    }
    const ownerUserId = plan.owner_user_id;
    if (!ownerUserId) {
      return { caseNo, result: "skipped", reason: "no-assignee" };
    }
    const dueAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const title = `催款 / ${plan.milestone_name ?? "収費ノード"}`;
    let taskId;
    try {
      const task = await this.tasksService.create(ctx, {
        caseId,
        title,
        taskType: "collection",
        assigneeUserId: ownerUserId,
        priority: "high",
        dueAt,
        sourceType: "billing_plan",
        sourceId: plan.id,
      });
      taskId = task.id;
    } catch {
      return { caseNo, result: "failed", reason: "system-error" };
    }
    await this.timelineService.write(ctx, {
      entityType: "case",
      entityId: caseId,
      action: "case.collection_task_created",
      payload: {
        taskId,
        billingPlanId: plan.id,
        caseId,
        dueAt,
        assigneeUserId: ownerUserId,
      },
    });
    return { caseNo, result: "success", taskId };
  }
};
BillingCollectionsService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __param(1, Inject(CasesService)),
    __param(2, Inject(TasksService)),
    __param(3, Inject(TimelineService)),
    __metadata("design:paramtypes", [
      Pool,
      CasesService,
      TasksService,
      TimelineService,
    ]),
  ],
  BillingCollectionsService,
);
export { BillingCollectionsService };
//# sourceMappingURL=billingCollections.service.js.map
