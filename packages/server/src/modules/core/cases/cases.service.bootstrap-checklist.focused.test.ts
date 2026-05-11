import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { type Pool } from "pg";
import { CasesService, type TemplatesResolver } from "./cases.service";
import { type RequestContext } from "../tenancy/requestContext";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";

const ORG = "00000000-0000-4000-8000-000000000000";
const USR = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000010";

function makeCtx(): RequestContext {
  return { orgId: ORG, userId: USR, role: "staff" };
}

const isTxSql = (s: string) =>
  /^(begin|commit|rollback|select set_config)/.test(s.trim().toLowerCase());
type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: Record<string, unknown>[] }>;
const ok = (rows: Record<string, unknown>[] = []) => Promise.resolve({ rows });

function makePool(qf: QueryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: (s: string, p?: unknown[]) => (isTxSql(s) ? ok() : qf(s, p)),
        release: () => undefined,
      }),
  };
}

const CASE_ROW_S1 = {
  id: CASE_ID,
  org_id: ORG,
  customer_id: "cust-1",
  case_type_code: "dependent_visa",
  case_no: "TOKYO-202601-0001",
  case_name: null,
  case_subtype: null,
  application_type: null,
  stage: "S1",
  status: "S1",
  business_phase: "CONSULTING",
  visa_plan: null,
  priority: "normal",
  risk_level: "normal",
  owner_user_id: USR,
  assistant_user_id: null,
  group_id: null,
  due_at: null,
  metadata: "{}",
  source_channel: null,
  signed_at: null,
  accepted_at: null,
  submission_date: null,
  result_date: null,
  residence_expiry_date: null,
  result_outcome: null,
  company_id: null,
  quote_price: null,
  coe_issued_at: null,
  coe_expiry_date: null,
  coe_sent_at: null,
  entry_confirmed_at: null,
  overseas_visa_start_at: null,
  supplement_count: 0,
  post_approval_stage: null,
  application_flow_type: null,
  close_reason: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function makeLegacyResolver(): TemplatesResolver {
  return {
    resolve: () => Promise.resolve({ mode: "legacy", used: false }),
  } as TemplatesResolver;
}

void describe("CasesService.bootstrapChecklist", () => {
  void test("inserts document_items when case has 0 items and template exists", async () => {
    const insertedItems: unknown[][] = [];

    const qf: QueryFn = (sql, params) => {
      if (sql.includes("from cases")) return ok([CASE_ROW_S1]);
      if (sql.includes("count(*)") && sql.includes("document_items"))
        return ok([{ count: "0" }]);
      if (sql.includes("FROM case_templates"))
        return ok([
          {
            id: "tpl-1",
            case_type: "dependent_visa",
            application_type: null,
            requirement_blueprint: [
              {
                code: "doc_1",
                name: "passport copy",
                ownerSide: "applicant",
                requiredFlag: true,
              },
              {
                code: "doc_2",
                name: "residence card",
                ownerSide: "applicant",
                requiredFlag: true,
              },
            ],
            active_flag: true,
          },
        ]);
      if (sql.includes("insert into document_items")) {
        insertedItems.push(params ?? []);
        return ok();
      }
      if (sql.includes("insert into timeline_logs")) return ok();
      return ok();
    };

    const svc = new CasesService(
      makePool(qf) as unknown as Pool,
      makeLegacyResolver(),
    );

    const result = await svc.bootstrapChecklist(makeCtx(), CASE_ID);
    assert.equal(result.count, 2);
    assert.equal(insertedItems.length, 2);
  });

  void test("rejects when case already has document_items", async () => {
    const qf: QueryFn = (sql) => {
      if (sql.includes("from cases")) return ok([CASE_ROW_S1]);
      if (sql.includes("count(*)") && sql.includes("document_items"))
        return ok([{ count: "3" }]);
      return ok();
    };

    const svc = new CasesService(
      makePool(qf) as unknown as Pool,
      makeLegacyResolver(),
    );

    await assert.rejects(
      () => svc.bootstrapChecklist(makeCtx(), CASE_ID),
      (err: Error & { response?: { code?: string } }) => {
        assert.equal(
          err.response?.code,
          CASE_WRITE_ERROR_CODES.CHECKLIST_BOOTSTRAP_NOT_EMPTY,
        );
        return true;
      },
    );
  });

  void test("rejects when case is in stage S3 or later", async () => {
    const caseRowS3 = { ...CASE_ROW_S1, stage: "S3", status: "S3" };
    const qf: QueryFn = (sql) => {
      if (sql.includes("from cases")) return ok([caseRowS3]);
      return ok();
    };

    const svc = new CasesService(
      makePool(qf) as unknown as Pool,
      makeLegacyResolver(),
    );

    await assert.rejects(
      () => svc.bootstrapChecklist(makeCtx(), CASE_ID),
      (err: Error & { response?: { code?: string } }) => {
        assert.equal(
          err.response?.code,
          CASE_WRITE_ERROR_CODES.CHECKLIST_BOOTSTRAP_STAGE_INVALID,
        );
        return true;
      },
    );
  });

  void test("rejects when no template found for the case type", async () => {
    const qf: QueryFn = (sql) => {
      if (sql.includes("from cases")) return ok([CASE_ROW_S1]);
      if (sql.includes("count(*)") && sql.includes("document_items"))
        return ok([{ count: "0" }]);
      if (sql.includes("FROM case_templates")) return ok([]);
      return ok();
    };

    const svc = new CasesService(
      makePool(qf) as unknown as Pool,
      makeLegacyResolver(),
    );

    await assert.rejects(
      () => svc.bootstrapChecklist(makeCtx(), CASE_ID),
      (err: Error & { response?: { code?: string } }) => {
        assert.equal(
          err.response?.code,
          CASE_WRITE_ERROR_CODES.CHECKLIST_EMPTY,
        );
        return true;
      },
    );
  });

  void test("writes timeline entry with case.checklist_bootstrapped action", async () => {
    let timelineAction: string | undefined;
    let timelinePayload: string | undefined;

    const qf: QueryFn = (sql, params) => {
      if (sql.includes("from cases")) return ok([CASE_ROW_S1]);
      if (sql.includes("count(*)") && sql.includes("document_items"))
        return ok([{ count: "0" }]);
      if (sql.includes("FROM case_templates"))
        return ok([
          {
            id: "tpl-1",
            case_type: "dependent_visa",
            application_type: null,
            requirement_blueprint: [
              { code: "doc_1", name: "passport copy", ownerSide: "applicant" },
            ],
            active_flag: true,
          },
        ]);
      if (sql.includes("insert into document_items")) return ok();
      if (sql.includes("insert into timeline_logs")) {
        timelineAction = params?.[3] as string;
        timelinePayload = params?.[5] as string;
        return ok();
      }
      return ok();
    };

    const svc = new CasesService(
      makePool(qf) as unknown as Pool,
      makeLegacyResolver(),
    );

    await svc.bootstrapChecklist(makeCtx(), CASE_ID);
    assert.equal(timelineAction, "case.checklist_bootstrapped");
    const payload = JSON.parse(timelinePayload ?? "{}") as {
      itemCount: number;
      source: string;
    };
    assert.equal(payload.itemCount, 1);
    assert.equal(payload.source, "bootstrap_from_template");
  });

  void test("allows bootstrap for S2 stage cases", async () => {
    const caseRowS2 = { ...CASE_ROW_S1, stage: "S2", status: "S2" };

    const qf: QueryFn = (sql) => {
      if (sql.includes("from cases")) return ok([caseRowS2]);
      if (sql.includes("count(*)") && sql.includes("document_items"))
        return ok([{ count: "0" }]);
      if (sql.includes("FROM case_templates"))
        return ok([
          {
            id: "tpl-1",
            case_type: "dependent_visa",
            application_type: null,
            requirement_blueprint: [
              { code: "doc_1", name: "passport", ownerSide: "applicant" },
            ],
            active_flag: true,
          },
        ]);
      if (sql.includes("insert into document_items")) return ok();
      if (sql.includes("insert into timeline_logs")) return ok();
      return ok();
    };

    const svc = new CasesService(
      makePool(qf) as unknown as Pool,
      makeLegacyResolver(),
    );

    const result = await svc.bootstrapChecklist(makeCtx(), CASE_ID);
    assert.equal(result.count, 1);
  });
});
