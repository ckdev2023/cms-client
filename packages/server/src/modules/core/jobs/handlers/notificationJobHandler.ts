import type { Pool } from "pg";

import type { QueueJob } from "../../../../infra/queue/redisQueue";
import type {
  NotificationAdapter,
  NotificationPayload,
} from "../../../../infra/notification/notificationAdapter";
import { createTenantDb } from "../../tenancy/tenantDb";

/* ------------------------------------------------------------------ */
/*  类型定义                                                           */
/* ------------------------------------------------------------------ */

/**
 * Notification job payload 类型。
 */
export type NotificationJobPayload = {
  orgId: string;
  channel: "email" | "push" | "in_app";
  to: string;
  subject?: string;
  body: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */

/**
 * 处理 notification_jobs 队列任务：
 * 调用 NotificationAdapter 发送通知 → 如有 entityType+entityId 写 Timeline。
 *
 * 不在 handler 内做 retry 逻辑（由 Worker / Job 框架负责）。
 * 发送失败时直接抛异常，让调用方决定重试策略。
 *
 * @param pool PostgreSQL 连接池
 * @param notificationAdapter 通知适配器
 * @param job 队列任务
 */
export async function handleNotificationJob(
  pool: Pool,
  notificationAdapter: NotificationAdapter,
  job: QueueJob<NotificationJobPayload>,
): Promise<void> {
  const { orgId, channel, to, subject, body, metadata, entityType, entityId } =
    job.payload;

  // eslint-disable-next-line no-console
  console.info(
    `[notificationJobHandler] Sending notification: jobId=${job.id} channel=${channel} to=${to}`,
  );

  const sendPayload: NotificationPayload = {
    channel,
    to,
    body,
    ...(subject ? { subject } : {}),
    ...(metadata ? { metadata } : {}),
  };

  await notificationAdapter.send(sendPayload);

  // eslint-disable-next-line no-console
  console.info(
    `[notificationJobHandler] Notification sent successfully: jobId=${job.id}`,
  );

  if (entityType && entityId) {
    const tenantDb = createTenantDb(pool, orgId);
    await tenantDb.query(
      `insert into timeline_logs(org_id, entity_type, entity_id, action, actor_user_id, payload)
       values ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        orgId,
        entityType,
        entityId,
        "notification_sent",
        null,
        JSON.stringify({
          channel,
          to,
          ...(subject ? { subject } : {}),
        }),
      ],
    );
  }
}
