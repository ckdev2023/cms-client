-- 061_canonicalize_residence_status_of_residence
-- 背景：residence-periods 旧版控制器只校验 statusOfResidence 为非空字符串，
-- 客户端/脚本误录入「家族滑在」（应为「家族滞在」）会写入 residence_periods 与
-- 自动生成的 reminders.payload_snapshot.statusOfResidence，导致任务与提醒页提醒
-- 标题渲染为「家族滑在 · 到期前 N 天提醒」。
-- 修复点：将历史 typo 一次性回填到规范值「家族滞在」，覆盖 residence_periods 主表
-- 与依赖该字段渲染的 reminders.payload_snapshot 副本。

UPDATE residence_periods
SET status_of_residence = '家族滞在',
    updated_at = now()
WHERE status_of_residence = '家族滑在';

UPDATE reminders
SET payload_snapshot = jsonb_set(
      payload_snapshot,
      '{statusOfResidence}',
      to_jsonb('家族滞在'::text),
      true
    ),
    updated_at = now()
WHERE payload_snapshot ? 'statusOfResidence'
  AND payload_snapshot->>'statusOfResidence' = '家族滑在';
