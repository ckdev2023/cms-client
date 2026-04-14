<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import { STORAGE_ROOT_FIELDS, PATH_STRATEGY_TEXT_KEY } from "../fixtures";
import type { OrgSettings } from "../types";

/** 本地资料根目录配置面板，包含表单输入、未配置警告、路径预览和保存按钮。 */
defineProps<{
  storageRoot: OrgSettings["storageRoot"];
  isConfigured: boolean;
  preview: string;
}>();

const emit = defineEmits<{
  "update:rootLabel": [value: string];
  "update:rootPath": [value: string];
  save: [];
}>();

const { t } = useI18n();

/**
 * 根据字段 key 派发对应的输入变更事件。
 *
 * @param key - 字段标识
 * @param value - 输入值
 */
function onFieldInput(key: string, value: string) {
  if (key === "rootLabel") emit("update:rootLabel", value);
  else if (key === "rootPath") emit("update:rootPath", value);
}
</script>

<template>
  <section class="storage-panel" aria-label="Storage root settings">
    <!-- Not-configured warning -->
    <div v-if="!isConfigured" class="storage-panel__warning" role="alert">
      <svg
        class="storage-panel__warning-icon"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div>
        <p class="storage-panel__warning-title">
          {{ t("settings.storageRoot.notConfigured.title") }}
        </p>
        <p class="storage-panel__warning-desc">
          {{ t("settings.storageRoot.notConfigured.description") }}
        </p>
      </div>
    </div>

    <!-- Config form card -->
    <div class="storage-panel__card">
      <div class="storage-panel__fields">
        <!-- Dynamic fields from fixture defs -->
        <div v-for="field in STORAGE_ROOT_FIELDS" :key="field.key">
          <label class="storage-panel__label" :for="`sr-${field.key}`">
            {{ t(field.labelKey) }}
            <span v-if="field.required" class="storage-panel__required">*</span>
          </label>
          <input
            :id="`sr-${field.key}`"
            type="text"
            class="storage-panel__input"
            :class="{ 'storage-panel__input--mono': field.key === 'rootPath' }"
            :placeholder="field.placeholderKey ? t(field.placeholderKey) : ''"
            :value="
              (storageRoot as Record<string, string | null>)[field.key] ?? ''
            "
            autocomplete="off"
            @input="
              onFieldInput(field.key, ($event.target as HTMLInputElement).value)
            "
          />
          <p v-if="field.hintKey" class="storage-panel__hint">
            {{ t(field.hintKey) }}
          </p>
        </div>

        <!-- Path strategy info -->
        <div class="storage-panel__info-box">
          <svg
            class="storage-panel__info-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="storage-panel__info-text">
            {{ t(PATH_STRATEGY_TEXT_KEY) }}
          </p>
        </div>

        <!-- Path preview -->
        <div v-if="isConfigured" class="storage-panel__preview-group">
          <p class="storage-panel__section-label">
            {{ t("settings.storageRoot.preview") }}
          </p>
          <div class="storage-panel__preview-box">{{ preview }}</div>
        </div>

        <!-- Last updated info -->
        <dl
          v-if="storageRoot.updatedBy || storageRoot.updatedAt"
          class="storage-panel__meta"
        >
          <div v-if="storageRoot.updatedBy" class="storage-panel__meta-item">
            <dt class="storage-panel__meta-label">
              {{ t("settings.storageRoot.updatedBy") }}
            </dt>
            <dd class="storage-panel__meta-value">
              {{ storageRoot.updatedBy }}
            </dd>
          </div>
          <div v-if="storageRoot.updatedAt" class="storage-panel__meta-item">
            <dt class="storage-panel__meta-label">
              {{ t("settings.storageRoot.updatedAt") }}
            </dt>
            <dd class="storage-panel__meta-value">
              {{ storageRoot.updatedAt }}
            </dd>
          </div>
        </dl>
      </div>
    </div>

    <!-- Save bar -->
    <div class="storage-panel__actions">
      <Button variant="filled" tone="primary" size="sm" @click="emit('save')">
        {{ t("settings.storageRoot.saveButton") }}
      </Button>
    </div>
  </section>
</template>

<style scoped>
.storage-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Warning banner */
.storage-panel__warning {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-warning-border, #fde68a);
  background: var(--color-warning-bg, #fffbeb);
}

.storage-panel__warning-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--color-warning-icon, #d97706);
}

.storage-panel__warning-title {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-warning-title, #92400e);
}

.storage-panel__warning-desc {
  margin: 4px 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-warning-text, #b45309);
  line-height: 1.5;
}

/* Card */
.storage-panel__card {
  padding: 20px 24px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
}

.storage-panel__fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Form label */
.storage-panel__label {
  display: block;
  margin-bottom: 6px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}

.storage-panel__required {
  color: var(--color-danger);
  margin-left: 2px;
}

/* Input */
.storage-panel__input {
  display: block;
  width: 100%;
  padding: 8px 12px;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-2);
  border-radius: var(--radius-md);
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  box-sizing: border-box;
}

.storage-panel__input::placeholder {
  color: var(--color-text-4);
}

.storage-panel__input:focus {
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-1);
}

.storage-panel__input--mono {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: var(--font-size-xs);
}

/* Hint */
.storage-panel__hint {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--color-text-4);
}

/* Info box */
.storage-panel__info-box {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  background: var(--color-bg-2);
}

.storage-panel__info-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--color-text-3);
}

.storage-panel__info-text {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  line-height: 1.5;
}

/* Preview */
.storage-panel__preview-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.storage-panel__section-label {
  margin: 0;
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.storage-panel__preview-box {
  padding: 8px 12px;
  border: 1px dashed var(--color-border-2);
  border-radius: var(--radius-md);
  background: var(--color-bg-2);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: var(--font-size-xs);
  color: var(--color-text-1);
  word-break: break-all;
}

/* Metadata (last updated) */
.storage-panel__meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 0;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-1);
}

.storage-panel__meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.storage-panel__meta-label {
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.storage-panel__meta-value {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-1);
}

/* Actions bar */
.storage-panel__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
