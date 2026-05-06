import { ref, computed, type Ref } from "vue";
import type {
  RolesAdminRepository,
  RoleItem,
  RoleDetailItem,
  CreateRoleInput,
  UpdateRoleInput,
} from "./RolesAdminRepository";

/**
 *
 */
export type RolesView = "list" | "detail";

/**
 *
 */
export interface UseRolesPageDeps {
  /**
   *
   */
  repository: RolesAdminRepository;
}

type RolesState = {
  roles: Ref<RoleItem[]>;
  selectedRole: Ref<RoleDetailItem | null>;
  view: Ref<RolesView>;
  loading: Ref<boolean>;
  saving: Ref<boolean>;
  error: Ref<string | null>;
  createModalOpen: Ref<boolean>;
  createFromRole: Ref<RoleDetailItem | null>;
  deleteModalOpen: Ref<boolean>;
  deleteTarget: Ref<RoleItem | null>;
};

function createRolesState(): RolesState {
  return {
    roles: ref<RoleItem[]>([]),
    selectedRole: ref<RoleDetailItem | null>(null),
    view: ref<RolesView>("list"),
    loading: ref(false),
    saving: ref(false),
    error: ref<string | null>(null),
    createModalOpen: ref(false),
    createFromRole: ref<RoleDetailItem | null>(null),
    deleteModalOpen: ref(false),
    deleteTarget: ref<RoleItem | null>(null),
  };
}

function buildLoadRoles(state: RolesState, repo: RolesAdminRepository) {
  return async () => {
    state.loading.value = true;
    state.error.value = null;
    try {
      state.roles.value = await repo.listRoles();
    } catch (e) {
      state.error.value =
        e instanceof Error ? e.message : "Failed to load roles";
    } finally {
      state.loading.value = false;
    }
  };
}

function buildSelectRole(state: RolesState, repo: RolesAdminRepository) {
  return async (id: string) => {
    state.loading.value = true;
    state.error.value = null;
    try {
      state.selectedRole.value = await repo.getRoleDetail(id);
      state.view.value = "detail";
    } catch (e) {
      state.error.value =
        e instanceof Error ? e.message : "Failed to load role";
    } finally {
      state.loading.value = false;
    }
  };
}

function buildCreateRole(
  state: RolesState,
  repo: RolesAdminRepository,
  loadRoles: () => Promise<void>,
) {
  return async (input: CreateRoleInput) => {
    state.saving.value = true;
    state.error.value = null;
    try {
      const created = await repo.createRole(input);
      state.createModalOpen.value = false;
      state.createFromRole.value = null;
      await loadRoles();
      state.selectedRole.value = created;
      state.view.value = "detail";
      return created;
    } catch (e) {
      state.error.value =
        e instanceof Error ? e.message : "Failed to create role";
      throw e;
    } finally {
      state.saving.value = false;
    }
  };
}

function buildUpdateRole(state: RolesState, repo: RolesAdminRepository) {
  return async (id: string, input: UpdateRoleInput) => {
    state.saving.value = true;
    state.error.value = null;
    try {
      const updated = await repo.updateRole(id, input);
      state.selectedRole.value = updated;
      state.roles.value = state.roles.value.map((r) =>
        r.id === id
          ? { ...r, name: updated.name, description: updated.description }
          : r,
      );
      return updated;
    } catch (e) {
      state.error.value =
        e instanceof Error ? e.message : "Failed to update role";
      throw e;
    } finally {
      state.saving.value = false;
    }
  };
}

function buildSavePermissions(state: RolesState, repo: RolesAdminRepository) {
  return async (id: string, permissions: string[]) => {
    state.saving.value = true;
    state.error.value = null;
    try {
      const updated = await repo.setRolePermissions(id, permissions);
      state.selectedRole.value = updated;
      return updated;
    } catch (e) {
      state.error.value =
        e instanceof Error ? e.message : "Failed to save permissions";
      throw e;
    } finally {
      state.saving.value = false;
    }
  };
}

function buildDeleteRole(
  state: RolesState,
  repo: RolesAdminRepository,
  loadRoles: () => Promise<void>,
) {
  return async (id: string) => {
    state.saving.value = true;
    state.error.value = null;
    try {
      await repo.deleteRole(id);
      state.deleteModalOpen.value = false;
      state.deleteTarget.value = null;
      if (state.selectedRole.value?.id === id) {
        state.selectedRole.value = null;
        state.view.value = "list";
      }
      await loadRoles();
    } catch (e) {
      state.error.value =
        e instanceof Error ? e.message : "Failed to delete role";
      throw e;
    } finally {
      state.saving.value = false;
    }
  };
}

/**
 * 角色管理ページ composable。一覧・詳細・CRUD・削除を管理する。
 *
 * @param deps - 仓储依赖
 * @returns ページ状態と操作メソッド
 */
export function useRolesPage(deps: UseRolesPageDeps) {
  const state = createRolesState();
  const repo = deps.repository;

  const loadRoles = buildLoadRoles(state, repo);
  void loadRoles();

  const systemRoles = computed(() =>
    state.roles.value.filter((r) => r.isSystem),
  );
  const customRoles = computed(() =>
    state.roles.value.filter((r) => !r.isSystem),
  );

  return {
    ...state,
    systemRoles,
    customRoles,
    loadRoles,
    selectRole: buildSelectRole(state, repo),
    backToList: () => {
      state.selectedRole.value = null;
      state.view.value = "list";
    },
    openCreate: (fromRole?: RoleDetailItem | null) => {
      state.createFromRole.value = fromRole ?? null;
      state.createModalOpen.value = true;
    },
    createRole: buildCreateRole(state, repo, loadRoles),
    updateRole: buildUpdateRole(state, repo),
    savePermissions: buildSavePermissions(state, repo),
    openDelete: (role: RoleItem) => {
      state.deleteTarget.value = role;
      state.deleteModalOpen.value = true;
    },
    deleteRole: buildDeleteRole(state, repo, loadRoles),
  };
}
