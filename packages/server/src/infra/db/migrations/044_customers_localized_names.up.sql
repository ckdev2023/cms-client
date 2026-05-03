-- 044_customers_localized_names
-- 为 customers 表新增顶层多语言名称列，支持按 locale 切换显示名。
-- 现有客户名存储于 base_profile JSONB 内的 name_cn / name_en / name_jp / name / displayName 等字段，
-- 本迁移将这些值回填到独立列以供 locale-aware 查询与展示。

BEGIN;

-- ============================================================
-- 1. 新增列
-- ============================================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name_zh  text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name_ja  text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name_en  text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name_default_locale text;

-- ============================================================
-- 2. 回填 name_zh：优先 name_cn，其次 displayName / name
-- ============================================================
UPDATE customers
   SET name_zh = coalesce(
     nullif(trim(base_profile->>'name_cn'), ''),
     nullif(trim(base_profile->>'displayName'), ''),
     nullif(trim(base_profile->>'name'), '')
   )
 WHERE name_zh IS NULL;

-- ============================================================
-- 3. 回填 name_ja：优先 name_jp
-- ============================================================
UPDATE customers
   SET name_ja = coalesce(
     nullif(trim(base_profile->>'name_jp'), '')
   )
 WHERE name_ja IS NULL;

-- ============================================================
-- 4. 回填 name_en：优先 name_en，其次 legalName / legal_name
-- ============================================================
UPDATE customers
   SET name_en = coalesce(
     nullif(trim(base_profile->>'name_en'), ''),
     nullif(trim(base_profile->>'legalName'), ''),
     nullif(trim(base_profile->>'legal_name'), '')
   )
 WHERE name_en IS NULL;

-- ============================================================
-- 5. 推断 name_default_locale
--    规则：有 name_jp → 'ja'；有 name_cn → 'zh'；有 name_en → 'en'；兜底 'ja'
-- ============================================================
UPDATE customers
   SET name_default_locale = CASE
     WHEN nullif(trim(base_profile->>'name_jp'), '') IS NOT NULL THEN 'ja'
     WHEN nullif(trim(base_profile->>'name_cn'), '') IS NOT NULL THEN 'zh'
     WHEN nullif(trim(base_profile->>'name_en'), '') IS NOT NULL THEN 'en'
     ELSE 'ja'
   END
 WHERE name_default_locale IS NULL;

COMMIT;
