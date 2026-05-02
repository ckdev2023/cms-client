/* eslint-disable jsdoc/require-jsdoc */
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import { CasesService } from "../cases/cases.service";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { TasksService } from "../tasks/tasks.service";
import { TimelineService } from "../timeline/timeline.service";

type BillingPlanOverdueRow = {
  id: string;
  case_id: string;
  milestone_name: string | null;
  owner_user_id: string | null;
  case_no: string | null;
};

export type CollectionSkipReasonCode =
  | "no-permission"
  | "case-not-found"
  | "duplicate-task"
  | "not-overdue"
  | "no-assignee"
  | "system-error";

export type CollectionResultDetail = {
  caseNo: string | null;
  result: "success" | "skipped" | "failed";
  reason?: CollectionSkipReasonCode;
  taskId?: string;
};

export type CollectionResult = {
  success: number;
  skipped: number;
  failed: number;
  details: CollectionResultDetail[];
};

@Injectable()
export class BillingCollectionsService {
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(CasesService) private readonly casesService: CasesService,
    @Inject(TasksService) private readonly tasksService: TasksService,
    @Inject(TimelineService)
    private readonly timelineService: TimelineService,
  ) {}

  async bulkCollect(
    ctx: RequestContext,
    caseIds: string[],
  ): Promise<CollectionResult> {
    const details: CollectionResultDetail[] = [];
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
  private async processCase(
    ctx: RequestContext,
    caseId: string,
  ): Promise<CollectionResultDetail> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    // 提前查 case_no（含软删/已归档），保证后续所有早返回都能在 drawer 明细里
    // 显示「哪个案件被跳过」，而不是一串 null。RLS 仍约束跨 org 访问。
    const caseNoResult = await tenantDb.query<{ case_no: string | null }>(
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

    const planResult = await tenantDb.query<BillingPlanOverdueRow>(
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

    const dupResult = await tenantDb.query<{ id: string }>(
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

    let taskId: string;
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
}
