-- 054_document_files_local_archive: 支持本地归档登记（无二进制上传）
-- 背景：本地归档登记仅记录 storage_type=local_server + relative_path，
-- 不写入 file_url，但 009 创建表时 file_url 设置为 NOT NULL，
-- 导致 DocumentFilesService.registerLocalArchive() 实际写入触发
-- "null value in column file_url violates not-null constraint"。
-- 对应 P0/07 §3.10A, P0/03 §13.4 资料版本登记。

ALTER TABLE document_files ALTER COLUMN file_url DROP NOT NULL;

-- 强制：file_url 与 relative_path 至少其一非空，禁止两者都为空。
ALTER TABLE document_files
  ADD CONSTRAINT document_files_storage_target_present
  CHECK (file_url IS NOT NULL OR relative_path IS NOT NULL);
