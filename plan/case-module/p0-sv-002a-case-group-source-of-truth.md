# Case.group / Customer.group 真相源口径

> **冻结日期**：2026-04-23
> **状态**：Batch 0 基线冻结
> **Todo ID**：`p0-sv-002a-case-group-source-of-truth`
> **用途**：冻结 Group 快照的读写归属、继承时机与权限边界。后续 Batch 1（server 主链）和 Batch 2（admin 主链）必须引用本文，不得自行发明口径。
> **上游基线**：[p0-authority-baseline §3](./p0-authority-baseline.md#3-group-快照与跨组留痕)
> **权威来源**：
> - [P0/02-版本范围与优先级 §2.12](../../docs/gyoseishoshi_saas_md/P0/02-版本范围与优先级.md)
> - [P0/03-业务规则与不变量 §2.2 / §10.2–10.6 / §12](../../docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md)
> - [P0/04-核心流程与状态流转 §4.1](../../docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md)
> - [P0/07-数据模型设计 §3.0 / §3.0A / §3.1 / §3.2 / §3.5 / §3.5A / §5](../../docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md)
> - [P0/08-术语表: Group / 三维访问控制](../../docs/gyoseishoshi_saas_md/P0/08-术语表.md)

---

## 0. 速查

| 维度 | 冻结口径 | 对应节 |
|------|---------|--------|
| 归属继承链 | `Lead.group → Customer.group → Case.group`（默认继承） | §1 |
| 快照语义 | `Case.group_id` 建案时写入后即为快照；`Customer.group` 后续变更不回写历史案件 | §2 |
| 读写归属 | 7 个写入时机 + 5 个读取消费方 | §3 |
| 跨组建案 | 可发生 + 必审计（操作人/时间/原因）+ 非默认跨组可见 | §4 |
| 转组留痕 | Case 转组 = 例外动作 + 审计日志 + 不修改历史提交包中的快照 | §4 |
| 权限边界 | `role × group × owner/collaborator`，view/edit/export 独立 | §5 |
| Group 治理 | 单层；创建/停用/重命名；被引用只停不删 | §6 |
| 服务端缺口 | 6 项 P0-Critical / Medium | §7 |
| 代码现状对照 | permissions.service.ts 已部分实现；DB schema 缺 | §8 |

---

## 1. 归属继承链

> 引用：03 §2.2、04 §4.1、07 §5

```
Lead.group_id ──(线索转化)──▶ Customer.group_id ──(建案)──▶ Case.group_id
```

### 1.1 继承时机

| 事件 | 源字段 | 目标字段 | 行为 | 例外路径 |
|------|--------|---------|------|---------|
| 新建线索 | 用户选择或默认当前用户主 Group | `Lead.group_id` | 写入 | — |
| 线索 → 客户 | `Lead.group_id` | `Customer.group_id` | 默认继承 | 转化时改组 → 记录原因/操作人/时间 |
| 手动新建客户 | 用户选择或默认当前用户主 Group | `Customer.group_id` | 写入 | — |
| 客户 → 案件（建案） | `Customer.group_id` | `Case.group_id` | 默认继承（快照） | 跨组建案 → 指定不同 group → §4 |
| 家族签批量建案 | `Customer.group_id`（主客户） | 各 `Case.group_id` | 默认继承 | 同跨组建案规则 |

### 1.2 不变量

- 每个继承节点都是**值拷贝**（快照），不是外键级联更新。
- 继承链**只在创建时生效一次**；后续上游变更不回写下游历史记录。
- P0 不做继承链的自动反向同步或批量回刷。

---

## 2. 快照语义

> 引用：03 §2.2、07 §3.5

### 2.1 Case.group_id 快照规则

| 规则 | 口径 |
|------|------|
| 写入时机 | 建案时写入（`INSERT`），取自 `Customer.group_id`（或跨组建案时的显式指定） |
| 后续变更 | `Customer.group_id` 被修改后，**不**回写已创建的 `Case.group_id` |
| 转组变更 | Case 自身的 group 可被显式转组（§4），但必须审计 |
| 历史提交包 | 已生成的 `SubmissionPackage` 中引用的 group 值**不因转组而修改** |
| S9 只读 | 案件进入 S9 后 group_id **不可变更** |

### 2.2 Customer.group_id 快照规则

| 规则 | 口径 |
|------|------|
| 写入时机 | 客户创建时写入（线索转化继承 `Lead.group_id`，或手动新建时指定） |
| 后续变更 | 可通过"调整 Group"动作修改（须留痕），但**不回写**已创建的 `Case.group_id` |
| 批量变更 | 支持列表批量调整客户 Group（现有 `bulk-change-group`），须留痕 |

### 2.3 Lead.group_id

| 规则 | 口径 |
|------|------|
| 写入时机 | 线索创建时写入 |
| 继承到客户 | 线索转化时默认继承到 `Customer.group_id`；改组须留痕 |
| P0 范围 | 线索模块不在本文详细展开，仅记录继承链入口 |

---

## 3. 读写归属矩阵

### 3.1 写入方（谁写 group_id）

| # | 写入场景 | 执行层 | 写入对象 | 约束 |
|---|---------|--------|---------|------|
| W1 | 新建线索 | server `leads.service` | `Lead.group_id` | 默认 = 当前用户主 Group |
| W2 | 线索转化为客户 | server `leads.service` / `customers.service` | `Customer.group_id` | 默认继承 `Lead.group_id`；改组须审计 |
| W3 | 手动新建客户 | server `customers.controller` | `Customer.group_id`（存于 `base_profile`） | 可指定；默认 = 当前用户主 Group |
| W4 | 建案 | server `cases.service.create()` | `Case.group_id` | 默认继承 `Customer.group_id`；跨组建案须审计 |
| W5 | 客户调整 Group | server `customers.controller` (PATCH / bulk-change-group) | `Customer.group_id`（存于 `base_profile`） | 须审计；不回写历史 Case |
| W6 | 案件转组 | server `cases.controller` (PATCH group_id) | `Case.group_id` | 须审计；S9 禁止；不修改已生成提交包 |
| W7 | Group 治理 | server `settings` / `groups` 模块 | `Group` 表 | 创建/停用/重命名；被引用只停不删 |

### 3.2 读取方（谁消费 group_id）

| # | 读取场景 | 消费层 | 读取对象 | 用途 |
|---|---------|--------|---------|------|
| R1 | 权限判断 | server `permissions.service` | `Case.group_id` / `Customer.group_id` + `user.groupId` | 决定 view/edit/export/audit 是否放行 |
| R2 | 列表筛选 | server controller + admin `scope=group` | `Case.group_id` / `Customer.group_id` | 按组过滤列表结果 |
| R3 | 仪表盘聚合 | server dashboard 模块 + admin | `Case.group_id` | 按组聚合统计 |
| R4 | 审计日志展示 | server audit / admin 日志 Tab | `AuditLog.after_data.group_id` | 显示 Group 变更历史 |
| R5 | 跨模块回链 | admin customers → cases 深链 | `Case.group_id` | 校验跨组可见性 |

---

## 4. 跨组建案与转组留痕

> 引用：03 §2.2、03 §5.1、07 §3.5A

### 4.1 跨组建案

**定义**：建案时 `Case.group_id` 与 `Customer.group_id` 不一致。

| 规则 | 口径 |
|------|------|
| 可发生性 | P0 允许跨组建案 |
| 权限前提 | 建案人须有目标 Group 的建案权限，或为管理员 |
| 审计要求 | 必须写入 `AuditLog`：`action_type=cross_group_case_create`，含 `操作人`、`时间`、`原因`（必填）、`source_group_id`（客户组）、`target_group_id`（案件组） |
| 可见性 | 跨组建案后，案件按自身 `group_id` 决定可见性；对客户原 Group 的用户不自动可见，须通过 `CaseCollaborator` 显式授权 |

### 4.2 案件转组

**定义**：已创建案件的 `Case.group_id` 被变更为另一个 Group。

| 规则 | 口径 |
|------|------|
| 触发条件 | 显式操作，非自动触发 |
| 权限前提 | 管理员或负责人（须有源/目标 Group 权限） |
| 审计要求 | 必须写入 `AuditLog`：`action_type=case_group_transfer`，含 `操作人`、`时间`、`原因`（必填）、`from_group_id`、`to_group_id` |
| S9 限制 | S9 已归档案件**禁止**转组 |
| 提交包影响 | 已生成 `SubmissionPackage` 中记录的 group 快照**不因转组而修改** |
| 可见性影响 | 转组后，原 Group 用户失去默认组可见性；如需保留可见性须通过 `CaseCollaborator` 显式授权 |

### 4.3 客户调整 Group

**定义**：`Customer.group_id` 被变更。

| 规则 | 口径 |
|------|------|
| 影响范围 | 仅影响后续新建案件的默认继承值；**不回写**已创建的 `Case.group_id` |
| 审计要求 | 须写入 `AuditLog`：`action_type=customer_group_change`，含变更前后值、操作人、时间 |
| 批量操作 | 支持列表批量调整（现有 `bulk-change-group`），每条变更独立审计 |

### 4.4 审计日志最小字段集

| 字段 | 类型 | 说明 |
|------|------|------|
| `object_type` | string | `case` / `customer` |
| `object_id` | string | 对象 ID |
| `action_type` | string | `cross_group_case_create` / `case_group_transfer` / `customer_group_change` |
| `before_data` | JSON | `{ group_id: "原值" }`（白名单字段） |
| `after_data` | JSON | `{ group_id: "新值" }` |
| `operation_reason` | string | 必填 |
| `operated_by` | string | 操作人 ID |
| `operated_at` | timestamp | 操作时间 |

---

## 5. 权限边界

> 引用：03 §10.2–10.6、07 §3.5A、08 术语表: 三维访问控制

### 5.1 三维度模型

内部侧对象级访问控制**同时考虑**三个维度：

```
授权结果 = f(role, group, owner/collaborator)
```

- **角色（role）**：`super_admin` / `office_manager` / `lawyer_or_scrivener` / `assistant` / `sales` / `finance`
- **Group**：用户主 Group (`UserGroupMembership.is_primary_group`) 与对象 `group_id` 的匹配
- **负责人/协作者**：`Case.ownerUserId` / `Case.assistantUserIds` / `CaseCollaborator`

跨组协作属于**显式授权**，不得被"同角色"默认放大。

### 5.2 案件权限矩阵（含 Group 维度）

| 动作 | 管理员 | 主办人 | 助理 | 销售 | 财务 |
|------|--------|--------|------|------|------|
| **view** | 全量 | 本组 + 负责/协作案件 | 本组 + 协作案件 | 不默认开放 | 收费相关视图 |
| **edit** | 全量 | 负责案件 | 协作案件的执行字段 | 不可 | 不可 |
| **export** | 受控开放（须留痕） | 受控开放（须留痕） | 默认关闭 | 默认关闭 | 财务相关受控开放 |
| **audit_view** | 全量 | 负责案件审计记录 | 自身操作记录 | 不可 | 不可 |

**"本组"定义**：`user.primaryGroupId === case.groupId`。

### 5.3 Group 在各权限动作中的角色

| 权限动作 | Group 维度的作用 | 与 owner/collaborator 的叠加关系 |
|---------|----------------|-------------------------------|
| `canViewCase` | staff 角色：**同组 OR 负责/协作**即可查看 | 两个维度取 OR |
| `canEditCase` | staff 角色：**必须为负责人或协作者**；同组不足以编辑 | group 仅影响 view |
| `canExportCase` | staff 角色：**必须为 owner**（当前口径） | group 不影响 export |
| `canAuditCase` | staff 角色：**必须为负责人或协作者** | group 不影响 audit |
| `canAccessCustomer` | 管理员全量；staff：**同组 OR owner/collaborator** | 两个维度取 OR |

### 5.4 Group 与列表筛选

| 筛选 scope | 含义 | 服务端过滤逻辑 |
|------------|------|--------------|
| `mine` | 我负责/协作的 | `owner_user_id = userId OR collaborator` |
| `group` | 我所在组的 | `group_id = userPrimaryGroupId` |
| `all` | 全量（需管理员权限） | 无 group 过滤 |

### 5.5 userGroupId 来源

| 传递路径 | 现状 | 冻结口径 |
|---------|------|---------|
| `x-group-id` header（不安全） | 已实现，`requestContext.groupId` 可读取 | 仅开发/测试使用 |
| JWT payload `groupId` | `signRequestAuthToken()` 可写入，但 `extractAuthInputFromPayload()` **未读取** | **P0-Critical 缺口**：必须在 JWT 验证时读取 `payload.groupId` |
| DB 查询 `UserGroupMembership` | 表不存在 | 生产环境应从 DB 读取用户主 Group，JWT 仅作为缓存 |

---

## 6. Group 治理

> 引用：03 §12、07 §3.0 / §3.0A

### 6.1 Group 实体

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid | PK |
| `org_id` | uuid | FK → organizations |
| `group_no` | string? | 组织内可读编号（可选） |
| `name` | string | 组名 |
| `description` | string? | 描述（可选） |
| `active_flag` | boolean | `true` = 启用；`false` = 已停用 |
| `created_by` | uuid | 创建人 |
| `created_at` | timestamp | 创建时间 |
| `updated_by` | uuid | 更新人 |
| `updated_at` | timestamp | 更新时间 |

### 6.2 UserGroupMembership 实体

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → users |
| `group_id` | uuid | FK → groups |
| `is_primary_group` | boolean | 用户主 Group（决定默认继承与权限判断） |
| `active_flag` | boolean | 成员关系状态 |
| `joined_at` | timestamp | 加入时间 |
| `left_at` | timestamp? | 离组时间（可选） |

### 6.3 治理规则

| 规则 | 口径 |
|------|------|
| 层级 | P0 单层治理，不做层级树 |
| 操作 | 创建/停用/重命名，入口在系统设置 |
| 删除 | 被 `Customer` / `Case` 引用过的 Group **仅允许停用**，不做物理删除 |
| 定义 | Group ≠ 企业客户 ≠ 来源渠道 ≠ 普通标签 |
| 用户关联 | 一个用户可属于多个 Group（通过 `UserGroupMembership`），但有且仅有一个 `is_primary_group=true` |

---

## 7. 服务端缺口

| # | 缺口 | 严重度 | 现状 | 冻结口径 | 影响批次 |
|---|------|--------|------|---------|---------|
| G1 | `groups` 表不存在 | **P0-Critical** | 无 DDL、无 TypeScript entity | 必须创建（07 §3.0） | Batch 1 `p0-sv-002b` |
| G2 | `user_group_memberships` 表不存在 | **P0-Critical** | 无 DDL、无 TypeScript entity | 必须创建（07 §3.0A） | Batch 1 `p0-sv-002b` |
| G3 | `cases.group_id` 列不存在于 DDL | **P0-Critical** | `coreEntities.Case.groupId` 和 `mapCaseRow()` 已预留映射；但 SQL migration 未添加列 | 必须添加 column + FK → groups；历史数据 backfill | Batch 1 `p0-sv-002b` |
| G4 | `customers.group_id` 仅存于 `base_profile` JSON | **P0-Medium** | `customers.utils.ts` 读取 `["group", "group_id", "groupId"]`；`isCustomerInGroup()` 只读 `["group_id", "groupId"]`（不含 `"group"`） | 统一到 `base_profile.group_id`（或独立列）；`isCustomerInGroup()` 与 `CUSTOMER_GROUP_FIELDS` 对齐 | Batch 1 `p0-sv-002b` |
| G5 | JWT 验证不读取 `groupId` | **P0-Medium** | `extractAuthInputFromPayload()` 只返回 `{ orgId, userId }`；`signRequestAuthToken()` 可写入但验证时丢弃 | 验证时读取 `payload.groupId`，或生产环境从 DB 查 `UserGroupMembership` | Batch 1 `p0-sv-002` |
| G6 | 跨组/转组审计 | **P0-Medium** | 不存在 `AuditLog` 表；Group 变更无审计 | 写入 AuditLog（§4.4 字段集） | Batch 1 `p0-sv-003`+ |

---

## 8. 代码现状对照

### 8.1 permissions.service.ts（已部分实现）

| 方法 | 现状 | 与冻结口径的差距 |
|------|------|-----------------|
| `canViewCase(role, ctx, case)` | admin 全量；staff = **同组 OR 参与人**；viewer = 仅参与人 | ✅ 与 §5.2 view 一致 |
| `canEditCase(role, ctx, case)` | staff = **仅参与人**（同组不足以编辑） | ✅ 与 §5.2 edit 一致 |
| `canExportCase(role, ctx, case)` | staff = **仅 owner** | ✅ 与 §5.2 export 一致 |
| `canAuditCase(role, ctx, case)` | staff = **仅参与人** | ✅ 与 §5.2 audit 一致 |
| `canAccessCustomer(role, ctx, cust)` | admin 全量；staff = **同组 OR owner/collaborator** | ⚠️ `isCustomerInGroup()` 字段列表不含 `"group"`，与 `CUSTOMER_GROUP_FIELDS` 不一致（G4） |

### 8.2 coreEntities.ts

| 类型 | 现状 | 差距 |
|------|------|------|
| `Case` | 有 `groupId: string \| null` | ✅ 类型已预留 |
| `Customer` | 无顶层 `groupId`；group 存于 `baseProfile` JSON | ⚠️ 读取路径需统一（G4） |
| `Group` | 不存在 | ❌ 需创建（G1） |
| `UserGroupMembership` | 不存在 | ❌ 需创建（G2） |

### 8.3 cases.service.ts

| 逻辑 | 现状 | 差距 |
|------|------|------|
| `mapCaseRow()` | 读取 `row.group_id ?? null` → `Case.groupId` | ✅ 映射已就位 |
| `create()` | 未在 SQL 中写入 `group_id` | ❌ DDL 缺列（G3）；建案时须写入 |
| 转组 | 无 PATCH group_id 逻辑 | ❌ 需实现 + 审计（G6） |

### 8.4 requestContext.ts

| 路径 | 现状 | 差距 |
|------|------|------|
| `x-group-id` header | 可读取到 `requestContext.groupId` | 仅开发/测试用 |
| JWT 签发 | `signRequestAuthToken()` 可写 `groupId` | ✅ |
| JWT 验证 | `extractAuthInputFromPayload()` **不读** `groupId` | ❌ G5 |

---

## 9. 下游引用清单

| 下游 Todo / 批次 | 依赖本文的节 |
|-----------------|-------------|
| `p0-sv-002b-case-group-schema-migration-backfill` | §6（Group/UGM schema）、§7 G1–G4（DDL 缺口） |
| `p0-sv-002-permission-matrix` | §5（三维权限模型）、§8.1（permissions 现状） |
| `p0-sv-003`–`p0-sv-007`（server 契约） | §3（读写归属）、§4（跨组/转组审计） |
| `p0-fe-001`–`p0-fe-008`（admin 主链） | §2（快照语义）、§5.4（列表筛选 scope） |
| `p0-fe-009`–`p0-fe-012`（跨模块） | §1（继承链）、§4.3（客户调整 Group 不回写 Case） |

---

## 10. 冻结确认

| # | 冻结项 | 状态 | 待解决项 |
|---|--------|------|---------|
| 1 | 归属继承链 | ✅ 冻结 | — |
| 2 | Case.group_id 快照语义 | ✅ 冻结 | DDL 缺列（G3） |
| 3 | Customer.group_id 读写路径 | ✅ 冻结（统一到 `base_profile.group_id`） | 字段对齐（G4） |
| 4 | 跨组建案审计 | ✅ 冻结 | AuditLog 表缺失（G6） |
| 5 | 案件转组审计 | ✅ 冻结 | AuditLog 表缺失（G6） |
| 6 | 权限三维模型 | ✅ 冻结 | JWT groupId 不读取（G5） |
| 7 | Group 治理规则 | ✅ 冻结 | Group/UGM 表缺失（G1/G2） |
| 8 | 写入归属矩阵 | ✅ 冻结 | — |
| 9 | 读取消费方 | ✅ 冻结 | — |

所有 9 项已冻结。后续 Batch 1–3 实施必须以本文为准。
