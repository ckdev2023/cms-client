# 00 Inbox（原始输入，Append-only）

> 这里用于收集原始材料与碎片信息：会议纪要、讨论结论、需求变更点、外部链接要点、待核实假设。
> 规则：只追加，不重写；任何内容都允许先放进来，后续再“编译”进权威文档。

---

## 追加格式（每条一段）

```text
- 时间：YYYY-MM-DD
  来源：{会议/IM/PRD/链接/口头}
  主题：{一句话}
  要点：
  - ...
  - ...
  需要编译到：
  - {建议目标文档名/章节}
  Owner：{负责人}
  状态：待编译 / 已编译 / 废弃
```

---

## 最新追加

- 时间：2026-04-10
  来源：仓库变更
  主题：启用编译式知识库入口（raw/output）
  要点：
  - 新增原始输入入口：`docs/gyoseishoshi_saas_md/_raw/00-inbox.md`（只追加）
  - 新增产出归档入口：`docs/gyoseishoshi_saas_md/_output/00-outputs.md`（可回灌）
  - 将编译式工作流写入文档维护规范，作为长期维护机制
  需要编译到：
  - 99-文档维护与版本记录.md（编译式知识库工作流段落）
  - README.md（维护约定：增加 raw/output 入口）
  Owner：产品/研发
  状态：已编译

- 时间：2026-04-10
  来源：仓库变更
  主题：建立跨编辑器统一入口 AGENTS.md
  要点：
  - 新增仓库根目录 `AGENTS.md`，作为 Trae/Cursor/Augment 的统一指令入口
  - 固化门禁命令与架构边界，降低规则分叉
  需要编译到：
  - README.md（AI 协作者路径：增加 AGENTS.md 说明）
  Owner：产品/研发
  状态：已编译

- 时间：2026-04-10
  来源：待补充
  主题：P0 真实业务 Top3（用于下一轮编译）
  要点：
  - 条目 1：
  - 条目 2：
  - 条目 3：
  需要编译到：
  - 03-业务规则与不变量.md（如涉及冻结口径/对象边界/校验门槛）
  - 04-核心流程与状态流转.md（如涉及阶段/状态转移/Gate）
  - 06-页面规格/（如涉及字段/交互/列表与批量）
  - 07-数据模型设计.md（如涉及实体/字段/枚举）
  - 08-术语表.md（如涉及新概念/同义词收敛）
  Owner：产品
  状态：待编译

- 时间：2026-04-11
  来源：PO 讨论 / 策略评审
  主题：P0 优化为“需求编译流水线”最小闭环
  要点：
  - 原始 PRD 不再直接作为执行输入，必须先经过结构化抽取、歧义消解、边界冻结
  - P0 最小中间产物收敛为 `requirements.ir`、`ambiguities`、`boundary`、`traceability`
  - 三条硬门禁：高优先级歧义未关闭不得开工；没有 `out_of_scope` 不得冻结；没有 traceability 不算完成
  - `09-结构化总索引与交叉映射` 需承担 `REQ-P0-*` 需求 ID 与回写主表角色
  需要编译到：
  - P0/README.md（P0 需求编译流水线与治理升级）
  - P0/09-结构化总索引与交叉映射.md（需求 ID / traceability 主表）
  - P0/99-文档维护与版本记录.md（硬门禁与最小中间产物模板）
  Owner：产品/研发
  状态：已编译

- 时间：2026-04-11
  来源：P0 权威文档试跑 / REQ-P0-01
  主题：REQ-P0-01 咨询转化——首条需求编译样例
  要点：
  - 目标：从 `Lead` 创建 `Customer` 与首个 `Case`，默认继承 Group，并保证去重提示可见
  - 权威来源：P0/02 §2.1、§2.2、§2.3、§5.2；P0/03 §2.1、§2.2、§2.6；P0/04 §4.1；P0/06「咨询线索 / 客户 / 案件」；P0/07「Lead / Customer / Case / Group」
  - 当前需要显式编译的问题：去重命中后是“复用已有 Customer/Case”还是“允许继续新建”；转化入口是一步完成还是分步完成
  - 本次试跑先聚焦单 Lead → 单 Customer → 首个 Case，不覆盖批量建案、客户合并、自动分配
  需要编译到：
  - _output/00-outputs.md（`requirements.ir / ambiguities / boundary / traceability` 样例）
  Owner：产品/研发
  状态：已编译

