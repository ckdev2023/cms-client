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
import { IntakeService } from "./intake.service";
import type {
  IntakeFormCreateInput,
  IntakeFormUpdateInput,
  IntakeFormListInput,
} from "./intake.service";

type CreateBody = {
  appUserId?: unknown;
  leadId?: unknown;
  formData?: unknown;
};

type UpdateBody = {
  callerId?: unknown;
  formData?: unknown;
  leadId?: unknown;
};

// SubmitBody removed: submit now uses appUserContext from JWT

type ListQuery = {
  appUserId?: unknown;
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

function parseObject(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (value && typeof value === "object" && !Array.isArray(value))
    return value as Record<string, unknown>;
  throw new BadRequestException("Invalid formData");
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
 * IntakeForms 接口（需 AppUser JWT）。
 */
@Controller("intake-forms")
export class IntakeController {
  /**
   * 创建控制器。
   * @param intakeService 表单服务
   */
  constructor(
    @Inject(IntakeService) private readonly intakeService: IntakeService,
  ) {}

  /**
   * 创建表单草稿（需 AppUser JWT）。
   * @param req HTTP 请求
   * @param body 请求体
   * @returns 创建的表单
   */
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateBody) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const input: IntakeFormCreateInput = {
      appUserId: ctx.appUserId,
      leadId: parseOptionalNullableString(body.leadId, "leadId"),
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
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListQuery) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const input: IntakeFormListInput = {
      appUserId: ctx.appUserId,
      leadId: parseOptionalString(query.leadId, "leadId"),
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
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Get(":id")
  async get(@Param("id") id: string) {
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
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateBody,
  ) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const input: IntakeFormUpdateInput = {
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
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Post(":id/submit")
  async submit(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    return this.intakeService.submit(id, ctx.appUserId);
  }
}
