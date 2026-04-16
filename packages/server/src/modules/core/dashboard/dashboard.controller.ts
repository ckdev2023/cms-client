import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequireRoles } from "../auth/auth.decorators";
import type { RequestContext } from "../tenancy/requestContext";
import { DashboardService } from "./dashboard.service";
import type {
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
  @RequireRoles("viewer")
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
    });
  }
}
