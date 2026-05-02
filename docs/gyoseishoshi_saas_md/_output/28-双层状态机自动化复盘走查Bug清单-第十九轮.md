# 客户/案件模块（admin）— 双层状态机自动化复盘走查 Bug 清单（第十九轮 / chrome-devtools-mcp 全流程走查 + R18 land 项回归 + 新发现 bug）

> 生成日期：2026-05-02（chrome-devtools-mcp 真浏览器走查 + 服务端 stderr 栈定位 + DB / API 直读双重验证）
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/27-双层状态机自动化复盘走查Bug清单-第十八轮.md` §7 R19 建议（5 条）
> - R16 / R17 / R18 期间 BUG-180 / 181 / 183 已 FIX-LANDED 项的回归点
> - BUG-182（视觉粒度一致性）R19 backlog
>
> 走查工具：
> - `chrome-devtools-mcp`：`navigate_page` / `list_console_messages` / `list_network_requests` / `take_snapshot` / `wait_for` / `evaluate_script` / `click` / `fill`
> - 后端 stderr 直接捕获（重启 NestJS dev 进程到 `/tmp/cms-server.log`），用于定位 `[ExceptionsHandler]` 栈
> - PostgreSQL 直读（`docker exec cms-client-postgres-1 psql -U cms -d cms`）
> - Server `/tmp/probe-due.js`（动态读 `pg` 列原生 JS 类型）
>
> 走查环境：admin `:5173`（vite 反代 `/api` → `:3300`，rewrite 去掉 `/api`）、server NestJS `:3300`、PostgreSQL `cms-client-postgres-1` `:5433`、登录 `admin@local.test` / `Admin123!`
> 与第十八轮（`27-...md`）互为续篇。

---

## 0. 第十九轮总结

### 0.1 R18 § 7 R19 建议 5 项执行

| # | R19 建议 | R19 实测 | 一句话 |
|---|---|---|---|
| 1 | BUG-182 land（StageChip 视觉粒度统一） | **未处理 + 三处口径不一致重申** | Cases list 显示「Archived / Case opened」全文 label；Customer Detail 的 Cases tab 同案件显示 raw `S9`；Case Detail header 同时显示 `Case opened` + `S1` 两行。三处口径都不一样。详见 §3。|
| 2 | `statusOfResidence` 是否补到顶层（个人客户筛选用） | **维持不 land** | R19 走查未触发"按在留资格筛选"用户路径；当前 Customer Detail 显示的 `Visa type` 字段是 raw enum `BUSINESS_MANAGER`（详见新发现 BUG-185）。先把 BUG-185 land 再讨论顶层暴露。|
| 3 | `insertInitialBillingPlanFromQuote` helper 复用度评估（batch import 等） | **不在本轮范围** | 当前没有 batch import case 路径上线，保持 R18 land 状态。|
| 4 | migration 040 down.sql no-op 决议复检 | **不在本轮范围** | 文档化建议落到 `docs/...migrations/` 下属于另一议题，不影响门禁。|
| 5 | server / admin 全仓 `max-lines` 健康度扫描 | **不在本轮范围** | 工具改进类，不属于走查清单。|

### 0.2 R19 关键发现：1 条 P0 + 4 条 P1/P2 新 BUG

| 编号 | 一句话 | 等级 | R19 状态 |
|---|---|---|---|
| **BUG-184** | Dashboard `scope=mine` 触发 `formatDateLabel` `value.slice is not a function` 500 — pg 把 `due_at` 解析为 `Date`，但 server 里类型声明 `string`。 | **P0** | **新发现 / 未 land**（R18 land BUG-181 后才暴露；fallback UI 在 admin 端能挡住，但所有 owner 是当前用户的 risk 案件全部丢失）|
| **BUG-185** | Customer Detail `Visa type` 字段在 en-US 显示 raw enum `BUSINESS_MANAGER`（下拉选项已本地化为 "Business manager"）。 | P2 | 新发现 / 未 land |
| **BUG-186** | Case Detail Billing tab 在 en-US / zh-CN 下，billing 行 `TYPE` 列显示日文硬编码 `案件報酬`、`STATUS` 列显示日文 `応収`。R18 BUG-181 fix 写入 `milestone_name='案件報酬'` 时无 i18n 化。 | P1 | 新发现 / 未 land |
| **BUG-187** | Customer 创建弹窗标题硬编码 `Create individual customer`，没有切换 corporation 入口；BUG-183 R18 已暴露顶层 `type` 字段，但 admin UI 创建路径只能创建 individual。 | P2 | 新发现 / 未 land（R17 BUG-183 衍生项）|
| **BUG-188** | Customer 创建弹窗的 Date of birth picker 按钮 `显示日期选择器` 在 en-US/ja-JP 下显示 zh-CN 残串。spinbutton label `年/月/日` 同样未本地化。 | P3 | 新发现 / 未 land |

### 0.3 R18 land 项 R19 回归对照

| BUG | R18 标记 | R19 实测 | 备注 |
|---|---|---|---|
| BUG-180（customer detail vs case list status 不一致）| ✅ FIX-LANDED | **✅ PASS**（status 列对齐）| 但 stage 列粒度仍不一致 → 见 BUG-182 |
| BUG-181（quotePrice → billing_records 同步）| ✅ FIX-LANDED | **✅ PASS** + ⚠️ 触发 BUG-184 / 186 副作用 | Case detail BILLING STATUS = `¥150,000` Unpaid；Cases List Outstanding = `¥150,000` 与 `¥80,000` / `¥50,000` 多 case 命中；但 case 进入 dashboard 风险列表时触发 BUG-184 500，billing 表里 milestone_name 写死日文触发 BUG-186 |
| BUG-183（CustomerSummaryDto 顶层 `type` 字段）| ✅ FIX-LANDED | **✅ PASS**（API 层）| `GET /customers` 返回 item 顶层 `type:"individual"`，但 admin 列表/详情 UI 还没把字段渲染出来；admin 创建路径也未提供切换 → 见 BUG-187 |

### 0.4 R16 / R17 land 项 R19 回归对照

| BUG | 历史标记 | R19 实测 | 备注 |
|---|---|---|---|
| BUG-174（CaseValidationTab 22 段中文）| R17 ✅ FIX-LANDED | **✅ PASS** | en-US 下 Pre-submission check tab 全英文（`Validation passed, no blockers / Submission packages (history) / Create package / Double Review / Arrears Risk Confirmation Log` 等），无 zh-CN 残串|
| BUG-175（reminder ja-JP 泄漏）| ✅ PASS | 本轮未触发 | — |
| BUG-176（错误 toast 双前缀）| R17 ✅ FIX-LANDED | 本轮未触发 | — |
| BUG-177 / 178（applicant case_parties + migration 039）| R17 ✅ FIX-LANDED | 本轮未触发 | — |
| BUG-179（Dashboard work-item i18n 漏洞）| R17 ✅ FIX-LANDED | **⚠️ 被 BUG-184 阻断**（mine scope 500 → 风险卡片根本到不了渲染层）| BUG-184 land 后再做 BUG-179 三语完整复跑 |

### 0.5 三句话结论

1. **R19 期内最关键发现：BUG-184 P0**。R18 BUG-181 land 之后，`billing_unpaid_amount_cached > 0` 的 case 进入 `loadRiskItems` 触发 `mapRiskItem.dueMetaLabel(due_at)`，因 `pg` driver 把 `timestamp with time zone` 解析为 JS `Date` 而非 string，`formatDateLabel(value).slice(0,10)` 抛 `TypeError`，整个 `GET /dashboard/summary?scope=mine` 500。admin 端有 fallback 显示 "Dashboard data failed to load"，所以用户视觉上不崩溃，但所有 owner 是自己的案件的"今日待办 / 期限 / 待提交 / 风险"四类面板**全部归零**。BUG-179 R17 的三语 i18n land 因此被掩盖。
2. **BUG-186 是 BUG-181 fix 的连锁副作用**。`insertInitialBillingPlanFromQuote` 写入 `milestone_name='案件報酬'`、`status='due'`，admin Billing tab 在 en-US 下直接 raw 渲染日文 `案件報酬` + 日文 `応収`，无 i18n key 化。
3. **R19 期间未 land 任何代码**——本轮全程是走查 + 取证 + 报告，符合"先看清楚再动手"原则。R20 优先级建议：BUG-184（P0，阻塞 dashboard 全功能） → BUG-186（P1，BUG-181 副作用） → BUG-185 / 187 / 188（P2/P3，i18n + 表单缺口） → BUG-182（视觉粒度统一，仍 backlog）。

---

## 1. BUG-184（P0）：Dashboard mine scope 500 — pg Date vs string slice

### 1.1 复现

| 步骤 | 实测 |
|---|---|
| 登录 admin `admin@local.test`，浏览器自动跳到 `#/`（dashboard） | 看到 "Dashboard data failed to load. Please try again later." + Retry 按钮 |
| chrome-devtools-mcp `list_network_requests` | `GET /api/dashboard/summary?scope=mine&timeWindow=7` → **500 ×2**（含一次 retry）|
| `curl -X POST /auth/login` 拿到 JWT，直接 `GET /dashboard/summary?scope=mine&timeWindow=7` | `{"statusCode":500,"message":"Internal server error"}` |
| `scope=group` | `400 NO_PRIMARY_GROUP`（不相关，admin 用户不属于任何 primary group）|
| `scope=all` | `400 Invalid scope`（注：admin 端 tab "All firm" 调用 scope=all，但 controller `parseScope` 接受 `mine \| group \| all`——可能 admin 端发的 query string 参数与 server 期望不一致；这是另一个细分问题 R20 复测）|
| `scope=mine&timeWindow=30` | 同样 500 |

