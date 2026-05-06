import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import { EffectivePermissionsService } from "./effective-permissions.service";
import { isValidPermissionCode } from "./permissions.codes";
import type {
  CreateRoleInput,
  RoleDetailDto,
  RoleDto,
  SetRolePermissionsInput,
  UpdateRoleInput,
} from "./rolesAdmin.types";
import { requireTimestampString } from "../model/timestamps";

type RoleRow = {
  id: string;
  org_id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_by: string | null;
  created_at: unknown;
  updated_at: unknown;
  member_count: string;
};

type RoleDetailRow = Omit<RoleRow, "member_count"> & {
  member_count?: string;
};

/**
 * RoleRow → RoleDto 変換。
 *
 * @param row - DB 行
 * @returns DTO
 */
function mapRoleRow(row: RoleRow): RoleDto {
  return {
    id: row.id,
    orgId: row.org_id,
    code: row.code,
    name: row.name,
    description: row.description,
    isSystem: row.is_system,
    memberCount: Number.parseInt(row.member_count, 10),
    createdBy: row.created_by,
    createdAt: requireTimestampString(row.created_at, "created_at"),
    updatedAt: requireTimestampString(row.updated_at, "updated_at"),
  };
}

/** 角色管理サービス（Phase B3 設定 API）。 */
@Injectable()
export class RolesAdminService {
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
   * 角色一覧を取得する。
   *
   * @param ctx - リクエストコンテキスト
   * @returns 角色一覧
   */
  async listRoles(ctx: RequestContext): Promise<{ items: RoleDto[] }> {
    const db = this.tenantDb(ctx);
    const result = await db.query<RoleRow>(
      `SELECT r.*, COALESCE(uc.cnt, 0) AS member_count
       FROM roles r
       LEFT JOIN (
         SELECT role_id, count(*) AS cnt FROM users
         WHERE org_id = $1 AND role_id IS NOT NULL
         GROUP BY role_id
       ) uc ON uc.role_id = r.id
       WHERE r.org_id = $1
       ORDER BY r.is_system DESC, r.name ASC`,
      [ctx.orgId],
    );
    return { items: result.rows.map(mapRoleRow) };
  }

  /**
   * 角色詳細（権限コード付き）を取得する。
   *
   * @param ctx - リクエストコンテキスト
   * @param roleId - 角色 ID
   * @returns 角色詳細（見つからない場合 null）
   */
  async getRoleDetail(
    ctx: RequestContext,
    roleId: string,
  ): Promise<RoleDetailDto | null> {
    const db = this.tenantDb(ctx);
    const roleResult = await db.query<RoleDetailRow>(
      `SELECT r.*, COALESCE(uc.cnt, 0) AS member_count
       FROM roles r
       LEFT JOIN (
         SELECT role_id, count(*) AS cnt FROM users
         WHERE org_id = $1 AND role_id IS NOT NULL
         GROUP BY role_id
       ) uc ON uc.role_id = r.id
       WHERE r.id = $2 AND r.org_id = $1`,
      [ctx.orgId, roleId],
    );
    const row = roleResult.rows.at(0);
    if (!row) return null;

    const permsResult = await db.query<{ permission: string }>(
      `SELECT permission FROM role_permissions WHERE role_id = $1 ORDER BY permission`,
      [roleId],
    );

    return {
      ...mapRoleRow({ ...row, member_count: row.member_count ?? "0" }),
      permissions: permsResult.rows.map((r) => r.permission),
    };
  }

  /**
   * カスタム角色を新規作成する。
   *
   * @param ctx - リクエストコンテキスト
   * @param input - 作成パラメータ
   * @returns 作成された角色詳細
   */
  async createRole(
    ctx: RequestContext,
    input: CreateRoleInput,
  ): Promise<RoleDetailDto> {
    this.validatePermissionCodes(input.permissions);

    const db = this.tenantDb(ctx);
    let newId: string;

    try {
      newId = await db.transaction(async (tx) => {
        const insertResult = await tx.query<{ id: string }>(
          `INSERT INTO roles (org_id, code, name, description, is_system, created_by)
           VALUES ($1, $2, $3, $4, false, $5)
           RETURNING id`,
          [
            ctx.orgId,
            input.code,
            input.name,
            input.description ?? null,
            ctx.userId,
          ],
        );
        const roleId = insertResult.rows[0].id;

        if (input.permissions.length > 0) {
          const values = input.permissions
            .map((_, i) => `($1, $${String(i + 2)})`)
            .join(", ");
          await tx.query(
            `INSERT INTO role_permissions (role_id, permission) VALUES ${values}
             ON CONFLICT (role_id, permission) DO NOTHING`,
            [roleId, ...input.permissions],
          );
        }

        return roleId;
      });
    } catch (err: unknown) {
      if (isDuplicateCodeConstraint(err)) {
        throw new UnprocessableEntityException("ROLE_DUPLICATE_CODE");
      }
      throw err;
    }

    await this.timelineService.write(ctx, {
      entityType: "role",
      entityId: newId,
      action: "role_created",
      payload: {
        code: input.code,
        name: input.name,
        permissionCount: input.permissions.length,
      },
    });

    const detail = await this.getRoleDetail(ctx, newId);
    if (!detail) throw new Error("Role created but could not be retrieved");
    return detail;
  }