- 时间：2026-05-02
  来源：R22 案件全流程审计 BUG-200
  主题：是否引入「任意中间相位 → CLOSED_FAILED」中途撤案路径
  要点：
  - 当前 PHASE_TRANSITIONS 仅允许 REJECTED → CLOSED_FAILED 和 VISA_REJECTED → CLOSED_FAILED
  - 审计发现：实际业务中客户可能在任意非终态阶段主动撤案（如 WAITING_MATERIAL、MATERIAL_PREPARING、REVIEWING 等）
  - 需 PM 确认：是否为所有非终态 phase 增加 → CLOSED_FAILED 出边；若是，是否需要额外 guard（如撤案原因必填、关联账单处理规则）
  - 变更影响：PHASE_TRANSITIONS 表、前端 PhaseTransitionPopover 可选目标列表、stage 同步逻辑
  需要编译到：
  - 04-核心流程与状态流转.md（phase 转换图扩展）
  - 03-业务规则与不变量.md（撤案 guard 规则）
  Owner：PM
  状态：待决策

  ---
  **PM 决策 Gate（BUG-200 — 中途撤案路径）**
  以下 3 项全部答复后方可开始编码，请在各项 `[ ]` 处标记选择。

  **Q1. 出边范围：是否为所有非终态 phase 增加 → CLOSED_FAILED？**
  - [x] 是（推荐）——为以下 11 个非终态 phase 各追加 `CLOSED_FAILED` 出边：
    `CONSULTING / CONTRACTED / WAITING_MATERIAL / MATERIAL_PREPARING / REVIEWING / APPLYING / UNDER_REVIEW / NEED_SUPPLEMENT / SUPPLEMENT_PROCESSING / WAITING_PAYMENT / COE_SENT`
    （不含成功链路 phase：`APPROVED / SUCCESS / RESIDENCE_PERIOD_RECORDED / RENEWAL_REMINDER_SCHEDULED`；
     `REJECTED / VISA_REJECTED` 已有 → CLOSED_FAILED）
  - [ ] 否——仅保留现状（REJECTED / VISA_REJECTED → CLOSED_FAILED）
  - [ ] 其它（请说明）：

  **Q2. 撤案原因：是否枚举化预设？**
  - [x] 是（推荐）——预设 4 项 reason code + 自由文本兜底：
    | code | 中文 | 日文 | 英文 |
    |---|---|---|---|
    | `MID_CASE_WITHDRAWAL` | 中途撤案 | 途中撤回 | Mid-case withdrawal |
    | `CLIENT_LOST_CONTACT` | 客户失联 | 連絡不通 | Client lost contact |
    | `SWITCHED_TO_OTHER_FIRM` | 改委托其他事务所 | 他事務所へ変更 | Switched to other firm |
    | `OTHER` | 其它（需填写文本） | その他（要入力） | Other (text required) |
  - [ ] 否——仅自由文本，不做枚举
  - [ ] 其它（请说明）：

  **Q3. 账单 guard：中途撤案是否需要前置账单门禁？**
  - [x] 否、跳过（推荐）——`assertCoeSendBillingGate` 仅约束 `COE_SENT` 正常结案路径，
    中途撤案属于异常终止，不再追加额外账单门禁
  - [ ] 是——撤案前必须确认账单已结清（请说明具体规则）：
  - [ ] 其它（请说明）：

  > 默认选项已用 `[x]` 标记。如 PM 同意推荐方案，确认即可；如有调整请修改标记并补充说明。
  > 三项全部确认后，将此条目状态改为 `已决策`，随后启动 BUG-200 编码。

