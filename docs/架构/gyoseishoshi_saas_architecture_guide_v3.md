# 行政书士垂直 SaaS 与双端平台化架构指南 v3

> 本文基于你上传的《行政书士垂直 SaaS 架构与产品化指南》改造而来，保留“先服务首家客户、再渐进式 SaaS 化”的主线，同时补充：
>
> - 用户端 App / Web Portal
> - 多语言咨询与资料上传
> - Redis + Queue + Worker 异步体系
> - 双端整体架构
> - 事务所 SaaS → 用户门户 → 平台化 的阶段路线
> - 市场前景与机会判断

---

# 1. 最终建议总览

## 1.1 当前最优战略

你现在最优的路线不是直接做“大平台”，而是：

### 第一阶段
**先把行政书士事务所后台 SaaS 做稳**

### 第二阶段
**补一个轻量用户端门户**
- 发咨询
- 多语言消息
- 上传资料
- 查看待补资料
- 查看基础进度

### 第三阶段
**再决定要不要走多事务所平台化**
- 入驻事务所
- 咨询分发
- 简单匹配
- SLA
- 服务市场

---

## 1.2 当前最优技术路线

- 后端：NestJS
- 数据库：PostgreSQL
- 缓存/队列：Redis
- 前端：Vue（事务所后台）
- 用户端：H5 / App / Web Portal 均可，建议先轻量
- 架构：模块化单体 + Worker
- 不建议：微服务、换语言、多数据库拆分、复杂事件总线

---

## 1.3 当前最重要的事

真正该优先打好的地基不是“微服务”或“重型基础设施”，而是：

1. 多租户边界
2. 权限模型
3. 核心数据模型
4. 模板系统
5. 审计 / Timeline
6. 异步任务体系
7. Feature Flag
8. 备份、日志、监控
9. 用户侧咨询 / 会话 / 消息 / 上传资料的最小模型
10. 翻译与通知的异步链路

---

# 2. 产品形态的最终定义

你现在的产品不应再只定义为：

> 行政书士事务所内部 SaaS

而应该定义为：

## **行政书士事务所运营 SaaS + 用户端多语言咨询 / 资料门户**

进一步说，长期终局可以是：

## **行政书士 B2B2C 服务平台 + 事务所业务操作系统**

但这个“平台”不是第一阶段要重投入的目标。

---

# 3. 现有项目到 SaaS 的演进路线图（不重开仓）

## 阶段 0：停止无标签开发

先把当前系统的所有模块、页面、接口、表结构按四类标记：

- Core：大多数事务所都需要的稳定能力
- Template：某一类业务线会复用的模板能力
- Portal：用户端 / 咨询端相关能力
- Custom：首家客户特有逻辑

建议整理成表：

| 模块/功能 | 当前状态 | 分类 | 是否保留到 SaaS 核心 | 备注 |
|---|---|---|---|---|
| 客户管理 | 已实现 | Core | 是 | 通用 |
| 案件状态流 | 已实现 | Template | 是 | 需模板化 |
| 用户咨询入口 | 规划中 | Portal | 是 | 轻量门户 |
| 特殊表单 | 已实现 | Custom | 否 | 首家客户特有 |

---

## 阶段 1：冻结 6 个后台核心对象

必须先冻结：

1. User
2. Organization
3. Customer
4. Case
5. DocumentItem
6. TimelineLog

### User
- id
- orgId
- name
- email
- role
- status

### Organization
- id
- name
- plan
- settings
- status

### Customer
- id
- orgId
- type（个人 / 法人）
- base profile
- contacts

### Case
- id
- orgId
- customerId
- caseTypeCode
- status
- ownerUserId
- openedAt
- dueAt
- metadata

### DocumentItem
- id
- caseId
- checklistItemCode
- name
- status
- requestedAt
- receivedAt
- reviewedAt
- dueAt
- ownerSide
- lastFollowUpAt
- note

