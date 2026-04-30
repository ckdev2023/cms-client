import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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

import { RequireRoles } from "../auth/auth.decorators";
import { CasesService } from "../cases/cases.service";
import {
  DOCUMENT_ITEM_ERROR_CODES,
  DOCUMENT_ITEM_OWNER_SIDES,
  DOCUMENT_ITEM_STATUSES,
  WAIVE_REASON_CODES,
  type WaiveReasonCode,
} from "../documents.types";
import type { RequestContext } from "../tenancy/requestContext";
import { DocumentItemsService } from "./documentItems.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type CreateDocumentItemBody = {
  caseId: unknown;
  checklistItemCode: unknown;
  name: unknown;
  ownerSide?: unknown;
  dueAt?: unknown;
  note?: unknown;
  category?: unknown;
  surveyData?: unknown;
};

type UpdateDocumentItemBody = {
  name?: unknown;
  ownerSide?: unknown;
  dueAt?: unknown;
  note?: unknown;
};

type TransitionBody = {
  toStatus: unknown;
};

type UpdateSurveyDataBody = {
  surveyData: unknown;
};

type WaiveBody = {
  reasonCode: unknown;
  note?: unknown;
};

type ListDocumentItemsQuery = {
  caseId?: unknown;
  status?: unknown;
  statusIn?: unknown;
  ownerSide?: unknown;
  category?: unknown;
  page?: unknown;
  limit?: unknown;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}

function parseOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;
  return requireString(value, field);
}

function parseOptionalNullableString(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireString(value, field);
}

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

const VALID_CATEGORIES = new Set([
  "standard",
  "questionnaire",
  "company",
  "personal",
]);

function parseOptionalCategory(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !VALID_CATEGORIES.has(value)) {
    throw new BadRequestException(
      `Invalid category: ${typeof value === "string" ? value : "non-string"}`,
    );
  }
  return value;
}

const VALID_OWNER_SIDES = new Set<string>(DOCUMENT_ITEM_OWNER_SIDES);

const VALID_STATUS_IN_VALUES = new Set<string>([
  ...DOCUMENT_ITEM_STATUSES.filter((s) => s !== "deleted"),
  "missing",
]);

function parseOptionalOwnerSide(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !VALID_OWNER_SIDES.has(value)) {
    throw new BadRequestException(
      `Invalid ownerSide: ${typeof value === "string" ? value : "non-string"}`,
    );
  }
  return value;
}

function parseOptionalStatusIn(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  const raw = typeof value === "string" ? value.split(",") : undefined;
  if (!raw || raw.length === 0) {
    throw new BadRequestException("Invalid statusIn");
  }
  for (const v of raw) {
    if (!VALID_STATUS_IN_VALUES.has(v)) {
      throw new BadRequestException(`Invalid statusIn value: ${v}`);
    }
  }
  return raw;
}

function parseSurveyData(
  value: unknown,
): Record<string, unknown> | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new BadRequestException("surveyData must be a JSON object or null");
}

function requireSurveyData(value: unknown): Record<string, unknown> | null {
  if (value === null) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new BadRequestException("surveyData must be a JSON object or null");
}

/**
 * DocumentItems CRUD 接口。
 */
@Controller("document-items")
export class DocumentItemsController {
  /**
   * 构造函数。
   * @param documentItemsService 资料项服务实例
   * @param casesService 案件服务（S9 readonly 守卫）
   */
  constructor(
    @Inject(DocumentItemsService)
    private readonly documentItemsService: DocumentItemsService,
    @Inject(CasesService)
    private readonly casesService: CasesService,
  ) {}

