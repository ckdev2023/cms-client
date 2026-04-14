import { describe, expect, it } from "vitest";
import {
  DETAIL_TABS,
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
      nationality: "JP",
      gender: "男",
      birthDate: "2000-01-01",
      avatar: "",
      note: "note",
      archivedCases: 0,
      caseNames: ["Case A"],
      lastCaseCreatedDate: "2025-01-01",
    };
    expect(detail.nationality).toBe("JP");
    expect(detail.archivedCases).toBe(0);
    expect(detail.caseNames).toHaveLength(1);
  });
});
