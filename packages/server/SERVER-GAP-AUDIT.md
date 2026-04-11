# Server Gap Audit — P0 实体与字段缺口盘点

> **生成日期**：2026-04-11
> **权威来源**：[P0/07-数据模型设计](../../docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md)、[P0/03-业务规则与不变量](../../docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md)
> **盘点范围**：`packages/server/src/infra/db/drizzle/schema.ts`、SQL migrations（001–014）、`packages/server/src/modules/core/` 全部模块

---

## 1. 现有实体清单

### 1.1 Drizzle schema.ts 中定义（7 张表）

| 表                   | P0 对应实体      | 状态                                                                                    |
| -------------------- | ---------------- | --------------------------------------------------------------------------------------- |
| `organizations`      | Organization     | ✅ 可用                                                                                 |
| `users`              | User             | ✅ 可用，缺 Group 关联                                                                  |
| `customers`          | Customer         | ⚠️ 字段结构不匹配（JSON 大字段 vs P0 个体字段）                                         |
| `companies`          | **P0 不使用**    | ⚠️ P0 明确排除 Company 实体，雇主信息应沉淀在 Case.employer\_\*                         |
| `cases`              | Case             | ⚠️ Drizzle 定义缺大量 P0 字段（coreEntities.ts 类型更完整，migration 014 可能已补部分） |
| `communication_logs` | CommunicationLog | ⚠️ 缺 lead_id、requirement_id、outcome_summary、visible_scope                           |
| `residence_periods`  | ResidencePeriod  | ✅ 基本对齐                                                                             |

### 1.2 SQL 表存在但未纳入 Drizzle（通过 service 层 raw SQL 操作）

| 表                | P0 对应实体                | 模块                  | 状态                                                                                |
| ----------------- | -------------------------- | --------------------- | ----------------------------------------------------------------------------------- |
| `billing_records` | BillingPlan                | `core/billing`        | ⚠️ 状态枚举不匹配                                                                   |
| `payment_records` | PaymentRecord              | `core/billing`        | ⚠️ 缺 void/reverse 机制                                                             |
| `reminders`       | Reminder                   | `core/reminders`      | ⚠️ 缺 dedupe_key、channel、retry_count                                              |
| `document_items`  | DocumentRequirement        | `core/document-items` | ⚠️ 初始状态 `pending` 应为 `not_sent`；缺 provided_by_role 等                       |
| `document_files`  | DocumentFileVersion        | `core/document-files` | ⚠️ 缺 asset_id（无 DocumentAsset 层）；缺 visible_scope、storage_type/relative_path |
| `tasks`           | Task                       | `core/tasks`          | ⚠️ 状态枚举不匹配；缺 source_key、canceled_reason 等                                |
| `timeline_logs`   | TimelineLog（非 AuditLog） | `core/timeline`       | ⚠️ 不等同于 P0 AuditLog（缺 before/after_data、operation_reason）                   |
| `case_parties`    | CaseParty                  | `core/case-parties`   | 需字段审计                                                                          |

### 1.3 P0 要求但完全缺失的实体（18 个）

| 优先级          | 缺失实体                     | P0 章节 | 影响范围                                   |
| --------------- | ---------------------------- | ------- | ------------------------------------------ |
| **P0-Critical** | `Group`                      | §3.0    | 访问控制核心维度，所有列表/筛选/可见性依赖 |
| **P0-Critical** | `SubmissionPackage`          | §3.18   | 提交包锁定——P0 核心不变规则                |
| **P0-Critical** | `SubmissionPackageItem`      | §3.19   | 提交包引用明细                             |
| **P0-Critical** | `ValidationRun`              | §3.16   | Gate-A/B/C 校验记录，阶段推进强依赖        |
| **P0-Critical** | `DocumentAsset`              | §3.9A   | 资料资产层——四层模型第二层                 |
| **P0-Critical** | `DocumentRequirementFileRef` | §3.10A  | 资料引用层——四层模型第四层                 |
| **P0-High**     | `CaseStageHistory`           | §3.6    | 阶段流转审计与回退记录                     |
| **P0-High**     | `CaseTemplate`               | §3.8    | 驱动资料清单与校验规则的预置模板           |
| **P0-High**     | `GeneratedDocumentVersion`   | §3.15   | 文书版本不可变、提交包引用                 |
| **P0-High**     | `Lead`                       | §3.1    | 咨询线索与签约前跟进                       |
| **P0-High**     | `CaseDeadline`               | §3.13   | 统一期限建模、提醒触发                     |
| **P0-High**     | `CaseCollaborator`           | §3.5A   | 多人协作与跨组授权                         |
| **P0-Medium**   | `UserGroupMembership`        | §3.0A   | 用户与 Group 多对多                        |
| **P0-Medium**   | `OrgSetting`                 | §3.0B   | 事务所级设置（本地资料根目录）             |
| **P0-Medium**   | `Template`（文书模板）       | §3.14   | 预置文书模板                               |
| **P0-Medium**   | `ReviewRecord`               | §3.17   | 双人复核（P0 预留，默认关闭）              |
| **P0-Medium**   | `Survey`                     | §3.1A   | 结构化问卷                                 |
| **P0-Low**      | `CustomerRelation`           | §3.2A   | 客户侧关联人关系                           |

