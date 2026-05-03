-- 044_customers_localized_names rollback
-- 移除顶层多语言名称列。base_profile 内的原始数据不受影响。

BEGIN;

ALTER TABLE customers DROP COLUMN IF EXISTS name_zh;
ALTER TABLE customers DROP COLUMN IF EXISTS name_ja;
ALTER TABLE customers DROP COLUMN IF EXISTS name_en;
ALTER TABLE customers DROP COLUMN IF EXISTS name_default_locale;

COMMIT;
