# 案件模块 P0 权威规则基线

> **冻结日期**：2026-04-23
> **状态**：Batch 0 基线冻结
> **用途**：作为 Batch 1–3（P0 server + admin + 跨模块）实施的唯一规则基线。后续 server/admin 批次实现必须引用本文，不得自行发明规则。
> **权威来源**：
> - [P0/02-版本范围与优先级](../../docs/gyoseishoshi_saas_md/P0/02-版本范围与优先级.md)
> - [P0/03-业务规则与不变量](../../docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md)
> - [P0/04-核心流程与状态流转](../../docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md)
> - [P0/07-数据模型设计](../../docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md)
> - [P0/06-页面规格/案件-需求门禁](../../docs/gyoseishoshi_saas_md/P0/06-页面规格/案件-需求门禁/artifacts/requirement_summary.md)
> - [prototype/P0-CONTRACT-DETAIL](../../packages/prototype/admin/case/P0-CONTRACT-DETAIL.md)
> - [server/SERVER-GAP-AUDIT](../../packages/server/SERVER-GAP-AUDIT.md)

---

## 0. 速查：8 项冻结基线

| # | 基线项 | 冻结口径 | 权威节 |
|---|--------|---------|--------|
| 1 | S1–S9 阶段 | 9 阶段 + 流转矩阵 + 进入条件 | §1 |
| 2 | Gate-A/B/C | 三道 Gate，硬性/软性分层，重新校验触发 | §2 |
| 3 | Group 快照 | `Case.group_id` 快照继承，跨组建案/转组留痕 | §3 |
| 4 | 导出权限 | view ≠ export，导出/下载/分享必审计 | §4 |
| 5 | 补正包 | `related_submission_id` 关联原包，补正在 S7 内闭环 | §5 |
| 6 | 审计白名单 | 白名单字段策略，审计日志不可删、查看权限独立 | §6 |
| 7 | 本地归档 | `storage=local_server` + `relative_path`，P0 不存 SaaS 文件本体 | §7 |
| 8 | S9 只读 | 归档后除日志外全字段只读 | §8 |

---

## 1. S1–S9 阶段定义与流转规则

> 引用：03 §3.1、04 §2、07 §4

### 1.1 阶段枚举（唯一权威）

| 代号 | 阶段 | 进入条件 | 典型动作 |
|------|------|---------|---------|
| `S1` | 已建档 | 已签约/已立案，主申请人、案件类型、负责人已明确 | 确认客户信息，生成资料清单 |
| `S2` | 资料收集中 | 资料清单已生成并发出至少一轮资料请求 | 等待客户提交/内部登记，催办 |
| `S3` | 资料审核中 | 已有客户提交或内部登记资料，开始审核 | 审核/退回/标记豁免 |
| `S4` | 文书制作中 | **Gate-A 通过** | 生成模板文书，整理定稿 |
| `S5` | 待校验 | **Gate-B 通过** | 执行校验，生成校验报告 |
| `S6` | 待提交 | 最新校验通过，复核要求已满足（如启用） | 准备提交信息 |
| `S7` | 已提交审理中 | **Gate-C 通过**，已生成提交包 | 等待结果，处理补正 |
| `S8` | 已出结果 | 已登记结果与结果日期 | 通知客户，确认后续动作 |
| `S9` | 已归档 | 案件已结案并完成归档动作 | 资料归档，续签提醒确认 |

### 1.2 流转矩阵

```
S1 → S2, S9
S2 → S3, S9
S3 → S2, S4, S9
S4 → S3, S5, S9
S5 → S3, S4, S6, S9
S6 → S5, S7, S9
S7 → S8, S9
S8 → S9
S9 → (终态，不可流转)
```

每个阶段都允许直接到 S9（异常结案），但补正在 S7 内闭环，不回退主阶段。

### 1.3 冻结不变量

- 阶段只是协作视图，**不能成为绕开 Gate 的替代通道**。
- 阶段推进必须由服务端重新校验前置条件，不能只依赖页面状态。
- P0 不得通过伪造阶段值跳过 `ValidationRun` 或 `SubmissionPackage`。
- `CaseStageHistory` 必须记录每次阶段变更（from_stage、to_stage、reason、changed_by、changed_at）。
- P0 只使用 `S1–S9` 管理阶段；业务子步骤 `CaseWorkflowStep` 后置到 P1。

### 1.4 服务端缺口

