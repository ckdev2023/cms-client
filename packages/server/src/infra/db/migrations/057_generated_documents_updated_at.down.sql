-- 057_generated_documents_updated_at: 回滚

DROP INDEX IF EXISTS idx_generated_documents_status_updated_at;

ALTER TABLE generated_documents
  DROP COLUMN IF EXISTS updated_at;
