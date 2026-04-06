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

type ListDocumentItemsQuery = {
  caseId?: unknown;
  status?: unknown;
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

/**
 * DocumentItems CRUD 接口。
 */
@Controller("document-items")
export class DocumentItemsController {
  /**
   * 构造函数。
   * @param documentItemsService 资料项服务实例
   */
  constructor(
    @Inject(DocumentItemsService)
    private readonly documentItemsService: DocumentItemsService,
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
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
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
}
