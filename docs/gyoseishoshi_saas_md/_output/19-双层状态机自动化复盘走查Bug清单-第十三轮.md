# 客户/案件模块（admin）— 双层状态机自动化复盘走查 Bug 清单（第十三轮 / 事务所流程驱动 e2e 走查 + R12 land 验收）

> 生成日期：2026-04-30（同日 chrome-devtools-mcp 复盘走查 + 事务所流程 Step 1-20 全链路驱动覆盖 + R12 §1 BUG-133~156 闭环验收）
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/18-双层状态机自动化复盘走查Bug清单-第十二轮.md` §1 BUG-133 / 134 / ... / 156（24 条）
> - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md`（20 步状态机 / 数据结构 / 业务规则）
> - `docs/事务所流程/在留資格別必要情報一覧Ver2.中文规范版资料清单.md`（7 场景资料矩阵；本轮聚焦"经营管理签 4 个月认定"）
>
> 走查工具：`chrome-devtools-mcp`（`navigate_page` / `take_snapshot` / `evaluate_script` / `take_screenshot` / `fill` / `list_console_messages` / `list_network_requests`）+ `curl`（HTTP API）+ `psql`（DB 直查）+ 代码审查
> 走查环境：`http://localhost:5173/api`，本地 admin（`admin@local.test` / `Admin123!`）；后端 NestJS `:3300`，Vite 反代 `:5173`，PostgreSQL `cms-client-postgres-1` `:5433`
> 与第十二轮（`18-...md`）互为续篇；本轮**先验 R12 §1 全部 24 条**，再以经管签 4M（BMV-CERT-4M）流程为锚把 admin 全链路走完，统一登记走查中暴露的**新偏差**与**R12 land 项实测验收差异**。
>
> mempalace `prepare_grounded_answer` 已 grounded（biz-mgmt-renewal scenario / 咨询线索页面规格 / 资料清单总论）；本文不直接陈述业务规则，仅以"产品规则 / 文档锚点"维度引用。

---

## 0. 第十三轮总结

### 0.1 R12 §1 全部 24 条实测验收（chrome-devtools-mcp 实测）

| # | R12 结论 | R13 实测 | 一句话 |
|---|---|---|---|
| BUG-133（CaseOverviewTab stage 卡未 i18n / 终态硬编码 `"S9"`） | R12 ❌ FAIL（继承） | **✅ PASS** | en-US 下 CASE-202604-0004 (S2/WAITING_MATERIAL) overview value = `Collecting documents`；CASE-202604-0011 (S1/CLOSED_SUCCESS terminal) en-US overview value = `Case opened` + `Closed`，ja-JP `案件開始` + `結案済み`；终态不再硬编码 `S9`。|
| BUG-134（BillingListView GROUP filter 模块级 JA 默认） | R12 §1 ✅ FIXED | **✅ PASS** | en-US 下过滤下拉 = `["All groups","Tokyo Team 1","Tokyo Team 2"]`，无 JA `東京一組` 残留；R12 §1 修复方向已 land。|
| BUG-135（server 8 处 `String(row.created_at)`） | R12 ✅ PASS | **✅ PASS** | `/api/groups[].createdAt = "2026-04-27T11:40:49.675Z"` ISO 持续合规；server 仓库扫无 `String(*_at)` 残留。|
| BUG-136（CustomerListView group cell 直显 raw UUID） | R12 ⚠️ PARTIALLY FIXED | **✅ PASS（完整）** | Customers 列表 + 建案向导 Step 2 客户下拉 + 选中卡 + Step 3 inherited group 三处全部展示 `东京一组` / `Tokyo Team 1`，alias map 已扩展到 case 链路。|
| BUG-137（empty birthday → 400 + raw i18n key） | R12 ❌ FAIL | **❌ FAIL（继承）** | `POST /api/customers` body `birthday=""` 仍返回 `400 "Invalid baseProfile: birthday must be a valid date string"`；`buildBaseProfile` 仍透传空字符串；i18n key `customers.list.createModal.state.validationError` 仍未注册。|
| BUG-138（CaseDetailView coach 按钮 raw key） | R12 ❌ FAIL | **✅ PASS** | en-US 下 CASE-202604-0004 概览页扫无 `cases.coach.docManagement` / `cases.coach.runValidation` raw key；i18n 资源已补；同时 mount 后整页不出现 `^(cases\|customers\|leads\|shared)\.[a-zA-Z0-9_.]+` 形式 raw key。|
| BUG-139（建案向导 3 处 group UUID） | R12 ❌ FAIL | **✅ PASS** | zh-CN 下建案向导 Step 2 客户下拉 = `R6试探客户 / 东京一组`；选中卡 = `R6试探客户 · 主申请人 · 东京一组`；Step 3 = `Group 继承自主申请人： 东京一组`；UUID 仅在顶部 source 标签出现（详见 BUG-161）。|
| BUG-140（BillingTable row Group cell） | R12 ❌ FAIL | **✅ FIX-LANDED（前端 + 服务端 + 迁移）** | en-US 下 Group 列三行均显示 `—`（`disabledSuffix`）。`BillingTable` 已切到 `resolveGroupLabel`（前端 fix 已 land）；R13 补强服务端 BUG-159 根因（`cases.service.ts#resolveCustomerGroupId` 双路径 name/UUID 匹配 + migration 037 历史 cases.group_id 二次回填），后续新建/历史案件 group 持久化均覆盖。`packages/server/src/modules/core/cases/cases.service.bug159-group-inheritance.focused.test.ts` 锁定 SQL `g.name = cv.group_val OR g.id::text = cv.group_val` 双路径不再回退。R14 实测：migration 037 应用后 10/19 行 cases.group_id 回填为有效 UUID（`ef21fdd2-...` = tokyo-1），BillingTable Group cell 三语本地化展示（zh-CN `东京一组` / en-US `Tokyo Team 1` / ja-JP `東京一組`），BUG-159 关联闭环。|
| BUG-141（legacy referrer + sourceType cond） | R12 §1 ✅ FIXED | **✅ PASS** | modal 仅含 referrerName 字段，sourceType=`—` 时不渲染；切到 `Referral` 时显示且带 `id=customer-create-referrerName` + `<label for>`；legacy referrer 文本框完全消失。|
| BUG-142（/#/tasks placeholder） | R12 §1 ✅ FIXED | **⚠️ MOSTLY PASS（路由已 land 但 nav 缺漏 → BUG-157）** | `/#/tasks` 渲染真实 `TaskListView`（pending/due/overdue/reminder log 4 卡 + Reminder log 3 行 wired GET /api/reminders），但**侧边栏 nav 没有 Tasks 入口**——`nav-config.ts:137-139` 注释仍写"占位页隐藏"；用户必须直链访问。详见 §1 BUG-157。|
| BUG-143（案件列表 type 列 raw enum） | R12 ❌ FAIL | **✅ PASS** | zh-CN 下 19 行 type 列 = `经营管理（认定4个月）` / `经营管理签` / `家族滞在`；en-US 下 = `BMV (CoE 4-month)` 等本地化标签，无 raw `biz_mgmt_4m` 残留。|
| BUG-144（Step 1 模板 description en-US） | R12 ❌ FAIL | **✅ PASS** | en-US 下 10 个模板按钮 description 全英化（`CoE 4-month — focus on applicant background...` 等），不再有 zh-CN 字面 fallback。|
| BUG-145（POST /api/customers numbering） | R12 §1 ✅ FIXED | **✅ PASS** | 直接 `POST /api/customers` 创建 2 个客户，response `baseProfile.customerNumber = CUS-202604-0006` / `0007` 单调递增；list 顶层字段 `customerNumber` 同步可见；admin 列表展示 `CUS-202604-0005` / `0004`。|
| BUG-146（Customers owner 列空） | R12 §1 ✅ FIXED | **✅ PASS** | scope=mine / scope=all 两条客户行 owner 列均显示 `LA Local Admin`，详情页 `Customer owner` dropdown `value="Local Admin"` 命中。|
| BUG-147（check-duplicates debounce） | R12 §1 ✅ FIXED | **✅ PASS** | 一次性填写 displayName + group + legalName + phone + email 5 字段后，`POST /api/customers/check-duplicates` 仅触发 3 次（按字段 250ms debounce），远低于 R12 取证的 28 次。|
| BUG-148（modal a11y id/name/label） | R12 §1 ✅ FIXED | **✅ PASS** | modal 内 14 个 input/select 全部具备非空 `id` + `name`，全部有匹配的 `<label for>`；`labelMissingCount = 0`；`noId = []` / `noName = []`。|
| BUG-149（建案标题双重拼接） | R12 §1 ✅ FIXED | **⚠️ MOSTLY PASS** | zh-CN BMV-CERT-4M 标题 = `经营管理（认定 4 个月）`，"认定" 仅 1 次 ✅；en-US Dependent Visa 标题 = `Dependent Visa Certificate of Eligibility`，已加空格 ✅。**剩余增量缺陷 → BUG-162**：en-US BMV-CERT-4M 模板标签内是缩写 `(CoE 4-month)`，与申请类型 `Certificate of Eligibility` 全称在语义上重复，但字面 `includes` 不命中。|
| BUG-150（Step 3 owner dropdown 无 Local Admin） | R12 §1 ✅ FIXED | **✅ PASS** | zh-CN 下建案向导 Step 3 owner options 首项 = `Local Admin`；catalog 7 项保持稳定。|
| BUG-151（Step 4 收费金额 raw） | R12 ❌ FAIL | **未验证（受门禁阻断）** | BMV 案件创建被 BUG-158 前置门禁阻断（`下一步`按钮 disabled），无法走到 Step 4；占位"收费金额：未设定" 未触发 raw 数字渲染。|
| BUG-152（主申请人 hardcoded JA） | R12 ❌ FAIL | **✅ PASS** | zh-CN 下选中卡片 = `R6试探客户 · 主申请人 · 东京一组`，副本是简体 "主申请人"，不再 hardcoded JA "主申請人"；`useCustomerDropdownData.ts:141 roleHint: "cases.create.step2.primaryRole"` i18n key 已 land。|
| BUG-153（CaseDetailView phase chip 重复 2 次） | R12 §1 ✅ FIXED | **✅ PASS** | en-US CASE-202604-0011 header chips = `["Case opened","Closed (success)"]` 仅 2 项；ja-JP `["案件開始","成功クローズ"]` 仅 2 项；overview sidebar phase Card 已删除。|
| BUG-154（客户详情 owner unselected） | R12 §1 ✅ FIXED | **✅ PASS** | R6试探客户详情页 `Customer owner` dropdown `value="Local Admin"`，options[0] = Local Admin 已注入。|
| BUG-155（"我的客户" vs 列表口径分裂） | R12 §1 ✅ FIXED | **✅ PASS** | summary cards `MY CUSTOMERS = 2`，列表 tab `Mine = 2 customers`，与 server `scope=mine` 输出完全一致。|
| BUG-156（Settings group 创建时间 ISO） | R12 §1 ✅ FIXED | **✅ PASS** | en-US 下 Settings → Groups 表格 `Created` 列 = `04/27/2026, 08:40 PM`（locale-aware），无 ISO 8601 raw 子串。|

