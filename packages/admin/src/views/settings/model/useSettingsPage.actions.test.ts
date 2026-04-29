import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { useSettingsPage, type UseSettingsPageDeps } from "./useSettingsPage";
import type { GroupStats } from "../types";
import type { GroupsRepository } from "./GroupsRepository";
import {
  SAMPLE_GROUPS,
  SAMPLE_GROUP_DETAILS,
  SAMPLE_GROUP_STATS,
  SAMPLE_ORG_SETTINGS,
} from "../fixtures";

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
  it("marks the group as disabled and shows toast", async () => {
    const deps = createDepsNoAutoToast();
    const s = useSettingsPage(deps);
    const group = SAMPLE_GROUPS[0]!;
    const stats: GroupStats = { customerCount: 28, activeCaseCount: 12 };
    s.disableModal.open(group, stats);
    await s.disableGroup();
    const updated = s.groups.value.find((g) => g.id === "tokyo-1");
    expect(updated?.status).toBe("disabled");
    expect(deps.groupDetails["tokyo-1"]?.status).toBe("disabled");
    expect(s.disableModal.isOpen.value).toBe(false);
    expect(s.toast.titleKey.value).toBe("settings.toast.groupDisabled.title");
  });

  it("does nothing when no target group", async () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    await s.disableGroup();
    expect(s.toast.visible.value).toBe(false);
  });

  it("disabled group is excluded from active filter results", async () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.statusFilter.value = "active";
    const beforeCount = s.filteredGroups.value.length;
    const group = SAMPLE_GROUPS[0]!;
    const stats: GroupStats = { customerCount: 0, activeCaseCount: 0 };
    s.disableModal.open(group, stats);
    await s.disableGroup();
    expect(s.filteredGroups.value.length).toBe(beforeCount - 1);
  });

  it("disabled group appears in disabled filter results", async () => {
    const s = useSettingsPage(createDepsNoAutoToast());
    s.statusFilter.value = "disabled";
    const beforeCount = s.filteredGroups.value.length;
    const group = SAMPLE_GROUPS[0]!;
    const stats: GroupStats = { customerCount: 0, activeCaseCount: 0 };
    s.disableModal.open(group, stats);
    await s.disableGroup();
    expect(s.filteredGroups.value.length).toBe(beforeCount + 1);
  });
});

// ---------------------------------------------------------------------------
// Group actions — create (with GroupsRepository)
// ---------------------------------------------------------------------------

function stubCreateRepo(
  overrides?: Partial<GroupsRepository>,
): GroupsRepository {
  return {
    listGroups: vi.fn().mockResolvedValue([...SAMPLE_GROUPS]),
    getGroupDetail: vi.fn().mockResolvedValue(null),
    createGroup: vi.fn().mockResolvedValue({
      id: "server-grp-1",
      name: "名古屋組",
      status: "active",
      createdAt: "2025-06-01",
      activeCaseCount: 0,
      memberCount: 0,
    }),
    renameGroup: vi.fn().mockResolvedValue(null),
    disableGroup: vi
      .fn()
      .mockResolvedValue({ stats: { customerCount: 0, activeCaseCount: 0 } }),
    ...overrides,
  };
}

