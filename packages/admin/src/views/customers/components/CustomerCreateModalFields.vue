<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { CustomerCreateFormFields, SelectOption } from "../types";

/** 新建客户弹窗内的 16 字段表单：与 a11y id/name/label 关联的唯一来源。 */
const { t } = useI18n();

// prettier-ignore
const VISA_LABEL: Record<string, string> = { business_manager:"visaTypeBusinessManager",engineer_specialist:"visaTypeEngineerSpecialist",skilled_labor:"visaTypeSkilledLabor",student:"visaTypeStudent",dependent:"visaTypeDependent",permanent_resident:"visaTypePermanentResident",spouse_of_jp_national:"visaTypeSpouseOfJpNational",long_term_resident:"visaTypeLongTermResident",designated_activities:"visaTypeDesignatedActivities",other:"visaTypeOther" };
// prettier-ignore
const SOURCE_LABEL: Record<string, string> = { REFERRAL:"sourceTypeReferral",WEB:"sourceTypeWeb",ADS:"sourceTypeAds" };
// prettier-ignore
const LOCATION_LABEL: Record<string, string> = { OVERSEAS:"locationOverseas",JAPAN:"locationJapan" };
const p = "customers.list.createModal.fields";
const toOpts = (map: Record<string, string>) =>
  computed(() =>
    Object.entries(map).map(([v, k]) => ({ value: v, label: t(`${p}.${k}`) })),
  );
const visaOpts = toOpts(VISA_LABEL);
const sourceOpts = toOpts(SOURCE_LABEL);
const locationOpts = toOpts(LOCATION_LABEL);

type Props = {
  fields?: CustomerCreateFormFields;
  groupOptions?: SelectOption[];
};

const props = defineProps<Props>();

defineEmits<{
  "update:field": [name: keyof CustomerCreateFormFields, value: string];
}>();

const inputValue = (e: Event) => (e.target as HTMLInputElement).value;
const selectValue = (e: Event) => (e.target as HTMLSelectElement).value;
</script>

