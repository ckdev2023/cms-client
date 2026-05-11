/* eslint-disable jsdoc/require-param-description, jsdoc/require-returns, jsdoc/require-description */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequirePermission } from "../auth/auth.decorators";
import { PERMISSION_CODES } from "../auth/permissions.codes";
import { hasRequiredRole } from "../auth/roles";
import type { RequestContext } from "../tenancy/requestContext";
import { CaseTemplatesService } from "./caseTemplates.service";

type HttpRequest = { requestContext?: RequestContext };

type ListQuery = {
  caseType?: unknown;
  includeInactive?: unknown;
};

type CreateBody = {
  templateName?: unknown;
  caseType?: unknown;
  applicationType?: unknown;
  requirementBlueprint?: unknown;
  defaultTasksBlueprint?: unknown;
  reviewRequiredFlag?: unknown;
  billingGateMode?: unknown;
  activeFlag?: unknown;
};

type UpdateBody = {
  templateName?: unknown;
  caseType?: unknown;
  applicationType?: unknown;
  requirementBlueprint?: unknown;
  defaultTasksBlueprint?: unknown;
  reviewRequiredFlag?: unknown;
  billingGateMode?: unknown;
  activeFlag?: unknown;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  throw new BadRequestException(`Invalid ${field}`);
}

function optionalNullableString(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  throw new BadRequestException(`Invalid ${field}`);
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new BadRequestException(`Invalid ${field}`);
}

function optionalJson(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  return value;
}

function requireCtx(req: HttpRequest): RequestContext {
  const ctx = req.requestContext;
  if (!ctx) throw new UnauthorizedException("Missing request context");
  return ctx;
}

/**
 * 案件資料蓝图 CRUD — manager 可写、viewer 可读。
 */
@Controller("case-templates")
export class CaseTemplatesController {
  /**
   *
   * @param service
   */
  constructor(
    @Inject(CaseTemplatesService)
    private readonly service: CaseTemplatesService,
  ) {}

  /**
   *
   * @param req
   * @param query
   */
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListQuery) {
    const ctx = requireCtx(req);

    const includeInactiveRaw = optionalBoolean(
      query.includeInactive,
      "includeInactive",
    );
    const includeInactive =
      includeInactiveRaw === true && hasRequiredRole(ctx.role, ["manager"]);

    return this.service.list(ctx, {
      caseType: optionalString(query.caseType, "caseType"),
      includeInactive,
    });
  }

  /**
   *
   * @param req
   * @param id
   */
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = requireCtx(req);
    const dto = await this.service.get(ctx, id);
    if (!dto) throw new NotFoundException("Case template not found");
    return dto;
  }

  /**
   *
   * @param req
   * @param body
   */
  @RequirePermission(PERMISSION_CODES.SETTINGS_WRITE)
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateBody) {
    const ctx = requireCtx(req);
    return this.service.create(ctx, {
      templateName: requireString(body.templateName, "templateName"),
      caseType: requireString(body.caseType, "caseType"),
      applicationType: optionalString(body.applicationType, "applicationType"),
      requirementBlueprint: optionalJson(body.requirementBlueprint),
      defaultTasksBlueprint: optionalJson(body.defaultTasksBlueprint),
      reviewRequiredFlag: optionalBoolean(
        body.reviewRequiredFlag,
        "reviewRequiredFlag",
      ),
      billingGateMode: optionalString(body.billingGateMode, "billingGateMode"),
      activeFlag: optionalBoolean(body.activeFlag, "activeFlag"),
    });
  }

  /**
   *
   * @param req
   * @param id
   * @param body
   */
  @RequirePermission(PERMISSION_CODES.SETTINGS_WRITE)
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateBody,
  ) {
    const ctx = requireCtx(req);
    return this.service.update(ctx, id, {
      templateName: optionalString(body.templateName, "templateName"),
      caseType: optionalString(body.caseType, "caseType"),
      applicationType: optionalNullableString(
        body.applicationType,
        "applicationType",
      ),
      requirementBlueprint: optionalJson(body.requirementBlueprint),
      defaultTasksBlueprint: optionalJson(body.defaultTasksBlueprint),
      reviewRequiredFlag: optionalBoolean(
        body.reviewRequiredFlag,
        "reviewRequiredFlag",
      ),
      billingGateMode: optionalString(body.billingGateMode, "billingGateMode"),
      activeFlag: optionalBoolean(body.activeFlag, "activeFlag"),
    });
  }
}
