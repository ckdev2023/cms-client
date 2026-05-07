import { ref, computed, type Ref } from "vue";
import type {
  UsersAdminRepository,
  MemberItem,
  CreateMemberInput,
} from "./UsersAdminRepository";
import { mapSettingsError } from "./settingsErrorMessages";

/**
 *
 */
export type MemberStatus = "active" | "disabled" | "";

/**
 * 成员管理页面 composable 依赖。
 */
export interface UseMembersPageDeps {
  /**
   *
   */
  repository: UsersAdminRepository;
}

// ---------------------------------------------------------------------------
// Internal state bundle
// ---------------------------------------------------------------------------

type MembersState = {
  members: Ref<MemberItem[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  searchQuery: Ref<string>;
  statusFilter: Ref<MemberStatus>;
  createModalOpen: Ref<boolean>;
  roleModalOpen: Ref<boolean>;
  roleModalTarget: Ref<MemberItem | null>;
  passwordResultOpen: Ref<boolean>;
  temporaryPassword: Ref<string>;
};

function createMembersState(): MembersState {
  return {
    members: ref<MemberItem[]>([]),
    loading: ref(false),
    error: ref<string | null>(null),
    searchQuery: ref(""),
    statusFilter: ref<MemberStatus>(""),
    createModalOpen: ref(false),
    roleModalOpen: ref(false),
    roleModalTarget: ref<MemberItem | null>(null),
    passwordResultOpen: ref(false),
    temporaryPassword: ref(""),
  };
}

// ---------------------------------------------------------------------------
// Actions (extracted to keep composable body short)
// ---------------------------------------------------------------------------

function buildLoadMembers(state: MembersState, repo: UsersAdminRepository) {
  return async () => {
    state.loading.value = true;
    state.error.value = null;
    try {
      state.members.value = await repo.listMembers();
    } catch (e) {
      state.error.value = mapSettingsError(
        e instanceof Error ? e.message : "Failed to load members",
      );
    } finally {
      state.loading.value = false;
    }
  };
}

function buildCreateMember(state: MembersState, repo: UsersAdminRepository) {
  return async (input: CreateMemberInput) => {
    state.error.value = null;
    try {
      const created = await repo.createMember(input);
      state.members.value = [...state.members.value, created];
      state.createModalOpen.value = false;
      return created;
    } catch (e) {
      state.error.value = mapSettingsError(
        e instanceof Error ? e.message : "Failed to create member",
      );
      throw e;
    }
  };
}

function buildUpdateRole(state: MembersState, repo: UsersAdminRepository) {
  return async (userId: string, role: string) => {
    state.error.value = null;
    try {
      const updated = await repo.updateMemberRole(userId, role);
      state.members.value = state.members.value.map((m) =>
        m.id === userId ? updated : m,
      );
      state.roleModalOpen.value = false;
      state.roleModalTarget.value = null;
      return updated;
    } catch (e) {
      state.error.value = mapSettingsError(
        e instanceof Error ? e.message : "Failed to update role",
      );
      throw e;
    }
  };
}

function buildDisableMember(state: MembersState, repo: UsersAdminRepository) {
  return async (userId: string) => {
    state.error.value = null;
    try {
      const updated = await repo.disableMember(userId);
      state.members.value = state.members.value.map((m) =>
        m.id === userId ? updated : m,
      );
      return updated;
    } catch (e) {
      state.error.value = mapSettingsError(
        e instanceof Error ? e.message : "Failed to disable member",
      );
      throw e;
    }
  };
}

function buildActivateMember(state: MembersState, repo: UsersAdminRepository) {
  return async (userId: string) => {
    state.error.value = null;
    try {
      const updated = await repo.activateMember(userId);
      state.members.value = state.members.value.map((m) =>
        m.id === userId ? updated : m,
      );
      return updated;
    } catch (e) {
      state.error.value = mapSettingsError(
        e instanceof Error ? e.message : "Failed to activate member",
      );
      throw e;
    }
  };
}

function buildResetPassword(state: MembersState, repo: UsersAdminRepository) {
  return async (userId: string) => {
    state.error.value = null;
    try {
      const result = await repo.resetPassword(userId);
      state.temporaryPassword.value = result.temporaryPassword;
      state.passwordResultOpen.value = true;
      return result;
    } catch (e) {
      state.error.value = mapSettingsError(
        e instanceof Error ? e.message : "Failed to reset password",
      );
      throw e;
    }
  };
}

// ---------------------------------------------------------------------------
// Main composable
// ---------------------------------------------------------------------------

/**
 * 成员管理页面级 composable，管理列表、筛选、CRUD 操作与弹窗状态。
 *
 * @param deps - 可注入的仓储依赖
 * @returns 页面状态与操作方法的组合
 */
export function useMembersPage(deps: UseMembersPageDeps) {
  const state = createMembersState();
  const repo = deps.repository;

  const filteredMembers = computed(() => {
    let result = state.members.value;
    if (state.statusFilter.value) {
      result = result.filter((m) => m.status === state.statusFilter.value);
    }
    if (state.searchQuery.value.trim()) {
      const q = state.searchQuery.value.trim().toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
      );
    }
    return result;
  });

  const loadMembers = buildLoadMembers(state, repo);
  void loadMembers();

  return {
    ...state,
    filteredMembers,
    loadMembers,
    createMember: buildCreateMember(state, repo),
    openRoleModal: (member: MemberItem) => {
      state.roleModalTarget.value = member;
      state.roleModalOpen.value = true;
    },
    updateRole: buildUpdateRole(state, repo),
    disableMember: buildDisableMember(state, repo),
    activateMember: buildActivateMember(state, repo),
    resetPassword: buildResetPassword(state, repo),
    closePasswordResult: () => {
      state.passwordResultOpen.value = false;
      state.temporaryPassword.value = "";
    },
  };
}
