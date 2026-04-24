import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { GeneratedDocument } from "../model/documentEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import {
  GENERATED_DOCUMENT_ERROR_CODES,
  type GeneratedDocumentCreateInput,
  type GeneratedDocumentDto,
  type GeneratedDocumentListInput,
  type GeneratedDocumentListResult,
  type GeneratedDocumentUpdateInput,
} from "../cases/cases.types-generated-docs";

const VALID_STATUSES = new Set(["draft", "final", "exported"]);
const VALID_OUTPUT_FORMATS = new Set(["pdf", "docx", "xlsx"]);

const GD_COLS = [
  "gd.id",
  "gd.org_id",
  "gd.case_id",
  "gd.template_id",
  "gd.title",
  "gd.version_no",
  "gd.output_format",
  "gd.file_url",
  "gd.status",
  "gd.generated_by",
  "gd.approved_by",
  "gd.generated_at",
  "gd.approved_at",
].join(", ");

const GD_DTO_SELECT = `
  ${GD_COLS},
  gen_u.display_name as generated_by_display_name,
  apr_u.display_name as approved_by_display_name
`;

const GD_DTO_JOINS = `
  from generated_documents gd
  left join users gen_u on gen_u.id = gd.generated_by
  left join users apr_u on apr_u.id = gd.approved_by
`;

type GeneratedDocumentRow = {
  id: string;
  org_id: string;
  case_id: string;
  template_id: string | null;
  title: string;
  version_no: number;
  output_format: string;
  file_url: string | null;
  status: string;
  generated_by: string | null;
  approved_by: string | null;
  generated_at: unknown;
  approved_at: unknown;
};

type GeneratedDocumentDtoRow = GeneratedDocumentRow & {
  generated_by_display_name: string | null;
  approved_by_display_name: string | null;
};

/**
 * 生成文书 CRUD 服务。
 */
