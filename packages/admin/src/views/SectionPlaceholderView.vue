<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import Card from "../shared/ui/Card.vue";
import Chip from "../shared/ui/Chip.vue";
import PageHeader from "../shared/ui/PageHeader.vue";

type RouteMetaKey =
  | "leads"
  | "customers"
  | "cases"
  | "tasks"
  | "documents"
  | "billing"
  | "settings";
type RouteMetaGroup = "business" | "content" | "finance" | "system";

/**
 * 模块占位页，根据当前路由元信息展示待建设页面的上下文说明。
 */
const route = useRoute();
const { t } = useI18n();

const navKey = computed(
  () => (route.meta.navKey as RouteMetaKey | undefined) ?? "settings",
);
const groupKey = computed(
  () => (route.meta.groupKey as RouteMetaGroup | undefined) ?? "system",
);

const title = computed(() => t(`shell.nav.items.${navKey.value}`));
const groupLabel = computed(() => t(`shell.nav.groups.${groupKey.value}`));
const subtitle = computed(() =>
  t("sectionPlaceholder.subtitle", {
    section: title.value,
  }),
);
</script>

<template>
  <div class="section-placeholder-view">
    <PageHeader
      :title="title"
      :subtitle="subtitle"
      :breadcrumbs="[
        { label: t('shell.nav.items.dashboard'), href: '/' },
        { label: groupLabel },
        { label: title },
      ]"
    >
      <template #badge>
        <Chip tone="warning">{{ t("sectionPlaceholder.badge") }}</Chip>
      </template>
    </PageHeader>

    <Card :title="t('sectionPlaceholder.cardTitle')" padding="lg">
      <div class="placeholder-stack">
        <p class="placeholder-copy">
          {{ t("sectionPlaceholder.description", { section: title }) }}
        </p>
        <p class="placeholder-meta">
          {{ t("sectionPlaceholder.pathLabel") }}
          <code>{{ route.path }}</code>
        </p>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.section-placeholder-view {
  display: grid;
  gap: 24px;
}

.placeholder-stack {
  display: grid;
  gap: 12px;
}

.placeholder-copy,
.placeholder-meta {
  margin: 0;
  color: var(--color-text-2);
  line-height: 1.7;
}

.placeholder-meta code {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--color-bg-2);
  color: var(--color-text-1);
}
</style>
