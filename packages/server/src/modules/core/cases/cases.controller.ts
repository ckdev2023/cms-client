import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { PermissionsService } from "../auth/permissions.service";
import type { RequestContext } from "../tenancy/requestContext";
import { CasesService } from "./cases.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type CreateCaseBody = {
  customerId: unknown;
  caseTypeCode: unknown;
  ownerUserId: unknown;
  status?: unknown;
  dueAt?: unknown;
  metadata?: unknown;
  caseNo?: unknown;
  caseName?: unknown;
  caseSubtype?: unknown;
  applicationType?: unknown;
  companyId?: unknown;
  priority?: unknown;
  riskLevel?: unknown;
  assistantUserId?: unknown;
  sourceChannel?: unknown;
  signedAt?: unknown;
  acceptedAt?: unknown;
  submissionDate?: unknown;
  resultDate?: unknown;
  residenceExpiryDate?: unknown;
};

type UpdateCaseBody = {
  caseTypeCode?: unknown;
  ownerUserId?: unknown;
  dueAt?: unknown;
  metadata?: unknown;
  caseNo?: unknown;
  caseName?: unknown;
  caseSubtype?: unknown;
  applicationType?: unknown;
  companyId?: unknown;
  priority?: unknown;
  riskLevel?: unknown;
  assistantUserId?: unknown;
  sourceChannel?: unknown;
  signedAt?: unknown;
  acceptedAt?: unknown;
  submissionDate?: unknown;
  resultDate?: unknown;
  residenceExpiryDate?: unknown;
  archivedAt?: unknown;
};

type TransitionBody = {
  toStatus: unknown;
};

type ListCasesQuery = {
  status?: unknown;
  ownerUserId?: unknown;
  customerId?: unknown;
  priority?: unknown;
  riskLevel?: unknown;
  companyId?: unknown;
  page?: unknown;
  limit?: unknown;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`Invalid ${field}`);
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

function parseObject(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new BadRequestException("Invalid object");
}

function parsePage(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid page");
  const i = Math.floor(n);
  if (i < 1) throw new BadRequestException("Invalid page");
  return i;
}

function parseLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid limit");
  const i = Math.floor(n);
  if (i < 1 || i > 200) throw new BadRequestException("Invalid limit");
  return i;
}

/**
 * Cases CRUD 接口。
 */
@Controller("cases")
export class CasesController {
  /**
   * 构造函数。
   * @param casesService 案件服务实例
   * @param permissionsService 权限服务实例
   */
  constructor(
    @Inject(CasesService)
    private readonly casesService: CasesService,
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * 创建案件。
   * @param req HTTP 请求对象
   * @param body 创建案件请求体
   * @returns 创建成功的案件信息
   */
  @RequireRoles("staff")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateCaseBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.casesService.create(ctx, {
      customerId: requireString(body.customerId, "customerId"),
      caseTypeCode: requireString(body.caseTypeCode, "caseTypeCode"),
      ownerUserId: requireString(body.ownerUserId, "ownerUserId"),
      status: parseOptionalString(body.status, "status"),
      dueAt: parseOptionalNullableString(body.dueAt, "dueAt"),
      metadata: parseObject(body.metadata),
      caseNo: parseOptionalNullableString(body.caseNo, "caseNo"),
      caseName: parseOptionalNullableString(body.caseName, "caseName"),
      caseSubtype: parseOptionalNullableString(body.caseSubtype, "caseSubtype"),
      applicationType: parseOptionalNullableString(
        body.applicationType,
        "applicationType",
      ),
      companyId: parseOptionalNullableString(body.companyId, "companyId"),
      priority: parseOptionalString(body.priority, "priority"),
      riskLevel: parseOptionalString(body.riskLevel, "riskLevel"),
      assistantUserId: parseOptionalNullableString(
        body.assistantUserId,
        "assistantUserId",
      ),
      sourceChannel: parseOptionalNullableString(
        body.sourceChannel,
        "sourceChannel",
      ),
      signedAt: parseOptionalNullableString(body.signedAt, "signedAt"),
      acceptedAt: parseOptionalNullableString(body.acceptedAt, "acceptedAt"),
      submissionDate: parseOptionalNullableString(
        body.submissionDate,
        "submissionDate",
      ),
      resultDate: parseOptionalNullableString(body.resultDate, "resultDate"),
      residenceExpiryDate: parseOptionalNullableString(
        body.residenceExpiryDate,
        "residenceExpiryDate",
      ),
    });
  }

