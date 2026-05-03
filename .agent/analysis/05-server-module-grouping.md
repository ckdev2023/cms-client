# 05 — Server Module Grouping (B-003)

> 范围：`packages/server/src/app.module.ts`（root NestModule）+ 所有 controller / service。
> 来源：直接 grep `@Controller(...)`、`@RequireRoles(...)`、`@Public()`、`@UseGuards(...)`；交叉读 `auth.guard.ts` / `appUserAuth.guard.ts`。
> 标注：**[H]** High / **[M]** Medium / **[L]** Low confidence。

## 0. 装配总览（`app.module.ts`）

- Controller 总数：**40**（41 装配项中 `HealthController` 是 1 个） **[H]**
- Service / Provider 总数：**~37 个 service** + 5 个基础 provider（`Pool`、`Reflector`、`REDIS_CLIENT`、`STORAGE_ADAPTER`、`TEMPLATES_RESOLVER`） **[H]**
- 全局 Guard：`AuthGuard`（`APP_GUARD`） **[H]**
- 全局 Interceptor：`RequestContextInterceptor`（`APP_INTERCEPTOR`） **[H]**
- 单 root module（无 sub-`@Module()`） **[H]**
- 同时存在独立入口 `worker.ts`，与 `app.module.ts` 平行装配（fan-out=15，见 03 文档） **[M]**

## 1. 鉴权两套体系

| 体系 | 守门 | 作用域 | 触发方式 |
|------|------|--------|----------|
| 后台 / 事务所员工 | `AuthGuard`（`APP_GUARD` 全局） | `core/*` 所有 controller 默认开启 | 用 `@Public()` 旁路；用 `@RequireRoles(role)` 做 RBAC（manager > staff > viewer） **[H]** |
| 申请人 / C 端 | `AppUserAuthGuard`（**逐方法** `@UseGuards(...)`） | `portal/*` 部分接口 | 必须先 `@Public()` 旁路全局 `AuthGuard`，再 `@UseGuards(AppUserAuthGuard)`；解析 JWT type=`app_user` **[H]** |

> 因此每一个 portal 端点形如 `@Public() @UseGuards(AppUserAuthGuard) @Get(...)`。这是事实模式，不是异常。 **[H]**

## 2. 控制器路径前缀清单（40 个）

> 来自 grep `@Controller(...)` 一致结果。每条标注归类与守门策略。

### 2.1 core / 后台事务所域（用 `AuthGuard` + `@RequireRoles`）

| Controller | 路径前缀 | 主要服务 | 备注 |
|------------|----------|----------|------|
| AuthController | `auth` | AuthService | `login` 用 `@Public()`；`whoami` 等用 `@RequireRoles("manager")` **[H]** |
| TimelineController | `timeline` | TimelineService | |
| TemplatesController | `templates` | TemplatesService | 模板（被 cases 通过 `TEMPLATES_RESOLVER` 注入） **[H]** |
| FeatureFlagsController | `feature-flags` | FeatureFlagsService | |
| JobsController | `jobs` | JobsService | |
| CompaniesController | `companies` | CompaniesService | |
| ContactPersonsController | `contact-persons` | ContactPersonsService | |
| DashboardController | `dashboard` | DashboardService | |
| GroupsController | `groups` | GroupsService | 案件 / 客户分组 |
| OrganizationsController | `organizations` | OrganizationsService | |
| CustomersController | `customers` | CustomersService | |
| CasesController | `cases` | CasesService | 11 个 `@RequireRoles` 端点（grep 结果） **[H]** |
| BillingCollectionsController | `billing-collections` | BillingCollectionsService | |
| BillingPlansController | `billing-plans` | BillingPlansService | |
| BillingSummaryController | `billing-summary` | BillingSummaryService | |
| PaymentRecordsController | `payment-records` | PaymentRecordsService | |
| CasePartiesController | `case-parties` | CasePartiesService | |
| DocumentAssetsController | `document-assets` | DocumentAssetsService | |
| DocumentFilesController | `document-files` | DocumentFilesService | |
| DocumentItemsController | `document-items` | DocumentItemsService | |
| DocumentRequirementFileRefsController | `document-requirement-file-refs` | … | |
| RemindersController | `reminders` | RemindersService | |
| ResidencePeriodsController | `residence-periods` | ResidencePeriodsService | |
| ValidationRunsController | `validation-runs` | ValidationRunsService | |
| GeneratedDocumentsController | `generated-documents` | GeneratedDocumentsService | |
| ReviewRecordsController | `review-records` | ReviewRecordsService | |
| SubmissionPackagesController | `submission-packages` | SubmissionPackagesService | |
| TasksController | `tasks` | TasksService | |
| CommunicationLogsController | `communication-logs` | CommunicationLogsService | |
| SearchController | `search` | SearchService | |