| 缺口 | 现状 | 冻结口径 |
|------|------|---------|
| `CaseStageHistory` 表 | 不存在 | 必须创建，每次 transition 写入 |
| `transition` 端点无资源级鉴权 | 只有 `@RequireRoles("staff")` | 必须叠加 `canEditCase()` |
| Gate 校验未绑定阶段流转 | `transition` 未检查 Gate-A/B/C 前置条件 | S3→S4 须 Gate-A；S4→S5 须 Gate-B；S6→S7 须 Gate-C |

---

## 2. Gate-A/B/C 校验规则

> 引用：03 §4、04 §3

### 2.1 三道 Gate 概览

| Gate | 触发点 | 通过后动作 |
|------|--------|-----------|
| Gate-A | `S3 → S4` 或首次生成关键文书前 | 进入文书制作，生成/更新文书任务 |
| Gate-B | `S4 → S5` 或主动进入校验 | 生成 `ValidationRun` 校验报告 |
| Gate-C | 点击"正式提交" | 生成 `SubmissionPackage`，阶段进入 `S7` |

### 2.2 Gate-A：进入文书

| 层级 | 校验项 |
|------|--------|
| **硬性阻断** | 关键关系人（CaseParty）齐备；关键资料项达到可做文书的最低门槛（`approved`） |
| **软性提示** | 附件版本过旧但未过期、关键信息疑似未更新、欠款风险 |

### 2.3 Gate-B：进入提交前校验

| 层级 | 校验项 |
|------|--------|
| **硬性阻断** | 关键文书已定稿（`final`）；必交资料项齐备且通过；关键字段必填完成 |
| **软性提示** | 日期逻辑/有效期风险、材料时效建议、收费节点异常 |

### 2.4 Gate-C：提交（生成提交包前）

| 层级 | 校验项 |
|------|--------|
| **硬性阻断** | 最新一次校验结果为通过（`ValidationRun.result_status=passed`）；如启用双人复核则复核通过；提交信息字段满足最小要求（提交日期/机关/回执等） |
| **软性提示** | 欠款风险、非关键材料建议补充 |
| **欠款特别规则** | 若存在欠款风险且仍要提交，必须先完成风险确认留痕（确认人、原因，可选上传凭证） |

### 2.5 重新校验触发条件

以下变化发生后，必须重新生成 `ValidationRun`（已有校验结果变为 stale）：

1. 任一必交资料项新增了附件版本且被审核通过/退回补正
2. 任一关键关系人（CaseParty）新增/删除/角色变更
3. 任一关键字段发生变更（姓名、在留期限、住址、雇主信息等按模板定义）
4. 任一关键文书发生变更或重新定稿
5. 复核启用策略发生变化

### 2.6 服务端缺口

| 缺口 | 现状 | 冻结口径 |
|------|------|---------|
| `ValidationRun` 表 | 不存在 | 必须创建（07 §3.16） |
| `ReviewRecord` 表 | 不存在 | 必须创建，P0 默认关闭（07 §3.17） |
| Gate 职责绑定 | `validateReadyForInternalReview()` 把 S4→S5 绑定为"必须已存在 passed ValidationRun + approved ReviewRecord"，与文档不一致 | Gate-B 负责执行校验并沉淀 ValidationRun；S5→S6 才读取最新 passed ValidationRun |
| Gate-C 实现 | 不存在 | 必须实现：校验通过 + 复核通过（如启用）→ 生成 SubmissionPackage |

---

## 3. Group 快照与跨组留痕

> 引用：03 §2.2、03 §12、07 §3.5

### 3.1 归属继承链

```
Lead.group → Customer.group → Case.group（默认继承）
```

- **`Case.group_id` 是案件归属快照**：`Customer.group_id` 的后续变更不回写覆盖历史案件。
- 建案时默认继承 `Customer.group_id`；如建案时指定不同 group，视为跨组建案。

### 3.2 跨组建案/转组留痕

跨组建案和转组是例外动作，执行时**必须留痕**：

| 留痕字段 | 说明 |
|---------|------|
| 操作人 | 执行跨组建案/转组的用户 |
| 时间 | 操作时间戳 |
| 原因 | 跨组原因（必填） |

留痕必须写入审计日志（`AuditLog`），不能只记录在内存/前端。

### 3.3 Group 治理

| 规则 | 口径 |
|------|------|
| 层级 | P0 只做单层治理，不做层级树 |
| 操作 | 创建/停用/重命名，入口在系统设置 |
| 删除 | 被 Customer/Case 引用过的 Group 仅允许停用，不做物理删除 |
| 定义 | Group ≠ 企业客户 ≠ 来源渠道 ≠ 普通标签 |

