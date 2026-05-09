-- 060_backfill_initial_task_titles_to_ja: 回滚（恢复为中文 title）
-- 仅作用于 auto_create 任务且当前 title 仍是日文 seed 的行。

UPDATE tasks
SET title = '邀请客户上传基础资料',
    updated_at = now()
WHERE source_type = 'auto_create'
  AND task_type = 'document_follow_up'
  AND title = '顧客に基礎資料のアップロードを依頼';

UPDATE tasks
SET title = '确认客户初次面谈',
    updated_at = now()
WHERE source_type = 'auto_create'
  AND task_type = 'client_contact'
  AND title = '顧客との初回面談を確認';
