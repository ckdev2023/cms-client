-- communication_logs 补充 updatedAt 字段
ALTER TABLE "communication_logs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

-- 补充缺失的外键索引 (Drizzle .references() 需要)
CREATE INDEX IF NOT EXISTS "cases_org_id_idx" ON "cases" USING btree ("org_id");
CREATE INDEX IF NOT EXISTS "cases_customer_id_idx" ON "cases" USING btree ("customer_id");
CREATE INDEX IF NOT EXISTS "cases_owner_user_id_idx" ON "cases" USING btree ("owner_user_id");
CREATE INDEX IF NOT EXISTS "cases_company_id_idx" ON "cases" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "cases_assistant_user_id_idx" ON "cases" USING btree ("assistant_user_id");

CREATE INDEX IF NOT EXISTS "communication_logs_org_id_idx" ON "communication_logs" USING btree ("org_id");
CREATE INDEX IF NOT EXISTS "communication_logs_case_id_idx" ON "communication_logs" USING btree ("case_id");
CREATE INDEX IF NOT EXISTS "communication_logs_customer_id_idx" ON "communication_logs" USING btree ("customer_id");
CREATE INDEX IF NOT EXISTS "communication_logs_company_id_idx" ON "communication_logs" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "communication_logs_created_by_idx" ON "communication_logs" USING btree ("created_by");

CREATE INDEX IF NOT EXISTS "companies_org_id_idx" ON "companies" USING btree ("org_id");
CREATE INDEX IF NOT EXISTS "companies_owner_user_id_idx" ON "companies" USING btree ("owner_user_id");

CREATE INDEX IF NOT EXISTS "customers_org_id_idx" ON "customers" USING btree ("org_id");

CREATE INDEX IF NOT EXISTS "users_org_id_idx" ON "users" USING btree ("org_id");
