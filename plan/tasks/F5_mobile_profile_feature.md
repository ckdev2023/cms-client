# F5: Mobile Profile Feature

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | F5 |
| Phase | F — Mobile 端业务 Feature |
| 前置依赖 | F1 (Auth)、D4a (AppUsers API) |
| 后续解锁 | 无 |
| 预估工时 | 0.5 天 |

## 目标

实现用户个人信息 + 语言偏好设置功能（对应 Prototype profile 页面）。

## 范围

### 需要创建的文件

```
packages/mobile/src/features/profile/
  model/
    useProfileViewModel.ts
    useProfileViewModel.test.tsx
  ui/
    ProfileScreen.tsx

packages/mobile/src/domain/profile/
  ProfileRepository.ts

packages/mobile/src/data/profile/
  ProfileApi.ts
  ProfileRepositoryImpl.ts
```

### 不可修改的目录

- `packages/server/`

## 设计

### Domain 层

```ts
export type ProfileRepository = {
  getProfile(): Promise<AppUser>;
  updateProfile(data: { name?: string; preferredLanguage?: string }): Promise<AppUser>;
  logout(): Promise<void>;
};
```

### UI

- 展示：姓名、邮箱/手机、偏好语言
- 可编辑：姓名、偏好语言（ja/zh/en 选择器）
- 登出按钮

### UI 参考

- `packages/prototype/src/pages/profile/` — 原型页面

## 实现规范

1. 语言偏好变更后影响消息展示语言
2. 登出：清除 Token + 跳转 Auth Stack
3. 调用 Server `PATCH /app-users/:id` 更新

## 测试要求

- 测试 ViewModel：mock ProfileRepository
- 覆盖加载 / 更新 / 登出

## DoD

- [ ] ProfileScreen 可渲染
- [ ] 个人信息展示正确
- [ ] 语言偏好可切换
- [ ] 登出流程正确
- [ ] ViewModel 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/mobile
npx jest --testPathPattern=profile
npm run guard
```
