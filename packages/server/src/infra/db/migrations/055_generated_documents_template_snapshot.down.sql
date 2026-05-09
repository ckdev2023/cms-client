-- 055_generated_documents_template_snapshot (down): 回滚快照列
ALTER TABLE generated_documents
  DROP COLUMN IF EXISTS template_doc_type,
  DROP COLUMN IF EXISTS template_version_no_snapshot;