子合计：**30 个 core controller**，全部走全局 `AuthGuard` + RBAC。 **[H]**

### 2.2 core / 后台对 portal 数据的 admin 镜像（前缀 `admin/...`）

| Controller | 路径 | 服务 |
|------------|------|------|
| LeadsAdminController | `admin/leads` | LeadsAdminService |
| ConversationsAdminController | `admin/conversations` | ConversationsAdminService |
| MessagesAdminController | `admin/conversations/:conversationId/messages` | MessagesAdminService |

子合计：**3 个 admin 镜像** —— 这些都属于"后台看 C 端数据"，与 `portal/*` 是两套。 **[H]**

### 2.3 portal / 申请人侧（混合 `@Public()` + `@UseGuards(AppUserAuthGuard)`）

| Controller | 路径前缀 | 服务 | 备注 |
|------------|----------|------|------|
| AppUsersController | `app-users` | AppUsersService | 注册 / 个人资料 |
| AppUserAuthController | `app-auth` | AppUserAuthService | 申请人登录 / token / OTP |
| LeadsController | `leads` | LeadsService | （路径 `leads`，与 admin 镜像 `admin/leads` 区分） |
| ConversationsController | `conversations` | ConversationsService | |
| MessagesController | `messages` | MessagesService | |
| UserDocumentsController | `user-documents` | UserDocumentsService | |
| IntakeController | `intake-forms` | IntakeService | 在线问卷 / 案件创建门禁的源头 **[H]** |

子合计：**7 个 portal controller**。 **[H]**

### 2.4 横切 / 健康

| Controller | 路径 | 备注 |
|------------|------|------|
| HealthController | `health`（推测；未读 controller 文件） | **[M]** 路径未在 grep 中确认（grep 只匹配 modules/，HealthController 在 src/health 下） |

## 3. 装配清单 → 能力分组（基于路径与 service 名）

| 分组 | Controllers / Services | 行数总和（service） | 备注 |
|------|------------------------|---------------------|------|
| **Auth & Tenancy（核心）** | AuthController/Service, PermissionsService, RequestContextInterceptor, AuthGuard | ~ | 唯一全局 Guard 来源 **[H]** |
| **Cases & Workflow** | CasesController/Service, CasePartiesController/Service | 3456+416 | 单 service 3456 行（B-001） **[H]** |
| **Customers / Companies / Contacts** | Customers, Companies, ContactPersons, Groups | 493+334+327+449 | 客户主数据组 **[H]** |
| **Documents（4 子模块）** | DocumentItems, DocumentFiles, DocumentAssets, DocumentRequirementFileRefs, GeneratedDocuments | 479+497+ ?+353+490 | 文档处理是显著大组（5 个 service） **[H]** |
| **Billing（4 子模块）** | BillingCollections, BillingPlans, BillingSummary, PaymentRecords | ?+500+?+490 | billing 拆得相对细 **[H]** |
| **Submission / Validation / Review** | SubmissionPackagesService, ValidationRunsService, ReviewRecordsService | 931+382+? | 提交闭环 **[H]** |
| **Tasks / Reminders / Timeline** | TasksService, RemindersService, TimelineService | 500+406+? | 横切流程 **[H]** |
| **Residence Periods** | ResidencePeriodsService | 667 | 在留期间 **[H]** |
| **Communication Logs** | CommunicationLogsService | 375 | |
| **Dashboard / Search** | DashboardService, SearchService | 439+? | 读模型 **[H]** |
| **Portal（C 端）** | App-users, App-auth(+AppUserAuthGuard), Conversations, Messages, Intake, Leads(portal), UserDocuments | … | 7 controller + 同名 service **[H]** |
| **Admin mirror of portal** | LeadsAdmin, ConversationsAdmin, MessagesAdmin | 449 + ... | 后台读 C 端数据 **[H]** |
| **Templates / FeatureFlags / Jobs / Organizations** | TemplatesService(516), FeatureFlagsService, JobsService, OrganizationsService | … | 横切能力 **[H]** |
| **Custom（tenant-a）** | （未在 app.module 中装配） | — | 见 03 文档孤儿；可能未连线 **[M]** |
| **Health** | HealthController | — | **[H]** |

