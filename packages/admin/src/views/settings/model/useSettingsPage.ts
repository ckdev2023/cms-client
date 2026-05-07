import { ref, computed, watch, isRef, type Ref } from "vue";
import type { UseOrgSettingsReturn } from "../../../shared/model/useOrgSettings";
import type {
  SettingsPanel,
  GroupStatusFilter,
  GroupSummary,
  GroupDetail,
  GroupStats,
  OrgSettings,
} from "../types";
import { resolveSettingsPanel } from "../query";
import {
  createToastController,
  createGroupNameModal,
  createDisableModal,
  buildCreateGroupAction,
  buildRenameGroupAction,
  buildDisableGroupAction,
  createStorageRootController,
  type GroupMutationCtx,
} from "./settingsControllers";
import type { OrgSettingsRepository } from "./OrgSettingsRepository";
import type { GroupsRepository } from "./GroupsRepository";

export type {
  ToastState,
  GroupNameModalMode,
  GroupNameModalState,
  DisableModalState,
} from "./settingsControllers";

// ---------------------------------------------------------------------------
// Dependencies (injectable for testing)
// ---------------------------------------------------------------------------

/**
 *
 */
export interface UseSettingsPageDeps {
  /**
   *
   */
  initialGroups: GroupSummary[];
  /**
   *
   */
  groupDetails: Record<string, GroupDetail>;
  /**
   *
   */
  groupStats: Record<string, GroupStats>;
  /**
   *
   */
  orgSettings: OrgSettings;
  /**
   *
   */
  isAdmin: Ref<boolean> | boolean;
  /**
   *
   */
  toastDuration?: number;
  /**
   *
   */
  setTimeoutFn?: typeof setTimeout;
  /**
   *
   */
  clearTimeoutFn?: typeof clearTimeout;
  /**
   *
   */
  orgSettingsRepository?: OrgSettingsRepository;
  /**
   *
   */
  orgSettingsController?: Pick<UseOrgSettingsReturn, "storageRoot">;
  /**
   *
   */
  groupsRepository?: GroupsRepository;
  /**
   *
   */
  routeTab?: Ref<string | undefined>;
  /**
   * 面板切换时的外部回调，用于同步 URL 等副作用。
   */
  onTabChange?: (panel: SettingsPanel) => void;
}

// ---------------------------------------------------------------------------
// Group list helper
// ---------------------------------------------------------------------------

function createGroupList(deps: UseSettingsPageDeps) {
  const groups = ref<GroupSummary[]>([...deps.initialGroups]);
  const statusFilter = ref<GroupStatusFilter>("");
  const selectedGroupId = ref<string | null>(null);

  const filteredGroups = computed(() =>
    statusFilter.value === ""
      ? groups.value
      : groups.value.filter((g) => g.status === statusFilter.value),
  );
  const isEmpty = computed(() => groups.value.length === 0);
  const selectedGroup = computed<GroupDetail | null>(() =>
    selectedGroupId.value
      ? (deps.groupDetails[selectedGroupId.value] ?? null)
      : null,
  );
  const selectedGroupStats = computed<GroupStats | null>(() =>
    selectedGroupId.value
      ? (deps.groupStats[selectedGroupId.value] ?? null)
      : null,
  );

  function selectGroup(id: string) {
    selectedGroupId.value = id;
  }
  function clearSelection() {
    selectedGroupId.value = null;
  }

  return {
    groups,
    statusFilter,
    filteredGroups,
    isEmpty,
    selectedGroupId,
    selectedGroup,
    selectedGroupStats,
    selectGroup,
    clearSelection,
  };
}

function syncSettingsState(input: {
  next: OrgSettings;
  visibility: Ref<OrgSettings["visibility"]>;
  storageRoot: Ref<OrgSettings["storageRoot"]>;
  orgSettingsController?: Pick<UseOrgSettingsReturn, "storageRoot">;
}) {
  input.visibility.value = { ...input.next.visibility };
  input.storageRoot.value = { ...input.next.storageRoot };
  if (input.orgSettingsController) {
    input.orgSettingsController.storageRoot.value = {
      rootLabel: input.next.storageRoot.rootLabel,
      rootPath: input.next.storageRoot.rootPath,
    };
  }
}

