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
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Public } from "../../core/auth/auth.decorators";
import { AppUserAuthGuard } from "../auth/appUserAuth.guard";
import { ConversationsService } from "./conversations.service";
function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0)
    throw new BadRequestException(`Invalid ${field}`);
  return value;
}
function parseOptionalString(value, field) {
  if (value === undefined) return undefined;
  return requireString(value, field);
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
 * Conversations CRUD 接口（需 AppUser JWT）。
 */
let ConversationsController = class ConversationsController {
  conversationsService;
  /**
   * 创建控制器。
   * @param conversationsService 会话服务
   */
  constructor(conversationsService) {
    this.conversationsService = conversationsService;
  }
  /**
   * 创建会话（需 AppUser JWT）。
   * @param req HTTP 请求
   * @param body 请求体
   * @returns 创建的会话
   */
  async create(req, body) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const input = {
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
  async list(req, query) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const input = {
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
  async get(req, id) {
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
  async close(req, id) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const conv = await this.conversationsService.get(id);
    if (!conv) throw new BadRequestException("Conversation not found");
    if (conv.appUserId !== ctx.appUserId)
      throw new UnauthorizedException("Cannot close other user's conversation");
    return this.conversationsService.close(id);
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
  ConversationsController.prototype,
  "create",
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
  ConversationsController.prototype,
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
  ConversationsController.prototype,
  "get",
  null,
);
__decorate(
  [
    Public(),
    UseGuards(AppUserAuthGuard),
    Patch(":id/close"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  ConversationsController.prototype,
  "close",
  null,
);
ConversationsController = __decorate(
  [
    Controller("conversations"),
    __param(0, Inject(ConversationsService)),
    __metadata("design:paramtypes", [ConversationsService]),
  ],
  ConversationsController,
);
export { ConversationsController };
//# sourceMappingURL=conversations.controller.js.map
