<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import type { CaseDetail, RelatedParty } from "../types-detail";
import {
  INFO_TAB_CASE_ATTRIBUTES_FIELDS,
  INFO_TAB_READONLY_RULES,
} from "../model/CaseAdapterDetailContracts";

/** 基本信息 Tab：展示案件属性、相关方与只读字段状态。 */
const { t, te } = useI18n();

const props = defineProps<{
  detail: CaseDetail;
  readonly: boolean;
}>();

const isBmvCase = computed(
  () => props.detail.workflowStep != null || props.detail.visaPlan != null,
);

const caseIdDisplay = computed(
  () => props.detail.caseNo || props.detail.id || "—",
);

const caseTypeDisplay = computed(() =>
  translateEnumOrFallback("cases.constants.caseTypes", props.detail.caseType),
);

const applicationTypeDisplay = computed(() =>
  translateEnumOrFallback(
    "cases.constants.applicationTypes",
    props.detail.applicationType,
  ),
);

/**
 * 在指定的 i18n 命名空间下查找枚举翻译，缺失时回退为原始值或 "—"。
 * @param ns - i18n key 前缀
 * @param value - 枚举原始值
 * @returns 翻译文本或回退展示
 */
function translateEnumOrFallback(
  ns: string,
  value: string | null | undefined,
): string {
  if (!value) return "—";
  const key = `${ns}.${value}`;
  return te(key) ? t(key) : value;
}

/**
 * P0 阶段所有 info tab 属性字段均为 display-only。
 * 此函数统一判断：字段在 alwaysReadonly 列表中 → 永远 disabled；
 * 否则退化为与 props.readonly（S9 归档）一致。
 * @param field - info tab 字段 key
 * @returns 当前字段是否应为只读展示态
 */
function isFieldDisabled(field: string): boolean {
  const always = INFO_TAB_READONLY_RULES.alwaysReadonly as readonly string[];
  if (always.includes(field)) return true;
  return props.readonly;
}

/**
 * 生成关联方头像区域的内联样式。
 * @param party - 关联方信息。
 * @returns 头像容器样式对象。
 */
function partyAvatarStyle(party: RelatedParty): Record<string, string> {
  if (party.avatarStyle === "gradient") {
    return {
      background:
        "linear-gradient(135deg, var(--color-primary-6), var(--color-primary-7, #0369a1))",
      color: "#fff",
    };
  }
  return {
    background: "var(--color-bg-3)",
    color: "var(--color-text-1)",
  };
}

const _contractGuard: readonly string[] = INFO_TAB_CASE_ATTRIBUTES_FIELDS;
void _contractGuard;
</script>

