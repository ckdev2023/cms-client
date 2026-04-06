import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Req,
  UnauthorizedException,
  Post,
  UseGuards,
} from "@nestjs/common";

import { Public } from "../../core/auth/auth.decorators";
import { AppUserAuthService } from "./appUserAuth.service";
import type { AppUserContext } from "./appUserAuth.service";
import { AppUserAuthGuard } from "./appUserAuth.guard";

type RequestCodeBody = {
  email?: unknown;
  phone?: unknown;
};

type VerifyCodeBody = {
  email?: unknown;
  phone?: unknown;
  code?: unknown;
};

type HttpRequest = {
  headers?: Record<string, unknown>;
  appUserContext?: AppUserContext;
};

function parseOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.length === 0)
    throw new BadRequestException(`Invalid ${field}`);
  return value;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new BadRequestException(`Invalid ${field}`);
  return value;
}

/**
 * AppUser 认证接口。
 */
@Controller("app-auth")
export class AppUserAuthController {
  /**
   * 创建控制器。
   * @param authService 认证服务
   */
  constructor(
    @Inject(AppUserAuthService)
    private readonly authService: AppUserAuthService,
  ) {}

  /**
   * 请求验证码。
   * @param body 请求体
   * @returns 操作结果
   */
  @Public()
  @Post("request-code")
  async requestCode(@Body() body: RequestCodeBody) {
    return this.authService.requestCode({
      email: parseOptionalString(body.email, "email"),
      phone: parseOptionalString(body.phone, "phone"),
    });
  }

  /**
   * 验证码校验 → 签发 JWT。
   * @param body 请求体
   * @returns JWT token 和 AppUser
   */
  @Public()
  @Post("verify-code")
  async verifyCode(@Body() body: VerifyCodeBody) {
    return this.authService.verifyCode({
      email: parseOptionalString(body.email, "email"),
      phone: parseOptionalString(body.phone, "phone"),
      code: requireString(body.code, "code"),
    });
  }

  /**
   * 获取当前 AppUser 信息。
   * @param req HTTP 请求对象
   * @returns AppUser 信息
   */
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Get("me")
  async me(@Req() req: HttpRequest) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    return this.authService.me(ctx.appUserId);
  }
}