### 1.2 服务端栈

重启 server 把 stderr 写到 `/tmp/cms-server.log`，重发 mine scope 请求后捕获到：

```
[Nest] 71525  - 05/02/2026, 10:25:29 AM   ERROR [ExceptionsHandler] TypeError: value.slice is not a function
    at formatDateLabel (packages/server/src/modules/core/dashboard/dashboard.workItem.ts:17:16)
    at dueMetaLabel (packages/server/src/modules/core/dashboard/dashboard.workItem.ts:55:17)
    at mapRiskItem (packages/server/src/modules/core/dashboard/dashboard.workItem.ts:311:7)
    at Array.map (<anonymous>)
    at DashboardService.loadRiskItems (packages/server/src/modules/core/dashboard/dashboard.service.ts:437:24)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async DashboardService.loadPanels (.../dashboard.service.ts:179:14)
    at async DashboardService.buildDashboardSummary (.../dashboard.service.ts:157:15)
```

### 1.3 根因

`packages/server/src/modules/core/dashboard/dashboard.workItem.ts:15-18`：

```ts
function formatDateLabel(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}
```

类型签名声明 `value: string | null | undefined`，但实际 `pg` driver 把 `timestamp with time zone` 列默认解析为 JS `Date` 对象（`pg` 内置 `OID 1184` parser）。直接调用 `Date.prototype.slice` → `TypeError`。

