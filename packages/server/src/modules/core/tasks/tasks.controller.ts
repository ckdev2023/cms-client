/* eslint-disable jsdoc/require-jsdoc */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequireRoles } from "../auth/auth.decorators";
import type { RequestContext } from "../tenancy/requestContext";
import { TasksService } from "./tasks.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type CreateTaskBody = {
  caseId?: unknown;
  title: unknown;
  description?: unknown;
  taskType?: unknown;
  assigneeUserId?: unknown;
  priority?: unknown;
  dueAt?: unknown;
  sourceType?: unknown;
  sourceId?: unknown;
};

type UpdateTaskBody = {
  caseId?: unknown;
  title?: unknown;
  description?: unknown;
  taskType?: unknown;
  assigneeUserId?: unknown;
  priority?: unknown;
  dueAt?: unknown;
  status?: unknown;
  sourceType?: unknown;
  sourceId?: unknown;
};

type ListTasksQuery = {
  caseId?: unknown;
  assigneeUserId?: unknown;
  status?: unknown;
  page?: unknown;
  limit?: unknown;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value;
}

function parseOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;
  return requireString(value, field);
}

function parseOptionalNullableString(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireString(value, field);
}

function parseISODate(value: unknown, field: string): string {
  const str = requireString(value, field);
  const date = new Date(str);
  if (Number.isNaN(date.getTime()))
    throw new BadRequestException(`Invalid ${field}`);
  return date.toISOString();
}

function parseOptionalNullableISODate(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return parseISODate(value, field);
}

function parsePage(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1)
    throw new BadRequestException("Invalid page");
  return Math.floor(n);
}

function parseLimit(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 200) {
    throw new BadRequestException("Invalid limit");
  }
  return Math.floor(n);
}

@Controller("tasks")
export class TasksController {
  constructor(
    @Inject(TasksService) private readonly tasksService: TasksService,
  ) {}

  @RequireRoles("staff")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateTaskBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.tasksService.create(ctx, {
      caseId: parseOptionalNullableString(body.caseId, "caseId"),
      title: requireString(body.title, "title"),
      description: parseOptionalNullableString(body.description, "description"),
      taskType: parseOptionalString(body.taskType, "taskType"),
      assigneeUserId: parseOptionalNullableString(
        body.assigneeUserId,
        "assigneeUserId",
      ),
      priority: parseOptionalString(body.priority, "priority"),
      dueAt: parseOptionalNullableISODate(body.dueAt, "dueAt"),
      sourceType: parseOptionalNullableString(body.sourceType, "sourceType"),
      sourceId: parseOptionalNullableString(body.sourceId, "sourceId"),
    });
  }

  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListTasksQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.tasksService.list(ctx, {
      caseId: parseOptionalString(query.caseId, "caseId"),
      assigneeUserId: parseOptionalString(
        query.assigneeUserId,
        "assigneeUserId",
      ),
      status: parseOptionalString(query.status, "status"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  @RequireRoles("staff")
  @Post(":id/complete")
  async complete(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.tasksService.complete(ctx, id);
  }

  @RequireRoles("staff")
  @Post(":id/cancel")
  async cancel(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.tasksService.cancel(ctx, id);
  }

  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const task = await this.tasksService.get(ctx, id);
    if (!task) throw new BadRequestException("Task not found");
    return task;
  }

  @RequireRoles("staff")
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateTaskBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.tasksService.update(ctx, id, {
      caseId: parseOptionalNullableString(body.caseId, "caseId"),
      title:
        body.title !== undefined
          ? requireString(body.title, "title")
          : undefined,
      description: parseOptionalNullableString(body.description, "description"),
      taskType: parseOptionalString(body.taskType, "taskType"),
      assigneeUserId: parseOptionalNullableString(
        body.assigneeUserId,
        "assigneeUserId",
      ),
      priority: parseOptionalString(body.priority, "priority"),
      dueAt: parseOptionalNullableISODate(body.dueAt, "dueAt"),
      status: parseOptionalString(body.status, "status"),
      sourceType: parseOptionalNullableString(body.sourceType, "sourceType"),
      sourceId: parseOptionalNullableString(body.sourceId, "sourceId"),
    });
  }
}
