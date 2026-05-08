-- BUG-158: customers.base_profile.bmvProfile 字段在历史数据上从未被写入，
--   即使客户已有 BMV 类型的非归档 case；admin UI 的 useCreateCasePreSignGate 因此
--   把所有历史客户的"问卷/报价/签约/承接"四前提全部判为 not-ready，
--   "下一步：确认承接与期限"按钮永远 disabled，admin 完全无法在 UI 端建立新的
--   经营管理签案件（含续签 / 认定 4M / 认定 1Y 三种子模板）。
--
-- 本迁移：当 customers 缺失 bmvProfile（同时排除 bmv_profile snake_case
-- 旧字段）但已有 case_type_code='business_manager_visa' 或 'biz_mgmt%'
-- 的非归档 case 时，倒推承接四态全 ready，使建案前置门禁立刻通过。
--   - questionnaireStatus = returned
--   - quoteStatus = confirmed
--   - signStatus = signed
--   - intakeStatus = ready_for_case_creation
--
-- 业务对照：经营管理签续签场景执行重点
--   客户已有 active BMV case 即视为"承接已签约"事实成立。
WITH bmv_customers AS (
  SELECT DISTINCT c.customer_id, c.org_id
  FROM cases c
  WHERE (
    c.case_type_code = 'business_manager_visa'
    OR c.case_type_code LIKE 'biz_mgmt%'
  )
  AND coalesce(c.metadata->>'_status', '') IS DISTINCT FROM 'deleted'
)
UPDATE customers cu
SET base_profile = jsonb_set(
  coalesce(cu.base_profile, '{}'::jsonb) - 'bmv_profile',
  '{bmvProfile}',
  jsonb_build_object(
    'questionnaireStatus', 'returned',
    'quoteStatus', 'confirmed',
    'signStatus', 'signed',
    'intakeStatus', 'ready_for_case_creation',
    'questionnaireSentAt', null,
    'questionnaireReturnedAt', null,
    'quoteGeneratedAt', null,
    'quoteConfirmedAt', null,
    'signedAt', null,
    'note', null,
    'sourceLeadId', null,
    'currentQuoteFormId', null,
    'visaPlan', null,
    'quoteAmount', null
  ),
  true
),
updated_at = now()
FROM bmv_customers bc
WHERE cu.id = bc.customer_id
  AND cu.org_id = bc.org_id
  AND coalesce(
    cu.base_profile->'bmvProfile',
    cu.base_profile->'bmv_profile'
  ) IS NULL;
