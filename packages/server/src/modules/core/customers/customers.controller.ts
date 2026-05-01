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
import { isUuid } from "../tenancy/uuid";
import { FeatureFlagsService } from "../../feature-flags/featureFlags.service";
import { CustomersService } from "./customers.service";
import { mapCustomerToCreateResponseDto } from "./customers.dto-mappers.create";
import {
  parseActiveCases,
  parseContacts,
  parseLimit,
  parseObject,
  parseOptionalNumber,
  parseOptionalTrimmedString,
  parsePage,
  parseRequiredObject,
  parseRequiredTrimmedString,
  parseScope,
  parseStringArray,
  parseType,
} from "./customers.controller-parsers";

type HttpRequest = { requestContext?: RequestContext };
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
type BulkAssignOwnerBody = { customerIds?: unknown; ownerId?: unknown };
type BulkChangeGroupBody = { customerIds?: unknown; group?: unknown };
type SaveBmvSurveyBody = {
  intakeFormId?: unknown;
  formData?: unknown;
  surveyData?: unknown;
};
type ModifyBmvQuoteBody = {
  appUserId?: unknown;
  formData?: unknown;
  amount?: unknown;
  visaPlan?: unknown;
};
type TransitionBmvToCaseBody = { ownerUserId?: unknown; groupId?: unknown };

function requireCtx(req: HttpRequest): RequestContext {
  if (!req.requestContext)
    throw new UnauthorizedException("Missing request context");
  return req.requestContext;
}

