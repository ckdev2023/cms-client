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
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import {
  requireString,
  parseCaseScope,
  parseOptionalString,
  parseOptionalNullableString,
  parseOptionalNullableNumber,
  parseObject,
  parsePage,
  parseLimit,
} from "./cases.parsers";
import { RequireRoles } from "../auth/auth.decorators";
import {
  PermissionsService,
  resolveRoleTier,
} from "../auth/permissions.service";
import { CasesService } from "./cases.service";
/**
 * UpdateCaseBody → CaseUpdateInput 変換。
 * @param body 更新請求体
 * @returns CaseUpdateInput
 */
function parseUpdateCaseBody(body) {
  return {
    caseTypeCode: parseOptionalString(body.caseTypeCode, "caseTypeCode"),
    ownerUserId: parseOptionalString(body.ownerUserId, "ownerUserId"),
    groupId: parseOptionalNullableString(body.groupId, "groupId"),
    groupTransferReason: parseOptionalNullableString(
      body.groupTransferReason,
      "groupTransferReason",
    ),
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
    resultOutcome: parseOptionalNullableString(
      body.resultOutcome,
      "resultOutcome",
    ),
    quotePrice: parseOptionalNullableNumber(body.quotePrice, "quotePrice"),
    visaPlan: parseOptionalNullableString(body.visaPlan, "visaPlan"),
    overseasVisaStartAt: parseOptionalNullableString(
      body.overseasVisaStartAt,
      "overseasVisaStartAt",
    ),
    entryConfirmedAt: parseOptionalNullableString(
      body.entryConfirmedAt,
      "entryConfirmedAt",
    ),
  };
}
/**
 * Cases CRUD 接口。
 */
