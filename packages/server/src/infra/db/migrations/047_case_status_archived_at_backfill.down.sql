-- 047_case_status_archived_at_backfill (down)
-- この操作は不可逆です。archived_at の元の NULL 値を復元する情報がありません。
-- ロールバックが必要な場合は、手動で対処してください。

DO $$
BEGIN
  RAISE NOTICE '047 down: archived_at backfill is irreversible. Manual intervention required if rollback is needed.';
END
$$;