**统计**：24 条中 **20 条 ✅ PASS**（含 R12 §1 标 ✅ FIXED 的 12 条全部 reaffirm + R12 标 ❌ FAIL 但实测已 land 的 8 条「R12 land 摘要漏更新」），**1 条 ✅ FIX-LANDED（BUG-140 + BUG-159 关联闭环）**，**1 条 ⚠️ MOSTLY PASS（BUG-149 → 增量 BUG-162）**，**1 条 ⚠️ MOSTLY PASS（BUG-142 → 关联 BUG-157）**，**1 条 ❌ FAIL（BUG-137）**，**1 条受阻未验（BUG-151，受 BUG-158 阻断）**。

### 0.2 R12 land 摘要遗漏（R13 实测已 land 但 R12 未标 ✅）

R12 §1 把以下 8 条标 ❌ FAIL，但 R13 chrome-devtools-mcp 实测已全部 land。建议 R12 文档批量更新结论或在本轮回灌时同步：

| # | R12 标记 | 实测证据 |
|---|---|---|
| BUG-133 | ❌ FAIL（继承） | S2 + S9 + 三语 stage card 全部 i18n / 不再硬编码 |
| BUG-138 | ❌ FAIL | mount 后扫无 raw `cases.coach.*` |
| BUG-139 | ❌ FAIL | 建案向导 3 处 group label 全部翻译 |
| BUG-143 | ❌ FAIL | type 列三语全 i18n |
| BUG-144 | ❌ FAIL | en-US 10 模板 description 全英化 |
| BUG-152 | ❌ FAIL | roleHint 改 i18n key，render 端走 t(...) |
| BUG-145 | R12 ✅（已 land） | reaffirm |
| BUG-141 | R12 §1 ✅（已 land） | reaffirm |

> **回灌动作**：本份文档 §1 中已逐条记录 R13 实测证据；R12 文档在本轮 land 时按本文摘要更新「R12 §1 BUG-133 / 138 / 139 / 143 / 144 / 152 ✅ FIXED（R13 实测确认）」。

### 0.3 本轮新增偏差（事务所流程驱动）

| # | 优先级 | 现象（一句话） | 根因（一句话） |
|---|---|---|---|
| **BUG-157** | P2 [FE] | 侧边栏 nav 没有 `Tasks & reminders` 入口；`/#/tasks` 直链访问可达，但用户在 sidebar / Dashboard 导航中看不到入口。 | `packages/admin/src/shell/nav-config.ts:137-139` 注释仍写"Tasks & reminders 仍为占位页（/tasks → SectionPlaceholderView），暂时从生产侧栏隐藏"，与 R12 BUG-142 land 后路由已 wire 到 `TaskListView.vue` 的事实不一致；nav item 未恢复。|
| **BUG-158** | ~~P0~~ ✅ FIX-LANDED | 任意已签约客户从 admin UI 入建案向导，BMV 模板下"下一步"永远 disabled；4 条前置条件持续显示"未满足"。 | **已修复**：server `normalizeCustomerBmvProfile` 空时返回默认 not_started profile；admin BMV 承接卡片挂入 CustomerDetailView 主路径；backfill 迁移 038 为历史 BMV 客户倒推四前提；`npm run guard` 全绿。|
| **BUG-159** | ~~P2~~ ✅ FIX-LANDED | 建案向导 Step 3 显示 `Group 继承自主申请人：东京一组`，但案件实际持久化 `cases.group_id = null`；下游 `BillingTable` row Group cell 三行均 fallback 到 `—`（BUG-140 fix 已 land 但永远 alias miss）；`/api/billing-plans` items[].groupId = null。 | **已修复**：server `resolveCustomerGroupId` 双路径 SQL + `resolveExplicitGroupId` 入参归一化 + migration 037 历史 cases.group_id 二次回填。R14 实测 10/19 行 cases.group_id 非 null，billing-plans 3/3 行 groupId 非 null，BillingTable Group cell 三语本地化。|
| **BUG-160** | ~~P2~~ ✅ FIX-LANDED | 直接 `POST /api/cases`（用合法 userId / customerId）返回 `500 Internal server error`，无具体错误信息可让前端 fallback；BMV 门禁应该返回 400 BadRequest，但实际是 unhandled exception。 | **已修复**：`cases.service.ts#create` 加 try/catch 三层映射（HttpException 透传 / PG 约束 → 400 / 其他 → 500 + log）；`BmvCaseCreationGateInput` 四字段放宽 `T | null | undefined`；`isBmvCaseTypeCode` 前缀匹配 `biz_mgmt*`。|
| **BUG-161** | P3 [FE/UX] | 建案向导顶部 `CASE SOURCE` 标签直显客户 raw UUID `From customer profile · 825d708f-dec5-443d-b987-63f0a62dae99`；用户视角无意义。 | `CaseCreateView.vue` 顶部 source 区把 customerId 直接拼进 label，未做 `formatCustomerRef(customer)` 之类的解析（应显示 `CUS-202604-0005 · R6试探客户`）。|
| **BUG-162** | P3 [FE] | en-US 下 BMV-CERT-4M 标题 = `Business Manager (CoE 4-month) Certificate of Eligibility`——`CoE` 是 `Certificate of Eligibility` 的标准缩写，与全称语义重复；但 R12 BUG-149 fix 的 `templateLabel.includes(applicationTypeLabel)` 字面判定没命中。 | `useCreateCaseModelActions.ts joinTemplateAndType` 仅做字面 `includes` 判定，未引入"缩写 → 全称"映射表；en-US 下 CoE / EoR 等多个签证常用缩写同样会命中。|
| **BUG-163** | P3 [FE/UX] | Tasks → Reminder log 表格在 Reminder cell + Details cell 共 3 处直显 raw UUID（reminderId / caseId `df9d1e84-...` / recipientId `00000000-0000-4000-8000-000000000011`）；用户视角应是 `CASE-202604-0011` / `Local Admin`。 | `views/tasks/components/ReminderLogTable.vue` 直接渲染 `reminder.id` / `reminder.caseId` / `reminder.recipientId`，未走 `caseNo` / `displayName` 解析。|
| **BUG-164** | P2 [BE] | `POST /api/customers` 返回体 `customerNumber` 嵌在 `baseProfile.customerNumber`，但 `GET /api/customers?...` list 返回体 `customerNumber` 在顶层；前端必须双路径解析。 | `customers.dto-mappers.ts` create 路径与 list 路径的 mapper 没有对齐字段位置；前端 `CustomerAdapter` 已经容错（`baseProfile.customerNumber ?? row.customerNumber`），但 API 契约层应统一。|

