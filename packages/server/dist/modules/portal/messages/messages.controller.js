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
import { ConversationsService } from "../conversations/conversations.service";
import { MessagesService } from "./messages.service";
function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0)
    throw new BadRequestException(`Invalid ${field}`);
  return value;
}
function parseOptionalNullableString(value, field) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireString(value, field);
}
function parsePage(value) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.floor(n) < 1)
    throw new BadRequestException("Invalid page");
  return Math.floor(n);
}
function parseLimit(value) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid limit");
  const i = Math.floor(n);
  if (i < 1 || i > 200) throw new BadRequestException("Invalid limit");
  return i;
}
/**
 * Messages 接口（需 AppUser JWT）。
 */
let MessagesController = class MessagesController {
  messagesService;
  conversationsService;
  /**
   * 创建控制器。
   * @param messagesService 消息服务
   * @param conversationsService 会话服务（用于所有权校验）
   */
  constructor(messagesService, conversationsService) {
    this.messagesService = messagesService;
    this.conversationsService = conversationsService;
  }
  /**
   * 发送消息（需 AppUser JWT，校验 conversation 所有权）。
   * @param req HTTP 请求
   * @param body 请求体
   * @returns 创建的消息
   */
  async send(req, body) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const conversationId = requireString(body.conversationId, "conversationId");
    await this.assertConversationOwnership(ctx.appUserId, conversationId);
    const input = {
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
  async list(req, query) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const conversationId = requireString(
      query.conversationId,
      "conversationId",
    );
    await this.assertConversationOwnership(ctx.appUserId, conversationId);
    const input = {
      conversationId,
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
      markReadFor: "user",
    };
    return this.messagesService.list(input);
  }
  /**
   * 获取消息详情（需 AppUser JWT，校验所有权）。
   * @param req HTTP 请求
   * @param id 消息 ID
   * @returns 消息详情
   */
  async get(req, id) {
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
  async assertConversationOwnership(appUserId, conversationId) {
    const conv = await this.conversationsService.get(conversationId);
    if (!conv) throw new BadRequestException("Conversation not found");
    if (conv.appUserId !== appUserId)
      throw new UnauthorizedException(
        "Cannot access other user's conversation",
      );
  }
};
__decorate(
  [
    Public(),
    UseGuards(AppUserAuthGuard),
    Post(),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  MessagesController.prototype,
  "send",
  null,
);
__decorate(
  [
    Public(),
    UseGuards(AppUserAuthGuard),
    Get(),
    __param(0, Req()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  MessagesController.prototype,
  "list",
  null,
);
__decorate(
  [
    Public(),
    UseGuards(AppUserAuthGuard),
    Get(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  MessagesController.prototype,
  "get",
  null,
);
MessagesController = __decorate(
  [
    Controller("messages"),
    __param(0, Inject(MessagesService)),
    __param(1, Inject(ConversationsService)),
    __metadata("design:paramtypes", [MessagesService, ConversationsService]),
  ],
  MessagesController,
);
export { MessagesController };
//# sourceMappingURL=messages.controller.js.map
