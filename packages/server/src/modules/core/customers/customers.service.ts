import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import { PermissionsService } from "../auth/permissions.service";
import type { Case, Customer } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
import { CasesService } from "../cases/cases.service";
import {
  buildCustomerDuplicateWhere,
  buildCustomerListSelect,
  buildCustomerListWhere,
  getCustomerDuplicateMatchedFields,
} from "./customers.query";
import { createCustomerWithNumbering } from "./customers.numbering";
import {
  createCustomerBmvDeps,
  getCustomerEntity,
  getCustomerRowById,
} from "./customers.service.deps";
import {
  bulkAssignOwner as runBulkAssignOwner,
  bulkChangeGroup as runBulkChangeGroup,
} from "./customers.bulk";
import {
  generateBmvQuote,
  getBmvAggregate,
  modifyBmvQuote,
  recordBmvSign,
  saveBmvSurvey,
  sendBmvQuestionnaire,
  transitionBmvToCase,
} from "./customers.bmv";
import {
  mapCustomerToDetailDto,
  mapCustomerToSummaryDto,
} from "./customers.dto-mappers";
import { mapCustomerAggregates } from "./customers.row-aggregates";
import {
  CUSTOMER_COLS,
  activeCustomerPredicate,
  mapCustomerRow,
  normalizeDistinctIds,
  validateBaseProfile,
} from "./customers.utils";
import { mergeLocalizedNamesIntoProfile } from "./customers.localized-names";
import type {
  CustomerBmvView,
  CustomerCreateInput,
  CustomerDetailDto,
  CustomerDuplicateCheckInput,
  CustomerDuplicateCheckResult,
  CustomerListInput,
  CustomerQueryRow,
  CustomerSummaryDto,
  CustomerUpdateInput,
  ModifyBmvQuoteInput,
  SaveBmvSurveyInput,
  TransitionBmvToCaseInput,
} from "./customers.types";

export type {
  CustomerActiveCasesFilter,
  CustomerCreateInput,
  CustomerDuplicateCheckInput,
  CustomerDuplicateCheckResult,
  CustomerDuplicateField,
  CustomerListInput,
  CustomerListScope,
  CustomerLocalizedNames,
  CustomerQueryRow,
  CustomerUpdateInput,
} from "./customers.types";

/**
 * 客户服务，提供客户信息的 CRUD 与软删除能力，以及 Timeline 日志记录。
 */
