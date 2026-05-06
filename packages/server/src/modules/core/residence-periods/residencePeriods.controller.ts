/* eslint-disable jsdoc/require-description, jsdoc/require-param-description, jsdoc/require-returns */

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

import { RequirePermission } from "../auth/auth.decorators";
import { PERMISSION_CODES } from "../auth/permissions.codes";
import { PermissionsService } from "../auth/permissions.service";
import { CasesService } from "../cases/cases.service";
import type { RequestContext } from "../tenancy/requestContext";
import { ResidencePeriodsService } from "./residencePeriods.service";

type HttpRequest = { requestContext?: RequestContext };

type CreateResidencePeriodBody = {
  caseId?: unknown;
  customerId?: unknown;
  visaType?: unknown;
  statusOfResidence?: unknown;
  periodYears?: unknown;
  periodLabel?: unknown;
  validFrom?: unknown;
  validUntil?: unknown;
  cardNumber?: unknown;
  isCurrent?: unknown;
  entryDate?: unknown;
  notes?: unknown;
};

type UpdateResidencePeriodBody = Omit<
  CreateResidencePeriodBody,
  "caseId" | "customerId"
>;

type ResidencePeriodListQuery = {
  caseId?: unknown;
  customerId?: unknown;
  currentOnly?: unknown;
  expiringBefore?: unknown;
  page?: unknown;
  limit?: unknown;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value;
}

function parseOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;
  return requireString(value, field);
}

function parseOptionalNullableString(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireString(value, field);
}

function parseDateOnly(value: unknown, field: string): string {
  const raw = requireString(value, field);
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return raw;
}

function parseOptionalDateOnly(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;
  return parseDateOnly(value, field);
}

function parseOptionalNullableDateOnly(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return parseDateOnly(value, field);
}

function parseOptionalInteger(
  value: unknown,
  field: string,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return num;
}

function parseOptionalBoolean(
  value: unknown,
  field: string,
): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new BadRequestException(`Invalid ${field}`);
}

function parsePage(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1)
    throw new BadRequestException("Invalid page");
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
 * ResidencePeriods CRUD 接口。
 *
 * 所有端点均通过 PermissionsService 执行父案件资源级鉴权。
 * GET 列表强制要求 caseId，禁止裸列表查询。
 */
@Controller("residence-periods")
export class ResidencePeriodsController {
  /**
   * @param residencePeriodsService
   * @param casesService
   * @param permissionsService
   */
  constructor(
    @Inject(ResidencePeriodsService)
    private readonly residencePeriodsService: ResidencePeriodsService,
    @Inject(CasesService)
    private readonly casesService: CasesService,
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * @param req
   * @param body
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post()
  async create(
    @Req() req: HttpRequest,
    @Body() body: CreateResidencePeriodBody,
  ) {
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
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get()
  async list(
    @Req() req: HttpRequest,
    @Query() query: ResidencePeriodListQuery,
  ) {
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
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
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
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateResidencePeriodBody,
  ) {
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

  private async assertCanViewParentCase(
    ctx: RequestContext,
    caseId: string,
  ): Promise<void> {
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

  private async assertCanEditParentCase(
    ctx: RequestContext,
    caseId: string,
  ): Promise<void> {
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
}
