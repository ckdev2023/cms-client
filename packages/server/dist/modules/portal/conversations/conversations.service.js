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
import { mapConversationRow } from "../model/portalEntities";
const CONV_COLS = `id, lead_id, app_user_id, org_id, channel, preferred_language, status, owner_user_id, last_message_at, unread_count_staff_tenant, unread_count_staff_owner, unread_count_user, customer_id, case_id, created_at, updated_at`;
/**
 * Conversation CRUD + 状态管理服务。
 */
let ConversationsService = class ConversationsService {
  pool;
  /**
   * 创建服务实例。
   * @param pool PostgreSQL 连接池
   */
  constructor(pool) {
    this.pool = pool;
  }
  /**
   * 创建会话。
   * @param input 创建参数
   * @returns 创建的会话
   */
  async create(input) {
    let preferredLanguage = input.preferredLanguage;
    if (!preferredLanguage) {
      const userResult = await this.pool.query(
        `select preferred_language from app_users where id = $1 limit 1`,
        [input.appUserId],
      );
      preferredLanguage = userResult.rows.at(0)?.preferred_language ?? "en";
    }
    const result = await this.pool.query(
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
  async get(id) {
    const result = await this.pool.query(
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
  async list(input = {}) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];
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
    const countResult = await this.pool.query(
      `select count(*)::text as count from conversations ${clause}`,
      params,
    );
    const total = Number(countResult.rows.at(0)?.count ?? "0");
    params.push(limit, offset);
    const dataResult = await this.pool.query(
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
  async close(id) {
    const result = await this.pool.query(
      `update conversations set status = 'closed', updated_at = now() where id = $1 returning ${CONV_COLS}`,
      [id],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Conversation not found");
    return mapConversationRow(row);
  }
};
ConversationsService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __metadata("design:paramtypes", [Pool]),
  ],
  ConversationsService,
);
export { ConversationsService };
//# sourceMappingURL=conversations.service.js.map
