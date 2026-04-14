<script setup lang="ts">
import { computed, reactive } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import type {
  LeadFollowupRecord,
  FollowupChannel,
  FollowupChannelMeta,
} from "../types";
import { FOLLOWUP_CHANNELS } from "../types";
import type { FollowupFormFields } from "../model/useLeadDetailModel";

/** 跟进记录 Tab：新增跟进表单 + 已有跟进时间线，空状态引导。 */
const props = defineProps<{
  followups: LeadFollowupRecord[];
  followupForm: FollowupFormFields;
  canSubmitFollowup: boolean;
  readonly: boolean;
}>();

defineEmits<{
  submitFollowup: [];
  resetFollowup: [];
}>();

const { t } = useI18n();

const channels: readonly FollowupChannelMeta[] = FOLLOWUP_CHANNELS;

const isEmpty = computed(() => props.followups.length === 0);

/**
 * 根据跟进渠道返回 chip 背景色 class。
 *
 * @param channel 跟进渠道
 * @returns CSS class 字符串
 */
function channelChipClass(channel: FollowupChannel): string {
  const meta = FOLLOWUP_CHANNELS.find((c) => c.value === channel);
  return meta?.chipClass ?? "bg-gray-100 text-gray-700";
}

const form = reactive(props.followupForm);
</script>

<template>
  <Card v-if="!readonly" padding="lg">
    <div class="followup-form">
      <h3 class="followup-form__title">
        {{ t("leads.detail.followupsTab.formTitle") }}
      </h3>
      <form
        class="followup-form__body"
        @submit.prevent="$emit('submitFollowup')"
      >
        <div class="followup-form__row">
          <div class="followup-form__field">
            <label class="followup-form__label" for="fuChannel">
              {{ t("leads.detail.followupsTab.channel") }}
              <span class="followup-form__required">*</span>
            </label>
            <select
              id="fuChannel"
              v-model="form.channel"
              class="followup-form__input followup-form__select"
            >
              <option value="" disabled>
                {{ t("leads.detail.followupsTab.channelPlaceholder") }}
              </option>
              <option v-for="ch in channels" :key="ch.value" :value="ch.value">
                {{ ch.label }}
              </option>
            </select>
          </div>
          <div class="followup-form__field">
            <label class="followup-form__label" for="fuNextFollowUp">
              {{ t("leads.detail.followupsTab.nextFollowUp") }}
            </label>
            <input
              id="fuNextFollowUp"
              v-model="form.nextFollowUp"
              type="datetime-local"
              class="followup-form__input"
            />
          </div>
        </div>
        <div class="followup-form__field">
          <label class="followup-form__label" for="fuSummary">
            {{ t("leads.detail.followupsTab.summary") }}
            <span class="followup-form__required">*</span>
          </label>
          <textarea
            id="fuSummary"
            v-model="form.summary"
            class="followup-form__input followup-form__textarea"
            rows="2"
            :placeholder="t('leads.detail.followupsTab.summaryPlaceholder')"
          />
        </div>
        <div class="followup-form__row">
          <div class="followup-form__field">
            <label class="followup-form__label" for="fuConclusion">
              {{ t("leads.detail.followupsTab.conclusion") }}
            </label>
            <input
              id="fuConclusion"
              v-model="form.conclusion"
              type="text"
              class="followup-form__input"
              :placeholder="
                t('leads.detail.followupsTab.conclusionPlaceholder')
              "
            />
          </div>
          <div class="followup-form__field">
            <label class="followup-form__label" for="fuNextAction">
              {{ t("leads.detail.followupsTab.nextAction") }}
            </label>
            <input
              id="fuNextAction"
              v-model="form.nextAction"
              type="text"
              class="followup-form__input"
              :placeholder="
                t('leads.detail.followupsTab.nextActionPlaceholder')
              "
            />
          </div>
        </div>
        <div class="followup-form__actions">
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="!canSubmitFollowup"
            @click="$emit('submitFollowup')"
          >
            {{ t("leads.detail.followupsTab.submit") }}
          </Button>
        </div>
      </form>
    </div>
  </Card>

  <div v-if="isEmpty" class="followup-empty">
    <div class="followup-empty__icon" aria-hidden="true">
      <svg
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    </div>
    <p class="followup-empty__title">
      {{ t("leads.detail.followupsTab.emptyTitle") }}
    </p>
    <p class="followup-empty__desc">
      {{ t("leads.detail.followupsTab.emptyDesc") }}
    </p>
  </div>

  <div v-else class="followup-timeline">
    <div
      v-for="(fu, idx) in followups"
      :key="idx"
      class="followup-timeline__item"
    >
      <div class="followup-timeline__dot" />
      <Card padding="md">
        <div class="followup-timeline__card">
          <div class="followup-timeline__content">
            <div class="followup-timeline__meta">
              <span
                :class="[
                  'followup-timeline__channel',
                  channelChipClass(fu.channel),
                ]"
              >
                {{ fu.channelLabel }}
              </span>
              <span class="followup-timeline__time">{{ fu.time }}</span>
              <span class="followup-timeline__operator"
                >· {{ fu.operator }}</span
              >
            </div>
            <p class="followup-timeline__summary">{{ fu.summary }}</p>
            <div
              v-if="fu.conclusion || fu.nextAction || fu.nextFollowUp"
              class="followup-timeline__details"
            >
              <div v-if="fu.conclusion">
                <span class="followup-timeline__detail-label">
                  {{ t("leads.detail.followupsTab.conclusionLabel") }}
                </span>
                {{ fu.conclusion }}
              </div>
              <div v-if="fu.nextAction">
                <span class="followup-timeline__detail-label">
                  {{ t("leads.detail.followupsTab.nextActionLabel") }}
                </span>
                {{ fu.nextAction }}
              </div>
              <div v-if="fu.nextFollowUp">
                <span class="followup-timeline__detail-label">
                  {{ t("leads.detail.followupsTab.nextFollowUpLabel") }}
                </span>
                {{ fu.nextFollowUp }}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.followup-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.followup-form__title {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
}