- 时间：2026-05-06
  来源：chrome-devtools-mcp 走查 R-CONSULT-01
  主题：咨询模块（leads + conversations）首轮端到端走查——12 条缺陷 + 5 条新发现遗漏
  要点：
  - **走查结论**：模块状态 = 走查无法通过基本 happy-path。UI shell 已完成但 server 关键写入接口缺失。
  - **P0 缺陷 ×3**：
    - B-1：`POST /admin/leads` 404 — server 缺 create handler，新建线索全链路阻断
    - B-1'：`POST /admin/leads/:id/convert` 404 — 转客户/转案件不可用
    - E-1：conversation `assignOwner` 硬编码 `"current-user"` 字面量，指派负责人永远失败
  - **P1 缺陷 ×1**：
    - E-2：conversation 详情错误状态展示 raw i18n key（6 条错误链路 `conversations.errors.*` 裸渲染）
  - **P2 缺陷 ×3**：
    - C-1 / D-1：server 路由缺 `ParseUUIDPipe`，非法 UUID 直接 500（leads + conversations 跨模块同源）
    - B-4：`LeadToast` 缺 `role="alert"` + `aria-live="polite"`
  - **P3 缺陷 ×4**：
    - B-2 / B-3：邮箱/电话无客户端格式校验
    - E-3：conversation detail null 时头部按钮仍渲染
    - G-1：客户端 dedup `phone.includes(input)` 部分匹配易误判
  - **P4 缺陷 ×1**：
    - G-2：`<input>` 缺 `autocomplete` 属性
  - **5 条新发现遗漏**（走查中额外识别）：
    1. `lead_no` 编号自动生成机制缺失（server create 不含 `LEAD-YYYYMM-NNNN`）
    2. `assigned_org_id` + RLS 自读约束（`org_id` 与 `assigned_org_id` 必须同写 `ctx.orgId`，否则 RLS 屏蔽自读）
    3. 业务类型映射 `intendedCaseType`（kebab-case）→ `caseTypeCode`（snake_case）需经 `mapBusinessTypeToCaseTypeCode`
    4. `AdminUser.id` 持久化缺失（conversation owner picker 默认值需真实 UUID）
    5. convert 拆两步对齐 spec §4（admin 端拆 `convert-customer` / `convert-case`，portal 暂保留一步；需 ADR 记录分歧）
  - **决策记录**：admin convert 拆两步 vs portal convert 保留一步 → [ADR-admin-convert-split.md](../_output/ADR-admin-convert-split.md)
  - **RBAC 细化**：spec §4 规定"转客户/转案件 = 主办人、助理"，当前实现沿用 `@RequireRoles("staff")` 含销售，留为单独 ticket 跟进
  需要编译到：
  - P0/06-页面规格/咨询线索.md（実施状態対照表更新——已完成）
  - _output/ADR-admin-convert-split.md（已新建）
  - 03-业务规则与不变量.md（RBAC 细化粒度，待独立 ticket）
  Owner：研发
  状态：已编译