---

## 2. 关键枚举对齐缺口

### 2.1 BillingPlan 状态（最大偏差）

| Server 当前        | P0 §3.20 / §4 枚举    | 说明                                           |
| ------------------ | --------------------- | ---------------------------------------------- |
| `unquoted`         | —                     | P0 无此状态                                    |
| `quoted_pending`   | —                     | P0 无此状态                                    |
| `awaiting_payment` | `due`（应收）         | 语义等价但 key 不同                            |
| `partial_paid`     | `partial`（部分回款） | 语义等价但 key 不同                            |
| `settled`          | `paid`（已回款）      | 语义等价但 key 不同                            |
| `refunded`         | —                     | P0 无此状态                                    |
| —                  | `overdue`（欠款）     | **Server 完全缺失**；P0 要求欠款为独立节点状态 |

**结论**：Server billing 实现的是"报价→付款"全生命周期，而 P0 要求的是"节点状态"模型。需要将 billing_records 表重新定义为 P0 BillingPlan，状态枚举改为 `due / partial / paid / overdue`。Server 的 `unquoted`→`quoted_pending` 报价流程在 P0 中不存在。

### 2.2 Task 状态

| Server 当前   | P0 §3.12 / §4 枚举 | 状态                       |
| ------------- | ------------------ | -------------------------- |
| `pending`     | `todo`             | key 不一致                 |
| `in_progress` | `doing`            | key 不一致                 |
| `completed`   | `done`             | key 不一致                 |
| `cancelled`   | `canceled`         | key 不一致（双 l vs 单 l） |

**结论**：语义等价但所有 key 都不一致。需要迁移到 P0 枚举。

### 2.3 Task 类型 / 来源

| Server task_type     | P0 source_type | 说明                                                                  |
| -------------------- | -------------- | --------------------------------------------------------------------- |
| `general`            | `manual`       | 概念混淆：P0 区分 task_type（催办/审核/修复等）和 source_type（来源） |
| `document_follow_up` | `requirement`  | —                                                                     |
| `client_contact`     | —              | —                                                                     |
| `submission`         | `submission`   | —                                                                     |
| `review`             | —              | —                                                                     |

**结论**：P0 要求 `task_type` 和 `source_type` 是两个独立字段。Server 目前只有混合的 task_type + source_type/source_id。需要补齐 `source_key`（去重键）和 `canceled_reason_code/note`。

### 2.4 DocumentItem 初始状态

| Server 当前 | P0 §4 枚举 |
| ----------- | ---------- |
| `pending`   | `not_sent` |

**结论**：初始状态 key 不同。P0 明确为 `not_sent`（未发送），Server 用 `pending`。需要迁移。

### 2.5 PaymentRecord 缺失字段

Server `PaymentRecord` 缺失以下 P0 必需字段：

| 缺失字段                                                | P0 §3.20 说明                                                   |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `record_status`                                         | `valid / voided / reversed` — **P0 核心规则：回款不可物理删除** |
| `void_reason_code / void_reason_note`                   | 作废/冲正原因                                                   |
| `voided_by / voided_at`                                 | 作废操作留痕                                                    |
| `reversed_from_payment_record_id`                       | 冲正关联原记录                                                  |
| `note`                                                  | 备注                                                            |
| `receipt_storage_type` / `receipt_relative_path_or_key` | P0 本地资料登记路径                                             |

**结论**：Server 当前 paymentRecords 允许 DELETE（物理删除），违反 P0 §6.2 强规则。必须改为 void/reverse 机制。

---

## 3. Case 字段缺口

### 3.1 Drizzle schema.ts vs coreEntities.ts

`coreEntities.ts` 的 Case 类型已包含大部分 P0 字段（migration 014 可能已补），但 Drizzle schema.ts 仍缺：