.followup-form__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.followup-form__row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 640px) {
  .followup-form__row {
    grid-template-columns: 1fr 1fr;
  }
}

.followup-form__label {
  display: block;
  margin-bottom: 4px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
}

.followup-form__required {
  color: var(--color-danger);
}

.followup-form__input {
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

.followup-form__input:focus {
  outline: none;
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 3px var(--color-primary-outline, rgba(0, 113, 227, 0.15));
}

.followup-form__select {
  appearance: none;
}

.followup-form__textarea {
  resize: vertical;
}

.followup-form__actions {
  display: flex;
  justify-content: flex-end;
}

/* ---- Empty ---- */

.followup-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 24px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  background: var(--color-bg-2);
}

.followup-empty__icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xl);
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-3);
}

.followup-empty__title {
  margin: 16px 0 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.followup-empty__desc {
  margin: 4px 0 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

/* ---- Timeline ---- */

.followup-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  padding-left: 24px;
}

.followup-timeline::before {
  content: "";
  position: absolute;
  left: 6px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--color-border-1);
  border-radius: 1px;
}

.followup-timeline__item {
  position: relative;
  padding-bottom: 16px;
}

.followup-timeline__item:last-child {
  padding-bottom: 0;
}

.followup-timeline__dot {
  position: absolute;
  left: -21px;
  top: 16px;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--color-primary-6);
  border: 2px solid var(--color-bg-1);
}

.followup-timeline__card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.followup-timeline__content {
  flex: 1;
  min-width: 0;
}

.followup-timeline__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.followup-timeline__channel {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.followup-timeline__time {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.followup-timeline__operator {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.followup-timeline__summary {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  line-height: 1.6;
}

.followup-timeline__details {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.followup-timeline__detail-label {
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
}
</style>