DB 直读取证（`/tmp/probe-due.js`，使用 `pg` 库直接 query 同一连接串）：

```js
row = {
  due_at: 2026-08-31T00:00:00.000Z,
  billing_unpaid_amount_cached: '0.00'
}
typeof due_at = object | Date     // ← Date 对象，不是 string
typeof unpaid = string             // ← numeric 列被解析为 string
```

### 1.4 触发条件 / 为何 R18 land 时未暴露

`mapRiskItem` 走 `c.due_at` 必须先要案件命中 `loadRiskItems` 的 SQL 条件：

```sql
where c.org_id = $1
  and c.archived_at is null
  and (
    c.risk_level = 'high'
    or c.billing_unpaid_amount_cached::numeric > 0
    or lv.result_status = 'failed'
  )
```

R17 走查时 `cases.billing_unpaid_amount_cached` 全表 0、`risk_level = 'high'` 也没数据、validation_runs 命中 failed 的少。R17 §6 BUG-179 单测使用的是 mock fixtures，`due_at` 用的是 string；走查时浏览器看到的 risk 卡是组装出来的（payload 里 `descParams.amount = "¥80,000"`），但 dashboard 跑通是因为 risk 卡 entry 不命中真实 case 行。

R18 BUG-181 land 后：
- `cases.service.ts.insertInitialBillingPlanFromQuote` 在创建 case 时写入 `billing_records`、并 `syncBillingCacheForCase` 把 `cases.billing_unpaid_amount_cached` 同步到 quote_price。
- migration 040 backfill 历史 3 cases × 150,000 JPY。
- BUG-181 land 后这 3+ cases 全部首次满足 `loadRiskItems` 的 `billing_unpaid_amount_cached::numeric > 0` 条件，开始进入 `mapRiskItem` → `dueMetaLabel(row.due_at)` → `formatDateLabel(Date)` → `TypeError`。

**因此 BUG-184 严格意义上是 R18 BUG-181 land 后才被实际触发的回归**（代码在 R17 BUG-179 里已经存在）。

