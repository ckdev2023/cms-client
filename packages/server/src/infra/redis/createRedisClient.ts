import { createClient } from "redis";

/**
 * Redis 客户端类型。
 */
export type RedisClient = ReturnType<typeof createClient>;

export const REDIS_CLIENT = "REDIS_CLIENT";

/**
 * 创建 Redis 客户端。
 *
 * @param redisUrl Redis 连接串
 * @returns Redis 客户端
 */
export function createRedisClient(redisUrl: string): RedisClient {
  return createClient({ url: redisUrl });
}
