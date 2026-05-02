# 客户/案件模块（admin）— 双层状态机自动化复盘走查 Bug 清单（第二十一轮 / chrome-devtools-mcp 全流程通断 + 面向开发者措辞审计）

> 生成日期：2026-05-02（chrome-devtools-mcp 真浏览器走查 + zh-CN / en-US 三语切换 + R20 land 项回归）
>
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/29-双层状态机自动化复盘走查Bug清单-第二十轮.md` R20 land 5 项 + R20 backlog（BUG-189）
> - 用户 R21 任务："再次使用 chrome-devtools-mcp 自动走查页面的完整流程是否走通；页面上的表达是针对开发的，要优化成针对运营人员的"
>
> 走查工具：
> - `chrome-devtools-mcp`：`navigate_page` / `take_snapshot` / `take_screenshot` / `click` / `evaluate_script` / `wait_for` / `list_console_messages` / `list_network_requests`
> - 三语切换通过 `localStorage['cms-admin-locale']` + reload
>
> 走查环境：admin `:5173`（vite 反代 `/api` → `:3300`，rewrite 去掉 `/api`）、server NestJS `:3300`、PostgreSQL `cms-client-postgres-1` `:5433`、登录态 `admin@local.test` 已生效
> 与第二十轮（`29-...md`）互为续篇。

---

## 0. 第二十一轮总结

### 0.1 流程通断结论（一句话）

**全流程通畅，无 5xx，无 console error。** R19~R20 期间所有 P0/P1/P2 BUG（184/185/186/187/189）R21 实测全部 ✅ FIX-LANDED + PASS；BUG-188 维持「非 app bug」关闭决议；BUG-182（stage 渲染粒度）维持 R20「自然对齐」结论。

### 0.2 R20 land 项 R21 回归实测

| BUG | R20 标记 | R21 实测 | 取证 |
|---|---|---|---|
| BUG-184（dashboard mine scope 500）| ✅ FIX-LANDED | ✅ PASS | `GET /api/dashboard/summary?scope=mine&timeWindow=7 [304]`，6 张风险卡完整渲染（`R14 verify probe owner-resolve email/blank` × 2、`R6试探客户 BMV CoE 4-month`、`BUG-111 verify B 6.4`、`R6 BUG-097 retest`、`R6 phase e2e probe`） |
| BUG-185（Visa type raw enum）| ✅ FIX-LANDED | ✅ PASS | Customer Detail `R6试探客户` zh-CN 显示「签证类型 = 经营管理 / 从经营管理签方案自动获取」 |
| BUG-186（billing 日文 raw）| ✅ FIX-LANDED | ✅ PASS | Case Detail `CASE-202605-0003` Billing tab：zh-CN 行内 `案件报酬 / 应收`；en-US `Case fee / Outstanding` |
| BUG-187（创建弹窗 individual/corporation）| ✅ FIX-LANDED | 本轮未触发 | R20 已 PASS，R21 未重复点开 |
| BUG-189（zh-CN sidebar 漏简体）| ❌ 未 land（P3） | ✅ FIX-LANDED + PASS | sidebar `evaluate_script` 取出 `Gyosei OS \| 事务所管理 \| 工作台 \| 仪表盘 \| 业务`（"务"已简体）|

### 0.3 R21 关键发现：「面向开发者的措辞」专项审计 1 + 18 条

R21 走查全程 **未发现新 P0/P1/P2 功能 BUG**。但用户 R21 命题"页面表达针对开发的、要优化成针对运营人员的"专项审计共出土 **1 条 P1 + 18 条 P2/P3 文案 / 信息密度问题**，分布在 8 个核心页面：

| 编号 | 一句话 | 等级 | 所在页面 | R21 状态 |
|---|---|---|---|---|
| **BUG-190** | Customer Detail `?tab=cases` 关联案件第一列展示完整 UUID（`a63aa5f0-2268-421d-a912-9e0b69301155`）而非业务编号（`CASE-XXX`），同页 Cases List 第一列已经用业务编号——同一信息口径不一致，且让运营误以为是事务所内部 ID。 | **P1** | Customer Detail | 新发现 / 未 land |
| BUG-191 | Tasks 页副标题 "查看任务池与续签提醒日志，承接 Dashboard CTA 与 Step 19-20 的工作面" 含 4 个开发术语：`任务池`、`Dashboard CTA`、`Step 19-20`、`工作面`。 | P2 | Tasks | 新发现 / 未 land |
| BUG-192 | Tasks 页四张筛选卡说明 "统一查看 **pending / in_progress** 任务" 直接暴露状态机内部 enum；运营人员不应该看到 enum。 | P2 | Tasks | 新发现 / 未 land |
| BUG-193 | Tasks 页"提醒日志"附加信息列把 "**去重键 residence_period:e00ea5d2:180**"（去重 dedupe key + 内部 case id 拼接）直接渲染，纯调试用字段。 | P2 | Tasks | 新发现 / 未 land |
| BUG-194 | Tasks 页 "工作面说明" disclosure 标题用了 `工作面` 这个内部术语；展开内容里又出现一次 "Dashboard 待办数量与案件详情页进度都会自动减 1"，应改 `仪表盘`。 | P3 | Tasks | 新发现 / 未 land |
| BUG-195 | Customers 页顶部说明 "**沿用资料中心的摘要卡片结构**，让负责人快速判断手头客户和案件压力" — 直接讲实现路径（页面之间的样式继承），运营无需理解。 | P3 | Customers | 新发现 / 未 land |
| BUG-196 | Customer Detail 经营管理签承接卡片 chip 标签为 "**P1 承接**" — `P1` 是产品阶段术语；同模板列表 "Intra-company Transfer **P1 template**"（en-US）/「企業内転勤 **P1 模板**」（zh-CN）也含 P1。 | P2 | Customer Detail / 新建案件 | 新发现 / 未 land |
| BUG-197 | Customer Detail 经营管理签承接卡片 5 个时间字段全部带 "(UTC)" 后缀（`2026-04-30 13:11 (UTC)`）— 时区代号属于实现细节，运营关心本地时间且系统已知用户在 JST，应直接渲染本地时间或不显示时区代号。 | P3 | Customer Detail | 新发现 / 未 land |
| BUG-198 | Customer Detail 经营管理签承接卡片状态行 "建案门禁" — `门禁` 是 gate / guard 直译，运营理解负担大，应改 "建案前置条件" 或 "可建案条件"。 | P3 | Customer Detail | 新发现 / 未 land |
| BUG-199 | Case Detail 概览 "下一关键动作" 卡片右侧两个 button "资料管理" / "执行检查" — `执行` 是程序员动词。"执行检查"应叫"开始提交前检查"。 | P3 | Case Detail | 新发现 / 未 land |
| BUG-200 | Case Detail 概览"财务状况"卡片显示 "未收: ¥150,000"，但同卡片 Cases List 列名为 "**待收**"、Billing tab 卡片名 "**未收金额**" — 同一概念三种译法（未收 / 待收 / 未收金额），运营会迷惑。 | P2 | Case Detail / Cases List / Billing | 新发现 / 未 land |
| BUG-201 | Case Detail 概览"预计截止日期"卡片右侧出现 "**Due: 2026/12/31**" 英文 prefix，zh-CN locale 下该 prefix 未本地化。 | P3 | Case Detail | 新发现 / 未 land |
| BUG-202 | Case Detail 概览"资料收集分组进度"上方 caption "**按提供方完成率**" — `提供方` 是数据模型字段（document_item.provider）的字面翻译；同语义在 Customers 详情页叫 "扶养者/保证人 / 受入机构/企业担当"。 | P3 | Case Detail / Documents | 新发现 / 未 land |
| BUG-203 | Case Detail Billing tab 末尾 "**当前原型暂不展示发票详情**" — `原型` 是开发术语，运营会懵；应改 "发票模块开发中" 或 "本版本暂不支持，后续开放"。 | P2 | Case Detail | 新发现 / 未 land |
| BUG-204 | Billing 页顶部筛选 dropdown 4 处用英文 `Group`：`筛选所属 Group`、`所有 Group`、列名 `所属 Group`、`筛选所属 Group` accessible-name；同字段在 Customers / Cases / Settings 页都已经叫 "分组 / 所属分组"。 | **P1** | Billing | 新发现 / 未 land |
| BUG-205 | Billing 登记回款弹窗 dropdown 选项尾部空括号 "**案件报酬 — ¥150,000 ()**" — `()` 是 status code 模板字符串占位（无值时未隐藏），纯开发占位。 | P2 | Billing | 新发现 / 未 land |
| BUG-206 | Documents 页表头 "**资料项名称** / 提供方 / 本地归档路径" — `资料项` 是 schema 字段名（document_item），`提供方` 同 BUG-202，`本地归档路径` 偏 IT 词；汇总卡片有 "**共享版本过期风险**" 中 `共享版本` 也偏开发感。 | P3 | Documents | 新发现 / 未 land |
| BUG-207 | Settings 二级导航 4 处 `Group` 直显：`Group 管理`、`新建 Group`、列名 `Group 名称`、region label `Group management`。同页"本地资料根目录" tab 副标题含 "系统仅保存 **relative_path**，禁止在业务对象中记录绝对路径" — `relative_path` 是 schema 字段名 + `业务对象` 是 OOP 术语 + `挂载点` 是 Linux 术语（在表单 label "根目录路径 / 挂载点"）。 | P2 | Settings | 新发现 / 未 land |
| BUG-208 | Settings → Group 管理列表显示 "**tokyo-1**"（运维 slug）+ "启用"+"2026/04/27 20:40"+ 一行扁平 button — 同记录在 Cases / Customers 各页 dropdown 都用显示名 "东京一组"。Settings 这里直接 raw slug，运营无法对应。 | P2 | Settings | 新发现 / 未 land |

### 0.4 三句话结论

1. **流程通断面**：admin 三语主流程（Dashboard / Customers / Customer Detail / Cases / Case Detail / Tasks / Documents / Billing / Settings / 新建咨询 / 新建案件 / 新建客户）在 zh-CN 与 en-US locale 下完整跑通，无 5xx、无 console error（仅 2 条非阻断 a11y issue：`No label associated with a form field`、`A form field element should have an id or name attribute`，定位是收费筛选 dropdown 缺 `for`/`id`，属于既有可访问性 backlog，不阻塞功能）。
2. **R20 land 全部生效**：BUG-184~187 + 189 R21 实测全部 PASS；BUG-182 / 188 维持 R20 闭环结论。
3. **本轮唯一新增维度 — 面向开发者措辞专项审计**：发现 1 条 P1（`BUG-190` Customer Detail 关联案件 UUID）+ 1 条 P1（`BUG-204` Billing `Group` 未本地化）+ 8 条 P2 + 9 条 P3，共 19 条；分布在 8 个核心页面。下一轮（R22）建议先 land BUG-190 / 204（P1）+ BUG-191 / 192 / 193（Tasks 页系列）作为最小批次。

---

## 1. 流程通断走查执行明细

### 1.1 chrome-devtools-mcp 真浏览器流（zh-CN）

| 步骤 | 工具 | 关键信号 |
|---|---|---|
| 1 | `take_snapshot` `#/tasks` | RootWebArea title `任务与提醒 - Gyosei OS`，sidebar 显示 `事务所管理`（BUG-189 PASS）|
| 2 | `navigate_page` `#/` | 看到 `仪表盘`、6 张「**收费风险 / 待收：¥150,000 / ¥80,000 / ¥50,000**」风险卡（BUG-184 PASS）|
| 3 | `list_console_messages` | 仅 2 条 a11y issue（无阻断）|
| 4 | `list_network_requests`（fetch+xhr）| 共 39 个请求全部 200 / 304；`GET /api/dashboard/summary?scope=mine&timeWindow=7 [304]` ×2、`scope=all` 未发起、`tasks/reminders/customers/cases/billing-plans/document-items/admin/leads/timeline/...` 全通 |
| 5 | `navigate` `#/tasks` → `click` `工作面说明` disclosure | disclosure 展开成功（含 4 段 zh-CN 长说明）|
| 6 | `click` `提醒日志` tab | 加载 3 条续签提醒（180/90/30 天），看到 `去重键 residence_period:e00ea5d2:180` 字段（取证 BUG-193）|
| 7 | `navigate` `#/customers` → `click` 客户名 `R6试探客户` | 跳进 Customer Detail，签证类型 = 经营管理（BUG-185 PASS）|
| 8 | `click` `关联案件` tab | 11 行案件，第一列每行展示完整 UUID（取证 BUG-190）；阶段列 `刚开始办案` / `已归档` 全 label（BUG-182 自然对齐 PASS）|
| 9 | `navigate` `#/cases` | 20 条案件，header 统计 `进行中 16 / 待收 ¥360,000`（BUG-181 PASS），逐行 ¥150,000 ×2、¥80,000 ×2、¥50,000 ×1 命中 |
| 10 | `click` 行 `查看详情` 进入 `CASE-202605-0003` | 概览 tab 出现 `Due: 2026/12/31`（取证 BUG-201）+ `未收: ¥150,000`（取证 BUG-200）+ `按提供方完成率`（取证 BUG-202）|
| 11 | `click` `收费` tab | 行内 `案件报酬 / ¥150,000 / 应收`（BUG-186 PASS）；下方 `当前原型暂不展示发票详情。`（取证 BUG-203）|
| 12 | `navigate` `#/leads` | 副标题 "聚焦线索录入、跟进与签约后转化闭环"（其它扇区均 OK，未列入 bug）；列表 0 条空状态正常 |
| 13 | `navigate` `#/documents` | 0 件资料空状态正常；列名 `资料项名称 / 提供方 / 本地归档路径`（取证 BUG-206），alert "本地资料根目录未配置" 文案 OK |
| 14 | `navigate` `#/billing` | 6 条记录加载，列名 `所属 Group`（取证 BUG-204）；`click` `登记回款` 看到 dropdown `案件报酬 — ¥150,000 ()`（取证 BUG-205）|
| 15 | `click` `取消`（关弹窗）→ `navigate` `#/settings` | 二级导航 `Group 管理 / 可见性配置 / 本地资料根目录`（取证 BUG-207）；列表显示 `tokyo-1 启用 2026/04/27 20:40 11 0`（取证 BUG-208）|
| 16 | `click` `本地资料根目录` | alert "根目录未配置"，副标题 `系统仅保存 relative_path，禁止在业务对象中记录绝对路径。`（取证 BUG-207 一并）|
| 17 | `click` topbar `新建案件`（→ `#/cases/create`）| 模板 `企業内転勤 P1 模板`（取证 BUG-196 zh-CN 部分）|