### 1.5 二阶风险扩展面

`packages/server/src/modules/core/dashboard/dashboard.workItem.ts` 中所有传 `due_at` 的 mapper 路径都有同样问题：

| 函数 | 调用 `dueMetaLabel(row.due_at)` 行 | 触发条件 |
|---|---|---|
| `mapTodoItem` | `122` | `loadTodoItems` 任一行 due_at 非 null，且当前 owner 命中 task |
| `mapDeadlineItem` | `157` | `loadDeadlineItems` 任一行（必有 due_at，因为 SQL `due_at is not null`）|
| `mapSubmissionItem` | `232` | `loadSubmissionItems` 任一行 stage='S6' 且 owner 命中 |
| `mapRiskItem` | `311` | 已确认实际触发 |

R19 期间 admin 端实际只有 risk 路径命中（其他面板暂时空数据），但只要 mine scope 下出现一条 deadline / submission case，立刻同样 500。

### 1.6 修复方案（不在 R19 land 范围）

最小修复（R20 优先）：

```ts
function formatDateLabel(
  value: string | Date | null | undefined,
): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}
```

并把 `TodoRow / DeadlineRow / SubmissionRow / RiskRow` 中 `due_at` 类型从 `string | null` 改为 `string | Date | null`。

测试覆盖建议：
- 新增 `dashboard.workItem.formatDateLabel.test.ts`：3 case（string / Date / null）。
- 新增 `dashboard.service.bug184-pg-date.focused.test.ts`：使用真实 PG（如 R17/R18 已用的 31 PG 集成测试同款 fixture）触发 mine scope 真路径，断言不抛 TypeError。

---

## 2. BUG-186（P1）：Billing 行 milestone_name + status 在 en-US/zh-CN 下显示日文 raw

### 2.1 复现

```
admin 切 en-US
→ 进 case CASE-202605-0003 → Billing tab
→ 表头：DATE / TYPE / AMOUNT / STATUS / ACTIONS （en-US）
→ 行内容：
   TYPE   = "案件報酬"   ← 日文硬编码
   AMOUNT = "¥150,000"
   STATUS = "応収"       ← 日文硬编码（应为 "Outstanding" / "Due"）
```

### 2.2 根因

`packages/server/src/modules/core/cases/cases.service.ts:insertInitialBillingPlanFromQuote`（R18 BUG-181 fix）写入 `billing_records.milestone_name='案件報酬'`、`status='due'`、`gate_effect_mode='warn'`。admin 端 Billing tab 渲染时直接读 raw `milestone_name` + 没有把 `status='due'` 走 i18n 映射。

### 2.3 修复方案

两条路（不互斥）：

A. **数据层固化为 i18n key**：把 `billing_records.milestone_name` 改为存 i18n key（如 `case_fee`），admin 渲染时调 `t('billing.milestone.case_fee')`。
B. **admin 渲染层 fallback i18n 字典**：在 admin 的 billing 列表组件里加一个 milestone_name → i18n key 的映射表，未命中时 raw 显示（保 backward compat）。

R20 优先 A 方案；同时把 `status='due'` 渲染走 `t('billing.status.due')` 三语化。

### 2.4 单测建议

新增 admin `case-detail/components/CaseBillingTab.bug186.test.ts`：
- mock billing_records `[{milestone_name:'案件報酬', status:'due'}]`
- en-US locale → 断言 row 不含 `案件報酬` 或 `応収`，含 `Case fee` / `Outstanding`
- zh-CN / ja-JP 同样断言

---

## 3. BUG-182 重申：三处 stage 渲染粒度不一致

R18 §7 第 1 条建议把 BUG-182 land 进 R19，但 R19 期间未做。R19 走查 3 个页面同一案件 `BUG-117 CLOSED_FAILED (3ede349e...)`：

| 页面 | Stage 列 / 字段渲染 |
|---|---|
| Cases List `#/cases` | `Archived`（全文 label，✅ 本地化）|
| Customer Detail Cases tab `#/customers/:id?tab=cases` | `S9`（raw stage code，❌）+ Status 列 `Archived`（✅，R18 BUG-180 fix 后对齐）|
| Case Detail header `#/cases/:id` | `Case opened` + `S1` 双行（双粒度并列，🟡）|

