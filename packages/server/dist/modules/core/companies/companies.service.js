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
import { requireTimestampString } from "../model/timestamps";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
const COMPANY_COLS = `id, org_id, company_no, company_name, corporate_number, established_date, capital_amount, address, business_scope, employee_count, fiscal_year_end, website, contact_phone, contact_email, owner_user_id, created_at, updated_at`;
const ACTIVE_COMPANY_PREDICATE = `deleted_at is null`;
/**
 * 将数据库查询结果行映射为 Company 实体。
 * @param row 数据库查询结果行
 * @returns 映射后的 Company 实体
 */
export function mapCompanyRow(row) {
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
    createdAt: requireTimestampString(row.created_at, "created_at"),
    updatedAt: requireTimestampString(row.updated_at, "updated_at"),
  };
}
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
];
function buildCreateParams(orgId, input) {
  const params = [orgId, input.companyName];
  for (const key of OPTIONAL_KEYS) {
    params.push(input[key] ?? null);
  }
  return params;
}
function mergeUpdate(current, input) {
  const result = {
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
let CompaniesService = class CompaniesService {
  pool;
  timelineService;
  /**
   * 构造函数。
   * @param pool PostgreSQL 连接池
   * @param timelineService Timeline 服务
   */
  constructor(pool, timelineService) {
    this.pool = pool;
    this.timelineService = timelineService;
  }
  /**
   * 创建企业客户。
   * @param ctx 请求上下文
   * @param input 创建参数
   * @returns 创建成功的 Company 实体
   */
  async create(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const params = buildCreateParams(ctx.orgId, input);
    const result = await tenantDb.query(
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
  async get(ctx, id) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
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
  async list(ctx, input = {}) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const where = [ACTIVE_COMPANY_PREDICATE];
    const params = [];
    if (input.keyword) {
      params.push(`%${input.keyword}%`);
      where.push(`company_name ilike $${String(params.length)}`);
    }
    const whereClause = where.length > 0 ? `where ${where.join(" and ")}` : "";
    const countResult = await tenantDb.query(
      `select count(*) as count from companies ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);
    const listParams = [...params, limit, offset];
    const result = await tenantDb.query(
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
  async update(ctx, id, input) {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Company not found");
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const next = mergeUpdate(current, input);
    const result = await tenantDb.query(
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
  async softDelete(ctx, id) {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Company not found");
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const casesCheck = await tenantDb.query(
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
};
CompaniesService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __param(1, Inject(TimelineService)),
    __metadata("design:paramtypes", [Pool, TimelineService]),
  ],
  CompaniesService,
);
export { CompaniesService };
//# sourceMappingURL=companies.service.js.map
