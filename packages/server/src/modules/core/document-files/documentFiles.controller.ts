import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequireRoles } from "../auth/auth.decorators";
import type { DocumentFile } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { isUuid } from "../tenancy/uuid";
import { DocumentFilesService } from "./documentFiles.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type UploadBody = {
  requirementId?: unknown;
  fileName?: unknown;
  data?: unknown;
  contentType?: unknown;
  storageType?: unknown;
  relativePath?: unknown;
  expiryDate?: unknown;
};

type ReviewBody = {
  decision?: unknown;
};

type ListQuery = {
  requirementId?: unknown;
  page?: unknown;
  limit?: unknown;
};

type DocumentFileResponse = DocumentFile & {
  fileKey: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_FILE_SIZE / 3) * 4;
const STRICT_BASE64_REGEX =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const ISO_DATE_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/octet-stream",
]);

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}

function parseUuid(value: unknown, field: string): string {
  const str = requireString(value, field);
  if (!isUuid(str)) throw new BadRequestException(`Invalid ${field}`);
  return str;
}

function parseBase64Data(value: unknown): Buffer {
  const str = requireString(value, "data");
  const padding = str.endsWith("==") ? 2 : str.endsWith("=") ? 1 : 0;
  const estimatedSize = (str.length / 4) * 3 - padding;
  if (str.length > MAX_BASE64_LENGTH || estimatedSize > MAX_FILE_SIZE) {
    throw new BadRequestException("File too large (max 10MB)");
  }
  if (!STRICT_BASE64_REGEX.test(str)) {
    throw new BadRequestException("Invalid data");
  }
  const data = Buffer.from(str, "base64");
  if (data.length === 0) throw new BadRequestException("Invalid data");
  if (data.length > MAX_FILE_SIZE) {
    throw new BadRequestException("File too large (max 10MB)");
  }
  return data;
}

function parsePage(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.floor(n) < 1) {
    throw new BadRequestException("Invalid page");
  }
  return Math.floor(n);
}

function parseLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid limit");
  const i = Math.floor(n);
  if (i < 1 || i > 200) throw new BadRequestException("Invalid limit");
  return i;
}

function parseDecision(value: unknown): "approve" | "reject" {
  if (value === "approve" || value === "reject") return value;
  throw new BadRequestException("Invalid decision");
}

function parseContentType(value: unknown): string {
  const contentType = requireString(value, "contentType");
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new BadRequestException("Invalid contentType");
  }
  return contentType;
}

function parseOptionalContentType(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return parseContentType(value);
}

function parseOptionalDateOnly(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const str = requireString(value, field);
  if (!ISO_DATE_REGEX.test(str)) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  const date = new Date(`${str}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== str) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return str;
}

function sanitizeFileName(raw: string): string {
  const cleaned = raw
    .replace(/[/\\]/g, "_")
    .replace(/\.\./g, "_")
    .replace(/[^\w.\-() ]/g, "_")
    .trim();
  if (cleaned.length === 0 || cleaned.length > 255) {
    throw new BadRequestException("Invalid fileName");
  }
  return cleaned;
}

function toDocumentFileResponse(file: DocumentFile): DocumentFileResponse {
  return {
    ...file,
    fileKey: file.fileUrl ?? file.relativePath ?? "",
  };
}

/**
 * DocumentFiles API 控制器。
 */
@Controller("document-files")
export class DocumentFilesController {
  /**
   * 构造函数。
   * @param documentFilesService 资料文件服务
   */
  constructor(
    @Inject(DocumentFilesService)
    private readonly documentFilesService: DocumentFilesService,
  ) {}

  /**
   * 上传资料文件。
   * @param req HTTP 请求对象
   * @param body 上传请求体
   * @returns 创建后的资料文件
   */
  @RequireRoles("staff")
  @Post("upload")
  async upload(@Req() req: HttpRequest, @Body() body: UploadBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const created = await this.documentFilesService.upload(ctx, {
      requirementId: parseUuid(body.requirementId, "requirementId"),
      fileName: sanitizeFileName(requireString(body.fileName, "fileName")),
      data: body.data === undefined ? undefined : parseBase64Data(body.data),
      contentType: parseOptionalContentType(body.contentType),
      storageType:
        typeof body.storageType === "string" ? body.storageType : undefined,
      relativePath:
        typeof body.relativePath === "string" ? body.relativePath : undefined,
      expiryDate: parseOptionalDateOnly(body.expiryDate, "expiryDate"),
    });
    return toDocumentFileResponse(created);
  }

  /**
   * 获取资料文件列表。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 文件列表
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const result = await this.documentFilesService.list(ctx, {
      requirementId: parseUuid(query.requirementId, "requirementId"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
    return {
      ...result,
      items: result.items.map(toDocumentFileResponse),
    };
  }

  /**
   * 获取单个资料文件。
   * @param req HTTP 请求对象
   * @param id 文件 ID
   * @returns 文件详情
   */
  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const item = await this.documentFilesService.get(ctx, parseUuid(id, "id"));
    if (!item) throw new BadRequestException("Document file not found");
    return toDocumentFileResponse(item);
  }

  /**
   * 审核资料文件。
   * @param req HTTP 请求对象
   * @param id 文件 ID
   * @param body 审核请求体
   * @returns 审核后的文件
   */
  @RequireRoles("manager")
  @Patch(":id/review")
  async review(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: ReviewBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const reviewed = await this.documentFilesService.review(
      ctx,
      parseUuid(id, "id"),
      {
        decision: parseDecision(body.decision),
      },
    );
    return toDocumentFileResponse(reviewed);
  }

  /**
   * 删除资料文件。
   * @param req HTTP 请求对象
   * @param id 文件 ID
   * @returns 删除结果
   */
  @RequireRoles("manager")
  @Delete(":id")
  async remove(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    await this.documentFilesService.remove(ctx, parseUuid(id, "id"));
    return { ok: true };
  }
}
