import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import type { Lead, LeadQueryRow } from "../model/portalEntities";
import { mapLeadRow } from "../model/portalEntities";

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
};

/** Lead 列表查询入参。 */
export type LeadListInput = {
  appUserId?: string;
  status?: string;
  assignedOrgId?: string;
  page?: number;
  limit?: number;
};

const LEAD_COLS = `id, org_id, app_user_id, source, language, status, assigned_org_id, assigned_user_id, created_at, updated_at`;

/**
 * Lead CRUD + 状态变更 + 分配服务。
 */
@Injectable()
export class LeadsService {
  /**
   * 创建服务实例。
   * @param pool PostgreSQL 连接池
   */
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  /**
   * 创建 lead（初始 org_id 为空）。
   * @param input 创建参数
   * @returns 创建的 Lead
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
   * 查看 lead 详情。
   * @param id Lead ID
   * @returns Lead 或 null
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
   * 列表查询。
   * @param input 查询参数
   * @returns 分页结果
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
   * 更新 lead。
   * @param id Lead ID
   * @param input 更新参数
   * @returns 更新后的 Lead
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
   * 分配 lead 给事务所/人员。
   * @param id Lead ID
   * @param input 分配参数
   * @returns 更新后的 Lead
   */
  async assign(id: string, input: LeadAssignInput): Promise<Lead> {
    const result = await this.pool.query<LeadQueryRow>(
      `update leads set assigned_org_id = $1, assigned_user_id = $2, org_id = $1, updated_at = now() where id = $3 returning ${LEAD_COLS}`,
      [input.assignedOrgId, input.assignedUserId, id],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Lead not found");
    return mapLeadRow(row);
  }

  /**
   * 转化为 Case（事务内：创建 Case + 更新 lead.status = converted）。
   *
   * 安全：orgId 必须与 lead.assignedOrgId 一致（防止跨租户写入）。
   *
   * @param id Lead ID
   * @param input 转化参数
   * @returns 转化后的 Lead 和新 Case ID
   */
  async convert(
    id: string,
    input: LeadConvertInput,
  ): Promise<{ lead: Lead; caseId: string }> {
    const lead = await this.get(id);
    if (!lead) throw new BadRequestException("Lead not found");
    if (lead.status === "converted")
      throw new BadRequestException("Lead already converted");

    // P10: orgId 必须与 lead 已分配的 orgId 一致
    if (lead.assignedOrgId && input.orgId !== lead.assignedOrgId) {
      throw new BadRequestException(
        "orgId does not match lead's assigned organization",
      );
    }

    // P10: 使用事务保证原子性
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const caseResult = await client.query<{ id: string }>(
        `insert into cases (org_id, customer_id, case_type_code, owner_user_id, status) values ($1, $2, $3, $4, 'open') returning id`,
        [input.orgId, input.customerId, input.caseTypeCode, input.ownerUserId],
      );
      const caseId = caseResult.rows.at(0)?.id;
      if (!caseId) throw new BadRequestException("Failed to create case");

      const updatedResult = await client.query<LeadQueryRow>(
        `update leads set status = 'converted', updated_at = now() where id = $1 returning ${LEAD_COLS}`,
        [id],
      );
      const updatedRow = updatedResult.rows.at(0);
      if (!updatedRow) throw new BadRequestException("Failed to update lead");

      await client.query("COMMIT");
      return { lead: mapLeadRow(updatedRow), caseId };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
