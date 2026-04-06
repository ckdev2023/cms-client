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
  UseGuards,
} from "@nestjs/common";

import { Public } from "../../core/auth/auth.decorators";
import { AppUserAuthGuard } from "../auth/appUserAuth.guard";
import type { AppUserContext } from "../auth/appUserAuth.service";
import { ConversationsService } from "./conversations.service";
import type {
  ConversationCreateInput,
  ConversationListInput,
} from "./conversations.service";

type CreateBody = {
  appUserId?: unknown;
  leadId?: unknown;
  orgId?: unknown;
  channel?: unknown;
  preferredLanguage?: unknown;
};

type ListQuery = {
  appUserId?: unknown;
  orgId?: unknown;
  leadId?: unknown;
  status?: unknown;
  page?: unknown;
  limit?: unknown;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new BadRequestException(`Invalid ${field}`);
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

function parsePage(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.floor(n) < 1)
    throw new BadRequestException("Invalid page");
  return Math.floor(n);
}

function parseLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid limit");
  const i = Math.floor(n);
  if (i < 1 || i > 200) throw new BadRequestException("Invalid limit");
  return i;
}

type HttpRequest = {
  headers?: Record<string, unknown>;
  appUserContext?: AppUserContext;
};

/**
 * Conversations CRUD 接口（需 AppUser JWT）。
 */
@Controller("conversations")
export class ConversationsController {
  /**
   * 创建控制器。
   * @param conversationsService 会话服务
   */
  constructor(
    @Inject(ConversationsService)
    private readonly conversationsService: ConversationsService,
  ) {}

  /**
   * 创建会话（需 AppUser JWT）。
   * @param req HTTP 请求
   * @param body 请求体
   * @returns 创建的会话
   */
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateBody) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const input: ConversationCreateInput = {
      appUserId: ctx.appUserId,
      leadId: parseOptionalNullableString(body.leadId, "leadId"),
      orgId: parseOptionalNullableString(body.orgId, "orgId"),
      channel: parseOptionalString(body.channel, "channel"),
      preferredLanguage: parseOptionalString(
        body.preferredLanguage,
        "preferredLanguage",
      ),
    };
    return this.conversationsService.create(input);
  }

  /**
   * 查询会话列表（需 AppUser JWT，仅返回本人数据）。
   * @param req HTTP 请求
   * @param query 查询参数
   * @returns 分页结果
   */
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListQuery) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const input: ConversationListInput = {
      appUserId: ctx.appUserId,
      orgId: parseOptionalString(query.orgId, "orgId"),
      leadId: parseOptionalString(query.leadId, "leadId"),
      status: parseOptionalString(query.status, "status"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    };
    return this.conversationsService.list(input);
  }

  /**
   * 获取会话详情（需 AppUser JWT，仅允许访问本人数据）。
   * @param req HTTP 请求
   * @param id 会话 ID
   * @returns 会话详情
   */
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const conv = await this.conversationsService.get(id);
    if (!conv) throw new BadRequestException("Conversation not found");
    if (conv.appUserId !== ctx.appUserId)
      throw new UnauthorizedException(
        "Cannot access other user's conversation",
      );
    return conv;
  }

  /**
   * 关闭会话（需 AppUser JWT，仅允许关闭本人会话）。
   * @param req HTTP 请求
   * @param id 会话 ID
   * @returns 关闭后的会话
   */
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Patch(":id/close")
  async close(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const conv = await this.conversationsService.get(id);
    if (!conv) throw new BadRequestException("Conversation not found");
    if (conv.appUserId !== ctx.appUserId)
      throw new UnauthorizedException("Cannot close other user's conversation");
    return this.conversationsService.close(id);
  }
}
