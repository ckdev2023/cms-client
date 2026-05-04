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
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  Body,
} from "@nestjs/common";
import { RequireRoles } from "../auth/auth.decorators";
import { JobsService } from "./jobs.service";
/**
 * Job 队列接口（入队/查询）。
 */
let JobsController = class JobsController {
  jobsService;
  /**
   * 创建 controller。
   *
   * @param jobsService jobs service
   */
  constructor(jobsService) {
    this.jobsService = jobsService;
  }
  /**
   * 入队一个 job（需 staff+ 权限）。
   *
   * @param req 请求对象
   * @param body 请求体
   * @returns Job
   */
  async enqueue(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const input = {
      type: parseType(body.type),
      payload: parsePayload(body.payload),
      idempotencyKey:
        body.idempotencyKey === undefined
          ? undefined
          : parseIdempotencyKey(body.idempotencyKey),
      maxRetries:
        body.maxRetries === undefined
          ? undefined
          : parseMaxRetries(body.maxRetries),
      runAt: body.runAt === undefined ? undefined : parseRunAt(body.runAt),
    };
    return this.jobsService.enqueue(ctx, input);
  }
  /**
   * 查询单个 job。
   *
   * @param req 请求对象
   * @param id Job ID
   * @returns Job 或 null
   */
  async get(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.jobsService.get(ctx, id);
  }
  /**
   * 查询 job 列表。
   *
   * @param req 请求对象
   * @param query query 参数
   * @returns job 列表
   */
  async list(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const input = {
      status:
        query.status === undefined ? undefined : parseStatus(query.status),
      limit: query.limit === undefined ? undefined : parseLimit(query.limit),
    };
    return this.jobsService.list(ctx, input);
  }
};
__decorate(
  [
    RequireRoles("staff"),
    Post(),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  JobsController.prototype,
  "enqueue",
  null,
);
__decorate(
  [
    Get(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  JobsController.prototype,
  "get",
  null,
);
__decorate(
  [
    Get(),
    __param(0, Req()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  JobsController.prototype,
  "list",
  null,
);
JobsController = __decorate(
  [
    Controller("jobs"),
    __param(0, Inject(JobsService)),
    __metadata("design:paramtypes", [JobsService]),
  ],
  JobsController,
);
export { JobsController };
function parseType(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException("Invalid type");
  }
  return value;
}
function parsePayload(value) {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException("Invalid payload");
  }
  return value;
}
function parseIdempotencyKey(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException("Invalid idempotencyKey");
  }
  if (value.length > 200) {
    throw new BadRequestException("idempotencyKey too long");
  }
  return value;
}
function parseMaxRetries(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new BadRequestException("Invalid maxRetries");
  }
  const i = Math.floor(n);
  if (i < 0 || i > 20) {
    throw new BadRequestException("Invalid maxRetries");
  }
  return i;
}
function parseRunAt(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException("Invalid runAt");
  }
  const t = Date.parse(value);
  if (!Number.isFinite(t)) {
    throw new BadRequestException("Invalid runAt");
  }
  return new Date(t).toISOString();
}
function parseStatus(value) {
  if (value === "queued") return "queued";
  if (value === "running") return "running";
  if (value === "succeeded") return "succeeded";
  if (value === "failed") return "failed";
  throw new BadRequestException("Invalid status");
}
function parseLimit(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new BadRequestException("Invalid limit");
  }
  const i = Math.floor(n);
  if (i < 1 || i > 200) {
    throw new BadRequestException("Invalid limit");
  }
  return i;
}
//# sourceMappingURL=jobs.controller.js.map