### TimelineLog
- id
- orgId
- entityType
- entityId
- action
- actorUserId
- payload
- createdAt

关键原则：

- Customer 与 Case 必须分离
- Document 不能只是附件列表，必须是结构化资料对象
- Timeline 必须统一，不要各模块自己记一套

---

## 阶段 2：补齐用户端最小对象

在你引入用户端之后，建议新增这些对象：

1. AppUser
2. Lead
3. Conversation
4. Message
5. UserDocument
6. IntakeForm

### AppUser
- id
- preferredLanguage
- name
- contact
- status

### Lead
- id
- orgId（可为空，未分配前）
- source
- language
- status
- assignedOrgId
- assignedUserId
- createdAt

### Conversation
- id
- leadId
- appUserId
- orgId
- channel
- preferredLanguage
- status

### Message
- id
- conversationId
- senderType
- senderId
- originalLanguage
- originalText
- translatedTextJa
- translatedTextZh
- translatedTextEn
- translationStatus
- createdAt

### UserDocument
- id
- appUserId
- leadId / caseId
- fileId
- docType
- status
- uploadedAt

### IntakeForm
- id
- appUserId
- leadId
- caseDraftId
- formData
- status

关键原则：

- 用户咨询先落 Lead / Conversation，不要直接变成 Case
- Message 必须保留原文 + 译文，不要只存译文
- 上传资料与正式案件资料要能关联，但不要混成一层

---

## 阶段 3：在现有仓库里做渐进式分层

建议目录目标：

```text
src/
  modules/
    core/
      auth/
      org/
      users/
      permissions/
      customers/
      cases/
      document-items/
      reminders/
      timeline/
      files/
      feature-flags/

    templates/
      case-types/
      document-checklists/
      state-flows/
      reminder-rules/
      document-templates/

    portal/
      app-users/
      leads/
      conversations/
      messages/
      intake/
      user-documents/
      translation/
      routing/

    custom/
      tenant-a/

  app/
    api/
    jobs/

  infra/
    db/
    storage/
    queue/
    logger/
    notification/
    translation/
```

### 分层规则

#### core
- 放稳定能力
- 不出现客户名
- 不出现首家客户专属字段
- 不写死某业务线逻辑

#### templates
- 放案件模板
- 放资料模板
- 放状态流模板
- 放提醒规则模板

#### portal
- 放用户端 / 咨询端域对象
- 这些能力未来可继续成长为平台入口
- 但当前阶段仍服务于事务所 SaaS 的主线

#### custom
- 放首家客户特有逻辑
- 先隔离，哪怕丑，也比污染 core 强

#### infra
- 只放基础设施
- 不承载业务判断

---

## 阶段 4：隔离首家客户特有逻辑

优先隔离：

1. 特有字段
2. 特有状态流
3. 特有导出
4. 特有通知
5. 特有审批动作
6. 特有商户映射规则
7. 特有 intake 逻辑

建议：

- 放到 custom config
- 放到 custom DTO mapping
- 放到 custom exporters
- 放到 custom notifications
- 用 feature flag 控制开关

目标不是一步做完，而是避免继续污染 core。

---

## 阶段 5：把案件流程与咨询流程模板化

模板化的不是页面，而是这些对象：

1. CaseTypeTemplate
2. StateFlowTemplate
3. DocumentChecklistTemplate
4. ReminderRuleSet
5. DocumentTemplate
6. IntakeTemplate
7. LeadRoutingRule（后期）

示例：

```ts
CaseTypeTemplate {
  code: "construction_license_renewal",
  name: "建设业许可更新",
  initialStatus: "intake",
  allowedStatuses: [...],
  documentChecklistTemplateId: "...",
  reminderRuleSetId: "...",
}
```

---

## 阶段 6：收口权限到后端

最小 RBAC：

- owner
- manager
- staff
- viewer

