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
import type { RequestContext } from "../tenancy/requestContext";
import { CasesService } from "./cases.service";
import type {
  HttpRequest,
  CreateCaseBody,
  UpdateCaseBody,
  TransitionBody,
  BillingRiskAckBody,
  PostApprovalStageBody,
  WorkflowStepTransitionBody,
  PhaseTransitionBody,
  ListCasesQuery,
} from "./cases.controller-bodies";

/**
 * UpdateCaseBody → CaseUpdateInput 変換。
 * @param body 更新請求体
 * @returns CaseUpdateInput
 */
function parseUpdateCaseBody(body: UpdateCaseBody) {
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
@Controller("cases")
export class CasesController {
  /**
   * 构造函数。
   * @param casesService 案件服务
   * @param permissionsService 权限服务
   */
  constructor(
    @Inject(CasesService)
    private readonly casesService: CasesService,
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * 创建案件。
   * @param req HTTP 请求
   * @param body 创建请求体
   * @returns 创建成功的案件
   */
  @RequireRoles("staff")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateCaseBody) {
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
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListCasesQuery) {
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
  @RequireRoles("viewer")
  @Get(":id/billing-tab-aggregate")
  async getBillingTabAggregate(
    @Req() req: HttpRequest,
    @Param("id") id: string,
  ) {
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
  @RequireRoles("viewer")
  @Get(":id/aggregate")
  async getAggregate(@Req() req: HttpRequest, @Param("id") id: string) {
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
  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
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
  @RequireRoles("staff")
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateCaseBody,
  ) {
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
  @RequireRoles("staff")
  @Post(":id/transition")
  async transition(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: TransitionBody,
  ) {
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
  @RequireRoles("staff")
  @Post(":id/phase-transition")
  async phaseTransition(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: PhaseTransitionBody,
  ) {
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
  @RequireRoles("staff")
  @Post(":id/billing-risk-ack")
  async acknowledgeBillingRisk(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: BillingRiskAckBody,
  ) {
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
  @RequireRoles("staff")
  @Post(":id/post-approval-stage")
  async updatePostApprovalStage(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: PostApprovalStageBody,
  ) {
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
  @RequireRoles("staff")
  @Post(":id/workflow-step-transition")
  async transitionWorkflowStep(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: WorkflowStepTransitionBody,
  ) {
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
  @RequireRoles("manager")
  @Delete(":id")
  async delete(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    await this.assertCanEditCase(ctx, id);

    await this.casesService.softDelete(ctx, id);
    return { ok: true };
  }

  private async assertCanEditCase(
    ctx: RequestContext,
    id: string,
  ): Promise<void> {
    try {
      await this.casesService.assertCanEditCase(ctx, id);
    } catch (e) {
      if (e instanceof NotFoundException) return;
      throw e;
    }
  }
}
