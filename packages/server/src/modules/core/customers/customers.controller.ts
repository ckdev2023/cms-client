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
import {
  CustomersService,
  type CustomerActiveCasesFilter,
  type CustomerListScope,
} from "./customers.service";

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
  scope?: unknown;
  search?: unknown;
  keyword?: unknown;
  phone?: unknown;
  email?: unknown;
  group?: unknown;
  owner?: unknown;
  activeCases?: unknown;
};

type CheckDuplicatesBody = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  excludeCustomerId?: unknown;
};

type BulkAssignOwnerBody = {
  customerIds?: unknown;
  ownerId?: unknown;
};

type BulkChangeGroupBody = {
  customerIds?: unknown;
  group?: unknown;
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

function parseOptionalTrimmedString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new BadRequestException(`Invalid ${field}`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseRequiredTrimmedString(value: unknown, field: string): string {
  const parsed = parseOptionalTrimmedString(value, field);
  if (!parsed) throw new BadRequestException(`${field} is required`);
  return parsed;
}

function parseScope(value: unknown): CustomerListScope | undefined {
  if (value === undefined) return undefined;
  if (value === "mine" || value === "group" || value === "all") return value;
  throw new BadRequestException("Invalid scope");
}

function parseActiveCases(
  value: unknown,
): CustomerActiveCasesFilter | undefined {
  if (value === undefined) return undefined;
  if (value === "yes" || value === "has") return "yes";
  if (value === "no" || value === "none") return "no";
  throw new BadRequestException("Invalid activeCases");
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

function parseStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new BadRequestException(`Invalid ${field}`);
  }

  const items = value.map((item) => {
    if (typeof item !== "string") {
      throw new BadRequestException(`Invalid ${field} item`);
    }
    const trimmed = item.trim();
    if (trimmed.length === 0) {
      throw new BadRequestException(`Invalid ${field} item`);
    }
    return trimmed;
  });

  if (items.length === 0) {
    throw new BadRequestException(`${field} must contain at least one id`);
  }

  return [...new Set(items)];
}

/**
 * Customers CRUD 接口。
 */
@Controller("customers")
export class CustomersController {
  /**
   * 构造函数。
   * @param customersService 客户服务实例
   * @param permissionsService 权限服务实例
   */
  constructor(
    @Inject(CustomersService)
    private readonly customersService: CustomersService,
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
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

    const result = await this.customersService.list(ctx, {
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
      scope: parseScope(query.scope),
      keyword: parseOptionalTrimmedString(
        query.keyword ?? query.search,
        "keyword",
      ),
      phone: parseOptionalTrimmedString(query.phone, "phone"),
      email: parseOptionalTrimmedString(query.email, "email"),
      group: parseOptionalTrimmedString(query.group, "group"),
      owner: parseOptionalTrimmedString(query.owner, "owner"),
      activeCases: parseActiveCases(query.activeCases),
    });

    return result;
  }

  /**
   * 检查客户去重候选项。
   * @param req HTTP 请求对象
   * @param body 去重检查请求体
   * @returns 去重命中结果列表
   */
  @RequireRoles("staff")
  @Post("check-duplicates")
  async checkDuplicates(
    @Req() req: HttpRequest,
    @Body() body: CheckDuplicatesBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.customersService.checkDuplicates(ctx, {
      name: parseOptionalTrimmedString(body.name, "name"),
      phone: parseOptionalTrimmedString(body.phone, "phone"),
      email: parseOptionalTrimmedString(body.email, "email"),
      excludeCustomerId: parseOptionalTrimmedString(
        body.excludeCustomerId,
        "excludeCustomerId",
      ),
    });
  }

  /**
   * 批量调整客户负责人。
   * @param req HTTP 请求对象
   * @param body 批量指派负责人请求体
   * @returns 批量更新结果
   */
  @RequireRoles("staff")
  @Post("bulk-assign-owner")
  async bulkAssignOwner(
    @Req() req: HttpRequest,
    @Body() body: BulkAssignOwnerBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const customerIds = parseStringArray(body.customerIds, "customerIds");
    await this.assertCanEditCustomers(ctx, customerIds);
    const updatedCount = await this.customersService.bulkAssignOwner(
      ctx,
      customerIds,
      parseRequiredTrimmedString(body.ownerId, "ownerId"),
    );

    return { ok: true, updatedCount };
  }

  /**
   * 批量调整客户分组。
   * @param req HTTP 请求对象
   * @param body 批量调组请求体
   * @returns 批量更新结果
   */
  @RequireRoles("staff")
  @Post("bulk-change-group")
  async bulkChangeGroup(
    @Req() req: HttpRequest,
    @Body() body: BulkChangeGroupBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const customerIds = parseStringArray(body.customerIds, "customerIds");
    await this.assertCanEditCustomers(ctx, customerIds);
    const updatedCount = await this.customersService.bulkChangeGroup(
      ctx,
      customerIds,
      parseRequiredTrimmedString(body.group, "group"),
    );

    return { ok: true, updatedCount };
  }

  /**
   * 发送经营管理签问卷。
   * @param req HTTP 请求对象
   * @param id 客户 ID
   * @returns 更新后的客户信息
   */
  @RequireRoles("staff")
  @Post(":id/bmv/questionnaire/send")
  async sendBmvQuestionnaire(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    await this.assertCanEditCustomer(ctx, id);
    return this.customersService.sendBmvQuestionnaire(ctx, id);
  }

  /**
   * 生成经营管理签报价。
   * @param req HTTP 请求对象
   * @param id 客户 ID
   * @returns 更新后的客户信息
   */
  @RequireRoles("staff")
  @Post(":id/bmv/quote/generate")
  async generateBmvQuote(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    await this.assertCanEditCustomer(ctx, id);
    return this.customersService.generateBmvQuote(ctx, id);
  }

  /**
   * 记录经营管理签已签约。
   * @param req HTTP 请求对象
   * @param id 客户 ID
   * @returns 更新后的客户信息
   */
  @RequireRoles("staff")
  @Post(":id/bmv/sign/record")
  async recordBmvSign(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    await this.assertCanEditCustomer(ctx, id);
    return this.customersService.recordBmvSign(ctx, id);
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

    await this.assertCanEditCustomer(ctx, id);

    const type = body.type !== undefined ? parseType(body.type) : undefined;
    const baseProfile = parseObject(body.baseProfile);
    const contacts = parseContacts(body.contacts);

    return this.customersService.update(ctx, id, {
      type,
      baseProfile,
      contacts,
    });
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

    await this.assertCanEditCustomer(ctx, id);

    await this.customersService.softDelete(ctx, id);
    return { ok: true };
  }

  /**
   * 校验当前用户是否可以编辑指定客户。
   * @param ctx 请求上下文
   * @param id 客户 ID
   */
  private async assertCanEditCustomer(
    ctx: RequestContext,
    id: string,
  ): Promise<void> {
    const customers = await this.customersService.getByIds(ctx, [id]);
    const customer = customers.at(0);
    if (!customer) return;

    if (
      !this.permissionsService.canEditCustomer(
        ctx.userId,
        ctx.role,
        ctx.groupId,
        customer,
      )
    ) {
      throw new ForbiddenException("Insufficient permissions to edit customer");
    }
  }

  /**
   * 校验当前用户是否可以批量编辑指定客户。
   * @param ctx 请求上下文
   * @param customerIds 客户 ID 集合
   */
  private async assertCanEditCustomers(
    ctx: RequestContext,
    customerIds: string[],
  ): Promise<void> {
    const customers = await this.customersService.getByIds(ctx, customerIds);
    if (customers.length !== customerIds.length) {
      throw new BadRequestException("Some customers were not found");
    }

    if (
      customers.some(
        (customer) =>
          !this.permissionsService.canEditCustomer(
            ctx.userId,
            ctx.role,
            ctx.groupId,
            customer,
          ),
      )
    ) {
      throw new ForbiddenException("Insufficient permissions to edit customer");
    }
  }
}
