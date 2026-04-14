<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import type { CustomerDetail } from "../types";
import { useCustomerBasicInfoModel } from "../model/useCustomerBasicInfoModel";

/** 基础信息 Tab：以只读/编辑双模式展示客户的 13 个基础字段。 */
const props = defineProps<{
  customer: CustomerDetail;
}>();

const { t } = useI18n();

const customerRef = computed(() => props.customer);
const {
  isEditing,
  showSavedHint,
  formSnapshot,
  currentSnapshot,
  groupOptions,
  ownerOptions,
  startEditing,
  cancelEditing,
  save,
} = useCustomerBasicInfoModel(customerRef);

const displayValues = computed(() =>
  isEditing.value ? formSnapshot.value : currentSnapshot.value,
);
</script>

<template>
  <Card padding="lg">
    <div class="basic-info">
      <div class="basic-info__header">
        <h3 class="basic-info__title">
          {{ t("customers.detail.basicInfo.title") }}
        </h3>
        <div class="basic-info__actions">
          <Button v-if="!isEditing" size="sm" pill @click="startEditing">
            {{ t("customers.detail.basicInfo.edit") }}
          </Button>
          <template v-else>
            <Button size="sm" @click="cancelEditing">
              {{ t("customers.detail.basicInfo.cancel") }}
            </Button>
            <Button variant="filled" tone="primary" size="sm" @click="save">
              {{ t("customers.detail.basicInfo.save") }}
            </Button>
          </template>
        </div>
      </div>

      <form v-if="displayValues" class="basic-info__form" @submit.prevent>
        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoDisplayName">
            {{ t("customers.detail.basicInfo.fields.displayName") }}
          </label>
          <input
            id="basicInfoDisplayName"
            :class="[
              'basic-info__input',
              { 'basic-info__input--readonly': !isEditing },
            ]"
            type="text"
            :value="displayValues.displayName"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="
              formSnapshot &&
              (formSnapshot.displayName = (
                $event.target as HTMLInputElement
              ).value)
            "
          />
        </div>

        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoLegalName">
            {{ t("customers.detail.basicInfo.fields.legalName") }}
          </label>
          <input
            id="basicInfoLegalName"
            :class="[
              'basic-info__input',
              { 'basic-info__input--readonly': !isEditing },
            ]"
            type="text"
            :value="displayValues.legalName"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="
              formSnapshot &&
              (formSnapshot.legalName = (
                $event.target as HTMLInputElement
              ).value)
            "
          />
        </div>

        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoFurigana">
            {{ t("customers.detail.basicInfo.fields.furigana") }}
          </label>
          <input
            id="basicInfoFurigana"
            :class="[
              'basic-info__input',
              { 'basic-info__input--readonly': !isEditing },
            ]"
            type="text"
            :value="displayValues.furigana"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="
              formSnapshot &&
              (formSnapshot.furigana = (
                $event.target as HTMLInputElement
              ).value)
            "
          />
        </div>

        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoNationality">
            {{ t("customers.detail.basicInfo.fields.nationality") }}
          </label>
          <input
            id="basicInfoNationality"
            :class="[
              'basic-info__input',
              { 'basic-info__input--readonly': !isEditing },
            ]"
            type="text"
            :value="displayValues.nationality"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="
              formSnapshot &&
              (formSnapshot.nationality = (
                $event.target as HTMLInputElement
              ).value)
            "
          />
        </div>

        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoGender">
            {{ t("customers.detail.basicInfo.fields.gender") }}
          </label>
          <select
            id="basicInfoGender"
            :class="[
              'basic-info__input',
              'basic-info__select',
              { 'basic-info__input--readonly': !isEditing },
            ]"
            :value="displayValues.gender"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @change="
              formSnapshot &&
              (formSnapshot.gender = ($event.target as HTMLSelectElement).value)
            "
          >
            <option value="">
              {{ t("customers.detail.basicInfo.fields.genderNone") }}
            </option>
            <option value="男">
              {{ t("customers.detail.basicInfo.fields.genderMale") }}
            </option>
            <option value="女">
              {{ t("customers.detail.basicInfo.fields.genderFemale") }}
            </option>
          </select>
        </div>

        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoBirthDate">
            {{ t("customers.detail.basicInfo.fields.birthDate") }}
          </label>
          <input
            id="basicInfoBirthDate"
            :class="[
              'basic-info__input',
              { 'basic-info__input--readonly': !isEditing },
            ]"
            type="date"
            :value="displayValues.birthDate"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="
              formSnapshot &&
              (formSnapshot.birthDate = (
                $event.target as HTMLInputElement
              ).value)
            "
          />
        </div>

        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoPhone">
            {{ t("customers.detail.basicInfo.fields.phone") }}
          </label>
          <input
            id="basicInfoPhone"
            :class="[
              'basic-info__input',
              { 'basic-info__input--readonly': !isEditing },
            ]"
            type="tel"
            inputmode="tel"
            :value="displayValues.phone"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="
              formSnapshot &&
              (formSnapshot.phone = ($event.target as HTMLInputElement).value)
            "
          />
        </div>

        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoEmail">
            {{ t("customers.detail.basicInfo.fields.email") }}
          </label>
          <input
            id="basicInfoEmail"
            :class="[
              'basic-info__input',
              { 'basic-info__input--readonly': !isEditing },
            ]"
            type="email"
            inputmode="email"
            :value="displayValues.email"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="
              formSnapshot &&
              (formSnapshot.email = ($event.target as HTMLInputElement).value)
            "
          />
        </div>

        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoGroup">
            {{ t("customers.detail.basicInfo.fields.group") }}
          </label>
          <select
            id="basicInfoGroup"
            :class="[
              'basic-info__input',
              'basic-info__select',
              { 'basic-info__input--readonly': !isEditing },
            ]"
            :value="displayValues.group"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @change="
              formSnapshot &&
              (formSnapshot.group = ($event.target as HTMLSelectElement).value)
            "
          >
            <option
              v-for="opt in groupOptions"
              :key="opt.value"
              :value="opt.label"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoOwner">
            {{ t("customers.detail.basicInfo.fields.owner") }}
          </label>
          <select
            id="basicInfoOwner"
            :class="[
              'basic-info__input',
              'basic-info__select',
              { 'basic-info__input--readonly': !isEditing },
            ]"
            :value="displayValues.owner"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @change="
              formSnapshot &&
              (formSnapshot.owner = ($event.target as HTMLSelectElement).value)
            "
          >
            <option
              v-for="opt in ownerOptions"
              :key="opt.value"
              :value="opt.label"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div class="basic-info__field basic-info__field--full">
          <label class="basic-info__label" for="basicInfoReferralSource">
            {{ t("customers.detail.basicInfo.fields.referralSource") }}
          </label>
          <input
            id="basicInfoReferralSource"
            :class="[
              'basic-info__input',
              { 'basic-info__input--readonly': !isEditing },
            ]"
            type="text"
            :value="displayValues.referralSource"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="
              formSnapshot &&
              (formSnapshot.referralSource = (
                $event.target as HTMLInputElement
              ).value)
            "
          />
        </div>

        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoAvatar">
            {{ t("customers.detail.basicInfo.fields.avatar") }}
          </label>
          <input
            id="basicInfoAvatar"
            :class="[
              'basic-info__input',
              { 'basic-info__input--readonly': !isEditing },
            ]"
            type="file"
            accept="image/*"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
          />
        </div>

        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoNote">
            {{ t("customers.detail.basicInfo.fields.note") }}
          </label>
          <input
            id="basicInfoNote"
            :class="[
              'basic-info__input',
              { 'basic-info__input--readonly': !isEditing },
            ]"
            type="text"
            :value="displayValues.note"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="
              formSnapshot &&
              (formSnapshot.note = ($event.target as HTMLInputElement).value)
            "
          />
        </div>
      </form>

      <p v-if="showSavedHint" class="basic-info__saved-hint" role="status">
        {{ t("customers.detail.basicInfo.savedHint") }}
      </p>
    </div>
  </Card>
</template>

<style scoped>
.basic-info {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.basic-info__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.basic-info__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.basic-info__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.basic-info__form {
  margin-top: 20px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .basic-info__form {
    grid-template-columns: 1fr 1fr;
  }
}

.basic-info__field--full {
  grid-column: 1 / -1;
}

.basic-info__label {
  display: block;
  margin-bottom: 4px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.02em;
  color: var(--color-text-3);
}

.basic-info__input {
  display: block;
  width: 100%;
  padding: 8px 12px;
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  background-color: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-default, 10px);
  transition:
    border-color 0.15s,
    background-color 0.15s;
}

.basic-info__input:focus {
  outline: none;
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 3px var(--color-primary-outline, rgba(0, 113, 227, 0.15));
}

.basic-info__input--readonly {
  background-color: var(--color-bg-3, #f5f5f7);
  cursor: default;
}

.basic-info__select {
  appearance: none;
}

.basic-info__saved-hint {
  margin: 12px 0 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}
</style>
