/* eslint-disable max-lines, jsdoc/require-param-description, jsdoc/require-param, jsdoc/require-returns, jsdoc/require-description */
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { Case } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import type { TenantDbTx } from "../tenancy/tenantDb";
import { normalizeObject } from "../../../infra/utils/normalize";

/**
 * 默认 Case 状态流转矩阵（无 Template 时使用）。
 * archived 为终态，不允许继续流转。
 */
export const DEFAULT_CASE_TRANSITIONS: Record<string, string[]> = {
  new_inquiry: ["following_up", "archived"],
  following_up: ["pending_signing", "archived"],
  pending_signing: ["signed", "following_up", "archived"],
  signed: ["pending_submission"],
  pending_submission: ["submitted_reviewing"],
  submitted_reviewing: ["pending_correction", "approved", "rejected"],
  pending_correction: ["correction_in_progress"],
  correction_in_progress: ["submitted_reviewing"],
  approved: ["archived"],
  rejected: ["following_up", "archived"],
  archived: [],
};

/** TemplatesService 的最小接口，避免 core → templates 直接依赖。 */
export type TemplatesResolver = {
  resolve(
    ctx: RequestContext,
    input: { kind: string; key: string; entityId?: string },
  ): Promise<
    | { mode: "legacy"; used: false }
    | { mode: "template"; used: false; reason: string }
    | {
        mode: "template";
        used: true;
        version: number;
        config: Record<string, unknown>;
      }
  >;
};

/** TemplatesResolver 注入令牌。 */
export const TEMPLATES_RESOLVER = Symbol("TEMPLATES_RESOLVER");

/** 数据库查询返回的案件行类型。 */
export type CaseQueryRow = {
  id: string;
  org_id: string;
  customer_id: string;
  case_type_code: string;
  status: string;
  owner_user_id: string;
  opened_at: unknown;
  due_at: unknown;
  metadata: unknown;
  case_no: string | null;
  case_name: string | null;
  case_subtype: string | null;
  application_type: string | null;
  company_id: string | null;
  priority: string;
  risk_level: string;
  assistant_user_id: string | null;
  source_channel: string | null;
  signed_at: unknown;
  accepted_at: unknown;
  submission_date: unknown;
  result_date: unknown;
  residence_expiry_date: unknown;
  archived_at: unknown;
  created_at: unknown;
  updated_at: unknown;
};

/**
 * 将数据库查询结果行映射为 Case 实体。
 * @param row 数据库行
 * @returns Case 实体
 */