### 1.2 三语切换验证

| locale | sidebar 站点标识 | dashboard heading | 风险卡 chip |
|---|---|---|---|
| zh-CN | `事务所管理`（简体）| `仪表盘` | `收费风险` |
| en-US | `Firm Ops` | `Dashboard` | `Billing risk` |
| ja-JP | `事務所管理` | `ダッシュボード` | `請求リスク`（R20 已验证）|

zh-CN ⇄ en-US 切换通过 `localStorage.setItem('cms-admin-locale', 'en-US'); location.reload()` 走真浏览器路径，wait_for 到 `Dashboard` 标识。

### 1.3 console 与 network 全程信号

```
Console messages:
  [issue] No label associated with a form field (count: 1)
  [issue] A form field element should have an id or name attribute (count: 1)

Network requests (fetch+xhr): 39 个，全部 200 / 304
  没有任何 4xx / 5xx
  无 fallback 触发
```

R19 期 `[ExceptionsHandler] TypeError: value.slice is not a function` 经 R20 BUG-184 land 后已彻底消失，R21 复测仍未复现。

---

## 2. BUG-190（P1）：Customer Detail `?tab=cases` 关联案件第一列展示 UUID

### 2.1 复现

```
admin zh-CN
→ 进 customer R6试探客户 (id 825d708f...) → 关联案件 tab
→ 表格第一列显示完整 UUID（每行一段长 UUID）：
   "a63aa5f0-2268-421d-a912-9e0b69301155"
   "b8bef6d9-1d88-4dc8-95e6-949abf7c72ce"
   "9854ce6c-71f1-448f-9e1b-25ebb934d760"
   ...
   （共 11 行，每行一条 UUID）

对照 #/cases 列表：第一列展示 case 标题 + 业务编号（CASE-202604-XXXX）
对照 Case Detail breadcrumb：使用 CASE-202605-0003
```