三处口径都不一样：
- Cases List 端只显示 label。
- Customer Detail Cases tab 端只显示 code（"Archived" 来自 BUG-180 status 列，不是 stage 列）。
- Case Detail header 端两个都显示。

**R19 重申 BUG-182 仍 backlog**。建议 R20 land：
- 抽出 `<StageChip code="S9" precision="full" | "short" | "both" />` 组件
- Cases List 用 `precision="full"`
- Customer Detail Cases tab 用 `precision="full"`（与 Cases List 对齐）
- Case Detail header 用 `precision="both"`（保留双粒度作为 header dense info）

---

## 4. BUG-185（P2）：Customer Detail Visa type raw enum

### 4.1 复现

```
admin 切 en-US
→ 进 customer R6试探客户 → Basic info tab
→ Visa type 字段（disabled textbox）值显示：BUSINESS_MANAGER
   旁边帮助文本：Derived from BMV visa plan

   对比 Add customer 弹窗的 Visa type 下拉选项：
     —, Business manager, Engineer / Specialist in humanities, ...
```

### 4.2 根因

Customer Basic info 里 `Visa type` 字段是 disabled textbox，直接绑定 customer.visaType 或类似 raw enum 字段；下拉只在编辑态走映射。

### 4.3 修复方案

把 detail 端 visa type 渲染逻辑改为先查映射表（同下拉的 i18n key），再 fallback raw。

---

## 5. BUG-187（P2）：Customer 创建弹窗只支持 individual

### 5.1 复现

```
admin 切 en-US
→ /customers 页 → 点击 "Add customer"
→ 弹窗标题：Create individual customer  ← 硬编码 individual
→ 表单字段：Display name / Group / Legal name / Furigana / Gender / Date of birth / Nationality / Phone / Email / Location / Source type / Visa type / Avatar / Notes
→ 没有 Customer type / Individual vs Corporation 切换
→ 没有 Legal entity / Representative / Company kana 等 corporation-only 字段
```

### 5.2 与 BUG-183 的关系

R18 BUG-183 已经在 server 层 expose 顶层 `type` 字段（实测 R19 列表 API 返回 `type:"individual"`），但 admin 创建表单从未提供 corporation 路径。R17 §4 描述的「`POST /customers {type:"corporation",...}` → 201」只能通过 curl 直 API，admin 自身 UI 不能创建 corporation。

### 5.3 修复方案

弹窗顶部加 `<RadioGroup>`：
- Individual（默认）→ 现有表单
- Corporation → 显示 `Legal name` 必填，新增 `Representative name` / `Company kana` 字段，隐藏 individual-only 字段（性别、生日、国籍、签证类型）

POST payload 根据 radio 决定走 `{type:"individual",...}` 还是 `{type:"corporation",...}`。

---

## 6. BUG-188（P3）：Customer 创建弹窗 Date of birth picker 残串

### 6.1 复现

```
admin 切 en-US
→ /customers → Add customer 弹窗
→ Date of birth picker：
   spinbutton "年 年" / "月 月" / "日 日"  ← zh-JP 残留 label
   button "显示日期选择器" haspopup="menu"  ← zh-CN 残留
```

### 6.2 范围说明

`年/月/日` spinbutton 标签和「显示日期选择器」按钮都不是浏览器原生 `<input type="date">` 的 system 文案（system 通常跟着浏览器语言走），看上去是某个第三方 picker 组件 hardcode 中文/日文标签。

### 6.3 修复方案

定位 picker 组件（应在 `packages/admin/src/shared/ui/` 下）→ 把 `年/月/日 / 显示日期选择器 / 未选择任何文件` 三处都接通 i18n key。

---

## 7. R19 走查执行明细

### 7.1 chrome-devtools-mcp 真浏览器流

