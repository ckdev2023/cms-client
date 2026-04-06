# 行政书士垂直 SaaS 架构与产品化指南

## 1. 目标与当前判断

你当前的路线是合理的：

- 先服务 1 家真实行政书士事务所
- 用真实业务跑通第一版
- 再从客户项目逐步演进成可复制的 SaaS

核心原则：

1. 不要现在重开一个正式新项目
2. 不要为了未来想象而过度设计
3. 优先做“可演进的模块化单体”
4. 先把首家客户跑稳，再抽象成 SaaS

---

## 2. 总体结论

当前最优技术路线：

- 后端：NestJS
- 数据库：PostgreSQL
- 缓存/队列：Redis
- 前端：Vue
- 架构：模块化单体 + worker
- 不建议：微服务、换语言、多数据库拆分、复杂事件总线

真正该优先打好的地基不是“微服务”或“重型基础设施”，而是：

1. 多租户边界
2. 权限模型
3. 核心数据模型
4. 模板系统
5. 审计 / Timeline
6. 异步任务体系
7. Feature Flag
8. 备份、日志、监控

---

## 3. 现有项目到 SaaS 的演进路线图（不重开仓）

### 阶段 0：停止无标签开发

先把当前系统的所有模块、页面、接口、表结构按三类标记：

- Core：大多数事务所都需要的稳定能力
- Template：某一类业务线会复用的模板能力
- Custom：首家客户特有逻辑

建议整理成表：

| 模块/功能 | 当前状态 | 分类 | 是否保留到 SaaS 核心 | 备注 |
|---|---|---|---|---|
| 客户管理 | 已实现 | Core | 是 | 通用 |
| 案件状态流 | 已实现 | Template | 是 | 需模板化 |
| 特殊表单 | 已实现 | Custom | 否 | 首家客户特有 |

### 阶段 1：冻结 6 个核心对象

必须先冻结：

1. User
2. Organization
3. Customer
4. Case
5. DocumentItem
6. TimelineLog

#### User
- id
- orgId
- name
- email
- role
- status

#### Organization
- id
- name
- plan
- settings
- status

#### Customer
- id
- orgId
- type（个人 / 法人）
- base profile
- contacts

#### Case
- id
- orgId
- customerId
- caseTypeCode
- status
- ownerUserId
- openedAt
- dueAt
- metadata

#### DocumentItem
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

#### TimelineLog
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

### 阶段 2：在现有仓库里做渐进式分层

建议目录目标：

```text
src/
  modules/
    core/
      auth/
      org/
      users/
      customers/
      cases/
      document-items/
      reminders/
      timeline/
      permissions/

    templates/
      case-types/
      document-checklists/
      state-flows/
      reminder-rules/
      document-templates/

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
```

#### 分层规则

##### core
- 放稳定能力
- 不出现客户名
- 不出现首家客户专属字段
- 不写死某业务线逻辑

##### templates
- 放案件模板
- 放资料模板
- 放状态流模板
- 放提醒规则模板

##### custom
- 放首家客户特有逻辑
- 先隔离，哪怕丑，也比污染 core 强

##### infra
- 只放基础设施
- 不承载业务判断

### 阶段 3：隔离首家客户特有逻辑

优先隔离：

1. 特有字段
2. 特有状态流
3. 特有导出
4. 特有通知
5. 特有审批动作

建议：

- 放到 custom config
- 放到 custom DTO mapping
- 放到 custom exporters
- 放到 custom notifications
- 用 feature flag 控制开关

目标不是一步做完，而是避免继续污染 core。

### 阶段 4：把案件流程模板化

模板化的不是页面，而是这些对象：

1. CaseTypeTemplate
2. StateFlowTemplate
3. DocumentChecklistTemplate
4. ReminderRuleSet
5. DocumentTemplate

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

### 阶段 5：收口权限到后端

最小 RBAC：

- owner
- manager
- staff
- viewer

权限原则：

- 前端只控制显示
- 后端决定能不能做
- 删除默认软删除
- 导出、状态变更、模板配置要单独控

### 阶段 6：建立每周一次结构整理机制

每周固定检查：

- 哪些逻辑本该进 template，却写死在 core
- 哪些逻辑本该进 custom，却污染了 core
- 哪些功能可以从 custom 上升到 template

### 阶段 7：什么时候才考虑新仓库

只有满足以下条件，才考虑：

1. 第一家稳定跑了一段时间
2. 第二家开始接入
3. 多租户、权限、模板边界已经明确
4. 当前仓库历史包袱明显高于重整成本
5. 你明确知道新仓库要解决什么问题

在此之前，不建议重开正式第二仓。

---

## 4. 技术底座建议

### 4.1 后端

继续使用 NestJS。

原因：

