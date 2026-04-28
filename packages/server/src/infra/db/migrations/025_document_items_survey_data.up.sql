-- 025_document_items_survey_data: P1 问卷资料项 survey_data 列
-- 权威来源：P0/07 §3.9 survey_data、P1/01 §2 Step 3-4（M2 问卷与报价）
--
-- category 列已在 017 中添加（text, nullable）。
-- 本迁移仅追加 survey_data JSONB 列 + category 索引，
-- 使 questionnaire 类资料项可携带结构化问卷数据并支持按类别查询。

ALTER TABLE document_items
  ADD COLUMN IF NOT EXISTS survey_data jsonb;

COMMENT ON COLUMN document_items.survey_data IS
  'P1 问卷类资料项的结构化答案（JSONB）；category=questionnaire 时使用，其他类别为 null。';

CREATE INDEX IF NOT EXISTS idx_document_items_category
  ON document_items(case_id, category)
  WHERE category IS NOT NULL;
