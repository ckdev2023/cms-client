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
import { RequireRoles } from "../core/auth/auth.decorators";
import { isTemplateKind } from "./templates.model";
import { TemplatesService } from "./templates.service";
/**
 * 解析模板 key。
 *
 * @param v 待解析值
 * @returns key
 */
function parseKey(v) {
  if (typeof v !== "string") throw new BadRequestException("Invalid key");
  const key = v.trim();
  if (key.length === 0 || key.length > 200)
    throw new BadRequestException("Invalid key");
  return key;
}
/**
 * 解析模板 kind。
 *
 * @param v 待解析值
 * @returns kind
 */
function parseKind(v) {
  if (!isTemplateKind(v)) throw new BadRequestException("Invalid kind");
  return v;
}
/**
 * 解析分页限制。
 *
 * @param v 待解析值
 * @returns limit
 */
function parseLimit(v) {
  if (v === undefined) return undefined;
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string" && v.length > 0
        ? Number(v)
        : NaN;
  if (!Number.isFinite(n) || n <= 0)
    throw new BadRequestException("Invalid limit");
  return n;
}
/**
 * 解析模板 config（要求为 object）。
 *
 * @param v 待解析值
 * @returns config
 */
function parseConfig(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    throw new BadRequestException("Invalid config (object required)");
  }
  return v;
}
/**
 * 解析发布模式。
 *
 * @param v 待解析值
 * @returns mode
 */
function parseMode(v) {
  if (v === "legacy" || v === "template") return v;
  throw new BadRequestException("Invalid mode");
}
const isPlainObject = (v) =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);
const parseRolloutPercentage = (v) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new BadRequestException("Invalid rollout.percentage");
  }
  return n;
};
const parseRolloutSalt = (v) =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : "default";
/**
 * 解析灰度 rollout。
 *
 * @param v 待解析值
 * @returns rollout
 */
function parseRollout(v) {
  if (v === undefined) return undefined;
  if (!isPlainObject(v)) {
    throw new BadRequestException("Invalid rollout");
  }
  if (v.type === "all") return { type: "all" };
  if (v.type !== "percentage")
    throw new BadRequestException("Invalid rollout.type");
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
function parseVersion(v) {
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
function parseEntityId(v) {
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new BadRequestException("Invalid entityId");
  const entityId = v.trim();
  if (entityId.length === 0 || entityId.length > 200)
    throw new BadRequestException("Invalid entityId");
  return entityId;
}
/**
 * 模板管理接口：版本管理 + 发布/回滚 + resolve（灰度决策）。
 */
let TemplatesController = class TemplatesController {
  templatesService;
  /**
   * 创建 controller。
   *
   * @param templatesService templates service
   */
  constructor(templatesService) {
    this.templatesService = templatesService;
  }
  /**
   * 查询模板版本列表。
   *
   * @param req 请求对象
   * @param query query 参数
   * @returns 版本列表
   */
  async listVersions(req, query) {
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
  async createVersion(req, body) {
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
  async getRelease(req, query) {
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
  async release(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const kind = parseKind(body.kind);
    const key = parseKey(body.key);
    const version = parseVersion(body.version);
    const rollout = parseRollout(body.rollout);
    return this.templatesService.releaseVersion(ctx, {
      kind,
      key,
      version,
      rollout,
    });
  }
  /**
   * 回滚到 previousVersion 或指定版本；无法回滚则切回 legacy（manager 以上）。
   *
   * @param req 请求对象
   * @param body 请求体
   * @returns 发布记录
   */
  async rollback(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const kind = parseKind(body.kind);
    const key = parseKey(body.key);
    const toVersion =
      body.toVersion === undefined ? undefined : parseVersion(body.toVersion);
    return this.templatesService.rollback(ctx, { kind, key, toVersion });
  }
  /**
   * 设置发布模式（legacy/template）（manager 以上）。
   *
   * @param req 请求对象
   * @param body 请求体
   * @returns 发布记录
   */
  async setMode(req, body) {
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
  async resolve(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const kind = parseKind(query.kind);
    const key = parseKey(query.key);
    const entityId = parseEntityId(query.entityId);
    return this.templatesService.resolve(ctx, { kind, key, entityId });
  }
};
__decorate(
  [
    Get("versions"),
    __param(0, Req()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  TemplatesController.prototype,
  "listVersions",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Post("versions"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  TemplatesController.prototype,
  "createVersion",
  null,
);
__decorate(
  [
    Get("release"),
    __param(0, Req()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  TemplatesController.prototype,
  "getRelease",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Post("release"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  TemplatesController.prototype,
  "release",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Post("rollback"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  TemplatesController.prototype,
  "rollback",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Post("mode"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  TemplatesController.prototype,
  "setMode",
  null,
);
__decorate(
  [
    Get("resolve"),
    __param(0, Req()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  TemplatesController.prototype,
  "resolve",
  null,
);
TemplatesController = __decorate(
  [
    Controller("templates"),
    __param(0, Inject(TemplatesService)),
    __metadata("design:paramtypes", [TemplatesService]),
  ],
  TemplatesController,
);
export { TemplatesController };
//# sourceMappingURL=templates.controller.js.map
