# 全流程 chrome-devtools-mcp 走查（第一轮 / 跨模块缺陷扫描）

> 生成日期：2026-05-04（R31 修复完成后基础上的全流程横向扫描）
>
> 命题：
> - 在 R31 案件详情已通过 11 条缺陷修复验收的基础上，使用 chrome-devtools-mcp 真浏览器走查 admin 端**所有主要流程**，找出跨模块的体系性缺陷。
> - 本轮**不再聚焦案件详情**（R31 已覆盖），重点：仪表盘、客户、咨询线索、任务/提醒、收费/财务、资料中心、对话、系统设置。
>
> 复测覆盖：
> - 三语言基线：zh-CN（默认）/ en-US / ja-JP（同一模块切语言比对）
> - 数据集：本地 Local Demo Office / Local Admin / 14 R6试探客户案件 + 9 Tani Keiei Cert4M Test 案件 + 7 收费节点 + 1 回款流水
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot / click / fill_form / list_network_requests / list_console_messages）

---

## 0. 总结

### 0.1 一句话结论

**全流程横向走查发现 12 条跨模块缺陷，集中在「时间格式不一致」「业务类型枚举缺失」「权限边界态错误反馈」「资料中心未配置默认值」四个体系性问题，建议下一轮 R32 集中攻坚。**

### 0.2 缺陷分布概览

| 等级 | 数量 | 主要分布 |
|---|---|---|
| **P2** | 5 | 仪表盘错误反馈 / 业务类型枚举 / 验证 tab 多按钮失效 / 提醒内容降级到 UUID / 收费日期 ISO 漏出 |
| **P3** | 7 | 跨模块时间格式漂移 × 3 / 案件类型显示文案不统一 / 案件名为空降级 / KPI 语义模糊 / 资料根目录未配置 |

### 0.3 体系性问题（编译式沉淀）

1. **时间格式漂移（4 条命中）**
   - 案件 timeline / 案件列表「更新时间」 / 任务-提醒日志：`2026/05/04 12:53` ✅
   - 客户详情 BMV 卡片：`2026-04-30 13:11 (UTC)` ❌
   - 客户详情 沟通记录：`2026-04-30 13:11:46.940Z` ❌
   - 收费-回款流水 回款日期：`2026-05-02T00:00:00.000Z` ❌ (zh-CN/en-US/ja-JP 一致漏出)
   - 系统设置-本地资料根目录 最后更新时间：`2026-05-02T12:19:54.068Z` ❌
   - **建议**：建立统一 `<DateText :value :format>` 组件，禁止 `{{ raw.toISOString() }}` 直出；新增 lint 规则。

2. **业务类型枚举不一致（与 P0 BMV 对齐缺失）**
   - 咨询线索 业务类型 filter / 创建 modal：仅 `高度人才/技人国/家族滞在/设立法人/永住/其他`，**缺失「经营管理」**
   - 案件列表 类型字段：同一类型显示 `经营管理（认定4个月）` 和 `经营管理签` 两种文案
   - 案件创建 模板列表：父模板 `经营管理签`，子模板 `经营管理（认定 4 个月）`，命名前缀漂移
   - **建议**：以 `migration 038 BMV alignment` 的枚举为单一真理源（`business_manager_visa` / `biz_mgmt_*`），admin 全量 i18n 走该枚举。

3. **权限边界态错误反馈（Dashboard 本组）**
   - 用户无 group_member 记录时，本组 tab 仍发起 `/api/dashboard/summary?scope=group&groupId=<random-uuid>` → 400 NO_GROUP_ACCESS
   - UI 显示「仪表盘数据加载失败，请稍后重试」，但同时**继续渲染上一次「我的」的数据**，造成"看似有数据但顶上有错误"的错觉。
   - **建议**：当用户无 group 时，本组 tab 直接禁用（disabled + tooltip），或显示空态 + CTA「联系管理员加入分组」。

4. **资料中心 onboarding 阻塞**
   - 资料中心 `登记资料` 按钮全局 disabled，原因是「本地资料根目录未配置」。
   - 这是 P0 默认值缺失：新部署 / 新事务所 onboarding 时，没有资料根目录就**完全无法登记任何资料**。
   - **建议**：`init-local-admin` 脚本同时初始化默认根目录；或允许在没有根目录时仍登记元数据（仅本地归档功能 disabled）。