### 2.2 根因

Customer Detail Cases tab 渲染时直接读 `case.id`（schema PK，UUID）作为行第一列；同字段在其它页面用 `case.case_number`（业务编号）。

### 2.3 影响

- 同事务所同一案件在 Cases List 看到的是 `CASE-202604-0019`，进 Customer Detail 看到的是 `b8bef6d9-...`，运营人员误以为系统给"同一案件"赋了两个 ID；
- UUID 可读性差，找案件得跨页粘贴；
- 跟事务所对外日常话术（"CASE-XXX 这单进度怎么样？"）完全不匹配；

### 2.4 修复方案

`packages/admin/src/views/customers/components/customer-detail/CustomerCasesTab.vue`（或对应组件）把第一列从 `c.id` 改为 `c.caseNumber`；保留 hover tooltip 可显示 UUID 给开发调试用。

### 2.5 单测建议

- `CustomerCasesTab.test.ts`：mock `cases: [{caseNumber:'CASE-202605-0003', id:'a63aa5f0-...'}]`，断言渲染包含 `CASE-202605-0003`、不含 `a63aa5f0-`。
- 视觉 / e2e 顺手补一条 chrome-devtools-mcp Playwright 等价检查。

---

## 3. BUG-204（P1）：Billing 页 `Group` 未本地化

