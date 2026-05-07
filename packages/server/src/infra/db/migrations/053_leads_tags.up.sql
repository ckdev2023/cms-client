-- 053_leads_tags: leads テーブルに tags 配列カラムを追加（一括タグ永続化）
ALTER TABLE leads ADD COLUMN tags text[] NOT NULL DEFAULT '{}';
CREATE INDEX idx_leads_tags ON leads USING gin (tags);
