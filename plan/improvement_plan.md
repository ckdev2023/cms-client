# 行政书士 SaaS 改进计划

> 基于 `docs/架构/gyoseishoshi_saas_architecture_guide_v3.md` 与当前代码库深度对比分析生成
>
> 生成日期：2026-04-06

---

## 一、当前系统盘点（已完成 ✅ / 缺失 ❌）

### 1.1 Server — 核心后台域（阶段 1）

| 能力                                                                        | 状态 | 所在路径                                              | 备注                                                                                     |
| --------------------------------------------------------------------------- | ---- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Organization / User / Customer / Case / DocumentItem / TimelineLog 类型定义 | ✅   | `server/src/modules/core/model/coreEntities.ts`       | 6 大核心对象已冻结                                                                       |
| 数据库表 + 索引                                                             | ✅   | `server/src/infra/db/migrations/001_init.sql`         | organizations/users/customers/cases/document_items/reminders/timeline_logs/feature_flags |
| RLS 多租户隔离                                                              | ✅   | `002_rls.sql` + `tenantDb.ts`                         | set_config('app.org_id') + RLS policy                                                    |
| RBAC 角色（owner/manager/staff/viewer）                                     | ✅   | `server/src/modules/core/auth/roles.ts`               | hasRequiredRole + parseRole                                                              |
| Auth Guard + RequestContext                                                 | ✅   | `auth.guard.ts` / `requestContext.interceptor.ts`     | 全局守卫                                                                                 |
| Timeline Service                                                            | ✅   | `server/src/modules/core/timeline/`                   | CRUD + 按 entity 查询                                                                    |
| Template 系统（版本 + 发布 + 灰度 rollout）                                 | ✅   | `server/src/modules/templates/` + `003_templates.sql` | case_type / state_flow / document_checklist / reminder_rule_set / document_template      |
| Feature Flags                                                               | ✅   | `server/src/modules/feature-flags/`                   | org_id + key 维度                                                                        |
| Job 队列（PostgreSQL 持久 + Redis List 轻量）                               | ✅   | `jobs.service.ts` / `redisQueue.ts` / `005_jobs.sql`  | 入队 + 幂等 + Worker 轮询                                                                |
| Redis 客户端                                                                | ✅   | `server/src/infra/redis/createRedisClient.ts`         | —                                                                                        |
| Worker 入口                                                                 | ✅   | `server/src/worker.ts`                                | —                                                                                        |
| Migration Runner                                                            | ✅   | `server/src/infra/db/runMigrations.ts`                | —                                                                                        |
| **Customers CRUD Service**                                                  | ❌   | —                                                     | 仅有类型，无 service/controller                                                          |
| **Cases CRUD Service**                                                      | ❌   | —                                                     | 同上                                                                                     |
| **DocumentItems CRUD Service**                                              | ❌   | —                                                     | 同上                                                                                     |
| **Reminders CRUD Service**                                                  | ❌   | —                                                     | 同上                                                                                     |
| **Permissions Service（细粒度 scope）**                                     | ❌   | —                                                     | 当前只有角色等级，无资源级 scope                                                         |

### 1.2 Server — 用户端门户域（阶段 2）

| 能力                                         | 状态 | 备注                    |
| -------------------------------------------- | ---- | ----------------------- |
| AppUser 实体 + 表                            | ❌   | 用户端账号体系          |
| Lead 实体 + 表                               | ❌   | 咨询线索                |
| Conversation 实体 + 表                       | ❌   | 会话线程                |
| Message 实体 + 表（原文 + 多语译文）         | ❌   | 多语言消息              |
| UserDocument 实体 + 表                       | ❌   | 用户上传资料            |
| IntakeForm 实体 + 表                         | ❌   | 立案前信息收集          |
| Translation Job / Adapter                    | ❌   | 异步翻译链路            |
| Notification Job / Adapter（邮件/Push/站内） | ❌   | 通知基础设施            |
| Routing / 咨询分配                           | ❌   | lead 分配 + SLA         |
| File Storage Adapter                         | ❌   | 文件上传/Object Storage |
| Export Service（PDF/Excel/CSV）              | ❌   | 批量导出                |

### 1.3 Server — 目录结构

| 架构指南要求                         | 当前状态    | 备注                             |
| ------------------------------------ | ----------- | -------------------------------- |
| `modules/core/` — 稳定能力           | ✅ 部分存在 | auth/jobs/model/tenancy/timeline |
| `modules/templates/`                 | ✅          | —                                |
| `modules/portal/` — 用户端域         | ❌          | 完全不存在                       |
| `modules/custom/` — 首家客户特有逻辑 | ❌          | 未隔离                           |
| `infra/storage/` — 文件存储          | ❌          | —                                |
| `infra/notification/` — 通知         | ❌          | —                                |
| `infra/translation/` — 翻译          | ❌          | —                                |

