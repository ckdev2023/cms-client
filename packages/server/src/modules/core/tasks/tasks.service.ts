/* eslint-disable jsdoc/require-jsdoc */
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { Task } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb, type TenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";

export type TaskQueryRow = {
  id: string;
  org_id: string;
  case_id: string | null;
  title: string;
  description: string | null;
  task_type: string;
  assignee_user_id: string | null;
  priority: string;
  due_at: unknown;
  status: string;
  source_type: string | null;
  source_id: string | null;
  completed_at: unknown;
  created_at: unknown;
  updated_at: unknown;
};

export type TaskCreateInput = {
  caseId?: string | null;
  title: string;
  description?: string | null;
  taskType?: string;
  assigneeUserId?: string | null;
  priority?: string;
  dueAt?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
};

export type TaskUpdateInput = {
  caseId?: string | null;
  title?: string;
  description?: string | null;
  taskType?: string;
  assigneeUserId?: string | null;
  priority?: string;
  dueAt?: string | null;
  status?: string;
  sourceType?: string | null;
  sourceId?: string | null;
};

export type TaskListInput = {
  caseId?: string;
  assigneeUserId?: string;
  status?: string;
  page?: number;
  limit?: number;
};

type ResolvedTaskUpdate = {
  caseId: string | null;
  title: string;
  description: string | null;
  taskType: string;
  assigneeUserId: string | null;
  priority: string;
  dueAt: string | null;
  status: string;
  sourceType: string | null;
  sourceId: string | null;
};

