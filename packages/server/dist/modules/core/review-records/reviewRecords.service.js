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
import { CasesService } from "../cases/cases.service";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
const REVIEW_RECORD_COLS =
  "id, org_id, case_id, validation_run_id, decision, comment, reviewer_user_id, reviewed_at, created_at, updated_at";
/**
 *
 */
let ReviewRecordsService = class ReviewRecordsService {
  pool;
  casesService;
  timelineService;
  /**
   * 创建人工复核记录服务。
   * @param pool 数据库连接池。
   * @param casesService 案件服务。
   * @param timelineService 时间线服务。
   */
  constructor(pool, casesService, timelineService) {
    this.pool = pool;
    this.casesService = casesService;
    this.timelineService = timelineService;
  }
  /**
   * 新增一条复核记录。
   * @param ctx 当前请求上下文。
   * @param input 创建参数。
   * @returns 新建的复核记录。
   */
  async create(ctx, input) {
    const currentCase = await this.casesService.get(ctx, input.caseId);
    if (!currentCase) throw new NotFoundException("Case not found");
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const validationRun = await this.getValidationRunContext(
      tenantDb,
      ctx.orgId,
      input.caseId,
      input.validationRunId,
    );
    await this.assertLatestValidationRun(
      tenantDb,
      ctx.orgId,
      input.caseId,
      validationRun.id,
    );
    if (
      input.decision === "approved" &&
      validationRun.result_status !== "passed"
    ) {
      throw new BadRequestException(
        "Approved review record requires a passed validation run",
      );
    }
    return this.insertReviewRecord(ctx, input);
  }
  /**
   * 按主键获取复核记录。
   * @param ctx 当前请求上下文。
   * @param id 复核记录 ID。
   * @returns 查到的复核记录；不存在时返回 `null`。
   */
  async get(ctx, id) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `
        select ${REVIEW_RECORD_COLS}
        from review_records
        where id = $1 and org_id = $2
        limit 1
      `,
      [id, ctx.orgId],
    );
    const row = result.rows.at(0);
    return row ? mapReviewRecordRow(row) : null;
  }
  /**
   * 分页列出复核记录。
   * @param ctx 当前请求上下文。
   * @param input 查询条件。
   * @returns 列表数据与总数。
   */
  async list(ctx, input = {}) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const where = ["org_id = $1"];
    const params = [ctx.orgId];
    if (input.caseId) {
      params.push(input.caseId);
      where.push(`case_id = $${String(params.length)}`);
    }
    if (input.validationRunId) {
      params.push(input.validationRunId);
      where.push(`validation_run_id = $${String(params.length)}`);
    }
    const countResult = await tenantDb.query(
      `select count(*)::text as count from review_records where ${where.join(" and ")}`,
      params,
    );
    const listParams = [...params, limit, offset];
    const listResult = await tenantDb.query(
      `
        select ${REVIEW_RECORD_COLS}
        from review_records
        where ${where.join(" and ")}
        order by reviewed_at desc nulls last, created_at desc, id desc
        limit $${String(listParams.length - 1)}
        offset $${String(listParams.length)}
      `,
      listParams,
    );
    return {
      items: listResult.rows.map(mapReviewRecordRow),
      total: Number(countResult.rows.at(0)?.count ?? "0"),
    };
  }
  async insertReviewRecord(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `
        insert into review_records (
          org_id, case_id, validation_run_id, decision, comment, reviewer_user_id
        )
        values ($1, $2, $3, $4, $5, $6)
        returning ${REVIEW_RECORD_COLS}
      `,
      [
        ctx.orgId,
        input.caseId,
        input.validationRunId,
        input.decision,
        input.comment ?? null,
        ctx.userId,
      ],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create review record");
    const created = mapReviewRecordRow(row);
    await this.writeReviewTimeline(ctx, created);
    return created;
  }
  /**
   * 记录复核事件到时间线。
   * @param ctx 当前请求上下文。
   * @param created 新建的复核记录。
   * @returns 无返回值。
   */
  async writeReviewTimeline(ctx, created) {
    await this.timelineService.write(ctx, {
      entityType: "case",
      entityId: created.caseId,
      action: "review_record.recorded",
      payload: {
        reviewRecordId: created.id,
        validationRunId: created.validationRunId,
        decision: created.decision,
      },
    });
  }
  async getValidationRunContext(tenantDb, orgId, caseId, validationRunId) {
    const result = await tenantDb.query(
      `
        select id, case_id, result_status
        from validation_runs
        where id = $1 and org_id = $2
        limit 1
      `,
      [validationRunId, orgId],
    );
    const row = result.rows.at(0);
    if (row?.case_id !== caseId) {
      throw new BadRequestException(
        "validationRunId does not belong to current case",
      );
    }
    return row;
  }
  async assertLatestValidationRun(tenantDb, orgId, caseId, validationRunId) {
    const result = await tenantDb.query(
      `
        select id
        from validation_runs
        where org_id = $1 and case_id = $2
        order by executed_at desc nulls last, created_at desc, id desc
        limit 1
      `,
      [orgId, caseId],
    );
    const latest = result.rows.at(0);
    if (!latest) {
      throw new BadRequestException(
        "Review record requires an existing validation run",
      );
    }
    if (latest.id !== validationRunId) {
      throw new BadRequestException(
        "Review record must reference the latest validation run",
      );
    }
  }
};
ReviewRecordsService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __param(1, Inject(CasesService)),
    __param(2, Inject(TimelineService)),
    __metadata("design:paramtypes", [Pool, CasesService, TimelineService]),
  ],
  ReviewRecordsService,
);
export { ReviewRecordsService };
/**
 *
 * @param row
 */
/**
 * 将数据库行映射为复核记录实体。
 * @param row 数据库查询结果行。
 * @returns 领域层使用的复核记录对象。
 */
export function mapReviewRecordRow(row) {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    validationRunId: row.validation_run_id,
    decision: row.decision,
    comment: row.comment,
    reviewerUserId: row.reviewer_user_id,
    reviewedAt: requireTimestampString(row.reviewed_at, "reviewed_at"),
    createdAt: requireTimestampString(row.created_at, "created_at"),
    updatedAt: requireTimestampString(row.updated_at, "updated_at"),
  };
}
function requireTimestampString(value, field) {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  throw new Error(`Invalid timestamp: ${field}`);
}
//# sourceMappingURL=reviewRecords.service.js.map
