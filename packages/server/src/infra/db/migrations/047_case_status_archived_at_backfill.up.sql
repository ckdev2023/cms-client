-- 047_case_status_archived_at_backfill
-- stage='S9' の案件について archived_at が NULL のレコードを回填し、
-- status を 'S9' に同期する。
-- R31-L: 状態機一致化。

BEGIN;

UPDATE cases
SET archived_at = COALESCE(updated_at, now()),
    status = 'S9'
WHERE stage = 'S9'
  AND (archived_at IS NULL OR status IS DISTINCT FROM 'S9');

COMMIT;
