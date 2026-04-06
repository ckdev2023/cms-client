import "reflect-metadata";

/* eslint-disable max-depth, max-lines-per-function, max-statements, @typescript-eslint/restrict-template-expressions */
import crypto from "node:crypto";
import os from "node:os";

import { Pool } from "pg";

import { loadEnv } from "./config/env";
import { createPgPool } from "./infra/db/createPgPool";
import { createRedisClient } from "./infra/redis/createRedisClient";
import { RedisQueue } from "./infra/queue/redisQueue";
import { createStorageAdapter } from "./infra/storage/storageAdapter";
import { createNotificationAdapter } from "./infra/notification/notificationAdapter";
import { createTranslationAdapter } from "./infra/translation/translationAdapter";
import { handleReminderJob } from "./modules/core/jobs/handlers/reminderJobHandler";
import {
  handleNotificationJob,
  type NotificationJobPayload,
} from "./modules/core/jobs/handlers/notificationJobHandler";
import {
  handleTranslationJob,
  type TranslationJobPayload,
} from "./modules/core/jobs/handlers/translationJobHandler";
import {
  handleExportJob,
  type ExportJobPayload,
} from "./modules/core/jobs/handlers/exportJobHandler";
import { isTimelineEntityType } from "./modules/core/model/coreEntities";
import { createTenantDb, type TenantDb } from "./modules/core/tenancy/tenantDb";
import { isUuid } from "./modules/core/tenancy/uuid";
import {
  computeRetryDelayMs,
  shouldRetry,
  toJobError,
} from "./modules/core/jobs/jobs.runtime";
import type { JobQueryRow } from "./modules/core/jobs/jobs.model";

// JobQueryRow 从 jobs.model 导入，无需本地重复定义

type TimelineWritePayload = {
  entityType: unknown;
  entityId: unknown;
  action: unknown;
  payload?: unknown;
  actorUserId?: unknown;
};

/** 已注册的 Redis 队列名列表（导出供测试使用）。 */
export const REGISTERED_QUEUES = [
  "reminder_jobs",
  "notification_jobs",
  "translation_jobs",
  "export_jobs",
] as const;

/**
 * Worker 入口（异步任务执行器）。
 *
 * 同时运行：
 * 1. PostgreSQL 轮询式 job 执行（timeline.write 等）
 * 2. Redis 队列 handler（reminder / notification / translation / export）
 *
 * @returns 启动结果
 */
async function bootstrapWorker(): Promise<void> {
  const env = loadEnv();
  const pool = createPgPool(env.dbUrl);
  const workerId = buildWorkerId();
  const lockTtlSeconds = readWorkerLockTtlSecondsFromEnv();

  const shutdown = createShutdownSignal();

  /* ---- Redis 队列 + Adapter ---- */
  const redisClient = createRedisClient(env.redisUrl);
  const queue = new RedisQueue(redisClient);

  const storageAdapter = createStorageAdapter({
    provider: env.storageProvider,
    localDir: env.storageLocalDir,
    s3Bucket: env.storageS3Bucket,
    s3Region: env.storageS3Region,
    s3Endpoint: env.storageS3Endpoint,
  });

  const notificationAdapter = createNotificationAdapter({
    provider: "console",
  });

  const translationAdapter = createTranslationAdapter({
    provider: env.translationProvider,
    apiKey: env.translationApiKey,
  });

  // eslint-disable-next-line no-console
  console.info(`[worker] Registered queues: ${REGISTERED_QUEUES.join(", ")}`);

  /* ---- 并发启动所有 worker 循环 ---- */
  let consecutiveErrors = 0;

  const pgWorker = async (): Promise<void> => {
    try {
      for (;;) {
        if (shutdown.isStopping()) break;

        let orgIds: string[];
        try {
          orgIds = await listActiveOrganizationIds(pool);
          consecutiveErrors = 0;
        } catch (e) {
          consecutiveErrors += 1;
          const backoffMs = Math.min(1000 * consecutiveErrors, 30_000);
          process.stderr.write(
            `[worker] listActiveOrganizationIds failed (attempt ${consecutiveErrors}): ${String(e)}\n`,
          );
          await sleep(backoffMs);
          continue;
        }

        let ran = false;
        for (const orgId of orgIds) {
          if (shutdown.isStopping()) break;
          let tenantDb: ReturnType<typeof createTenantDb>;
          let job: JobQueryRow | null;
          try {
            tenantDb = createTenantDb(pool, orgId);
            job = await claimNextJob(tenantDb, workerId, lockTtlSeconds);
          } catch (e) {
            process.stderr.write(
              `[worker] claimNextJob failed for org ${orgId}: ${String(e)}\n`,
            );
            continue;
          }
          if (!job) continue;
          ran = true;

          try {
            await executeJob(pool, job);
            await markJobSucceeded(tenantDb, job.id);
          } catch (e) {
            try {
              await markJobFailedOrRetry(tenantDb, job, e);
            } catch (markErr) {
              process.stderr.write(
                `[worker] markJobFailedOrRetry failed for job ${job.id}: ${String(markErr)}\n`,
              );
            }
          }
        }

        if (!ran) {
          await sleep(300);
        }
      }
    } finally {
      try {
        await releaseWorkerLocks(pool, workerId);
      } catch (e) {
        process.stderr.write(
          `[worker] releaseWorkerLocks failed: ${String(e)}\n`,
        );
      }
    }
  };

  try {
    await Promise.all([
      pgWorker(),
      queue.runWorker<{ orgId: string }>("reminder_jobs", (job) =>
        handleReminderJob(pool, queue, job),
      ),
      queue.runWorker<NotificationJobPayload>("notification_jobs", (job) =>
        handleNotificationJob(pool, notificationAdapter, job),
      ),
      queue.runWorker<TranslationJobPayload>("translation_jobs", (job) =>
        handleTranslationJob(pool, translationAdapter, job),
      ),
      queue.runWorker<ExportJobPayload>("export_jobs", (job) =>
        handleExportJob(pool, storageAdapter, queue, job),
      ),
    ]);
  } finally {
    await pool.end();
  }
}

