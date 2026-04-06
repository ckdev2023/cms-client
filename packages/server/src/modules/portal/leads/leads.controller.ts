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
import { AppUserAuthGuard } from "../auth/appUserAuth.guard";
import type { AppUserContext } from "../auth/appUserAuth.service";
import { LeadsService } from "./leads.service";
import type {
  LeadCreateInput,
  LeadUpdateInput,
  LeadAssignInput,
  LeadConvertInput,
  LeadListInput,
} from "./leads.service";

type CreateLeadBody = {
  appUserId?: unknown;
  source?: unknown;
  language?: unknown;
};

type UpdateLeadBody = {
  status?: unknown;
  source?: unknown;
  language?: unknown;
};

type AssignLeadBody = {
  assignedOrgId?: unknown;
  assignedUserId?: unknown;
};

type ConvertLeadBody = {
  customerId?: unknown;
  caseTypeCode?: unknown;
  ownerUserId?: unknown;
  orgId?: unknown;
};

type ListLeadsQuery = {
  appUserId?: unknown;
  status?: unknown;
  assignedOrgId?: unknown;
  page?: unknown;
  limit?: unknown;
};

type HttpRequest = {
  headers?: Record<string, unknown>;
  appUserContext?: AppUserContext;
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

/**
 * Leads CRUD + 状态变更 + 分配接口。
 *
 * - create/list/get/update 需 AppUser JWT
 * - assign/convert 需后台 staff+ 权限
 */
@Controller("leads")
export class LeadsController {
  /**
   * 创建控制器。
   * @param leadsService Lead 服务
   */
  constructor(
    @Inject(LeadsService) private readonly leadsService: LeadsService,
  ) {}

  /**
   * 创建 Lead（需 AppUser JWT）。
   * @param req HTTP 请求
   * @param body 请求体
   * @returns 创建的 Lead
   */
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateLeadBody) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const input: LeadCreateInput = {
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
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListLeadsQuery) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const input: LeadListInput = {
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
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
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
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateLeadBody,
  ) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const existing = await this.leadsService.get(id);
    if (!existing) throw new BadRequestException("Lead not found");
    if (existing.appUserId !== ctx.appUserId)
      throw new UnauthorizedException("Cannot update other user's lead");
    const input: LeadUpdateInput = {
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
  @RequireRoles("staff")
  @Post(":id/assign")
  async assign(@Param("id") id: string, @Body() body: AssignLeadBody) {
    const input: LeadAssignInput = {
      assignedOrgId: requireString(body.assignedOrgId, "assignedOrgId"),
      assignedUserId: requireString(body.assignedUserId, "assignedUserId"),
    };
    return this.leadsService.assign(id, input);
  }

  /**
   * 转化 Lead 为 Case（需后台 staff+ 权限）。
   * @param id Lead ID
   * @param body 转化参数
   * @returns 转化结果
   */
  @RequireRoles("staff")
  @Post(":id/convert")
  async convert(@Param("id") id: string, @Body() body: ConvertLeadBody) {
    const input: LeadConvertInput = {
      customerId: requireString(body.customerId, "customerId"),
      caseTypeCode: requireString(body.caseTypeCode, "caseTypeCode"),
      ownerUserId: requireString(body.ownerUserId, "ownerUserId"),
      orgId: requireString(body.orgId, "orgId"),
    };
    return this.leadsService.convert(id, input);
  }
}
