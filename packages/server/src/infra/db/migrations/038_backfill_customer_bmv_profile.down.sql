-- BUG-158 回填迁移的回滚：无法精确还原原先的 NULL bmvProfile 状态
-- （已与新建路径合流），故仅做 no-op，避免误清除新建客户的 bmvProfile。
SELECT 1;
