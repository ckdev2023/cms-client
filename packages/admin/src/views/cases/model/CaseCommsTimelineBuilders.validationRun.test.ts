import { describe, it, expect } from "vitest";
import { buildCaseTimelineMessageResult } from "./CaseCommsTimelineBuilders";

describe("validation_run.executed builder", () => {
  it("maps resultStatus=passed to validationRunPassed key", () => {
    const result = buildCaseTimelineMessageResult("validation_run.executed", {
      resultStatus: "passed",
      validationRunId: "run-1",
    });
    expect(result.key).toBe("cases.log.timeline.validationRunPassed");
  });

  it("maps resultStatus=failed to validationRunFailed key", () => {
    const result = buildCaseTimelineMessageResult("validation_run.executed", {
      resultStatus: "failed",
      validationRunId: "run-2",
      blockingCount: 3,
    });
    expect(result.key).toBe("cases.log.timeline.validationRunFailed");
  });

  it("falls back to validationRunExecuted when resultStatus is undefined", () => {
    const result = buildCaseTimelineMessageResult("validation_run.executed", {
      validationRunId: "run-3",
    });
    expect(result.key).toBe("cases.log.timeline.validationRunExecuted");
  });

  it("falls back to validationRunExecuted when resultStatus is empty string", () => {
    const result = buildCaseTimelineMessageResult("validation_run.executed", {
      resultStatus: "",
    });
    expect(result.key).toBe("cases.log.timeline.validationRunExecuted");
  });

  it("supports snake_case result_status field", () => {
    const result = buildCaseTimelineMessageResult("validation_run.executed", {
      result_status: "passed",
    });
    expect(result.key).toBe("cases.log.timeline.validationRunPassed");
  });
});
