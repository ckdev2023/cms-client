-- BUG-177: admin buildPrimaryCasePartyInput 写 partyType='applicant' + isPrimary=true，
--   但历史 case 从未成功写入（server VALID_PARTY_TYPES 不含 applicant，请求被 reject），
--   导致 case_parties 表缺少主申请人行。
--
-- 本迁移：为所有缺少 primary applicant 行的 case 补一行 case_parties。
-- 幂等：not exists 子查询保证已有行的 case 跳过。
INSERT INTO case_parties (id, org_id, case_id, party_type, customer_id, is_primary, created_at, updated_at)
SELECT gen_random_uuid(), c.org_id, c.id, 'applicant', c.customer_id, true, now(), now()
FROM cases c
WHERE c.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM case_parties cp
    WHERE cp.case_id = c.id AND cp.is_primary = true AND cp.party_type = 'applicant'
  );
