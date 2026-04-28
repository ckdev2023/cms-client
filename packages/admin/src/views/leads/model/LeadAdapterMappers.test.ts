import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import { adaptLeadListResult } from "./LeadAdapterMappers";

const originalLocale = i18n.global.locale.value as AppLocale;

describe("LeadAdapterMappers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
    setAppLocale(originalLocale);
  });

  it("formats recent updatedAt labels in en-US", () => {
    setAppLocale("en-US");

    const result = adaptLeadListResult({
      items: [
        {
          id: "LEAD-1",
          name: "Test Lead",
          status: "new",
          nextAction: "call",
          nextFollowUpAt: "2026-04-10",
          updatedAt: "2026-04-08T15:30:00",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    expect(result?.items[0].nextFollowUpLabel).toBe("04-10");
    expect(result?.items[0].updatedAtLabel).toBe("Yesterday 15:30");
  });

  it("formats 3-day-old updatedAt labels in ja-JP", () => {
    setAppLocale("ja-JP");

    const result = adaptLeadListResult({
      items: [
        {
          id: "LEAD-2",
          name: "Test Lead",
          status: "following",
          nextAction: "mail",
          nextFollowUpAt: "2026-04-11",
          updatedAt: "2026-04-06T17:00:00",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    expect(result?.items[0].updatedAtLabel).toBe("3 日前 17:00");
  });
});
