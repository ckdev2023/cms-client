-- 054_document_files_local_archive (down): 回滚至 file_url NOT NULL
-- 注意：若已存在仅有 relative_path 的本地归档行，回滚前需先回填 file_url
-- 或删除这些行；否则 SET NOT NULL 会失败。
ALTER TABLE document_files DROP CONSTRAINT IF EXISTS document_files_storage_target_present;
ALTER TABLE document_files ALTER COLUMN file_url SET NOT NULL;
