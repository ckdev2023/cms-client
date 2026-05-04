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
const CONTACT_PERSON_COLS = `id, org_id, company_id, customer_id, name, role_title, relation_type, phone, email, preferred_language, created_at, updated_at`;
const ACTIVE_CONTACT_PERSON_PREDICATE = `deleted_at is null`;
/**
 * 将数据库查询结果行映射为 ContactPerson 实体。
 * @param row 数据库查询结果行
 * @returns 映射后的 ContactPerson 实体
 */
export function mapContactPersonRow(row) {
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
    createdAt: requireTimestampString(row.created_at, "created_at"),
    updatedAt: requireTimestampString(row.updated_at, "updated_at"),
  };
}
/** 可选字段 key 列表（不含 name）。 */
const OPTIONAL_KEYS = [
  "companyId",
  "customerId",
  "roleTitle",
  "relationType",
  "phone",
  "email",
];
function mergeUpdate(current, input) {
  const nextName = input.name ?? current.name;
  const nextPreferredLanguage =
    input.preferredLanguage ?? current.preferredLanguage;
  const nextValues = {};
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
let ContactPersonsService = class ContactPersonsService {
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
   * 创建联系人。
   * @param ctx 请求上下文
   * @param input 创建参数
   * @returns 创建成功的 ContactPerson 实体
   */
  async create(ctx, input) {
    if (!input.companyId && !input.customerId) {
      throw new BadRequestException("companyId or customerId is required");
    }
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const preferredLanguage = input.preferredLanguage ?? "ja";
    const result = await tenantDb.query(
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
  async get(ctx, id) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
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
  async list(ctx, input = {}) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const where = [ACTIVE_CONTACT_PERSON_PREDICATE];
    const params = [];
    if (input.companyId) {
      params.push(input.companyId);
      where.push(`company_id = $${String(params.length)}`);
    }
    if (input.customerId) {
      params.push(input.customerId);
      where.push(`customer_id = $${String(params.length)}`);
    }
    const whereClause = where.length > 0 ? `where ${where.join(" and ")}` : "";
    const countResult = await tenantDb.query(
      `select count(*) as count from contact_persons ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);
    const listParams = [...params, limit, offset];
    const result = await tenantDb.query(
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
  async update(ctx, id, input) {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Contact person not found");
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const merged = mergeUpdate(current, input);
    const result = await tenantDb.query(
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
  async softDelete(ctx, id) {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Contact person not found");
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const partiesCheck = await tenantDb.query(
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
};
ContactPersonsService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __param(1, Inject(TimelineService)),
    __metadata("design:paramtypes", [Pool, TimelineService]),
  ],
  ContactPersonsService,
);
export { ContactPersonsService };
//# sourceMappingURL=contactPersons.service.js.map
