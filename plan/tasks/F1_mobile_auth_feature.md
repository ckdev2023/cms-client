# F1: Mobile Auth Feature

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | F1 |
| Phase | F — Mobile 端业务 Feature |
| 前置依赖 | D5 (AppUser Auth API) |
| 后续解锁 | F2-F6 (所有 Mobile Feature 依赖登录) |
| 预估工时 | 1-2 天 |

## 目标

实现 Mobile 端登录/注册功能，对接 Server AppUser Auth API。

## 范围

### 需要创建的文件

```
packages/mobile/src/features/auth/
  model/
    useLoginViewModel.ts
    useLoginViewModel.test.tsx
  ui/
    LoginScreen.tsx
    VerifyCodeScreen.tsx

packages/mobile/src/domain/auth/
  AuthRepository.ts

packages/mobile/src/data/auth/
  AuthApi.ts
  AuthRepositoryImpl.ts
```

### 需要修改的文件

- `packages/mobile/src/app/container/` — 注册 AuthRepository
- `packages/mobile/src/app/navigation/` — 添加 Auth Stack

### 不可修改的目录

- `packages/server/`

## 设计

### Domain 层

```ts
// AuthRepository.ts
export type AuthRepository = {
  requestCode(contact: string): Promise<void>;
  verifyCode(contact: string, code: string): Promise<{ token: string }>;
  getMe(): Promise<AppUser>;
};
```

### Data 层

```ts
// AuthApi.ts — 调用 Server D5 的 3 个端点
POST /app-auth/request-code
POST /app-auth/verify-code
GET  /app-auth/me
```

### Model 层

```ts
// useLoginViewModel.ts
type LoginViewState =
  | { status: "idle" }
  | { status: "requesting_code" }
  | { status: "code_sent" }
  | { status: "verifying" }
  | { status: "success"; token: string }
  | { status: "error"; error: AppError };
```

### UI 层

- LoginScreen：输入邮箱/手机 → 发送验证码
- VerifyCodeScreen：输入验证码 → 登录

## 实现规范

1. 遵循现有 `useHomeViewModel` 模式（联合类型状态机 + useAppContainer）
2. Token 存储到 `infra/storage`（AsyncStorage / SecureStore）
3. 登录成功后自动跳转主页
4. 未登录时展示 Auth Stack

## 测试要求

- 测试 useLoginViewModel：mock AuthRepository
- 覆盖状态流转：idle → requesting_code → code_sent → verifying → success
- 覆盖错误场景
- 不发真实网络请求

## DoD

- [ ] LoginScreen + VerifyCodeScreen 可渲染
- [ ] 登录流程跑通（mock API）
- [ ] Token 正确存储
- [ ] Auth Stack 导航正确
- [ ] 单测覆盖 ViewModel
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/mobile
npx jest --testPathPattern=useLoginViewModel
npm run guard
```
