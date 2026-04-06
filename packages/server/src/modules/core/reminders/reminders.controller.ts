import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { RemindersService } from "./reminders.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type CreateReminderBody = {
  entityType: unknown;
  entityId: unknown;
  scheduledAt: unknown;
  payload?: unknown;
};

type UpdateReminderBody = {
  scheduledAt?: unknown;
  payload?: unknown;
};

type ListRemindersQuery = {
  status?: unknown;
  entityType?: unknown;
  page?: unknown;
  limit?: unknown;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}

function parseISODate(value: unknown, field: string): string {
  const str = requireString(value, field);
  const d = new Date(str);
  if (isNaN(d.getTime())) {
    throw new BadRequestException(`Invalid ${field}, must be a valid ISO date string`);
  }
  return d.toISOString();
}

function parseOptionalISODate(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;
  return parseISODate(value, field);
}

function parseEntityType(value: unknown): string {
  const str = requireString(value, "entityType");
  if (str !== "case" && str !== "document_item") {
    throw new BadRequestException("Invalid entityType, must be 'case' or 'document_item'");
  }
  return str;
}

function parseOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;
  return requireString(value, field);
}

function parsePage(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid page");
  const i = Math.floor(n);
  if (i < 1) throw new BadRequestException("Invalid page");
  return i;
}

function parseLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid limit");
  const i = Math.floor(n);
  if (i < 1 || i > 200) throw new BadRequestException("Invalid limit");
  return i;
}

function parsePayload(
  value: unknown,
): Record<string, unknown> | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new BadRequestException("Invalid payload");
}

/**
 * Reminders CRUD 接口。
 */
@Controller("reminders")
export class RemindersController {
  /**
   * 构造函数。
   * @param remindersService 提醒服务实例
   */
  constructor(
    @Inject(RemindersService)
    private readonly remindersService: RemindersService,
  ) {}

  /**
   * 创建提醒。
   * @param req HTTP 请求对象
   * @param body 创建请求体
   * @returns 创建成功的提醒
   */
  @RequireRoles("staff")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateReminderBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.remindersService.create(ctx, {
      entityType: parseEntityType(body.entityType),
      entityId: requireString(body.entityId, "entityId"),
      scheduledAt: parseISODate(body.scheduledAt, "scheduledAt"),
      payload: parsePayload(body.payload) ?? null,
    });
  }

  /**
   * 获取提醒列表。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 提醒列表
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListRemindersQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.remindersService.list(ctx, {
      status: parseOptionalString(query.status, "status"),
      entityType: parseOptionalString(query.entityType, "entityType"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  /**
   * 查询已到期未发送的提醒。
   * @param req HTTP 请求对象
   * @returns 到期的提醒列表
   */
  @RequireRoles("manager")
  @Get("due")
  async due(@Req() req: HttpRequest) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.remindersService.due(ctx);
  }

  /**
   * 获取指定提醒详情。
   * @param req HTTP 请求对象
   * @param id 提醒 ID
   * @returns 提醒信息
   */
  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const reminder = await this.remindersService.get(ctx, id);
    if (!reminder) throw new BadRequestException("Reminder not found");
    return reminder;
  }

  /**
   * 更新提醒。
   * @param req HTTP 请求对象
   * @param id 提醒 ID
   * @param body 更新请求体
   * @returns 更新后的提醒
   */
  @RequireRoles("staff")
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateReminderBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.remindersService.update(ctx, id, {
      scheduledAt: parseOptionalISODate(body.scheduledAt, "scheduledAt"),
      payload: parsePayload(body.payload),
    });
  }

  /**
   * 取消提醒（软删除：status → cancelled）。
   * @param req HTTP 请求对象
   * @param id 提醒 ID
   * @returns 操作结果
   */
  @RequireRoles("manager")
  @Delete(":id")
  async delete(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    await this.remindersService.cancel(ctx, id);
    return { ok: true };
  }
}
