import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { Public, RequireRoles } from "./auth.decorators";
import { AuthService } from "./auth.service";
import type { RequestContext } from "../tenancy/requestContext";

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

type HttpRequest = {
  requestContext?: RequestContext;
};

/**
 * 鉴权与上下文相关接口（最小可用）。
 */
@Controller("auth")
export class AuthController {
  /**
   * 创建认证控制器实例。
   *
   * @param authService 认证服务
   */
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  /**
   * 公开接口：用于验证服务运行。
   *
   * @returns ok
   */
  @Public()
  @Get("public")
  getPublic() {
    return { ok: true };
  }

  /**
   * 后台邮箱密码登录。
   *
   * @param body 请求体
   * @returns JWT 与当前用户信息
   */
  @Public()
  @Post("login")
  async login(@Body() body: LoginBody) {
    return this.authService.login({
      email: requireString(body.email, "email"),
      password: requireString(body.password, "password"),
    });
  }

  /**
   * 返回当前请求上下文。
   *
   * @param req 请求对象
   * @returns 请求上下文
   */
  @Get("me")
  getMe(@Req() req: HttpRequest) {
    const ctx = req.requestContext;
    if (!ctx) {
      throw new UnauthorizedException("Missing request context");
    }
    return ctx;
  }

  /**
   * 仅 manager 以上可访问（用于验证 RBAC）。
   *
   * @returns ok
   */
  @RequireRoles("manager")
  @Get("manager-only")
  getManagerOnly() {
    return { ok: true };
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}
