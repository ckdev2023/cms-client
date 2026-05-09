import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  GoneException,
  Header,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UnauthorizedException,
} from "@nestjs/common";
import crypto from "node:crypto";

import { RequirePermission } from "../auth/auth.decorators";
import { PERMISSION_CODES } from "../auth/permissions.codes";
import { PermissionsService } from "../auth/permissions.service";
import { CasesService } from "../cases/cases.service";
import { GENERATED_DOCUMENT_ERROR_CODES } from "../cases/cases.types-generated-docs";
import type { RequestContext } from "../tenancy/requestContext";
import { GeneratedDocumentsService } from "./generatedDocuments.service";
import {
  GENERATED_DOC_EXPORT_QUEUE,
  type GeneratedDocExportJobPayload,
} from "../jobs/handlers/generatedDocExportHandler";
import {
  REDIS_CLIENT,
  type RedisClient,
} from "../../../infra/redis/createRedisClient";
import { RedisQueue } from "../../../infra/queue/redisQueue";
import {
  STORAGE_ADAPTER,
  type StorageAdapter,
} from "../../../infra/storage/storageAdapter";

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
  private readonly queue: RedisQueue;

  /**
   * DI コンストラクタ。
   *
   * @param generatedDocumentsService - 生成文書サービス
   * @param casesService - 案件サービス
   * @param permissionsService - 権限サービス
   * @param redisClient - Redis クライアント
   * @param storageAdapter - 文書ファイルのストレージアダプター（ローカルまたは S3）
   */
  constructor(
    @Inject(GeneratedDocumentsService)
    private readonly generatedDocumentsService: GeneratedDocumentsService,
    @Inject(CasesService)
    private readonly casesService: CasesService,
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
    @Inject(REDIS_CLIENT)
    redisClient: RedisClient,
    @Inject(STORAGE_ADAPTER)
    private readonly storageAdapter: StorageAdapter,
  ) {
    this.queue = new RedisQueue(redisClient);
  }

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
   * 下载生成文书的文件内容（须父案件 view 权限）。
   *
   * 仅在 `status = 'exported'` 且 `file_url` 为有效 storage key 时返回内容。
   * 历史 placeholder URL 返回 410 Gone。
   *
   * @param req - HTTP 请求
   * @param id - 生成文書 ID
   * @returns 流式文件
   */
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get(":id/file")
  @Header("Cache-Control", "no-store")
  async downloadFile(
    @Req() req: HttpRequest,
    @Param("id") id: string,
  ): Promise<StreamableFile> {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const dto = await this.generatedDocumentsService.getDto(ctx, id);
    if (!dto) throw new NotFoundException("Generated document not found");

    await this.assertCanViewParentCase(ctx, dto.caseId);

    if (dto.status !== "exported" || !dto.fileUrl) {
      throw new NotFoundException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_FILE_NOT_AVAILABLE +
          ": Generated document is not yet exported",
      );
    }

    if (dto.fileUrl.startsWith("placeholder://")) {
      throw new GoneException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_FILE_PLACEHOLDER_LEGACY +
          ": Legacy placeholder file is no longer available; please re-export",
      );
    }

    const buffer = await this.storageAdapter.download(dto.fileUrl);
    const ext = resolveExtensionFromFormat(dto.outputFormat);
    const filename = buildDownloadFilename(dto.title, ext);
    return new StreamableFile(buffer, {
      type: resolveContentTypeFromExt(ext),
      disposition: `attachment; filename="${encodeURIComponent(filename)}"`,
    });
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
   * 导出生成文書 — 入队异步渲染，立即返回 `exporting` 状态。
   *
   * 幂等守卫：已在 `exporting` 状态时返回 409。
   * 重试入口：`export_failed` 状态允许重新入队。
   *
   * @param req - HTTP 请求
   * @param id - 生成文書 ID
   * @returns 更新后 DTO
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post(":id/export")
  async export(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const existing = await this.generatedDocumentsService.get(ctx, id);
    if (!existing) throw new NotFoundException("Generated document not found");

    await this.assertCanEditParentCase(ctx, existing.caseId);

    if (existing.status === "exporting") {
      throw new ConflictException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_EXPORT_IN_PROGRESS +
          ": Export is already in progress",
      );
    }

    const dto = await this.generatedDocumentsService.update(
      ctx,
      id,
      { status: "exporting" },
      { skipTimelineWrite: true },
    );

    const jobPayload: GeneratedDocExportJobPayload = {
      orgId: ctx.orgId,
      userId: ctx.userId,
      generatedDocumentId: id,
      caseId: existing.caseId,
      templateId: existing.templateId,
      templateVersionNo: existing.templateVersionNoSnapshot,
      outputFormat: existing.outputFormat,
      title: existing.title,
    };

    await this.queue.enqueue<GeneratedDocExportJobPayload>(
      GENERATED_DOC_EXPORT_QUEUE,
      {
        id: crypto.randomUUID(),
        name: "generated_doc_export",
        payload: jobPayload,
        createdAt: new Date().toISOString(),
      },
    );

    await this.generatedDocumentsService.writeTimeline(ctx, {
      caseId: existing.caseId,
      generatedDocumentId: id,
      action: "generated_document.export_queued",
      extra: { title: existing.title },
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

function resolveExtensionFromFormat(format: string): string {
  if (format === "docx" || format === "xlsx") return format;
  return "pdf";
}

function resolveContentTypeFromExt(ext: string): string {
  switch (ext) {
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "application/pdf";
  }
}

function buildDownloadFilename(title: string, ext: string): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, "_").trim();
  const base = safe.length > 0 ? safe : "document";
  return `${base}.${ext}`;
}