### 3.4 服务端缺口

| 缺口 | 现状 | 冻结口径 |
|------|------|---------|
| `Case.group_id` 字段 | 不存在 | **P0-Critical**：必须在 cases 表添加，FK → groups |
| `Group` 表 | 不存在 | **P0-Critical**：必须创建（07 §3.0） |
| `UserGroupMembership` 表 | 不存在 | 必须创建（07 §3.0A） |
| `canAccessCase()` 不检查 group | 只检查 `manager` 或 `owner/assistant` | 必须叠加 group 维度 |
| 跨组建案/转组审计 | 不存在 | 建案和转组 group 时必须写 AuditLog |

---

## 4. 导出权限与审计

> 引用：03 §10.4、03 §5、02 §2.13

### 4.1 可见 ≠ 可导出

权限表达拆分为三个独立动作：

| 动作 | 含义 |
|------|------|
| **view** | 查看对象详情/列表 |
| **edit** | 修改对象字段 |
| **export** | 导出/下载/分享（敏感动作） |

即使用户拥有 view 权限，也**不默认**等于拥有 export 权限。

### 4.2 P0 最小权限矩阵（导出相关）

| 角色 | 导出/下载/分享 |
|------|---------------|
| 管理员 | 受控开放（需留痕） |
| 主办人 | 受控开放（需留痕） |
| 助理 | 默认关闭 |
| 销售 | 默认关闭 |
| 财务 | 财务相关受控开放（需留痕） |

### 4.3 敏感动作审计

以下动作**必须**记录到审计日志：

- 导出 ZIP / 文书导出 / 附件下载
- 提交包导出
- 回执下载
- 对外分享链接
- 负责人交接
- 跨组变更

### 4.4 服务端强制口径

- 权限判断必须在服务端统一执行，不能只依赖前端隐藏按钮。
- 列表、详情、全局搜索、导出、批量动作必须使用同一套授权条件：`role + group + 负责人/协作关系`。
- 即使用户已知对象 ID，只要不满足授权条件，也不得返回对象详情、附件、提交包或导出结果。

### 4.5 服务端缺口

| 缺口 | 现状 | 冻结口径 |
|------|------|---------|
| `canAccessCase()` 缺 group 维度 | 只检查 `manager` 或 `owner/assistant` | 必须按 `role + group + owner/collaborator` 统一控制 |
| `canExportCase()` 不存在 | view = export | 必须拆分 view/edit/export 三个独立权限动作 |
| `GET /cases`、`GET /cases/:id` 无资源级鉴权 | 只有 `@RequireRoles("viewer")` | 必须叠加资源级 group + owner/collaborator 过滤 |
| `POST /cases`、`POST /cases/:id/transition` 无资源级鉴权 | 只有 `@RequireRoles("staff")` | 必须叠加 `canEditCase()` |
| `POST /cases/:id/billing-risk-ack` 无资源级鉴权 | 只有 `@RequireRoles("staff")` | 必须叠加 `canEditCase()` |
| `POST /cases/:id/post-approval-stage` 无资源级鉴权 | 只有 `@RequireRoles("staff")` | 必须叠加 `canEditCase()` |
| `case-parties` 无资源级鉴权 | `GET /case-parties` 不传 caseId 可列全量 | 默认要求 `caseId`，或面向 case detail 的受控端点 |
| 导出/下载留痕 | 不存在 | 每次导出/下载/分享必须写入 AuditLog |

---

## 5. 补正包与 `related_submission_id` 关联

> 引用：03 §2.4、03 §13、04 §4.5、07 §3.18–§3.19

### 5.1 提交包核心不可变规则

1. 提交包引用"具体附件版本 / 文书版本 / 关键字段快照"。
2. 提交后**不允许覆盖式替换历史引用**；后续变更只能新增版本并生成新提交包。
3. 提交包导出、回执下载、对外分享属于敏感动作，必须权限控制并写入审计日志。
4. 提交前必须引用"最新一次有效校验结果"。
5. 阶段推进、校验执行、提交包生成必须由服务端重新校验前置条件。

### 5.2 补正包关联规则

- 补正属于新一轮提交，形成"补正提交包"并与原提交包关联。
- 补正提交包**必须**通过 `SubmissionPackage.related_submission_id` 关联原提交包。
- 无论首次提交还是补正提交，只要产生新的对外提交，就必须创建新的提交包。
- `submission_kind` 区分 `initial`（首次）与 `supplement`（补正）。

