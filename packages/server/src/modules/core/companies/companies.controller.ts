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
import { CompaniesService } from "./companies.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type CreateCompanyBody = {
  companyName: unknown;
  companyNo?: unknown;
  corporateNumber?: unknown;
  establishedDate?: unknown;
  capitalAmount?: unknown;
  address?: unknown;
  businessScope?: unknown;
  employeeCount?: unknown;
  fiscalYearEnd?: unknown;
  website?: unknown;
  contactPhone?: unknown;
  contactEmail?: unknown;
  ownerUserId?: unknown;
};

type UpdateCompanyBody = Partial<CreateCompanyBody>;

type ListCompaniesQuery = {
  page?: unknown;
  limit?: unknown;
  keyword?: unknown;
};

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new BadRequestException(`${name} is required`);
  return value;
}

function parseOptionalString(
  value: unknown,
  name: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  throw new BadRequestException(`Invalid ${name}`);
}

function parseOptionalNumber(
  value: unknown,
  name: string,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new BadRequestException(`Invalid ${name}`);
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
 * Company CRUD 接口。
 */
@Controller("companies")
export class CompaniesController {
  /**
   * 构造函数。
   * @param companiesService 企业客户服务实例
   */
  constructor(
    @Inject(CompaniesService)
    private readonly companiesService: CompaniesService,
  ) {}

  /**
   * 创建企业客户。
   * @param req HTTP 请求对象
   * @param body 创建请求体
   * @returns 创建成功的企业客户信息
   */
  @RequireRoles("staff")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateCompanyBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.companiesService.create(ctx, {
      companyName: requireString(body.companyName, "companyName"),
      companyNo: parseOptionalString(body.companyNo, "companyNo"),
      corporateNumber: parseOptionalString(
        body.corporateNumber,
        "corporateNumber",
      ),
      establishedDate: parseOptionalString(
        body.establishedDate,
        "establishedDate",
      ),
      capitalAmount: parseOptionalNumber(body.capitalAmount, "capitalAmount"),
      address: parseOptionalString(body.address, "address"),
      businessScope: parseOptionalString(body.businessScope, "businessScope"),
      employeeCount: parseOptionalNumber(body.employeeCount, "employeeCount"),
      fiscalYearEnd: parseOptionalString(body.fiscalYearEnd, "fiscalYearEnd"),
      website: parseOptionalString(body.website, "website"),
      contactPhone: parseOptionalString(body.contactPhone, "contactPhone"),
      contactEmail: parseOptionalString(body.contactEmail, "contactEmail"),
      ownerUserId: parseOptionalString(body.ownerUserId, "ownerUserId"),
    });
  }

  /**
   * 获取企业客户列表。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 企业客户列表
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListCompaniesQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.companiesService.list(ctx, {
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
      keyword: typeof query.keyword === "string" ? query.keyword : undefined,
    });
  }

  /**
   * 获取指定企业客户详情。
   * @param req HTTP 请求对象
   * @param id 企业客户 ID
   * @returns 匹配的企业客户信息
   */
  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const company = await this.companiesService.get(ctx, id);
    if (!company) throw new BadRequestException("Company not found");
    return company;
  }

  /**
   * 更新企业客户信息。
   * @param req HTTP 请求对象
   * @param id 企业客户 ID
   * @param body 更新请求体
   * @returns 更新后的企业客户信息
   */
  @RequireRoles("staff")
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateCompanyBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.companiesService.update(ctx, id, {
      companyName:
        body.companyName !== undefined
          ? requireString(body.companyName, "companyName")
          : undefined,
      companyNo: parseOptionalString(body.companyNo, "companyNo"),
      corporateNumber: parseOptionalString(
        body.corporateNumber,
        "corporateNumber",
      ),
      establishedDate: parseOptionalString(
        body.establishedDate,
        "establishedDate",
      ),
      capitalAmount: parseOptionalNumber(body.capitalAmount, "capitalAmount"),
      address: parseOptionalString(body.address, "address"),
      businessScope: parseOptionalString(body.businessScope, "businessScope"),
      employeeCount: parseOptionalNumber(body.employeeCount, "employeeCount"),
      fiscalYearEnd: parseOptionalString(body.fiscalYearEnd, "fiscalYearEnd"),
      website: parseOptionalString(body.website, "website"),
      contactPhone: parseOptionalString(body.contactPhone, "contactPhone"),
      contactEmail: parseOptionalString(body.contactEmail, "contactEmail"),
      ownerUserId: parseOptionalString(body.ownerUserId, "ownerUserId"),
    });
  }

  /**
   * 删除企业客户。
   * @param req HTTP 请求对象
   * @param id 企业客户 ID
   * @returns 删除成功状态
   */
  @RequireRoles("manager")
  @Delete(":id")
  async delete(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    await this.companiesService.softDelete(ctx, id);
    return { ok: true };
  }
}
