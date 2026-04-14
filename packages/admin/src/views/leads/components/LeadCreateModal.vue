<script setup lang="ts">
/**
 * 新建线索弹窗外壳：Teleport + backdrop + header + footer。
 *
 * 表单主体由 LeadCreateModalBody 承载。
 */
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { LeadCreateFormFields, LeadSummary } from "../types";
import LeadCreateModalBody from "./LeadCreateModalBody.vue";

/** 新建线索弹窗：表单外壳 + 去重面板 + 创建/草稿按钮。 */
const { t } = useI18n();

defineProps<{
  open?: boolean;
  fields?: LeadCreateFormFields;
  canCreate?: boolean;
  showDedupe?: boolean;
  dedupeMatches?: LeadSummary[];
}>();

defineEmits<{
  close: [];
  saveDraft: [];
  create: [];
  "update:field": [name: keyof LeadCreateFormFields, value: string];
}>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="lead-modal-backdrop" @click.self="$emit('close')">
      <div
        class="lead-modal"
        role="dialog"
        :aria-label="t('leads.list.createModal.title')"
      >
        <div class="lead-modal__header">
          <h3 class="lead-modal__title">
            {{ t("leads.list.createModal.title") }}
          </h3>
          <button
            class="lead-modal__close"
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
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="lead-modal__body">
          <LeadCreateModalBody
            :fields="fields"
            :show-dedupe="showDedupe"
            :dedupe-matches="dedupeMatches"
            @update:field="
              (n: keyof LeadCreateFormFields, v: string) =>
                $emit('update:field', n, v)
            "
          />
        </div>

        <div class="lead-modal__footer">
          <Button variant="outlined" @click="$emit('close')">
            {{ t("leads.list.createModal.cancel") }}
          </Button>
          <Button variant="outlined" @click="$emit('saveDraft')">
            {{ t("leads.list.createModal.saveDraft") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            :disabled="!canCreate"
            @click="$emit('create')"
          >
            {{ t("leads.list.createModal.create") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.lead-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-bg-modal-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.lead-modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  overflow: hidden;
}

.lead-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border-table-row);
}

.lead-modal__title {
  margin: 0;
  font-size: 17px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.lead-modal__close {
  border: none;
  background: none;
  padding: 4px;
  color: var(--color-text-3);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: color var(--transition-normal);
}

.lead-modal__close:hover {
  color: var(--color-text-1);
}

.lead-modal__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 24px;
}

.lead-modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-table-row);
  background: var(--color-bg-elevated);
}
</style>