### 5.3 补正在 S7 内闭环

| 规则 | 口径 |
|------|------|
| 主阶段 | 收到补正通知后，主阶段**默认仍保持在 `S7`** |
| 语义 | 补正是已提交案件中的一次新循环，**不回退成"未提交案件"** |
| 流程 | 补正完成后重新经过 **Gate-B → Gate-C** 生成补正提交包 |
| 追溯 | 补正提交包与原提交包通过 `related_submission_id` 关联，形成可追溯链路 |

### 5.4 提交包锁定引用明细（`SubmissionPackageItem`）

每个提交包通过 `SubmissionPackageItem` 锁定本次提交引用的具体版本：

| `item_type` | 引用对象 |
|------------|---------|
| `document_requirement` | 资料项快照 |
| `document_file_version` | 资料附件版本（具体版本 ID） |
| `generated_document_version` | 文书版本（具体版本 ID） |
| `field_snapshot` | 关键字段快照（JSON） |

### 5.5 服务端缺口

| 缺口 | 现状 | 冻结口径 |
|------|------|---------|
| `SubmissionPackage` 表 | 不存在 | **P0-Critical**：必须创建 |
| `SubmissionPackageItem` 表 | 不存在 | **P0-Critical**：必须创建 |
| 补正包关联链路 | 不存在 | `related_submission_id` FK 指向原 SubmissionPackage |
| 提交包锁定逻辑 | 不存在 | 生成提交包时必须锁定引用版本与字段快照 |
| 补正 Gate-B → Gate-C 路径 | 不存在 | 补正完成后必须重新通过 Gate-B、Gate-C |

---

## 6. 审计白名单与日志治理

> 引用：03 §5、03 §10.5–§10.6

### 6.1 审计日志白名单字段策略

- 审计载荷采用**白名单字段**策略：默认记录业务判断所需摘要。
- **不默认记录**高敏信息：完整证件号、完整地址、完整附件内容。
- 最小字段集合：

| 字段 | 说明 |
|------|------|
| `object_type` | 对象类型 |
| `object_id` | 对象 ID |
| `action_type` | 操作类型 |
| `operation_reason` | 操作原因（敏感操作必填，可选） |
| `before_data` | 变更前数据（JSON，白名单字段） |
| `after_data` | 变更后数据（JSON，白名单字段） |
| `operated_by` | 操作人 |
| `operated_at` | 操作时间 |
| `ip_address` | IP 地址（可选） |
| `user_agent` | UA（可选） |

### 6.2 审计日志不可删

- 审计日志**默认不可删**。
- 敏感导出与跨案件批量操作需权限控制。
- 回款记录**不可物理删除**，只能 void/reverse（当前 server 允许 DELETE 物理删除，违反此规则）。

### 6.3 审计日志查看权限独立

- 审计日志的查看权限**应独立于**业务对象查看权限。
- 目的：避免"为了留痕而扩大泄露面"。
- 例如：助理可查看自己操作的审计记录，但不应因此获得案件全字段查看权限。

### 6.4 P0 必须覆盖的审计事件

| 类别 | 事件 |
|------|------|
| 案件 | 创建、阶段变更、负责人/协作者变更、Group 变更、跨组建案/转组 |
| 资料 | 资料项状态变更、标记无需提供（含原因）、审核意见变更 |
| 附件 | 附件版本新增、下载/导出/分享 |
| 催办 | 催办发送、催办记录 |
| 提交与风控 | 校验执行与结果、复核签名（如启用）、提交包生成/导出、收费节点确认、回款记录新增、欠款风险确认 |
| 敏感动作 | 导出/下载/分享、负责人交接 |

### 6.5 服务端缺口

| 缺口 | 现状 | 冻结口径 |
|------|------|---------|
| `AuditLog` 表 | 不存在（有 `timeline_logs` 但不等价，缺 before/after_data、operation_reason） | 必须创建 P0 AuditLog（07 §3.22） |
| `payment_records` 允许 DELETE | 违反不可删规则 | 必须改为 void/reverse 机制 |
| 审计查看权限独立 | 不存在 | 必须在权限矩阵中单独处理 audit_view 动作 |
| 白名单字段策略 | 未实现 | before/after_data 只记录白名单字段摘要 |

---

## 7. 本地归档登记口径

> 引用：03 §2.3（P0 落地口径）、07 §3.10、requirement_summary §Business Rules

### 7.1 P0 资料处理口径

P0 资料处理以事务所本地资料服务器为主。系统中的"上传/新增版本"应被理解为**登记资料版本**：

