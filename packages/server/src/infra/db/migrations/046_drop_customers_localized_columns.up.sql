-- 046_drop_customers_localized_columns
-- Migration 044 で追加した customers テーブルの多言語名カラムを削除する。
-- 多言語名は base_profile JSONB (name_cn / name_jp / name_en) を単一ソースとし、
-- 独立カラムは廃止する。

BEGIN;

ALTER TABLE customers DROP COLUMN IF EXISTS name_zh;
ALTER TABLE customers DROP COLUMN IF EXISTS name_ja;
ALTER TABLE customers DROP COLUMN IF EXISTS name_en;
ALTER TABLE customers DROP COLUMN IF EXISTS name_default_locale;

COMMIT;
