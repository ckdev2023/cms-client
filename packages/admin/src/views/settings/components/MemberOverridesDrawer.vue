<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import Button from "../../../shared/ui/Button.vue";
import type { MemberItem } from "../model/UsersAdminRepository";
import type { PermissionOverrideItem } from "../model/PermissionOverridesRepository";
import type { EffectivePermissionRow } from "../model/useMemberOverrides";
import {
  effectiveTone,
  groupedRows as buildGroupedRows,
  formatDate,
} from "./overridesDrawerHelpers";

/** 成员个性化权限抽屉，展示有效权限矩阵、覆盖列表和审计日志。 */
defineProps<{
  open: boolean;
  member: MemberItem | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  effectiveRows: EffectivePermissionRow[];
  overrides: PermissionOverrideItem[];
  auditExpanded: boolean;
}>();

defineEmits<{
  close: [];
  openAdd: [];
  openDelete: [item: PermissionOverrideItem];
  toggleAudit: [];
}>();

const { t } = useI18n();

/**
 * 将有效权限行映射为显示文本标签。
 *
 * @param row - 有效权限行数据
 * @returns 显示文本
 */
function effectiveLabel(row: EffectivePermissionRow): string {
  if (row.overrideEffect === "deny")
    return t("settings.overrides.effectDenied");
  if (row.overrideEffect === "grant")
    return t("settings.overrides.effectGranted");
  return row.effective
    ? t("settings.overrides.fromRole")
    : t("settings.overrides.notGranted");
}

/**
 * 按资源分组有效权限行。
 *
 * @param rows - 有效权限行数组
 * @returns 分组后的数组
 */
function groupedRows(rows: EffectivePermissionRow[]) {
  return buildGroupedRows(rows, t);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="mod-overlay" @click.self="$emit('close')">
      <aside
        class="mod-drawer"
        role="dialog"
        aria-modal="true"
        :aria-label="t('settings.overrides.drawerTitle')"
        @keydown.escape="$emit('close')"
      >
        <div class="mod-header">
          <div class="mod-header__info">
            <h3 class="mod-header__title">
              {{ t("settings.overrides.drawerTitle") }}
            </h3>
            <p v-if="member" class="mod-header__member">
              {{ member.name }} ({{ member.email }})
            </p>
          </div>
          <button
            type="button"
            class="mod-header__close"
            :aria-label="t('settings.overrides.close')"
            @click="$emit('close')"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="error" class="mod-error" role="alert">{{ error }}</div>

        <div v-if="loading" class="mod-loading">
          {{ t("settings.overrides.loading") }}
        </div>

        <template v-else>
          <div class="mod-section">
            <div class="mod-section__header">
              <h4 class="mod-section__title">
                {{ t("settings.overrides.effectiveTitle") }}
              </h4>
              <Button
                variant="filled"
                tone="primary"
                size="sm"
                @click="$emit('openAdd')"
              >
                {{ t("settings.overrides.addButton") }}
              </Button>
            </div>

            <div class="mod-matrix">
              <div
                v-for="group in groupedRows(effectiveRows)"
                :key="group.resource"
                class="mod-matrix__group"
              >
                <div class="mod-matrix__group-label">{{ group.label }}</div>
                <div
                  v-for="row in group.items"
                  :key="row.code"
                  class="mod-matrix__row"
                >
                  <span class="mod-matrix__code">{{ t(row.labelKey) }}</span>
                  <span class="mod-matrix__from">
                    <Chip v-if="row.fromRole" tone="neutral" size="micro">
                      {{ t("settings.overrides.roleChip") }}
                    </Chip>
                  </span>
                  <span class="mod-matrix__effective">
                    <Chip :tone="effectiveTone(row)" size="micro">
                      {{ effectiveLabel(row) }}
                    </Chip>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="overrides.length > 0" class="mod-section">
            <h4 class="mod-section__title">
              {{ t("settings.overrides.overrideListTitle") }}
            </h4>
            <div class="mod-overrides-list">
              <div
                v-for="ov in overrides"
                :key="ov.permission"
                class="mod-override-item"
              >
                <div class="mod-override-item__info">
                  <span class="mod-override-item__perm">{{
                    ov.permission
                  }}</span>
                  <Chip
                    :tone="ov.effect === 'grant' ? 'success' : 'danger'"
                    size="micro"
                  >
                    {{ ov.effect }}
                  </Chip>
                </div>
                <div class="mod-override-item__meta">
                  <span v-if="ov.reason" class="mod-override-item__reason">
                    {{ ov.reason }}
                  </span>
                  <span v-if="ov.expiresAt" class="mod-override-item__expires">
                    {{ t("settings.overrides.expiresAt") }}:
                    {{ formatDate(ov.expiresAt) }}
                  </span>
                </div>
                <button
                  type="button"
                  class="mod-override-item__delete"
                  :title="t('settings.overrides.deleteButton')"
                  :disabled="saving"
                  @click="$emit('openDelete', ov)"
                >
                  {{ t("settings.overrides.deleteButton") }}
                </button>
              </div>
            </div>
          </div>

          <div class="mod-section mod-audit">
            <button
              type="button"
              class="mod-audit__toggle"
              :aria-expanded="auditExpanded"
              @click="$emit('toggleAudit')"
            >
              <span>{{ t("settings.overrides.auditTitle") }}</span>
              <svg
                class="mod-audit__chevron"
                :class="{ 'mod-audit__chevron--open': auditExpanded }"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div v-if="auditExpanded" class="mod-audit__list">
              <div
                v-for="ov in overrides"
                :key="`audit-${ov.permission}`"
                class="mod-audit__entry"
              >
                <span class="mod-audit__action">
                  {{ ov.effect === "grant" ? "+" : "−" }} {{ ov.permission }}
                </span>
                <span class="mod-audit__by">
                  {{ t("settings.overrides.grantedBy") }}: {{ ov.grantedBy }}
                </span>
                <span class="mod-audit__date">
                  {{ formatDate(ov.grantedAt) }}
                </span>
                <span v-if="ov.reason" class="mod-audit__reason">
                  {{ ov.reason }}
                </span>
              </div>
              <div v-if="overrides.length === 0" class="mod-audit__empty">
                {{ t("settings.overrides.auditEmpty") }}
              </div>
            </div>
          </div>
        </template>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.mod-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 50);
  display: flex;
  justify-content: flex-end;
  background: var(--color-bg-modal-scrim, rgba(0, 0, 0, 0.4));
}
.mod-drawer {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 640px;
  height: 100%;
  background: var(--color-bg-1);
  box-shadow: var(--shadow-modal, var(--shadow-1));
  overflow-y: auto;
  padding: 24px;
  gap: 20px;
}
.mod-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.mod-header__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mod-header__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
.mod-header__member {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}
.mod-header__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  transition: background 0.15s;
}
.mod-header__close:hover {
  background: var(--color-fill-2);
}
.mod-error {
  padding: 12px 16px;
  background: rgba(220, 38, 38, 0.06);
  border: 1px solid rgba(220, 38, 38, 0.18);
  border-radius: var(--radius-md);
  color: var(--color-danger-text);
  font-size: var(--font-size-sm);
}
.mod-loading {
  padding: 40px 0;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}
