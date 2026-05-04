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
import { isTimelineEntityType } from "../model/coreEntities";
const TIMELINE_LIST_QUERY_KEYS = new Set(["entityType", "entityId", "limit"]);
const TIMELINE_LIST_QUERY_ALIAS_HINT = {
  caseId: "entityType=case&entityId=<id>",
  customerId: "entityType=customer&entityId=<id>",
  taskId: "entityType=task&entityId=<id>",
};
function rejectUnknownTimelineQueryKey(key) {
  const hint = TIMELINE_LIST_QUERY_ALIAS_HINT[key];
  const suffix = hint ? `; use ${hint} instead` : "";
  throw new BadRequestException(`Unknown query parameter: ${key}${suffix}`);
}
function assertKnownTimelineQueryKeys(query) {
  for (const key of Object.keys(query)) {
    if (!TIMELINE_LIST_QUERY_KEYS.has(key)) {
      rejectUnknownTimelineQueryKey(key);
    }
  }
}
function parseTimelineLimit(rawLimit) {
  if (rawLimit === undefined) return undefined;
  const limit =
    typeof rawLimit === "string"
      ? Number(rawLimit)
      : typeof rawLimit === "number"
        ? rawLimit
        : NaN;
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new BadRequestException("Invalid limit");
  }
  return limit;
}
/**
 * 解析并校验 Timeline list query 参数。
 *
 * @param query query 参数
 * @returns 校验后的参数
 */
export function parseTimelineListQuery(query) {
  assertKnownTimelineQueryKeys(query);
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
  const limit = parseTimelineLimit(query.limit);
  return { entityType, entityId, limit };
}
/**
 * Timeline 写入示例接口。
 */
let TimelineController = class TimelineController {
  timelineService;
  /**
   * 创建 controller。
   *
   * @param timelineService timeline service
   */
  constructor(timelineService) {
    this.timelineService = timelineService;
  }
  /**
   * 查询当前组织下的 timeline 记录。
   *
   * @param req 请求对象
   * @param query query 参数
   * @returns timeline 记录列表
   */
  async list(req, query) {
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
  async writeDemo(req, body) {
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
};
__decorate(
  [
    Get(),
    __param(0, Req()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  TimelineController.prototype,
  "list",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Post("demo"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  TimelineController.prototype,
  "writeDemo",
  null,
);
TimelineController = __decorate(
  [
    Controller("timeline"),
    __param(0, Inject(TimelineService)),
    __metadata("design:paramtypes", [TimelineService]),
  ],
  TimelineController,
);
export { TimelineController };
//# sourceMappingURL=timeline.controller.js.map
