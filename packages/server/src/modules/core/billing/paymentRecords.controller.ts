/* eslint-disable jsdoc/require-jsdoc */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequireRoles } from "../auth/auth.decorators";
import type { PaymentMethod } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { PaymentRecordsService } from "./paymentRecords.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type CreatePaymentRecordBody = {
  billingRecordId: unknown;
  amountReceived: unknown;
  receivedAt: unknown;
  paymentMethod?: unknown;
  receiptFileUrl?: unknown;
};

type PaymentRecordListQuery = {
  billingRecordId?: unknown;
  caseId?: unknown;
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

function parseNumber(value: unknown, field: string): number {
  const num = Number(value);
  if (!Number.isFinite(num)) throw new BadRequestException(`Invalid ${field}`);
  return num;
}

function parseISODateTime(value: unknown, field: string): string {
  const raw = requireString(value, field);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime()))
    throw new BadRequestException(`Invalid ${field}`);
  return date.toISOString();
}

function parseOptionalPaymentMethod(
  value: unknown,
): PaymentMethod | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireString(value, "paymentMethod") as PaymentMethod;
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

@Controller("payment-records")
export class PaymentRecordsController {
  constructor(
    @Inject(PaymentRecordsService)
    private readonly paymentRecordsService: PaymentRecordsService,
  ) {}

  @RequireRoles("staff")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreatePaymentRecordBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.paymentRecordsService.create(ctx, {
      billingRecordId: requireString(body.billingRecordId, "billingRecordId"),
      amountReceived: parseNumber(body.amountReceived, "amountReceived"),
      receivedAt: parseISODateTime(body.receivedAt, "receivedAt"),
      paymentMethod: parseOptionalPaymentMethod(body.paymentMethod),
      receiptFileUrl: parseOptionalNullableString(
        body.receiptFileUrl,
        "receiptFileUrl",
      ),
    });
  }

  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: PaymentRecordListQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.paymentRecordsService.list(ctx, {
      billingRecordId: parseOptionalString(
        query.billingRecordId,
        "billingRecordId",
      ),
      caseId: parseOptionalString(query.caseId, "caseId"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const paymentRecord = await this.paymentRecordsService.get(ctx, id);
    if (!paymentRecord)
      throw new BadRequestException("Payment record not found");
    return paymentRecord;
  }

  @RequireRoles("manager")
  @Delete(":id")
  async delete(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    await this.paymentRecordsService.delete(ctx, id);
    return { ok: true };
  }
}
