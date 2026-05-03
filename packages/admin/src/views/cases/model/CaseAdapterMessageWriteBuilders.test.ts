import { describe, it, expect } from "vitest";
import {
  buildCreateCommunicationLogPayload,
  buildCommunicationLogsPostUrl,
  type CommunicationLogCreateInput,
  type MessageChannelChoice,
} from "./CaseAdapterMessageWriteBuilders";

describe("buildCreateCommunicationLogPayload", () => {
  const BASE: CommunicationLogCreateInput = {
    caseId: "case-001",
    channelChoice: "internal",
    content: "メモ内容",
  };

  it("internal → channelType=other, visibleToClient=false", () => {
    const payload = buildCreateCommunicationLogPayload(BASE);
    expect(payload).toEqual({
      caseId: "case-001",
      channelType: "other",
      visibleToClient: false,
      direction: "outbound",
      contentSummary: "メモ内容",
    });
  });

  it("client_visible → channelType=other, visibleToClient=true", () => {
    const payload = buildCreateCommunicationLogPayload({
      ...BASE,
      channelChoice: "client_visible",
    });
    expect(payload.channelType).toBe("other");
    expect(payload.visibleToClient).toBe(true);
  });

  it("phone → channelType=phone, visibleToClient=false", () => {
    const payload = buildCreateCommunicationLogPayload({
      ...BASE,
      channelChoice: "phone",
    });
    expect(payload.channelType).toBe("phone");
    expect(payload.visibleToClient).toBe(false);
  });

  it("meeting → channelType=meeting, visibleToClient=false", () => {
    const payload = buildCreateCommunicationLogPayload({
      ...BASE,
      channelChoice: "meeting",
    });
    expect(payload.channelType).toBe("meeting");
    expect(payload.visibleToClient).toBe(false);
  });

  it("all 4 channel choices produce valid payloads", () => {
    const choices: MessageChannelChoice[] = [
      "internal",
      "client_visible",
      "phone",
      "meeting",
    ];
    for (const choice of choices) {
      const payload = buildCreateCommunicationLogPayload({
        ...BASE,
        channelChoice: choice,
      });
      expect(payload.caseId).toBe("case-001");
      expect(typeof payload.channelType).toBe("string");
      expect(typeof payload.visibleToClient).toBe("boolean");
      expect(payload.contentSummary).toBe("メモ内容");
    }
  });
});

describe("buildCommunicationLogsPostUrl", () => {
  it("derives /api/communication-logs from /api/cases", () => {
    expect(buildCommunicationLogsPostUrl("/api/cases")).toBe(
      "/api/communication-logs",
    );
  });

  it("handles trailing slash", () => {
    expect(buildCommunicationLogsPostUrl("/api/cases/")).toBe(
      "/api/communication-logs",
    );
  });
});
