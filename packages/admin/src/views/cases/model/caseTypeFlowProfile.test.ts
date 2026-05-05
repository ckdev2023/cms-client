import { describe, expect, it } from "vitest";
import { resolveCaseTypeFlowProfile } from "./caseTypeFlowProfile";

describe("resolveCaseTypeFlowProfile", () => {
  it("biz_mgmt_cert_4m → all flags true", () => {
    const profile = resolveCaseTypeFlowProfile("biz_mgmt_cert_4m");
    expect(profile).toEqual({
      hasCoeFlow: true,
      hasFinalPaymentGate: true,
      hasSurveyQuote: true,
    });
  });

  it("biz_mgmt_cert_1y → all flags true", () => {
    const profile = resolveCaseTypeFlowProfile("biz_mgmt_cert_1y");
    expect(profile).toEqual({
      hasCoeFlow: true,
      hasFinalPaymentGate: true,
      hasSurveyQuote: true,
    });
  });

  it("biz_mgmt (bare) → all flags true", () => {
    const profile = resolveCaseTypeFlowProfile("biz_mgmt");
    expect(profile).toEqual({
      hasCoeFlow: true,
      hasFinalPaymentGate: true,
      hasSurveyQuote: true,
    });
  });

  it("biz_mgmt_renewal → hasCoeFlow false, others true", () => {
    const profile = resolveCaseTypeFlowProfile("biz_mgmt_renewal");
    expect(profile).toEqual({
      hasCoeFlow: false,
      hasFinalPaymentGate: true,
      hasSurveyQuote: true,
    });
  });

  it("family → all flags false", () => {
    const profile = resolveCaseTypeFlowProfile("family");
    expect(profile).toEqual({
      hasCoeFlow: false,
      hasFinalPaymentGate: false,
      hasSurveyQuote: false,
    });
  });

  it("hum → all flags false", () => {
    const profile = resolveCaseTypeFlowProfile("hum");
    expect(profile).toEqual({
      hasCoeFlow: false,
      hasFinalPaymentGate: false,
      hasSurveyQuote: false,
    });
  });

  it("unknown code → all flags false", () => {
    const profile = resolveCaseTypeFlowProfile("unknown");
    expect(profile).toEqual({
      hasCoeFlow: false,
      hasFinalPaymentGate: false,
      hasSurveyQuote: false,
    });
  });

  it("empty string → all flags false", () => {
    const profile = resolveCaseTypeFlowProfile("");
    expect(profile).toEqual({
      hasCoeFlow: false,
      hasFinalPaymentGate: false,
      hasSurveyQuote: false,
    });
  });
});
