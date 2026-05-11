<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";

/**
 * 从案件新建向导进入客户详情时展示的「返回建案向导」横幅。
 */
defineProps<{ visible: boolean }>();

const emit = defineEmits<{
  continue: [];
  dismiss: [];
}>();

const { t } = useI18n();
</script>

<template>
  <Card v-if="visible" padding="md" data-testid="resume-case-create-banner">
    <div class="resume-case-banner">
      <p class="resume-case-banner__text">
        {{ t("customers.detail.resumeCaseCreate.banner") }}
      </p>
      <div class="resume-case-banner__actions">
        <Button
          variant="filled"
          tone="primary"
          size="sm"
          @click="emit('continue')"
        >
          {{ t("customers.detail.resumeCaseCreate.continue") }}
        </Button>
        <Button
          variant="ghost"
          tone="neutral"
          size="sm"
          html-type="button"
          @click="emit('dismiss')"
        >
          {{ t("customers.detail.resumeCaseCreate.dismiss") }}
        </Button>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.resume-case-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.resume-case-banner__text {
  margin: 0;
  flex: 1;
  min-width: 220px;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
  line-height: var(--leading-sm);
}

.resume-case-banner__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
