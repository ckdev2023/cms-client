-- 015_documents_truth rollback

-- 6. submission_package_items
DROP INDEX IF EXISTS idx_submission_package_items_pkg;
DROP TABLE IF EXISTS submission_package_items;

-- 5. submission_packages
DROP INDEX IF EXISTS idx_submission_packages_acceptance;
DROP INDEX IF EXISTS idx_submission_packages_case;
DROP TABLE IF EXISTS submission_packages;

-- 4. document_requirement_file_refs
DROP INDEX IF EXISTS idx_doc_req_file_refs_unique;
DROP INDEX IF EXISTS idx_doc_req_file_refs_requirement;
DROP TABLE IF EXISTS document_requirement_file_refs;

-- 3. document_files new columns
DROP INDEX IF EXISTS idx_document_files_asset;
ALTER TABLE document_files DROP COLUMN IF EXISTS review_comment;
ALTER TABLE document_files DROP COLUMN IF EXISTS visible_scope;
ALTER TABLE document_files DROP COLUMN IF EXISTS captured_at;
ALTER TABLE document_files DROP COLUMN IF EXISTS captured_by_id;
ALTER TABLE document_files DROP COLUMN IF EXISTS captured_by_type;
ALTER TABLE document_files DROP COLUMN IF EXISTS relative_path;
ALTER TABLE document_files DROP COLUMN IF EXISTS storage_type;
ALTER TABLE document_files DROP COLUMN IF EXISTS asset_id;

-- 2. document_items new columns
ALTER TABLE document_items DROP COLUMN IF EXISTS waived_at_latest;
ALTER TABLE document_items DROP COLUMN IF EXISTS waived_by_user_id_latest;
ALTER TABLE document_items DROP COLUMN IF EXISTS waive_reason_code_latest;
ALTER TABLE document_items DROP COLUMN IF EXISTS waive_reason_latest;
ALTER TABLE document_items DROP COLUMN IF EXISTS review_comment_latest;
ALTER TABLE document_items DROP COLUMN IF EXISTS latest_version_id;
ALTER TABLE document_items DROP COLUMN IF EXISTS client_action_required;
ALTER TABLE document_items DROP COLUMN IF EXISTS client_visible_flag;
ALTER TABLE document_items DROP COLUMN IF EXISTS assignee_user_id;
ALTER TABLE document_items DROP COLUMN IF EXISTS required_flag;
ALTER TABLE document_items DROP COLUMN IF EXISTS provided_by_role;
ALTER TABLE document_items DROP COLUMN IF EXISTS category;

-- 1. document_assets
DROP INDEX IF EXISTS idx_document_assets_employer;
DROP INDEX IF EXISTS idx_document_assets_owner;
DROP TABLE IF EXISTS document_assets;
