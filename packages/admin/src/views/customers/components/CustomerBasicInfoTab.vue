<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import CustomerBmvDisabledNotice from "./CustomerBmvDisabledNotice.vue";
import CustomerBmvIntakeCard from "./CustomerBmvIntakeCard.vue";
import CustomerLocalizedFilePicker from "./CustomerLocalizedFilePicker.vue";
import type { CustomerDetail } from "../types";
import {
  getVisaTypeOptions,
  resolveVisaTypeLabel,
} from "../../../shared/model/visaTypeOptions";
import { utcTodayIsoDateString } from "../../../shared/model/dateTodayIsoUtc";
import { CUSTOMER_BIRTHDATE_MIN_ISO } from "../../../shared/model/customerBirthDateBounds";
import { resolveGroupValue } from "../../../shared/model/useGroupOptions";
import { useCustomerBasicInfoModel } from "../model/useCustomerBasicInfoModel";
import { customerRequiresBmv } from "../model/useCustomerCreateCaseGateModel";
import type { CustomerRepository } from "../model/CustomerRepository";
import type { BasicInfoFormSnapshot } from "../model/useCustomerBasicInfoModel";

/**
 * 基础信息 Tab：客户基础字段只读/编辑切换；BMV loading 语义用字符串 `bmvFlagState`。
 */
const props = defineProps<{
  customer: CustomerDetail;
  repository: Pick<
    CustomerRepository,
    | "updateCustomerBasicInfo"
    | "sendBmvQuestionnaire"
    | "generateBmvQuote"
    | "recordBmvSign"
  >;
  refreshCustomer?: () => Promise<void>;
  /** 遗留：`bmvFlagState` 优先。 */
  bmvEnabled?: boolean;
  /** BMV：`undefined` 加载，`enabled`|`disabled`。 */
  bmvFlagState?: "enabled" | "disabled";
}>();

const emit = defineEmits<{
  (e: "transition-to-case"): void;
}>();

const { t, locale } = useI18n();
const disabledGroupSuffix = computed(() => t("shared.group.disabledSuffix"));

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
} = useCustomerBasicInfoModel({
  customer: customerRef,
  repository: props.repository,
  refreshCustomer: props.refreshCustomer,
  locale,
  disabledSuffix: disabledGroupSuffix,
});

const displayValues = computed(() =>
  isEditing.value ? formSnapshot.value : currentSnapshot.value,
);
const isBmvCustomer = computed(() => customerRequiresBmv(props.customer));
// `bmvFlagState` 优先；仅 boolean `bmvEnabled` 会与加载态混淆。
const bmvFlagResolution = computed<"loading" | "enabled" | "disabled">(() => {
  if (props.bmvFlagState === "enabled") return "enabled";
  if (props.bmvFlagState === "disabled") return "disabled";
  if (props.bmvEnabled === true) return "enabled";
  return "loading";
});
const showBmvIntakeCard = computed(
  () => bmvFlagResolution.value === "enabled" && isBmvCustomer.value,
);
// BMV 客户且租户 flag 关：降级提示；loading 不渲染以减少闪烁。
const showBmvDisabledNotice = computed(
  () => bmvFlagResolution.value === "disabled" && isBmvCustomer.value,
);
const avatarInputId = "basicInfoAvatar";
const birthDateInputMaxIso = computed(() => utcTodayIsoDateString());
const birthDateInputMinIso = CUSTOMER_BIRTHDATE_MIN_ISO;

const inputCls = computed(() => [
  "basic-info__input",
  { "basic-info__input--readonly": !isEditing.value },
]);
const selectCls = computed(() => [...inputCls.value, "basic-info__select"]);

/**
 * 将文本输入写入编辑快照。
 *
 * @param field - 快照字段名
 * @param e - input 事件
 */
function onInput(field: keyof BasicInfoFormSnapshot, e: Event) {
  if (formSnapshot.value)
    formSnapshot.value[field] = (e.target as HTMLInputElement).value;
}

/**
 * 将下拉变更写入编辑快照字段。
 *
 * @param field - 快照字段名
 * @param e - change 事件
 */
function onSelect(field: keyof BasicInfoFormSnapshot, e: Event) {
  if (formSnapshot.value)
    formSnapshot.value[field] = (e.target as HTMLSelectElement).value;
}