const TASK_COLS = `id, org_id, case_id, title, description, task_type, assignee_user_id, priority, due_at, status, source_type, source_id, completed_at, created_at, updated_at`;
const VALID_TASK_TYPES = new Set([
  "general",
  "document_follow_up",
  "client_contact",
  "submission",
  "review",
]);
const VALID_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const VALID_STATUSES = new Set([
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

export function mapTaskRow(row: TaskQueryRow): Task {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    title: row.title,
    description: row.description,
    taskType: row.task_type,
    assigneeUserId: row.assignee_user_id,
    priority: row.priority,
    dueAt: toTimestampStringOrNull(row.due_at),
    status: row.status,
    sourceType: row.source_type,
    sourceId: row.source_id,
    completedAt: toTimestampStringOrNull(row.completed_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

@Injectable()
export class TasksService {
  private static readonly ALLOWED_ASSERT_TABLES = new Set(["cases", "users"]);

  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  // eslint-disable-next-line complexity
  async create(ctx: RequestContext, input: TaskCreateInput): Promise<Task> {
    validateTitle(input.title);
    validateTaskType(input.taskType ?? "general");
    validatePriority(input.priority ?? "normal");
    validateTimestamp(input.dueAt, "dueAt");

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    if (input.caseId)
      await this.assertBelongsToOrg(tenantDb, "cases", input.caseId);
    if (input.assigneeUserId) {
      await this.assertBelongsToOrg(tenantDb, "users", input.assigneeUserId);
    }

    const result = await tenantDb.query<TaskQueryRow>(
      `insert into tasks (org_id, case_id, title, description, task_type, assignee_user_id, priority, due_at, status, source_type, source_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)
       returning ${TASK_COLS}`,
      [
        ctx.orgId,
        input.caseId ?? null,
        input.title,
        input.description ?? null,
        input.taskType ?? "general",
        input.assigneeUserId ?? null,
        input.priority ?? "normal",
        input.dueAt ?? null,
        input.sourceType ?? null,
        input.sourceId ?? null,
      ],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create task");
    const task = mapTaskRow(row);

    await this.timelineService.write(ctx, {
      entityType: "task",
      entityId: task.id,
      action: "task.created",
      payload: {
        caseId: task.caseId,
        title: task.title,
        status: task.status,
      },
    });

    return task;
  }

  async get(ctx: RequestContext, id: string): Promise<Task | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<TaskQueryRow>(
      `select ${TASK_COLS} from tasks where id = $1 limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapTaskRow(row) : null;
  }

  async list(
    ctx: RequestContext,
    input: TaskListInput = {},
  ): Promise<{ items: Task[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: unknown[] = [];
    const filters: [string, string | undefined][] = [
      ["case_id", input.caseId],
      ["assignee_user_id", input.assigneeUserId],
      ["status", input.status],
    ];
    for (const [column, value] of filters) {
      if (!value) continue;
      params.push(value);
      where.push(`${column} = $${String(params.length)}`);
    }

    const whereClause = where.length > 0 ? `where ${where.join(" and ")}` : "";
    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*) as count from tasks ${whereClause}`,
      params,
    );
    const total = Number.parseInt(countResult.rows[0]?.count ?? "0", 10);

    const listParams = [...params, limit, offset];
    const result = await tenantDb.query<TaskQueryRow>(
      `select ${TASK_COLS} from tasks ${whereClause}
       order by created_at desc, id desc
       limit $${String(listParams.length - 1)} offset $${String(listParams.length)}`,
      listParams,
    );

    return { items: result.rows.map(mapTaskRow), total };
  }

  // eslint-disable-next-line max-lines-per-function
  async update(
    ctx: RequestContext,
    id: string,
    input: TaskUpdateInput,
  ): Promise<Task> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Task not found");
    if (isTerminalStatus(current.status)) {
      throw new BadRequestException("Terminal tasks cannot be updated");
    }

    const next = resolveTaskUpdate(current, input);
    validateTitle(next.title);
    validateTaskType(next.taskType);
    validatePriority(next.priority);
    validateTaskStatus(next.status);
    validateTimestamp(next.dueAt, "dueAt");
    validateMutableStatusTransition(current.status, next.status);

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    if (next.caseId)
      await this.assertBelongsToOrg(tenantDb, "cases", next.caseId);
    if (next.assigneeUserId) {
      await this.assertBelongsToOrg(tenantDb, "users", next.assigneeUserId);
    }

    const result = await tenantDb.query<TaskQueryRow>(
      `update tasks
       set case_id = $2,
           title = $3,
           description = $4,
           task_type = $5,
           assignee_user_id = $6,
           priority = $7,
           due_at = $8,
           status = $9,
           source_type = $10,
           source_id = $11,
           updated_at = now()
       where id = $1
       returning ${TASK_COLS}`,
      [
        id,
        next.caseId,
        next.title,
        next.description,
        next.taskType,
        next.assigneeUserId,
        next.priority,
        next.dueAt,
        next.status,
        next.sourceType,
        next.sourceId,
      ],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to update task");
    const updated = mapTaskRow(row);

    await this.timelineService.write(ctx, {
      entityType: "task",
      entityId: updated.id,
      action: "task.updated",
      payload: { before: current, after: updated },
    });

    return updated;
  }

  async complete(ctx: RequestContext, id: string): Promise<Task> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Task not found");
    validateTerminalTransition(current.status, "completed");

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<TaskQueryRow>(
      `update tasks
       set status = 'completed', completed_at = now(), updated_at = now()
       where id = $1 and status = $2
       returning ${TASK_COLS}`,
      [id, current.status],
    );

    const row = result.rows.at(0);
    if (!row) {
      throw new BadRequestException(
        `Transition conflict: task status has already changed from '${current.status}'`,
      );
    }
    const updated = mapTaskRow(row);

    await this.timelineService.write(ctx, {
      entityType: "task",
      entityId: updated.id,
      action: "task.completed",
      payload: {
        previousStatus: current.status,
        completedAt: updated.completedAt,
      },
    });

    return updated;
  }

  async cancel(ctx: RequestContext, id: string): Promise<Task> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Task not found");
    validateTerminalTransition(current.status, "cancelled");

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<TaskQueryRow>(
      `update tasks
       set status = 'cancelled', updated_at = now()
       where id = $1 and status = $2
       returning ${TASK_COLS}`,
      [id, current.status],
    );

    const row = result.rows.at(0);
    if (!row) {
      throw new BadRequestException(
        `Transition conflict: task status has already changed from '${current.status}'`,
      );
    }
    const updated = mapTaskRow(row);

    await this.timelineService.write(ctx, {
      entityType: "task",
      entityId: updated.id,
      action: "task.cancelled",
      payload: { previousStatus: current.status },
    });

    return updated;
  }

  private async assertBelongsToOrg(
    tenantDb: TenantDb,
    table: string,
    id: string,
  ): Promise<void> {
    if (!TasksService.ALLOWED_ASSERT_TABLES.has(table)) {
      throw new Error(`assertBelongsToOrg: disallowed table "${table}"`);
    }
    const result = await tenantDb.query<{ id: string }>(
      `select id from ${table} where id = $1 limit 1`,
      [id],
    );
    if (result.rows.length === 0) {
      throw new BadRequestException(
        `Referenced ${table} record not found in current organization`,
      );
    }
  }
}

function resolveTaskUpdate(
  current: Task,
  input: TaskUpdateInput,
): ResolvedTaskUpdate {
  return {
    caseId: input.caseId !== undefined ? input.caseId : current.caseId,
    title: input.title ?? current.title,
    description:
      input.description !== undefined ? input.description : current.description,
    taskType: input.taskType ?? current.taskType,
    assigneeUserId:
      input.assigneeUserId !== undefined
        ? input.assigneeUserId
        : current.assigneeUserId,
    priority: input.priority ?? current.priority,
    dueAt: input.dueAt !== undefined ? input.dueAt : current.dueAt,
    status: input.status ?? current.status,
    sourceType:
      input.sourceType !== undefined ? input.sourceType : current.sourceType,
    sourceId: input.sourceId !== undefined ? input.sourceId : current.sourceId,
  };
}

function validateTitle(title: string): void {
  if (title.trim().length === 0) {
    throw new BadRequestException("title is required");
  }
}

function validateTaskType(taskType: string): void {
  if (!VALID_TASK_TYPES.has(taskType)) {
    throw new BadRequestException(
      `Invalid taskType: ${taskType}. Must be one of: ${[...VALID_TASK_TYPES].join(", ")}`,
    );
  }
}

function validatePriority(priority: string): void {
  if (!VALID_PRIORITIES.has(priority)) {
    throw new BadRequestException(
      `Invalid priority: ${priority}. Must be one of: ${[...VALID_PRIORITIES].join(", ")}`,
    );
  }
}

function validateTaskStatus(status: string): void {
  if (!VALID_STATUSES.has(status)) {
    throw new BadRequestException(
      `Invalid status: ${status}. Must be one of: ${[...VALID_STATUSES].join(", ")}`,
    );
  }
}

function validateTimestamp(
  value: string | null | undefined,
  field: string,
): void {
  if (value === undefined || value === null) return;
  if (Number.isNaN(new Date(value).getTime())) {
    throw new BadRequestException(`Invalid ${field}`);
  }
}

function isTerminalStatus(status: string): boolean {
  return status === "completed" || status === "cancelled";
}

function validateMutableStatusTransition(from: string, to: string): void {
  if (from === to) return;
  if (to === "completed" || to === "cancelled") {
    throw new BadRequestException(
      "Use complete/cancel endpoints for terminal task transitions",
    );
  }
  if (from === "pending" && to === "in_progress") return;
  throw new BadRequestException(
    `Transition from '${from}' to '${to}' is not allowed`,
  );
}

function validateTerminalTransition(
  from: string,
  to: "completed" | "cancelled",
): void {
  if (from === "pending" || from === "in_progress") return;
  throw new BadRequestException(
    `Transition from '${from}' to '${to}' is not allowed`,
  );
}