### 0.4 总计偏差数

| 优先级 | 计数 | 摘要 |
|---|---|---|
| ~~P0~~ | ~~1~~ | ~~BUG-158~~ ✅ FIX-LANDED（server 默认下发 bmvProfile + admin BMV 承接卡片空态可见 + backfill 038）|
| P1 | 1 | BUG-137（继承）|
| P2 | 3 | BUG-157 / 164 + BUG-149 增量 BUG-162（实际 P3）；~~BUG-159~~ ✅ FIX-LANDED 出列；~~BUG-160~~ ✅ FIX-LANDED 出列|
| P3 | 3 | BUG-161 / 162 / 163 |
| **本轮新增** | **8** | — |

### 0.5 三句话结论

1. **R12 §1 24 条修复整体大幅 land 到位**：`20/24 ✅ PASS`（含 R12 标 ❌ FAIL 但实测已 land 的 6 条「文档遗漏」），`1/24 ✅ FIX-LANDED`（BUG-140 + BUG-159 关联闭环），`1/24 ❌ FAIL`（BUG-137 仍卡 birthday=""），`2/24 ⚠️ MOSTLY PASS`（BUG-142 / 149）。R12 文档对 BUG-133 / 138 / 139 / 143 / 144 / 152 的"❌ FAIL（继承）"结论需要回灌为「R13 实测确认 ✅ FIXED」。
2. **事务所流程 Step 1-20 在 admin UI 端仍不可端到端走通**——但卡点已**从 R12 时的"raw 字段透传 + i18n 缺失 + R4 闭环回退"集中切换到一处底层数据缺口**：`customers.base_profile.bmvProfile` 字段从未被写入，导致 BMV 模板（4 个细分子模板）建案前置门禁永远报"问卷未回收 / 报价未确认 / 客户未签约 / 承接未就绪"四条 blocker，admin UI 无法建出新的经营管理签案件（BUG-158 P0）。
3. **三处衍生数据偏差与一处 nav 缺漏**叠加：①BUG-159 建案 group_id 不持久化让 BUG-140 修复永远命中 disabled fallback；②BUG-161 / 163 建案/任务页直显客户与 case UUID；③~~BUG-160 直接 API 路径 BMV 门禁返回 500 而非 400~~ ✅ FIX-LANDED；④BUG-157 sidebar 没有 Tasks 入口。R13 在 mempalace `prepare_grounded_answer` 引用的"经营管理签续签场景执行重点 = 持续经营 + 持续在留事实"维度看，这条 P0 让事务所连"建立续签案件"的初始动作都做不到。

---

## 1. 新增 Bug

### BUG-157 [P2][FE] 侧边栏 nav 缺 `Tasks & reminders` 入口（与 R12 BUG-142 land 不一致）

- **优先级**：P2（事务所流程 Step 19-20 续签提醒入口在 sidebar 不可见；用户必须从 Dashboard CTA 或直链访问；功能可达但发现性差）
- **chrome-devtools-mcp 取证**：

  ```js
  // navigate_page → /#/tasks ; locale=English
  document.querySelector('main h1').textContent;            // "Tasks & reminders"
  document.querySelector('main').textContent.includes('Reminder log');  // true
  document.querySelectorAll('main table tbody tr').length;  // 1（pending）→ 切到 Reminder log = 3
  // sidebar nav 检查
  Array.from(document.querySelectorAll('aside a, nav a')).some(a => /tasks/i.test(a.href || ''));
  // → false  ❌ sidebar 不可见
  ```

- **根因**：

  ```137:139:packages/admin/src/shell/nav-config.ts
        // NOTE: Tasks & reminders 仍为占位页（/tasks -> SectionPlaceholderView），
        // 暂时从生产侧栏隐藏，避免未上线模块出现在正式业务导航中。
        // 路由与 i18n 先保留，待任务模块落地后再恢复入口。
  ```

  与 R12 §1 BUG-142 land 摘要"`/tasks` 路由从 placeholderRoutes 移除，meta 保留 `navKey: tasks` / `groupKey: business` / `titleKey: shell.nav.items.tasks`"完全相悖；`TaskListView.vue` 已经 wire 真实 GET `/api/tasks` + `/api/reminders`，但 nav-config 注释 / 数组没同步更新。

- **修复方向**：

  ```ts
  // packages/admin/src/shell/nav-config.ts
  {
    key: "business",
    title: "业务",
    items: [
      { key: "leads", label: "咨询与会话", to: "/leads", icon: "message" },
      { key: "customers", label: "客户", to: "/customers", icon: "users" },
      { key: "cases", label: "案件", to: "/cases", icon: "file-text" },
      { key: "tasks", label: "任务与提醒", to: "/tasks", icon: "clipboard" },  // ← 恢复
    ],
  }
  ```

  同步删除 137-139 行注释。
- **测试补强**：扩展 `packages/admin/src/router/tasks-route.bug142.test.ts` 加 1 条 sidebar 断言：`getVisibleNavGroups(true)` 必须包含 `key === "tasks"` 的 NavRouterItem，`to === "/tasks"`，且 `nav.items` 中 tasks 排在 cases 之后（恢复 R4 闭环 nav 顺序）。
- **关联**：与 R12 BUG-142 land 同源；建议同 PR 收口。
- **R13 守门补强**：admin shell smoke 加一条 `await navigateTo("/")` → 期望 sidebar 文案出现 `i18n("shell.nav.items.tasks")`（zh-CN：任务与提醒 / en-US：Tasks & reminders / ja-JP：タスクとリマインダー），防止下次再被注释隐藏。

---

### BUG-158 [P0][BE/FE] BMV 建案前置门禁数据缺失，admin UI 完全无法建 BMV 经管签新案

> ✅ **FIX-LANDED**（2026-04-30）
> - **server**：`customers.dto-mappers.ts` `normalizeCustomerBmvProfile` 在 `base_profile.bmvProfile` 为空时不再返回 `null`，改为返回 `createDefaultCustomerBmvProfile()`（`intakeStatus: "not_started"`），使 `/api/customers` list/detail 始终下发非 null 的 `bmvProfile`。
> - **server**：新增 `038_backfill_customer_bmv_profile.up.sql` 迁移，为已有 BMV 案件的客户倒推 `bmvProfile` 四前提满足。
> - **admin**：`useCustomerBmvIntakeCardModel.ts` `buildCustomerBmvIntakeCardViewModel` 在 profile 为 null 时返回 `not_started` 占位视图（stage=`not_started` / nextStep=`questionnaire_send`），不再 `return null`。
> - **admin**：`CustomerBmvIntakeCard.vue` 挂入 `CustomerDetailView.vue` 主路径；BMV 候选客户在详情页可见承接卡片 + 「发送问卷」CTA。
> - **admin**：`CaseCreateView.vue` 顶部 banner 增加"前往客户详情完成承接 →"恢复链路。
> - **测试**：`CustomerBmvIntakeCard.test.ts` + `useCustomerBmvIntakeCardModel.test.ts` 增加 not_started 空态用例；`useCreateCasePreSignGate.focused.test.ts` 增加四前提满足/缺一 blocker 用例。

- **优先级**：P0（事务所流程 Step 5 / 9 / 17 全链路阻塞；任何"经营管理（认定 4 个月）"/"经营管理（认定 1 年）"/"经营管理（续签）"建案都中；R12 走查时未单独立项，因仍以 R4 闭环回退为主线）
- **chrome-devtools-mcp 取证（zh-CN）**：

  ```js
  // navigate_page → /#/cases/create?customerId=825d708f-dec5-443d-b987-63f0a62dae99   (R6试探客户，10 active cases)
  // click 经营管理（认定 4 个月）模板
  // 主申请人下拉选 R6试探客户
  // 选中 + Step 1 / 4 → 2 / 4
  // 但 "下一步：确认承接与期限" 按钮 disabled
  document.querySelectorAll('main')[0].textContent.match(/前置条件未满足|尚有[^：]+/);
  // → ["尚有前置条件未满足"]
  document.body.textContent.includes('问卷尚未回收');     // true
  document.body.textContent.includes('报价尚未确认');     // true
  document.body.textContent.includes('客户尚未签约');     // true
  document.body.textContent.includes('承接流程未就绪');   // true
  ```

