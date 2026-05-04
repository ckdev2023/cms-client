/* eslint-disable jsdoc/require-description, jsdoc/require-param-description, jsdoc/require-returns */
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
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { RequireRoles } from "../auth/auth.decorators";
import { PermissionsService } from "../auth/permissions.service";
import { CasesService } from "../cases/cases.service";
import { VALIDATION_SUBMISSION_ERROR_CODES } from "../cases/cases.types";
import { SubmissionPackagesService } from "./submissionPackages.service";
function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value;
}
function parseOptionalNullableString(value, field) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireString(value, field);
}
function parseOptionalTimestamp(value, field) {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = requireString(value, field);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime()))
    throw new BadRequestException(`Invalid ${field}`);
  return date.toISOString();
}
function parsePage(value) {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1)
    throw new BadRequestException("Invalid page");
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
function parseSnapshotPayload(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  throw new BadRequestException("Invalid snapshotPayload");
}
function parseItems(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadRequestException("items is required");
  }
  return value;
}
/**
 * 提交包 CRUD — 资源级鉴权委托给父案件。
 */
let SubmissionPackagesController = class SubmissionPackagesController {
  submissionPackagesService;
  casesService;
  permissionsService;
  /**
   * @param submissionPackagesService 提交包服务
   * @param casesService 案件服务（查找父案件用于鉴权）
   * @param permissionsService 权限服务
   */
  constructor(submissionPackagesService, casesService, permissionsService) {
    this.submissionPackagesService = submissionPackagesService;
    this.casesService = casesService;
    this.permissionsService = permissionsService;
  }
  /**
   * 创建提交包（须父案件 edit 权限）。
   * @param req
   * @param body
   */
  async create(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const caseId = requireString(body.caseId, "caseId");
    await this.assertCanEditParentCase(ctx, caseId);
    return this.submissionPackagesService.create(ctx, {
      caseId,
      submissionKind:
        parseOptionalNullableString(body.submissionKind, "submissionKind") ??
        undefined,
      submittedAt: parseOptionalTimestamp(body.submittedAt, "submittedAt"),
      validationRunId: parseOptionalNullableString(
        body.validationRunId,
        "validationRunId",
      ),
      reviewRecordId: parseOptionalNullableString(
        body.reviewRecordId,
        "reviewRecordId",
      ),
      authorityName: parseOptionalNullableString(
        body.authorityName,
        "authorityName",
      ),
      acceptanceNo: parseOptionalNullableString(
        body.acceptanceNo,
        "acceptanceNo",
      ),
      receiptStorageType: parseOptionalNullableString(
        body.receiptStorageType,
        "receiptStorageType",
      ),
      receiptRelativePathOrKey: parseOptionalNullableString(
        body.receiptRelativePathOrKey,
        "receiptRelativePathOrKey",
      ),
      relatedSubmissionId: parseOptionalNullableString(
        body.relatedSubmissionId,
        "relatedSubmissionId",
      ),
      items: parseItems(body.items).map((item) => ({
        itemType: requireString(item.itemType, "itemType"),
        refId: requireString(item.refId, "refId"),
        snapshotPayload: parseSnapshotPayload(item.snapshotPayload),
      })),
    });
  }
  /**
   * 列表查询（须父案件 view 权限）。
   * @param req
   * @param query
   */
  async list(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const caseId =
      query.caseId === undefined
        ? undefined
        : requireString(query.caseId, "caseId");
    if (caseId) {
      await this.assertCanViewParentCase(ctx, caseId);
    }
    return this.submissionPackagesService.list(ctx, {
      caseId,
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }
  /**
   * 获取单条提交包。
   * @param req
   * @param id
   */
  async get(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const result = await this.submissionPackagesService.get(ctx, id);
    if (!result) {
      throw new NotFoundException(
        VALIDATION_SUBMISSION_ERROR_CODES.SP_NOT_FOUND +
          ": Submission package not found",
      );
    }
    await this.assertCanViewParentCase(ctx, result.caseId);
    return result;
  }
  async assertCanViewParentCase(ctx, caseId) {
    const caseEntity = await this.casesService.get(ctx, caseId);
    if (!caseEntity) {
      throw new NotFoundException(
        VALIDATION_SUBMISSION_ERROR_CODES.SP_CASE_NOT_FOUND +
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
        "Insufficient permissions to view this case's submission packages",
      );
    }
  }
  async assertCanEditParentCase(ctx, caseId) {
    const caseEntity = await this.casesService.get(ctx, caseId);
    if (!caseEntity) {
      throw new NotFoundException(
        VALIDATION_SUBMISSION_ERROR_CODES.SP_CASE_NOT_FOUND +
          ": Parent case not found",
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
        "Insufficient permissions to edit this case's submission packages",
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
  SubmissionPackagesController.prototype,
  "create",
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
  SubmissionPackagesController.prototype,
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
  SubmissionPackagesController.prototype,
  "get",
  null,
);
SubmissionPackagesController = __decorate(
  [
    Controller("submission-packages"),
    __param(0, Inject(SubmissionPackagesService)),
    __param(1, Inject(CasesService)),
    __param(2, Inject(PermissionsService)),
    __metadata("design:paramtypes", [
      SubmissionPackagesService,
      CasesService,
      PermissionsService,
    ]),
  ],
  SubmissionPackagesController,
);
export { SubmissionPackagesController };
//# sourceMappingURL=submissionPackages.controller.js.map