---

## 1. P2 缺陷详细

### 1.1 R32-A [P2]：Dashboard 本组 tab 报错但仍渲染旧数据

**触发**：登录后默认 `tab=mine`，点「本组」tab。

**网络观察**：

```
GET /api/dashboard/summary?scope=group&timeWindow=7&groupId=ef21fdd2-1ffc-4a27-8b47-a640d6bd021c → 400
{"message":"NO_GROUP_ACCESS","error":"Bad Request","statusCode":400}
```

**UI 观察**：
- 顶部出现 live="assertive" 错误条：`仪表盘数据加载失败，请稍后重试。` + `重新加载` 按钮
- 同时下方继续显示「今日待办 1」「风险案件 9」+ 9 张风险案件卡（与之前「我的」tab 数据完全一致）

**根因**：UI 在 group fetch 失败后没有清空旧 state，导致用户误以为这就是「本组」数据。

**修复建议**：
- 当用户无 `group_member` 记录时，禁用本组 tab（或隐藏）
- 当本组 fetch 失败时，清空数据区，仅显示错误条 + 重试 CTA
- groupId 不应该从硬编码默认拿，应该从 `/api/dashboard/groups` 返回的实际 group 中选第一个

**测试位置**：admin/src/views/DashboardView.vue + admin/src/i18n/messages/dashboard

---

### 1.2 R32-B [P2]：咨询线索 业务类型 缺失「经营管理」

**触发**：访问 `/leads`，展开「业务类型：全部」combobox。

**snapshot**：

```
combobox "业务类型：全部" expandable haspopup="menu" value="业务类型：全部"
  option "业务类型：全部"
  option "高度人才"
  option "技人国"
  option "家族滞在"
  option "设立法人"
  option "永住"
  option "其他"
```

**问题**：`经营管理`（BMV，P0 核心业务）**未出现在 options**。同样问题出现在 `新建线索` modal 的「业务类型」字段：

```
combobox "业务类型" value="请选择业务类型"
  option "高度人才"
  option "技人国"
  option "家族滞在"
  option "设立法人"
  option "永住"
  option "其他"
```

**对比**：案件列表 / 案件创建 / 客户详情 BMV 承接卡片均承认「经营管理」是合法业务类型。

**修复建议**：在 `LeadsListView.vue` 与 `NewLeadModal.vue` 的业务类型 options 中补 `经营管理`，并对齐 `migration 038` 的枚举值（`business_manager_visa` / `biz_mgmt_*`）。

---

### 1.3 R32-C [P2]：案件详情 提交前检查 tab 4 个核心按钮均「建设中」disabled

**触发**：案件详情 → tab 「提交前检查」。

**snapshot**：

```
button "重新检查" description="建设中" disableable disabled
button "新建提交包" description="建设中" disableable disabled
button "发起复核" description="建设中" disableable disabled
button "模拟欠款确认" description="建设中" disableable disabled
StaticText "校验通过，无阻断项"
```

**问题**：4 个核心动作全部不可用，意味着用户看到 "校验通过" 也无法实际推进流程（无法 1. 重跑 validation，2. 创建提交包，3. 发起复核，4. 模拟欠款）。

**对比**：R31-K 已修复欠款确认 tile 的"硬阻断 → 软提示"。但提交前检查 tab 的 4 个核心按钮仍全 disabled。

**修复建议**：
- 短期：将「提交前检查 tab」的角色改为只读概览 + tooltip 引导用户去其他真实可用入口。
- 长期：明确 P0 范围内是否要做这些 button 的真实功能（mempalace 查询确认）。

---

### 1.4 R32-D [P2]：任务-提醒日志 内容字段降级到原始 UUID

**触发**：访问 `/tasks` → 点击「提醒日志 5」chip。

**snapshot**：

```
StaticText "case · 5d38aaac-bdaa-483d-9ac3-64f72d9de27f"  ← 第一条
StaticText "2026/12/15 09:00"
StaticText "未发送"
StaticText "案件 CASE-202605-0006"

StaticText "case · d993fa92-3578-4893-9ae5-c21084a9f5dc"  ← 第二条
StaticText "2026/12/31 09:00"
StaticText "未发送"
StaticText "案件 CASE-202605-0005"

StaticText "经营管理 · 到期前 180 天提醒"  ← 第三、四、五条 OK
StaticText "2030/03/05 09:00"
...
```

