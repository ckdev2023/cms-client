# 10 — Core vs Portal API/Guard 区分（B-007）

> 数据来源：`packages/server/src/modules/{core,portal}/**/@Controller`、`@UseGuards`、`@Public`、`@RequireRoles` 装饰器分布；`appUserAuth.guard.ts`；`app.module.ts`。
> 标注：**[H]** High / **[M]** Medium / **[L]** Low confidence。

## 1. 总体规模（事实）**[H]**

| 区域 | 控制器 | 服务 | 备注 |
|------|--------|------|------|
| `modules/core/**` | 31 | ~30 | 后台（admin）API 主区 |
| `modules/portal/**` | 7 | 7 | 客户端（C 端 app-user）API |

`@RequireRoles` 在 core 中出现 **154 次**：staff=85 / viewer=46 / manager=23（角色层级 viewer < staff < manager；高包含低，详见 OQ-26 中的 `roles.ts`）。**[H]**

## 2. 路径前缀分布（事实）**[H]**

### 2.1 core（31 个控制器，路径前缀去重）

| 前缀 | Controller |
|------|-----------|
| `auth` | core/auth/auth.controller.ts |
| `admin/leads` | core/leads/leads.admin.controller.ts |
| `admin/conversations` | core/conversations/conversations.admin.controller.ts |
| `admin/conversations/:conversationId/messages` | core/conversations/messages.admin.controller.ts |
| `cases` / `case-parties` / `customers` / `companies` / `contact-persons` / `groups` / `organizations` / `tasks` / `dashboard` / `search` / `submission-packages` / `validation-runs` / `review-records` / `residence-periods` / `reminders` / `timeline` / `jobs` / `communication-logs` | 各自 controller（业务无前缀） |
| `billing-plans` / `billing-collections` / `billing-summary` / `payment-records` | 4 个 billing 切片 |
| `document-items` / `document-files` / `document-assets` / `document-requirement-file-refs` / `generated-documents` | 5 个 documents 切片 |

### 2.2 portal（7 个控制器）

| 前缀 | Controller |
|------|-----------|
| `app-auth` | portal/auth/appUserAuth.controller.ts |
| `app-users` | portal/app-users/appUsers.controller.ts |
| `intake-forms` | portal/intake/intake.controller.ts |
| `user-documents` | portal/user-documents/userDocuments.controller.ts |
| `conversations` | portal/conversations/conversations.controller.ts |
| `messages` | portal/messages/messages.controller.ts |
| `leads` | portal/leads/leads.controller.ts |

## 3. 路径名空间冲突（关键事实）**[H]**

| 资源 | core 路径 | portal 路径 | 物理冲突 |
|------|-----------|-------------|----------|
| auth | `/auth` | `/app-auth` | 无 |
| leads | `/admin/leads` | `/leads` | 无（前缀分离） |
| conversations | `/admin/conversations` | `/conversations` | 无 |
| messages | `/admin/conversations/:id/messages` | `/messages` | 无 |
| documents | `/document-*`（5 切片） | `/user-documents` | 无 |
| intake | （由 customers/cases 服务承载） | `/intake-forms` | 无 |

**结论**：core 用 `admin/...` 前缀（仅 leads/conversations/messages 三类）或独立资源名空间避开 portal；portal 用扁平资源名。**没有运行时路径冲突**。 **[H]**

但**资源命名重叠**：`leads` / `conversations` / `messages` 在两侧都存在，命名上必须靠 `admin/` 前缀区分，是脆弱的约定（见 OQ-25）。 **[M]**

## 4. 双 Guard 体系（事实）**[H]**

### 4.1 全局 AuthGuard（core 默认）

- `app.module.ts` 注册 `APP_GUARD = AuthGuard`，所有路由默认要求 admin JWT + 租户上下文 + 可选 `@RequireRoles`。
- `@Public()` 装饰器写入 metadata `auth.isPublic = true`，AuthGuard 据此放行（不挂载 `requestContext`）。
- core 中 `@Public()` 仅出现于 `auth.controller.ts`（login / refresh 端点），其余 31 个控制器全部走 admin JWT。

### 4.2 AppUserAuthGuard（portal 局部）

`appUserAuth.guard.ts` 关键逻辑（`canActivate`）：

1. 若 `req.requestContext` 已存在（说明全局 AuthGuard 已通过 = admin JWT），**直接返回 true**（短路）。
2. 否则解析 `Authorization: Bearer <token>`，调 `verifyAppUserJwt`，挂载 `req.appUserContext = { appUserId }`。

**意义**：AppUserAuthGuard **不是** AuthGuard 的替代——它是"AuthGuard 失败/被 @Public 跳过后的备选鉴权"。 **[H]**

### 4.3 portal 端点的"双装饰器"模式

portal 控制器的每个方法几乎都写：
```ts
@Public()                      // 让全局 AuthGuard 放行（不要求 admin JWT）
@UseGuards(AppUserAuthGuard)   // 但要求 app-user JWT
```

观测分布（来自方法级 grep）：

