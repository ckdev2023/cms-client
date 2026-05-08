<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { CUSTOMER_TYPES, type CustomerType } from "../types-customer-fields";
import type { CustomerCreateFormFields, SelectOption } from "../types";
import { getVisaTypeOptions } from "../../../shared/model/visaTypeOptions";

/**
 * 新建客户弹窗字段表单。
 *
 * BUG-187：根据 `customerType` 切换字段集合：
 * - individual：保留原有 16 字段集合（性别、生年月日、国籍、签证类型等）。
 * - corporation：仅展示法人相关字段（公司名 / 公司假名 / 代表者姓名 / 联系信息 / 备注），
 *   隐藏个人专属字段，避免误填。
 *
 * BUG-188：原生 `<input type="date">` 的占位符与日历弹层文案默认跟随浏览器/系统语言，
 * 在 en-US/ja-JP 下会泄漏 zh-CN 残串（"年/月/日"、"显示日期选择器"）。
 * 显式把当前 i18n locale 透传到 `lang` 属性，让 Chromium 按应用语言渲染原生 picker 文案。
 */
const { t, locale } = useI18n();

// prettier-ignore
const SOURCE_LABEL: Record<string, string> = { REFERRAL:"sourceTypeReferral",WEB:"sourceTypeWeb",ADS:"sourceTypeAds" };
// prettier-ignore
const LOCATION_LABEL: Record<string, string> = { OVERSEAS:"locationOverseas",JAPAN:"locationJapan" };
const p = "customers.list.createModal.fields";
const toOpts = (map: Record<string, string>) =>
  computed(() =>
    Object.entries(map).map(([v, k]) => ({ value: v, label: t(`${p}.${k}`) })),
  );
const visaOpts = computed(() => getVisaTypeOptions(locale.value));
const sourceOpts = toOpts(SOURCE_LABEL);
const locationOpts = toOpts(LOCATION_LABEL);

type Props = {
  fields?: CustomerCreateFormFields;
  groupOptions?: SelectOption[];
};

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:field": [name: keyof CustomerCreateFormFields, value: string];
}>();

const customerType = computed<CustomerType>(
  () => props.fields?.customerType ?? "individual",
);

const isIndividual = computed(() => customerType.value === "individual");
const isCorporation = computed(() => customerType.value === "corporation");

const legalNameLabel = computed(() =>
  isCorporation.value ? t(`${p}.legalNameCorporation`) : t(`${p}.legalName`),
);
const legalNamePlaceholder = computed(() =>
  isCorporation.value
    ? t(`${p}.legalNameCorporationPlaceholder`)
    : t(`${p}.legalNamePlaceholder`),
);
const kanaLabel = computed(() =>
  isCorporation.value ? t(`${p}.kanaCorporation`) : t(`${p}.kana`),
);
const kanaPlaceholder = computed(() =>
  isCorporation.value
    ? t(`${p}.kanaCorporationPlaceholder`)
    : t(`${p}.kanaPlaceholder`),
);

const inputValue = (e: Event) => (e.target as HTMLInputElement).value;
const selectValue = (e: Event) => (e.target as HTMLSelectElement).value;

/**
 * 处理客户类型 radio 切换。
 *
 * @param event - 原生 change 事件
 */
function onCustomerTypeChange(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  if ((CUSTOMER_TYPES as readonly string[]).includes(value)) {
    emit("update:field", "customerType", value);
  }
}
</script>

<template>
  <div class="customer-modal__fields">
    <fieldset class="customer-modal__field">
      <legend class="customer-modal__label">
        {{ t("customers.list.createModal.customerType.label") }}
        <span class="customer-modal__required">*</span>
      </legend>
      <div class="customer-modal__type-group" role="radiogroup">
        <label
          v-for="value in CUSTOMER_TYPES"
          :key="value"
          class="customer-modal__type-option"
          :for="`customer-create-customerType-${value}`"
        >
          <input
            :id="`customer-create-customerType-${value}`"
            type="radio"
            name="customerType"
            :value="value"
            :checked="customerType === value"
            @change="onCustomerTypeChange"
          />
          {{ t(`customers.list.createModal.customerType.${value}`) }}
        </label>
      </div>
    </fieldset>

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
          {{ legalNameLabel }}
          <span class="customer-modal__required">*</span>
        </label>
        <input
          id="customer-create-legalName"
          name="legalName"
          type="text"
          class="customer-modal__input"
          :value="props.fields?.legalName"
          :placeholder="legalNamePlaceholder"
          @input="$emit('update:field', 'legalName', inputValue($event))"
        />
      </div>
      <div class="customer-modal__field">
        <label class="customer-modal__label" for="customer-create-kana">
          {{ kanaLabel }}
        </label>
        <input
          id="customer-create-kana"
          name="kana"
          type="text"
          class="customer-modal__input"
          :value="props.fields?.kana"
          :placeholder="kanaPlaceholder"
          @input="$emit('update:field', 'kana', inputValue($event))"
        />
      </div>
    </div>

    <div v-if="isCorporation" class="customer-modal__field">
      <label
        class="customer-modal__label"
        for="customer-create-representativeName"
      >
        {{ t("customers.list.createModal.fields.representativeName") }}
      </label>
      <input
        id="customer-create-representativeName"
        name="representativeName"
        type="text"
        class="customer-modal__input"
        :value="props.fields?.representativeName"
        :placeholder="
          t('customers.list.createModal.fields.representativeNamePlaceholder')
        "
        @input="$emit('update:field', 'representativeName', inputValue($event))"
      />
    </div>

    <div v-if="isIndividual" class="customer-modal__row">
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
          :lang="locale"
          :value="props.fields?.birthDate"
          @input="$emit('update:field', 'birthDate', inputValue($event))"
        />
      </div>
    </div>

    <div v-if="isIndividual" class="customer-modal__field">
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
      <div v-if="isIndividual" class="customer-modal__field">
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