- 系统**不保存文件二进制**；保存"版本元数据 + 状态流转 + 审核/催办留痕"。
- 每个版本至少记录：

| 字段 | 说明 |
|------|------|
| `storage` | 固定值 `local_server` |
| `relative_path` | 相对路径（不含盘符/根目录），可复制 |
| `file_name` | 文件名或描述 |
| `uploaded_by` | 操作人 |
| `uploaded_at` | 操作时间 |

- 本地根目录在事务所设置中配置（`OrgSetting`）；系统仅存相对路径，确保可迁移与权限隔离。

### 7.2 文案约束

| 位置 | P0 口径 |
|------|--------|
| 资料清单主入口 | 统一使用"登记资料（本地归档）" |
| 行内说明 | "已登记" / "待登记" / "本地归档相对路径" |
| 页头 CTA | 避免"上传资料"表述，统一改为"登记资料" |
| 成功反馈 | 避免"上传成功"，改为"登记成功" |

仅"上传回执"等提交后动作允许使用上传类表述。

### 7.3 服务端缺口

| 缺口 | 现状 | 冻结口径 |
|------|------|---------|
| `document_files` 缺 `storage_type` | 不存在 | 必须添加（默认值 `local_server`） |
| `document_files` 缺 `relative_path` | 不存在 | 必须添加 |
| `document_files` 缺 `visible_scope` | 不存在 | 必须添加（`internal_only` / `client_visible`） |
| `OrgSetting` 表 | 不存在 | 需要创建，存储本地资料根目录路径 |

---

## 8. S9 全局只读

> 引用：03 §3.1（S9 定义）、04 §4.6、requirement_summary §Business Rules、P0-CONTRACT-DETAIL §14–§15

### 8.1 只读规则

- 案件进入 `S9`（已归档）后，**除日志 Tab 外全字段只读**。
- 只读约束必须在服务端强制执行，不能只依赖前端 disabled/CSS。
- S9 状态下所有写操作（PATCH、transition、billing-risk-ack 等）服务端必须拒绝。

### 8.2 前端展示

| 展示项 | 说明 |
|--------|------|
| 只读 Banner | S9 归档后显示全局只读横幅 |
| 字段禁用 | 全部表单字段 disabled |
| 日志可查 | 日志 Tab 仍可浏览，但不可新增 |
| 推进按钮 | Header CTA "推进阶段" 隐藏 |

### 8.3 归档前置条件

进入 S9 前应确认（04 §4.6）：

1. 资料归档完成
2. 续签提醒是否需要
3. 收费是否结清

### 8.4 服务端缺口

| 缺口 | 现状 | 冻结口径 |
|------|------|---------|
| S9 写保护 | `update`/`transition` 未检查 S9 | 所有写端点必须检查 `stage !== 'S9'`，否则返回 403 |
| 归档前置条件 | 不存在 | transition → S9 时服务端须校验归档条件 |

---

## 9. P0/P1 边界冻结

### 9.1 P0 做

| 能力 | P0 口径 |
|------|--------|
| 案件模板 | 预置 2 类：家族滞在、工作签证（技人国）；不支持事务所自定义 |
| 管理阶段 | `S1–S9` |
| Gate | Gate-A/B/C，预置规则，不可配置 |
| 双人复核 | 模型预留，默认关闭 |
| 收费阻断 | 提示模式（warn），不作为统一硬阻断 |
| 提醒 | 站内提醒为主，手动 Reminder 兜底 |
| 客户门户 | 不纳入 P0 |
| Group 治理 | 单层治理 |

### 9.2 P1 才做

| 能力 | 说明 |
|------|------|
| `CaseWorkflowStep` 业务子步骤 | 经营管理签等新签证类型的细步骤 |
| `extra_fields` 模板专属字段 | `visa_plan`、`coe_issued_date` 等 |
| COE 硬阻断 | `gate_trigger_step=COE_SENT` + `gate_effect_mode=block` |
| 自动提醒 | `ResidencePeriod + reminder_schedule_blueprint` 批量生成 |
| 高级校验规则配置化 | 事务所自定义校验规则 |
| 双人复核全局强制 | — |
| 客户门户 | — |
| 字段级权限、审批流 | P2 |

### 9.3 P1 预定义 Schema（P0 表已建但逻辑不启用）

以下字段在 P0 写入 null，不影响现有功能：