用户端单独一套最小权限：
- app_user
- guest
- verified_user（可选）

权限原则：

- 前端只控制显示
- 后端决定能不能做
- 删除默认软删除
- 导出、状态变更、模板配置要单独控
- 用户端访问必须按 appUser / org / case / conversation 做边界校验

---

## 阶段 7：建立每周一次结构整理机制

每周固定检查：

- 哪些逻辑本该进 template，却写死在 core
- 哪些逻辑本该进 custom，却污染了 core
- 哪些功能可以从 custom 上升到 template
- 哪些 portal 逻辑正在反向污染 case/customer 核心边界
- 哪些异步任务被错误写成同步链路

---

## 阶段 8：什么时候才考虑新仓库

只有满足以下条件，才考虑：

1. 第一家稳定跑了一段时间
2. 第二家开始接入
3. 多租户、权限、模板边界已经明确
4. 用户端最小模型已稳定
5. 当前仓库历史包袱明显高于重整成本
6. 你明确知道新仓库要解决什么问题

在此之前，不建议重开正式第二仓。

---

# 4. 双端整体架构图

## 4.1 逻辑视图

```text
用户端 App / Web Portal
  ├─ 多语言咨询
  ├─ 上传资料
  ├─ 查看待补资料
  └─ 查看进度

事务所后台 SaaS
  ├─ Lead / 咨询管理
  ├─ Customer / Case
  ├─ 资料催收
  ├─ Reminder / Timeline
  ├─ 模板与导出
  └─ 内部协作

统一后端（Nest 模块化单体）
  ├─ Auth / Org / Permission
  ├─ Lead / Conversation / Message
  ├─ Customer / Case / DocumentItem
  ├─ Template / FeatureFlag
  ├─ Files / Exports
  └─ Timeline / Reminder

异步层（Redis + Queue + Worker）
  ├─ Translation Jobs
  ├─ Notification Jobs
  ├─ Reminder Jobs
  ├─ File Processing Jobs
  ├─ Export Jobs
  └─ Routing Jobs

基础设施
  ├─ PostgreSQL
  ├─ Redis
  ├─ Object Storage
  ├─ Notification Adapters
  └─ Translation Adapters
```

---

## 4.2 同步与异步边界

### 同步处理
- 用户发起咨询
- 事务所后台查看线索/案件
- 基础资料提交
- 权限校验
- 基础状态读取

### 异步处理
- 自动翻译
- 邮件 / push / 站内通知
- 文件 OCR / 缩略图 / 扫描
- reminder / follow-up
- 导出
- 咨询分配 / 超时转派

---

# 5. 技术底座建议

## 5.1 后端

继续使用 NestJS。

原因：

- 适合 CRUD / 权限 / 后台系统
- 模块化清晰
- 适合当前小团队 / 单人 + AI 开发模式
- 没必要为了“更适合 SaaS”而换语言

## 5.2 数据库

继续使用 PostgreSQL。

适用原因：

- 强关系型
- 多表关联
- 状态流
- 权限
- 审计日志
- 模板配置
- 查询筛选很多
- 一致性要求高
- 对 customer / case / lead / conversation / message 很适合

不建议现在改用 MongoDB 做主库。

## 5.3 Redis

现在值得接入，并建议纳入底层标准能力。

适合用途：

1. Job Queue
2. Reminder / Notification 异步任务
3. Translation Job
4. Routing Job
5. 少量热点缓存
6. 限流 / 锁

不适合：

- 作为业务真源
- 存唯一状态
- 存唯一案件数据
- 存唯一消息事实

## 5.4 架构形态

不要微服务。

建议：

- 主 API 应用
- 一个或多个 worker 进程
- 同一代码仓
- 同一主数据库
- 内部是模块化单体

---

# 6. 推荐后端模块

建议按这些模块组织：

