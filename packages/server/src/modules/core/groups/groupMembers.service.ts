import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb, type TenantDbTx } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import { type GroupMemberRow, mapGroupMemberRow } from "./groups.internal";
import type { AddGroupMemberInput, GroupMemberDto } from "./groups.types";

/**
 * グループメンバー管理サービス。
 */
@Injectable()
export class GroupMembersService {
  /**
   * メンバー管理サービスを生成する。
   *
   * @param pool - PostgreSQL 接続プール
   * @param timelineService - タイムライン記録サービス
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  private tenantDb(ctx: RequestContext) {
    return createTenantDb(this.pool, ctx.orgId, ctx.userId);
  }

  /**
   * グループにメンバーを追加する（既存の無効メンバーは再有効化）。
   *
   * @param ctx - リクエストコンテキスト
   * @param groupId - グループ ID
   * @param input - 追加パラメータ
   * @returns 追加されたメンバー DTO
   */
  async addGroupMember(
    ctx: RequestContext,
    groupId: string,
    input: AddGroupMemberInput,
  ): Promise<GroupMemberDto> {
    const db = this.tenantDb(ctx);

    await db.transaction(async (tx) => {
      await this.validateGroupAndUser(tx, groupId, input.userId);
      if (input.isPrimary) {
        await this.clearPrimaryFlag(tx, input.userId);
      }
      await this.upsertMembership(tx, groupId, input);
    });

    await this.timelineService.write(ctx, {
      entityType: "group",
      entityId: groupId,
      action: "user_added_to_group",
      payload: { userId: input.userId, isPrimary: input.isPrimary ?? false },
    });

    const member = await this.findMember(db, groupId, input.userId);
    if (!member) throw new Error("Member added but could not be retrieved");
    return member;
  }

  /**
   * グループからメンバーを論理削除する。
   *
   * @param ctx - リクエストコンテキスト
   * @param groupId - グループ ID
   * @param userId - ユーザー ID
   */
  async removeGroupMember(
    ctx: RequestContext,
    groupId: string,
    userId: string,
  ): Promise<void> {
    const db = this.tenantDb(ctx);

    const result = await db.query<{ id: string }>(
      `SELECT id FROM user_group_memberships
       WHERE user_id = $1 AND group_id = $2 AND active_flag = true
       LIMIT 1`,
      [userId, groupId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException("MEMBERSHIP_NOT_FOUND");
    }

    await db.query(
      `UPDATE user_group_memberships
       SET active_flag = false, left_at = now()
       WHERE id = $1`,
      [result.rows[0].id],
    );

    await this.timelineService.write(ctx, {
      entityType: "group",
      entityId: groupId,
      action: "user_removed_from_group",
      payload: { userId },
    });
  }

  private async validateGroupAndUser(
    tx: TenantDbTx,
    groupId: string,
    userId: string,
  ): Promise<void> {
    const groupCheck = await tx.query<{ active_flag: boolean }>(
      `SELECT active_flag FROM groups WHERE id = $1`,
      [groupId],
    );
    if (groupCheck.rows.length === 0) {
      throw new NotFoundException("GROUP_NOT_FOUND");
    }
    if (!groupCheck.rows[0].active_flag) {
      throw new UnprocessableEntityException("GROUP_DISABLED");
    }

    const userCheck = await tx.query<{ id: string }>(
      `SELECT id FROM users WHERE id = $1`,
      [userId],
    );
    if (userCheck.rows.length === 0) {
      throw new NotFoundException("USER_NOT_FOUND");
    }
  }

  private async clearPrimaryFlag(
    tx: TenantDbTx,
    userId: string,
  ): Promise<void> {
    await tx.query(
      `UPDATE user_group_memberships
       SET is_primary_group = false
       WHERE user_id = $1 AND is_primary_group = true AND active_flag = true`,
      [userId],
    );
  }

  private async upsertMembership(
    tx: TenantDbTx,
    groupId: string,
    input: AddGroupMemberInput,
  ): Promise<void> {
    const existing = await tx.query<{ id: string; active_flag: boolean }>(
      `SELECT id, active_flag FROM user_group_memberships
       WHERE user_id = $1 AND group_id = $2
       LIMIT 1`,
      [input.userId, groupId],
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (row.active_flag && input.isPrimary) {
        await tx.query(
          `UPDATE user_group_memberships SET is_primary_group = true WHERE id = $1`,
          [row.id],
        );
      } else if (!row.active_flag) {
        await tx.query(
          `UPDATE user_group_memberships
           SET active_flag = true, left_at = null, joined_at = now(),
               is_primary_group = $1
           WHERE id = $2`,
          [input.isPrimary ?? false, row.id],
        );
      }
    } else {
      await tx.query(
        `INSERT INTO user_group_memberships
           (user_id, group_id, is_primary_group, active_flag, joined_at)
         VALUES ($1, $2, $3, true, now())`,
        [input.userId, groupId, input.isPrimary ?? false],
      );
    }
  }

  private async findMember(
    db: ReturnType<typeof createTenantDb>,
    groupId: string,
    userId: string,
  ): Promise<GroupMemberDto | null> {
    const result = await db.query<GroupMemberRow>(
      `SELECT m.id, m.user_id, m.is_primary_group, m.active_flag,
              m.joined_at, u.name AS user_name, u.email AS user_email,
              u.role AS user_role
       FROM user_group_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.user_id = $1 AND m.group_id = $2 AND m.active_flag = true
       LIMIT 1`,
      [userId, groupId],
    );
    const row = result.rows.at(0);
    return row ? mapGroupMemberRow(row) : null;
  }
}