await bootstrapWorker();

/**
 * 列出活跃组织 ID。
 *
 * @param pool PostgreSQL 连接池
 * @returns 组织 ID 列表
 */
async function listActiveOrganizationIds(pool: Pool): Promise<string[]> {
  const result = await pool.query<{ id: string }>(
    `
      select id
      from organizations
      where status = 'active'
      order by id asc
    `,
  );
  return result.rows.map((r) => r.id);
}

/**
 * 领取下一条可执行 job（按 run_at）。
 *
 * @param tenantDb 租户隔离后的 DB
 * @param workerId worker 标识
 * @param lockTtlSeconds 锁超时秒数
 * @returns job 或 null
 */
async function claimNextJob(
  tenantDb: TenantDb,
  workerId: string,
  lockTtlSeconds: number,
): Promise<JobQueryRow | null> {
  const result = await tenantDb.query<JobQueryRow>(
    `
      with picked as (
        select id
        from jobs
        where
          (
            status = 'queued' and run_at <= now()
          )
          or
          (
            status = 'running'
            and locked_at is not null
            and locked_at <= now() - ($2::int * interval '1 second')
          )
        order by
          case when status = 'queued' then 0 else 1 end asc,
          run_at asc,
          created_at asc,
          id asc
        for update skip locked
        limit 1
      )
      update jobs
      set
        status = 'running',
        attempts = attempts + 1,
        locked_at = now(),
        locked_by = $1,
        started_at = coalesce(started_at, now()),
        updated_at = now()
      where id in (select id from picked)
      returning
        id, org_id, type, payload, idempotency_key, status, attempts, max_retries, run_at,
        locked_at, locked_by, started_at, finished_at, last_error, created_at, updated_at
    `,
    [workerId, lockTtlSeconds],
  );
  return result.rows.at(0) ?? null;
}

/**
 * 标记 job 成功。
 *
 * @param tenantDb 租户隔离后的 DB
 * @param jobId job ID
 */
async function markJobSucceeded(
  tenantDb: TenantDb,
  jobId: string,
): Promise<void> {
  await tenantDb.query(
    `update jobs
     set status = 'succeeded', finished_at = now(),
         locked_at = null, locked_by = null, updated_at = now()
     where id = $1`,
    [jobId],
  );
}

/**
 * 标记 job 失败或重试。
 *
 * @param tenantDb 租户隔离后的 DB
 * @param job job 记录
 * @param e 异常
 */
async function markJobFailedOrRetry(
  tenantDb: TenantDb,
  job: JobQueryRow,
  e: unknown,
): Promise<void> {
  const err = toJobError(e);
  const retry = shouldRetry(job.attempts, job.max_retries);

  if (retry) {
    const delayMs = computeRetryDelayMs(job.attempts);
    const runAt = new Date(Date.now() + delayMs).toISOString();
    await tenantDb.query(
      `update jobs
       set status = 'queued', run_at = $2, last_error = $3::jsonb,
           locked_at = null, locked_by = null, updated_at = now()
       where id = $1`,
      [job.id, runAt, JSON.stringify(err)],
    );
    return;
  }

  await tenantDb.query(
    `update jobs
     set status = 'failed', finished_at = now(), last_error = $2::jsonb,
         locked_at = null, locked_by = null, updated_at = now()
     where id = $1`,
    [job.id, JSON.stringify(err)],
  );
}

