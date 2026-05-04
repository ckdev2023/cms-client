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
import { RequireRoles } from "../../core/auth/auth.decorators";
import { LeadsAdminService } from "../../core/leads/leads.admin.service";
import { AppUserAuthGuard } from "../auth/appUserAuth.guard";
import { LeadsService } from "./leads.service";
function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0)
    throw new BadRequestException(`Invalid ${field}`);
  return value;
}
function parseOptionalString(value, field) {
  if (value === undefined) return undefined;
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
function parseScope(value) {
  if (value === undefined) return undefined;
  if (value === "mine" || value === "group" || value === "all") return value;
  throw new BadRequestException("Invalid scope");
}
/**
 * Leads CRUD + 状态变更 + 分配接口。
 *
 * - create/list/get/update 需 AppUser JWT
 * - assign/convert 需后台 staff+ 权限
 */
let LeadsController = class LeadsController {
  leadsService;
  leadsAdminService;
  /**
   * 创建控制器。
   * @param leadsService Lead 服务
   * @param leadsAdminService 管理端 Lead 列表服务
   */
  constructor(leadsService, leadsAdminService) {
    this.leadsService = leadsService;
    this.leadsAdminService = leadsAdminService;
  }
  /**
   * 创建 Lead（需 AppUser JWT）。
   * @param req HTTP 请求
   * @param body 请求体
   * @returns 创建的 Lead
   */
  async create(req, body) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const input = {
      appUserId: ctx.appUserId,
      source: parseOptionalString(body.source, "source"),
      language: parseOptionalString(body.language, "language"),
    };
    return this.leadsService.create(input);
  }
  /**
   * 查询 Lead 列表（需 AppUser JWT，仅返回本人数据）。
   * @param req HTTP 请求
   * @param query 查询参数
   * @returns 分页结果
   */
  async list(req, query) {
    const adminCtx = req.requestContext;
    if (adminCtx) {
      return this.leadsAdminService.list(adminCtx, {
        scope: parseScope(query.scope),
        search: parseOptionalString(query.search, "search"),
        status: parseOptionalString(query.status, "status"),
        ownerUserId: parseOptionalString(query.ownerUserId, "ownerUserId"),
        groupId: parseOptionalString(query.groupId, "groupId"),
        businessType: parseOptionalString(query.businessType, "businessType"),
        dateFrom: parseOptionalString(query.dateFrom, "dateFrom"),
        dateTo: parseOptionalString(query.dateTo, "dateTo"),
        page: parsePage(query.page),
        limit: parseLimit(query.limit),
      });
    }
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const input = {
      appUserId: ctx.appUserId,
      status: parseOptionalString(query.status, "status"),
      assignedOrgId: parseOptionalString(query.assignedOrgId, "assignedOrgId"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    };
    return this.leadsService.list(input);
  }
  /**
   * 获取 Lead 详情（需 AppUser JWT，仅允许访问本人数据）。
   * @param req HTTP 请求
   * @param id Lead ID
   * @returns Lead 详情
   */
  async get(req, id) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const lead = await this.leadsService.get(id);
    if (!lead) throw new BadRequestException("Lead not found");
    if (lead.appUserId !== ctx.appUserId)
      throw new UnauthorizedException("Cannot access other user's lead");
    return lead;
  }
  /**
   * 更新 Lead（需 AppUser JWT，仅允许更新本人数据）。
   * @param req HTTP 请求
   * @param id Lead ID
   * @param body 更新内容
   * @returns 更新后的 Lead
   */
  async update(req, id, body) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const existing = await this.leadsService.get(id);
    if (!existing) throw new BadRequestException("Lead not found");
    if (existing.appUserId !== ctx.appUserId)
      throw new UnauthorizedException("Cannot update other user's lead");
    const input = {
      status: parseOptionalString(body.status, "status"),
      source: parseOptionalString(body.source, "source"),
      language: parseOptionalString(body.language, "language"),
    };
    return this.leadsService.update(id, input);
  }
  /**
   * 分配 Lead（需后台 staff+ 权限）。
   * @param id Lead ID
   * @param body 分配参数
   * @returns 分配后的 Lead
   */
  async assign(id, body) {
    const input = {
      assignedOrgId: requireString(body.assignedOrgId, "assignedOrgId"),
      assignedUserId: requireString(body.assignedUserId, "assignedUserId"),
    };
    return this.leadsService.assign(id, input);
  }
  /**
   * 转化 Lead 为 Case（需后台 staff+ 权限）。
   * @param req HTTP 请求
   * @param id Lead ID
   * @param body 转化参数
   * @returns 转化结果
   */
  async convert(req, id, body) {
    const input = {
      customerId: requireString(body.customerId, "customerId"),
      caseTypeCode: requireString(body.caseTypeCode, "caseTypeCode"),
      ownerUserId: requireString(body.ownerUserId, "ownerUserId"),
      orgId: requireString(body.orgId, "orgId"),
      confirmDedup: body.confirmDedup === true,
      actorUserId: req.requestContext?.userId,
    };
    return this.leadsService.convert(id, input);
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
  LeadsController.prototype,
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
  LeadsController.prototype,
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
  LeadsController.prototype,
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
  LeadsController.prototype,
  "update",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/assign"),
    __param(0, Param("id")),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise),
  ],
  LeadsController.prototype,
  "assign",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/convert"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  LeadsController.prototype,
  "convert",
  null,
);
LeadsController = __decorate(
  [
    Controller("leads"),
    __param(0, Inject(LeadsService)),
    __param(1, Inject(LeadsAdminService)),
    __metadata("design:paramtypes", [LeadsService, LeadsAdminService]),
  ],
  LeadsController,
);
export { LeadsController };
//# sourceMappingURL=leads.controller.js.map
