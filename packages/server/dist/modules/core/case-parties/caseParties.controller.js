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
import { CASE_WRITE_ERROR_CODES } from "../cases/cases.types";
import { RequireRoles } from "../auth/auth.decorators";
import { PermissionsService } from "../auth/permissions.service";
import { CasesService } from "../cases/cases.service";
import { CasePartiesService } from "./caseParties.service";
function requireString(value, name) {
  if (typeof value !== "string" || value.length === 0)
    throw new BadRequestException(`${name} is required`);
  return value;
}
function parseOptionalNullableString(value, name) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  throw new BadRequestException(`Invalid ${name}`);
}
function parseOptionalBoolean(value) {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  return undefined;
}
function parsePage(value) {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : undefined;
}
function parseLimit(value) {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : undefined;
}
/**
 * CaseParties CRUD 接口。
 *
 * 所有端点均要求父案件存在，并通过 PermissionsService 执行资源级鉴权。
 * GET 列表强制要求 caseId，禁止裸列表查询。
 */
let CasePartiesController = class CasePartiesController {
  casePartiesService;
  casesService;
  permissionsService;
  /**
   *
   * @param casePartiesService
   * @param casesService
   * @param permissionsService
   */
  /**
   * 构造函数。
   * @param casePartiesService 案件关联人服务
   * @param casesService 案件服务（查找父案件用于资源级鉴权）
   * @param permissionsService 权限服务
   */
  constructor(casePartiesService, casesService, permissionsService) {
    this.casePartiesService = casePartiesService;
    this.casesService = casesService;
    this.permissionsService = permissionsService;
  }
  /**
   * 添加关联人到案件。
   * @param req HTTP 请求对象
   * @param body 创建请求体
   * @returns 创建成功的关联人信息
   */
  async create(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const caseId = requireString(body.caseId, "caseId");
    await this.assertCanEditParentCase(ctx, caseId);
    return this.casePartiesService.create(ctx, {
      caseId,
      partyType: requireString(body.partyType, "partyType"),
      customerId: parseOptionalNullableString(body.customerId, "customerId"),
      contactPersonId: parseOptionalNullableString(
        body.contactPersonId,
        "contactPersonId",
      ),
      relationToCase: parseOptionalNullableString(
        body.relationToCase,
        "relationToCase",
      ),
      isPrimary: parseOptionalBoolean(body.isPrimary),
    });
  }
  /**
   * 按 caseId 列表查询关联人（caseId 必填）。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 关联人列表
   */
  async list(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const caseId = requireString(query.caseId, "caseId");
    await this.assertCanViewParentCase(ctx, caseId);
    return this.casePartiesService.list(ctx, {
      caseId,
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }
  /**
   * 更新关联人。
   * @param req HTTP 请求对象
   * @param id 关联人 ID
   * @param body 更新请求体
   * @returns 更新后的关联人信息
   */
  async update(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const party = await this.casePartiesService.get(ctx, id);
    if (!party) throw new NotFoundException("Case party not found");
    await this.assertCanEditParentCase(ctx, party.caseId);
    return this.casePartiesService.update(ctx, id, {
      partyType:
        body.partyType !== undefined
          ? requireString(body.partyType, "partyType")
          : undefined,
      customerId: parseOptionalNullableString(body.customerId, "customerId"),
      contactPersonId: parseOptionalNullableString(
        body.contactPersonId,
        "contactPersonId",
      ),
      relationToCase: parseOptionalNullableString(
        body.relationToCase,
        "relationToCase",
      ),
      isPrimary: parseOptionalBoolean(body.isPrimary),
    });
  }
  /**
   * 硬删除关联人。
   * @param req HTTP 请求对象
   * @param id 关联人 ID
   * @returns 删除成功状态
   */
  async delete(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const party = await this.casePartiesService.get(ctx, id);
    if (!party) throw new NotFoundException("Case party not found");
    await this.assertCanEditParentCase(ctx, party.caseId);
    await this.casePartiesService.hardDelete(ctx, id);
    return { ok: true };
  }
  async assertCanViewParentCase(ctx, caseId) {
    const caseEntity = await this.casesService.get(ctx, caseId);
    if (!caseEntity) throw new NotFoundException("Parent case not found");
    if (
      !this.permissionsService.canViewCase(
        ctx.userId,
        ctx.role,
        ctx.groupId,
        caseEntity,
      )
    ) {
      throw new ForbiddenException(
        "Insufficient permissions to view this case's parties",
      );
    }
  }
  async assertCanEditParentCase(ctx, caseId) {
    const caseEntity = await this.casesService.get(ctx, caseId);
    if (!caseEntity) throw new NotFoundException("Parent case not found");
    const stage = caseEntity.stage ?? caseEntity.status;
    if (stage === "S9") {
      throw new BadRequestException(
        CASE_WRITE_ERROR_CODES.S9_READONLY +
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
        "Insufficient permissions to edit this case's parties",
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
  CasePartiesController.prototype,
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
  CasePartiesController.prototype,
  "list",
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
  CasePartiesController.prototype,
  "update",
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
  CasePartiesController.prototype,
  "delete",
  null,
);
CasePartiesController = __decorate(
  [
    Controller("case-parties"),
    __param(0, Inject(CasePartiesService)),
    __param(1, Inject(CasesService)),
    __param(2, Inject(PermissionsService)),
    __metadata("design:paramtypes", [
      CasePartiesService,
      CasesService,
      PermissionsService,
    ]),
  ],
  CasePartiesController,
);
export { CasePartiesController };
//# sourceMappingURL=caseParties.controller.js.map
