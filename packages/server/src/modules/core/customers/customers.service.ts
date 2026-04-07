import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { Customer } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import { normalizeObject } from "../../../infra/utils/normalize";

/**
 * 数据库查询返回的客户行类型。
 */
export type CustomerQueryRow = {
  id: string;
  org_id: string;
  type: string;
  base_profile: unknown;
  contacts: unknown;
  created_at: unknown;
  updated_at: unknown;
};

/**
 * 将数据库查询结果行映射为 Customer 实体。
 * @param row 数据库查询结果行
 * @returns 映射后的 Customer 实体
 */
export function mapCustomerRow(row: CustomerQueryRow): Customer {
  return {
    id: row.id,
    orgId: row.org_id,
    type: row.type,
    baseProfile: normalizeObject(row.base_profile),
    contacts: Array.isArray(row.contacts)
      ? row.contacts.map(normalizeObject)
      : [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/**
 * 创建客户请求参数。
 */
export type CustomerCreateInput = {
  type: string;
  baseProfile?: Record<string, unknown>;
  contacts?: Record<string, unknown>[];
};

/**
 * 更新客户请求参数。
 */
export type CustomerUpdateInput = {
  type?: string;
  baseProfile?: Record<string, unknown>;
  contacts?: Record<string, unknown>[];
};

/**
 * 查询客户列表请求参数。
 */
export type CustomerListInput = {
  page?: number;
  limit?: number;
};

type BaseProfileSchemaField = {
  type: "string" | "date";
};

const INDIVIDUAL_BASE_PROFILE_SCHEMA: Record<string, BaseProfileSchemaField> = {
  name_cn: { type: "string" },
  name_en: { type: "string" },
  name_jp: { type: "string" },
  gender: { type: "string" },
  nationality: { type: "string" },
  birthday: { type: "date" },
  birthplace: { type: "string" },
  passport_no: { type: "string" },
  passport_expiry_date: { type: "date" },
  residence_card_no: { type: "string" },
  residence_expiry_date: { type: "date" },
};

const INDIVIDUAL_REQUIRED_NAME_FIELDS = ["name_cn", "name_en", "name_jp"];

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateBaseProfile(
  type: string,
  baseProfile: unknown,
): Record<string, unknown> {
  if (!isPlainRecord(baseProfile)) {
    throw new BadRequestException("baseProfile must be an object");
  }
  if (type !== "individual") return baseProfile;

  const errors: string[] = [];
  const hasName = INDIVIDUAL_REQUIRED_NAME_FIELDS.some((field) =>
    isNonEmptyString(baseProfile[field]),
  );
  if (!hasName) {
    errors.push("at least one of name_cn, name_en or name_jp is required");
  }

  for (const [field, schema] of Object.entries(
    INDIVIDUAL_BASE_PROFILE_SCHEMA,
  )) {
    const value = baseProfile[field];
    if (value === undefined || value === null) continue;
    if (schema.type === "string") {
      if (typeof value !== "string") errors.push(`${field} must be a string`);
      continue;
    }
    if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
      errors.push(`${field} must be a valid date string`);
    }
  }

  if (errors.length > 0) {
    throw new BadRequestException(`Invalid baseProfile: ${errors.join("; ")}`);
  }
  return baseProfile;
}

/**
 * 客户服务，提供客户信息的 CRUD 与软删除能力，以及 Timeline 日志记录。
 */
@Injectable()
export class CustomersService {
  /**
   * 构造函数。
   * @param pool PostgreSQL 连接池
   * @param timelineService Timeline 服务用于写入操作日志
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  /**
   * 创建新的客户。
   * @param ctx 请求上下文
   * @param input 创建参数
   * @returns 创建成功的 Customer 实体
   */
  async create(
    ctx: RequestContext,
    input: CustomerCreateInput,
  ): Promise<Customer> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const baseProfile = validateBaseProfile(
      input.type,
      input.baseProfile ?? {},
    );
    const contacts = input.contacts ?? [];

    const result = await tenantDb.query<CustomerQueryRow>(
      `
        insert into customers (org_id, type, base_profile, contacts)
        values ($1, $2, $3::jsonb, $4::jsonb)
        returning id, org_id, type, base_profile, contacts, created_at, updated_at
      `,
      [
        ctx.orgId,
        input.type,
        JSON.stringify(baseProfile),
        JSON.stringify(contacts),
      ],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create customer");

    const customer = mapCustomerRow(row);

    await this.timelineService.write(ctx, {
      entityType: "customer",
      entityId: customer.id,
      action: "customer.created",
      payload: { type: customer.type },
    });

    return customer;
  }

  /**
   * 根据 ID 获取客户详情（过滤已删除）。
   * @param ctx 请求上下文
   * @param id 客户 ID
   * @returns 匹配的 Customer 实体，若未找到或已删除则返回 null
   */
  async get(ctx: RequestContext, id: string): Promise<Customer | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<CustomerQueryRow>(
      `
        select id, org_id, type, base_profile, contacts, created_at, updated_at
        from customers
        where id = $1 and coalesce(base_profile->>'status', '') is distinct from 'deleted'
        limit 1
      `,
      [id],
    );

    const row = result.rows.at(0);
    return row ? mapCustomerRow(row) : null;
  }

  /**
   * 获取客户列表（过滤已删除）。
   * @param ctx 请求上下文
   * @param input 列表查询参数
   * @returns 匹配的 Customer 实体数组和总数
   */
  async list(
    ctx: RequestContext,
    input: CustomerListInput = {},
  ): Promise<{ items: Customer[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const countResult = await tenantDb.query<{ count: string }>(
      `
        select count(*) as count
        from customers
        where coalesce(base_profile->>'status', '') is distinct from 'deleted'
      `,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    const result = await tenantDb.query<CustomerQueryRow>(
      `
        select id, org_id, type, base_profile, contacts, created_at, updated_at
        from customers
        where coalesce(base_profile->>'status', '') is distinct from 'deleted'
        order by created_at desc, id desc
        limit $1 offset $2
      `,
      [limit, offset],
    );

    return { items: result.rows.map(mapCustomerRow), total };
  }

  /**
   * 更新客户信息。
   * @param ctx 请求上下文
   * @param id 客户 ID
   * @param input 更新参数
   * @returns 更新后的 Customer 实体
   */
  async update(
    ctx: RequestContext,
    id: string,
    input: CustomerUpdateInput,
  ): Promise<Customer> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Customer not found or deleted");

    const nextType = input.type ?? current.type;
    const nextBaseProfile = validateBaseProfile(nextType, {
      ...current.baseProfile,
      ...(input.baseProfile ?? {}),
    });
    const nextContacts = input.contacts ?? current.contacts;

    const result = await tenantDb.query<CustomerQueryRow>(
      `
        update customers
        set type = $2,
            base_profile = $3::jsonb,
            contacts = $4::jsonb,
            updated_at = now()
        where id = $1 and coalesce(base_profile->>'status', '') is distinct from 'deleted'
        returning id, org_id, type, base_profile, contacts, created_at, updated_at
      `,
      [
        id,
        nextType,
        JSON.stringify(nextBaseProfile),
        JSON.stringify(nextContacts),
      ],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to update customer");

    const customer = mapCustomerRow(row);

    await this.timelineService.write(ctx, {
      entityType: "customer",
      entityId: customer.id,
      action: "customer.updated",
      payload: { before: current, after: customer },
    });

    return customer;
  }

  /**
   * 软删除客户（在 base_profile 注入 status: 'deleted'）。
   * @param ctx 请求上下文
   * @param id 客户 ID
   * @returns 无返回值
   */
  async softDelete(ctx: RequestContext, id: string): Promise<void> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const current = await this.get(ctx, id);
    if (!current)
      throw new NotFoundException("Customer not found or already deleted");

    const casesCheck = await tenantDb.query<{ exists: boolean }>(
      `select exists(select 1 from cases where customer_id = $1) as "exists"`,
      [id],
    );
    if (casesCheck.rows[0]?.exists) {
      throw new BadRequestException(
        "Cannot delete customer with existing cases",
      );
    }

    const nextBaseProfile = { ...current.baseProfile, status: "deleted" };

    const result = await tenantDb.query<CustomerQueryRow>(
      `
        update customers
        set base_profile = $2::jsonb,
            updated_at = now()
        where id = $1
        returning id, org_id, type, base_profile, contacts, created_at, updated_at
      `,
      [id, JSON.stringify(nextBaseProfile)],
    );

    if (!result.rowCount || result.rowCount === 0)
      throw new BadRequestException("Failed to soft delete customer");

    await this.timelineService.write(ctx, {
      entityType: "customer",
      entityId: id,
      action: "customer.deleted",
      payload: { status: "deleted" },
    });
  }
}
