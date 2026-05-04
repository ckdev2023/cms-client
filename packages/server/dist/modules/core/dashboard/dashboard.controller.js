var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
      return Reflect.metadata(k, v);
  };
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
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
import { isUuid } from "../tenancy/uuid";
import { DashboardService } from "./dashboard.service";
function parseScope(value) {
  if (value === undefined) return "mine";
  if (value === "mine" || value === "group" || value === "all") return value;
  throw new BadRequestException("Invalid scope");
}
function parseTimeWindow(value) {
  if (value === undefined) return 7;
  const parsed = Number(value);
  if (parsed === 7 || parsed === 30) return parsed;
  throw new BadRequestException("Invalid timeWindow");
}
function parseGroupId(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string")
    throw new BadRequestException("Invalid groupId");
  if (!isUuid(value)) throw new BadRequestException("Invalid groupId");
  return value;
}
/**
 * 提供后台仪表盘摘要接口。
 */
let DashboardController = class DashboardController {
  dashboardService;
  /**
   * 创建仪表盘控制器。
   *
   * @param dashboardService 仪表盘服务实例。
   */
  constructor(dashboardService) {
    this.dashboardService = dashboardService;
  }
  /**
   * 读取当前登录管理员可见范围内的仪表盘摘要数据。
   *
   * @param req 当前请求对象，用于提取租户上下文。
   * @param query 查询参数，包含范围与时间窗口。
   * @returns 供前端渲染仪表盘的摘要结果。
   */
  async summary(req, query) {
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
  async groups(req) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.dashboardService.listVisibleGroups(ctx);
  }
};
__decorate(
  [
    RequireRoles("viewer"),
    Get("summary"),
    __param(0, Req()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  DashboardController.prototype,
  "summary",
  null,
);
__decorate(
  [
    RequireRoles("viewer"),
    Get("groups"),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise),
  ],
  DashboardController.prototype,
  "groups",
  null,
);
DashboardController = __decorate(
  [
    Controller("dashboard"),
    __param(0, Inject(DashboardService)),
    __metadata("design:paramtypes", [DashboardService]),
  ],
  DashboardController,
);
export { DashboardController };
//# sourceMappingURL=dashboard.controller.js.map
