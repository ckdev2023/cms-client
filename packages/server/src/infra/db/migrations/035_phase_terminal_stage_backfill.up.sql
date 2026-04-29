-- BUG-116/117: 终态 phase 但 stage 未同步 S9 的历史数据回填
UPDATE cases
   SET stage = 'S9',
       result_outcome = CASE
         WHEN business_phase = 'CLOSED_SUCCESS' THEN 'success'
         ELSE COALESCE(result_outcome, 'failure')
       END
 WHERE business_phase IN ('CLOSED_SUCCESS', 'CLOSED_FAILED')
   AND stage <> 'S9';
