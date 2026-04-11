-- 015_documents_truth: P0 资料版本 + 提交包最小事实来源
-- 对应 P0/07 §3.9–3.10A, §3.18–3.19; P0/03 §2.4, §7, §13

-- ============================================================
-- 1. DocumentAsset（资料资产 — 可跨案复用的逻辑材料层）
-- ============================================================
CREATE TABLE IF NOT EXISTS document_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  material_code text NOT NULL,
  owner_subject_type text NOT NULL DEFAULT 'customer',
  owner_customer_id uuid REFERENCES customers(id),
  owner_employer_identity_key text,
  origin_case_id uuid REFERENCES cases(id),
  source_requirement_id uuid,
  active_flag boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_assets_owner
  ON document_assets(org_id, owner_subject_type, owner_customer_id)
  WHERE active_flag = true;

CREATE INDEX IF NOT EXISTS idx_document_assets_employer
  ON document_assets(org_id, owner_employer_identity_key)
  WHERE owner_employer_identity_key IS NOT NULL AND active_flag = true;

-- ============================================================
-- 2. 补齐 document_items → P0 DocumentRequirement 字段
-- ============================================================
ALTER TABLE document_items ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE document_items ADD COLUMN IF NOT EXISTS provided_by_role text;
ALTER TABLE document_items ADD COLUMN IF NOT EXISTS required_flag boolean NOT NULL DEFAULT true;
ALTER TABLE document_items ADD COLUMN IF NOT EXISTS assignee_user_id uuid REFERENCES users(id);
ALTER TABLE document_items ADD COLUMN IF NOT EXISTS client_visible_flag boolean NOT NULL DEFAULT false;
ALTER TABLE document_items ADD COLUMN IF NOT EXISTS client_action_required boolean NOT NULL DEFAULT false;
ALTER TABLE document_items ADD COLUMN IF NOT EXISTS latest_version_id uuid;
ALTER TABLE document_items ADD COLUMN IF NOT EXISTS review_comment_latest text;
ALTER TABLE document_items ADD COLUMN IF NOT EXISTS waive_reason_latest text;
ALTER TABLE document_items ADD COLUMN IF NOT EXISTS waive_reason_code_latest text;
ALTER TABLE document_items ADD COLUMN IF NOT EXISTS waived_by_user_id_latest uuid REFERENCES users(id);
ALTER TABLE document_items ADD COLUMN IF NOT EXISTS waived_at_latest timestamptz;

-- ============================================================
-- 3. 补齐 document_files → P0 DocumentFileVersion 字段
-- ============================================================
ALTER TABLE document_files ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES document_assets(id);
ALTER TABLE document_files ADD COLUMN IF NOT EXISTS storage_type text NOT NULL DEFAULT 'local_server';
ALTER TABLE document_files ADD COLUMN IF NOT EXISTS relative_path text;
ALTER TABLE document_files ADD COLUMN IF NOT EXISTS captured_by_type text NOT NULL DEFAULT 'internal_user';
ALTER TABLE document_files ADD COLUMN IF NOT EXISTS captured_by_id uuid;
ALTER TABLE document_files ADD COLUMN IF NOT EXISTS captured_at timestamptz;
ALTER TABLE document_files ADD COLUMN IF NOT EXISTS visible_scope text NOT NULL DEFAULT 'internal_only';
ALTER TABLE document_files ADD COLUMN IF NOT EXISTS review_comment text;

CREATE INDEX IF NOT EXISTS idx_document_files_asset
  ON document_files(asset_id, version_no DESC)
  WHERE asset_id IS NOT NULL;

-- ============================================================
-- 4. DocumentRequirementFileRef（资料项-附件版本引用）
-- ============================================================
CREATE TABLE IF NOT EXISTS document_requirement_file_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES document_items(id) ON DELETE CASCADE,
  file_version_id uuid NOT NULL REFERENCES document_files(id),
  ref_mode text NOT NULL DEFAULT 'direct_register',
  linked_from_requirement_id uuid REFERENCES document_items(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_req_file_refs_requirement
  ON document_requirement_file_refs(requirement_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_req_file_refs_unique
  ON document_requirement_file_refs(requirement_id, file_version_id);

-- ============================================================
-- 5. SubmissionPackage（提交包 — 不可变快照）
-- ============================================================
CREATE TABLE IF NOT EXISTS submission_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  case_id uuid NOT NULL REFERENCES cases(id),
  submission_no int NOT NULL,
  submission_kind text NOT NULL DEFAULT 'initial',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  validation_run_id uuid,
  review_record_id uuid,
  authority_name text,
  acceptance_no text,
  receipt_storage_type text,
  receipt_relative_path_or_key text,
  related_submission_id uuid REFERENCES submission_packages(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_packages_case
  ON submission_packages(case_id, submission_no);

CREATE INDEX IF NOT EXISTS idx_submission_packages_acceptance
  ON submission_packages(org_id, acceptance_no)
  WHERE acceptance_no IS NOT NULL;

-- ============================================================
-- 6. SubmissionPackageItem（提交包锁定引用）
-- ============================================================
CREATE TABLE IF NOT EXISTS submission_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_package_id uuid NOT NULL REFERENCES submission_packages(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  ref_id uuid NOT NULL,
  snapshot_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_package_items_pkg
  ON submission_package_items(submission_package_id);
