import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  BUSINESS_PHASES,
  type BusinessPhase,
  isBusinessPhase,
  PHASE_TRANSITIONS,
  STAGE_TO_PHASE_DEFAULT,
  isTerminalPhase,
  assertPhaseTransition,
  PhaseTransitionError,
  MANUAL_CANCEL_REASON_CODES,
} from "./businessPhase";
import { P0_STAGES } from "./cases.workflow-step";

// ── 枚举基本性质 ──

void describe("BUSINESS_PHASES enum", () => {
  void test("contains exactly 20 phases", () => {
    assert.equal(BUSINESS_PHASES.length, 20);
  });

  void test("no duplicates", () => {
    const unique = new Set(BUSINESS_PHASES);
    assert.equal(unique.size, BUSINESS_PHASES.length);
  });

  void test("isBusinessPhase accepts all enum members", () => {
    for (const phase of BUSINESS_PHASES) {
      assert.equal(isBusinessPhase(phase), true, `${phase} should be valid`);
    }
  });

  void test("isBusinessPhase rejects non-members", () => {
    assert.equal(isBusinessPhase("S1"), false);
    assert.equal(isBusinessPhase(""), false);
    assert.equal(isBusinessPhase("UNKNOWN"), false);
    assert.equal(isBusinessPhase("consulting"), false);
  });
});

// ── 转换图结构性质 ──

void describe("PHASE_TRANSITIONS graph", () => {
  void test("every phase has an entry in the transition map", () => {
    for (const phase of BUSINESS_PHASES) {
      assert.ok(
        phase in PHASE_TRANSITIONS,
        `Missing transition entry for ${phase}`,
      );
    }
  });

  void test("all transition targets are valid phases", () => {
    for (const phase of BUSINESS_PHASES) {
      for (const target of PHASE_TRANSITIONS[phase]) {
        assert.equal(
          isBusinessPhase(target),
          true,
          `${phase} → ${target}: target is not a valid phase`,
        );
      }
    }
  });

  void test("terminal phases have empty transition lists", () => {
    assert.deepEqual(PHASE_TRANSITIONS.CLOSED_SUCCESS, []);
    assert.deepEqual(PHASE_TRANSITIONS.CLOSED_FAILED, []);
  });

  void test("no phase transitions to itself", () => {
    for (const phase of BUSINESS_PHASES) {
      assert.equal(
        PHASE_TRANSITIONS[phase].includes(phase),
        false,
        `${phase} should not transition to itself`,
      );
    }
  });
});

// ── stageToPhaseDefault ──

void describe("STAGE_TO_PHASE_DEFAULT", () => {
  void test("covers all P0 stages S1-S9", () => {
    for (const stage of P0_STAGES) {
      assert.ok(
        stage in STAGE_TO_PHASE_DEFAULT,
        `Missing default phase for stage ${stage}`,
      );
    }
  });

  void test("all mapped phases are valid", () => {
    for (const stage of P0_STAGES) {
      const phase = STAGE_TO_PHASE_DEFAULT[stage];
      assert.equal(
        isBusinessPhase(phase),
        true,
        `Stage ${stage} maps to invalid phase ${phase}`,
      );
    }
  });

  void test("key mappings remain stable", () => {
    assert.equal(STAGE_TO_PHASE_DEFAULT.S1, "CONSULTING");
    assert.equal(STAGE_TO_PHASE_DEFAULT.S6, "APPROVED");
    assert.equal(STAGE_TO_PHASE_DEFAULT.S9, "CLOSED_SUCCESS");
  });
});

// ── 终态判定 ──

