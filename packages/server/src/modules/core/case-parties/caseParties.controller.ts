import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { CasePartiesService } from "./caseParties.service";

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
 */
@Controller("case-parties")
export class CasePartiesController {
  /**
   * 构造函数。
   * @param casePartiesService 案件关联人服务实例
   */
  constructor(
    @Inject(CasePartiesService)
    private readonly casePartiesService: CasePartiesService,
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

    return this.casePartiesService.create(ctx, {
      caseId: requireString(body.caseId, "caseId"),
      partyType: requireString(body.partyType, "partyType"),
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
   * 按 caseId 列表查询关联人。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 关联人列表
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListCasePartiesQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.casePartiesService.list(ctx, {
      caseId: typeof query.caseId === "string" ? query.caseId : undefined,
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

    return this.casePartiesService.update(ctx, id, {
      partyType:
        body.partyType !== undefined
          ? requireString(body.partyType, "partyType")
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

    await this.casePartiesService.hardDelete(ctx, id);
    return { ok: true };
  }
}
