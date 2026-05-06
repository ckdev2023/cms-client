import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import { EffectivePermissionsService } from "./effective-permissions.service";
import { isValidPermissionCode } from "./permissions.codes";
import type {
  PermissionOverrideDto,
  SetPermissionOverridesInput,
} from "./rolesAdmin.types";
import {
  requireTimestampString,
  toTimestampStringOrNull,
} from "../model/timestamps";

type OverrideRow = {
  user_id: string;
  permission: string;
  effect: string;
  reason: string | null;
  granted_by: string;
  granted_at: unknown;
  expires_at: unknown;
};

/**
 * OverrideRow → PermissionOverrideDto 変換。
 *
 * @param row - DB 行
 * @returns DTO
 */
function mapOverrideRow(row: OverrideRow): PermissionOverrideDto {
  return {
    userId: row.user_id,
    permission: row.permission,
    effect: row.effect as "grant" | "deny",
    reason: row.reason,
    grantedBy: row.granted_by,
    grantedAt: requireTimestampString(row.granted_at, "granted_at"),
    expiresAt: toTimestampStringOrNull(row.expires_at),
  };
}

/** ユーザー権限覆盖管理サービス（Phase B3）。 */
@Injectable()
export class PermissionOverridesService {
  /**
   * サービスを生成する。
   *
   * @param pool - PostgreSQL 接続プール
   * @param timelineService - タイムライン記録サービス
   * @param effectivePermissions - 有効権限解析サービス
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
    @Inject(EffectivePermissionsService)
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  private tenantDb(ctx: RequestContext) {
    return createTenantDb(this.pool, ctx.orgId, ctx.userId);
  }

  /**
   * 指定ユーザーの権限覆盖一覧を取得する。
   *
   * @param ctx - リクエストコンテキスト
   * @param userId - ユーザー ID
   * @returns 覆盖一覧
   */
  async listOverrides(
    ctx: RequestContext,
    userId: string,
  ): Promise<{ items: PermissionOverrideDto[] }> {
    await this.assertUserBelongsToOrg(ctx, userId);

    const db = this.tenantDb(ctx);
    const result = await db.query<OverrideRow>(
      `SELECT * FROM user_permission_overrides
       WHERE user_id = $1
       ORDER BY permission`,
      [userId],
    );
    return { items: result.rows.map(mapOverrideRow) };
  }

  /**
   * 指定ユーザーの権限覆盖を全量更新する。
   *
   * @param ctx - リクエストコンテキスト
   * @param userId - ユーザー ID
   * @param input - 覆盖一括更新入力
   * @returns 更新後の覆盖一覧
   */
  async setOverrides(
    ctx: RequestContext,
    userId: string,
    input: SetPermissionOverridesInput,
  ): Promise<{ items: PermissionOverrideDto[] }> {
    await this.assertUserBelongsToOrg(ctx, userId);
    this.validateOverrides(input);

    const db = this.tenantDb(ctx);
    await db.transaction(async (tx) => {
      await tx.query(
        `DELETE FROM user_permission_overrides WHERE user_id = $1`,
        [userId],
      );

      for (const o of input.overrides) {
        await tx.query(
          `INSERT INTO user_permission_overrides
             (user_id, permission, effect, reason, granted_by, granted_at, expires_at)
           VALUES ($1, $2, $3, $4, $5, now(), $6)`,
          [
            userId,
            o.permission,
            o.effect,
            o.reason,
            ctx.userId,
            o.expiresAt ?? null,
          ],
        );
      }
    });

    this.effectivePermissions.invalidate(userId);

    await this.timelineService.write(ctx, {
      entityType: "user",
      entityId: userId,
      action: "user_permission_overrides_set",
      payload: {
        count: input.overrides.length,
        overrides: input.overrides.map((o) => ({
          permission: o.permission,
          effect: o.effect,
        })),
      },
    });

    return this.listOverrides(ctx, userId);
  }

  /**
   * 指定ユーザーの権限覆盖を一件削除する。
   *
   * @param ctx - リクエストコンテキスト
   * @param userId - ユーザー ID
   * @param permission - 権限コード
   */
  async deleteOverride(
    ctx: RequestContext,
    userId: string,
    permission: string,
  ): Promise<void> {
    await this.assertUserBelongsToOrg(ctx, userId);

    const db = this.tenantDb(ctx);
    const result = await db.query(
      `DELETE FROM user_permission_overrides
       WHERE user_id = $1 AND permission = $2`,
      [userId, permission],
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new UnprocessableEntityException("OVERRIDE_NOT_FOUND");
    }

    this.effectivePermissions.invalidate(userId);

    await this.timelineService.write(ctx, {
      entityType: "user",
      entityId: userId,
      action: "user_permission_override_removed",
      payload: { permission },
    });
  }

  private validateOverrides(input: SetPermissionOverridesInput): void {
    const validEffects = new Set(["grant", "deny"]);
    const seen = new Set<string>();
    for (const o of input.overrides) {
      const perm: string = o.permission;
      if (!isValidPermissionCode(perm)) {
        throw new UnprocessableEntityException(
          `Invalid permission code: ${perm}`,
        );
      }
      if (!validEffects.has(o.effect)) {
        throw new UnprocessableEntityException(
          "Invalid effect; must be grant or deny",
        );
      }
      if (!o.reason || o.reason.trim().length < 5) {
        throw new UnprocessableEntityException(
          `reason is required and must be >= 5 characters for ${o.permission}`,
        );
      }
      if (seen.has(o.permission)) {
        throw new UnprocessableEntityException(
          `Duplicate permission in overrides: ${o.permission}`,
        );
      }
      seen.add(o.permission);
    }
  }

  private async assertUserBelongsToOrg(
    ctx: RequestContext,
    userId: string,
  ): Promise<void> {
    const db = this.tenantDb(ctx);
    const result = await db.query<{ id: string }>(
      `SELECT id FROM users WHERE id = $1 AND org_id = $2`,
      [userId, ctx.orgId],
    );
    if (result.rows.length === 0) {
      throw new UnprocessableEntityException("USER_NOT_FOUND");
    }
  }
}
