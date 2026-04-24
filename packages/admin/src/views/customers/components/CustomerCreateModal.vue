<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { CustomerCreateFormFields, SelectOption } from "../types";
import type { CustomerDuplicateCandidate } from "../model/CustomerAdapter";
import type { CustomerCreateFormErrorCode } from "../model/useCustomerCreateForm";

/**
 * 新建客户弹窗：12 字段表单 + 去重提示 + 创建/草稿按钮。
 */

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

defineEmits<{
  close: [];
  saveDraft: [];
  create: [];
  "update:field": [name: keyof CustomerCreateFormFields, value: string];
}>();

const inputValue = (e: Event) => (e.target as HTMLInputElement).value;

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

          <div class="customer-modal__fields">
            <div class="customer-modal__row">
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.displayName") }}
                </label>
                <input
                  type="text"
                  class="customer-modal__input"
                  :value="props.fields?.displayName"
                  :placeholder="
                    t(
                      'customers.list.createModal.fields.displayNamePlaceholder',
                    )
                  "
                  @input="
                    $emit('update:field', 'displayName', inputValue($event))
                  "
                />
              </div>
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.group") }}
                  <span class="customer-modal__required">*</span>
                </label>
                <select
                  class="customer-modal__input customer-modal__select"
                  :value="props.fields?.group"
                  @change="
                    $emit(
                      'update:field',
                      'group',
                      ($event.target as HTMLSelectElement).value,
                    )
                  "
                >
                  <option value="" disabled>
                    {{
                      t("customers.list.createModal.fields.groupPlaceholder")
                    }}
                  </option>
                  <option
                    v-for="opt in props.groupOptions ?? []"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </div>

            <div class="customer-modal__row">
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.legalName") }}
                  <span class="customer-modal__required">*</span>
                </label>
                <input
                  type="text"
                  class="customer-modal__input"
                  :value="props.fields?.legalName"
                  :placeholder="
                    t('customers.list.createModal.fields.legalNamePlaceholder')
                  "
                  @input="
                    $emit('update:field', 'legalName', inputValue($event))
                  "
                />
              </div>
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.kana") }}
                </label>
                <input
                  type="text"
                  class="customer-modal__input"
                  :value="props.fields?.kana"
                  :placeholder="
                    t('customers.list.createModal.fields.kanaPlaceholder')
                  "
                  @input="$emit('update:field', 'kana', inputValue($event))"
                />
              </div>
            </div>

            <div class="customer-modal__row">
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.gender") }}
                </label>
                <select
                  class="customer-modal__input customer-modal__select"
                  :value="props.fields?.gender"
                  @change="
                    $emit(
                      'update:field',
                      'gender',
                      ($event.target as HTMLSelectElement).value,
                    )
                  "
                >
                  <option value="">
                    {{ t("customers.list.createModal.fields.genderDefault") }}
                  </option>
                  <option value="male">
                    {{ t("customers.list.createModal.fields.genderMale") }}
                  </option>
                  <option value="female">
                    {{ t("customers.list.createModal.fields.genderFemale") }}
                  </option>
                </select>
              </div>
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.birthDate") }}
                </label>
                <input
                  type="date"
                  class="customer-modal__input"
                  :value="props.fields?.birthDate"
                  @input="
                    $emit('update:field', 'birthDate', inputValue($event))
                  "
                />
              </div>
            </div>

            <div class="customer-modal__field">
              <label class="customer-modal__label">
                {{ t("customers.list.createModal.fields.nationality") }}
              </label>
              <input
                type="text"
                class="customer-modal__input"
                :value="props.fields?.nationality"
                :placeholder="
                  t('customers.list.createModal.fields.nationalityPlaceholder')
                "
                @input="
                  $emit('update:field', 'nationality', inputValue($event))
                "
              />
            </div>

            <div class="customer-modal__row">
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.phone") }}
                  <span class="customer-modal__required">*</span>
                </label>
                <input
                  type="tel"
                  class="customer-modal__input"
                  :value="props.fields?.phone"
                  :placeholder="
                    t('customers.list.createModal.fields.phonePlaceholder')
                  "
                  @input="$emit('update:field', 'phone', inputValue($event))"
                />
                <div class="customer-modal__hint">
                  {{ t("customers.list.createModal.fields.phoneHint") }}
                </div>
              </div>
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.email") }}
                </label>
                <input
                  type="email"
                  class="customer-modal__input"
                  :value="props.fields?.email"
                  :placeholder="
                    t('customers.list.createModal.fields.emailPlaceholder')
                  "
                  @input="$emit('update:field', 'email', inputValue($event))"
                />
              </div>
            </div>

            <div class="customer-modal__field">
              <label class="customer-modal__label">
                {{ t("customers.list.createModal.fields.referrer") }}
              </label>
              <input
                type="text"
                class="customer-modal__input"
                :value="props.fields?.referrer"
                :placeholder="
                  t('customers.list.createModal.fields.referrerPlaceholder')
                "
                @input="$emit('update:field', 'referrer', inputValue($event))"
              />
            </div>

            <div class="customer-modal__row">
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.avatar") }}
                </label>
                <input type="file" class="customer-modal__input" />
              </div>
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.note") }}
                </label>
                <input
                  type="text"
                  class="customer-modal__input"
                  :value="props.fields?.note"
                  :placeholder="
                    t('customers.list.createModal.fields.notePlaceholder')
                  "
                  @input="$emit('update:field', 'note', inputValue($event))"
                />
              </div>
            </div>
          </div>
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
