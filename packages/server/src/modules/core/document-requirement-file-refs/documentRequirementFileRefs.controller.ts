import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequireRoles } from "../auth/auth.decorators";
import { CasesService } from "../cases/cases.service";
import { DocumentItemsService } from "../document-items/documentItems.service";
import type { RequestContext } from "../tenancy/requestContext";
import { isUuid } from "../tenancy/uuid";
import { DocumentRequirementFileRefsService } from "./documentRequirementFileRefs.service";

type HttpRequest = { requestContext?: RequestContext };

type LinkBody = {
  requirementId?: unknown;
  fileVersionId?: unknown;
  linkedFromRequirementId?: unknown;
};

type ListQuery = {
  requirementId?: unknown;
  candidates?: unknown;
  limit?: unknown;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}

function parseUuid(value: unknown, field: string): string {
  const str = requireString(value, field);
  if (!isUuid(str)) throw new BadRequestException(`Invalid ${field}`);
  return str;
}

function parseOptionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return parseUuid(value, field);
}

function parseLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid limit");
  const i = Math.floor(n);
  if (i < 1 || i > 200) throw new BadRequestException("Invalid limit");
  return i;
}

function parseBooleanQuery(value: unknown): boolean {
  return value === "true" || value === "1";
}

/**
 * DocumentRequirementFileRefs API 控制器。
 *
 * 端点：
 * - POST   /document-requirement-file-refs（引用既有版本，cross_case_link）
 * - GET    /document-requirement-file-refs?requirementId=...&candidates=true（跨案件候选）
 * - GET    /document-requirement-file-refs?requirementId=...（按资料项列出引用）
 * - DELETE /document-requirement-file-refs/:id（撤销引用）
 */
@Controller("document-requirement-file-refs")
export class DocumentRequirementFileRefsController {
  /**
   * 构造函数。
   * @param refsService 引用服务
   * @param documentItemsService 资料项服务（S9 守卫用）
   * @param casesService 案件服务（S9 守卫用）
   */
  constructor(
    @Inject(DocumentRequirementFileRefsService)
    private readonly refsService: DocumentRequirementFileRefsService,
    @Inject(DocumentItemsService)
    private readonly documentItemsService: DocumentItemsService,
    @Inject(CasesService)
    private readonly casesService: CasesService,
  ) {}

  /**
   * 引用既有文件版本（cross_case_link）。
   * @param req HTTP 请求对象
   * @param body 引用请求体
   * @returns 创建的引用记录
   */
  @RequireRoles("staff")
  @Post()
  async link(@Req() req: HttpRequest, @Body() body: LinkBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const requirementId = parseUuid(body.requirementId, "requirementId");
    await this.assertRequirementCaseNotS9(ctx, requirementId);

    return this.refsService.link(ctx, {
      requirementId,
      fileVersionId: parseUuid(body.fileVersionId, "fileVersionId"),
      linkedFromRequirementId: parseOptionalUuid(
        body.linkedFromRequirementId,
        "linkedFromRequirementId",
      ),
    });
  }

  /**
   * 列出引用记录或跨案件候选版本。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 引用列表或候选列表
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const requirementId = parseUuid(query.requirementId, "requirementId");

    if (parseBooleanQuery(query.candidates)) {
      return this.refsService.listCandidates(
        ctx,
        requirementId,
        parseLimit(query.limit),
      );
    }

    return this.refsService.listByRequirement(ctx, requirementId);
  }

  /**
   * 撤销引用（须通过 S9 守卫 + submission package 锁定守卫）。
   * @param req HTTP 请求对象
   * @param id 引用记录 ID
   * @returns 删除结果
   */
  @RequireRoles("staff")
  @Delete(":id")
  async unlink(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const refId = parseUuid(id, "id");

    const existing = await this.refsService.get(ctx, refId);
    if (!existing) throw new NotFoundException("Reference not found");
    await this.assertRequirementCaseNotS9(ctx, existing.requirementId);

    await this.refsService.unlink(ctx, refId);
    return { ok: true };
  }

  private async assertRequirementCaseNotS9(
    ctx: RequestContext,
    requirementId: string,
  ): Promise<void> {
    const item = await this.documentItemsService.get(ctx, requirementId);
    if (!item) {
      throw new NotFoundException("Document requirement not found");
    }
    const caseEntity = await this.casesService.get(ctx, item.caseId);
    if (!caseEntity) {
      throw new NotFoundException("Parent case not found");
    }
    const stage = caseEntity.stage ?? caseEntity.status;
    if (stage === "S9") {
      throw new BadRequestException(
        "Parent case is archived (S9) and read-only",
      );
    }
  }
}
