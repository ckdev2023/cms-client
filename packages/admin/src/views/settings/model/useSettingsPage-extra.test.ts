import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { createOrgSettingsController } from "../../../shared/model/useOrgSettings";
import { useSettingsPage, type UseSettingsPageDeps } from "./useSettingsPage";
import type { GroupSummary, OrgSettings } from "../types";
import type { GroupsRepository } from "./GroupsRepository";
import {
  SAMPLE_GROUPS,
  SAMPLE_GROUP_DETAILS,
  SAMPLE_GROUP_STATS,
  SAMPLE_ORG_SETTINGS,
  SAMPLE_ORG_SETTINGS_UNCONFIGURED,
} from "../fixtures";

function createDeps(
  overrides?: Partial<UseSettingsPageDeps>,
): UseSettingsPageDeps {
  return {
    initialGroups: [...SAMPLE_GROUPS],
    groupDetails: { ...SAMPLE_GROUP_DETAILS },
    groupStats: { ...SAMPLE_GROUP_STATS },
    orgSettings: structuredClone(SAMPLE_ORG_SETTINGS),
    isAdmin: ref(true),
    toastDuration: 100,
    setTimeoutFn: vi.fn((fn: TimerHandler) => {
      if (typeof fn === "function") fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout,
    clearTimeoutFn: vi.fn(),
    ...overrides,
  };
}

function createDepsNoAutoToast(
  overrides?: Partial<UseSettingsPageDeps>,
): UseSettingsPageDeps {
  return {
    initialGroups: [...SAMPLE_GROUPS],
    groupDetails: { ...SAMPLE_GROUP_DETAILS },
    groupStats: { ...SAMPLE_GROUP_STATS },
    orgSettings: structuredClone(SAMPLE_ORG_SETTINGS),
    isAdmin: ref(true),
    toastDuration: 100,
    setTimeoutFn: vi.fn(
      () => 999 as unknown as ReturnType<typeof setTimeout>,
    ) as unknown as typeof setTimeout,
    clearTimeoutFn: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Disable modal — confirmation branches
// ---------------------------------------------------------------------------

describe("useSettingsPage — disableModal confirmation branches", () => {
  it("hasReferences is true when only customerCount > 0", () => {
    const s = useSettingsPage(createDeps());
    const group = SAMPLE_GROUPS[0]!;
    s.disableModal.open(group, { customerCount: 5, activeCaseCount: 0 });
    expect(s.disableModal.hasReferences.value).toBe(true);
  });

  it("hasReferences is true when only caseCount > 0", () => {
    const s = useSettingsPage(createDeps());
    const group = SAMPLE_GROUPS[0]!;
    s.disableModal.open(group, { customerCount: 0, activeCaseCount: 3 });
    expect(s.disableModal.hasReferences.value).toBe(true);
  });

  it("hasReferences is false when both counts are zero", () => {
    const s = useSettingsPage(createDeps());
    const group = SAMPLE_GROUPS[0]!;
    s.disableModal.open(group, { customerCount: 0, activeCaseCount: 0 });
    expect(s.disableModal.hasReferences.value).toBe(false);
  });

  it("opening the modal with a different group replaces the previous data", () => {
    const s = useSettingsPage(createDeps());
    s.disableModal.open(SAMPLE_GROUPS[0]!, {
      customerCount: 10,
      activeCaseCount: 5,
    });
    s.disableModal.open(SAMPLE_GROUPS[1]!, {
      customerCount: 0,
      activeCaseCount: 0,
    });
    expect(s.disableModal.groupName.value).toBe("東京二組");
    expect(s.disableModal.hasReferences.value).toBe(false);
  });

  it("loads org settings from repository on init", async () => {
    const ctrl = createOrgSettingsController({
      initialStorageRoot: { rootLabel: null, rootPath: null },
    });
    const s = useSettingsPage(
      createDeps({
        orgSettingsRepository: {
          getOrgSettings: vi.fn().mockResolvedValue({
            visibility: {
              allowCrossGroupCaseCreate: true,
              allowPrincipalViewCrossGroupCollab: true,
            },
            storageRoot: {
              rootLabel: "共享盘",
              rootPath: "\\srv\\shared",
              updatedBy: "Admin",
              updatedAt: "2026-04-27T10:00:00.000Z",
            },
          }),
          updateOrgSettings: vi.fn(),
        },
        orgSettingsController: ctrl,
      }),
    );

    await Promise.resolve();

    expect(s.visibility.value.allowCrossGroupCaseCreate).toBe(true);
    expect(s.storageRoot.value.rootLabel).toBe("共享盘");
    expect(ctrl.storageRoot.value.rootPath).toBe("\\srv\\shared");
  });

  it("saveVisibility persists through repository and shows toast", async () => {
    const updateOrgSettings = vi.fn().mockResolvedValue({
      visibility: {
        allowCrossGroupCaseCreate: true,
        allowPrincipalViewCrossGroupCollab: false,
      },
      storageRoot: structuredClone(SAMPLE_ORG_SETTINGS.storageRoot),
    });
    const s = useSettingsPage(
      createDepsNoAutoToast({
        orgSettingsRepository: {
          getOrgSettings: vi.fn().mockResolvedValue(SAMPLE_ORG_SETTINGS),
          updateOrgSettings,
        },
      }),
    );

    s.visibility.value.allowCrossGroupCaseCreate = true;
    await s.saveVisibility();

    expect(updateOrgSettings).toHaveBeenCalledWith({
      visibility: {
        allowCrossGroupCaseCreate: true,
        allowPrincipalViewCrossGroupCollab: false,
      },
    });
    expect(s.toast.visible.value).toBe(true);
    expect(s.toast.titleKey.value).toBe(
      "settings.toast.visibilityUpdated.title",
    );
  });

  it("saveStorageRoot syncs global controller after persistence", async () => {
    const ctrl = createOrgSettingsController({
      initialStorageRoot: { rootLabel: null, rootPath: null },
    });
    const updateOrgSettings = vi.fn().mockResolvedValue({
      visibility: structuredClone(SAMPLE_ORG_SETTINGS.visibility),
      storageRoot: {
        rootLabel: "案件资料",
        rootPath: "\\fileserver\\cases",
        updatedBy: "Admin",
        updatedAt: "2026-04-27T11:00:00.000Z",
      },
    });
    const s = useSettingsPage(
      createDepsNoAutoToast({
        orgSettingsRepository: {
          getOrgSettings: vi.fn().mockResolvedValue(SAMPLE_ORG_SETTINGS),
          updateOrgSettings,
        },
        orgSettingsController: ctrl,
      }),
    );

    s.storageRoot.value.rootLabel = "案件资料";
    s.storageRoot.value.rootPath = "\\fileserver\\cases";
    await s.saveStorageRoot();

    expect(updateOrgSettings).toHaveBeenCalledWith({
      storageRoot: {
        rootLabel: "案件资料",
        rootPath: "\\fileserver\\cases",
      },
    });
    expect(ctrl.storageRoot.value).toEqual({
      rootLabel: "案件资料",
      rootPath: "\\fileserver\\cases",
    });
  });
});

// ---------------------------------------------------------------------------
// Visibility config
// ---------------------------------------------------------------------------

describe("useSettingsPage — visibility", () => {
  it("initializes with orgSettings visibility values", () => {
    const s = useSettingsPage(createDeps());
    expect(s.visibility.value.allowCrossGroupCaseCreate).toBe(false);
    expect(s.visibility.value.allowPrincipalViewCrossGroupCollab).toBe(false);
  });

  it("toggling a flag updates the reactive state", () => {
    const s = useSettingsPage(createDeps());
    s.visibility.value.allowCrossGroupCaseCreate = true;
    expect(s.visibility.value.allowCrossGroupCaseCreate).toBe(true);
  });

  it("saveVisibility triggers toast", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.saveVisibility();
    expect(s.toast.visible.value).toBe(true);
    expect(s.toast.titleKey.value).toBe(
      "settings.toast.visibilityUpdated.title",
    );
  });
});

// ---------------------------------------------------------------------------
// Storage root
// ---------------------------------------------------------------------------

describe("useSettingsPage — storage root", () => {
  it("initializes with orgSettings storage root", () => {
    const s = useSettingsPage(createDeps());
    expect(s.storageRoot.value.rootLabel).toBe("案件資料総盤");
    expect(s.storageRoot.value.rootPath).toBe("\\\\fileserver\\gyosei-docs");
  });

  it("isStorageRootConfigured is true when root is set", () => {
    const s = useSettingsPage(createDeps());
    expect(s.isStorageRootConfigured.value).toBe(true);
  });

  it("isStorageRootConfigured is false when rootPath is null", () => {
    const s = useSettingsPage(
      createDeps({
        orgSettings: structuredClone(SAMPLE_ORG_SETTINGS_UNCONFIGURED),
      }),
    );
    expect(s.isStorageRootConfigured.value).toBe(false);
  });

  it("isStorageRootConfigured is false when rootPath is empty string", () => {
    const orgSettings: OrgSettings = {
      ...structuredClone(SAMPLE_ORG_SETTINGS),
      storageRoot: {
        rootLabel: "some label",
        rootPath: "",
        updatedBy: null,
        updatedAt: null,
      },
    };
    const s = useSettingsPage(createDeps({ orgSettings }));
    expect(s.isStorageRootConfigured.value).toBe(false);
  });

  it("storageRootPreview returns expected format when configured", () => {
    const s = useSettingsPage(createDeps());
    expect(s.storageRootPreview.value).toBe(
      "\\\\fileserver\\gyosei-docs/{relative_path}",
    );
  });

  it("storageRootPreview is empty when not configured", () => {
    const s = useSettingsPage(
      createDeps({
        orgSettings: structuredClone(SAMPLE_ORG_SETTINGS_UNCONFIGURED),
      }),
    );
    expect(s.storageRootPreview.value).toBe("");
  });

  it("saveStorageRoot triggers toast", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.saveStorageRoot();
    expect(s.toast.visible.value).toBe(true);
    expect(s.toast.titleKey.value).toBe(
      "settings.toast.storageRootUpdated.title",
    );
  });

  it("isStorageRootConfigured is false when rootLabel is null but rootPath is set", () => {
    const orgSettings: OrgSettings = {
      ...structuredClone(SAMPLE_ORG_SETTINGS),
      storageRoot: {
        rootLabel: null,
        rootPath: "\\\\server\\path",
        updatedBy: null,
        updatedAt: null,
      },
    };
    const s = useSettingsPage(createDeps({ orgSettings }));
    expect(s.isStorageRootConfigured.value).toBe(false);
  });

  it("storageRoot fields are reactive to updates", () => {
    const s = useSettingsPage(
      createDeps({
        orgSettings: structuredClone(SAMPLE_ORG_SETTINGS_UNCONFIGURED),
      }),
    );
    expect(s.isStorageRootConfigured.value).toBe(false);
    s.storageRoot.value = {
      ...s.storageRoot.value,
      rootLabel: "New Label",
      rootPath: "\\\\new-server\\path",
    };
    expect(s.isStorageRootConfigured.value).toBe(true);
    expect(s.storageRootPreview.value).toBe(
      "\\\\new-server\\path/{relative_path}",
    );
  });
});

// ---------------------------------------------------------------------------
// Toast edge cases
// ---------------------------------------------------------------------------

describe("useSettingsPage — toast edge cases", () => {
  it("showing a second toast replaces the first", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.toast.show("groupCreated");
    s.toast.show("groupRenamed");
    expect(s.toast.visible.value).toBe(true);
    expect(s.toast.titleKey.value).toBe("settings.toast.groupRenamed.title");
  });

  it("consecutive hide calls are safe", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.toast.show("groupCreated");
    s.toast.hide();
    s.toast.hide();
    expect(s.toast.visible.value).toBe(false);
  });

  it("each toast preset has distinct title and description keys", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    const presets: Array<
      | "groupCreated"
      | "groupRenamed"
      | "groupDisabled"
      | "visibilityUpdated"
      | "storageRootUpdated"
    > = [
      "groupCreated",
      "groupRenamed",
      "groupDisabled",
      "visibilityUpdated",
      "storageRootUpdated",
    ];
    const titles = new Set<string>();
    for (const key of presets) {
      s.toast.show(key);
      titles.add(s.toast.titleKey.value);
    }
    expect(titles.size).toBe(presets.length);
  });
});

