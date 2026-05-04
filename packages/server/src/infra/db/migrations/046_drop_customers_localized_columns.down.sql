-- 046_drop_customers_localized_columns rollback
-- カラムを再追加し、base_profile から再回填する。

BEGIN;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS name_zh  text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name_ja  text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name_en  text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name_default_locale text;

UPDATE customers
   SET name_zh = coalesce(
     nullif(trim(base_profile->>'name_cn'), ''),
     nullif(trim(base_profile->>'displayName'), ''),
     nullif(trim(base_profile->>'name'), '')
   )
 WHERE name_zh IS NULL;

UPDATE customers
   SET name_ja = coalesce(
     nullif(trim(base_profile->>'name_jp'), '')
   )
 WHERE name_ja IS NULL;

UPDATE customers
   SET name_en = coalesce(
     nullif(trim(base_profile->>'name_en'), ''),
     nullif(trim(base_profile->>'legalName'), ''),
     nullif(trim(base_profile->>'legal_name'), '')
   )
 WHERE name_en IS NULL;

UPDATE customers
   SET name_default_locale = CASE
     WHEN nullif(trim(base_profile->>'name_jp'), '') IS NOT NULL THEN 'ja'
     WHEN nullif(trim(base_profile->>'name_cn'), '') IS NOT NULL THEN 'zh'
     WHEN nullif(trim(base_profile->>'name_en'), '') IS NOT NULL THEN 'en'
     ELSE 'ja'
   END
 WHERE name_default_locale IS NULL;

COMMIT;
