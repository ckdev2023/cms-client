import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";

function buildAggregate(providerProgressEntries: unknown[]) {
  return {
    case: { id: "case-g01", stage: "S4" },
    deepLink: null,
    counts: null,
    billing: null,
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: providerProgressEntries,
  };
}

describe("adaptProviderProgress labelKey (R27-G / T3.1)", () => {
  it("known role 'applicant' → labelKey cases.detail.providers.applicant", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate([{ providerRole: "applicant", total: 10, done: 6 }]),
    )!;
    expect(result.detail.providerProgress).toHaveLength(1);
    const p = result.detail.providerProgress[0];
    expect(p.labelKey).toBe("cases.detail.providers.applicant");
    expect(p.providerRole).toBe("applicant");
    expect(p.label).toBe("applicant");
    expect(p.done).toBe(6);
    expect(p.total).toBe(10);
  });

  it("known role 'unknown' (server enum) → labelKey cases.detail.providers.unknown", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate([{ providerRole: "unknown", total: 3, done: 1 }]),
    )!;
    const p = result.detail.providerProgress[0];
    expect(p.labelKey).toBe("cases.detail.providers.unknown");
    expect(p.providerRole).toBe("unknown");
    expect(p.label).toBe("unknown");
  });

  it("null providerRole → fallback to unspecified", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate([{ providerRole: null, total: 5, done: 2 }]),
    )!;
    const p = result.detail.providerProgress[0];
    expect(p.labelKey).toBe("cases.detail.providers.unspecified");
    expect(p.providerRole).toBe("unspecified");
    expect(p.label).toBe("");
  });

  it("unrecognised enum value → fallback to unspecified", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate([{ providerRole: "weirdValue", total: 4, done: 0 }]),
    )!;
    const p = result.detail.providerProgress[0];
    expect(p.labelKey).toBe("cases.detail.providers.unspecified");
    expect(p.providerRole).toBe("unspecified");
    expect(p.label).toBe("weirdValue");
  });

  it("all six known roles produce correct labelKey", () => {
    const roles = [
      "applicant",
      "supporter",
      "office",
      "employer",
      "agent",
      "unknown",
    ];
    const entries = roles.map((r) => ({ providerRole: r, total: 1, done: 0 }));
    const result = adaptCaseDetailAggregate(buildAggregate(entries))!;
    expect(result.detail.providerProgress).toHaveLength(6);
    for (let i = 0; i < roles.length; i++) {
      expect(result.detail.providerProgress[i].labelKey).toBe(
        `cases.detail.providers.${roles[i]}`,
      );
      expect(result.detail.providerProgress[i].providerRole).toBe(roles[i]);
    }
  });

  it("unknown bucket with total=0 is hidden", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate([
        { providerRole: "applicant", total: 5, done: 3 },
        { providerRole: "unknown", total: 0, done: 0 },
      ]),
    )!;
    expect(result.detail.providerProgress).toHaveLength(1);
    expect(result.detail.providerProgress[0].providerRole).toBe("applicant");
  });

  it("unknown bucket with total>0 is kept", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate([{ providerRole: "unknown", total: 3, done: 1 }]),
    )!;
    expect(result.detail.providerProgress).toHaveLength(1);
    expect(result.detail.providerProgress[0].providerRole).toBe("unknown");
    expect(result.detail.providerProgress[0].total).toBe(3);
  });

  it("unspecified (null role) bucket with total=0 is hidden", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate([
        { providerRole: "office", total: 2, done: 1 },
        { providerRole: null, total: 0, done: 0 },
      ]),
    )!;
    expect(result.detail.providerProgress).toHaveLength(1);
    expect(result.detail.providerProgress[0].providerRole).toBe("office");
  });

  it("supporter role resolves correctly", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate([{ providerRole: "supporter", total: 4, done: 2 }]),
    )!;
    expect(result.detail.providerProgress).toHaveLength(1);
    const p = result.detail.providerProgress[0];
    expect(p.labelKey).toBe("cases.detail.providers.supporter");
    expect(p.providerRole).toBe("supporter");
    expect(p.done).toBe(2);
    expect(p.total).toBe(4);
  });

  it("empty providerRole string → fallback to unspecified", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate([{ providerRole: "", total: 2, done: 1 }]),
    )!;
    const p = result.detail.providerProgress[0];
    expect(p.labelKey).toBe("cases.detail.providers.unspecified");
    expect(p.providerRole).toBe("unspecified");
    expect(p.label).toBe("");
  });
});
