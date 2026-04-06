import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { RedisClient } from "../infra/redis/createRedisClient";
import { REDIS_CLIENT } from "../infra/redis/createRedisClient";
import { Public } from "../modules/core/auth/auth.decorators";

/**
 * 健康检查接口。
 */
@Controller("health")
export class HealthController {
  /**
   * 创建 HealthController。
   *
   * @param pg PostgreSQL 连接池（全局复用）
   * @param redis Redis 客户端（全局复用）
   */
  constructor(
    @Inject(Pool) private readonly pg: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
  ) {}

  /**
   * 进程健康检查。
   *
   * @returns 健康状态
   */
  @Public()
  @Get()
  getHealth() {
    return { ok: true };
  }

  /**
   * 依赖健康检查（Postgres / Redis）。
   *
   * @returns 健康状态
   */
  @Public()
  @Get("deps")
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
}
