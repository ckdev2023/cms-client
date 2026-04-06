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
import { CustomersService } from "./customers.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type CreateCustomerBody = {
  type: unknown;
  baseProfile?: unknown;
  contacts?: unknown;
};

type UpdateCustomerBody = {
  type?: unknown;
  baseProfile?: unknown;
  contacts?: unknown;
};

type ListCustomersQuery = {
  page?: unknown;
  limit?: unknown;
};

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

function parseType(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException("Invalid type");
  }
  if (value !== "individual" && value !== "corporation") {
    throw new BadRequestException("Invalid type enum");
  }
  return value;
}

function parseObject(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new BadRequestException("Invalid object");
}

function parseContacts(value: unknown): Record<string, unknown>[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new BadRequestException("Invalid contacts item");
      }
    }
    return value as Record<string, unknown>[];
  }
  throw new BadRequestException("Invalid contacts");
}

/**
 * Customers CRUD 接口。
 */
@Controller("customers")
export class CustomersController {
  /**
   * 构造函数。
   * @param customersService 客户服务实例
   */
  constructor(
    @Inject(CustomersService)
    private readonly customersService: CustomersService,
  ) {}

  /**
   * 创建客户。
   * @param req HTTP 请求对象
   * @param body 创建客户请求体
   * @returns 创建成功的客户信息
   */
  @RequireRoles("staff")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateCustomerBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const type = parseType(body.type);
    const baseProfile = parseObject(body.baseProfile);
    const contacts = parseContacts(body.contacts);

    return this.customersService.create(ctx, { type, baseProfile, contacts });
  }

  /**
   * 获取客户列表。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 客户列表数组
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListCustomersQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const page = parsePage(query.page);
    const limit = parseLimit(query.limit);
    return this.customersService.list(ctx, { page, limit });
  }

  /**
   * 获取指定客户详情。
   * @param req HTTP 请求对象
   * @param id 客户 ID
   * @returns 匹配的客户信息
   */
  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const customer = await this.customersService.get(ctx, id);
    if (!customer) throw new BadRequestException("Customer not found");
    return customer;
  }

  /**
   * 更新客户信息。
   * @param req HTTP 请求对象
   * @param id 客户 ID
   * @param body 更新请求体
   * @returns 更新后的客户信息
   */
  @RequireRoles("staff")
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateCustomerBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const type = body.type !== undefined ? parseType(body.type) : undefined;
    const baseProfile = parseObject(body.baseProfile);
    const contacts = parseContacts(body.contacts);

    return this.customersService.update(ctx, id, { type, baseProfile, contacts });
  }

  /**
   * 删除客户。
   * @param req HTTP 请求对象
   * @param id 客户 ID
   * @returns 删除成功状态
   */
  @RequireRoles("manager")
  @Delete(":id")
  async delete(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    await this.customersService.softDelete(ctx, id);
    return { ok: true };
  }
}