  /**
   * カスタム角色の名称・説明を更新する。
   *
   * @param ctx - リクエストコンテキスト
   * @param roleId - 角色 ID
   * @param input - 更新パラメータ
   * @returns 更新後の角色詳細（見つからない場合 null）
   */
  async updateRole(
    ctx: RequestContext,
    roleId: string,
    input: UpdateRoleInput,
  ): Promise<RoleDetailDto | null> {
    const existing = await this.getRoleDetail(ctx, roleId);
    if (!existing) return null;

    if (existing.isSystem) {
      throw new UnprocessableEntityException("ROLE_SYSTEM_CANNOT_MODIFY");
    }

    const db = this.tenantDb(ctx);
    const sets: string[] = [];
    const params: unknown[] = [];

    if (input.name !== undefined) {
      params.push(input.name);
      sets.push(`name = $${String(params.length)}`);
    }
    if (input.description !== undefined) {
      params.push(input.description);
      sets.push(`description = $${String(params.length)}`);
    }
    if (sets.length === 0) return existing;

    sets.push("updated_at = now()");
    params.push(roleId);

    await db.query(
      `UPDATE roles SET ${sets.join(", ")} WHERE id = $${String(params.length)}`,
      params,
    );

    await this.timelineService.write(ctx, {
      entityType: "role",
      entityId: roleId,
      action: "role_updated",
      payload: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
      },
    });

    return this.getRoleDetail(ctx, roleId);
  }

  /**
   * カスタム角色の権限コードを全量更新する。
   *
   * @param ctx - リクエストコンテキスト
   * @param roleId - 角色 ID
   * @param input - 権限コード全量更新入力
   * @returns 更新後の角色詳細（見つからない場合 null）
   */
  async setRolePermissions(
    ctx: RequestContext,
    roleId: string,
    input: SetRolePermissionsInput,
  ): Promise<RoleDetailDto | null> {
    const existing = await this.getRoleDetail(ctx, roleId);
    if (!existing) return null;

    if (existing.isSystem) {
      throw new UnprocessableEntityException(
        "ROLE_SYSTEM_CANNOT_MODIFY_PERMISSIONS",
      );
    }

    this.validatePermissionCodes(input.permissions);

    const db = this.tenantDb(ctx);
    await db.transaction(async (tx) => {
      await tx.query(`DELETE FROM role_permissions WHERE role_id = $1`, [
        roleId,
      ]);

      if (input.permissions.length > 0) {
        const values = input.permissions
          .map((_, i) => `($1, $${String(i + 2)})`)
          .join(", ");
        await tx.query(
          `INSERT INTO role_permissions (role_id, permission) VALUES ${values}`,
          [roleId, ...input.permissions],
        );
      }
    });

    await this.invalidateUsersWithRole(ctx, roleId);

    await this.timelineService.write(ctx, {
      entityType: "role",
      entityId: roleId,
      action: "role_permissions_changed",
      payload: {
        permissions: input.permissions,
        previousPermissions: existing.permissions,
      },
    });

    return this.getRoleDetail(ctx, roleId);
  }

  /**
   * カスタム角色を削除する。
   *
   * @param ctx - リクエストコンテキスト
   * @param roleId - 角色 ID
   */
  async deleteRole(ctx: RequestContext, roleId: string): Promise<void> {
    const existing = await this.getRoleDetail(ctx, roleId);
    if (!existing) throw new NotFoundException("Role not found");

    if (existing.isSystem) {
      throw new UnprocessableEntityException("ROLE_SYSTEM_CANNOT_DELETE");
    }

    if (existing.memberCount > 0) {
      throw new UnprocessableEntityException("ROLE_HAS_MEMBERS");
    }

    const db = this.tenantDb(ctx);
    await db.query(`DELETE FROM roles WHERE id = $1`, [roleId]);

    await this.timelineService.write(ctx, {
      entityType: "role",
      entityId: roleId,
      action: "role_deleted",
      payload: { code: existing.code, name: existing.name },
    });
  }

  private validatePermissionCodes(permissions: string[]): void {
    const invalid = permissions.filter((p) => !isValidPermissionCode(p));
    if (invalid.length > 0) {
      throw new UnprocessableEntityException(
        `Invalid permission codes: ${invalid.join(", ")}`,
      );
    }
    const unique = new Set(permissions);
    if (unique.size !== permissions.length) {
      throw new UnprocessableEntityException("Duplicate permission codes");
    }
  }

  private async invalidateUsersWithRole(
    ctx: RequestContext,
    roleId: string,
  ): Promise<void> {
    const db = this.tenantDb(ctx);
    const result = await db.query<{ id: string }>(
      `SELECT id FROM users WHERE role_id = $1 AND org_id = $2`,
      [roleId, ctx.orgId],
    );
    for (const row of result.rows) {
      this.effectivePermissions.invalidate(row.id);
    }
  }
}

function isDuplicateCodeConstraint(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const pgErr = err as { code?: string; constraint?: string };
  return (
    pgErr.code === "23505" && (pgErr.constraint?.includes("code") ?? false)
  );
}
