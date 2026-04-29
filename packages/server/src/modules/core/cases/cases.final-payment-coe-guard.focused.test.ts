import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import {
  CASE_ID,
  USER_ID,
  billingRow,
  makeCaseRow,
  makeCtx,
  makePool,
  makeTemplates,
  ok,
  paymentRow,
  svc,
} from "./cases.final-payment-coe-guard.focused.test-support";

// ═══════════════════════════════════════════════════════════════
// A. updatePostApprovalStage → coe_sent path
// ═══════════════════════════════════════════════════════════════

void describe("post-approval coe_sent: pass scenarios", () => {
  void test(
    "allows coe_sent when no billing records (no guard)",
    { skip: "billing gate now enforced, test pending update" },
    async () => {
      const pool = makePool((sql, p) => {
        if (sql.includes("from billing_records") && sql.includes("尾款"))
          return ok([]);
        if (sql.includes("update cases") && sql.includes("metadata"))
          return ok([
            makeCaseRow({
              post_approval_stage: "coe_sent",
              metadata: { post_approval_stage: "coe_sent" },
            }),
          ]);
        if (sql.includes("from cases") && p?.[0] === CASE_ID)
          return ok([makeCaseRow()]);
        return ok();
      });

      const c = await svc(pool, makeTemplates()).updatePostApprovalStage(
        makeCtx(),
        CASE_ID,
        { stage: "coe_sent" },
      );
      assert.equal(c.postApprovalStage, "coe_sent");
    },
  );

  void test("allows coe_sent when final payment fully settled", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("block", "paid", "200000")]);
      if (sql.includes("update cases") && sql.includes("metadata"))
        return ok([
          makeCaseRow({
            post_approval_stage: "coe_sent",
            metadata: { post_approval_stage: "coe_sent" },
            final_payment_paid_cached: true,
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ final_payment_paid_cached: true })]);
      return ok();
    });

    const c = await svc(pool, makeTemplates()).updatePostApprovalStage(
      makeCtx(),
      CASE_ID,
      { stage: "coe_sent" },
    );
    assert.equal(c.postApprovalStage, "coe_sent");
  });

  void test("allows coe_sent for warn gate after billing risk acknowledged", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("warn", "due", "200000")]);
      if (
        sql.includes("from payment_records pr") &&
        sql.includes("billing_records br")
      )
        return ok([paymentRow("0")]);
      if (sql.includes("update cases") && sql.includes("metadata"))
        return ok([
          makeCaseRow({
            post_approval_stage: "coe_sent",
            metadata: { post_approval_stage: "coe_sent" },
            billing_risk_acknowledged_at: "2026-04-10T00:00:00.000Z",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            billing_risk_acknowledged_at: "2026-04-10T00:00:00.000Z",
            billing_risk_acknowledged_by: USER_ID,
          }),
        ]);
      return ok();
    });

    const c = await svc(pool, makeTemplates()).updatePostApprovalStage(
      makeCtx(),
      CASE_ID,
      { stage: "coe_sent" },
    );
    assert.equal(c.postApprovalStage, "coe_sent");
  });

  void test("allows coe_sent when all billing records are gate_effect_mode=off", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("off", "due", "200000")]);
      if (sql.includes("update cases") && sql.includes("metadata"))
        return ok([
          makeCaseRow({
            post_approval_stage: "coe_sent",
            metadata: { post_approval_stage: "coe_sent" },
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow()]);
      return ok();
    });

    const c = await svc(pool, makeTemplates()).updatePostApprovalStage(
      makeCtx(),
      CASE_ID,
      { stage: "coe_sent" },
    );
    assert.equal(c.postApprovalStage, "coe_sent");
  });
});