### 3.1 复现

```
admin zh-CN
→ /#/billing
→ 顶部筛选 4 处:
   combobox accessible-name "筛选所属 Group" value="所有 Group"
   option 列表第一项 "所有 Group"
   表头列名 "所属 Group"
```

### 3.2 对照其它页面

| 页面 | 对应字段渲染 |
|---|---|
| Customers (`/customers`) | "所属分组：全部" / "东京一组" / "东京二组" |
| Cases (`/cases`) | "全部分组" / "东京一组" / "东京二组" |
| Tasks (`/tasks`) | 通过 case 显示 |
| Settings (`/settings`) | "Group 管理"（同样未本地化，BUG-207）|

### 3.3 根因

Billing 页 `BillingFiltersBar.vue`（推测）对 group dropdown 直接用了原始 schema 字段名 `Group`，未通过 i18n key（应该用 `common.group` 或 `customer.group`）。

### 3.4 修复方案

1. 在 i18n 字典里复用 / 新增 `common.group: 分组`；
2. 把 Billing 页 dropdown / 列名 4 处替换为 `t('common.group')`；
3. 同步修复 Settings 子页面 `Group 管理` → `分组管理`、`新建 Group` → `新建分组`、`Group 名称` → `分组名称`、region label `Group management` → `分组管理`（属于 BUG-207 范围，可一起 land）。

