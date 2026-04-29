import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { useSettingsPage, type UseSettingsPageDeps } from "./useSettingsPage";
import type { GroupSummary } from "../types";
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

function stubGroupsRepository(
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

// ---------------------------------------------------------------------------
// Group actions — create (with repository)
// ---------------------------------------------------------------------------

describe("useSettingsPage — createGroup (with repository)", () => {
  it("uses server-returned summary to update local state", async () => {
    const serverSummary: GroupSummary = {
      id: "server-grp-1",
      name: "名古屋組",
      status: "active",
      createdAt: "2025-06-01",
      activeCaseCount: 0,
      memberCount: 0,
    };
    const repo = stubGroupsRepository({
      createGroup: vi.fn().mockResolvedValue(serverSummary),
    });
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);

    s.groupNameModal.openCreate();
    s.groupNameModal.inputValue.value = "名古屋組";
    await s.createGroup();

    expect(repo.createGroup).toHaveBeenCalledWith({ name: "名古屋組" });
    expect(s.groups.value).toHaveLength(4);
    const created = s.groups.value[3]!;
    expect(created.id).toBe("server-grp-1");
    expect(created.name).toBe("名古屋組");
    expect(s.selectedGroupId.value).toBe("server-grp-1");
    expect(deps.groupDetails["server-grp-1"]).toBeDefined();
    expect(deps.groupStats["server-grp-1"]).toBeDefined();
    expect(s.groupNameModal.isOpen.value).toBe(false);
    expect(s.toast.titleKey.value).toBe("settings.toast.groupCreated.title");
  });

  it("shows groupActionFailed toast when repository throws", async () => {
    const repo = stubGroupsRepository({
      createGroup: vi.fn().mockRejectedValue(new Error("conflict")),
    });
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);

    s.groupNameModal.openCreate();
    s.groupNameModal.inputValue.value = "重複名";
    await s.createGroup();

    expect(s.groups.value).toHaveLength(3);
    expect(s.toast.visible.value).toBe(true);
    expect(s.toast.titleKey.value).toBe(
      "settings.toast.groupActionFailed.title",
    );
    expect(s.groupNameModal.isOpen.value).toBe(true);
  });

  it("does nothing when input is empty even with repository", async () => {
    const repo = stubGroupsRepository();
    const s = useSettingsPage(
      createDepsNoAutoToast({ groupsRepository: repo }),
    );

    s.groupNameModal.openCreate();
    await s.createGroup();

    expect(repo.createGroup).not.toHaveBeenCalled();
    expect(s.groups.value).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Group actions — rename (with repository)
// ---------------------------------------------------------------------------

describe("useSettingsPage — renameGroup (with repository)", () => {
  it("calls repo.renameGroup and syncs server response on success", async () => {
    const repo = stubGroupsRepository({
      listGroups: vi.fn().mockReturnValue(new Promise(() => {})),
      renameGroup: vi.fn().mockResolvedValue({
        id: "tokyo-1",
        name: "東京本部（サーバー）",
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
    expect(repo.renameGroup).toHaveBeenCalledWith("tokyo-1", "東京本部");
    expect(s.groups.value.find((g) => g.id === "tokyo-1")?.name).toBe(
      "東京本部（サーバー）",
    );
    expect(deps.groupDetails["tokyo-1"]?.name).toBe("東京本部（サーバー）");
    expect(s.toast.titleKey.value).toBe("settings.toast.groupRenamed.title");
  });

  it("rolls back local name, closes modal, and shows error toast on repo failure", async () => {
    const repo = stubGroupsRepository({
      listGroups: vi.fn().mockReturnValue(new Promise(() => {})),
      renameGroup: vi.fn().mockRejectedValue(new Error("conflict")),
    });
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);
    s.groupNameModal.openRename("tokyo-1", "東京一組");
    s.groupNameModal.inputValue.value = "重複名";
    await s.renameGroup();
    expect(s.groups.value.find((g) => g.id === "tokyo-1")?.name).toBe(
      "東京一組",
    );
    expect(deps.groupDetails["tokyo-1"]?.name).toBe("東京一組");
    expect(s.groupNameModal.isOpen.value).toBe(false);
    expect(s.toast.titleKey.value).toBe(
      "settings.toast.groupActionFailed.title",
    );
  });
});

// ---------------------------------------------------------------------------
// Group actions — disable (with repository)
// ---------------------------------------------------------------------------

describe("useSettingsPage — disableGroup (with repository)", () => {
  it("calls repo.disableGroup and updates local state on success", async () => {
    const repo = stubGroupsRepository({
      listGroups: vi.fn().mockReturnValue(new Promise(() => {})),
    });
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);
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

  it("keeps original active status and shows groupActionFailed toast on repo failure", async () => {
    const repo = stubGroupsRepository({
      listGroups: vi.fn().mockReturnValue(new Promise(() => {})),
      disableGroup: vi.fn().mockRejectedValue(new Error("server error")),
    });
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);
    const group = SAMPLE_GROUPS[0]!;
    s.disableModal.open(group, { customerCount: 0, activeCaseCount: 0 });
    await s.disableGroup();

    expect(repo.disableGroup).toHaveBeenCalledWith("tokyo-1");
    expect(s.groups.value.find((g) => g.id === "tokyo-1")?.status).toBe(
      "active",
    );
    expect(deps.groupDetails["tokyo-1"]?.status).toBe("active");
    expect(s.disableModal.isOpen.value).toBe(true);
    expect(s.toast.visible.value).toBe(true);
    expect(s.toast.titleKey.value).toBe(
      "settings.toast.groupActionFailed.title",
    );
  });

  it("does nothing when no target group even with repository", async () => {
    const repo = stubGroupsRepository();
    const s = useSettingsPage(
      createDepsNoAutoToast({ groupsRepository: repo }),
    );
    await s.disableGroup();
    expect(repo.disableGroup).not.toHaveBeenCalled();
    expect(s.toast.visible.value).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// openDisableModal — fresh counts from repository
// ---------------------------------------------------------------------------

describe("useSettingsPage — openDisableModal (fresh counts)", () => {
  it("fetches fresh counts from getGroupDetail and updates modal", async () => {
    const repo = stubGroupsRepository({
      listGroups: vi.fn().mockReturnValue(new Promise(() => {})),
      getGroupDetail: vi.fn().mockResolvedValue({
        id: "tokyo-1",
        name: "東京一組",
        status: "active",
        createdAt: "2024-01-15",
        activeCaseCount: 99,
        memberCount: 4,
        groupNo: "GRP-001",
        description: null,
        members: [],
        customerCount: 77,
      }),
    });
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);
    const group = SAMPLE_GROUPS[0]!;

    await s.openDisableModal(group, { customerCount: 0, activeCaseCount: 0 });

    expect(repo.getGroupDetail).toHaveBeenCalledWith("tokyo-1");
    expect(s.disableModal.customerCount.value).toBe(77);
    expect(s.disableModal.caseCount.value).toBe(99);
    expect(s.disableModal.loading.value).toBe(false);
    expect(s.disableModal.isOpen.value).toBe(true);
  });

  it("opens modal immediately with fallback stats before fetch completes", async () => {
    let resolveDetail!: (v: unknown) => void;
    const detailPromise = new Promise((r) => {
      resolveDetail = r;
    });
    const repo = stubGroupsRepository({
      listGroups: vi.fn().mockReturnValue(new Promise(() => {})),
      getGroupDetail: vi.fn().mockReturnValue(detailPromise),
    });
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);
    const group = SAMPLE_GROUPS[0]!;

    const promise = s.openDisableModal(group, {
      customerCount: 10,
      activeCaseCount: 5,
    });

    expect(s.disableModal.isOpen.value).toBe(true);
    expect(s.disableModal.customerCount.value).toBe(10);
    expect(s.disableModal.caseCount.value).toBe(5);
    expect(s.disableModal.loading.value).toBe(true);

    resolveDetail({
      id: "tokyo-1",
      name: "東京一組",
      status: "active",
      createdAt: "2024-01-15",
      activeCaseCount: 42,
      memberCount: 4,
      groupNo: "GRP-001",
      description: null,
      members: [],
      customerCount: 33,
    });
    await promise;

    expect(s.disableModal.customerCount.value).toBe(33);
    expect(s.disableModal.caseCount.value).toBe(42);
    expect(s.disableModal.loading.value).toBe(false);
  });

  it("keeps fallback stats when getGroupDetail fails", async () => {
    const repo = stubGroupsRepository({
      listGroups: vi.fn().mockReturnValue(new Promise(() => {})),
      getGroupDetail: vi.fn().mockRejectedValue(new Error("network")),
    });
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);
    const group = SAMPLE_GROUPS[0]!;

    await s.openDisableModal(group, {
      customerCount: 10,
      activeCaseCount: 5,
    });

    expect(s.disableModal.customerCount.value).toBe(10);
    expect(s.disableModal.caseCount.value).toBe(5);
    expect(s.disableModal.loading.value).toBe(false);
    expect(s.disableModal.isOpen.value).toBe(true);
  });

  it("skips repo when groupsRepository is not injected", async () => {
    const deps = createDepsNoAutoToast();
    const s = useSettingsPage(deps);
    const group = SAMPLE_GROUPS[0]!;

    await s.openDisableModal(group, {
      customerCount: 28,
      activeCaseCount: 35,
    });

    expect(s.disableModal.customerCount.value).toBe(28);
    expect(s.disableModal.caseCount.value).toBe(35);
    expect(s.disableModal.loading.value).toBe(false);
    expect(s.disableModal.isOpen.value).toBe(true);
  });

  it("discards stale response when modal was re-opened for a different group", async () => {
    let resolveDetail!: (v: unknown) => void;
    const detailPromise = new Promise((r) => {
      resolveDetail = r;
    });
    const repo = stubGroupsRepository({
      listGroups: vi.fn().mockReturnValue(new Promise(() => {})),
      getGroupDetail: vi.fn().mockReturnValue(detailPromise),
    });
    const deps = createDepsNoAutoToast({ groupsRepository: repo });
    const s = useSettingsPage(deps);

    const promise = s.openDisableModal(SAMPLE_GROUPS[0]!, {
      customerCount: 0,
      activeCaseCount: 0,
    });

    s.disableModal.open(SAMPLE_GROUPS[1]!, {
      customerCount: 15,
      activeCaseCount: 20,
    });

    resolveDetail({
      id: "tokyo-1",
      name: "東京一組",
      status: "active",
      createdAt: "2024-01-15",
      activeCaseCount: 99,
      memberCount: 4,
      groupNo: "GRP-001",
      description: null,
      members: [],
      customerCount: 77,
    });
    await promise;

    expect(s.disableModal.targetGroupId.value).toBe("tokyo-2");
    expect(s.disableModal.customerCount.value).toBe(15);
    expect(s.disableModal.caseCount.value).toBe(20);
  });
});
