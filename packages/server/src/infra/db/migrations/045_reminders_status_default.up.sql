-- 045_reminders_status_default
-- 001_init 定义 `status text NOT NULL` 无默认值，016 新增 `send_status` 但未处理旧列，
-- 导致新 INSERT 只写 send_status 时触发 PG 23502。
-- 本迁移为旧 `status` 列补上默认值 'pending'，与 send_status 对齐。

ALTER TABLE reminders ALTER COLUMN status SET DEFAULT 'pending';
