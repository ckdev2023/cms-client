-- 057_generated_documents_updated_at: 给 generated_documents 添加 updated_at 列
-- D2 异步导出 worker 通过 updated_at 判断 exporting 状态超时（sweepStaleExports）；
-- exportHandler 写 exported / export_failed 时也需要刷新 updated_at。
-- 这里同时为既有行回填 updated_at = generated_at（首次写入即生成时间）。

ALTER TABLE generated_documents
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE generated_documents
SET updated_at = generated_at
WHERE updated_at IS NULL;

ALTER TABLE generated_documents
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_generated_documents_status_updated_at
  ON generated_documents (status, updated_at);