describe("useSettingsPage — createGroup with repository", () => {
  it("calls repo.createGroup and adds server-returned summary to list", async () => {
    const repo = stubCreateRepo();
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);
    await Promise.resolve();

    s.groupNameModal.openCreate();
    s.groupNameModal.inputValue.value = "名古屋組";
    await s.createGroup();

    expect(repo.createGroup).toHaveBeenCalledWith({ name: "名古屋組" });
    expect(s.groups.value).toHaveLength(4);
    const created = s.groups.value[3]!;
    expect(created.id).toBe("server-grp-1");
    expect(created.name).toBe("名古屋組");
    expect(created.status).toBe("active");
  });

  it("selects the newly created group using server-returned ID", async () => {
    const repo = stubCreateRepo();
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);
    await Promise.resolve();

    s.groupNameModal.openCreate();
    s.groupNameModal.inputValue.value = "名古屋組";
    await s.createGroup();

    expect(s.selectedGroupId.value).toBe("server-grp-1");
  });

  it("closes modal and shows groupCreated toast on success", async () => {
    const repo = stubCreateRepo();
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);
    await Promise.resolve();

    s.groupNameModal.openCreate();
    s.groupNameModal.inputValue.value = "名古屋組";
    await s.createGroup();

    expect(s.groupNameModal.isOpen.value).toBe(false);
    expect(s.toast.visible.value).toBe(true);
    expect(s.toast.titleKey.value).toBe("settings.toast.groupCreated.title");
  });

  it("creates detail and stats entries for the server-returned group", async () => {
    const repo = stubCreateRepo();
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);
    await Promise.resolve();

    s.groupNameModal.openCreate();
    s.groupNameModal.inputValue.value = "名古屋組";
    await s.createGroup();

    expect(deps.groupDetails["server-grp-1"]).toBeDefined();
    expect(deps.groupDetails["server-grp-1"]!.members).toHaveLength(0);
    expect(deps.groupStats["server-grp-1"]).toBeDefined();
    expect(deps.groupStats["server-grp-1"]!.customerCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Group actions — rename (with GroupsRepository)
// ---------------------------------------------------------------------------

function stubRenameRepo(
  overrides?: Partial<GroupsRepository>,
): GroupsRepository {
  return {
    listGroups: vi.fn().mockReturnValue(new Promise(() => {})),
    getGroupDetail: vi.fn().mockResolvedValue(null),
    createGroup: vi.fn().mockResolvedValue(null),
    renameGroup: vi.fn().mockResolvedValue({
      id: "tokyo-1",
      name: "東京本部",
      status: "active",
      createdAt: "2024-01-15",
      activeCaseCount: 12,
      memberCount: 4,
    }),
    disableGroup: vi
      .fn()
      .mockResolvedValue({ stats: { customerCount: 0, activeCaseCount: 0 } }),
    ...overrides,
  };
}

describe("useSettingsPage — renameGroup with repository", () => {
  it("calls repo.renameGroup and applies server-returned name", async () => {
    const repo = stubRenameRepo();
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);

    s.groupNameModal.openRename("tokyo-1", "東京一組");
    s.groupNameModal.inputValue.value = "東京本部";
    await s.renameGroup();

    expect(repo.renameGroup).toHaveBeenCalledWith("tokyo-1", "東京本部");
    const updated = s.groups.value.find((g) => g.id === "tokyo-1");
    expect(updated?.name).toBe("東京本部");
    expect(deps.groupDetails["tokyo-1"]?.name).toBe("東京本部");
  });

  it("closes modal and shows groupRenamed toast on success", async () => {
    const repo = stubRenameRepo();
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);

    s.groupNameModal.openRename("tokyo-1", "東京一組");
    s.groupNameModal.inputValue.value = "東京本部";
    await s.renameGroup();

    expect(s.groupNameModal.isOpen.value).toBe(false);
    expect(s.toast.visible.value).toBe(true);
    expect(s.toast.titleKey.value).toBe("settings.toast.groupRenamed.title");
  });

  it("applies server-corrected name when it differs from user input", async () => {
    const repo = stubRenameRepo({
      renameGroup: vi.fn().mockResolvedValue({
        id: "tokyo-1",
        name: "東京本部（修正）",
        status: "active",
        createdAt: "2024-01-15",
        activeCaseCount: 12,
        memberCount: 4,
      }),
    });
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);

    s.groupNameModal.openRename("tokyo-1", "東京一組");
    s.groupNameModal.inputValue.value = "東京本部";
    await s.renameGroup();

    const updated = s.groups.value.find((g) => g.id === "tokyo-1");
    expect(updated?.name).toBe("東京本部（修正）");
    expect(deps.groupDetails["tokyo-1"]?.name).toBe("東京本部（修正）");
  });
});

// ---------------------------------------------------------------------------
// Group actions — disable (with GroupsRepository)
// ---------------------------------------------------------------------------

function stubDisableRepo(
  overrides?: Partial<GroupsRepository>,
): GroupsRepository {
  return {
    listGroups: vi.fn().mockResolvedValue([...SAMPLE_GROUPS]),
    getGroupDetail: vi.fn().mockResolvedValue(null),
    createGroup: vi.fn().mockResolvedValue(null),
    renameGroup: vi.fn().mockResolvedValue(null),
    disableGroup: vi
      .fn()
      .mockResolvedValue({ stats: { customerCount: 0, activeCaseCount: 0 } }),
    ...overrides,
  };
}

describe("useSettingsPage — disableGroup with repository", () => {
  it("calls repo.disableGroup and updates local state on success", async () => {
    const repo = stubDisableRepo();
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);
    await Promise.resolve();

    const group = SAMPLE_GROUPS[0]!;
    s.disableModal.open(group, { customerCount: 0, activeCaseCount: 0 });
    await s.disableGroup();

    expect(repo.disableGroup).toHaveBeenCalledWith("tokyo-1");
    expect(s.groups.value.find((g) => g.id === "tokyo-1")?.status).toBe(
      "disabled",
    );
    expect(deps.groupDetails["tokyo-1"]?.status).toBe("disabled");
    expect(s.disableModal.isOpen.value).toBe(false);
    expect(s.toast.titleKey.value).toBe("settings.toast.groupDisabled.title");
  });
});
