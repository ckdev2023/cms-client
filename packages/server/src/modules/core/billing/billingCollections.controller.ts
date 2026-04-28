import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequireRoles } from "../auth/auth.decorators";
import type { RequestContext } from "../tenancy/requestContext";
import { BillingCollectionsService } from "./billingCollections.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type BulkCollectBody = {
  caseIds: unknown;
};

const MAX_CASE_IDS = 200;

/**
 * 批量催款 controller（§2.7）。
 *
 * POST /api/billing-collections/bulk
 */
@Controller("billing-collections")
export class BillingCollectionsController {
  /**
   * 初始化批量催款 controller。
   *
   * @param billingCollectionsService - 批量催款 service
   */
  constructor(
    @Inject(BillingCollectionsService)
    private readonly billingCollectionsService: BillingCollectionsService,
  ) {}

  /**
   * 批量生成催款任务。
   *
   * @param req - HTTP 请求
   * @param body - 请求体
   * @returns CollectionResult
   */
  @RequireRoles("staff")
  @Post("bulk")
  async bulk(@Req() req: HttpRequest, @Body() body: BulkCollectBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const caseIds = parseCaseIds(body.caseIds);
    return this.billingCollectionsService.bulkCollect(ctx, caseIds);
  }
}

function parseCaseIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new BadRequestException("caseIds must be an array");
  }
  if (value.length === 0) {
    throw new BadRequestException("caseIds must not be empty");
  }
  if (value.length > MAX_CASE_IDS) {
    throw new BadRequestException(
      `caseIds must contain at most ${String(MAX_CASE_IDS)} items`,
    );
  }
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0) {
      throw new BadRequestException("Each caseId must be a non-empty string");
    }
  }
  return value as string[];
}
