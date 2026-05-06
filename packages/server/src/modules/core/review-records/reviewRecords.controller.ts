import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequirePermission } from "../auth/auth.decorators";
import { PERMISSION_CODES } from "../auth/permissions.codes";
import { PermissionsService } from "../auth/permissions.service";
import { CasesService } from "../cases/cases.service";
import { VALIDATION_SUBMISSION_ERROR_CODES } from "../cases/cases.types";
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
 * 复核记录 CRUD — 资源级鉴权委托给父案件。
 */
@Controller("review-records")
export class ReviewRecordsController {
  /**
   * 构造函数。
   * @param reviewRecordsService 复核记录服务
   * @param casesService 案件服务（查找父案件用于鉴权）
   * @param permissionsService 权限服务
   */
  constructor(
    @Inject(ReviewRecordsService)
    private readonly reviewRecordsService: ReviewRecordsService,
    @Inject(CasesService)
    private readonly casesService: CasesService,
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * 创建新的复核记录（须父案件 edit 权限且非 S9）。
   * @param req 当前请求对象。
   * @param body 请求体。
   * @returns 新建的复核记录。
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateReviewRecordBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const caseId = requireString(body.caseId, "caseId");
    await this.assertCanEditParentCase(ctx, caseId);

    const input: ReviewRecordCreateInput = {
      caseId,
      validationRunId: requireString(body.validationRunId, "validationRunId"),
      decision: parseDecision(body.decision),
      comment: parseOptionalComment(body.comment),
    };
    return this.reviewRecordsService.create(ctx, input);
  }

  /**
   * 列出复核记录（须父案件 view 权限）。
   * @param req 当前请求对象。
   * @param query 查询参数。
   * @returns 分页结果。
   */
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ReviewRecordListQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const caseId =
      query.caseId === undefined
        ? undefined
        : requireString(query.caseId, "caseId");

    if (caseId) {
      await this.assertCanViewParentCase(ctx, caseId);
    }

    return this.reviewRecordsService.list(ctx, {
      caseId,
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
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const result = await this.reviewRecordsService.get(ctx, id);
    if (!result) throw new NotFoundException("Review record not found");

    await this.assertCanViewParentCase(ctx, result.caseId);
    return result;
  }

  private async assertCanViewParentCase(
    ctx: RequestContext,
    caseId: string,
  ): Promise<void> {
    const caseEntity = await this.casesService.get(ctx, caseId);
    if (!caseEntity) {
      throw new NotFoundException(
        VALIDATION_SUBMISSION_ERROR_CODES.RR_CASE_NOT_FOUND +
          ": Parent case not found",
      );
    }
    if (
      !this.permissionsService.canViewCase(
        ctx.userId,
        ctx.role,
        ctx.groupId,
        caseEntity,
      )
    ) {
      throw new ForbiddenException(
        "Insufficient permissions to view this case's review records",
      );
    }
  }

  private async assertCanEditParentCase(
    ctx: RequestContext,
    caseId: string,
  ): Promise<void> {
    const caseEntity = await this.casesService.get(ctx, caseId);
    if (!caseEntity) {
      throw new NotFoundException(
        VALIDATION_SUBMISSION_ERROR_CODES.RR_CASE_NOT_FOUND +
          ": Parent case not found",
      );
    }
    const stage = caseEntity.stage ?? caseEntity.status;
    if (stage === "S9") {
      throw new BadRequestException(
        VALIDATION_SUBMISSION_ERROR_CODES.RR_CASE_S9_READONLY +
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
        "Insufficient permissions to edit this case's review records",
      );
    }
  }
}
