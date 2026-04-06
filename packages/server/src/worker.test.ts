import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

import { handleReminderJob } from "./modules/core/jobs/handlers/reminderJobHandler";
import { handleNotificationJob } from "./modules/core/jobs/handlers/notificationJobHandler";
import { handleTranslationJob } from "./modules/core/jobs/handlers/translationJobHandler";
import { handleExportJob } from "./modules/core/jobs/handlers/exportJobHandler";
import { RedisQueue } from "./infra/queue/redisQueue";

/* ------------------------------------------------------------------ */
/*  常量                                                               */
/* ------------------------------------------------------------------ */

const EXPECTED_QUEUES = [
  "reminder_jobs",
  "notification_jobs",
  "translation_jobs",
  "export_jobs",
] as const;

/* ================================================================== */
/*  1. worker.ts 源码包含所有队列注册                                    */
/* ================================================================== */

void test("worker.ts source contains REGISTERED_QUEUES with all 4 queues", () => {
  const workerPath = path.resolve(import.meta.dirname, "worker.ts");
  const source = fs.readFileSync(workerPath, "utf-8");

  for (const q of EXPECTED_QUEUES) {
    assert.ok(
      source.includes(`"${q}"`),
      `worker.ts should reference queue "${q}"`,
    );
  }
});

void test("worker.ts source registers all queues via queue.runWorker", () => {
  const workerPath = path.resolve(import.meta.dirname, "worker.ts");
  const source = fs.readFileSync(workerPath, "utf-8");

  for (const q of EXPECTED_QUEUES) {
    const pattern = new RegExp(`runWorker[^(]*\\("${q}"`);
    assert.ok(pattern.test(source), `worker.ts should call runWorker("${q}")`);
  }
});

void test("worker.ts source uses Promise.all for concurrent queue processing", () => {
  const workerPath = path.resolve(import.meta.dirname, "worker.ts");
  const source = fs.readFileSync(workerPath, "utf-8");

  assert.ok(
    source.includes("Promise.all"),
    "worker.ts should use Promise.all for concurrent workers",
  );
});

/* ================================================================== */
/*  2. 所有 handler 函数存在且签名兼容                                   */
/* ================================================================== */

void test("handleReminderJob is a function", () => {
  assert.strictEqual(typeof handleReminderJob, "function");
});

void test("handleNotificationJob is a function", () => {
  assert.strictEqual(typeof handleNotificationJob, "function");
});

void test("handleTranslationJob is a function", () => {
  assert.strictEqual(typeof handleTranslationJob, "function");
});

void test("handleExportJob is a function", () => {
  assert.strictEqual(typeof handleExportJob, "function");
});

/* ================================================================== */
/*  3. RedisQueue.runWorker 存在                                       */
/* ================================================================== */

void test("RedisQueue has runWorker method", () => {
  assert.strictEqual(typeof RedisQueue.prototype.runWorker, "function");
});

/* ================================================================== */
/*  4. 优雅退出信号处理                                                 */
/* ================================================================== */

void test("worker.ts source handles SIGTERM and SIGINT for graceful shutdown", () => {
  const workerPath = path.resolve(import.meta.dirname, "worker.ts");
  const source = fs.readFileSync(workerPath, "utf-8");

  assert.ok(source.includes("SIGTERM"), "should handle SIGTERM");
  assert.ok(source.includes("SIGINT"), "should handle SIGINT");
});

/* ================================================================== */
/*  5. handler 签名与 runWorker 兼容性验证                               */
/* ================================================================== */

void test("handlers are compatible with RedisQueue.runWorker callback shape", () => {
  // 验证每个 handler 接受正确参数数量
  // handleReminderJob(pool, queue, job) → 3 args
  assert.ok(
    handleReminderJob.length >= 2,
    "handleReminderJob should accept at least 2 args",
  );
  // handleNotificationJob(pool, adapter, job) → 3 args
  assert.ok(
    handleNotificationJob.length >= 2,
    "handleNotificationJob should accept at least 2 args",
  );
  // handleTranslationJob(pool, adapter, job) → 3 args
  assert.ok(
    handleTranslationJob.length >= 2,
    "handleTranslationJob should accept at least 2 args",
  );
  // handleExportJob(pool, storageAdapter, queue, job) → 4 args
  assert.ok(
    handleExportJob.length >= 3,
    "handleExportJob should accept at least 3 args",
  );
});

/* ================================================================== */
/*  6. Worker 启动日志输出已注册队列                                     */
/* ================================================================== */

void test("worker.ts source logs registered queues on startup", () => {
  const workerPath = path.resolve(import.meta.dirname, "worker.ts");
  const source = fs.readFileSync(workerPath, "utf-8");

  assert.ok(
    source.includes("Registered queues"),
    "worker.ts should log registered queues on startup",
  );
});

/* ================================================================== */
/*  7. handler 导入路径验证                                              */
/* ================================================================== */

void test("worker.ts imports all 4 handler modules", () => {
  const workerPath = path.resolve(import.meta.dirname, "worker.ts");
  const source = fs.readFileSync(workerPath, "utf-8");

  assert.ok(
    source.includes("handleReminderJob"),
    "should import handleReminderJob",
  );
  assert.ok(
    source.includes("handleNotificationJob"),
    "should import handleNotificationJob",
  );
  assert.ok(
    source.includes("handleTranslationJob"),
    "should import handleTranslationJob",
  );
  assert.ok(
    source.includes("handleExportJob"),
    "should import handleExportJob",
  );
});

/* ================================================================== */
/*  8. Adapter 创建验证                                                 */
/* ================================================================== */

void test("worker.ts creates all required adapters", () => {
  const workerPath = path.resolve(import.meta.dirname, "worker.ts");
  const source = fs.readFileSync(workerPath, "utf-8");

  assert.ok(
    source.includes("createStorageAdapter"),
    "should create StorageAdapter",
  );
  assert.ok(
    source.includes("createNotificationAdapter"),
    "should create NotificationAdapter",
  );
  assert.ok(
    source.includes("createTranslationAdapter"),
    "should create TranslationAdapter",
  );
  assert.ok(source.includes("createRedisClient"), "should create Redis client");
  assert.ok(source.includes("new RedisQueue"), "should create RedisQueue");
});
