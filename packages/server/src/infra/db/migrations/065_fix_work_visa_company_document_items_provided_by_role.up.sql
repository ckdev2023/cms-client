-- 065_fix_work_visa_company_document_items_provided_by_role
-- 058 将 owner_side='customer' 统一回填为 supporter，适合家族签扶养者资料；
-- 技人国（work）中「雇用者・会社側」资料在蓝图中为 employer，被误标成 supporter
-- 会导致「按提供方完成率」与资料清单分组显示为「扶养者/保证人」（与 064/BMV 同理）。

UPDATE document_items
SET provided_by_role = 'employer'
WHERE checklist_item_code IN (
      'work-employment-contract',
      'work-company-registry',
      'work-company-profile',
      'work-financial-statement',
      'work-category-proof'
    )
  AND COALESCE(provided_by_role, '') IN ('supporter', '');