### 3.5 单测建议

- i18n-regression 加 1 条断言：`zh-CN` locale 下 admin 全部页面 DOM innerText 不出现单独的英文 `Group`。

---

## 4. BUG-191 / 192 / 193 / 194（P2/P3）：Tasks 页四连击

### 4.1 BUG-191 副标题 4 个开发术语

```
副标题：查看任务池与续签提醒日志，承接 Dashboard CTA 与 Step 19-20 的工作面。
```

| 术语 | 性质 | 建议替换 |
|---|---|---|
| `任务池` | 偏 IT（task queue / pool 直译） | `任务列表` 或 `所有任务` |
| `Dashboard CTA` | 产品 / UX 术语 + 开发缩写 | "仪表盘上的『去查看待办』『去修复风险项』等入口" |
| `Step 19-20` | 内部 PRD 步骤号 | 直接删掉或改 "续签 / 期限相关动作" |
| `工作面` | 内部 PRD 词 (workspace / surface) | "工作页" 或 "工作区" |

建议整段重写为：

> 把今天要处理的任务和到期、逾期、续签提醒都集中到这里。点 Dashboard 的「去查看待办」/「去修复风险项」入口都会带你来这里。

### 4.2 BUG-192 暴露状态机 enum

```
button 描述："待处理任务 0 统一查看 pending / in_progress 任务。"
```

`pending / in_progress` 是 task table 的 status enum，不应直接暴露。

建议：

> 待处理任务 0 — 把还没开始（待办）和正在做的任务集中查看。

### 4.3 BUG-193 提醒日志「附加信息」列暴露 dedupe key

```
case 行附加信息：
"案件 CASE-202604-0011 · 接收人 Local Admin · 去重键 residence_period:e00ea5d2:180"
```

`去重键 residence_period:e00ea5d2:180` 是后端 reminder dedupe 用的 key（`{resourceType}:{resourceId 前 8 位}:{daysBefore}`），属于事故调查 / 防重复发送日志取证用，运营场景没有任何信息价值，反而拥挤。

`#eefe7803` 这种 hash 短码同性质（来自 reminder.id 前 8 位）。

建议：

- 「附加信息」整列默认隐藏；保留一个"详情/复制"按钮给开发 / 客服 排查；
- 如果一定要保留运营可见信息，仅展示「关于哪个案件 / 提醒接收人 / 提醒类型（180 天 / 90 天 / 30 天）」，去掉 `去重键`、`#xxxxxxxx` 短码。

### 4.4 BUG-194 `工作面` + `Dashboard` 残串

```
disclosure 标题：工作面说明
disclosure body 第 4 段："每条任务右侧点「标记完成」，这条任务就会在全所系统中同步收口，
                          Dashboard 待办数量与案件详情页进度都会自动减 1。"
```

`Dashboard` 在 zh-CN 下应统一叫 `仪表盘`（同 sidebar、breadcrumb）。

建议：

- disclosure 标题 → "页面说明" 或 "如何使用";
- body "Dashboard" → "仪表盘"；
- 同时检查其它页面 zh-CN 文案中是否还有 `Dashboard`、`Step XX`、`CTA` 残串。

---

## 5. BUG-195 / 196 / 197 / 198（P2/P3）：Customers / Customer Detail 系列

### 5.1 BUG-195 顶部说明讲实现

```
Customers 页 顶部说明：
"客户工作概览
 沿用资料中心的摘要卡片结构，让负责人快速判断手头客户和案件压力。"
```

`沿用资料中心的摘要卡片结构` = 描述前端组件复用关系，运营人员根本不关心两页 UI 是否同款。

建议：

> 客户工作概览 —— 我的客户 / 本组客户 / 有活跃案件 / 无活跃案件 四张卡片帮你快速判断今天要跟进谁。

### 5.2 BUG-196 `P1` 阶段词散落

| 位置 | 文案 |
|---|---|
| Customer Detail 经营管理签卡片 chip | `P1 承接` |
| 新建案件 模板列表（zh-CN） | `企業内転勤 P1 模板` |
| 新建案件 模板列表（en-US） | `Intra-company Transfer P1 template` |

`P1` 是产品阶段术语（Phase 1），事务所运营从未约定该词，直观看上去像是某种"优先级 1"。

建议：

- chip `P1 承接` → `承接中` 或者直接删 chip；
- 模板列表 `P1 模板` / `P1 template` → `Phase 1 模板（开发中）` 仍偏开发，建议直接删 `P1` 或改 "下一阶段开放"，或在产品上线节奏满足时把不可用模板隐藏。

### 5.3 BUG-197 `(UTC)` 时区代号