- **根因**：
  - `packages/admin/src/views/cases/model/useCreateCasePreSignGate.ts:80-110` 检查 `customer.bmvQuestionnaireStatus !== "returned"` / `bmvQuoteStatus !== "confirmed"` / `bmvSignStatus !== "signed"` / `bmvIntakeStatus !== "ready_for_case_creation"` 任一不满足即返回 4 条 blocker。
  - 前端 `useCustomerDropdownData.ts:144-150` 从 `r.bmvProfile.questionnaireStatus / quoteStatus / signStatus / intakeStatus` 读取；
  - server `/api/customers` list / detail 接口实际下发 `bmvProfile = null`：

    ```bash
    curl /api/customers?scope=all → items[].bmvProfile = null   # 全部客户
    curl /api/customers/<id>     → top-level bmvProfile = null  # 含 R6 / Tani 等已有真实 case 客户
    ```

  - DB 直查（`customers` 表 BMV 状态嵌在 `base_profile.bmvProfile` JSONB）：

    ```sql
    SELECT id, base_profile->'bmvProfile' AS bmv FROM customers WHERE id IN ('825d708f-...','97f1c48d-...');
    -- → 两行均 NULL
    ```

  - 即：BMV 状态字段在 server 端**从未被写入**，admin UI 也没有 intake 录入入口让用户填这 4 个状态。前端门禁默认全 not-ready，永远拦死。

- **业务对照**（mempalace `prepare_grounded_answer` 引用 `docs/事务所流程/在留資格別必要情報一覧Ver2.scenarios/biz-mgmt-renewal.md` §适用说明 + `docs/事务所流程/在留資格別必要情報一覧Ver2.中文规范版资料清单.md` §执行重点）：BMV 续签场景"重点不再是设立，而是持续经营与持续在留"——这一条对应到 admin 实现路径上，**最先要触发的就是"建立续签案件"**；当前 admin 把"建立"动作彻底卡死。

- **修复方向**：
  1. **server**：`packages/server/src/modules/core/customers` 端补 `BmvIntakeService` 路径（已部分实现于 `customers.bmv-d3.ts` / `customers.bmv-patch.ts`），把"问卷回收/报价确认/签约/承接就绪"四态写入 `base_profile.bmvProfile`，并通过 `/api/customers/:id/bmv-intake` PATCH 接口（404 当前），让 admin 从 customer 详情页可触达。
  2. **admin 端**：补 `views/customers/components/CustomerBmvIntakeCard.vue` 编辑入口（仓库内已有同名组件，但未挂入 detail 主路径）；让 admin owner 可以一键把"问卷回收/报价确认/签约/承接就绪"标 ✅，进而解锁前置门禁。
  3. **fixture / migration**：对历史已有 cases 的客户（R6试探客户 / Tani Keiei Cert4M Test 等），补 backfill：当客户存在 BMV 类型 active case 时，倒推 `bmvProfile.questionnaireStatus = returned` / `quoteStatus = confirmed` / `signStatus = signed` / `intakeStatus = ready_for_case_creation`，避免历史数据下"客户已有 10 cases 但 admin 还说未签约"的诡异错位。
  4. **server 数据契约**：`/api/customers` list / detail 必须显式下发 `bmvProfile`（即便嵌在 `base_profile.bmvProfile` 内也应在 dto-mapper 提到顶层 / 子结构稳定），与 `useCreateCasePreSignGate` 字段读路径对齐。
- **测试补强**：
  1. server `customers.bmv.d7-gates.focused.test.ts` 已有"四前提"测试骨架；补 1 条端到端：fixture 创建客户 + 写 4 字段 → `POST /api/cases` BMV-CERT-4M 路径 PASS；4 字段缺一即被 `BadRequestException` 拦下（不是 500，详见 BUG-160）。
  2. admin `useCreateCasePreSignGate.test.ts` 已有 "templateId !== bmv → inactive" 测试；补 1 条：fixture customer 写 4 字段 → `passed === true`；缺一字段即 `passed === false` + `blockers.length === 1`。
  3. **e2e smoke**（chrome-devtools-mcp）：navigate_page → `/#/customers/<id>` → click "BMV intake card" → 一键标 4 ✅ → navigate_page → `/#/cases/create?customerId=<id>` → click BMV-CERT-4M → 主申请人下拉 → expect "下一步" 按钮非 disabled。
- **关联**：与 R12 §3.5「stage / phase 终态联动」未决项同样属于"产品契约层"问题；本轮 R13 把它单独抓出作 P0，触发产品决策（要不要先简化门禁规则、要不要把 customers.bmvProfile 强制随 customer 创建初始化）。

---

### BUG-159 [~~P2~~✅ FIX-LANDED][BE/FE] 建案 `cases.group_id` 不持久化（继承显示与持久化分裂，BUG-140 fix 永远 alias miss）

> ✅ **FIX-LANDED**（R13 v2 + R14 实测 2026-04-30）
>
> **R13 v2 服务端补强**：
> - `cases.service.ts#resolveCustomerGroupId` 双路径 SQL（`g.name = cv.group_val OR g.id::text = cv.group_val`）兼容 slug/显示名/UUID。
> - `resolveExplicitGroupId` 入参归一化：admin 传入的 `groupId`（catalog slug `tokyo-1` / 显示名 / UUID）→ 真实 UUID。
> - migration 037 历史 cases.group_id IS NULL 行二次回填。
> - 6 条 focused test 锁定双路径 SQL / 无 group 不抛错 / 显式 UUID 不误覆盖 / slug 归一化 / GROUP_NOT_FOUND 400 / 空白串视同缺省。
> - admin `buildCreateCaseInputFromDraft` `groupId: snapshot.group || undefined` 确保 payload 传参。
>
> **R14 chrome-devtools-mcp e2e 实测取证**：
> - `db:migrate` 应用 migration 035-038（含 037_backfill_cases_group_id_v2）。
> - DB 直查：`SELECT count(*) FILTER (WHERE group_id IS NULL) FROM cases` → 9（均属于无 group 客户 Tani Keiei Cert4M Test）；`FILTER (WHERE group_id IS NOT NULL)` → 10（R6试探客户全部回填 `ef21fdd2-1ffc-4a27-8b47-a640d6bd021c` = tokyo-1）。
> - `GET /api/cases/b8bef6d9-...` → `groupId: "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c"` 非 null ✅。
> - `GET /api/billing-plans` → 3/3 行 `groupId: "ef21fdd2-..."` 非 null ✅。
> - BillingTable Group cell 三语本地化：zh-CN `东京一组` / en-US `Tokyo Team 1` / ja-JP `東京一組` ✅（截屏存档 `_output/r14-billing-{zhcn,enus,jajp}.png`）。
> - BMV-CERT-4M 建案向导走通 Step 1→4（Customer detail → 开始办案 → BMV-CERT-4M → Step 3 `Group 继承自主申请人：东京一组`），但 Step 4 提交返回 500（BUG-160，与 BUG-159 无关）。

> R13 补强（2026-04-30）：服务端根因已 land。
> - `cases.service.ts#resolveCustomerGroupId` 改为 `g.name = cv.group_val OR g.id::text = cv.group_val` 双路径匹配，兼容 customer.base_profile 中存 slug / 显示名 / UUID 三种形态。
> - 新增 `packages/server/src/infra/db/migrations/037_backfill_cases_group_id_v2.up.sql`：按相同双路径对 `cases.group_id IS NULL` 的历史行做二次回填。
> - 测试：`packages/server/src/modules/core/cases/cases.service.bug159-group-inheritance.focused.test.ts`（双路径 SQL 断言 + customer 无 group 不抛错回归 + 显式 groupId 不触发误覆盖）。
> - 与 BUG-140 解耦后：BillingTable Group cell 在数据有 group 的行将正常本地化展示；R14 走查需在 admin UI 重新建案 / DB 直查 `/api/cases groupId` 字段确认现存 19 行已回填。
>
> R13 补强 v2（2026-04-30）：服务端显式 `input.groupId` 入参归一化已 land。
> - `cases.service.ts#resolveCreateGroup` 增加 `resolveExplicitGroupId(tx, orgId, raw)` 步骤：admin 链路提交的 `groupId` 字段（来源于 `customer.group` DTO，实际值是 `groups.name`，可能是 catalog slug `tokyo-1` / 显示名 / UUID）会先按 `id::text = $2 OR name = $2` 在 `groups` 表内归一化为真实 UUID 后再写入 `cases.group_id`。
> - 入参非空但无法解析 → 抛 `BadRequestException(CASE_GROUP_NOT_FOUND)`（关联 BUG-160：堵掉一类 unhandled exception → 500 路径，统一返回 400 BadRequest）。
> - 入参为空字符串 / 空白串 → 视同缺省，继续走 `resolveCustomerGroupId` 隐式继承。
> - 同步追加 4 条 focused 测试（slug 归一化 / 不存在 → 400 / 空串视同缺省 / 显式 UUID 不触发误覆盖），并扩展 `cases.service.test.ts` 中显式 groupId 与 cross-group 测试的 mock 以覆盖新 SQL 路径。

