import crypto from "node:crypto";

import { ForbiddenException } from "@nestjs/common";

import { canManageRole } from "../auth/roleAuthority";
import type { Role } from "../auth/roles";
import {
  requireTimestampString,
  toTimestampStringOrNull,
} from "../model/timestamps";
import type { UserDetailDto } from "./users.types";

/** DB 行: ユーザー一覧用の最小射影。 */
export type OrgUserRow = {
  id: string;
  name: string;
  role: string;
  role_id: string | null;
  status: string;
};

/** ユーザー一覧項目 DTO。 */
export type OrgUserDto = {
  id: string;
  displayName: string;
  role: string;
  roleId: string | null;
  status: string;
};

/** ユーザー一覧結果 DTO。 */
export type OrgUserListResultDto = {
  items: OrgUserDto[];
};

/** DB 行: ユーザー詳細射影。 */
export type UserDetailRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  role_id: string | null;
  status: string;
  created_by: string | null;
  disabled_at: unknown;
  password_set_at: unknown;
  created_at: unknown;
  updated_at: unknown;
};

/**
 * OrgUserRow → OrgUserDto 変換。
 *
 * @param row - DB 行
 * @returns DTO
 */
export function mapOrgUserRow(row: OrgUserRow): OrgUserDto {
  return {
    id: row.id,
    displayName: row.name,
    role: row.role,
    roleId: row.role_id,
    status: row.status,
  };
}

/**
 * UserDetailRow → UserDetailDto 変換。
 *
 * @param row - DB 行
 * @returns DTO
 */
export function mapUserDetailRow(row: UserDetailRow): UserDetailDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    roleId: row.role_id,
    status: row.status,
    createdBy: row.created_by,
    disabledAt: toTimestampStringOrNull(row.disabled_at),
    passwordSetAt: toTimestampStringOrNull(row.password_set_at),
    createdAt: requireTimestampString(row.created_at, "created_at"),
    updatedAt: requireTimestampString(row.updated_at, "updated_at"),
  };
}

/**
 * ランダムな一時パスワードを生成する。
 *
 * @returns base64url 形式の一時パスワード
 */
export function generateTemporaryPassword(): string {
  return crypto.randomBytes(12).toString("base64url");
}

/**
 * actor が target 角色を管理できない場合 ForbiddenException を投げる。
 *
 * @param actorRole - 操作者の角色
 * @param targetRole - 対象ユーザーの角色
 */
export function assertCanManage(actorRole: Role, targetRole: Role): void {
  if (!canManageRole(actorRole, targetRole)) {
    throw new ForbiddenException("INSUFFICIENT_ROLE_AUTHORITY");
  }
}

/**
 * PostgreSQL 重複メール制約エラーを判定する。
 *
 * @param err - キャッチしたエラー
 * @returns 重複メール制約エラーかどうか
 */
export function isDuplicateEmailConstraint(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const pgErr = err as { code?: string; constraint?: string };
  return (
    pgErr.code === "23505" && (pgErr.constraint?.includes("email") ?? false)
  );
}
