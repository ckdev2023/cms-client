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
const VALIDATION_RUN_COLS =
  "id, org_id, case_id, ruleset_ref, result_status, blocking_count, warning_count, report_payload, executed_by, executed_at, created_at, updated_at";
/**
 *
 */
let ValidationRunsService = class ValidationRunsService {
  pool;
  casesService;
  timelineService;
  /**
   * 创建校验运行服务。
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
   * 执行一次提交前校验并落库。
   * @param ctx 当前请求上下文。
   * @param input 创建参数。
   * @returns 新建的校验运行记录。
   */
  async create(ctx, input) {
    const currentCase = await this.casesService.get(ctx, input.caseId);
    if (!currentCase) throw new NotFoundException("Case not found");
    const evaluation = await this.evaluateSubmissionReadiness(
      ctx,
      input.caseId,
    );
    return this.insertValidationRun(
      ctx,
      input,
      currentCase.stage ?? currentCase.status,
      evaluation,
    );
  }
  /**
   * 按主键获取单条校验运行。
   * @param ctx 当前请求上下文。
   * @param id 校验运行 ID。
   * @returns 查到的校验运行；不存在时返回 `null`。
   */
  async get(ctx, id) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `
        select ${VALIDATION_RUN_COLS}
        from validation_runs
        where id = $1 and org_id = $2
        limit 1
      `,
      [id, ctx.orgId],
    );
    const row = result.rows.at(0);
    return row ? mapValidationRunRow(row) : null;
  }
  /**
   * 分页列出校验运行。
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
    const countResult = await tenantDb.query(
      `select count(*)::text as count from validation_runs where ${where.join(" and ")}`,
      params,
    );
    const listParams = [...params, limit, offset];
    const listResult = await tenantDb.query(
      `
        select ${VALIDATION_RUN_COLS}
        from validation_runs
        where ${where.join(" and ")}
        order by executed_at desc nulls last, created_at desc, id desc
        limit $${String(listParams.length - 1)}
        offset $${String(listParams.length)}
      `,
      listParams,
    );
    return {
      items: listResult.rows.map(mapValidationRunRow),
      total: Number(countResult.rows.at(0)?.count ?? "0"),
    };
  }
  async insertValidationRun(ctx, input, caseStatus, evaluation) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `
        insert into validation_runs (
          org_id, case_id, ruleset_ref, result_status, blocking_count,
          warning_count, report_payload, executed_by
        )
        values ($1, $2, $3::jsonb, $4, $5, $6, $7::jsonb, $8)
        returning ${VALIDATION_RUN_COLS}
      `,
      [
        ctx.orgId,
        input.caseId,
        JSON.stringify(input.rulesetRef ?? defaultRulesetRef()),
        evaluation.resultStatus,
        evaluation.blockingCount,
        evaluation.warningCount,
        JSON.stringify({ caseStatus, checks: evaluation.checks }),
        ctx.userId,
      ],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create validation run");
    const created = mapValidationRunRow(row);
    await this.writeValidationTimeline(ctx, created);
    return created;
  }
  async writeValidationTimeline(ctx, created) {
    await this.timelineService.write(ctx, {
      entityType: "case",
      entityId: created.caseId,
      action: "validation_run.executed",
      payload: {
        validationRunId: created.id,
        resultStatus: created.resultStatus,
        blockingCount: created.blockingCount,
        warningCount: created.warningCount,
      },
    });
  }
  async evaluateSubmissionReadiness(ctx, caseId) {
    const counts = await this.loadGeneratedDocumentCounts(ctx, caseId);
    const checks = buildValidationChecks(counts);
    return summarizeValidationChecks(checks);
  }
  async loadGeneratedDocumentCounts(ctx, caseId) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const [generatedDocsResult, blockedGeneratedDocs] = await Promise.all([
      tenantDb.query(
        `
          select count(*)::text as count
          from generated_documents
          where org_id = $1 and case_id = $2
        `,
        [ctx.orgId, caseId],
      ),
      tenantDb.query(
        `
          select count(*)::text as count
          from generated_documents
          where org_id = $1
            and case_id = $2
            and status not in ('final', 'exported')
        `,
        [ctx.orgId, caseId],
      ),
    ]);
    return {
      generatedDocumentCount: parseCount(generatedDocsResult.rows.at(0)?.count),
      blockedGeneratedDocumentCount: parseCount(
        blockedGeneratedDocs.rows.at(0)?.count,
      ),
    };
  }
};
ValidationRunsService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __param(1, Inject(CasesService)),
    __param(2, Inject(TimelineService)),
    __metadata("design:paramtypes", [Pool, CasesService, TimelineService]),
  ],
  ValidationRunsService,
);
export { ValidationRunsService };
/**
 * 将数据库行映射为校验运行实体。
 * @param row 数据库查询结果行。
 * @returns 领域层使用的校验运行对象。
 */
export function mapValidationRunRow(row) {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    rulesetRef: parseRecordOrNull(row.ruleset_ref),
    resultStatus: row.result_status,
    blockingCount: Number(row.blocking_count ?? 0),
    warningCount: Number(row.warning_count ?? 0),
    reportPayload: parseRecord(row.report_payload),
    executedBy: row.executed_by,
    executedAt: requireTimestampString(row.executed_at, "executed_at"),
    createdAt: requireTimestampString(row.created_at, "created_at"),
    updatedAt: requireTimestampString(row.updated_at, "updated_at"),
  };
}
function parseCount(value) {
  return Number(value ?? 0);
}
function buildValidationChecks(counts) {
  return [
    {
      code: "generated_documents_present",
      passed: counts.generatedDocumentCount > 0,
      severity: "blocking",
      message:
        counts.generatedDocumentCount > 0
          ? "At least one generated document exists"
          : "At least one generated document is required before submission",
      meta: { generatedDocumentCount: counts.generatedDocumentCount },
    },
    {
      code: "generated_documents_finalized",
      passed: counts.blockedGeneratedDocumentCount === 0,
      severity: "blocking",
      message:
        counts.blockedGeneratedDocumentCount === 0
          ? "All generated documents are final or exported"
          : "All generated documents must be final or exported before submission",
      meta: {
        blockedGeneratedDocumentCount: counts.blockedGeneratedDocumentCount,
      },
    },
  ];
}
function summarizeValidationChecks(checks) {
  const blockingCount = checks.filter(
    (check) => check.severity === "blocking" && !check.passed,
  ).length;
  const warningCount = checks.filter(
    (check) => check.severity === "warning" && !check.passed,
  ).length;
  return {
    resultStatus: blockingCount > 0 ? "failed" : "passed",
    blockingCount,
    warningCount,
    checks,
  };
}
function defaultRulesetRef() {
  return {
    gate: "submission_readiness",
    source: "workflow_a",
    version: 1,
  };
}
function parseRecordOrNull(value) {
  if (value === null || value === undefined) return null;
  return parseRecord(value);
}
function parseRecord(value) {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}
function requireTimestampString(value, field) {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  throw new Error(`Invalid timestamp: ${field}`);
}
//# sourceMappingURL=validationRuns.service.js.map