| 字段                           | coreEntities.ts | Drizzle schema.ts | P0 §3.5  |
| ------------------------------ | --------------- | ----------------- | -------- |
| `resultOutcome`                | ✅              | ❌                | 必须     |
| `quotePrice`                   | ✅              | ❌                | 可选     |
| `depositPaidCached`            | ✅              | ❌                | 可选     |
| `finalPaymentPaidCached`       | ✅              | ❌                | 可选     |
| `billingUnpaidAmountCached`    | ✅              | ❌                | 可选     |
| `billingRiskAcknowledged*`     | ✅              | ❌                | 可选     |
| `overseasVisaStartAt`          | ✅              | ❌                | 可选     |
| `entryConfirmedAt`             | ✅              | ❌                | 可选     |
| `groupId`                      | ❌              | ❌                | **必须** |
| `sourceLeadId`                 | ❌              | ❌                | 可选     |
| `employer_*` 字段族            | ❌              | ❌                | 可选     |
| `nextAction / nextActionDueAt` | ❌              | ❌                | 可选     |
| `latestValidationRunId`        | ❌              | ❌                | 可选     |
| `hasBlockingIssueFlag`         | ❌              | ❌                | 可选     |
| `nextDeadlineDueAt`            | ❌              | ❌                | 可选     |

**结论**：`group_id` 是 P0 访问控制的核心维度，**必须**在 Case 上添加。其余聚合缓存字段可在最小闭环后逐步补齐。Drizzle schema.ts 需与 migration 014 同步。

### 3.2 Customer 字段缺口

Server Customer 使用 `baseProfile` (JSONB) + `contacts` (JSONB array) 存储，P0 要求个体字段：

| P0 必须字段                         | Server 状态                    | 说明           |
| ----------------------------------- | ------------------------------ | -------------- |
| `customer_no`                       | ❌                             | 可读编号       |
| `display_name`                      | ❌                             | 对内识别名     |
| `name_cn/jp/en/kana`                | ❌（在 baseProfile JSON 中？） | 多语言姓名     |
| `phone / email`                     | ❌（在 contacts JSON 中？）    | 联系方式       |
| `group_id`                          | ❌                             | **P0 强依赖**  |
| `owner_user_id`                     | ❌                             | 负责人         |
| `location`                          | ❌                             | OVERSEAS/JAPAN |
| `gender / nationality / birth_date` | ❌                             | 基础人口学字段 |

**结论**：Customer 需要从 JSON 大字段迁移到结构化字段。`group_id` 和 `owner_user_id` 是 P0 必须。

---

## 4. 最小落地闭环排序

基于"先不变量、后扩展"原则，将缺口按依赖顺序排列为 4 个批次：

### 批次 A — 访问控制基础（无此无法做列表/筛选）

| 变更                                               | 类型 | 说明                                  |
| -------------------------------------------------- | ---- | ------------------------------------- |
| 创建 `groups` 表                                   | DDL  | P0 §3.0，含 org_id、name、active_flag |
| 创建 `user_group_memberships` 表                   | DDL  | P0 §3.0A                              |
| `cases` 表添加 `group_id` 列                       | DDL  | FK → groups；P0 访问控制核心          |
| `customers` 表添加 `group_id` + `owner_user_id` 列 | DDL  | P0 继承链起点                         |
| Drizzle schema.ts 同步                             | 代码 | 补齐 014 migration 已添加的字段       |

### 批次 B — 收费语义修正（消除双事实来源）

| 变更                                               | 类型     | 说明                                                                                                                    |
| -------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `billing_records` 状态枚举迁移                     | DDL+数据 | `awaiting_payment→due`, `partial_paid→partial`, `settled→paid`；新增 `overdue`；移除 `unquoted/quoted_pending/refunded` |
| `payment_records` 添加 void/reverse 字段           | DDL      | `record_status`、`void_reason_code`、`voided_by`、`reversed_from_payment_record_id` 等                                  |
| 禁止 `payment_records` 物理 DELETE                 | 代码     | PaymentRecords controller/service 改为 void/reverse 端点                                                                |
| `billing_records` 重命名为 `billing_plans`（可选） | DDL      | 对齐 P0 命名                                                                                                            |

### 批次 C — 提交包与校验（P0 核心不变规则）