/**
 * 执行具体 job。
 *
 * @param pool PostgreSQL 连接池
 * @param job job 记录
 */
async function executeJob(pool: Pool, job: JobQueryRow): Promise<void> {
  if (job.type === "timeline.write") {
    await handleTimelineWrite(pool, job);
    return;
  }
  throw new Error(`Unknown job type: ${job.type}`);
}

/**
 * 执行 timeline.write job。
 *
 * @param pool PostgreSQL 连接池
 * @param job job 记录
 */
async function handleTimelineWrite(
  pool: Pool,
  job: JobQueryRow,
): Promise<void> {
  const payload = parseTimelineWritePayload(job.payload);
  const actorUserId = payload.actorUserId
    ? parseActorUserId(payload.actorUserId)
    : undefined;

  const tenantDb = createTenantDb(pool, job.org_id, actorUserId);
  await tenantDb.query(
    `
      insert into timeline_logs(org_id, entity_type, entity_id, action, actor_user_id, payload)
      values ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      job.org_id,
      payload.entityType,
      payload.entityId,
      payload.action,
      actorUserId ?? null,
      JSON.stringify(payload.payload),
    ],
  );
}

/**
 * 解析 timeline.write 的 payload。
 *
 * @param raw 原始 payload
 * @returns 解析后的 payload
 */
function parseTimelineWritePayload(raw: unknown): {
  entityType: string;
  entityId: string;
  action: string;
  payload: Record<string, unknown>;
  actorUserId?: string;
} {
  const p = normalizeObject(raw) as TimelineWritePayload;
  if (!isTimelineEntityType(p.entityType))
    throw new Error("Invalid entityType");
  if (typeof p.entityId !== "string" || p.entityId.length === 0) {
    throw new Error("Invalid entityId");
  }
  if (typeof p.action !== "string" || p.action.length === 0) {
    throw new Error("Invalid action");
  }
  const extra = p.payload === undefined ? {} : normalizeObject(p.payload);

  const actorUserId =
    typeof p.actorUserId === "string" && p.actorUserId.length > 0
      ? p.actorUserId
      : undefined;

  return {
    entityType: p.entityType,
    entityId: p.entityId,
    action: p.action,
    payload: extra,
    actorUserId,
  };
}

function normalizeObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object")
        return parsed as Record<string, unknown>;
      return {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return {};
}

function parseActorUserId(value: string): string {
  if (!isUuid(value)) {
    throw new Error("Invalid actorUserId");
  }
  return value;
}

/**
 * 构造 worker 标识。
 *
 * @returns workerId
 */
function buildWorkerId(): string {
  return `${os.hostname()}:${String(process.pid)}:${crypto.randomUUID()}`;
}

/**
 * 读取 worker 的锁超时配置。
 *
 * @returns 秒数
 */
function readWorkerLockTtlSecondsFromEnv(): number {
  const raw = process.env.WORKER_LOCK_TTL_SECONDS;
  if (!raw) return 600;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 600;
  return Math.floor(n);
}

/**
 * 创建优雅关闭信号。
 *
 * @returns 信号对象
 */
function createShutdownSignal(): {
  isStopping: () => boolean;
} {
  let stopping = false;

  const requestStop = () => {
    stopping = true;
  };

  process.once("SIGTERM", requestStop);
  process.once("SIGINT", requestStop);

  return {
    isStopping: () => stopping,
  };
}

/**
 * 释放本 worker 已领取但未完成的 running job。
 *
 * @param pool PostgreSQL 连接池
 * @param workerId worker 标识
 */
async function releaseWorkerLocks(pool: Pool, workerId: string): Promise<void> {
  const orgIds = await listActiveOrganizationIds(pool);
  await Promise.all(
    orgIds.map(async (orgId) => {
      const tenantDb = createTenantDb(pool, orgId);
      await tenantDb.query(
        `update jobs
         set status = 'queued', locked_at = null, locked_by = null, updated_at = now()
         where status = 'running' and locked_by = $1`,
        [workerId],
      );
    }),
  );
}

/**
 * Sleep 工具。
 *
 * @param ms 毫秒
 */
async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}
