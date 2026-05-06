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
import { SubmissionPackagesService } from "./submissionPackages.service";

type HttpRequest = { requestContext?: RequestContext };

type SubmissionPackageItemBody = {
  itemType?: unknown;
  refId?: unknown;
  snapshotPayload?: unknown;
};

type CreateSubmissionPackageBody = {
  caseId?: unknown;
  submissionKind?: unknown;
  submittedAt?: unknown;
  validationRunId?: unknown;
  reviewRecordId?: unknown;
  authorityName?: unknown;
  acceptanceNo?: unknown;
  receiptStorageType?: unknown;
  receiptRelativePathOrKey?: unknown;
  relatedSubmissionId?: unknown;
  items?: unknown;
};

type SubmissionPackageListQuery = {
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

function parseOptionalNullableString(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireString(value, field);
}

function parseOptionalTimestamp(
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

function parseSnapshotPayload(
  value: unknown,
): Record<string, unknown> | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new BadRequestException("Invalid snapshotPayload");
}

function parseItems(value: unknown): SubmissionPackageItemBody[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadRequestException("items is required");
  }
  return value as SubmissionPackageItemBody[];
}

/**
 * 提交包 CRUD — 资源级鉴权委托给父案件。
 */
@Controller("submission-packages")
export class SubmissionPackagesController {
  /**
   * @param submissionPackagesService 提交包服务
   * @param casesService 案件服务（查找父案件用于鉴权）
   * @param permissionsService 权限服务
   */
  constructor(
    @Inject(SubmissionPackagesService)
    private readonly submissionPackagesService: SubmissionPackagesService,
    @Inject(CasesService)
    private readonly casesService: CasesService,
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * 创建提交包（须父案件 edit 权限）。
   * @param req
   * @param body
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post()
  async create(
    @Req() req: HttpRequest,
    @Body() body: CreateSubmissionPackageBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const caseId = requireString(body.caseId, "caseId");
    await this.assertCanEditParentCase(ctx, caseId);

    return this.submissionPackagesService.create(ctx, {
      caseId,
      submissionKind:
        parseOptionalNullableString(body.submissionKind, "submissionKind") ??
        undefined,
      submittedAt: parseOptionalTimestamp(body.submittedAt, "submittedAt"),
      validationRunId: parseOptionalNullableString(
        body.validationRunId,
        "validationRunId",
      ),
      reviewRecordId: parseOptionalNullableString(
        body.reviewRecordId,
        "reviewRecordId",
      ),
      authorityName: parseOptionalNullableString(
        body.authorityName,
        "authorityName",
      ),
      acceptanceNo: parseOptionalNullableString(
        body.acceptanceNo,
        "acceptanceNo",
      ),
      receiptStorageType: parseOptionalNullableString(
        body.receiptStorageType,
        "receiptStorageType",
      ),
      receiptRelativePathOrKey: parseOptionalNullableString(
        body.receiptRelativePathOrKey,
        "receiptRelativePathOrKey",
      ),
      relatedSubmissionId: parseOptionalNullableString(
        body.relatedSubmissionId,
        "relatedSubmissionId",
      ),
      items: parseItems(body.items).map((item) => ({
        itemType: requireString(item.itemType, "itemType"),
        refId: requireString(item.refId, "refId"),
        snapshotPayload: parseSnapshotPayload(item.snapshotPayload),
      })),
    });
  }

  /**
   * 列表查询（须父案件 view 权限）。
   * @param req
   * @param query
   */
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get()
  async list(
    @Req() req: HttpRequest,
    @Query() query: SubmissionPackageListQuery,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const caseId =
      query.caseId === undefined
        ? undefined
        : requireString(query.caseId, "caseId");

    if (caseId) {
      await this.assertCanViewParentCase(ctx, caseId);
    }

    return this.submissionPackagesService.list(ctx, {
      caseId,
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  /**
   * 获取单条提交包。
   * @param req
   * @param id
   */
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const result = await this.submissionPackagesService.get(ctx, id);
    if (!result) {
      throw new NotFoundException(
        VALIDATION_SUBMISSION_ERROR_CODES.SP_NOT_FOUND +
          ": Submission package not found",
      );
    }

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
        VALIDATION_SUBMISSION_ERROR_CODES.SP_CASE_NOT_FOUND +
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
        "Insufficient permissions to view this case's submission packages",
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
        VALIDATION_SUBMISSION_ERROR_CODES.SP_CASE_NOT_FOUND +
          ": Parent case not found",
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
        "Insufficient permissions to edit this case's submission packages",
      );
    }
  }
}
