import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequirePermission } from "./auth.decorators";
import { PERMISSION_CODES, isValidPermissionCode } from "./permissions.codes";
import type { PermissionCode } from "./permissions.codes";
import { RolesAdminService } from "./rolesAdmin.service";
import type { RequestContext } from "../tenancy/requestContext";

type HttpRequest = {
  requestContext?: RequestContext;
};

type CreateRoleBody = {
  code?: unknown;
  name?: unknown;
  description?: unknown;
  permissions?: unknown;
};

type UpdateRoleBody = {
  name?: unknown;
  description?: unknown;
};

type SetPermissionsBody = {
  permissions?: unknown;
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
  if (typeof value === "string") return value.trim();
  throw new BadRequestException(`Invalid ${field}`);
}

function requirePermissionCodeArray(value: unknown): PermissionCode[] {
  if (!Array.isArray(value))
    throw new BadRequestException("permissions must be an array");
  const codes: PermissionCode[] = [];
  for (const item of value) {
    if (typeof item !== "string")
      throw new BadRequestException("Each permission must be a string");
    if (!isValidPermissionCode(item))
      throw new BadRequestException(`Invalid permission code: ${item}`);
    codes.push(item);
  }
  return codes;
}

/** 角色管理エンドポイント（/admin/roles）。 */
@Controller("admin/roles")
export class RolesAdminController {
  /**
   * コントローラーを生成する。
   *
   * @param rolesAdminService - 角色管理サービス
   */
  constructor(
    @Inject(RolesAdminService)
    private readonly rolesAdminService: RolesAdminService,
  ) {}

  /**
   * 角色一覧を取得する。
   *
   * @param req - HTTP リクエスト
   * @returns 角色一覧
   */
  @RequirePermission(PERMISSION_CODES.ROLE_ASSIGN)
  @Get()
  async list(@Req() req: HttpRequest) {
    return this.rolesAdminService.listRoles(requireCtx(req));
  }

  /**
   * 角色詳細を取得する。
   *
   * @param req - HTTP リクエスト
   * @param id - 角色 ID
   * @returns 角色詳細
   */
  @RequirePermission(PERMISSION_CODES.ROLE_ASSIGN)
  @Get(":id")
  async detail(@Req() req: HttpRequest, @Param("id") id: string) {
    const result = await this.rolesAdminService.getRoleDetail(
      requireCtx(req),
      id,
    );
    if (!result) throw new NotFoundException("Role not found");
    return result;
  }

  /**
   * カスタム角色を新規作成する。
   *
   * @param req - HTTP リクエスト
   * @param body - 作成パラメータ
   * @returns 作成された角色詳細
   */
  @RequirePermission(PERMISSION_CODES.PERMISSION_OVERRIDE)
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateRoleBody) {
    const ctx = requireCtx(req);
    const code = requireString(body.code, "code");
    const name = requireString(body.name, "name");
    const description = parseOptionalString(body.description, "description");
    const permissions = requirePermissionCodeArray(body.permissions ?? []);

    return this.rolesAdminService.createRole(ctx, {
      code,
      name,
      description,
      permissions,
    });
  }

  /**
   * カスタム角色の名称・説明を更新する。
   *
   * @param req - HTTP リクエスト
   * @param id - 角色 ID
   * @param body - 更新パラメータ
   * @returns 更新後の角色詳細
   */
  @RequirePermission(PERMISSION_CODES.PERMISSION_OVERRIDE)
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateRoleBody,
  ) {
    const ctx = requireCtx(req);
    const name = parseOptionalString(body.name, "name");
    const description = parseOptionalString(body.description, "description");

    if (name === undefined && description === undefined) {
      throw new BadRequestException("At least one field is required");
    }

    const result = await this.rolesAdminService.updateRole(ctx, id, {
      name,
      description,
    });
    if (!result) throw new NotFoundException("Role not found");
    return result;
  }

  /**
   * カスタム角色の権限コードを全量更新する。
   *
   * @param req - HTTP リクエスト
   * @param id - 角色 ID
   * @param body - 権限コード全量更新
   * @returns 更新後の角色詳細
   */
  @RequirePermission(PERMISSION_CODES.PERMISSION_OVERRIDE)
  @Put(":id/permissions")
  async setPermissions(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: SetPermissionsBody,
  ) {
    const ctx = requireCtx(req);
    const permissions = requirePermissionCodeArray(body.permissions);

    const result = await this.rolesAdminService.setRolePermissions(ctx, id, {
      permissions,
    });
    if (!result) throw new NotFoundException("Role not found");
    return result;
  }

  /**
   * カスタム角色を削除する。
   *
   * @param req - HTTP リクエスト
   * @param id - 角色 ID
   * @returns 成功フラグ
   */
  @RequirePermission(PERMISSION_CODES.PERMISSION_OVERRIDE)
  @Delete(":id")
  @HttpCode(200)
  async remove(@Req() req: HttpRequest, @Param("id") id: string) {
    await this.rolesAdminService.deleteRole(requireCtx(req), id);
    return { ok: true };
  }
}
