-- 064_fix_bmv_company_document_items_provided_by_role (down)
-- 将本迁移改过的 employer 回填为 supporter，与 058 的 customer → supporter 语义一致（仅开发回滚用）。

UPDATE document_items
SET provided_by_role = 'supporter'
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
  AND provided_by_role = 'employer';
