-- 062_default_bmv_feature_flag_for_existing_orgs
-- 背景：feature_flags 表对每个 org 没有默认行；当 `bmv` flag 缺失时
-- /api/feature-flags/resolve?key=bmv 返回 enabled=false (reason=missing)，
-- 导致客户详情页对经管签客户隐藏 BmvIntakeCard，
-- 但门禁仍要求「先完成签约」，形成「禁用按钮 + 无入口」UI 死锁。
--
-- 修复点：为所有现有 org 写入 bmv=enabled 默认行；已存在记录（含管理员
-- 显式关停态）保持原状不被覆盖。
-- 新 org 由 `localAdminBootstrap.upsertDefaultFeatureFlags` 写入兜底。

INSERT INTO feature_flags (org_id, key, enabled, payload)
SELECT o.id, 'bmv', true, '{}'::jsonb
FROM organizations o
ON CONFLICT (org_id, key) DO NOTHING;
