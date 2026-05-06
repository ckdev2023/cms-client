import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Pool } from "pg";

import { hashPassword } from "../auth/auth.service";
import { EffectivePermissionsService } from "../auth/effective-permissions.service";
import { canAssignRole } from "../auth/roleAuthority";
import { parseRole, type Role } from "../auth/roles";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb, type TenantDbTx } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import {
  assertCanManage,
  generateTemporaryPassword,
  isDuplicateEmailConstraint,
  mapOrgUserRow,
  mapUserDetailRow,
  type OrgUserRow,
  type UserDetailRow,
} from "./users.internal";
import type {
  CreateUserInput,
  ResetPasswordResultDto,
  UpdateUserInput,
  UpdateUserRoleInput,
  UserDetailDto,
} from "./users.types";

export type { OrgUserDto, OrgUserListResultDto } from "./users.internal";

/**
 * 組織内ユーザーの管理サービス。
 */
@Injectable()
export class UsersService {
  /**
   * ユーザーサービスを生成する。
   *
   * @param pool - PostgreSQL 接続プール
   * @param timelineService - タイムライン記録サービス
   * @param effectivePermissions - 有効権限解決サービス
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
   * 同一テナント内のユーザー一覧を返す。
   *
   * @param ctx - リクエストコンテキスト
   * @returns ユーザー一覧
   */
  async listOrgUsers(ctx: RequestContext) {
    const db = this.tenantDb(ctx);
    const result = await db.query<OrgUserRow>(
      `SELECT u.id, u.name, r.code AS role, u.role_id, u.status
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.org_id = $1
       ORDER BY u.name ASC`,
      [ctx.orgId],
    );
    return { items: result.rows.map(mapOrgUserRow) };
  }

  /**
   * ユーザー詳細を取得する。
   *
   * @param ctx - リクエストコンテキスト
   * @param userId - 対象ユーザー ID
   * @returns ユーザー詳細（見つからない場合は null）
   */
  async getUserById(
    ctx: RequestContext,
    userId: string,
  ): Promise<UserDetailDto | null> {
    const db = this.tenantDb(ctx);
    const result = await db.query<UserDetailRow>(
      `SELECT u.id, u.name, u.email, r.code AS role, u.role_id, u.status,
              u.created_by, u.disabled_at, u.password_set_at,
              u.created_at, u.updated_at
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.org_id = $2`,
      [userId, ctx.orgId],
    );
    const row = result.rows.at(0);
    return row ? mapUserDetailRow(row) : null;
  }

  /**
   * 新規ユーザーを作成する。
   *
   * @param ctx - リクエストコンテキスト
   * @param input - 作成パラメータ
   * @returns 作成されたユーザー詳細
   */
  async createUser(
    ctx: RequestContext,
    input: CreateUserInput,
  ): Promise<UserDetailDto> {
    if (!canAssignRole(ctx.role, input.role)) {
      throw new UnprocessableEntityException("INSUFFICIENT_ROLE_AUTHORITY");
    }

    const passwordHash = await hashPassword(input.initialPassword);
    let newId: string;

    try {
      newId = await this.insertNewUser(ctx, input, passwordHash);
    } catch (err: unknown) {
      if (isDuplicateEmailConstraint(err)) {
        throw new UnprocessableEntityException("USER_DUPLICATE_EMAIL");
      }
      throw err;
    }

    await this.timelineService.write(ctx, {
      entityType: "user",
      entityId: newId,
      action: "user_created",
      payload: {
        name: input.name,
        email: input.email,
        role: input.role,
        primaryGroupId: input.primaryGroupId ?? null,
      },
    });

    const detail = await this.getUserById(ctx, newId);
    if (!detail) throw new Error("User created but could not be retrieved");
    return detail;
  }