### 1.4 Mobile 端

| 能力                                         | 状态 | 备注             |
| -------------------------------------------- | ---- | ---------------- |
| 分层架构（feature/domain/data/infra/shared） | ✅   | 骨架清晰         |
| Home Feature（ViewModel + UI）               | ✅   | 唯一功能 feature |
| DI Container / Logger / Error 体系           | ✅   | —                |
| Auth / Login Feature                         | ❌   | —                |
| 案件列表 + 详情 Feature                      | ❌   | —                |
| 多语言咨询 / 消息 Feature                    | ❌   | —                |
| 文档上传 Feature                             | ❌   | —                |
| 进度查看 Feature                             | ❌   | —                |
| Profile / 设置 Feature                       | ❌   | —                |
| Push 通知 Feature                            | ❌   | —                |

### 1.5 Prototype

| 状态                  | 备注                                                 |
| --------------------- | ---------------------------------------------------- |
| ✅ 已有 HTML/CSS 原型 | home / case / inbox / payment / profile / todos 页面 |

---

## 二、差距分析总结

### 核心差距

1. **后台 CRUD 层缺失**：6 大核心对象只有类型定义和数据库表，缺少 service/controller 层
2. **Portal 域完全空白**：架构指南阶段 2 的全部 6 个域对象（AppUser/Lead/Conversation/Message/UserDocument/IntakeForm）均未启动
3. **异步任务仅有骨架**：Job 入队 + Worker 机制已就绪，但无具体 handler（translation/notification/reminder/export）
4. **基础设施 Adapter 缺失**：文件存储、通知、翻译三大 Adapter 均未实现
5. **Custom 隔离未建立**：首家客户特有逻辑未隔离到 custom 模块
6. **Mobile 仅有骨架**：除 Home 外无任何业务 feature

### 健康度判断

| 维度         | 评分       | 说明                              |
| ------------ | ---------- | --------------------------------- |
| 数据模型设计 | ⭐⭐⭐⭐   | 核心 6 表已冻结，结构合理         |
| 多租户隔离   | ⭐⭐⭐⭐⭐ | RLS + set_config 方案成熟         |
| 权限模型     | ⭐⭐⭐     | RBAC 角色等级已有，缺资源级 scope |
| 模板系统     | ⭐⭐⭐⭐   | 版本 + 发布 + 灰度，设计完整      |
| 异步任务体系 | ⭐⭐⭐     | 基础设施就绪，handler 缺失        |
| 用户端域     | ⭐         | 完全未启动                        |

---

## 三、改进路线（按优先级排序）

> 原则：**先稳后台 CRUD → 再建 Portal → 最后扩 Mobile**
> 每个阶段结束必须通过 `npm run guard`

### Phase A：补齐后台核心 CRUD（预计 2-3 周）

> **目标**：让 6 大核心对象可通过 API 完整操作，支撑事务所后台前端开发

#### A-1 Customers 模块

- [ ] 创建 `server/src/modules/core/customers/customers.service.ts`
- [ ] 创建 `server/src/modules/core/customers/customers.controller.ts`
- [ ] 实现 CRUD：create / get / list / update / softDelete
- [ ] 所有操作强制经过 TenantDb（org_id 隔离）
- [ ] 写操作写 Timeline
- [ ] 补充单测（mock DB）

#### A-2 Cases 模块

- [ ] 创建 `server/src/modules/core/cases/cases.service.ts`
- [ ] 创建 `server/src/modules/core/cases/cases.controller.ts`
- [ ] 实现 CRUD + 状态变更（状态流受 template 约束）
- [ ] Case 创建时自动生成 DocumentItem checklist（基于 document_checklist_template）
- [ ] 所有状态变更写 Timeline
- [ ] 补充单测

#### A-3 DocumentItems 模块

- [ ] 创建 `server/src/modules/core/document-items/documentItems.service.ts`
- [ ] 创建 `server/src/modules/core/document-items/documentItems.controller.ts`
- [ ] 实现 CRUD + 状态变更（requested → received → reviewed / rejected）
- [ ] 催办 followUp 操作更新 lastFollowUpAt + 写 Timeline
- [ ] 补充单测

#### A-4 Reminders 模块

