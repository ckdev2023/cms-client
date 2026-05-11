-- 066_cleanup_empty_duplicate_case_templates
-- 删除「requirement_blueprint 无法产出任何 checklist 条目」的 case_templates 行，
-- 仅当同一 org、同一 (case_type, application_type) 下仍存在另一条 active、且蓝图含条目的模板时执行。
-- 背景：新建空蓝图模板若 created_at 更新，会与种子模板并存并误导 checklist-preview（旧逻辑 LIMIT 1）。

DELETE FROM case_templates AS ct
WHERE EXISTS (
    SELECT 1
    FROM case_templates AS keeper
    WHERE keeper.org_id = ct.org_id
      AND keeper.case_type = ct.case_type
      AND COALESCE(keeper.application_type, '') = COALESCE(ct.application_type, '')
      AND keeper.id <> ct.id
      AND keeper.active_flag IS TRUE
      AND keeper.requirement_blueprint IS NOT NULL
      AND (
          (
              jsonb_typeof(keeper.requirement_blueprint) = 'array'
              AND jsonb_array_length(keeper.requirement_blueprint) > 0
          )
          OR (
              jsonb_typeof(keeper.requirement_blueprint) = 'object'
              AND jsonb_typeof(keeper.requirement_blueprint -> 'items') = 'array'
              AND jsonb_array_length(keeper.requirement_blueprint -> 'items') > 0
          )
      )
)
AND (
    ct.requirement_blueprint IS NULL
    OR (
        jsonb_typeof(ct.requirement_blueprint) = 'array'
        AND jsonb_array_length(ct.requirement_blueprint) = 0
    )
    OR (
        jsonb_typeof(ct.requirement_blueprint) = 'object'
        AND (
            NOT (ct.requirement_blueprint ? 'items')
            OR jsonb_typeof(ct.requirement_blueprint -> 'items') <> 'array'
            OR jsonb_array_length(ct.requirement_blueprint -> 'items') = 0
        )
    )
);
