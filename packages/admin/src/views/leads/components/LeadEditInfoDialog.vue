<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import { LEAD_SOURCE_OPTIONS, LANGUAGE_OPTIONS } from "../fixtures";
import { getBusinessTypeSelectOptions } from "../../../shared/i18n/businessTypes";
import type { LeadDetail, OwnerOption, SelectOption } from "../types";
import type { LeadUpdateInput } from "../model/LeadAdapter";
import type { LeadMutationFailure } from "../model/useLeadDetailModel";
import {
  buildLeadEditInfoDiff,
  leadEditInfoSnapshot,
  type LeadEditInfoFormState,
} from "../model/leadEditInfoForm";

/**
 * 线索基础信息编辑对话框。
 *
 * - 仅提交相对初始值发生变化的字段（patch 语义，对齐 server PATCH 行为）。
 * - 失败时由父组件传入 `error` prop 来 inline 渲染错误条；弹窗保持打开。
 * - owner / group 选项必须使用 API UUID（与 R2-A-1 保持一致）。
 */
const props = defineProps<{
  lead: LeadDetail;
  ownerOptions: OwnerOption[];
  groupOptions: SelectOption[];
  submitting?: boolean;
  error?: LeadMutationFailure | null;
}>();

const emit = defineEmits<{
  confirm: [input: LeadUpdateInput];
  close: [];
}>();

const { t, locale } = useI18n();

const businessTypeOpts = computed(() =>
  getBusinessTypeSelectOptions(locale.value, "primary"),
);

const initial = ref<LeadEditInfoFormState>(leadEditInfoSnapshot(props.lead));
const form = reactive<LeadEditInfoFormState>({ ...initial.value });

watch(
  () => props.lead.id,
  () => {
    initial.value = leadEditInfoSnapshot(props.lead);
    Object.assign(form, initial.value);
  },
);

const showReferrer = computed(() => form.source === "referral");

const canConfirm = computed(() => form.name.trim() !== "" && !props.submitting);

const genericErrorMessage = computed(() => {
  if (!props.error) return null;
  return t(props.error.messageKey);
});

const diff = computed<LeadUpdateInput>(() =>
  buildLeadEditInfoDiff(form, initial.value),
);
const hasChanges = computed(() => Object.keys(diff.value).length > 0);

/** 提交编辑表单：仅当存在改动且必填项满足时触发 */
function handleConfirm(): void {
  if (!canConfirm.value || !hasChanges.value) return;
  emit("confirm", diff.value);
}

