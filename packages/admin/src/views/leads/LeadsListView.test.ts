import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../../i18n";
import { getLeadSamples } from "./fixtures";
import type { LeadRepository } from "./model/LeadRepository";
import LeadsListView from "./LeadsListView.vue";

type ListViewRepository = Pick<
  LeadRepository,
  | "listLeads"
  | "bulkAssign"
  | "bulkFollowup"
  | "bulkStatus"
  | "bulkTags"
  | "bulkExport"
  | "createLead"
  | "dedup"
>;

const mockedRepository = vi.hoisted(() => ({
  current: null as ListViewRepository | null,
}));

vi.mock("./model/LeadRepository", () => ({
  createLeadRepository: vi.fn(() => mockedRepository.current),
}));

function createRepository(
  overrides: Partial<ListViewRepository> = {},
): ListViewRepository {
  return {
    listLeads: vi
      .fn()
      .mockResolvedValue({ items: [getLeadSamples("en-US")[0]!], total: 1 }),
    bulkAssign: vi
      .fn()
      .mockResolvedValue({ success: 1, failed: 0, skipped: 0 }),
    bulkFollowup: vi
      .fn()
      .mockResolvedValue({ success: 1, failed: 0, skipped: 0 }),
    bulkStatus: vi
      .fn()
      .mockResolvedValue({ success: 1, failed: 0, skipped: 0 }),
    bulkTags: vi.fn().mockResolvedValue({ success: 1, failed: 0, skipped: 0 }),
    bulkExport: vi
      .fn()
      .mockResolvedValue({ success: 1, failed: 0, skipped: 0 }),
    createLead: vi.fn().mockResolvedValue({ id: "lead-new" }),
    dedup: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

async function mountView(initialPath = "/leads") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/leads", component: LeadsListView }],
  });

  await router.push(initialPath);
  await router.isReady();

  const wrapper = mount(LeadsListView, {
    global: {
      plugins: [i18n, router],
      stubs: { teleport: true },
    },
  });

  await flushPromises();
  return { wrapper, router };
}

describe("LeadsListView", () => {
  beforeEach(() => {
    setAppLocale("en-US");
    window.localStorage.clear();
  });

  afterEach(() => {
    mockedRepository.current = null;
  });

  it("opens create modal when mounted with /leads?action=new and clears the entry query", async () => {
    mockedRepository.current = createRepository();

    const { wrapper, router } = await mountView("/leads?action=new");

    expect(wrapper.find(".lead-modal").exists()).toBe(true);
    expect(router.currentRoute.value.path).toBe("/leads");
    expect(router.currentRoute.value.query).toEqual({});
  });

  it("opens create modal when action=new is pushed onto the current leads route", async () => {
    mockedRepository.current = createRepository();

    const { wrapper, router } = await mountView();
    expect(wrapper.find(".lead-modal").exists()).toBe(false);

    await router.push({ path: "/leads", query: { action: "new" } });
    await flushPromises();

    expect(wrapper.find(".lead-modal").exists()).toBe(true);
    expect(router.currentRoute.value.query).toEqual({});
  });
});