function parseUuid(value: string, field: string): string {
  if (!isUuid(value)) throw new BadRequestException(`Invalid ${field}`);
  return value;
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
   * @param featureFlagsService 功能开关服务实例
   */
  constructor(
    @Inject(CustomersService)
    private readonly customersService: CustomersService,
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
    @Inject(FeatureFlagsService)
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  /**
   * 创建客户。
   * @param req - HTTP 请求。
   * @param body - 请求体。
   * @returns 创建成功的客户信息。
   */
  @RequireRoles("staff")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateCustomerBody) {
    const ctx = requireCtx(req);
    const customer = await this.customersService.create(ctx, {
      type: parseType(body.type),
      baseProfile: parseObject(body.baseProfile),
      contacts: parseContacts(body.contacts),
    });
    return mapCustomerToCreateResponseDto(customer);
  }

  /**
   * 获取客户列表。
   * @param req - HTTP 请求。
   * @param query - 查询参数。
   * @returns 客户列表与总数。
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListCustomersQuery) {
    const ctx = requireCtx(req);
    return this.customersService.list(ctx, {
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
  }

  /**
   * 检查客户去重候选项。
   * @param req - HTTP 请求。
   * @param body - 去重检查参数。
   * @returns 命中结果列表。
   */
  @RequireRoles("staff")
  @Post("check-duplicates")
  async checkDuplicates(
    @Req() req: HttpRequest,
    @Body() body: CheckDuplicatesBody,
  ) {
    const ctx = requireCtx(req);
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
   * @param req - HTTP 请求。
   * @param body - 批量指派请求体。
   * @returns 更新结果。
   */
  @RequireRoles("staff")
  @Post("bulk-assign-owner")
  async bulkAssignOwner(
    @Req() req: HttpRequest,
    @Body() body: BulkAssignOwnerBody,
  ) {
    const ctx = requireCtx(req);
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
   * @param req - HTTP 请求。
   * @param body - 批量调组请求体。
   * @returns 更新结果。
   */
  @RequireRoles("staff")
  @Post("bulk-change-group")
  async bulkChangeGroup(
    @Req() req: HttpRequest,
    @Body() body: BulkChangeGroupBody,
  ) {
    const ctx = requireCtx(req);
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
   * @param req - HTTP 请求。
   * @param id - 客户 ID。
   * @returns 更新后的客户信息。
   */
  @RequireRoles("staff")
  @Post(":id/bmv/questionnaire/send")
  async sendBmvQuestionnaire(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = requireCtx(req);
    await this.assertBmvEnabled(ctx);
    await this.assertCanEditCustomer(ctx, id);
    return this.customersService.sendBmvQuestionnaire(ctx, id);
  }

  /**
   * 生成经营管理签报价。
   * @param req - HTTP 请求。
   * @param id - 客户 ID。
   * @returns 更新后的客户信息。
   */
  @RequireRoles("staff")
  @Post(":id/bmv/quote/generate")
  async generateBmvQuote(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = requireCtx(req);
    await this.assertBmvEnabled(ctx);
    await this.assertCanEditCustomer(ctx, id);
    return this.customersService.generateBmvQuote(ctx, id);
  }

  /**
   * 记录经营管理签已签约。
   * @param req - HTTP 请求。
   * @param id - 客户 ID。
   * @returns 更新后的客户信息。
   */
  @RequireRoles("staff")
  @Post(":id/bmv/sign/record")
  async recordBmvSign(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = requireCtx(req);
    await this.assertBmvEnabled(ctx);
    await this.assertCanEditCustomer(ctx, id);
    return this.customersService.recordBmvSign(ctx, id);
  }

  /**
   * 保存 BMV 问卷回收数据。
   * @param req - HTTP 请求。
   * @param id - 客户 ID。
   * @param body - 问卷保存请求体。
   * @returns 更新后的客户信息。
   */
  @RequireRoles("staff")
  @Post(":id/bmv/save-survey")
  async saveBmvSurvey(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: SaveBmvSurveyBody,
  ) {
    const ctx = requireCtx(req);
    await this.assertBmvEnabled(ctx);
    await this.assertCanEditCustomer(ctx, id);
    return this.customersService.saveBmvSurvey(ctx, id, {
      intakeFormId: parseRequiredTrimmedString(
        body.intakeFormId,
        "intakeFormId",
      ),
      formData: parseRequiredObject(body.formData, "formData"),
      surveyData: parseObject(body.surveyData),
    });
  }

  /**
   * 修改 BMV 报价（保留历史版本）。
   * @param req - HTTP 请求。
   * @param id - 客户 ID。
   * @param body - 报价修改请求体。
   * @returns 更新后的客户信息。
   */
  @RequireRoles("staff")
  @Post(":id/bmv/quote/modify")
  async modifyBmvQuote(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: ModifyBmvQuoteBody,
  ) {
    const ctx = requireCtx(req);
    await this.assertBmvEnabled(ctx);
    await this.assertCanEditCustomer(ctx, id);
    return this.customersService.modifyBmvQuote(ctx, id, {
      appUserId: parseRequiredTrimmedString(body.appUserId, "appUserId"),
      formData: parseRequiredObject(body.formData, "formData"),
      amount: parseOptionalNumber(body.amount, "amount"),
      visaPlan: parseOptionalTrimmedString(body.visaPlan, "visaPlan"),
    });
  }

  /**
   * BMV 客户转正式案件。
   * @param req - HTTP 请求。
   * @param id - 客户 ID。
   * @param body - 可选覆写参数。
   * @returns 创建的案件信息。
   */
  @RequireRoles("staff")
  @Post(":id/bmv/transition-to-case")
  async transitionBmvToCase(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: TransitionBmvToCaseBody,
  ) {
    const ctx = requireCtx(req);
    await this.assertBmvEnabled(ctx);
    await this.assertCanEditCustomer(ctx, id);
    return this.customersService.transitionBmvToCase(ctx, id, {
      ownerUserId: parseOptionalTrimmedString(body.ownerUserId, "ownerUserId"),
      groupId: parseOptionalTrimmedString(body.groupId, "groupId"),
    });
  }

  /**
   * 获取 BMV 承接聚合数据。
   * @param req - HTTP 请求。
   * @param id - 客户 ID。
   * @returns BMV 聚合 DTO。
   */
  @RequireRoles("viewer")
  @Get(":id/bmv")
  async getBmvAggregate(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = requireCtx(req);
    await this.assertBmvEnabled(ctx);
    return this.customersService.getBmvAggregate(ctx, id);
  }

  /**
   * 获取指定客户详情。
   * @param req - HTTP 请求。
   * @param id - 客户 ID。
   * @returns 匹配的客户信息。
   */
  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = requireCtx(req);
    const customer = await this.customersService.get(ctx, parseUuid(id, "id"));
    if (!customer) throw new BadRequestException("Customer not found");
    return customer;
  }

  /**
   * 更新客户信息。
   * @param req - HTTP 请求。
   * @param id - 客户 ID。
   * @param body - 更新请求体。
   * @returns 更新后的客户信息。
   */
  @RequireRoles("staff")
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateCustomerBody,
  ) {
    const ctx = requireCtx(req);
    await this.assertCanEditCustomer(ctx, id);
    return this.customersService.update(ctx, id, {
      type: body.type !== undefined ? parseType(body.type) : undefined,
      baseProfile: parseObject(body.baseProfile),
      contacts: parseContacts(body.contacts),
    });
  }

  /**
   * 删除客户。
   * @param req - HTTP 请求。
   * @param id - 客户 ID。
   * @returns 删除成功状态。
   */
  @RequireRoles("manager")
  @Delete(":id")
  async delete(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = requireCtx(req);
    await this.assertCanEditCustomer(ctx, id);
    await this.customersService.softDelete(ctx, id);
    return { ok: true };
  }

  private async assertBmvEnabled(ctx: RequestContext): Promise<void> {
    const resolution = await this.featureFlagsService.resolve(ctx, {
      key: "bmv",
    });
    if (!resolution.enabled) {
      throw new ForbiddenException(
        "BMV feature is not enabled for this organization",
      );
    }
  }

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

  private async assertCanEditCustomers(
    ctx: RequestContext,
    customerIds: string[],
  ): Promise<void> {
    const customers = await this.customersService.getByIds(ctx, customerIds);
    if (customers.length !== customerIds.length)
      throw new BadRequestException("Some customers were not found");
    if (
      customers.some(
        (c) =>
          !this.permissionsService.canEditCustomer(
            ctx.userId,
            ctx.role,
            ctx.groupId,
            c,
          ),
      )
    ) {
      throw new ForbiddenException("Insufficient permissions to edit customer");
    }
  }
}
