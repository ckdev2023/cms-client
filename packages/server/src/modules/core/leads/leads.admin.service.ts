import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { Lead, LeadQueryRow } from "../../portal/model/portalEntities";
import { mapLeadRow } from "../../portal/model/portalEntities";
import { CasesService } from "../cases/cases.service";
import { CustomersService } from "../customers/customers.service";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb, type TenantDbTx } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import { convertCase as runConvertCase } from "./leads.admin.convert-case";
import { convertCustomer as runConvertCustomer } from "./leads.admin.convert";
import {
  type LeadFollowup,
  type LeadFollowupQueryRow,
  type LeadLog,
  type LeadLogQueryRow,
  isLeadFollowupChannel,
  mapLeadFollowupRow,
  mapLeadLogRow,
} from "./leadEntities";
import {
  bulkAssign,
  bulkExport,
  bulkFollowup,
  bulkStatus,
  bulkTags,
  createAuditWriter,
} from "./leads.admin.bulk";
import {
  buildDedupHints,
  buildListWhere,
  queryCaseSummary,
  queryCustomerSummary,
  queryDedupCustomers,
  queryDedupLeads,
  syncLeadNextFields,
  validateTransition,
} from "./leads.admin.query";
import {
  type AdminLeadListItem,
  type AdminLeadListRow,
  FOLLOWUP_COLS,
  LEAD_COLS,
  LEAD_COLS_ALIASED,
  LEAD_LIST_JOIN_COLS,
  LEAD_LIST_JOINS,
  LOG_COLS,
  LOG_FROM_WITH_ACTOR,
  UPDATABLE_FIELDS,
  type LeadBulkAssignInput,
  type LeadBulkFollowupInput,
  type LeadBulkStatusInput,
  type LeadBulkTagsInput,
  type LeadConvertCaseInput,
  type LeadConvertCustomerInput,
  type LeadCreateInput,
  type LeadDedupInput,
  type LeadDedupResult,
  type LeadDetailAggregate,
  type LeadFollowupInput,
  type LeadListInput,
  type LeadStatusInput,
  type LeadUpdateInput,
} from "./leads.admin.types";
import { insertLeadWithNumbering } from "./leads.create";