- **优先级**：P2（admin 主路径案件列表 / 收费列表 / billing-plans Group cell 全 fallback `—`；3/3 行命中；与 BUG-140 fix-no-data 状态强耦合）
- **chrome-devtools-mcp 取证**：

  ```bash
  # API 直查
  curl '/api/cases?scope=all&page=1&limit=3' | jq '.items[] | {id, caseNo, groupId}'
  # → 全部 groupId: null
  curl '/api/billing-plans?limit=3' | jq '.items[] | {caseId, caseNo, customerName, groupId}'
  # → 全部 groupId: null
  ```

  ```js
  // navigate_page → /#/cases/create?customerId=825d708f-...
  // 选 BMV-CERT-4M ; 主申请人选 R6试探客户
  // 看 Step 3 文案
  document.body.textContent.match(/Group\s*继承自主申请人：\s*([^\s\u3000]+)/)?.[1];
  // → "东京一组"   ← UI 显示已继承
  // 但 server 端 case.group_id = null
  ```

- **根因**：建案 service `cases.service.ts#create` 路径未消费 `req.body.groupId` 或未从主申请人 `customer.base_profile.group` 取继承值写入 `cases.group_id`；前端 inheritance 是 client-side computed display only。
- **修复方向**：
  1. **server**：`cases.service.ts#create` 在 `groupId` 缺省时，从主申请人 `customer.base_profile.group` 取值写入；同时维持显式 `groupId` 入参可覆盖。
  2. **admin 端**：`useCreateCaseModelActions.ts` 的 submit payload 需要把 `groupId: primaryCustomer.value.group` 显式传给 `POST /api/cases`，避免依赖 server-side 隐式继承。
  3. **fixture backfill**：所有现存 `cases.group_id IS NULL` 的行按 `customers.base_profile.group` 反向回填；R12 §1 BUG-140 修复要真正生效需要这一步。
- **测试补强**：
  - server：`cases.service.create.bug159.test.ts`：fixture customer.group=`tokyo-1` → POST `/api/cases` 不带 groupId → 期望 `cases.group_id = 'tokyo-1'`。
  - admin：`BillingTable.bug140-data.test.ts`：mount row 时 fixture row.group=`tokyo-1` + alias 注册 → cell 等于 `东京一组`（从 fix-no-data 升级到 fix-with-data）。
- **关联**：BUG-140（前端 fix 已 land）+ BUG-158（建案路径暂时 broken，BUG-159 fix 必须在 BUG-158 解锁后才能验收完整）。

---

### BUG-160 [~~P2~~✅ FIX-LANDED][BE] 直接 `POST /api/cases` 返回 500（应是 400 BadRequest）

> ✅ **FIX-LANDED**（2026-05-01）
>
> **server**：
> - `cases.service.ts#create` 方法体包裹 `try/catch`：① `HttpException` 子类原样 re-throw；② PG 已知约束违例（`23503` FK / `23505` unique / `23514` check）→ `400 BadRequest` + `{ code: "CASE_CREATE_FAILED", detail: { source: "pg", constraint, pgCode } }`；③ 其他未知 throw → `500 InternalServerError` + `{ code: "CASE_CREATE_FAILED", detail: message }` + `console.error` 输出 stack。
> - `cases.types.ts` — `CASE_WRITE_ERROR_CODES` 追加 `CREATE_FAILED: "CASE_CREATE_FAILED"`。
> - `cases.types-bmv-gate.ts` — `BmvCaseCreationGateInput` 四前提字段类型放宽为 `T | null | undefined`，`checkBmvCaseCreationGate` 对 `undefined` / 非法枚举值视为"未满足"（不再 TypeError）。
> - `cases.template-bmv.ts` — `isBmvCaseTypeCode(code)` 增加 `code.startsWith("biz_mgmt")` 前缀匹配，与 migration 038 `LIKE 'biz_mgmt%'` 对齐。
> - `intake.types.ts` — `requiresBmvCaseCreationGate` 委托至 `isBmvCaseTypeCode`，`biz_mgmt_4m` / `biz_mgmt_1y` / `biz_mgmt_renewal` 均触发门禁。
>
> **测试**：
> - 新增 `cases.service.bug160-create-error-mapping.focused.test.ts`：覆盖 5 类异常映射 —— (a) `biz_mgmt_4m` + 空 `baseProfile` → 400 `CASE_BMV_GATE_BLOCKED` + 4 blockers；(b) PG 23503 FK → 400 `CASE_CREATE_FAILED`；(c) PG 23514 check → 400 `CASE_CREATE_FAILED`；(d) 非 PG Error → 500 `CASE_CREATE_FAILED`；(e) 现有 `BadRequest(GROUP_NOT_FOUND)` 原样透传。
> - `cases.pre-sign-gate.focused.test.ts` 扩展 `biz_mgmt_4m` 触发门禁用例。
> - `intake.types.test.ts` 扩展 `requiresBmvCaseCreationGate` 对 `biz_mgmt_*` 子类型的覆盖。
>
> **实测证据**：
> ```bash
> curl -X POST /api/cases -d '{"customerId":"825d708f-...","caseTypeCode":"biz_mgmt_4m","ownerUserId":"00000000-0000-4000-8000-000000000011","applicationType":"certification"}'
> # → 400 { "code":"CASE_BMV_GATE_BLOCKED", "blockers":[
> #     {"code":"BMV_QUESTIONNAIRE_NOT_RETURNED","message":"BMV questionnaire must be returned before case creation"},
> #     {"code":"BMV_QUOTE_NOT_CONFIRMED","message":"BMV quote must be confirmed before case creation"},
> #     {"code":"BMV_NOT_SIGNED","message":"Customer must sign contract before BMV case creation"},
> #     {"code":"BMV_INTAKE_NOT_READY","message":"BMV intake must be ready for case creation"}
> #   ] }
> # 不再 500 Internal server error ✅
> ```

- **优先级**：P2（开发/集成路径错误信息缺失；用户层不可见但破坏 server 错误契约）
- **API 取证**：

  ```bash
  TOKEN=$(curl -s -X POST .../auth/login ...)
  curl -X POST '/api/cases' -d '{
    "customerId":"825d708f-...","caseTypeCode":"biz_mgmt_4m",
    "ownerUserId":"00000000-0000-4000-8000-000000000011",
    "groupId":"tokyo-1","applicationType":"certification","caseName":"R13 e2e BMV CERT 4M test"
  }'
  # → {"statusCode":500,"message":"Internal server error"}
  ```

- **根因**：`cases.service.ts#create` 在 BMV gate 检查 / customer bmvProfile 解析路径中存在未捕获的 unhandled exception（推测在 `bmvProfile = null` 解构、或 `checkBmvCaseCreationGate` 入参 `bmvQuestionnaireStatus = undefined` 引发的 TypeError）；进入 SQL `insert into cases` 之前已抛错。
- **修复方向**：
  1. `cases.service.ts#create` 头部加 `try/catch` 包装，把 unhandled error 转为 `BadRequestException` 或 `InternalServerErrorException` 并附详情；
  2. `checkBmvCaseCreationGate` 入参全部接受 `string | null | undefined` 并显式视为"四前提未满足"；
  3. server log 接 NestJS `Logger` 输出栈信息，便于本地排查（当前 chrome-devtools 与 curl 都看不到错误细节）。
- **关联**：BUG-158（同一段路径上的客户体验问题；前端门禁尚能给文案，而 BE 直调路径仍 500）。

---

### BUG-161 [P3][FE/UX] 建案向导顶部 source 标签直显客户 raw UUID

- **优先级**：P3（每个 admin 建案路径都中；UX 问题）
- **chrome-devtools-mcp 取证**：

  ```js
  // navigate_page → /#/cases/create?customerId=825d708f-...
  document.body.textContent.match(/From customer profile · ([0-9a-f-]{36})/)?.[0];
  // → "From customer profile · 825d708f-dec5-443d-b987-63f0a62dae99"
  ```

  期望：`From customer profile · CUS-202604-0005 · R6试探客户`。

