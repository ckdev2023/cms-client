import { describe, it, expect } from "vitest";
import {
  adaptConversationDetailAggregate,
  adaptConversationListResult,
} from "./ConversationAdapterMappers";

// ─── Server-shaped nested payload ────────────────────────────────

function createNestedDetailPayload(overrides: Record<string, unknown> = {}) {
  return {
    conversation: {
      id: "conv-001",
      channel: "web",
      preferredLanguage: "zh",
      status: "open",
      ownerUserId: "user-suzuki",
      ownerLabel: "",
      leadId: "LEAD-001",
      customerId: null,
      caseId: null,
      unreadCountUser: 0,
      unreadCountStaffTenant: 2,
      unreadCountStaffOwner: 1,
      lastMessageAt: "2026-04-27T09:30:00Z",
      createdAt: "2026-04-27T08:50:00Z",
      updatedAt: "2026-04-27T09:30:00Z",
    },
    lead: { id: "LEAD-001", name: "李娜", status: "following" },
    customer: null,
    case: null,
    appUser: { id: "au-001", name: "李娜", preferredLanguage: "zh" },
    ...overrides,
  };
}

describe("adaptConversationDetailAggregate", () => {
  it("reads conversation fields from the nested conversation object", () => {
    const result = adaptConversationDetailAggregate(
      createNestedDetailPayload(),
    );

    expect(result).not.toBeNull();
    const { detail } = result!;
    expect(detail.id).toBe("conv-001");
    expect(detail.channel).toBe("web");
    expect(detail.preferredLanguage).toBe("zh");
    expect(detail.status).toBe("open");
    expect(detail.ownerUserId).toBe("user-suzuki");
    expect(detail.leadId).toBe("LEAD-001");
    expect(detail.customerId).toBeNull();
    expect(detail.caseId).toBeNull();
    expect(detail.unreadCountUser).toBe(0);
    expect(detail.unreadCountStaffTenant).toBe(2);
    expect(detail.unreadCountStaffOwner).toBe(1);
    expect(detail.createdAt).toBe("2026-04-27T08:50:00Z");
  });

  it("reads appUserName from the nested appUser object", () => {
    const result = adaptConversationDetailAggregate(
      createNestedDetailPayload(),
    );

    expect(result!.detail.appUserName).toBe("李娜");
  });

  it("builds linkedLead from the nested lead object", () => {
    const result = adaptConversationDetailAggregate(
      createNestedDetailPayload(),
    );

    expect(result!.detail.linkedLead).toEqual({
      id: "LEAD-001",
      label: "李娜",
      type: "lead",
    });
  });

  it("builds linkedCustomer from the nested customer object", () => {
    const result = adaptConversationDetailAggregate(
      createNestedDetailPayload({
        customer: { id: "CUST-001", name: "佐藤太郎" },
      }),
    );

    expect(result!.detail.linkedCustomer).toEqual({
      id: "CUST-001",
      label: "佐藤太郎",
      type: "customer",
    });
  });

  it("builds linkedCase from the nested case object with caseNo as label", () => {
    const result = adaptConversationDetailAggregate(
      createNestedDetailPayload({
        case: { id: "CASE-001", caseNo: "C-2026-0042" },
      }),
    );

    expect(result!.detail.linkedCase).toEqual({
      id: "CASE-001",
      label: "C-2026-0042",
      type: "case",
    });
  });

  it("returns null linkedLead/Customer/Case when server returns null", () => {
    const result = adaptConversationDetailAggregate(
      createNestedDetailPayload({
        lead: null,
        customer: null,
        case: null,
      }),
    );

    expect(result!.detail.linkedLead).toBeNull();
    expect(result!.detail.linkedCustomer).toBeNull();
    expect(result!.detail.linkedCase).toBeNull();
  });

  it("defaults appUserName to empty string when appUser is null", () => {
    const result = adaptConversationDetailAggregate(
      createNestedDetailPayload({ appUser: null }),
    );

    expect(result!.detail.appUserName).toBe("");
  });

  it("does not include messages (messages fetched separately)", () => {
    const result = adaptConversationDetailAggregate(
      createNestedDetailPayload(),
    );

    expect(result).not.toBeNull();
    expect("messages" in result!).toBe(false);
    expect("messages" in result!.detail).toBe(false);
  });

  it("returns null when conversation key is missing", () => {
    const result = adaptConversationDetailAggregate({
      lead: null,
      customer: null,
      case: null,
      appUser: null,
    });

    expect(result).toBeNull();
  });

  it("returns null when conversation.id is missing", () => {
    const result = adaptConversationDetailAggregate({
      conversation: { status: "open", channel: "web" },
      lead: null,
      customer: null,
      case: null,
      appUser: null,
    });

    expect(result).toBeNull();
  });

  it("handles closed status correctly", () => {
    const payload = createNestedDetailPayload();
    (payload.conversation as Record<string, unknown>).status = "closed";
    const result = adaptConversationDetailAggregate(payload);

    expect(result!.detail.status).toBe("closed");
  });

  it("defaults invalid status to open", () => {
    const payload = createNestedDetailPayload();
    (payload.conversation as Record<string, unknown>).status = "invalid_status";
    const result = adaptConversationDetailAggregate(payload);

    expect(result!.detail.status).toBe("open");
  });
});

describe("adaptConversationListResult", () => {
  it("returns null for non-object input", () => {
    expect(adaptConversationListResult(null)).toBeNull();
    expect(adaptConversationListResult("string")).toBeNull();
  });

  it("parses a valid list result", () => {
    const result = adaptConversationListResult({
      items: [
        {
          id: "conv-001",
          channel: "web",
          preferredLanguage: "zh",
          status: "open",
          ownerUserId: null,
          ownerLabel: "",
          lastMessagePreview: "Hello",
          lastMessageAt: "",
          unreadCountUser: 0,
          unreadCountStaffTenant: 1,
          unreadCountStaffOwner: 0,
          linkedEntity: null,
          appUserName: "Test",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].id).toBe("conv-001");
    expect(result!.total).toBe(1);
  });
});
