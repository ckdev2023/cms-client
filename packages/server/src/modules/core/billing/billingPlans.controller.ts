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
import type {
  BillingGateEffectMode,
  BillingPlanStatus,
} from "../model/billingEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { BillingPlansService } from "./billingPlans.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type CreateBillingPlanBody = {
  caseId: unknown;
  milestoneName?: unknown;
  amountDue: unknown;
  dueDate?: unknown;
  gateEffectMode?: unknown;
  remark?: unknown;
};

type UpdateBillingPlanBody = {
  milestoneName?: unknown;
  amountDue?: unknown;
  dueDate?: unknown;
  gateEffectMode?: unknown;
  remark?: unknown;
};

type BillingPlanListQuery = {
  caseId: unknown;
  page?: unknown;
  limit?: unknown;
};

type TransitionBillingPlanBody = {
  toStatus: unknown;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value;
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

function parseOptionalGateMode(
  value: unknown,
): BillingGateEffectMode | undefined {
  if (value === undefined) return undefined;
  const s = requireString(value, "gateEffectMode");
  if (s !== "off" && s !== "warn") {
    throw new BadRequestException("gateEffectMode must be 'off' or 'warn'");
  }
  return s;
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

/**
 * BillingPlans REST controller (P0 §3.20).
 */
@Controller("billing-plans")
export class BillingPlansController {
  /**
   * Initialize billing plans controller.
   *
   * @param billingPlansService - billing plans service
   */
  constructor(
    @Inject(BillingPlansService)
    private readonly billingPlansService: BillingPlansService,
  ) {}

  /**
   * Create a billing plan node.
   *
   * @param req - HTTP request
   * @param body - creation body
   * @returns created BillingPlan
   */
  @RequireRoles("staff")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateBillingPlanBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.billingPlansService.create(ctx, {
      caseId: requireString(body.caseId, "caseId"),
      milestoneName: parseOptionalNullableString(
        body.milestoneName,
        "milestoneName",
      ),
      amountDue: parseNumber(body.amountDue, "amountDue"),
      dueDate: parseOptionalNullableDateOnly(body.dueDate, "dueDate"),
      gateEffectMode: parseOptionalGateMode(body.gateEffectMode),
      remark: parseOptionalNullableString(body.remark, "remark"),
    });
  }

  /**
   * List billing plans by case.
   *
   * @param req - HTTP request
   * @param query - query params
   * @returns paginated BillingPlan list
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: BillingPlanListQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.billingPlansService.list(ctx, {
      caseId: requireString(query.caseId, "caseId"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  /**
   * Get a single billing plan.
   *
   * @param req - HTTP request
   * @param id - billing plan ID
   * @returns BillingPlan
   */
  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const plan = await this.billingPlansService.get(ctx, id);
    if (!plan) throw new BadRequestException("Billing plan not found");
    return plan;
  }

  /**
   * Update a billing plan (non-status fields).
   *
   * @param req - HTTP request
   * @param id - billing plan ID
   * @param body - update body
   * @returns updated BillingPlan
   */
  @RequireRoles("staff")
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateBillingPlanBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.billingPlansService.update(ctx, id, {
      milestoneName: parseOptionalNullableString(
        body.milestoneName,
        "milestoneName",
      ),
      amountDue: parseOptionalNumber(body.amountDue, "amountDue"),
      dueDate: parseOptionalNullableDateOnly(body.dueDate, "dueDate"),
      gateEffectMode: parseOptionalGateMode(body.gateEffectMode),
      remark: parseOptionalNullableString(body.remark, "remark"),
    });
  }

  /**
   * Transition a billing plan's status.
   *
   * @param req - HTTP request
   * @param id - billing plan ID
   * @param body - transition body
   * @returns updated BillingPlan
   */
  @RequireRoles("staff")
  @Post(":id/transition")
  async transition(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: TransitionBillingPlanBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.billingPlansService.transition(ctx, id, {
      toStatus: requireString(body.toStatus, "toStatus") as BillingPlanStatus,
    });
  }
}
