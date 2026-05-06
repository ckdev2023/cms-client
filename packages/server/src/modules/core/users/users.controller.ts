import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequirePermission } from "../auth/auth.decorators";
import { EffectivePermissionsService } from "../auth/effective-permissions.service";
import { PERMISSION_CODES } from "../auth/permissions.codes";
import { parseRole } from "../auth/roles";
import type { RequestContext } from "../tenancy/requestContext";
import { UsersService } from "./users.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type CreateUserBody = {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  initialPassword?: unknown;
  primaryGroupId?: unknown;
};

type UpdateUserBody = {
  name?: unknown;
  email?: unknown;
};

type UpdateUserRoleBody = {
  role?: unknown;
};

function requireCtx(req: HttpRequest): RequestContext {
  const ctx = req.requestContext;
  if (!ctx) throw new UnauthorizedException("Missing request context");
  return ctx;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0)
    throw new BadRequestException(`${field} is required`);
  return value.trim();
}

function parseOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  throw new BadRequestException(`Invalid ${field}`);
}

/**
 * 組織内ユーザー管理エンドポイント。
 */
@Controller("users")
export class UsersController {
  /**
   * コントローラーを生成する。
   *
   * @param usersService - ユーザーサービス
   * @param effectivePermissions - 有効権限解析サービス
   */
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(EffectivePermissionsService)
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  /**
   * 現在のセッションユーザーの有効権限コードセットを返す。
   *
   * @param req - HTTP リクエスト
   * @returns 有効権限コード配列と角色情報
   */
  @Get("me/permissions")
  async myPermissions(@Req() req: HttpRequest) {
    const ctx = requireCtx(req);
    const permissions = await this.effectivePermissions.resolve(
      ctx.orgId,
      ctx.userId,
    );
    return {
      permissions: [...permissions],
      role: ctx.role,
      userId: ctx.userId,
    };
  }

  /**
   * ユーザー一覧を返す（staff 以上）。
   *
   * @param req - HTTP リクエスト
   * @returns ユーザー一覧
   */
  @RequirePermission(PERMISSION_CODES.USER_VIEW)
  @Get()
  async list(@Req() req: HttpRequest) {
    return this.usersService.listOrgUsers(requireCtx(req));
  }

  /**
   * 新規ユーザーを作成する（manager 以上）。
   *
   * @param req - HTTP リクエスト
   * @param body - 作成パラメータ
   * @returns 作成されたユーザー詳細
   */
  @RequirePermission(PERMISSION_CODES.USER_MANAGE)
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateUserBody) {
    const ctx = requireCtx(req);
    const name = requireString(body.name, "name");
    const email = requireString(body.email, "email");
    const roleRaw = requireString(body.role, "role");
    const role = parseRole(roleRaw);
    if (!role) throw new BadRequestException("Invalid role");
    const initialPassword = requireString(
      body.initialPassword,
      "initialPassword",
    );
    const primaryGroupId =
      typeof body.primaryGroupId === "string" && body.primaryGroupId.trim()
        ? body.primaryGroupId.trim()
        : undefined;

    return this.usersService.createUser(ctx, {
      name,
      email,
      role,
      initialPassword,
      primaryGroupId,
    });
  }

  /**
   * ユーザーの角色を変更する（manager 以上）。
   *
   * @param req - HTTP リクエスト
   * @param id - ユーザー ID
   * @param body - 角色変更パラメータ
   * @returns 更新後のユーザー詳細
   */
  @RequirePermission(PERMISSION_CODES.ROLE_ASSIGN)
  @Patch(":id/role")
  async updateRole(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateUserRoleBody,
  ) {
    const ctx = requireCtx(req);
    const roleRaw = requireString(body.role, "role");
    const role = parseRole(roleRaw);
    if (!role) throw new BadRequestException("Invalid role");

    const result = await this.usersService.updateUserRole(ctx, id, { role });
    if (!result) throw new NotFoundException("User not found");
    return result;
  }

  /**
   * ユーザーの基本情報（名前・メール）を更新する（manager 以上）。
   *
   * @param req - HTTP リクエスト
   * @param id - ユーザー ID
   * @param body - 更新パラメータ
   * @returns 更新後のユーザー詳細
   */
  @RequirePermission(PERMISSION_CODES.USER_MANAGE)
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateUserBody,
  ) {
    const ctx = requireCtx(req);
    const name = parseOptionalString(body.name, "name");
    const email = parseOptionalString(body.email, "email");

    if (name === undefined && email === undefined) {
      throw new BadRequestException("At least one field is required");
    }

    const result = await this.usersService.updateUser(ctx, id, { name, email });
    if (!result) throw new NotFoundException("User not found");
    return result;
  }

  /**
   * ユーザーを停用する（manager 以上）。
   *
   * @param req - HTTP リクエスト
   * @param id - ユーザー ID
   * @returns 更新後のユーザー詳細
   */
  @RequirePermission(PERMISSION_CODES.USER_MANAGE)
  @Post(":id/disable")
  async disable(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = requireCtx(req);
    const result = await this.usersService.disableUser(ctx, id);
    if (!result) throw new NotFoundException("User not found");
    return result;
  }

  /**
   * ユーザーを再有効化する（manager 以上）。
   *
   * @param req - HTTP リクエスト
   * @param id - ユーザー ID
   * @returns 更新後のユーザー詳細
   */
  @RequirePermission(PERMISSION_CODES.USER_MANAGE)
  @Post(":id/activate")
  async activate(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = requireCtx(req);
    const result = await this.usersService.activateUser(ctx, id);
    if (!result) throw new NotFoundException("User not found");
    return result;
  }

  /**
   * ユーザーのパスワードをリセットする（manager 以上）。
   *
   * @param req - HTTP リクエスト
   * @param id - ユーザー ID
   * @returns 一時パスワード
   */
  @RequirePermission(PERMISSION_CODES.USER_MANAGE)
  @Post(":id/reset-password")
  async resetPassword(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = requireCtx(req);
    return this.usersService.resetPassword(ctx, id);
  }
}
