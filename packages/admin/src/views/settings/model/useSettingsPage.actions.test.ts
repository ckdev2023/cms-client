import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { useSettingsPage, type UseSettingsPageDeps } from "./useSettingsPage";
import type { GroupStats, OrgSettings } from "../types";
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
    }),
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
    setTimeoutFn: vi.fn(() => 999 as unknown as ReturnType<typeof setTimeout>),
    clearTimeoutFn: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Group actions — create
// ---------------------------------------------------------------------------

describe("useSettingsPage — createGroup", () => {
  it("adds a new group to the list and shows toast", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.groupNameModal.openCreate();
    s.groupNameModal.inputValue.value = "名古屋組";
    s.createGroup();
    expect(s.groups.value).toHaveLength(4);
    const created = s.groups.value[3]!;
    expect(created.name).toBe("名古屋組");
    expect(created.status).toBe("active");
    expect(created.activeCaseCount).toBe(0);
    expect(created.memberCount).toBe(0);
    expect(s.groupNameModal.isOpen.value).toBe(false);
    expect(s.toast.visible.value).toBe(true);
    expect(s.toast.titleKey.value).toBe("settings.toast.groupCreated.title");
  });

  it("selects the newly created group", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.groupNameModal.openCreate();
    s.groupNameModal.inputValue.value = "名古屋組";
    s.createGroup();
    const created = s.groups.value[3]!;
    expect(s.selectedGroupId.value).toBe(created.id);
  });

  it("does nothing when input is empty", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.groupNameModal.openCreate();
    s.createGroup();
    expect(s.groups.value).toHaveLength(3);
    expect(s.toast.visible.value).toBe(false);
  });

  it("creates detail and stats entries for the new group", () => {
    const deps = createDepsNoAutoToast();
    const s = useSettingsPage(deps);
    s.groupNameModal.openCreate();
    s.groupNameModal.inputValue.value = "名古屋組";
    s.createGroup();
    const created = s.groups.value[3]!;
    expect(deps.groupDetails[created.id]).toBeDefined();
    expect(deps.groupDetails[created.id]!.members).toHaveLength(0);
    expect(deps.groupStats[created.id]).toBeDefined();
  });
});

describe("useSettingsPage — createGroup (extended)", () => {
  it("creates multiple groups sequentially with unique IDs", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.groupNameModal.openCreate();
    s.groupNameModal.inputValue.value = "G1";
    s.createGroup();
    s.groupNameModal.openCreate();
    s.groupNameModal.inputValue.value = "G2";
    s.createGroup();
    expect(s.groups.value).toHaveLength(5);
    const ids = s.groups.value.slice(3).map((g) => g.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("newly created group appears in filtered list when filter is active", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.statusFilter.value = "active";
    const beforeCount = s.filteredGroups.value.length;
    s.groupNameModal.openCreate();
    s.groupNameModal.inputValue.value = "ActiveNew";
    s.createGroup();
    expect(s.filteredGroups.value.length).toBe(beforeCount + 1);
  });
});

// ---------------------------------------------------------------------------
// Group actions — rename
// ---------------------------------------------------------------------------

describe("useSettingsPage — renameGroup", () => {
  it("updates the group name in list and detail", () => {
    const deps = createDepsNoAutoToast();
    const s = useSettingsPage(deps);
    s.groupNameModal.openRename("tokyo-1", "東京一組");
    s.groupNameModal.inputValue.value = "東京本部";
    s.renameGroup();
    const updated = s.groups.value.find((g) => g.id === "tokyo-1");
    expect(updated?.name).toBe("東京本部");
    expect(deps.groupDetails["tokyo-1"]?.name).toBe("東京本部");
    expect(s.groupNameModal.isOpen.value).toBe(false);
    expect(s.toast.titleKey.value).toBe("settings.toast.groupRenamed.title");
  });

  it("does nothing when input is empty", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.groupNameModal.openRename("tokyo-1", "東京一組");
    s.groupNameModal.inputValue.value = "";
    s.renameGroup();
    expect(s.groups.value.find((g) => g.id === "tokyo-1")?.name).toBe(
      "東京一組",
    );
    expect(s.toast.visible.value).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Group actions — disable
// ---------------------------------------------------------------------------

describe("useSettingsPage — disableGroup", () => {
  it("marks the group as disabled and shows toast", () => {
    const deps = createDepsNoAutoToast();
    const s = useSettingsPage(deps);
    const group = SAMPLE_GROUPS[0]!;
    const stats: GroupStats = { customerCount: 28, activeCaseCount: 12 };
    s.disableModal.open(group, stats);
    s.disableGroup();
    const updated = s.groups.value.find((g) => g.id === "tokyo-1");
    expect(updated?.status).toBe("disabled");
    expect(deps.groupDetails["tokyo-1"]?.status).toBe("disabled");
    expect(s.disableModal.isOpen.value).toBe(false);
    expect(s.toast.titleKey.value).toBe("settings.toast.groupDisabled.title");
  });

  it("does nothing when no target group", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.disableGroup();
    expect(s.toast.visible.value).toBe(false);
  });

  it("disabled group is excluded from active filter results", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.statusFilter.value = "active";
    const beforeCount = s.filteredGroups.value.length;
    const group = SAMPLE_GROUPS[0]!;
    const stats: GroupStats = { customerCount: 0, activeCaseCount: 0 };
    s.disableModal.open(group, stats);
    s.disableGroup();
    expect(s.filteredGroups.value.length).toBe(beforeCount - 1);
  });

  it("disabled group appears in disabled filter results", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.statusFilter.value = "disabled";
    const beforeCount = s.filteredGroups.value.length;
    const group = SAMPLE_GROUPS[0]!;
    const stats: GroupStats = { customerCount: 0, activeCaseCount: 0 };
    s.disableModal.open(group, stats);
    s.disableGroup();
    expect(s.filteredGroups.value.length).toBe(beforeCount + 1);
  });
});

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
