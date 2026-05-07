import { describe, expect, it, vi } from "vitest";
import {
  ConversationRepositoryError,
  createConversationRepository,
  createConversationTestRuntime,
} from "./ConversationRepository";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function createRequestMock(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response,
) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(input, init),
  ) as unknown as typeof fetch;
}

const MOCK_LIST_ITEM = {
  id: "conv-001",
  channel: "web",
  preferredLanguage: "zh",
  status: "open",
  ownerUserId: "suzuki",
  ownerLabel: "铃木",
  lastMessagePreview: "Hello",
  lastMessageAt: "2026-04-27T09:10:00Z",
  unreadCountUser: 0,
  unreadCountStaffTenant: 1,
  unreadCountStaffOwner: 1,
  linkedEntity: { id: "LEAD-001", label: "李娜", type: "lead" },
  appUserName: "李娜",
};

const MOCK_DETAIL = {
  conversation: {
    id: "conv-001",
    channel: "web",
    preferredLanguage: "zh",
    status: "open",
    ownerUserId: "suzuki",
    ownerLabel: "铃木",
    leadId: "LEAD-001",
    customerId: null,
    caseId: null,
    unreadCountUser: 0,
    unreadCountStaffTenant: 1,
    unreadCountStaffOwner: 1,
    createdAt: "2026-04-27T08:50:00Z",
    updatedAt: "2026-04-27T09:10:00Z",
    lastMessageAt: "2026-04-27T09:10:00Z",
    appUserId: "au-001",
    orgId: "org-1",
  },
  lead: { id: "LEAD-001", name: "李娜", status: "following" },
  customer: null,
  case: null,
  appUser: { id: "au-001", name: "李娜", preferredLanguage: "zh" },
};

const MOCK_MESSAGE = {
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
};

