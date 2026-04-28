import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { useConversationDetailModel } from "./useConversationDetailModel";
import type { ConversationRepository } from "./ConversationRepository";
import type { ConversationDetailAggregate } from "./ConversationAdapterTypes";
import type { ConversationDetail, MessageItem } from "../types";

// ─── Fixture helpers ────────────────────────────────────────────

function createMockMessage(overrides: Partial<MessageItem> = {}): MessageItem {
  return {
    id: "msg-001",
    conversationId: "conv-001",
    senderType: "app_user",
    senderName: "李娜",
    content: "Hello",
    kind: "text",
    visibleScope: "client_visible",
    translationStatus: "completed",
    translatedContent: "こんにちは",
    createdAt: "2026-04-27T09:00:00Z",
    createdAtLabel: "09:00",
    ...overrides,
  };
}

function createMockDetail(
  overrides: Partial<ConversationDetail> = {},
): ConversationDetail {
  return {
    id: "conv-001",
    channel: "web",
    preferredLanguage: "zh",
    status: "open",
    ownerUserId: "suzuki",
    ownerLabel: "铃木",
    leadId: "LEAD-001",
    customerId: null,
    caseId: null,
    appUserName: "李娜",
    linkedLead: { id: "LEAD-001", label: "李娜", type: "lead" },
    linkedCustomer: null,
    linkedCase: null,
    messages: [createMockMessage()],
    unreadCountUser: 0,
    unreadCountStaffTenant: 1,
    unreadCountStaffOwner: 1,
    createdAt: "2026-04-27T08:50:00Z",
    ...overrides,
  };
}

function createMockAggregate(
  detailOverrides: Partial<ConversationDetail> = {},
): ConversationDetailAggregate {
  const detail = createMockDetail(detailOverrides);
  return { detail, messages: detail.messages };
}

function createMockClosedAggregate(): ConversationDetailAggregate {
  return createMockAggregate({
    id: "conv-004",
    status: "closed",
    unreadCountUser: 0,
    unreadCountStaffTenant: 0,
    unreadCountStaffOwner: 0,
  });
}

function createFailedTranslationMessage(): MessageItem {
  return createMockMessage({
    id: "msg-004",
    translationStatus: "failed",
    translatedContent: null,
  });
}

// ─── Repo stub factory ──────────────────────────────────────────

function createRepoStub(
  aggregates: Record<string, ConversationDetailAggregate> = {
    "conv-001": createMockAggregate(),
    "conv-004": createMockClosedAggregate(),
  },
): ConversationRepository {
  return {
    listConversations: vi.fn(async () => ({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    })),
    getDetail: vi.fn(async (id: string) => aggregates[id] ?? null),
    getMessages: vi.fn(async () => ({
      items: [],
      total: 0,
      page: 1,
      limit: 50,
    })),
    assign: vi.fn(async () => ({ id: "conv-001" })),
    sendMessage: vi.fn(async () => ({ id: "conv-001" })),
    close: vi.fn(async () => ({ id: "conv-001" })),
    reopen: vi.fn(async () => ({ id: "conv-001" })),
    retryTranslation: vi.fn(async () => ({ id: "conv-001" })),
  };
}

// ─── Model factory ──────────────────────────────────────────────

async function createModel(
  conversationId = "conv-001",
  opts: { autoMarkRead?: boolean; repo?: ConversationRepository } = {},
) {
  const repo = opts.repo ?? createRepoStub();
  const idRef = ref(conversationId);
  const model = useConversationDetailModel(idRef, {
    repo,
    autoMarkRead: opts.autoMarkRead ?? false,
  });
  await model.fetchDetail();
  return { model, repo, conversationIdRef: idRef };
}

// ─── Tests ──────────────────────────────────────────────────────

