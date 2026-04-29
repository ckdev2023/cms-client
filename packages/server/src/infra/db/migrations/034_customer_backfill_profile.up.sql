-- 034_customer_backfill_profile: 历史 customer 缺 ownerUserId / groupId 时，
-- 取该 customer 关联的最早 case 的 owner_user_id / group_id 回填到 base_profile。
-- 仅回填仍为空的字段；新建 case 流程已能正确写入这些字段，所以不会覆盖已有值。

-- Step 1: 回填 base_profile.ownerUserId（仅当所有别名都为空时）
WITH earliest_case AS (
  SELECT DISTINCT ON (c.customer_id)
    c.customer_id,
    c.owner_user_id,
    c.group_id
  FROM cases c
  WHERE c.owner_user_id IS NOT NULL
  ORDER BY c.customer_id, c.created_at, c.id
)
UPDATE customers cu
SET base_profile = jsonb_set(
  coalesce(cu.base_profile, '{}'::jsonb),
  '{ownerUserId}',
  to_jsonb(ec.owner_user_id::text),
  true
)
FROM earliest_case ec
WHERE cu.id = ec.customer_id
  AND nullif(trim(coalesce(cu.base_profile->>'ownerUserId', '')), '') IS NULL
  AND nullif(trim(coalesce(cu.base_profile->>'owner_user_id', '')), '') IS NULL;

-- Step 2: 回填 base_profile.groupId（仅当所有别名都为空且 case 有 group_id 时）
WITH earliest_case AS (
  SELECT DISTINCT ON (c.customer_id)
    c.customer_id,
    c.group_id
  FROM cases c
  WHERE c.group_id IS NOT NULL
  ORDER BY c.customer_id, c.created_at, c.id
)
UPDATE customers cu
SET base_profile = jsonb_set(
  coalesce(cu.base_profile, '{}'::jsonb),
  '{groupId}',
  to_jsonb(ec.group_id::text),
  true
)
FROM earliest_case ec
WHERE cu.id = ec.customer_id
  AND nullif(trim(coalesce(cu.base_profile->>'groupId', '')), '') IS NULL
  AND nullif(trim(coalesce(cu.base_profile->>'group_id', '')), '') IS NULL
  AND nullif(trim(coalesce(cu.base_profile->>'group', '')), '') IS NULL;
