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
import { ContactPersonsService } from "./contactPersons.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type CreateContactPersonBody = {
  name: unknown;
  companyId?: unknown;
  customerId?: unknown;
  roleTitle?: unknown;
  relationType?: unknown;
  phone?: unknown;
  email?: unknown;
  preferredLanguage?: unknown;
};

type UpdateContactPersonBody = Partial<CreateContactPersonBody>;

type ListContactPersonsQuery = {
  page?: unknown;
  limit?: unknown;
  companyId?: unknown;
  customerId?: unknown;
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
 * ContactPerson CRUD 接口。
 */
@Controller("contact-persons")
export class ContactPersonsController {
  /**
   * 构造函数。
   * @param contactPersonsService 联系人服务实例
   */
  constructor(
    @Inject(ContactPersonsService)
    private readonly contactPersonsService: ContactPersonsService,
  ) {}

  /**
   * 创建联系人。
   * @param req HTTP 请求对象
   * @param body 创建请求体
   * @returns 创建成功的联系人信息
   */
  @RequireRoles("staff")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateContactPersonBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.contactPersonsService.create(ctx, {
      name: requireString(body.name, "name"),
      companyId: parseOptionalString(body.companyId, "companyId"),
      customerId: parseOptionalString(body.customerId, "customerId"),
      roleTitle: parseOptionalString(body.roleTitle, "roleTitle"),
      relationType: parseOptionalString(body.relationType, "relationType"),
      phone: parseOptionalString(body.phone, "phone"),
      email: parseOptionalString(body.email, "email"),
      preferredLanguage:
        typeof body.preferredLanguage === "string"
          ? body.preferredLanguage
          : undefined,
    });
  }

  /**
   * 获取联系人列表。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 联系人列表
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListContactPersonsQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.contactPersonsService.list(ctx, {
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
      companyId:
        typeof query.companyId === "string" ? query.companyId : undefined,
      customerId:
        typeof query.customerId === "string" ? query.customerId : undefined,
    });
  }

  /**
   * 获取指定联系人详情。
   * @param req HTTP 请求对象
   * @param id 联系人 ID
   * @returns 匹配的联系人信息
   */
  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const contactPerson = await this.contactPersonsService.get(ctx, id);
    if (!contactPerson)
      throw new BadRequestException("Contact person not found");
    return contactPerson;
  }

  /**
   * 更新联系人信息。
   * @param req HTTP 请求对象
   * @param id 联系人 ID
   * @param body 更新请求体
   * @returns 更新后的联系人信息
   */
  @RequireRoles("staff")
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateContactPersonBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.contactPersonsService.update(ctx, id, {
      name:
        body.name !== undefined ? requireString(body.name, "name") : undefined,
      companyId: parseOptionalString(body.companyId, "companyId"),
      customerId: parseOptionalString(body.customerId, "customerId"),
      roleTitle: parseOptionalString(body.roleTitle, "roleTitle"),
      relationType: parseOptionalString(body.relationType, "relationType"),
      phone: parseOptionalString(body.phone, "phone"),
      email: parseOptionalString(body.email, "email"),
      preferredLanguage:
        typeof body.preferredLanguage === "string"
          ? body.preferredLanguage
          : undefined,
    });
  }

  /**
   * 删除联系人。
   * @param req HTTP 请求对象
   * @param id 联系人 ID
   * @returns 删除成功状态
   */
  @RequireRoles("manager")
  @Delete(":id")
  async delete(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    await this.contactPersonsService.softDelete(ctx, id);
    return { ok: true };
  }
}
