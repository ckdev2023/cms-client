-- BUG-186 回滚：将 `case_fee` 回退为日文本地化 `案件報酬`。
-- 仅对那些看起来是 migration 040 / runtime 建案流程写入的 `case_fee` 行做回滚；
-- 若将来业务引入了同名 `case_fee` 但语义不同，down 不应无差别覆写，故保留
-- `WHERE milestone_name = 'case_fee'`。
UPDATE billing_records
SET
  milestone_name = '案件報酬',
  updated_at = now()
WHERE milestone_name = 'case_fee';
