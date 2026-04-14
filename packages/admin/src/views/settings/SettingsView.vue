<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "../../shared/ui/PageHeader.vue";
import GroupListPanel from "./components/GroupListPanel.vue";
import GroupDetailMeta from "./components/GroupDetailMeta.vue";
import GroupMemberList from "./components/GroupMemberList.vue";
import GroupStatsPanel from "./components/GroupStatsPanel.vue";
import GroupNameModal from "./components/GroupNameModal.vue";
import GroupDisableModal from "./components/GroupDisableModal.vue";
import VisibilityConfigPanel from "./components/VisibilityConfigPanel.vue";
import StorageRootPanel from "./components/StorageRootPanel.vue";
import SettingsToast from "./components/SettingsToast.vue";
import { useSettingsPage } from "./model/useSettingsPage";
import {
  SETTINGS_SUBNAV_ITEMS,
  SAMPLE_GROUPS,
  SAMPLE_GROUP_DETAILS,
  SAMPLE_GROUP_STATS,
  SAMPLE_ORG_SETTINGS,
} from "./fixtures";

/** 系统设置页入口，编排子导航切换与三个配置面板。 */
const { t } = useI18n();

const page = useSettingsPage({
  initialGroups: SAMPLE_GROUPS,
  groupDetails: { ...SAMPLE_GROUP_DETAILS },
  groupStats: { ...SAMPLE_GROUP_STATS },
  orgSettings: structuredClone(SAMPLE_ORG_SETTINGS),
  isAdmin: ref(true),
});
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
      <nav class="settings-view__subnav" aria-label="設定サブナビゲーション">
        <button
          v-for="item in SETTINGS_SUBNAV_ITEMS"
          :key="item.id"
          type="button"
          class="settings-view__subnav-btn"
          :class="{
            'settings-view__subnav-btn--active':
              page.activePanel.value === item.id,
          }"
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

    <SettingsToast
      :visible="page.toast.visible.value"
      :title="t(page.toast.titleKey.value)"
      :description="t(page.toast.descriptionKey.value)"
      @dismiss="page.toast.hide()"
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
  grid-template-columns: 220px 1fr;
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

.settings-view__subnav-btn--active {
  background: var(--color-primary-1);
  color: var(--color-primary-6);
  font-weight: var(--font-weight-semibold);
}

.settings-view__subnav-btn--active:hover {
  background: var(--color-primary-1);
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
  grid-template-columns: 1fr;
  gap: 24px;
}

.settings-view__group-layout--with-detail {
  grid-template-columns: 1fr 340px;
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
</style>
