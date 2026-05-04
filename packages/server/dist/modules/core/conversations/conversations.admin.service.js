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
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";
import { mapConversationRow } from "../../portal/model/portalEntities";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import { buildListWhere } from "./conversations.admin.query";
import { CONV_ADMIN_COLS } from "./conversations.admin.types";
/**
 * Admin 側会話管理サービス。
 */
let ConversationsAdminService = class ConversationsAdminService {
  pool;
  timelineService;
  /**
   * コンストラクタ。
   * @param pool PostgreSQL 接続プール
   * @param timelineService タイムラインサービス
   */
  constructor(pool, timelineService) {
    this.pool = pool;
    this.timelineService = timelineService;
  }
  /**
   * 会話一覧を取得する。
   * @param ctx リクエストコンテキスト
   * @param input 一覧検索条件
   * @returns 会話一覧と総件数
   */
  async list(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];
    buildListWhere(input, where, params);
    const wc = where.length > 0 ? `where ${where.join(" and ")}` : "";
    const countRes = await tenantDb.query(
      `select count(*)::text as count from conversations ${wc}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count ?? "0", 10);
    params.push(limit);
    const li = params.length;
    params.push(offset);
    const oi = params.length;
    const result = await tenantDb.query(
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
  async getDetail(ctx, id) {
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
  async assign(ctx, id, input) {
    const current = await this.getConversationOrThrow(ctx, id);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    let targetOwner = input.ownerUserId;
    if (!targetOwner && current.leadId) {
      const leadRes = await tenantDb.query(
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
    const result = await tenantDb.query(
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
  async close(ctx, id) {
    await this.getConversationOrThrow(ctx, id);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
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
  async reopen(ctx, id) {
    const current = await this.getConversationOrThrow(ctx, id);
    if (current.status !== "closed") {
      throw new BadRequestException(
        "Only closed conversations can be reopened",
      );
    }
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
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
  async clearUnread(ctx, conversationId) {
    const conversation = await this.getConversationOrThrow(ctx, conversationId);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const sets = ["unread_count_staff_tenant = 0"];
    if (conversation.ownerUserId === ctx.userId) {
      sets.push("unread_count_staff_owner = 0");
    }
    await tenantDb.query(
      `update conversations set ${sets.join(", ")}, updated_at = now() where id = $1`,
      [conversationId],
    );
  }
  async getConversationOrThrow(ctx, id) {
    const db = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const r = await db.query(
      `select ${CONV_ADMIN_COLS} from conversations where id = $1 limit 1`,
      [id],
    );
    const row = r.rows.at(0);
    if (!row) throw new NotFoundException("Conversation not found");
    return mapConversationRow(row);
  }
  async getLeadSummary(db, leadId) {
    const r = await db.query(
      `select id, name, status from leads where id = $1 limit 1`,
      [leadId],
    );
    return r.rows.at(0) ?? null;
  }
  async getCustomerSummary(db, customerId) {
    const r = await db.query(
      `select id, base_profile from customers where id = $1 limit 1`,
      [customerId],
    );
    const row = r.rows.at(0);
    if (!row) return null;
    return { id: row.id, name: extractCustomerName(row.base_profile) };
  }
  async getCaseSummary(db, caseId) {
    const r = await db.query(
      `select id, case_no from cases where id = $1 limit 1`,
      [caseId],
    );
    const row = r.rows.at(0);
    if (!row) return null;
    return { id: row.id, caseNo: row.case_no };
  }
  async getAppUserSummary(db, appUserId) {
    const r = await db.query(
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
};
ConversationsAdminService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __param(1, Inject(TimelineService)),
    __metadata("design:paramtypes", [Pool, TimelineService]),
  ],
  ConversationsAdminService,
);
export { ConversationsAdminService };
function extractCustomerName(baseProfile) {
  if (!baseProfile || typeof baseProfile !== "object") return null;
  const bp = baseProfile;
  if (typeof bp.name === "string") return bp.name;
  if (typeof bp.lastName === "string") {
    const first = typeof bp.firstName === "string" ? bp.firstName : "";
    return `${bp.lastName} ${first}`.trim();
  }
  return null;
}
//# sourceMappingURL=conversations.admin.service.js.map
