import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import type { AppUser, AppUserQueryRow } from "../model/portalEntities";
import { mapAppUserRow } from "../model/portalEntities";

/**
 * AppUser 创建入参。
 */
export type AppUserCreateInput = {
  name: string;
  preferredLanguage?: string;
  email?: string | null;
  phone?: string | null;
};

/**
 * AppUser 更新入参（限定本人可更新字段）。
 */
export type AppUserUpdateInput = {
  name?: string;
  preferredLanguage?: string;
  email?: string | null;
  phone?: string | null;
};

const APP_USER_COLS = `id, preferred_language, name, email, phone, status, created_at, updated_at`;

/**
 * AppUser CRUD 服务。
 *
 * 特殊说明：
 * - AppUser 不走 org_id 隔离（独立账号体系）
 * - 不使用 TenantDb，直接使用 Pool 查询
 */
@Injectable()
export class AppUsersService {
  /**
   * 创建服务。
   * @param pool PostgreSQL 连接池
   */
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  /**
   * 注册新用户。
   * @param input 创建参数
   * @returns 创建成功的 AppUser
   */
  async create(input: AppUserCreateInput): Promise<AppUser> {
    const result = await this.pool.query<AppUserQueryRow>(
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
  async get(id: string): Promise<AppUser | null> {
    const result = await this.pool.query<AppUserQueryRow>(
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
  async update(
    id: string,
    callerId: string,
    input: AppUserUpdateInput,
  ): Promise<AppUser> {
    if (id !== callerId) {
      throw new BadRequestException("Can only update own profile");
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
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

    const result = await this.pool.query<AppUserQueryRow>(
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
}