let CasesController = class CasesController {
  casesService;
  permissionsService;
  /**
   * 构造函数。
   * @param casesService 案件服务
   * @param permissionsService 权限服务
   */
  constructor(casesService, permissionsService) {
    this.casesService = casesService;
    this.permissionsService = permissionsService;
  }
  /**
   * 创建案件。
   * @param req HTTP 请求
   * @param body 创建请求体
   * @returns 创建成功的案件
   */
  async create(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    if (!this.permissionsService.canCreateCase(ctx.role)) {
      throw new ForbiddenException("Insufficient permissions to create case");
    }
    return this.casesService.create(ctx, {
      customerId: requireString(body.customerId, "customerId"),
      caseTypeCode: requireString(body.caseTypeCode, "caseTypeCode"),
      ownerUserId: requireString(body.ownerUserId, "ownerUserId"),
      groupId: parseOptionalNullableString(body.groupId, "groupId"),
      stage: parseOptionalString(body.stage, "stage"),
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
      resultOutcome: parseOptionalNullableString(
        body.resultOutcome,
        "resultOutcome",
      ),
      quotePrice: parseOptionalNullableNumber(body.quotePrice, "quotePrice"),
      visaPlan: parseOptionalNullableString(body.visaPlan, "visaPlan"),
      crossGroupReason: parseOptionalNullableString(
        body.crossGroupReason,
        "crossGroupReason",
      ),
    });
  }
  /**
   * 案件列表。
   * @param req HTTP 请求
   * @param query 查询参数
   * @returns 案件列表
   */
  async list(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const listInput = {
      scope: parseCaseScope(query.scope),
      stage: parseOptionalString(query.stage, "stage"),
      status: parseOptionalString(query.status, "status"),
      resultOutcome: parseOptionalString(query.resultOutcome, "resultOutcome"),
      ownerUserId: parseOptionalString(query.ownerUserId, "ownerUserId"),
      customerId: parseOptionalString(query.customerId, "customerId"),
      priority: parseOptionalString(query.priority, "priority"),
      riskLevel: parseOptionalString(query.riskLevel, "riskLevel"),
      companyId: parseOptionalString(query.companyId, "companyId"),
      phase: parseOptionalString(query.phase, "phase"),
      search: parseOptionalString(query.search, "search"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
      visibility: {
        userId: ctx.userId,
        roleTier: resolveRoleTier(ctx.role),
        groupId: ctx.groupId,
      },
    };
    if (query.view === "summary") {
      return this.casesService.listSummary(ctx, listInput);
    }
    return this.casesService.list(ctx, listInput);
  }
  /**
   * 案件 billing tab 一次性聚合。
   * @param req HTTP 请求
   * @param id 案件 ID
   * @returns CaseBillingTabAggregate
   */
  async getBillingTabAggregate(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.casesService.getBillingTabAggregate(ctx, id);
  }
  /**
   * 案件详情聚合 DTO。
   * @param req HTTP 请求
   * @param id 案件 ID
   * @returns 聚合 DTO
   */
  async getAggregate(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const aggregate = await this.casesService.getDetailAggregate(ctx, id);
    if (!aggregate) throw new BadRequestException("Case not found");
    if (
      !this.permissionsService.canViewCase(
        ctx.userId,
        ctx.role,
        ctx.groupId,
        aggregate.case,
      )
    ) {
      throw new ForbiddenException("Insufficient permissions to view case");
    }
    return aggregate;
  }
  /**
   * 获取指定案件详情。
   * @param req HTTP 请求
   * @param id 案件 ID
   * @returns 案件详情
   */
  async get(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const caseEntity = await this.casesService.get(ctx, id);
    if (!caseEntity) throw new BadRequestException("Case not found");
    if (
      !this.permissionsService.canViewCase(
        ctx.userId,
        ctx.role,
        ctx.groupId,
        caseEntity,
      )
    ) {
      throw new ForbiddenException("Insufficient permissions to view case");
    }
    return caseEntity;
  }
  /**
   * 更新案件基本信息。
   * @param req HTTP 请求对象
   * @param id 案件 ID
   * @param body 更新请求体
   * @returns 更新后的案件信息
   */
  async update(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    await this.assertCanEditCase(ctx, id);
    return this.casesService.update(ctx, id, parseUpdateCaseBody(body));
  }
  /**
   * 状态变更。
   * @param req HTTP 请求对象
   * @param id 案件 ID
   * @param body 变更请求体
   * @returns 变更后的案件信息
   */
  async transition(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    await this.assertCanEditCase(ctx, id);
    return this.casesService.transition(ctx, id, {
      toStage: parseOptionalString(body.toStage, "toStage"),
      toStatus: parseOptionalString(body.toStatus, "toStatus"),
      closeReason: parseOptionalNullableString(body.closeReason, "closeReason"),
    });
  }
  /**
   * businessPhase 维度流转。
   * @param req HTTP 请求
   * @param id 案件 ID
   * @param body 流转请求体
   * @returns 更新后案件
   */
  async phaseTransition(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    await this.assertCanEditCase(ctx, id);
    return this.casesService.transitionPhase(ctx, id, {
      toPhase: requireString(body.toPhase, "toPhase"),
      closeReason: parseOptionalNullableString(body.closeReason, "closeReason"),
      resultOutcome: parseOptionalNullableString(
        body.resultOutcome,
        "resultOutcome",
      ),
    });
  }
  /**
   * 记录欠款风险确认。
   * @param req HTTP 请求对象
   * @param id 案件 ID
   * @param body 确认请求体
   * @returns 更新后的案件信息
   */
  async acknowledgeBillingRisk(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    await this.assertCanEditCase(ctx, id);
    return this.casesService.acknowledgeBillingRisk(ctx, id, {
      reasonCode: requireString(body.reasonCode, "reasonCode"),
      reasonNote: parseOptionalString(body.reasonNote, "reasonNote"),
      evidenceUrl: parseOptionalString(body.evidenceUrl, "evidenceUrl"),
    });
  }
  /**
   * 更新下签后子阶段。
   * @param req HTTP 请求对象
   * @param id 案件 ID
   * @param body 子阶段请求体
   * @returns 更新后的案件信息
   */
  async updatePostApprovalStage(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    await this.assertCanEditCase(ctx, id);
    return this.casesService.updatePostApprovalStage(ctx, id, {
      stage: requireString(body.stage, "stage"),
    });
  }
  /**
   * P1 业务子步骤流转。
   * @param req HTTP 请求
   * @param id 案件 ID
   * @param body 流转请求体
   * @returns 更新后案件
   */
  async transitionWorkflowStep(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    await this.assertCanEditCase(ctx, id);
    return this.casesService.transitionWorkflowStep(ctx, id, {
      toStepCode: requireString(body.toStepCode, "toStepCode"),
    });
  }
  /**
   * 软删除案件。
   * @param req HTTP 请求对象
   * @param id 案件 ID
   * @returns 删除成功状态
   */
  async delete(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    await this.assertCanEditCase(ctx, id);
    await this.casesService.softDelete(ctx, id);
    return { ok: true };
  }
  async assertCanEditCase(ctx, id) {
    try {
      await this.casesService.assertCanEditCase(ctx, id);
    } catch (e) {
      if (e instanceof NotFoundException) return;
      throw e;
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
  CasesController.prototype,
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
  CasesController.prototype,
  "list",
  null,
);
__decorate(
  [
    RequireRoles("viewer"),
    Get(":id/billing-tab-aggregate"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  CasesController.prototype,
  "getBillingTabAggregate",
  null,
);
__decorate(
  [
    RequireRoles("viewer"),
    Get(":id/aggregate"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  CasesController.prototype,
  "getAggregate",
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
  CasesController.prototype,
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
  CasesController.prototype,
  "update",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/transition"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  CasesController.prototype,
  "transition",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/phase-transition"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  CasesController.prototype,
  "phaseTransition",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/billing-risk-ack"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  CasesController.prototype,
  "acknowledgeBillingRisk",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/post-approval-stage"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  CasesController.prototype,
  "updatePostApprovalStage",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/workflow-step-transition"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  CasesController.prototype,
  "transitionWorkflowStep",
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
  CasesController.prototype,
  "delete",
  null,
);
CasesController = __decorate(
  [
    Controller("cases"),
    __param(0, Inject(CasesService)),
    __param(1, Inject(PermissionsService)),
    __metadata("design:paramtypes", [CasesService, PermissionsService]),
  ],
  CasesController,
);
export { CasesController };
//# sourceMappingURL=cases.controller.js.map