```
Customer Detail 经营管理签承接卡片：
  问卷发送时间    2026-04-30 13:11 (UTC)
  问卷回收时间    2026-04-30 13:11 (UTC)
  报价生成时间    2026-04-30 13:11 (UTC)
  报价确认时间    2026-04-30 13:11 (UTC)
  签约时间        2026-04-30 13:11 (UTC)
```

事务所在日本，运营关心的是 JST 当地时间；显示 `(UTC)` 既容易让人怀疑是不是少了 9 小时（其实 13:11 UTC = 22:11 JST），又让运营手动做时区换算。

建议：

- 全站默认渲染 JST 本地时间，不显示时区代号；
- 真要显示，统一用 `JST` 而不是 `UTC`；
- 或者用 "1 天前 / 刚刚" 的相对时间。

### 5.4 BUG-198 `门禁`

```
建案门禁    已完成签约，可以进入正式建案
```

`门禁` 来自 `gate_effect_mode` 等内部字段命名（gate / guard / 门禁直译）。

建议：`建案门禁` → `建案前置条件` 或 `可建案条件`；`已完成签约，可以进入正式建案` 文案保持。

---

## 6. BUG-199 / 200 / 201 / 202 / 203（P2/P3）：Case Detail 系列

### 6.1 BUG-199 `执行检查` 程序员动词

Case Detail 概览"下一关键动作"两个 button：
- `资料管理` ← OK
- `执行检查` ← `执行` 是程序员动词

建议：`执行检查` → `开始提交前检查`（同 tab 名 "提交前检查" 对齐）。

### 6.2 BUG-200 同概念三种译法

| 位置 | 文案 |
|---|---|
| Case Detail 概览 财务状况卡 | "未收: ¥150,000" |
| Cases List 列名 | "**待收**" |
| Case Detail Billing tab 卡片 | "**未收金额**" |
| Dashboard 风险卡 | "待收：¥150,000" + "待收金额 ¥150,000，需尽快跟进收费" |
| Billing 列名 | "未收(¥)" / "总未收 (JPY)" |

同字段（unpaid amount）在 admin 端 5 个位置出现 4 种译法：`未收` / `待收` / `未收金额` / `未收(¥)`。

建议：在 i18n 字典统一为 `待收金额`（`billing.unpaid` key），全站 5 处替换。

### 6.3 BUG-201 zh-CN 下 `Due:` 英文 prefix

Case Detail 概览"预计截止日期"卡：
```
预计截止日期       2026/12/31
                  Due: 2026/12/31    ← 英文 prefix
```

`Due:` 应是 en-US 模板未本地化漏过 zh-CN / ja-JP。建议改成 `截止：` 或 `期限：`，或者直接删（已经有大字号日期了）。

### 6.4 BUG-202 `提供方` 数据模型术语

Case Detail 概览"资料收集分组进度"上方 caption `按提供方完成率`。

`提供方`（document_item.provider）是数据模型字段。运营场景叫"由谁提供"。

建议：`按提供方完成率` → `按主申请人 / 扶养者 / 受入机构 / 内部 分组的完成率` 或简化为 `按资料提供人完成率`。

### 6.5 BUG-203 `当前原型暂不展示发票详情`

Case Detail Billing tab 末尾 "发票信息 / 当前原型暂不展示发票详情。"

`原型`（prototype）是开发 / 设计阶段术语。运营人员看到「原型」会认为「这不是上线版本？」。

建议：

- 改 "本版本暂不支持发票详情，后续版本上线"；
- 或干脆隐藏整个 "发票信息" 卡片直到该功能上线。

---

## 7. BUG-205 / 206（P2/P3）：Billing / Documents 系列

### 7.1 BUG-205 dropdown 末尾空括号 `()`

登记回款弹窗：

```
combobox value="案件报酬 — ¥150,000 ()"
```

末尾 `()` 是模板字符串 `${milestoneName} — ${amount} (${statusLabel})` 在 statusLabel 为空字符串时未隐藏。

建议：

```ts
const tail = statusLabel ? ` (${statusLabel})` : '';
return `${milestoneName} — ${formatJPY(amount)}${tail}`;
```

### 7.2 BUG-206 Documents 页字段名

| 位置 | 文案 | 建议 |
|---|---|---|
| 表头列名 | `资料项名称` | `资料名称` |
| 表头列名 | `提供方` | `提供人` 或 `主申请人 / 扶养者…`（同 BUG-202）|
| 表头列名 | `本地归档路径` | `归档位置` 或隐藏（运营人员不关心绝对路径）|
| 概览卡片 | `共享版本过期风险` | `跨案件复用资料即将过期` |

---

## 8. BUG-207 / 208（P2）：Settings 系列

### 8.1 BUG-207 多重开发术语集中爆发

