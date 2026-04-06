import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import type {
  Conversation,
  ConversationQueryRow,
} from "../model/portalEntities";
import { mapConversationRow } from "../model/portalEntities";

/** Conversation 创建入参。 */
export type ConversationCreateInput = {
  appUserId: string;
  leadId?: string | null;
  orgId?: string | null;
  channel?: string;
  preferredLanguage?: string;
};

/** Conversation 列表查询入参。 */
export type ConversationListInput = {
  appUserId?: string;
  orgId?: string;
  leadId?: string;
  status?: string;
  page?: number;
  limit?: number;
};

const CONV_COLS = `id, lead_id, app_user_id, org_id, channel, preferred_language, status, created_at, updated_at`;

/**
 * Conversation CRUD + 状态管理服务。
 */
@Injectable()
export class ConversationsService {
  /**
   * 创建服务实例。
   * @param pool PostgreSQL 连接池
   */
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  /**
   * 创建会话。
   * @param input 创建参数
   * @returns 创建的会话
   */
  async create(input: ConversationCreateInput): Promise<Conversation> {
    let preferredLanguage = input.preferredLanguage;
    if (!preferredLanguage) {
      const userResult = await this.pool.query<{ preferred_language: string }>(
        `select preferred_language from app_users where id = $1 limit 1`,
        [input.appUserId],
      );
      preferredLanguage = userResult.rows.at(0)?.preferred_language ?? "en";
    }
    const result = await this.pool.query<ConversationQueryRow>(
      `insert into conversations (app_user_id, lead_id, org_id, channel, preferred_language) values ($1, $2, $3, $4, $5) returning ${CONV_COLS}`,
      [
        input.appUserId,
        input.leadId ?? null,
        input.orgId ?? null,
        input.channel ?? "web",
        preferredLanguage,
      ],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create conversation");
    return mapConversationRow(row);
  }

  /**
   * 查看会话详情。
   * @param id 会话 ID
   * @returns 会话或 null
   */
  async get(id: string): Promise<Conversation | null> {
    const result = await this.pool.query<ConversationQueryRow>(
      `select ${CONV_COLS} from conversations where id = $1 limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapConversationRow(row) : null;
  }

  /**
   * 列表查询。
   * @param input 查询参数
   * @returns 分页结果
   */
  async list(
    input: ConversationListInput = {},
  ): Promise<{ items: Conversation[]; total: number }> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const where: string[] = [];
    const params: unknown[] = [];
    if (input.appUserId) {
      params.push(input.appUserId);
      where.push(`app_user_id = $${String(params.length)}`);
    }
    if (input.orgId) {
      params.push(input.orgId);
      where.push(`org_id = $${String(params.length)}`);
    }
    if (input.leadId) {
      params.push(input.leadId);
      where.push(`lead_id = $${String(params.length)}`);
    }
    if (input.status) {
      params.push(input.status);
      where.push(`status = $${String(params.length)}`);
    }
    const clause = where.length > 0 ? `where ${where.join(" and ")}` : "";
    const countResult = await this.pool.query<{ count: string }>(
      `select count(*)::text as count from conversations ${clause}`,
      params,
    );
    const total = Number(countResult.rows.at(0)?.count ?? "0");
    params.push(limit, offset);
    const dataResult = await this.pool.query<ConversationQueryRow>(
      `select ${CONV_COLS} from conversations ${clause} order by created_at desc limit $${String(params.length - 1)} offset $${String(params.length)}`,
      params,
    );
    return { items: dataResult.rows.map(mapConversationRow), total };
  }

  /**
   * 关闭会话。
   * @param id 会话 ID
   * @returns 关闭后的会话
   */
  async close(id: string): Promise<Conversation> {
    const result = await this.pool.query<ConversationQueryRow>(
      `update conversations set status = 'closed', updated_at = now() where id = $1 returning ${CONV_COLS}`,
      [id],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Conversation not found");
    return mapConversationRow(row);
  }
}
