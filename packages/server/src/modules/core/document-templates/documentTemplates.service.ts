import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import {
  DOCUMENT_TEMPLATE_ERROR_CODES,
  type DocumentTemplateCreateInput,
  type DocumentTemplateDto,
  type DocumentTemplateListInput,
  type DocumentTemplateListResult,
  type DocumentTemplateUpdateInput,
} from "./documentTemplates.types";

type DocumentTemplateRow = {
  id: string;
  org_id: string;
  template_name: string;
  case_type: string;
  doc_type: string;
  language: string;
  version_no: number;
  content_body: string;
  variables_schema: Record<string, unknown> | string;
  active_flag: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: unknown;
  updated_at: unknown;
};

const DT_COLS = [
  "id",
  "org_id",
  "template_name",
  "case_type",
  "doc_type",
  "language",
  "version_no",
  "content_body",
  "variables_schema",
  "active_flag",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
].join(", ");

/**
 * 文書模板 CRUD 服务。
 */
@Injectable()
export class DocumentTemplatesService {
  /**
   * 构造函数。
   * @param pool 数据库连接池。
   */
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  /**
   * 列出文書模板（P0 不分页）。
   * @param ctx 当前请求上下文。
   * @param input 查询参数。
   * @returns 列表结果。
   */
  async list(
    ctx: RequestContext,
    input: DocumentTemplateListInput,
  ): Promise<DocumentTemplateListResult> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const { whereClause, params } = buildListWhere(ctx.orgId, input);

    const result = await tenantDb.query<DocumentTemplateRow>(
      `
        select ${DT_COLS}
        from document_templates
        where ${whereClause}
        order by case_type asc, template_name asc, version_no desc
      `,
      params,
    );

    return { items: result.rows.map(mapRow) };
  }

  /**
   * 按主键获取文書模板 DTO。
   * @param ctx 当前请求上下文。
   * @param id 模板 ID。
   * @returns DTO 或 null。
   */
  async get(
    ctx: RequestContext,
    id: string,
  ): Promise<DocumentTemplateDto | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<DocumentTemplateRow>(
      `select ${DT_COLS} from document_templates where id = $1 and org_id = $2 limit 1`,
      [id, ctx.orgId],
    );
    const row = result.rows.at(0);
    return row ? mapRow(row) : null;
  }

  /**
   * 创建文書模板。
   * @param ctx 当前请求上下文。
   * @param input 创建参数。
   * @returns 新建的 DTO。
   */
  async create(
    ctx: RequestContext,
    input: DocumentTemplateCreateInput,
  ): Promise<DocumentTemplateDto> {
    validateCreateInput(input);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const result = await tenantDb.query<DocumentTemplateRow>(
      `
        insert into document_templates (
          org_id, template_name, case_type, doc_type, language,
          version_no, content_body, variables_schema, active_flag,
          created_by, updated_by
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $10)
        returning ${DT_COLS}
      `,
      [
        ctx.orgId,
        input.templateName.trim(),
        input.caseType.trim(),
        input.docType.trim(),
        input.language ?? "ja",
        input.versionNo ?? 1,
        input.contentBody ?? "",
        JSON.stringify(input.variablesSchema ?? {}),
        input.activeFlag ?? true,
        ctx.userId,
      ],
    );

    const row = result.rows.at(0);
    if (!row) {
      throw new BadRequestException("Failed to create document template");
    }
    return mapRow(row);
  }

  /**
   * 部分更新文書模板。
   * @param ctx 当前请求上下文。
   * @param id 模板 ID。
   * @param input 更新参数。
   * @returns 更新后的 DTO。
   */
  async update(
    ctx: RequestContext,
    id: string,
    input: DocumentTemplateUpdateInput,
  ): Promise<DocumentTemplateDto> {
    const existing = await this.get(ctx, id);
    if (!existing) {
      throw new NotFoundException(
        DOCUMENT_TEMPLATE_ERROR_CODES.DT_NOT_FOUND +
          ": Document template not found",
      );
    }

    const { sets, params } = buildUpdateSets(id, ctx, input);
    if (sets.length === 0) {
      return existing;
    }

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    await tenantDb.query(
      `update document_templates set ${sets.join(", ")} where id = $1 and org_id = $2`,
      params,
    );

    const dto = await this.get(ctx, id);
    if (!dto) throw new NotFoundException("Document template not found");
    return dto;
  }

  /**
   * 归档（软删除）文書模板。
   * @param ctx 当前请求上下文。
   * @param id 模板 ID。
   * @returns 更新后的 DTO。
   */
  async archive(ctx: RequestContext, id: string): Promise<DocumentTemplateDto> {
    return this.update(ctx, id, { activeFlag: false });
  }
}

