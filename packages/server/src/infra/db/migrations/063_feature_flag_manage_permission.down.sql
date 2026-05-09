-- 063_feature_flag_manage_permission: rollback
-- owner から feature_flag.manage を除去する。

DELETE FROM role_permissions
WHERE permission = 'feature_flag.manage'
  AND role_id IN (
    SELECT id FROM roles WHERE code = 'owner' AND is_system = true
  );
