import type { PoolClient } from "pg";

import { createPgPool } from "../infra/db/createPgPool";
import { readLocalAdminBootstrapInput } from "../modules/core/auth/localAdminBootstrap";
import { BMV_REQUIREMENT_BLUEPRINT } from "../modules/core/cases/bmvTemplateConfig";

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

const DOC_TPL_FAMILY_STAY_1 = "00000000-0000-4000-a000-000000000600";
const DOC_TPL_FAMILY_STAY_2 = "00000000-0000-4000-a000-000000000601";
const DOC_TPL_FAMILY_STAY_3 = "00000000-0000-4000-a000-000000000602";
const DOC_TPL_ENGINEER_1 = "00000000-0000-4000-a000-000000000610";
const DOC_TPL_ENGINEER_2 = "00000000-0000-4000-a000-000000000611";
const DOC_TPL_ENGINEER_3 = "00000000-0000-4000-a000-000000000612";

const DOC_TPL_BMV_PLAN_1 = "00000000-0000-4000-a000-000000000620";
const DOC_TPL_BMV_PLAN_2 = "00000000-0000-4000-a000-000000000621";
const DOC_TPL_BMV_PLAN_3 = "00000000-0000-4000-a000-000000000622";
const DOC_TPL_BMV_OVERVIEW_1 = "00000000-0000-4000-a000-000000000623";
const DOC_TPL_BMV_OVERVIEW_2 = "00000000-0000-4000-a000-000000000624";
const DOC_TPL_BMV_OVERVIEW_3 = "00000000-0000-4000-a000-000000000625";

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
  for (const [caseId, caseName, caseNo] of [
    [SEED_CASE_A_ID, "家族滞在 — 田中太郎", "CASE-DEV-001"],
    [SEED_CASE_B_ID, "技人国 — 田中太郎", "CASE-DEV-002"],
  ] as const) {
    await client.query(
      `INSERT INTO cases (
         id, org_id, customer_id, case_type_code, status, stage,
         owner_user_id, case_no, case_name, business_phase,
         application_flow_type, metadata
       )
       VALUES ($1,$2,$3,'family_stay','open','document_collection',
               $4,$5,$6,'prepare','standard','{}'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [caseId, SEED_ORG_ID, SEED_CUSTOMER_ID, SEED_USER_ID, caseNo, caseName],
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
     ON CONFLICT (id) DO NOTHING`,
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

type DocTemplateSeed = {
  id: string;
  caseType: string;
  templateName: string;
  docType: string;
};

const DOC_TEMPLATE_SEEDS: DocTemplateSeed[] = [
  // 家族滞在 — 三种 caseTypeCode 别名
  {
    id: DOC_TPL_FAMILY_STAY_1,
    caseType: "family_stay",
    templateName: "申請理由書",
    docType: "reason_statement",
  },
  {
    id: DOC_TPL_FAMILY_STAY_2,
    caseType: "family",
    templateName: "申請理由書",
    docType: "reason_statement",
  },
  {
    id: DOC_TPL_FAMILY_STAY_3,
    caseType: "dependent_visa",
    templateName: "申請理由書",
    docType: "reason_statement",
  },
  // 技人国 — 三種 caseTypeCode 別名
  {
    id: DOC_TPL_ENGINEER_1,
    caseType: "engineer_humanities_intl_visa",
    templateName: "雇用契約書サマリ",
    docType: "employment_summary",
  },
  {
    id: DOC_TPL_ENGINEER_2,
    caseType: "hum",
    templateName: "雇用契約書サマリ",
    docType: "employment_summary",
  },
  {
    id: DOC_TPL_ENGINEER_3,
    caseType: "engineer_visa",
    templateName: "雇用契約書サマリ",
    docType: "employment_summary",
  },
  // 経営管理 — 三種 caseTypeCode 別名 × 事業計画書 + 会社概要
  {
    id: DOC_TPL_BMV_PLAN_1,
    caseType: "biz_mgmt",
    templateName: "事業計画書",
    docType: "business_plan",
  },
  {
    id: DOC_TPL_BMV_PLAN_2,
    caseType: "biz_mgmt_4m",
    templateName: "事業計画書",
    docType: "business_plan",
  },
  {
    id: DOC_TPL_BMV_PLAN_3,
    caseType: "biz_mgmt_cert_4m",
    templateName: "事業計画書",
    docType: "business_plan",
  },
  {
    id: DOC_TPL_BMV_OVERVIEW_1,
    caseType: "biz_mgmt",
    templateName: "会社概要",
    docType: "company_overview",
  },
  {
    id: DOC_TPL_BMV_OVERVIEW_2,
    caseType: "biz_mgmt_4m",
    templateName: "会社概要",
    docType: "company_overview",
  },
  {
    id: DOC_TPL_BMV_OVERVIEW_3,
    caseType: "biz_mgmt_cert_4m",
    templateName: "会社概要",
    docType: "company_overview",
  },
];

async function seedDocumentTemplates(client: PoolClient) {
  for (const tpl of DOC_TEMPLATE_SEEDS) {
    await client.query(
      `INSERT INTO document_templates (
         id, org_id, template_name, case_type, doc_type, language,
         version_no, content_body, variables_schema, active_flag,
         created_by, updated_by
       )
       VALUES ($1,$2,$3,$4,$5,'ja',1,'','{}'::jsonb,true,$6,$6)
       ON CONFLICT (id) DO NOTHING`,
      [
        tpl.id,
        SEED_ORG_ID,
        tpl.templateName,
        tpl.caseType,
        tpl.docType,
        SEED_USER_ID,
      ],
    );
  }
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
    ["customer", seedCustomer],
    ["cases", seedCases],
    ["documentItems", seedDocumentItems],
    ["documentAsset", seedDocumentAsset],
    ["documentFile", seedDocumentFile],
    ["crossCaseLink", seedCrossCaseLink],
    ["documentChecklistTemplate", seedDocumentChecklistTemplate],
    ["documentTemplates", seedDocumentTemplates],
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
        `[seed-dev] done — 3 cases, 6 doc items, 1 asset, 1 cross-case link, 1 document_checklist template, ${String(DOC_TEMPLATE_SEEDS.length)} document templates\n`,
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
