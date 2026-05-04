import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  BUSINESS_PHASES as SERVER_PHASES,
  PHASE_TRANSITIONS as SERVER_TRANSITIONS,
  isTerminalPhase as serverIsTerminal,
} from "./businessPhase";
const adminTransitionsPath =
  "../../../../../admin/src/views/cases/model/businessPhaseTransitions";
const adminPhasesPath =
  "../../../../../admin/src/views/cases/constantsBusinessPhase";
const {
  PHASE_TRANSITIONS: ADMIN_TRANSITIONS,
  isTerminalPhase: adminIsTerminal,
} = await import(adminTransitionsPath);
const { BUSINESS_PHASES: ADMIN_PHASES } = await import(adminPhasesPath);
void describe("admin↔server PHASE_TRANSITIONS consistency (BUG-208)", () => {
  void test("PHASE_TRANSITIONS maps are deep-equal", () => {
    const toPlain = (map) =>
      Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]]));
    assert.deepEqual(toPlain(ADMIN_TRANSITIONS), toPlain(SERVER_TRANSITIONS));
  });
  void test("BUSINESS_PHASES enum arrays match", () => {
    assert.deepEqual([...ADMIN_PHASES], [...SERVER_PHASES]);
  });
  void test("isTerminalPhase agrees on every phase", () => {
    for (const phase of SERVER_PHASES) {
      assert.equal(
        adminIsTerminal(phase),
        serverIsTerminal(phase),
        `isTerminalPhase("${phase}") diverges`,
      );
    }
  });
  void test("every server phase is a key in admin PHASE_TRANSITIONS", () => {
    for (const phase of SERVER_PHASES) {
      assert.ok(
        phase in ADMIN_TRANSITIONS,
        `Server phase "${phase}" missing from admin PHASE_TRANSITIONS`,
      );
    }
  });
  void test("admin PHASE_TRANSITIONS has no extra keys beyond server phases", () => {
    const serverSet = new Set(SERVER_PHASES);
    for (const key of Object.keys(ADMIN_TRANSITIONS)) {
      assert.ok(
        serverSet.has(key),
        `Admin has extra key "${key}" not in server BUSINESS_PHASES`,
      );
    }
  });
});
//# sourceMappingURL=businessPhase.admin-consistency.test.js.map