| 变更                                     | 类型     | 说明                                               |
| ---------------------------------------- | -------- | -------------------------------------------------- |
| 创建 `validation_runs` 表                | DDL      | P0 §3.16；Gate-A/B/C 校验记录                      |
| 创建 `submission_packages` 表            | DDL      | P0 §3.18；提交包不可变快照                         |
| 创建 `submission_package_items` 表       | DDL      | P0 §3.19；锁定引用明细                             |
| 创建 `case_stage_histories` 表           | DDL      | P0 §3.6；阶段流转审计                              |
| Cases 状态转移逻辑添加 Gate 校验         | 代码     | `cases.service.ts` transition 须检查 ValidationRun |
| `document_items` 初始状态改为 `not_sent` | DDL+数据 | 对齐 P0 枚举                                       |

### 批次 D — 补齐辅助实体

| 变更                                                                               | 类型     | 说明                                                                        |
| ---------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| 创建 `document_assets` 表                                                          | DDL      | P0 §3.9A；资料资产层                                                        |
| 创建 `document_requirement_file_refs` 表                                           | DDL      | P0 §3.10A；引用关系层                                                       |
| `document_files` 添加 `asset_id`、`visible_scope`、`storage_type`、`relative_path` | DDL      | 对齐四层资料模型                                                            |
| 创建 `generated_document_versions` 表                                              | DDL      | P0 §3.15；文书版本                                                          |
| 创建 `case_templates` 表                                                           | DDL      | P0 §3.8；预置 3 类模板                                                      |
| 创建 `leads` 表                                                                    | DDL      | P0 §3.1；咨询线索                                                           |
| 创建 `case_collaborators` 表                                                       | DDL      | P0 §3.5A                                                                    |
| 创建 `case_deadlines` 表                                                           | DDL      | P0 §3.13                                                                    |
| `tasks` 状态枚举迁移                                                               | DDL+数据 | `pending→todo`, `in_progress→doing`, `completed→done`, `cancelled→canceled` |
| `tasks` 添加 `source_key`、`canceled_reason_code`、`canceled_reason_note`          | DDL      | P0 §3.12 去重与取消原因                                                     |
| 创建 `org_settings` 表                                                             | DDL      | P0 §3.0B                                                                    |
| `reminders` 添加 `dedupe_key`、`channel`、`retry_count`                            | DDL      | P0 §3.21                                                                    |

---

## 5. 风险热点

| 风险                               | 等级        | 说明                                                                       |
| ---------------------------------- | ----------- | -------------------------------------------------------------------------- |
| `group_id` 缺失                    | 🔴 Critical | 所有列表/筛选/工作台都无法按 P0 的组别可见性工作                           |
| 收费状态枚举不兼容                 | 🔴 Critical | Server 的 billing 流程模型与 P0 完全不同；迁移需要停服或双写               |
| 回款允许物理删除                   | 🔴 Critical | 违反 P0 §6.2 强规则（不可删除，只能 void/reverse）                         |
| 无提交包/校验记录                  | 🟠 High     | P0 核心不变规则无法落地；所有 Gate 校验和版本锁定都无支撑                  |
| Customer 字段 JSON 化              | 🟠 High     | baseProfile/contacts JSON 无法支持 P0 要求的个体字段查询与索引             |
| 资料四层模型仅有两层               | 🟠 High     | 无 DocumentAsset 和 DocumentRequirementFileRef；跨案复用和版本引用无法实现 |
| Task 枚举全部不匹配                | 🟡 Medium   | 语义等价但 key 不同，客户端和原型都使用 P0 枚举，需要数据迁移              |
| Drizzle schema 与 migration 不同步 | 🟡 Medium   | 014_case_truth 添加的字段未反映到 Drizzle schema.ts                        |

---

## 6. 建议执行顺序

```
批次 A（访问控制）→ 批次 B（收费修正）→ 批次 C（提交包/校验）→ 批次 D（辅助实体）
      ↓                     ↓                      ↓                      ↓
   ~2-3 天              ~2-3 天                ~3-5 天                ~3-5 天
```

**最小可运行闭环** = 批次 A + 批次 B = Group 治理 + 收费语义修正。
完成这两批后，案件列表、收费管理、工作台的核心数据路径可以不再误导。

**完整 P0 闭环** = 全部四批。
批次 C 和 D 完成后，Gate 校验、提交包锁定、四层资料模型可落地。

---

## 7. 不在本次审计范围

- 具体 migration SQL 编写（属于 `server-land-*` 系列任务）
- 客户端 domain/model 接入（属于 `client-*` 系列任务）
- Drizzle schema.ts 的完整重写（属于 Drizzle 同步子任务）
- 性能优化与索引（P0 §6 索引建议可在落地时一并处理）
