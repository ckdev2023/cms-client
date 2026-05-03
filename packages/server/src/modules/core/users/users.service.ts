import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";

type OrgUserRow = {
  id: string;
  name: string;
  role: string;
  status: string;
};

/**
 * 組織ユーザー一覧サービス。
 */
export type OrgUserDto = {
  id: string;
  displayName: string;
  role: string;
  status: string;
};

/**
 * 組織ユーザー一覧の結果。
 */
export type OrgUserListResultDto = {
  items: OrgUserDto[];
};

function mapOrgUserRow(row: OrgUserRow): OrgUserDto {
  return {
    id: row.id,
    displayName: row.name,
    role: row.role,
    status: row.status,
  };
}

/**
 * 組織内ユーザー一覧を提供するサービス。
 */
@Injectable()
export class UsersService {
  /**
   * ユーザーサービスを生成する。
   *
   * @param pool - PostgreSQL 接続プール
   */
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  private tenantDb(ctx: RequestContext) {
    return createTenantDb(this.pool, ctx.orgId, ctx.userId);
  }

  /**
   * 同一テナント内のアクティブユーザー一覧を返す。
   *
   * @param ctx リクエストコンテキスト
   * @returns ユーザー一覧
   */
  async listOrgUsers(ctx: RequestContext): Promise<OrgUserListResultDto> {
    const db = this.tenantDb(ctx);

    const result = await db.query<OrgUserRow>(
      `SELECT id, name, role, status
       FROM users
       WHERE org_id = $1
       ORDER BY name ASC`,
      [ctx.orgId],
    );

    return { items: result.rows.map(mapOrgUserRow) };
  }
}
