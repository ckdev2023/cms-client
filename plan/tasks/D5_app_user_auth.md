# D5: AppUser Auth

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | D5 |
| Phase | D — Portal 域对象建模 |
| 前置依赖 | D4a (AppUsers)、A5 (Permissions — 参考已有 Auth 设计) |
| 后续解锁 | Phase F (Mobile Auth Feature) |
| 预估工时 | 1 天 |

## 目标

为用户端 AppUser 建立独立登录/注册逻辑 + Auth Guard，与后台 User 体系分离。

## 范围

### 需要创建的文件

- `packages/server/src/modules/portal/auth/appUserAuth.controller.ts`
- `packages/server/src/modules/portal/auth/appUserAuth.service.ts`
- `packages/server/src/modules/portal/auth/appUserAuth.guard.ts`
- `packages/server/src/modules/portal/auth/appUserAuth.service.test.ts`
- `packages/server/src/modules/portal/auth/appUserAuth.guard.test.ts`

### 需要修改的文件

- `packages/server/src/app.module.ts` — 注册 Portal Auth

### 不可修改的目录

- `packages/server/src/modules/core/auth/` — 后台 Auth 不变
- `packages/mobile/`

## 设计

### 认证方式

| 阶段 | 方式 | 说明 |
|---|---|---|
| MVP | 邮箱/手机 + 验证码 | 简单、无密码 |
| 后续 | OAuth / LINE Login | 日本市场适配 |

### MVP 实现

```
1. POST /app-auth/request-code  → { email | phone }
   - 查找或创建 AppUser
   - 生成 6 位验证码 → 存 Redis（TTL 5min）
   - 入队 notification_job 发送验证码
   - 返回 { ok: true }

2. POST /app-auth/verify-code   → { email | phone, code }
   - 校验 Redis 中验证码
   - 签发 JWT（payload: { appUserId, type: "app_user" }）
   - 返回 { token, appUser }

3. GET /app-auth/me              → 当前 AppUser 信息
```

### AppUser Auth Guard

```ts
- 检查 Authorization header 中 JWT
- 解析 payload.type === "app_user"
- 挂载 req.appUserContext = { appUserId }
- 与后台 AuthGuard 共存（按 token type 区分）
```

### RequestContext 扩展

```ts
// Portal 请求上下文
export type AppUserContext = {
  appUserId: string;
};
```

## 实现规范

1. 验证码存 Redis：key = `app_auth:code:{email|phone}`，value = code，TTL = 300s
2. JWT 签名用与后台相同的 secret（但 payload.type 不同）
3. Guard 逻辑：
   - 如 token payload.type === "app_user" → 走 AppUser Guard
   - 如 token payload.type === "user" → 走后台 AuthGuard
4. Portal controller 用装饰器标注需要 AppUser 认证

## 测试要求

- mock Redis / Pool
- 验证 request-code 存 Redis + 入队通知
- 验证 verify-code 校验正确
- 验证 JWT 签发 + 解析
- 验证 Guard 正确区分 AppUser / User

## DoD

- [ ] 3 个 Auth 端点可调通
- [ ] 验证码 Redis 存储 + 过期
- [ ] JWT 签发 + 解析
- [ ] AppUser Guard 可独立工作
- [ ] 与后台 Auth 共存不冲突
- [ ] 注册到 AppModule
- [ ] 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=appUserAuth
npm run guard
```
