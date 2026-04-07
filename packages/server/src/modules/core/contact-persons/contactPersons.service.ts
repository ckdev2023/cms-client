import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { ContactPerson } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";

/**
 * 数据库查询返回的联系人行类型。
 */
export type ContactPersonQueryRow = {
  id: string;
  org_id: string;
  company_id: string | null;
  customer_id: string | null;
  name: string;
  role_title: string | null;
  relation_type: string | null;
  phone: string | null;
  email: string | null;
  preferred_language: string;
  created_at: unknown;
  updated_at: unknown;
};

const CONTACT_PERSON_COLS = `id, org_id, company_id, customer_id, name, role_title, relation_type, phone, email, preferred_language, created_at, updated_at`;
const ACTIVE_CONTACT_PERSON_PREDICATE = `deleted_at is null`;

/**
 * 将数据库查询结果行映射为 ContactPerson 实体。
 * @param row 数据库查询结果行
 * @returns 映射后的 ContactPerson 实体
 */
export function mapContactPersonRow(row: ContactPersonQueryRow): ContactPerson {
  return {
    id: row.id,
    orgId: row.org_id,
    companyId: row.company_id,
    customerId: row.customer_id,
    name: row.name,
    roleTitle: row.role_title,
    relationType: row.relation_type,
    phone: row.phone,
    email: row.email,
    preferredLanguage: row.preferred_language,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/**
 * 创建联系人请求参数。
 */
export type ContactPersonCreateInput = {
  name: string;
  companyId?: string | null;
  customerId?: string | null;
  roleTitle?: string | null;
  relationType?: string | null;
  phone?: string | null;
  email?: string | null;
  preferredLanguage?: string;
};

/**
 * 更新联系人请求参数。
 */
export type ContactPersonUpdateInput = Partial<ContactPersonCreateInput>;

/**
 * 查询联系人列表请求参数。
 */
export type ContactPersonListInput = {
  page?: number;
  limit?: number;
  companyId?: string;
  customerId?: string;
};

/** 可选字段 key 列表（不含 name）。 */
const OPTIONAL_KEYS = [
  "companyId",
  "customerId",
  "roleTitle",
  "relationType",
  "phone",
  "email",
] as const;

function mergeUpdate(
  current: ContactPerson,
  input: ContactPersonUpdateInput,
): unknown[] {
  const nextName = input.name ?? current.name;
  const nextPreferredLanguage =
    input.preferredLanguage ?? current.preferredLanguage;
  const nextValues: Record<string, unknown> = {};
  for (const key of OPTIONAL_KEYS) {
    nextValues[key] = input[key] !== undefined ? input[key] : current[key];
  }
  return [
    nextName,
    nextValues.companyId ?? null,
    nextValues.customerId ?? null,
    nextValues.roleTitle ?? null,
    nextValues.relationType ?? null,
    nextValues.phone ?? null,
    nextValues.email ?? null,
    nextPreferredLanguage,
  ];
}

/**
 * 联系人服务，提供联系人 CRUD 与软删除能力。
 */
@Injectable()
export class ContactPersonsService {
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
   * 创建联系人。
   * @param ctx 请求上下文
   * @param input 创建参数
   * @returns 创建成功的 ContactPerson 实体
   */
  async create(
    ctx: RequestContext,
    input: ContactPersonCreateInput,
  ): Promise<ContactPerson> {
    if (!input.companyId && !input.customerId) {
      throw new BadRequestException("companyId or customerId is required");
    }

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const preferredLanguage = input.preferredLanguage ?? "ja";

    const result = await tenantDb.query<ContactPersonQueryRow>(
      `
        insert into contact_persons (org_id, name, company_id, customer_id, role_title, relation_type, phone, email, preferred_language)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        returning ${CONTACT_PERSON_COLS}
      `,
      [
        ctx.orgId,
        input.name,
        input.companyId ?? null,
        input.customerId ?? null,
        input.roleTitle ?? null,
        input.relationType ?? null,
        input.phone ?? null,
        input.email ?? null,
        preferredLanguage,
      ],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create contact person");

    const contactPerson = mapContactPersonRow(row);

    await this.timelineService.write(ctx, {
      entityType: "contact_person",
      entityId: contactPerson.id,
      action: "contact_person.created",
      payload: { name: contactPerson.name },
    });

    return contactPerson;
  }

  /**
   * 根据 ID 获取联系人详情。
   * @param ctx 请求上下文
   * @param id 联系人 ID
   * @returns 匹配的 ContactPerson 实体，若未找到则返回 null
   */
  async get(ctx: RequestContext, id: string): Promise<ContactPerson | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<ContactPersonQueryRow>(
      `select ${CONTACT_PERSON_COLS} from contact_persons where id = $1 and ${ACTIVE_CONTACT_PERSON_PREDICATE} limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapContactPersonRow(row) : null;
  }

  /**
   * 获取联系人列表。
   * @param ctx 请求上下文
   * @param input 列表查询参数
   * @returns 匹配的 ContactPerson 实体数组和总数
   */
  async list(
    ctx: RequestContext,
    input: ContactPersonListInput = {},
  ): Promise<{ items: ContactPerson[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const where: string[] = [ACTIVE_CONTACT_PERSON_PREDICATE];
    const params: unknown[] = [];

    if (input.companyId) {
      params.push(input.companyId);
      where.push(`company_id = $${String(params.length)}`);
    }
    if (input.customerId) {
      params.push(input.customerId);
      where.push(`customer_id = $${String(params.length)}`);
    }

    const whereClause = where.length > 0 ? `where ${where.join(" and ")}` : "";

    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*) as count from contact_persons ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    const listParams = [...params, limit, offset];
    const result = await tenantDb.query<ContactPersonQueryRow>(
      `select ${CONTACT_PERSON_COLS} from contact_persons ${whereClause} order by created_at desc, id desc limit $${String(listParams.length - 1)} offset $${String(listParams.length)}`,
      listParams,
    );

    return { items: result.rows.map(mapContactPersonRow), total };
  }

  /**
   * 更新联系人信息。
   * @param ctx 请求上下文
   * @param id 联系人 ID
   * @param input 更新参数
   * @returns 更新后的 ContactPerson 实体
   */
  async update(
    ctx: RequestContext,
    id: string,
    input: ContactPersonUpdateInput,
  ): Promise<ContactPerson> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Contact person not found");

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const merged = mergeUpdate(current, input);

    const result = await tenantDb.query<ContactPersonQueryRow>(
      `
        update contact_persons
        set name = $2, company_id = $3, customer_id = $4,
            role_title = $5, relation_type = $6, phone = $7,
            email = $8, preferred_language = $9, updated_at = now()
        where id = $1 and ${ACTIVE_CONTACT_PERSON_PREDICATE}
        returning ${CONTACT_PERSON_COLS}
      `,
      [id, ...merged],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to update contact person");

    const contactPerson = mapContactPersonRow(row);

    await this.timelineService.write(ctx, {
      entityType: "contact_person",
      entityId: contactPerson.id,
      action: "contact_person.updated",
      payload: { before: current, after: contactPerson },
    });

    return contactPerson;
  }

  /**
   * 软删除联系人（标记 deleted_at）。
   * @param ctx 请求上下文
   * @param id 联系人 ID
   */
  async softDelete(ctx: RequestContext, id: string): Promise<void> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Contact person not found");

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const partiesCheck = await tenantDb.query<{ exists: boolean }>(
      `select exists(select 1 from case_parties where contact_person_id = $1) as "exists"`,
      [id],
    );
    if (partiesCheck.rows[0]?.exists) {
      throw new BadRequestException(
        "Cannot delete contact person with existing case parties",
      );
    }

    const result = await tenantDb.query(
      `update contact_persons set deleted_at = now(), updated_at = now() where id = $1 and ${ACTIVE_CONTACT_PERSON_PREDICATE}`,
      [id],
    );

    if (!result.rowCount || result.rowCount === 0)
      throw new BadRequestException("Failed to delete contact person");

    await this.timelineService.write(ctx, {
      entityType: "contact_person",
      entityId: id,
      action: "contact_person.deleted",
      payload: { name: current.name },
    });
  }
}
