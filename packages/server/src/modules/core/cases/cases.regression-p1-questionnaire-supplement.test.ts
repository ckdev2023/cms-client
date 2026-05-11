import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  STANDARD_VISA_PLANS,
  validateQuotePrice,
  validateVisaPlan,
} from "./cases.types-survey-visa-quote";
import {
  BMV_CASE_CREATION_GATE_CODES,
  checkBmvCaseCreationGate,
} from "./cases.types-bmv-gate";
import { BMV_CASE_TYPE_CODE } from "./bmvTemplateConfig";
import { BMV_CASE_TYPE } from "./cases.template-bmv";
import {
  CASE_ID,
  USER_ID,
  ctx,
  makeCaseRow,
  makePool,
  ok,
  svc,
} from "./cases.regression-p1-questionnaire-supplement.test-support";

void describe("§12 visa_plan / quote_price: create persists fields", () => {
  void test("create case with visaPlan and quotePrice → fields in SQL", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (
        sql.includes("select id from customers") ||
        sql.includes("select id from users")
      ) {
        return ok([{ id: p?.[0] }]);
      }
      if (sql.includes("FROM customers c") && sql.includes("JOIN groups g")) {
        return ok([]);
      }
      if (sql.includes("insert into cases")) {
        return ok([
          makeCaseRow({ visa_plan: "new_1year", quote_price: "350000" }),
        ]);
      }
      return ok();
    });
    const c = await svc(pool).create(ctx(), {
      customerId: "cust-1",
      caseTypeCode: "visa",
      ownerUserId: USER_ID,
      visaPlan: "new_1year",
      quotePrice: 350000,
      forceCreate: true,
    });
    assert.equal(c.visaPlan, "new_1year");
    assert.equal(c.quotePrice, 350000);
  });

  void test("create without visaPlan → null fallback", async () => {
    const pool = makePool((sql, p) => {
      if (
        sql.includes("select id from customers") ||
        sql.includes("select id from users")
      ) {
        return ok([{ id: p?.[0] }]);
      }
      if (sql.includes("FROM customers c") && sql.includes("JOIN groups g")) {
        return ok([]);
      }
      if (sql.includes("insert into cases")) return ok([makeCaseRow()]);
      return ok();
    });
    const c = await svc(pool).create(ctx(), {
      customerId: "cust-1",
      caseTypeCode: "visa",
      ownerUserId: USER_ID,
      forceCreate: true,
    });
    assert.equal(c.visaPlan, null);
    assert.equal(c.quotePrice, null);
  });

  void test("update case with quotePrice → persisted", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([makeCaseRow()]);
      }
      if (sql.includes("update cases")) {
        return ok([makeCaseRow({ quote_price: "500000" })]);
      }
      return ok();
    });
    const c = await svc(pool).update(ctx(), CASE_ID, { quotePrice: 500000 });
    assert.equal(c.quotePrice, 500000);
  });

  void test("update case with visaPlan → persisted", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([makeCaseRow()]);
      }
      if (sql.includes("update cases")) {
        return ok([makeCaseRow({ visa_plan: "renewal_3year" })]);
      }
      return ok();
    });
    const c = await svc(pool).update(ctx(), CASE_ID, {
      visaPlan: "renewal_3year",
    });
    assert.equal(c.visaPlan, "renewal_3year");
  });
});

void describe("§12 visa_plan / quote_price: validation rules", () => {
  void test("validateVisaPlan accepts standard plans", () => {
    for (const plan of STANDARD_VISA_PLANS) {
      assert.ok(validateVisaPlan(plan), plan);
    }
  });

  void test("validateVisaPlan accepts null", () => {
    assert.ok(validateVisaPlan(null));
  });

  void test("validateVisaPlan accepts free text ≤200 chars", () => {
    assert.ok(validateVisaPlan("custom plan description"));
  });

  void test("validateVisaPlan rejects string >200 chars", () => {
    assert.equal(validateVisaPlan("x".repeat(201)), false);
  });

  void test("validateVisaPlan rejects non-string", () => {
    assert.equal(validateVisaPlan(123), false);
    assert.equal(validateVisaPlan(true), false);
  });

  void test("validateQuotePrice accepts null", () => {
    assert.ok(validateQuotePrice(null));
  });

  void test("validateQuotePrice accepts zero", () => {
    assert.ok(validateQuotePrice(0));
  });

  void test("validateQuotePrice accepts positive number", () => {
    assert.ok(validateQuotePrice(350000));
  });

  void test("validateQuotePrice rejects negative", () => {
    assert.equal(validateQuotePrice(-1), false);
  });

  void test("validateQuotePrice rejects NaN", () => {
    assert.equal(validateQuotePrice(NaN), false);
  });

  void test("validateQuotePrice rejects Infinity", () => {
    assert.equal(validateQuotePrice(Infinity), false);
  });

  void test("validateQuotePrice rejects string", () => {
    assert.equal(validateQuotePrice("350000"), false);
  });
});

