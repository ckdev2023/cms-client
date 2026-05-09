-- 062_default_bmv_feature_flag: 回滚
-- 默认开启 BMV flag 是 UX 死锁修复；不存在业务上需要 rollback 的反向操作。
-- 若个别 org 需要关闭 BMV，请通过 POST /api/feature-flags 修改启用态，而不是
-- 删除该行（删除后会再次回到「missing → 死锁」状态）。

SELECT 1;
