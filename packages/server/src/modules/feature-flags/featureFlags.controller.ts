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
import type { FeatureFlagRollout } from "./featureFlags.model";
import { FeatureFlagsService } from "./featureFlags.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type ListQuery = {
  key?: unknown;
};

type ResolveQuery = {
  key?: unknown;
  entityId?: unknown;
};

type UpsertBody = {
  key: unknown;
  enabled: unknown;
  rollout?: unknown;
  note?: unknown;
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);

function parseKey(v: unknown): string {
  if (typeof v !== "string") throw new BadRequestException("Invalid key");
  const key = v.trim();
  if (key.length === 0 || key.length > 200)
    throw new BadRequestException("Invalid key");
  return key;
}

function parseEnabled(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  throw new BadRequestException("Invalid enabled");
}

function parseEntityId(v: unknown): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new BadRequestException("Invalid entityId");
  const entityId = v.trim();
  if (entityId.length === 0 || entityId.length > 200)
    throw new BadRequestException("Invalid entityId");
  return entityId;
}

const parseRolloutPercentage = (v: unknown): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new BadRequestException("Invalid rollout.percentage");
  }
  return n;
};

const parseRolloutSalt = (v: unknown): string =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : "default";

function parseRollout(v: unknown): FeatureFlagRollout | undefined {
  if (v === undefined) return undefined;
  if (!isPlainObject(v)) throw new BadRequestException("Invalid rollout");
  if (v.type === "all") return { type: "all" };
  if (v.type !== "percentage")
    throw new BadRequestException("Invalid rollout.type");
  const percentage = parseRolloutPercentage(v.percentage);
  const salt = parseRolloutSalt(v.salt);
  return { type: "percentage", percentage, salt };
}

function parseNote(v: unknown): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new BadRequestException("Invalid note");
  const note = v.trim();
  if (note.length > 500) throw new BadRequestException("Invalid note");
  return note.length === 0 ? undefined : note;
}

/**
 * Feature Flag 管理接口：org 维度开关 + 灰度决策 + 快速关停。
 */
@Controller("feature-flags")
export class FeatureFlagsController {
  /**
   * 创建 controller。
   *
   * @param featureFlagsService feature flags service
   */
  constructor(
    @Inject(FeatureFlagsService)
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  /**
   * 查询本 org 的 feature flags（可选按 key 查询单条）。
   *
   * @param req 请求对象
   * @param query query 参数
   * @returns flags 或单条 flag
   */
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    if (query.key !== undefined) {
      const key = parseKey(query.key);
      const row = await this.featureFlagsService.get(ctx, key);
      return { flag: row };
    }
    const flags = await this.featureFlagsService.list(ctx);
    return { flags };
  }

  /**
   * 解析某个 flag 在本次请求下是否启用（支持按 entityId 灰度分桶）。
   *
   * @param req 请求对象
   * @param query query 参数
   * @returns 解析结果
   */
  @Get("resolve")
  async resolve(@Req() req: HttpRequest, @Query() query: ResolveQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const key = parseKey(query.key);
    const entityId = parseEntityId(query.entityId);
    return this.featureFlagsService.resolve(ctx, { key, entityId });
  }

  /**
   * 写入/更新 flag（manager 以上）。
   *
   * @param req 请求对象
   * @param body 请求体
   * @returns upsert 后的 flag
   */
  @RequireRoles("manager")
  @Post()
  async upsert(@Req() req: HttpRequest, @Body() body: UpsertBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const key = parseKey(body.key);
    const enabled = parseEnabled(body.enabled);
    const rollout = parseRollout(body.rollout);
    const note = parseNote(body.note);
    return this.featureFlagsService.upsert(ctx, {
      key,
      enabled,
      rollout,
      note,
    });
  }
}
