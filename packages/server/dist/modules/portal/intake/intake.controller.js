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
import { IntakeService } from "./intake.service";
import { isValidFormKind } from "./intake.types";
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
function parseObject(value) {
  if (value === undefined) return undefined;
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  throw new BadRequestException("Invalid formData");
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
function parseOptionalFormKind(value) {
  if (value === undefined) return undefined;
  if (!isValidFormKind(value)) {
    throw new BadRequestException(
      "Invalid formKind. Must be one of: general, bmv_questionnaire, bmv_quote",
    );
  }
  return value;
}
/**
 * IntakeForms 接口（需 AppUser JWT）。
 */
let IntakeController = class IntakeController {
  intakeService;
  /**
   * 创建控制器。
   * @param intakeService 表单服务
   */
  constructor(intakeService) {
    this.intakeService = intakeService;
  }
  /**
   * 创建表单草稿（需 AppUser JWT）。
   * @param req HTTP 请求
   * @param body 请求体
   * @returns 创建的表单
   */
  async create(req, body) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const formKind = parseOptionalFormKind(body.formKind);
    const input = {
      appUserId: ctx.appUserId,
      leadId: parseOptionalNullableString(body.leadId, "leadId"),
      formKind,
      formData: parseObject(body.formData),
    };
    return this.intakeService.create(input);
  }
  /**
   * 查询表单列表（需 AppUser JWT，仅返回本人数据）。
   * @param req HTTP 请求
   * @param query 查询参数
   * @returns 分页结果
   */
  async list(req, query) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const formKind = parseOptionalFormKind(query.formKind);
    const input = {
      appUserId: ctx.appUserId,
      leadId: parseOptionalString(query.leadId, "leadId"),
      formKind,
      status: parseOptionalString(query.status, "status"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    };
    return this.intakeService.list(input);
  }
  /**
   * 获取表单详情（需 AppUser JWT）。
   * @param id 表单 ID
   * @returns 表单详情
   */
  async get(id) {
    const form = await this.intakeService.get(id);
    if (!form) throw new BadRequestException("Intake form not found");
    return form;
  }
  /**
   * 更新表单草稿（需 AppUser JWT）。
   * @param req HTTP 请求
   * @param id 表单 ID
   * @param body 更新内容
   * @returns 更新后的表单
   */
  async update(req, id, body) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const input = {
      formData: parseObject(body.formData),
      leadId: parseOptionalNullableString(body.leadId, "leadId"),
    };
    return this.intakeService.update(id, ctx.appUserId, input);
  }
  /**
   * 提交表单（需 AppUser JWT）。
   * @param req HTTP 请求
   * @param id 表单 ID
   * @returns 提交后的表单
   */
  async submit(req, id) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    return this.intakeService.submit(id, ctx.appUserId);
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
  IntakeController.prototype,
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
  IntakeController.prototype,
  "list",
  null,
);
__decorate(
  [
    Public(),
    UseGuards(AppUserAuthGuard),
    Get(":id"),
    __param(0, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise),
  ],
  IntakeController.prototype,
  "get",
  null,
);
__decorate(
  [
    Public(),
    UseGuards(AppUserAuthGuard),
    Patch(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  IntakeController.prototype,
  "update",
  null,
);
__decorate(
  [
    Public(),
    UseGuards(AppUserAuthGuard),
    Post(":id/submit"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  IntakeController.prototype,
  "submit",
  null,
);
IntakeController = __decorate(
  [
    Controller("intake-forms"),
    __param(0, Inject(IntakeService)),
    __metadata("design:paramtypes", [IntakeService]),
  ],
  IntakeController,
);
export { IntakeController };
//# sourceMappingURL=intake.controller.js.map
