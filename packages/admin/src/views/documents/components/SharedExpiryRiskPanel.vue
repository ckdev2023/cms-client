<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { SharedExpiryRiskData } from "../types";

/**
 * 共享版本过期风险面板（P0-CONTRACT §9）。
 *
 * 侧滑面板，展示过期版本信息、受影响案件列表与建议操作。
 */
const { t } = useI18n();

defineProps<{
  open: boolean;
  data: SharedExpiryRiskData | null;
}>();

defineEmits<{
  close: [];
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="risk-slide">
      <div v-if="open" class="risk-overlay" @click.self="$emit('close')">
        <aside
          class="risk-panel"
          role="complementary"
          :aria-label="t('documents.risk.title')"
        >
          <div class="risk-panel__header">
            <h3 class="risk-panel__title">
              {{ t("documents.risk.title") }}
            </h3>
            <button
              class="risk-panel__close"
              type="button"
              @click="$emit('close')"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div v-if="data" class="risk-panel__body">
            <section class="risk-panel__section">
              <h4 class="risk-panel__section-title">
                {{ t("documents.risk.versionInfoLabel") }}
              </h4>
              <p class="risk-panel__version-info">
                {{ data.versionInfo }}
              </p>
            </section>

            <section class="risk-panel__section">
              <h4 class="risk-panel__section-title">
                {{ t("documents.risk.affectedCasesLabel") }}
                <span class="risk-panel__badge">
                  {{ data.affectedCases.length }}
                </span>
              </h4>
              <ul class="risk-panel__case-list">
                <li
                  v-for="c in data.affectedCases"
                  :key="c.caseId"
                  class="risk-panel__case-item"
                >
                  <a
                    class="risk-panel__case-link"
                    :href="`#/cases/${c.caseId}`"
                  >
                    {{ c.caseName }}
                  </a>
                  <span class="risk-panel__case-doc">{{ c.docName }}</span>
                </li>
              </ul>
            </section>

            <section class="risk-panel__section">
              <h4 class="risk-panel__section-title">
                {{ t("documents.risk.suggestedActionLabel") }}
              </h4>
              <p class="risk-panel__suggested">
                {{ data.suggestedAction }}
              </p>
            </section>
          </div>

          <div class="risk-panel__footer">
            <Button variant="outlined" @click="$emit('close')">
              {{ t("documents.risk.close") }}
            </Button>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.risk-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-bg-modal-scrim);
  display: flex;
  justify-content: flex-end;
}

.risk-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 420px;
  height: 100%;
  background: var(--color-bg-1);
  box-shadow: var(--shadow-modal);
}

.risk-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border-table-row);
}

.risk-panel__title {
  margin: 0;
  font-size: 17px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.risk-panel__close {
  border: none;
  background: none;
  padding: 4px;
  color: var(--color-text-3);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: color var(--transition-normal);
}

.risk-panel__close:hover {
  color: var(--color-text-1);
}

.risk-panel__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.risk-panel__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.risk-panel__section-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.risk-panel__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--radius-full);
  background: rgba(220, 38, 38, 0.1);
  color: var(--color-danger, #dc2626);
  font-size: 11px;
  font-weight: var(--font-weight-bold);
}

.risk-panel__version-info {
  margin: 0;
  padding: 12px;
  border-radius: var(--radius-default);
  background: rgba(220, 38, 38, 0.04);
  border-left: 3px solid var(--color-danger, #dc2626);
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  line-height: 1.5;
}

.risk-panel__case-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.risk-panel__case-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-default);
}

.risk-panel__case-link {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-6);
  text-decoration: none;
}

.risk-panel__case-link:hover {
  text-decoration: underline;
}

.risk-panel__case-doc {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.risk-panel__suggested {
  margin: 0;
  padding: 12px;
  border-radius: var(--radius-default);
  background: rgba(59, 130, 246, 0.04);
  border-left: 3px solid var(--color-primary-6);
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  line-height: 1.5;
}

.risk-panel__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-table-row);
  background: var(--color-bg-elevated);
}

.risk-slide-enter-active,
.risk-slide-leave-active {
  transition: opacity 200ms ease;
}

.risk-slide-enter-active .risk-panel,
.risk-slide-leave-active .risk-panel {
  transition: transform 200ms ease;
}

.risk-slide-enter-from,
.risk-slide-leave-to {
  opacity: 0;
}

.risk-slide-enter-from .risk-panel {
  transform: translateX(100%);
}

.risk-slide-leave-to .risk-panel {
  transform: translateX(100%);
}
</style>
