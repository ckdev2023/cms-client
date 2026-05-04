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
  Req,
  UnauthorizedException,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Public } from "../../core/auth/auth.decorators";
import { AppUserAuthService } from "./appUserAuth.service";
import { AppUserAuthGuard } from "./appUserAuth.guard";
function parseOptionalString(value, field) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.length === 0)
    throw new BadRequestException(`Invalid ${field}`);
  return value;
}
function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0)
    throw new BadRequestException(`Invalid ${field}`);
  return value;
}
/**
 * AppUser 认证接口。
 */
let AppUserAuthController = class AppUserAuthController {
  authService;
  /**
   * 创建控制器。
   * @param authService 认证服务
   */
  constructor(authService) {
    this.authService = authService;
  }
  /**
   * 请求验证码。
   * @param body 请求体
   * @returns 操作结果
   */
  async requestCode(body) {
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
  async verifyCode(body) {
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
  async me(req) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    return this.authService.me(ctx.appUserId);
  }
};
__decorate(
  [
    Public(),
    Post("request-code"),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise),
  ],
  AppUserAuthController.prototype,
  "requestCode",
  null,
);
__decorate(
  [
    Public(),
    Post("verify-code"),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise),
  ],
  AppUserAuthController.prototype,
  "verifyCode",
  null,
);
__decorate(
  [
    Public(),
    UseGuards(AppUserAuthGuard),
    Get("me"),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise),
  ],
  AppUserAuthController.prototype,
  "me",
  null,
);
AppUserAuthController = __decorate(
  [
    Controller("app-auth"),
    __param(0, Inject(AppUserAuthService)),
    __metadata("design:paramtypes", [AppUserAuthService]),
  ],
  AppUserAuthController,
);
export { AppUserAuthController };
//# sourceMappingURL=appUserAuth.controller.js.map