- **根因**：`views/cases/CaseCreateView.vue` 顶部 source 区把 `route.query.customerId` 直接拼进 label，未做 `formatCustomerRef(customer)` 解析。
- **修复方向**：CaseCreateView 在 mounted 时如果有 customerId 入参，先 `customerRepository.getById(customerId)` 拿到 customerNumber + displayName，组装 `${customerNumber} · ${displayName}` 做 label；customer 未加载完成时显示骨架屏。
- **关联**：与 BUG-136 / BUG-145 同属"customer reference 不展示 raw UUID"族，建议合修。

---

### BUG-162 [P3][FE] BUG-149 fix 未识别"缩写 vs 全称"，en-US BMV-CERT-4M 标题语义重复

- **优先级**：P3（en-US 下三个 BMV 子模板都中：CoE 4-month / CoE 1-year / Renewal）
- **chrome-devtools-mcp 取证（en-US）**：

  ```js
  // navigate_page → /#/cases/create?customerId=...
  // click "Business Manager (CoE 4-month)" 模板
  document.querySelector('input[type=text]').value;
  // → "Business Manager (CoE 4-month) Certificate of Eligibility"
  // 注意：CoE 是 Certificate of Eligibility 的标准缩写
  ```

  zh-CN/ja-JP 下没有这个问题（templateLabel 已包含 "认定" / "認定"，字面 includes 命中）。
- **根因**：

  ```ts
  // useCreateCaseModelActions.ts joinTemplateAndType
  if (templateLabel.includes(applicationTypeLabel)) return templateLabel;  // 字面 includes
  ```

  没有引入"缩写 → 全称"映射表。en-US 下：
  - `CoE` ↔ `Certificate of Eligibility`
  - `EoR` ↔ `Extension of Residence`（如有）
  - `CoSr` ↔ `Change of Status`（如有）

- **修复方向**：

  ```ts
  const ACRONYM_MAP: Record<string, string[]> = {
    "Certificate of Eligibility": ["CoE", "C.O.E.", "認定"],
    "Renewal":                    ["Renewal", "更新", "期間更新"],
    "Change of Status":           ["CoS", "変更"],
  };
  function semanticIncludes(template: string, type: string): boolean {
    if (template.includes(type)) return true;
    const aliases = ACRONYM_MAP[type] || [];
    return aliases.some((a) => template.toLowerCase().includes(a.toLowerCase()));
  }
  ```

- **测试补强**：扩展 `fixtures-create.title-derive.bug149.test.ts`：
  - en-US BMV-CERT-4M `"Business Manager (CoE 4-month)" + "Certificate of Eligibility"` → 期望标题不含子串 `"4-month) Certificate"`，最终 `"Business Manager (CoE 4-month)"`；
  - en-US Renewal 同款。
- **关联**：BUG-149（zh-CN / ja-JP 已 land；本条只是 en-US 缩写边界 case）。

---

### BUG-163 [P3][FE/UX] Tasks → Reminder log 表格直显 raw UUID

- **优先级**：P3（每个进 Tasks 页的人都中；3 处 UUID 直显）
- **chrome-devtools-mcp 取证（en-US）**：

  ```js
  // navigate_page → /#/tasks ; click Reminder log tab
  Array.from(document.querySelectorAll('main table tbody tr td:nth-child(1)')).map(td => td.textContent);
  // → ["経営・管理 · Renewal reminder 180 days before expiryeefe7803-a4a8-4f38-870b-b6ebd12b3e97", ...]
  // Details cell 含 "Case df9d1e84-fd62-4687-9297-decd8848412f · Recipient 00000000-0000-4000-8000-000000000011"
  ```

  期望：
  - Reminder cell 末尾不含 reminderId UUID，或单独以 `<small>` 弱化展示；
  - Details cell `Case` 字段显示 `CASE-202604-0011`，`Recipient` 字段显示 `Local Admin`。
- **根因**：`views/tasks/components/ReminderLogTable.vue`（推测）直接渲染 `reminder.id` / `reminder.caseId` / `reminder.recipientId`，未走 `caseNo` / `userDisplayName` 解析。
- **修复方向**：
  1. server `/api/reminders` 在 list response 上补 `caseNo` + `recipientName` 字段（join `cases.case_no` / `users.name`）；
  2. admin reminder log table 渲染走 `caseNo ?? caseId.slice(0,8)`、`recipientName ?? recipientId.slice(0,8)`；UUID 仅在 hover tooltip 中展示。
- **关联**：与 BUG-136 / BUG-161 同属"raw UUID 直显"族。

---

### BUG-164 [P2][BE] `POST /api/customers` vs `GET /api/customers` 返回体 `customerNumber` 字段位置不对称

- **优先级**：P2（API 契约对称性问题；前端可容错但增加心智负担）
- **API 取证**：

  ```bash
  POST /api/customers => { "id":"...", "baseProfile": { ..., "customerNumber":"CUS-202604-0007" }, "createdAt":"...", ... }
  GET /api/customers?scope=mine&page=1&limit=20 => { "items":[ { "id":"...", "customerNumber":"CUS-202604-0005", ... } ] }
  GET /api/customers/<id> => { "id":"...", "customerNumber":"CUS-202604-0005", ... }
  ```

  POST 返回时 `customerNumber` 嵌在 `baseProfile.customerNumber`；GET（list / detail）返回时在 top-level。
- **根因**：`customers.dto-mappers.ts` create 路径 mapper 没有把 BMV / numbering / displayName 等 `baseProfile` 内字段提到顶层；list / detail 路径有提。
- **修复方向**：把 create 路径的 dto mapper 与 list/detail 对齐（可复用 `mapCustomerToDetailDto` 的合并逻辑），统一 top-level 字段集合：`id` / `customerNumber` / `displayName` / `legalName` / `phone` / `email` / `group` / `owner` / ...
- **测试补强**：`customers.controller.create.bug164.test.ts`：POST `/api/customers` → response 顶层包含 `customerNumber`，且 `customerNumber` 与 `baseProfile.customerNumber` 一致（双写过渡）。

---

## 2. R12 §1 BUG-133~156 实测验收逐条证据

> 与 §0.1 总表互为详证；以 chrome-devtools-mcp `navigate_page` / `evaluate_script` / API 直查为锚。

### 2.1 ✅ FIXED 14 条（含 R12 标 ❌ 但实测已 land 6 条）

#### BUG-133 ❌→✅（终态硬编码 + raw zh）

```js
// CASE-202604-0011 (S1/CLOSED_SUCCESS)
locale=en-US:  headerChips=["Case opened","Closed (success)"]; stageCard="Current stageCase opened Closed";
locale=ja-JP:  headerChips=["案件開始","成功クローズ"];      stageCard="現在のステージ案件開始 結案済み";
// CASE-202604-0004 (S2/WAITING_MATERIAL) en-US:
overview value = "Collecting documents" (NOT "资料收集中" raw zh)
```

#### BUG-138 ❌→✅（cases.coach.* raw key）

```js
// CASE-202604-0004 概览页 mount 后扫
const rawKeys = mainText.match(/(?<![\w.])(cases|customers|leads|shared)\.[\w.]+/g);
// → []   ✅
```

#### BUG-139 ❌→✅（建案向导 3 处 group UUID）

```js
// /#/cases/create?customerId=825d708f-...
// Step 2 客户下拉 options:
"R6试探客户 / 东京一组"           ✅
"Tani Keiei Cert4M Test /"         ✅（第二条客户 group 字段空，不是 UUID）
// 选中卡片
"R6试探客户 · 主申请人 · 东京一组"  ✅
// Step 3 inherited group
"Group 继承自主申请人： 东京一组"   ✅
// 全页面 UUID 仅 1 处：顶部 CASE SOURCE 标签 (→ 详见 BUG-161)
```

#### BUG-143 ❌→✅（案件列表 type 列）

```js
// zh-CN, 19 行 type 列：
["经营管理（认定4个月）", × 10, "经营管理签", × 4, "家族滞在", × 3, ...]
// en-US：
["BMV (CoE 4-month)", "BMV", "Dependent Visa", ...]
```

#### BUG-144 ❌→✅（en-US 模板 description）

```js
Array.from(document.querySelectorAll('button.tpl')).map(b=>b.textContent.trim());
// 全 10 条均英文：
// "Business Manager (CoE 4-month) Business Manager CoE 4-month — focus on applicant background, capital source, Japan stay history, and pre-startup preparation."
// "Engineer/Specialist (CoE) Popular Engineer / Specialist in Humanities / Int'l Services CoE — focus on academic chain, career chain, employment conditions, and employer entity proof."
// "Intra-company Transfer P1 template Group / affiliate intra-company transfer — must prove a transfer relationship rather than ordinary hiring..."
// 等等
```

#### BUG-152 ❌→✅（roleHint hardcoded JA → i18n key）

```js
// zh-CN 选中卡片副本现在是 "主申请人"（简体），不是 R12 取证的 "主申請人"（JA hardcoded）
```