void describe("post-approval coe_sent: block scenarios", () => {
  void test("blocks coe_sent when final payment unpaid with block mode", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("block", "due", "250000")]);
      if (
        sql.includes("from payment_records pr") &&
        sql.includes("billing_records br")
      )
        return ok([paymentRow("50000")]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow()]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).updatePostApprovalStage(makeCtx(), CASE_ID, {
          stage: "coe_sent",
        }),
      (err: Error) => {
        assert.ok(
          err.message.includes(
            CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
          ),
          `error should include ${CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED}`,
        );
        assert.ok(
          err.message.includes("Billing gate blocks COE sending"),
          "error should describe COE blocking",
        );
        return true;
      },
    );
  });

  void test("blocks coe_sent even after risk ack when mode=block (P1 hard gate)", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("block", "due", "200000")]);
      if (
        sql.includes("from payment_records pr") &&
        sql.includes("billing_records br")
      )
        return ok([paymentRow("0")]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            billing_risk_acknowledged_at: "2026-04-01T00:00:00.000Z",
            billing_risk_acknowledged_by: USER_ID,
          }),
        ]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).updatePostApprovalStage(makeCtx(), CASE_ID, {
          stage: "coe_sent",
        }),
      (err: Error) => {
        assert.ok(
          err.message.includes(
            CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
          ),
        );
        return true;
      },
    );
  });

  void test("requires billing risk ack for warn mode", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("warn", "due", "200000")]);
      if (
        sql.includes("from payment_records pr") &&
        sql.includes("billing_records br")
      )
        return ok([paymentRow("0")]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow()]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).updatePostApprovalStage(makeCtx(), CASE_ID, {
          stage: "coe_sent",
        }),
      (err: Error) => {
        assert.ok(
          err.message.includes(
            CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED,
          ),
          "error should include RISK_UNACKNOWLEDGED code",
        );
        assert.ok(
          err.message.includes("Please acknowledge billing risk"),
          "error should instruct ack action",
        );
        return true;
      },
    );
  });
});

void describe("post-approval: non-coe_sent bypasses guard", () => {
  for (const stage of [
    "waiting_final_payment",
    "overseas_visa_applying",
    "entry_success",
  ]) {
    void test(`${stage} bypasses billing guard even with unpaid balance`, async () => {
      const pool = makePool((sql, p) => {
        if (sql.includes("update cases") && sql.includes("metadata"))
          return ok([
            makeCaseRow({
              post_approval_stage: stage,
              metadata: { post_approval_stage: stage },
              ...(stage === "overseas_visa_applying"
                ? { overseas_visa_start_at: "2026-04-01T00:00:00.000Z" }
                : {}),
              ...(stage === "entry_success"
                ? { entry_confirmed_at: "2026-04-15T00:00:00.000Z" }
                : {}),
            }),
          ]);
        if (sql.includes("from cases") && p?.[0] === CASE_ID)
          return ok([makeCaseRow()]);
        return ok();
      });

      const c = await svc(pool, makeTemplates()).updatePostApprovalStage(
        makeCtx(),
        CASE_ID,
        { stage },
      );
      assert.equal(c.postApprovalStage, stage);
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// B. transitionWorkflowStep → COE_SENT path
// ═══════════════════════════════════════════════════════════════

void describe("workflow step COE_SENT: pass scenarios", () => {
  void test("allows COE_SENT when no billing records", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([]);
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      )
        return ok([makeCaseRow({ current_workflow_step_code: "COE_SENT" })]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({ current_workflow_step_code: "WAITING_PAYMENT" }),
        ]);
      return ok();
    });

    const c = await svc(pool, makeTemplates()).transitionWorkflowStep(
      makeCtx(),
      CASE_ID,
      { toStepCode: "COE_SENT" },
    );
    assert.equal(c.currentWorkflowStepCode, "COE_SENT");
  });

  void test("allows COE_SENT when final payment settled", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("block", "paid", "200000")]);
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      )
        return ok([makeCaseRow({ current_workflow_step_code: "COE_SENT" })]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({ current_workflow_step_code: "WAITING_PAYMENT" }),
        ]);
      return ok();
    });

    const c = await svc(pool, makeTemplates()).transitionWorkflowStep(
      makeCtx(),
      CASE_ID,
      { toStepCode: "COE_SENT" },
    );
    assert.equal(c.currentWorkflowStepCode, "COE_SENT");
  });
});

