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

import { RequireRoles } from "../auth/auth.decorators";
import { PermissionsService } from "../auth/permissions.service";
import { CasesService } from "../cases/cases.service";
import { VALIDATION_SUBMISSION_ERROR_CODES } from "../cases/cases.types";
import type { RequestContext } from "../tenancy/requestContext";
import {
  ValidationRunsService,
  type ValidationRunCreateInput,
} from "./validationRuns.service";

type HttpRequest = { requestContext?: RequestContext };

type CreateValidationRunBody = {
  caseId?: unknown;
  rulesetRef?: unknown;
};

type ValidationRunListQuery = {
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

function parseOptionalObject(
  value: unknown,
  field: string,
): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new BadRequestException(`Invalid ${field}`);
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
 * 校验运行 CRUD — 资源级鉴权委托给父案件。
 */
@Controller("validation-runs")
export class ValidationRunsController {
  /**
   * 构造函数。
   * @param validationRunsService 校验运行服务
   * @param casesService 案件服务（查找父案件用于鉴权）
   * @param permissionsService 权限服务
   */
  constructor(
    @Inject(ValidationRunsService)
    private readonly validationRunsService: ValidationRunsService,
    @Inject(CasesService)
    private readonly casesService: CasesService,
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * 创建新的校验运行（须父案件 edit 权限且非 S9）。
   * @param req 当前请求对象。
   * @param body 请求体。
   * @returns 新建的校验运行记录。
   */
  @RequireRoles("staff")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateValidationRunBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const caseId = requireString(body.caseId, "caseId");
    await this.assertCanEditParentCase(ctx, caseId);

    const input: ValidationRunCreateInput = {
      caseId,
      rulesetRef: parseOptionalObject(body.rulesetRef, "rulesetRef"),
    };
    return this.validationRunsService.create(ctx, input);
  }

  /**
   * 列出校验运行记录（须父案件 view 权限）。
   * @param req 当前请求对象。
   * @param query 查询参数。
   * @returns 分页结果。
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ValidationRunListQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const caseId =
      query.caseId === undefined
        ? undefined
        : requireString(query.caseId, "caseId");

    if (caseId) {
      await this.assertCanViewParentCase(ctx, caseId);
    }

    return this.validationRunsService.list(ctx, {
      caseId,
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  /**
   * 获取单条校验运行记录。
   * @param req 当前请求对象。
   * @param id 校验运行 ID。
   * @returns 单条校验运行记录。
   */
  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const result = await this.validationRunsService.get(ctx, id);
    if (!result) throw new NotFoundException("Validation run not found");

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
        VALIDATION_SUBMISSION_ERROR_CODES.VR_CASE_NOT_FOUND +
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
        "Insufficient permissions to view this case's validation runs",
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
        VALIDATION_SUBMISSION_ERROR_CODES.VR_CASE_NOT_FOUND +
          ": Parent case not found",
      );
    }
    const stage = caseEntity.stage ?? caseEntity.status;
    if (stage === "S9") {
      throw new BadRequestException(
        VALIDATION_SUBMISSION_ERROR_CODES.VR_CASE_S9_READONLY +
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
        "Insufficient permissions to edit this case's validation runs",
      );
    }
  }
}
