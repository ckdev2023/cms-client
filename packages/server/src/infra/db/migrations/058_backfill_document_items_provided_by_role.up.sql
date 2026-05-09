-- 058_backfill_document_items_provided_by_role: 回填 document_items.provided_by_role
-- 历史 dev 数据在 blueprint 加 providedByRole 之前已经落库 → owner_side 有值但 provided_by_role 全为 null。
-- 这导致「按提供方完成率」进度卡显示「未知 0/N」。
-- 这里按 owner_side → provided_by_role 的映射回填，与 blueprint 现行约定一致：
--   applicant / main_applicant → applicant
--   customer                   → supporter（家族滞在的 customer 实际指扶養者）
--   office                     → office

UPDATE document_items
SET provided_by_role = 'applicant'
WHERE provided_by_role IS NULL
  AND owner_side IN ('applicant', 'main_applicant');

UPDATE document_items
SET provided_by_role = 'supporter'
WHERE provided_by_role IS NULL
  AND owner_side = 'customer';

UPDATE document_items
SET provided_by_role = 'office'
WHERE provided_by_role IS NULL
  AND owner_side = 'office';
