import { ref, computed, type Ref } from "vue";
import type {
  PermissionOverridesRepository,
  PermissionOverrideItem,
  SetOverrideInput,
} from "./PermissionOverridesRepository";
import type {
  RolesAdminRepository,
  RoleDetailItem,
} from "./RolesAdminRepository";
import type { MemberItem } from "./UsersAdminRepository";
import { PERMISSION_GROUPS } from "./permissionGroups";

/**
 *
 */
export type OverrideEffect = "grant" | "deny";

/**
 *
 */
export interface EffectivePermissionRow {
  /**
   *
   */
  code: string;
  /**
   *
   */
  labelKey: string;
  /**
   *
   */
  fromRole: boolean;
  /**
   *
   */
  overrideEffect: OverrideEffect | null;
  /**
   *
   */
  effective: boolean;
}

/**
 *
 */
export interface UseMemberOverridesDeps {
  /**
   *
   */
  overridesRepository: PermissionOverridesRepository;
  /**
   *
   */
  rolesRepository: RolesAdminRepository;
}

type OverridesState = {
  open: Ref<boolean>;
  member: Ref<MemberItem | null>;
  overrides: Ref<PermissionOverrideItem[]>;
  roleDetail: Ref<RoleDetailItem | null>;
  loading: Ref<boolean>;
  saving: Ref<boolean>;
  error: Ref<string | null>;
  addModalOpen: Ref<boolean>;
  deleteModalOpen: Ref<boolean>;
  deleteTarget: Ref<PermissionOverrideItem | null>;
  auditExpanded: Ref<boolean>;
};

function createOverridesState(): OverridesState {
  return {
    open: ref(false),
    member: ref<MemberItem | null>(null),
    overrides: ref<PermissionOverrideItem[]>([]),
    roleDetail: ref<RoleDetailItem | null>(null),
    loading: ref(false),
    saving: ref(false),
    error: ref<string | null>(null),
    addModalOpen: ref(false),
    deleteModalOpen: ref(false),
    deleteTarget: ref<PermissionOverrideItem | null>(null),
    auditExpanded: ref(false),
  };
}

const ALL_PERMISSION_CODES = PERMISSION_GROUPS.flatMap((g) =>
  g.items.map((i) => i.code),
);

function buildOpenDrawer(
  state: OverridesState,
  overridesRepo: PermissionOverridesRepository,
  rolesRepo: RolesAdminRepository,
) {
  return async (member: MemberItem, roleId?: string) => {
    state.member.value = member;
    state.open.value = true;
    state.loading.value = true;
    state.error.value = null;
    state.overrides.value = [];
    state.roleDetail.value = null;

    try {
      const [overrides, roleDetail] = await Promise.all([
        overridesRepo.listOverrides(member.id),
        roleId ? rolesRepo.getRoleDetail(roleId) : Promise.resolve(null),
      ]);
      state.overrides.value = overrides;
      state.roleDetail.value = roleDetail;
    } catch (e) {
      state.error.value =
        e instanceof Error ? e.message : "Failed to load overrides";
    } finally {
      state.loading.value = false;
    }
  };
}

function buildAddOverride(
  state: OverridesState,
  repo: PermissionOverridesRepository,
) {
  return async (input: SetOverrideInput) => {
    const member = state.member.value;
    if (!member) return;

    state.saving.value = true;
    state.error.value = null;
    try {
      const existing = state.overrides.value.filter(
        (o) => o.permission !== input.permission,
      );
      const allOverrides: SetOverrideInput[] = [
        ...existing.map((o) => ({
          permission: o.permission,
          effect: o.effect,
          reason: o.reason ?? "",
          ...(o.expiresAt ? { expiresAt: o.expiresAt } : {}),
        })),
        input,
      ];
      const result = await repo.setOverrides(member.id, allOverrides);
      state.overrides.value = result;
      state.addModalOpen.value = false;
    } catch (e) {
      state.error.value =
        e instanceof Error ? e.message : "Failed to add override";
      throw e;
    } finally {
      state.saving.value = false;
    }
  };
}

function buildDeleteOverride(
  state: OverridesState,
  repo: PermissionOverridesRepository,
) {
  return async (permission: string) => {
    const member = state.member.value;
    if (!member) return;

    state.saving.value = true;
    state.error.value = null;
    try {
      await repo.deleteOverride(member.id, permission);
      state.overrides.value = state.overrides.value.filter(
        (o) => o.permission !== permission,
      );
      state.deleteModalOpen.value = false;
      state.deleteTarget.value = null;
    } catch (e) {
      state.error.value =
        e instanceof Error ? e.message : "Failed to delete override";
      throw e;
    } finally {
      state.saving.value = false;
    }
  };
}

function buildRolePermissions(state: OverridesState) {
  return computed<Set<string>>(() => {
    if (!state.roleDetail.value) return new Set();
    return new Set(state.roleDetail.value.permissions);
  });
}

function buildEffectiveRows(
  state: OverridesState,
  rolePermissions: ReturnType<typeof buildRolePermissions>,
) {
  return computed<EffectivePermissionRow[]>(() => {
    const rolePerms = rolePermissions.value;
    const overrideMap = new Map(
      state.overrides.value.map((o) => [o.permission, o.effect]),
    );

    return ALL_PERMISSION_CODES.map((code) => {
      const group = PERMISSION_GROUPS.find((g) =>
        g.items.some((i) => i.code === code),
      );
      const item = group?.items.find((i) => i.code === code);
      const fromRole = rolePerms.has(code);
      const overrideEffect = overrideMap.get(code) ?? null;

      let effective: boolean;
      if (overrideEffect === "deny") {
        effective = false;
      } else if (overrideEffect === "grant") {
        effective = true;
      } else {
        effective = fromRole;
      }

      return {
        code,
        labelKey: item?.labelKey ?? code,
        fromRole,
        overrideEffect,
        effective,
      };
    });
  });
}

function buildAvailablePermissions(state: OverridesState) {
  return computed(() => {
    const existing = new Set(state.overrides.value.map((o) => o.permission));
    return ALL_PERMISSION_CODES.filter((code) => !existing.has(code));
  });
}

/**
 * 成员个性化权限覆盖管理 composable。
 *
 * @param deps - 仓储依赖
 * @returns 页面状态と操作メソッド
 */
export function useMemberOverrides(deps: UseMemberOverridesDeps) {
  const state = createOverridesState();
  const rolePermissions = buildRolePermissions(state);
  const effectiveRows = buildEffectiveRows(state, rolePermissions);
  const availablePermissionsForAdd = buildAvailablePermissions(state);

  return {
    ...state,
    rolePermissions,
    effectiveRows,
    availablePermissionsForAdd,
    openDrawer: buildOpenDrawer(
      state,
      deps.overridesRepository,
      deps.rolesRepository,
    ),
    closeDrawer: () => {
      state.open.value = false;
      state.member.value = null;
    },
    openAddModal: () => {
      state.addModalOpen.value = true;
    },
    addOverride: buildAddOverride(state, deps.overridesRepository),
    openDeleteModal: (item: PermissionOverrideItem) => {
      state.deleteTarget.value = item;
      state.deleteModalOpen.value = true;
    },
    deleteOverride: buildDeleteOverride(state, deps.overridesRepository),
    toggleAudit: () => {
      state.auditExpanded.value = !state.auditExpanded.value;
    },
  };
}
