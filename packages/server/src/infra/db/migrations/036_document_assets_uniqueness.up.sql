-- D1.b: document_assets dedup unique indexes
-- Partial unique indexes for concurrent-safe upsert via ON CONFLICT DO NOTHING.

-- Customer-owned assets: one active asset per (org, material, subject_type, customer)
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_assets_unique_customer_owned
  ON document_assets (org_id, material_code, owner_subject_type, owner_customer_id)
  WHERE active_flag = true AND owner_customer_id IS NOT NULL;

-- Employer-owned assets: one active asset per (org, material, employer_identity_key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_assets_unique_employer_owned
  ON document_assets (org_id, material_code, owner_employer_identity_key)
  WHERE active_flag = true AND owner_employer_identity_key IS NOT NULL;
