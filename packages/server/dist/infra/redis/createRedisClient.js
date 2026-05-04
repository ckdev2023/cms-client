import { createClient } from "redis";
export const REDIS_CLIENT = "REDIS_CLIENT";
/**
 * 创建 Redis 客户端。
 *
 * @param redisUrl Redis 连接串
 * @returns Redis 客户端
 */
export function createRedisClient(redisUrl) {
  return createClient({ url: redisUrl });
}
//# sourceMappingURL=createRedisClient.js.map
