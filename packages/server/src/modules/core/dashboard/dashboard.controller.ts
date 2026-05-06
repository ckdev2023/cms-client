import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequirePermission } from "../auth/auth.decorators";
import { PERMISSION_CODES } from "../auth/permissions.codes";
import type { RequestContext } from "../tenancy/requestContext";
import { isUuid } from "../tenancy/uuid";
import { DashboardService } from "./dashboard.service";
import type {
  DashboardGroupOption,
  DashboardScope,
  DashboardSummary,
  DashboardTimeWindow,
} from "./dashboard.shared";

type HttpRequest = {
  requestContext?: RequestContext;
};

type DashboardSummaryQuery = {
  scope?: unknown;
  timeWindow?: unknown;
  groupId?: unknown;
};

function parseScope(value: unknown): DashboardScope {
  if (value === undefined) return "mine";
  if (value === "mine" || value === "group" || value === "all") return value;
  throw new BadRequestException("Invalid scope");
}

function parseTimeWindow(value: unknown): DashboardTimeWindow {
  if (value === undefined) return 7;
  const parsed = Number(value);
  if (parsed === 7 || parsed === 30) return parsed;
  throw new BadRequestException("Invalid timeWindow");
}

function parseGroupId(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string")
    throw new BadRequestException("Invalid groupId");
  if (!isUuid(value)) throw new BadRequestException("Invalid groupId");
  return value;
}

/**
 * 提供后台仪表盘摘要接口。
 */
@Controller("dashboard")
export class DashboardController {
  /**
   * 创建仪表盘控制器。
   *
   * @param dashboardService 仪表盘服务实例。
   */
  constructor(
    @Inject(DashboardService)
    private readonly dashboardService: DashboardService,
  ) {}

  /**
   * 读取当前登录管理员可见范围内的仪表盘摘要数据。
   *
   * @param req 当前请求对象，用于提取租户上下文。
   * @param query 查询参数，包含范围与时间窗口。
   * @returns 供前端渲染仪表盘的摘要结果。
   */
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get("summary")
  async summary(
    @Req() req: HttpRequest,
    @Query() query: DashboardSummaryQuery,
  ): Promise<DashboardSummary> {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.dashboardService.getSummary(ctx, {
      scope: parseScope(query.scope),
      timeWindow: parseTimeWindow(query.timeWindow),
      groupId: parseGroupId(query.groupId),
    });
  }

  /**
   * 返回当前用户可见的 active group 列表。
   *
   * @param req 当前请求对象，用于提取租户上下文。
   * @returns group 选项列表，含 isPrimary 和 isMember 标记。
   */
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get("groups")
  async groups(@Req() req: HttpRequest): Promise<DashboardGroupOption[]> {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    return this.dashboardService.listVisibleGroups(ctx);
  }
}
