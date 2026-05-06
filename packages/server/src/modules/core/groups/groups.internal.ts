import { requireTimestampString } from "../model/timestamps";
import type { TenantDb } from "../tenancy/tenantDb";
import type { GroupMemberDto, GroupSummaryDto } from "./groups.types";

/** DB 行: グループ一覧用射影。 */
export type GroupSummaryRow = {
  id: string;
  org_id: string;
  group_no: string | null;
  name: string;
  description: string | null;
  active_flag: boolean;
  created_at: unknown;
  active_case_count: string;
  member_count: string;
};

/** DB 行: グループ詳細用射影。 */
export type GroupDetailRow = {
  id: string;
  org_id: string;
  group_no: string | null;
  name: string;
  description: string | null;
  active_flag: boolean;
  created_by: string | null;
  created_at: unknown;
  updated_by: string | null;
  updated_at: unknown;
};

/** DB 行: グループメンバー射影。 */
export type GroupMemberRow = {
  id: string;
  user_id: string;
  is_primary_group: boolean;
  active_flag: boolean;
  joined_at: unknown;
  user_name: string;
  user_email: string;
  user_role: string;
};

/**
 * GroupSummaryRow → GroupSummaryDto 変換。
 *
 * @param row - DB 行
 * @returns DTO
 */
export function mapGroupSummaryRow(row: GroupSummaryRow): GroupSummaryDto {
  return {
    id: row.id,
    orgId: row.org_id,
    groupNo: row.group_no,
    name: row.name,
    description: row.description,
    activeFlag: row.active_flag,
    createdAt: requireTimestampString(row.created_at, "created_at"),
    activeCaseCount: Number.parseInt(row.active_case_count, 10),
    memberCount: Number.parseInt(row.member_count, 10),
  };
}

/**
 * GroupMemberRow → GroupMemberDto 変換。
 *
 * @param row - DB 行
 * @returns DTO
 */
export function mapGroupMemberRow(row: GroupMemberRow): GroupMemberDto {
  return {
    id: row.id,
    userId: row.user_id,
    isPrimaryGroup: row.is_primary_group,
    activeFlag: row.active_flag,
    joinedAt: requireTimestampString(row.joined_at, "joined_at"),
    userName: row.user_name,
    userEmail: row.user_email,
    userRole: row.user_role,
  };
}

/**
 * グループの有効メンバー一覧を取得する。
 *
 * @param db - テナント DB
 * @param groupId - グループ ID
 * @returns メンバー DTO 配列
 */
export async function queryActiveMembers(
  db: TenantDb,
  groupId: string,
): Promise<GroupMemberDto[]> {
  const sql = `
    SELECT m.id, m.user_id, m.is_primary_group, m.active_flag,
           m.joined_at, u.name AS user_name, u.email AS user_email,
           u.role AS user_role
    FROM user_group_memberships m
    JOIN users u ON u.id = m.user_id
    WHERE m.group_id = $1 AND m.active_flag = true
    ORDER BY m.joined_at ASC
  `;
  const result = await db.query<GroupMemberRow>(sql, [groupId]);
  return result.rows.map(mapGroupMemberRow);
}

/**
 * PostgreSQL 重複名称制約エラーを判定する。
 *
 * @param err - キャッチしたエラー
 * @returns 重複名称制約エラーかどうか
 */
export function isDuplicateNameError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const pgErr = err as { code?: string; constraint?: string };
  return pgErr.code === "23505" && pgErr.constraint === "uq_groups_org_name";
}
