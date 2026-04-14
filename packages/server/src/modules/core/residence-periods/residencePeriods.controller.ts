/* eslint-disable jsdoc/require-description, jsdoc/require-param-description, jsdoc/require-returns */

import {
  BadRequestException,
  Body,
  Controller,
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
 *
 */
@Controller("residence-periods")
export class ResidencePeriodsController {
  /**
   *
   * @param residencePeriodsService
   */
  constructor(
    @Inject(ResidencePeriodsService)
    private readonly residencePeriodsService: ResidencePeriodsService,
  ) {}

  /**
   *
   * @param req
   * @param body
   */
  @RequireRoles("staff")
  @Post()
  async create(
    @Req() req: HttpRequest,
    @Body() body: CreateResidencePeriodBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.residencePeriodsService.create(ctx, {
      caseId: requireString(body.caseId, "caseId"),
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
      notes: parseOptionalNullableString(body.notes, "notes"),
    });
  }

  /**
   *
   * @param req
   * @param query
   */
  @RequireRoles("viewer")
  @Get()
  async list(
    @Req() req: HttpRequest,
    @Query() query: ResidencePeriodListQuery,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.residencePeriodsService.list(ctx, {
      caseId: parseOptionalString(query.caseId, "caseId"),
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
   *
   * @param req
   * @param id
   */
  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const period = await this.residencePeriodsService.get(ctx, id);
    if (!period) throw new BadRequestException("Residence period not found");
    return period;
  }

  /**
   *
   * @param req
   * @param id
   * @param body
   */
  @RequireRoles("staff")
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateResidencePeriodBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

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
      notes: parseOptionalNullableString(body.notes, "notes"),
    });
  }
}
