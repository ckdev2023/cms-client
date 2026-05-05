import {
  BadRequestException,
  Body,
  Controller,
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
import { hasRequiredRole } from "../auth/roles";
import type { RequestContext } from "../tenancy/requestContext";
import { DocumentTemplatesService } from "./documentTemplates.service";

type HttpRequest = { requestContext?: RequestContext };

type CreateBody = {
  templateName?: unknown;
  caseType?: unknown;
  docType?: unknown;
  language?: unknown;
  versionNo?: unknown;
  contentBody?: unknown;
  variablesSchema?: unknown;
  activeFlag?: unknown;
};

type UpdateBody = {
  templateName?: unknown;
  caseType?: unknown;
  docType?: unknown;
  language?: unknown;
  contentBody?: unknown;
  variablesSchema?: unknown;
  activeFlag?: unknown;
};

type ListQuery = {
  caseType?: unknown;
  language?: unknown;
  includeInactive?: unknown;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  throw new BadRequestException(`Invalid ${field}`);
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new BadRequestException(`Invalid ${field}`);
}

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return Math.floor(num);
}

function optionalJsonObject(
  value: unknown,
  field: string,
): Record<string, unknown> | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "object" && !Array.isArray(value))
    return value as Record<string, unknown>;
  throw new BadRequestException(`Invalid ${field}`);
}

/**
 * 文書模板 CRUD — manager 可写、viewer 可读。
 */
@Controller("document-templates")
export class DocumentTemplatesController {
  /**
   * 构造函数。
   * @param service 文書模板服务。
   */
  constructor(
    @Inject(DocumentTemplatesService)
    private readonly service: DocumentTemplatesService,
  ) {}

  /**
   * 列出文書模板（viewer 可读；includeInactive 仅 manager 生效）。
   * @param req HTTP 请求对象。
   * @param query 查询参数。
   * @returns 列表结果。
   */
  @RequireRoles("viewer")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListQuery) {
    const ctx = requireCtx(req);

    const includeInactiveRaw = optionalBoolean(
      query.includeInactive,
      "includeInactive",
    );
    const includeInactive =
      includeInactiveRaw === true && hasRequiredRole(ctx.role, ["manager"]);

    return this.service.list(ctx, {
      caseType: optionalString(query.caseType, "caseType"),
      language: optionalString(query.language, "language"),
      includeInactive,
    });
  }

  /**
   * 获取单条文書模板。
   * @param req HTTP 请求对象。
   * @param id 模板 ID。
   * @returns 单条 DTO。
   */
  @RequireRoles("viewer")
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = requireCtx(req);

    const dto = await this.service.get(ctx, id);
    if (!dto) throw new NotFoundException("Document template not found");
    return dto;
  }

  /**
   * 创建文書模板。
   * @param req HTTP 请求对象。
   * @param body 请求体。
   * @returns 新建的 DTO。
   */
  @RequireRoles("manager")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateBody) {
    const ctx = requireCtx(req);

    return this.service.create(ctx, {
      templateName: requireString(body.templateName, "templateName"),
      caseType: requireString(body.caseType, "caseType"),
      docType: requireString(body.docType, "docType"),
      language: optionalString(body.language, "language"),
      versionNo: optionalNumber(body.versionNo, "versionNo"),
      contentBody: optionalString(body.contentBody, "contentBody"),
      variablesSchema: optionalJsonObject(
        body.variablesSchema,
        "variablesSchema",
      ),
      activeFlag: optionalBoolean(body.activeFlag, "activeFlag"),
    });
  }

  /**
   * 更新文書模板。
   * @param req HTTP 请求对象。
   * @param id 模板 ID。
   * @param body 请求体。
   * @returns 更新后的 DTO。
   */
  @RequireRoles("manager")
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateBody,
  ) {
    const ctx = requireCtx(req);

    return this.service.update(ctx, id, {
      templateName: optionalString(body.templateName, "templateName"),
      caseType: optionalString(body.caseType, "caseType"),
      docType: optionalString(body.docType, "docType"),
      language: optionalString(body.language, "language"),
      contentBody: optionalString(body.contentBody, "contentBody"),
      variablesSchema: optionalJsonObject(
        body.variablesSchema,
        "variablesSchema",
      ),
      activeFlag: optionalBoolean(body.activeFlag, "activeFlag"),
    });
  }
}

/**
 * 从请求对象提取请求上下文，缺失则抛 401。
 * @param req HTTP 请求对象。
 * @returns 请求上下文。
 */
function requireCtx(req: HttpRequest): RequestContext {
  const ctx = req.requestContext;
  if (!ctx) throw new UnauthorizedException("Missing request context");
  return ctx;
}