/**
 * 监听 ESC 关闭：模态对话框默认应支持键盘关闭，避免用户被困在
 * 弹窗内（无障碍 + 习惯一致性）。提交中（submitting）时不响应，
 * 防止误关闭中断保存操作。
 *
 * @param event 全局 keydown 事件
 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== "Escape") return;
  if (props.submitting) return;
  event.stopPropagation();
  emit("close");
}

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div class="lead-edit-backdrop" @click.self="$emit('close')">
      <div
        class="lead-edit-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="lead-edit-info-dialog"
      >
        <h3 class="lead-edit-dialog__title">
          {{ t("leads.detail.editInfoDialog.title") }}
        </h3>
        <p class="lead-edit-dialog__desc">
          {{ t("leads.detail.editInfoDialog.description") }}
        </p>

        <p
          v-if="genericErrorMessage"
          class="lead-edit-dialog__error"
          role="alert"
          aria-live="assertive"
          data-testid="lead-edit-info-dialog-error"
        >
          {{ genericErrorMessage }}
        </p>

        <div class="lead-edit-dialog__fields">
          <label class="lead-edit-dialog__label">
            <span>
              {{ t("leads.detail.editInfoDialog.fields.name") }}
              <span class="lead-edit-dialog__required">*</span>
            </span>
            <input
              v-model="form.name"
              type="text"
              name="leadEditInfo.name"
              class="lead-edit-dialog__input"
              :placeholder="
                t('leads.detail.editInfoDialog.fields.namePlaceholder')
              "
              autocomplete="name"
              data-testid="lead-edit-info-dialog-name"
            />
          </label>

          <div class="lead-edit-dialog__row">
            <label class="lead-edit-dialog__label">
              <span>{{ t("leads.detail.editInfoDialog.fields.phone") }}</span>
              <input
                v-model="form.phone"
                type="tel"
                name="leadEditInfo.phone"
                class="lead-edit-dialog__input"
                :placeholder="
                  t('leads.detail.editInfoDialog.fields.phonePlaceholder')
                "
                autocomplete="tel"
              />
            </label>
            <label class="lead-edit-dialog__label">
              <span>{{ t("leads.detail.editInfoDialog.fields.email") }}</span>
              <input
                v-model="form.email"
                type="email"
                name="leadEditInfo.email"
                class="lead-edit-dialog__input"
                :placeholder="
                  t('leads.detail.editInfoDialog.fields.emailPlaceholder')
                "
                autocomplete="email"
              />
            </label>
          </div>

          <div class="lead-edit-dialog__row">
            <label class="lead-edit-dialog__label">
              <span>{{ t("leads.detail.editInfoDialog.fields.source") }}</span>
              <select
                v-model="form.source"
                name="leadEditInfo.source"
                class="lead-edit-dialog__select"
              >
                <option value="">
                  {{
                    t("leads.detail.editInfoDialog.fields.sourcePlaceholder")
                  }}
                </option>
                <option
                  v-for="opt in LEAD_SOURCE_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ t(opt.label) }}
                </option>
              </select>
            </label>
            <label v-if="showReferrer" class="lead-edit-dialog__label">
              <span>{{
                t("leads.detail.editInfoDialog.fields.referrer")
              }}</span>
              <input
                v-model="form.referrer"
                type="text"
                name="leadEditInfo.referrer"
                class="lead-edit-dialog__input"
                :placeholder="
                  t('leads.detail.editInfoDialog.fields.referrerPlaceholder')
                "
                autocomplete="off"
              />
            </label>
          </div>

          <div class="lead-edit-dialog__row">
            <label class="lead-edit-dialog__label">
              <span>
                {{ t("leads.detail.editInfoDialog.fields.businessType") }}
              </span>
              <select
                v-model="form.businessType"
                name="leadEditInfo.businessType"
                class="lead-edit-dialog__select"
              >
                <option value="">
                  {{
                    t(
                      "leads.detail.editInfoDialog.fields.businessTypePlaceholder",
                    )
                  }}
                </option>
                <option
                  v-for="opt in businessTypeOpts"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </label>
            <label class="lead-edit-dialog__label">
              <span>{{ t("leads.detail.editInfoDialog.fields.group") }}</span>
              <select
                v-model="form.groupId"
                name="leadEditInfo.groupId"
                class="lead-edit-dialog__select"
                data-testid="lead-edit-info-dialog-group"
              >
                <option value="">
                  {{ t("leads.detail.editInfoDialog.fields.groupPlaceholder") }}
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

          <div class="lead-edit-dialog__row">
            <label class="lead-edit-dialog__label">
              <span>{{ t("leads.detail.editInfoDialog.fields.owner") }}</span>
              <select
                v-model="form.ownerUserId"
                name="leadEditInfo.ownerUserId"
                class="lead-edit-dialog__select"
                data-testid="lead-edit-info-dialog-owner"
              >
                <option value="">
                  {{ t("leads.detail.editInfoDialog.fields.ownerPlaceholder") }}
                </option>
                <option
                  v-for="opt in ownerOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </label>
            <label class="lead-edit-dialog__label">
              <span>
                {{ t("leads.detail.editInfoDialog.fields.language") }}
              </span>
              <select
                v-model="form.language"
                name="leadEditInfo.language"
                class="lead-edit-dialog__select"
              >
                <option value="">
                  {{
                    t("leads.detail.editInfoDialog.fields.languagePlaceholder")
                  }}
                </option>
                <option
                  v-for="opt in LANGUAGE_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ t(opt.label) }}
                </option>
              </select>
            </label>
          </div>

          <label class="lead-edit-dialog__label">
            <span>{{ t("leads.detail.editInfoDialog.fields.note") }}</span>
            <input
              v-model="form.note"
              type="text"
              name="leadEditInfo.note"
              class="lead-edit-dialog__input"
              :placeholder="
                t('leads.detail.editInfoDialog.fields.notePlaceholder')
              "
              autocomplete="off"
            />
          </label>
        </div>

        <div class="lead-edit-dialog__actions">
          <Button size="sm" @click="$emit('close')">
            {{ t("leads.detail.convertDedup.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="!canConfirm || !hasChanges"
            data-testid="lead-edit-info-dialog-confirm"
            @click="handleConfirm"
          >
            {{ t("leads.detail.editInfoDialog.confirmBtn") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.lead-edit-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-bg-modal-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.lead-edit-dialog {
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  padding: 24px;
  max-width: 560px;
  width: 100%;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
}

.lead-edit-dialog__title {
  margin: 0 0 8px;
  font-size: var(--font-size-xl);
  line-height: var(--leading-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.lead-edit-dialog__desc {
  margin: 0 0 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.lead-edit-dialog__error {
  margin: 0 0 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-danger-border, #fbbcbc);
  background: var(--color-danger-bg, #fff5f5);
  color: var(--color-danger-text, #c53030);
  border-radius: var(--radius-md, 8px);
  font-size: var(--font-size-sm);
}

.lead-edit-dialog__fields {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}

.lead-edit-dialog__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.lead-edit-dialog__label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}

.lead-edit-dialog__required {
  color: #dc2626;
}

.lead-edit-dialog__input,
.lead-edit-dialog__select {
  padding: 6px 10px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md, 6px);
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  background: var(--color-bg-1);
}

.lead-edit-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