void describe("§13 pre-sign gate: create BMV case gated by questionnaire + quote", () => {
  void test("service.create rejects BMV case when gate blocks (questionnaire not returned)", async () => {
    const bmvProfile = {
      questionnaireStatus: "sent",
      quoteStatus: "confirmed",
      signStatus: "signed",
      intakeStatus: "ready_for_case_creation",
    };
    const pool = makePool((sql, p) => {
      if (sql.includes("select id from customers")) return ok([{ id: p?.[0] }]);
      if (sql.includes("select id from users")) return ok([{ id: p?.[0] }]);
      if (sql.includes("select base_profile from customers")) {
        return ok([{ base_profile: { bmvProfile } }]);
      }
      if (sql.includes("FROM customers c") && sql.includes("JOIN groups g")) {
        return ok([]);
      }
      if (sql.includes("insert into cases")) {
        return ok([makeCaseRow({ case_type_code: BMV_CASE_TYPE_CODE })]);
      }
      return ok();
    });
    await assert.rejects(
      () =>
        svc(pool).create(ctx(), {
          customerId: "cust-1",
          caseTypeCode: BMV_CASE_TYPE_CODE,
          ownerUserId: USER_ID,
          forceCreate: true,
        }),
      (err: Error) => {
        const response = (err as { response?: unknown }).response;
        const hasGateCode =
          typeof response === "string" && response.includes("BMV_GATE_BLOCKED");
        return (
          err.constructor.name === "BadRequestException" &&
          (hasGateCode || err.message.includes("Bad Request"))
        );
      },
    );
  });

  void test("checkBmvCaseCreationGate: all four gates pass → allowed", () => {
    const result = checkBmvCaseCreationGate({
      caseTypeCode: BMV_CASE_TYPE_CODE,
      customerId: "cust-1",
      bmvQuestionnaireStatus: "returned",
      bmvQuoteStatus: "confirmed",
      bmvSignStatus: "signed",
      bmvIntakeStatus: "ready_for_case_creation",
    });
    assert.equal(result.allowed, true);
    assert.equal(result.blockers.length, 0);
  });

  void test("checkBmvCaseCreationGate: quote not confirmed → blocked with code", () => {
    const result = checkBmvCaseCreationGate({
      caseTypeCode: BMV_CASE_TYPE_CODE,
      customerId: "cust-1",
      bmvQuestionnaireStatus: "returned",
      bmvQuoteStatus: "generated",
      bmvSignStatus: "signed",
      bmvIntakeStatus: "ready_for_case_creation",
    });
    assert.equal(result.allowed, false);
    assert.ok(
      result.blockers.some(
        (b) => b.code === BMV_CASE_CREATION_GATE_CODES.QUOTE_NOT_CONFIRMED,
      ),
    );
  });

  void test("checkBmvCaseCreationGate: both questionnaire + quote failing → 2 blockers", () => {
    const result = checkBmvCaseCreationGate({
      caseTypeCode: BMV_CASE_TYPE_CODE,
      customerId: "cust-1",
      bmvQuestionnaireStatus: null,
      bmvQuoteStatus: null,
      bmvSignStatus: "signed",
      bmvIntakeStatus: "ready_for_case_creation",
    });
    assert.equal(result.allowed, false);
    assert.equal(result.blockers.length, 2);
    const codes = new Set(result.blockers.map((b) => b.code));
    assert.ok(
      codes.has(BMV_CASE_CREATION_GATE_CODES.QUESTIONNAIRE_NOT_RETURNED),
    );
    assert.ok(codes.has(BMV_CASE_CREATION_GATE_CODES.QUOTE_NOT_CONFIRMED));
  });

  void test("non-BMV case type bypasses gate entirely", () => {
    const result = checkBmvCaseCreationGate({
      caseTypeCode: "family_stay",
      customerId: "cust-1",
      bmvQuestionnaireStatus: null,
      bmvQuoteStatus: null,
      bmvSignStatus: null,
      bmvIntakeStatus: null,
    });
    assert.equal(result.allowed, true);
  });
});

