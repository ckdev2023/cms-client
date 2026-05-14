import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import { adaptLeadDetailAggregate } from "./LeadAdapterMappers";

const originalLocale = i18n.global.locale.value as AppLocale;

describe("LeadAdapterMappers — followup id for list keys", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T12:00:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
    setAppLocale(originalLocale);
  });

  it("maps server followup id onto detail.followups[].id", () => {
    setAppLocale("zh-CN");

    const result = adaptLeadDetailAggregate({
      lead: { id: "LEAD-T", name: "T", status: "new" },
      followups: [
        {
          id: "followup-stable-id-1",
          channel: "phone",
          summary: "致电确认",
          createdAt: "2026-04-09T10:24:53.330Z",
        },
      ],
      logs: [],
    });

    expect(result?.detail.followups[0]?.id).toBe("followup-stable-id-1");
  });
});