| 字段 | 所属表 |
|------|--------|
| `current_workflow_step` | Case |
| `extra_fields` | Case |
| `workflow_steps_blueprint` | CaseTemplate |
| `extra_fields_schema` | CaseTemplate |
| `reminder_schedule_blueprint` | CaseTemplate |
| `survey_data` | DocumentRequirement |
| `gate_trigger_step` | BillingPlan |
| `CaseWorkflowStep`（整表） | — |
| `ResidencePeriod`（整表） | — |

---

## 10. 权限矩阵冻结

> 引用：03 §10.5

### 10.1 P0 角色

| 角色 | 系统名 |
|------|--------|
| 管理员 | `super_admin` / `office_manager` |
| 主办人 | `lawyer_or_scrivener` |
| 助理 | `assistant` |
| 销售/前台 | `sales` |
| 财务 | `finance` |

### 10.2 案件资源访问矩阵

| 资源 / 动作 | 管理员 | 主办人 | 助理 | 销售 | 财务 |
|------------|--------|--------|------|------|------|
| 案件查看 | 全量 | 本组 + 负责/协作 | 本组 + 协作案件 | 不默认开放 | 收费相关视图 |
| 资料/文书编辑 | 全量 | 负责案件 | 协作案件的执行字段 | 不可 | 不可 |
| 校验/提交包生成 | 可 | 负责案件 | 不可 | 不可 | 不可 |
| 收费记录编辑 | 可 | 可 | 不可 | 不可 | 可 |
| 导出/下载/分享 | 受控开放 | 受控开放 | 默认关闭 | 默认关闭 | 财务相关受控开放 |

### 10.3 访问控制三维度

内部侧对象级访问控制**同时考虑**：

1. **角色**（role）
2. **Group**（归属团队）
3. **负责人/协作者**（owner/collaborator）

跨组协作属于显式授权，不得被"同角色"默认放大。

### 10.4 服务端当前缺口总结

| 方法 | 当前实现 | P0 要求 |
|------|---------|--------|
| `canAccessCase()` | `manager` 或 `owner/assistant` | `role + group + owner/collaborator`，view/edit/export 独立 |
| `canEditCase()` | 等于 `canAccessCase()` | 必须独立判定 edit 动作 |
| `canExportCase()` | 不存在 | 必须新增 |
| `GET /cases` | 无资源级过滤 | 必须按 group + owner/collaborator 过滤 |
| `GET /cases/:id` | 无资源级鉴权 | 必须检查 `canAccessCase()` |
| `POST /cases` | 无资源级鉴权 | 必须检查建案权限，跨组建案须留痕 |
| `POST /cases/:id/transition` | 无资源级鉴权 | 必须检查 `canEditCase()` |
| `POST /cases/:id/billing-risk-ack` | 无资源级鉴权 | 必须检查 `canEditCase()` |
| `POST /cases/:id/post-approval-stage` | 无资源级鉴权 | 必须检查 `canEditCase()` |

---

## 11. 下游引用清单

本基线冻结后，后续 server/admin 批次的引用关系：

| 批次 | 依赖本基线的节 |
|------|--------------|
| Batch 1：P0 server 主链 | §1–§8 全量引用 |
| Batch 2：P0 admin 主链 | §1（阶段展示）、§2（Gate UI）、§7（本地归档文案）、§8（S9 只读） |
| Batch 3：P0 跨模块 | §3（Group 快照/继承链）、§4（导出权限）、§10（权限矩阵） |

---

## 12. 冻结确认清单

| # | 基线项 | 冻结状态 | 待解决项 |
|---|--------|---------|---------|
| 1 | S1–S9 阶段 | ✅ 冻结 | 需创建 CaseStageHistory 表 |
| 2 | Gate-A/B/C | ✅ 冻结 | 需创建 ValidationRun + ReviewRecord 表；修正 Gate 职责绑定 |
| 3 | Group 快照 | ✅ 冻结 | 需创建 Group + UserGroupMembership 表；Case 添加 group_id |
| 4 | 导出权限 | ✅ 冻结 | 需拆分 view/edit/export 三个独立权限动作 |
| 5 | 补正包 | ✅ 冻结 | 需创建 SubmissionPackage + SubmissionPackageItem 表 |
| 6 | 审计白名单 | ✅ 冻结 | 需创建 AuditLog 表；payment_records 禁止物理删除 |
| 7 | 本地归档 | ✅ 冻结 | document_files 添加 storage_type + relative_path + visible_scope |
| 8 | S9 只读 | ✅ 冻结 | 所有写端点添加 S9 检查 |

所有 8 项基线已冻结。后续 Batch 1–3 实施必须以本文为准。