// ─── Pure helpers ────────────────────────────────────────────────

function validateCreateInput(input: DocumentTemplateCreateInput): void {
  if (!input.templateName || input.templateName.trim().length === 0) {
    throw new BadRequestException(
      DOCUMENT_TEMPLATE_ERROR_CODES.DT_INVALID_PAYLOAD +
        ": templateName is required",
    );
  }
  if (!input.caseType || input.caseType.trim().length === 0) {
    throw new BadRequestException(
      DOCUMENT_TEMPLATE_ERROR_CODES.DT_INVALID_PAYLOAD +
        ": caseType is required",
    );
  }
  if (!input.docType || input.docType.trim().length === 0) {
    throw new BadRequestException(
      DOCUMENT_TEMPLATE_ERROR_CODES.DT_INVALID_PAYLOAD +
        ": docType is required",
    );
  }
}

/**
 * BCP-47 locale（例: `ja-JP`）を content language base（`ja`）に正規化する。
 * DB の `document_templates.language` カラムは ISO 639-1 alpha-2 で格納されるため、
 * UI locale がそのまま渡ってきた場合の防御層として機能する。
 * @param value BCP-47 または ISO 639-1 言語コード。
 * @returns ISO 639-1 alpha-2 の小文字ベースコード。
 */
function normalizeLanguageFilter(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const dashIdx = trimmed.indexOf("-");
  return dashIdx > 0 ? trimmed.slice(0, dashIdx) : trimmed;
}

function buildListWhere(
  orgId: string,
  input: DocumentTemplateListInput,
): { whereClause: string; params: unknown[] } {
  const where = ["org_id = $1"];
  const params: unknown[] = [orgId];

  if (!input.includeInactive) {
    where.push("active_flag = true");
  }

  if (input.caseType) {
    params.push(input.caseType);
    where.push(`case_type = $${String(params.length)}`);
  }

  if (input.language) {
    params.push(normalizeLanguageFilter(input.language));
    where.push(`language = $${String(params.length)}`);
  }

  return { whereClause: where.join(" and "), params };
}

function requireNonEmptyTrimmed(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new BadRequestException(
      DOCUMENT_TEMPLATE_ERROR_CODES.DT_INVALID_PAYLOAD +
        `: ${field} cannot be empty`,
    );
  }
  return trimmed;
}

function pushSet(
  sets: string[],
  params: unknown[],
  col: string,
  value: unknown,
  suffix = "",
): void {
  params.push(value);
  sets.push(`${col} = $${String(params.length)}${suffix}`);
}

function buildUpdateSets(
  id: string,
  ctx: RequestContext,
  input: DocumentTemplateUpdateInput,
): { sets: string[]; params: unknown[] } {
  const sets: string[] = [];
  const params: unknown[] = [id, ctx.orgId];

  if (input.templateName !== undefined) {
    pushSet(
      sets,
      params,
      "template_name",
      requireNonEmptyTrimmed(input.templateName, "templateName"),
    );
  }
  if (input.caseType !== undefined) {
    pushSet(
      sets,
      params,
      "case_type",
      requireNonEmptyTrimmed(input.caseType, "caseType"),
    );
  }
  if (input.docType !== undefined) {
    pushSet(
      sets,
      params,
      "doc_type",
      requireNonEmptyTrimmed(input.docType, "docType"),
    );
  }
  if (input.language !== undefined) {
    pushSet(sets, params, "language", input.language);
  }
  if (input.contentBody !== undefined) {
    pushSet(sets, params, "content_body", input.contentBody);
  }
  if (input.variablesSchema !== undefined) {
    pushSet(
      sets,
      params,
      "variables_schema",
      JSON.stringify(input.variablesSchema),
      "::jsonb",
    );
  }
  if (input.activeFlag !== undefined) {
    pushSet(sets, params, "active_flag", input.activeFlag);
  }
  if (sets.length > 0) {
    pushSet(sets, params, "updated_by", ctx.userId);
  }

  return { sets, params };
}

function mapRow(row: DocumentTemplateRow): DocumentTemplateDto {
  const variablesSchema =
    typeof row.variables_schema === "string"
      ? (JSON.parse(row.variables_schema) as Record<string, unknown>)
      : row.variables_schema;

  return {
    id: row.id,
    orgId: row.org_id,
    templateName: row.template_name,
    caseType: row.case_type,
    docType: row.doc_type,
    language: row.language,
    versionNo: row.version_no,
    contentBody: row.content_body,
    variablesSchema,
    activeFlag: row.active_flag,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: tsString(row.created_at, "created_at"),
    updatedAt: tsString(row.updated_at, "updated_at"),
  };
}

function tsString(value: unknown, field: string): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  throw new Error(`Invalid timestamp: ${field}`);
}
