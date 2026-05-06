import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequirePermission } from "../auth/auth.decorators";
import { PERMISSION_CODES } from "../auth/permissions.codes";
import type { PaymentMethod } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { PaymentRecordsService } from "./paymentRecords.service";

type HttpRequest = { requestContext?: RequestContext };

type CreatePaymentRecordBody = {
  billingPlanId: unknown;
  amountReceived: unknown;
  receivedAt: unknown;
  paymentMethod?: unknown;
  note?: unknown;
};

type VoidPaymentRecordBody = {
  reasonCode: unknown;
  reasonNote?: unknown;
};

type ReversePaymentRecordBody = {
  reasonCode: unknown;
  reasonNote?: unknown;
};

type PaymentRecordListQuery = {
  billingPlanId?: unknown;
  caseId?: unknown;
  recordStatus?: unknown;
  q?: unknown;
  from?: unknown;
  to?: unknown;
  groupId?: unknown;
  ownerId?: unknown;
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
  if (value === undefined || value === null || value === "") return undefined;
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

const VALID_RECORD_STATUSES: ReadonlySet<string> = new Set([
  "valid",
  "voided",
  "reversed",
  "all",
]);

function parseOptionalRecordStatus(
  value: unknown,
): "valid" | "voided" | "reversed" | "all" | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const s = requireString(value, "recordStatus");
  if (!VALID_RECORD_STATUSES.has(s)) {
    throw new BadRequestException(
      `recordStatus must be one of: ${[...VALID_RECORD_STATUSES].join(", ")}`,
    );
  }
  return s as "valid" | "voided" | "reversed" | "all";
}

function parseOptionalSearchQuery(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const s = requireString(value, "q");
  if (s.length > 100) {
    throw new BadRequestException("q must be at most 100 characters");
  }
  return s;
}

function parseOptionalISODateTime(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = requireString(value, field);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime()))
    throw new BadRequestException(`Invalid ${field}`);
  return date.toISOString();
}

/**
 * PaymentRecords REST controller (P0 §3.20 / §6).
 */
@Controller("payment-records")
export class PaymentRecordsController {
  /**
   * Initialize payment records controller.
   *
   * @param paymentRecordsService - payment records service
   */
  constructor(
    @Inject(PaymentRecordsService)
    private readonly paymentRecordsService: PaymentRecordsService,
  ) {}

  /**
   * Record a new payment.
   *
   * @param req - HTTP request
   * @param body - creation body
   * @returns created PaymentRecord
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreatePaymentRecordBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.paymentRecordsService.create(ctx, {
      billingPlanId: requireString(body.billingPlanId, "billingPlanId"),
      amountReceived: parseNumber(body.amountReceived, "amountReceived"),
      receivedAt: parseISODateTime(body.receivedAt, "receivedAt"),
      paymentMethod: parseOptionalPaymentMethod(body.paymentMethod),
      note: parseOptionalNullableString(body.note, "note"),
    });
  }

  /**
   * List payment records.
   *
   * @param req - HTTP request
   * @param query - query params
   * @returns paginated PaymentRecord list
   */
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: PaymentRecordListQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.paymentRecordsService.list(ctx, {
      billingPlanId: parseOptionalString(query.billingPlanId, "billingPlanId"),
      caseId: parseOptionalString(query.caseId, "caseId"),
      recordStatus: parseOptionalRecordStatus(query.recordStatus),
      q: parseOptionalSearchQuery(query.q),
      from: parseOptionalISODateTime(query.from, "from"),
      to: parseOptionalISODateTime(query.to, "to"),
      groupId: parseOptionalString(query.groupId, "groupId"),
      ownerId: parseOptionalString(query.ownerId, "ownerId"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  /**
   * Get a single payment record.
   *
   * @param req - HTTP request
   * @param id - payment record ID
   * @returns PaymentRecord
   */
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const paymentRecord = await this.paymentRecordsService.get(ctx, id);
    if (!paymentRecord)
      throw new BadRequestException("Payment record not found");
    return paymentRecord;
  }

  /**
   * Void a payment record (soft-delete per P0 §6.2).
   *
   * @param req - HTTP request
   * @param id - payment record ID
   * @param body - void reason
   * @returns voided PaymentRecord
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post(":id/void")
  async void(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: VoidPaymentRecordBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.paymentRecordsService.void(ctx, id, {
      reasonCode: requireString(body.reasonCode, "reasonCode"),
      reasonNote: parseOptionalNullableString(body.reasonNote, "reasonNote"),
    });
  }

  /**
   * Reverse a payment record (D1 方案 A：原地翻状态，不引入负数金额).
   *
   * @param req - HTTP request
   * @param id - payment record ID
   * @param body - reverse reason (reasonCode required)
   * @returns reversed PaymentRecord
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post(":id/reverse")
  async reverse(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: ReversePaymentRecordBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.paymentRecordsService.reverse(ctx, id, {
      reasonCode: requireString(body.reasonCode, "reasonCode"),
      reasonNote: parseOptionalNullableString(body.reasonNote, "reasonNote"),
    });
  }
}
