/**
 * Dev / staging seed data.
 *
 * ## staff_users display_name ↔ email 错位（故意制造的边界用例）
 *
 * 运行环境中 admin002@example.jp 的 display_name 为 "admin003"。
 * 这是**故意保留的错位**，用于验证以下边界场景：
 *
 * - 审计日志可读性：actor 显示 "admin003"，与登录邮箱前缀 "admin002" 不一致。
 * - 负责人下拉：下拉中的 "admin002" 选项指向另一位 staff_user，
 *   与当前登录的 admin002@example.jp 实际身份不匹配。
 * - scope=mine 行为：`/cases?scope=mine` 按 user.id 过滤，
 *   结果与按 display_name 前缀"admin002"人工预期的不一致
 *   （例如 scope=mine 返回 0 条、scope=all 返回 1 条）。
 *
 * 这些用户不在本文件的 `DEV_USER_SEEDS` 中创建，而是通过管理面板或
 * 外部 bootstrap 脚本生成。如需对齐 display_name 与 email 前缀，
 * 请参见 `seedDevData.staff-mapping.contract.test.ts` 中的可选断言。
 */
import type { PoolClient } from "pg";

import { createPgPool } from "../infra/db/createPgPool";
import { readLocalAdminBootstrapInput } from "../modules/core/auth/localAdminBootstrap";
import { BMV_REQUIREMENT_BLUEPRINT } from "../modules/core/cases/bmvTemplateConfig";
import {
  SEED_LEAD_PORTAL_ID,
  seedConversationAppUser,
  seedConversationLead,
  seedConversationMessages,
  seedConversations,
} from "./seedDevConversations";
import {
  DOC_TEMPLATE_SEEDS,
  seedDocumentTemplates as seedDocumentTemplatesImpl,
} from "./seedDevDocTemplates";
import {
  CASE_TEMPLATE_SEEDS,
  seedCaseTemplates as seedCaseTemplatesImpl,
} from "./seedCaseTemplates";
import { seedDevUsers } from "./seedDevUsers";

const SEED_ORG_ID = "00000000-0000-4000-8000-000000000010";
const SEED_USER_ID = "00000000-0000-4000-8000-000000000011";

const SEED_CUSTOMER_ID = "00000000-0000-4000-a000-000000000001";
const SEED_CASE_A_ID = "00000000-0000-4000-a000-000000000010";
const SEED_CASE_B_ID = "00000000-0000-4000-a000-000000000011";
const SEED_CASE_BMV_ID = "00000000-0000-4000-a000-000000000012";

const DOC_ITEM_PENDING = "00000000-0000-4000-a000-000000000100";
const DOC_ITEM_WAITING = "00000000-0000-4000-a000-000000000101";
const DOC_ITEM_REVIEWING = "00000000-0000-4000-a000-000000000102";
const DOC_ITEM_APPROVED = "00000000-0000-4000-a000-000000000103";
const DOC_ITEM_WAIVED = "00000000-0000-4000-a000-000000000104";
const DOC_ITEM_CASE_B = "00000000-0000-4000-a000-000000000110";

const TMPL_VERSION_DOC_CHECKLIST_ID = "00000000-0000-4000-a000-000000000500";
const TMPL_RELEASE_DOC_CHECKLIST_ID = "00000000-0000-4000-a000-000000000501";

const DOC_FILE_ID = "00000000-0000-4000-a000-000000000200";
const DOC_ASSET_ID = "00000000-0000-4000-a000-000000000300";
const DOC_REF_ID = "00000000-0000-4000-a000-000000000400";

