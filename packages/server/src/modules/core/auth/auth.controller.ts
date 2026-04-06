import { Controller, Get, Req, UnauthorizedException } from "@nestjs/common";

import { Public, RequireRoles } from "./auth.decorators";
import type { RequestContext } from "../tenancy/requestContext";

type HttpRequest = {
  requestContext?: RequestContext;
};

/**
 * 鉴权与上下文相关接口（最小可用）。
 */
@Controller("auth")
export class AuthController {
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