#### BUG-134 ✅→✅ reaffirm（BillingListView GROUP filter）

```js
// /#/billing ; en-US
combobox.options = ["All groups","Tokyo Team 1","Tokyo Team 2"];   // ✅ no JA leftover
```

#### BUG-141 ✅→✅ reaffirm（legacy referrer + sourceType cond）

```js
// modal 打开 sourceType="—" 时
referrerNameVisible: false                                           ✅
referrerLegacy: []                                                   ✅
// sourceType=Referral 时
referrerNameVisible: true; refNameId: "customer-create-referrerName"; hasLabelFor: true  ✅
```

#### BUG-145 ✅→✅ reaffirm（POST /api/customers numbering）

```bash
curl -X POST /api/customers ...probe1...  → customerNumber=CUS-202604-0006
curl -X POST /api/customers ...probe2...  → customerNumber=CUS-202604-0007
# 严格 +1 递增；fields 在 baseProfile.customerNumber（参 BUG-164）
```

#### BUG-146 ✅→✅ reaffirm（Customers owner 列）

```js
// /#/customers ; scope=mine
rows[0].owner = "Local Admin"; rows[1].owner = "Local Admin";       ✅
// 详情页
ownerSel.value = "Local Admin"; options[0] = "Local Admin"          ✅
```

#### BUG-147 ✅→✅ reaffirm（debounce）

```js
// fill 5 fields (displayName/group/legalName/phone/email)
list_network_requests.filter(/check-duplicates/).length === 3       ✅ (vs R12 取证 28)
```

#### BUG-148 ✅→✅ reaffirm（modal a11y）

```js
inputs.length === 14;  noId === [];  noName === [];  labelMissingCount === 0;   ✅
```

#### BUG-150 ✅→✅ reaffirm（owner dropdown 含 Local Admin）

```js
// /#/cases/create Step 3 owner dropdown
options = ["Local Admin","Suzuki","Tanaka","Li","Sato","Shota Yamada","Kenta Takahashi","Akari Suzuki"]
//                ↑ 注入项                ↑ catalog 7 项稳定                                     ✅
```

#### BUG-153 ✅→✅ reaffirm（phase chip 不重复）

```js
// CASE-202604-0011 en-US headerChips.length === 2  (R12 取证 3)                  ✅
// CaseOverviewSidebar phase Card 已删除                                          ✅
```

#### BUG-154 ✅→✅ reaffirm（客户详情 owner 默认值）

```js
// /#/customers/825d708f-...
ownerSel.value = "Local Admin"                                                    ✅
options.includes("Local Admin")                                                   ✅
```

#### BUG-155 ✅→✅ reaffirm（"我的"口径一致）

```js
// /#/customers ; scope=mine
summaryCard.MY_CUSTOMERS === "2";  list.tab "Mine = 2 customers"                  ✅
```

#### BUG-156 ✅→✅ reaffirm（Settings group 创建时间）

```js
// /#/settings?tab=groups ; en-US
table.row[0].cell["Created"] === "04/27/2026, 08:40 PM"                           ✅
isoLeak === null                                                                  ✅
```

#### BUG-135 ✅→✅ reaffirm（server 时间戳）

```bash
GET /api/groups[].createdAt = "2026-04-27T11:40:49.675Z"   # ISO 8601 ✅
```

#### BUG-136 ⚠️→✅ 完整（建案向导 group 链路也 land）

详见 §2.1 BUG-139 取证；R12 标 ⚠️ partially 的两处遗漏 case `views/cases/model/useCustomerDropdownData.adaptItem` 已经加 `resolveGroupLabel` 调用（line 140 `groupLabel: resolveGroupLabelForOption(group, locale)`），R13 实测三处 group 全翻译。

### 2.2 ⚠️ 部分 / 受阻 4 条

#### BUG-137 ❌→❌（继承）

```bash
curl -X POST /api/customers -d '{"baseProfile":{...,"birthday":""}}'
# → 400 "Invalid baseProfile: birthday must be a valid date string"
# UI 顶部红条仍 "customers.list.createModal.state.validationError" raw key
```

#### BUG-140 ❌→✅ FIX-LANDED（R14 fix-with-data 闭环）

```js
// /#/billing ; en-US
// R13 原始取证：table.tbody tr[].td[3] = "—" × 3（BUG-159 未 land，cases.group_id = null → alias miss）
// R14 实测（migration 037 后）：Group cell = "Tokyo Team 1" × 3 ✅ fix-with-data 闭环
```

#### BUG-142 ✅→⚠️ MOSTLY PASS

```js
// /#/tasks 直链：✅ 真实 TaskListView wired GET /api/tasks + /api/reminders
mainHasH1("Tasks & reminders"); reminderLogCount === "3"; placeholder text 仅在 footer 文案
// sidebar nav：❌ 无 Tasks 入口 → BUG-157
sidebarHasTasks === false
```

#### BUG-149 ✅→⚠️ MOSTLY PASS

```js
// zh-CN BMV-CERT-4M
title.value === "经营管理（认定 4 个月）"     ✅ "认定" 仅 1 次
// en-US Dependent Visa
title.value === "Dependent Visa Certificate of Eligibility"   ✅ 加空格
// en-US BMV-CERT-4M
title.value === "Business Manager (CoE 4-month) Certificate of Eligibility"
// → CoE / Certificate of Eligibility 缩写/全称语义重复 → BUG-162
```

#### BUG-151 ❌→未验证（受 BUG-158 阻断）

```js
// /#/cases/create ; BMV-CERT-4M ; 主申请人选 R6试探客户
// "下一步" 按钮 disabled（BUG-158 4 条 blocker），无法走到 Step 4 收费金额展示
```

---

## 3. 顺手补充观测（不立 bug，但建议跟踪）

### 3.1 Settings → Groups 表格 `Group Name` 列直显 slug `tokyo-1`

- 表格 row[0] 第 1 列 = `tokyo-1`，与 catalog 翻译 `Tokyo Team 1` / `东京一组` 不一致；可能是产品有意展示 slug 便于运维识别，不立 bug。
- 关联：BUG-156 land 后 `Created` 列已 locale-aware；`Group Name` 列是否也应展示 locale 名仍待产品决策。

### 3.2 stage / phase 失配持续存在（R12 §3.5 → R13 reaffirm）

```bash
curl /api/cases?scope=all → 19 行
# stage 分布：S1 × 14, S2 × 1, "Collecting documents" × 1, "Archived" × 2
# phase 分布：远期 phase（Awaiting final payment / Closed (success) / Renewal reminder set / Archived）× 14
```

S1（"Case opened"）+ Closed/Awaiting/Archived phase 共存——R10 / R11 / R12 已记录此项为「stage / phase 终态联动」未决项；R13 仍不立 bug，等产品决策。

### 3.3 全局搜索仍 disabled（"Coming soon" / "建设中"）

- 与 R10~R12 一致；放在产品 backlog。

### 3.4 zh-CN 下 "フリガナ" / 选中卡 "主申请人" 新一致

- R12 §3.7 提到 zh-CN 下 "フリガナ" 仍未本地化，本轮新增 `主申请人` zh 简体 ✅；建议产品同步澄清 "BMV / フリガナ / 経営管理" 等术语在 zh-CN 是否本地化。

### 3.5 Tasks page `Workbench notes` 文案触发自身守门 false-positive

- R12 §1 BUG-142 守门规则写 "navigate_page → `/tasks` → main 区不含 `placeholder` / `Page status` / `until the full module is implemented`"。但 R12 land 后 `Workbench notes` 第一行文案 "This page is wired to the real ... endpoints; **it is no longer a placeholder.**" 包含 `placeholder` 字串，会让该守门规则误报。建议把守门规则改为 "main 区不含整个 SectionPlaceholderView 的特征文本（如 `Current path /tasks` + `until the full module is implemented here.` 同时出现）"。

---

## 4. 仍未覆盖 / 待立项

本轮**未触及**（沿用 R12 §4 状态）：

- BUG-110（`tests/integration-pg/` schema-compatibility 测试体系）
- BUG-113 / 114 / 115（timeline query alias / dashboard 文案 / customer backfill）
- stage / phase 终态联动（产品决策；本轮 §3.2 再次出证）
- CLOSED_FAILED 路径 + closeReason 入参校验
- a11y `[role=tab]` ↔ `[role=tabpanel]` 关联（R10 §3.4 / R11 §3.2）

本轮**新增待立项**：

