<script setup lang="ts">
import { reactive, computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import {
  BUSINESS_TYPE_OPTIONS_I18N,
  mapBusinessTypeToCaseTypeCode,
  normalizeBusinessType,
  type BusinessType,
} from "../../../i18n/messages/_shared/businessTypes";
import { getActiveUserOptions } from "../../../shared/model/useOrgUserOptions";
import { getActiveGroupAliasOptions } from "../../../shared/model/useGroupOptions";
import type { LeadConvertCaseInput } from "../model/LeadAdapter";
import type { LeadConvertCaseFailure } from "../model/useLeadDetailModel";
import BmvGateBlockerList from "./BmvGateBlockerList.vue";

/** 线索转案件弹窗，选择案件类型、负责人、组 */
const props = defineProps<{
  intendedCaseType?: string;
  ownerUserId?: string;
  groupId?: string;
  submitting?: boolean;
  /**
   * 上一次提交失败的结构化错误。提供时弹窗保持打开，
   * 并在表单上方 inline 渲染 BMV 闸口阻断或通用错误提示。
   */
  error?: LeadConvertCaseFailure | null;
}>();

const emit = defineEmits<{
  confirm: [input: LeadConvertCaseInput];
  close: [];
}>();

const { t, locale } = useI18n();

const caseTypeOptions = computed(() => {
  return BUSINESS_TYPE_OPTIONS_I18N.map((opt) => ({
    value: mapBusinessTypeToCaseTypeCode(opt.value),
    label: t(opt.labelKey),
  }));
});

const userOptions = computed(() => getActiveUserOptions());

const groupOptions = computed(() => getActiveGroupAliasOptions(locale.value));

/**
 * 将线索的業務意向類型映射为案件类型代码作为默认值
 *
 * @returns 案件类型代码，无法映射时返回空字符串
 */
function resolveDefaultCaseType(): string {
  if (!props.intendedCaseType) return "";
  const normalized = normalizeBusinessType(props.intendedCaseType);
  if (!normalized) return "";
  return mapBusinessTypeToCaseTypeCode(normalized as BusinessType);
}

const ownerDirty = ref(false);
const groupDirty = ref(false);

const form = reactive({
  caseTypeCode: resolveDefaultCaseType(),
  ownerUserId: props.ownerUserId ?? "",
  groupId: props.groupId ?? "",
});

watch(
  () => props.ownerUserId,
  (val) => {
    if (!ownerDirty.value) form.ownerUserId = val ?? "";
  },
);

watch(
  () => props.groupId,
  (val) => {
    if (!groupDirty.value) form.groupId = val ?? "";
  },
);

const canConfirm = computed(
  () => form.caseTypeCode !== "" && form.ownerUserId !== "",
);

const bmvGateBlockers = computed(() =>
  props.error?.kind === "bmvGate" ? props.error.blockers : null,
);

const genericErrorMessage = computed(() => {
  if (props.error?.kind !== "generic") return null;
  return t(props.error.messageKey);
});

/** 确認提交轉案件表單 */
function handleConfirm(): void {
  if (!form.ownerUserId) {
    document.getElementById("convert-case-owner")?.focus();
    return;
  }
  if (!canConfirm.value) return;
  const input: LeadConvertCaseInput = {
    caseTypeCode: form.caseTypeCode,
    ownerUserId: form.ownerUserId,
  };
  if (form.groupId.trim()) {
    input.groupId = form.groupId.trim();
  }
  emit("confirm", input);
}
</script>

<template>
  <Teleport to="body">
    <div class="convert-case-backdrop" @click.self="$emit('close')">
      <div class="convert-case-dialog" role="dialog" aria-modal="true">
        <h3 class="convert-case-dialog__title">
          {{ t("leads.detail.conversionTab.convertCaseTitle") }}
        </h3>
        <p class="convert-case-dialog__desc">
          {{ t("leads.detail.conversionTab.convertCaseDesc") }}
        </p>

        <BmvGateBlockerList
          v-if="bmvGateBlockers"
          :blockers="bmvGateBlockers"
        />

        <p
          v-else-if="genericErrorMessage"
          class="convert-case-dialog__error"
          role="alert"
          aria-live="assertive"
          data-testid="convert-case-dialog-error"
        >
          {{ genericErrorMessage }}
        </p>

        <div class="convert-case-dialog__fields">
          <label class="convert-case-dialog__label">
            <span>{{ t("leads.detail.convertCaseDialog.caseTypeLabel") }}</span>
            <select
              id="convert-case-type"
              v-model="form.caseTypeCode"
              class="convert-case-dialog__select"
            >
              <option value="" disabled>
                {{ t("leads.detail.convertCaseDialog.caseTypePlaceholder") }}
              </option>
              <option
                v-for="opt in caseTypeOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </label>

          <label class="convert-case-dialog__label">
            <span>{{ t("leads.detail.convertCaseDialog.ownerLabel") }}</span>
            <select
              id="convert-case-owner"
              v-model="form.ownerUserId"
              class="convert-case-dialog__select"
              @change="ownerDirty = true"
            >
              <option value="" disabled>
                {{ t("leads.detail.convertCaseDialog.ownerPlaceholder") }}
              </option>
              <option
                v-for="opt in userOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </label>

          <label class="convert-case-dialog__label">
            <span>{{ t("leads.detail.convertCaseDialog.groupLabel") }}</span>
            <select
              id="convert-case-group"
              v-model="form.groupId"
              class="convert-case-dialog__select"
              @change="groupDirty = true"
            >
              <option value="">
                {{ t("leads.detail.convertCaseDialog.groupPlaceholder") }}
              </option>
              <option
                v-for="opt in groupOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </label>
        </div>

        <div class="convert-case-dialog__actions">
          <Button size="sm" @click="$emit('close')">
            {{ t("leads.detail.convertDedup.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="!canConfirm || submitting"
            @click="handleConfirm"
          >
            {{ t("leads.detail.convertCaseDialog.confirmBtn") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.convert-case-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-bg-modal-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.convert-case-dialog {
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  padding: 24px;
  max-width: 480px;
  width: 100%;
}

.convert-case-dialog__title {
  margin: 0 0 8px;
  font-size: var(--font-size-xl);
  line-height: var(--leading-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.convert-case-dialog__desc {
  margin: 0 0 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.convert-case-dialog__fields {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}

.convert-case-dialog__label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}

.convert-case-dialog__select {
  padding: 6px 10px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md, 6px);
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  background: var(--color-bg-1);
}

.convert-case-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.convert-case-dialog__error {
  margin: 0 0 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-danger-border, #fbbcbc);
  background: var(--color-danger-bg, #fff5f5);
  color: var(--color-danger-text, #c53030);
  border-radius: var(--radius-md, 8px);
  font-size: var(--font-size-sm);
}
</style>
