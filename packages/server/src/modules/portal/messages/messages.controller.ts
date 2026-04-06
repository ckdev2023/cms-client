import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { Public } from "../../core/auth/auth.decorators";
import { AppUserAuthGuard } from "../auth/appUserAuth.guard";
import type { AppUserContext } from "../auth/appUserAuth.service";
import { ConversationsService } from "../conversations/conversations.service";
import { MessagesService } from "./messages.service";
import type { MessageSendInput, MessageListInput } from "./messages.service";

type SendBody = {
  conversationId?: unknown;
  senderType?: unknown;
  senderId?: unknown;
  originalLanguage?: unknown;
  originalText?: unknown;
  orgId?: unknown;
};

type ListQuery = {
  conversationId?: unknown;
  page?: unknown;
  limit?: unknown;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new BadRequestException(`Invalid ${field}`);
  return value;
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
 * Messages 接口（需 AppUser JWT）。
 */
@Controller("messages")
export class MessagesController {
  /**
   * 创建控制器。
   * @param messagesService 消息服务
   * @param conversationsService 会话服务（用于所有权校验）
   */
  constructor(
    @Inject(MessagesService) private readonly messagesService: MessagesService,
    @Inject(ConversationsService)
    private readonly conversationsService: ConversationsService,
  ) {}

  /**
   * 发送消息（需 AppUser JWT，校验 conversation 所有权）。
   * @param req HTTP 请求
   * @param body 请求体
   * @returns 创建的消息
   */
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Post()
  async send(@Req() req: HttpRequest, @Body() body: SendBody) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const conversationId = requireString(body.conversationId, "conversationId");
    await this.assertConversationOwnership(ctx.appUserId, conversationId);
    const input: MessageSendInput = {
      conversationId,
      senderType: requireString(body.senderType, "senderType"),
      senderId: ctx.appUserId,
      originalLanguage: requireString(
        body.originalLanguage,
        "originalLanguage",
      ),
      originalText: requireString(body.originalText, "originalText"),
      orgId: parseOptionalNullableString(body.orgId, "orgId"),
    };
    return this.messagesService.send(input);
  }

  /**
   * 查询消息列表（需 AppUser JWT，校验 conversation 所有权）。
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
    const conversationId = requireString(
      query.conversationId,
      "conversationId",
    );
    await this.assertConversationOwnership(ctx.appUserId, conversationId);
    const input: MessageListInput = {
      conversationId,
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    };
    return this.messagesService.list(input);
  }

  /**
   * 获取消息详情（需 AppUser JWT，校验所有权）。
   * @param req HTTP 请求
   * @param id 消息 ID
   * @returns 消息详情
   */
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const msg = await this.messagesService.get(id);
    if (!msg) throw new BadRequestException("Message not found");
    const conv = await this.conversationsService.get(msg.conversationId);
    if (conv?.appUserId !== ctx.appUserId)
      throw new UnauthorizedException("Cannot access other user's message");
    return msg;
  }

  /**
   * 校验当前用户是否为 conversation 拥有者。
   * @param appUserId 当前用户 ID
   * @param conversationId 会话 ID
   */
  private async assertConversationOwnership(
    appUserId: string,
    conversationId: string,
  ): Promise<void> {
    const conv = await this.conversationsService.get(conversationId);
    if (!conv) throw new BadRequestException("Conversation not found");
    if (conv.appUserId !== appUserId)
      throw new UnauthorizedException(
        "Cannot access other user's conversation",
      );
  }
}
