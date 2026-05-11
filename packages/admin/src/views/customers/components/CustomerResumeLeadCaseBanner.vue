<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";

/**
 * 从线索「签约并开始建档」闸口跳入客户详情时展示的「返回线索继续建档」横幅。
 */
defineProps<{ visible: boolean }>();

const emit = defineEmits<{
  continue: [];
  dismiss: [];
}>();

const { t } = useI18n();
</script>

<template>
  <Card
    v-if="visible"
    padding="md"
    data-testid="resume-lead-case-create-banner"
  >
    <div class="resume-lead-case-banner">
      <p class="resume-lead-case-banner__text">
        {{ t("customers.detail.resumeLeadCaseCreate.banner") }}
      </p>
      <div class="resume-lead-case-banner__actions">
        <Button
          variant="filled"
          tone="primary"
          size="sm"
          @click="emit('continue')"
        >
          {{ t("customers.detail.resumeLeadCaseCreate.continue") }}
        </Button>
        <Button
          variant="ghost"
          tone="neutral"
          size="sm"
          html-type="button"
          @click="emit('dismiss')"
        >
          {{ t("customers.detail.resumeLeadCaseCreate.dismiss") }}
        </Button>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.resume-lead-case-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.resume-lead-case-banner__text {
  margin: 0;
  flex: 1;
  min-width: 220px;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
  line-height: var(--leading-sm);
}

.resume-lead-case-banner__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
