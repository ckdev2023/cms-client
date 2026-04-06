import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequireRoles } from "../core/auth/auth.decorators";
import type { RequestContext } from "../core/tenancy/requestContext";
import {
  isTemplateKind,
  type TemplateKind,
  type TemplateReleaseMode,
  type TemplateRollout,
} from "./templates.model";
import { TemplatesService } from "./templates.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type TemplatesVersionsQuery = {
  kind?: unknown;
  key?: unknown;
  limit?: unknown;
};

type TemplatesResolveQuery = {
  kind?: unknown;
  key?: unknown;
  entityId?: unknown;
};

type CreateVersionBody = {
  kind: unknown;
  key: unknown;
  config: unknown;
};

type ReleaseBody = {
  kind: unknown;
  key: unknown;
  version: unknown;
  rollout?: unknown;
};

type RollbackBody = {
  kind: unknown;
  key: unknown;
  toVersion?: unknown;
};

type SetModeBody = {
  kind: unknown;
  key: unknown;
  mode: unknown;
};

/**
 * 解析模板 key。
 *
 * @param v 待解析值
 * @returns key
 */
function parseKey(v: unknown): string {
  if (typeof v !== "string") throw new BadRequestException("Invalid key");
  const key = v.trim();
  if (key.length === 0 || key.length > 200) throw new BadRequestException("Invalid key");
  return key;
}

/**
 * 解析模板 kind。
 *
 * @param v 待解析值
 * @returns kind
 */
function parseKind(v: unknown): TemplateKind {
  if (!isTemplateKind(v)) throw new BadRequestException("Invalid kind");
  return v;
}

/**
 * 解析分页限制。
 *
 * @param v 待解析值
 * @returns limit
 */
function parseLimit(v: unknown): number | undefined {
  if (v === undefined) return undefined;
  const n =
    typeof v === "number" ? v : typeof v === "string" && v.length > 0 ? Number(v) : NaN;
  if (!Number.isFinite(n) || n <= 0) throw new BadRequestException("Invalid limit");
  return n;
}

/**
 * 解析模板 config（要求为 object）。
 *
 * @param v 待解析值
 * @returns config
 */
function parseConfig(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    throw new BadRequestException("Invalid config (object required)");
  }
  return v as Record<string, unknown>;
}

/**
 * 解析发布模式。
 *
 * @param v 待解析值
 * @returns mode
 */
function parseMode(v: unknown): TemplateReleaseMode {
  if (v === "legacy" || v === "template") return v;
  throw new BadRequestException("Invalid mode");
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);

const parseRolloutPercentage = (v: unknown): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new BadRequestException("Invalid rollout.percentage");
  }
  return n;
};

const parseRolloutSalt = (v: unknown): string =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : "default";

/**
 * 解析灰度 rollout。
 *
 * @param v 待解析值
 * @returns rollout
 */
function parseRollout(v: unknown): TemplateRollout | undefined {
  if (v === undefined) return undefined;
  if (!isPlainObject(v)) {
    throw new BadRequestException("Invalid rollout");
  }
  if (v.type === "all") return { type: "all" };
  if (v.type !== "percentage") throw new BadRequestException("Invalid rollout.type");
  const percentage = parseRolloutPercentage(v.percentage);
  const salt = parseRolloutSalt(v.salt);
  return { type: "percentage", percentage, salt };
}

/**
 * 解析版本号（正整数）。
 *
 * @param v 待解析值
 * @returns version
 */
function parseVersion(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new BadRequestException("Invalid version");
  }
  return n;
}

/**
 * 解析 entityId（可选）。
 *
 * @param v 待解析值
 * @returns entityId
 */
function parseEntityId(v: unknown): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new BadRequestException("Invalid entityId");
  const entityId = v.trim();
  if (entityId.length === 0 || entityId.length > 200) throw new BadRequestException("Invalid entityId");
  return entityId;
}

/**
 * 模板管理接口：版本管理 + 发布/回滚 + resolve（灰度决策）。
 */
@Controller("templates")
export class TemplatesController {
  /**
   * 创建 controller。
   *
   * @param templatesService templates service
   */
  constructor(
    @Inject(TemplatesService) private readonly templatesService: TemplatesService,
  ) {}

  /**
   * 查询模板版本列表。
   *
   * @param req 请求对象
   * @param query query 参数
   * @returns 版本列表
   */
  @Get("versions")
  async listVersions(@Req() req: HttpRequest, @Query() query: TemplatesVersionsQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const kind = parseKind(query.kind);
    const key = parseKey(query.key);
    const limit = parseLimit(query.limit);
    return this.templatesService.listVersions(ctx, { kind, key, limit });
  }

  /**
   * 创建模板新版本（manager 以上）。
   *
   * @param req 请求对象
   * @param body 请求体
   * @returns 创建后的版本记录
   */
  @RequireRoles("manager")
  @Post("versions")
  async createVersion(@Req() req: HttpRequest, @Body() body: CreateVersionBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const kind = parseKind(body.kind);
    const key = parseKey(body.key);
    const config = parseConfig(body.config);
    return this.templatesService.createVersion(ctx, { kind, key, config });
  }

  /**
   * 查询模板发布记录。
   *
   * @param req 请求对象
   * @param query query 参数
   * @returns 发布记录
   */
  @Get("release")
  async getRelease(@Req() req: HttpRequest, @Query() query: TemplatesVersionsQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const kind = parseKind(query.kind);
    const key = parseKey(query.key);
    return this.templatesService.getRelease(ctx, { kind, key });
  }

  /**
   * 发布指定版本为 current（manager 以上）。
   *
   * @param req 请求对象
   * @param body 请求体
   * @returns 发布记录
   */
  @RequireRoles("manager")
  @Post("release")
  async release(@Req() req: HttpRequest, @Body() body: ReleaseBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const kind = parseKind(body.kind);
    const key = parseKey(body.key);
    const version = parseVersion(body.version);
    const rollout = parseRollout(body.rollout);
    return this.templatesService.releaseVersion(ctx, { kind, key, version, rollout });
  }

  /**
   * 回滚到 previousVersion 或指定版本；无法回滚则切回 legacy（manager 以上）。
   *
   * @param req 请求对象
   * @param body 请求体
   * @returns 发布记录
   */
  @RequireRoles("manager")
  @Post("rollback")
  async rollback(@Req() req: HttpRequest, @Body() body: RollbackBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const kind = parseKind(body.kind);
    const key = parseKey(body.key);
    const toVersion = body.toVersion === undefined ? undefined : parseVersion(body.toVersion);
    return this.templatesService.rollback(ctx, { kind, key, toVersion });
  }

  /**
   * 设置发布模式（legacy/template）（manager 以上）。
   *
   * @param req 请求对象
   * @param body 请求体
   * @returns 发布记录
   */
  @RequireRoles("manager")
  @Post("mode")
  async setMode(@Req() req: HttpRequest, @Body() body: SetModeBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const kind = parseKind(body.kind);
    const key = parseKey(body.key);
    const mode = parseMode(body.mode);
    return this.templatesService.setMode(ctx, { kind, key, mode });
  }

  /**
   * 解析本次请求是否使用模板配置（包含灰度决策）。
   *
   * @param req 请求对象
   * @param query query 参数
   * @returns 解析结果
   */
  @Get("resolve")
  async resolve(@Req() req: HttpRequest, @Query() query: TemplatesResolveQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const kind = parseKind(query.kind);
    const key = parseKey(query.key);
    const entityId = parseEntityId(query.entityId);
    return this.templatesService.resolve(ctx, { kind, key, entityId });
  }
}
