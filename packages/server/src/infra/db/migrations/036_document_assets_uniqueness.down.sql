-- D1.b rollback: drop dedup unique indexes
DROP INDEX IF EXISTS idx_document_assets_unique_employer_owned;
DROP INDEX IF EXISTS idx_document_assets_unique_customer_owned;
