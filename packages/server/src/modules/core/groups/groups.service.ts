import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { requireTimestampString } from "../model/timestamps";
import { TimelineService } from "../timeline/timeline.service";
import {
  isDuplicateNameError,
  mapGroupSummaryRow,
  queryActiveMembers,
  type GroupDetailRow,
  type GroupSummaryRow,
} from "./groups.internal";
import type {
  CreateGroupInput,
  DisableGroupInput,
  GroupDetailDto,
  GroupListInput,
  GroupListResultDto,
  GroupMemberDto,
  GroupReferenceCounts,
  RenameGroupInput,
} from "./groups.types";

/**
 * 業務分組サービス：グループの CRUD と停用を管理する。
 */
@Injectable()
export class GroupsService {
  /**
   * グループサービスを生成する。
   *
   * @param pool - PostgreSQL 接続プール
   * @param timelineService - タイムライン記録サービス
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  /**
   * tenantDb ヘルパーを生成する。
   *
   * @param ctx - リクエストコンテキスト
   * @returns テナント DB ヘルパー
   */
  private tenantDb(ctx: RequestContext) {
    return createTenantDb(this.pool, ctx.orgId, ctx.userId);
  }

  /**
   * グループ一覧を取得する（活跃案件数・メンバー数の集約付き）。
   *
   * @param ctx - リクエストコンテキスト
   * @param input - 検索条件（status で active/disabled 絞り込み可）
   * @returns グループ一覧と合計件数
   */
  async listGroups(
    ctx: RequestContext,
    input: GroupListInput = {},
  ): Promise<GroupListResultDto> {
    const db = this.tenantDb(ctx);

    const where: string[] = [];
    const params: unknown[] = [];

    if (input.status) {
      params.push(input.status === "active");
      where.push(`g.active_flag = $${String(params.length)}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        g.id,
        g.org_id,
        g.group_no,
        g.name,
        g.description,
        g.active_flag,
        g.created_at,
        COALESCE(cc.cnt, 0) AS active_case_count,
        COALESCE(mc.cnt, 0) AS member_count
      FROM groups g
      LEFT JOIN LATERAL (
        SELECT count(*) AS cnt
        FROM cases c
        WHERE c.group_id = g.id
          AND c.stage IS DISTINCT FROM 'S9'
      ) cc ON true
      LEFT JOIN LATERAL (
        SELECT count(*) AS cnt
        FROM user_group_memberships m
        WHERE m.group_id = g.id
          AND m.active_flag = true
      ) mc ON true
      ${whereClause}
      ORDER BY g.created_at DESC, g.id DESC
    `;

    const result = await db.query<GroupSummaryRow>(sql, params);
    const items = result.rows.map(mapGroupSummaryRow);

    return { items, total: items.length };
  }

  /**
   * グループの関連客数・案件数を集計する（停用確認ダイアログと timeline payload 共用）。
   *
   * @param ctx - リクエストコンテキスト
   * @param groupId - グループ ID
   * @returns 関連客数と案件数
   */
  async countReferences(
    ctx: RequestContext,
    groupId: string,
  ): Promise<GroupReferenceCounts> {
    const db = this.tenantDb(ctx);

    const sql = `
      SELECT
        count(DISTINCT c.customer_id) AS customer_count,
        count(*)                      AS case_count
      FROM cases c
      WHERE c.group_id = $1
    `;

    const result = await db.query<{
      customer_count: string;
      case_count: string;
    }>(sql, [groupId]);

    const row = result.rows.at(0);
    return {
      customerCount: row ? Number.parseInt(row.customer_count, 10) : 0,
      caseCount: row ? Number.parseInt(row.case_count, 10) : 0,
    };
  }

  /**
   * グループ詳細を取得する（メンバー一覧＋関連客数/案件数付き）。
   *
   * 停用済みグループも読み取り可能。
   *
   * @param ctx - リクエストコンテキスト
   * @param groupId - グループ ID
   * @returns グループ詳細 DTO（見つからない場合は null）
   */
  async getGroupDetail(
    ctx: RequestContext,
    groupId: string,
  ): Promise<GroupDetailDto | null> {
    const db = this.tenantDb(ctx);

    const groupSql = `
      SELECT g.id, g.org_id, g.group_no, g.name, g.description,
             g.active_flag, g.created_by, g.created_at,
             g.updated_by, g.updated_at
      FROM groups g WHERE g.id = $1
    `;

    const groupResult = await db.query<GroupDetailRow>(groupSql, [groupId]);
    const groupRow = groupResult.rows.at(0);
    if (!groupRow) return null;

    const members = await this.listActiveMembers(ctx, groupId);
    const references = await this.countReferences(ctx, groupId);

    return {
      id: groupRow.id,
      orgId: groupRow.org_id,
      groupNo: groupRow.group_no,
      name: groupRow.name,
      description: groupRow.description,
      activeFlag: groupRow.active_flag,
      createdBy: groupRow.created_by,
      createdAt: requireTimestampString(groupRow.created_at, "created_at"),
      updatedBy: groupRow.updated_by,
      updatedAt: requireTimestampString(groupRow.updated_at, "updated_at"),
      members,
      references,
    };
  }

  /**
   * 新規グループを作成する。
   *
   * - `group_no` は `GRP-001` 形式で自動採番（org 内の既存最大値 + 1）
   * - `created_by` / `updated_by` を ctx.userId で記録
   * - 重複名称は DB ユニーク制約（`uq_groups_org_name`）で 422 を返す
   *
   * @param ctx - リクエストコンテキスト
   * @param input - 新規作成パラメータ（name, description?）
   * @returns 作成されたグループの詳細 DTO
   */
  async createGroup(
    ctx: RequestContext,
    input: CreateGroupInput,
  ): Promise<GroupDetailDto> {
    const db = this.tenantDb(ctx);

    let newId: string;

    try {
      newId = await db.transaction(async (tx) => {
        const seqResult = await tx.query<{ next_seq: string }>(
          `SELECT coalesce(max(
            nullif(regexp_replace(group_no, '^GRP-', ''), group_no)::int
          ), 0) + 1 AS next_seq
          FROM groups
          WHERE org_id = $1 AND group_no LIKE 'GRP-%'`,
          [ctx.orgId],
        );
        const nextSeq = Number.parseInt(seqResult.rows[0]?.next_seq ?? "1", 10);
        const groupNo = `GRP-${String(nextSeq).padStart(3, "0")}`;

        const insertResult = await tx.query<{ id: string }>(
          `INSERT INTO groups (org_id, group_no, name, description, created_by, updated_by)
          VALUES ($1, $2, $3, $4, $5, $5)
          RETURNING id`,
          [
            ctx.orgId,
            groupNo,
            input.name,
            input.description ?? null,
            ctx.userId,
          ],
        );

        return insertResult.rows[0].id;
      });
    } catch (err: unknown) {
      if (isDuplicateNameError(err)) {
        throw new UnprocessableEntityException("GROUP_DUPLICATE_NAME");
      }
      throw err;
    }

    await this.timelineService.write(ctx, {
      entityType: "group",
      entityId: newId,
      action: "group_created",
      payload: { name: input.name },
    });

    const detail = await this.getGroupDetail(ctx, newId);
    if (!detail) {
      throw new Error("Group was created but could not be retrieved");
    }
    return detail;
  }

  /**
   * グループを改名する。
   *
   * - 重複名称は DB ユニーク制約（`uq_groups_org_name`）で 422 を返す
   * - `updated_by` / `updated_at` を ctx.userId / NOW() で更新
   * - timeline に `group_renamed` を記録（payload: `{ from, to }`）
   *
   * @param ctx - リクエストコンテキスト
   * @param groupId - グループ ID
   * @param input - 改名パラメータ（name）
   * @returns 更新後のグループ詳細 DTO（見つからない場合は null）
   */
  async renameGroup(
    ctx: RequestContext,
    groupId: string,
    input: RenameGroupInput,
  ): Promise<GroupDetailDto | null> {
    const db = this.tenantDb(ctx);

    const previousSql = `SELECT name FROM groups WHERE id = $1`;
    const previousResult = await db.query<{ name: string }>(previousSql, [
      groupId,
    ]);
    const previousRow = previousResult.rows.at(0);
    if (!previousRow) return null;

    const previousName = previousRow.name;

    try {
      await db.query(
        `UPDATE groups
         SET name = $1, updated_by = $2, updated_at = now()
         WHERE id = $3`,
        [input.name, ctx.userId, groupId],
      );
    } catch (err: unknown) {
      if (isDuplicateNameError(err)) {
        throw new UnprocessableEntityException("GROUP_DUPLICATE_NAME");
      }
      throw err;
    }

    await this.timelineService.write(ctx, {
      entityType: "group",
      entityId: groupId,
      action: "group_renamed",
      payload: { from: previousName, to: input.name },
    });

    return this.getGroupDetail(ctx, groupId);
  }

  /**
   * グループを停用する（論理削除のみ、物理削除は行わない — §12）。
   *
   * - `active_flag=true` の場合のみ実行可能（既に停用済みなら 422）
   * - 関連する客数・案件数を集計し、timeline payload に含める
   *
   * @param ctx - リクエストコンテキスト
   * @param groupId - グループ ID
   * @param input - 停用パラメータ（reason?）
   * @returns 更新後のグループ詳細 DTO（見つからない場合は null）
   */
  async disableGroup(
    ctx: RequestContext,
    groupId: string,
    input: DisableGroupInput = {},
  ): Promise<GroupDetailDto | null> {
    const db = this.tenantDb(ctx);

    const currentSql = `SELECT active_flag FROM groups WHERE id = $1`;
    const currentResult = await db.query<{ active_flag: boolean }>(currentSql, [
      groupId,
    ]);
    const currentRow = currentResult.rows.at(0);
    if (!currentRow) return null;

    if (!currentRow.active_flag) {
      throw new UnprocessableEntityException("GROUP_ALREADY_DISABLED");
    }

    const references = await this.countReferences(ctx, groupId);

    await db.query(
      `UPDATE groups
       SET active_flag = false, updated_by = $1, updated_at = now()
       WHERE id = $2`,
      [ctx.userId, groupId],
    );

    await this.timelineService.write(ctx, {
      entityType: "group",
      entityId: groupId,
      action: "group_disabled",
      payload: {
        customer_count: references.customerCount,
        case_count: references.caseCount,
        reason: input.reason ?? null,
      },
    });

    return this.getGroupDetail(ctx, groupId);
  }

  private async listActiveMembers(
    ctx: RequestContext,
    groupId: string,
  ): Promise<GroupMemberDto[]> {
    return queryActiveMembers(this.tenantDb(ctx), groupId);
  }
}
