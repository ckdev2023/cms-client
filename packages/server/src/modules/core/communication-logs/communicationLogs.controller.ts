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
import { CommunicationLogsService } from "./communicationLogs.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type CreateCommunicationLogBody = {
  caseId?: unknown;
  customerId?: unknown;
  companyId?: unknown;
  channelType: unknown;
  direction?: unknown;
  subject?: unknown;
  contentSummary?: unknown;
  fullContent?: unknown;
  visibleToClient?: unknown;
  followUpRequired?: unknown;
  followUpDueAt?: unknown;
};

type UpdateCommunicationLogBody = {
  caseId?: unknown;
  customerId?: unknown;
  companyId?: unknown;
  channelType?: unknown;
  direction?: unknown;
  subject?: unknown;
  contentSummary?: unknown;
  fullContent?: unknown;
  visibleToClient?: unknown;
  followUpRequired?: unknown;
  followUpDueAt?: unknown;
};

type CommunicationLogListQuery = {
  caseId?: unknown;
  customerId?: unknown;
  companyId?: unknown;
  page?: unknown;
  limit?: unknown;
};

type CommunicationLogFollowUpsQuery = {
  caseId?: unknown;
  customerId?: unknown;
  companyId?: unknown;
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

function parseOptionalBoolean(
  value: unknown,
  field: string,
): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  throw new BadRequestException(`Invalid ${field}`);
}

function parseISODate(value: unknown, field: string): string {
  const str = requireString(value, field);
  const date = new Date(str);
  if (Number.isNaN(date.getTime()))
    throw new BadRequestException(`Invalid ${field}`);
  return date.toISOString();
}

function parseOptionalNullableISODate(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return parseISODate(value, field);
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

@Controller("communication-logs")
export class CommunicationLogsController {
  constructor(
    @Inject(CommunicationLogsService)
    private readonly communicationLogsService: CommunicationLogsService,
  ) {}

  @RequireRoles("staff")
  @Post()
  async create(
    @Req() req: HttpRequest,
    @Body() body: CreateCommunicationLogBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.communicationLogsService.create(ctx, {
      caseId: parseOptionalNullableString(body.caseId, "caseId"),
      customerId: parseOptionalNullableString(body.customerId, "customerId"),
      companyId: parseOptionalNullableString(body.companyId, "companyId"),
      channelType: requireString(body.channelType, "channelType"),
      direction: parseOptionalString(body.direction, "direction"),
      subject: parseOptionalNullableString(body.subject, "subject"),
      contentSummary: parseOptionalNullableString(
        body.contentSummary,
        "contentSummary",
      ),
      fullContent: parseOptionalNullableString(body.fullContent, "fullContent"),
      visibleToClient: parseOptionalBoolean(
        body.visibleToClient,
        "visibleToClient",
      ),
      followUpRequired: parseOptionalBoolean(
        body.followUpRequired,
        "followUpRequired",
      ),
      followUpDueAt: parseOptionalNullableISODate(
        body.followUpDueAt,
        "followUpDueAt",
      ),
    });
  }

  @RequireRoles("viewer")
  @Get()
  async list(
    @Req() req: HttpRequest,
    @Query() query: CommunicationLogListQuery,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.communicationLogsService.list(ctx, {
      caseId: parseOptionalString(query.caseId, "caseId"),
      customerId: parseOptionalString(query.customerId, "customerId"),
      companyId: parseOptionalString(query.companyId, "companyId"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  @RequireRoles("staff")
  @Get("follow-ups")
  async followUps(
    @Req() req: HttpRequest,
    @Query() query: CommunicationLogFollowUpsQuery,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.communicationLogsService.followUps(ctx, {
      caseId: parseOptionalString(query.caseId, "caseId"),
      customerId: parseOptionalString(query.customerId, "customerId"),
      companyId: parseOptionalString(query.companyId, "companyId"),
    });
  }

  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const communicationLog = await this.communicationLogsService.get(ctx, id);
    if (!communicationLog) {
      throw new BadRequestException("Communication log not found");
    }
    return communicationLog;
  }

  @RequireRoles("staff")
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateCommunicationLogBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.communicationLogsService.update(ctx, id, {
      caseId: parseOptionalNullableString(body.caseId, "caseId"),
      customerId: parseOptionalNullableString(body.customerId, "customerId"),
      companyId: parseOptionalNullableString(body.companyId, "companyId"),
      channelType: parseOptionalString(body.channelType, "channelType"),
      direction: parseOptionalString(body.direction, "direction"),
      subject: parseOptionalNullableString(body.subject, "subject"),
      contentSummary: parseOptionalNullableString(
        body.contentSummary,
        "contentSummary",
      ),
      fullContent: parseOptionalNullableString(body.fullContent, "fullContent"),
      visibleToClient: parseOptionalBoolean(
        body.visibleToClient,
        "visibleToClient",
      ),
      followUpRequired: parseOptionalBoolean(
        body.followUpRequired,
        "followUpRequired",
      ),
      followUpDueAt: parseOptionalNullableISODate(
        body.followUpDueAt,
        "followUpDueAt",
      ),
    });
  }
}
