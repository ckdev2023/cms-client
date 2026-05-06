import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequirePermission } from "../auth/auth.decorators";
import { PERMISSION_CODES } from "../auth/permissions.codes";
import { PermissionsService } from "../auth/permissions.service";
import { CasesService } from "../cases/cases.service";
import { GENERATED_DOCUMENT_ERROR_CODES } from "../cases/cases.types-generated-docs";
import type { RequestContext } from "../tenancy/requestContext";
import { GeneratedDocumentsService } from "./generatedDocuments.service";

type HttpRequest = { requestContext?: RequestContext };

type CreateBody = {
  caseId?: unknown;
  templateId?: unknown;
  title?: unknown;
  outputFormat?: unknown;
  fileUrl?: unknown;
  status?: unknown;
};

type UpdateBody = {
  title?: unknown;
  outputFormat?: unknown;
  fileUrl?: unknown;
  status?: unknown;
};

type ListQuery = {
  caseId?: unknown;
  status?: unknown;
  page?: unknown;
  limit?: unknown;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  throw new BadRequestException(`Invalid ${field}`);
}

function optionalNullableString(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  throw new BadRequestException(`Invalid ${field}`);
}

function parsePage(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) {
    throw new BadRequestException("Invalid page");
  }
  return Math.floor(num);
}

function parseLimit(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1 || num > 200) {
    throw new BadRequestException("Invalid limit");
  }
  return Math.floor(num);
}

/**
 * 生成文書 CRUD — 资源级鉴权委托给父案件。
 */