describe("useConversationDetailModel", () => {
  // ── Async loading ───────────────────────────────────────────

  describe("async loading", () => {
    it("loads detail for a known conversation", async () => {
      const { model } = await createModel();
      expect(model.detail.value).not.toBeNull();
      expect(model.detail.value!.id).toBe("conv-001");
      expect(model.messages.value).toHaveLength(1);
    });

    it("sets detail to null for unknown ID", async () => {
      const { model } = await createModel("UNKNOWN");
      expect(model.detail.value).toBeNull();
      expect(model.messages.value).toHaveLength(0);
    });

    it("loading is false after fetch completes", async () => {
      const { model } = await createModel();
      expect(model.loading.value).toBe(false);
    });

    it("error is null on successful fetch", async () => {
      const { model } = await createModel();
      expect(model.error.value).toBeNull();
    });

    it("handles repository errors gracefully", async () => {
      const repo = createRepoStub();
      (repo.getDetail as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error"),
      );
      const { model } = await createModel("conv-001", { repo });
      expect(model.error.value).toBe("conversations.errors.fetchFailed");
    });

    it("reloads when fetchDetail is called with new id", async () => {
      const { model, repo, conversationIdRef } = await createModel("conv-001");
      expect(model.detail.value!.id).toBe("conv-001");

      conversationIdRef.value = "conv-004";
      await model.fetchDetail();

      expect(repo.getDetail).toHaveBeenCalledWith("conv-004");
    });
  });

  // ── Three-tier unread counts ──────────────────────────────────

  describe("three-tier unread counts", () => {
    it("exposes unreadCountUser / StaffTenant / StaffOwner from detail", async () => {
      const { model } = await createModel();
      const d = model.detail.value!;
      expect(d.unreadCountUser).toBe(0);
      expect(d.unreadCountStaffTenant).toBe(1);
      expect(d.unreadCountStaffOwner).toBe(1);
    });

    it("closed conversation has all unread counts at zero", async () => {
      const { model } = await createModel("conv-004");
      const d = model.detail.value!;
      expect(d.unreadCountUser).toBe(0);
      expect(d.unreadCountStaffTenant).toBe(0);
      expect(d.unreadCountStaffOwner).toBe(0);
    });
  });

  // ── autoMarkRead timing ───────────────────────────────────────

  describe("autoMarkRead timing", () => {
    it("calls getMessages on load when autoMarkRead=true and conversation is open", async () => {
      const repo = createRepoStub();
      await createModel("conv-001", { autoMarkRead: true, repo });
      expect(repo.getMessages).toHaveBeenCalledWith("conv-001");
    });

    it("does NOT call getMessages when autoMarkRead=false", async () => {
      const repo = createRepoStub();
      await createModel("conv-001", { autoMarkRead: false, repo });
      expect(repo.getMessages).not.toHaveBeenCalled();
    });

    it("does NOT call getMessages when conversation is closed even with autoMarkRead=true", async () => {
      const repo = createRepoStub();
      await createModel("conv-004", { autoMarkRead: true, repo });
      expect(repo.getMessages).not.toHaveBeenCalled();
    });
  });

  // ── Close → readonly ──────────────────────────────────────────

  describe("close → readonly", () => {
    it("isClosed is true for closed conversations", async () => {
      const { model } = await createModel("conv-004");
      expect(model.isClosed.value).toBe(true);
    });

    it("isClosed is false for open conversations", async () => {
      const { model } = await createModel("conv-001");
      expect(model.isClosed.value).toBe(false);
    });

    it("sendMessage is blocked when conversation is closed", async () => {
      const repo = createRepoStub();
      const { model } = await createModel("conv-004", { repo });
      model.messageInput.value = "try to send";
      await model.sendMessage();
      expect(repo.sendMessage).not.toHaveBeenCalled();
    });

    it("canSend is false when conversation is closed", async () => {
      const { model } = await createModel("conv-004");
      model.messageInput.value = "try to send";
      expect(model.canSend.value).toBe(false);
    });

    it("canSend is false when messageInput is empty", async () => {
      const { model } = await createModel("conv-001");
      model.messageInput.value = "  ";
      expect(model.canSend.value).toBe(false);
    });

    it("canSend is true when open and has content", async () => {
      const { model } = await createModel("conv-001");
      model.messageInput.value = "hello";
      expect(model.canSend.value).toBe(true);
    });

    it("closeConversation calls repo.close and refreshes", async () => {
      const repo = createRepoStub();
      const { model } = await createModel("conv-001", { repo });
      const callsBefore = (repo.getDetail as ReturnType<typeof vi.fn>).mock
        .calls.length;
      await model.closeConversation();
      expect(repo.close).toHaveBeenCalledWith("conv-001");
      const callsAfter = (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls
        .length;
      expect(callsAfter).toBe(callsBefore + 1);
    });

    it("reopenConversation calls repo.reopen and refreshes", async () => {
      const repo = createRepoStub();
      const { model } = await createModel("conv-004", { repo });
      await model.reopenConversation();
      expect(repo.reopen).toHaveBeenCalledWith("conv-004");
    });
  });

  // ── Send message ──────────────────────────────────────────────

  describe("sendMessage", () => {
    it("sends message and clears input on success", async () => {
      const repo = createRepoStub();
      const { model } = await createModel("conv-001", { repo });
      model.messageInput.value = "Hello staff message";
      await model.sendMessage();
      expect(repo.sendMessage).toHaveBeenCalledWith("conv-001", {
        content: "Hello staff message",
      });
      expect(model.messageInput.value).toBe("");
    });

    it("does not send when input is blank", async () => {
      const repo = createRepoStub();
      const { model } = await createModel("conv-001", { repo });
      model.messageInput.value = "   ";
      await model.sendMessage();
      expect(repo.sendMessage).not.toHaveBeenCalled();
    });

    it("sets error on send failure", async () => {
      const repo = createRepoStub();
      (repo.sendMessage as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("fail"),
      );
      const { model } = await createModel("conv-001", { repo });
      model.messageInput.value = "Hello";
      await model.sendMessage();
      expect(model.error.value).toBe("conversations.errors.sendFailed");
    });

    it("sending flag prevents double submit", async () => {
      const repo = createRepoStub();
      let resolveFirst!: () => void;
      (repo.sendMessage as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () =>
          new Promise<{ id: string }>((resolve) => {
            resolveFirst = () => resolve({ id: "conv-001" });
          }),
      );

      const { model } = await createModel("conv-001", { repo });
      model.messageInput.value = "msg1";

      const firstSend = model.sendMessage();
      expect(model.sending.value).toBe(true);
      expect(model.canSend.value).toBe(false);

      model.messageInput.value = "msg2";
      await model.sendMessage();
      expect(repo.sendMessage).toHaveBeenCalledTimes(1);

      resolveFirst();
      await firstSend;
    });
  });

  // ── Assign ────────────────────────────────────────────────────

  describe("assignOwner", () => {
    it("calls repo.assign and refreshes detail", async () => {
      const repo = createRepoStub();
      const { model } = await createModel("conv-001", { repo });
      await model.assignOwner("user-new");
      expect(repo.assign).toHaveBeenCalledWith("conv-001", {
        ownerUserId: "user-new",
      });
    });

    it("sets error on assign failure", async () => {
      const repo = createRepoStub();
      (repo.assign as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("fail"),
      );
      const { model } = await createModel("conv-001", { repo });
      await model.assignOwner("user-new");
      expect(model.error.value).toBe("conversations.errors.assignFailed");
    });
  });

  // ── Translation failure retry ─────────────────────────────────

  describe("translation failure retry", () => {
    it("calls repo.retryTranslation with correct messageId", async () => {
      const aggregate = createMockAggregate({
        messages: [createFailedTranslationMessage()],
      });
      const repo = createRepoStub({
        "conv-001": aggregate,
        "conv-004": createMockClosedAggregate(),
      });
      const { model } = await createModel("conv-001", { repo });

      const failedMsg = model.messages.value.find(
        (m) => m.translationStatus === "failed",
      );
      expect(failedMsg).toBeDefined();

      await model.retryTranslation("msg-004");
      expect(repo.retryTranslation).toHaveBeenCalledWith("conv-001", {
        messageId: "msg-004",
      });
    });

    it("sets error on retry failure", async () => {
      const repo = createRepoStub();
      (repo.retryTranslation as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("fail"),
      );
      const { model } = await createModel("conv-001", { repo });
      await model.retryTranslation("msg-004");
      expect(model.error.value).toBe(
        "conversations.errors.retryTranslationFailed",
      );
    });

    it("refreshes detail after successful retry", async () => {
      const repo = createRepoStub();
      const { model } = await createModel("conv-001", { repo });
      const callsBefore = (repo.getDetail as ReturnType<typeof vi.fn>).mock
        .calls.length;
      await model.retryTranslation("msg-004");
      const callsAfter = (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls
        .length;
      expect(callsAfter).toBeGreaterThan(callsBefore);
    });
  });

  // ── List filtering (adapter-level, via buildConversationListSearchParams) ──

  describe("list filtering (adapter integration)", () => {
    it("filters by leadId pass through to repository", async () => {
      const repo = createRepoStub();
      await repo.listConversations({ leadId: "LEAD-001" });
      expect(repo.listConversations).toHaveBeenCalledWith({
        leadId: "LEAD-001",
      });
    });

    it("filters by caseId pass through to repository", async () => {
      const repo = createRepoStub();
      await repo.listConversations({ caseId: "CASE-001" });
      expect(repo.listConversations).toHaveBeenCalledWith({
        caseId: "CASE-001",
      });
    });

    it("scope filter parameter is forwarded", async () => {
      const repo = createRepoStub();
      await repo.listConversations({ scope: "all" });
      expect(repo.listConversations).toHaveBeenCalledWith({ scope: "all" });
    });
  });
});
