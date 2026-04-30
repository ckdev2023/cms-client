<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import CustomerCreateModalFields from "./CustomerCreateModalFields.vue";
import type { CustomerCreateFormFields, SelectOption } from "../types";
import type { CustomerDuplicateCandidate } from "../model/CustomerAdapter";
import type { CustomerCreateFormErrorCode } from "../model/useCustomerCreateForm";

/** 新建客户弹窗：壳 + 状态信息 + 字段表单 + 操作按钮组合。 */
const { t } = useI18n();

type CustomerCreateModalProps = {
  open?: boolean;
  fields?: CustomerCreateFormFields;
  canCreate?: boolean;
  showDedupe?: boolean;
  dedupeMatches?: CustomerDuplicateCandidate[];
  groupOptions?: SelectOption[];
  checkingDuplicates?: boolean;
  dedupeErrorCode?: CustomerCreateFormErrorCode | null;
  submitting?: boolean;
  submitErrorCode?: CustomerCreateFormErrorCode | null;
};

const props = defineProps<CustomerCreateModalProps>();

const emit = defineEmits<{
  close: [];
  saveDraft: [];
  create: [];
  "update:field": [name: keyof CustomerCreateFormFields, value: string];
}>();

/**
 * 根据错误码解析当前状态提示文案。
 * @param code 当前错误码。
 * @returns 对应的本地化提示文案。
 */
function resolveStateMessage(code?: CustomerCreateFormErrorCode | null) {
  return code ? t(`customers.list.createModal.state.${code}`) : "";
}

const dedupeStateMessage = computed(() => {
  return props.checkingDuplicates
    ? t("customers.list.createModal.state.checkingDuplicates")
    : resolveStateMessage(props.dedupeErrorCode);
});

const submitStateMessage = computed(() =>
  resolveStateMessage(props.submitErrorCode),
);

/**
 * 透传字段编辑事件，把字段名与最新值上抛给父组件统一处理。
 *
 * @param name - 字段名（CustomerCreateFormFields 的 key）。
 * @param value - 字段最新值。
 */
function onUpdateField(
  name: keyof CustomerCreateFormFields,
  value: string,
): void {
  emit("update:field", name, value);
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="customer-modal-backdrop"
      @click.self="!props.submitting && $emit('close')"
    >
      <div
        class="customer-modal"
        role="dialog"
        :aria-label="t('customers.list.createModal.title')"
      >
        <div class="customer-modal__header">
          <h3 class="customer-modal__title">
            {{ t("customers.list.createModal.title") }}
          </h3>
          <button
            class="customer-modal__close"
            type="button"
            :aria-label="t('customers.list.createModal.cancel')"
            :disabled="props.submitting"
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

        <div class="customer-modal__body">
          <p class="customer-modal__desc">
            {{ t("customers.list.createModal.description") }}
          </p>

          <div v-if="dedupeStateMessage" class="customer-modal__state">
            {{ dedupeStateMessage }}
          </div>

          <div v-if="props.showDedupe" class="customer-modal__dedupe">
            <div class="customer-modal__dedupe-title">
              {{ t("customers.list.createModal.dedupe.title") }}
            </div>
            <div class="customer-modal__dedupe-desc">
              {{ t("customers.list.createModal.dedupe.description") }}
            </div>
            <ul
              v-if="props.dedupeMatches && props.dedupeMatches.length"
              class="customer-modal__dedupe-list"
            >
              <li
                v-for="match in props.dedupeMatches"
                :key="match.id"
                class="customer-modal__dedupe-item"
              >
                {{ match.displayName }}
                <span v-if="match.phone || match.email">
                  ({{ [match.phone, match.email].filter(Boolean).join(" · ") }})
                </span>
              </li>
            </ul>
          </div>

          <CustomerCreateModalFields
            :fields="props.fields"
            :group-options="props.groupOptions"
            @update:field="onUpdateField"
          />
        </div>

        <div class="customer-modal__footer">
          <div v-if="submitStateMessage" class="customer-modal__state">
            {{ submitStateMessage }}
          </div>
          <Button
            variant="outlined"
            :disabled="props.submitting"
            @click="$emit('close')"
          >
            {{ t("customers.list.createModal.cancel") }}
          </Button>
          <Button
            variant="outlined"
            :disabled="props.submitting"
            @click="$emit('saveDraft')"
          >
            {{ t("customers.list.createModal.saveDraft") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            :disabled="!props.canCreate"
            :loading="props.submitting"
            @click="$emit('create')"
          >
            {{ t("customers.list.createModal.create") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped src="./CustomerCreateModal.css"></style>
