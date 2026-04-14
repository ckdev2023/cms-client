import { ref, computed, type Ref, type ComputedRef } from "vue";
import type {
  GroupSummary,
  GroupDetail,
  GroupStats,
  OrgSettings,
  SettingsToastKey,
} from "../types";
import { SETTINGS_TOAST_PRESETS, TOAST_DURATION_MS } from "../fixtures";

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

/**
 *
 */
export interface ToastState {
  /**
   *
   */
  visible: Ref<boolean>;
  /**
   *
   */
  titleKey: Ref<string>;
  /**
   *
   */
  descriptionKey: Ref<string>;
  /**
   *
   */
  show: (key: SettingsToastKey) => void;
  /**
   *
   */
  hide: () => void;
}

/**
 *
 */
export interface ToastControllerOpts {
  /**
   *
   */
  duration?: number;
  /**
   *
   */
  setTimeoutFn?: typeof setTimeout;
  /**
   *
   */
  clearTimeoutFn?: typeof clearTimeout;
}

/**
 * Settings 页面 toast 状态控制器。
 *
 * @param opts - 可注入的定时器实现
 * @returns toast 状态与触发方法
 */
export function createToastController(opts?: ToastControllerOpts): ToastState {
  const duration = opts?.duration ?? TOAST_DURATION_MS;
  const _setTimeout = opts?.setTimeoutFn ?? setTimeout;
  const _clearTimeout = opts?.clearTimeoutFn ?? clearTimeout;

  const visible = ref(false);
  const titleKey = ref("");
  const descriptionKey = ref("");
  let timer: ReturnType<typeof setTimeout> | null = null;

  function show(key: SettingsToastKey) {
    if (timer) _clearTimeout(timer);
    const preset = SETTINGS_TOAST_PRESETS[key];
    titleKey.value = preset.titleKey;
    descriptionKey.value = preset.descriptionKey;
    visible.value = true;
    timer = _setTimeout(() => {
      visible.value = false;
      timer = null;
    }, duration);
  }

  function hide() {
    if (timer) _clearTimeout(timer);
    visible.value = false;
    timer = null;
  }

  return { visible, titleKey, descriptionKey, show, hide };
}

// ---------------------------------------------------------------------------
// Group name modal (create / rename)
// ---------------------------------------------------------------------------

/**
 *
 */
export type GroupNameModalMode = "create" | "rename";

/**
 *
 */
export interface GroupNameModalState {
  /**
   *
   */
  isOpen: Ref<boolean>;
  /**
   *
   */
  mode: Ref<GroupNameModalMode>;
  /**
   *
   */
  inputValue: Ref<string>;
  /**
   *
   */
  targetGroupId: Ref<string | null>;
  /**
   *
   */
  canSubmit: ComputedRef<boolean>;
  /**
   *
   */
  openCreate: () => void;
  /**
   *
   */
  openRename: (groupId: string, currentName: string) => void;
  /**
   *
   */
  close: () => void;
}

/**
 * Group 名称弹窗状态控制器（新建 / 重命名共用）。
 *
 * @returns 弹窗状态与操作方法
 */
export function createGroupNameModal(): GroupNameModalState {
  const isOpen = ref(false);
  const mode = ref<GroupNameModalMode>("create");
  const inputValue = ref("");
  const targetGroupId = ref<string | null>(null);

  function openCreate() {
    mode.value = "create";
    inputValue.value = "";
    targetGroupId.value = null;
    isOpen.value = true;
  }

  function openRename(groupId: string, currentName: string) {
    mode.value = "rename";
    inputValue.value = currentName;
    targetGroupId.value = groupId;
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
    inputValue.value = "";
    targetGroupId.value = null;
  }

  const canSubmit = computed(() => inputValue.value.trim().length > 0);

  return {
    isOpen,
    mode,
    inputValue,
    targetGroupId,
    canSubmit,
    openCreate,
    openRename,
    close,
  };
}

// ---------------------------------------------------------------------------
// Disable confirmation modal
// ---------------------------------------------------------------------------

/**
 *
 */
export interface DisableModalState {
  /**
   *
   */
  isOpen: Ref<boolean>;
  /**
   *
   */
  targetGroupId: Ref<string | null>;
  /**
   *
   */
  groupName: Ref<string>;
  /**
   *
   */
  customerCount: Ref<number>;
  /**
   *
   */
  caseCount: Ref<number>;
  /**
   *
   */
  hasReferences: ComputedRef<boolean>;
  /**
   *
   */
  open: (group: GroupSummary, stats: GroupStats) => void;
  /**
   *
   */
  close: () => void;
}

/**
 * Group 停用确认弹窗状态控制器。
 *
 * @returns 弹窗状态与操作方法
 */
