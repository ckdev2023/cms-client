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
import { ResidencePeriodsService } from "./residencePeriods.service";
function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value;
}
function parseOptionalString(value, field) {
  if (value === undefined) return undefined;
  return requireString(value, field);
}
function parseOptionalNullableString(value, field) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireString(value, field);
}
function parseDateOnly(value, field) {
  const raw = requireString(value, field);
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return raw;
}
function parseOptionalDateOnly(value, field) {
  if (value === undefined) return undefined;
  return parseDateOnly(value, field);
}
function parseOptionalNullableDateOnly(value, field) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return parseDateOnly(value, field);
}
function parseOptionalInteger(value, field) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return num;
}
function parseOptionalBoolean(value, field) {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new BadRequestException(`Invalid ${field}`);
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
/**
 * ResidencePeriods CRUD 接口。
 *
 * 所有端点均通过 PermissionsService 执行父案件资源级鉴权。
 * GET 列表强制要求 caseId，禁止裸列表查询。
 */
let ResidencePeriodsController = class ResidencePeriodsController {
  residencePeriodsService;
  casesService;
  permissionsService;
  /**
   * @param residencePeriodsService
   * @param casesService
   * @param permissionsService
   */
  constructor(residencePeriodsService, casesService, permissionsService) {
    this.residencePeriodsService = residencePeriodsService;
    this.casesService = casesService;
    this.permissionsService = permissionsService;
  }
  /**
   * @param req
   * @param body
   */
  async create(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const caseId = requireString(body.caseId, "caseId");
    await this.assertCanEditParentCase(ctx, caseId);
    return this.residencePeriodsService.create(ctx, {
      caseId,
      customerId: requireString(body.customerId, "customerId"),
      visaType: requireString(body.visaType, "visaType"),
      statusOfResidence: requireString(
        body.statusOfResidence,
        "statusOfResidence",
      ),
      periodYears: parseOptionalInteger(body.periodYears, "periodYears"),
      periodLabel: parseOptionalNullableString(body.periodLabel, "periodLabel"),
      validFrom: parseDateOnly(body.validFrom, "validFrom"),
      validUntil: parseDateOnly(body.validUntil, "validUntil"),
      cardNumber: parseOptionalNullableString(body.cardNumber, "cardNumber"),
      isCurrent: parseOptionalBoolean(body.isCurrent, "isCurrent"),
      entryDate: parseOptionalNullableDateOnly(body.entryDate, "entryDate"),
      notes: parseOptionalNullableString(body.notes, "notes"),
    });
  }
  /**
   * @param req
   * @param query
   */
  async list(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const caseId = requireString(query.caseId, "caseId");
    await this.assertCanViewParentCase(ctx, caseId);
    return this.residencePeriodsService.list(ctx, {
      caseId,
      customerId: parseOptionalString(query.customerId, "customerId"),
      currentOnly: parseOptionalBoolean(query.currentOnly, "currentOnly"),
      expiringBefore: parseOptionalDateOnly(
        query.expiringBefore,
        "expiringBefore",
      ),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }
  /**
   * @param req
   * @param id
   */
  async get(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const period = await this.residencePeriodsService.get(ctx, id);
    if (!period) throw new NotFoundException("Residence period not found");
    await this.assertCanViewParentCase(ctx, period.caseId);
    return period;
  }
  /**
   * @param req
   * @param id
   * @param body
   */
  async update(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const period = await this.residencePeriodsService.get(ctx, id);
    if (!period) throw new NotFoundException("Residence period not found");
    await this.assertCanEditParentCase(ctx, period.caseId);
    return this.residencePeriodsService.update(ctx, id, {
      visaType: parseOptionalString(body.visaType, "visaType"),
      statusOfResidence: parseOptionalString(
        body.statusOfResidence,
        "statusOfResidence",
      ),
      periodYears: parseOptionalInteger(body.periodYears, "periodYears"),
      periodLabel: parseOptionalNullableString(body.periodLabel, "periodLabel"),
      validFrom: parseOptionalDateOnly(body.validFrom, "validFrom"),
      validUntil: parseOptionalDateOnly(body.validUntil, "validUntil"),
      cardNumber: parseOptionalNullableString(body.cardNumber, "cardNumber"),
      isCurrent: parseOptionalBoolean(body.isCurrent, "isCurrent"),
      entryDate: parseOptionalNullableDateOnly(body.entryDate, "entryDate"),
      notes: parseOptionalNullableString(body.notes, "notes"),
    });
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
        "Insufficient permissions to view this case's residence periods",
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
        "Insufficient permissions to edit this case's residence periods",
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
  ResidencePeriodsController.prototype,
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
  ResidencePeriodsController.prototype,
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
  ResidencePeriodsController.prototype,
  "get",
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
  ResidencePeriodsController.prototype,
  "update",
  null,
);
ResidencePeriodsController = __decorate(
  [
    Controller("residence-periods"),
    __param(0, Inject(ResidencePeriodsService)),
    __param(1, Inject(CasesService)),
    __param(2, Inject(PermissionsService)),
    __metadata("design:paramtypes", [
      ResidencePeriodsService,
      CasesService,
      PermissionsService,
    ]),
  ],
  ResidencePeriodsController,
);
export { ResidencePeriodsController };
//# sourceMappingURL=residencePeriods.controller.js.map
