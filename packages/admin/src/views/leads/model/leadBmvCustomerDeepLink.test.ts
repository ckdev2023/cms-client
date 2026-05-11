import { describe, expect, it } from "vitest";
import { LEAD_BMV_GATE_BLOCKER_CODES } from "./LeadBmvGateBinding";
import {
  buildLeadBmvCustomerIntakeHref,
  leadBmvCustomerIntakeFragmentForBlocker,
} from "./leadBmvCustomerDeepLink";

describe("leadBmvCustomerDeepLink", () => {
  it("builds customer intake href with blocker-specific fragment", () => {
    const cid = "c-123";
    expect(buildLeadBmvCustomerIntakeHref(cid)).toContain("/customers/c-123");
    expect(buildLeadBmvCustomerIntakeHref(cid)).toContain("tab=basic");
    expect(buildLeadBmvCustomerIntakeHref(cid)).toContain("#bmv-intake-card");
    expect(
      buildLeadBmvCustomerIntakeHref(
        cid,
        LEAD_BMV_GATE_BLOCKER_CODES.QUOTE_NOT_CONFIRMED,
      ),
    ).toContain("#bmv-intake-quote");
    expect(
      leadBmvCustomerIntakeFragmentForBlocker(
        LEAD_BMV_GATE_BLOCKER_CODES.QUESTIONNAIRE_NOT_RETURNED,
      ),
    ).toBe("#bmv-intake-survey");
  });

  it("returns # when customer id is blank", () => {
    expect(buildLeadBmvCustomerIntakeHref("  ")).toBe("#");
  });
});
