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
import { isUuid } from "../tenancy/uuid";
import { RemindersService } from "./reminders.service";
function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}
function parseISODate(value, field) {
  const str = requireString(value, field);
  const d = new Date(str);
  if (isNaN(d.getTime())) {
    throw new BadRequestException(
      `Invalid ${field}, must be a valid ISO date string`,
    );
  }
  return d.toISOString();
}
function parseOptionalISODate(value, field) {
  if (value === undefined) return undefined;
  return parseISODate(value, field);
}
function parseOptionalString(value, field) {
  if (value === undefined) return undefined;
  return requireString(value, field);
}
function parsePage(value) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid page");
  const i = Math.floor(n);
  if (i < 1) throw new BadRequestException("Invalid page");
  return i;
}
function parseLimit(value) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid limit");
  const i = Math.floor(n);
  if (i < 1 || i > 200) throw new BadRequestException("Invalid limit");
  return i;
}
function parsePayload(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  throw new BadRequestException("Invalid payloadSnapshot");
}
/**
 * Reminders CRUD 接口（P0 对齐）。
 */
let RemindersController = class RemindersController {
  remindersService;
  /**
   * 构造函数。
   * @param remindersService 提醒服务实例
   */
  constructor(remindersService) {
    this.remindersService = remindersService;
  }
  /**
   * 创建提醒。
   * @param req HTTP 请求对象
   * @param body 创建请求体
   * @returns 创建成功的提醒
   */
  async create(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const targetId = requireString(body.targetId, "targetId");
    if (!isUuid(targetId)) {
      throw new BadRequestException({
        errorCode: "REMINDER_INVALID_TARGET_ID",
        message: "targetId must be a valid UUID",
      });
    }
    const caseId = parseOptionalString(body.caseId, "caseId");
    if (caseId !== undefined && !isUuid(caseId)) {
      throw new BadRequestException({
        errorCode: "REMINDER_INVALID_CASE_ID",
        message: "caseId must be a valid UUID",
      });
    }
    return this.remindersService.create(ctx, {
      targetType: requireString(body.targetType, "targetType"),
      targetId,
      remindAt: parseISODate(body.remindAt, "remindAt"),
      caseId,
      recipientType: parseOptionalString(body.recipientType, "recipientType"),
      recipientId: parseOptionalString(body.recipientId, "recipientId"),
      channel: parseOptionalString(body.channel, "channel"),
      dedupeKey: parseOptionalString(body.dedupeKey, "dedupeKey"),
      payloadSnapshot: parsePayload(body.payloadSnapshot) ?? null,
    });
  }
  /**
   * 获取提醒列表。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 提醒列表
   */
  async list(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.remindersService.list(ctx, {
      sendStatus: parseOptionalString(query.sendStatus, "sendStatus"),
      targetType: parseOptionalString(query.targetType, "targetType"),
      caseId: parseOptionalString(query.caseId, "caseId"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }
  /**
   * 查询已到期未发送的提醒。
   * @param req HTTP 请求对象
   * @returns 到期的提醒列表
   */
  async due(req) {
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
  async get(req, id) {
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
  async update(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.remindersService.update(ctx, id, {
      remindAt: parseOptionalISODate(body.remindAt, "remindAt"),
      payloadSnapshot: parsePayload(body.payloadSnapshot),
    });
  }
  /**
   * 取消提醒（send_status → canceled）。
   * @param req HTTP 请求对象
   * @param id 提醒 ID
   * @returns 操作结果
   */
  async delete(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    await this.remindersService.cancel(ctx, id);
    return { ok: true };
  }
};
__decorate(
  [
    RequireRoles("staff"),
    Post(),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  RemindersController.prototype,
  "create",
  null,
);
__decorate(
  [
    RequireRoles("viewer"),
    Get(),
    __param(0, Req()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  RemindersController.prototype,
  "list",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Get("due"),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise),
  ],
  RemindersController.prototype,
  "due",
  null,
);
__decorate(
  [
    RequireRoles("viewer"),
    Get(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  RemindersController.prototype,
  "get",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Patch(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  RemindersController.prototype,
  "update",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Delete(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  RemindersController.prototype,
  "delete",
  null,
);
RemindersController = __decorate(
  [
    Controller("reminders"),
    __param(0, Inject(RemindersService)),
    __metadata("design:paramtypes", [RemindersService]),
  ],
  RemindersController,
);
export { RemindersController };
//# sourceMappingURL=reminders.controller.js.map
