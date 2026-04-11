# Vue 3 标准代码参考

## 目标

建立一套适合 `Vue 3 + TypeScript + Pinia + Vue Router + Vitest` 的参考标准，避免 AI 盲目模仿项目里的历史代码。

---

## 参考优先级

### Level 1：官方文档

1. Vue 3 官方文档
2. Pinia 官方文档
3. Vue Router 官方文档
4. Vitest / Vue Test Utils 官方文档

### Level 2：项目内已验证模式

- 通过 Review 的组件
- 通过测试的 composable
- 稳定的 service 封装

### Level 3：历史代码

只能参考，不能照抄。

---

## 标准组件模板

```vue
<script setup lang="ts">
interface PostCardProps {
  title: string;
  description?: string;
  loading?: boolean;
}

const props = withDefaults(defineProps<PostCardProps>(), {
  description: "",
  loading: false,
});

const emit = defineEmits<{
  click: [];
}>();

const summary = computed(() => props.description || "暂无描述");
</script>

<template>
  <article class="post-card" @click="emit('click')">
    <h3>{{ props.title }}</h3>
    <p>{{ summary }}</p>
    <span v-if="props.loading">加载中...</span>
  </article>
</template>
```

标准要点：

- Props 类型明确
- 默认值明确
- Emits 类型明确
- 模板逻辑保持简单

---

## 标准 composable 模板

```ts
import { computed, ref } from "vue";
import { fetchPosts } from "../services/postService";

export function usePostList() {
  const loading = ref(false);
  const error = ref("");
  const posts = ref<PostItem[]>([]);

  const isEmpty = computed(() => !loading.value && posts.value.length === 0);

  async function load() {
    loading.value = true;
    error.value = "";

    try {
      posts.value = await fetchPosts();
    } catch (err) {
      error.value = "加载失败，请稍后重试";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    posts,
    isEmpty,
    load,
  };
}
```

---

## 标准 Pinia Store 模板

```ts
import { defineStore } from "pinia";
import { ref } from "vue";

export const usePostStore = defineStore("post", () => {
  const list = ref<PostItem[]>([]);
  const loading = ref(false);

  function setList(data: PostItem[]) {
    list.value = data;
  }

  return {
    list,
    loading,
    setList,
  };
});
```

要求：

- Store 只放共享状态
- 不把一次性局部状态抬成全局

---

## 标准 Service 模板

```ts
import { request } from "@/shared/request";

export interface PostItemDTO {
  id: string;
  title: string;
}

export async function fetchPosts(): Promise<PostItemDTO[]> {
  const response = await request.get<{ data: PostItemDTO[] }>("/posts");
  return response.data;
}
```

要求：

- 请求统一走基础封装
- 不在组件中直接拼 URL
- 映射逻辑统一在 service 处理

---

## 标准测试模板

```ts
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PostCard from "./PostCard.vue";

describe("PostCard", () => {
  it("展示标题", () => {
    const wrapper = mount(PostCard, {
      props: { title: "Hello" },
    });

    expect(wrapper.text()).toContain("Hello");
  });
});
```

---

## 检查清单

- [ ] 组件职责清晰
- [ ] Props / Emits 已类型化
- [ ] service 与视图分层明确
- [ ] loading / empty / error 状态完整
- [ ] 测试覆盖关键行为

---

**记住：优先参考官方与已验证模式，不要让历史代码决定新代码质量。**
