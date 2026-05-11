import { describe, expect, it } from "vitest";
import { adaptChecklistPreviewLine } from "./adaptChecklistPreviewLine";

describe("adaptChecklistPreviewLine", () => {
  it("解析标准字段", () => {
    expect(
      adaptChecklistPreviewLine({
        code: "a",
        name: "名前",
        ownerSide: "office",
        category: "standard",
        requiredFlag: true,
        providedByRole: "office",
      }),
    ).toEqual({
      code: "a",
      name: "名前",
      ownerSide: "office",
      category: "standard",
      requiredFlag: true,
      providedByRole: "office",
    });
  });

  it("code / name 皆缺时返回 null", () => {
    expect(adaptChecklistPreviewLine({ ownerSide: "applicant" })).toBeNull();
  });
});
