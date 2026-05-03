import {
  Controller,
  Get,
  Inject,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequireRoles } from "../auth/auth.decorators";
import type { RequestContext } from "../tenancy/requestContext";
import { UsersService } from "./users.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

/**
 * 組織内ユーザー一覧エンドポイント（staff 以上）。
 */
@Controller("users")
export class UsersController {
  /**
   * コントローラーを生成する。
   *
   * @param usersService - ユーザーサービス
   */
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {}

  /**
   * 同一テナントのユーザー一覧を返す。
   *
   * @param req HTTP リクエスト
   * @returns ユーザー一覧
   */
  @RequireRoles("staff")
  @Get()
  async list(@Req() req: HttpRequest) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.usersService.listOrgUsers(ctx);
  }
}
