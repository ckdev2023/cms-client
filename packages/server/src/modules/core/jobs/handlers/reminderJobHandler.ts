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
 * P0 对齐的 REMINDER_COLS（与 reminders.service.ts 保持一致）。
 */
const REMINDER_COLS = `id, org_id, case_id, target_type, target_id, remind_at, send_status, recipient_type, recipient_id, channel, dedupe_key, retry_count, sent_at, payload_snapshot, created_at, updated_at`;

/**
 * Notification job payload 类型。
 */
type NotificationJobPayload = {
  orgId: string;
  channel: string;
  to: string;
  body: string;
  targetType?: string;
  targetId?: string;
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
      channel: reminder.channel,
      to: reminder.recipientId ?? reminder.orgId,
      body: `Reminder due for ${reminder.targetType} ${reminder.targetId}`,
      targetType: reminder.targetType,
      targetId: reminder.targetId,
      metadata: {
        reminderId: reminder.id,
        dedupeKey: reminder.dedupeKey,
        ...(reminder.payloadSnapshot ?? {}),
      },
    },
    createdAt: new Date().toISOString(),
  };
}

/**
 * 处理单条 reminder：入队通知 → 更新 send_status → 写 Timeline。
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
    `update reminders set send_status = 'sent', sent_at = now(), updated_at = now() where id = $1 and send_status = 'pending'`,
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
        targetType: reminder.targetType,
        targetId: reminder.targetId,
        remindAt: reminder.remindAt,
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
    `select ${REMINDER_COLS}
     from reminders
     where remind_at <= now() and send_status = 'pending'
     order by remind_at asc
     limit $1`,
    [MAX_BATCH_SIZE],
  );

  for (const row of result.rows) {
    if (row.send_status !== "pending") continue;
    try {
      await processOneReminder(tenantDb, queue, row);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error(
        `[reminderJobHandler] Failed to process reminder ${row.id}: ${message}`,
      );

      await tenantDb.query(
        `update reminders set send_status = 'failed', retry_count = retry_count + 1, updated_at = now() where id = $1`,
        [row.id],
      );
    }
  }
}
