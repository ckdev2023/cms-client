import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { Public } from "../../core/auth/auth.decorators";
import { isUuid } from "../../core/tenancy/uuid";
import { AppUserAuthGuard } from "../auth/appUserAuth.guard";
import type { AppUserContext } from "../auth/appUserAuth.service";
import { UserDocumentsService } from "./userDocuments.service";
import type { UserDocumentListInput } from "./userDocuments.service";

type UploadBody = {
  appUserId?: unknown;
  fileName?: unknown;
  docType?: unknown;
  leadId?: unknown;
  caseId?: unknown;
  orgId?: unknown;
  /** Base64-encoded file data (for JSON transport). */
  data?: unknown;
  contentType?: unknown;
};

type ListQuery = {
  appUserId?: unknown;
  leadId?: unknown;
  caseId?: unknown;
  page?: unknown;
  limit?: unknown;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new BadRequestException(`Invalid ${field}`);
  return value;
}

function parseOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;
  return requireString(value, field);
}

function parseUuid(value: unknown, field: string): string {
  const str = requireString(value, field);
  if (!isUuid(str)) throw new BadRequestException(`Invalid ${field}`);
  return str;
}

function parseOptionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return parseUuid(value, field);
}

function parseOptionalNullableUuid(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return parseUuid(value, field);
}

function parsePage(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.floor(n) < 1)
    throw new BadRequestException("Invalid page");
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

type HttpRequest = {
  headers?: Record<string, unknown>;
  appUserContext?: AppUserContext;
};

/**
 * UserDocuments 接口（需 AppUser JWT）。
 */
@Controller("user-documents")
export class UserDocumentsController {
  /**
   * 创建控制器。
   * @param userDocumentsService 文档服务
   */
  constructor(
    @Inject(UserDocumentsService)
    private readonly userDocumentsService: UserDocumentsService,
  ) {}

  /**
   * 上传文件（需 AppUser JWT）。
   * @param req HTTP 请求
   * @param body 请求体
   * @returns 创建的文档记录
   */
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Post("upload")
  async upload(@Req() req: HttpRequest, @Body() body: UploadBody) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const data = parseBase64Data(body.data);
    const fileName = sanitizeFileName(requireString(body.fileName, "fileName"));
    const contentType = parseContentType(body.contentType);

    return this.userDocumentsService.upload({
      appUserId: ctx.appUserId,
      fileName,
      docType: parseOptionalString(body.docType, "docType"),
      leadId: parseOptionalNullableUuid(body.leadId, "leadId"),
      caseId: parseOptionalNullableUuid(body.caseId, "caseId"),
      orgId: parseOptionalNullableUuid(body.orgId, "orgId"),
      data,
      contentType,
    });
  }

  /**
   * 查询文档列表（需 AppUser JWT，仅返回本人数据）。
   * @param req HTTP 请求
   * @param query 查询参数
   * @returns 分页结果
   */
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListQuery) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const input: UserDocumentListInput = {
      appUserId: ctx.appUserId,
      leadId: parseOptionalUuid(query.leadId, "leadId"),
      caseId: parseOptionalUuid(query.caseId, "caseId"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    };
    return this.userDocumentsService.list(input);
  }

  /**
   * 获取文档详情（需 AppUser JWT，仅允许访问本人数据）。
   * @param req HTTP 请求
   * @param id 文档 ID
   * @returns 文档详情
   */
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const doc = await this.userDocumentsService.get(parseUuid(id, "id"));
    if (!doc) throw new BadRequestException("Document not found");
    if (doc.appUserId !== ctx.appUserId)
      throw new UnauthorizedException("Cannot access other user's document");
    return doc;
  }

  /**
   * 获取签名下载 URL（需 AppUser JWT，仅允许访问本人数据）。
   * @param req HTTP 请求
   * @param id 文档 ID
   * @returns 签名 URL
   */
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Get(":id/download-url")
  async downloadUrl(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const parsedId = parseUuid(id, "id");
    const doc = await this.userDocumentsService.get(parsedId);
    if (!doc) throw new BadRequestException("Document not found");
    if (doc.appUserId !== ctx.appUserId)
      throw new UnauthorizedException("Cannot access other user's document");
    const url = await this.userDocumentsService.getDownloadUrl(parsedId);
    return { url, downloadUrl: url };
  }

  /**
   * 删除文档（需 AppUser JWT，仅允许删除本人数据）。
   * @param req HTTP 请求
   * @param id 文档 ID
   * @returns 操作结果
   */
  @Public()
  @UseGuards(AppUserAuthGuard)
  @Delete(":id")
  async remove(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.appUserContext;
    if (!ctx) throw new UnauthorizedException("Missing app user context");
    const parsedId = parseUuid(id, "id");
    const doc = await this.userDocumentsService.get(parsedId);
    if (!doc) throw new BadRequestException("Document not found");
    if (doc.appUserId !== ctx.appUserId)
      throw new UnauthorizedException("Cannot delete other user's document");
    await this.userDocumentsService.remove(parsedId);
    return { ok: true };
  }
}

// ── P0-3 安全辅助函数 ──

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_FILE_SIZE / 3) * 4;
const STRICT_BASE64_REGEX =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

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

function parseContentType(value: unknown): string {
  if (value === undefined) return "application/octet-stream";
  const contentType = requireString(value, "contentType");
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new BadRequestException("Invalid contentType");
  }
  return contentType;
}

function sanitizeFileName(raw: string): string {
  // 去除路径分隔符和危险字符，只保留安全字符
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
