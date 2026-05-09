-- 061_canonicalize_residence_status_of_residence: 回滚
-- typo 修复属于数据规范化，不存在业务上的「正确 typo」回滚目标；
-- 故 down 仅做语义占位，不执行逆向写入。
-- 若调试需要恢复历史 typo，请通过 SQL 控制台手动操作并记录在案。

SELECT 1;