<template>
  <div class="customer-modal__fields">
    <div class="customer-modal__row">
      <div class="customer-modal__field">
        <label class="customer-modal__label" for="customer-create-displayName">
          {{ t("customers.list.createModal.fields.displayName") }}
        </label>
        <input
          id="customer-create-displayName"
          name="displayName"
          type="text"
          class="customer-modal__input"
          :value="props.fields?.displayName"
          :placeholder="
            t('customers.list.createModal.fields.displayNamePlaceholder')
          "
          @input="$emit('update:field', 'displayName', inputValue($event))"
        />
      </div>
      <div class="customer-modal__field">
        <label class="customer-modal__label" for="customer-create-group">
          {{ t("customers.list.createModal.fields.group") }}
          <span class="customer-modal__required">*</span>
        </label>
        <select
          id="customer-create-group"
          name="group"
          class="customer-modal__input customer-modal__select"
          :value="props.fields?.group"
          @change="$emit('update:field', 'group', selectValue($event))"
        >
          <option value="" disabled>
            {{ t("customers.list.createModal.fields.groupPlaceholder") }}
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
        <label class="customer-modal__label" for="customer-create-legalName">
          {{ t("customers.list.createModal.fields.legalName") }}
          <span class="customer-modal__required">*</span>
        </label>
        <input
          id="customer-create-legalName"
          name="legalName"
          type="text"
          class="customer-modal__input"
          :value="props.fields?.legalName"
          :placeholder="
            t('customers.list.createModal.fields.legalNamePlaceholder')
          "
          @input="$emit('update:field', 'legalName', inputValue($event))"
        />
      </div>
      <div class="customer-modal__field">
        <label class="customer-modal__label" for="customer-create-kana">
          {{ t("customers.list.createModal.fields.kana") }}
        </label>
        <input
          id="customer-create-kana"
          name="kana"
          type="text"
          class="customer-modal__input"
          :value="props.fields?.kana"
          :placeholder="t('customers.list.createModal.fields.kanaPlaceholder')"
          @input="$emit('update:field', 'kana', inputValue($event))"
        />
      </div>
    </div>

    <div class="customer-modal__row">
      <div class="customer-modal__field">
        <label class="customer-modal__label" for="customer-create-gender">
          {{ t("customers.list.createModal.fields.gender") }}
        </label>
        <select
          id="customer-create-gender"
          name="gender"
          class="customer-modal__input customer-modal__select"
          :value="props.fields?.gender"
          @change="$emit('update:field', 'gender', selectValue($event))"
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
        <label class="customer-modal__label" for="customer-create-birthDate">
          {{ t("customers.list.createModal.fields.birthDate") }}
        </label>
        <input
          id="customer-create-birthDate"
          name="birthDate"
          type="date"
          class="customer-modal__input"
          :value="props.fields?.birthDate"
          @input="$emit('update:field', 'birthDate', inputValue($event))"
        />
      </div>
    </div>

    <div class="customer-modal__field">
      <label class="customer-modal__label" for="customer-create-nationality">
        {{ t("customers.list.createModal.fields.nationality") }}
      </label>
      <input
        id="customer-create-nationality"
        name="nationality"
        type="text"
        class="customer-modal__input"
        :value="props.fields?.nationality"
        :placeholder="
          t('customers.list.createModal.fields.nationalityPlaceholder')
        "
        @input="$emit('update:field', 'nationality', inputValue($event))"
      />
    </div>

    <div class="customer-modal__row">
      <div class="customer-modal__field">
        <label class="customer-modal__label" for="customer-create-phone">
          {{ t("customers.list.createModal.fields.phone") }}
          <span class="customer-modal__required">*</span>
        </label>
        <input
          id="customer-create-phone"
          name="phone"
          type="tel"
          class="customer-modal__input"
          :value="props.fields?.phone"
          :placeholder="t('customers.list.createModal.fields.phonePlaceholder')"
          @input="$emit('update:field', 'phone', inputValue($event))"
        />
        <div class="customer-modal__hint">
          {{ t("customers.list.createModal.fields.phoneHint") }}
        </div>
      </div>
      <div class="customer-modal__field">
        <label class="customer-modal__label" for="customer-create-email">
          {{ t("customers.list.createModal.fields.email") }}
        </label>
        <input
          id="customer-create-email"
          name="email"
          type="email"
          class="customer-modal__input"
          :value="props.fields?.email"
          :placeholder="t('customers.list.createModal.fields.emailPlaceholder')"
          @input="$emit('update:field', 'email', inputValue($event))"
        />
      </div>
    </div>

    <div class="customer-modal__row">
      <div class="customer-modal__field">
        <label class="customer-modal__label" for="customer-create-location">
          {{ t("customers.list.createModal.fields.location") }}
        </label>
        <select
          id="customer-create-location"
          name="location"
          class="customer-modal__input customer-modal__select"
          :value="props.fields?.location"
          @change="$emit('update:field', 'location', selectValue($event))"
        >
          <option value="">
            {{ t("customers.list.createModal.fields.locationNone") }}
          </option>
          <option v-for="o in locationOpts" :key="o.value" :value="o.value">
            {{ o.label }}
          </option>
        </select>
      </div>
      <div class="customer-modal__field">
        <label class="customer-modal__label" for="customer-create-sourceType">
          {{ t("customers.list.createModal.fields.sourceType") }}
        </label>
        <select
          id="customer-create-sourceType"
          name="sourceType"
          class="customer-modal__input customer-modal__select"
          :value="props.fields?.sourceType"
          @change="$emit('update:field', 'sourceType', selectValue($event))"
        >
          <option value="">
            {{ t("customers.list.createModal.fields.sourceTypeNone") }}
          </option>
          <option v-for="o in sourceOpts" :key="o.value" :value="o.value">
            {{ o.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="customer-modal__row">
      <div class="customer-modal__field">
        <label class="customer-modal__label" for="customer-create-visaType">
          {{ t("customers.list.createModal.fields.visaType") }}
        </label>
        <select
          id="customer-create-visaType"
          name="visaType"
          class="customer-modal__input customer-modal__select"
          :value="props.fields?.visaType"
          @change="$emit('update:field', 'visaType', selectValue($event))"
        >
          <option value="">
            {{ t("customers.list.createModal.fields.visaTypeNone") }}
          </option>
          <option v-for="opt in visaOpts" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
      <div
        v-if="props.fields?.sourceType === 'REFERRAL'"
        class="customer-modal__field"
      >
        <label class="customer-modal__label" for="customer-create-referrerName">
          {{ t("customers.list.createModal.fields.referrerName") }}
        </label>
        <input
          id="customer-create-referrerName"
          name="referrerName"
          type="text"
          class="customer-modal__input"
          :value="props.fields?.referrerName"
          :placeholder="
            t('customers.list.createModal.fields.referrerNamePlaceholder')
          "
          @input="$emit('update:field', 'referrerName', inputValue($event))"
        />
      </div>
    </div>

    <div class="customer-modal__row">
      <div class="customer-modal__field">
        <label class="customer-modal__label" for="customer-create-avatar">
          {{ t("customers.list.createModal.fields.avatar") }}
        </label>
        <input
          id="customer-create-avatar"
          name="avatar"
          type="file"
          class="customer-modal__input"
        />
      </div>
      <div class="customer-modal__field">
        <label class="customer-modal__label" for="customer-create-note">
          {{ t("customers.list.createModal.fields.note") }}
        </label>
        <input
          id="customer-create-note"
          name="note"
          type="text"
          class="customer-modal__input"
          :value="props.fields?.note"
          :placeholder="t('customers.list.createModal.fields.notePlaceholder')"
          @input="$emit('update:field', 'note', inputValue($event))"
        />
      </div>
    </div>
  </div>
</template>

<style scoped src="./CustomerCreateModal.css"></style>