describe("ConversationRepository", () => {
  // ── List ──────────────────────────────────────────────────────

  describe("listConversations", () => {
    it("sends auth header and query params", async () => {
      const request = createRequestMock((input, init) => {
        expect(String(input)).toContain("/api/admin/conversations?");
        expect(String(input)).toContain("status=open");
        expect(String(input)).toContain("scope=mine");
        expect(init?.method).toBe("GET");
        expect(init?.headers).toEqual({
          Accept: "application/json",
          Authorization: "Bearer token-1",
        });
        return jsonResponse({
          items: [MOCK_LIST_ITEM],
          total: 1,
          page: 1,
          limit: 20,
        });
      });
      const repo = createConversationRepository({
        request,
        getToken: () => "token-1",
      });
      const result = await repo.listConversations({
        scope: "mine",
        status: "open",
      });
      expect(result.total).toBe(1);
      expect(result.items[0]?.id).toBe("conv-001");
    });

    it("sends customerId filter", async () => {
      const request = createRequestMock((input) => {
        expect(String(input)).toContain("customerId=cust-001");
        return jsonResponse({ items: [], total: 0, page: 1, limit: 20 });
      });
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      const result = await repo.listConversations({
        customerId: "cust-001",
      });
      expect(result.items).toHaveLength(0);
    });

    it("sends unreadOnly=true when filtering unread", async () => {
      const request = createRequestMock((input) => {
        expect(String(input)).toContain("unreadOnly=true");
        return jsonResponse({ items: [], total: 0, page: 1, limit: 20 });
      });
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      await repo.listConversations({ unreadOnly: true });
    });

    it("omits empty string filters from query", async () => {
      const request = createRequestMock((input) => {
        const url = String(input);
        expect(url).not.toContain("search=");
        expect(url).not.toContain("status=");
        return jsonResponse({ items: [], total: 0, page: 1, limit: 20 });
      });
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      await repo.listConversations({ search: "", status: "" });
    });

    it("omits page/limit when not positive", async () => {
      const request = createRequestMock((input) => {
        const url = String(input);
        expect(url).not.toContain("page=");
        expect(url).not.toContain("limit=");
        return jsonResponse({ items: [], total: 0, page: 1, limit: 20 });
      });
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      await repo.listConversations({ page: 0, limit: 0 });
    });
  });

  // ── Detail ────────────────────────────────────────────────────

  describe("getDetail", () => {
    it("fetches detail by id", async () => {
      const request = createRequestMock((input, init) => {
        expect(String(input)).toBe("/api/admin/conversations/conv-001");
        expect(init?.method).toBe("GET");
        return jsonResponse(MOCK_DETAIL);
      });
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      const result = await repo.getDetail("conv-001");
      expect(result).not.toBeNull();
      expect(result!.detail.id).toBe("conv-001");
      expect(result!.detail.status).toBe("open");
      expect(result!.detail.appUserName).toBe("李娜");
      expect(result!.detail.linkedLead).toEqual({
        id: "LEAD-001",
        label: "李娜",
        type: "lead",
      });
    });

    it("returns null for empty id", async () => {
      const request = createRequestMock(() =>
        jsonResponse({ id: "x", status: "open" }),
      );
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      const result = await repo.getDetail("  ");
      expect(result).toBeNull();
      expect(request).not.toHaveBeenCalled();
    });

    it("exposes three-tier unread counts", async () => {
      const request = createRequestMock(() => jsonResponse(MOCK_DETAIL));
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      const result = await repo.getDetail("conv-001");
      expect(result!.detail.unreadCountUser).toBe(0);
      expect(result!.detail.unreadCountStaffTenant).toBe(1);
      expect(result!.detail.unreadCountStaffOwner).toBe(1);
    });
  });

  // ── Messages ──────────────────────────────────────────────────

  describe("getMessages", () => {
    it("fetches messages with pagination", async () => {
      const request = createRequestMock((input) => {
        expect(String(input)).toContain("/conv-001/messages?");
        expect(String(input)).toContain("page=2");
        expect(String(input)).toContain("limit=10");
        return jsonResponse({
          items: [MOCK_MESSAGE],
          total: 25,
          page: 2,
          limit: 10,
        });
      });
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      const result = await repo.getMessages("conv-001", 2, 10);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(25);
    });

    it("returns empty for blank id", async () => {
      const request = createRequestMock(() =>
        jsonResponse({ items: [], total: 0, page: 1, limit: 50 }),
      );
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      const result = await repo.getMessages("  ");
      expect(result.items).toHaveLength(0);
      expect(request).not.toHaveBeenCalled();
    });
  });

  // ── Assign ────────────────────────────────────────────────────

  describe("assign", () => {
    it("sends PATCH with ownerUserId payload", async () => {
      const request = createRequestMock((input, init) => {
        expect(String(input)).toBe("/api/admin/conversations/conv-001/assign");
        expect(init?.method).toBe("PATCH");
        const body = JSON.parse(init?.body as string);
        expect(body.ownerUserId).toBe("user-123");
        return jsonResponse({ id: "conv-001" });
      });
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      const result = await repo.assign("conv-001", {
        ownerUserId: "user-123",
      });
      expect(result.id).toBe("conv-001");
    });
  });

  // ── Send Message ──────────────────────────────────────────────

  describe("sendMessage", () => {
    it("sends POST with originalText and originalLanguage", async () => {
      const request = createRequestMock((input, init) => {
        expect(String(input)).toBe(
          "/api/admin/conversations/conv-001/messages",
        );
        expect(init?.method).toBe("POST");
        const body = JSON.parse(init?.body as string);
        expect(body.originalText).toBe("Hello from staff");
        expect(body.originalLanguage).toBe("ja");
        expect(body.content).toBeUndefined();
        return jsonResponse({ id: "conv-001" });
      });
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      await repo.sendMessage("conv-001", {
        originalText: "Hello from staff",
        originalLanguage: "ja",
      });
    });

    it("includes kind and visibleScope when provided", async () => {
      const request = createRequestMock((_input, init) => {
        const body = JSON.parse(init?.body as string);
        expect(body.kind).toBe("intake_link");
        expect(body.visibleScope).toBe("internal_only");
        return jsonResponse({ id: "conv-001" });
      });
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      await repo.sendMessage("conv-001", {
        originalText: "link",
        originalLanguage: "ja",
        kind: "intake_link",
        visibleScope: "internal_only",
      });
    });

    it("includes forceOriginal flag", async () => {
      const request = createRequestMock((_input, init) => {
        const body = JSON.parse(init?.body as string);
        expect(body.forceOriginal).toBe(true);
        return jsonResponse({ id: "conv-001" });
      });
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      await repo.sendMessage("conv-001", {
        originalText: "Hello",
        originalLanguage: "ja",
        forceOriginal: true,
      });
    });
  });

  // ── Close / Reopen ────────────────────────────────────────────

  describe("close", () => {
    it("sends PATCH to close path", async () => {
      const request = createRequestMock((input, init) => {
        expect(String(input)).toBe("/api/admin/conversations/conv-001/close");
        expect(init?.method).toBe("PATCH");
        return jsonResponse({ id: "conv-001" });
      });
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      const result = await repo.close("conv-001");
      expect(result.id).toBe("conv-001");
    });
  });

  describe("reopen", () => {
    it("sends PATCH to reopen path", async () => {
      const request = createRequestMock((input, init) => {
        expect(String(input)).toBe("/api/admin/conversations/conv-001/reopen");
        expect(init?.method).toBe("PATCH");
        return jsonResponse({ id: "conv-001" });
      });
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      const result = await repo.reopen("conv-001");
      expect(result.id).toBe("conv-001");
    });
  });

  // ── Retry Translation ─────────────────────────────────────────

  describe("retryTranslation", () => {
    it("sends POST to retry-translation path", async () => {
      const request = createRequestMock((input, init) => {
        expect(String(input)).toBe(
          "/api/admin/conversations/conv-001/messages/msg-004/retry-translation",
        );
        expect(init?.method).toBe("POST");
        return jsonResponse({ id: "conv-001" });
      });
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      const result = await repo.retryTranslation("conv-001", {
        messageId: "msg-004",
      });
      expect(result.id).toBe("conv-001");
    });
  });

  // ── Error handling ────────────────────────────────────────────

  describe("error handling", () => {
    it("throws NETWORK error on fetch failure", async () => {
      const request = vi.fn(async () => {
        throw new TypeError("Network error");
      }) as unknown as typeof fetch;
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      const err = await repo.listConversations({}).catch((e) => e);
      expect(err).toBeInstanceOf(ConversationRepositoryError);
      expect((err as ConversationRepositoryError).code).toBe("NETWORK");
    });

    it("throws UNAUTHORIZED on 401", async () => {
      const request = createRequestMock(() =>
        jsonResponse({ message: "Unauthorized" }, { status: 401 }),
      );
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      const err = await repo.listConversations({}).catch((e) => e);
      expect((err as ConversationRepositoryError).code).toBe("UNAUTHORIZED");
      expect((err as ConversationRepositoryError).status).toBe(401);
    });

    it("throws CONVERSATION_WRITE_ERROR on 400 with errorCode", async () => {
      const request = createRequestMock(() =>
        jsonResponse(
          {
            message: "CONVERSATION_CLOSED: Cannot send",
            errorCode: "CONVERSATION_CLOSED",
          },
          { status: 400 },
        ),
      );
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      const err = await repo
        .sendMessage("conv-001", {
          originalText: "x",
          originalLanguage: "ja",
        })
        .catch((e) => e);
      expect((err as ConversationRepositoryError).code).toBe(
        "CONVERSATION_WRITE_ERROR",
      );
      expect((err as ConversationRepositoryError).serverErrorCode).toBe(
        "CONVERSATION_CLOSED",
      );
    });

    it("throws BAD_RESPONSE on 500", async () => {
      const request = createRequestMock(() =>
        jsonResponse({ message: "Internal error" }, { status: 500 }),
      );
      const repo = createConversationRepository({
        request,
        getToken: () => "t",
      });
      const err = await repo.getDetail("conv-001").catch((e) => e);
      expect((err as ConversationRepositoryError).code).toBe("BAD_RESPONSE");
      expect((err as ConversationRepositoryError).status).toBe(500);
    });
  });

  // ── Test runtime factory ──────────────────────────────────────

  describe("createConversationTestRuntime", () => {
    it("captures request and returns configured response", async () => {
      const { repository, requests, setResponse } =
        createConversationTestRuntime();
      setResponse(
        { items: [MOCK_LIST_ITEM], total: 1, page: 1, limit: 20 },
        200,
      );
      const result = await repository.listConversations({ scope: "all" });
      expect(result.items).toHaveLength(1);
      expect(requests).toHaveLength(1);
      expect(requests[0]?.method).toBe("GET");
      expect(requests[0]?.url).toContain("scope=all");
    });

    it("setError configures error responses", async () => {
      const { repository, setError } = createConversationTestRuntime();
      setError(401, { message: "Unauthorized" });
      await expect(repository.listConversations({})).rejects.toThrow(
        ConversationRepositoryError,
      );
    });
  });
});
