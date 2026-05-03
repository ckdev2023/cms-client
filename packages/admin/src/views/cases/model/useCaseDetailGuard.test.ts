import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useCaseDetailGuard } from "./useCaseDetailGuard";
import type { CaseDetail } from "../types";
import { createMockDetail } from "./useCaseDetailModel.test-support";

function createGuard(overrides: Partial<CaseDetail> = {}) {
  const detail = ref<CaseDetail | null>(createMockDetail(overrides));
  return { guard: useCaseDetailGuard(detail), detail };
}

describe("useCaseDetailGuard", () => {
  describe("isReadonly / isTerminal", () => {
    it("active case: isReadonly=false, isTerminal=false", () => {
      const { guard } = createGuard({
        readonly: false,
        businessPhase: "MATERIAL_PREPARING",
      });
      expect(guard.isReadonly.value).toBe(false);
      expect(guard.isTerminal.value).toBe(false);
    });

    it("archived (CLOSED_SUCCESS): isReadonly=true, isTerminal=true", () => {
      const { guard } = createGuard({
        readonly: true,
        businessPhase: "CLOSED_SUCCESS",
      });
      expect(guard.isReadonly.value).toBe(true);
      expect(guard.isTerminal.value).toBe(true);
    });

    it("CLOSED_FAILED: isTerminal=true", () => {
      const { guard } = createGuard({
        readonly: true,
        businessPhase: "CLOSED_FAILED",
      });
      expect(guard.isTerminal.value).toBe(true);
    });

    it("null detail: isReadonly=false, isTerminal=false (safe default)", () => {
      const detail = ref<CaseDetail | null>(null);
      const guard = useCaseDetailGuard(detail);
      expect(guard.isReadonly.value).toBe(false);
      expect(guard.isTerminal.value).toBe(false);
    });
  });

  describe("action permissions — active case", () => {
    it("all actions enabled when not readonly", () => {
      const { guard } = createGuard({ readonly: false });
      expect(guard.canEdit.value).toBe(true);
      expect(guard.canTransition.value).toBe(true);
      expect(guard.canAddTask.value).toBe(true);
      expect(guard.canPublishMessage.value).toBe(true);
      expect(guard.canAddDeadline.value).toBe(true);
      expect(guard.canGenerateForm.value).toBe(true);
    });
  });

  describe("action permissions — readonly case", () => {
    it("all actions disabled when readonly", () => {
      const { guard } = createGuard({ readonly: true });
      expect(guard.canEdit.value).toBe(false);
      expect(guard.canTransition.value).toBe(false);
      expect(guard.canAddTask.value).toBe(false);
      expect(guard.canPublishMessage.value).toBe(false);
      expect(guard.canAddDeadline.value).toBe(false);
      expect(guard.canGenerateForm.value).toBe(false);
    });
  });

  describe("reactivity", () => {
    it("tracks detail changes from active to readonly", () => {
      const { guard, detail } = createGuard({
        readonly: false,
        businessPhase: "REVIEWING",
      });
      expect(guard.canEdit.value).toBe(true);
      expect(guard.isTerminal.value).toBe(false);

      detail.value = createMockDetail({
        readonly: true,
        businessPhase: "CLOSED_SUCCESS",
      });
      expect(guard.canEdit.value).toBe(false);
      expect(guard.isTerminal.value).toBe(true);
      expect(guard.isReadonly.value).toBe(true);
    });

    it("tracks detail changes from loaded to null", () => {
      const { guard, detail } = createGuard({ readonly: true });
      expect(guard.isReadonly.value).toBe(true);

      detail.value = null;
      expect(guard.isReadonly.value).toBe(false);
      expect(guard.isTerminal.value).toBe(false);
    });
  });
});
