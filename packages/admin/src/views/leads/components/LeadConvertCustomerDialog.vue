<script setup lang="ts">
import { reactive } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { LeadConvertCustomerInput } from "../model/LeadAdapter";

/** 线索转客户弹窗，可指定已有客户 ID 或填写多语言名称 */
const props = defineProps<{
  defaultLocale?: string;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  confirm: [input: LeadConvertCustomerInput];
  close: [];
}>();

const { t } = useI18n();

const form = reactive({
  customerId: "",
  nameZh: "",
  nameJa: "",
  nameEn: "",
  defaultLocale: (props.defaultLocale as "zh" | "ja" | "en") || "zh",
});

/** 确认提交转客户表单 */
function handleConfirm(): void {
  const input: LeadConvertCustomerInput = {};

  if (form.customerId.trim()) {
    input.customerId = form.customerId.trim();
  }

  const hasNames = form.nameZh || form.nameJa || form.nameEn;
  if (hasNames) {
    input.localizedNames = {
      defaultLocale: form.defaultLocale,
      ...(form.nameZh ? { zh: form.nameZh } : {}),
      ...(form.nameJa ? { ja: form.nameJa } : {}),
      ...(form.nameEn ? { en: form.nameEn } : {}),
    };
  }

  emit("confirm", input);
}
</script>

<template>
  <Teleport to="body">
    <div class="convert-customer-backdrop" @click.self="$emit('close')">
      <div class="convert-customer-dialog" role="dialog" aria-modal="true">
        <h3 class="convert-customer-dialog__title">
          {{ t("leads.detail.conversionTab.convertCustomerTitle") }}
        </h3>
        <p class="convert-customer-dialog__desc">
          {{ t("leads.detail.conversionTab.convertCustomerDesc") }}
        </p>

        <div class="convert-customer-dialog__fields">
          <label class="convert-customer-dialog__label">
            <span>{{
              t("leads.detail.convertCustomerDialog.customerIdLabel")
            }}</span>
            <input
              id="convert-customer-id"
              v-model="form.customerId"
              type="text"
              class="convert-customer-dialog__input"
              :placeholder="
                t('leads.detail.convertCustomerDialog.customerIdPlaceholder')
              "
              autocomplete="off"
            />
          </label>

          <fieldset class="convert-customer-dialog__fieldset">
            <legend>
              {{ t("leads.detail.convertCustomerDialog.localizedNamesLegend") }}
            </legend>
            <label class="convert-customer-dialog__label">
              <span>{{ t("leads.detail.convertCustomerDialog.nameZh") }}</span>
              <input
                id="convert-customer-name-zh"
                v-model="form.nameZh"
                type="text"
                class="convert-customer-dialog__input"
                autocomplete="off"
              />
            </label>
            <label class="convert-customer-dialog__label">
              <span>{{ t("leads.detail.convertCustomerDialog.nameJa") }}</span>
              <input
                id="convert-customer-name-ja"
                v-model="form.nameJa"
                type="text"
                class="convert-customer-dialog__input"
                autocomplete="off"
              />
            </label>
            <label class="convert-customer-dialog__label">
              <span>{{ t("leads.detail.convertCustomerDialog.nameEn") }}</span>
              <input
                id="convert-customer-name-en"
                v-model="form.nameEn"
                type="text"
                class="convert-customer-dialog__input"
                autocomplete="off"
              />
            </label>
            <label class="convert-customer-dialog__label">
              <span>{{
                t("leads.detail.convertCustomerDialog.defaultLocaleLabel")
              }}</span>
              <select
                id="convert-customer-default-locale"
                v-model="form.defaultLocale"
                class="convert-customer-dialog__select"
              >
                <option value="zh">{{ t("leads.options.language.zh") }}</option>
                <option value="ja">{{ t("leads.options.language.ja") }}</option>
                <option value="en">{{ t("leads.options.language.en") }}</option>
              </select>
            </label>
          </fieldset>
        </div>

        <div class="convert-customer-dialog__actions">
          <Button size="sm" @click="$emit('close')">
            {{ t("leads.detail.convertDedup.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="submitting"
            @click="handleConfirm"
          >
            {{ t("leads.detail.convertCustomerDialog.confirmBtn") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.convert-customer-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-bg-modal-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.convert-customer-dialog {
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  padding: 24px;
  max-width: 480px;
  width: 100%;
}

.convert-customer-dialog__title {
  margin: 0 0 8px;
  font-size: var(--font-size-xl);
  line-height: var(--leading-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.convert-customer-dialog__desc {
  margin: 0 0 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.convert-customer-dialog__fields {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}

.convert-customer-dialog__fieldset {
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md, 8px);
  padding: 12px;
  display: grid;
  gap: 8px;
}

.convert-customer-dialog__fieldset legend {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
  padding: 0 4px;
}

.convert-customer-dialog__label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}

.convert-customer-dialog__input,
.convert-customer-dialog__select {
  padding: 6px 10px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md, 6px);
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  background: var(--color-bg-1);
}

.convert-customer-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
