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
import { FeatureFlagsService } from "./featureFlags.service";
const isPlainObject = (v) =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);
function parseKey(v) {
  if (typeof v !== "string") throw new BadRequestException("Invalid key");
  const key = v.trim();
  if (key.length === 0 || key.length > 200)
    throw new BadRequestException("Invalid key");
  return key;
}
function parseEnabled(v) {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  throw new BadRequestException("Invalid enabled");
}
function parseEntityId(v) {
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new BadRequestException("Invalid entityId");
  const entityId = v.trim();
  if (entityId.length === 0 || entityId.length > 200)
    throw new BadRequestException("Invalid entityId");
  return entityId;
}
const parseRolloutPercentage = (v) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new BadRequestException("Invalid rollout.percentage");
  }
  return n;
};
const parseRolloutSalt = (v) =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : "default";
function parseRollout(v) {
  if (v === undefined) return undefined;
  if (!isPlainObject(v)) throw new BadRequestException("Invalid rollout");
  if (v.type === "all") return { type: "all" };
  if (v.type !== "percentage")
    throw new BadRequestException("Invalid rollout.type");
  const percentage = parseRolloutPercentage(v.percentage);
  const salt = parseRolloutSalt(v.salt);
  return { type: "percentage", percentage, salt };
}
function parseNote(v) {
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new BadRequestException("Invalid note");
  const note = v.trim();
  if (note.length > 500) throw new BadRequestException("Invalid note");
  return note.length === 0 ? undefined : note;
}
/**
 * Feature Flag 管理接口：org 维度开关 + 灰度决策 + 快速关停。
 */
let FeatureFlagsController = class FeatureFlagsController {
  featureFlagsService;
  /**
   * 创建 controller。
   *
   * @param featureFlagsService feature flags service
   */
  constructor(featureFlagsService) {
    this.featureFlagsService = featureFlagsService;
  }
  /**
   * 查询本 org 的 feature flags（可选按 key 查询单条）。
   *
   * @param req 请求对象
   * @param query query 参数
   * @returns flags 或单条 flag
   */
  async list(req, query) {
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
  async resolve(req, query) {
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
  async upsert(req, body) {
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
  FeatureFlagsController.prototype,
  "list",
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
  FeatureFlagsController.prototype,
  "resolve",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Post(),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  FeatureFlagsController.prototype,
  "upsert",
  null,
);
FeatureFlagsController = __decorate(
  [
    Controller("feature-flags"),
    __param(0, Inject(FeatureFlagsService)),
    __metadata("design:paramtypes", [FeatureFlagsService]),
  ],
  FeatureFlagsController,
);
export { FeatureFlagsController };
//# sourceMappingURL=featureFlags.controller.js.map