- ~~**BUG-158 P0**~~：✅ FIX-LANDED（2026-04-30）。server 默认下发 bmvProfile + admin BMV 承接卡片空态可见 + CaseCreateView 恢复链路 + backfill 迁移 038 + `npm run guard` 全绿。
- **R12 land 摘要回灌**：BUG-133 / 138 / 139 / 143 / 144 / 152 实际已 land，但 R12 §1 仍标 ❌ FAIL（继承）；建议 R12 文档同步更新或在 R13 收口时回灌至 R12 文档头部（"R13 实测 ✅ FIXED 项"）。
- **R13 守门补强**：
  - admin shell smoke：sidebar 必须有 Tasks 入口（BUG-157）；
  - admin lint 自定义规则禁止 `views/**` 直接渲染 `^cases\.|^customers\.|^leads\.|^shared\.` 前缀 raw key（与 R12 §4 一致，本轮再次出证 BUG-138 同款问题已被 fix 但缺 lint 守护）；
  - ~~server `cases.service.ts#create` 加 `try/catch` + `BadRequestException`，禁止 unhandled exception 路径返回 500（BUG-160）~~ ✅ FIX-LANDED。
- ~~**BMV intake 数据契约**~~（关联 BUG-158）：✅ 已随 BUG-158 FIX-LANDED 落地——`/api/customers` list/detail 始终下发非 null 的 `bmvProfile`；admin BMV 承接卡片 + 三个 verb endpoint（questionnaire/send、quote/generate、sign/record）均已挂入。

---

## 附录 — 关键证据快照

### A. chrome-devtools-mcp 走查清单（按事务所流程顺序）

| 流程步骤 | URL | R13 实测结论 | 证据 |
|---|---|---|---|
| Step 1（接洽） | `/#/leads` | 路径可达；本轮未深入。 | navigate_page OK |
| Step 2（客户新建） | `/#/customers` → "Add customer" | modal 已无 legacy referrer / 14 字段 a11y 完整 / debounce 250ms × 字段；空 birthday 仍卡 400（BUG-137）。 | §2.1 BUG-141/147/148 + §2.2 BUG-137 |
| Step 5（建案启动） | `/#/cases/create?customerId=825d708f-...` | BMV 模板四前提门禁阻断（BUG-158 P0）；"下一步" disabled；前置 group/owner/title 字段 i18n 与继承显示均 ✅。 | §1 BUG-158 |
| Step 6（资料清单预览） | 同上 Step 2 资料预览 | 18 行资料项已展开（基础/资金履历/创业前置三组）；与 mempalace 引用 `biz-mgmt-renewal scenario` "条件必需材料 / 执行重点" 内容方向一致。 | snapshot uid=38_*|
| Step 7-12（案件状态推进） | `/#/cases/<id>` | stage/phase chip / overview 卡 / coach 按钮全 i18n（✅ BUG-133 / 138 / 153）；type 列 i18n（✅ BUG-143）。 | §2.1 |
| Step 14（收费） | `/#/billing` | filter 下拉无 JA leftover（✅ BUG-134）；R14 实测 migration 037 后 row Group 列三行显示本地化 label（zh-CN `东京一组` / en-US `Tokyo Team 1` / ja-JP `東京一組`），BUG-140 + BUG-159 双重闭环 ✅。 | §2.1 / §2.2 / R14 e2e |
| Step 19-20（续签提醒） | `/#/tasks` | 真实 TaskListView wired；reminder log 3 行（180/90/30 days before expiry, queued）；侧边栏 nav 缺 Tasks 入口（BUG-157）；reminder 内容直显 UUID（BUG-163）。 | §1 BUG-157/163 |

### B. R12 §1 实测验收一图速查

```text
R12 §1 BUG-133..156 (24 条)
├── ✅ PASS         × 20  (含 R12 ❌→实测 ✅ × 6 + R12 ✅→reaffirm × 14)
├── ✅ FIX-LANDED    × 1   (BUG-140 + BUG-159 闭环)
├── ⚠️ MOSTLY PASS  × 2   (BUG-142 nav 缺漏 / BUG-149 缩写 leftover)
└── ❌ FAIL         × 1   (BUG-137 birthday="")
└── 受阻未验        × 1   (BUG-151 受 BUG-158 阻断)
```

### C. 一键复现脚本（chrome-devtools-mcp 化的 e2e）

```text
# 0) 登录
navigate_page → /#/login ; fill admin@local.test / Admin123! ; click 登录

# 1) BUG-141 / 147 / 148 reaffirm（客户新建 modal）
navigate_page → /#/customers ; click "Add customer"
evaluate_script: inputs ⊃ {id:customer-create-*, name:*}      → noId=[] noName=[] labelMissingCount=0
fill displayName/group/legalName/phone/email
list_network_requests | grep check-duplicates                  → 3 (≤ 5)

# 2) BUG-137 reaffirm（仍 ❌）
curl -X POST /api/customers -d '{...,"birthday":""}'           → 400 (must be valid date)

# 3) BUG-145 / 164 reaffirm（customer numbering + dto-mapper 不对称）
curl -X POST /api/customers -d '{...probe...}'                 → baseProfile.customerNumber=CUS-202604-NNNN ✅
curl /api/customers?scope=all                                   → items[].customerNumber 顶层 ✅（BUG-164 不对称）

# 4) BUG-158 P0 复现（BMV 建案前置门禁）
navigate_page → /#/cases/create?customerId=<已有真实 case 客户>
click 经营管理（认定 4 个月）模板
select primaryCustomer
evaluate_script: $('button:contains(下一步)').disabled         → true ❌ 永远 disabled
evaluate_script: $('main').textContent.includes('问卷尚未回收') → true ❌ 4 条 blocker

# 5) BUG-159 confirm（建案 group_id 不持久化 → R14 FIX-LANDED）
# R13 原始: curl /api/cases → all groupId null ❌
# R14 实测（migration 037 后）:
curl /api/cases?scope=all | jq '.items[0:3] | .[] | .groupId'   → "ef21fdd2-..." ✅ (R6试探客户案件)
curl /api/billing-plans   | jq '.items[0:3] | .[] | .groupId'   → "ef21fdd2-..." ✅ (3/3 行非 null)

# 6) BUG-133 / 138 / 153 reaffirm（CaseOverview en-US 终态）
navigate_page → /#/cases/df9d1e84-fd62-4687-9297-decd8848412f ; locale=English
evaluate_script: .ui-chip → ["Case opened","Closed (success)"]  ✅ 仅 2 项不重复
evaluate_script: stageCard → "Current stage Case opened Closed" ✅ 不再 "S9"
evaluate_script: rawKeys = []                                    ✅

# 7) BUG-134 / 140 reaffirm → R14 FIX-LANDED (BUG-159 migration 037)
navigate_page → /#/billing ; locale=English
evaluate_script: filterGroup.options → ["All groups","Tokyo Team 1","Tokyo Team 2"]  ✅
# R13 原始: evaluate_script: tbody td:nth-child(4) → ["—","—","—"]   ⚠️ fix-no-data
# R14 实测: Group cell → ["Tokyo Team 1","Tokyo Team 1","Tokyo Team 1"]  ✅ fix-with-data

# 8) BUG-142 / 157 reaffirm
navigate_page → /#/tasks
evaluate_script: $('main h1').text === "Tasks & reminders"      ✅
evaluate_script: $('main').textContent.includes('Reminder log 3') ✅
evaluate_script: sidebarHasTasks === false                       ❌ BUG-157

# 9) BUG-156 reaffirm
navigate_page → /#/settings?tab=groups
evaluate_script: tbody tr:nth-child(1) td:nth-child(3) → "04/27/2026, 08:40 PM"  ✅ no ISO leak

# 10) BUG-160 验证（✅ FIX-LANDED）
curl -X POST /api/cases -d '{...合法 ownerUserId/customerId/caseTypeCode=biz_mgmt_4m...}'
# → 400 { code: "CASE_BMV_GATE_BLOCKED", blockers: [4 items] }  ✅ 不再 500
```

### D. 网络与 console 噪声基线

- 详情页一次完整加载：≈ 11 个聚合接口（与 R10 / R11 / R12 一致，无新接口）。
- 客户新建 modal：单次完整填写触发 3 次 `POST /api/customers/check-duplicates` + 1 次 `POST /api/customers`（BUG-147 land 后较 R12 取证 28 次大幅缩减）。
- console：R13 复测期间未观测到新的 i18n missing key warn / a11y issue（R12 取证的 `customers.list.createModal.state.validationError` warn 与 21 个 form field id 缺失 issue 都已消除）。
- API：~~BMV 案件创建路径 `POST /api/cases`（BUG-160）~~ ✅ FIX-LANDED（现返回 400 CASE_BMV_GATE_BLOCKED）；BMV intake `PATCH /api/customers/<id>/bmv-intake`（缺 endpoint，404）是本轮剩余的 server-side 缺口。
