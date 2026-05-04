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
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Public } from "../../core/auth/auth.decorators";
import { AppUserAuthGuard } from "../auth/appUserAuth.guard";
import { AppUsersService } from "./appUsers.service";
/**
 * AppUser CRUD 接口。
 *
 * - POST /app-users 为公开注册接口
 * - GET/PATCH 需 AppUser JWT 认证
 */
let AppUsersController = class AppUsersController {
  appUsersService;
  /**
   * 创建 controller。
   * @param appUsersService AppUsers 服务
   */
  constructor(appUsersService) {
    this.appUsersService = appUsersService;
  }
  /**
   * 注册新用户（公开接口）。
   * @param body 请求体
   * @returns 创建成功的 AppUser
   */
  async create(body) {
    const input = {
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
  async get(req, id) {
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
  async update(req, id, body) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    if (ctx.appUserId !== id) throw new BadRequestException("Access denied");
    const input = {
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
};
__decorate(
  [
    Public(),
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise),
  ],
  AppUsersController.prototype,
  "create",
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
  AppUsersController.prototype,
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
  AppUsersController.prototype,
  "update",
  null,
);
AppUsersController = __decorate(
  [
    Controller("app-users"),
    __param(0, Inject(AppUsersService)),
    __metadata("design:paramtypes", [AppUsersService]),
  ],
  AppUsersController,
);
export { AppUsersController };
// ── Validation helpers ──
function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}
function parseOptionalString(value, field) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}
function parseOptionalNullableString(value, field) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}
//# sourceMappingURL=appUsers.controller.js.map
