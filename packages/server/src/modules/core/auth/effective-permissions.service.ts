import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import { getSystemRolePermissions } from "./permissions.codes";
import { createTenantDb, type TenantDbTx } from "../tenancy/tenantDb";

type RoleRow = { role_id: string | null; role_code: string | null };

type CacheEntry = {
  permissions: ReadonlySet<string>;
  expiresAt: number;
};

/**
 * 有効権限解析サービス。
 *
 * role_permissions（角色権限）と user_permission_overrides（ユーザー級覆盖）を
 * マージし、最終的な有効権限セットを返す。
 *
 * 合併優先度（高→低）：user deny > user grant > role permissions
 */
@Injectable()
export class EffectivePermissionsService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 60_000;

  /**
   * サービスを生成する。
   *
   * @param pool - PostgreSQL 接続プール
   */
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  /**
   * ユーザーの有効権限コードセットを解決する。
   *
   * @param orgId - 組織 ID
   * @param userId - ユーザー ID
   * @returns 有効権限コードの Set
   */
  async resolve(orgId: string, userId: string): Promise<ReadonlySet<string>> {
    const cached = this.cache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.permissions;
    }

    const db = createTenantDb(this.pool, orgId, userId);
    const effective = await db.transaction((tx) =>
      this.computeForUser(tx, userId),
    );

    this.cache.set(userId, {
      permissions: effective,
      expiresAt: Date.now() + this.TTL_MS,
    });

    return effective;
  }

  /**
   * トランザクション内で role_permissions と user_permission_overrides を合成する。
   *
   * @param tx - tenant 適用済みのトランザクション
   * @param userId - ユーザー ID
   * @returns 有効権限コードの Set
   */
  private async computeForUser(
    tx: TenantDbTx,
    userId: string,
  ): Promise<Set<string>> {
    const userResult = await tx.query<RoleRow>(
      `SELECT u.role_id, r.code AS role_code
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.id = $1`,
      [userId],
    );

    const user = userResult.rows.at(0);
    if (!user) return new Set<string>();

    const rolePermissions = await this.fetchRolePermissions(tx, user);

    const overridesResult = await tx.query<{
      permission: string;
      effect: string;
    }>(
      `SELECT permission, effect
         FROM user_permission_overrides
         WHERE user_id = $1
           AND (expires_at IS NULL OR expires_at > now())`,
      [userId],
    );

    const result = new Set(rolePermissions);
    for (const o of overridesResult.rows) {
      if (o.effect === "grant") result.add(o.permission);
    }
    for (const o of overridesResult.rows) {
      if (o.effect === "deny") result.delete(o.permission);
    }
    return result;
  }

  /**
   * 角色権限を取得する。role_id が割当済みなら role_permissions、
   * そうでない場合は role_code に対応するシステム既定値を使う。
   *
   * @param tx - トランザクション
   * @param user - users テーブルから取得した role 情報
   * @returns 権限コード配列
   */
  private async fetchRolePermissions(
    tx: TenantDbTx,
    user: RoleRow,
  ): Promise<string[]> {
    if (user.role_id) {
      const rpResult = await tx.query<{ permission: string }>(
        "SELECT permission FROM role_permissions WHERE role_id = $1",
        [user.role_id],
      );
      return rpResult.rows.map((r) => r.permission);
    }
    if (user.role_code) {
      return [...getSystemRolePermissions(user.role_code)];
    }
    return [];
  }

  /**
   * 指定ユーザーのキャッシュを無効化する。
   *
   * role_permissions / user_permission_overrides / users.role_id の
   * 書き込み操作後に呼び出すこと。
   *
   * @param userId - ユーザー ID
   */
  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  /** 全キャッシュを無効化する。 */
  invalidateAll(): void {
    this.cache.clear();
  }
}
