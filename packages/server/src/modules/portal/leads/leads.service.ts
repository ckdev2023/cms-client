import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Optional,
} from "@nestjs/common";
import { Pool, type PoolClient } from "pg";

import { createDefaultCustomerBmvProfile } from "../../core/customers/customers.dto-mappers";
import type { Lead, LeadQueryRow } from "../model/portalEntities";
import { mapLeadRow } from "../model/portalEntities";
import {
  hasConvertDedupHits,
  isBmvLead,
  queryConvertDedup,
} from "./leads.service.convert-support";
import {
  TEMPLATES_RESOLVER,
  type TemplatesResolver,
} from "../../core/cases/cases.service.types-internal";
import type { ChecklistItem } from "../../core/cases/cases.service.write-ops";
import {
  insertDocumentItemsInTx,
  resolveChecklistForConversion,
  writeCaseCreatedTimelineInTx,
} from "./leads.service.checklist-support";

/** Lead 创建入参。 */
export type LeadCreateInput = {
  appUserId: string;
  source?: string;
  language?: string;
};

/** Lead 更新入参。 */
export type LeadUpdateInput = {
  status?: string;
  source?: string;
  language?: string;
};

/** Lead 分配入参。 */
export type LeadAssignInput = {
  assignedOrgId: string;
  assignedUserId: string;
};

/** Lead 转化入参。 */
export type LeadConvertInput = {
  customerId: string;
  caseTypeCode: string;
  ownerUserId: string;
  orgId: string;
  confirmDedup?: boolean;
  actorUserId?: string;
};

/** Lead 列表查询入参。 */
export type LeadListInput = {
  appUserId?: string;
  status?: string;
  assignedOrgId?: string;
  page?: number;
  limit?: number;
};

/** Dedup 命中结果（用于 409 响应）。 */
export type ConvertDedupHit = {
  customers: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  }[];
  contactPersons: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    customerId: string | null;
  }[];
};

const LEAD_COLS = [
  "id",
  "org_id",
  "app_user_id",
  "source",
  "language",
  "status",
  "assigned_org_id",
  "owner_user_id",
  "lead_no",
  "name",
  "phone",
  "email",
  "source_channel",
  "referrer",
  "intended_case_type",
  "group_id",
  "next_action",
  "next_follow_up_at",
  "quote_amount",
  "note",
  "lost_reason",
  "converted_customer_id",
  "converted_case_id",
  "created_at",
  "updated_at",
].join(", ");

type LeadTxClient = PoolClient;

/**
 * Lead CRUD + 状态変更 + 分配サービス。
 */
