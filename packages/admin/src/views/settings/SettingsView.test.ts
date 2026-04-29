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

describe("SettingsView", () => {
  beforeEach(() => {
    resetOrgSettings();
    initOrgSettings({
      initialStorageRoot: {
        rootLabel: null,
        rootPath: null,
      },
    });
    setAppLocale("zh-CN");
  });

  it("localizes the settings sub-navigation aria-label in en-US", () => {
    setAppLocale("en-US");
    const wrapper = mountView();

    expect(
      wrapper.find(".settings-view__subnav").attributes("aria-label"),
    ).toBe("Settings sub-navigation");
  });

  it("localizes the settings sub-navigation aria-label in ja-JP", () => {
    setAppLocale("ja-JP");
    const wrapper = mountView();

    expect(
      wrapper.find(".settings-view__subnav").attributes("aria-label"),
    ).toBe("設定サブナビゲーション");
  });
});
