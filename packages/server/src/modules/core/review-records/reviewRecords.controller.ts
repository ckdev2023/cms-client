import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequireRoles } from "../auth/auth.decorators";
import type { RequestContext } from "../tenancy/requestContext";
import {
  ReviewRecordsService,
  type ReviewRecordCreateInput,
} from "./reviewRecords.service";

type HttpRequest = { requestContext?: RequestContext };

type CreateReviewRecordBody = {
  caseId?: unknown;
  validationRunId?: unknown;
  decision?: unknown;
  comment?: unknown;
};

type ReviewRecordListQuery = {
  caseId?: unknown;
  validationRunId?: unknown;
  page?: unknown;
  limit?: unknown;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value;
}

function parseDecision(value: unknown): ReviewRecordCreateInput["decision"] {
  if (value === "approved" || value === "rejected") return value;
  throw new BadRequestException("decision must be approved or rejected");
}

function parseOptionalComment(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  throw new BadRequestException("Invalid comment");
}

function parsePage(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) {
    throw new BadRequestException("Invalid page");
  }
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
@Controller("review-records")
export class ReviewRecordsController {
  /**
   * 创建复核记录控制器。
   * @param reviewRecordsService 复核记录服务。
   */
  constructor(
    @Inject(ReviewRecordsService)
    private readonly reviewRecordsService: ReviewRecordsService,
  ) {}

  /**
   * 创建新的复核记录。
   * @param req 当前请求对象。
   * @param body 请求体。
   * @returns 新建的复核记录。
   */
  @RequireRoles("staff")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateReviewRecordBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const input: ReviewRecordCreateInput = {
      caseId: requireString(body.caseId, "caseId"),
      validationRunId: requireString(body.validationRunId, "validationRunId"),
      decision: parseDecision(body.decision),
      comment: parseOptionalComment(body.comment),
    };
    return this.reviewRecordsService.create(ctx, input);
  }

  /**
   * 列出复核记录。
   * @param req 当前请求对象。
   * @param query 查询参数。
   * @returns 分页结果。
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ReviewRecordListQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.reviewRecordsService.list(ctx, {
      caseId:
        query.caseId === undefined
          ? undefined
          : requireString(query.caseId, "caseId"),
      validationRunId:
        query.validationRunId === undefined
          ? undefined
          : requireString(query.validationRunId, "validationRunId"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  /**
   * 获取单条复核记录。
   * @param req 当前请求对象。
   * @param id 复核记录 ID。
   * @returns 单条复核记录。
   */
  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const result = await this.reviewRecordsService.get(ctx, id);
    if (!result) throw new NotFoundException("Review record not found");
    return result;
  }
}
