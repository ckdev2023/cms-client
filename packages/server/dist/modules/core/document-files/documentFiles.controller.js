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
  Body,
  Controller,
  Delete,
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
import { RequireRoles } from "../auth/auth.decorators";
import { CasesService } from "../cases/cases.service";
import { DOCUMENT_FILE_ERROR_CODES } from "../documents.types";
import { isUuid } from "../tenancy/uuid";
import { DocumentItemsService } from "../document-items/documentItems.service";
import { DocumentFilesService } from "./documentFiles.service";
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
function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}
function parseUuid(value, field) {
  const str = requireString(value, field);
  if (!isUuid(str)) throw new BadRequestException(`Invalid ${field}`);
  return str;
}
function parseBase64Data(value) {
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
function parsePage(value) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.floor(n) < 1) {
    throw new BadRequestException("Invalid page");
  }
  return Math.floor(n);
}
function parseLimit(value) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid limit");
  const i = Math.floor(n);
  if (i < 1 || i > 200) throw new BadRequestException("Invalid limit");
  return i;
}
function parseDecision(value) {
  if (value === "approve" || value === "reject") return value;
  throw new BadRequestException("Invalid decision");
}
function parseContentType(value) {
  const contentType = requireString(value, "contentType");
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new BadRequestException("Invalid contentType");
  }
  return contentType;
}
function parseOptionalContentType(value) {
  if (value === undefined) return undefined;
  return parseContentType(value);
}
function parseOptionalDateOnly(value, field) {
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
function sanitizeFileName(raw) {
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
function toDocumentFileResponse(file) {
  return {
    ...file,
    fileKey: file.fileUrl ?? file.relativePath ?? "",
  };
}
/**
 * DocumentFiles API 控制器。
 */
let DocumentFilesController = class DocumentFilesController {
  documentFilesService;
  documentItemsService;
  casesService;
  /**
   * 构造函数。
   * @param documentFilesService 资料文件服务
   * @param documentItemsService 资料项服务（S9 守卫用）
   * @param casesService 案件服务（S9 守卫用）
   */
  constructor(documentFilesService, documentItemsService, casesService) {
    this.documentFilesService = documentFilesService;
    this.documentItemsService = documentItemsService;
    this.casesService = casesService;
  }
  /**
   * 上传资料文件。
   * @param req HTTP 请求对象
   * @param body 上传请求体
   * @returns 创建后的资料文件
   */
  async upload(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const requirementId = parseUuid(body.requirementId, "requirementId");
    await this.assertRequirementCaseNotS9(ctx, requirementId);
    const created = await this.documentFilesService.upload(ctx, {
      requirementId,
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
  async list(req, query) {
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
  async get(req, id) {
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
  async review(req, id, body) {
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
  async remove(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    await this.documentFilesService.remove(ctx, parseUuid(id, "id"));
    return { ok: true };
  }
  async assertRequirementCaseNotS9(ctx, requirementId) {
    const item = await this.documentItemsService.get(ctx, requirementId);
    if (!item) {
      throw new NotFoundException(
        DOCUMENT_FILE_ERROR_CODES.REQUIREMENT_NOT_FOUND +
          ": Document requirement not found",
      );
    }
    const caseEntity = await this.casesService.get(ctx, item.caseId);
    if (!caseEntity) {
      throw new NotFoundException(
        DOCUMENT_FILE_ERROR_CODES.REQUIREMENT_NOT_FOUND +
          ": Parent case not found",
      );
    }
    const stage = caseEntity.stage ?? caseEntity.status;
    if (stage === "S9") {
      throw new BadRequestException(
        DOCUMENT_FILE_ERROR_CODES.CASE_S9_READONLY +
          ": Parent case is archived (S9) and read-only",
      );
    }
  }
};
__decorate(
  [
    RequireRoles("staff"),
    Post("upload"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  DocumentFilesController.prototype,
  "upload",
  null,
);
__decorate(
  [
    RequireRoles("viewer"),
    Get(),
    __param(0, Req()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  DocumentFilesController.prototype,
  "list",
  null,
);
__decorate(
  [
    RequireRoles("viewer"),
    Get(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  DocumentFilesController.prototype,
  "get",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Patch(":id/review"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  DocumentFilesController.prototype,
  "review",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Delete(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  DocumentFilesController.prototype,
  "remove",
  null,
);
DocumentFilesController = __decorate(
  [
    Controller("document-files"),
    __param(0, Inject(DocumentFilesService)),
    __param(1, Inject(DocumentItemsService)),
    __param(2, Inject(CasesService)),
    __metadata("design:paramtypes", [
      DocumentFilesService,
      DocumentItemsService,
      CasesService,
    ]),
  ],
  DocumentFilesController,
);
export { DocumentFilesController };
//# sourceMappingURL=documentFiles.controller.js.map
