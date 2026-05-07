<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Chip from "../../../shared/ui/Chip.vue";
import type { LeadBasicInfo } from "../types";
import { resolveGroupLabel } from "../../../shared/model/useGroupOptions";
import { resolveOwnerDisplayLabel } from "../../../shared/model/useOwnerOptions";
import { resolveTagTone } from "../model/leadTagTone";
import {
  resolveLeadBusinessTypeLabel,
  resolveLeadCreatedViaLabel,
  resolveLeadLanguageLabel,
  resolveLeadSourceLabel,
} from "../model/leadOptionLabels";

/** 基础信息 Tab：以只读模式展示线索的 11 个基础字段。 */
const props = defineProps<{
  info: LeadBasicInfo;
  readonly: boolean;
  ownerId?: string;
}>();

const { t, locale } = useI18n();

const groupDisplay = computed(() =>
  props.info.group
    ? resolveGroupLabel(props.info.group, t("shared.group.disabledSuffix"))
    : "—",
);

const ownerDisplay = computed(() =>
  resolveOwnerDisplayLabel(
    props.info.owner || props.ownerId || "",
    {
      unassigned: t("leads.list.ownerUnassigned"),
      unknown: t("leads.list.ownerUnknown"),
    },
    locale.value,
  ),
);

const sourceDisplay = computed(() =>
  resolveLeadSourceLabel(props.info.source, t),
);

const businessTypeDisplay = computed(() =>
  resolveLeadBusinessTypeLabel(props.info.businessType, t),
);

const languageDisplay = computed(() =>
  resolveLeadLanguageLabel(props.info.language, t),
);

const createdViaDisplay = computed(() =>
  resolveLeadCreatedViaLabel(props.info.createdVia, t),
);
</script>

<template>
  <Card padding="lg">
    <div class="info-tab">
      <div class="info-tab__header">
        <h3 class="info-tab__title">
          {{ t("leads.detail.infoTab.title") }}
        </h3>
      </div>

      <div class="info-tab__grid">
        <div class="info-tab__field">
          <dt class="info-tab__label">
            {{ t("leads.detail.infoTab.fields.id") }}
          </dt>
          <dd class="info-tab__value info-tab__value--mono" :title="info.id">
            {{ info.leadNo || info.id }}
          </dd>
        </div>
        <div class="info-tab__field">
          <dt class="info-tab__label">
            {{ t("leads.detail.infoTab.fields.name") }}
          </dt>
          <dd class="info-tab__value">{{ info.name }}</dd>
        </div>
        <div class="info-tab__field">
          <dt class="info-tab__label">
            {{ t("leads.detail.infoTab.fields.phone") }}
          </dt>
          <dd class="info-tab__value">{{ info.phone || "—" }}</dd>
        </div>
        <div class="info-tab__field">
          <dt class="info-tab__label">
            {{ t("leads.detail.infoTab.fields.email") }}
          </dt>
          <dd class="info-tab__value">{{ info.email || "—" }}</dd>
        </div>
        <div class="info-tab__field">
          <dt class="info-tab__label">
            {{ t("leads.detail.infoTab.fields.source") }}
          </dt>
          <dd class="info-tab__value">
            {{ sourceDisplay || "—" }}
            <span
              v-if="info.createdVia && info.createdVia !== info.source"
              class="info-tab__created-via"
              :title="info.createdVia"
              data-testid="lead-info-created-via"
            >
              （{{
                t("leads.detail.infoTab.createdViaLabel", {
                  via: createdViaDisplay,
                })
              }}）
            </span>
          </dd>
        </div>
        <div class="info-tab__field">
          <dt class="info-tab__label">
            {{ t("leads.detail.infoTab.fields.referrer") }}
          </dt>
          <dd class="info-tab__value">{{ info.referrer || "—" }}</dd>
        </div>
        <div class="info-tab__field">
          <dt class="info-tab__label">
            {{ t("leads.detail.infoTab.fields.businessType") }}
          </dt>
          <dd class="info-tab__value">{{ businessTypeDisplay || "—" }}</dd>
        </div>
        <div class="info-tab__field">
          <dt class="info-tab__label">
            {{ t("leads.detail.infoTab.fields.group") }}
          </dt>
          <dd class="info-tab__value">{{ groupDisplay }}</dd>
        </div>
        <div class="info-tab__field">
          <dt class="info-tab__label">
            {{ t("leads.detail.infoTab.fields.owner") }}
          </dt>
          <dd class="info-tab__value">{{ ownerDisplay }}</dd>
        </div>
        <div class="info-tab__field">
          <dt class="info-tab__label">
            {{ t("leads.detail.infoTab.fields.language") }}
          </dt>
          <dd class="info-tab__value">{{ languageDisplay || "—" }}</dd>
        </div>
        <div class="info-tab__field info-tab__field--full">
          <dt class="info-tab__label">
            {{ t("leads.detail.infoTab.fields.tags") }}
          </dt>
          <dd
            class="info-tab__value info-tab__value--tags"
            data-testid="lead-info-tags"
          >
            <template v-if="info.tags && info.tags.length > 0">
              <Chip
                v-for="tag in info.tags"
                :key="tag"
                variant="tag"
                size="micro"
                :tone="resolveTagTone(tag)"
                dot
              >
                {{ tag }}
              </Chip>
            </template>
            <span v-else>—</span>
          </dd>
        </div>
        <div class="info-tab__field info-tab__field--full">
          <dt class="info-tab__label">
            {{ t("leads.detail.infoTab.fields.note") }}
          </dt>
          <dd class="info-tab__value info-tab__value--note">
            {{ info.note || "—" }}
          </dd>
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.info-tab {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.info-tab__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.info-tab__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.info-tab__grid {
  margin-top: 20px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px 32px;
}

@media (min-width: 640px) {
  .info-tab__grid {
    grid-template-columns: 1fr 1fr;
  }
}

.info-tab__field--full {
  grid-column: 1 / -1;
}

.info-tab__label {
  display: block;
  margin: 0 0 2px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.02em;
  color: var(--color-text-3);
}

.info-tab__value {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.info-tab__value--mono {
  font-family: var(--font-mono, monospace);
  font-size: var(--font-size-xs);
}

.info-tab__value--tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.info-tab__value--note {
  line-height: var(--leading-relaxed);
}

.info-tab__created-via {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}
</style>
