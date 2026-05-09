import { describe, it, expect } from "vitest";
import { buildCaseTimelineMessageResult } from "./CaseCommsTimelineBuilders";

describe("CaseCommsTimelineBuilders", () => {
  describe("case.transitioned", () => {
    it("returns caseTransitioned key with from/to/phase params", () => {
      const result = buildCaseTimelineMessageResult("case.transitioned", {
        from: "S3",
        to: "S5",
        businessPhase: "APPROVED",
      });
      expect(result.key).toBe("cases.log.timeline.caseTransitioned");
      expect(result.params).toEqual({
        from: "S3",
        to: "S5",
        phase: "APPROVED",
      });
    });

    it("defaults to empty strings when fields are missing", () => {
      const result = buildCaseTimelineMessageResult("case.transitioned", {});
      expect(result.params).toEqual({ from: "", to: "", phase: "" });
    });
  });

  describe("residence_period.created", () => {
    it("returns residencePeriodCreated key with kind suffix", () => {
      const result = buildCaseTimelineMessageResult(
        "residence_period.created",
        { kind: "initial" },
      );
      expect(result.key).toBe("cases.log.timeline.residencePeriodCreated");
      expect(result.params).toEqual({
        suffix: "initial",
        colonSuffix: "：initial",
      });
    });

    it("falls back to type field", () => {
      const result = buildCaseTimelineMessageResult(
        "residence_period.created",
        { type: "renewal" },
      );
      expect(result.params).toEqual({
        suffix: "renewal",
        colonSuffix: "：renewal",
      });
    });

    it("defaults to empty string when no kind/type", () => {
      const result = buildCaseTimelineMessageResult(
        "residence_period.created",
        {},
      );
      expect(result.params).toEqual({ suffix: "", colonSuffix: "" });
    });
  });

  describe("generated_document.created", () => {
    it("includes colonSuffix with title", () => {
      const result = buildCaseTimelineMessageResult(
        "generated_document.created",
        { title: "理由書" },
      );
      expect(result.params).toMatchObject({ suffix: "理由書" });
      expect(result.params!.colonSuffix).toBe("：理由書");
    });

    it("drops colon when title is missing", () => {
      const result = buildCaseTimelineMessageResult(
        "generated_document.created",
        {},
      );
      expect(result.params!.colonSuffix).toBe("");
    });
  });

  describe("generated_document.updated", () => {
    it("returns generatedDocumentUpdated key with title suffix", () => {
      const result = buildCaseTimelineMessageResult(
        "generated_document.updated",
        { title: "申請理由書" },
      );
      expect(result.key).toBe("cases.log.timeline.generatedDocumentUpdated");
      expect(result.params).toMatchObject({ suffix: "申請理由書" });
      expect(result.params!.colonSuffix).toBe("：申請理由書");
    });

    it("falls back to templateName", () => {
      const result = buildCaseTimelineMessageResult(
        "generated_document.updated",
        { templateName: "事業計画書" },
      );
      expect(result.params).toMatchObject({ suffix: "事業計画書" });
      expect(result.params!.colonSuffix).toBe("：事業計画書");
    });

    it("defaults to empty string when no title/templateName", () => {
      const result = buildCaseTimelineMessageResult(
        "generated_document.updated",
        {},
      );
      expect(result.params).toMatchObject({ suffix: "" });
      expect(result.params!.colonSuffix).toBe("");
    });
  });

  describe("generated_document.finalized", () => {
    it("returns generatedDocumentFinalized key with title suffix", () => {
      const result = buildCaseTimelineMessageResult(
        "generated_document.finalized",
        { title: "申請理由書" },
      );
      expect(result.key).toBe("cases.log.timeline.generatedDocumentFinalized");
      expect(result.params).toMatchObject({ suffix: "申請理由書" });
      expect(result.params!.colonSuffix).toBe("：申請理由書");
    });

    it("drops colon when payload is empty", () => {
      const result = buildCaseTimelineMessageResult(
        "generated_document.finalized",
        {},
      );
      expect(result.params).toMatchObject({ suffix: "" });
      expect(result.params!.colonSuffix).toBe("");
    });
  });

  describe("generated_document.exported", () => {
    it("returns generatedDocumentExported key with title suffix", () => {
      const result = buildCaseTimelineMessageResult(
        "generated_document.exported",
        { title: "事業計画書" },
      );
      expect(result.key).toBe("cases.log.timeline.generatedDocumentExported");
      expect(result.params).toMatchObject({ suffix: "事業計画書" });
      expect(result.params!.colonSuffix).toBe("：事業計画書");
    });

    it("drops colon when payload is empty", () => {
      const result = buildCaseTimelineMessageResult(
        "generated_document.exported",
        {},
      );
      expect(result.params).toMatchObject({ suffix: "" });
      expect(result.params!.colonSuffix).toBe("");
    });
  });

  describe("generated_document.export_queued", () => {
    it("returns generatedDocumentExportQueued key with title suffix", () => {
      const result = buildCaseTimelineMessageResult(
        "generated_document.export_queued",
        { title: "申請理由書" },
      );
      expect(result.key).toBe(
        "cases.log.timeline.generatedDocumentExportQueued",
      );
      expect(result.params).toMatchObject({ suffix: "申請理由書" });
      expect(result.params!.colonSuffix).toBe("：申請理由書");
    });

    it("drops colon when payload is empty", () => {
      const result = buildCaseTimelineMessageResult(
        "generated_document.export_queued",
        {},
      );
      expect(result.params).toMatchObject({ suffix: "" });
      expect(result.params!.colonSuffix).toBe("");
    });
  });

  describe("generated_document.export_failed", () => {
    it("returns generatedDocumentExportFailed key with title suffix", () => {
      const result = buildCaseTimelineMessageResult(
        "generated_document.export_failed",
        { title: "事業計画書" },
      );
      expect(result.key).toBe(
        "cases.log.timeline.generatedDocumentExportFailed",
      );
      expect(result.params).toMatchObject({ suffix: "事業計画書" });
      expect(result.params!.colonSuffix).toBe("：事業計画書");
    });

    it("drops colon when payload is empty", () => {
      const result = buildCaseTimelineMessageResult(
        "generated_document.export_failed",
        {},
      );
      expect(result.params).toMatchObject({ suffix: "" });
      expect(result.params!.colonSuffix).toBe("");
    });
  });

  describe("document_item.transitioned", () => {
    it("returns documentItemTransitioned key with to suffix", () => {
      const result = buildCaseTimelineMessageResult(
        "document_item.transitioned",
        { to: "approved" },
      );
      expect(result.key).toBe("cases.log.timeline.documentItemTransitioned");
      expect(result.params).toEqual({
        suffix: "approved",
        colonSuffix: "：approved",
      });
    });

    it("falls back to toStatus field", () => {
      const result = buildCaseTimelineMessageResult(
        "document_item.transitioned",
        { toStatus: "expired" },
      );
      expect(result.params).toEqual({
        suffix: "expired",
        colonSuffix: "：expired",
      });
    });

    it("defaults to empty when no to/toStatus", () => {
      const result = buildCaseTimelineMessageResult(
        "document_item.transitioned",
        {},
      );
      expect(result.params).toEqual({ suffix: "", colonSuffix: "" });
    });
  });

  describe("document_item.waived", () => {
    it("returns documentItemWaived key with reasonCode suffix", () => {
      const result = buildCaseTimelineMessageResult("document_item.waived", {
        reasonCode: "not_applicable",
      });
      expect(result.key).toBe("cases.log.timeline.documentItemWaived");
      expect(result.params).toEqual({
        suffix: "not_applicable",
        colonSuffix: "：not_applicable",
      });
    });

    it("falls back to reason_code field", () => {
      const result = buildCaseTimelineMessageResult("document_item.waived", {
        reason_code: "duplicate",
      });
      expect(result.params).toEqual({
        suffix: "duplicate",
        colonSuffix: "：duplicate",
      });
    });

    it("defaults to empty when no reasonCode", () => {
      const result = buildCaseTimelineMessageResult("document_item.waived", {});
      expect(result.params).toEqual({ suffix: "", colonSuffix: "" });
    });
  });

  describe("document_item.unwaived", () => {
    it("returns documentItemUnwaived key", () => {
      const result = buildCaseTimelineMessageResult("document_item.unwaived", {
        note: "re-required",
      });
      expect(result.key).toBe("cases.log.timeline.documentItemUnwaived");
    });
  });

  describe("document_item.deleted", () => {
    it("returns documentItemDeleted key", () => {
      const result = buildCaseTimelineMessageResult(
        "document_item.deleted",
        {},
      );
      expect(result.key).toBe("cases.log.timeline.documentItemDeleted");
    });
  });

  describe("document_item.survey_data_updated", () => {
    it("returns documentItemSurveyDataUpdated key", () => {
      const result = buildCaseTimelineMessageResult(
        "document_item.survey_data_updated",
        {},
      );
      expect(result.key).toBe(
        "cases.log.timeline.documentItemSurveyDataUpdated",
      );
    });
  });

  describe("validation_run.auto_failed", () => {
    it("returns validationRunAutoFailed key with trigger suffix", () => {
      const result = buildCaseTimelineMessageResult(
        "validation_run.auto_failed",
        { trigger: "generated_document.finalize" },
      );
      expect(result.key).toBe("cases.log.timeline.validationRunAutoFailed");
      expect(result.params).toEqual({
        suffix: "generated_document.finalize",
        colonSuffix: "：generated_document.finalize",
      });
    });

    it("defaults to empty when no trigger", () => {
      const result = buildCaseTimelineMessageResult(
        "validation_run.auto_failed",
        {},
      );
      expect(result.params).toEqual({ suffix: "", colonSuffix: "" });
    });
  });

  describe("existing builders remain stable", () => {
    it("case.stage_changed still returns stageChange key", () => {
      const result = buildCaseTimelineMessageResult("case.stage_changed", {
        from: "S1",
        to: "S2",
      });
      expect(result.key).toBe("cases.log.timeline.stageChange");
    });

    it("handles snake_case payload keys for case.transitioned", () => {
      const result = buildCaseTimelineMessageResult("case.transitioned", {
        fromStage: "S1",
        toStage: "S2",
        business_phase: "MATERIAL_PREPARING",
      });
      expect(result.params).toEqual({
        from: "S1",
        to: "S2",
        phase: "MATERIAL_PREPARING",
      });
    });

    it("unregistered action falls back gracefully", () => {
      const result = buildCaseTimelineMessageResult("unknown.event", {});
      expect(result.params?.fallback).toBe("unknown.event");
    });
  });
});
