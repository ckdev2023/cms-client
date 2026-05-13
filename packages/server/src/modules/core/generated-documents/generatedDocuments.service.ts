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
import {
  type GeneratedDocumentDtoRow,
  type GeneratedDocumentRow,
  buildListWhere,
  buildUpdateSets,
  mapDtoRow,
  mapRow,
  validateCreateInput,
} from "./generatedDocuments.helpers";

export const GD_DTO_SELECT = `
  gd.id, gd.org_id, gd.case_id, gd.template_id, gd.title, gd.version_no, gd.output_format, gd.file_url, gd.status, gd.generated_by, gd.approved_by, gd.generated_at, gd.approved_at,
  gd.template_version_no_snapshot, gd.template_doc_type,
  gen_u.name as generated_by_display_name,
  apr_u.name as approved_by_display_name
`;

export const GD_DTO_JOINS = ` from generated_documents gd left join users gen_u on gen_u.id = gd.generated_by left join users apr_u on apr_u.id = gd.approved_by`;

type TemplateSnapshot = { versionNo: number; docType: string };

/** 生成文书 CRUD 服务。 */
@Injectable()
export class GeneratedDocumentsService {
  /**
   * 注入依赖。
   * @param pool 连接池。
   * @param timelineService 时间线。
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  /**
   * 按主键获取生成文書实体。
   *
   * @param ctx 请求上下文。
   * @param id 文書 ID。
   * @returns 实体或 null。
   */
  async get(
    ctx: RequestContext,
    id: string,
  ): Promise<GeneratedDocument | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<GeneratedDocumentRow>(
      `select id, org_id, case_id, template_id, title, version_no, output_format, file_url, status, generated_by, approved_by, generated_at, approved_at, template_version_no_snapshot, template_doc_type from generated_documents where id = $1 and org_id = $2 limit 1`,
      [id, ctx.orgId],
    );
    const row = result.rows.at(0);
    return row ? mapRow(row) : null;
  }

  /**
   * 按主键获取 DTO（含展示名）。
   *
   * @param ctx 请求上下文。
   * @param id 文書 ID。
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
   * 分页列出指定案件的生成文書。
   *
   * @param ctx 请求上下文。
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
    const templateSnapshot = input.templateId
      ? await this.resolveTemplateSnapshot(
          tenantDb,
          ctx.orgId,
          input.caseId,
          input.templateId,
        )
      : null;
    const versionNo = await this.nextVersionNo(
      tenantDb,
      ctx.orgId,
      input.caseId,
      input.templateId ?? null,
    );
    const dto = await this.insertAndReturn(
      ctx,
      input,
      versionNo,
      templateSnapshot,
    );

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
   * @param options 可选行为控制。
   * @param options.skipTimelineWrite 为 true 时跳过 `.updated` timeline 写入。
   * @returns 更新后的 DTO。
   */
  async update(
    ctx: RequestContext,
    id: string,
    input: GeneratedDocumentUpdateInput,
    options?: { skipTimelineWrite?: boolean },
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

    if (!options?.skipTimelineWrite) {
      await this.timelineService.write(ctx, {
        entityType: "case",
        entityId: existing.caseId,
        action: "generated_document.updated",
        payload: { generatedDocumentId: id, changes: input },
      });
    }

    return dto;
  }

  /**
   * 写入生成文書专用 timeline 条目。
   *
   * @param ctx 请求上下文。
   * @param input timeline 内容。
   * @param input.caseId 父案件 ID。
   * @param input.generatedDocumentId 生成文書 ID。
   * @param input.action timeline 动作标识。
   * @param input.extra 附加载荷。
   */
  async writeTimeline(
    ctx: RequestContext,
    input: {
      caseId: string;
      generatedDocumentId: string;
      action: string;
      extra?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.timelineService.write(ctx, {
      entityType: "case",
      entityId: input.caseId,
      action: input.action,
      payload: {
        generatedDocumentId: input.generatedDocumentId,
        ...input.extra,
      },
    });
  }

  /**
   * 删除一条草稿状态的生成文书（final/exported 等不可删除）。
   *
   * @param ctx - 请求上下文。
   * @param existing - 已由控制器加载并完成案件 edit 权限校验的实体。
   */
  async deleteDraft(
    ctx: RequestContext,
    existing: GeneratedDocument,
  ): Promise<void> {
    if (existing.status !== "draft") {
      throw new BadRequestException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_DELETE_ONLY_DRAFT +
          ": Only draft generated documents can be deleted",
      );
    }
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const del = await tenantDb.query<{ id: string }>(
      `delete from generated_documents where id = $1 and org_id = $2 and status = 'draft' returning id`,
      [existing.id, ctx.orgId],
    );
    if (del.rows.length === 0) {
      throw new NotFoundException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_NOT_FOUND +
          ": Generated document not found or no longer draft",
      );
    }
    await this.timelineService.write(ctx, {
      entityType: "case",
      entityId: existing.caseId,
      action: "generated_document.deleted",
      payload: {
        generatedDocumentId: existing.id,
        title: existing.title,
      },
    });
  }

  private async requireDto(
    ctx: RequestContext,
    id: string,
  ): Promise<GeneratedDocumentDto> {
    const dto = await this.getDto(ctx, id);
    if (!dto) throw new NotFoundException("Generated document not found");
    return dto;
  }

  private async resolveTemplateSnapshot(
    tenantDb: ReturnType<typeof createTenantDb>,
    orgId: string,
    caseId: string,
    templateId: string,
  ): Promise<TemplateSnapshot> {
    const tplResult = await tenantDb.query<{
      case_type: string;
      doc_type: string;
      version_no: number;
    }>(
      `select case_type, doc_type, version_no from document_templates where id = $1 and org_id = $2 and active_flag = true limit 1`,
      [templateId, orgId],
    );
    const tplRow = tplResult.rows.at(0);
    if (!tplRow) {
      throw new BadRequestException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_TEMPLATE_NOT_FOUND +
          ": Document template not found or inactive",
      );
    }
    const caseResult = await tenantDb.query<{ case_type_code: string }>(
      `select case_type_code from cases where id = $1 and org_id = $2 limit 1`,
      [caseId, orgId],
    );
    const caseRow = caseResult.rows.at(0);
    if (caseRow && tplRow.case_type !== caseRow.case_type_code) {
      throw new BadRequestException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_TEMPLATE_CASE_TYPE_MISMATCH +
          `: Template caseType '${tplRow.case_type}' does not match case caseType '${caseRow.case_type_code}'`,
      );
    }
    return { versionNo: tplRow.version_no, docType: tplRow.doc_type };
  }

  private async insertAndReturn(
    ctx: RequestContext,
    input: GeneratedDocumentCreateInput,
    versionNo: number,
    templateSnapshot?: TemplateSnapshot | null,
  ): Promise<GeneratedDocumentDto> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<GeneratedDocumentDtoRow>(
      `
        with ins as (
          insert into generated_documents (
            org_id, case_id, template_id, title, version_no,
            output_format, file_url, status, generated_by,
            template_version_no_snapshot, template_doc_type
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          returning *
        )
        select
          ins.id, ins.org_id, ins.case_id, ins.template_id, ins.title,
          ins.version_no, ins.output_format, ins.file_url, ins.status,
          ins.generated_by, ins.approved_by, ins.generated_at, ins.approved_at,
          ins.template_version_no_snapshot, ins.template_doc_type,
          u.name as generated_by_display_name,
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
        templateSnapshot?.versionNo ?? null,
        templateSnapshot?.docType ?? null,
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
