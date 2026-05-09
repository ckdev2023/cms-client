-- 055_generated_documents_template_snapshot: 文书模板快照字段
-- 记录生成时引用的 document_templates.version_no 与 doc_type，
-- 便于 D2 渲染 worker 回溯模板版本、前端显示文书分类。

ALTER TABLE generated_documents
  ADD COLUMN template_version_no_snapshot int,
  ADD COLUMN template_doc_type text;