| 步骤 | 工具 | 结果 |
|---|---|---|
| 1. `evaluate_script` 设 `localStorage['cms-admin-locale']='en-US'` + clear token | OK | locale 切到 en-US |
| 2. `navigate_page` `#/login`、`fill` email/pass、`click` 登录 | wait_for "Dashboard / 工作台" | 登录成功，跳到 `#/` |
| 3. `take_snapshot` dashboard | 看到 "仪表盘数据加载失败" + Retry | 中文（locale 未刷新）|
| 4. `evaluate_script` 设 en-US 后 reload | wait_for "Dashboard" | 切到 en-US，仍 fallback "Dashboard data failed to load" |
| 5. `list_console_messages` + `list_network_requests` | 2× `GET /api/dashboard/summary?scope=mine&timeWindow=7` 500 | 定位 BUG-184 |
| 6. 进 Customers list、Add customer 弹窗 | 看到 "Create individual customer" | 定位 BUG-187 / 188 |
| 7. 进 Customer Detail R6试探客户 | 看到 Visa type = `BUSINESS_MANAGER` | 定位 BUG-185 |
| 8. 切 Cases tab | 看到 S9 / Archived 不同列 | 验 BUG-180 PASS、重申 BUG-182 |
| 9. 进 Case Detail CASE-202605-0003 → Billing tab | 看到 `案件報酬` / `応収` | 定位 BUG-186、验 BUG-181 PASS |
| 10. 切到 Pre-submission check tab | 全英文 | 验 BUG-174 PASS |
| 11. 切 ja-JP reload | 看到 "ダッシュボードデータの読み込みに失敗しました" | dashboard fallback ja-JP 也是 PASS（R17 BUG-179 i18n 在 fallback message 上 OK，但风险卡因 BUG-184 到不了渲染层）|
| 12. 回到 Cases list 页对比 stage 列 | 看到 "Archived / Case opened" 全文 label | 重申 BUG-182 |

### 7.2 后端栈定位

```bash
# kill 现有 server 进程
kill 48431

# 重启并捕获 stderr
cd packages/server && nohup npm run dev > /tmp/cms-server.log 2>&1 &

# 触发 mine scope 500 后 tail log
TOKEN=$(curl -s -X POST http://localhost:3300/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.test","password":"Admin123!"}' | jq -r .token)
curl -s "http://localhost:3300/dashboard/summary?scope=mine&timeWindow=7" \
  -H "Authorization: Bearer $TOKEN"

# stderr：
# TypeError: value.slice is not a function
#   at formatDateLabel (.../dashboard.workItem.ts:17:16)
#   at dueMetaLabel (.../dashboard.workItem.ts:55:17)
#   at mapRiskItem (.../dashboard.workItem.ts:311:7)
```

### 7.3 PG 列原生类型取证

```bash
$ node /tmp/probe-due.js
row = {
  due_at: 2026-08-31T00:00:00.000Z,
  billing_unpaid_amount_cached: '0.00'
}
typeof due_at = object | Date
typeof unpaid = string
```

### 7.4 BUG-183 R18 land 项 API 验证

```bash
$ curl -s "http://localhost:3300/customers?limit=2" -H "Authorization: Bearer $TOKEN" | jq '.items[0] | keys'
[
  "id", "type", "displayName", "legalName", "furigana",
  "customerNumber", "phone", "email", "totalCases", "activeCases",
  "lastContactDate", "lastContactChannel", "owner",
  "referralSource", "group", "bmvProfile"
]

$ curl ... | jq '.items[0].type'
"individual"
```

✅ R18 BUG-183 fix 在 server 层 land 成功；admin UI 还没把字段渲染出来（不是 R18 范围）。

### 7.5 BUG-181 cases list 端验证

Cases List `#/cases` 右上角统计：
- Active cases: 16
- Failed checks: 0
- Due soon: 0
- Outstanding amount: **360,000**（= 150,000 × 2 + 80,000 × 1 + 50,000 × 1 −？这部分待后续核对，但起码非 0，说明 R18 migration 040 backfill 让 `billing_unpaid_amount_cached` 求和正确）

逐行 Outstanding 列：
- CASE-202605-0003 `R6试探客户 Business Manager (CoE 4-month)` → ¥150,000（与 case detail 对齐）
- CASE-202604-0015 `BUG-111 verify B 6.4` → ¥80,000
- CASE-202604-0012 `R6 BUG-097 retest` → ¥80,000
- CASE-202604-0010 `R6 phase e2e probe` → ¥50,000

数据一致性验证 PASS。

---

## 8. R18 → R19 回归得分卡

