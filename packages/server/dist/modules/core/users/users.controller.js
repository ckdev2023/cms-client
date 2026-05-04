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
  Controller,
  Get,
  Inject,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { RequireRoles } from "../auth/auth.decorators";
import { UsersService } from "./users.service";
/**
 * 組織内ユーザー一覧エンドポイント（staff 以上）。
 */
let UsersController = class UsersController {
  usersService;
  /**
   * コントローラーを生成する。
   *
   * @param usersService - ユーザーサービス
   */
  constructor(usersService) {
    this.usersService = usersService;
  }
  /**
   * 同一テナントのユーザー一覧を返す。
   *
   * @param req HTTP リクエスト
   * @returns ユーザー一覧
   */
  async list(req) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.usersService.listOrgUsers(ctx);
  }
};
__decorate(
  [
    RequireRoles("staff"),
    Get(),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise),
  ],
  UsersController.prototype,
  "list",
  null,
);
UsersController = __decorate(
  [
    Controller("users"),
    __param(0, Inject(UsersService)),
    __metadata("design:paramtypes", [UsersService]),
  ],
  UsersController,
);
export { UsersController };
//# sourceMappingURL=users.controller.js.map
