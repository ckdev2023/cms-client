-- 060_backfill_initial_task_titles_to_ja: 将自动创建的初始任务标题由中文改为日文
-- 背景：cases.service.write-ops.ts 的 INITIAL_TASK_SEEDS 早期使用中文 title 直接落库，
-- 导致日文环境（cms-jp.duckdns.org）首页待办卡片显示中文。
-- 修复点：seed 已改为日文。本迁移仅回填历史 auto_create 任务，避免与人工编辑过的标题冲突。

UPDATE tasks
SET title = '顧客に基礎資料のアップロードを依頼',
    updated_at = now()
WHERE source_type = 'auto_create'
  AND task_type = 'document_follow_up'
  AND title = '邀请客户上传基础资料';

UPDATE tasks
SET title = '顧客との初回面談を確認',
    updated_at = now()
WHERE source_type = 'auto_create'
  AND task_type = 'client_contact'
  AND title = '确认客户初次面谈';
