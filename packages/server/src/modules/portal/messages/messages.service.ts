import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import type { Message, MessageQueryRow } from "../model/portalEntities";
import { mapMessageRow } from "../model/portalEntities";
import { REDIS_CLIENT } from "../../../infra/redis/createRedisClient";
import type { RedisClient } from "../../../infra/redis/createRedisClient";
import { RedisQueue } from "../../../infra/queue/redisQueue";
import type { TranslationJobPayload } from "../../core/jobs/handlers/translationJobHandler";

/** Message 发送入参。 */
export type MessageSendInput = {
  conversationId: string;
  senderType: string;
  senderId: string;
  originalLanguage: string;
  originalText: string;
  orgId?: string | null;
};

/** Message 列表查询入参。 */
export type MessageListInput = {
  conversationId: string;
  page?: number;
  limit?: number;
};

const MSG_COLS = `id, conversation_id, org_id, sender_type, sender_id, original_language, original_text, translated_text_ja, translated_text_zh, translated_text_en, translation_status, created_at`;

const DEFAULT_TARGET_LANGUAGES = ["ja", "zh", "en"];

/**
 * Messages 服务：发送消息 + 异步翻译入队。
 */
@Injectable()
export class MessagesService {
  private readonly queue: RedisQueue;

  /**
   * 创建服务实例。
   * @param pool PostgreSQL 连接池
   * @param redisClient Redis 客户端
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClient,
  ) {
    this.queue = new RedisQueue(this.redisClient);
  }

  /**
   * 发送消息（同步落库 + 异步翻译入队）。
   * @param input 发送参数
   * @returns 创建的消息
   */
  async send(input: MessageSendInput): Promise<Message> {
    const result = await this.pool.query<MessageQueryRow>(
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

    await this.queue.enqueue<TranslationJobPayload>("translation_jobs", {
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
  async get(id: string): Promise<Message | null> {
    const result = await this.pool.query<MessageQueryRow>(
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
  async list(
    input: MessageListInput,
  ): Promise<{ items: Message[]; total: number }> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const countResult = await this.pool.query<{ count: string }>(
      `select count(*)::text as count from messages where conversation_id = $1`,
      [input.conversationId],
    );
    const total = Number(countResult.rows.at(0)?.count ?? "0");

    const dataResult = await this.pool.query<MessageQueryRow>(
      `select ${MSG_COLS} from messages where conversation_id = $1 order by created_at desc limit $2 offset $3`,
      [input.conversationId, limit, offset],
    );

    return { items: dataResult.rows.map(mapMessageRow), total };
  }
}