**问题**：前两条「案件期限提醒」（来自 case.predicted_due_date）的「内容」列直接显示 `case · <uuid>`，没有可读的提醒主体文案。后三条 BMV 残留期间提醒（180/90/30 天）有正确的人类可读内容。

**根因**：`reminders` 表的 `target_type='case'` + `target_id=<case_uuid>` 类提醒，UI 渲染时没有 join 到 `cases.case_no` / `cases.title` 来构造文案。

**修复建议**：在 `TasksRemindersTab.vue` 渲染 reminder 行时，根据 `targetType` 路由不同的文案 builder：
- `case` → `案件期限：<case_no> <title>`
- `residence_period` → `<visa_type> · 到期前 <daysBefore> 天提醒`
- 默认 fallback 也应该比 `<entity> · <uuid>` 更人类可读。

---

### 1.5 R32-E [P2]：收费-回款流水记录 回款日期显示原始 ISO 字符串

**触发**：访问 `/billing` → tab 「回款流水记录」。

**snapshot（zh-CN）**：

```
StaticText "回款日期"
StaticText "2026-05-02T00:00:00.000Z"
```

**snapshot（en-US）**：

```
StaticText "Date"
StaticText "2026-05-02T00:00:00.000Z"
```

**snapshot（ja-JP）**：

```
StaticText "入金日"
StaticText "2026-05-02T00:00:00.000Z"
```

**问题**：3 语言下都漏出原始 ISO timestamp，应使用 `formatDate` 统一为 `2026/05/02`。

**对比**：同页面 `案件收费列表` tab 的「下一收款节点-2026/12/30」格式正确。

**修复建议**：`PaymentRecordsList.vue` 的「回款日期」cell 使用与列表其他时间列同样的 `formatDate` helper。

---

## 2. P3 缺陷详细

### 2.1 R32-F [P3]：客户详情 BMV 承接卡片 时间字段全部显示 `(UTC)` 后缀

**触发**：客户详情（已签约客户）→ 基础信息 tab → 经营管理签承接 卡片。

**snapshot**：

```
StaticText "问卷发送时间"
StaticText "2026-04-30 13:11 (UTC)"
StaticText "问卷回收时间"
StaticText "2026-04-30 13:11 (UTC)"
StaticText "报价生成时间"
StaticText "2026-04-30 13:11 (UTC)"
StaticText "报价确认时间"
StaticText "2026-04-30 13:11 (UTC)"
StaticText "签约时间"
StaticText "2026-04-30 13:11 (UTC)"
```

**问题**：5 个 BMV 时间戳全部显示 `2026-04-30 13:11 (UTC)`，与系统其他模块（`2026/05/02 21:15`）不一致。

**修复建议**：BmvIntakeCard.vue 改用 `formatDate(value, 'yyyy/MM/dd HH:mm')`。

---

### 2.2 R32-G [P3]：客户详情 沟通记录 时间显示原始 ISO 时间戳

**触发**：客户详情 → 沟通记录 tab。

**snapshot**：

```
StaticText "Local Admin"
StaticText "2026-04-30 13:11:46.940Z"
StaticText "确认经营管理签签约"
```

**问题**：沟通记录的时间戳直接显示 `2026-04-30 13:11:46.940Z`（带毫秒 + UTC 标识），3 条记录全部如此。

**修复建议**：`CustomerCommunicationsTab.vue` 的 timestamp cell 改用 `formatDate`。

---

### 2.3 R32-H [P3]：案件列表 类型字段同时存在两种文案

**触发**：访问 `/cases`。

**观察**：同样是 BMV 类型，列表中混合显示：
- `经营管理（认定4个月）` (CASE-202605-0006/0005/0004 等较新案件)
- `经营管理签` (CASE-202604-0009/0008/0007/0006 等较早案件)

**根因**：DB 中 `cases.case_type_code` 跨 migration 升级时部分行用旧标签 (`经营管理签`)，部分行用新标签（`biz_mgmt_cert_4m`）。i18n 渲染时未统一 normalize。

