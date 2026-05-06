-- 052_leads_app_user_nullable: admin 作成リードは portal ユーザーを持たないため、app_user_id を nullable に変更
ALTER TABLE leads ALTER COLUMN app_user_id DROP NOT NULL;
