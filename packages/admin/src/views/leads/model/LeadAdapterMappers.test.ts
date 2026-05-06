import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import {
  adaptLeadListResult,
  adaptLeadDetailAggregate,
} from "./LeadAdapterMappers";

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

  describe("adaptLeadDetailAggregate — button preset derivation (spec §4)", () => {
    function makeRaw(overrides: Record<string, unknown>) {
      return {
        lead: {
          id: "LEAD-TEST",
          name: "Test",
          status: "new",
          ...overrides,
        },
        followups: [],
        logs: [],
      };
    }

    it("status=new → initial (convert buttons hidden)", () => {
      const result = adaptLeadDetailAggregate(makeRaw({ status: "new" }));
      expect(result?.detail.buttons).toBe("initial");
    });

    it("status=following → normal (convertCustomer enabled)", () => {
      const result = adaptLeadDetailAggregate(makeRaw({ status: "following" }));
      expect(result?.detail.buttons).toBe("normal");
    });

    it("status=pending_sign → normal", () => {
      const result = adaptLeadDetailAggregate(
        makeRaw({ status: "pending_sign" }),
      );
      expect(result?.detail.buttons).toBe("normal");
    });

    it("status=signed without customer → signedNotConverted", () => {
      const result = adaptLeadDetailAggregate(makeRaw({ status: "signed" }));
      expect(result?.detail.buttons).toBe("signedNotConverted");
    });

    it("has convertedCustomerId → convertedCustomer", () => {
      const result = adaptLeadDetailAggregate(
        makeRaw({ status: "signed", convertedCustomerId: "CUS-1" }),
      );
      expect(result?.detail.buttons).toBe("convertedCustomer");
    });

    it("has convertedCaseId → convertedCase", () => {
      const result = adaptLeadDetailAggregate(
        makeRaw({
          status: "converted_case",
          convertedCustomerId: "CUS-1",
          convertedCaseId: "CAS-1",
        }),
      );
      expect(result?.detail.buttons).toBe("convertedCase");
    });

    it("status=lost → lost", () => {
      const result = adaptLeadDetailAggregate(makeRaw({ status: "lost" }));
      expect(result?.detail.buttons).toBe("lost");
    });
  });

  describe("adaptLeadDetailAggregate — leadNo mapping (R2-B-2)", () => {
    it("maps leadNo from server response when present", () => {
      const result = adaptLeadDetailAggregate({
        lead: {
          id: "720dc94b-df0f-4fb5-be18-a514a6cab776",
          leadNo: "LEAD-202605-0002",
          name: "陈 大伟",
          status: "following",
        },
        followups: [],
        logs: [],
      });

      expect(result?.detail.id).toBe("720dc94b-df0f-4fb5-be18-a514a6cab776");
      expect(result?.detail.leadNo).toBe("LEAD-202605-0002");
    });

    it("returns null leadNo when server response omits it", () => {
      const result = adaptLeadDetailAggregate({
        lead: {
          id: "720dc94b-df0f-4fb5-be18-a514a6cab776",
          name: "陈 大伟",
          status: "following",
        },
        followups: [],
        logs: [],
      });

      expect(result?.detail.id).toBe("720dc94b-df0f-4fb5-be18-a514a6cab776");
      expect(result?.detail.leadNo).toBeNull();
    });
  });

  describe("adaptLeadDetailAggregate — followup/log time localization (H-4)", () => {
    function makeRawWithTimestamps(overrides: {
      followups?: Array<Record<string, unknown>>;
      logs?: Array<Record<string, unknown>>;
    }) {
      return {
        lead: { id: "LEAD-T", name: "T", status: "new" },
        followups: overrides.followups ?? [],
        logs: overrides.logs ?? [],
      };
    }

    it("formats followup createdAt as today-relative label in zh-CN", () => {
      setAppLocale("zh-CN");

      const result = adaptLeadDetailAggregate(
        makeRawWithTimestamps({
          followups: [
            {
              channel: "phone",
              summary: "致电确认",
              createdAt: "2026-04-09T10:24:53.330Z",
              createdByDisplayName: "Local Admin",
            },
          ],
        }),
      );

      const time = result?.detail.followups[0].time ?? "";
      expect(time.startsWith("今天")).toBe(true);
      expect(time).not.toContain("T");
      expect(time).not.toContain("Z");
    });

    it("formats yesterday followup with HH:MM in en-US", () => {
      setAppLocale("en-US");

      const result = adaptLeadDetailAggregate(
        makeRawWithTimestamps({
          followups: [
            {
              channel: "email",
              summary: "send docs",
              createdAt: "2026-04-08T15:30:00",
            },
          ],
        }),
      );

      expect(result?.detail.followups[0].time).toBe("Yesterday 15:30");
    });

    it("formats older followup as MM-DD HH:MM (>3 days)", () => {
      setAppLocale("zh-CN");

      const result = adaptLeadDetailAggregate(
        makeRawWithTimestamps({
          followups: [
            {
              channel: "phone",
              summary: "old",
              createdAt: "2026-04-01T09:15:00",
            },
          ],
        }),
      );

      expect(result?.detail.followups[0].time).toBe("04-01 09:15");
    });

    it("formats log entry createdAt as today-relative label in ja-JP", () => {
      setAppLocale("ja-JP");

      const result = adaptLeadDetailAggregate(
        makeRawWithTimestamps({
          logs: [
            {
              logType: "status",
              createdAt: "2026-04-09T10:23:12.419Z",
              createdByDisplayName: "Local Admin",
              fromValue: "新咨询",
              toValue: "跟进中",
            },
          ],
        }),
      );

      const time = result?.logs[0].time ?? "";
      expect(time.startsWith("今日")).toBe(true);
      expect(time).not.toContain("T");
      expect(time).not.toContain("Z");
    });

    it("preserves raw value when timestamp cannot be parsed", () => {
      setAppLocale("zh-CN");

      const result = adaptLeadDetailAggregate(
        makeRawWithTimestamps({
          logs: [
            {
              logType: "owner",
              createdAt: "not-a-date",
              fromValue: "A",
              toValue: "B",
            },
          ],
        }),
      );

      expect(result?.logs[0].time).toBe("not-a-date");
    });

    it("returns empty string when no createdAt / time provided", () => {
      const result = adaptLeadDetailAggregate(
        makeRawWithTimestamps({
          followups: [{ channel: "phone", summary: "no time" }],
        }),
      );

      expect(result?.detail.followups[0].time).toBe("");
    });
  });

  describe("adaptLeadDetailAggregate — log actor + payload diff (H-5)", () => {
    function makeWithLog(log: Record<string, unknown>) {
      return {
        lead: { id: "LEAD-X", name: "X", status: "new" },
        followups: [],
        logs: [log],
      };
    }

    it("uses createdByDisplayName as operator from server logs", () => {
      setAppLocale("zh-CN");
      const result = adaptLeadDetailAggregate(
        makeWithLog({
          logType: "status_change",
          payload: { from: "new", to: "following" },
          createdByDisplayName: "田中 太郎",
          createdAt: "2026-04-09T10:00:00.000Z",
        }),
      );

      expect(result?.logs[0].operator).toBe("田中 太郎");
    });

    it("renders status_change diff with localized labels", () => {
      setAppLocale("zh-CN");
      const result = adaptLeadDetailAggregate(
        makeWithLog({
          logType: "status_change",
          payload: { from: "new", to: "following" },
          createdByDisplayName: "Admin",
          createdAt: "2026-04-09T10:00:00.000Z",
        }),
      );

      const log = result?.logs[0];
      expect(log?.type).toBe("status");
      expect(log?.fromValue).toBe("新咨询");
      expect(log?.toValue).toBe("跟进中");
      expect(log?.chipClass).toContain("sky");
    });

    it("renders field_change ownerUserId diff into owner category", () => {
      const result = adaptLeadDetailAggregate(
        makeWithLog({
          logType: "field_change",
          payload: { ownerUserId: { from: "u1", to: "u2" } },
          createdByDisplayName: "Admin",
          createdAt: "2026-04-09T10:00:00.000Z",
        }),
      );

      const log = result?.logs[0];
      expect(log?.type).toBe("owner");
      expect(log?.fromValue).toBe("u1");
      expect(log?.toValue).toBe("u2");
    });

    it("falls back to empty operator when server omits createdByDisplayName", () => {
      const result = adaptLeadDetailAggregate(
        makeWithLog({
          logType: "status_change",
          payload: { from: "new", to: "following" },
          createdAt: "2026-04-09T10:00:00.000Z",
        }),
      );

      expect(result?.logs[0].operator).toBe("");
    });

    it("legacy fixture entries with explicit fromValue/toValue keep raw payload", () => {
      const result = adaptLeadDetailAggregate(
        makeWithLog({
          type: "status",
          operator: "管理员",
          time: "2026/04/05 16:00",
          fromValue: "—",
          toValue: "新咨询",
          chipClass: "bg-amber-100 text-amber-700",
        }),
      );

      const log = result?.logs[0];
      expect(log?.type).toBe("status");
      expect(log?.fromValue).toBe("—");
      expect(log?.toValue).toBe("新咨询");
      expect(log?.chipClass).toBe("bg-amber-100 text-amber-700");
      expect(log?.operator).toBe("管理员");
    });

    it("renders converted_case payload caseId in toValue", () => {
      setAppLocale("zh-CN");
      const result = adaptLeadDetailAggregate(
        makeWithLog({
          logType: "converted_case",
          payload: { caseId: "case-001", caseTypeCode: "bmv" },
          createdByDisplayName: "Admin",
          createdAt: "2026-04-09T10:00:00.000Z",
        }),
      );

      const log = result?.logs[0];
      expect(log?.type).toBe("status");
      expect(log?.toValue).toBe("case-001");
      expect(log?.fromValue).toBe("已签约");
    });
  });
});