<template>
  <div class="info-tab">
    <div class="info-tab__grid">
      <!-- Case attributes -->
      <div class="info-tab__main">
        <Card :title="t('cases.detail.info.cardTitle')" padding="md">
          <div class="info-tab__fields">
            <div class="info-tab__field">
              <label class="info-tab__label">{{
                t("cases.detail.info.fields.caseId")
              }}</label>
              <span class="info-tab__value info-tab__value--disabled">
                {{ caseIdDisplay }}
              </span>
            </div>
            <div class="info-tab__field">
              <label class="info-tab__label">{{
                t("cases.detail.info.fields.caseType")
              }}</label>
              <span
                class="info-tab__value"
                :class="{
                  'info-tab__value--disabled': isFieldDisabled('caseType'),
                }"
              >
                {{ caseTypeDisplay }}
              </span>
            </div>
            <div class="info-tab__field">
              <label class="info-tab__label">{{
                t("cases.detail.info.fields.applicationType")
              }}</label>
              <span
                class="info-tab__value"
                :class="{
                  'info-tab__value--disabled':
                    isFieldDisabled('applicationType'),
                }"
              >
                {{ applicationTypeDisplay }}
              </span>
            </div>
            <div class="info-tab__field">
              <label class="info-tab__label">{{
                t("cases.detail.info.fields.acceptedDate")
              }}</label>
              <span
                class="info-tab__value"
                :class="{
                  'info-tab__value--disabled': isFieldDisabled('acceptedDate'),
                }"
              >
                {{ detail.acceptedDate || "—" }}
              </span>
            </div>
            <div class="info-tab__field">
              <label class="info-tab__label">{{
                t("cases.detail.info.fields.targetDate")
              }}</label>
              <span
                class="info-tab__value"
                :class="{
                  'info-tab__value--disabled': isFieldDisabled('targetDate'),
                }"
              >
                {{ detail.targetDate || "—" }}
              </span>
            </div>
            <div class="info-tab__field">
              <label class="info-tab__label">{{
                t("cases.detail.info.fields.agency")
              }}</label>
              <span
                class="info-tab__value"
                :class="{
                  'info-tab__value--disabled': isFieldDisabled('agency'),
                }"
              >
                {{ detail.agency || "—" }}
              </span>
            </div>

            <template v-if="isBmvCase">
              <div class="info-tab__field">
                <label class="info-tab__label">{{
                  t("cases.detail.info.fields.visaPlan")
                }}</label>
                <span class="info-tab__value info-tab__value--disabled">
                  {{ detail.visaPlan || "—" }}
                </span>
              </div>
              <div class="info-tab__field">
                <label class="info-tab__label">{{
                  t("cases.detail.info.fields.quotePrice")
                }}</label>
                <span class="info-tab__value info-tab__value--disabled">
                  {{ detail.quotePriceLabel || "—" }}
                </span>
              </div>
              <div class="info-tab__field">
                <label class="info-tab__label">{{
                  t("cases.detail.info.fields.supplementCount")
                }}</label>
                <span class="info-tab__value info-tab__value--disabled">
                  {{ detail.supplementCount ?? "—" }}
                </span>
              </div>
            </template>
          </div>
        </Card>
      </div>

      <!-- Sidebar -->
      <div class="info-tab__sidebar">
        <!-- Related parties -->
        <Card padding="md">
          <template #header>
            <h3 class="info-tab__section-title">
              {{ t("cases.detail.info.relatedParties.title") }}
            </h3>
          </template>
          <div
            v-if="detail.relatedParties.length > 0"
            class="info-tab__parties"
          >
            <div
              v-for="(party, i) in detail.relatedParties"
              :key="i"
              class="info-tab__party-card"
            >
              <div class="info-tab__party-header">
                <span
                  class="info-tab__party-avatar"
                  :style="partyAvatarStyle(party)"
                >
                  {{ party.initials }}
                </span>
                <div>
                  <div class="info-tab__party-name">{{ party.name }}</div>
                  <div class="info-tab__party-role">
                    {{ te(party.role) ? t(party.role) : party.role }}
                  </div>
                </div>
              </div>
              <div class="info-tab__party-detail">{{ party.detail }}</div>
            </div>
          </div>
          <div v-else class="info-tab__placeholder">
            <span class="info-tab__placeholder-text">
              {{ t("cases.detail.info.relatedParties.empty") }}
            </span>
          </div>
        </Card>

        <!-- Risk tags placeholder -->
        <Card padding="md">
          <h3 class="info-tab__section-title" style="margin-bottom: 12px">
            {{ t("cases.detail.info.riskTags.title") }}
          </h3>
          <div class="info-tab__placeholder">
            <span class="info-tab__placeholder-text">
              {{ t("cases.detail.info.riskTags.empty") }}
            </span>
            <span class="info-tab__placeholder-sub">
              {{ t("cases.detail.info.riskTags.placeholder") }}
            </span>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.info-tab {
  display: grid;
  gap: 20px;
}

.info-tab__grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

@media (max-width: 1024px) {
  .info-tab__grid {
    grid-template-columns: 1fr;
  }
}

.info-tab__main,
.info-tab__sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Fields ────────────────────────────────────────────── */

.info-tab__fields {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 600px) {
  .info-tab__fields {
    grid-template-columns: 1fr;
  }
}

.info-tab__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-tab__label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.info-tab__value {
  padding: 8px 12px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-2);
  border-radius: var(--radius-md);
  min-height: 38px;
}

.info-tab__value--disabled {
  background: var(--color-bg-3);
  color: var(--color-text-3);
}

/* ── Section title ─────────────────────────────────────── */

.info-tab__section-title {
  margin: 0;
  font-size: var(--font-size-md);
  line-height: var(--leading-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

/* ── Related parties ───────────────────────────────────── */

.info-tab__parties {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-tab__party-card {
  padding: 12px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  transition: border-color 0.15s;
}

.info-tab__party-card:hover {
  border-color: rgba(3, 105, 161, 0.25);
}

.info-tab__party-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.info-tab__party-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.info-tab__party-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.info-tab__party-role {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.info-tab__party-detail {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  padding-left: 42px;
}

/* ── Placeholder ───────────────────────────────────────── */

.info-tab__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 24px 12px;
}

.info-tab__placeholder-text {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.info-tab__placeholder-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}
</style>