void describe("isTerminalPhase", () => {
  void test("CLOSED_SUCCESS and CLOSED_FAILED are terminal", () => {
    assert.equal(isTerminalPhase("CLOSED_SUCCESS"), true);
    assert.equal(isTerminalPhase("CLOSED_FAILED"), true);
  });

  void test("non-terminal phases return false", () => {
    const nonTerminal: BusinessPhase[] = [
      "CONSULTING",
      "UNDER_REVIEW",
      "APPROVED",
      "SUCCESS",
      "VISA_REJECTED",
    ];
    for (const phase of nonTerminal) {
      assert.equal(
        isTerminalPhase(phase),
        false,
        `${phase} should not be terminal`,
      );
    }
  });
});

// ── assertPhaseTransition ──

void describe("assertPhaseTransition", () => {
  void describe("happy path — forward transitions", () => {
    const validPairs: [BusinessPhase, BusinessPhase][] = [
      ["CONSULTING", "CONTRACTED"],
      ["CONTRACTED", "WAITING_MATERIAL"],
      ["WAITING_MATERIAL", "MATERIAL_PREPARING"],
      ["MATERIAL_PREPARING", "REVIEWING"],
      ["REVIEWING", "APPLYING"],
      ["APPLYING", "UNDER_REVIEW"],
      ["UNDER_REVIEW", "APPROVED"],
      ["UNDER_REVIEW", "REJECTED"],
      ["UNDER_REVIEW", "NEED_SUPPLEMENT"],
      ["APPROVED", "WAITING_PAYMENT"],
      ["REJECTED", "CLOSED_FAILED"],
      ["WAITING_PAYMENT", "COE_SENT"],
      ["COE_SENT", "VISA_APPLYING"],
      ["VISA_APPLYING", "SUCCESS"],
      ["VISA_APPLYING", "VISA_REJECTED"],
      ["SUCCESS", "RESIDENCE_PERIOD_RECORDED"],
      ["VISA_REJECTED", "CLOSED_FAILED"],
      ["RESIDENCE_PERIOD_RECORDED", "RENEWAL_REMINDER_SCHEDULED"],
      ["RENEWAL_REMINDER_SCHEDULED", "CLOSED_SUCCESS"],
      // BUG-200: mid-cancel → CLOSED_FAILED for non-terminal, non-success-path phases
      ["CONSULTING", "CLOSED_FAILED"],
      ["CONTRACTED", "CLOSED_FAILED"],
      ["WAITING_MATERIAL", "CLOSED_FAILED"],
      ["MATERIAL_PREPARING", "CLOSED_FAILED"],
      ["REVIEWING", "CLOSED_FAILED"],
      ["APPLYING", "CLOSED_FAILED"],
      ["UNDER_REVIEW", "CLOSED_FAILED"],
      ["NEED_SUPPLEMENT", "CLOSED_FAILED"],
      ["SUPPLEMENT_PROCESSING", "CLOSED_FAILED"],
      ["WAITING_PAYMENT", "CLOSED_FAILED"],
      ["COE_SENT", "CLOSED_FAILED"],
      ["VISA_APPLYING", "CLOSED_FAILED"],
    ];

    for (const [from, to] of validPairs) {
      void test(`${from} → ${to} succeeds`, () => {
        assert.doesNotThrow(() => {
          assertPhaseTransition(from, to);
        });
      });
    }
  });

  void describe("reverse / skip jumps are rejected", () => {
    const invalidPairs: [BusinessPhase, BusinessPhase][] = [
      ["CONTRACTED", "CONSULTING"],
      ["APPROVED", "REVIEWING"],
      ["UNDER_REVIEW", "CONSULTING"],
      ["SUCCESS", "APPLYING"],
      ["CONSULTING", "APPROVED"],
    ];

    for (const [from, to] of invalidPairs) {
      void test(`${from} → ${to} throws`, () => {
        assert.throws(
          () => {
            assertPhaseTransition(from, to);
          },
          (err: unknown) => err instanceof PhaseTransitionError,
        );
      });
    }
  });

  void describe("NEED_SUPPLEMENT cycle", () => {
    void test("UNDER_REVIEW → NEED_SUPPLEMENT → SUPPLEMENT_PROCESSING → UNDER_REVIEW is valid", () => {
      assert.doesNotThrow(() => {
        assertPhaseTransition("UNDER_REVIEW", "NEED_SUPPLEMENT");
      });
      assert.doesNotThrow(() => {
        assertPhaseTransition("NEED_SUPPLEMENT", "SUPPLEMENT_PROCESSING");
      });
      assert.doesNotThrow(() => {
        assertPhaseTransition("SUPPLEMENT_PROCESSING", "UNDER_REVIEW");
      });
    });

    void test("SUPPLEMENT_PROCESSING cannot skip back to NEED_SUPPLEMENT", () => {
      assert.throws(
        () => {
          assertPhaseTransition("SUPPLEMENT_PROCESSING", "NEED_SUPPLEMENT");
        },
        (err: unknown) => err instanceof PhaseTransitionError,
      );
    });

    void test("NEED_SUPPLEMENT cannot jump to APPROVED directly", () => {
      assert.throws(
        () => {
          assertPhaseTransition("NEED_SUPPLEMENT", "APPROVED");
        },
        (err: unknown) => err instanceof PhaseTransitionError,
      );
    });
  });

  void describe("CLOSED_* terminal states", () => {
    void test("CLOSED_SUCCESS cannot transition anywhere", () => {
      for (const phase of BUSINESS_PHASES) {
        assert.throws(
          () => {
            assertPhaseTransition("CLOSED_SUCCESS", phase);
          },
          (err: unknown) => err instanceof PhaseTransitionError,
          `CLOSED_SUCCESS → ${phase} should throw`,
        );
      }
    });

    void test("CLOSED_FAILED cannot transition anywhere", () => {
      for (const phase of BUSINESS_PHASES) {
        assert.throws(
          () => {
            assertPhaseTransition("CLOSED_FAILED", phase);
          },
          (err: unknown) => err instanceof PhaseTransitionError,
          `CLOSED_FAILED → ${phase} should throw`,
        );
      }
    });
  });

  void describe("BUG-200: success-path phases cannot mid-cancel", () => {
    const successPathPhases: BusinessPhase[] = [
      "APPROVED",
      "SUCCESS",
      "RESIDENCE_PERIOD_RECORDED",
      "RENEWAL_REMINDER_SCHEDULED",
    ];

    for (const phase of successPathPhases) {
      void test(`${phase} → CLOSED_FAILED throws`, () => {
        assert.throws(
          () => {
            assertPhaseTransition(phase, "CLOSED_FAILED");
          },
          (err: unknown) => err instanceof PhaseTransitionError,
        );
      });
    }
  });

  void describe("unknown phases", () => {
    void test("unknown source throws with descriptive message", () => {
      assert.throws(
        () => {
          assertPhaseTransition("BOGUS", "CONSULTING");
        },
        (err: unknown) =>
          err instanceof PhaseTransitionError &&
          err.message.includes("Unknown source phase"),
      );
    });

    void test("unknown target throws with descriptive message", () => {
      assert.throws(
        () => {
          assertPhaseTransition("CONSULTING", "BOGUS");
        },
        (err: unknown) =>
          err instanceof PhaseTransitionError &&
          err.message.includes("Unknown target phase"),
      );
    });
  });
});

// ── 中途撤案原因码 ──

void describe("MANUAL_CANCEL_REASON_CODES", () => {
  void test("contains exactly 4 reason codes", () => {
    assert.equal(MANUAL_CANCEL_REASON_CODES.length, 4);
  });

  void test("includes expected codes", () => {
    const expected = [
      "MID_CASE_WITHDRAWAL",
      "CLIENT_LOST_CONTACT",
      "SWITCHED_TO_OTHER_FIRM",
      "OTHER",
    ];
    assert.deepEqual([...MANUAL_CANCEL_REASON_CODES], expected);
  });
});
