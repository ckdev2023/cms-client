<script setup lang="ts">
import AppShell from "./shell/AppShell.vue";
import UiButton from "./shared/ui/Button.vue";
import UiCard from "./shared/ui/Card.vue";
</script>

<template>
  <AppShell>
    <template #topbar>
      <div style="display: flex; align-items: center; gap: 12px">
        <div style="font-weight: 600; color: var(--color-text-1)">
          CMS Admin
        </div>
        <nav
          aria-label="顶部导航"
          style="display: flex; align-items: center; gap: 4px"
        >
          <RouterLink to="/" class="shell-link">首页</RouterLink>
          <RouterLink to="/about" class="shell-link">关于</RouterLink>
        </nav>
      </div>
      <UiButton type="primary">操作</UiButton>
    </template>

    <template #sidenav>
      <div style="display: flex; flex-direction: column; gap: 6px">
        <div
          style="font-size: 12px; color: var(--color-text-2); padding: 0 8px"
        >
          导航
        </div>
        <RouterLink to="/" class="shell-link">首页</RouterLink>
        <RouterLink to="/about" class="shell-link">关于</RouterLink>
      </div>
    </template>

    <UiCard title="内容区" :bordered="false">
      <RouterView />
      <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap">
        <UiButton type="default">默认</UiButton>
        <UiButton type="primary" status="danger">危险</UiButton>
      </div>
    </UiCard>
  </AppShell>
</template>