export type { LeadListScope } from "./leads.admin.types";
/** Admin 側 Lead 管理サービス。 */
@Injectable()
export class LeadsAdminService {
  /** コンストラクタ。
   * @param pool DB 接続プール
   * @param timelineService タイムライン
   * @param customersService 顧客サービス
   * @param casesService 案件サービス
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
    @Inject(CustomersService)
    private readonly customersService: CustomersService,
    @Inject(CasesService) private readonly casesService: CasesService,
  ) {}

  /**
   * Lead を新規作成する。
   * @param ctx リクエストコンテキスト
   * @param input 作成入力
   * @returns 作成された Lead
   */
  async create(ctx: RequestContext, input: LeadCreateInput): Promise<Lead> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const ownerUserId = input.ownerUserId ?? ctx.userId;
    const lead = await tenantDb.transaction((tx: TenantDbTx) =>
      insertLeadWithNumbering(tx, ctx, input, ownerUserId),
    );
    await this.writeAudit(ctx, lead.id, "created", {
      name: input.name,
      phone: input.phone,
      email: input.email,
      sourceChannel: input.sourceChannel,
      ownerUserId,
    });
    return lead;
  }

  /** Lead 一覧を取得する。
   * @param ctx リクエストコンテキスト
   * @param input 一覧検索条件
   * @returns Lead 一覧と総件数
   */
  async list(
    ctx: RequestContext,
    input: LeadListInput,
  ): Promise<{ items: AdminLeadListItem[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const where: string[] = [];
    const params: unknown[] = [];
    buildListWhere(ctx, input, where, params);
    const wc = where.length > 0 ? `where ${where.join(" and ")}` : "";
    const countRes = await tenantDb.query<{ count: string }>(
      `select count(*)::text as count from leads l ${LEAD_LIST_JOINS} ${wc}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count ?? "0", 10);
    params.push(limit);
    const li = params.length;
    params.push(offset);
    const oi = params.length;
    const result = await tenantDb.query<AdminLeadListRow>(
      `select ${LEAD_COLS_ALIASED}, ${LEAD_LIST_JOIN_COLS} from leads l ${LEAD_LIST_JOINS} ${wc} order by l.created_at desc, l.id desc limit $${String(li)} offset $${String(oi)}`,
      params,
    );
    return {
      items: result.rows.map((row) => ({
        ...mapLeadRow(row),
        ownerDisplayName: row.owner_display_name ?? null,
        groupName: row.group_name ?? null,
      })),
      total,
    };
  }

  /** Lead 詳細を取得する。
   * @param ctx リクエストコンテキスト
   * @param id Lead ID
   * @returns Lead 詳細集約
   */
  async getDetail(
    ctx: RequestContext,
    id: string,
  ): Promise<LeadDetailAggregate> {
    const lead = await this.getLeadOrThrow(ctx, id);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const [fRes, lRes] = await Promise.all([
      tenantDb.query<LeadFollowupQueryRow>(
        `select ${FOLLOWUP_COLS} from lead_followups where lead_id = $1 order by created_at desc limit 100`,
        [id],
      ),
      tenantDb.query<LeadLogQueryRow>(
        `select ${LOG_COLS} from ${LOG_FROM_WITH_ACTOR} where ll.lead_id = $1 order by ll.created_at desc limit 200`,
        [id],
      ),
    ]);
    const dedupHints = await buildDedupHints(tenantDb, ctx.orgId, lead);
    const convertedCustomer = lead.convertedCustomerId
      ? await queryCustomerSummary(tenantDb, lead.convertedCustomerId)
      : null;
    const convertedCase = lead.convertedCaseId
      ? await queryCaseSummary(tenantDb, lead.convertedCaseId)
      : null;
    return {
      lead,
      followups: fRes.rows.map(mapLeadFollowupRow),
      logs: lRes.rows.map(mapLeadLogRow),
      dedupHints,
      convertedCustomer,
      convertedCase,
    };
  }

  /**
   * Lead 業務フィールドを更新する。
   * @param ctx リクエストコンテキスト
   * @param id Lead ID
   * @param input 更新入力
   * @returns 更新後の Lead
   */
  async update(
    ctx: RequestContext,
    id: string,
    input: LeadUpdateInput,
  ): Promise<Lead> {
    const current = await this.getLeadOrThrow(ctx, id);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const sets: string[] = [];
    const params: unknown[] = [id];
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [key, col] of UPDATABLE_FIELDS) {
      const value = input[key];
      if (value === undefined) continue;
      params.push(value);
      sets.push(`${col} = $${String(params.length)}`);
      const cur = current[key as keyof Lead];
      if (cur !== value) changes[key] = { from: cur, to: value };
    }
    if (sets.length === 0) return current;
    sets.push("updated_at = now()");
    const result = await tenantDb.query<LeadQueryRow>(
      `update leads set ${sets.join(", ")} where id = $1 returning ${LEAD_COLS}`,
      params,
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to update lead");
    if (Object.keys(changes).length > 0) {
      await this.writeAudit(ctx, id, "field_change", changes);
    }
    return mapLeadRow(row);
  }

  /**
   * Lead ステータスを遷移させる。
   * @param ctx リクエストコンテキスト
   * @param id Lead ID
   * @param input ステータス遷移入力
   * @returns 更新後の Lead
   */
  async transitionStatus(
    ctx: RequestContext,
    id: string,
    input: LeadStatusInput,
  ): Promise<Lead> {
    const current = await this.getLeadOrThrow(ctx, id);
    const { target, currentStatus } = validateTransition(current, input);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const params: unknown[] = [id, target];
    let extra = "";
    if (target === "lost" && input.lostReason) {
      params.push(input.lostReason.trim());
      extra = `, lost_reason = $${String(params.length)}`;
    }
    if (currentStatus === "lost" && target === "following") {
      extra += ", lost_reason = null";
    }
    const result = await tenantDb.query<LeadQueryRow>(
      `update leads set status = $2${extra}, updated_at = now() where id = $1 returning ${LEAD_COLS}`,
      params,
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to update lead status");
    await this.writeAudit(ctx, id, "status_change", {
      from: currentStatus,
      to: target,
      ...(target === "lost" ? { lostReason: input.lostReason } : {}),
    });
    return mapLeadRow(row);
  }

  /** フォローアップを追加する。
   * @param ctx リクエストコンテキスト
   * @param leadId Lead ID
   * @param input フォローアップ入力
   * @returns 作成されたフォローアップ
   */
  async addFollowup(
    ctx: RequestContext,
    leadId: string,
    input: LeadFollowupInput,
  ): Promise<LeadFollowup> {
    await this.getLeadOrThrow(ctx, leadId);
    if (!isLeadFollowupChannel(input.channel)) {
      throw new BadRequestException(
        `Invalid followup channel: ${input.channel}`,
      );
    }
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.transaction(async (tx: TenantDbTx) => {
      const ins = await tx.query<LeadFollowupQueryRow>(
        `insert into lead_followups (lead_id, channel, summary, conclusion, next_action, next_follow_up_at, created_by)
         values ($1, $2, $3, $4, $5, $6::timestamptz, $7) returning ${FOLLOWUP_COLS}`,
        [
          leadId,
          input.channel,
          input.summary ?? null,
          input.conclusion ?? null,
          input.nextAction ?? null,
          input.nextFollowUpAt ?? null,
          ctx.userId,
        ],
      );
      await syncLeadNextFields(tx, leadId, input);
      return ins;
    });
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create followup");
    await this.writeAudit(ctx, leadId, "followup_added", {
      channel: input.channel,
    });
    return mapLeadFollowupRow(row);
  }

  /** フォローアップ一覧を取得する。
   * @param ctx リクエストコンテキスト
   * @param leadId Lead ID
   * @returns フォローアップ一覧
   */
  async listFollowups(
    ctx: RequestContext,
    leadId: string,
  ): Promise<LeadFollowup[]> {
    await this.getLeadOrThrow(ctx, leadId);
    const db = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const r = await db.query<LeadFollowupQueryRow>(
      `select ${FOLLOWUP_COLS} from lead_followups where lead_id = $1 order by created_at desc limit 200`,
      [leadId],
    );
    return r.rows.map(mapLeadFollowupRow);
  }

  /** ログ一覧を取得する。
   * @param ctx リクエストコンテキスト
   * @param leadId Lead ID
   * @returns ログ一覧
   */
  async listLogs(ctx: RequestContext, leadId: string): Promise<LeadLog[]> {
    await this.getLeadOrThrow(ctx, leadId);
    const db = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const r = await db.query<LeadLogQueryRow>(
      `select ${LOG_COLS} from ${LOG_FROM_WITH_ACTOR} where ll.lead_id = $1 order by ll.created_at desc limit 200`,
      [leadId],
    );
    return r.rows.map(mapLeadLogRow);
  }

  /** 一括担当者変更。
   * @param ctx リクエストコンテキスト
   * @param input 入力
   * @returns 更新件数
   */
  async bulkAssign(ctx: RequestContext, input: LeadBulkAssignInput) {
    return bulkAssign(this.bulkDeps(ctx), input);
  }
  /** 一括フォローアップ追加。
   * @param ctx リクエストコンテキスト
   * @param input 入力
   * @returns 更新件数
   */
  async bulkFollowup(ctx: RequestContext, input: LeadBulkFollowupInput) {
    return bulkFollowup(this.bulkDeps(ctx), input);
  }
  /** 一括ステータス変更。
   * @param ctx リクエストコンテキスト
   * @param input 入力
   * @returns 更新件数
   */
  async bulkStatus(ctx: RequestContext, input: LeadBulkStatusInput) {
    return bulkStatus(
      this.bulkDeps(ctx),
      input,
      this.transitionStatus.bind(this),
    );
  }
  /** 一括タグ更新。
   * @param ctx リクエストコンテキスト
   * @param input 入力
   * @returns 更新件数
   */
  async bulkTags(ctx: RequestContext, input: LeadBulkTagsInput) {
    return bulkTags(this.bulkDeps(ctx), input);
  }
  /** 一括エクスポート。
   * @param ctx リクエストコンテキスト
   * @param leadIds 対象 ID 群
   * @returns Lead 一覧
   */
  async bulkExport(ctx: RequestContext, leadIds: string[]) {
    return bulkExport(this.bulkDeps(ctx), leadIds);
  }
  /** 重複候補検索。
   * @param ctx リクエストコンテキスト
   * @param input 検索入力
   * @returns 重複候補
   */
  async dedup(
    ctx: RequestContext,
    input: LeadDedupInput,
  ): Promise<LeadDedupResult> {
    if (!input.phone && !input.email) return { leads: [], customers: [] };
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const leads = await queryDedupLeads(tenantDb, ctx.orgId, input);
    const customers = await queryDedupCustomers(tenantDb, ctx.orgId, input);
    return { leads, customers };
  }
  /** Lead → Customer 転化。
   * @param ctx リクエストコンテキスト
   * @param leadId Lead ID
   * @param input 転化入力
   * @returns Lead + customerId
   */
  async convertCustomer(
    ctx: RequestContext,
    leadId: string,
    input: LeadConvertCustomerInput,
  ): Promise<{ lead: Lead; customerId: string }> {
    return runConvertCustomer(
      {
        pool: this.pool,
        customersService: this.customersService,
        getLeadOrThrow: this.getLeadOrThrow.bind(this),
        writeAudit: this.writeAudit.bind(this),
      },
      ctx,
      leadId,
      input,
    );
  }
  /** Lead → Case 転化。
   * @param ctx リクエストコンテキスト
   * @param leadId Lead ID
   * @param input 転化入力
   * @returns Lead + caseId
   */
  async convertCase(
    ctx: RequestContext,
    leadId: string,
    input: LeadConvertCaseInput,
  ): Promise<{ lead: Lead; caseId: string }> {
    return runConvertCase(
      {
        pool: this.pool,
        casesService: this.casesService,
        getLeadOrThrow: this.getLeadOrThrow.bind(this),
        writeAudit: this.writeAudit.bind(this),
      },
      ctx,
      leadId,
      input,
    );
  }

  // ── Private ──
  private async getLeadOrThrow(ctx: RequestContext, id: string): Promise<Lead> {
    const db = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const r = await db.query<LeadQueryRow>(
      `select ${LEAD_COLS} from leads where id = $1 limit 1`,
      [id],
    );
    const row = r.rows.at(0);
    if (!row) throw new NotFoundException("Lead not found");
    return mapLeadRow(row);
  }

  private async writeAudit(
    ctx: RequestContext,
    leadId: string,
    logType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const db = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    await Promise.all([
      db.query(
        `insert into lead_logs (lead_id, log_type, payload, created_by) values ($1, $2, $3::jsonb, $4)`,
        [leadId, logType, JSON.stringify(payload), ctx.userId],
      ),
      this.timelineService.write(ctx, {
        entityType: "lead",
        entityId: leadId,
        action: `lead.${logType}`,
        payload,
      }),
    ]);
  }

  private bulkDeps(ctx: RequestContext) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return {
      ctx,
      tenantDb,
      writeAuditLogs: createAuditWriter(this.timelineService, tenantDb),
    };
  }
}