- 适合 CRUD / 权限 / 后台系统
- 模块化清晰
- 适合当前小团队 / 单人 + AI 开发模式
- 没必要为了“更适合 SaaS”而换语言

### 4.2 数据库

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

不建议现在改用 MongoDB 做主库。

### 4.3 Redis

可以接入，但角色要明确。

适合用途：

1. Job Queue
2. Reminder / Notification 异步任务
3. 少量热点缓存
4. 限流 / 锁

不适合：

- 作为业务真源
- 存唯一状态
- 存唯一案件数据

### 4.4 架构形态

不要微服务。

建议：

- 主 API 应用
- 一个或多个 worker 进程
- 同一代码仓
- 同一主数据库
- 内部是模块化单体

---

## 5. 推荐后端模块

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
  custom/
```

### 模块职责

#### auth
- 登录
- token/session
- 身份认证

#### org
- 租户 / 事务所
- 组织配置
- plan / feature

#### users
- 用户
- 用户与 org 关系
- 角色挂载

#### permissions
- RBAC
- scope 校验
- 后端接口授权

#### customers
- 客户主档
- 个人 / 法人
- 联系方式
- 可复用资料

#### cases
- 案件实例
- 当前状态
- 负责人
- 截止日期
- 下一动作

#### case-templates
- 案件类型模板
- 默认状态
- 默认资料模板
- 默认提醒规则

#### document-items
- 某案件下的资料项
- 收集 / 审核 / 退回 / 催办状态

#### document-checklists
- 某类案件需要哪些资料
- 哪些必需 / 可选

#### reminders
- 到期提醒
- 补正提醒
- 跟进提醒
- 续期提醒

#### timeline
- 统一操作日志
- 关键动作时间线

#### notifications
- 邮件
- 系统内通知
- 未来短信 / IM 扩展

#### files
- 文件上传
- 文件元数据
- 存储抽象

#### exports
- Excel / PDF / CSV 导出
- 批量导出任务

#### feature-flags
- 客户特有功能开关
- 灰度功能开关

#### custom
- 首家客户特有逻辑
- 特有导出
- 特有流程
- 特有字段映射

---

## 6. 数据库设计优先级

第一批优先稳定这些表：

- organizations
- users
- customers
- cases
- case_templates
- document_checklist_templates
- document_items
- reminders
- timeline_logs
- feature_flags

### 多租户字段

所有核心业务表默认带：

- org_id

原则：

- 核心查询默认强制带 org_id
- 不要靠“调用方记得加过滤”

### 索引建议

#### cases
- (org_id, status)
- (org_id, owner_user_id)
- (org_id, due_at)
- (org_id, customer_id)

#### document_items
- (case_id, status)
- (org_id, due_at)
- (org_id, last_follow_up_at)

#### reminders
- (org_id, scheduled_at, status)

#### timeline_logs
- (org_id, entity_type, entity_id, created_at desc)

### migration 规则

必须有 migration 规范：

- 每次 schema 变更都走 migration
- migration 文件写清楚意图
- 核心表改动必须 review

---

## 7. 关键工程规则

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

---

## 8. 现在就做 vs 现在别做

### 现在就做
- PostgreSQL 模型整理
- Redis 接入
- Queue 跑起来
- org_id 边界
- RBAC
- timeline / audit
- template 抽象
- feature flag
- migration 规范

### 现在别做
- 微服务
- 多数据库拆分
- CQRS
- 事件总线
- K8s 重投入
- 为未来而换语言
- 低代码大平台

---

## 9. AI 协作开发规则

### 基本原则

AI 可以：

- 写页面
- 写 CRUD
- 写测试
- 写 migration
- 写基础脚本
- 写文档

AI 不应该自己决定：

- 核心数据模型
- 权限模型
- 状态流
- 多租户边界
- 模板边界

### 每个 AI 子任务必须包含

1. 模块范围
2. 不可修改目录
3. 数据模型来源
4. 权限要求
5. 测试要求
6. 完成定义（DoD）

### 每个任务的 DoD 至少包含

- 功能完成
- 类型通过
- 测试通过
- 权限正确
- timeline/log 补齐
- 不新增未解释字段
- 不污染 core

---

## 10. 给 Augment / Claude Code 的总控 Prompt

```text
你现在是一个资深全栈架构整理助手，不是重构执行器，也不是自由发挥的代码生成器。

目标：
我现在有一个已经在为首家客户使用的业务系统，技术栈是 NestJS + PostgreSQL + Vue。
我要把它从“首家客户项目”逐步演进成“可复制的 SaaS”，但当前阶段不能重开正式新项目，也不能做大重构。
你的任务是帮助我在现有仓库内做 SaaS 化整理。

