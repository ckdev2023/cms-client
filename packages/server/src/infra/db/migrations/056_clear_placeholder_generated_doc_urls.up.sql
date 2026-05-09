-- 056_clear_placeholder_generated_doc_urls: 清除历史占位 URL
-- 后端已不再写入 placeholder:// 协议，此迁移回填旧数据为 NULL。

UPDATE generated_documents
SET file_url = NULL
WHERE file_url LIKE 'placeholder://%';
