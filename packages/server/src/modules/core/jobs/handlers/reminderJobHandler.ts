import type { Pool } from "pg";
import crypto from "node:crypto";

import { RedisQueue, type QueueJob } from "../../../../infra/queue/redisQueue";
import { createTenantDb } from "../../tenancy/tenantDb";
import {
  mapReminderRow,
  type ReminderQueryRow,
} from "../../reminders/reminders.service";

/**
 * 单次最多处理的到期 reminder 数量。
 */
const MAX_BATCH_SIZE = 100;

/**
 * notification_jobs 队列名。
 */
const NOTIFICATION_QUEUE = "notification_jobs";

/**
 * Notification job payload 类型。
 */
type NotificationJobPayload = {
  orgId: string;
  channel: string;
  to: string;
  body: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * 为单条 reminder 构建 notification job。
 *
 * @param reminder 已映射的 Reminder 实体
 * @returns 构建好的 QueueJob
 */
function buildNotificationJob(
  reminder: ReturnType<typeof mapReminderRow>,
): QueueJob<NotificationJobPayload> {
  return {
    id: crypto.randomUUID(),
    name: "reminder_notification",
    payload: {
      orgId: reminder.orgId,
      channel: "in_app",
      to: reminder.orgId,
      body: `Reminder due for ${reminder.entityType} ${reminder.entityId}`,
      entityType: reminder.entityType,
      entityId: reminder.entityId,
      metadata: {
        reminderId: reminder.id,
        ...(reminder.payload ?? {}),
      },
    },
    createdAt: new Date().toISOString(),
  };
}

/**
 * 处理单条 reminder：入队通知 → 更新状态 → 写 Timeline。
 *
 * @param tenantDb 租户隔离 DB
 * @param queue Redis 队列
 * @param row 数据库行
 */
async function processOneReminder(
  tenantDb: ReturnType<typeof createTenantDb>,
  queue: RedisQueue,
  row: ReminderQueryRow,
): Promise<void> {
  const reminder = mapReminderRow(row);

  await queue.enqueue(NOTIFICATION_QUEUE, buildNotificationJob(reminder));

  await tenantDb.query(
    `update reminders set status = 'sent', updated_at = now() where id = $1 and status = 'pending'`,
    [reminder.id],
  );

  await tenantDb.query(
    `insert into timeline_logs(org_id, entity_type, entity_id, action, actor_user_id, payload)
     values ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      reminder.orgId,
      "reminder",
      reminder.id,
      "reminder.sent",
      null,
      JSON.stringify({
        entityType: reminder.entityType,
        entityId: reminder.entityId,
        scheduledAt: reminder.scheduledAt,
      }),
    ],
  );
}

/**
 * 处理 reminder_jobs 队列任务：
 * 查询到期 pending reminders → 逐条入队 notification_job → 更新状态 → 写 Timeline。
 *
 * @param pool PostgreSQL 连接池
 * @param queue Redis 队列
 * @param job 队列任务
 */
export async function handleReminderJob(
  pool: Pool,
  queue: RedisQueue,
  job: QueueJob<{ orgId: string }>,
): Promise<void> {
  const { orgId } = job.payload;
  const tenantDb = createTenantDb(pool, orgId);

  const result = await tenantDb.query<ReminderQueryRow>(
    `select id, org_id, entity_type, entity_id, scheduled_at, status, payload, created_at, updated_at
     from reminders
     where scheduled_at <= now() and status = 'pending'
     order by scheduled_at asc
     limit $1`,
    [MAX_BATCH_SIZE],
  );

  for (const row of result.rows) {
    if (row.status !== "pending") continue;
    try {
      await processOneReminder(tenantDb, queue, row);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error(
        `[reminderJobHandler] Failed to process reminder ${row.id}: ${message}`,
      );
    }
  }
}
