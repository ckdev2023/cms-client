import { describe, expect, it } from "vitest";
import { getCaseTypeI18nKey } from "./caseTypeI18n";

describe("shared/model/caseTypeI18n", () => {
  it("returns i18n key for a valid code", () => {
    expect(getCaseTypeI18nKey("engineer_humanities_intl_visa")).toBe(
      "cases.constants.caseTypes.engineer_humanities_intl_visa",
    );
  });

  it("returns empty string for empty code", () => {
    expect(getCaseTypeI18nKey("")).toBe("");
  });

  it("returns deterministic key for any non-empty code", () => {
    expect(getCaseTypeI18nKey("dependent_visa")).toBe(
      "cases.constants.caseTypes.dependent_visa",
    );
  });
});