async function seedCustomer(client: PoolClient) {
  await client.query(
    `INSERT INTO customers (id, org_id, type, base_profile, contacts)
     VALUES ($1, $2, 'individual', $3::jsonb, '[]'::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [
      SEED_CUSTOMER_ID,
      SEED_ORG_ID,
      JSON.stringify({
        name_ja: "田中 太郎",
        name_en: "Taro Tanaka",
        nationality: "JP",
      }),
    ],
  );
}

async function seedCases(client: PoolClient) {
  for (const [caseId, caseName, caseNo, caseTypeCode] of [
    [SEED_CASE_A_ID, "家族滞在 — 田中太郎", "CASE-DEV-001", "family_stay"],
    [
      SEED_CASE_B_ID,
      "技人国 — 田中太郎",
      "CASE-DEV-002",
      "engineer_humanities_intl_visa",
    ],
  ] as const) {
    await client.query(
      `INSERT INTO cases (
         id, org_id, customer_id, case_type_code, status, stage,
         owner_user_id, case_no, case_name, business_phase,
         application_flow_type, metadata
       )
       VALUES ($1,$2,$3,$7,'open','document_collection',
               $4,$5,$6,'prepare','standard','{}'::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         case_type_code = EXCLUDED.case_type_code,
         case_name = EXCLUDED.case_name`,
      [
        caseId,
        SEED_ORG_ID,
        SEED_CUSTOMER_ID,
        SEED_USER_ID,
        caseNo,
        caseName,
        caseTypeCode,
      ],
    );
  }

  await client.query(
    `INSERT INTO cases (
       id, org_id, customer_id, case_type_code, status, stage,
       owner_user_id, case_no, case_name, business_phase,
       application_flow_type, metadata
     )
     VALUES ($1,$2,$3,'business_manager_visa','open','S2',
             $4,$5,$6,'WAITING_MATERIAL','standard','{}'::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       case_type_code = EXCLUDED.case_type_code,
       case_name = EXCLUDED.case_name`,
    [
      SEED_CASE_BMV_ID,
      SEED_ORG_ID,
      SEED_CUSTOMER_ID,
      SEED_USER_ID,
      "CASE-DEV-003",
      "経営管理（認定4M）— 田中太郎",
    ],
  );
}

type DocItemSeed = {
  id: string;
  caseId: string;
  code: string;
  name: string;
  status: string;
  ownerSide: string;
  category: string;
};

const DOC_ITEMS: DocItemSeed[] = [
  {
    id: DOC_ITEM_PENDING,
    caseId: SEED_CASE_A_ID,
    code: "passport_copy",
    name: "パスポートコピー",
    status: "pending",
    ownerSide: "customer",
    category: "identity",
  },
  {
    id: DOC_ITEM_WAITING,
    caseId: SEED_CASE_A_ID,
    code: "residence_card",
    name: "在留カードコピー",
    status: "waiting_upload",
    ownerSide: "customer",
    category: "identity",
  },
  {
    id: DOC_ITEM_REVIEWING,
    caseId: SEED_CASE_A_ID,
    code: "employment_certificate",
    name: "在職証明書",
    status: "uploaded_reviewing",
    ownerSide: "office",
    category: "employment",
  },
  {
    id: DOC_ITEM_APPROVED,
    caseId: SEED_CASE_A_ID,
    code: "tax_certificate",
    name: "納税証明書",
    status: "approved",
    ownerSide: "customer",
    category: "tax",
  },
  {
    id: DOC_ITEM_WAIVED,
    caseId: SEED_CASE_A_ID,
    code: "guarantor_proof",
    name: "身元保証書",
    status: "waived",
    ownerSide: "customer",
    category: "guarantor",
  },
  {
    id: DOC_ITEM_CASE_B,
    caseId: SEED_CASE_B_ID,
    code: "passport_copy",
    name: "パスポートコピー (Case B)",
    status: "pending",
    ownerSide: "customer",
    category: "identity",
  },
];

async function seedDocumentItems(client: PoolClient) {
  for (const item of DOC_ITEMS) {
    await client.query(
      `INSERT INTO document_items (
         id, org_id, case_id, checklist_item_code, name,
         status, owner_side, category
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [
        item.id,
        SEED_ORG_ID,
        item.caseId,
        item.code,
        item.name,
        item.status,
        item.ownerSide,
        item.category,
      ],
    );
  }
}

async function seedDocumentFile(client: PoolClient) {
  await client.query(
    `INSERT INTO document_files (
       id, org_id, requirement_id, file_name, file_type,
       version_no, uploaded_by, review_status, storage_type,
       relative_path, file_url, asset_id, expiry_date
     )
     VALUES ($1,$2,$3,'passport_scan.pdf','application/pdf',
             1,$4,'approved','local_server',
             '/dev-seed/passport_scan.pdf',
             $6,
             $5,'2027-03-31')
     ON CONFLICT (id) DO NOTHING`,
    [
      DOC_FILE_ID,
      SEED_ORG_ID,
      DOC_ITEM_APPROVED,
      SEED_USER_ID,
      DOC_ASSET_ID,
      `placeholder://document-files/${DOC_FILE_ID}.pdf`,
    ],
  );
}

async function seedDocumentAsset(client: PoolClient) {
  await client.query(
    `INSERT INTO document_assets (
       id, org_id, material_code, owner_subject_type,
       owner_customer_id, origin_case_id, source_requirement_id,
       active_flag
     )
     VALUES ($1,$2,'passport_copy','customer',$3,$4,$5,true)
     ON CONFLICT (id) DO NOTHING`,
    [
      DOC_ASSET_ID,
      SEED_ORG_ID,
      SEED_CUSTOMER_ID,
      SEED_CASE_A_ID,
      DOC_ITEM_APPROVED,
    ],
  );
}

async function seedDocumentChecklistTemplate(client: PoolClient) {
  const config = JSON.stringify({
    requirementBlueprint: BMV_REQUIREMENT_BLUEPRINT,
  });

  await client.query(
    `INSERT INTO template_versions (
       id, org_id, kind, key, version, config, created_by_user_id
     )
     VALUES ($1,$2,'document_checklist','business_manager_visa',1,$3::jsonb,$4)
     ON CONFLICT (id) DO NOTHING`,
    [TMPL_VERSION_DOC_CHECKLIST_ID, SEED_ORG_ID, config, SEED_USER_ID],
  );

  await client.query(
    `INSERT INTO template_releases (
       id, org_id, kind, key, mode, current_version, rollout, updated_by_user_id
     )
     VALUES ($1,$2,'document_checklist','business_manager_visa','template',1,
             '{"type":"all"}'::jsonb,$3)
     ON CONFLICT (org_id, kind, key) DO UPDATE SET
       mode = EXCLUDED.mode,
       current_version = EXCLUDED.current_version,
       rollout = EXCLUDED.rollout`,
    [TMPL_RELEASE_DOC_CHECKLIST_ID, SEED_ORG_ID, SEED_USER_ID],
  );
}

async function seedDocumentTemplates(client: PoolClient) {
  await seedDocumentTemplatesImpl(client, SEED_ORG_ID, SEED_USER_ID);
}

async function seedCaseTemplatesStep(client: PoolClient) {
  await seedCaseTemplatesImpl(client, SEED_ORG_ID);
}

export {
  WALKTHROUGH_TAG_PATTERN,
  sanitizeWalkthroughTags,
} from "../modules/portal/model/walkthroughTags";

async function seedTagsCleanup(client: PoolClient) {
  await client.query(`
    UPDATE leads
    SET tags = array(
      SELECT t FROM unnest(tags) t
      WHERE t !~* '^(R[0-9]+|test|mcp|tmp)[-_]'
    )
    WHERE EXISTS (
      SELECT 1 FROM unnest(tags) t
      WHERE t ~* '^(R[0-9]+|test|mcp|tmp)[-_]'
    )
  `);

  await client.query(`UPDATE leads SET tags = $1::text[] WHERE id = $2`, [
    ["VIP", "優先", "面談済"],
    SEED_LEAD_PORTAL_ID,
  ]);
}

async function seedCrossCaseLink(client: PoolClient) {
  await client.query(
    `INSERT INTO document_requirement_file_refs (
       id, requirement_id, file_version_id, ref_mode,
       linked_from_requirement_id, created_by
     )
     VALUES ($1,$2,$3,'cross_case_link',$4,$5)
     ON CONFLICT (id) DO NOTHING`,
    [DOC_REF_ID, DOC_ITEM_CASE_B, DOC_FILE_ID, DOC_ITEM_APPROVED, SEED_USER_ID],
  );
}

/**
 *
 */
export type SeedStep = [string, (c: PoolClient) => Promise<void>];

/**
 *
 */
/**
 * seed 全量步骤定义（按依赖顺序排列）。
 *
 * @returns 步骤数组，每项为 `[label, fn]`
 */
export function buildSeedSteps(): SeedStep[] {
  return [
    ["devUsers", seedDevUsers],
    ["customer", seedCustomer],
    ["cases", seedCases],
    ["documentItems", seedDocumentItems],
    ["documentAsset", seedDocumentAsset],
    ["documentFile", seedDocumentFile],
    ["crossCaseLink", seedCrossCaseLink],
    ["documentChecklistTemplate", seedDocumentChecklistTemplate],
    ["caseTemplates", seedCaseTemplatesStep],
    ["documentTemplates", seedDocumentTemplates],
    ["conversationAppUser", seedConversationAppUser],
    ["conversationLead", seedConversationLead],
    ["conversations", seedConversations],
    ["conversationMessages", seedConversationMessages],
    ["tagsCleanup", seedTagsCleanup],
  ];
}

export { DOC_TEMPLATE_SEEDS };

async function main() {
  const smokeMode = process.env.SEED_SMOKE === "1";
  const input = readLocalAdminBootstrapInput();
  const pool = createPgPool(input.dbUrl);

  const steps = buildSeedSteps();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const [label, fn] of steps) {
      try {
        await fn(client);
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : String(cause);
        await client.query("ROLLBACK");
        throw new Error(
          `[CRITICAL] seed rolled back at step "${label}": ${detail}`,
        );
      }
    }

    if (smokeMode) {
      await client.query("ROLLBACK");
      process.stdout.write(
        `[seed-dev:smoke] all ${String(steps.length)} steps OK — rolled back\n`,
      );
    } else {
      await client.query("COMMIT");
      process.stdout.write(
        `[seed-dev] done — 7 fixture users, 3 cases, 6 doc items, 1 asset, 1 cross-case link, 1 document_checklist template, ${String(CASE_TEMPLATE_SEEDS.length)} case templates, ${String(DOC_TEMPLATE_SEEDS.length)} document templates, 1 app_user + 1 portal lead + 2 conversations + 4 messages (H-10)\n`,
      );
    }
  } catch (error) {
    if (!(error instanceof Error && error.message.startsWith("[CRITICAL]"))) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

const isDirectRun = process.argv[1]?.endsWith("seedDevData.ts") ?? false;
if (isDirectRun) {
  await main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[seed-dev] failed: ${message}\n`);
    process.exitCode = 1;
  });
}
