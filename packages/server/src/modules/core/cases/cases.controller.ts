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

import {
  requireString,
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

type HttpRequest = {
  requestContext?: RequestContext;
};

type CreateCaseBody = {
  customerId: unknown;
  caseTypeCode: unknown;
  ownerUserId: unknown;
  stage?: unknown;
  status?: unknown;
  dueAt?: unknown;
  metadata?: unknown;
  caseNo?: unknown;
  caseName?: unknown;
  caseSubtype?: unknown;
  applicationType?: unknown;
  companyId?: unknown;
  priority?: unknown;
  riskLevel?: unknown;
  assistantUserId?: unknown;
  sourceChannel?: unknown;
  signedAt?: unknown;
  acceptedAt?: unknown;
  submissionDate?: unknown;
  resultDate?: unknown;
  residenceExpiryDate?: unknown;
  resultOutcome?: unknown;
  quotePrice?: unknown;
  groupId?: unknown;
  crossGroupReason?: unknown;
};

type UpdateCaseBody = {
  caseTypeCode?: unknown;
  ownerUserId?: unknown;
  dueAt?: unknown;
  metadata?: unknown;
  caseNo?: unknown;
  caseName?: unknown;
  caseSubtype?: unknown;
  applicationType?: unknown;
  companyId?: unknown;
  priority?: unknown;
  riskLevel?: unknown;
  assistantUserId?: unknown;
  sourceChannel?: unknown;
  signedAt?: unknown;
  acceptedAt?: unknown;
  submissionDate?: unknown;
  resultDate?: unknown;
  residenceExpiryDate?: unknown;
  archivedAt?: unknown;
  resultOutcome?: unknown;
  quotePrice?: unknown;
  overseasVisaStartAt?: unknown;
  entryConfirmedAt?: unknown;
  groupId?: unknown;
  groupTransferReason?: unknown;
};

type TransitionBody = {
  toStage?: unknown;
  toStatus?: unknown;
  closeReason?: unknown;
};

type BillingRiskAckBody = {
  reasonCode: unknown;
  reasonNote?: unknown;
  evidenceUrl?: unknown;
};

type PostApprovalStageBody = {
  stage: unknown;
};

type ListCasesQuery = {
  stage?: unknown;
  status?: unknown;
  resultOutcome?: unknown;
  ownerUserId?: unknown;
  customerId?: unknown;
  priority?: unknown;
  riskLevel?: unknown;
  companyId?: unknown;
  page?: unknown;
  limit?: unknown;
  view?: unknown;
};

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
   * @param casesService 案件服务实例
   * @param permissionsService 权限服务实例
   */
  constructor(
    @Inject(CasesService)
    private readonly casesService: CasesService,
    @Inject(PermissionsService)
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * 创建案件。
   * @param req HTTP 请求对象
   * @param body 创建案件请求体
   * @returns 创建成功的案件信息
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
      crossGroupReason: parseOptionalNullableString(
        body.crossGroupReason,
        "crossGroupReason",
      ),
    });
  }

  /**
   * 获取案件列表。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 案件列表数组
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListCasesQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const listInput = {
      stage: parseOptionalString(query.stage, "stage"),
      status: parseOptionalString(query.status, "status"),
      resultOutcome: parseOptionalString(query.resultOutcome, "resultOutcome"),
      ownerUserId: parseOptionalString(query.ownerUserId, "ownerUserId"),
      customerId: parseOptionalString(query.customerId, "customerId"),
      priority: parseOptionalString(query.priority, "priority"),
      riskLevel: parseOptionalString(query.riskLevel, "riskLevel"),
      companyId: parseOptionalString(query.companyId, "companyId"),
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
   * 获取案件详情聚合 DTO（含关联展示名、tab 计数器、校验/收费概要）。
   * @param req HTTP 请求对象
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
   * @param req HTTP 请求对象
   * @param id 案件 ID
   * @returns 匹配的案件信息
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
    const caseEntity = await this.casesService.get(ctx, id);
    if (!caseEntity) return;

    if (
      !this.permissionsService.canEditCase(
        ctx.userId,
        ctx.role,
        ctx.groupId,
        caseEntity,
      )
    ) {
      throw new ForbiddenException("Insufficient permissions to edit case");
    }
  }
}
