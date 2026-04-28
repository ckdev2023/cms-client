import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  BMV_CASE_CREATION_GATE_CODES,
  CASE_BMV_GATE_ERROR_CODE,
  checkBmvCaseCreationGate,
} from "../cases/cases.types-bmv-gate";
import type { BmvCaseCreationGateInput } from "../cases/cases.types-bmv-gate";
import { CASE_WRITE_ERROR_CODES } from "../cases/cases.types";
import { BMV_CASE_TYPE } from "../cases/cases.template-bmv";
import {
  ctx,
  makeBaseCustomerRow,
  makeSignedCustomerRow,
  createTestService,
  transitionQueryFn,
} from "./customers.bmv.d7.focused.test-support";

// ────────────────────────────────────────────────────────────────
// 1. 問卷門禁 — BMV_QUESTIONNAIRE_NOT_RETURNED
// ────────────────────────────────────────────────────────────────

void describe("D7 gate: questionnaire prerequisite", () => {
  void test("blocks when signed but questionnaire not returned — code matches pre-sign-gate", async () => {
    const row = makeBaseCustomerRow({
      base_profile: {
        name: "Alice",
        bmvProfile: {
          questionnaireStatus: "sent",
          quoteStatus: "confirmed",
          signStatus: "signed",
          signedAt: "2026-01-05T00:00:00.000Z",
          quoteConfirmedAt: "2026-01-04T00:00:00.000Z",
        },
      },
    });
    const { service } = createTestService(() =>
      Promise.resolve({ rows: [row] }),
    );

    await assert.rejects(
      () => service.transitionBmvToCase(ctx, "c1"),
      (err) => {
        assert.ok(err instanceof Error);
        const response = (
          err as {
            response?: { code?: string; blockers?: { code: string }[] };
          }
        ).response;
        assert.ok(response, "should have structured error response");
        assert.equal(response.code, "CASE_BMV_GATE_BLOCKED");
        const blockers = response.blockers ?? [];
        assert.ok(
          blockers.some(
            (b) =>
              b.code ===
              BMV_CASE_CREATION_GATE_CODES.QUESTIONNAIRE_NOT_RETURNED,
          ),
          "should contain QUESTIONNAIRE_NOT_RETURNED blocker",
        );
        return true;
      },
    );
  });

  void test("pure gate: QUESTIONNAIRE_NOT_RETURNED for sent status", () => {
    const input: BmvCaseCreationGateInput = {
      caseTypeCode: "business_manager_visa",
      customerId: "cust-1",
      bmvQuestionnaireStatus: "sent",
      bmvQuoteStatus: "confirmed",
      bmvSignStatus: "signed",
      bmvIntakeStatus: "ready_for_case_creation",
    };
    const result = checkBmvCaseCreationGate(input);
    assert.ok(
      result.blockers.some(
        (b) =>
          b.code === BMV_CASE_CREATION_GATE_CODES.QUESTIONNAIRE_NOT_RETURNED,
      ),
    );
  });
});

// ────────────────────────────────────────────────────────────────
// 2. 報價門禁 — BMV_QUOTE_NOT_CONFIRMED
// ────────────────────────────────────────────────────────────────

void describe("D7 gate: quote prerequisite", () => {
  void test("blocks when signed but quote not confirmed — code matches pre-sign-gate", async () => {
    const row = makeBaseCustomerRow({
      base_profile: {
        name: "Alice",
        bmvProfile: {
          questionnaireStatus: "returned",
          quoteStatus: "generated",
          signStatus: "signed",
          signedAt: "2026-01-05T00:00:00.000Z",
          questionnaireReturnedAt: "2026-01-02T00:00:00.000Z",
        },
      },
    });
    const { service } = createTestService(() =>
      Promise.resolve({ rows: [row] }),
    );

    await assert.rejects(
      () => service.transitionBmvToCase(ctx, "c1"),
      (err) => {
        assert.ok(err instanceof Error);
        const response = (
          err as {
            response?: { code?: string; blockers?: { code: string }[] };
          }
        ).response;
        assert.ok(response, "should have structured error response");
        assert.equal(response.code, "CASE_BMV_GATE_BLOCKED");
        const blockers = response.blockers ?? [];
        assert.ok(
          blockers.some(
            (b) => b.code === BMV_CASE_CREATION_GATE_CODES.QUOTE_NOT_CONFIRMED,
          ),
          "should contain QUOTE_NOT_CONFIRMED blocker",
        );
        return true;
      },
    );
  });

  void test("pure gate: QUOTE_NOT_CONFIRMED for generated status", () => {
    const input: BmvCaseCreationGateInput = {
      caseTypeCode: "business_manager_visa",
      customerId: "cust-1",
      bmvQuestionnaireStatus: "returned",
      bmvQuoteStatus: "generated",
      bmvSignStatus: "signed",
      bmvIntakeStatus: "ready_for_case_creation",
    };
    const result = checkBmvCaseCreationGate(input);
    assert.ok(
      result.blockers.some(
        (b) => b.code === BMV_CASE_CREATION_GATE_CODES.QUOTE_NOT_CONFIRMED,
      ),
    );
  });
});

