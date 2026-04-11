# Mock数据工厂（Vue 3版）

## 目标

用统一的工厂函数生成测试数据，避免每个测试手写一堆重复对象。

---

## 基础原则

1. 默认数据必须可直接使用
2. 允许按需覆盖字段
3. 数据结构尽量贴近真实接口
4. 不在测试里复制大段 JSON

---

## 示例

```ts
export interface PostItem {
  id: string;
  title: string;
  content: string;
  liked: boolean;
}

export function createPost(overrides: Partial<PostItem> = {}): PostItem {
  return {
    id: "post-1",
    title: "测试标题",
    content: "测试内容",
    liked: false,
    ...overrides,
  };
}

export function createPostList(count = 3): PostItem[] {
  return Array.from({ length: count }, (_, index) =>
    createPost({
      id: `post-${index + 1}`,
      title: `测试标题${index + 1}`,
    }),
  );
}
```

---

## 使用方式

```ts
it("渲染多条列表", () => {
  const wrapper = mount(PostList, {
    props: {
      posts: createPostList(5),
    },
  });

  expect(wrapper.findAll('[data-testid="post-item"]')).toHaveLength(5);
});
```

---

## 常见场景工厂

- `createUser()`
- `createPost()`
- `createComment()`
- `createApiSuccessResponse()`
- `createApiErrorResponse()`

---

## 反例

```ts
const posts = [
  {
    id: "1",
    title: "a",
    content: "b",
    liked: false,
  },
];
```

问题：

- 重复
- 难维护
- 不利于批量改结构

---

## 最佳实践

- 工厂文件集中放在 `tests/factories`
- 数据改结构时统一改工厂
- 用覆盖参数表达场景差异

---

**记住：测试想表达的是场景，不是手工拼对象。**