const visaOpts = computed(() => getVisaTypeOptions(locale.value));
// BUG-185：BMV Visa 字段保留 raw enum；用 resolveVisaTypeLabel 展示本地化标签。
const bmvVisaTypeLabel = computed(() =>
  resolveVisaTypeLabel(displayValues.value?.visaType ?? "", locale.value),
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

      <CustomerBmvIntakeCard
        v-if="showBmvIntakeCard"
        :customer="customer"
        :repository="repository"
        :refresh-customer="refreshCustomer"
        class="basic-info__intake-card"
        @transition-to-case="emit('transition-to-case')"
      />

      <CustomerBmvDisabledNotice v-else-if="showBmvDisabledNotice" />

      <form v-if="displayValues" class="basic-info__form" @submit.prevent>
        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoDisplayName">{{
            t("customers.detail.basicInfo.fields.displayName")
          }}</label>
          <input
            id="basicInfoDisplayName"
            name="displayName"
            :class="inputCls"
            type="text"
            :value="displayValues.displayName"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="onInput('displayName', $event)"
          />
        </div>
        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoLegalName">{{
            t("customers.detail.basicInfo.fields.legalName")
          }}</label>
          <input
            id="basicInfoLegalName"
            name="legalName"
            :class="inputCls"
            type="text"
            :value="displayValues.legalName"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="onInput('legalName', $event)"
          />
        </div>
        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoFurigana">{{
            t("customers.detail.basicInfo.fields.furigana")
          }}</label>
          <input
            id="basicInfoFurigana"
            name="furigana"
            :class="inputCls"
            type="text"
            :value="displayValues.furigana"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="onInput('furigana', $event)"
          />
        </div>
        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoNationality">{{
            t("customers.detail.basicInfo.fields.nationality")
          }}</label>
          <input
            id="basicInfoNationality"
            name="nationality"
            :class="inputCls"
            type="text"
            :value="displayValues.nationality"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="onInput('nationality', $event)"
          />
        </div>
        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoGender">{{
            t("customers.detail.basicInfo.fields.gender")
          }}</label>
          <select
            id="basicInfoGender"
            name="gender"
            :class="selectCls"
            :value="displayValues.gender"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @change="onSelect('gender', $event)"
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
          <label class="basic-info__label" for="basicInfoBirthDate">{{
            t("customers.detail.basicInfo.fields.birthDate")
          }}</label>
          <input
            id="basicInfoBirthDate"
            name="birthDate"
            :class="inputCls"
            :type="isEditing ? 'date' : 'text'"
            :lang="locale"
            :value="displayValues.birthDate"
            :max="isEditing ? birthDateInputMaxIso : undefined"
            :min="isEditing ? birthDateInputMinIso : undefined"
            :disabled="!isEditing"
            :aria-label="t('customers.detail.basicInfo.fields.birthDate')"
            :aria-disabled="!isEditing"
            @input="onInput('birthDate', $event)"
          />
        </div>
        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoPhone">{{
            t("customers.detail.basicInfo.fields.phone")
          }}</label>
          <input
            id="basicInfoPhone"
            name="phone"
            :class="inputCls"
            type="tel"
            inputmode="tel"
            :value="displayValues.phone"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="onInput('phone', $event)"
          />
        </div>
        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoEmail">{{
            t("customers.detail.basicInfo.fields.email")
          }}</label>
          <input
            id="basicInfoEmail"
            name="email"
            :class="inputCls"
            type="email"
            inputmode="email"
            :value="displayValues.email"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="onInput('email', $event)"
          />
        </div>
        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoGroup">{{
            t("customers.detail.basicInfo.fields.group")
          }}</label>
          <select
            id="basicInfoGroup"
            name="group"
            :class="selectCls"
            :value="
              resolveGroupValue(displayValues.group) ?? displayValues.group
            "
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @change="onSelect('group', $event)"
          >
            <option
              v-for="opt in groupOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
          <p v-if="isEditing" class="basic-info__hint">
            {{ t("shared.groupOptions.writeHint") }}
          </p>
        </div>
        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoOwner">{{
            t("customers.detail.basicInfo.fields.owner")
          }}</label>
          <select
            id="basicInfoOwner"
            name="owner"
            :class="selectCls"
            :value="displayValues.owner"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @change="onSelect('owner', $event)"
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
          <label class="basic-info__label" for="basicInfoReferralSource">{{
            t("customers.detail.basicInfo.fields.referralSource")
          }}</label>
          <input
            id="basicInfoReferralSource"
            name="referralSource"
            :class="inputCls"
            type="text"
            :value="displayValues.referralSource"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="onInput('referralSource', $event)"
          />
        </div>
        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoLocation">{{
            t("customers.detail.basicInfo.fields.location")
          }}</label>
          <select
            id="basicInfoLocation"
            name="location"
            :class="selectCls"
            :value="displayValues.location"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @change="onSelect('location', $event)"
          >
            <option value="">
              {{ t("customers.detail.basicInfo.fields.locationNone") }}
            </option>
            <option value="OVERSEAS">
              {{ t("customers.detail.basicInfo.fields.locationOverseas") }}
            </option>
            <option value="JAPAN">
              {{ t("customers.detail.basicInfo.fields.locationJapan") }}
            </option>
          </select>
        </div>
        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoSourceType">{{
            t("customers.detail.basicInfo.fields.sourceType")
          }}</label>
          <select
            id="basicInfoSourceType"
            name="sourceType"
            :class="selectCls"
            :value="displayValues.sourceType"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @change="onSelect('sourceType', $event)"
          >
            <option value="">
              {{ t("customers.detail.basicInfo.fields.sourceTypeNone") }}
            </option>
            <option value="REFERRAL">
              {{ t("customers.detail.basicInfo.fields.sourceTypeReferral") }}
            </option>
            <option value="WEB">
              {{ t("customers.detail.basicInfo.fields.sourceTypeWeb") }}
            </option>
            <option value="ADS">
              {{ t("customers.detail.basicInfo.fields.sourceTypeAds") }}
            </option>
          </select>
        </div>
        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoVisaType">{{
            t("customers.detail.basicInfo.fields.visaType")
          }}</label>
          <template v-if="isBmvCustomer">
            <input
              id="basicInfoVisaType"
              name="visaType"
              :class="['basic-info__input', 'basic-info__input--readonly']"
              type="text"
              :value="bmvVisaTypeLabel"
              disabled
              aria-disabled="true"
            />
            <span class="basic-info__hint">{{
              t("customers.detail.basicInfo.fields.visaTypeBmvDerived")
            }}</span>
          </template>
          <select
            v-else
            id="basicInfoVisaType"
            name="visaType"
            :class="selectCls"
            :value="displayValues.visaType"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @change="onSelect('visaType', $event)"
          >
            <option value="">
              {{ t("customers.detail.basicInfo.fields.visaTypeNone") }}
            </option>
            <option v-for="opt in visaOpts" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoReferrerName">{{
            t("customers.detail.basicInfo.fields.referrerName")
          }}</label>
          <input
            id="basicInfoReferrerName"
            name="referrerName"
            :class="inputCls"
            type="text"
            :value="displayValues.referrerName"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="onInput('referrerName', $event)"
          />
        </div>
        <div class="basic-info__field">
          <label class="basic-info__label" :for="avatarInputId">{{
            t("customers.detail.basicInfo.fields.avatar")
          }}</label>
          <CustomerLocalizedFilePicker
            :input-id="avatarInputId"
            :disabled="!isEditing"
            :ariaLabel="t('customers.detail.basicInfo.fields.avatar')"
            :button-text="t('customers.detail.basicInfo.avatarChooseFile')"
            :empty-text="t('customers.detail.basicInfo.avatarNoFileSelected')"
            :current-value="displayValues.avatar"
          />
        </div>
        <div class="basic-info__field">
          <label class="basic-info__label" for="basicInfoNote">{{
            t("customers.detail.basicInfo.fields.note")
          }}</label>
          <input
            id="basicInfoNote"
            name="note"
            :class="inputCls"
            type="text"
            :value="displayValues.note"
            :disabled="!isEditing"
            :aria-disabled="!isEditing"
            @input="onInput('note', $event)"
          />
        </div>
      </form>

      <p v-if="showSavedHint" class="basic-info__saved-hint" role="status">
        {{ t("customers.detail.basicInfo.savedHint") }}
      </p>
    </div>
  </Card>
</template>

<style scoped src="./CustomerBasicInfoTab.css"></style>
