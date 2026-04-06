import type { RedisClient } from "../redis/createRedisClient";

/**
 * 队列任务结构。
 */
export type QueueJob<T> = {
  id: string;
  name: string;
  payload: T;
  createdAt: string;
};

/**
 * 基于 Redis List 的最小任务队列（轮询 lPop）。
 */
export class RedisQueue {
  /**
   * 创建队列实例。
   *
   * @param client Redis client
   */
  constructor(private readonly client: RedisClient) {}

  /**
   * 入队。
   *
   * @param queueName 队列名
   * @param job 任务
   * @returns 入队结果
   */
  async enqueue<T>(queueName: string, job: QueueJob<T>): Promise<void> {
    await this.ensureConnected();
    await this.client.rPush(this.buildKey(queueName), JSON.stringify(job));
  }

  /**
   * 取出一条任务（无则返回 null）。
   *
   * @param queueName 队列名
   * @returns 任务或 null
   */
  async dequeue<T>(queueName: string): Promise<QueueJob<T> | null> {
    await this.ensureConnected();
    const raw = await this.client.lPop(this.buildKey(queueName));
    if (raw === null) return null;
    return JSON.parse(raw) as QueueJob<T>;
  }

  /**
   * 启动 worker 轮询循环（最小骨架）。
   *
   * @param queueName 队列名
   * @param handler 处理函数
   * @returns 永不返回的 Promise
   */
  async runWorker<T>(
    queueName: string,
    handler: (job: QueueJob<T>) => Promise<void>,
  ): Promise<never> {
    for (;;) {
      const job = await this.dequeue<T>(queueName);
      if (job) {
        await handler(job);
        continue;
      }
      await this.sleep(300);
    }
  }

  private buildKey(queueName: string): string {
    return `queue:${queueName}`;
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.isOpen) return;
    await this.client.connect();
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    });
  }
}