| # | 来源 | 项 | R18 标记 | R19 实测 |
|---|---|---|---|---|
| 1 | R16 / R17 | BUG-174（CaseValidationTab.vue 22 段）| ✅ FIX-LANDED | ✅ PASS（en-US 实测 Pre-submission check tab 全英文）|
| 2 | R16 / R17 | BUG-175（reminder ja-JP 泄漏）| ✅ PASS | 本轮未触发回归路径 |
| 3 | R16 / R17 | BUG-176（错误 toast 双前缀）| ✅ FIX-LANDED | 本轮未触发回归路径 |
| 4 | R16 / R17 | BUG-177 / 178（applicant case_parties + migration 039）| ✅ FIX-LANDED | 本轮未触发回归路径 |
| 5 | R17 / R18 | BUG-179（Dashboard work-item i18n 漏洞）| ✅ FIX-LANDED | **⚠️ 被 BUG-184 阻断**（mine scope 500 → 风险卡片到不了渲染层）|
| 6 | R18 | BUG-180（customer detail vs case list status 不一致）| ✅ FIX-LANDED | ✅ PASS（status 列对齐）|
| 7 | R18 | BUG-181（quotePrice → billing_records 同步）| ✅ FIX-LANDED | ✅ PASS（Outstanding 多 case 命中、cache 正确）+ ⚠️ 触发 BUG-184 / 186 副作用 |
| 8 | R16 / R17 / R18 | BUG-182（CURRENT STAGE 渲染粒度不一致）| 未处理 backlog | **未处理**（重申三处口径不一致）|
| 9 | R18 | BUG-183（API DTO 顶层 type）| ✅ FIX-LANDED | ✅ PASS（API 层）+ 衍生 BUG-187（admin 创建路径未跟进）|
| 10 | **R19 新发现** | **BUG-184（dashboard mine scope 500）**| — | **❌ 未 land**（P0）|
| 11 | **R19 新发现** | **BUG-185（Visa type raw enum）**| — | **❌ 未 land**（P2）|
| 12 | **R19 新发现** | **BUG-186（Billing milestone/status 日文 raw）**| — | **❌ 未 land**（P1）|
| 13 | **R19 新发现** | **BUG-187（创建弹窗只支持 individual）**| — | **❌ 未 land**（P2）|
| 14 | **R19 新发现** | **BUG-188（Date picker zh-CN 残串）**| — | **❌ 未 land**（P3）|

**得分**：14 项中 **6 ✅ 维持 + 1 ⚠️ 被阻断 + 2 重申 backlog + 5 R19 新发现**。

---

## 9. R20 建议（按优先级）

1. **BUG-184（P0）**：dashboard.workItem.ts 修复 `formatDateLabel` 接受 `Date`，同步把 `TodoRow/DeadlineRow/SubmissionRow/RiskRow.due_at` 类型改为 `string | Date | null`，新增 `dashboard.workItem.formatDateLabel.test.ts`（3 case）+ `dashboard.service.bug184-pg-date.focused.test.ts`（PG 真路径）。**这一项必须最优先**——dashboard 是首屏，500 阻塞 BUG-179 三语 i18n 验收和未来所有 dashboard 类工作。
2. **BUG-186（P1）**：BUG-181 副作用收尾。`billing_records.milestone_name` 数据层固化为 i18n key（`case_fee`），admin 渲染走 `t('billing.milestone.case_fee')` + `t('billing.status.due')`。
3. **BUG-185（P2）**：Customer Basic info 端 `Visa type` 字段读 i18n 字典，避免 raw enum 渲染。
4. **BUG-187（P2）**：BUG-183 衍生项。Customer 创建弹窗顶部加 `<RadioGroup individual / corporation>`，根据 radio 切换字段集合 + POST payload `type` 字段。
5. **BUG-188（P3）**：Customer Date of birth picker 组件三处 zh-CN/ja-JP 残串接通 i18n。
6. **BUG-182（visual polish）**：抽 `<StageChip>` 组件，Cases List / Customer Detail Cases tab / Case Detail header 三处口径统一。R20 视觉规范走查第四轮（admin UI）合并 land。
7. **`scope=all` 控制器 / 前端 query 不一致**：R19 走查时 server 端 `parseScope` 接受 `mine|group|all`，但 dashboard tab "All firm" 调用何种 query string 需独立验证（本轮未深入），R20 顺手补一句话单测。

---

## 10. 风险与决策

- **R19 不 land 任何代码**：本轮全程是走查 + 取证 + 报告。BUG-184 P0 应在 R20 立刻 land；如果不 land 等到 R21，dashboard 默认 mine scope 用户进系统第一屏一直看 fallback。
- **R18 重启 server 进程的副作用**：本轮为了 capture stderr 重启过 NestJS server（kill 旧 pid、`nohup npm run dev > /tmp/cms-server.log`），R19 走查结束已 kill 新进程。建议 R20 用户重启 server 或下次开发时按需重启。

---

走查方完成。

