/* eslint-disable jsdoc/require-jsdoc */
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
import { BillingRecordsService } from "./billingRecords.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type CreateBillingRecordBody = {
  caseId: unknown;
  billingType?: unknown;
  milestoneName?: unknown;
  amountDue: unknown;
  dueDate?: unknown;
  invoiceStatus?: unknown;
  remark?: unknown;
};

type UpdateBillingRecordBody = {
  caseId?: unknown;
  billingType?: unknown;
  milestoneName?: unknown;
  amountDue?: unknown;
  dueDate?: unknown;
  invoiceStatus?: unknown;
  remark?: unknown;
};

type BillingRecordListQuery = {
  caseId: unknown;
  page?: unknown;
  limit?: unknown;
};

type TransitionBillingRecordBody = {
  toStatus: unknown;
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

function parseNumber(value: unknown, field: string): number {
  const num = Number(value);
  if (!Number.isFinite(num)) throw new BadRequestException(`Invalid ${field}`);
  return num;
}

function parseOptionalNumber(
  value: unknown,
  field: string,
): number | undefined {
  if (value === undefined) return undefined;
  return parseNumber(value, field);
}

function parseDateOnly(value: unknown, field: string): string {
  const raw = requireString(value, field);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime()))
    throw new BadRequestException(`Invalid ${field}`);
  return date.toISOString().slice(0, 10);
}

function parseOptionalNullableDateOnly(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return parseDateOnly(value, field);
}

function parsePage(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1)
    throw new BadRequestException("Invalid page");
  return Math.floor(n);
}

function parseLimit(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 200) {
    throw new BadRequestException("Invalid limit");
  }
  return Math.floor(n);
}

@Controller("billing-records")
export class BillingRecordsController {
  constructor(
    @Inject(BillingRecordsService)
    private readonly billingRecordsService: BillingRecordsService,
  ) {}

  @RequireRoles("staff")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateBillingRecordBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.billingRecordsService.create(ctx, {
      caseId: requireString(body.caseId, "caseId"),
      billingType: parseOptionalString(body.billingType, "billingType"),
      milestoneName: parseOptionalNullableString(
        body.milestoneName,
        "milestoneName",
      ),
      amountDue: parseNumber(body.amountDue, "amountDue"),
      dueDate: parseOptionalNullableDateOnly(body.dueDate, "dueDate"),
      invoiceStatus: parseOptionalString(body.invoiceStatus, "invoiceStatus"),
      remark: parseOptionalNullableString(body.remark, "remark"),
    });
  }

  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: BillingRecordListQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.billingRecordsService.list(ctx, {
      caseId: requireString(query.caseId, "caseId"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const billingRecord = await this.billingRecordsService.get(ctx, id);
    if (!billingRecord)
      throw new BadRequestException("Billing record not found");
    return billingRecord;
  }

  @RequireRoles("staff")
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateBillingRecordBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.billingRecordsService.update(ctx, id, {
      caseId: parseOptionalString(body.caseId, "caseId"),
      billingType: parseOptionalString(body.billingType, "billingType"),
      milestoneName: parseOptionalNullableString(
        body.milestoneName,
        "milestoneName",
      ),
      amountDue: parseOptionalNumber(body.amountDue, "amountDue"),
      dueDate: parseOptionalNullableDateOnly(body.dueDate, "dueDate"),
      invoiceStatus: parseOptionalString(body.invoiceStatus, "invoiceStatus"),
      remark: parseOptionalNullableString(body.remark, "remark"),
    });
  }

  @RequireRoles("staff")
  @Post(":id/transition")
  async transition(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: TransitionBillingRecordBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.billingRecordsService.transition(ctx, id, {
      toStatus: requireString(body.toStatus, "toStatus"),
    });
  }
}
