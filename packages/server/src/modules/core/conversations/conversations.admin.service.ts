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
import { extractCustomerName } from "../customers/customerName";
import { TimelineService } from "../timeline/timeline.service";
import { buildListWhere } from "./conversations.admin.query";
import type {
  AdminConversationListItem,
  AdminConversationListRow,
  ConversationAssignInput,
  ConversationDetailAggregate,
  ConversationListInput,
} from "./conversations.admin.types";
import {
  CONV_ADMIN_COLS,
  CONV_ADMIN_COLS_ALIASED,
  CONV_LIST_JOIN_COLS,
  CONV_LIST_JOINS,
} from "./conversations.admin.types";

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
   * 会話一覧を取得する（leads/customers/users/app_users を JOIN して表示用フィールドを付与）。
   * @param ctx リクエストコンテキスト
   * @param input 一覧検索条件
   * @returns 会話一覧と総件数
   */
  async list(
    ctx: RequestContext,
    input: ConversationListInput,
  ): Promise<{ items: AdminConversationListItem[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const where: string[] = [];
    const params: unknown[] = [];
    buildListWhere(input, where, params);
    const wc = where.length > 0 ? `where ${where.join(" and ")}` : "";
    const countRes = await tenantDb.query<{ count: string }>(
      `select count(*)::text as count from conversations c ${CONV_LIST_JOINS} ${wc}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count ?? "0", 10);
    params.push(limit);
    const li = params.length;
    params.push(offset);
    const oi = params.length;
    const result = await tenantDb.query<AdminConversationListRow>(
      `select ${CONV_ADMIN_COLS_ALIASED}, ${CONV_LIST_JOIN_COLS} from conversations c ${CONV_LIST_JOINS} ${wc} order by c.last_message_at desc nulls last, c.created_at desc, c.id desc limit $${String(li)} offset $${String(oi)}`,
      params,
    );
    return { items: result.rows.map(mapAdminConversationListRow), total };
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

function toNullableString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return typeof v === "string" ? v : null;
}

function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function parseNullableNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function requireTimestamp(value: unknown, field: string): string {
  const s = toTimestampStringOrNull(value);
  if (!s) throw new Error(`Invalid timestamp: ${field}`);
  return s;
}

function deriveLinkedEntity(
  row: AdminConversationListRow,
  customerName: string | null,
): AdminConversationListItem["linkedEntity"] {
  if (row.case_id) {
    return {
      id: row.case_id,
      label: toNullableString(row.case_no) ?? "",
      type: "case",
    };
  }
  if (row.customer_id) {
    return {
      id: row.customer_id,
      label: customerName ?? "",
      type: "customer",
    };
  }
  if (row.lead_id) {
    return {
      id: row.lead_id,
      label: toNullableString(row.lead_name) ?? "",
      type: "lead",
    };
  }
  return null;
}

/**
 * Admin 一覧 JOIN 行→ AdminConversationListItem へ変換。
 * @param r JOIN 結果行
 * @returns 変換済みリストアイテム
 */
function mapAdminConversationListRow(
  r: AdminConversationListRow,
): AdminConversationListItem {
  const customerName = extractCustomerName(r.customer_base_profile);
  const ownerName = toNullableString(r.owner_display_name);
  return {
    id: r.id,
    leadId: r.lead_id,
    appUserId: r.app_user_id,
    orgId: r.org_id,
    channel: r.channel,
    preferredLanguage: r.preferred_language,
    status: r.status,
    ownerUserId: toNullableString(r.owner_user_id),
    lastMessageAt: toTimestampStringOrNull(r.last_message_at),
    unreadCountStaffTenant: parseNullableNumber(r.unread_count_staff_tenant),
    unreadCountStaffOwner: parseNullableNumber(r.unread_count_staff_owner),
    unreadCountUser: parseNullableNumber(r.unread_count_user),
    customerId: toNullableString(r.customer_id),
    caseId: toNullableString(r.case_id),
    createdAt: requireTimestamp(r.created_at, "created_at"),
    updatedAt: requireTimestamp(r.updated_at, "updated_at"),
    leadName: toNullableString(r.lead_name),
    customerName,
    ownerDisplayName: ownerName,
    appUserName: toNullableString(r.app_user_name) ?? "",
    linkedEntity: deriveLinkedEntity(r, customerName),
    ownerLabel: ownerName ?? "",
    lastMessagePreview: buildLastMessagePreview(
      r.lm_original_text,
      r.lm_sender_type,
    ),
  };
}

const PREVIEW_MAX_CHARS = 60;

function segmentGraphemes(text: string): string[] {
  const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return Array.from(seg.segment(text), (s) => s.segment);
}

function buildLastMessagePreview(
  originalText: string | null | undefined,
  senderType: string | null | undefined,
): string {
  if (!originalText) return "";
  const cleaned = originalText.replace(/[\r\n]+/g, " ").trim();
  const graphemes = segmentGraphemes(cleaned);
  const truncated =
    graphemes.length > PREVIEW_MAX_CHARS
      ? graphemes.slice(0, PREVIEW_MAX_CHARS).join("") + "…"
      : cleaned;
  const prefix = senderType === "app_user" ? "客户：" : "事務所：";
  return `${prefix}${truncated}`;
}
