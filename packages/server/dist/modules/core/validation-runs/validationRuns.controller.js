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
import { ValidationRunsService } from "./validationRuns.service";
function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value;
}
function parseOptionalObject(value, field) {
  if (value === undefined) return undefined;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
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
 * 校验运行 CRUD — 资源级鉴权委托给父案件。
 */
let ValidationRunsController = class ValidationRunsController {
  validationRunsService;
  casesService;
  permissionsService;
  /**
   * 构造函数。
   * @param validationRunsService 校验运行服务
   * @param casesService 案件服务（查找父案件用于鉴权）
   * @param permissionsService 权限服务
   */
  constructor(validationRunsService, casesService, permissionsService) {
    this.validationRunsService = validationRunsService;
    this.casesService = casesService;
    this.permissionsService = permissionsService;
  }
  /**
   * 创建新的校验运行（须父案件 edit 权限且非 S9）。
   * @param req 当前请求对象。
   * @param body 请求体。
   * @returns 新建的校验运行记录。
   */
  async create(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const caseId = requireString(body.caseId, "caseId");
    await this.assertCanEditParentCase(ctx, caseId);
    const input = {
      caseId,
      rulesetRef: parseOptionalObject(body.rulesetRef, "rulesetRef"),
    };
    return this.validationRunsService.create(ctx, input);
  }
  /**
   * 列出校验运行记录（须父案件 view 权限）。
   * @param req 当前请求对象。
   * @param query 查询参数。
   * @returns 分页结果。
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
    return this.validationRunsService.list(ctx, {
      caseId,
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }
  /**
   * 获取单条校验运行记录。
   * @param req 当前请求对象。
   * @param id 校验运行 ID。
   * @returns 单条校验运行记录。
   */
  async get(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const result = await this.validationRunsService.get(ctx, id);
    if (!result) throw new NotFoundException("Validation run not found");
    await this.assertCanViewParentCase(ctx, result.caseId);
    return result;
  }
  async assertCanViewParentCase(ctx, caseId) {
    const caseEntity = await this.casesService.get(ctx, caseId);
    if (!caseEntity) {
      throw new NotFoundException(
        VALIDATION_SUBMISSION_ERROR_CODES.VR_CASE_NOT_FOUND +
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
        "Insufficient permissions to view this case's validation runs",
      );
    }
  }
  async assertCanEditParentCase(ctx, caseId) {
    const caseEntity = await this.casesService.get(ctx, caseId);
    if (!caseEntity) {
      throw new NotFoundException(
        VALIDATION_SUBMISSION_ERROR_CODES.VR_CASE_NOT_FOUND +
          ": Parent case not found",
      );
    }
    const stage = caseEntity.stage ?? caseEntity.status;
    if (stage === "S9") {
      throw new BadRequestException(
        VALIDATION_SUBMISSION_ERROR_CODES.VR_CASE_S9_READONLY +
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
        "Insufficient permissions to edit this case's validation runs",
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
  ValidationRunsController.prototype,
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
  ValidationRunsController.prototype,
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
  ValidationRunsController.prototype,
  "get",
  null,
);
ValidationRunsController = __decorate(
  [
    Controller("validation-runs"),
    __param(0, Inject(ValidationRunsService)),
    __param(1, Inject(CasesService)),
    __param(2, Inject(PermissionsService)),
    __metadata("design:paramtypes", [
      ValidationRunsService,
      CasesService,
      PermissionsService,
    ]),
  ],
  ValidationRunsController,
);
export { ValidationRunsController };
//# sourceMappingURL=validationRuns.controller.js.map
