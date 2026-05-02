-- BUG-181 回填迁移的回滚：无法精确区分被回填的行与正常新建的行，
-- 故仅做 no-op，避免误删用户后续追加的合法 billing_records 数据。
SELECT 1;
