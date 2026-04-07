import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { Company } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";

/**
 * 数据库查询返回的企业客户行类型。
 */
export type CompanyQueryRow = {
  id: string;
  org_id: string;
  company_no: string | null;
  company_name: string;
  corporate_number: string | null;
  established_date: string | null;
  capital_amount: string | number | null;
  address: string | null;
  business_scope: string | null;
  employee_count: string | number | null;
  fiscal_year_end: string | null;
  website: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  owner_user_id: string | null;
  created_at: unknown;
  updated_at: unknown;
};

const COMPANY_COLS = `id, org_id, company_no, company_name, corporate_number, established_date, capital_amount, address, business_scope, employee_count, fiscal_year_end, website, contact_phone, contact_email, owner_user_id, created_at, updated_at`;
const ACTIVE_COMPANY_PREDICATE = `deleted_at is null`;

/**
 * 将数据库查询结果行映射为 Company 实体。
 * @param row 数据库查询结果行
 * @returns 映射后的 Company 实体
 */
export function mapCompanyRow(row: CompanyQueryRow): Company {
  return {
    id: row.id,
    orgId: row.org_id,
    companyNo: row.company_no,
    companyName: row.company_name,
    corporateNumber: row.corporate_number,
    establishedDate: row.established_date ?? null,
    capitalAmount:
      row.capital_amount !== null ? Number(row.capital_amount) : null,
    address: row.address,
    businessScope: row.business_scope,
    employeeCount:
      row.employee_count !== null ? Number(row.employee_count) : null,
    fiscalYearEnd: row.fiscal_year_end,
    website: row.website,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    ownerUserId: row.owner_user_id,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/**
 * 创建企业客户请求参数。
 */
export type CompanyCreateInput = {
  companyName: string;
  companyNo?: string | null;
  corporateNumber?: string | null;
  establishedDate?: string | null;
  capitalAmount?: number | null;
  address?: string | null;
  businessScope?: string | null;
  employeeCount?: number | null;
  fiscalYearEnd?: string | null;
  website?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  ownerUserId?: string | null;
};

/**
 * 更新企业客户请求参数。
 */
export type CompanyUpdateInput = Partial<CompanyCreateInput>;

/**
 * 查询企业客户列表请求参数。
 */
export type CompanyListInput = {
  page?: number;
  limit?: number;
  keyword?: string;
};

/** 可选字段 key 列表（不含 companyName）。 */
const OPTIONAL_KEYS = [
  "companyNo",
  "corporateNumber",
  "establishedDate",
  "capitalAmount",
  "address",
  "businessScope",
  "employeeCount",
  "fiscalYearEnd",
  "website",
  "contactPhone",
  "contactEmail",
  "ownerUserId",
] as const;

function buildCreateParams(
  orgId: string,
  input: CompanyCreateInput,
): unknown[] {
  const params: unknown[] = [orgId, input.companyName];
  for (const key of OPTIONAL_KEYS) {
    params.push(input[key] ?? null);
  }
  return params;
}

function mergeUpdate(
  current: Company,
  input: CompanyUpdateInput,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    companyName: input.companyName ?? current.companyName,
  };
  for (const key of OPTIONAL_KEYS) {
    result[key] = input[key] !== undefined ? input[key] : current[key];
  }
  return result;
}

/**
 * 企业客户服务，提供企业客户 CRUD 与软删除能力。
 */
@Injectable()
export class CompaniesService {
  /**
   * 构造函数。
   * @param pool PostgreSQL 连接池
   * @param timelineService Timeline 服务
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  /**
   * 创建企业客户。
   * @param ctx 请求上下文
   * @param input 创建参数
   * @returns 创建成功的 Company 实体
   */
  async create(
    ctx: RequestContext,
    input: CompanyCreateInput,
  ): Promise<Company> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const params = buildCreateParams(ctx.orgId, input);

    const result = await tenantDb.query<CompanyQueryRow>(
      `
        insert into companies (org_id, company_name, company_no, corporate_number, established_date, capital_amount, address, business_scope, employee_count, fiscal_year_end, website, contact_phone, contact_email, owner_user_id)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        returning ${COMPANY_COLS}
      `,
      params,
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create company");

    const company = mapCompanyRow(row);

    await this.timelineService.write(ctx, {
      entityType: "company",
      entityId: company.id,
      action: "company.created",
      payload: { companyName: company.companyName },
    });

    return company;
  }

  /**
   * 根据 ID 获取企业客户详情。
   * @param ctx 请求上下文
   * @param id 企业客户 ID
   * @returns 匹配的 Company 实体，若未找到则返回 null
   */
  async get(ctx: RequestContext, id: string): Promise<Company | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<CompanyQueryRow>(
      `select ${COMPANY_COLS} from companies where id = $1 and ${ACTIVE_COMPANY_PREDICATE} limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapCompanyRow(row) : null;
  }

  /**
   * 获取企业客户列表。
   * @param ctx 请求上下文
   * @param input 列表查询参数
   * @returns 匹配的 Company 实体数组和总数
   */
  async list(
    ctx: RequestContext,
    input: CompanyListInput = {},
  ): Promise<{ items: Company[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const where: string[] = [ACTIVE_COMPANY_PREDICATE];
    const params: unknown[] = [];

    if (input.keyword) {
      params.push(`%${input.keyword}%`);
      where.push(`company_name ilike $${String(params.length)}`);
    }

    const whereClause = where.length > 0 ? `where ${where.join(" and ")}` : "";

    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*) as count from companies ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    const listParams = [...params, limit, offset];
    const result = await tenantDb.query<CompanyQueryRow>(
      `select ${COMPANY_COLS} from companies ${whereClause} order by created_at desc, id desc limit $${String(listParams.length - 1)} offset $${String(listParams.length)}`,
      listParams,
    );

    return { items: result.rows.map(mapCompanyRow), total };
  }

  /**
   * 更新企业客户信息。
   * @param ctx 请求上下文
   * @param id 企业客户 ID
   * @param input 更新参数
   * @returns 更新后的 Company 实体
   */
  async update(
    ctx: RequestContext,
    id: string,
    input: CompanyUpdateInput,
  ): Promise<Company> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Company not found");

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const next = mergeUpdate(current, input);

    const result = await tenantDb.query<CompanyQueryRow>(
      `
        update companies
        set company_name = $2, company_no = $3, corporate_number = $4,
            established_date = $5, capital_amount = $6, address = $7,
            business_scope = $8, employee_count = $9, fiscal_year_end = $10,
            website = $11, contact_phone = $12, contact_email = $13,
            owner_user_id = $14, updated_at = now()
        where id = $1 and ${ACTIVE_COMPANY_PREDICATE}
        returning ${COMPANY_COLS}
      `,
      [id, next.companyName, ...OPTIONAL_KEYS.map((k) => next[k])],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to update company");

    const company = mapCompanyRow(row);

    await this.timelineService.write(ctx, {
      entityType: "company",
      entityId: company.id,
      action: "company.updated",
      payload: { before: current, after: company },
    });

    return company;
  }

  /**
   * 软删除企业客户（标记 deleted_at）。
   * @param ctx 请求上下文
   * @param id 企业客户 ID
   */
  async softDelete(ctx: RequestContext, id: string): Promise<void> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Company not found");

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const casesCheck = await tenantDb.query<{ exists: boolean }>(
      `select exists(select 1 from cases where company_id = $1) as "exists"`,
      [id],
    );
    if (casesCheck.rows[0]?.exists) {
      throw new BadRequestException(
        "Cannot delete company with existing cases",
      );
    }

    const result = await tenantDb.query(
      `update companies set deleted_at = now(), updated_at = now() where id = $1 and ${ACTIVE_COMPANY_PREDICATE}`,
      [id],
    );

    if (!result.rowCount || result.rowCount === 0)
      throw new BadRequestException("Failed to delete company");

    await this.timelineService.write(ctx, {
      entityType: "company",
      entityId: id,
      action: "company.deleted",
      payload: { companyName: current.companyName },
    });
  }
}
