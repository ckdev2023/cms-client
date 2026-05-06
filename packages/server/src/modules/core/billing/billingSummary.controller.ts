import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequirePermission } from "../auth/auth.decorators";
import { PERMISSION_CODES } from "../auth/permissions.codes";
import type { BillingPlanStatus } from "../model/billingEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { BillingSummaryService } from "./billingSummary.service";

type HttpRequest = { requestContext?: RequestContext };

type BillingSummaryQuery = {
  status?: unknown;
  groupId?: unknown;
  ownerId?: unknown;
  q?: unknown;
  from?: unknown;
  to?: unknown;
};

const VALID_STATUSES: ReadonlySet<string> = new Set([
  "due",
  "partial",
  "paid",
  "overdue",
]);

function parseOptionalStatus(value: unknown): BillingPlanStatus | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !VALID_STATUSES.has(value)) {
    throw new BadRequestException(
      `Invalid status. Must be one of: ${[...VALID_STATUSES].join(", ")}`,
    );
  }
  return value as BillingPlanStatus;
}

function parseOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${field} must be a non-empty string`);
  }
  return value;
}

function parseOptionalQ(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new BadRequestException("q must be a string");
  }
  if (value.length > 100) {
    throw new BadRequestException("q must be 100 characters or fewer");
  }
  return value.length > 0 ? value : undefined;
}

function parseOptionalDateOnly(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  const raw = parseOptionalString(value, field);
  if (!raw) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return d.toISOString().slice(0, 10);
}

/**
 * 全组织收费汇总 controller（§2.2）。
 *
 * GET /api/billing-summary
 */
@Controller("billing-summary")
export class BillingSummaryController {
  /**
   * 初始化全组织收费汇总 controller。
   *
   * @param billingSummaryService - 收费汇总 service
   */
  constructor(
    @Inject(BillingSummaryService)
    private readonly billingSummaryService: BillingSummaryService,
  ) {}

  /**
   * 获取全组织收费汇总（totalDue / totalReceived / totalOutstanding / overdueAmount）。
   *
   * @param req - HTTP 请求
   * @param query - 可选过滤参数
   * @returns BillingListSummaryDto
   */
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get()
  async getSummary(
    @Req() req: HttpRequest,
    @Query() query: BillingSummaryQuery,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.billingSummaryService.getSummary(ctx, {
      status: parseOptionalStatus(query.status),
      groupId: parseOptionalString(query.groupId, "groupId"),
      ownerId: parseOptionalString(query.ownerId, "ownerId"),
      q: parseOptionalQ(query.q),
      from: parseOptionalDateOnly(query.from, "from"),
      to: parseOptionalDateOnly(query.to, "to"),
    });
  }
}