export function createDisableModal(): DisableModalState {
  const isOpen = ref(false);
  const targetGroupId = ref<string | null>(null);
  const groupName = ref("");
  const customerCount = ref(0);
  const caseCount = ref(0);

  const hasReferences = computed(
    () => customerCount.value > 0 || caseCount.value > 0,
  );

  function open(group: GroupSummary, stats: GroupStats) {
    targetGroupId.value = group.id;
    groupName.value = group.name;
    customerCount.value = stats.customerCount;
    caseCount.value = stats.activeCaseCount;
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
    targetGroupId.value = null;
    groupName.value = "";
    customerCount.value = 0;
    caseCount.value = 0;
  }

  return {
    isOpen,
    targetGroupId,
    groupName,
    customerCount,
    caseCount,
    hasReferences,
    open,
    close,
  };
}

// ---------------------------------------------------------------------------
// Group mutation context & actions
// ---------------------------------------------------------------------------

/**
 *
 */
export interface GroupMutationCtx {
  /**
   *
   */
  groups: Ref<GroupSummary[]>;
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
  toast: ToastState;
}

/**
 * 构建"新建 Group"操作闭包。
 *
 * @param ctx - Group 变更上下文
 * @param modal - 名称弹窗状态
 * @param selectGroup - 选中回调
 * @returns 新建操作函数
 */
export function buildCreateGroupAction(
  ctx: GroupMutationCtx,
  modal: GroupNameModalState,
  selectGroup: (id: string) => void,
) {
  let nextIndex = ctx.groups.value.length + 1;

  return function createGroup() {
    const name = modal.inputValue.value.trim();
    if (!name) return;

    const id = `grp-new-${nextIndex}`;
    const groupNo = `GRP-${String(nextIndex).padStart(3, "0")}`;
    nextIndex++;

    const now = new Date().toISOString().slice(0, 10);
    const summary: GroupSummary = {
      id,
      name,
      status: "active",
      createdAt: now,
      activeCaseCount: 0,
      memberCount: 0,
    };

    ctx.groups.value = [...ctx.groups.value, summary];
    ctx.groupDetails[id] = {
      ...summary,
      groupNo,
      description: null,
      members: [],
      customerCount: 0,
    };
    ctx.groupStats[id] = { customerCount: 0, activeCaseCount: 0 };

    modal.close();
    selectGroup(id);
    ctx.toast.show("groupCreated");
  };
}

/**
 * 构建"重命名 Group"操作闭包。
 *
 * @param ctx - Group 变更上下文
 * @param modal - 名称弹窗状态
 * @returns 重命名操作函数
 */
export function buildRenameGroupAction(
  ctx: GroupMutationCtx,
  modal: GroupNameModalState,
) {
  return function renameGroup() {
    const newName = modal.inputValue.value.trim();
    const targetId = modal.targetGroupId.value;
    if (!newName || !targetId) return;

    ctx.groups.value = ctx.groups.value.map((g) =>
      g.id === targetId ? { ...g, name: newName } : g,
    );
    const detail = ctx.groupDetails[targetId];
    if (detail) ctx.groupDetails[targetId] = { ...detail, name: newName };

    modal.close();
    ctx.toast.show("groupRenamed");
  };
}

/**
 * 构建"停用 Group"操作闭包。
 *
 * @param ctx - Group 变更上下文
 * @param modal - 停用确认弹窗状态
 * @returns 停用操作函数
 */
export function buildDisableGroupAction(
  ctx: GroupMutationCtx,
  modal: DisableModalState,
) {
  return function disableGroup() {
    const targetId = modal.targetGroupId.value;
    if (!targetId) return;

    ctx.groups.value = ctx.groups.value.map((g) =>
      g.id === targetId ? { ...g, status: "disabled" as const } : g,
    );
    const detail = ctx.groupDetails[targetId];
    if (detail) {
      ctx.groupDetails[targetId] = { ...detail, status: "disabled" };
    }

    modal.close();
    ctx.toast.show("groupDisabled");
  };
}

// ---------------------------------------------------------------------------
// Storage root controller
// ---------------------------------------------------------------------------

/**
 * 本地资料根目录面板状态控制器。
 *
 * @param orgSettings - 初始组织设置
 * @param toast - toast 控制器
 * @returns 根目录状态与保存方法
 */
export function createStorageRootController(
  orgSettings: OrgSettings,
  toast: ToastState,
) {
  const storageRoot = ref({ ...orgSettings.storageRoot });

  const isConfigured = computed(
    () =>
      storageRoot.value.rootLabel !== null &&
      storageRoot.value.rootLabel !== "" &&
      storageRoot.value.rootPath !== null &&
      storageRoot.value.rootPath !== "",
  );

  const preview = computed(() => {
    if (!isConfigured.value) return "";
    return `${storageRoot.value.rootPath}/{relative_path}`;
  });

  function save() {
    toast.show("storageRootUpdated");
  }

  return { storageRoot, isConfigured, preview, save };
}
