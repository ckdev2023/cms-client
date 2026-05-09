<script setup lang="ts">
/* eslint-disable max-lines */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { usePermission } from "../../shared/composables/usePermission";
import { useOrgSettings } from "../../shared/model/useOrgSettings";
import { useAdminSession } from "../../auth/model/adminSession";
import PageHeader from "../../shared/ui/PageHeader.vue";
import GroupListPanel from "./components/GroupListPanel.vue";
import GroupDetailMeta from "./components/GroupDetailMeta.vue";
import GroupMemberList from "./components/GroupMemberList.vue";
import GroupStatsPanel from "./components/GroupStatsPanel.vue";
import GroupNameModal from "./components/GroupNameModal.vue";
import GroupDisableModal from "./components/GroupDisableModal.vue";
import MemberListPanel from "./components/MemberListPanel.vue";
import MemberCreateModal from "./components/MemberCreateModal.vue";
import MemberRoleModal from "./components/MemberRoleModal.vue";
import MemberDisableConfirmModal from "./components/MemberDisableConfirmModal.vue";
import PasswordResetResultModal from "./components/PasswordResetResultModal.vue";
import RoleListPanel from "./components/RoleListPanel.vue";
import RoleDetailPanel from "./components/RoleDetailPanel.vue";
import RoleCreateModal from "./components/RoleCreateModal.vue";
import RoleDeleteModal from "./components/RoleDeleteModal.vue";
import MemberOverridesDrawer from "./components/MemberOverridesDrawer.vue";
import OverrideAddModal from "./components/OverrideAddModal.vue";
import OverrideDeleteModal from "./components/OverrideDeleteModal.vue";
import VisibilityConfigPanel from "./components/VisibilityConfigPanel.vue";
import StorageRootPanel from "./components/StorageRootPanel.vue";
import FeatureFlagsPanel from "./components/FeatureFlagsPanel.vue";
import SettingsToast from "./components/SettingsToast.vue";
import { createOrgSettingsRepository } from "./model/OrgSettingsRepository";
import { createGroupsRepository } from "./model/GroupsRepository";
import { createUsersAdminRepository } from "./model/UsersAdminRepository";
import { createRolesAdminRepository } from "./model/RolesAdminRepository";
import { createPermissionOverridesRepository } from "./model/PermissionOverridesRepository";
import { createFeatureFlagsAdminRepository } from "./model/FeatureFlagsAdminRepository";
import { useSettingsPage } from "./model/useSettingsPage";
import { useFeatureFlagsPanel } from "./model/useFeatureFlagsPanel";
import { useMembersPage } from "./model/useMembersPage";
import { useRolesPage } from "./model/useRolesPage";
import { useMemberOverrides } from "./model/useMemberOverrides";
import {
  SETTINGS_SUBNAV_ITEMS,
  SAMPLE_GROUPS,
  SAMPLE_GROUP_DETAILS,
  SAMPLE_GROUP_STATS,
  SAMPLE_ORG_SETTINGS_UNCONFIGURED,
} from "./fixtures";
import { buildSettingsQuery } from "./query";

/** 系统设置页入口，编排子导航切换与三个配置面板。 */
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { has: hasPerm } = usePermission();
const { currentUser } = useAdminSession();
const orgSettingsController = useOrgSettings();

const visibleSubnavItems = computed(() =>
  SETTINGS_SUBNAV_ITEMS.filter(
    (item) => !item.requiredPermission || hasPerm(item.requiredPermission),
  ),
);
const routeTab = computed(() => {
  const q = route?.query;
  return typeof q?.tab === "string" ? q.tab : undefined;
});

const page = useSettingsPage({
  initialGroups: SAMPLE_GROUPS,
  groupDetails: { ...SAMPLE_GROUP_DETAILS },
  groupStats: { ...SAMPLE_GROUP_STATS },
  orgSettings: structuredClone(SAMPLE_ORG_SETTINGS_UNCONFIGURED),
  orgSettingsRepository: createOrgSettingsRepository(),
  groupsRepository: createGroupsRepository(),
  orgSettingsController,
  isAdmin: ref(true),
  routeTab,
  onTabChange: (panel) => router.replace({ query: buildSettingsQuery(panel) }),
});

