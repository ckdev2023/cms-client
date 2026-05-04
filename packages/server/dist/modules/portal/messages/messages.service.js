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
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Pool } from "pg";
import { mapMessageRow } from "../model/portalEntities";
import { REDIS_CLIENT } from "../../../infra/redis/createRedisClient";
import { RedisQueue } from "../../../infra/queue/redisQueue";
const MSG_COLS = `id, conversation_id, org_id, sender_type, sender_id, original_language, original_text, translated_text_ja, translated_text_zh, translated_text_en, translation_status, kind, visible_scope, created_at`;
const DEFAULT_TARGET_LANGUAGES = ["ja", "zh", "en"];
/**
 * Messages 服务：发送消息 + 异步翻译入队。
 */
let MessagesService = class MessagesService {
  pool;
  redisClient;
  queue;
  /**
   * 创建服务实例。
   * @param pool PostgreSQL 连接池
   * @param redisClient Redis 客户端
   */
  constructor(pool, redisClient) {
    this.pool = pool;
    this.redisClient = redisClient;
    this.queue = new RedisQueue(this.redisClient);
  }
  /**
   * 发送消息（同步落库 + 异步翻译入队）。
   * @param input 发送参数
   * @returns 创建的消息
   */
  async send(input) {
    const convResult = await this.pool.query(
      `select status from conversations where id = $1 limit 1`,
      [input.conversationId],
    );
    const conv = convResult.rows.at(0);
    if (!conv) throw new BadRequestException("Conversation not found");
    if (conv.status === "closed") {
      throw new ConflictException(
        "Cannot send message to a closed conversation",
      );
    }
    const result = await this.pool.query(
      `insert into messages (conversation_id, org_id, sender_type, sender_id, original_language, original_text, translation_status)
       values ($1, $2, $3, $4, $5, $6, 'pending')
       returning ${MSG_COLS}`,
      [
        input.conversationId,
        input.orgId ?? null,
        input.senderType,
        input.senderId,
        input.originalLanguage,
        input.originalText,
      ],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to send message");
    const message = mapMessageRow(row);
    const targetLanguages = DEFAULT_TARGET_LANGUAGES.filter(
      (l) => l !== input.originalLanguage,
    );
    await this.queue.enqueue("translation_jobs", {
      id: `tj-${message.id}`,
      name: "translation",
      payload: {
        orgId: input.orgId ?? "",
        messageId: message.id,
        originalText: input.originalText,
        originalLanguage: input.originalLanguage,
        targetLanguages,
      },
      createdAt: new Date().toISOString(),
    });
    return message;
  }
  /**
   * 查看单条消息。
   * @param id 消息 ID
   * @returns 消息或 null
   */
  async get(id) {
    const result = await this.pool.query(
      `select ${MSG_COLS} from messages where id = $1 limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapMessageRow(row) : null;
  }
  /**
   * 按 conversationId 查询消息列表（倒序）。
   * @param input 查询参数
   * @returns 分页结果
   */
  async list(input) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const countResult = await this.pool.query(
      `select count(*)::text as count from messages where conversation_id = $1`,
      [input.conversationId],
    );
    const total = Number(countResult.rows.at(0)?.count ?? "0");
    const dataResult = await this.pool.query(
      `select ${MSG_COLS} from messages where conversation_id = $1 order by created_at desc limit $2 offset $3`,
      [input.conversationId, limit, offset],
    );
    if (input.markReadFor === "user") {
      await this.pool.query(
        `update conversations set unread_count_user = 0 where id = $1 and unread_count_user > 0`,
        [input.conversationId],
      );
    } else if (input.markReadFor === "staff_tenant") {
      await this.pool.query(
        `update conversations set unread_count_staff_tenant = 0 where id = $1 and unread_count_staff_tenant > 0`,
        [input.conversationId],
      );
    } else if (input.markReadFor === "staff_owner") {
      await this.pool.query(
        `update conversations set unread_count_staff_owner = 0 where id = $1 and unread_count_staff_owner > 0`,
        [input.conversationId],
      );
    }
    return { items: dataResult.rows.map(mapMessageRow), total };
  }
};
MessagesService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __param(1, Inject(REDIS_CLIENT)),
    __metadata("design:paramtypes", [Pool, Object]),
  ],
  MessagesService,
);
export { MessagesService };
//# sourceMappingURL=messages.service.js.map