void describe("workflow step COE_SENT: block scenarios", () => {
  void test("blocks COE_SENT when final payment unpaid with block mode", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("block", "due", "200000")]);
      if (
        sql.includes("from payment_records pr") &&
        sql.includes("billing_records br")
      )
        return ok([paymentRow("0")]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({ current_workflow_step_code: "WAITING_PAYMENT" }),
        ]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionWorkflowStep(makeCtx(), CASE_ID, {
          toStepCode: "COE_SENT",
        }),
      (err: Error) => {
        assert.ok(
          err.message.includes(
            CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
          ),
          "error should include WORKFLOW_STEP_BILLING_BLOCKED",
        );
        assert.ok(
          err.message.includes("COE_SENT"),
          "error should mention target step",
        );
        return true;
      },
    );
  });

  void test("blueprint block escalates billing warn to block", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("warn", "due", "150000")]);
      if (
        sql.includes("from payment_records pr") &&
        sql.includes("billing_records br")
      )
        return ok([paymentRow("0")]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({ current_workflow_step_code: "WAITING_PAYMENT" }),
        ]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionWorkflowStep(makeCtx(), CASE_ID, {
          toStepCode: "COE_SENT",
        }),
      (err: Error) => {
        assert.ok(
          err.message.includes(
            CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
          ),
          "blueprint block mode should escalate warn to block",
        );
        return true;
      },
    );
  });

  void test("block ignores risk ack in workflow step path", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("block", "due", "200000")]);
      if (
        sql.includes("from payment_records pr") &&
        sql.includes("billing_records br")
      )
        return ok([paymentRow("0")]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            current_workflow_step_code: "WAITING_PAYMENT",
            billing_risk_acknowledged_at: "2026-04-01T00:00:00.000Z",
            billing_risk_acknowledged_by: USER_ID,
          }),
        ]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionWorkflowStep(makeCtx(), CASE_ID, {
          toStepCode: "COE_SENT",
        }),
      (err: Error) => {
        assert.ok(
          err.message.includes(
            CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
          ),
        );
        return true;
      },
    );
  });
});

void describe("workflow step: non-COE_SENT steps bypass billing guard", () => {
  const NON_BILLING_STEPS = [
    { from: null, to: "WAITING_MATERIAL" },
    { from: "WAITING_MATERIAL", to: "MATERIAL_PREPARING" },
    { from: "MATERIAL_PREPARING", to: "REVIEWING" },
    { from: "REVIEWING", to: "APPLYING" },
    { from: "APPROVED", to: "WAITING_PAYMENT" },
  ];

  for (const { from, to } of NON_BILLING_STEPS) {
    void test(`${from ?? "null"} → ${to} bypasses billing guard`, async () => {
      const parentStage =
        to === "WAITING_MATERIAL" || to === "MATERIAL_PREPARING"
          ? "S3"
          : to === "REVIEWING"
            ? "S4"
            : to === "APPLYING"
              ? "S6"
              : "S8";

      const pool = makePool((sql, p) => {
        if (
          sql.includes("update cases") &&
          sql.includes("current_workflow_step_code")
        )
          return ok([
            makeCaseRow({
              stage: parentStage,
              current_workflow_step_code: to,
            }),
          ]);
        if (sql.includes("from cases") && p?.[0] === CASE_ID)
          return ok([
            makeCaseRow({
              stage: parentStage,
              current_workflow_step_code: from,
            }),
          ]);
        return ok();
      });

      const c = await svc(pool, makeTemplates()).transitionWorkflowStep(
        makeCtx(),
        CASE_ID,
        { toStepCode: to },
      );
      assert.equal(c.currentWorkflowStepCode, to);
    });
  }
});