// ────────────────────────────────────────────────────────────────
// 3. 簽約門禁 — BMV_NOT_SIGNED
// ────────────────────────────────────────────────────────────────

void describe("D7 gate: sign prerequisite", () => {
  void test("early guard returns BMV_NOT_SIGNED when not signed", async () => {
    const row = makeBaseCustomerRow({
      base_profile: {
        name: "Alice",
        bmvProfile: {
          questionnaireStatus: "returned",
          quoteStatus: "confirmed",
          signStatus: "pending",
        },
      },
    });
    const { service } = createTestService(() =>
      Promise.resolve({ rows: [row] }),
    );

    await assert.rejects(
      () => service.transitionBmvToCase(ctx, "c1"),
      (err) => {
        assert.ok(err instanceof Error);
        const response = (err as { response?: { code?: string } }).response;
        assert.equal(
          response?.code,
          BMV_CASE_CREATION_GATE_CODES.NOT_SIGNED,
          "early guard should use BMV_NOT_SIGNED",
        );
        return true;
      },
    );
  });

  void test("pure gate: NOT_SIGNED for pending status", () => {
    const input: BmvCaseCreationGateInput = {
      caseTypeCode: "business_manager_visa",
      customerId: "cust-1",
      bmvQuestionnaireStatus: "returned",
      bmvQuoteStatus: "confirmed",
      bmvSignStatus: "pending",
      bmvIntakeStatus: "sign_pending",
    };
    const result = checkBmvCaseCreationGate(input);
    assert.ok(
      result.blockers.some(
        (b) => b.code === BMV_CASE_CREATION_GATE_CODES.NOT_SIGNED,
      ),
    );
  });
});

// ────────────────────────────────────────────────────────────────
// 4. 錯誤碼契約 — 與 cases.pre-sign-gate 協議對齊
// ────────────────────────────────────────────────────────────────

void describe("D7 gate: error code contract alignment", () => {
  void test("CASE_BMV_GATE_ERROR_CODE matches CASE_WRITE_ERROR_CODES.BMV_GATE_BLOCKED", () => {
    assert.equal(
      CASE_BMV_GATE_ERROR_CODE,
      CASE_WRITE_ERROR_CODES.BMV_GATE_BLOCKED,
    );
    assert.equal(CASE_BMV_GATE_ERROR_CODE, "CASE_BMV_GATE_BLOCKED");
  });

  void test("wrapper error code is CASE_BMV_GATE_BLOCKED", async () => {
    const row = makeBaseCustomerRow({
      base_profile: {
        name: "Alice",
        bmvProfile: {
          questionnaireStatus: "sent",
          quoteStatus: "not_started",
          signStatus: "signed",
          signedAt: "2026-01-05T00:00:00.000Z",
        },
      },
    });
    const { service } = createTestService(() =>
      Promise.resolve({ rows: [row] }),
    );

    await assert.rejects(
      () => service.transitionBmvToCase(ctx, "c1"),
      (err) => {
        const response = (err as { response?: { code?: string } }).response;
        assert.equal(response?.code, CASE_BMV_GATE_ERROR_CODE);
        return true;
      },
    );
  });

  void test("multiple blockers accumulate when prerequisites fail", async () => {
    const row = makeBaseCustomerRow({
      base_profile: {
        name: "Alice",
        bmvProfile: {
          questionnaireStatus: "sent",
          quoteStatus: "not_started",
          signStatus: "signed",
          signedAt: "2026-01-05T00:00:00.000Z",
        },
      },
    });
    const { service } = createTestService(() =>
      Promise.resolve({ rows: [row] }),
    );

    await assert.rejects(
      () => service.transitionBmvToCase(ctx, "c1"),
      (err) => {
        const response = (
          err as { response?: { blockers?: { code: string }[] } }
        ).response;
        const blockers = response?.blockers ?? [];
        assert.ok(blockers.length >= 2);
        const codes = blockers.map((b) => b.code);
        assert.ok(
          codes.includes(
            BMV_CASE_CREATION_GATE_CODES.QUESTIONNAIRE_NOT_RETURNED,
          ),
        );
        assert.ok(
          codes.includes(BMV_CASE_CREATION_GATE_CODES.QUOTE_NOT_CONFIRMED),
        );
        return true;
      },
    );
  });

  void test("all gate blocker codes are unique and BMV_-prefixed", () => {
    const values = Object.values(BMV_CASE_CREATION_GATE_CODES);
    assert.equal(new Set(values).size, values.length, "codes must be unique");
    for (const v of values) {
      assert.ok(v.startsWith("BMV_"), `${v} should start with BMV_`);
    }
  });

  void test("happy path — all gates pass, transition succeeds", async () => {
    const signedRow = makeSignedCustomerRow();
    const createdCase = {
      id: "case-1",
      caseTypeCode: BMV_CASE_TYPE,
      status: "open",
    };
    const { service } = createTestService(transitionQueryFn(signedRow), {
      createCase: () => Promise.resolve(createdCase),
    });
    const result = await service.transitionBmvToCase(ctx, "c1");
    assert.equal(result.id, "case-1");
  });
});
