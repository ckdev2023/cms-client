import {
  Controller,
  Get,
  Inject,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { EffectivePermissionsService } from "./effective-permissions.service";
import type { MePermissionsDto } from "./rolesAdmin.types";

type HttpRequest = {
  requestContext?: RequestContext;
};

/** 現在のユーザーの有効権限を返すエンドポイント。 */
@Controller("me")
export class MePermissionsController {
  /**
   * コントローラーを生成する。
   *
   * @param effectivePermissions - 有効権限解析サービス
   * @param pool - PostgreSQL 接続プール
   */
  constructor(
    @Inject(EffectivePermissionsService)
    private readonly effectivePermissions: EffectivePermissionsService,
    @Inject(Pool) private readonly pool: Pool,
  ) {}

  /**
   * 現在のセッションユーザーの有効権限コードセットを返す。
   *
   * @param req - HTTP リクエスト
   * @returns 有効権限コードセット + roleId + role + TTL
   */
  @Get("permissions")
  async getPermissions(@Req() req: HttpRequest): Promise<MePermissionsDto> {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const permissions = await this.effectivePermissions.resolve(
      ctx.orgId,
      ctx.userId,
    );

    const db = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const userResult = await db.query<{
      role_id: string | null;
      role_code: string | null;
    }>(
      `SELECT u.role_id, r.code AS role_code
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [ctx.userId],
    );

    const user = userResult.rows.at(0);

    return {
      permissions: [...permissions].sort(),
      roleId: user?.role_id ?? null,
      role: user?.role_code ?? ctx.role,
      ttl: 60,
    };
  }
}