```text
src/modules/
  auth/
  org/
  users/
  permissions/
  customers/
  cases/
  case-templates/
  document-items/
  document-checklists/
  reminders/
  timeline/
  notifications/
  files/
  exports/
  feature-flags/

  app-users/
  leads/
  conversations/
  messages/
  intake/
  user-documents/
  translation/
  routing/

  custom/
```

## 模块职责

### auth
- 登录
- token/session
- 身份认证

### org
- 租户 / 事务所
- 组织配置
- plan / feature

### users
- 后台用户
- 用户与 org 关系
- 角色挂载

### permissions
- RBAC
- scope 校验
- 后端接口授权

### customers
- 客户主档
- 个人 / 法人
- 联系方式
- 可复用资料

### cases
- 案件实例
- 当前状态
- 负责人
- 截止日期
- 下一动作

### case-templates
- 案件类型模板
- 默认状态
- 默认资料模板
- 默认提醒规则

### document-items
- 某案件下的资料项
- 收集 / 审核 / 退回 / 催办状态

### document-checklists
- 某类案件需要哪些资料
- 哪些必需 / 可选

### reminders
- 到期提醒
- 补正提醒
- 跟进提醒
- 续期提醒

### timeline
- 统一操作日志
- 关键动作时间线

### notifications
- 邮件
- 系统内通知
- 未来短信 / IM 扩展

### files
- 文件上传
- 文件元数据
- 存储抽象

### exports
- Excel / PDF / CSV 导出
- 批量导出任务

### feature-flags
- 客户特有功能开关
- 灰度功能开关

### app-users
- 最终用户账号体系

### leads
- 咨询线索
- 咨询到受理前的入口对象

### conversations
- 会话
- 与事务所的沟通线程

### messages
- 多语言消息
- 原文 / 译文 / 翻译状态

### intake
- 正式立案前的信息收集 / 表单

### user-documents
- 用户上传资料
- 咨询阶段或案件阶段的文件

### translation
- 翻译任务封装
- 翻译状态管理
- 译文回写逻辑

### routing
- 咨询分配
- SLA
- 超时升级
- 后期匹配逻辑

### custom
- 首家客户特有逻辑
- 特有导出
- 特有流程
- 特有字段映射

---

# 7. 数据库设计优先级

第一批优先稳定这些表：

- organizations
- users
- app_users
- customers
- cases
- case_templates
- document_checklist_templates
- document_items
- leads
- conversations
- messages
- user_documents
- reminders
- timeline_logs
- feature_flags

## 多租户字段

所有核心业务表默认带：

- org_id

原则：

- 核心查询默认强制带 org_id
- 不要靠“调用方记得加过滤”

## 额外边界字段建议

### leads
- org_id 可为空（未分配）
- assigned_org_id
- assigned_user_id

### conversations
- org_id
- app_user_id

### messages
- conversation_id
- org_id（可冗余，便于查询和隔离）

## 索引建议

### cases
- (org_id, status)
- (org_id, owner_user_id)
- (org_id, due_at)
- (org_id, customer_id)

### document_items
- (case_id, status)
- (org_id, due_at)
- (org_id, last_follow_up_at)

### reminders
- (org_id, scheduled_at, status)

### timeline_logs
- (org_id, entity_type, entity_id, created_at desc)

### leads
- (assigned_org_id, status)
- (language, status)
- (created_at)

### conversations
- (org_id, status)
- (app_user_id, created_at)

### messages
- (conversation_id, created_at)
- (org_id, created_at)

## migration 规则

必须有 migration 规范：

- 每次 schema 变更都走 migration
- migration 文件写清楚意图
- 核心表改动必须 review

---

# 8. 异步任务与消息队列设计

## 8.1 现在值得纳入底层

消息队列建议现在就纳入底座。  
但形式应该是：

**Redis + Queue + Worker**

不是：

**微服务 + 重型 MQ 平台**

---

## 8.2 推荐 job 类型