.mod-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.mod-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mod-section__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}
.mod-matrix {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.mod-matrix__group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mod-matrix__group-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border-1);
}
.mod-matrix__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 80px 120px;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}
.mod-matrix__code {
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}
.mod-matrix__from,
.mod-matrix__effective {
  display: flex;
  justify-content: center;
}
.mod-overrides-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mod-override-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--color-fill-1);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-1);
}
.mod-override-item__info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.mod-override-item__perm {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-1);
}
.mod-override-item__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.mod-override-item__reason {
  font-size: var(--font-size-xs);
  color: var(--color-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mod-override-item__expires {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}
.mod-override-item__delete {
  flex-shrink: 0;
  padding: 4px 8px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-danger-text);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: background 0.15s;
}
.mod-override-item__delete:hover {
  background: rgba(220, 38, 38, 0.1);
}
.mod-override-item__delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.mod-audit {
  border-top: 1px solid var(--color-border-1);
  padding-top: 12px;
}
.mod-audit__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 0;
  border: none;
  background: transparent;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
  cursor: pointer;
}
.mod-audit__chevron {
  transition: transform 0.2s;
}
.mod-audit__chevron--open {
  transform: rotate(180deg);
}
.mod-audit__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
}
.mod-audit__entry {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px;
  padding: 8px 12px;
  background: var(--color-fill-1);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
}
.mod-audit__action {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-1);
}
.mod-audit__by,
.mod-audit__date {
  color: var(--color-text-3);
}
.mod-audit__reason {
  grid-column: 1 / -1;
  color: var(--color-text-2);
  font-style: italic;
}
.mod-audit__empty {
  text-align: center;
  padding: 16px 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}
</style>
