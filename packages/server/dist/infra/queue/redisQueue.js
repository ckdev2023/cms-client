/**
 * 基于 Redis List 的最小任务队列（轮询 lPop）。
 */
export class RedisQueue {
  client;
  /**
   * 创建队列实例。
   *
   * @param client Redis client
   */
  constructor(client) {
    this.client = client;
  }
  /**
   * 入队。
   *
   * @param queueName 队列名
   * @param job 任务
   * @returns 入队结果
   */
  async enqueue(queueName, job) {
    await this.ensureConnected();
    await this.client.rPush(this.buildKey(queueName), JSON.stringify(job));
  }
  /**
   * 取出一条任务（无则返回 null）。
   *
   * @param queueName 队列名
   * @returns 任务或 null
   */
  async dequeue(queueName) {
    await this.ensureConnected();
    const raw = await this.client.lPop(this.buildKey(queueName));
    if (raw === null) return null;
    return JSON.parse(raw);
  }
  /**
   * 启动 worker 轮询循环（最小骨架）。
   *
   * @param queueName 队列名
   * @param handler 处理函数
   * @returns 永不返回的 Promise
   */
  async runWorker(queueName, handler) {
    for (;;) {
      const job = await this.dequeue(queueName);
      if (job) {
        await handler(job);
        continue;
      }
      await this.sleep(300);
    }
  }
  buildKey(queueName) {
    return `queue:${queueName}`;
  }
  async ensureConnected() {
    if (this.client.isOpen) return;
    await this.client.connect();
  }
  async sleep(ms) {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    });
  }
}
//# sourceMappingURL=redisQueue.js.map