| Controller | `@Public + @UseGuards(AppUserAuthGuard)` 端点数 | `@Public` 单独（完全公开） | `@RequireRoles(...)`（admin） |
|------------|-----------------------------------------------|---------------------------|-------------------------------|
| `app-auth` | 1（refresh） | 3（login / register / verify） | 0 |
| `app-users` | 2 | 1（注册） | 0 |
| `conversations` | 4 | 0 | 0 |
| `intake-forms` | 5 | 0 | 0 |
| `leads` | 4（CRUD：app-user 视角） | 0 | **2**（assign / convert：admin 视角） |
| `messages` | 3 | 0 | 0 |
| `user-documents` | 5 | 0 | 0 |

## 5. portal/leads 是"双租户混合控制器"（重要发现）**[H]**

`portal/leads/leads.controller.ts` 是唯一一个**同时服务两类调用者**的控制器：

- `POST /leads` / `GET /leads` / `GET /leads/:id` / `PATCH /leads/:id` → `@Public + @UseGuards(AppUserAuthGuard)`，C 端用户操作自己的 lead
- `POST /leads/:id/assign` / `POST /leads/:id/convert` → `@RequireRoles("staff")`，后台员工分配 / 转化

更进一步：`GET /leads` 方法体内会读 `req.requestContext`（admin 已通过的痕迹），若存在则**改走 admin 服务返回全列表**：

```ts
@Public()
@UseGuards(AppUserAuthGuard)
@Get()
async list(@Req() req, @Query() query) {
  const adminCtx = req.requestContext;
  if (adminCtx) return this.leadsAdminService.list(adminCtx, ...);  // admin 路径
  // else: app-user 路径，仅返回本人 lead
}
```

**机制**：admin JWT 能通过全局 AuthGuard 挂载 `requestContext` → AppUserAuthGuard 在第 1 步短路 → 控制器据此分流到 `leadsAdminService`。

**风险**：
- 单端点双语义，权限审计与 OpenAPI 规格难以表达。 **[H]**
- 测试矩阵需覆盖"admin 调 portal 路径"场景（`leads.admin.security.test.ts` 是相关线索；待 backlog 验证）。 **[M]**

## 6. RBAC（@RequireRoles）分布 **[H]**

- 所有 31 个 core controller **均** 至少使用一处 `@RequireRoles`（无遗漏）。
- 频次：staff(85) > viewer(46) > manager(23)，符合"读 < 写 < 管理"的金字塔。
- portal 中仅 `leads.controller.ts` 使用 `@RequireRoles("staff")`（assign / convert 两端点）。
- portal 其余方法**不使用** `@RequireRoles` —— 因为 `@Public` 已绕过 AuthGuard，`@RequireRoles` 元数据不会被读取。 **[H]**
- 角色层级判定逻辑在 `core/auth/roles.ts`（`hasRequiredRole`），由 `roles.test.ts` 单测覆盖。 **[H]**

## 7. 装配协作（来自 `app.module.ts`）**[H]**

- portal 7 控制器、7 服务 + `AppUserAuthGuard` **全部注册在唯一的 `AppModule`**（无独立 NestModule 隔离），与 core 31 控制器扁平共存（参 `05-server-module-grouping.md`）。
- `AppUserAuthGuard` 作为常规 `Provider` 注册（不是 `APP_GUARD`），仅通过 `@UseGuards` 在端点级生效。

## 8. 风险摘要 **[H]**

- **R1 / `@Public` + `@UseGuards` 必须成对**：portal 任一方法漏写 `@Public`，全局 AuthGuard 会先于 AppUserAuthGuard 拦截 → 401。漏写 `@UseGuards`，则端点完全公开。**这两个装饰器没有静态对称性检查**。 **[H]** → OQ-39。
- **R2 / 双语义端点（portal/leads）**：admin 借 portal 路径返回管理员视图，文档与 OpenAPI 难以表达；客户端代码生成器会生成错误类型。 **[H]** → OQ-40。
- **R3 / 命名重叠**：core 与 portal 共享 `leads`/`conversations`/`messages` 资源词，仅靠 `admin/...` 前缀区分；新增控制器时容易遗漏前缀。 **[M]** → 已入 OQ-25。
- **R4 / portal 子域无独立 Guard 默认**：若未来加新 portal controller 而忘了 `@UseGuards(AppUserAuthGuard)`，端点完全无认证（`@Public` 单独使用即公开）。 **[H]** → OQ-41。
- **R5 / portal 控制器无独立 NestModule**：拆分服务 / 边界变更代价集中在 `app.module.ts` 一个文件。 **[M]**（已入 §5 / 03-dependency-graph）。

## 9. 未确认 / 待 backlog 验证 **[L]**

- `leads.admin.security.test.ts` 是否覆盖了"admin 走 portal/leads 路径"的全部权限场景？
- `app-auth/refresh` 用 `@Public + @UseGuards(AppUserAuthGuard)` 还是仅 `@Public`？（推测前者，需阅读源码确认）
- portal 控制器是否有"既无 @Public 又无 @UseGuards" 的"漏网"端点？建议加自动化 lint / test guard。
