import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
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

import { CASE_WRITE_ERROR_CODES } from "../cases/cases.types";

import { RequireRoles } from "../auth/auth.decorators";
import { PermissionsService } from "../auth/permissions.service";
import { CasesService } from "../cases/cases.service";
import type { RequestContext } from "../tenancy/requestContext";
import { CasePartiesService } from "./caseParties.service";
import type { PartyType } from "./caseParties.types";

type HttpRequest = {
  requestContext?: RequestContext;
};

type CreateCasePartyBody = {
  caseId: unknown;
  partyType: unknown;
  customerId?: unknown;
  contactPersonId?: unknown;
  relationToCase?: unknown;
  isPrimary?: unknown;
};

type UpdateCasePartyBody = {
  partyType?: unknown;
  customerId?: unknown;
  contactPersonId?: unknown;
  relationToCase?: unknown;
  isPrimary?: unknown;
};

type ListCasePartiesQuery = {
  caseId?: unknown;
  page?: unknown;
  limit?: unknown;
};

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new BadRequestException(`${name} is required`);
  return value;
}

function parseOptionalNullableString(
  value: unknown,
  name: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  throw new BadRequestException(`Invalid ${name}`);
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  return undefined;
}

function parsePage(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : undefined;
}

function parseLimit(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : undefined;
}

/**
 * CaseParties CRUD 接口。
 *
 * 所有端点均要求父案件存在，并通过 PermissionsService 执行资源级鉴权。
 * GET 列表强制要求 caseId，禁止裸列表查询。
 */
@Controller("case-parties")
export class CasePartiesController {
  /**
   *
   * @param casePartiesService
   * @param casesService
   * @param permissionsService
   */
  /**
   * 构造函数。
   * @param casePartiesService 案件关联人服务
   * @param casesService 案件服务（查找父案件用于资源级鉴权）
   * @param permissionsService 权限服务
   */
  constructor(
    @Inject(CasePartiesService)
    private readonly casePartiesService: CasePartiesService,
    @Inject(CasesService)
    private readonly casesService: CasesService,
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * 添加关联人到案件。
   * @param req HTTP 请求对象
   * @param body 创建请求体
   * @returns 创建成功的关联人信息
   */
  @RequireRoles("staff")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateCasePartyBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const caseId = requireString(body.caseId, "caseId");
    await this.assertCanEditParentCase(ctx, caseId);

    return this.casePartiesService.create(ctx, {
      caseId,
      partyType: requireString(body.partyType, "partyType") as PartyType,
      customerId: parseOptionalNullableString(body.customerId, "customerId"),
      contactPersonId: parseOptionalNullableString(
        body.contactPersonId,
        "contactPersonId",
      ),
      relationToCase: parseOptionalNullableString(
        body.relationToCase,
        "relationToCase",
      ),
      isPrimary: parseOptionalBoolean(body.isPrimary),
    });
  }

  /**
   * 按 caseId 列表查询关联人（caseId 必填）。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 关联人列表
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListCasePartiesQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const caseId = requireString(query.caseId, "caseId");
    await this.assertCanViewParentCase(ctx, caseId);

    return this.casePartiesService.list(ctx, {
      caseId,
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  /**
   * 更新关联人。
   * @param req HTTP 请求对象
   * @param id 关联人 ID
   * @param body 更新请求体
   * @returns 更新后的关联人信息
   */
  @RequireRoles("staff")
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateCasePartyBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const party = await this.casePartiesService.get(ctx, id);
    if (!party) throw new NotFoundException("Case party not found");
    await this.assertCanEditParentCase(ctx, party.caseId);

    return this.casePartiesService.update(ctx, id, {
      partyType:
        body.partyType !== undefined
          ? (requireString(body.partyType, "partyType") as PartyType)
          : undefined,
      customerId: parseOptionalNullableString(body.customerId, "customerId"),
      contactPersonId: parseOptionalNullableString(
        body.contactPersonId,
        "contactPersonId",
      ),
      relationToCase: parseOptionalNullableString(
        body.relationToCase,
        "relationToCase",
      ),
      isPrimary: parseOptionalBoolean(body.isPrimary),
    });
  }

  /**
   * 硬删除关联人。
   * @param req HTTP 请求对象
   * @param id 关联人 ID
   * @returns 删除成功状态
   */
  @RequireRoles("staff")
  @Delete(":id")
  async delete(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const party = await this.casePartiesService.get(ctx, id);
    if (!party) throw new NotFoundException("Case party not found");
    await this.assertCanEditParentCase(ctx, party.caseId);

    await this.casePartiesService.hardDelete(ctx, id);
    return { ok: true };
  }

  private async assertCanViewParentCase(
    ctx: RequestContext,
    caseId: string,
  ): Promise<void> {
    const caseEntity = await this.casesService.get(ctx, caseId);
    if (!caseEntity) throw new NotFoundException("Parent case not found");

    if (
      !this.permissionsService.canViewCase(
        ctx.userId,
        ctx.role,
        ctx.groupId,
        caseEntity,
      )
    ) {
      throw new ForbiddenException(
        "Insufficient permissions to view this case's parties",
      );
    }
  }

  private async assertCanEditParentCase(
    ctx: RequestContext,
    caseId: string,
  ): Promise<void> {
    const caseEntity = await this.casesService.get(ctx, caseId);
    if (!caseEntity) throw new NotFoundException("Parent case not found");

    const stage = caseEntity.stage ?? caseEntity.status;
    if (stage === "S9") {
      throw new BadRequestException(
        CASE_WRITE_ERROR_CODES.S9_READONLY +
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
        "Insufficient permissions to edit this case's parties",
      );
    }
  }
}
