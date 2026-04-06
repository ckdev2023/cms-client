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

import { RequireRoles } from "../auth/auth.decorators";
import { TimelineService } from "./timeline.service";
import type { RequestContext } from "../tenancy/requestContext";
import {
  isTimelineEntityType,
  type TimelineEntityType,
} from "../model/coreEntities";

/**
 * Timeline 写入示例请求体。
 */
export type TimelineDemoBody = {
  entityType: unknown;
  entityId: unknown;
  action: unknown;
  payload?: Record<string, unknown>;
};

type HttpRequest = {
  requestContext?: RequestContext;
};

type TimelineListQuery = {
  entityType?: unknown;
  entityId?: unknown;
  limit?: unknown;
};

type ParsedTimelineListQuery = {
  entityType?: TimelineEntityType;
  entityId?: string;
  limit?: number;
};

/**
 * 解析并校验 Timeline list query 参数。
 *
 * @param query query 参数
 * @returns 校验后的参数
 */
function parseTimelineListQuery(
  query: TimelineListQuery,
): ParsedTimelineListQuery {
  const entityType = query.entityType;
  if (entityType !== undefined && !isTimelineEntityType(entityType)) {
    throw new BadRequestException("Invalid entityType");
  }

  const entityId = query.entityId;
  if (
    entityId !== undefined &&
    (typeof entityId !== "string" || entityId.length === 0)
  ) {
    throw new BadRequestException("Invalid entityId");
  }

  const rawLimit = query.limit;
  const limit =
    rawLimit === undefined
      ? undefined
      : typeof rawLimit === "string"
        ? Number(rawLimit)
        : typeof rawLimit === "number"
          ? rawLimit
          : NaN;

  if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0)) {
    throw new BadRequestException("Invalid limit");
  }

  return { entityType, entityId, limit };
}

/**
 * Timeline 写入示例接口。
 */
@Controller("timeline")
export class TimelineController {
  /**
   * 创建 controller。
   *
   * @param timelineService timeline service
   */
  constructor(
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  /**
   * 查询当前组织下的 timeline 记录。
   *
   * @param req 请求对象
   * @param query query 参数
   * @returns timeline 记录列表
   */
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: TimelineListQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const parsed = parseTimelineListQuery(query);
    return this.timelineService.list(ctx, parsed);
  }

  /**
   * 写入一条 timeline（用于验证 org_id 边界 + 统一写入链路）。
   *
   * @param req 请求对象
   * @param body 请求体
   * @returns ok
   */
  @RequireRoles("manager")
  @Post("demo")
  async writeDemo(@Req() req: HttpRequest, @Body() body: TimelineDemoBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    if (!isTimelineEntityType(body.entityType)) {
      throw new BadRequestException("Invalid entityType");
    }
    if (typeof body.entityId !== "string" || body.entityId.length === 0) {
      throw new BadRequestException("Invalid entityId");
    }
    if (typeof body.action !== "string" || body.action.length === 0) {
      throw new BadRequestException("Invalid action");
    }

    await this.timelineService.write(ctx, {
      entityType: body.entityType,
      entityId: body.entityId,
      action: body.action,
      payload: body.payload ?? {},
    });

    return { ok: true };
  }
}
