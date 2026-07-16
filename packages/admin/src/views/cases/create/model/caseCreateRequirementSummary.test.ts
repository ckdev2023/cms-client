import { describe, expect, it } from "vitest";
import { resolveCaseCreateRequirementSummary } from "./caseCreateRequirementSummary";

describe("resolveCaseCreateRequirementSummary", () => {
  it("ok 态采用服务端条数", () => {
    expect(
      resolveCaseCreateRequirementSummary({
        fixtureTotal: 3,
        fixtureRequired: 2,
        sectionCount: 2,
        srvTotal: 10,
        srvRequired: 10,
        previewState: "ok",
      }),
    ).toEqual({ total: 10, required: 10, sections: 2 });
  });

  it("empty 态沿用 fixtures 条数（与步骤二示意清单一致）", () => {
    expect(
      resolveCaseCreateRequirementSummary({
        fixtureTotal: 3,
        fixtureRequired: 2,
        sectionCount: 2,
        srvTotal: 0,
        srvRequired: 0,
        previewState: "empty",
      }),
    ).toEqual({ total: 3, required: 2, sections: 2 });
  });
});
