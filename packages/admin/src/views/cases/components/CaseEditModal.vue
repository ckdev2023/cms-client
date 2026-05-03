<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import UserPicker from "../../../shared/ui/UserPicker.vue";
import {
  getActiveGroupOptions,
  resolveGroupValue,
  resolveGroupLabel,
} from "../../../shared/model/useGroupOptions";

/** 案件编辑弹窗：修改案件名、期限、风险等级等核心字段。 */
const { t, locale } = useI18n();

interface CaseEditModalProps {
  open?: boolean;
  caseName?: string;
  dueAt?: string;
  acceptedAt?: string;
  riskLevel?: string;
  ownerUserId?: string;
  assistantUserId?: string;
  groupId?: string;
  priority?: string;
  jurisdictionAuthority?: string;
  remark?: string;
  submitting?: boolean;
}

const props = defineProps<CaseEditModalProps>();

const emit = defineEmits<{
  close: [];
  save: [
    fields: {
      caseName: string;
      dueAt: string;
      acceptedAt: string;
      riskLevel: string;
      ownerUserId: string;
      assistantUserId: string;
      groupId: string;
      priority: string;
      jurisdictionAuthority: string;
      remark: string;
    },
  ];
}>();

/**
 * 将 props.groupId（可能是 UUID）解析为 catalog value。
 *
 * @param raw - 原始 groupId 字符串（UUID 或 catalog key）
 * @returns 匹配到的 catalog value，或原值兜底
 */
function resolveInitialGroupId(raw?: string): string {
  if (!raw) return "";
  return resolveGroupValue(raw) ?? raw;
}

const backdropRef = ref<HTMLElement | null>(null);

const localCaseName = ref(props.caseName ?? "");
const localDueAt = ref(props.dueAt ?? "");
const localAcceptedAt = ref(props.acceptedAt ?? "");
const localRiskLevel = ref(props.riskLevel ?? "");
const localOwnerUserId = ref(props.ownerUserId ?? "");
const localAssistantUserId = ref(props.assistantUserId ?? "");
const localGroupId = ref(resolveInitialGroupId(props.groupId));
const localPriority = ref(props.priority ?? "");
const localJurisdictionAuthority = ref(props.jurisdictionAuthority ?? "");
const localRemark = ref(props.remark ?? "");

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      localCaseName.value = props.caseName ?? "";
      localDueAt.value = props.dueAt ?? "";
      localAcceptedAt.value = props.acceptedAt ?? "";
      localRiskLevel.value = props.riskLevel ?? "";
      localOwnerUserId.value = props.ownerUserId ?? "";
      localAssistantUserId.value = props.assistantUserId ?? "";
      localGroupId.value = resolveInitialGroupId(props.groupId);
      localPriority.value = props.priority ?? "";
      localJurisdictionAuthority.value = props.jurisdictionAuthority ?? "";
      localRemark.value = props.remark ?? "";
      nextTick(() => backdropRef.value?.focus());
    }
  },
);

const groupOptions = computed(() => getActiveGroupOptions(locale.value));

const hasGroupFallback = computed(() => {
  const v = localGroupId.value.trim();
  if (!v) return false;
  return !groupOptions.value.some((o) => o.value === v);
});

const groupFallbackLabel = computed(() =>
  hasGroupFallback.value
    ? resolveGroupLabel(props.groupId ?? "", undefined, locale.value)
    : "",
);

