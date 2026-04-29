-- 034_customer_backfill_profile (down)
-- 回填的 ownerUserId / groupId 数据保留：本迁移只是补齐缺失字段，没有结构变更，
-- 也无法可靠区分"由本迁移写入"与"业务流程写入"，因此 down 不做任何回滚。
SELECT 1;
