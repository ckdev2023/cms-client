# AI开发完整流程（Vue 3版）

## 核心理念

**需求 -> 测试 -> 实现 -> 门禁 -> 提交**

```text
每个需求都要有验收标准
每个验收标准都要有可执行验证
验证不通过，不提交
```

---

## 开发流程（5步）

### Step 1：理解需求

必读信息：

1. 页面/组件需求说明
2. 交互流程或原型图
3. API 契约或 Mock 数据
4. UI 设计稿与设计 Token

检查清单：

- [ ] 明确用户目标和边界条件
- [ ] 拆出 Given-When-Then 验收标准
- [ ] 明确页面状态：loading、empty、error、success
- [ ] 明确接口输入输出和失败场景

---

### Step 2：先写测试

推荐工具：

- 单元测试：`Vitest`
- 组件测试：`@vue/test-utils`
- 接口模拟：`msw`
- E2E：`Playwright`

示例：

```ts
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PostList from "./PostList.vue";

describe("PostList", () => {
  it("AC1: 有数据时渲染列表", () => {
    const wrapper = mount(PostList, {
      props: {
        posts: [{ id: "1", title: "Hello" }],
      },
    });

    expect(wrapper.text()).toContain("Hello");
  });
});
```

运行方式：

```bash
pnpm vitest
pnpm vitest run src/modules/post/__tests__/PostList.spec.ts
pnpm playwright test
```

---

### Step 3：实现功能

实现原则：

1. 页面只负责展示和交互编排
2. 业务逻辑放到 `composables` / `stores`
3. 数据请求放到 `services`
4. 状态要显式表达，不要靠隐式分支

推荐目录：

```text
src/
  modules/post/
    components/
    composables/
    services/
    stores/
    types/
```

---

### Step 4：通过门禁

提交前至少运行：

```bash
pnpm typecheck
pnpm lint
pnpm format
pnpm test
pnpm build
```

人工检查：

- [ ] 亮色/暗色模式
- [ ] 空数据/长文本
- [ ] 网络失败提示
- [ ] 移动端/桌面端布局

---

### Step 5：提交代码

```bash
git add .
git commit -m "feat(post): implement post list page"
```

提交要求：

- 提交信息符合规范
- 测试已通过
- 类型检查已通过
- 无明显 UI 偏差

---

## Vue 3 实施标准

### 页面组件

- 用 `script setup + TypeScript`
- Props / Emits 必须显式声明
- 复杂计算放 `computed`
- 副作用放 `watch` / `watchEffect`

### 状态管理

- 简单页面状态优先 `composable`
- 跨页面共享状态再用 `Pinia`
- 不要把纯展示状态塞进全局 Store

### 数据请求

- 统一封装 `request` 层
- 统一处理超时、鉴权、错误映射
- 组件中不要直接写裸 `fetch`

---

## AI提示词模板

```text
任务：实现【帖子列表】页面

技术栈：
- Vue 3
- TypeScript
- Pinia
- Vue Router
- Vitest
- Vue Test Utils

要求：
1. 先写组件测试，覆盖 loading / empty / success / error
2. 再实现页面与 composable
3. 接口请求放到 service 层
4. 通过 pnpm typecheck、pnpm lint、pnpm test、pnpm build
5. 不要过度设计，只实现当前验收标准
```

---

**记住：先验证，再实现；先局部通过，再整体提交。**