  /**
   * ユーザーの基本情報を更新する。
   *
   * @param ctx - リクエストコンテキスト
   * @param userId - 対象ユーザー ID
   * @param input - 更新パラメータ
   * @returns 更新後のユーザー詳細（見つからない場合は null）
   */
  async updateUser(
    ctx: RequestContext,
    userId: string,
    input: UpdateUserInput,
  ): Promise<UserDetailDto | null> {
    const target = await this.findTargetUser(ctx, userId);
    if (!target) return null;
    assertCanManage(ctx.role, target.role);

    const db = this.tenantDb(ctx);
    const sets: string[] = [];
    const params: unknown[] = [];

    if (input.name !== undefined) {
      params.push(input.name);
      sets.push(`name = $${String(params.length)}`);
    }
    if (input.email !== undefined) {
      params.push(input.email);
      sets.push(`email = $${String(params.length)}`);
    }
    if (sets.length === 0) return this.getUserById(ctx, userId);

    sets.push("updated_at = now()");
    params.push(userId);

    try {
      await db.query(
        `UPDATE users SET ${sets.join(", ")} WHERE id = $${String(params.length)}`,
        params,
      );
    } catch (err: unknown) {
      if (isDuplicateEmailConstraint(err)) {
        throw new UnprocessableEntityException("USER_DUPLICATE_EMAIL");
      }
      throw err;
    }

    await this.timelineService.write(ctx, {
      entityType: "user",
      entityId: userId,
      action: "user_updated",
      payload: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
      },
    });
    return this.getUserById(ctx, userId);
  }

  /**
   * ユーザーの角色を変更する。
   *
   * @param ctx - リクエストコンテキスト
   * @param userId - 対象ユーザー ID
   * @param input - 角色変更パラメータ
   * @returns 更新後のユーザー詳細（見つからない場合は null）
   */
  async updateUserRole(
    ctx: RequestContext,
    userId: string,
    input: UpdateUserRoleInput,
  ): Promise<UserDetailDto | null> {
    if (ctx.userId === userId) {
      throw new UnprocessableEntityException("USER_CANNOT_CHANGE_OWN_ROLE");
    }
    const target = await this.findTargetUser(ctx, userId);
    if (!target) return null;

    assertCanManage(ctx.role, target.role);
    if (!canAssignRole(ctx.role, input.role)) {
      throw new UnprocessableEntityException("INSUFFICIENT_ROLE_AUTHORITY");
    }
    if (target.role === "owner" && input.role !== "owner") {
      await this.assertNotLastOwner(ctx);
    }

    const db = this.tenantDb(ctx);
    const roleId = await this.resolveSystemRoleId(db, ctx.orgId, input.role);
    await db.query(
      `UPDATE users SET role_id = $1, updated_at = now() WHERE id = $2`,
      [roleId, userId],
    );

    this.effectivePermissions.invalidate(userId);

    await this.timelineService.write(ctx, {
      entityType: "user",
      entityId: userId,
      action: "user_role_changed",
      payload: { from: target.role, to: input.role },
    });
    return this.getUserById(ctx, userId);
  }

  /**
   * ユーザーを停用する。
   *
   * @param ctx - リクエストコンテキスト
   * @param userId - 対象ユーザー ID
   * @returns 更新後のユーザー詳細（見つからない場合は null）
   */
  async disableUser(
    ctx: RequestContext,
    userId: string,
  ): Promise<UserDetailDto | null> {
    if (ctx.userId === userId) {
      throw new UnprocessableEntityException("USER_CANNOT_DISABLE_SELF");
    }
    const target = await this.findTargetUser(ctx, userId);
    if (!target) return null;

    assertCanManage(ctx.role, target.role);
    if (target.status !== "active") {
      throw new UnprocessableEntityException("USER_ALREADY_DISABLED");
    }
    if (target.role === "owner") {
      await this.assertNotLastOwner(ctx);
    }

    const db = this.tenantDb(ctx);
    await db.query(
      `UPDATE users
       SET status = 'disabled', disabled_at = now(), updated_at = now()
       WHERE id = $1`,
      [userId],
    );

    await this.timelineService.write(ctx, {
      entityType: "user",
      entityId: userId,
      action: "user_disabled",
      payload: { role: target.role },
    });
    return this.getUserById(ctx, userId);
  }

  /**
   * 停用ユーザーを再有効化する。
   *
   * @param ctx - リクエストコンテキスト
   * @param userId - 対象ユーザー ID
   * @returns 更新後のユーザー詳細（見つからない場合は null）
   */
  async activateUser(
    ctx: RequestContext,
    userId: string,
  ): Promise<UserDetailDto | null> {
    const target = await this.findTargetUser(ctx, userId);
    if (!target) return null;

    assertCanManage(ctx.role, target.role);
    if (target.status === "active") {
      throw new UnprocessableEntityException("USER_ALREADY_ACTIVE");
    }

    const db = this.tenantDb(ctx);
    await db.query(
      `UPDATE users
       SET status = 'active', disabled_at = null, updated_at = now()
       WHERE id = $1`,
      [userId],
    );

    await this.timelineService.write(ctx, {
      entityType: "user",
      entityId: userId,
      action: "user_activated",
      payload: { role: target.role },
    });
    return this.getUserById(ctx, userId);
  }

  /**
   * ユーザーのパスワードをリセットし、一時パスワードを返す。
   *
   * @param ctx - リクエストコンテキスト
   * @param userId - 対象ユーザー ID
   * @returns 一時パスワード
   */
  async resetPassword(
    ctx: RequestContext,
    userId: string,
  ): Promise<ResetPasswordResultDto> {
    const target = await this.findTargetUser(ctx, userId);
    if (!target) {
      throw new UnprocessableEntityException("USER_NOT_FOUND");
    }
    assertCanManage(ctx.role, target.role);

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const db = this.tenantDb(ctx);
    await db.query(
      `UPDATE users
       SET password_hash = $1, password_set_at = now(), updated_at = now()
       WHERE id = $2`,
      [passwordHash, userId],
    );

    await this.timelineService.write(ctx, {
      entityType: "user",
      entityId: userId,
      action: "user_password_reset",
      payload: {},
    });
    return { temporaryPassword };
  }

  private async findTargetUser(
    ctx: RequestContext,
    userId: string,
  ): Promise<{ role: Role; status: string } | null> {
    const db = this.tenantDb(ctx);
    const result = await db.query<{ role: string; status: string }>(
      `SELECT r.code AS role, u.status
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.org_id = $2`,
      [userId, ctx.orgId],
    );
    const row = result.rows.at(0);
    if (!row) return null;
    const role = parseRole(row.role);
    if (!role) return null;
    return { role, status: row.status };
  }

  private async assertNotLastOwner(ctx: RequestContext): Promise<void> {
    const db = this.tenantDb(ctx);
    const result = await db.query<{ cnt: string }>(
      `SELECT count(*) AS cnt
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.org_id = $1 AND r.code = 'owner' AND u.status = 'active'`,
      [ctx.orgId],
    );
    const count = Number.parseInt(result.rows[0]?.cnt ?? "0", 10);
    if (count <= 1) {
      throw new UnprocessableEntityException("USER_LAST_OWNER");
    }
  }

  private async insertNewUser(
    ctx: RequestContext,
    input: CreateUserInput,
    passwordHash: string,
  ): Promise<string> {
    const db = this.tenantDb(ctx);
    return db.transaction(async (tx) => {
      await this.checkDuplicateEmail(tx, ctx.orgId, input.email);

      const roleId = await this.resolveSystemRoleId(tx, ctx.orgId, input.role);
      const insertResult = await tx.query<{ id: string }>(
        `INSERT INTO users
           (org_id, name, email, role_id, status, password_hash,
            created_by, password_set_at)
         VALUES ($1, $2, $3, $4, 'active', $5, $6, now())
         RETURNING id`,
        [ctx.orgId, input.name, input.email, roleId, passwordHash, ctx.userId],
      );
      const userId = insertResult.rows[0].id;

      if (input.primaryGroupId) {
        await this.linkPrimaryGroup(
          tx,
          ctx.orgId,
          userId,
          input.primaryGroupId,
        );
      }
      return userId;
    });
  }

  private async checkDuplicateEmail(
    tx: TenantDbTx,
    orgId: string,
    email: string,
  ): Promise<void> {
    const dup = await tx.query<{ id: string }>(
      `SELECT id FROM users WHERE org_id = $1 AND lower(email) = lower($2) LIMIT 1`,
      [orgId, email],
    );
    if (dup.rows.length > 0) {
      throw new UnprocessableEntityException("USER_DUPLICATE_EMAIL");
    }
  }

  private async resolveSystemRoleId(
    db: { query: TenantDbTx["query"] },
    orgId: string,
    roleCode: string,
  ): Promise<string | null> {
    const result = await db.query<{ id: string }>(
      `SELECT id FROM roles WHERE org_id = $1 AND code = $2 AND is_system = true LIMIT 1`,
      [orgId, roleCode],
    );
    return result.rows.at(0)?.id ?? null;
  }

  private async linkPrimaryGroup(
    tx: TenantDbTx,
    orgId: string,
    userId: string,
    groupId: string,
  ): Promise<void> {
    const groupCheck = await tx.query<{ active_flag: boolean }>(
      `SELECT active_flag FROM groups WHERE id = $1 AND org_id = $2`,
      [groupId, orgId],
    );
    if (groupCheck.rows.length === 0) {
      throw new UnprocessableEntityException("GROUP_NOT_FOUND");
    }
    if (!groupCheck.rows[0].active_flag) {
      throw new UnprocessableEntityException("GROUP_DISABLED");
    }
    await tx.query(
      `INSERT INTO user_group_memberships
         (user_id, group_id, is_primary_group, active_flag, joined_at)
       VALUES ($1, $2, true, true, now())`,
      [userId, groupId],
    );
  }
}