```
Settings 二级导航：
  button "Group 管理"        ← 直接英文
  button "可见性配置"          ← visibility settings 直译，运营懂"权限范围"
  button "本地资料根目录"

Group 管理 区域：
  region label "Group management"   ← 直接英文
  button "新建 Group"               ← 直接英文
  column "Group 名称"               ← 直接英文

可见性配置 区域：
  region label "Visibility settings"  ← 直接英文 region label

本地资料根目录 区域：
  region label "Storage root settings"   ← 直接英文
  副标题 "系统仅保存 relative_path，禁止在业务对象中记录绝对路径。"
                ↑↑↑↑↑↑↑↑↑↑↑↑↑              ↑↑↑↑↑↑↑
                schema 字段名              OOP 术语
  field label "根目录路径 / 挂载点"
                            ↑↑↑↑
                            Linux 术语
```

修复策略：

| 现状 | 建议 |
|---|---|
| `Group 管理` | `分组管理` |
| `新建 Group` | `新建分组` |
| `Group 名称` | `分组名称` |
| region label `Group management` / `Visibility settings` / `Storage root settings` | i18n 化 |
| `可见性配置` | `权限范围` 或 `工作面分配` |
| 副标题 `系统仅保存 relative_path，禁止在业务对象中记录绝对路径` | "系统只记录相对路径，不记录绝对路径" |
| field label `根目录路径 / 挂载点` | `根目录路径` 或 `归档目录路径` |

### 8.2 BUG-208 列表显示 slug

```
Settings → Group 管理 列表行：
  button "tokyo-1 启用 2026/04/27 20:40 11 0"
```

`tokyo-1` 是后端 group.code（slug），其它页面 dropdown 都已经用显示名 "东京一组"。

建议：列表第一列展示显示名 "东京一组"，副标题或 hover tooltip 给 slug。

---

## 9. R20 → R21 回归得分卡

| # | 来源 | 项 | R20 标记 | R21 实测 |
|---|---|---|---|---|
| 1 | R16 / R17 | BUG-174 | ✅ FIX-LANDED | ✅ PASS |
| 2 | R17 / R18 | BUG-179 Dashboard work-item i18n | ✅ PASS | ✅ PASS（三语完整）|
| 3 | R18 | BUG-180 customer detail vs case list status | ✅ FIX-LANDED | ✅ PASS |
| 4 | R18 | BUG-181 quotePrice → billing_records | ✅ FIX-LANDED | ✅ PASS（Outstanding ¥360,000 数据一致）|
| 5 | R18 | BUG-183 CustomerSummaryDto 顶层 type | ✅ FIX-LANDED | ✅ PASS |
| 6 | R16~R19 | BUG-182 stage 粒度 | 自然对齐 PASS | ✅ PASS（继续维持）|
| 7 | R19 | BUG-184 dashboard mine 500 | ✅ FIX-LANDED | ✅ PASS（三语风险卡完整）|
| 8 | R19 | BUG-185 visa raw enum | ✅ FIX-LANDED | ✅ PASS |
| 9 | R19 | BUG-186 billing 日文 raw | ✅ FIX-LANDED | ✅ PASS |
| 10 | R19 | BUG-187 创建弹窗 individual/corporation | ✅ FIX-LANDED | 本轮未触发（R20 PASS）|
| 11 | R19 | BUG-188 date picker 残串 | 🟡 关闭 | 维持关闭 |
| 12 | R20 | BUG-189 zh-CN sidebar 漏简体 | ❌ 未 land（P3） | **✅ FIX-LANDED + PASS** |
| 13 | **R21 新发现** | **BUG-190 关联案件 UUID 列** | — | ❌ 未 land（**P1**）|
| 14 | **R21 新发现** | **BUG-191 Tasks 副标题开发术语** | — | ❌ 未 land（P2）|
| 15 | **R21 新发现** | **BUG-192 Tasks pending/in_progress enum** | — | ❌ 未 land（P2）|
| 16 | **R21 新发现** | **BUG-193 提醒日志 dedupe key** | — | ❌ 未 land（P2）|
| 17 | **R21 新发现** | **BUG-194 Tasks 工作面 / Dashboard 残串** | — | ❌ 未 land（P3）|
| 18 | **R21 新发现** | **BUG-195 Customers 顶部说明讲实现** | — | ❌ 未 land（P3）|
| 19 | **R21 新发现** | **BUG-196 P1 阶段词散落** | — | ❌ 未 land（P2）|
| 20 | **R21 新发现** | **BUG-197 (UTC) 时区代号** | — | ❌ 未 land（P3）|
| 21 | **R21 新发现** | **BUG-198 建案门禁** | — | ❌ 未 land（P3）|
| 22 | **R21 新发现** | **BUG-199 执行检查动词** | — | ❌ 未 land（P3）|
| 23 | **R21 新发现** | **BUG-200 未收/待收/未收金额三种译法** | — | ❌ 未 land（P2）|
| 24 | **R21 新发现** | **BUG-201 Due: 英文 prefix** | — | ❌ 未 land（P3）|
| 25 | **R21 新发现** | **BUG-202 按提供方完成率** | — | ❌ 未 land（P3）|
| 26 | **R21 新发现** | **BUG-203 当前原型暂不展示** | — | ❌ 未 land（P2）|
| 27 | **R21 新发现** | **BUG-204 Billing Group 未本地化** | — | ❌ 未 land（**P1**）|
| 28 | **R21 新发现** | **BUG-205 dropdown 空括号 ()** | — | ❌ 未 land（P2）|
| 29 | **R21 新发现** | **BUG-206 Documents 字段名** | — | ❌ 未 land（P3）|
| 30 | **R21 新发现** | **BUG-207 Settings 多重开发术语** | — | ❌ 未 land（P2）|
| 31 | **R21 新发现** | **BUG-208 Settings 显示 tokyo-1 slug** | — | ❌ 未 land（P2）|