/** 校验并提交编辑表单。 */
function handleSave(): void {
  emit("save", {
    caseName: localCaseName.value.trim(),
    dueAt: localDueAt.value.trim(),
    acceptedAt: localAcceptedAt.value.trim(),
    riskLevel: localRiskLevel.value.trim(),
    ownerUserId: localOwnerUserId.value.trim(),
    assistantUserId: localAssistantUserId.value.trim(),
    groupId: localGroupId.value.trim(),
    priority: localPriority.value.trim(),
    jurisdictionAuthority: localJurisdictionAuthority.value.trim(),
    remark: localRemark.value.trim(),
  });
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      ref="backdropRef"
      class="case-edit-modal-backdrop"
      data-testid="case-edit-modal-backdrop"
      tabindex="-1"
      @click.self="!props.submitting && emit('close')"
      @keydown.esc.stop.prevent="!props.submitting && emit('close')"
    >
      <div
        class="case-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-edit-modal-title"
      >
        <header class="case-edit-modal__header">
          <h2 id="case-edit-modal-title" class="case-edit-modal__title">
            {{ t("cases.detail.editModal.title") }}
          </h2>
          <button
            type="button"
            class="case-edit-modal__close"
            :disabled="props.submitting"
            @click="emit('close')"
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
        </header>

        <div class="case-edit-modal__body">
          <label class="case-edit-modal__field">
            <span class="case-edit-modal__label">{{
              t("cases.detail.editModal.fields.caseName")
            }}</span>
            <input
              id="case-edit-caseName"
              name="caseName"
              type="text"
              class="case-edit-modal__input"
              :value="localCaseName"
              :disabled="props.submitting"
              @input="localCaseName = ($event.target as HTMLInputElement).value"
            />
          </label>

          <div class="case-edit-modal__row">
            <label class="case-edit-modal__field">
              <span class="case-edit-modal__label">{{
                t("cases.detail.editModal.fields.dueAt")
              }}</span>
              <input
                id="case-edit-dueAt"
                name="dueAt"
                type="date"
                class="case-edit-modal__input"
                :value="localDueAt"
                :disabled="props.submitting"
                @input="localDueAt = ($event.target as HTMLInputElement).value"
              />
            </label>

            <label class="case-edit-modal__field">
              <span class="case-edit-modal__label">{{
                t("cases.detail.editModal.fields.acceptedAt")
              }}</span>
              <input
                id="case-edit-acceptedAt"
                name="acceptedAt"
                type="date"
                class="case-edit-modal__input"
                :value="localAcceptedAt"
                :disabled="props.submitting"
                @input="
                  localAcceptedAt = ($event.target as HTMLInputElement).value
                "
              />
            </label>
          </div>

          <div class="case-edit-modal__row">
            <label class="case-edit-modal__field">
              <span class="case-edit-modal__label">{{
                t("cases.detail.editModal.fields.priority")
              }}</span>
              <select
                id="case-edit-priority"
                name="priority"
                class="case-edit-modal__input"
                :value="localPriority"
                :disabled="props.submitting"
                @change="
                  localPriority = ($event.target as HTMLSelectElement).value
                "
              >
                <option value="">--</option>
                <option value="low">
                  {{ t("cases.detail.editModal.priorityOptions.low") }}
                </option>
                <option value="normal">
                  {{ t("cases.detail.editModal.priorityOptions.normal") }}
                </option>
                <option value="high">
                  {{ t("cases.detail.editModal.priorityOptions.high") }}
                </option>
                <option value="urgent">
                  {{ t("cases.detail.editModal.priorityOptions.urgent") }}
                </option>
              </select>
            </label>

            <label class="case-edit-modal__field">
              <span class="case-edit-modal__label">{{
                t("cases.detail.editModal.fields.riskLevel")
              }}</span>
              <select
                id="case-edit-riskLevel"
                name="riskLevel"
                class="case-edit-modal__input"
                :value="localRiskLevel"
                :disabled="props.submitting"
                @change="
                  localRiskLevel = ($event.target as HTMLSelectElement).value
                "
              >
                <option value="">--</option>
                <option value="normal">
                  {{ t("cases.detail.editModal.riskOptions.normal") }}
                </option>
                <option value="attention">
                  {{ t("cases.detail.editModal.riskOptions.attention") }}
                </option>
                <option value="high">
                  {{ t("cases.detail.editModal.riskOptions.high") }}
                </option>
              </select>
            </label>
          </div>

          <label class="case-edit-modal__field">
            <span class="case-edit-modal__label">{{
              t("cases.detail.editModal.fields.ownerUserId")
            }}</span>
            <UserPicker
              id="case-edit-ownerUserId"
              name="ownerUserId"
              class="case-edit-modal__input"
              :model-value="localOwnerUserId"
              :disabled="props.submitting"
              @update:model-value="localOwnerUserId = $event"
            />
          </label>

          <label class="case-edit-modal__field">
            <span class="case-edit-modal__label">{{
              t("cases.detail.editModal.fields.assistantUserId")
            }}</span>
            <UserPicker
              id="case-edit-assistantUserId"
              name="assistantUserId"
              class="case-edit-modal__input"
              :model-value="localAssistantUserId"
              :disabled="props.submitting"
              @update:model-value="localAssistantUserId = $event"
            />
          </label>

          <label class="case-edit-modal__field">
            <span class="case-edit-modal__label">{{
              t("cases.detail.editModal.fields.groupId")
            }}</span>
            <select
              id="case-edit-groupId"
              name="groupId"
              class="case-edit-modal__input"
              :value="localGroupId"
              :disabled="props.submitting"
              @change="
                localGroupId = ($event.target as HTMLSelectElement).value
              "
            >
              <option value="">--</option>
              <option v-if="hasGroupFallback" :value="localGroupId">
                {{ groupFallbackLabel }}
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

          <label class="case-edit-modal__field">
            <span class="case-edit-modal__label">{{
              t("cases.detail.editModal.fields.jurisdictionAuthority")
            }}</span>
            <input
              id="case-edit-jurisdictionAuthority"
              name="jurisdictionAuthority"
              type="text"
              class="case-edit-modal__input"
              :value="localJurisdictionAuthority"
              :disabled="props.submitting"
              @input="
                localJurisdictionAuthority = ($event.target as HTMLInputElement)
                  .value
              "
            />
          </label>

          <label class="case-edit-modal__field">
            <span class="case-edit-modal__label">{{
              t("cases.detail.editModal.fields.remark")
            }}</span>
            <textarea
              id="case-edit-remark"
              name="remark"
              class="case-edit-modal__input case-edit-modal__textarea"
              :value="localRemark"
              :disabled="props.submitting"
              @input="
                localRemark = ($event.target as HTMLTextAreaElement).value
              "
            />
          </label>
        </div>

        <footer class="case-edit-modal__footer">
          <Button size="sm" :disabled="props.submitting" @click="emit('close')">
            {{ t("cases.detail.editModal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="props.submitting"
            @click="handleSave"
          >
            {{ t("cases.detail.editModal.save") }}
          </Button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.case-edit-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.case-edit-modal {
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-bg-1, #fff);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.case-edit-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.case-edit-modal__title {
  margin: 0;
  font-size: var(--font-size-lg, 18px);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-text-1);
}

.case-edit-modal__close {
  border: none;
  background: none;
  cursor: pointer;
  padding: 4px;
  color: var(--color-text-3);
  border-radius: var(--radius-md);
  &:hover {
    background: var(--color-bg-3);
  }
}

.case-edit-modal__body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.case-edit-modal__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.case-edit-modal__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.case-edit-modal__label {
  font-size: var(--font-size-sm, 14px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text-2);
}

.case-edit-modal__input {
  padding: 8px 12px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
  font: inherit;
  font-size: var(--font-size-sm, 14px);
  color: var(--color-text-1);
  background: var(--color-bg-1, #fff);
  &:focus {
    outline: none;
    border-color: var(--color-primary-6);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-6-rgb, 59 130 246), 0.15);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.case-edit-modal__textarea {
  resize: vertical;
  min-height: 72px;
}

.case-edit-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
