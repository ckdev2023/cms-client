DROP INDEX IF EXISTS "users_org_id_idx";
DROP INDEX IF EXISTS "customers_org_id_idx";
DROP INDEX IF EXISTS "companies_owner_user_id_idx";
DROP INDEX IF EXISTS "companies_org_id_idx";

DROP INDEX IF EXISTS "communication_logs_created_by_idx";
DROP INDEX IF EXISTS "communication_logs_company_id_idx";
DROP INDEX IF EXISTS "communication_logs_customer_id_idx";
DROP INDEX IF EXISTS "communication_logs_case_id_idx";
DROP INDEX IF EXISTS "communication_logs_org_id_idx";

DROP INDEX IF EXISTS "cases_assistant_user_id_idx";
DROP INDEX IF EXISTS "cases_company_id_idx";
DROP INDEX IF EXISTS "cases_owner_user_id_idx";
DROP INDEX IF EXISTS "cases_customer_id_idx";
DROP INDEX IF EXISTS "cases_org_id_idx";

ALTER TABLE "communication_logs" DROP COLUMN IF EXISTS "updated_at";