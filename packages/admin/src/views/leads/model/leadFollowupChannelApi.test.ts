import { describe, expect, it } from "vitest";
import { adaptLeadDetailAggregate } from "./LeadAdapterMappers";
import {
  buildBulkFollowupPayload,
  buildLeadFollowupPayload,
} from "./LeadAdapterWriteBuilders";
import {
  mapLeadFollowupChannelFromApi,
  mapLeadFollowupChannelToApi,
} from "./leadFollowupChannelApi";

describe("leadFollowupChannelApi", () => {
  it("maps UI channels to REST values accepted by the server", () => {
    expect(mapLeadFollowupChannelToApi("meeting")).toBe("onsite");
    expect(mapLeadFollowupChannelToApi("im")).toBe("other");
    expect(mapLeadFollowupChannelToApi("phone")).toBe("phone");
    expect(mapLeadFollowupChannelToApi("email")).toBe("email");
  });

  it("maps API channels back to UI buckets", () => {
    expect(mapLeadFollowupChannelFromApi("onsite")).toBe("meeting");
    expect(mapLeadFollowupChannelFromApi("other")).toBe("im");
    expect(mapLeadFollowupChannelFromApi("wechat")).toBe("im");
  });

  it("adaptLeadDetailAggregate normalizes onsite followup to meeting", () => {
    const result = adaptLeadDetailAggregate({
      lead: { id: "LEAD-T", name: "T", status: "new" },
      followups: [
        {
          channel: "onsite",
          summary: "到访大阪办公室",
          createdAt: "",
        },
      ],
      logs: [],
    });
    expect(result?.detail.followups[0].channel).toBe("meeting");
    expect(result?.detail.followups[0].channelLabel).toBe("面谈");
  });

  it("buildLeadFollowupPayload sends onsite for meeting", () => {
    const payload = buildLeadFollowupPayload({
      channel: "meeting",
      summary: "面談",
    });
    expect(payload.channel).toBe("onsite");
  });

  it("buildBulkFollowupPayload sends other for im", () => {
    const payload = buildBulkFollowupPayload({
      leadIds: ["a"],
      channel: "im",
      summary: "Lineで連絡",
    });
    expect(payload.channel).toBe("other");
  });
});
