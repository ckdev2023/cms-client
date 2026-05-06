import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Put,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequirePermission } from "./auth.decorators";
import { PERMISSION_CODES, isValidPermissionCode } from "./permissions.codes";
import type { PermissionCode } from "./permissions.codes";
import { PermissionOverridesService } from "./permissionOverrides.service";
import type { RequestContext } from "../tenancy/requestContext";

type HttpRequest = {
  requestContext?: RequestContext;
};

type OverrideItem = {
  permission?: unknown;
  effect?: unknown;
  reason?: unknown;
  expiresAt?: unknown;
};

type SetOverridesBody = {
  overrides?: unknown;
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

function parseOverrideItems(value: unknown): {
  permission: PermissionCode;
  effect: "grant" | "deny";
  reason: string;
  expiresAt?: string;
}[] {
  if (!Array.isArray(value))
    throw new BadRequestException("overrides must be an array");

  return (value as unknown[]).map((raw: unknown, idx: number) => {
    const item = raw as OverrideItem | null;
    if (!item || typeof item !== "object")
      throw new BadRequestException(
        `overrides[${String(idx)}] must be an object`,
      );

    const permission = requireString(
      item.permission,
      `overrides[${String(idx)}].permission`,
    );
    if (!isValidPermissionCode(permission))
      throw new BadRequestException(`Invalid permission code: ${permission}`);

    const effect = requireString(
      item.effect,
      `overrides[${String(idx)}].effect`,
    );
    if (effect !== "grant" && effect !== "deny")
      throw new BadRequestException(
        `overrides[${String(idx)}].effect must be "grant" or "deny"`,
      );

    const reason = requireString(
      item.reason,
      `overrides[${String(idx)}].reason`,
    );

    const expiresAt =
      item.expiresAt !== undefined && item.expiresAt !== null
        ? requireString(item.expiresAt, `overrides[${String(idx)}].expiresAt`)
        : undefined;

    return { permission, effect, reason, expiresAt };
  });
}

/** ユーザー権限覆盖エンドポイント。 */
@Controller("admin/users/:userId/permission-overrides")
export class PermissionOverridesController {
  /**
   * コントローラーを生成する。
   *
   * @param overridesService - 権限覆盖サービス
   */
  constructor(
    @Inject(PermissionOverridesService)
    private readonly overridesService: PermissionOverridesService,
  ) {}

  /**
   * 指定ユーザーの権限覆盖一覧を取得する。
   *
   * @param req - HTTP リクエスト
   * @param userId - ユーザー ID
   * @returns 覆盖一覧
   */
  @RequirePermission(PERMISSION_CODES.USER_VIEW)
  @Get()
  async list(@Req() req: HttpRequest, @Param("userId") userId: string) {
    return this.overridesService.listOverrides(requireCtx(req), userId);
  }

  /**
   * 指定ユーザーの権限覆盖を全量更新する。
   *
   * @param req - HTTP リクエスト
   * @param userId - ユーザー ID
   * @param body - 覆盖一括更新リクエスト
   * @returns 更新後の覆盖一覧
   */
  @RequirePermission(PERMISSION_CODES.PERMISSION_OVERRIDE)
  @Put()
  async set(
    @Req() req: HttpRequest,
    @Param("userId") userId: string,
    @Body() body: SetOverridesBody,
  ) {
    const ctx = requireCtx(req);
    const overrides = parseOverrideItems(body.overrides);
    return this.overridesService.setOverrides(ctx, userId, { overrides });
  }

  /**
   * 指定ユーザーの権限覆盖を一件削除する。
   *
   * @param req - HTTP リクエスト
   * @param userId - ユーザー ID
   * @param permission - 削除対象の権限コード
   * @returns 成功フラグ
   */
  @RequirePermission(PERMISSION_CODES.PERMISSION_OVERRIDE)
  @Delete(":permission")
  @HttpCode(200)
  async remove(
    @Req() req: HttpRequest,
    @Param("userId") userId: string,
    @Param("permission") permission: string,
  ) {
    await this.overridesService.deleteOverride(
      requireCtx(req),
      userId,
      permission,
    );
    return { ok: true };
  }
}
