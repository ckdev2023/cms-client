-- 033_customer_numbers (down)
-- 历史 customerNumber 数据保留，仅回滚唯一索引。

DROP INDEX IF EXISTS uq_customers_org_customer_number;