import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import {
  adaptLeadListResult,
  adaptLeadDetailAggregate,
} from "./LeadAdapterMappers";

const originalLocale = i18n.global.locale.value as AppLocale;

function listWrap(item: Record<string, unknown>, total = 1) {
  return {
    items: [{ id: "LEAD-X", name: "Test", status: "new", ...item }],
    total,
  };
}

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
    const result = adaptLeadListResult(
      listWrap({
        id: "LEAD-1",
        nextAction: "call",
        nextFollowUpAt: "2026-04-10",
        updatedAt: "2026-04-08T15:30:00",
      }),
    );
    expect(result?.items[0].nextFollowUpLabel).toBe("04-10");
    expect(result?.items[0].updatedAtLabel).toBe("Yesterday 15:30");
  });

  it("formats 3-day-old updatedAt labels in ja-JP", () => {
    setAppLocale("ja-JP");
    const result = adaptLeadListResult(
      listWrap({
        id: "LEAD-2",
        status: "following",
        nextAction: "mail",
        nextFollowUpAt: "2026-04-11",
        updatedAt: "2026-04-06T17:00:00",
      }),
    );
    expect(result?.items[0].updatedAtLabel).toBe("3 日前 17:00");
  });

  describe("adaptLeadListResult — tags mapping (R3-F-2)", () => {
    it("reads tags array from server response", () => {
      const result = adaptLeadListResult(
        listWrap({
          id: "LEAD-T1",
          status: "following",
          tags: ["VIP", "urgent"],
        }),
      );
      expect(result?.items[0].tags).toEqual(["VIP", "urgent"]);
    });
    it("defaults tags to empty array when absent", () => {
      const result = adaptLeadListResult(listWrap({ id: "LEAD-T2" }));
      expect(result?.items[0].tags).toEqual([]);
    });
    it("defaults tags to empty array when null", () => {
      const result = adaptLeadListResult(
        listWrap({ id: "LEAD-T3", tags: null }),
      );
      expect(result?.items[0].tags).toEqual([]);
    });
    it("filters out non-string items from tags", () => {
      const result = adaptLeadListResult(
        listWrap({ id: "LEAD-T4", tags: ["valid", 123, null, "also-valid"] }),
      );
      expect(result?.items[0].tags).toEqual(["valid", "also-valid"]);
    });
  });

  describe("adaptLeadListResult — ownerLabel / groupLabel mapping", () => {
    it("maps ownerDisplayName/groupName to ownerLabel/groupLabel", () => {
      const result = adaptLeadListResult(
        listWrap({
          id: "LEAD-OG1",
          status: "following",
          ownerDisplayName: "Local Admin",
          groupName: "Tokyo-1",
        }),
      );
      expect(result?.items[0].ownerLabel).toBe("Local Admin");
      expect(result?.items[0].groupLabel).toBe("Tokyo-1");
    });
    it("defaults ownerLabel to null when ownerDisplayName is absent", () => {
      const result = adaptLeadListResult(
        listWrap({ id: "LEAD-OG2", status: "new" }),
      );
      expect(result?.items[0].ownerLabel).toBeNull();
    });
    it("defaults groupLabel to null when groupName is absent", () => {
      const result = adaptLeadListResult(
        listWrap({ id: "LEAD-OG3", status: "new" }),
      );
      expect(result?.items[0].groupLabel).toBeNull();
    });
    it("falls back to ownerLabel key when ownerDisplayName is absent", () => {
      const result = adaptLeadListResult(
        listWrap({
          id: "LEAD-OG4",
          status: "following",
          ownerLabel: "Fallback Owner",
        }),
      );
      expect(result?.items[0].ownerLabel).toBe("Fallback Owner");
    });

    it("prefers ownerDisplayName over ownerLabel", () => {
      const result = adaptLeadListResult(
        listWrap({
          id: "LEAD-OG5",
          status: "following",
          ownerDisplayName: "Server Name",
          ownerLabel: "Fallback",
        }),
      );
      expect(result?.items[0].ownerLabel).toBe("Server Name");
    });
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
      expect(result?.logs[0]).toMatchObject({
        type: "status",
        fromValue: "—",
        toValue: "新咨询",
        chipClass: "bg-amber-100 text-amber-700",
        operator: "管理员",
      });
    });

    it("renders converted_case as conversion with linkHref", () => {
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
      expect(log).toMatchObject({
        type: "conversion",
        toValue: "已建案件：case-001",
        fromValue: "—",
        linkHref: "#/cases/case-001",
      });
    });
  });

  describe("readLeadClassification — source field priority (A-1)", () => {
    const listSource = (o: Record<string, unknown>) =>
      adaptLeadListResult(listWrap({ id: "LEAD-SRC", ...o }))?.items[0];

    it("prefers sourceChannel over source", () => {
      expect(
        listSource({ sourceChannel: "web", source: "admin" })?.source,
      ).toBe("web");
    });
    it("falls back to source when sourceChannel absent", () => {
      expect(listSource({ source: "referral" })?.source).toBe("referral");
    });
    it("uses sourceLabel when present", () => {
      expect(
        listSource({ sourceChannel: "web", sourceLabel: "网站表单" })
          ?.sourceLabel,
      ).toBe("网站表单");
    });
  });
});
