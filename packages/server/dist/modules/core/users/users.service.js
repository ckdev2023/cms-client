var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
      return Reflect.metadata(k, v);
  };
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { createTenantDb } from "../tenancy/tenantDb";
function mapOrgUserRow(row) {
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
let UsersService = class UsersService {
  pool;
  /**
   * ユーザーサービスを生成する。
   *
   * @param pool - PostgreSQL 接続プール
   */
  constructor(pool) {
    this.pool = pool;
  }
  tenantDb(ctx) {
    return createTenantDb(this.pool, ctx.orgId, ctx.userId);
  }
  /**
   * 同一テナント内のアクティブユーザー一覧を返す。
   *
   * @param ctx リクエストコンテキスト
   * @returns ユーザー一覧
   */
  async listOrgUsers(ctx) {
    const db = this.tenantDb(ctx);
    const result = await db.query(
      `SELECT id, name, role, status
       FROM users
       WHERE org_id = $1
       ORDER BY name ASC`,
      [ctx.orgId],
    );
    return { items: result.rows.map(mapOrgUserRow) };
  }
};
UsersService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __metadata("design:paramtypes", [Pool]),
  ],
  UsersService,
);
export { UsersService };
//# sourceMappingURL=users.service.js.map
