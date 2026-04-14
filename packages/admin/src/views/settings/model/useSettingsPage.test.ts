import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { useSettingsPage, type UseSettingsPageDeps } from "./useSettingsPage";
import type { GroupStats } from "../types";
import {
  SAMPLE_GROUPS,
  SAMPLE_GROUP_DETAILS,
  SAMPLE_GROUP_STATS,
  SAMPLE_ORG_SETTINGS,
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
// Sub-navigation
// ---------------------------------------------------------------------------

describe("useSettingsPage — sub-navigation", () => {
  it("defaults to group-management panel", () => {
    const s = useSettingsPage(createDeps());
    expect(s.activePanel.value).toBe("group-management");
  });

  it("switchPanel changes the active panel", () => {
    const s = useSettingsPage(createDeps());
    s.switchPanel("visibility-config");
    expect(s.activePanel.value).toBe("visibility-config");
    s.switchPanel("storage-root");
    expect(s.activePanel.value).toBe("storage-root");
    s.switchPanel("group-management");
    expect(s.activePanel.value).toBe("group-management");
  });
});

// ---------------------------------------------------------------------------
// Sub-navigation (extended)
// ---------------------------------------------------------------------------

describe("useSettingsPage — sub-navigation edge cases", () => {
  it("switching panel does not reset Group selection", () => {
    const s = useSettingsPage(createDeps());
    s.selectGroup("tokyo-1");
    s.switchPanel("visibility-config");
    expect(s.selectedGroupId.value).toBe("tokyo-1");
    s.switchPanel("group-management");
    expect(s.selectedGroupId.value).toBe("tokyo-1");
  });

  it("switching to same panel is a no-op", () => {
    const s = useSettingsPage(createDeps());
    s.switchPanel("group-management");
    expect(s.activePanel.value).toBe("group-management");
  });
});

// ---------------------------------------------------------------------------
// Permission
// ---------------------------------------------------------------------------

describe("useSettingsPage — permission", () => {
  it("isAdmin reflects the injected ref", () => {
    const adminRef = ref(true);
    const s = useSettingsPage(createDeps({ isAdmin: adminRef }));
    expect(s.isAdmin.value).toBe(true);
    adminRef.value = false;
    expect(s.isAdmin.value).toBe(false);
  });

  it("accepts a static boolean for isAdmin", () => {
    const s = useSettingsPage(createDeps({ isAdmin: false }));
    expect(s.isAdmin.value).toBe(false);
  });

  it("transitions from non-admin to admin reactively", () => {
    const adminRef = ref(false);
    const s = useSettingsPage(createDeps({ isAdmin: adminRef }));
    expect(s.isAdmin.value).toBe(false);
    adminRef.value = true;
    expect(s.isAdmin.value).toBe(true);
  });

  it("mutations work regardless of isAdmin state", () => {
    const s = useSettingsPage(createDepsNoAutoToast({ isAdmin: false }));
    s.groupNameModal.openCreate();
    s.groupNameModal.inputValue.value = "TestGroup";
    s.createGroup();
    expect(s.groups.value).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Group list & filter
// ---------------------------------------------------------------------------

describe("useSettingsPage — group list", () => {
  it("loads initial groups", () => {
    const s = useSettingsPage(createDeps());
    expect(s.groups.value).toHaveLength(3);
  });

  it("filteredGroups returns all when filter is empty", () => {
    const s = useSettingsPage(createDeps());
    expect(s.filteredGroups.value).toHaveLength(3);
  });

  it("filters by active status", () => {
    const s = useSettingsPage(createDeps());
    s.statusFilter.value = "active";
    expect(s.filteredGroups.value.every((g) => g.status === "active")).toBe(
      true,
    );
    expect(s.filteredGroups.value).toHaveLength(2);
  });

  it("filters by disabled status", () => {
    const s = useSettingsPage(createDeps());
    s.statusFilter.value = "disabled";
    expect(s.filteredGroups.value.every((g) => g.status === "disabled")).toBe(
      true,
    );
    expect(s.filteredGroups.value).toHaveLength(1);
  });

  it("isEmpty is false when groups exist", () => {
    const s = useSettingsPage(createDeps());
    expect(s.isEmpty.value).toBe(false);
  });

  it("isEmpty is true when no groups", () => {
    const s = useSettingsPage(createDeps({ initialGroups: [] }));
    expect(s.isEmpty.value).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Group selection
// ---------------------------------------------------------------------------

describe("useSettingsPage — group selection", () => {
  it("starts with no selection", () => {
    const s = useSettingsPage(createDeps());
    expect(s.selectedGroupId.value).toBeNull();
    expect(s.selectedGroup.value).toBeNull();
    expect(s.selectedGroupStats.value).toBeNull();
  });

  it("selectGroup sets selectedGroupId and resolves detail + stats", () => {
    const s = useSettingsPage(createDeps());
    s.selectGroup("tokyo-1");
    expect(s.selectedGroupId.value).toBe("tokyo-1");
    expect(s.selectedGroup.value?.name).toBe("東京一組");
    expect(s.selectedGroupStats.value?.customerCount).toBe(28);
  });

  it("clearSelection resets to null", () => {
    const s = useSettingsPage(createDeps());
    s.selectGroup("tokyo-1");
    s.clearSelection();
    expect(s.selectedGroupId.value).toBeNull();
    expect(s.selectedGroup.value).toBeNull();
  });

  it("selecting a non-existent group returns null detail", () => {
    const s = useSettingsPage(createDeps());
    s.selectGroup("nonexistent");
    expect(s.selectedGroup.value).toBeNull();
    expect(s.selectedGroupStats.value).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

describe("useSettingsPage — toast", () => {
  it("toast is hidden by default", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    expect(s.toast.visible.value).toBe(false);
  });

  it("toast.show sets visible and preset keys", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.toast.show("groupCreated");
    expect(s.toast.visible.value).toBe(true);
    expect(s.toast.titleKey.value).toBe("settings.toast.groupCreated.title");
    expect(s.toast.descriptionKey.value).toBe(
      "settings.toast.groupCreated.description",
    );
  });

  it("toast.hide clears visible", () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.toast.show("groupRenamed");
    s.toast.hide();
    expect(s.toast.visible.value).toBe(false);
  });

  it("toast auto-hides after duration via setTimeout", () => {
    const s = useSettingsPage(createDeps());
    s.toast.show("groupDisabled");
    expect(s.toast.visible.value).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Group name modal
// ---------------------------------------------------------------------------

describe("useSettingsPage — groupNameModal", () => {
  it("is closed by default", () => {
    const s = useSettingsPage(createDeps());
    expect(s.groupNameModal.isOpen.value).toBe(false);
  });

  it("openCreate opens in create mode with empty input", () => {
    const s = useSettingsPage(createDeps());
    s.groupNameModal.openCreate();
    expect(s.groupNameModal.isOpen.value).toBe(true);
    expect(s.groupNameModal.mode.value).toBe("create");
    expect(s.groupNameModal.inputValue.value).toBe("");
    expect(s.groupNameModal.targetGroupId.value).toBeNull();
  });

  it("openRename opens in rename mode with current name", () => {
    const s = useSettingsPage(createDeps());
    s.groupNameModal.openRename("tokyo-1", "東京一組");
    expect(s.groupNameModal.isOpen.value).toBe(true);
    expect(s.groupNameModal.mode.value).toBe("rename");
    expect(s.groupNameModal.inputValue.value).toBe("東京一組");
    expect(s.groupNameModal.targetGroupId.value).toBe("tokyo-1");
  });

  it("close resets the modal state", () => {
    const s = useSettingsPage(createDeps());
    s.groupNameModal.openRename("tokyo-1", "東京一組");
    s.groupNameModal.close();
    expect(s.groupNameModal.isOpen.value).toBe(false);
    expect(s.groupNameModal.inputValue.value).toBe("");
    expect(s.groupNameModal.targetGroupId.value).toBeNull();
  });

  it("canSubmit is false when input is empty", () => {
    const s = useSettingsPage(createDeps());
    s.groupNameModal.openCreate();
    expect(s.groupNameModal.canSubmit.value).toBe(false);
  });

  it("canSubmit is false when input is whitespace-only", () => {
    const s = useSettingsPage(createDeps());
    s.groupNameModal.openCreate();
    s.groupNameModal.inputValue.value = "   ";
    expect(s.groupNameModal.canSubmit.value).toBe(false);
  });

  it("canSubmit is true when input has content", () => {
    const s = useSettingsPage(createDeps());
    s.groupNameModal.openCreate();
    s.groupNameModal.inputValue.value = "新グループ";
    expect(s.groupNameModal.canSubmit.value).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Disable modal
// ---------------------------------------------------------------------------

describe("useSettingsPage — disableModal", () => {
  it("is closed by default", () => {
    const s = useSettingsPage(createDeps());
    expect(s.disableModal.isOpen.value).toBe(false);
  });

  it("opens with group data and stats", () => {
    const s = useSettingsPage(createDeps());
    const group = SAMPLE_GROUPS[0]!;
    const stats: GroupStats = { customerCount: 28, activeCaseCount: 12 };
    s.disableModal.open(group, stats);
    expect(s.disableModal.isOpen.value).toBe(true);
    expect(s.disableModal.groupName.value).toBe("東京一組");
    expect(s.disableModal.customerCount.value).toBe(28);
    expect(s.disableModal.caseCount.value).toBe(12);
    expect(s.disableModal.hasReferences.value).toBe(true);
  });

  it("hasReferences is false when counts are zero", () => {
    const s = useSettingsPage(createDeps());
    const group = SAMPLE_GROUPS[0]!;
    const stats: GroupStats = { customerCount: 0, activeCaseCount: 0 };
    s.disableModal.open(group, stats);
    expect(s.disableModal.hasReferences.value).toBe(false);
  });

  it("close resets the modal", () => {
    const s = useSettingsPage(createDeps());
    const group = SAMPLE_GROUPS[0]!;
    const stats: GroupStats = { customerCount: 28, activeCaseCount: 12 };
    s.disableModal.open(group, stats);
    s.disableModal.close();
    expect(s.disableModal.isOpen.value).toBe(false);
    expect(s.disableModal.groupName.value).toBe("");
    expect(s.disableModal.customerCount.value).toBe(0);
  });
});
