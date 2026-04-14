<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import type { LeadDetail, HeaderButtonStates, LeadStatus } from "../types";
import { getLeadStatusLabel } from "../types";

/** 线索详情页头部：面包屑返回、头像、线索名称、状态 badge、属性 chip 与操作按钮区。 */
defineProps<{
  lead: LeadDetail;
  avatarInitials: string;
  buttonStates: HeaderButtonStates;
}>();

defineEmits<{
  convertCustomer: [];
  convertCase: [];
  markLost: [];
  editInfo: [];
  changeStatus: [];
}>();

const { t } = useI18n();

/**
 * 根据线索状态返回 Chip 色调。
 *
 * @param status 线索状态值
 * @returns Chip 色调
 */
function statusTone(
  status: LeadStatus,
): "neutral" | "primary" | "success" | "warning" | "danger" {
  switch (status) {
    case "new":
      return "warning";
    case "following":
      return "primary";
    case "pending_sign":
      return "primary";
    case "signed":
      return "success";
    case "converted_case":
      return "success";
    case "lost":
      return "neutral";
    default:
      return "neutral";
  }
}
</script>

<template>
  <section class="detail-header">
    <div class="detail-header__top">
      <nav class="detail-header__breadcrumb" aria-label="パンくずリスト">
        <a href="#/leads" class="detail-header__back-link">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M15 19l-7-7 7-7" />
          </svg>
          {{ t("leads.detail.breadcrumbParent") }}
        </a>
        <span class="detail-header__sep" aria-hidden="true">/</span>
        <span class="detail-header__crumb-current" aria-current="page">
          {{ lead.name }}
        </span>
      </nav>
      <div class="detail-header__actions">
        <Button
          v-if="
            buttonStates.editInfo === 'enabled' ||
            buttonStates.editInfo === 'highlighted'
          "
          size="sm"
          @click="$emit('editInfo')"
        >
          {{ t("leads.detail.actions.editInfo") }}
        </Button>
        <Button
          v-if="buttonStates.changeStatus === 'enabled'"
          size="sm"
          @click="$emit('changeStatus')"
        >
          {{ t("leads.detail.actions.changeStatus") }}
        </Button>
        <Button
          v-if="buttonStates.markLost === 'enabled'"
          size="sm"
          @click="$emit('markLost')"
        >
          {{ t("leads.detail.actions.markLost") }}
        </Button>
        <Button
          v-if="buttonStates.convertCustomer === 'enabled'"
          size="sm"
          @click="$emit('convertCustomer')"
        >
          {{ t("leads.detail.actions.convertCustomer") }}
        </Button>
        <Button
          v-if="buttonStates.convertCustomer === 'highlighted'"
          variant="filled"
          tone="primary"
          size="sm"
          @click="$emit('convertCustomer')"
        >
          {{ t("leads.detail.actions.convertCustomer") }}
        </Button>
        <Button
          v-if="buttonStates.convertCustomer === 'view-customer'"
          size="sm"
          @click="$emit('convertCustomer')"
        >
          {{ t("leads.detail.actions.viewCustomer") }}
        </Button>
        <Button
          v-if="buttonStates.convertCase === 'enabled'"
          variant="filled"
          tone="primary"
          size="sm"
          @click="$emit('convertCase')"
        >
          {{ t("leads.detail.actions.convertCase") }}
        </Button>
        <Button
          v-if="buttonStates.convertCase === 'highlighted'"
          variant="filled"
          tone="primary"
          size="sm"
          @click="$emit('convertCase')"
        >
          {{ t("leads.detail.actions.convertCase") }}
        </Button>
        <Button
          v-if="buttonStates.convertCase === 'view-case'"
          size="sm"
          @click="$emit('convertCase')"
        >
          {{ t("leads.detail.actions.viewCase") }}
        </Button>
      </div>
    </div>

    <div class="detail-header__identity">
      <div
        :class="['detail-header__avatar', lead.ownerAvatarClass]"
        aria-hidden="true"
      >
        {{ avatarInitials }}
      </div>
      <div class="detail-header__info">
        <h1 class="detail-header__name">
          {{ lead.name }}
          <Chip :tone="statusTone(lead.status)" size="sm">
            {{ getLeadStatusLabel(lead.status) }}
          </Chip>
        </h1>

        <div class="detail-header__chips">
          <Chip size="sm">
            {{ t("leads.detail.header.id") }}
            <strong>{{ lead.id }}</strong>
          </Chip>
          <Chip size="sm">
            {{ t("leads.detail.header.owner") }}
            <strong>{{ lead.ownerLabel }}</strong>
          </Chip>
          <Chip size="sm">
            {{ t("leads.detail.header.group") }}
            <strong>{{ lead.groupLabel }}</strong>
          </Chip>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.detail-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-header__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-header__breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.detail-header__back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-primary-6);
  text-decoration: none;
  transition: color 0.15s;
}

.detail-header__back-link:hover {
  text-decoration: underline;
}

.detail-header__sep {
  color: var(--color-text-3);
}

.detail-header__crumb-current {
  color: var(--color-text-1);
  font-weight: var(--font-weight-bold);
}

.detail-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.detail-header__identity {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.detail-header__avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-black);
  font-size: var(--font-size-lg);
  flex-shrink: 0;
  border: 1px solid var(--color-border-1);
}

.detail-header__info {
  min-width: 0;
  flex: 1;
}

.detail-header__name {
  margin: 0;
  font-size: 24px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  letter-spacing: var(--letter-spacing-tight);
  line-height: 1.3;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-header__chips {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.detail-header__chips strong {
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
}
</style>
