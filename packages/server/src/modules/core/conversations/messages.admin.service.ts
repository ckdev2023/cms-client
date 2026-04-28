import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type {
  Message,
  MessageQueryRow,
} from "../../portal/model/portalEntities";
import { mapMessageRow } from "../../portal/model/portalEntities";
import { REDIS_CLIENT } from "../../../infra/redis/createRedisClient";
import type { RedisClient } from "../../../infra/redis/createRedisClient";
import { RedisQueue } from "../../../infra/queue/redisQueue";
import type { TranslationJobPayload } from "../jobs/handlers/translationJobHandler";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { ConversationsAdminService } from "./conversations.admin.service";
import type {
  MessageListAdminInput,
  MessageSendAdminInput,
} from "./messages.admin.types";
import {
  MSG_ADMIN_COLS,
  validateKind,
  validateVisibleScope,
} from "./messages.admin.types";

const DEFAULT_TARGET_LANGUAGES = ["ja", "zh", "en"];

/**
 * Admin 側メッセージ管理サービス。
 */
@Injectable()
export class MessagesAdminService {
  private readonly queue: RedisQueue;

  /**
   * コンストラクタ。
   * @param pool PostgreSQL 接続プール
   * @param redisClient Redis クライアント
   * @param conversationsAdminService 会話管理サービス
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClient,
    @Inject(ConversationsAdminService)
    private readonly conversationsAdminService: ConversationsAdminService,
  ) {
    this.queue = new RedisQueue(this.redisClient);
  }

  /**
   * 会話内メッセージ一覧を取得し、未読カウントをクリアする。
   * @param ctx リクエストコンテキスト
   * @param conversationId 会話 ID
   * @param input ページネーション
   * @returns メッセージ一覧と総件数
   */
  async list(
    ctx: RequestContext,
    conversationId: string,
    input: MessageListAdminInput,
  ): Promise<{ items: Message[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const countRes = await tenantDb.query<{ count: string }>(
      `select count(*)::text as count from messages where conversation_id = $1`,
      [conversationId],
    );
    const total = parseInt(countRes.rows[0]?.count ?? "0", 10);
    const dataRes = await tenantDb.query<MessageQueryRow>(
      `select ${MSG_ADMIN_COLS} from messages where conversation_id = $1 order by created_at desc limit $2 offset $3`,
      [conversationId, limit, offset],
    );
    await this.conversationsAdminService.clearUnread(ctx, conversationId);
    return { items: dataRes.rows.map(mapMessageRow), total };
  }

  /**
   * Admin がメッセージを送信する（senderType='staff'、翻訳キュー連携）。
   * @param ctx リクエストコンテキスト
   * @param conversationId 会話 ID
   * @param input 送信パラメータ
   * @returns 作成されたメッセージ
   */
  async send(
    ctx: RequestContext,
    conversationId: string,
    input: MessageSendAdminInput,
  ): Promise<Message> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    await this.assertConversationExists(tenantDb, conversationId);
    const kind = validateKind(input.kind);
    const visibleScope = validateVisibleScope(input.visibleScope);
    const translationStatus = input.forceOriginal ? "skipped" : "pending";
    const result = await tenantDb.query<MessageQueryRow>(
      `insert into messages (conversation_id, org_id, sender_type, sender_id, original_language, original_text, translation_status, kind, visible_scope)
       values ($1, $2, 'staff', $3, $4, $5, $6, $7, $8)
       returning ${MSG_ADMIN_COLS}`,
      [
        conversationId,
        ctx.orgId,
        ctx.userId,
        input.originalLanguage,
        input.originalText,
        translationStatus,
        kind,
        visibleScope,
      ],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to send message");
    const message = mapMessageRow(row);
    await this.updateConversationOnSend(tenantDb, conversationId);
    if (!input.forceOriginal) {
      await this.enqueueTranslation(ctx.orgId, message, input.originalLanguage);
    }
    return message;
  }

  /**
   * 翻訳失敗メッセージを再投入する。
   * @param ctx リクエストコンテキスト
   * @param conversationId 会話 ID
   * @param messageId メッセージ ID
   * @returns 更新後のメッセージ
   */
  async retryTranslation(
    ctx: RequestContext,
    conversationId: string,
    messageId: string,
  ): Promise<Message> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const msgRes = await tenantDb.query<MessageQueryRow>(
      `select ${MSG_ADMIN_COLS} from messages where id = $1 and conversation_id = $2 limit 1`,
      [messageId, conversationId],
    );
    const row = msgRes.rows.at(0);
    if (!row) throw new NotFoundException("Message not found");
    const current = mapMessageRow(row);
    if (
      current.translationStatus !== "failed" &&
      current.translationStatus !== "partial"
    ) {
      throw new BadRequestException(
        "Only failed or partial translations can be retried",
      );
    }
    await tenantDb.query(
      `update messages set translation_status = 'pending' where id = $1`,
      [messageId],
    );
    await this.enqueueTranslation(
      ctx.orgId,
      current,
      current.originalLanguage,
      "retry",
    );
    const updated = await tenantDb.query<MessageQueryRow>(
      `select ${MSG_ADMIN_COLS} from messages where id = $1 limit 1`,
      [messageId],
    );
    const updatedRow = updated.rows.at(0);
    if (!updatedRow)
      throw new NotFoundException("Message not found after retry");
    return mapMessageRow(updatedRow);
  }

  private async assertConversationExists(
    tenantDb: ReturnType<typeof createTenantDb>,
    conversationId: string,
  ): Promise<void> {
    const convCheck = await tenantDb.query<{ id: string }>(
      `select id from conversations where id = $1 limit 1`,
      [conversationId],
    );
    if (!convCheck.rows[0]) {
      throw new NotFoundException("Conversation not found");
    }
  }

  private async updateConversationOnSend(
    tenantDb: ReturnType<typeof createTenantDb>,
    conversationId: string,
  ): Promise<void> {
    await tenantDb.query(
      `update conversations set last_message_at = now(), unread_count_user = unread_count_user + 1, updated_at = now() where id = $1`,
      [conversationId],
    );
  }

  private async enqueueTranslation(
    orgId: string,
    message: Message,
    originalLanguage: string,
    prefix = "tj",
  ): Promise<void> {
    const targetLanguages = DEFAULT_TARGET_LANGUAGES.filter(
      (l) => l !== originalLanguage,
    );
    await this.queue.enqueue<TranslationJobPayload>("translation_jobs", {
      id: `${prefix}-${message.id}`,
      name: "translation",
      payload: {
        orgId,
        messageId: message.id,
        originalText: message.originalText,
        originalLanguage,
        targetLanguages,
      },
      createdAt: new Date().toISOString(),
    });
  }
}
