-- 064_fix_bmv_company_document_items_provided_by_role
-- 058 将 owner_side='customer' 统一回填为 supporter，适合家族签扶养者资料；
-- 经营管理签中「会社・事业侧」资料项在蓝图中为 employer，被误标成 supporter
-- 会导致「按提供方完成率」与资料清单分组显示为「扶养者/保证人」。

UPDATE document_items
SET provided_by_role = 'employer'
WHERE checklist_item_code IN (
      'bmv-company-registry',
      'bmv-office-lease',
      'bmv-capital-proof',
      'bmv-office-photos',
      'bmv-financial-statement',
      'bmv-tax-certificate',
      'bmv-seal-certificate',
      'bmv-bank-statement'
    )
  AND COALESCE(provided_by_role, '') IN ('supporter', '');
