import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  Body,
} from "@nestjs/common";

import { RequireRoles } from "../auth/auth.decorators";
import { JobsService } from "./jobs.service";
import type { RequestContext } from "../tenancy/requestContext";
import type { JobEnqueueInput, JobListInput, JobStatus } from "./jobs.model";

type HttpRequest = {
  requestContext?: RequestContext;
};

type EnqueueBody = {
  type?: unknown;
  payload?: unknown;
  idempotencyKey?: unknown;
  maxRetries?: unknown;
  runAt?: unknown;
};

type JobsListQuery = {
  status?: unknown;
  limit?: unknown;
};

/**
 * Job 队列接口（入队/查询）。
 */
@Controller("jobs")
export class JobsController {
  /**
   * 创建 controller。
   *
   * @param jobsService jobs service
   */
  constructor(@Inject(JobsService) private readonly jobsService: JobsService) {}

  /**
   * 入队一个 job（需 staff+ 权限）。
   *
   * @param req 请求对象
   * @param body 请求体
   * @returns Job
   */
  @RequireRoles("staff")
  @Post()
  async enqueue(@Req() req: HttpRequest, @Body() body: EnqueueBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const input: JobEnqueueInput = {
      type: parseType(body.type),
      payload: parsePayload(body.payload),
      idempotencyKey:
        body.idempotencyKey === undefined
          ? undefined
          : parseIdempotencyKey(body.idempotencyKey),
      maxRetries:
        body.maxRetries === undefined
          ? undefined
          : parseMaxRetries(body.maxRetries),
      runAt: body.runAt === undefined ? undefined : parseRunAt(body.runAt),
    };

    return this.jobsService.enqueue(ctx, input);
  }

  /**
   * 查询单个 job。
   *
   * @param req 请求对象
   * @param id Job ID
   * @returns Job 或 null
   */
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.jobsService.get(ctx, id);
  }

  /**
   * 查询 job 列表。
   *
   * @param req 请求对象
   * @param query query 参数
   * @returns job 列表
   */
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: JobsListQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const input: JobListInput = {
      status:
        query.status === undefined ? undefined : parseStatus(query.status),
      limit: query.limit === undefined ? undefined : parseLimit(query.limit),
    };

    return this.jobsService.list(ctx, input);
  }
}

function parseType(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException("Invalid type");
  }
  return value;
}

function parsePayload(value: unknown): Record<string, unknown> {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException("Invalid payload");
  }
  return value as Record<string, unknown>;
}

function parseIdempotencyKey(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException("Invalid idempotencyKey");
  }
  if (value.length > 200) {
    throw new BadRequestException("idempotencyKey too long");
  }
  return value;
}

function parseMaxRetries(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new BadRequestException("Invalid maxRetries");
  }
  const i = Math.floor(n);
  if (i < 0 || i > 20) {
    throw new BadRequestException("Invalid maxRetries");
  }
  return i;
}

function parseRunAt(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException("Invalid runAt");
  }
  const t = Date.parse(value);
  if (!Number.isFinite(t)) {
    throw new BadRequestException("Invalid runAt");
  }
  return new Date(t).toISOString();
}

function parseStatus(value: unknown): JobStatus {
  if (value === "queued") return "queued";
  if (value === "running") return "running";
  if (value === "succeeded") return "succeeded";
  if (value === "failed") return "failed";
  throw new BadRequestException("Invalid status");
}

function parseLimit(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new BadRequestException("Invalid limit");
  }
  const i = Math.floor(n);
  if (i < 1 || i > 200) {
    throw new BadRequestException("Invalid limit");
  }
  return i;
}
