-- BUG-159: cases.group_id 二次回填——admin UI 在 Step 2/3 显示从主申请人继承的 group，
--   但案件创建早于 022/034 的客户/案件分组治理（或客户 base_profile 用 UUID 形态而不是 group name），
--   导致 cases.group_id 大量为 NULL，下游 BillingTable / billing-plans 永远命中 fallback `—`。
--
-- 本迁移以 customers.base_profile 中的任一 group 标识（group_id / groupId / group）为锚，
-- 回填 cases.group_id；对齐 cases.service.ts#resolveCustomerGroupId 的 name/UUID 双路径匹配语义。
UPDATE cases
SET group_id = g.id
FROM customers c
JOIN LATERAL (
  SELECT coalesce(
    nullif(trim(c.base_profile->>'group_id'), ''),
    nullif(trim(c.base_profile->>'groupId'), ''),
    nullif(trim(c.base_profile->>'group'), '')
  ) AS group_val
) cv ON true
JOIN groups g
  ON g.org_id = c.org_id
 AND (g.name = cv.group_val OR g.id::text = cv.group_val)
WHERE cases.customer_id = c.id
  AND cases.org_id = c.org_id
  AND cases.group_id IS NULL
  AND cv.group_val IS NOT NULL;
