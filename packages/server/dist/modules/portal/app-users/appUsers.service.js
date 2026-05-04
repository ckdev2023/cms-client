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
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { mapAppUserRow } from "../model/portalEntities";
const APP_USER_COLS = `id, preferred_language, name, email, phone, status, created_at, updated_at`;
/**
 * AppUser CRUD 服务。
 *
 * 特殊说明：
 * - AppUser 不走 org_id 隔离（独立账号体系）
 * - 不使用 TenantDb，直接使用 Pool 查询
 */
let AppUsersService = class AppUsersService {
  pool;
  /**
   * 创建服务。
   * @param pool PostgreSQL 连接池
   */
  constructor(pool) {
    this.pool = pool;
  }
  /**
   * 注册新用户。
   * @param input 创建参数
   * @returns 创建成功的 AppUser
   */
  async create(input) {
    const result = await this.pool.query(
      `
        insert into app_users (name, preferred_language, email, phone)
        values ($1, $2, $3, $4)
        returning ${APP_USER_COLS}
      `,
      [
        input.name,
        input.preferredLanguage ?? "en",
        input.email ?? null,
        input.phone ?? null,
      ],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create app user");
    return mapAppUserRow(row);
  }
  /**
   * 查询用户信息。
   * @param id AppUser ID
   * @returns AppUser 或 null
   */
  async get(id) {
    const result = await this.pool.query(
      `
        select ${APP_USER_COLS}
        from app_users
        where id = $1
        limit 1
      `,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapAppUserRow(row) : null;
  }
  /**
   * 更新用户信息（限定本人）。
   * @param id AppUser ID
   * @param callerId 调用者 ID（必须与 id 相同）
   * @param input 更新参数
   * @returns 更新后的 AppUser
   */
  async update(id, callerId, input) {
    if (id !== callerId) {
      throw new BadRequestException("Can only update own profile");
    }
    const setClauses = [];
    const params = [];
    let idx = 1;
    if (input.name !== undefined) {
      setClauses.push(`name = $${String(idx++)}`);
      params.push(input.name);
    }
    if (input.preferredLanguage !== undefined) {
      setClauses.push(`preferred_language = $${String(idx++)}`);
      params.push(input.preferredLanguage);
    }
    if (input.email !== undefined) {
      setClauses.push(`email = $${String(idx++)}`);
      params.push(input.email);
    }
    if (input.phone !== undefined) {
      setClauses.push(`phone = $${String(idx++)}`);
      params.push(input.phone);
    }
    if (setClauses.length === 0) {
      const current = await this.get(id);
      if (!current) throw new BadRequestException("App user not found");
      return current;
    }
    setClauses.push("updated_at = now()");
    params.push(id);
    const result = await this.pool.query(
      `
        update app_users
        set ${setClauses.join(", ")}
        where id = $${String(idx)}
        returning ${APP_USER_COLS}
      `,
      params,
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("App user not found");
    return mapAppUserRow(row);
  }
};
AppUsersService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __metadata("design:paramtypes", [Pool]),
  ],
  AppUsersService,
);
export { AppUsersService };
//# sourceMappingURL=appUsers.service.js.map