- [ ] 创建 `server/src/modules/core/reminders/reminders.service.ts`
- [ ] 创建 `server/src/modules/core/reminders/reminders.controller.ts`
- [ ] 实现 CRUD + 按 scheduledAt 查询待触发 reminders
- [ ] 补充单测

#### A-5 Permissions Service（细粒度 scope）

- [ ] 创建 `server/src/modules/core/permissions/permissions.service.ts`
- [ ] 支持资源级 scope 判断：canAccessCase(userId, caseId) / canAccessCustomer(userId, customerId)
- [ ] 在 Cases / Customers controller 中接入 scope 校验
- [ ] 补充单测

---

### Phase B：建立基础设施 Adapter（预计 1-2 周）

> **目标**：为 Portal 域和异步任务提供底层能力

#### B-1 File Storage Adapter

- [ ] 创建 `server/src/infra/storage/storageAdapter.ts`
- [ ] 定义接口：upload / download / delete / getSignedUrl
- [ ] 实现 local（开发）+ S3 兼容（生产）双策略
- [ ] 补充单测

#### B-2 Notification Adapter

- [ ] 创建 `server/src/infra/notification/notificationAdapter.ts`
- [ ] 定义接口：sendEmail / sendPush / sendInApp
- [ ] 初始实现：console log（占位）+ 邮件（可选 nodemailer）
- [ ] 补充单测

#### B-3 Translation Adapter

- [ ] 创建 `server/src/infra/translation/translationAdapter.ts`
- [ ] 定义接口：translate(text, fromLang, toLang) → translatedText
- [ ] 初始实现：直通（返回原文）占位
- [ ] 补充单测

---

### Phase C：异步任务 Handler 实装（预计 1-2 周）

> **目标**：让 Job 系统跑起具体业务 handler

#### C-1 Reminder Job Handler

- [ ] 创建 `server/src/modules/core/jobs/handlers/reminderJobHandler.ts`
- [ ] 轮询到期 reminders → 入队 notification_job
- [ ] 更新 reminder 状态
- [ ] retry / error handling

#### C-2 Notification Job Handler

- [ ] 创建 `server/src/modules/core/jobs/handlers/notificationJobHandler.ts`
- [ ] 调用 Notification Adapter 发送
- [ ] 写 Timeline log
- [ ] retry / error handling

#### C-3 Translation Job Handler

- [ ] 创建 `server/src/modules/core/jobs/handlers/translationJobHandler.ts`
- [ ] 调用 Translation Adapter
- [ ] 回写 Message 译文字段 + 更新 translationStatus
- [ ] retry / error handling

#### C-4 Export Job Handler

- [ ] 创建 `server/src/modules/core/jobs/handlers/exportJobHandler.ts`
- [ ] 支持 PDF / Excel / CSV
- [ ] 生成文件 → 调用 Storage Adapter 存储 → 通知用户
- [ ] retry / error handling

#### C-5 Worker 注册所有 Handler

- [ ] 修改 `server/src/worker.ts`，注册上述 handler 到对应队列
- [ ] 补充 worker 启动 / handler 调度集成测试

---

### Phase D：Portal 域对象建模 + Migration（预计 2-3 周）

> **目标**：阶段 2 用户端最小模型可用

#### D-1 Portal Migration

- [ ] 创建 `007_portal.sql`
- [ ] 建表：app_users / leads / conversations / messages / user_documents / intake_forms
- [ ] 建索引（按架构指南 §7）
- [ ] app_users 不挂 org_id（独立账号体系）
- [ ] leads.org_id 可为空（未分配）

#### D-2 Portal RLS

- [ ] 创建 `008_portal_rls.sql`
- [ ] leads / conversations / messages / user_documents 按 org_id 隔离
- [ ] app_users 不走 org_id RLS（跨事务所）

#### D-3 Portal 类型定义

- [ ] 创建 `server/src/modules/portal/model/portalEntities.ts`
- [ ] AppUser / Lead / Conversation / Message / UserDocument / IntakeForm 类型
- [ ] Message 必须包含：originalText / originalLanguage / translatedTextJa / translatedTextZh / translatedTextEn / translationStatus

#### D-4 Portal Modules

- [ ] `server/src/modules/portal/app-users/` — AppUser CRUD
- [ ] `server/src/modules/portal/leads/` — Lead CRUD + 状态变更
- [ ] `server/src/modules/portal/conversations/` — Conversation CRUD
- [ ] `server/src/modules/portal/messages/` — Message 发送（落库原文 → 推 translation_job）
- [ ] `server/src/modules/portal/user-documents/` — UserDocument 上传（调用 Storage Adapter）
- [ ] `server/src/modules/portal/intake/` — IntakeForm CRUD
- [ ] 所有写操作写 Timeline
- [ ] 补充单测

