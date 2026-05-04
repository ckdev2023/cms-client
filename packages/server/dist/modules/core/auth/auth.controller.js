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
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { Public, RequireRoles } from "./auth.decorators";
import { AuthService } from "./auth.service";
/**
 * 鉴权与上下文相关接口（最小可用）。
 */
let AuthController = class AuthController {
  authService;
  /**
   * 创建认证控制器实例。
   *
   * @param authService 认证服务
   */
  constructor(authService) {
    this.authService = authService;
  }
  /**
   * 公开接口：用于验证服务运行。
   *
   * @returns ok
   */
  getPublic() {
    return { ok: true };
  }
  /**
   * 后台邮箱密码登录。
   *
   * @param body 请求体
   * @returns JWT 与当前用户信息
   */
  async login(body) {
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
  getMe(req) {
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
  getManagerOnly() {
    return { ok: true };
  }
};
__decorate(
  [
    Public(),
    Get("public"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0),
  ],
  AuthController.prototype,
  "getPublic",
  null,
);
__decorate(
  [
    Public(),
    Post("login"),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise),
  ],
  AuthController.prototype,
  "login",
  null,
);
__decorate(
  [
    Get("me"),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0),
  ],
  AuthController.prototype,
  "getMe",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Get("manager-only"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0),
  ],
  AuthController.prototype,
  "getManagerOnly",
  null,
);
AuthController = __decorate(
  [
    Controller("auth"),
    __param(0, Inject(AuthService)),
    __metadata("design:paramtypes", [AuthService]),
  ],
  AuthController,
);
export { AuthController };
function requireString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}
//# sourceMappingURL=auth.controller.js.map
