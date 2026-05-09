-- 058_backfill_document_items_provided_by_role: 回滚（清空回填值）
-- 注意：rollback 后历史 dev 数据将再次显示「未知」分组，与 057 之前一致。

UPDATE document_items
SET provided_by_role = NULL
WHERE provided_by_role IN ('applicant', 'supporter', 'office')
  AND owner_side IN ('applicant', 'main_applicant', 'customer', 'office');
