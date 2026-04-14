import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { useSettingsPage, type UseSettingsPageDeps } from "./useSettingsPage";
import type { OrgSettings } from "../types";
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
