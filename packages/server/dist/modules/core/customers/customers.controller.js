var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
      return Reflect.metadata(k, v);
  };
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
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
import { isUuid } from "../tenancy/uuid";
import { FeatureFlagsService } from "../../feature-flags/featureFlags.service";
import { CustomersService } from "./customers.service";
import { mapCustomerToCreateResponseDto } from "./customers.dto-mappers.create";
import {
  parseActiveCases,
  parseContacts,
  parseLimit,
  parseLocalizedNames,
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
function requireCtx(req) {
  if (!req.requestContext)
    throw new UnauthorizedException("Missing request context");
  return req.requestContext;
}
function parseUuid(value, field) {
  if (!isUuid(value)) throw new BadRequestException(`Invalid ${field}`);
  return value;
}
/**
 * Customers CRUD 接口。
 */
let CustomersController = class CustomersController {
  customersService;
  permissionsService;
  featureFlagsService;
  /**
   * 构造函数。
   * @param customersService 客户服务实例
   * @param permissionsService 权限服务实例
   * @param featureFlagsService 功能开关服务实例
   */
  constructor(customersService, permissionsService, featureFlagsService) {
    this.customersService = customersService;
    this.permissionsService = permissionsService;
    this.featureFlagsService = featureFlagsService;
  }
  /**
   * 创建客户。
   * @param req - HTTP 请求。
   * @param body - 请求体。
   * @returns 创建成功的客户信息。
   */
  async create(req, body) {
    const ctx = requireCtx(req);
    const customer = await this.customersService.create(ctx, {
      type: parseType(body.type),
      baseProfile: parseObject(body.baseProfile),
      contacts: parseContacts(body.contacts),
      localizedNames: parseLocalizedNames(body.localizedNames),
    });
    return mapCustomerToCreateResponseDto(customer);
  }
  /**
   * 获取客户列表。
   * @param req - HTTP 请求。
   * @param query - 查询参数。
   * @returns 客户列表与总数。
   */
  async list(req, query) {
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
  async checkDuplicates(req, body) {
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
  async bulkAssignOwner(req, body) {
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
  async bulkChangeGroup(req, body) {
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
  async sendBmvQuestionnaire(req, id) {
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
  async generateBmvQuote(req, id) {
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
  async recordBmvSign(req, id) {
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
  async saveBmvSurvey(req, id, body) {
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
  async modifyBmvQuote(req, id, body) {
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
  async transitionBmvToCase(req, id, body) {
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
  async getBmvAggregate(req, id) {
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
  async get(req, id) {
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
  async update(req, id, body) {
    const ctx = requireCtx(req);
    await this.assertCanEditCustomer(ctx, id);
    return this.customersService.update(ctx, id, {
      type: body.type !== undefined ? parseType(body.type) : undefined,
      baseProfile: parseObject(body.baseProfile),
      contacts: parseContacts(body.contacts),
      localizedNames: parseLocalizedNames(body.localizedNames),
    });
  }
  /**
   * 删除客户。
   * @param req - HTTP 请求。
   * @param id - 客户 ID。
   * @returns 删除成功状态。
   */
  async delete(req, id) {
    const ctx = requireCtx(req);
    await this.assertCanEditCustomer(ctx, id);
    await this.customersService.softDelete(ctx, id);
    return { ok: true };
  }
  async assertBmvEnabled(ctx) {
    const resolution = await this.featureFlagsService.resolve(ctx, {
      key: "bmv",
    });
    if (!resolution.enabled) {
      throw new ForbiddenException(
        "BMV feature is not enabled for this organization",
      );
    }
  }
  async assertCanEditCustomer(ctx, id) {
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
  async assertCanEditCustomers(ctx, customerIds) {
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
};
__decorate(
  [
    RequireRoles("staff"),
    Post(),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  CustomersController.prototype,
  "create",
  null,
);
__decorate(
  [
    RequireRoles("viewer"),
    Get(),
    __param(0, Req()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  CustomersController.prototype,
  "list",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post("check-duplicates"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  CustomersController.prototype,
  "checkDuplicates",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post("bulk-assign-owner"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  CustomersController.prototype,
  "bulkAssignOwner",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post("bulk-change-group"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  CustomersController.prototype,
  "bulkChangeGroup",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/bmv/questionnaire/send"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  CustomersController.prototype,
  "sendBmvQuestionnaire",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/bmv/quote/generate"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  CustomersController.prototype,
  "generateBmvQuote",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/bmv/sign/record"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  CustomersController.prototype,
  "recordBmvSign",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/bmv/save-survey"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  CustomersController.prototype,
  "saveBmvSurvey",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/bmv/quote/modify"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  CustomersController.prototype,
  "modifyBmvQuote",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/bmv/transition-to-case"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  CustomersController.prototype,
  "transitionBmvToCase",
  null,
);
__decorate(
  [
    RequireRoles("viewer"),
    Get(":id/bmv"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  CustomersController.prototype,
  "getBmvAggregate",
  null,
);
__decorate(
  [
    RequireRoles("viewer"),
    Get(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  CustomersController.prototype,
  "get",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Patch(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  CustomersController.prototype,
  "update",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Delete(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  CustomersController.prototype,
  "delete",
  null,
);
CustomersController = __decorate(
  [
    Controller("customers"),
    __param(0, Inject(CustomersService)),
    __param(1, Inject(PermissionsService)),
    __param(2, Inject(FeatureFlagsService)),
    __metadata("design:paramtypes", [
      CustomersService,
      PermissionsService,
      FeatureFlagsService,
    ]),
  ],
  CustomersController,
);
export { CustomersController };
//# sourceMappingURL=customers.controller.js.map
