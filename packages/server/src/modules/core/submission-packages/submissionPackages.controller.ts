/* eslint-disable jsdoc/require-description, jsdoc/require-param-description, jsdoc/require-returns */

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

import { RequireRoles } from "../auth/auth.decorators";
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
 *
 */
@Controller("submission-packages")
export class SubmissionPackagesController {
  /**
   *
   * @param submissionPackagesService
   */
  constructor(
    @Inject(SubmissionPackagesService)
    private readonly submissionPackagesService: SubmissionPackagesService,
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
    @Body() body: CreateSubmissionPackageBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.submissionPackagesService.create(ctx, {
      caseId: requireString(body.caseId, "caseId"),
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
   *
   * @param req
   * @param query
   */
  @RequireRoles("viewer")
  @Get()
  async list(
    @Req() req: HttpRequest,
    @Query() query: SubmissionPackageListQuery,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.submissionPackagesService.list(ctx, {
      caseId:
        query.caseId === undefined
          ? undefined
          : requireString(query.caseId, "caseId"),
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

    const result = await this.submissionPackagesService.get(ctx, id);
    if (!result) throw new BadRequestException("Submission package not found");
    return result;
  }
}
