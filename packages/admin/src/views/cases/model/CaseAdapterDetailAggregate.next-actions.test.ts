import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";

function buildAggregate(businessPhase: string, stage = "S4") {
  return {
    case: { id: "case-na-01", stage, businessPhase },
    deepLink: {
      customerId: "c1",
      customerName: "Test",
      groupId: null,
      groupName: null,
      ownerUserId: "u1",
      ownerDisplayName: "Owner",
      assistantUserId: null,
      assistantDisplayName: null,
    },
    counts: null,
    billing: null,
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
  };
}

describe("adaptCaseDetailAggregate overviewActions (D4)", () => {
  it("WAITING_PAYMENT → billing primary, deadlines secondary", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("WAITING_PAYMENT", "S6"),
    )!;
    expect(result.detail.overviewActions.primary.tab).toBe("billing");
    expect(result.detail.overviewActions.primary.label).toBe(
      "cases.coach.registerFinalPayment",
    );
    expect(result.detail.overviewActions.secondary.tab).toBe("deadlines");
    expect(result.detail.overviewActions.secondary.label).toBe(
      "cases.coach.sendCollectionReminder",
    );
  });

  it("COE_SENT → messages primary, deadlines secondary", () => {
    const result = adaptCaseDetailAggregate(buildAggregate("COE_SENT", "S7"))!;
    expect(result.detail.overviewActions.primary.tab).toBe("messages");
    expect(result.detail.overviewActions.secondary.tab).toBe("deadlines");
  });

  it("VISA_APPLYING → messages primary, deadlines secondary", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("VISA_APPLYING", "S7"),
    )!;
    expect(result.detail.overviewActions.primary.tab).toBe("messages");
    expect(result.detail.overviewActions.secondary.tab).toBe("deadlines");
  });

  it("APPROVED → billing primary, documents secondary", () => {
    const result = adaptCaseDetailAggregate(buildAggregate("APPROVED", "S6"))!;
    expect(result.detail.overviewActions.primary.tab).toBe("billing");
    expect(result.detail.overviewActions.secondary.tab).toBe("documents");
  });

  it("CLOSED_SUCCESS → log primary, billing secondary", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("CLOSED_SUCCESS", "S9"),
    )!;
    expect(result.detail.overviewActions.primary.tab).toBe("log");
    expect(result.detail.overviewActions.secondary.tab).toBe("billing");
  });

  it("CLOSED_FAILED → log primary, billing secondary", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("CLOSED_FAILED", "S9"),
    )!;
    expect(result.detail.overviewActions.primary.tab).toBe("log");
    expect(result.detail.overviewActions.secondary.tab).toBe("billing");
  });

  it("CONTRACTED → documents primary, tasks secondary", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("CONTRACTED", "S2"),
    )!;
    expect(result.detail.overviewActions.primary.tab).toBe("documents");
    expect(result.detail.overviewActions.secondary.tab).toBe("tasks");
  });

  it("UNDER_REVIEW → messages primary, deadlines secondary", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("UNDER_REVIEW", "S5"),
    )!;
    expect(result.detail.overviewActions.primary.tab).toBe("messages");
    expect(result.detail.overviewActions.secondary.tab).toBe("deadlines");
  });

  it("unknown phase falls back to documents + validation", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("NONEXISTENT_PHASE"),
    )!;
    expect(result.detail.overviewActions.primary).toEqual({
      label: "cases.coach.docManagement",
      tab: "documents",
    });
    expect(result.detail.overviewActions.secondary).toEqual({
      label: "cases.coach.runValidation",
      tab: "validation",
    });
  });

  it("empty businessPhase falls back to default actions", () => {
    const result = adaptCaseDetailAggregate(buildAggregate(""))!;
    expect(result.detail.overviewActions.primary.tab).toBe("documents");
    expect(result.detail.overviewActions.secondary.tab).toBe("validation");
  });
});
