import { describe, expect, it } from "vitest";
import { adaptCaseMessageDto } from "./CaseCommsLogsAdapter";
import { buildCaseTimelineMessageResult } from "./CaseCommsTimelineBuilders";

function makeLog(channelType: string, visibleToClient: boolean) {
  return {
    id: "comm-r27b",
    channelType,
    visibleToClient,
    contentSummary: "test",
    createdByDisplayName: "Tester",
    createdAt: "2026-05-03T03:39:36.420Z",
  };
}

describe("CaseCommsLogsAdapter — R27-B typeLabelKey i18n keys", () => {
  it("internal → cases.detail.messages.types.internal", () => {
    const result = adaptCaseMessageDto(makeLog("wechat", false));
    expect(result).not.toBeNull();
    expect(result!.typeLabelKey).toBe("cases.detail.messages.types.internal");
  });

  it("client_visible → cases.detail.messages.types.client_visible", () => {
    const result = adaptCaseMessageDto(makeLog("wechat", true));
    expect(result).not.toBeNull();
    expect(result!.typeLabelKey).toBe(
      "cases.detail.messages.types.client_visible",
    );
  });

  it("phone → cases.detail.messages.types.phone", () => {
    const result = adaptCaseMessageDto(makeLog("phone", false));
    expect(result).not.toBeNull();
    expect(result!.typeLabelKey).toBe("cases.detail.messages.types.phone");
  });

  it("meeting → cases.detail.messages.types.meeting", () => {
    const result = adaptCaseMessageDto(makeLog("meeting", false));
    expect(result).not.toBeNull();
    expect(result!.typeLabelKey).toBe("cases.detail.messages.types.meeting");
  });

  it("auto_email → cases.detail.messages.types.auto_email", () => {
    const result = adaptCaseMessageDto(makeLog("email", false));
    expect(result).not.toBeNull();
    expect(result!.typeLabelKey).toBe("cases.detail.messages.types.auto_email");
  });

  it("typeLabelKey matches pattern cases.detail.messages.types.<type>", () => {
    const types = [
      { channel: "wechat", visible: false, expected: "internal" },
      { channel: "wechat", visible: true, expected: "client_visible" },
      { channel: "phone", visible: false, expected: "phone" },
      { channel: "meeting", visible: true, expected: "meeting" },
      { channel: "email", visible: false, expected: "auto_email" },
    ] as const;

    for (const { channel, visible, expected } of types) {
      const result = adaptCaseMessageDto(makeLog(channel, visible));
      expect(result!.typeLabelKey).toBe(
        `cases.detail.messages.types.${expected}`,
      );
    }
  });

  it("deprecated typeLabel still provides display strings for backward compat", () => {
    const result = adaptCaseMessageDto(makeLog("phone", false));
    expect(result!.typeLabel).toBe("電話記録");
  });
});

describe("R27-B: communication_log.created timeline suffixKey i18n fallback", () => {
  it("known channel 'phone' → suffixKey resolves to messages.types.phone", () => {
    const result = buildCaseTimelineMessageResult("communication_log.created", {
      channelType: "phone",
    });
    expect(result.params).toEqual({
      suffix: "phone",
      suffixKey: "cases.detail.messages.types.phone",
    });
  });

  it("known channel 'meeting' → suffixKey resolves to messages.types.meeting", () => {
    const result = buildCaseTimelineMessageResult("communication_log.created", {
      channelType: "meeting",
    });
    expect(result.params?.suffixKey).toBe(
      "cases.detail.messages.types.meeting",
    );
  });

  it("known channel 'email' → suffixKey resolves to messages.types.auto_email", () => {
    const result = buildCaseTimelineMessageResult("communication_log.created", {
      channelType: "email",
    });
    expect(result.params?.suffixKey).toBe(
      "cases.detail.messages.types.auto_email",
    );
  });

  it("channel 'other' → suffixKey resolves to messages.types.other", () => {
    const result = buildCaseTimelineMessageResult("communication_log.created", {
      channelType: "other",
    });
    expect(result.params).toEqual({
      suffix: "other",
      suffixKey: "cases.detail.messages.types.other",
    });
  });

  it("unknown channel 'wechat' → suffixKey falls back to messages.types.other", () => {
    const result = buildCaseTimelineMessageResult("communication_log.created", {
      channelType: "wechat",
    });
    expect(result.params?.suffixKey).toBe("cases.detail.messages.types.other");
  });

  it("empty channel → suffixKey is empty string", () => {
    const result = buildCaseTimelineMessageResult(
      "communication_log.created",
      {},
    );
    expect(result.params).toEqual({ suffix: "", suffixKey: "" });
  });
});