const membersPage = useMembersPage({
  repository: createUsersAdminRepository(),
});

const rolesAdminRepo = createRolesAdminRepository();

const rolesPage = useRolesPage({
  repository: rolesAdminRepo,
});

const overridesPage = useMemberOverrides({
  overridesRepository: createPermissionOverridesRepository(),
  rolesRepository: rolesAdminRepo,
});

const featureFlagsPanel = useFeatureFlagsPanel({
  repository: createFeatureFlagsAdminRepository(),
  toast: page.toast,
});

const disableTarget = ref<{ id: string; name: string } | null>(null);

/**
 * 打开停用确认弹窗。
 * @param userId - 目标成员 ID
 */
function openDisableConfirm(userId: string) {
  const m = membersPage.members.value.find((x) => x.id === userId);
  disableTarget.value = m
    ? { id: m.id, name: m.name }
    : { id: userId, name: "" };
}

/** 确认停用成员并关闭弹窗。 */
function confirmDisable() {
  if (disableTarget.value)
    void membersPage.disableMember(disableTarget.value.id);
  disableTarget.value = null;
}
</script>

<template>
  <div class="settings-view">
    <PageHeader
      :title="t('settings.title')"
      :breadcrumbs="[
        { label: t('shell.nav.items.dashboard'), href: '#/' },
        { label: t('shell.nav.groups.system') },
        { label: t('settings.title') },
      ]"
    />

    <div class="settings-view__body">
      <nav
        class="settings-view__subnav"
        :aria-label="t('settings.subnav.ariaLabel')"
      >
        <button
          v-for="item in visibleSubnavItems"
          :key="item.id"
          type="button"
          class="settings-view__subnav-btn"
          :class="{
            'settings-view__subnav-btn--active':
              page.activePanel.value === item.id,
          }"
          :aria-current="
            page.activePanel.value === item.id ? 'page' : undefined
          "
          @click="page.switchPanel(item.id)"
        >
          {{ t(item.labelKey) }}
        </button>
      </nav>

      <div class="settings-view__content">
        <template v-if="page.activePanel.value === 'group-management'">
          <div
            class="settings-view__group-layout"
            :class="{
              'settings-view__group-layout--with-detail':
                page.selectedGroup.value,
            }"
          >
            <GroupListPanel
              :groups="page.groups.value"
              :filtered-groups="page.filteredGroups.value"
              :status-filter="page.statusFilter.value"
              :selected-group-id="page.selectedGroupId.value"
              :is-empty="page.isEmpty.value"
              @update:status-filter="page.statusFilter.value = $event"
              @select-group="page.selectGroup($event)"
              @open-create="page.groupNameModal.openCreate()"
            />

            <aside
              v-if="page.selectedGroup.value"
              class="settings-view__group-detail"
            >
              <GroupDetailMeta
                :group="page.selectedGroup.value"
                @rename="
                  page.groupNameModal.openRename(
                    page.selectedGroup.value!.id,
                    page.selectedGroup.value!.name,
                  )
                "
                @disable="
                  page.disableModal.open(
                    page.selectedGroup.value!,
                    page.selectedGroupStats.value ?? {
                      customerCount: 0,
                      activeCaseCount: 0,
                    },
                  )
                "
              />

              <hr class="settings-view__divider" />

              <GroupMemberList :members="page.selectedGroup.value.members" />

              <hr class="settings-view__divider" />

              <GroupStatsPanel
                v-if="page.selectedGroupStats.value"
                :stats="page.selectedGroupStats.value"
              />
            </aside>
          </div>
        </template>
        <template v-else-if="page.activePanel.value === 'member-management'">
          <MemberListPanel
            :members="membersPage.filteredMembers.value"
            :loading="membersPage.loading.value"
            :search-query="membersPage.searchQuery.value"
            :status-filter="membersPage.statusFilter.value"
            :error="membersPage.error.value"
            @update:search-query="membersPage.searchQuery.value = $event"
            @update:status-filter="membersPage.statusFilter.value = $event"
            @open-create="membersPage.createModalOpen.value = true"
            @change-role="membersPage.openRoleModal($event)"
            @disable="openDisableConfirm($event)"
            @activate="membersPage.activateMember($event)"
            @reset-password="membersPage.resetPassword($event)"
            @open-overrides="overridesPage.openDrawer($event)"
          />
        </template>
        <template v-else-if="page.activePanel.value === 'role-management'">
          <RoleDetailPanel
            v-if="
              rolesPage.view.value === 'detail' && rolesPage.selectedRole.value
            "
            :role="rolesPage.selectedRole.value"
            :saving="rolesPage.saving.value"
            @back="rolesPage.backToList()"
            @update="(id, input) => rolesPage.updateRole(id, input)"
            @save-permissions="
              (id, perms) => rolesPage.savePermissions(id, perms)
            "
            @copy="rolesPage.openCreate($event)"
          />
          <RoleListPanel
            v-else
            :roles="rolesPage.roles.value"
            :loading="rolesPage.loading.value"
            :error="rolesPage.error.value"
            @select="rolesPage.selectRole($event)"
            @open-create="rolesPage.openCreate()"
            @open-delete="rolesPage.openDelete($event)"
          />
        </template>
        <VisibilityConfigPanel
          v-else-if="page.activePanel.value === 'visibility-config'"
          :visibility="page.visibility.value"
          @update:cross-group-case="
            page.visibility.value.allowCrossGroupCaseCreate = $event
          "
          @update:cross-group-view="
            page.visibility.value.allowPrincipalViewCrossGroupCollab = $event
          "
          @save="page.saveVisibility()"
        />
        <StorageRootPanel
          v-else-if="page.activePanel.value === 'storage-root'"
          :storage-root="page.storageRoot.value"
          :is-configured="page.isStorageRootConfigured.value"
          :preview="page.storageRootPreview.value"
          @update:root-label="page.storageRoot.value.rootLabel = $event"
          @update:root-path="page.storageRoot.value.rootPath = $event"
          @save="page.saveStorageRoot()"
        />
        <FeatureFlagsPanel
          v-else-if="page.activePanel.value === 'feature-flags'"
          :panel="featureFlagsPanel"
        />
      </div>
    </div>

    <GroupNameModal
      :open="page.groupNameModal.isOpen.value"
      :mode="page.groupNameModal.mode.value"
      :input-value="page.groupNameModal.inputValue.value"
      :can-submit="page.groupNameModal.canSubmit.value"
      @update:input-value="page.groupNameModal.inputValue.value = $event"
      @close="page.groupNameModal.close()"
      @confirm="
        page.groupNameModal.mode.value === 'create'
          ? page.createGroup()
          : page.renameGroup()
      "
    />

    <GroupDisableModal
      :open="page.disableModal.isOpen.value"
      :group-name="page.disableModal.groupName.value"
      :customer-count="page.disableModal.customerCount.value"
      :case-count="page.disableModal.caseCount.value"
      :has-references="page.disableModal.hasReferences.value"
      @close="page.disableModal.close()"
      @confirm="page.disableGroup()"
    />

    <MemberCreateModal
      :open="membersPage.createModalOpen.value"
      :groups="page.groups.value"
      :available-roles="rolesPage.roles.value"
      @close="membersPage.createModalOpen.value = false"
      @confirm="membersPage.createMember($event)"
    />

    <MemberRoleModal
      :open="membersPage.roleModalOpen.value"
      :member="membersPage.roleModalTarget.value"
      :available-roles="rolesPage.roles.value"
      :actor-role="currentUser?.role"
      @close="membersPage.roleModalOpen.value = false"
      @confirm="(userId, role) => membersPage.updateRole(userId, role)"
    />

    <MemberDisableConfirmModal
      :open="disableTarget !== null"
      :member-name="disableTarget?.name ?? ''"
      @close="disableTarget = null"
      @confirm="confirmDisable()"
    />

    <PasswordResetResultModal
      :open="membersPage.passwordResultOpen.value"
      :temporary-password="membersPage.temporaryPassword.value"
      @close="membersPage.closePasswordResult()"
    />

    <RoleCreateModal
      :open="rolesPage.createModalOpen.value"
      :from-role="rolesPage.createFromRole.value"
      @close="rolesPage.createModalOpen.value = false"
      @confirm="rolesPage.createRole($event)"
    />

    <RoleDeleteModal
      :open="rolesPage.deleteModalOpen.value"
      :role="rolesPage.deleteTarget.value"
      :saving="rolesPage.saving.value"
      @close="rolesPage.deleteModalOpen.value = false"
      @confirm="rolesPage.deleteRole($event)"
    />

    <SettingsToast
      :visible="page.toast.visible.value"
      :title="page.toast.titleKey.value ? t(page.toast.titleKey.value) : ''"
      :description="
        page.toast.descriptionKey.value
          ? t(page.toast.descriptionKey.value)
          : ''
      "
      @dismiss="page.toast.hide()"
    />

    <MemberOverridesDrawer
      :open="overridesPage.open.value"
      :member="overridesPage.member.value"
      :loading="overridesPage.loading.value"
      :saving="overridesPage.saving.value"
      :error="overridesPage.error.value"
      :effective-rows="overridesPage.effectiveRows.value"
      :overrides="overridesPage.overrides.value"
      :audit-expanded="overridesPage.auditExpanded.value"
      @close="overridesPage.closeDrawer()"
      @open-add="overridesPage.openAddModal()"
      @open-delete="overridesPage.openDeleteModal($event)"
      @toggle-audit="overridesPage.toggleAudit()"
    />

    <OverrideAddModal
      :open="overridesPage.addModalOpen.value"
      :available-permissions="overridesPage.availablePermissionsForAdd.value"
      :saving="overridesPage.saving.value"
      @close="overridesPage.addModalOpen.value = false"
      @confirm="overridesPage.addOverride($event)"
    />

    <OverrideDeleteModal
      :open="overridesPage.deleteModalOpen.value"
      :override="overridesPage.deleteTarget.value"
      :saving="overridesPage.saving.value"
      @close="overridesPage.deleteModalOpen.value = false"
      @confirm="overridesPage.deleteOverride($event)"
    />
  </div>