export function mapCaseRow(row: CaseQueryRow): Case {
  return {
    id: row.id,
    orgId: row.org_id,
    customerId: row.customer_id,
    caseTypeCode: row.case_type_code,
    status: row.status,
    ownerUserId: row.owner_user_id,
    openedAt: toTimestampString(row.opened_at),
    dueAt: toTimestampStringOrNull(row.due_at),
    metadata: normalizeObject(row.metadata),
    caseNo: row.case_no ?? null,
    caseName: row.case_name ?? null,
    caseSubtype: row.case_subtype ?? null,
    applicationType: row.application_type ?? null,
    companyId: row.company_id ?? null,
    priority: row.priority,
    riskLevel: row.risk_level,
    assistantUserId: row.assistant_user_id ?? null,
    sourceChannel: row.source_channel ?? null,
    signedAt: toTimestampStringOrNull(row.signed_at),
    acceptedAt: toTimestampStringOrNull(row.accepted_at),
    submissionDate: toTimestampStringOrNull(row.submission_date),
    resultDate: toTimestampStringOrNull(row.result_date),
    residenceExpiryDate: toTimestampStringOrNull(row.residence_expiry_date),
    archivedAt: toTimestampStringOrNull(row.archived_at),
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}

function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function toTimestampString(value: unknown): string {
  const s = toTimestampStringOrNull(value);
  if (!s) return "";
  return s;
}

/** 创建案件请求参数。 */
export type CaseCreateInput = {
  customerId: string;
  caseTypeCode: string;
  ownerUserId: string;
  status?: string;
  dueAt?: string | null;
  metadata?: Record<string, unknown>;
  caseNo?: string | null;
  caseName?: string | null;
  caseSubtype?: string | null;
  applicationType?: string | null;
  companyId?: string | null;
  priority?: string;
  riskLevel?: string;
  assistantUserId?: string | null;
  sourceChannel?: string | null;
  signedAt?: string | null;
  acceptedAt?: string | null;
  submissionDate?: string | null;
  resultDate?: string | null;
  residenceExpiryDate?: string | null;
};

/** 更新案件请求参数。 */
export type CaseUpdateInput = {
  caseTypeCode?: string;
  ownerUserId?: string;
  dueAt?: string | null;
  metadata?: Record<string, unknown>;
  caseNo?: string | null;
  caseName?: string | null;
  caseSubtype?: string | null;
  applicationType?: string | null;
  companyId?: string | null;
  priority?: string;
  riskLevel?: string;
  assistantUserId?: string | null;
  sourceChannel?: string | null;
  signedAt?: string | null;
  acceptedAt?: string | null;
  submissionDate?: string | null;
  resultDate?: string | null;
  residenceExpiryDate?: string | null;
  archivedAt?: string | null;
};

/** 列表查询请求参数。 */
export type CaseListInput = {
  status?: string;
  ownerUserId?: string;
  customerId?: string;
  priority?: string;
  riskLevel?: string;
  companyId?: string;
  page?: number;
  limit?: number;
};

/** 状态变更请求参数。 */
export type CaseTransitionInput = {
  toStatus: string;
};

const CASE_COLS = `id, org_id, customer_id, case_type_code, status, owner_user_id, opened_at, due_at, metadata, case_no, case_name, case_subtype, application_type, company_id, priority, risk_level, assistant_user_id, source_channel, signed_at, accepted_at, submission_date, result_date, residence_expiry_date, archived_at, created_at, updated_at`;
const CASE_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const CASE_RISK_LEVELS = new Set(["low", "medium", "high"]);

/** 列表过滤条件构建器（提取以降低 list 方法复杂度）。 */
function buildCaseListFilter(input: CaseListInput): {
  whereClause: string;
  params: unknown[];
} {
  const where: string[] = [
    "coalesce(metadata->>'_status', '') is distinct from 'deleted'",
  ];
  const params: unknown[] = [];
  const filters: [string, string | undefined][] = [
    ["status", input.status],
    ["owner_user_id", input.ownerUserId],
    ["customer_id", input.customerId],
    ["priority", input.priority],
    ["risk_level", input.riskLevel],
    ["company_id", input.companyId],
  ];
  for (const [col, val] of filters) {
    if (val) {
      params.push(val);
      where.push(`${col} = $${String(params.length)}`);
    }
  }
  const whereClause = where.length > 0 ? `where ${where.join(" and ")}` : "";
  return { whereClause, params };
}

/** 若 v 不为 undefined 则取 v，否则取 fallback（区别于 ?? 以保留 null）。 */
function pickDefined<T>(v: T | undefined, fallback: T): T {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return v !== undefined ? v : fallback;
}

const DEFAULT_CASE_PREFIX = "CASE";

function formatCaseYearMonth(date: Date): string {
  return `${String(date.getFullYear())}${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatCaseNo(prefix: string, date: Date, seq: number): string {
  return `${prefix}-${formatCaseYearMonth(date)}-${String(seq).padStart(4, "0")}`;
}

function resolveCasePrefix(settings: unknown): string {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return DEFAULT_CASE_PREFIX;
  }
  const value = (settings as Record<string, unknown>).case_prefix;
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : DEFAULT_CASE_PREFIX;
}

function isCaseNoConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const pgError = error as { code?: unknown; constraint?: unknown };
  return (
    pgError.code === "23505" && pgError.constraint === "uq_cases_org_case_no"
  );
}

/** 将 CaseUpdateInput 与 current Case 合并，返回各字段的最终值。 */
function resolveCaseUpdateFields(input: CaseUpdateInput, current: Case) {
  return {
    caseTypeCode: input.caseTypeCode ?? current.caseTypeCode,
    ownerUserId: input.ownerUserId ?? current.ownerUserId,
    dueAt: pickDefined(input.dueAt, current.dueAt),
    metadata: input.metadata ?? current.metadata,
    caseNo: current.caseNo,
    caseName: pickDefined(input.caseName, current.caseName),
    caseSubtype: pickDefined(input.caseSubtype, current.caseSubtype),
    applicationType: pickDefined(
      input.applicationType,
      current.applicationType,
    ),
    companyId: pickDefined(input.companyId, current.companyId),
    priority: input.priority ?? current.priority,
    riskLevel: input.riskLevel ?? current.riskLevel,
    assistantUserId: pickDefined(
      input.assistantUserId,
      current.assistantUserId,
    ),
    sourceChannel: pickDefined(input.sourceChannel, current.sourceChannel),
    signedAt: pickDefined(input.signedAt, current.signedAt),
    acceptedAt: pickDefined(input.acceptedAt, current.acceptedAt),
    submissionDate: pickDefined(input.submissionDate, current.submissionDate),
    resultDate: pickDefined(input.resultDate, current.resultDate),
    residenceExpiryDate: pickDefined(
      input.residenceExpiryDate,
      current.residenceExpiryDate,
    ),
    archivedAt: pickDefined(input.archivedAt, current.archivedAt),
  };
}

function validateCaseEnums(input: {
  priority?: string;
  riskLevel?: string;
}): void {
  if (input.priority !== undefined && !CASE_PRIORITIES.has(input.priority)) {
    throw new BadRequestException("Invalid priority");
  }
  if (input.riskLevel !== undefined && !CASE_RISK_LEVELS.has(input.riskLevel)) {
    throw new BadRequestException("Invalid riskLevel");
  }
}

/** 将 CaseCreateInput 展平为 insert 参数数组。 */
function buildInsertCaseParams(
  orgId: string,
  input: CaseCreateInput,
): unknown[] {
  const nullableFields = [
    input.caseNo,
    input.caseName,
    input.caseSubtype,
    input.applicationType,
    input.companyId,
  ].map((v) => v ?? null);
  const nullableTail = [
    input.assistantUserId,
    input.sourceChannel,
    input.signedAt,
    input.acceptedAt,
    input.submissionDate,
    input.resultDate,
    input.residenceExpiryDate,
  ].map((v) => v ?? null);

  return [
    orgId,
    input.customerId,
    input.caseTypeCode,
    input.status ?? "open",
    input.ownerUserId,
    input.dueAt ?? null,
    JSON.stringify(input.metadata ?? {}),
    ...nullableFields,
    input.priority ?? "normal",
    input.riskLevel ?? "low",
    ...nullableTail,
  ];
}

/** 案件服务，提供案件 CRUD、状态变更与软删除能力。 */
@Injectable()
export class CasesService {
  /**
   * @param pool 连接池 @param templatesResolver 模板解析服务
   * @param templatesResolver
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TEMPLATES_RESOLVER)
    private readonly templatesResolver: TemplatesResolver,
  ) {}

  /** 创建案件（事务内：写入 + document_items + Timeline）。
   * @param input
   * @param ctx 请求上下文 @param input 创建参数 @returns Case 实体 */
  async create(ctx: RequestContext, input: CaseCreateInput): Promise<Case> {
    validateDueAt(input.dueAt);
    validateCaseEnums(input);
    const checklistItems = await this.resolveChecklistItems(
      ctx,
      input.caseTypeCode,
    );
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    return tenantDb.transaction(async (tx) => {
      await this.assertBelongsToOrg(tx, "customers", input.customerId);
      await this.assertBelongsToOrg(tx, "users", input.ownerUserId);
      if (input.companyId) {
        await this.assertBelongsToOrg(tx, "companies", input.companyId);
      }
      if (input.assistantUserId) {
        await this.assertBelongsToOrg(tx, "users", input.assistantUserId);
      }

      const created = await this.insertCaseWithAutoNumber(tx, ctx, input);
      await this.insertDocumentItems(tx, ctx.orgId, created.id, checklistItems);
      await writeTimelineInTx(tx, ctx, {
        entityType: "case",
        entityId: created.id,
        action: "case.created",
        payload: { caseTypeCode: created.caseTypeCode, status: created.status },
      });
      return created;
    });
  }

  /** 根据 ID 获取案件详情（过滤已软删除）。
   * @param id
   * @param ctx 请求上下文 @param id 案件 ID @returns Case 或 null */
  async get(ctx: RequestContext, id: string): Promise<Case | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<CaseQueryRow>(
      `
        select ${CASE_COLS}
        from cases
        where id = $1 and coalesce(metadata->>'_status', '') is distinct from 'deleted'
        limit 1
      `,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapCaseRow(row) : null;
  }

  /** 获取案件列表（支持筛选 + 分页）。
   * @param input
   * @param ctx 请求上下文 @param input 查询参数 @returns 列表和总数 */
  async list(
    ctx: RequestContext,
    input: CaseListInput = {},
  ): Promise<{ items: Case[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const { whereClause, params } = buildCaseListFilter(input);

    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*) as count from cases ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    params.push(limit);
    const limitParam = "$" + String(params.length);
    params.push(offset);
    const offsetParam = "$" + String(params.length);

    const result = await tenantDb.query<CaseQueryRow>(
      `
        select ${CASE_COLS}
        from cases
        ${whereClause}
        order by created_at desc, id desc
        limit ${limitParam} offset ${offsetParam}
      `,
      params,
    );

    return { items: result.rows.map(mapCaseRow), total };
  }

  /** 更新案件基本信息（事务内：更新 + Timeline）。
   * @param id
   * @param input
   * @param ctx 请求上下文 @param id 案件 ID @param input 更新参数 @returns Case 实体 */
  async update(
    ctx: RequestContext,
    id: string,
    input: CaseUpdateInput,
  ): Promise<Case> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Case not found or deleted");
    validateDueAt(input.dueAt);
    validateCaseEnums(input);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const f = resolveCaseUpdateFields(input, current);

    return tenantDb.transaction(async (tx) => {
      if (f.companyId)
        await this.assertBelongsToOrg(tx, "companies", f.companyId);
      if (f.assistantUserId)
        await this.assertBelongsToOrg(tx, "users", f.assistantUserId);
      const updated = await this.executeUpdateCase(tx, id, f);
      await writeTimelineInTx(tx, ctx, {
        entityType: "case",
        entityId: updated.id,
        action: "case.updated",
        payload: { before: current, after: updated },
      });
      return updated;
    });
  }

  /** 状态变更（校验 state_flow template + 乐观锁防并发）。
   * @param id
   * @param input
   * @param ctx 请求上下文 @param id 案件 ID @param input 变更参数 @returns Case 实体 */
  async transition(
    ctx: RequestContext,
    id: string,
    input: CaseTransitionInput,
  ): Promise<Case> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Case not found or deleted");

    const fromStatus = current.status;
    const toStatus = input.toStatus;
    await this.validateTransition(ctx, current, fromStatus, toStatus);

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction(async (tx) => {
      const result = await tx.query<CaseQueryRow>(
        `update cases set status = $2, updated_at = now()
         where id = $1 and status = $3
           and coalesce(metadata->>'_status','') is distinct from 'deleted'
         returning ${CASE_COLS}`,
        [id, toStatus, fromStatus],
      );
      const row = result.rows.at(0);
      if (!row) {
        throw new BadRequestException(
          `Transition conflict: case status has already changed from '${fromStatus}'`,
        );
      }
      const updated = mapCaseRow(row);
      await writeTimelineInTx(tx, ctx, {
        entityType: "case",
        entityId: updated.id,
        action: "case.transitioned",
        payload: { from: fromStatus, to: toStatus },
      });
      return updated;
    });
  }

  /** 软删除案件（事务内：标记删除 + Timeline）。
   * @param id
   * @param ctx 请求上下文 @param id 案件 ID */
  async softDelete(ctx: RequestContext, id: string): Promise<void> {
    const current = await this.get(ctx, id);
    if (!current)
      throw new NotFoundException("Case not found or already deleted");

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const nextMetadata = { ...current.metadata, _status: "deleted" };

    await tenantDb.transaction(async (tx) => {
      const result = await tx.query<CaseQueryRow>(
        `
          update cases
          set metadata = $2::jsonb, updated_at = now()
          where id = $1
          returning ${CASE_COLS}
        `,
        [id, JSON.stringify(nextMetadata)],
      );

      if (!result.rowCount || result.rowCount === 0)
        throw new BadRequestException("Failed to soft delete case");

      await writeTimelineInTx(tx, ctx, {
        entityType: "case",
        entityId: id,
        action: "case.deleted",
        payload: { status: "deleted" },
      });
    });
  }

  /** 预解析 document_checklist template。
   * @param ctx 请求上下文 @param caseTypeCode 案件类型编码
   * @param caseTypeCode
   * @returns checklist 项目数组（legacy/无模板返回空数组；服务异常向上抛出） */
  private async resolveChecklistItems(
    ctx: RequestContext,
    caseTypeCode: string,
  ): Promise<ChecklistItem[]> {
    const resolved = await this.templatesResolver.resolve(ctx, {
      kind: "document_checklist",
      key: caseTypeCode,
    });
    if (resolved.mode !== "template" || !resolved.used) return [];
    return Array.isArray(resolved.config.items)
      ? (resolved.config.items as ChecklistItem[])
      : [];
  }

  /** 校验 state_flow 模板允许的状态变更。
   * @param c
   * @param from
   * @param to
   * @param ctx 请求上下文 @param c 当前案件 @param from 原状态 @param to 目标状态 */
  private async validateTransition(
    ctx: RequestContext,
    c: Case,
    from: string,
    to: string,
  ): Promise<void> {
    const resolved = await this.templatesResolver.resolve(ctx, {
      kind: "state_flow",
      key: c.caseTypeCode,
      entityId: c.id,
    });

    // Template 定义的 state_flow 优先
    if (resolved.mode === "template" && resolved.used) {
      const ts = Array.isArray(resolved.config.allowedTransitions)
        ? (resolved.config.allowedTransitions as { from: string; to: string }[])
        : [];
      if (!ts.some((t) => t.from === from && t.to === to)) {
        throw new BadRequestException(
          `Transition from '${from}' to '${to}' is not allowed`,
        );
      }
      return;
    }

    // 回退到默认流转矩阵
    const allowed = DEFAULT_CASE_TRANSITIONS[from] as string[] | undefined;
    if (!allowed?.includes(to)) {
      throw new BadRequestException(
        `Transition from '${from}' to '${to}' is not allowed`,
      );
    }
  }

  /** 插入 Case 主表行。
   * @param ctx
   * @param input
   * @param tx 事务连接 @param ctx 请求上下文 @param input 创建参数 @returns Case 实体 */
  private async insertCase(
    tx: TenantDbTx,
    ctx: RequestContext,
    input: CaseCreateInput,
  ): Promise<Case> {
    const params = buildInsertCaseParams(ctx.orgId, input);
    const result = await tx.query<CaseQueryRow>(
      `insert into cases (org_id, customer_id, case_type_code, status, owner_user_id, due_at, metadata,
        case_no, case_name, case_subtype, application_type, company_id, priority, risk_level,
        assistant_user_id, source_channel, signed_at, accepted_at, submission_date, result_date, residence_expiry_date)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) returning ${CASE_COLS}`,
      params,
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create case");
    return mapCaseRow(row);
  }

  private async insertCaseWithAutoNumber(
    tx: TenantDbTx,
    ctx: RequestContext,
    input: CaseCreateInput,
  ): Promise<Case> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const caseNo = await this.generateCaseNo(tx, ctx.orgId);
      try {
        return await this.insertCase(tx, ctx, { ...input, caseNo });
      } catch (error) {
        if (attempt === 0 && isCaseNoConflict(error)) continue;
        throw error;
      }
    }
    throw new BadRequestException("Failed to create case");
  }

  private async generateCaseNo(tx: TenantDbTx, orgId: string): Promise<string> {
    const settingsResult = await tx.query<{ settings: unknown }>(
      `select settings from organizations where id = $1 limit 1`,
      [orgId],
    );
    const now = new Date();
    const prefix = resolveCasePrefix(settingsResult.rows[0]?.settings);
    const period = `${prefix}-${formatCaseYearMonth(now)}-%`;
    const countResult = await tx.query<{ count: string }>(
      `select count(*) as count from cases where org_id = $1 and case_no like $2`,
      [orgId, period],
    );
    const seq = parseInt(countResult.rows[0]?.count ?? "0", 10) + 1;
    return formatCaseNo(prefix, now, seq);
  }

  /** 执行 Case 更新 SQL 并返回更新后的 Case。 */
  private async executeUpdateCase(
    tx: TenantDbTx,
    id: string,
    f: ReturnType<typeof resolveCaseUpdateFields>,
  ): Promise<Case> {
    const result = await tx.query<CaseQueryRow>(
      `update cases
       set case_type_code = $2, owner_user_id = $3, due_at = $4,
           metadata = $5::jsonb, case_no = $6, case_name = $7, case_subtype = $8,
           application_type = $9, company_id = $10, priority = $11,
           risk_level = $12, assistant_user_id = $13, source_channel = $14,
           signed_at = $15, accepted_at = $16, submission_date = $17,
           result_date = $18, residence_expiry_date = $19, archived_at = $20,
           updated_at = now()
       where id = $1 and coalesce(metadata->>'_status', '') is distinct from 'deleted'
       returning ${CASE_COLS}`,
      [
        id,
        f.caseTypeCode,
        f.ownerUserId,
        f.dueAt,
        JSON.stringify(f.metadata),
        f.caseNo,
        f.caseName,
        f.caseSubtype,
        f.applicationType,
        f.companyId,
        f.priority,
        f.riskLevel,
        f.assistantUserId,
        f.sourceChannel,
        f.signedAt,
        f.acceptedAt,
        f.submissionDate,
        f.resultDate,
        f.residenceExpiryDate,
        f.archivedAt,
      ],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to update case");
    return mapCaseRow(row);
  }

  /** 批量插入 document_items。
   * @param orgId
   * @param caseId
   * @param items
   * @param tx 事务连接 @param orgId 组织 ID @param caseId 案件 ID @param items 项目列表 */
  private async insertDocumentItems(
    tx: TenantDbTx,
    orgId: string,
    caseId: string,
    items: ChecklistItem[],
  ): Promise<void> {
    for (const item of items) {
      await tx.query(
        `insert into document_items (org_id,case_id,checklist_item_code,name,status,owner_side) values ($1,$2,$3,$4,$5,$6)`,
        [
          orgId,
          caseId,
          item.code,
          item.name,
          "pending",
          item.ownerSide ?? "applicant",
        ],
      );
    }
  }

  /** 允许 assertBelongsToOrg 使用的表名白名单。 */
  private static readonly ALLOWED_ASSERT_TABLES = new Set([
    "customers",
    "users",
    "companies",
  ]);

  /** 断言记录属于当前 org（RLS 过滤 + 表名白名单防注入）。
   * @param table
   * @param id
   * @param tx 事务连接 @param table 表名 @param id 记录 ID */
  private async assertBelongsToOrg(
    tx: TenantDbTx,
    table: string,
    id: string,
  ): Promise<void> {
    if (!CasesService.ALLOWED_ASSERT_TABLES.has(table)) {
      throw new Error(`assertBelongsToOrg: disallowed table "${table}"`);
    }
    const r = await tx.query<{ id: string }>(
      `select id from ${table} where id = $1 limit 1`,
      [id],
    );
    if (r.rows.length === 0)
      throw new BadRequestException(
        `Referenced ${table} record not found in current organization`,
      );
  }
}

type ChecklistItem = { code: string; name: string; ownerSide?: string };

type TimelineInput = {
  entityType: string;
  entityId: string;
  action: string;
  payload: Record<string, unknown>;
};

/** 事务内写入 Timeline 记录。
 * @param ctx
 * @param input
 * @param tx 事务连接 @param ctx 请求上下文 @param input timeline 内容 */
async function writeTimelineInTx(
  tx: TenantDbTx,
  ctx: RequestContext,
  input: TimelineInput,
): Promise<void> {
  await tx.query(
    `insert into timeline_logs(org_id,entity_type,entity_id,action,actor_user_id,payload) values ($1,$2,$3,$4,$5,$6::jsonb)`,
    [
      ctx.orgId,
      input.entityType,
      input.entityId,
      input.action,
      ctx.userId,
      JSON.stringify(input.payload),
    ],
  );
}

/** 校验 dueAt 日期合法性。
 * @param dueAt 到期日期 */
function validateDueAt(dueAt: string | null | undefined): void {
  if (!dueAt) return;
  if (isNaN(new Date(dueAt).getTime()))
    throw new BadRequestException("Invalid dueAt date");
}
