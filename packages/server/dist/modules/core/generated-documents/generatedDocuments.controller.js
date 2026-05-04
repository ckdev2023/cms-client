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
import { RequireRoles } from "../auth/auth.decorators";
import { PermissionsService } from "../auth/permissions.service";
import { CasesService } from "../cases/cases.service";
import { GENERATED_DOCUMENT_ERROR_CODES } from "../cases/cases.types-generated-docs";
import { GeneratedDocumentsService } from "./generatedDocuments.service";
function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value;
}
function optionalString(value, field) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  throw new BadRequestException(`Invalid ${field}`);
}
function optionalNullableString(value, field) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  throw new BadRequestException(`Invalid ${field}`);
}
function parsePage(value) {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) {
    throw new BadRequestException("Invalid page");
  }
  return Math.floor(num);
}
function parseLimit(value) {
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
let GeneratedDocumentsController = class GeneratedDocumentsController {
  generatedDocumentsService;
  casesService;
  permissionsService;
  /**
   * 构造函数。
   * @param generatedDocumentsService 生成文书服务。
   * @param casesService 案件服务（查找父案件用于鉴权）。
   * @param permissionsService 权限服务。
   */
  constructor(generatedDocumentsService, casesService, permissionsService) {
    this.generatedDocumentsService = generatedDocumentsService;
    this.casesService = casesService;
    this.permissionsService = permissionsService;
  }
  /**
   * 列出指定案件的生成文书（须父案件 view 权限）。
   * @param req HTTP 请求对象。
   * @param query 查询参数。
   * @returns 分页结果。
   */
  async list(req, query) {
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
  async get(req, id) {
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
  async create(req, body) {
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
  async update(req, id, body) {
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
  async assertCanViewParentCase(ctx, caseId) {
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
  async assertCanEditParentCase(ctx, caseId) {
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
  }
};
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
  GeneratedDocumentsController.prototype,
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
  GeneratedDocumentsController.prototype,
  "get",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  GeneratedDocumentsController.prototype,
  "create",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Patch(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  GeneratedDocumentsController.prototype,
  "update",
  null,
);
GeneratedDocumentsController = __decorate(
  [
    Controller("generated-documents"),
    __param(0, Inject(GeneratedDocumentsService)),
    __param(1, Inject(CasesService)),
    __param(2, Inject(PermissionsService)),
    __metadata("design:paramtypes", [
      GeneratedDocumentsService,
      CasesService,
      PermissionsService,
    ]),
  ],
  GeneratedDocumentsController,
);
export { GeneratedDocumentsController };
//# sourceMappingURL=generatedDocuments.controller.js.map
