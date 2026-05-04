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
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Pool } from "pg";
import { REDIS_CLIENT } from "../infra/redis/createRedisClient";
import { Public } from "../modules/core/auth/auth.decorators";
/**
 * 健康检查接口。
 */
let HealthController = class HealthController {
  pg;
  redis;
  /**
   * 创建 HealthController。
   *
   * @param pg PostgreSQL 连接池（全局复用）
   * @param redis Redis 客户端（全局复用）
   */
  constructor(pg, redis) {
    this.pg = pg;
    this.redis = redis;
  }
  /**
   * 进程健康检查。
   *
   * @returns 健康状态
   */
  getHealth() {
    return { ok: true };
  }
  /**
   * 依赖健康检查（Postgres / Redis）。
   *
   * @returns 健康状态
   */
  async getDepsHealth() {
    try {
      await this.pg.query("select 1");
      if (!this.redis.isOpen) {
        await this.redis.connect();
      }
      await this.redis.ping();
      return { ok: true };
    } catch {
      throw new ServiceUnavailableException("dependency check failed");
    }
  }
};
__decorate(
  [
    Public(),
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0),
  ],
  HealthController.prototype,
  "getHealth",
  null,
);
__decorate(
  [
    Public(),
    Get("deps"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise),
  ],
  HealthController.prototype,
  "getDepsHealth",
  null,
);
HealthController = __decorate(
  [
    Controller("health"),
    __param(0, Inject(Pool)),
    __param(1, Inject(REDIS_CLIENT)),
    __metadata("design:paramtypes", [Pool, Object]),
  ],
  HealthController,
);
export { HealthController };
//# sourceMappingURL=health.controller.js.map
