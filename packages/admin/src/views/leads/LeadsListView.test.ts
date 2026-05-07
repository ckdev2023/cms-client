import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../../i18n";
import { initToast, resetToast, useToast } from "../../shared/model/useToast";
import {
  registerUserAliases,
  clearUserAliases,
} from "../../shared/model/useOrgUserOptions";
import { getLeadSamples } from "./fixtures";
import type { LeadSummary } from "./types";
import type { LeadRepository } from "./model/LeadRepository";
import LeadsListView from "./LeadsListView.vue";
import LeadFilters from "./components/LeadFilters.vue";
import LeadTable from "./components/LeadTable.vue";
import LeadBulkActionBar from "./components/LeadBulkActionBar.vue";

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
    bulkAssign: vi.fn().mockResolvedValue({ updatedCount: 1 }),
    bulkFollowup: vi.fn().mockResolvedValue({ updatedCount: 1 }),
    bulkStatus: vi.fn().mockResolvedValue({ updatedCount: 1 }),
    bulkTags: vi.fn().mockResolvedValue({ updatedCount: 1 }),
    bulkExport: vi.fn().mockResolvedValue({ updatedCount: 1 }),
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
    initToast();
  });

  afterEach(() => {
    mockedRepository.current = null;
    clearUserAliases();
    resetToast();
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

  it("renders tags chips in the table for leads with tags", async () => {
    const taggedLead: LeadSummary = {
      ...getLeadSamples("en-US")[0]!,
      tags: ["優先", "面談済"],
    };
    const repo = createRepository({
      listLeads: vi.fn().mockResolvedValue({ items: [taggedLead], total: 1 }),
    });
    mockedRepository.current = repo;

    const { wrapper } = await mountView();

    const chips = wrapper.findAll(".ui-chip");
    const chipTexts = chips.map((c) => c.text());
    expect(chipTexts).toContain("優先");
    expect(chipTexts).toContain("面談済");
  });

  it("renders tags column header", async () => {
    mockedRepository.current = createRepository();

    const { wrapper } = await mountView();

    const ths = wrapper.findAll("th");
    const headers = ths.map((th) => th.text());
    expect(headers).toContain("Tags");
  });

  it("bulkTags_shows_toast_and_refetches_list", async () => {
    const repo = createRepository();
    mockedRepository.current = repo;

    const { wrapper } = await mountView();

    const sampleId = getLeadSamples("en-US")[0]!.id;
    const table = wrapper.findComponent(LeadTable);
    table.vm.$emit("selectRow", sampleId, true);
    await flushPromises();

    const bulkBar = wrapper.findComponent(LeadBulkActionBar);
    bulkBar.vm.$emit("bulkTags", ["urgent", "vip"]);
    await flushPromises();

    expect(repo.bulkTags).toHaveBeenCalledWith({
      leadIds: [sampleId],
      tags: ["urgent", "vip"],
    });

    const toastCtrl = useToast();
    expect(toastCtrl.items.value.length).toBeGreaterThanOrEqual(1);
    expect(
      toastCtrl.items.value.some((t) => t.title === "Bulk tags applied"),
    ).toBe(true);

    // initial mount + refetch after bulk tags
    expect(repo.listLeads).toHaveBeenCalledTimes(2);
  });

  it("LeadFilters receives apiOwnerOptions after registerUserAliases", async () => {
    const UUID_OWNER = "00000000-0000-4000-8000-000000000011";
    registerUserAliases([{ id: UUID_OWNER, displayName: "Local Admin" }]);

    mockedRepository.current = createRepository();
    const { wrapper } = await mountView();

    const filters = wrapper.findComponent(LeadFilters);
    const ownerOpts = filters.props("ownerOptions") as Array<{
      value: string;
      label: string;
    }>;
    expect(ownerOpts.length).toBeGreaterThanOrEqual(1);
    expect(ownerOpts.some((o) => o.value === UUID_OWNER)).toBe(true);
    expect(ownerOpts.some((o) => o.label === "Local Admin")).toBe(true);
  });
});
