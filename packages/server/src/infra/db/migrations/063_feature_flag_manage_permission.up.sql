-- 063_feature_flag_manage_permission
-- 背景：新增 feature_flag.manage 権限コード（owner 専用）。
-- migration 050 で owner role_permissions に全権限を backfill したが、
-- 当時 feature_flag.manage は存在しなかったため追加投入する。
-- manager / staff / viewer には付与しない。

INSERT INTO role_permissions (role_id, permission)
SELECT r.id, 'feature_flag.manage'
FROM roles r
WHERE r.code = 'owner' AND r.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;