</template>

<style scoped>
.settings-view {
  display: grid;
  gap: 24px;
}

.settings-view__body {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 24px;
  min-height: 480px;
}

.settings-view__subnav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  align-self: start;
}

.settings-view__subnav-btn {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  text-align: left;
  transition:
    background 0.15s,
    color 0.15s;
}

.settings-view__subnav-btn:hover {
  background: var(--color-fill-2);
  color: var(--color-text-1);
}

.settings-view__subnav-btn--active,
.settings-view__subnav-btn--active:hover {
  background: var(--color-primary-1);
  color: var(--color-primary-6);
  font-weight: var(--font-weight-semibold);
}

.settings-view__content {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  padding: 24px;
  min-height: 400px;
}

.settings-view__group-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
}

.settings-view__group-layout--with-detail {
  grid-template-columns: minmax(0, 1fr) 340px;
}

.settings-view__group-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-left: 24px;
  border-left: 1px solid var(--color-border-1);
}

.settings-view__divider {
  margin: 0;
  border: none;
  border-top: 1px solid var(--color-border-1);
}

@media (max-width: 767px) {
  .settings-view__body {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    min-height: auto;
  }
  .settings-view__subnav {
    flex-direction: row;
    overflow-x: auto;
    gap: 4px;
    padding: 8px;
  }
  .settings-view__subnav-btn {
    flex: 0 0 auto;
    white-space: nowrap;
    width: auto;
    padding: 8px 12px;
  }
  .settings-view__content {
    padding: 16px;
  }
  .settings-view__group-layout--with-detail {
    grid-template-columns: minmax(0, 1fr);
  }
  .settings-view__group-detail {
    padding-left: 0;
    border-left: none;
    padding-top: 16px;
    border-top: 1px solid var(--color-border-1);
  }
}
</style>
