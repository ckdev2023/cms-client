-- 032_business_phase: 双層状態機 — cases.business_phase 業務維度フィールド
--
-- S1-S9 stage 軸と並行する business_phase を追加。
-- 既存行は stageToPhaseDefault マッピングで一括回填。
-- 新規作成は service 層が強制書込みするため DB デフォルトは不要。

-- Step 1: nullable で追加（既存行に影響なし）
alter table cases
  add column if not exists business_phase text;

-- Step 2: 既存行を stage (→ coalesce(stage, status)) から回填
update cases
set business_phase = case coalesce(stage, status)
  when 'S1' then 'CONSULTING'
  when 'S2' then 'WAITING_MATERIAL'
  when 'S3' then 'MATERIAL_PREPARING'
  when 'S4' then 'REVIEWING'
  when 'S5' then 'APPLYING'
  when 'S6' then 'APPROVED'
  when 'S7' then 'WAITING_PAYMENT'
  when 'S8' then 'SUCCESS'
  when 'S9' then 'CLOSED_SUCCESS'
  else 'CONSULTING'
end
where business_phase is null;

-- Step 3: NOT NULL 制約
alter table cases
  alter column business_phase set not null;

comment on column cases.business_phase is
  '業務維度フェーズ（CONSULTING, CONTRACTED, … CLOSED_SUCCESS, CLOSED_FAILED）。S1-S9 stage 軸とは独立推進。';

-- Step 4: phase 別クエリ用部分インデックス
create index if not exists idx_cases_business_phase
  on cases(org_id, business_phase);
