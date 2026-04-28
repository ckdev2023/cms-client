-- 025_document_items_survey_data (rollback)

DROP INDEX IF EXISTS idx_document_items_category;

ALTER TABLE document_items DROP COLUMN IF EXISTS survey_data;