@Injectable()
export class LeadsService {
  /**
   * サービスインスタンスを作成する。
   * @param pool PostgreSQL 接続プール
   * @param templatesResolver 模板解析服务（可选，未注入时转化不生成资料清单）
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Optional()
    @Inject(TEMPLATES_RESOLVER)
    private readonly templatesResolver?: TemplatesResolver,
  ) {}

  /**
   * Lead を作成する（初期 org_id は空）。
   * @param input 作成パラメータ
   * @returns 作成された Lead
   */
  async create(input: LeadCreateInput): Promise<Lead> {
    const result = await this.pool.query<LeadQueryRow>(
      `insert into leads (app_user_id, source, language) values ($1, $2, $3) returning ${LEAD_COLS}`,
      [input.appUserId, input.source ?? "web", input.language ?? "en"],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create lead");
    return mapLeadRow(row);
  }

  /**
   * Lead 詳細を取得する。
   * @param id Lead ID
   * @returns Lead または null
   */
  async get(id: string): Promise<Lead | null> {
    const result = await this.pool.query<LeadQueryRow>(
      `select ${LEAD_COLS} from leads where id = $1 limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapLeadRow(row) : null;
  }

  /**
   * Lead 一覧を取得する。
   * @param input 検索条件
   * @returns ページ分割結果
   */
  async list(
    input: LeadListInput = {},
  ): Promise<{ items: Lead[]; total: number }> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const where: string[] = [];
    const params: unknown[] = [];
    if (input.appUserId) {
      params.push(input.appUserId);
      where.push(`app_user_id = $${String(params.length)}`);
    }
    if (input.status) {
      params.push(input.status);
      where.push(`status = $${String(params.length)}`);
    }
    if (input.assignedOrgId) {
      params.push(input.assignedOrgId);
      where.push(`assigned_org_id = $${String(params.length)}`);
    }
    const clause = where.length > 0 ? `where ${where.join(" and ")}` : "";
    const countResult = await this.pool.query<{ count: string }>(
      `select count(*)::text as count from leads ${clause}`,
      params,
    );
    const total = Number(countResult.rows.at(0)?.count ?? "0");
    params.push(limit, offset);
    const dataResult = await this.pool.query<LeadQueryRow>(
      `select ${LEAD_COLS} from leads ${clause} order by created_at desc limit $${String(params.length - 1)} offset $${String(params.length)}`,
      params,
    );
    return { items: dataResult.rows.map(mapLeadRow), total };
  }

  /**
   * Lead を更新する。
   * @param id Lead ID
   * @param input 更新パラメータ
   * @returns 更新後の Lead
   */
  async update(id: string, input: LeadUpdateInput): Promise<Lead> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (input.status !== undefined) {
      sets.push(`status = $${String(idx++)}`);
      params.push(input.status);
    }
    if (input.source !== undefined) {
      sets.push(`source = $${String(idx++)}`);
      params.push(input.source);
    }
    if (input.language !== undefined) {
      sets.push(`language = $${String(idx++)}`);
      params.push(input.language);
    }
    if (sets.length === 0) {
      const c = await this.get(id);
      if (!c) throw new BadRequestException("Lead not found");
      return c;
    }
    sets.push("updated_at = now()");
    params.push(id);
    const result = await this.pool.query<LeadQueryRow>(
      `update leads set ${sets.join(", ")} where id = $${String(idx)} returning ${LEAD_COLS}`,
      params,
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Lead not found");
    return mapLeadRow(row);
  }

  /**
   * Lead を事務所/担当者に割り当てる。
   * @param id Lead ID
   * @param input 割当パラメータ
   * @returns 更新後の Lead
   */
  async assign(id: string, input: LeadAssignInput): Promise<Lead> {
    const result = await this.pool.query<LeadQueryRow>(
      `update leads set assigned_org_id = $1, owner_user_id = $2, org_id = $1, updated_at = now() where id = $3 returning ${LEAD_COLS}`,
      [input.assignedOrgId, input.assignedUserId, id],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Lead not found");
    return mapLeadRow(row);
  }

  /**
   * Lead を Customer/Case に転化する（トランザクション内）。
   *
   * ① 再度 dedup：customers/contact_persons の phone/email 一致をチェック
   * ② BMV intended_case_type 時に customer.base_profile.bmvProfile を初期化
   * ③ 関連 conversations の customer_id をバックフィル
   * ④ lead_logs(converted) + timeline_logs を双書き込み
   *
   * @param id Lead ID
   * @param input 転化パラメータ
   * @returns 転化後の Lead と新規 Case ID
   */
  async convert(
    id: string,
    input: LeadConvertInput,
  ): Promise<{ lead: Lead; caseId: string }> {
    const lead = await this.getRequiredLead(id);
    this.assertLeadConvertible(lead, input);
    await this.ensureConvertDedup(lead, input);
    const checklistItems = await resolveChecklistForConversion(
      this.pool,
      this.templatesResolver,
      input,
    );
    return this.runConvertTransaction(id, lead, input, checklistItems);
  }

  // ── Private helpers ──

  private async getRequiredLead(id: string): Promise<Lead> {
    const lead = await this.get(id);
    if (!lead) throw new BadRequestException("Lead not found");
    return lead;
  }

  private assertLeadConvertible(lead: Lead, input: LeadConvertInput): void {
    if (lead.status === "converted_case") {
      throw new BadRequestException("Lead already converted");
    }
    if (lead.assignedOrgId && input.orgId !== lead.assignedOrgId) {
      throw new BadRequestException(
        "orgId does not match lead's assigned organization",
      );
    }
  }

  private async ensureConvertDedup(
    lead: Lead,
    input: LeadConvertInput,
  ): Promise<void> {
    if (input.confirmDedup) return;
    const dedupHits = await this.checkConvertDedup(lead, input.orgId);
    if (!hasConvertDedupHits(dedupHits)) return;
    throw new ConflictException({
      statusCode: 409,
      message:
        "Duplicate customer or contact person found — confirm to proceed",
      dedupHits,
    });
  }

  private async runConvertTransaction(
    id: string,
    lead: Lead,
    input: LeadConvertInput,
    checklistItems: ChecklistItem[],
  ): Promise<{ lead: Lead; caseId: string }> {
    const client = await this.pool.connect();
    const isBmv = isBmvLead(lead);
    try {
      await client.query("BEGIN");
      const caseId = await this.createCaseInTx(client, input);
      await insertDocumentItemsInTx(
        client,
        input.orgId,
        caseId,
        checklistItems,
      );
      await writeCaseCreatedTimelineInTx(client, input, caseId);
      const updatedRow = await this.updateConvertedLeadInTx(
        client,
        id,
        input,
        caseId,
      );
      if (isBmv)
        await this.initializeBmvProfileInTx(client, input.customerId, id);
      await this.backfillConversationCustomerInTx(client, input.customerId, id);
      await this.writeConvertAuditInTx(client, id, input, caseId, isBmv);
      await client.query("COMMIT");
      return { lead: mapLeadRow(updatedRow), caseId };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  private async createCaseInTx(
    client: LeadTxClient,
    input: LeadConvertInput,
  ): Promise<string> {
    const result = await client.query<{ id: string }>(
      `insert into cases (org_id, customer_id, case_type_code, owner_user_id, status) values ($1, $2, $3, $4, 'open') returning id`,
      [input.orgId, input.customerId, input.caseTypeCode, input.ownerUserId],
    );
    const caseId = result.rows.at(0)?.id;
    if (!caseId) throw new BadRequestException("Failed to create case");
    return caseId;
  }

  private async updateConvertedLeadInTx(
    client: LeadTxClient,
    id: string,
    input: LeadConvertInput,
    caseId: string,
  ): Promise<LeadQueryRow> {
    const result = await client.query<LeadQueryRow>(
      `update leads set status = 'converted_case', converted_customer_id = $2, converted_case_id = $3, updated_at = now() where id = $1 returning ${LEAD_COLS}`,
      [id, input.customerId, caseId],
    );
    const updatedRow = result.rows.at(0);
    if (!updatedRow) throw new BadRequestException("Failed to update lead");
    return updatedRow;
  }

  private async initializeBmvProfileInTx(
    client: LeadTxClient,
    customerId: string,
    leadId: string,
  ): Promise<void> {
    const defaultProfile = createDefaultCustomerBmvProfile();
    const bmvProfile = { ...defaultProfile, sourceLeadId: leadId };
    await client.query(
      `update customers
       set base_profile = jsonb_set(
             coalesce(base_profile, '{}'::jsonb),
             '{bmvProfile}',
             $2::jsonb,
             true
           ),
           updated_at = now()
       where id = $1
         and (base_profile->'bmvProfile' is null
              or base_profile->'bmvProfile' = 'null'::jsonb
              or base_profile->'bmvProfile' = '{}'::jsonb)`,
      [customerId, JSON.stringify(bmvProfile)],
    );
  }

  private async backfillConversationCustomerInTx(
    client: LeadTxClient,
    customerId: string,
    leadId: string,
  ): Promise<void> {
    await client.query("SAVEPOINT conv_backfill");
    try {
      await client.query(
        "update conversations set customer_id = $1 where lead_id = $2 and customer_id is null",
        [customerId, leadId],
      );
      await client.query("RELEASE SAVEPOINT conv_backfill");
    } catch {
      await client.query("ROLLBACK TO SAVEPOINT conv_backfill");
    }
  }

  private async writeConvertAuditInTx(
    client: LeadTxClient,
    id: string,
    input: LeadConvertInput,
    caseId: string,
    isBmv: boolean,
  ): Promise<void> {
    const auditPayload = JSON.stringify({
      customerId: input.customerId,
      caseId,
      caseTypeCode: input.caseTypeCode,
      isBmv,
    });
    const actorUserId = input.actorUserId ?? input.ownerUserId;
    await client.query(
      `insert into lead_logs (lead_id, log_type, payload, created_by) values ($1, 'converted', $2::jsonb, $3)`,
      [id, auditPayload, actorUserId],
    );
    await client.query(
      `insert into timeline_logs (org_id, entity_type, entity_id, action, actor_user_id, payload) values ($1, 'lead', $2, 'lead.converted', $3, $4::jsonb)`,
      [input.orgId, id, actorUserId, auditPayload],
    );
  }

  private async checkConvertDedup(
    lead: Lead,
    orgId: string,
  ): Promise<ConvertDedupHit> {
    return queryConvertDedup(this.pool, lead, orgId);
  }
}