@Injectable()
export class CustomersService {
  /**
   * 创建客户服务实例。
   * @param pool PostgreSQL 连接池。
   * @param permissionsService 客户访问与编辑权限校验服务。
   * @param timelineService 用于写入 Timeline 日志的服务。
   * @param casesService 案件服务，用于 BMV 转案件流程。
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
    @Inject(CasesService) private readonly casesService: CasesService,
  ) {}

  /**
   * 创建新的客户记录。
   * @param ctx 请求上下文。
   * @param input 客户创建参数。
   * @returns 创建成功的客户实体。
   */
  async create(
    ctx: RequestContext,
    input: CustomerCreateInput,
  ): Promise<Customer> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const mergedProfile = mergeLocalizedNamesIntoProfile(
      input.baseProfile ?? {},
      input.localizedNames,
    );
    const baseProfile = validateBaseProfile(input.type, mergedProfile);
    const contacts = input.contacts ?? [];
    const customer = await tenantDb.transaction((tx) =>
      createCustomerWithNumbering(tx, {
        orgId: ctx.orgId,
        type: input.type,
        baseProfile,
        contacts,
      }),
    );
    await this.timelineService.write(ctx, {
      entityType: "customer",
      entityId: customer.id,
      action: "customer.created",
      payload: { type: customer.type },
    });
    return customer;
  }

  /**
   * 根据 ID 获取客户详情。
   * @param ctx 请求上下文。
   * @param id 客户 ID。
   * @returns 客户详情；若不存在或无权限则返回 null。
   */
  async get(
    ctx: RequestContext,
    id: string,
  ): Promise<CustomerDetailDto | null> {
    const row = await getCustomerRowById(ctx, id, this.pool);
    if (!row) return null;
    const customer = mapCustomerRow(row);
    if (
      !this.permissionsService.canAccessCustomer(
        ctx.userId,
        ctx.role,
        ctx.groupId,
        customer,
      )
    ) {
      return null;
    }
    return mapCustomerToDetailDto(customer, mapCustomerAggregates(row));
  }

  /**
   * 获取客户列表。
   * @param ctx 请求上下文。
   * @param input 列表查询参数。
   * @returns 客户摘要数组与总数。
   */
  async list(
    ctx: RequestContext,
    input: CustomerListInput = {},
  ): Promise<{ items: CustomerSummaryDto[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const { whereClause, params } = buildCustomerListWhere(ctx, input);
    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*)::text as count from customers c ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);
    const listParams = [...params, limit, offset];
    const result = await tenantDb.query<CustomerQueryRow>(
      `
        select ${buildCustomerListSelect("c")}
        from customers c
        ${whereClause}
        order by created_at desc, id desc
        limit $${String(params.length + 1)} offset $${String(params.length + 2)}
      `,
      listParams,
    );

    return {
      items: result.rows.map((row) =>
        mapCustomerToSummaryDto(
          mapCustomerRow(row),
          mapCustomerAggregates(row),
        ),
      ),
      total,
    };
  }

  /**
   * 按 ID 批量读取客户。
   * @param ctx 请求上下文。
   * @param ids 客户 ID 集合。
   * @returns 匹配的客户实体数组。
   */
  async getByIds(ctx: RequestContext, ids: string[]): Promise<Customer[]> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const normalizedIds = normalizeDistinctIds(ids, "customerIds");
    const result = await tenantDb.query<CustomerQueryRow>(
      `
        select ${CUSTOMER_COLS}
        from customers
        where id::text = any($1::text[])
          and ${activeCustomerPredicate()}
        order by created_at desc, id desc
      `,
      [normalizedIds],
    );
    return result.rows.map(mapCustomerRow);
  }

  /**
   * 按姓名、电话、邮箱执行客户去重检查。
   * @param ctx 请求上下文
   * @param input 去重检查参数
   * @returns 命中的客户及命中字段
   */
  async checkDuplicates(
    ctx: RequestContext,
    input: CustomerDuplicateCheckInput,
  ): Promise<CustomerDuplicateCheckResult[]> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const where = [activeCustomerPredicate("c")];
    const params: unknown[] = [];
    const {
      where: duplicateClauses,
      normalizedName,
      normalizedPhone,
      normalizedEmail,
    } = buildCustomerDuplicateWhere(input, params);
    if (duplicateClauses.length === 0) return [];
    where.push(`(${duplicateClauses.join(" or ")})`);
    const result = await tenantDb.query<CustomerQueryRow>(
      `
        select ${CUSTOMER_COLS}
        from customers c
        where ${where.join(" and ")}
        order by created_at desc, id desc
      `,
      params,
    );

    return result.rows
      .map((row) => mapCustomerRow(row))
      .map((customer) => {
        const matchedFields = getCustomerDuplicateMatchedFields(
          customer,
          normalizedName,
          normalizedPhone,
          normalizedEmail,
        );
        return { customer, matchedFields };
      })
      .filter((resultItem) => resultItem.matchedFields.length > 0);
  }

  /**
   * 批量调整客户负责人。
   * @param ctx 请求上下文。
   * @param customerIds 客户 ID 集合。
   * @param ownerUserId 新负责人 ID。
   * @returns 成功更新的客户数量。
   */
  async bulkAssignOwner(
    ctx: RequestContext,
    customerIds: string[],
    ownerUserId: string,
  ): Promise<number> {
    return runBulkAssignOwner(
      {
        ctx,
        customerIds,
        pool: this.pool,
        timelineService: this.timelineService,
        getByIds: this.getByIds.bind(this),
      },
      ownerUserId,
    );
  }

  /**
   * 批量调整客户分组。
   * @param ctx 请求上下文。
   * @param customerIds 客户 ID 集合。
   * @param group 新分组编码。
   * @returns 成功更新的客户数量。
   */
  async bulkChangeGroup(
    ctx: RequestContext,
    customerIds: string[],
    group: string,
  ): Promise<number> {
    return runBulkChangeGroup(
      {
        ctx,
        customerIds,
        pool: this.pool,
        timelineService: this.timelineService,
        getByIds: this.getByIds.bind(this),
      },
      group,
    );
  }

  /**
   * 发送经营管理签问卷。
   * @param ctx - 请求上下文。
   * @param id - 客户 ID。
   * @returns 更新后的客户实体。
   */
  async sendBmvQuestionnaire(
    ctx: RequestContext,
    id: string,
  ): Promise<Customer> {
    return sendBmvQuestionnaire(this.bmvDeps(ctx, id));
  }
  /**
   * 生成经营管理签报价。
   * @param ctx - 请求上下文。
   * @param id - 客户 ID。
   * @returns 更新后的客户实体。
   */
  async generateBmvQuote(ctx: RequestContext, id: string): Promise<Customer> {
    return generateBmvQuote(this.bmvDeps(ctx, id));
  }
  /**
   * 记录经营管理签已签约。
   * @param ctx - 请求上下文。
   * @param id - 客户 ID。
   * @returns 更新后的客户实体。
   */
  async recordBmvSign(ctx: RequestContext, id: string): Promise<Customer> {
    return recordBmvSign(this.bmvDeps(ctx, id));
  }
  /**
   * 保存 BMV 问卷回收数据并投影 survey_data。
   * @param ctx - 请求上下文。
   * @param id - 客户 ID。
   * @param input - 问卷保存参数。
   * @returns 更新后的客户实体。
   */
  async saveBmvSurvey(
    ctx: RequestContext,
    id: string,
    input: SaveBmvSurveyInput,
  ): Promise<Customer> {
    return saveBmvSurvey(this.bmvDeps(ctx, id), input);
  }

  /**
   * 修改 BMV 报价（保留历史版本）。
   * @param ctx - 请求上下文。
   * @param id - 客户 ID。
   * @param input - 报价修改参数。
   * @returns 更新后的客户实体。
   */
  async modifyBmvQuote(
    ctx: RequestContext,
    id: string,
    input: ModifyBmvQuoteInput,
  ): Promise<Customer> {
    return modifyBmvQuote(this.bmvDeps(ctx, id), input);
  }

  /**
   * BMV 客户转正式案件。
   * @param ctx - 请求上下文。
   * @param id - 客户 ID。
   * @param input - 可选覆写参数。
   * @returns 创建的案件实体。
   */
  async transitionBmvToCase(
    ctx: RequestContext,
    id: string,
    input?: TransitionBmvToCaseInput,
  ): Promise<Case> {
    return transitionBmvToCase(
      {
        ...this.bmvDeps(ctx, id),
        createCase: this.casesService.create.bind(this.casesService),
      },
      input,
    );
  }

  /**
   * 获取 BMV 承接聚合数据。
   * @param ctx - 请求上下文。
   * @param id - 客户 ID。
   * @returns BMV 聚合 DTO。
   */
  async getBmvAggregate(
    ctx: RequestContext,
    id: string,
  ): Promise<CustomerBmvView> {
    return getBmvAggregate(this.bmvDeps(ctx, id));
  }

  /**
   * 更新客户信息。
   * @param ctx 请求上下文。
   * @param id 客户 ID。
   * @param input 更新参数。
   * @returns 更新后的客户实体。
   */
  async update(
    ctx: RequestContext,
    id: string,
    input: CustomerUpdateInput,
  ): Promise<Customer> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const current = await getCustomerEntity(ctx, id, this.pool);
    if (!current) throw new NotFoundException("Customer not found or deleted");
    const nextType = input.type ?? current.type;
    const mergedProfile = mergeLocalizedNamesIntoProfile(
      { ...current.baseProfile, ...(input.baseProfile ?? {}) },
      input.localizedNames,
    );
    const nextBaseProfile = validateBaseProfile(nextType, mergedProfile);
    const nextContacts = input.contacts ?? current.contacts;
    const result = await tenantDb.query<CustomerQueryRow>(
      `update customers set type = $2, base_profile = $3::jsonb,
       contacts = $4::jsonb, updated_at = now()
       where id = $1 and ${activeCustomerPredicate()}
       returning ${CUSTOMER_COLS}`,
      [
        id,
        nextType,
        JSON.stringify(nextBaseProfile),
        JSON.stringify(nextContacts),
      ],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to update customer");
    const customer = mapCustomerRow(row);
    await this.timelineService.write(ctx, {
      entityType: "customer",
      entityId: customer.id,
      action: "customer.updated",
      payload: { before: current, after: customer },
    });
    return customer;
  }

  /**
   * 软删除客户。
   * @param ctx 请求上下文。
   * @param id 客户 ID。
   * @returns 无返回值。
   */
  async softDelete(ctx: RequestContext, id: string): Promise<void> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const current = await getCustomerEntity(ctx, id, this.pool);
    if (!current)
      throw new NotFoundException("Customer not found or already deleted");
    const casesCheck = await tenantDb.query<{ exists: boolean }>(
      `select exists(select 1 from cases where customer_id = $1) as "exists"`,
      [id],
    );
    if (casesCheck.rows[0]?.exists) {
      throw new BadRequestException(
        "Cannot delete customer with existing cases",
      );
    }
    const nextBaseProfile = { ...current.baseProfile, status: "deleted" };
    const result = await tenantDb.query<CustomerQueryRow>(
      `update customers set base_profile = $2::jsonb, updated_at = now()
       where id = $1 returning ${CUSTOMER_COLS}`,
      [id, JSON.stringify(nextBaseProfile)],
    );
    if (!result.rowCount || result.rowCount === 0)
      throw new BadRequestException("Failed to soft delete customer");
    await this.timelineService.write(ctx, {
      entityType: "customer",
      entityId: id,
      action: "customer.deleted",
      payload: { status: "deleted" },
    });
  }
  private bmvDeps(ctx: RequestContext, id: string) {
    return createCustomerBmvDeps(this.pool, this.timelineService, ctx, id);
  }
}
