<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { techIdSuffixForOps } from "../../../shared/model/formatOperationalTechId";

/**
 * 校验 Tab 中提交包列表与补正卡片的技术主键展示：UUID 等长 ID 显示尾号并提供复制，短业务编号原样展示。
 */
const props = defineProps<{
  techId: string;
  /** 提交包列表行或补正卡片 */
  context: "submission" | "correction";
}>();

const { t } = useI18n();

const tailLabel = computed(() => techIdSuffixForOps(props.techId));

/**
 * 将完整技术主键写入剪贴板，便于与日志或接口排查对齐。
 */
function copyFullId() {
  void navigator.clipboard.writeText(props.techId);
}
</script>

<template>
  <div
    v-if="tailLabel"
    :class="[
      'vt__pkg-technical-ref',
      context === 'correction' ? 'vt__pkg-technical-ref--corr' : '',
    ]"
  >
    <span
      :class="
        context === 'submission'
          ? 'vt__pkg-technical-id'
          : 'vt__pkg-id vt__pkg-id--technical'
      "
      :title="techId"
      >{{
        t("cases.detail.validation.tab.submissionPackages.techIdSuffixLabel", {
          tail: tailLabel,
        })
      }}</span
    >
    <button type="button" class="vt__pkg-copy-tech-id" @click="copyFullId">
      {{ t("cases.detail.validation.tab.submissionPackages.copyFullTechId") }}
    </button>
  </div>
  <div
    v-else
    :class="context === 'submission' ? 'vt__pkg-technical-id' : 'vt__pkg-id'"
    :title="techId"
  >
    {{ techId }}
  </div>
</template>

<style scoped src="./CaseValidationPkgIds.css"></style>
