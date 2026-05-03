import { describe, expect, it } from "vitest";
import {
  adaptCaseMessageDto,
  adaptCaseMessageListResult,
} from "./CaseCommsLogsAdapter";

const BASE_RECORD = {
  id: "comm-r27c",
  channelType: "phone",
  visibleToClient: false,
  contentSummary: "time format test",
  createdByDisplayName: "Tester",
  createdAt: "2026-05-03T03:39:36.420Z",
};

describe("CaseCommsLogsAdapter — R27-C time formatting", () => {
  it("formats time for zh-CN locale", () => {
    const result = adaptCaseMessageDto(BASE_RECORD, "zh-CN");
    expect(result).not.toBeNull();
    expect(result!.time).toMatch(/2026\/05\/03\s?\d{2}:\d{2}/);
    expect(result!.timeIso).toBe("2026-05-03T03:39:36.420Z");
  });

  it("formats time for ja-JP locale", () => {
    const result = adaptCaseMessageDto(BASE_RECORD, "ja-JP");
    expect(result).not.toBeNull();
    expect(result!.time).toMatch(/2026\/05\/03\s?\d{2}:\d{2}/);
    expect(result!.timeIso).toBe("2026-05-03T03:39:36.420Z");
  });

  it("formats time for en-US locale", () => {
    const result = adaptCaseMessageDto(BASE_RECORD, "en-US");
    expect(result).not.toBeNull();
    expect(result!.time).toMatch(/05\/03\/2026/);
    expect(result!.timeIso).toBe("2026-05-03T03:39:36.420Z");
  });

  it("falls back to raw ISO when locale is not provided", () => {
    const result = adaptCaseMessageDto(BASE_RECORD);
    expect(result).not.toBeNull();
    expect(result!.time).toBe("2026-05-03T03:39:36.420Z");
    expect(result!.timeIso).toBe("2026-05-03T03:39:36.420Z");
  });

  it("falls back to raw ISO when locale is undefined", () => {
    const result = adaptCaseMessageDto(BASE_RECORD, undefined);
    expect(result).not.toBeNull();
    expect(result!.time).toBe("2026-05-03T03:39:36.420Z");
    expect(result!.timeIso).toBe("2026-05-03T03:39:36.420Z");
  });

  it("adaptCaseMessageListResult passes locale through", () => {
    const list = [BASE_RECORD];
    const result = adaptCaseMessageListResult(list, "zh-CN");
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].time).toMatch(/2026\/05\/03\s?\d{2}:\d{2}/);
    expect(result![0].timeIso).toBe("2026-05-03T03:39:36.420Z");
  });

  it("adaptCaseMessageListResult works without locale (backward compat)", () => {
    const list = [BASE_RECORD];
    const result = adaptCaseMessageListResult(list);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].time).toBe("2026-05-03T03:39:36.420Z");
  });
});
