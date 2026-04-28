import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type {
  Conversation,
  ConversationQueryRow,
} from "../../portal/model/portalEntities";
import { mapConversationRow } from "../../portal/model/portalEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import { buildListWhere } from "./conversations.admin.query";
import type {
  ConversationAssignInput,
  ConversationDetailAggregate,
  ConversationListInput,
} from "./conversations.admin.types";
import { CONV_ADMIN_COLS } from "./conversations.admin.types";

/**
 * Admin 側会話管理サービス。
 */
@Injectable()
export class ConversationsAdminService {
  /**
   * コンストラクタ。
   * @param pool PostgreSQL 接続プール
   * @param timelineService タイムラインサービス
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  /**
   * 会話一覧を取得する。
   * @param ctx リクエストコンテキスト
   * @param input 一覧検索条件
   * @returns 会話一覧と総件数
   */
  async list(
    ctx: RequestContext,
    input: ConversationListInput,
  ): Promise<{ items: Conversation[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const where: string[] = [];
    const params: unknown[] = [];
    buildListWhere(input, where, params);
    const wc = where.length > 0 ? `where ${where.join(" and ")}` : "";
    const countRes = await tenantDb.query<{ count: string }>(
      `select count(*)::text as count from conversations ${wc}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count ?? "0", 10);
    params.push(limit);
    const li = params.length;
    params.push(offset);
    const oi = params.length;
    const result = await tenantDb.query<ConversationQueryRow>(
      `select ${CONV_ADMIN_COLS} from conversations ${wc} order by last_message_at desc nulls last, created_at desc, id desc limit $${String(li)} offset $${String(oi)}`,
      params,
    );
    return { items: result.rows.map(mapConversationRow), total };
  }

  /**
   * 会話詳細（関連 lead/customer/case/appUser 概要含む）を取得する。
   * @param ctx リクエストコンテキスト
   * @param id 会話 ID
   * @returns 会話詳細集約
   */
  async getDetail(
    ctx: RequestContext,
    id: string,
  ): Promise<ConversationDetailAggregate> {
    const conversation = await this.getConversationOrThrow(ctx, id);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const lead = conversation.leadId
      ? await this.getLeadSummary(tenantDb, conversation.leadId)
      : null;
    const customer = conversation.customerId
      ? await this.getCustomerSummary(tenantDb, conversation.customerId)
      : null;
    const caseInfo = conversation.caseId
      ? await this.getCaseSummary(tenantDb, conversation.caseId)
      : null;
    const appUser = await this.getAppUserSummary(
      tenantDb,
      conversation.appUserId,
    );
    return { conversation, lead, customer, case: caseInfo, appUser };
  }

  /**
   * 会話にスタッフを指派する。
   * @param ctx リクエストコンテキスト
   * @param id 会話 ID
   * @param input 指派入力
   * @returns 更新後の会話
   */
  async assign(
    ctx: RequestContext,
    id: string,
    input: ConversationAssignInput,
  ): Promise<Conversation> {
    const current = await this.getConversationOrThrow(ctx, id);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    let targetOwner = input.ownerUserId;
    if (!targetOwner && current.leadId) {
      const leadRes = await tenantDb.query<{ owner_user_id: string | null }>(
        `select owner_user_id from leads where id = $1 limit 1`,
        [current.leadId],
      );
      targetOwner = leadRes.rows[0]?.owner_user_id ?? undefined;
    }
    if (!targetOwner) {
      throw new BadRequestException(
        "ownerUserId is required (no lead owner to default to)",
      );
    }
    const previousOwner = current.ownerUserId;
    const result = await tenantDb.query<ConversationQueryRow>(
      `update conversations set owner_user_id = $2, updated_at = now() where id = $1 returning ${CONV_ADMIN_COLS}`,
      [id, targetOwner],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to assign conversation");
    const action = previousOwner
      ? "conversation.reassigned"
      : "conversation.assigned";
    await this.timelineService.write(ctx, {
      entityType: "conversation",
      entityId: id,
      action,
      payload: { from: previousOwner, to: targetOwner },
    });
    return mapConversationRow(row);
  }

  /**
   * 会話を閉じる。
   * @param ctx リクエストコンテキスト
   * @param id 会話 ID
   * @returns 閉じた会話
   */
  async close(ctx: RequestContext, id: string): Promise<Conversation> {
    await this.getConversationOrThrow(ctx, id);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<ConversationQueryRow>(
      `update conversations set status = 'closed', updated_at = now() where id = $1 returning ${CONV_ADMIN_COLS}`,
      [id],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to close conversation");
    await this.timelineService.write(ctx, {
      entityType: "conversation",
      entityId: id,
      action: "conversation.closed",
      payload: {},
    });
    return mapConversationRow(row);
  }

  /**
   * 会話を再開する。
   * @param ctx リクエストコンテキスト
   * @param id 会話 ID
   * @returns 再開した会話
   */
  async reopen(ctx: RequestContext, id: string): Promise<Conversation> {
    const current = await this.getConversationOrThrow(ctx, id);
    if (current.status !== "closed") {
      throw new BadRequestException(
        "Only closed conversations can be reopened",
      );
    }
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<ConversationQueryRow>(
      `update conversations set status = 'open', updated_at = now() where id = $1 returning ${CONV_ADMIN_COLS}`,
      [id],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to reopen conversation");
    await this.timelineService.write(ctx, {
      entityType: "conversation",
      entityId: id,
      action: "conversation.reopened",
      payload: {},
    });
    return mapConversationRow(row);
  }

  /**
   * Staff が会話を読んだ時の未読カウントクリア。
   * @param ctx リクエストコンテキスト
   * @param conversationId 会話 ID
   */
  async clearUnread(
    ctx: RequestContext,
    conversationId: string,
  ): Promise<void> {
    const conversation = await this.getConversationOrThrow(ctx, conversationId);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const sets: string[] = ["unread_count_staff_tenant = 0"];
    if (conversation.ownerUserId === ctx.userId) {
      sets.push("unread_count_staff_owner = 0");
    }
    await tenantDb.query(
      `update conversations set ${sets.join(", ")}, updated_at = now() where id = $1`,
      [conversationId],
    );
  }

  private async getConversationOrThrow(
    ctx: RequestContext,
    id: string,
  ): Promise<Conversation> {
    const db = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const r = await db.query<ConversationQueryRow>(
      `select ${CONV_ADMIN_COLS} from conversations where id = $1 limit 1`,
      [id],
    );
    const row = r.rows.at(0);
    if (!row) throw new NotFoundException("Conversation not found");
    return mapConversationRow(row);
  }

  private async getLeadSummary(
    db: ReturnType<typeof createTenantDb>,
    leadId: string,
  ) {
    const r = await db.query<{
      id: string;
      name: string | null;
      status: string;
    }>(`select id, name, status from leads where id = $1 limit 1`, [leadId]);
    return r.rows.at(0) ?? null;
  }

  private async getCustomerSummary(
    db: ReturnType<typeof createTenantDb>,
    customerId: string,
  ) {
    const r = await db.query<{ id: string; base_profile: unknown }>(
      `select id, base_profile from customers where id = $1 limit 1`,
      [customerId],
    );
    const row = r.rows.at(0);
    if (!row) return null;
    return { id: row.id, name: extractCustomerName(row.base_profile) };
  }

  private async getCaseSummary(
    db: ReturnType<typeof createTenantDb>,
    caseId: string,
  ) {
    const r = await db.query<{ id: string; case_no: string | null }>(
      `select id, case_no from cases where id = $1 limit 1`,
      [caseId],
    );
    const row = r.rows.at(0);
    if (!row) return null;
    return { id: row.id, caseNo: row.case_no };
  }

  private async getAppUserSummary(
    db: ReturnType<typeof createTenantDb>,
    appUserId: string,
  ) {
    const r = await db.query<{
      id: string;
      name: string;
      preferred_language: string;
    }>(
      `select id, name, preferred_language from app_users where id = $1 limit 1`,
      [appUserId],
    );
    const row = r.rows.at(0);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      preferredLanguage: row.preferred_language,
    };
  }
}

function extractCustomerName(baseProfile: unknown): string | null {
  if (!baseProfile || typeof baseProfile !== "object") return null;
  const bp = baseProfile as Record<string, unknown>;
  if (typeof bp.name === "string") return bp.name;
  if (typeof bp.lastName === "string") {
    const first = typeof bp.firstName === "string" ? bp.firstName : "";
    return `${bp.lastName} ${first}`.trim();
  }
  return null;
}