  /**
   * 创建资料项。
   * @param req HTTP 请求对象
   * @param body 创建请求体
   * @returns 创建成功的资料项
   */
  @RequireRoles("staff")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateDocumentItemBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.documentItemsService.create(ctx, {
      caseId: requireString(body.caseId, "caseId"),
      checklistItemCode: requireString(
        body.checklistItemCode,
        "checklistItemCode",
      ),
      name: requireString(body.name, "name"),
      ownerSide: parseOptionalString(body.ownerSide, "ownerSide"),
      dueAt: parseOptionalNullableString(body.dueAt, "dueAt"),
      note: parseOptionalNullableString(body.note, "note"),
      category: parseOptionalCategory(body.category),
      surveyData: parseSurveyData(body.surveyData),
    });
  }

  /**
   * 获取资料项列表。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 资料项列表
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListDocumentItemsQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.documentItemsService.list(ctx, {
      caseId: parseOptionalString(query.caseId, "caseId"),
      status: parseOptionalString(query.status, "status"),
      statusIn: parseOptionalStatusIn(query.statusIn),
      ownerSide: parseOptionalOwnerSide(query.ownerSide),
      category: parseOptionalCategory(query.category),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  /**
   * 案件资料完成率汇总。
   * @param req HTTP 请求对象
   * @param query 查询参数（caseId 必填）
   * @param query.caseId 案件 ID（必填）
   * @returns 完成率汇总
   */
  @RequireRoles("viewer")
  @Get("completion-rate")
  async getCompletionRate(
    @Req() req: HttpRequest,
    @Query() query: { caseId?: unknown },
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const caseId = requireString(query.caseId, "caseId");
    return this.documentItemsService.getCompletionRate(ctx, caseId);
  }

  /**
   * 获取指定资料项详情。
   * @param req HTTP 请求对象
   * @param id 资料项 ID
   * @returns 资料项信息
   */
  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const item = await this.documentItemsService.get(ctx, id);
    if (!item) throw new BadRequestException("Document item not found");
    return item;
  }

  /**
   * 更新资料项基本信息。
   * @param req HTTP 请求对象
   * @param id 资料项 ID
   * @param body 更新请求体
   * @returns 更新后的资料项
   */
  @RequireRoles("staff")
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateDocumentItemBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.documentItemsService.update(ctx, id, {
      name: parseOptionalString(body.name, "name"),
      ownerSide: parseOptionalString(body.ownerSide, "ownerSide"),
      dueAt: parseOptionalNullableString(body.dueAt, "dueAt"),
      note: parseOptionalNullableString(body.note, "note"),
    });
  }

  /**
   * 更新问卷资料项的 survey_data（仅限 category=questionnaire）。
   * @param req HTTP 请求对象
   * @param id 资料项 ID
   * @param body survey_data 更新请求体
   * @returns 更新后的资料项
   */
  @RequireRoles("staff")
  @Patch(":id/survey-data")
  async updateSurveyData(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateSurveyDataBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.documentItemsService.updateSurveyData(ctx, id, {
      surveyData: requireSurveyData(body.surveyData),
    });
  }

  /**
   * 状态变更。
   * @param req HTTP 请求对象
   * @param id 资料项 ID
   * @param body 变更请求体
   * @returns 变更后的资料项
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

    return this.documentItemsService.transition(ctx, id, {
      toStatus: requireString(body.toStatus, "toStatus"),
    });
  }

  /**
   * 豁免资料项（专用端点，独立白名单 + S9 守卫）。
   * @param req HTTP 请求对象
   * @param id 资料项 ID
   * @param body 豁免请求体
   * @returns 更新后的资料项
   */
  @RequireRoles("staff")
  @Post(":id/waive")
  async waive(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: WaiveBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const reasonCode = requireString(
      body.reasonCode,
      "reasonCode",
    ) as WaiveReasonCode;
    if (!WAIVE_REASON_CODES.includes(reasonCode)) {
      throw new BadRequestException(`Invalid reasonCode: ${reasonCode}`);
    }
    const note = parseOptionalNullableString(body.note, "note");

    const item = await this.documentItemsService.get(ctx, id);
    if (!item) throw new BadRequestException("Document item not found");

    await this.assertCaseNotS9(ctx, item.caseId);

    return this.documentItemsService.waive(ctx, id, { reasonCode, note });
  }

  /**
   * 催办操作。
   * @param req HTTP 请求对象
   * @param id 资料项 ID
   * @returns 更新后的资料项
   */
  @RequireRoles("staff")
  @Post(":id/follow-up")
  async followUp(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.documentItemsService.followUp(ctx, id);
  }

  /**
   * 软删除资料项。
   * @param req HTTP 请求对象
   * @param id 资料项 ID
   * @returns 删除成功状态
   */
  @RequireRoles("manager")
  @Delete(":id")
  async delete(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    await this.documentItemsService.softDelete(ctx, id);
    return { ok: true };
  }

  private async assertCaseNotS9(
    ctx: RequestContext,
    caseId: string,
  ): Promise<void> {
    const caseEntity = await this.casesService.get(ctx, caseId);
    if (!caseEntity) {
      throw new NotFoundException(
        DOCUMENT_ITEM_ERROR_CODES.NOT_FOUND + ": Parent case not found",
      );
    }
    const stage = caseEntity.stage ?? caseEntity.status;
    if (stage === "S9") {
      throw new BadRequestException(
        DOCUMENT_ITEM_ERROR_CODES.CASE_S9_READONLY +
          ": Parent case is archived (S9) and read-only",
      );
    }
  }
}
