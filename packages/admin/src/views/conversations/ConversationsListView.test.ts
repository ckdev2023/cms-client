import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";

import { i18n, setAppLocale } from "../../i18n";
import ConversationFilters from "./components/ConversationFilters.vue";
import { SAMPLE_CONVERSATION_LIST } from "./fixtures";
import type { ConversationRepository } from "./model/ConversationRepository";
import ConversationsListView from "./ConversationsListView.vue";

type ListViewRepository = Pick<ConversationRepository, "listConversations">;

const mockedRepository = vi.hoisted(() => ({
  current: null as ListViewRepository | null,
}));

vi.mock("./model/ConversationRepository", () => ({
  createConversationRepository: vi.fn(() => mockedRepository.current),
}));

function createRepository(
  overrides: Partial<ListViewRepository> = {},
): ListViewRepository {
  return {
    listConversations: vi.fn().mockResolvedValue({
      items: [SAMPLE_CONVERSATION_LIST[0]!],
      total: 1,
      page: 1,
      limit: 20,
    }),
    ...overrides,
  };
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/conversations", component: ConversationsListView },
      { path: "/conversations/:id", component: { template: "<div />" } },
    ],
  });

  await router.push("/conversations");
  await router.isReady();

  const wrapper = mount(ConversationsListView, {
    global: {
      plugins: [i18n, router],
      stubs: { teleport: true },
    },
  });

  await flushPromises();
  return { wrapper };
}

describe("ConversationsListView", () => {
  beforeEach(() => {
    setAppLocale("en-US");
    window.localStorage.clear();
  });

  afterEach(() => {
    mockedRepository.current = null;
  });

  it("loads conversations from repository and renders the row", async () => {
    const repository = createRepository();
    mockedRepository.current = repository;

    const { wrapper } = await mountView();

    expect(repository.listConversations).toHaveBeenCalledWith({
      scope: "mine",
      search: undefined,
      status: undefined,
      ownerUserId: undefined,
      unreadOnly: undefined,
      customerId: undefined,
      caseId: undefined,
      leadId: undefined,
      page: 1,
      limit: 20,
    });
    expect(wrapper.findAll(".conv-list-view__row")).toHaveLength(1);
    expect(wrapper.text()).toContain("李娜");
  });

  it("clears stale rows and shows only error state when refresh fails", async () => {
    const repository = createRepository({
      listConversations: vi
        .fn()
        .mockResolvedValueOnce({
          items: [SAMPLE_CONVERSATION_LIST[0]!],
          total: 1,
          page: 1,
          limit: 20,
        })
        .mockRejectedValueOnce(new Error("boom")),
    });
    mockedRepository.current = repository;

    const { wrapper } = await mountView();
    expect(wrapper.findAll(".conv-list-view__row")).toHaveLength(1);

    wrapper.findComponent(ConversationFilters).vm.$emit("update:scope", "all");
    await flushPromises();

    expect(wrapper.find(".conv-list-view__error").exists()).toBe(true);
    expect(wrapper.findAll(".conv-list-view__row")).toHaveLength(0);
    expect(wrapper.find(".conv-list-view__table").exists()).toBe(false);
    expect(wrapper.find(".conv-list-view__empty").exists()).toBe(false);
  });
});