你必须遵守以下原则：
1. 不建议重开新项目
2. 不建议大重构
3. 优先做结构盘点、模块分类、特有逻辑隔离、模板抽象建议
4. 所有分析都要按 core / template / custom 三层输出
5. 不要凭空发明业务，必须基于当前代码与模块
6. 不要直接输出大量代码，先输出结构判断和改造步骤
7. 优先保证当前项目还能持续交付第一家客户

请按下面格式输出：
1. 当前模块盘点
2. core / template / custom 分类建议
3. 最危险的污染点
4. 最小迁移步骤
5. 不建议现在做的事
```

---

## 11. 常用 Prompt 模板

### 11.1 项目盘点

```text
请扫描当前项目的主要模块、目录、接口、表结构和页面。
不要重构，不要改代码。
只输出：

1. 模块列表
2. 每个模块的职责
3. 每个模块属于 core / template / custom 哪一类
4. 哪些模块职责混乱
5. 哪些模块最可能污染未来 SaaS 核心

输出尽量表格化。
```

### 11.2 污染点识别

```text
请基于当前项目，识别最危险的 10 个 SaaS 污染点。

污染点定义：
- 首家客户特殊逻辑写进通用模块
- 状态流硬编码
- customer 和 case 混杂
- 权限只在前端控制
- document 只是附件不是结构化对象
- timeline/log 分散
- 模板逻辑写死在 service 中

对每个污染点输出：
- 位置
- 为什么危险
- 应该归类为 core / template / custom 哪一层
- 最小修正建议
```

### 11.3 最小迁移方案

```text
不要重构整个项目。
请在不重开仓、不大规模改动目录的前提下，输出一个最小迁移方案，让当前项目逐步演进成 SaaS 结构。

要求：
1. 先列出 2 周内能做的最小整理动作
2. 每个动作说明影响范围
3. 每个动作标注风险
4. 优先顺序从高到低
5. 必须保证第一家客户的交付节奏不被打断
```

### 11.4 分类清单

```text
请基于当前项目的模块、表结构和业务逻辑，生成一份功能分类清单。

分类规则：
- Core：大多数客户都会需要的稳定能力
- Template：某一类业务线会复用的能力
- Custom：首家客户专属逻辑

输出表格：
- 功能/模块名
- 当前位置
- 分类
- 是否建议保留到 SaaS 核心
- 是否需要迁移位置
- 备注
```

### 11.5 模板化抽象建议

```text
请只针对以下几类能力做模板抽象建议，不要改代码：

1. 案件类型
2. 状态流
3. 资料清单
4. 提醒规则
5. 文书模板

请输出：
- 当前是否硬编码
- 应抽成什么模板对象
- 应放在哪一层（template / custom）
- 现阶段最小可行抽象方式
- 什么时候再进一步通用化
```

### 11.6 目录迁移草案

```text
请根据当前项目结构，设计一个渐进式目录迁移草案。
目标不是一次性重构，而是未来新增代码逐步进入新结构。

目标结构包含：
- modules/core
- modules/templates
- modules/custom
- infra
- app

请输出：
1. 当前目录到目标目录的映射建议
2. 哪些目录现在不要动
3. 哪些新功能从今天开始必须放新位置
4. 哪些旧代码可以以后再迁移
```

### 11.7 单个子任务审查

```text
你现在只处理一个很小的任务，不要扩展范围，不要顺手重构别的东西。

任务目标：
[在这里写清楚目标]

上下文：
- 技术栈：NestJS + PostgreSQL + Vue
- 当前项目处于首家客户交付 → SaaS 演进阶段
- 架构原则：core / template / custom 分层
- 不允许重开新抽象层
- 不允许把客户特有逻辑放进 core
- 不允许修改未授权目录

你必须先输出：
1. 这个任务属于 core / template / custom 哪层
2. 会影响哪些模块
3. 是否涉及权限
4. 是否涉及状态流
5. 是否涉及数据库变更
6. 最小实现方案

在我确认前，不要直接输出完整代码。
```

---

## 12. 最后执行建议

### 你现在最该做的 5 件事

1. 冻结核心数据模型
2. 冻结状态流定义方式
3. 冻结最小权限模型
4. 建一个统一的 AI 子任务模板
5. 把现有需求全部打上 core / template / custom 标签

### 当前最优路线

- 继续用 Nest
- 继续用 PostgreSQL
- 现在就可以接 Redis
- 不上微服务
- 不换语言
- 不重开正式新项目
- 在现有仓库里逐步做 SaaS 化整理

---

## 13. 一句话总结

你现在最重要的，不是把“未来超大 SaaS 的全部基础设施”一次性铺满。  
而是把当前项目做成：

**能持续交付第一家客户，同时又能逐步长成 SaaS 的项目。**