function createOrgSettingsSection(
  deps: Pick<
    UseSettingsPageDeps,
    "orgSettings" | "orgSettingsRepository" | "orgSettingsController"
  >,
  toast: ReturnType<typeof createToastController>,
) {
  const visibility = ref({ ...deps.orgSettings.visibility });
  const sr = createStorageRootController(deps.orgSettings, toast);

  function applyNext(next: OrgSettings) {
    syncSettingsState({
      next,
      visibility,
      storageRoot: sr.storageRoot,
      orgSettingsController: deps.orgSettingsController,
    });
  }

  async function loadOrgSettings() {
    if (!deps.orgSettingsRepository) return;
    try {
      applyNext(await deps.orgSettingsRepository.getOrgSettings());
    } catch {
      return;
    }
  }

  async function saveVisibility() {
    if (!deps.orgSettingsRepository) {
      toast.show("visibilityUpdated");
      return;
    }

    const next = await deps.orgSettingsRepository.updateOrgSettings({
      visibility: { ...visibility.value },
    });
    applyNext(next);
    toast.show("visibilityUpdated");
  }

  async function saveStorageRoot() {
    if (!deps.orgSettingsRepository) {
      sr.save();
      return;
    }

    const next = await deps.orgSettingsRepository.updateOrgSettings({
      storageRoot: {
        rootLabel: sr.storageRoot.value.rootLabel,
        rootPath: sr.storageRoot.value.rootPath,
      },
    });
    applyNext(next);
    toast.show("storageRootUpdated");
  }

  return { visibility, sr, loadOrgSettings, saveVisibility, saveStorageRoot };
}

// ---------------------------------------------------------------------------
// Group loading & disable-modal helpers
// ---------------------------------------------------------------------------

async function loadGroupsFromRepo(
  repo: GroupsRepository | undefined,
  groups: ReturnType<typeof createGroupList>["groups"],
) {
  if (!repo) return;
  try {
    const summaries = await repo.listGroups();
    if (!Array.isArray(summaries)) return;
    groups.value = summaries;
  } catch {
    return;
  }
}

function buildOpenDisableModal(
  repo: GroupsRepository | undefined,
  modal: ReturnType<typeof createDisableModal>,
) {
  return async (group: GroupSummary, fallbackStats: GroupStats) => {
    modal.open(group, fallbackStats);
    if (!repo) return;

    modal.loading.value = true;
    try {
      const detail = await repo.getGroupDetail(group.id);
      if (modal.targetGroupId.value !== group.id) return;
      modal.customerCount.value = detail.customerCount;
      modal.caseCount.value = detail.activeCaseCount;
    } catch {
      /* keep fallback counts */
    } finally {
      modal.loading.value = false;
    }
  };
}

// ---------------------------------------------------------------------------
// Route-tab → activePanel binding
// ---------------------------------------------------------------------------

function createActivePanel(routeTab?: Ref<string | undefined>) {
  const initialPanel = resolveSettingsPanel(
    isRef(routeTab) ? routeTab.value : undefined,
  );
  const activePanel = ref<SettingsPanel>(initialPanel);

  if (routeTab) {
    watch(
      routeTab,
      (next) => {
        activePanel.value = resolveSettingsPanel(next);
      },
      { flush: "sync" },
    );
  }

  return activePanel;
}

// ---------------------------------------------------------------------------
// Main composable
// ---------------------------------------------------------------------------

/**
 * 系统设置页面级 composable，集中管理子导航、Group 选择与过滤、toast、弹窗开关和权限态。
 *
 * @param deps - 可注入的外部依赖（fixture 数据、权限、定时器）
 * @returns 页面状态与操作方法的组合
 */
export function useSettingsPage(deps: UseSettingsPageDeps) {
  const isAdmin =
    typeof deps.isAdmin === "boolean"
      ? computed(() => deps.isAdmin as boolean)
      : deps.isAdmin;
  const activePanel = createActivePanel(deps.routeTab);
  const gl = createGroupList(deps);
  const toast = createToastController({
    duration: deps.toastDuration,
    setTimeoutFn: deps.setTimeoutFn,
    clearTimeoutFn: deps.clearTimeoutFn,
  });
  const groupNameModal = createGroupNameModal();
  const disableModal = createDisableModal();

  const ctx: GroupMutationCtx = {
    groups: gl.groups,
    groupDetails: deps.groupDetails,
    groupStats: deps.groupStats,
    toast,
    groupsRepository: deps.groupsRepository,
  };
  const settings = createOrgSettingsSection(deps, toast);

  void loadGroupsFromRepo(deps.groupsRepository, gl.groups);
  void settings.loadOrgSettings();

  return {
    isAdmin,
    activePanel,
    switchPanel: (p: SettingsPanel) => {
      activePanel.value = p;
      deps.onTabChange?.(p);
    },
    ...gl,
    toast,
    groupNameModal,
    disableModal,
    openDisableModal: buildOpenDisableModal(
      deps.groupsRepository,
      disableModal,
    ),
    createGroup: buildCreateGroupAction(ctx, groupNameModal, gl.selectGroup),
    renameGroup: buildRenameGroupAction(ctx, groupNameModal),
    disableGroup: buildDisableGroupAction(ctx, disableModal),
    visibility: settings.visibility,
    saveVisibility: settings.saveVisibility,
    storageRoot: settings.sr.storageRoot,
    isStorageRootConfigured: settings.sr.isConfigured,
    storageRootPreview: settings.sr.preview,
    saveStorageRoot: settings.saveStorageRoot,
  };
}
