import { describe, expect, it } from "vitest";
import {
  getCaseTypeI18nKey,
  isBizManagementVisaCaseTypeCode,
} from "./caseTypeI18n";

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

  it("detects biz management visa case type codes", () => {
    expect(isBizManagementVisaCaseTypeCode("")).toBe(false);
    expect(isBizManagementVisaCaseTypeCode(null)).toBe(false);
    expect(isBizManagementVisaCaseTypeCode(undefined)).toBe(false);
    expect(isBizManagementVisaCaseTypeCode("business_manager_visa")).toBe(true);
    expect(isBizManagementVisaCaseTypeCode("biz_mgmt_4m")).toBe(true);
    expect(isBizManagementVisaCaseTypeCode("BmV")).toBe(true);
    expect(isBizManagementVisaCaseTypeCode("bmv")).toBe(true);
    expect(isBizManagementVisaCaseTypeCode("biz-mgmt-cert-4m")).toBe(true);
    expect(isBizManagementVisaCaseTypeCode("business-management")).toBe(true);
    expect(isBizManagementVisaCaseTypeCode("business-management-visa")).toBe(
      true,
    );
    expect(isBizManagementVisaCaseTypeCode("business_management_visa")).toBe(
      true,
    );
    expect(isBizManagementVisaCaseTypeCode("engineer_humanities")).toBe(false);
  });
});
