import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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

import { RequirePermission } from "../auth/auth.decorators";
import { PERMISSION_CODES } from "../auth/permissions.codes";
import { PermissionsService } from "../auth/permissions.service";
import { CasesService } from "../cases/cases.service";
import { GENERATED_DOCUMENT_ERROR_CODES } from "../cases/cases.types-generated-docs";
import type { RequestContext } from "../tenancy/requestContext";
import { GeneratedDocumentsService } from "./generatedDocuments.service";
import { isValidExternalUrl } from "./generatedDocuments.helpers";
import {
  REDIS_CLIENT,
  type RedisClient,
} from "../../../infra/redis/createRedisClient";
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
  /**
   * DI コンストラクタ。
   *
   * @param generatedDocumentsService - 生成文書サービス
   * @param casesService - 案件サービス
   * @param permissionsService - 権限サービス
   * @param _redisClient - Redis クライアント（保留注入以兼容 Module providers）
   * @param storageAdapter - 文書ファイルのストレージアダプター（レガシーダウンロード用）
   */
  constructor(
    @Inject(GeneratedDocumentsService)
    private readonly generatedDocumentsService: GeneratedDocumentsService,
    @Inject(CasesService)
    private readonly casesService: CasesService,
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
    @Inject(REDIS_CLIENT)
    _redisClient: RedisClient,
    @Inject(STORAGE_ADAPTER)
    private readonly storageAdapter: StorageAdapter,
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
   * 下载生成文书的文件内容（须父案件 view 权限）。
   *
   * 仅限遗留导出数据：`status = 'exported'` 且 `file_url` 为内部 storage key。
   * 外部资源链接（http/https）不通过此端点下载，前端直接打开外链。
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

    if (!dto.fileUrl) {
      throw new NotFoundException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_FILE_NOT_AVAILABLE +
          ": No file associated with this document",
      );
    }

    if (isExternalUrl(dto.fileUrl)) {
      throw new BadRequestException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_FILE_USE_EXTERNAL_URL +
          ": This document uses an external URL; open it directly instead of downloading",
      );
    }

    if (dto.status !== "exported") {
      throw new NotFoundException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_FILE_NOT_AVAILABLE +
          ": File download is only available for legacy exported documents",
      );
    }

    if (dto.fileUrl.startsWith("placeholder://")) {
      throw new GoneException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_FILE_PLACEHOLDER_LEGACY +
          ": Legacy placeholder file is no longer available",
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

    if (!isValidExternalUrl(existing.fileUrl)) {
      throw new BadRequestException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_EXTERNAL_URL_REQUIRED +
          ": file_url must be a valid http(s) external URL before finalizing",
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
   * 删除草稿生成文书（须案件 edit 权限；仅 `draft` 可删）。
   *
   * @param req HTTP 请求对象。
   * @param id 生成文书 ID。
   * @returns 已删除资源 ID。
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Delete(":id")
  async remove(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const existing = await this.generatedDocumentsService.get(ctx, id);
    if (!existing) throw new NotFoundException("Generated document not found");

    await this.assertCanEditParentCase(ctx, existing.caseId);

    await this.generatedDocumentsService.deleteDraft(ctx, existing);
    return { id: existing.id };
  }

  /**
   * 导出端点（已弃用）— 返回 410 Gone。
   *
   * @deprecated 导出流水线已弃用。外部文书登记主路径为 draft → final，
   * file_url 存放运营资源服务器上的外链，不再提供系统内导出。
   * @param req - HTTP 请求
   * @returns never — 始终抛出 GoneException
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post(":id/export")
  // eslint-disable-next-line @typescript-eslint/require-await
  async export(@Req() req: HttpRequest): Promise<never> {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    throw new GoneException(
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      GENERATED_DOCUMENT_ERROR_CODES.GD_EXPORT_DEPRECATED +
        ": The export pipeline has been deprecated; register external document URLs instead",
    );
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

function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
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