### translation_jobs
- 用户消息翻译成事务所阅读语言
- 事务所消息翻回用户偏好语言

### notification_jobs
- App 推送
- 邮件
- 站内通知
- 超时提醒

### file_processing_jobs
- OCR
- 病毒扫描
- 缩略图
- 文件归档

### reminder_jobs
- 资料催交
- 咨询未回复提醒
- 案件快到期提醒

### routing_jobs
- 自动分配事务所
- 超时重分配
- SLA 升级

### export_jobs
- 批量导出
- PDF / Excel 生成

---

## 8.3 多语言消息设计原则

不要把翻译写死在聊天同步接口里。

### 正确流程
1. 用户发消息
2. 先落库原文
3. 推入 translation job
4. worker 异步翻译
5. 回写译文
6. 通知事务所

### Message 必须保留
- originalText
- originalLanguage
- translatedTextJa
- translatedTextZh
- translatedTextEn
- translationStatus

这样以后：
- 可以重翻
- 可以切展示语言
- 可以人工修正
- 可以保留证据链

---

# 9. 关键工程规则

### Rule 1
所有业务表默认考虑 org_id

### Rule 2
所有写操作都经过后端权限校验

### Rule 3
所有关键状态变更都写 timeline

### Rule 4
所有首家客户特殊逻辑都进 custom 或 feature flag

### Rule 5
所有异步任务都走 queue

### Rule 6
所有 schema 改动都走 migration

### Rule 7
模板逻辑不写死在核心 service

### Rule 8
消息必须保留原文，不允许只保留译文

### Rule 9
咨询、会话、案件三层对象不能混在一起

### Rule 10
用户端功能是事务所 SaaS 的外延，不允许反向拖垮核心交付

---

# 10. 现在就做 vs 现在别做

## 现在就做
- PostgreSQL 模型整理
- Redis 接入
- Queue 跑起来
- org_id 边界
- RBAC
- timeline / audit
- template 抽象
- feature flag
- lead / conversation / message 最小模型
- translation / notification / reminder job
- migration 规范

## 现在别做
- 微服务
- 多数据库拆分
- CQRS
- 事件总线
- K8s 重投入
- 为未来而换语言
- 低代码大平台
- 一开始就做复杂 marketplace
- 一开始就做平台抽佣和全套商户市场

---

# 11. 市场前景与机会判断

## 11.1 总判断

这个方向是有机会的，但要分两层看：

### 第一层：事务所后台 SaaS
更稳、更容易先做成。

### 第二层：用户端多语言咨询平台
更大，但更难，适合作为第二阶段拉升。

也就是说，你最好的路径不是一开始就做成“大平台”，而是：

> 先把行政书士事务所 SaaS 做稳，再把用户端做成 SaaS 的外延入口，最后再决定要不要平台化。

---

## 11.2 为什么事务所 SaaS 这层成立

1. 行政书士事务所内部流程仍然高度依赖人工、Excel、聊天工具和共享文件夹  
2. 资料催办、期限管理、案件推进、模板输出、留痕，天然适合系统化  
3. 付费方清晰：事务所  
4. 一旦导入，迁移成本较高，续费逻辑较强  

所以它是你最稳的底盘。

---

## 11.3 为什么用户端多语言入口有机会

你新的方向里，最有机会的不是“聊天本身”，而是：

### 多语言 intake 层
让用户用中文 / 英文先把问题说清楚，再把它变成事务所可执行的案件入口。

### 咨询到案件的转化层
大多数工具只做到聊天，真正难的是把咨询变成：
- 正式案件
- 资料清单
- 下一动作
- 缺件催办
- 期限推进

### 前后台打通
你的护城河不在“我也有翻译和聊天”，而在：

> 我把多语言前台入口和事务所后台案件系统打通了。

---

## 11.4 最大的风险

### 风险 1：平台做太早
两端都做不深。

### 风险 2：用户端很花，后台不够强
会变成咨询入口工具，而不是生产系统。

