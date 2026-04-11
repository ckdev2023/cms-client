# TDD最佳实践（Vue 3版）

## 核心理念

**先写测试，后写代码。**

```text
Red -> Green -> Refactor -> Repeat
```

---

## TDD循环

### Red

先写失败测试，描述用户行为，不描述实现细节。

```ts
it("点击重试后会重新加载数据", async () => {
  const wrapper = mount(PostListPage);

  await wrapper.find('[data-testid="retry"]').trigger("click");

  expect(loadPosts).toHaveBeenCalledTimes(1);
});
```

### Green

只写最少代码让测试通过，不顺手补做未要求功能。

### Refactor

重构命名、拆分组件、提炼 composable，但保持测试继续为绿。

---

## Vue 3 场景下的测试优先级

### P0：核心业务

- 页面是否正确渲染关键状态
- 关键按钮是否可操作
- 提交、保存、删除是否成功

### P1：状态与分支

- 权限控制
- 筛选条件
- 接口失败重试

### P2：辅助行为

- 埋点
- 轻量动效
- 非关键文案

---

## 推荐测试拆分

### 1. composable/store 单元测试

```ts
describe("usePostList", () => {
  it("加载成功后更新列表", async () => {
    const { posts, load } = usePostList();

    await load();

    expect(posts.value.length).toBeGreaterThan(0);
  });
});
```

### 2. 组件测试

```ts
it("empty 状态显示空态文案", () => {
  const wrapper = mount(PostList, {
    props: { posts: [] },
  });

  expect(wrapper.text()).toContain("暂无数据");
});
```

### 3. E2E 测试

```ts
test("用户可以完成新增帖子流程", async ({ page }) => {
  await page.goto("/posts");
  await page.getByRole("button", { name: "新建" }).click();
  await page.getByLabel("标题").fill("测试帖子");
  await page.getByRole("button", { name: "提交" }).click();
  await expect(page.getByText("创建成功")).toBeVisible();
});
```

---

## 常见误区

### 误区1：先把页面写完再补测试

这不是 TDD，这是事后补测试。

### 误区2：只测 happy path

至少要覆盖：

- loading
- empty
- error
- success

### 误区3：测试实现细节

优先测：

- 用户看到什么
- 用户能做什么
- 状态如何变化

不是：

- 某个内部方法有没有被调
- 某个响应式变量名是不是存在

---

## 提示词模板

```text
任务：用 TDD 实现【筛选面板】

要求：
1. 先写 Vitest + Vue Test Utils 测试
2. 覆盖打开、选择、重置、确认四个行为
3. 再实现 Vue 3 组件与 composable
4. 每次只完成一个验收标准
5. 不要修改测试来迎合实现
```

---

**记住：测试写的是行为契约，不是实现备忘录。**