**得分**：31 项中 **12 ✅ PASS / FIX-LANDED + 1 🟡 关闭 + 19 ❌ R21 新发现（含 2 P1 / 8 P2 / 9 P3）**。

---

## 10. R22 建议（按优先级）

### 10.1 优先 P1 双修（一个改动批次）

1. **BUG-190**：Customer Detail Cases tab 第一列从 `case.id`（UUID）改为 `case.caseNumber`（CASE-XXX）。1 处组件、1 条单测。
2. **BUG-204 + BUG-207（Group 系列）**：把 Billing 页 4 处 + Settings 二级导航 / region / button / column 7 处 `Group` 全部接通 i18n key（`common.group: 分组` / `settings.groupManagement.*`）。同时 region label `Visibility settings` / `Storage root settings` 走 i18n。新增 i18n-regression 单测：zh-CN / ja-JP locale 下 admin innerText 不出现单独英文 `Group`。

### 10.2 P2 集中清理（建议两个 PR）

PR-A — Tasks 页 4 连击：BUG-191 / 192 / 193 / 194。

- 重写 Tasks 副标题（去掉 `任务池` / `Dashboard CTA` / `Step 19-20` / `工作面`）；
- 卡片 hint 去掉 `pending / in_progress` enum；
- 提醒日志「附加信息」列默认隐藏 `去重键 residence_period:xxx:N` 与 `#xxxxxxxx`，加详情 button；
- disclosure 标题 `工作面说明` → `页面说明`；body `Dashboard` → `仪表盘`。

PR-B — 概念译名统一 + 占位 / 阶段词清理：BUG-196 / 200 / 203 / 205 / 208。

- BUG-196 删除 / 替换 `P1 承接`、`P1 模板`、`P1 template`；
- BUG-200 i18n 字典统一 `待收金额`（删除 `未收 / 未收金额`）；
- BUG-203 `当前原型暂不展示发票详情` → `本版本暂不支持发票详情`；
- BUG-205 dropdown 空括号 `()` 修：模板字符串里把 statusLabel 空值时去掉 ` (${...})`；
- BUG-208 Settings 列表第一列展示组显示名而非 slug。

### 10.3 P3 视觉 / 文案微调（合并到下次 UI 走查批次）

BUG-194（部分）/ 195 / 197 / 198 / 199 / 201 / 202 / 206。建议合并到下次 admin UI 视觉规范走查（第四轮）一起 land。

### 10.4 既有非阻断 a11y issue

- console 报告 `No label associated with a form field` / `A form field element should have an id or name attribute` —— 来源是 Billing 页登记回款弹窗 / 筛选 dropdown 缺 `aria-label` 或 `for=` 关联。属于既有 a11y backlog，不阻塞 R22 land；建议下次 a11y 专项走查批量修复。

---

## 11. 风险与决策

- **R21 不 land 任何代码**：本轮全程为「真浏览器走查 + 取证 + 文案审计」。19 条 R21 新发现 BUG 中 2 条 P1（BUG-190 / 204）是用户体验显著割裂项，建议 R22 立刻 land。
- **「面向开发者措辞」是产品级一致性问题**：本轮发现的 19 条问题中绝大多数是单点小改，但合在一起会让运营人员对系统专业度产生持续性怀疑（"这看起来像内部工具，不像我能日常用的 SaaS"）。建议 R22 起把 `开发术语审计` 加入每次 admin 主流程走查的固定环节。
- **i18n 字典存在 enum 直显与字段名直显两条传染线**：`pending`、`in_progress`、`Group`、`relative_path`、`provider`、`tokyo-1`、`P1`、`gate_effect_mode → 门禁` —— 都属于"开发取了字段名，前端没接 i18n 直接渲染"。R22 land 这批后建议补一条 lint：admin i18n 文案 commit hook 检查不出现 schema 字段名（基于一份禁词字典）。

---

走查方完成。