**修复建议**：
- 创建 i18n key normalizer：所有 BMV 类型 (`business_manager_visa`, `biz_mgmt_cert_4m`, `biz_mgmt_cert_1y`, `biz_mgmt_renewal`, etc) 都映射到同一 i18n key 族 `case.types.bmv.*`
- 或：DB 层一次性 backfill 旧值

---

### 2.4 R32-I [P3]：案件列表 CASE-202604-0006 标题字段降级到编号

**触发**：访问 `/cases`，看第 4 行。

**snapshot**：

```
link "CASE-202604-0006" url=".../cases/d07a61d1-..."
  StaticText "CASE-202604-0006"
StaticText "CASE-202604-0006"
```

**问题**：案件标题列直接显示 `CASE-202604-0006` (编号本身)，应该显示案件 `name/title`。其他 22 条都有具体 name (例如 "R23-AUDIT-TITLE-TEST", "R6试探客户 经营管理（认定 4 个月）")。

**根因**：该案件的 `name` 字段为 NULL/空字符串，UI 没有 fallback 文案。

**修复建议**：
- UI 层增加 fallback：`name ?? customer.name + ' · ' + caseTypeLabel`
- 或：DB 层加 `name NOT NULL` 约束 + 创建 path 必填校验

---

### 2.5 R32-J [P3]：资料中心 KPI「缺件」与列表 状态 列语义模糊

**触发**：访问 `/documents`。

**观察**：
- 顶部 KPI: `缺件 = 1`
- 列表状态 filter 选项有 `缺件` / `待提交` / `待审核` / `已通过` / `已拒绝` / `过期` / `无需提供`
- 列表唯一记录的「状态」列显示：`待提交`

**问题**：KPI 「缺件 = 1」 是否包含 `待提交` 状态？filter 中 `缺件` 与 `待提交` 是独立选项，但 KPI 计数似乎把 `待提交` 也算进去了。

**修复建议**：
- 统一定义：`缺件 KPI := count(status in ['缺件', '待提交'])` 或仅 `缺件`，并在 UI 上写明计数口径
- 或：KPI 的 label 改为「待登记 / 缺件」更宽口径

---

### 2.6 R32-K [P3]：系统设置-本地资料根目录 最后更新时间显示 ISO 时间戳

**触发**：`/settings` → `本地资料根目录` 子标签。

**snapshot**：

```
StaticText "最后更新人"
StaticText "Local Admin"
StaticText "最后更新时间"
StaticText "2026-05-02T12:19:54.068Z"
```

**修复建议**：使用 formatDate 统一格式。

---

### 2.7 R32-L [P3]：资料中心 onboarding 阻塞「登记资料」全局 disabled

**触发**：访问 `/documents`。

**snapshot**：

```
button "登记资料" disableable disabled
alert "本地资料根目录未配置 — 尚未设置本地归档根目录。请联系管理员先在「系统设置」中完成配置，之后才能登记资料。"
```

**问题**：
- 没有默认根目录 → 完全无法登记任何资料（连"占位元数据"都不行）
- 这阻塞了新事务所 onboarding 时的资料录入闭环
- 严格说这是 P2，但这里归 P3 因为有 admin 入口可手动配置

**修复建议**：
- `init-local-admin` 脚本同时初始化默认根目录 (`/data/cms/<orgId>/files`)
- 或：UI 允许"先记录元数据，文件路径稍后绑定"的两阶段登记
- 或：引导用户去 `/settings` 配置（已经有 alert 提示，但应该把根目录入口直接 inline 在 alert 中）

---

## 3. 已确认 PASS 的流程

