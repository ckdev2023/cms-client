-- 053_leads_tags (down): tags カラムを削除
DROP INDEX IF EXISTS idx_leads_tags;
ALTER TABLE leads DROP COLUMN IF EXISTS tags;