- 时间：2026-05-06
  来源：chrome-devtools-mcp 走查 R-CONSULT-02
  主题：咨询模块第二轮 happy-path 走查——12 条新缺陷 + R-CONSULT-01 8 条修复回归
  要点：
  - **R-CONSULT-01 修复回归**：B-1 / B-1' / B-2 / B-3 / C-1 / D-1 / E-1 / E-2 / E-3 全部 ✅；B-4 / G-1 待回归
  - **R-CONSULT-02 P0 缺陷 ×2**：
    - **R2-A-1**：前端 `useOwnerOptions` / `useGroupOptions` 用静态 fixture 短码（`suzuki` / `tokyo-1`），与 server UUID 期望不对齐，`POST /admin/leads` 与 `bulk/assign` 全部 500；同根因导致详情/列表 owner 反解失败
    - **R2-B-5**：`POST /admin/leads/:id/convert-case` 400（BMV 闸口结构化错误 `CASE_BMV_GATE_BLOCKED` + 4 条 `blockers[]`）被前端 dialog 静默吞噬，仅 console warn，UI 完全无感知
  - **R-CONSULT-02 P1 缺陷 ×3**：
    - **R2-B-4**：`LeadDetailView.vue:94-96` 头部 3 按钮（编辑信息 / 调整状态 / 标记流失）handler 全部 `() => {}`，UI 完全失效
    - **R2-B-6**：lead 已转客户后头部「查看客户」按钮仍 emit `convert-customer`，重新打开 LeadConvertCustomerDialog（dedup 兜底但易误操作）
    - **R2-A-1 在 bulk 路径**：bulk-assign 同样 500
  - **R-CONSULT-02 P2 缺陷 ×4**：
    - **R2-D-1**：`conversations.admin.controller.ts:143` `assign` body 仍用 `optStr` 而非 `optUuid`（E-1 同源风险未补完）
    - **R2-D-2**：`messages.admin.controller.ts:104` `conversationId` / `messageId` 缺 `ParseUUIDPipe`，非法 UUID → 500（reqid=693 实测）
    - **H-6**：转客户/转案件成功后 `useLeadDetailModel` 不主动 `fetchDetail()`，UI 状态滞后必须 reload
    - **H-10**：admin 端无 conversation seed 工具，e2e 走查 send/assign/close/reopen 被阻断
  - **R-CONSULT-02 P3 缺陷 ×5**：
    - **R2-B-1 / H-9**：列表/详情 owner 字段显示 raw UUID 或 "?"（同 R2-A-1 根因，详情显示 `00000000-…000011`，列表显示 "?"）
    - **R2-B-2**：详情头部「编号」字段显示 lead.id（UUID）而非 leadNo（`LEAD-202605-0002`）
    - **R2-B-3**：`所属组` 显示 fixture catalog 标签 `東京一組` 与 DB `name="tokyo-1"` 不一致
    - **H-4**：跟进/日志时间显示原始 ISO `2026-05-06T10:24:53.330Z` 未 localize（list 已 localized，showcase 内部不一致）
    - **H-5**：日志条目仅显示 `logType + 时间`，缺 actor / payload diff
  - **核心体系性观察**：
    1. **fixture catalog vs API 数据双轨制**——`LeadConvertCaseDialog` 已对接 `/api/users` 真实数据（仅展示 1 条 Local Admin），但 `LeadCreateModalBody` / `LeadBulkActionBar` / `LeadDetailView` 仍走 fixture catalog 7 条短码，是当前模块写入侧最大的不一致
    2. **server-side 错误结构化已落地**（CASE_BMV_GATE_BLOCKED + blockers[]）但**前端无对应渲染组件**，需要补 `BMVGateBlockerListPanel`
    3. **R-CONSULT-01 的 ParseUUIDPipe 修复未完全推广**——messages 子接口被遗漏
  - **R-CONSULT-03 入门门禁**（5 条）：R2-A-1 / R2-B-4 / R2-B-5 / R2-B-6 / H-10
  需要编译到：
  - P0/06-页面规格/咨询线索.md §"实施状态対照表" 增加 R-CONSULT-02 实测列
  - 04-核心流程与状态流转.md §"BMV 闸口" 增加前端 `BMVGateBlockerList` 渲染约束
  - _output/57-咨询模块chrome-devtools-mcp走查-第二轮.md（已新建）
  Owner：研发
  状态：待编译

- 时间：2026-05-06
  来源：R-CONSULT-03 走查 Batch F backlog
  主题：R3-G-1 followups 响应契约裸数组 + controller UUID 化 audit
  要点：
  - **R3-G-1**：`GET /admin/leads/:id/followups` 返回裸数组 `LeadFollowup[]`，与全站列表接口 `{items, total}` 契约不一致。同源问题还包括 `GET /admin/leads/:id/logs`（返回 `LeadLog[]`）。本轮不改（避免破坏现有前端消费方），留待下一个 endpoint 契约拉通 PR 统一处理。
  - **UUID 化 audit**：扫描 `packages/server/src/modules/core/` 下所有 controller，确认所有 `*UserId / *GroupId / *CustomerId / *CaseId / *LeadId` 类 UUID 参数是否已从 `optStr` 迁移到 `optUuid`。
    - ✅ `leads.admin.controller.ts`：`ownerUserId` / `groupId` / `customerId` 已全部 `optUuid`（R3-A-1 / R2-A-1 已修复）
    - ✅ `conversations.admin.controller.ts`：`ownerUserId` / `leadId` / `customerId` / `caseId` / `appUserId` 已全部 `optUuid`
    - ✅ `cases` controllers：无 `optStr` 用于 UUID 字段
    - ✅ `customers` controllers：无 `optStr` 用于 UUID 字段
    - ✅ `billing` controllers：无 `optStr` 用于 UUID 字段
    - ✅ `messages.admin.controller.ts`：`optStr` 仅用于 `kind` / `visibleScope`（非 UUID），无残留
    - **结论**：截至 2026-05-06，全部 controller 的 UUID 类参数已迁移到 `optUuid`，无遗留风险。
  需要编译到：
  - P0 backlog（endpoint 契约拉通 PR：followups / logs 裸数组→ `{items, total}`）
  - 本条 audit 结论可用于后续 UUID 守门 lint 规则设计
  Owner：研发
  状态：已编译（audit 已完成，R3-G-1 修复留下一轮）
