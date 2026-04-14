import { ref, computed, type Ref } from "vue";
import type {
  SettingsPanel,
  GroupStatusFilter,
  GroupSummary,
  GroupDetail,
  GroupStats,
  OrgSettings,
} from "../types";
import { DEFAULT_PANEL } from "../fixtures";
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

  const activePanel = ref<SettingsPanel>(DEFAULT_PANEL);
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
  };
  const visibility = ref({ ...deps.orgSettings.visibility });
  const sr = createStorageRootController(deps.orgSettings, toast);

  return {
    isAdmin,
    activePanel,
    switchPanel: (p: SettingsPanel) => {
      activePanel.value = p;
    },
    ...gl,
    toast,
    groupNameModal,
    disableModal,
    createGroup: buildCreateGroupAction(ctx, groupNameModal, gl.selectGroup),
    renameGroup: buildRenameGroupAction(ctx, groupNameModal),
    disableGroup: buildDisableGroupAction(ctx, disableModal),
    visibility,
    saveVisibility: () => toast.show("visibilityUpdated"),
    storageRoot: sr.storageRoot,
    isStorageRootConfigured: sr.isConfigured,
    storageRootPreview: sr.preview,
    saveStorageRoot: sr.save,
  };
}
