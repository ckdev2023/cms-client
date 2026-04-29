-- 033_customer_numbers: customers.base_profile.customerNumber 正规化 + 历史回填 + 唯一索引

-- Step 1: 将历史别名字段统一回填到 canonical customerNumber
UPDATE customers c
SET base_profile = jsonb_set(
  coalesce(c.base_profile, '{}'::jsonb),
  '{customerNumber}',
  to_jsonb(src.customer_number),
  true
)
FROM (
  SELECT
    id,
    coalesce(
      nullif(trim(base_profile->>'customerNumber'), ''),
      nullif(trim(base_profile->>'customer_number'), ''),
      nullif(trim(base_profile->>'customerNo'), ''),
      nullif(trim(base_profile->>'customer_no'), '')
    ) AS customer_number
  FROM customers
) src
WHERE c.id = src.id
  AND src.customer_number IS NOT NULL
  AND nullif(trim(c.base_profile->>'customerNumber'), '') IS NULL;

-- Step 2: 为仍缺号的历史客户按创建月份回填 CUS-YYYYMM-NNNN
WITH existing_max AS (
  SELECT
    org_id,
    substring(trim(base_profile->>'customerNumber') from '^CUS-([0-9]{6})-') AS yyyymm,
    max(substring(trim(base_profile->>'customerNumber') from '([0-9]+)$')::int) AS max_seq
  FROM customers
  WHERE trim(coalesce(base_profile->>'customerNumber', '')) ~ '^CUS-[0-9]{6}-[0-9]+$'
  GROUP BY org_id, substring(trim(base_profile->>'customerNumber') from '^CUS-([0-9]{6})-')
),
missing AS (
  SELECT
    c.id,
    c.org_id,
    to_char(c.created_at AT TIME ZONE 'UTC', 'YYYYMM') AS yyyymm,
    row_number() OVER (
      PARTITION BY c.org_id, to_char(c.created_at AT TIME ZONE 'UTC', 'YYYYMM')
      ORDER BY c.created_at, c.id
    ) AS seq
  FROM customers c
  WHERE nullif(trim(c.base_profile->>'customerNumber'), '') IS NULL
),
generated AS (
  SELECT
    m.id,
    format(
      'CUS-%s-%s',
      m.yyyymm,
      lpad((coalesce(e.max_seq, 0) + m.seq)::text, 4, '0')
    ) AS customer_number
  FROM missing m
  LEFT JOIN existing_max e
    ON e.org_id = m.org_id AND e.yyyymm = m.yyyymm
)
UPDATE customers c
SET base_profile = jsonb_set(
  coalesce(c.base_profile, '{}'::jsonb),
  '{customerNumber}',
  to_jsonb(g.customer_number),
  true
)
FROM generated g
WHERE c.id = g.id;

-- Step 3: customerNumber 在组织内唯一
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_org_customer_number
  ON customers(org_id, trim(base_profile->>'customerNumber'))
  WHERE nullif(trim(base_profile->>'customerNumber'), '') IS NOT NULL;