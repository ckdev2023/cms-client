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
/* eslint-disable jsdoc/require-param, jsdoc/require-returns */
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import { VALID_PARTY_TYPES } from "./caseParties.types";
function toTimestampStringOrNull(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}
function toTimestampString(value) {
  const s = toTimestampStringOrNull(value);
  if (!s) return "";
  return s;
}
/** 映射数据库行到 CaseParty 实体。 */
export function mapCasePartyRow(row) {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    partyType: row.party_type,
    customerId: row.customer_id,
    contactPersonId: row.contact_person_id,
    relationToCase: row.relation_to_case,
    isPrimary: row.is_primary,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}
const PARTY_COLS = `id, org_id, case_id, party_type, customer_id, contact_person_id, relation_to_case, is_primary, created_at, updated_at`;
/**
 * 案件关联人服务，提供 CRUD 能力。
 */
let CasePartiesService = class CasePartiesService {
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
  async writeCaseTimeline(ctx, caseId, action, payload) {
    await this.timelineService.write(ctx, {
      entityType: "case",
      entityId: caseId,
      action,
      payload,
    });
  }
  validateCreateInput(input) {
    validatePartyType(input.partyType);
    if (!input.customerId && !input.contactPersonId) {
      throw new BadRequestException(
        "customerId or contactPersonId is required",
      );
    }
  }
  async assertCaseExists(tenantDb, caseId) {
    const caseCheck = await tenantDb.query(
      `select id from cases where id = $1 limit 1`,
      [caseId],
    );
    if (caseCheck.rows.length === 0) {
      throw new BadRequestException(
        "Referenced cases record not found in current organization",
      );
    }
  }
  async insertCaseParty(ctx, input, isPrimary) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    await this.assertCaseExists(tenantDb, input.caseId);
    if (isPrimary) {
      await assertNoPrimaryConflict(tenantDb, input.caseId, input.partyType);
    }
    const result = await tenantDb.query(
      `insert into case_parties (org_id, case_id, party_type, customer_id, contact_person_id, relation_to_case, is_primary)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning ${PARTY_COLS}`,
      [
        ctx.orgId,
        input.caseId,
        input.partyType,
        input.customerId ?? null,
        input.contactPersonId ?? null,
        input.relationToCase ?? null,
        isPrimary,
      ],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create case party");
    return mapCasePartyRow(row);
  }
  async writeCreateTimelines(ctx, party) {
    await this.timelineService.write(ctx, {
      entityType: "case_party",
      entityId: party.id,
      action: "case_party.created",
      payload: { caseId: party.caseId, partyType: party.partyType },
    });
    await this.writeCaseTimeline(ctx, party.caseId, "case_party.created", {
      casePartyId: party.id,
      partyType: party.partyType,
    });
  }
  /**
   * 添加关联人到案件。
   * @param ctx 请求上下文
   * @param input 创建参数
   * @returns 创建成功的 CaseParty 实体
   */
  async create(ctx, input) {
    this.validateCreateInput(input);
    const isPrimary = input.isPrimary ?? false;
    const party = await this.insertCaseParty(ctx, input, isPrimary);
    await this.writeCreateTimelines(ctx, party);
    return party;
  }
  /**
   * 根据 ID 获取案件关联人。
   * @param ctx 请求上下文
   * @param id 关联人 ID
   * @returns CaseParty 或 null
   */
  async get(ctx, id) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `select ${PARTY_COLS} from case_parties where id = $1 limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapCasePartyRow(row) : null;
  }
  /**
   * 按 caseId 列表查询案件关联人。
   * @param ctx 请求上下文
   * @param input 查询参数
   * @returns 关联人列表和总数
   */
  async list(ctx, input = {}) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];
    if (input.caseId) {
      params.push(input.caseId);
      where.push(`case_id = $${String(params.length)}`);
    }
    const whereClause = where.length > 0 ? `where ${where.join(" and ")}` : "";
    const countResult = await tenantDb.query(
      `select count(*) as count from case_parties ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);
    const listParams = [...params, limit, offset];
    const result = await tenantDb.query(
      `select ${PARTY_COLS} from case_parties ${whereClause} order by created_at desc, id desc limit $${String(listParams.length - 1)} offset $${String(listParams.length)}`,
      listParams,
    );
    return { items: result.rows.map(mapCasePartyRow), total };
  }
  /**
   * 更新案件关联人。
   * @param ctx 请求上下文
   * @param id 关联人 ID
   * @param input 更新参数
   * @returns 更新后的 CaseParty 实体
   */
  async update(ctx, id, input) {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Case party not found");
    if (input.partyType !== undefined) validatePartyType(input.partyType);
    const f = resolveUpdateFields(input, current);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    if (
      f.isPrimary &&
      (!current.isPrimary || f.partyType !== current.partyType)
    ) {
      await assertNoPrimaryConflict(tenantDb, current.caseId, f.partyType, id);
    }
    const updated = await executeUpdateParty(tenantDb, id, f);
    await this.timelineService.write(ctx, {
      entityType: "case_party",
      entityId: updated.id,
      action: "case_party.updated",
      payload: { before: current, after: updated },
    });
    await this.writeCaseTimeline(ctx, updated.caseId, "case_party.updated", {
      casePartyId: updated.id,
      before: current,
      after: updated,
    });
    return updated;
  }
  /**
   * 硬删除案件关联人（中间表性质）。
   * @param ctx 请求上下文
   * @param id 关联人 ID
   */
  async hardDelete(ctx, id) {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Case party not found");
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `delete from case_parties where id = $1`,
      [id],
    );
    if (!result.rowCount || result.rowCount === 0) {
      throw new BadRequestException("Failed to delete case party");
    }
    await this.timelineService.write(ctx, {
      entityType: "case_party",
      entityId: id,
      action: "case_party.deleted",
      payload: { caseId: current.caseId, partyType: current.partyType },
    });
    await this.writeCaseTimeline(ctx, current.caseId, "case_party.deleted", {
      casePartyId: id,
      partyType: current.partyType,
    });
  }
};
CasePartiesService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __param(1, Inject(TimelineService)),
    __metadata("design:paramtypes", [Pool, TimelineService]),
  ],
  CasePartiesService,
);
export { CasePartiesService };
/** 校验 partyType 是否合法。 */
function validatePartyType(partyType) {
  if (!VALID_PARTY_TYPES.has(partyType)) {
    throw new BadRequestException(
      `Invalid partyType: ${partyType}. Must be one of: ${[...VALID_PARTY_TYPES].join(", ")}`,
    );
  }
}
/** 将 CasePartyUpdateInput 与 current 合并。 */
function resolveUpdateFields(input, current) {
  return {
    partyType: input.partyType ?? current.partyType,
    isPrimary: input.isPrimary ?? current.isPrimary,
    customerId:
      input.customerId !== undefined ? input.customerId : current.customerId,
    contactPersonId:
      input.contactPersonId !== undefined
        ? input.contactPersonId
        : current.contactPersonId,
    relationToCase:
      input.relationToCase !== undefined
        ? input.relationToCase
        : current.relationToCase,
  };
}
/** 执行 case_party UPDATE SQL 并返回映射后实体。 */
async function executeUpdateParty(tenantDb, id, f) {
  const result = await tenantDb.query(
    `update case_parties
     set party_type = $2, customer_id = $3, contact_person_id = $4,
         relation_to_case = $5, is_primary = $6, updated_at = now()
     where id = $1 returning ${PARTY_COLS}`,
    [
      id,
      f.partyType,
      f.customerId,
      f.contactPersonId,
      f.relationToCase,
      f.isPrimary,
    ],
  );
  const row = result.rows.at(0);
  if (!row) throw new BadRequestException("Failed to update case party");
  return mapCasePartyRow(row);
}
/** 断言同一 case + partyType 下无 is_primary 冲突。 */
async function assertNoPrimaryConflict(db, caseId, partyType, excludeId) {
  const sql = excludeId
    ? `select id from case_parties where case_id = $1 and party_type = $2 and is_primary = true and id != $3 limit 1`
    : `select id from case_parties where case_id = $1 and party_type = $2 and is_primary = true limit 1`;
  const params = excludeId
    ? [caseId, partyType, excludeId]
    : [caseId, partyType];
  const result = await db.query(sql, params);
  if (result.rows.length > 0) {
    throw new BadRequestException(
      `A primary ${partyType} already exists for this case`,
    );
  }
}
//# sourceMappingURL=caseParties.service.js.map
