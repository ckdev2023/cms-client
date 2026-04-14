<script setup lang="ts">
import { computed } from "vue";
import { RouterView, useRoute } from "vue-router";
import { useAdminSession } from "./auth/model/adminSession";
import { initOrgSettings } from "./shared/model/useOrgSettings";
import { SAMPLE_ORG_SETTINGS } from "./views/settings/fixtures";
import AppShell from "./shell/AppShell.vue";

/**
 * 后台应用根组件，按路由元信息在登录页与管理外壳之间切换布局。
 */
const route = useRoute();
const { currentUser } = useAdminSession();
const usesBlankLayout = computed(() => route.meta.layout === "blank");
const userInitials = computed(() => currentUser.value?.initials ?? "AD");

initOrgSettings({ initialStorageRoot: SAMPLE_ORG_SETTINGS.storageRoot });
</script>

<template>
  <RouterView v-if="usesBlankLayout" />
  <AppShell v-else :user-initials="userInitials" />
</template>
