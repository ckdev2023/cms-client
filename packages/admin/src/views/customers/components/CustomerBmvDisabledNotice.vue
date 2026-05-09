<script setup lang="ts">
import { useI18n } from "vue-i18n";

/**
 * 经管签 (BMV) 客户但当前租户 feature flag 未启用时显示的降级提示卡片。
 * 替代直接静默隐藏 `CustomerBmvIntakeCard` 的旧行为，避免「按钮 disabled
 * + 无入口」的死锁体验。
 */
defineProps<{ customerId?: string }>();

const { t } = useI18n();
</script>

<template>
  <section
    class="basic-info__bmv-disabled-notice"
    role="status"
    aria-live="polite"
    :aria-label="t('customers.detail.bmvIntake.disabledNotice.ariaLabel')"
  >
    <div class="basic-info__bmv-disabled-notice-icon" aria-hidden="true">!</div>
    <div class="basic-info__bmv-disabled-notice-body">
      <h4 class="basic-info__bmv-disabled-notice-title">
        {{ t("customers.detail.bmvIntake.disabledNotice.title") }}
      </h4>
      <p class="basic-info__bmv-disabled-notice-description">
        {{ t("customers.detail.bmvIntake.disabledNotice.description") }}
      </p>
      <p class="basic-info__bmv-disabled-notice-hint">
        {{ t("customers.detail.bmvIntake.disabledNotice.hint") }}
      </p>
    </div>
  </section>
</template>
