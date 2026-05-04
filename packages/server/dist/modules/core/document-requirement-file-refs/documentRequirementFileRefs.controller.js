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
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { RequireRoles } from "../auth/auth.decorators";
import { CasesService } from "../cases/cases.service";
import { DocumentItemsService } from "../document-items/documentItems.service";
import { isUuid } from "../tenancy/uuid";
import { DocumentRequirementFileRefsService } from "./documentRequirementFileRefs.service";
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
function parseOptionalUuid(value, field) {
  if (value === undefined || value === null) return undefined;
  return parseUuid(value, field);
}
function parseLimit(value) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid limit");
  const i = Math.floor(n);
  if (i < 1 || i > 200) throw new BadRequestException("Invalid limit");
  return i;
}
function parseBooleanQuery(value) {
  return value === "true" || value === "1";
}
/**
 * DocumentRequirementFileRefs API 控制器。
 *
 * 端点：
 * - POST   /document-requirement-file-refs（引用既有版本，cross_case_link）
 * - GET    /document-requirement-file-refs?requirementId=...&candidates=true（跨案件候选）
 * - GET    /document-requirement-file-refs?requirementId=...（按资料项列出引用）
 * - DELETE /document-requirement-file-refs/:id（撤销引用）
 */
let DocumentRequirementFileRefsController = class DocumentRequirementFileRefsController {
  refsService;
  documentItemsService;
  casesService;
  /**
   * 构造函数。
   * @param refsService 引用服务
   * @param documentItemsService 资料项服务（S9 守卫用）
   * @param casesService 案件服务（S9 守卫用）
   */
  constructor(refsService, documentItemsService, casesService) {
    this.refsService = refsService;
    this.documentItemsService = documentItemsService;
    this.casesService = casesService;
  }
  /**
   * 引用既有文件版本（cross_case_link）。
   * @param req HTTP 请求对象
   * @param body 引用请求体
   * @returns 创建的引用记录
   */
  async link(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const requirementId = parseUuid(body.requirementId, "requirementId");
    await this.assertRequirementCaseNotS9(ctx, requirementId);
    return this.refsService.link(ctx, {
      requirementId,
      fileVersionId: parseUuid(body.fileVersionId, "fileVersionId"),
      linkedFromRequirementId: parseOptionalUuid(
        body.linkedFromRequirementId,
        "linkedFromRequirementId",
      ),
    });
  }
  /**
   * 列出引用记录或跨案件候选版本。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 引用列表或候选列表
   */
  async list(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const requirementId = parseUuid(query.requirementId, "requirementId");
    if (parseBooleanQuery(query.candidates)) {
      return this.refsService.listCandidates(
        ctx,
        requirementId,
        parseLimit(query.limit),
      );
    }
    return this.refsService.listByRequirement(ctx, requirementId);
  }
  /**
   * 撤销引用（须通过 S9 守卫 + submission package 锁定守卫）。
   * @param req HTTP 请求对象
   * @param id 引用记录 ID
   * @returns 删除结果
   */
  async unlink(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const refId = parseUuid(id, "id");
    const existing = await this.refsService.get(ctx, refId);
    if (!existing) throw new NotFoundException("Reference not found");
    await this.assertRequirementCaseNotS9(ctx, existing.requirementId);
    await this.refsService.unlink(ctx, refId);
    return { ok: true };
  }
  async assertRequirementCaseNotS9(ctx, requirementId) {
    const item = await this.documentItemsService.get(ctx, requirementId);
    if (!item) {
      throw new NotFoundException("Document requirement not found");
    }
    const caseEntity = await this.casesService.get(ctx, item.caseId);
    if (!caseEntity) {
      throw new NotFoundException("Parent case not found");
    }
    const stage = caseEntity.stage ?? caseEntity.status;
    if (stage === "S9") {
      throw new BadRequestException(
        "Parent case is archived (S9) and read-only",
      );
    }
  }
};
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
  DocumentRequirementFileRefsController.prototype,
  "link",
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
  DocumentRequirementFileRefsController.prototype,
  "list",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Delete(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  DocumentRequirementFileRefsController.prototype,
  "unlink",
  null,
);
DocumentRequirementFileRefsController = __decorate(
  [
    Controller("document-requirement-file-refs"),
    __param(0, Inject(DocumentRequirementFileRefsService)),
    __param(1, Inject(DocumentItemsService)),
    __param(2, Inject(CasesService)),
    __metadata("design:paramtypes", [
      DocumentRequirementFileRefsService,
      DocumentItemsService,
      CasesService,
    ]),
  ],
  DocumentRequirementFileRefsController,
);
export { DocumentRequirementFileRefsController };
//# sourceMappingURL=documentRequirementFileRefs.controller.js.map