  /**
   * 获取案件列表。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 案件列表数组
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListCasesQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.casesService.list(ctx, {
      status: parseOptionalString(query.status, "status"),
      ownerUserId: parseOptionalString(query.ownerUserId, "ownerUserId"),
      customerId: parseOptionalString(query.customerId, "customerId"),
      priority: parseOptionalString(query.priority, "priority"),
      riskLevel: parseOptionalString(query.riskLevel, "riskLevel"),
      companyId: parseOptionalString(query.companyId, "companyId"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  /**
   * 获取指定案件详情。
   * @param req HTTP 请求对象
   * @param id 案件 ID
   * @returns 匹配的案件信息
   */
  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const caseEntity = await this.casesService.get(ctx, id);
    if (!caseEntity) throw new BadRequestException("Case not found");
    return caseEntity;
  }

  /**
   * 更新案件基本信息。
   * @param req HTTP 请求对象
   * @param id 案件 ID
   * @param body 更新请求体
   * @returns 更新后的案件信息
   */
  @RequireRoles("staff")
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateCaseBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    await this.assertCanEditCase(ctx, id);

    return this.casesService.update(ctx, id, {
      caseTypeCode: parseOptionalString(body.caseTypeCode, "caseTypeCode"),
      ownerUserId: parseOptionalString(body.ownerUserId, "ownerUserId"),
      dueAt: parseOptionalNullableString(body.dueAt, "dueAt"),
      metadata: parseObject(body.metadata),
      caseNo: parseOptionalNullableString(body.caseNo, "caseNo"),
      caseName: parseOptionalNullableString(body.caseName, "caseName"),
      caseSubtype: parseOptionalNullableString(body.caseSubtype, "caseSubtype"),
      applicationType: parseOptionalNullableString(
        body.applicationType,
        "applicationType",
      ),
      companyId: parseOptionalNullableString(body.companyId, "companyId"),
      priority: parseOptionalString(body.priority, "priority"),
      riskLevel: parseOptionalString(body.riskLevel, "riskLevel"),
      assistantUserId: parseOptionalNullableString(
        body.assistantUserId,
        "assistantUserId",
      ),
      sourceChannel: parseOptionalNullableString(
        body.sourceChannel,
        "sourceChannel",
      ),
      signedAt: parseOptionalNullableString(body.signedAt, "signedAt"),
      acceptedAt: parseOptionalNullableString(body.acceptedAt, "acceptedAt"),
      submissionDate: parseOptionalNullableString(
        body.submissionDate,
        "submissionDate",
      ),
      resultDate: parseOptionalNullableString(body.resultDate, "resultDate"),
      residenceExpiryDate: parseOptionalNullableString(
        body.residenceExpiryDate,
        "residenceExpiryDate",
      ),
      archivedAt: parseOptionalNullableString(body.archivedAt, "archivedAt"),
    });
  }

  /**
   * 状态变更。
   * @param req HTTP 请求对象
   * @param id 案件 ID
   * @param body 变更请求体
   * @returns 变更后的案件信息
   */
  @RequireRoles("staff")
  @Post(":id/transition")
  async transition(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: TransitionBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.casesService.transition(ctx, id, {
      toStatus: requireString(body.toStatus, "toStatus"),
    });
  }

  /**
   * 软删除案件。
   * @param req HTTP 请求对象
   * @param id 案件 ID
   * @returns 删除成功状态
   */
  @RequireRoles("manager")
  @Delete(":id")
  async delete(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    await this.assertCanEditCase(ctx, id);

    await this.casesService.softDelete(ctx, id);
    return { ok: true };
  }

  private async assertCanEditCase(
    ctx: RequestContext,
    id: string,
  ): Promise<void> {
    const caseEntity = await this.casesService.get(ctx, id);
    if (!caseEntity) return;

    if (
      !this.permissionsService.canEditCase(ctx.userId, ctx.role, caseEntity)
    ) {
      throw new ForbiddenException("Insufficient permissions to edit case");
    }
  }
}