### 风险 3：多语言只是表面能力
真正难的是：
- 翻译准确性
- 资料结构化
- 事务所承接效率
- 跨语言沟通留痕

### 风险 4：供给和质量控制
如果以后走 marketplace，会进入：
- 商户管理
- 投诉
- SLA
- 匹配
- 服务质量治理

这不是第一阶段该硬上。

---

# 12. 阶段化商业路线

## 第一阶段
**事务所后台 SaaS + 轻用户端门户**

用户端只做：
- 发咨询
- 多语言消息
- 上传资料
- 查看待补资料
- 查看基础进度

---

## 第二阶段
**多事务所接入 + 线索流转**

加入：
- 入驻事务所
- 咨询归属
- 响应 SLA
- 简单匹配

---

## 第三阶段
**再决定要不要做 marketplace**

包括：
- 搜索事务所
- 评价
- 服务目录
- 自动匹配
- 平台抽佣

---

# 13. AI 协作开发规则（升级版）

## 基本原则

AI 可以：
- 写页面
- 写 CRUD
- 写测试
- 写 migration
- 写基础脚本
- 写文档
- 写 worker handler
- 写 DTO / schema

AI 不应该自己决定：
- 核心数据模型
- 权限模型
- 状态流
- 多租户边界
- 模板边界
- lead / conversation / case 三层边界
- translation truth model

## 每个 AI 子任务必须包含
1. 模块范围
2. 不可修改目录
3. 数据模型来源
4. 权限要求
5. 测试要求
6. 是否涉及异步任务
7. 完成定义（DoD）

## 每个任务的 DoD 至少包含
- 功能完成
- 类型通过
- 测试通过
- 权限正确
- timeline/log 补齐
- 不新增未解释字段
- 不污染 core
- 如涉及消息，保留原文和译文设计
- 如涉及 job，明确 retry / error handling

---

# 14. 给 Augment / Claude Code 的新增 Prompt

## 14.1 双端盘点 Prompt

```text
请基于当前项目，按“事务所后台域”和“用户端门户域”两侧分别盘点当前模块与边界。

要求：
1. 区分后台域对象与用户端域对象
2. 指出哪些对象被错误混在一起
3. 输出哪些应属于 core / template / portal / custom
4. 不要重构代码，只做边界判断
```

## 14.2 消息与翻译链路审查 Prompt

```text
请审查当前项目的咨询、会话、消息、翻译与通知链路。

重点判断：
1. 是否把翻译写死在同步接口中
2. 是否保留消息原文
3. 是否能区分原语言与显示语言
4. 哪些地方应该异步化
5. 哪些地方会污染 case/customer 核心模型

输出：
- 风险点
- 最小修复建议
- 是否应进入 queue
```

## 14.3 平台化边界 Prompt

```text
请基于当前项目，判断哪些能力适合现在做，哪些能力必须推迟到第二阶段或第三阶段。

阶段定义：
- 第一阶段：事务所 SaaS + 轻用户端门户
- 第二阶段：多事务所接入 + 咨询分发
- 第三阶段：平台化 marketplace

请按功能逐项判断，并说明原因。
```

---

# 15. 最终执行建议

## 你现在最该做的 7 件事

1. 冻结后台核心数据模型
2. 冻结 lead / conversation / message 最小模型
3. 冻结最小权限模型
4. 把 Redis + Queue + Worker 纳入底层
5. 建 translation / notification / reminder 三类基础 job
6. 把现有需求全部打上 core / template / portal / custom 标签
7. 先做事务所 SaaS + 轻用户端门户，不急着做 marketplace

---

# 16. 一句话总结

你现在最重要的，不是把“未来平台的全部基础设施”一次性铺满。

而是把当前项目做成：

## **能持续交付第一家客户，同时又能长成双端 SaaS，并为未来平台化预留正确边界的项目。**
