import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { Public } from "../../core/auth/auth.decorators";
import { AppUserAuthGuard } from "../auth/appUserAuth.guard";
import type { AppUserContext } from "../auth/appUserAuth.service";
import { AppUsersService } from "./appUsers.service";
import type {
  AppUserCreateInput,
  AppUserUpdateInput,
} from "./appUsers.service";

type CreateAppUserBody = {
  name?: unknown;
  preferredLanguage?: unknown;
  email?: unknown;
  phone?: unknown;
};

type UpdateAppUserBody = {
  name?: unknown;
  preferredLanguage?: unknown;
  email?: unknown;
  phone?: unknown;
  callerId?: unknown;
};

type HttpRequest = {
  headers?: Record<string, unknown>;
  appUserContext?: AppUserContext;
};

/**
 * AppUser CRUD 接口。
 *
 * - POST /app-users 为公开注册接口
 * - GET/PATCH 需 AppUser JWT 认证
 */
@Controller("app-users")
export class AppUsersController {
  /**
   * 创建 controller。
   * @param appUsersService AppUsers 服务
   */
  constructor(
    @Inject(AppUsersService)
    private readonly appUsersService: AppUsersService,
  ) {}

  /**
   * 注册新用户（公开接口）。
   * @param body 请求体
   * @returns 创建成功的 AppUser
   */
  @Public()
  @Post()
  async create(@Body() body: CreateAppUserBody) {
    const input: AppUserCreateInput = {
      name: requireString(body.name, "name"),
      preferredLanguage: parseOptionalString(
        body.preferredLanguage,
        "preferredLanguage",
      ),
      email: parseOptionalNullableString(body.email, "email"),
      phone: parseOptionalNullableString(body.phone, "phone"),
    };
    return this.appUsersService.create(input);
  }

  /**
   * 查看个人信息（需 AppUser JWT）。
   * @param req HTTP 请求
   * @param id AppUser ID
   * @returns AppUser
   */
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    if (ctx.appUserId !== id) throw new BadRequestException("Access denied");
    const user = await this.appUsersService.get(id);
    if (!user) throw new BadRequestException("App user not found");
    return user;
  }

  /**
   * 更新个人信息（限定本人，需 AppUser JWT）。
   * @param req HTTP 请求
   * @param id AppUser ID
   * @param body 请求体
   * @returns 更新后的 AppUser
   */
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateAppUserBody,
  ) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    if (ctx.appUserId !== id) throw new BadRequestException("Access denied");
    const input: AppUserUpdateInput = {
      name: parseOptionalString(body.name, "name"),
      preferredLanguage: parseOptionalString(
        body.preferredLanguage,
        "preferredLanguage",
      ),
      email: parseOptionalNullableString(body.email, "email"),
      phone: parseOptionalNullableString(body.phone, "phone"),
    };
    return this.appUsersService.update(id, ctx.appUserId, input);
  }
}

// ── Validation helpers ──

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}

function parseOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}

function parseOptionalNullableString(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}
