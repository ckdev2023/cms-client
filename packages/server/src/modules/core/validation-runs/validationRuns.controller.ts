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
 *
 */
@Controller("validation-runs")
export class ValidationRunsController {
  /**
   * 创建校验运行控制器。
   * @param validationRunsService 校验运行服务。
   */
  constructor(
    @Inject(ValidationRunsService)
    private readonly validationRunsService: ValidationRunsService,
  ) {}

  /**
   * 创建新的校验运行。
   * @param req 当前请求对象。
   * @param body 请求体。
   * @returns 新建的校验运行记录。
   */
  @RequireRoles("staff")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateValidationRunBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const input: ValidationRunCreateInput = {
      caseId: requireString(body.caseId, "caseId"),
      rulesetRef: parseOptionalObject(body.rulesetRef, "rulesetRef"),
    };
    return this.validationRunsService.create(ctx, input);
  }

  /**
   * 列出校验运行记录。
   * @param req 当前请求对象。
   * @param query 查询参数。
   * @returns 分页结果。
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ValidationRunListQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.validationRunsService.list(ctx, {
      caseId:
        query.caseId === undefined
          ? undefined
          : requireString(query.caseId, "caseId"),
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
    return result;
  }
}
