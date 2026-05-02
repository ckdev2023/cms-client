-- BUG-207: phase→stage 全量一致性回填
-- 权威映射：packages/server/src/modules/core/cases/businessPhase.ts PHASE_TO_STAGE_DEFAULT
-- 幂等：WHERE 子句排除已一致的行；重复执行 UPDATE 0 rows。
UPDATE cases
   SET stage = CASE business_phase
     WHEN 'CONSULTING'                 THEN 'S1'
     WHEN 'CONTRACTED'                 THEN 'S1'
     WHEN 'WAITING_MATERIAL'           THEN 'S2'
     WHEN 'MATERIAL_PREPARING'         THEN 'S3'
     WHEN 'REVIEWING'                  THEN 'S4'
     WHEN 'APPLYING'                   THEN 'S5'
     WHEN 'UNDER_REVIEW'               THEN 'S5'
     WHEN 'NEED_SUPPLEMENT'            THEN 'S5'
     WHEN 'SUPPLEMENT_PROCESSING'      THEN 'S5'
     WHEN 'APPROVED'                   THEN 'S6'
     WHEN 'REJECTED'                   THEN 'S6'
     WHEN 'WAITING_PAYMENT'            THEN 'S7'
     WHEN 'COE_SENT'                   THEN 'S7'
     WHEN 'VISA_APPLYING'              THEN 'S7'
     WHEN 'VISA_REJECTED'              THEN 'S7'
     WHEN 'SUCCESS'                    THEN 'S8'
     WHEN 'RESIDENCE_PERIOD_RECORDED'  THEN 'S8'
     WHEN 'RENEWAL_REMINDER_SCHEDULED' THEN 'S8'
     WHEN 'CLOSED_SUCCESS'             THEN 'S9'
     WHEN 'CLOSED_FAILED'              THEN 'S9'
   END
 WHERE business_phase IS NOT NULL
   AND stage <> CASE business_phase
     WHEN 'CONSULTING'                 THEN 'S1'
     WHEN 'CONTRACTED'                 THEN 'S1'
     WHEN 'WAITING_MATERIAL'           THEN 'S2'
     WHEN 'MATERIAL_PREPARING'         THEN 'S3'
     WHEN 'REVIEWING'                  THEN 'S4'
     WHEN 'APPLYING'                   THEN 'S5'
     WHEN 'UNDER_REVIEW'               THEN 'S5'
     WHEN 'NEED_SUPPLEMENT'            THEN 'S5'
     WHEN 'SUPPLEMENT_PROCESSING'      THEN 'S5'
     WHEN 'APPROVED'                   THEN 'S6'
     WHEN 'REJECTED'                   THEN 'S6'
     WHEN 'WAITING_PAYMENT'            THEN 'S7'
     WHEN 'COE_SENT'                   THEN 'S7'
     WHEN 'VISA_APPLYING'              THEN 'S7'
     WHEN 'VISA_REJECTED'              THEN 'S7'
     WHEN 'SUCCESS'                    THEN 'S8'
     WHEN 'RESIDENCE_PERIOD_RECORDED'  THEN 'S8'
     WHEN 'RENEWAL_REMINDER_SCHEDULED' THEN 'S8'
     WHEN 'CLOSED_SUCCESS'             THEN 'S9'
     WHEN 'CLOSED_FAILED'              THEN 'S9'
   END;