@Injectable()
export class GeneratedDocumentsService {
  /**
   * 构造函数。
   * @param pool 数据库连接池。
   * @param timelineService 时间线服务。
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  /**
   * 按主键获取生成文书实体。
   * @param ctx 当前请求上下文。
   * @param id 生成文书 ID。
   * @returns 生成文书实体或 null。
   */
  async get(
    ctx: RequestContext,
    id: string,
  ): Promise<GeneratedDocument | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<GeneratedDocumentRow>(
      `
        select id, org_id, case_id, template_id, title, version_no,
               output_format, file_url, status, generated_by, approved_by,
               generated_at, approved_at
        from generated_documents
        where id = $1 and org_id = $2
        limit 1
      `,
      [id, ctx.orgId],
    );
    const row = result.rows.at(0);
    return row ? mapRow(row) : null;
  }

  /**
   * 按主键获取生成文书 DTO（含展示名）。
   * @param ctx 当前请求上下文。
   * @param id 生成文书 ID。
   * @returns DTO 或 null。
   */
  async getDto(
    ctx: RequestContext,
    id: string,
  ): Promise<GeneratedDocumentDto | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<GeneratedDocumentDtoRow>(
      `select ${GD_DTO_SELECT} ${GD_DTO_JOINS} where gd.id = $1 and gd.org_id = $2 limit 1`,
      [id, ctx.orgId],
    );
    const row = result.rows.at(0);
    return row ? mapDtoRow(row) : null;
  }

  /**
   * 分页列出指定案件的生成文书。
   * @param ctx 当前请求上下文。
   * @param input 查询参数。
   * @returns 分页结果。
   */
  async list(
    ctx: RequestContext,
    input: GeneratedDocumentListInput,
  ): Promise<GeneratedDocumentListResult> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const { whereClause, params } = buildListWhere(ctx.orgId, input);

    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*)::text as count from generated_documents gd where ${whereClause}`,
      params,
    );

    const listParams = [...params, limit, offset];
    const listResult = await tenantDb.query<GeneratedDocumentDtoRow>(
      `
        select ${GD_DTO_SELECT}
        ${GD_DTO_JOINS}
        where ${whereClause}
        order by gd.generated_at desc nulls last, gd.id desc
        limit $${String(listParams.length - 1)}
        offset $${String(listParams.length)}
      `,
      listParams,
    );

    return {
      items: listResult.rows.map(mapDtoRow),
      total: Number(countResult.rows.at(0)?.count ?? "0"),
    };
  }

  /**
   * 创建一条生成文书。
   * @param ctx 当前请求上下文。
   * @param input 创建参数。
   * @returns 新建的生成文书 DTO。
   */
  async create(
    ctx: RequestContext,
    input: GeneratedDocumentCreateInput,
  ): Promise<GeneratedDocumentDto> {
    validateCreateInput(input);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const versionNo = await this.nextVersionNo(
      tenantDb,
      ctx.orgId,
      input.caseId,
      input.templateId ?? null,
    );

    const dto = await this.insertAndReturn(ctx, input, versionNo);

    await this.timelineService.write(ctx, {
      entityType: "case",
      entityId: input.caseId,
      action: "generated_document.created",
      payload: {
        generatedDocumentId: dto.id,
        title: dto.title,
        versionNo: dto.versionNo,
        outputFormat: dto.outputFormat,
      },
    });

    return dto;
  }

  /**
   * 部分更新一条生成文书。
   * @param ctx 当前请求上下文。
   * @param id 生成文书 ID。
   * @param input 更新参数。
   * @returns 更新后的 DTO。
   */
  async update(
    ctx: RequestContext,
    id: string,
    input: GeneratedDocumentUpdateInput,
  ): Promise<GeneratedDocumentDto> {
    const existing = await this.get(ctx, id);
    if (!existing) {
      throw new NotFoundException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_NOT_FOUND +
          ": Generated document not found",
      );
    }

    const { sets, params } = buildUpdateSets(id, ctx, input, existing);
    if (sets.length === 0) {
      return this.requireDto(ctx, id);
    }

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    await tenantDb.query(
      `update generated_documents set ${sets.join(", ")} where id = $1 and org_id = $2`,
      params,
    );

    const dto = await this.requireDto(ctx, id);

    await this.timelineService.write(ctx, {
      entityType: "case",
      entityId: existing.caseId,
      action: "generated_document.updated",
      payload: { generatedDocumentId: id, changes: input },
    });

    return dto;
  }

  private async requireDto(
    ctx: RequestContext,
    id: string,
  ): Promise<GeneratedDocumentDto> {
    const dto = await this.getDto(ctx, id);
    if (!dto) throw new NotFoundException("Generated document not found");
    return dto;
  }

  private async insertAndReturn(
    ctx: RequestContext,
    input: GeneratedDocumentCreateInput,
    versionNo: number,
  ): Promise<GeneratedDocumentDto> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<GeneratedDocumentDtoRow>(
      `
        with ins as (
          insert into generated_documents (
            org_id, case_id, template_id, title, version_no,
            output_format, file_url, status, generated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          returning *
        )
        select
          ins.id, ins.org_id, ins.case_id, ins.template_id, ins.title,
          ins.version_no, ins.output_format, ins.file_url, ins.status,
          ins.generated_by, ins.approved_by, ins.generated_at, ins.approved_at,
          u.display_name as generated_by_display_name,
          null::text as approved_by_display_name
        from ins
        left join users u on u.id = ins.generated_by
      `,
      [
        ctx.orgId,
        input.caseId,
        input.templateId ?? null,
        input.title.trim(),
        versionNo,
        input.outputFormat ?? "pdf",
        input.fileUrl ?? null,
        input.status ?? "draft",
        ctx.userId,
      ],
    );

    const row = result.rows.at(0);
    if (!row) {
      throw new BadRequestException("Failed to create generated document");
    }
    return mapDtoRow(row);
  }

  private async nextVersionNo(
    tenantDb: ReturnType<typeof createTenantDb>,
    orgId: string,
    caseId: string,
    templateId: string | null,
  ): Promise<number> {
    const templateFilter = templateId
      ? "and template_id = $3"
      : "and template_id is null";
    const params: unknown[] = templateId
      ? [orgId, caseId, templateId]
      : [orgId, caseId];

    const result = await tenantDb.query<{ max_ver: number | null }>(
      `select max(version_no) as max_ver from generated_documents where org_id = $1 and case_id = $2 ${templateFilter}`,
      params,
    );
    return (result.rows.at(0)?.max_ver ?? 0) + 1;
  }
}

// ─── Pure helpers ────────────────────────────────────────────────

function validateCreateInput(input: GeneratedDocumentCreateInput): void {
  if (!input.title || input.title.trim().length === 0) {
    throw new BadRequestException(
      GENERATED_DOCUMENT_ERROR_CODES.GD_TITLE_REQUIRED + ": title is required",
    );
  }
  const fmt = input.outputFormat ?? "pdf";
  if (!VALID_OUTPUT_FORMATS.has(fmt)) {
    throw new BadRequestException(
      GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_OUTPUT_FORMAT +
        ": output_format must be pdf, docx, or xlsx",
    );
  }
  const st = input.status ?? "draft";
  if (!VALID_STATUSES.has(st)) {
    throw new BadRequestException(
      GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_STATUS +
        ": status must be draft, final, or exported",
    );
  }
}

function buildListWhere(
  orgId: string,
  input: GeneratedDocumentListInput,
): { whereClause: string; params: unknown[] } {
  const where = ["gd.org_id = $1"];
  const params: unknown[] = [orgId];

  params.push(input.caseId);
  where.push(`gd.case_id = $${String(params.length)}`);

  if (input.status) {
    params.push(input.status);
    where.push(`gd.status = $${String(params.length)}`);
  }

  return { whereClause: where.join(" and "), params };
}

function buildUpdateSets(
  id: string,
  ctx: RequestContext,
  input: GeneratedDocumentUpdateInput,
  existing: GeneratedDocument,
): { sets: string[]; params: unknown[] } {
  const sets: string[] = [];
  const params: unknown[] = [id, ctx.orgId];

  if (input.title !== undefined) {
    if (input.title.trim().length === 0) {
      throw new BadRequestException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_TITLE_REQUIRED +
          ": title is required",
      );
    }
    params.push(input.title.trim());
    sets.push(`title = $${String(params.length)}`);
  }

  if (input.outputFormat !== undefined) {
    if (!VALID_OUTPUT_FORMATS.has(input.outputFormat)) {
      throw new BadRequestException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_OUTPUT_FORMAT +
          ": output_format must be pdf, docx, or xlsx",
      );
    }
    params.push(input.outputFormat);
    sets.push(`output_format = $${String(params.length)}`);
  }

  if (input.fileUrl !== undefined) {
    params.push(input.fileUrl);
    sets.push(`file_url = $${String(params.length)}`);
  }

  if (input.status !== undefined) {
    if (!VALID_STATUSES.has(input.status)) {
      throw new BadRequestException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_STATUS +
          ": status must be draft, final, or exported",
      );
    }
    params.push(input.status);
    sets.push(`status = $${String(params.length)}`);

    if (
      input.status === "final" &&
      existing.status === "draft" &&
      !existing.approvedBy
    ) {
      params.push(ctx.userId);
      sets.push(`approved_by = $${String(params.length)}`);
      sets.push("approved_at = now()");
    }
  }

  return { sets, params };
}

/**
 * 将数据库行映射为生成文书实体。
 * @param row 数据库查询行。
 * @returns 领域层实体。
 */
function mapRow(row: GeneratedDocumentRow): GeneratedDocument {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    templateId: row.template_id,
    title: row.title,
    versionNo: row.version_no,
    outputFormat: row.output_format,
    fileUrl: row.file_url,
    status: row.status,
    generatedBy: row.generated_by,
    approvedBy: row.approved_by,
    generatedAt: tsString(row.generated_at, "generated_at"),
    approvedAt: tsStringOrNull(row.approved_at),
  };
}

/**
 * 将数据库行映射为生成文书 DTO。
 * @param row 数据库查询行（含 join 展示名）。
 * @returns DTO。
 */
function mapDtoRow(row: GeneratedDocumentDtoRow): GeneratedDocumentDto {
  return {
    id: row.id,
    caseId: row.case_id,
    templateId: row.template_id,
    title: row.title,
    versionNo: row.version_no,
    outputFormat: row.output_format,
    fileUrl: row.file_url,
    status: row.status,
    generatedBy: row.generated_by,
    generatedByDisplayName: row.generated_by_display_name,
    approvedBy: row.approved_by,
    approvedByDisplayName: row.approved_by_display_name,
    generatedAt: tsString(row.generated_at, "generated_at"),
    approvedAt: tsStringOrNull(row.approved_at),
  };
}

function tsString(value: unknown, field: string): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  throw new Error(`Invalid timestamp: ${field}`);
}

function tsStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}