@Controller("generated-documents")
export class GeneratedDocumentsController {
  /**
   * 构造函数。
   * @param generatedDocumentsService 生成文书服务。
   * @param casesService 案件服务（查找父案件用于鉴权）。
   * @param permissionsService 权限服务。
   */
  constructor(
    @Inject(GeneratedDocumentsService)
    private readonly generatedDocumentsService: GeneratedDocumentsService,
    @Inject(CasesService)
    private readonly casesService: CasesService,
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * 列出指定案件的生成文书（须父案件 view 权限）。
   * @param req HTTP 请求对象。
   * @param query 查询参数。
   * @returns 分页结果。
   */
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const caseId = requireString(query.caseId, "caseId");
    await this.assertCanViewParentCase(ctx, caseId);

    return this.generatedDocumentsService.list(ctx, {
      caseId,
      status: optionalString(query.status, "status"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  /**
   * 获取单条生成文书（须父案件 view 权限）。
   * @param req HTTP 请求对象。
   * @param id 生成文书 ID。
   * @returns 单条 DTO。
   */
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const dto = await this.generatedDocumentsService.getDto(ctx, id);
    if (!dto) throw new NotFoundException("Generated document not found");

    await this.assertCanViewParentCase(ctx, dto.caseId);
    return dto;
  }

  /**
   * 创建生成文书（须父案件 edit 权限且非 S9）。
   * @param req HTTP 请求对象。
   * @param body 请求体。
   * @returns 新建的 DTO。
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const caseId = requireString(body.caseId, "caseId");
    await this.assertCanEditParentCase(ctx, caseId);

    return this.generatedDocumentsService.create(ctx, {
      caseId,
      templateId: optionalNullableString(body.templateId, "templateId"),
      title: requireString(body.title, "title"),
      outputFormat: optionalString(body.outputFormat, "outputFormat"),
      fileUrl: optionalNullableString(body.fileUrl, "fileUrl"),
      status: optionalString(body.status, "status"),
    });
  }

  /**
   * 更新生成文书（须父案件 edit 权限且非 S9）。
   * @param req HTTP 请求对象。
   * @param id 生成文书 ID。
   * @param body 请求体。
   * @returns 更新后的 DTO。
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const existing = await this.generatedDocumentsService.get(ctx, id);
    if (!existing) throw new NotFoundException("Generated document not found");

    await this.assertCanEditParentCase(ctx, existing.caseId);

    return this.generatedDocumentsService.update(ctx, id, {
      title: optionalString(body.title, "title"),
      outputFormat: optionalString(body.outputFormat, "outputFormat"),
      fileUrl: optionalNullableString(body.fileUrl, "fileUrl"),
      status: optionalString(body.status, "status"),
    });
  }

  /**
   * 定稿生成文書（须主办人或 manager 权限，非 S9）。
   *
   * @param req HTTP 请求对象。
   * @param id 生成文書 ID。
   * @returns 更新后的 DTO。
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post(":id/finalize")
  async finalize(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const existing = await this.generatedDocumentsService.get(ctx, id);
    if (!existing) throw new NotFoundException("Generated document not found");

    const parentCase = await this.assertCanEditParentCaseAndReturn(
      ctx,
      existing.caseId,
    );
    if (
      !this.permissionsService.canFinalizeCase(ctx.userId, ctx.role, parentCase)
    ) {
      throw new ForbiddenException(
        "Only the case owner or a manager can finalize generated documents",
      );
    }

    const dto = await this.generatedDocumentsService.update(
      ctx,
      id,
      { status: "final" },
      { skipTimelineWrite: true },
    );

    if (existing.status !== "final") {
      await this.generatedDocumentsService.writeTimeline(ctx, {
        caseId: existing.caseId,
        generatedDocumentId: id,
        action: "generated_document.finalized",
        extra: { title: existing.title },
      });
    }

    return dto;
  }

  /**
   * 导出生成文書（每次留痕，fileUrl 写占位 URL）。
   *
   * @param req HTTP 请求对象。
   * @param id 生成文書 ID。
   * @returns 更新后的 DTO。
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post(":id/export")
  async export(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const existing = await this.generatedDocumentsService.get(ctx, id);
    if (!existing) throw new NotFoundException("Generated document not found");

    await this.assertCanEditParentCase(ctx, existing.caseId);

    const placeholderFileUrl = `placeholder://generated-documents/${id}.${existing.outputFormat}`;

    const dto = await this.generatedDocumentsService.update(
      ctx,
      id,
      { status: "exported", fileUrl: placeholderFileUrl },
      { skipTimelineWrite: true },
    );

    await this.generatedDocumentsService.writeTimeline(ctx, {
      caseId: existing.caseId,
      generatedDocumentId: id,
      action: "generated_document.exported",
      extra: { title: existing.title, fileUrl: placeholderFileUrl },
    });

    return dto;
  }

  private async assertCanViewParentCase(
    ctx: RequestContext,
    caseId: string,
  ): Promise<void> {
    const caseEntity = await this.casesService.get(ctx, caseId);
    if (!caseEntity) {
      throw new NotFoundException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_CASE_NOT_FOUND +
          ": Parent case not found",
      );
    }
    if (
      !this.permissionsService.canViewCase(
        ctx.userId,
        ctx.role,
        ctx.groupId,
        caseEntity,
      )
    ) {
      throw new ForbiddenException(
        "Insufficient permissions to view this case's generated documents",
      );
    }
  }

  private async assertCanEditParentCase(
    ctx: RequestContext,
    caseId: string,
  ): Promise<void> {
    await this.assertCanEditParentCaseAndReturn(ctx, caseId);
  }

  private async assertCanEditParentCaseAndReturn(
    ctx: RequestContext,
    caseId: string,
  ): Promise<import("../model/coreEntities").Case> {
    const caseEntity = await this.casesService.get(ctx, caseId);
    if (!caseEntity) {
      throw new NotFoundException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_CASE_NOT_FOUND +
          ": Parent case not found",
      );
    }
    const stage = caseEntity.stage ?? caseEntity.status;
    if (stage === "S9") {
      throw new BadRequestException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_CASE_S9_READONLY +
          ": Parent case is archived (S9) and read-only",
      );
    }
    if (
      !this.permissionsService.canEditCase(
        ctx.userId,
        ctx.role,
        ctx.groupId,
        caseEntity,
      )
    ) {
      throw new ForbiddenException(
        "Insufficient permissions to edit this case's generated documents",
      );
    }
    return caseEntity;
  }
}