## 4. 中央依赖路径

- `AuthGuard` 注入 `Pool` + `Reflector`；通过 `@Public()`/`@RequireRoles()` 装饰判断 → **所有 core controller 隐式依赖** auth 元数据。 **[H]**
- `RequestContextInterceptor` 全局拦截，写 `req.requestContext`（基于 header 解析 + DB 查询）。 **[H]**
- `AppUserAuthGuard` 仅在 portal 端 `@UseGuards` 使用，不入全局。 **[H]**
- `TEMPLATES_RESOLVER` Symbol 由 app.module 用 `useExisting: TemplatesService` 别名提供 → `CasesService` 通过该 Symbol 注入 templates。 **[H]**
- `STORAGE_ADAPTER` Symbol：app.module factory 根据 env 选择 local / s3 实现；被 file/asset 类 service 注入。 **[M]**（factory 已读，注入侧待 backlog 量化）
- `REDIS_CLIENT` Symbol：app.module factory；被 jobs / queue 相关使用。 **[M]**

## 5. RBAC 角色分布（部分样本）

从 grep 提取的 `@RequireRoles` 用法分布（不完整，仅前 50 行命中）：
- `viewer`：读端点（list / get） — billingPlans, billingSummary, paymentRecords, caseParties, cases(get/list/aggregate), companies, contactPersons, communicationLogs(read), …
- `staff`：写端点（create / update / patch） — billingCollections, billingPlans, paymentRecords, caseParties, cases.create/update/transition, communicationLogs, companies, contactPersons, conversations.admin, …
- `manager`：高敏感操作（删除 / 撤销） — auth.whoami(?), billing payments, cases (1 个端点), companies(1), contactPersons(1)

> 完整 RBAC 矩阵需后续 backlog 任务整理（待添加 B-017）。 **[L]** 当前抽样基于 50 行命中，结论仅作"分布趋势"。

## 6. 服务体量分布（非测试源文件）

> 数据来自 `wc -l`，仅取 service/controller 非 test。

- 超大（>500 行）：cases.service.ts(3456) / submissionPackages.service.ts(931) / residencePeriods.service.ts(667) / templates.service.ts(516) **[H]**
- 大（300–500）：tasks(500) / billingPlans(500) / documentFiles(497) / customers.service(493) / generatedDocuments(490) / paymentRecords(490) / cases.controller(489) / documentItems.service(479) / customers.controller(466) / leads.admin.service(449) / groups(449) / documentItems.controller(439) / dashboard(439) / portal.leads(422) / caseParties(416) / reminders(406) / validationRuns(382) / leads.admin.controller(375) / communicationLogs(375) / documentRequirementFileRefs(353) / templates.controller(349) / residencePeriods.controller(335) / documentFiles.controller(335) / companies(334) / contactPersons(327)

## 7. 不确定项

- HealthController 未读，路径前缀未确认。 **[L]** → OQ-24
- worker.ts 装配清单（包含哪些 service）未验证；它的 fan-out=15 与 app.module 的 89 关系待 B-008+。 **[L]** → 已并入 OQ-19
- `custom/tenant-a/*` 是否在 worker 或其他 module 中被装配。 **[L]** → OQ-21
- 完整 RBAC 矩阵（每端点 → 角色）需新 backlog 任务 B-017。

## 8. 观察（中性）

- O-1：单 root NestModule 模式；40 controller + 37 service 全在 `app.module.ts` 平铺。装配清单本身已成"次生 hotspot"（fan-out 89）。 **[H]**
- O-2：core 与 portal 共享路径名集（`auth`、`leads`、`conversations`、`messages`），通过前缀加 `admin/` 与 guard 类型区分；任何路由层重构都要对账两边。 **[H]**
- O-3：portal 端将 `@Public()` 用作"绕过全局后台 AuthGuard"的开关，再叠 `AppUserAuthGuard` —— 是事实，非异常；但提示"两套 token 共存"在 RequestContextInterceptor 中如何分流，需在后续验证。 **[M]** → OQ-25
- O-4：cases / customers / billing(4) / documents(5) / submission+validation+review 形成"案件主线"能力簇，service 行数集中在此线上 → 与 03 中 cases.service.ts 居中央位置一致。 **[H]**
