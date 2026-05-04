import { beforeEach, describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import SettingsView from "./SettingsView.vue";
import { i18n, setAppLocale } from "../../i18n";
import {
  initOrgSettings,
  resetOrgSettings,
} from "../../shared/model/useOrgSettings";

vi.mock("./model/OrgSettingsRepository", () => ({
  createOrgSettingsRepository: () => ({
    getOrgSettings: vi.fn().mockResolvedValue({
      visibility: {
        allowCrossGroupCaseCreate: false,
        allowPrincipalViewCrossGroupCollab: false,
      },
      storageRoot: {
        rootLabel: null,
        rootPath: null,
        updatedBy: null,
        updatedAt: null,
      },
    }),
    updateOrgSettings: vi.fn(),
  }),
}));

vi.mock("./model/GroupsRepository", () => ({
  createGroupsRepository: () => ({
    listGroups: vi.fn().mockResolvedValue([]),
    getGroupDetail: vi.fn(),
    createGroup: vi.fn(),
    renameGroup: vi.fn(),
    disableGroup: vi.fn(),
  }),
}));

function mountView() {
  return shallowMount(SettingsView, {
    global: {
      plugins: [i18n],
      stubs: { teleport: true },
    },
  });
}

function getSubnavButtons(wrapper: ReturnType<typeof mountView>) {
  return wrapper.findAll(".settings-view__subnav-btn");
}

describe("SettingsView — aria-current on sub-navigation", () => {
  beforeEach(() => {
    resetOrgSettings();
    initOrgSettings({
      initialStorageRoot: { rootLabel: null, rootPath: null },
    });
    setAppLocale("zh-CN");
  });

  it("default active panel (group-management) has aria-current='page'", () => {
    const wrapper = mountView();
    const buttons = getSubnavButtons(wrapper);

    expect(buttons.length).toBe(3);
    expect(buttons[0]!.attributes("aria-current")).toBe("page");
    expect(buttons[1]!.attributes("aria-current")).toBeUndefined();
    expect(buttons[2]!.attributes("aria-current")).toBeUndefined();
  });

  it("switches aria-current to storage-root tab after click", async () => {
    const wrapper = mountView();
    const buttons = getSubnavButtons(wrapper);

    await buttons[2]!.trigger("click");
    await wrapper.vm.$nextTick();

    const refreshed = getSubnavButtons(wrapper);
    expect(refreshed[0]!.attributes("aria-current")).toBeUndefined();
    expect(refreshed[1]!.attributes("aria-current")).toBeUndefined();
    expect(refreshed[2]!.attributes("aria-current")).toBe("page");
  });

  it("switches aria-current to visibility-config tab after click", async () => {
    const wrapper = mountView();
    const buttons = getSubnavButtons(wrapper);

    await buttons[1]!.trigger("click");
    await wrapper.vm.$nextTick();

    const refreshed = getSubnavButtons(wrapper);
    expect(refreshed[0]!.attributes("aria-current")).toBeUndefined();
    expect(refreshed[1]!.attributes("aria-current")).toBe("page");
    expect(refreshed[2]!.attributes("aria-current")).toBeUndefined();
  });

  it("only one button has aria-current at any time", async () => {
    const wrapper = mountView();

    for (let i = 0; i < 3; i++) {
      const buttons = getSubnavButtons(wrapper);
      await buttons[i]!.trigger("click");
      await wrapper.vm.$nextTick();

      const refreshed = getSubnavButtons(wrapper);
      const withAria = refreshed.filter(
        (b) => b.attributes("aria-current") === "page",
      );
      expect(withAria).toHaveLength(1);
    }
  });
});