| 流程 | 验证 | 备注 |
|---|---|---|
| 登录 → 默认进入 dashboard | ✅ | LocalAdmin admin@local.test / Admin123! |
| Dashboard 「我的」/「全所」tab | ✅ | scope=mine / scope=all 都返回 200 |
| 客户列表 + 筛选 + 详情(5 个 tab) | ✅ | 基础信息 / 关联案件 / 关联人 / 沟通记录 / 操作日志 deep-link 正确 |
| 案件列表 + 23 条记录 + filter | ✅ | 阶段 / 负责人 / 风险 / 检查 4 个 filter 都能展开 |
| 案件详情 R23-AUDIT-TITLE-TEST | ✅ | 10 tabs 全部可点；状态流转 modal 正确显示 `审查中 → 申请中 / 失败归档` |
| 案件创建 wizard | ✅ | 4 步骤；模板列表覆盖 BMV (4 个月/1 年/续签/公司设立) + 技人国 + 企業内転勤 + 家族滞在 |
| 任务列表 + 4 个 chip 切换 | ✅ | 待处理 1 / 今日到期 0 / 已逾期 0 / 提醒日志 5 |
| 收费列表 7 条 + 摘要数字 | ✅ | 应收 ¥860k / 已收 ¥100k / 待收 ¥760k 加总精确匹配行数据 |
| 收费 登记回款 modal | ✅ | 字段：金额 / 日期 / 关联节点 / 凭证 / 备注；金额 valuemax 与节点上限一致 |
| 三语言完整切换 (zh-CN/en-US/ja-JP) | ✅ | 顶栏切换 → 全 UI 动态翻译 + 持久化；customer 名 / case name 不强制翻译 (合理) |
| 系统设置 3 个子页 | ✅ | 分组管理 / 可见性配置 / 本地资料根目录 |

---

## 4. 仪表盘 → 收费 → 案件 详情 deep-link 关联

| 链路 | 状态 |
|---|---|
| Dashboard 「查看收费」(风险案件) → /billing | ✅ |
| 案件详情 收费 tab 「登记回款」 → /billing?case=<uuid> 自动开 modal | ✅ R31-J 已修复 |
| 客户详情 关联案件 → /cases/:id | ✅ |
| 客户列表 「累计 14 · 活跃 12」 → /cases?customerId=<uuid> | ✅ |
| 客户详情 「查看会话」 → /conversations?customerId=<uuid> | ✅ |
| 案件详情 沟通记录 「查看关联会话」 → /conversations?caseId=<uuid> | ✅ |

---

## 5. 工程改进建议（编译式回灌）

1. **新增 lint 规则禁止裸 ISO timestamp 直出**
   - 检测：`<template>` 中 `{{ \w+\.toISOString() }}` 或 `{{ raw\d* }}` 命中包含 `at|date|time` 的字段名
   - 强制走 `formatDate` helper

2. **业务类型枚举单一真理源**
   - 在 `packages/admin/src/i18n/messages/_shared/businessTypes.ts` 集中定义 BMV / 高度人才 / 技人国 / 家族滞在 / 设立法人 / 永住 / 其他 七个一级类型
   - 所有列表 / modal / filter 必须从此源 import；增加 arch:check 规则

3. **本地 onboarding 默认值预置**
   - `init-local-admin` 脚本扩展为同时写入：
     - 默认 group `tokyo-1` (已有)
     - 默认本地资料根目录 `/data/cms/<orgId>/files`
     - 默认 group_member 把 admin 加入 tokyo-1 (这样 dashboard 本组 tab 不会 400)

4. **三语言渲染断言纳入 R32 测试**
   - 模拟 R31-G 的做法：每个有 ISO timestamp 的页面都增加 zh-CN/en-US/ja-JP 三语言渲染断言，预防回归。

---

## 6. 下一步行动

按 P 等级分批：

1. **R32-A/B/D/E**（P2 × 4）：本周内闭环。Dashboard 本组态、Lead 业务类型枚举、Reminder 内容文案、Billing payment date 都是相对独立小改动 + 可补单测的项。
2. **R32-C**（P2，提交前检查 tab）：需要业务确认 P0 范围（mempalace 查询）。如果 P0 不做，至少 hide 这些按钮而非 disabled，避免误导。
3. **R32-F/G/H/I/J/K/L**（P3 × 7）：合并到「时间格式漂移」专项 + 「资料中心 onboarding」专项两个 PR 一起处理。
4. **工程改进**：lint 规则与 init-local-admin 脚本扩展，可以在 R32 闭环 PR 中顺带带上。

---

**报告生成完毕。R31 案件详情 11 条修复已通过深度验收（详见 42-）；本轮跨模块走查再发现 12 条体系性缺陷，建议下一轮 R32 开始集中修复。**