// ---------------------------------------------------------------------------
// loadGroups — repository-driven initial load
// ---------------------------------------------------------------------------

function stubGroupsRepo(
  overrides?: Partial<GroupsRepository>,
): GroupsRepository {
  return {
    listGroups: vi.fn().mockResolvedValue([]),
    getGroupDetail: vi.fn().mockRejectedValue(new Error("not stubbed")),
    createGroup: vi.fn().mockRejectedValue(new Error("not stubbed")),
    renameGroup: vi.fn().mockRejectedValue(new Error("not stubbed")),
    disableGroup: vi.fn().mockRejectedValue(new Error("not stubbed")),
    ...overrides,
  };
}

describe("useSettingsPage — loadGroups", () => {
  const API_GROUPS: GroupSummary[] = [
    {
      id: "api-g1",
      name: "API Group 1",
      status: "active",
      createdAt: "2026-01-10",
      activeCaseCount: 5,
      memberCount: 2,
    },
    {
      id: "api-g2",
      name: "API Group 2",
      status: "disabled",
      createdAt: "2026-02-20",
      activeCaseCount: 0,
      memberCount: 1,
    },
  ];

  it("replaces groups with API data on init", async () => {
    const repo = stubGroupsRepo({
      listGroups: vi.fn().mockResolvedValue(API_GROUPS),
    });
    const s = useSettingsPage(createDeps({ groupsRepository: repo }));

    expect(repo.listGroups).toHaveBeenCalledOnce();

    await Promise.resolve();

    expect(s.groups.value).toHaveLength(2);
    expect(s.groups.value[0]!.id).toBe("api-g1");
    expect(s.groups.value[1]!.id).toBe("api-g2");
  });

  it("retains fixture data when listGroups fails", async () => {
    const repo = stubGroupsRepo({
      listGroups: vi.fn().mockRejectedValue(new Error("network error")),
    });
    const s = useSettingsPage(createDeps({ groupsRepository: repo }));

    await Promise.resolve();

    expect(s.groups.value).toHaveLength(3);
    expect(s.groups.value[0]!.id).toBe("tokyo-1");
  });

  it("keeps fixture data when no groupsRepository is injected", () => {
    const s = useSettingsPage(createDeps());
    expect(s.groups.value).toHaveLength(3);
    expect(s.groups.value[0]!.id).toBe("tokyo-1");
  });

  it("filteredGroups reflects API data after load", async () => {
    const repo = stubGroupsRepo({
      listGroups: vi.fn().mockResolvedValue(API_GROUPS),
    });
    const s = useSettingsPage(createDeps({ groupsRepository: repo }));

    await Promise.resolve();

    s.statusFilter.value = "active";
    expect(s.filteredGroups.value).toHaveLength(1);
    expect(s.filteredGroups.value[0]!.id).toBe("api-g1");
  });

  it("does not clear groupDetails or groupStats", async () => {
    const repo = stubGroupsRepo({
      listGroups: vi.fn().mockResolvedValue(API_GROUPS),
    });
    const details = { ...SAMPLE_GROUP_DETAILS };
    const stats = { ...SAMPLE_GROUP_STATS };
    useSettingsPage(
      createDeps({
        groupsRepository: repo,
        groupDetails: details,
        groupStats: stats,
      }),
    );

    await Promise.resolve();

    expect(Object.keys(details).length).toBeGreaterThan(0);
    expect(Object.keys(stats).length).toBeGreaterThan(0);
  });

  it("is a no-op when listGroups returns a non-array value", async () => {
    const repo = stubGroupsRepo({
      listGroups: vi.fn().mockResolvedValue(null),
    });
    const s = useSettingsPage(createDeps({ groupsRepository: repo }));

    await Promise.resolve();

    expect(s.groups.value).toHaveLength(3);
  });
});
