import { describe, expect, it } from "vitest";
import {
  DETAIL_TABS,
  getRelationTypeLabel,
  getRelationTypeOptions,
  resolveBmvIntakeStatus,
  type CustomerDetail,
  type DetailTab,
  type SummaryCardData,
  type SummaryCardVariant,
} from "./types";

describe("customers/types", () => {
  it("DETAIL_TABS contains exactly 5 tabs in the expected order", () => {
    expect(DETAIL_TABS).toEqual(["basic", "cases", "contacts", "comms", "log"]);
  });

  it("DETAIL_TABS entries satisfy the DetailTab type", () => {
    const tabs: DetailTab[] = [...DETAIL_TABS];
    expect(tabs).toHaveLength(5);
  });

  it("SummaryCardVariant accepts the 4 prototype variants", () => {
    const variants: SummaryCardVariant[] = [
      "primary",
      "info",
      "warning",
      "neutral",
    ];
    expect(variants).toHaveLength(4);
  });

  it("SummaryCardData can be instantiated with required fields", () => {
    const card: SummaryCardData = {
      key: "mine",
      variant: "primary",
      value: 10,
    };
    expect(card.key).toBe("mine");
    expect(card.variant).toBe("primary");
    expect(card.value).toBe(10);
  });

  it("CustomerDetail extends CustomerSummary with detail-specific fields", () => {
    const detail: CustomerDetail = {
      id: "cust-x",
      displayName: "Test",
      legalName: "Test",
      furigana: "テスト",
      customerNumber: "C-0000",
      phone: "",
      email: "t@test.com",
      totalCases: 1,
      activeCases: 1,
      lastContactDate: null,
      lastContactChannel: null,
      owner: { initials: "T", name: "Tester" },
      referralSource: "",
      group: "G1",
      bmvProfile: null,
      nationality: "JP",
      gender: "男",
      birthDate: "2000-01-01",
      avatar: "",
      note: "note",
      location: "",
      sourceType: "",
      visaType: "",
      referrerName: "",
      archivedCases: 0,
      caseNames: ["Case A"],
      caseTitles: ["Case A"],
      caseTypeCodes: ["dependent_visa"],
      lastCaseCreatedDate: "2025-01-01",
    };
    expect(detail.nationality).toBe("JP");
    expect(detail.archivedCases).toBe(0);
    expect(detail.caseNames).toHaveLength(1);
  });

  it("resolveBmvIntakeStatus follows questionnaire → quote → sign gate order", () => {
    expect(
      resolveBmvIntakeStatus({
        questionnaireStatus: "sent",
        quoteStatus: "not_started",
        signStatus: "not_started",
      }),
    ).toBe("questionnaire_pending");
    expect(
      resolveBmvIntakeStatus({
        questionnaireStatus: "returned",
        quoteStatus: "generated",
        signStatus: "pending",
      }),
    ).toBe("sign_pending");
    expect(
      resolveBmvIntakeStatus({
        questionnaireStatus: "returned",
        quoteStatus: "confirmed",
        signStatus: "pending",
      }),
    ).toBe("sign_pending");
    expect(
      resolveBmvIntakeStatus({
        questionnaireStatus: "returned",
        quoteStatus: "confirmed",
        signStatus: "signed",
      }),
    ).toBe("ready_for_case_creation");
  });

  it("localizes relation type labels by locale", () => {
    expect(getRelationTypeLabel("parent")).toBe("父母");
    expect(getRelationTypeLabel("parent", "en-US")).toBe("Parent");
    expect(getRelationTypeLabel("parent", "ja-JP")).toBe("親");
  });

  it("returns localized relation type options for the active locale", () => {
    expect(
      getRelationTypeOptions("en-US").find((option) => option.value === "agent")
        ?.label,
    ).toBe("Agent / advisor");
    expect(
      getRelationTypeOptions("ja-JP").find((option) => option.value === "other")
        ?.label,
    ).toBe("その他");
  });
});