#### D-5 AppUser Auth

- [ ] AppUser 独立登录/注册逻辑（与后台 User 分离）
- [ ] 用户端 Auth Guard（按 appUser / lead / conversation 做边界校验）

---

### Phase E：Custom 模块隔离（预计 1 周）

> **目标**：避免首家客户特有逻辑污染 core

#### E-1 识别与迁移

- [ ] 盘点当前代码中已有的首家客户特有逻辑
- [ ] 创建 `server/src/modules/custom/tenant-a/`
- [ ] 迁移特有字段/DTO mapping/导出/通知逻辑到 custom
- [ ] 用 Feature Flag 控制开关

---

### Phase F：Mobile 端业务 Feature 开发（预计 3-4 周）

> **目标**：用户端门户 MVP（匹配 Prototype 原型页面）

#### F-1 Auth Feature

- [ ] `mobile/src/features/auth/` — 登录/注册（AppUser）
- [ ] domain: AuthRepository
- [ ] data: AuthApi
- [ ] model: useLoginViewModel / useRegisterViewModel
- [ ] ui: LoginScreen / RegisterScreen

#### F-2 Case Feature

- [ ] `mobile/src/features/case/` — 案件列表 + 详情 + 进度
- [ ] 对应 Prototype: case 页面
- [ ] model: useCaseListViewModel / useCaseDetailViewModel

#### F-3 Inbox Feature（多语言咨询/消息）

- [ ] `mobile/src/features/inbox/` — 会话列表 + 消息详情
- [ ] 对应 Prototype: inbox 页面
- [ ] 支持多语言消息展示（原文 + 译文切换）
- [ ] model: useInboxViewModel / useConversationViewModel

#### F-4 Document Feature

- [ ] `mobile/src/features/documents/` — 待补资料 + 上传
- [ ] 对应 Prototype: todos 页面
- [ ] model: useDocumentListViewModel / useDocumentUploadViewModel

#### F-5 Profile Feature

- [ ] `mobile/src/features/profile/` — 用户信息 + 语言偏好
- [ ] 对应 Prototype: profile 页面
- [ ] model: useProfileViewModel

#### F-6 Navigation

- [ ] 配置 Bottom Tab Navigation（home / case / inbox / todos / profile）
- [ ] 配置 Auth Stack（未登录 → 登录/注册）

---

## 四、不做清单（当前阶段明确排除）

| 不做                          | 原因                     |
| ----------------------------- | ------------------------ |
| 微服务拆分                    | 当前单体 + Worker 足够   |
| 多数据库拆分                  | PostgreSQL 单库足够      |
| CQRS / 事件总线               | 过度设计                 |
| Marketplace（搜索/评价/抽佣） | 第三阶段                 |
| 多事务所入驻 + 咨询分发       | 第二阶段                 |
| K8s 重投入                    | 当前规模不需要           |
| Payment 功能                  | Prototype 有页面但非 MVP |
| 低代码平台                    | 非目标                   |

---

## 五、里程碑与验收标准

| 里程碑                | 包含 Phase | 验收标准                                                                          |
| --------------------- | ---------- | --------------------------------------------------------------------------------- |
| **M1：后台 API 可用** | A + B      | 6 大核心对象 CRUD API 跑通 + 权限 scope 校验 + `npm run guard` 通过               |
| **M2：异步任务可用**  | C          | reminder / notification / translation / export handler 跑通 + Worker 集成测试通过 |
| **M3：Portal 域可用** | D + E      | 6 个 Portal 域对象 CRUD API 跑通 + 消息翻译异步链路跑通 + Custom 隔离完成         |
| **M4：用户端 MVP**    | F          | Mobile 5 个 Feature 跑通 + 对接 Server API + 可演示完整用户端流程                 |

---

## 六、工程守则提醒

1. **所有业务表强制 org_id** —— Portal 的 app_users 例外
2. **所有写操作写 Timeline** —— 关键状态变更必须留痕
3. **消息必须保留原文** —— 不允许只存译文
4. **翻译走异步 Job** —— 不在同步接口中做翻译
5. **首家客户特有逻辑进 custom** —— 不污染 core
6. **模板逻辑不写死在核心 service** —— 通过 template 系统配置
7. **Schema 变更必须走 migration** —— 意图明确 + review
8. **单文件不超 500 行** —— 方法保持单一职责
9. **测试不发真实网络请求** —— 必须 mock
10. **每次改动结束确认 `npm run guard` 通过**