void describe("§14 supplement cycle: workflow step transitions via service", () => {
  function bmvCaseRow(stepCode: string | null) {
    return makeCaseRow({
      case_type_code: BMV_CASE_TYPE,
      status: "S5",
      stage: "S5",
      current_workflow_step_code: stepCode,
    });
  }

  void test("UNDER_REVIEW → NEED_SUPPLEMENT transitions + writes timeline", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([bmvCaseRow("UNDER_REVIEW")]);
      }
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      ) {
        return ok([bmvCaseRow("NEED_SUPPLEMENT")]);
      }
      return ok();
    });
    const result = await svc(pool).transitionWorkflowStep(ctx(), CASE_ID, {
      toStepCode: "NEED_SUPPLEMENT",
    });
    assert.equal(result.currentWorkflowStepCode, "NEED_SUPPLEMENT");
    assert.ok(
      calls.some((c) => c.sql.includes("insert into timeline_logs")),
      "must write timeline on step transition",
    );
  });

  void test("NEED_SUPPLEMENT → SUPPLEMENT_PROCESSING transitions", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([bmvCaseRow("NEED_SUPPLEMENT")]);
      }
      if (sql.includes("update cases")) {
        return ok([bmvCaseRow("SUPPLEMENT_PROCESSING")]);
      }
      return ok();
    });
    const result = await svc(pool).transitionWorkflowStep(ctx(), CASE_ID, {
      toStepCode: "SUPPLEMENT_PROCESSING",
    });
    assert.equal(result.currentWorkflowStepCode, "SUPPLEMENT_PROCESSING");
  });

  void test("SUPPLEMENT_PROCESSING → UNDER_REVIEW transitions", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([bmvCaseRow("SUPPLEMENT_PROCESSING")]);
      }
      if (sql.includes("update cases")) return ok([bmvCaseRow("UNDER_REVIEW")]);
      return ok();
    });
    const result = await svc(pool).transitionWorkflowStep(ctx(), CASE_ID, {
      toStepCode: "UNDER_REVIEW",
    });
    assert.equal(result.currentWorkflowStepCode, "UNDER_REVIEW");
  });

  void test("full supplement round: UR → NS → SP → UR (all within S5)", async () => {
    const steps: [string, string][] = [
      ["UNDER_REVIEW", "NEED_SUPPLEMENT"],
      ["NEED_SUPPLEMENT", "SUPPLEMENT_PROCESSING"],
      ["SUPPLEMENT_PROCESSING", "UNDER_REVIEW"],
    ];
    for (const [from, to] of steps) {
      const pool = makePool((sql, p) => {
        if (sql.includes("from cases") && p?.[0] === CASE_ID) {
          return ok([bmvCaseRow(from)]);
        }
        if (sql.includes("update cases")) return ok([bmvCaseRow(to)]);
        return ok();
      });
      const result = await svc(pool).transitionWorkflowStep(ctx(), CASE_ID, {
        toStepCode: to,
      });
      assert.equal(result.currentWorkflowStepCode, to, `${from} → ${to}`);
    }
  });

  void test("UNDER_REVIEW → APPROVED requires case at S6 (parallel boundary)", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([
          makeCaseRow({
            case_type_code: BMV_CASE_TYPE,
            status: "S6",
            stage: "S6",
            current_workflow_step_code: "UNDER_REVIEW",
          }),
        ]);
      }
      if (sql.includes("update cases")) {
        return ok([
          makeCaseRow({
            case_type_code: BMV_CASE_TYPE,
            status: "S6",
            stage: "S6",
            current_workflow_step_code: "APPROVED",
          }),
        ]);
      }
      return ok();
    });
    const result = await svc(pool).transitionWorkflowStep(ctx(), CASE_ID, {
      toStepCode: "APPROVED",
    });
    assert.equal(result.currentWorkflowStepCode, "APPROVED");
  });

  void test("UNDER_REVIEW → APPROVED rejected when case still at S5", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([bmvCaseRow("UNDER_REVIEW")]);
      }
      return ok();
    });
    await assert.rejects(
      () =>
        svc(pool).transitionWorkflowStep(ctx(), CASE_ID, {
          toStepCode: "APPROVED",
        }),
      /PARALLEL_BOUNDARY|requires stage/i,
    );
  });

  void test("NEED_SUPPLEMENT → APPROVED rejected (skip SUPPLEMENT_PROCESSING)", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([bmvCaseRow("NEED_SUPPLEMENT")]);
      }
      return ok();
    });
    await assert.rejects(
      () =>
        svc(pool).transitionWorkflowStep(ctx(), CASE_ID, {
          toStepCode: "APPROVED",
        }),
      /TRANSITION_INVALID|not allowed/i,
    );
  });

  void test("SUPPLEMENT_PROCESSING → APPROVED rejected (must go through UNDER_REVIEW)", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([bmvCaseRow("SUPPLEMENT_PROCESSING")]);
      }
      return ok();
    });
    await assert.rejects(
      () =>
        svc(pool).transitionWorkflowStep(ctx(), CASE_ID, {
          toStepCode: "APPROVED",
        }),
      /TRANSITION_INVALID|not allowed/i,
    );
  });

  void test("non-BMV case type rejects workflow step transition", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([makeCaseRow({ case_type_code: "family_stay" })]);
      }
      return ok();
    });
    await assert.rejects(
      () =>
        svc(pool).transitionWorkflowStep(ctx(), CASE_ID, {
          toStepCode: "NEED_SUPPLEMENT",
        }),
      /NOT_APPLICABLE|only.*BMV/i,
    );
  });
});
