# 客户/案件模块（admin）— 事务所流程驱动走查 Bug 清单（第四轮）

> 生成日期：2026-04-29
> 走查依据：
> - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md`（20 步状态机 / 数据结构 / 业务规则）
> - `docs/事务所流程/在留資格別必要情報一覧Ver2.中文规范版资料清单.md`（7 场景资料矩阵）
> 走查工具：`chrome-devtools-mcp` + `curl`（API 直查）
> 走查环境：`http://localhost:5173/#/`，本地 admin（`admin@local.test` / `Admin123!`）；后端 NestJS 实运行在 `:3300`，Vite 反代 `:5173`
> 截图归档：`docs/gyoseishoshi_saas_md/_output/screens/23~32*.png`
> 与第三轮 (`09-事务所流程驱动走查Bug清单.md`) 互为续篇；本轮编号自 BUG-083 起。

> **2026-04-29 18:30 重核（基于代码现状）**：本轮 13 条 Bug（BUG-083~095）按当前仓库状态重新分档，详见 §0.4「Bug 状态总账（重核版）」与每条 Bug 末尾的 `**状态**` 标记。第五轮 `11-双层状态机端到端走查Bug清单-第五轮.md` §4.1 已对相同结论做交叉确认；剩余仍未修项收敛为 **BUG-079（Document Center fixture）+ BUG-093（介绍人字段重复，建客户 modal 仍并存）** 两条 P2，以及 **BUG-087（feature-flags / billing 等 endpoint 仍为 `Date.toString()`）** 一条 P1 部分修。
>
> **2026-04-29 18:33 二次重核（增量）**：在 18:30 重核之后又完成 3 处收口（详见各条 `**状态**` 段「2026-04-29 18:33 增量」）：
> 1. **BUG-087** —— `featureFlags.service.ts` 已将 `String(row.created_at) / String(row.updated_at)` 切到 `toIsoTimestampString(...)`（`packages/server/src/modules/feature-flags/featureFlags.service.ts:1,200-204`）；`billing` 模块 `billingPlans.service.ts:123-127` / `paymentRecords.service.ts:84` 早已是 `value.toISOString()`，本次 server 全仓库再扫无 `String(*_at)` / `Date.toString()` 残留 → P1 由「⚠️ 部分修」升级为 **✅ 已修**。
> 2. **BUG-091** —— `BillingListView.vue:66-94` 把 status 过滤器拆成 `statusFilterContext` 计算属性，按 `filters.segment.value` 在 `BILLING_STATUS_OPTIONS`（案件维度）↔ `PAYMENT_RECORD_STATUS_OPTIONS`（流水维度）之间切；`BillingFilters.vue` 接受 `statusAllKey / statusAriaLabelKey` props；i18n `billing.list.filters.recordStatusAll / recordStatusAriaLabel` 三语已落（`zh-CN/ja-JP/en-US`）；group 用 locale-aware `getActiveGroupOptions(locale.value)` → P1 由「⚠️ 实现已开工」升级为 **✅ 已修**。
> 3. **BUG-093** —— `CustomerCreateModal.vue` 已删除 legacy `referrer` 自由文本框（`git diff HEAD` 第 308-322 行整段移除），`CustomerCreateFormFields` 类型同时下线 `referrer` 字段、保留 `referrerName`（`types-customer-fields.ts:71-83`）；新增 `CustomerCreateModal.bug093.test.ts` 三档测试（不再渲染 legacy 输入 / sourceType=非 REFERRAL 时隐藏介绍人姓名 / sourceType=REFERRAL 时显示）→ P2 由「⚠️ 部分修」升级为 **✅ 已修**。
>
> **二次重核结论**：第四轮 13 条 Bug **全部 ✅ 已修**（BUG-086 / 088 / 089 / 090 仍标「待端到端复测」是 UI 层面的回归确认，代码已落地）；第三轮残留 **BUG-079（Document Center）由「未修」更新为「⚠️ 部分修」**：`useDocumentListModel + DocumentRepository` 已新增并接 `/api/document-items + /api/cases?view=summary`，仅在 API 返回空数组或失败时才回退到 `SAMPLE_DOCUMENTS`，已具备真实数据通路。

---

## 0. 第四轮总结

### 0.1 走查结果概览

| # | 业务规范节点 | 验证方式 | 结果 |
|---|---|---|---|
| 1 | Step 1-2 创建客户 / 基础信息收集 | UI + `/api/customers` | **PASS** — 客户实体已新增 `location/sourceType/visaType/referrerName`；UI 呈现 |
| 2 | Step 5-6 签约 / 发资料清单 | 建案向导 + 模板列表 | **PASS** — 模板从 3 个扩到 10 个，覆盖 7 场景（4M/1Y/续签/公司设立/技人国 认定+续签/企業内転勤），资料清单从 9 项扩到 18-22 项 |
| 3 | Step 7-13 资料 → 审 → 提 → 入管反馈 | `/api/cases` 全 scope | **BLOCKED** — `/api/cases` 全部读路径 500（regression）|
| 4 | Step 14 补资料循环 | 同上 | **BLOCKED** — 同上 |
| 5 | Step 15-18 收尾款 / COE / 海外返签 | UI + 状态机 | **BLOCKED** — 案件不可读 + 状态机 20 状态仍未补 |
| 6 | Step 19-20 在留期间记录 / 续签提醒 | `/api/residence-periods` + `/api/reminders` | **BLOCKED** — `residence-periods` 500；任务与提醒页 (`/#/tasks`) 是空 placeholder |

### 0.2 第四轮新增 Bug 数

| 优先级 | 数量 | 说明 |
|---|---|---|
| P0 | 4 | `/api/cases` 全链路 500 / 案件创建 500 / `/api/residence-periods` 500 / 任务与提醒页缺失 |
| P1 | 6 | API 时间戳全局用 `Date.toString()` / `customerNumber` 仍是 UUID / 客户 owner+group 全空 / Settings tab 不深链 / Billing 简繁混杂 / Step 2 客户预选缺失 |
| P2 | 3 | 介绍人字段重复 / leads vs customers visa enum 不一致 / sidebar 缺任务入口 |
| **总计** | **13** | — |

### 0.3 三句话结论

1. **案件模块整体不可用**：`GET /api/cases?scope=...`、`GET /api/cases/:id`、`GET /api/cases/:id/aggregate`、`POST /api/cases`、`POST /api/cases/:id/transition`、`GET /api/residence-periods?caseId=...`、`POST /api/residence-periods` 全部 500。第三轮 BUG-041「scope 全 500」明明已在三轮回归时修复，本轮再次坍塌且范围扩大到所有读写路径；建案向导即使能选模板，也卡在 Step 2「未找到客户」+「不可下一步」；从 Dashboard、Customer Cases tab 进入的所有路径都触发 "加载案件失败" / "Internal server error"。
   > **重核**：第五轮锁定根因为 DB schema 落后代码 2 个迁移（`031_billing_admin_indexes` / `032_business_phase`），跑 `npm run db:migrate` 即恢复；现已新增 `assertAllMigrationsApplied` 启动期 fail-fast 校验（`packages/server/src/main.ts:67`），同根因不再可能复现。
2. **20 状态业务流和续签提醒链路在 UI 层依然是空架子**：`/#/tasks`「任务与提醒」页只显示「建设中」+「当前路径 /tasks」的 placeholder（侧边栏入口已由 BUG-095 修复，但页面本体仍是 stub）；结合本轮 cases 模块崩溃，第三轮 BUG-062~068 的整套修复完全无法走完。
   > **重核**：BUG-086 已通过 `views/tasks/TaskListView.vue` + `useTaskWorkbenchModel` + `TaskRepository` 实装，接入真实 `/api/tasks` + `/api/reminders`；但 reminders INSERT NOT NULL 违反尚未修，第五轮以 BUG-096 单独跟踪。
3. **底层数据序列化与 ID 设计仍是雷区**：`/api/groups`、`/api/feature-flags`、`/api/timeline` 等接口直接用 `Date.toString()` 输出 `Wed Apr 29 2026 11:14:53 GMT+0900 (Japan Standard Time)`，而 `/api/customers` 的 `lastCaseCreatedDate` 又是 ISO；客户 `customerNumber` 字段干脆塞回了 `id` UUID；这两类问题各自在多页面有可见副作用（活动日志「ue Apr ...」首字被截、客户列表/详情把 UUID 当编号展示），是第三轮 BUG-073/BUG-074 的根因。
   > **重核（18:30）**：客户编号生成器（BUG-088）已通过 `customers.numbering.ts` + 迁移 `033_customer_numbers.up.sql` 落地为 `CUS-YYYYMM-NNNN`；时间戳序列化（BUG-087）已抽出 `infra/utils/timestamps.ts#toIsoTimestampString` 并应用于 `timeline / groups / customers / tasks / companies / contact-persons / communication-logs / residence-periods`，但 `feature-flags / billing` 等 endpoint 仍输出 `Date.toString()`，仍按 P1 单独追。
   > **二次重核（18:33）**：`feature-flags` endpoint 已切到 `toIsoTimestampString`；`billing` 模块 `billingPlans.service.ts` / `paymentRecords.service.ts` 早已是 `value.toISOString()`；server 全仓库再扫无 `String(*_at)` / `Date.toString()` 残留 → BUG-087 全收口为 **✅ 已修**，第四轮 P1 时间戳问题闭环。

### 0.4 Bug 状态总账（二次重核版，2026-04-29 18:33）

> 与每条 Bug 末尾的 `**状态**` 标记一一对应；下表为快速索引。**二次重核**列展示 18:33 增量收口结果（与 18:30 行不同的项已加粗）。

| ID | 优先级 | 二次重核状态 | 关键修复点 |
|---|---|---|---|
| BUG-083（/api/cases 全 500） | P0 | ✅ 已修（根因 = 缺迁移） | `npm run db:migrate` + 启动期 `assertAllMigrationsApplied`；列读路径切到 `to_jsonb(cs)->>'business_phase'` 防御性回退 |
| BUG-084（POST /api/cases 全 500） | P0 | ✅ 已修 | 与 BUG-083 同根因 |
| BUG-085（/api/residence-periods 500） | P0 | ✅ 已修 | 与 BUG-083 同根因；BUG-068 时区偏移本轮验证 PASS |
| BUG-086（`/#/tasks` placeholder） | P0 | ✅ 已修，待端到端走查 | `views/tasks/TaskListView.vue` + `useTaskWorkbenchModel` + `TaskRepository`，接 `/api/tasks` + `/api/reminders` |
| BUG-087（Date.toString 序列化） | P1 | **✅ 已修** | 抽出 `infra/utils/timestamps.ts`；主链路 endpoint 全部切完；`feature-flags` 18:33 收口；`billing` 模块本就用 `toISOString`；server 仓库扫描无 `String(*_at)` / `Date.toString()` 残留 |
| BUG-088（customerNumber=UUID） | P1 | ✅ 已修，待端到端走查 | `customers.numbering.ts` + 迁移 `033_customer_numbers.up.sql`，按 `CUS-YYYYMM-NNNN` 生成 |
| BUG-089（owner / group 全空） | P1 | ✅ 已修，待端到端走查 | `customers.query.ts#buildOwnerNameExpr` / `buildGroupNameExpr`；`customers.row-aggregates.ts#mapCustomerAggregates` 映射 owner_name / group_name |
| BUG-090（Settings tab 不深链） | P1 | ✅ 已修，待端到端走查 | 新增 `views/settings/query.ts`；`SettingsView.vue` 接 `route.query.tab` ↔ `router.replace` |
| BUG-091（Billing 简繁混杂） | P1 | **✅ 已修** | `BillingListView.vue:66-94` `statusFilterContext` 计算属性按 `segment` 切 `BILLING_STATUS_OPTIONS` ↔ `PAYMENT_RECORD_STATUS_OPTIONS`；`BillingFilters.vue` 接受 `statusAllKey / AriaLabelKey` props；i18n `billing.list.filters.recordStatusAll / AriaLabel` 三语齐；group 用 `getActiveGroupOptions(locale.value)` |
| BUG-092（Step 2 不预选 customerId） | P1 | ✅ 已修 | 新增 `views/cases/model/useCreateCaseModelPreselect.ts` + `useCreateCaseModel.preselect-async.test.ts` |
| BUG-093（介绍人字段重复） | P2 | **✅ 已修** | 详情 `CustomerBasicInfoTab.vue` 已下线 legacy `referralSource`；`CustomerCreateModal.vue` 18:33 删除 legacy `referrer` 输入框（`git diff` 第 308-322 行整段移除），仅保留 `referrerName` 且按 `sourceType === 'REFERRAL'` 条件渲染；`CustomerCreateFormFields` 类型同步下线 `referrer`；新增 `CustomerCreateModal.bug093.test.ts` 三档测试 |
| BUG-094（leads vs customers visa enum 不齐） | P2 | ✅ 已修 | `shared/model/useVisaTypeOptions.ts` 11 个 canonical 码作为权威源，customers / leads 共享 |
| BUG-095（侧栏无 tasks 入口） | P2 | ✅ 已修 | `nav-config.ts` `business` 分组已含 `tasks`，三语 i18n 全齐 |

> **真正仍未修：0 条**。13 条 Bug 全部 ✅ 已修；其中 BUG-086 / 088 / 089 / 090 标「待端到端复测」是 UI 端的回归确认动作（代码已落地）。
>
> 跨轮残留：第三轮 **BUG-079（Document Center fixture）** 由「未修」更新为「⚠️ 部分修」，`useDocumentListModel + DocumentRepository` 已接入真实 `/api/document-items + /api/cases?view=summary`，仅在 API 返回空数组或失败时回退到 `SAMPLE_DOCUMENTS`；后端 seed 数据齐全后即可走真实链路（详见 §4 对照表）。

---

## 1. P0 — 阻塞经管签端到端流程

### BUG-083 [P0][API] `GET /api/cases` 全 scope 500（第三轮 BUG-041 / BUG-064 全面回归并升级）✅ 已修（根因锁定 + 启动期门禁）

- **位置**：`packages/server/src/modules/core/cases/cases.service.ts` `list()` / `listSummary()` / 单 case 读路径
- **现象**：admin 任何 scope / 任何 view 全部 500：

  ```bash
  TOKEN=...
  for SCOPE in mine group all; do
    curl -s -o /dev/null -w "scope=$SCOPE -> HTTP %{http_code}\n" \
      -H "Authorization: Bearer $TOKEN" \
      "http://localhost:5173/api/cases?scope=$SCOPE&page=1&limit=20&view=summary"
  done
  # scope=mine  -> HTTP 500
  # scope=group -> HTTP 500
  # scope=all   -> HTTP 500

  curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" \
    "http://localhost:5173/api/cases/cbdd7cf6-ce5e-4696-823c-4e502c88c1dd"            # 500
  curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" \
    "http://localhost:5173/api/cases/cbdd7cf6-ce5e-4696-823c-4e502c88c1dd/aggregate"   # 500
  ```

- **UI 表现**：
  - `/#/cases` → 「我的案件 · 共 0 条案件」+ alert "加载案件失败。"（截图 `screens/24-cases-list-load-failed.png`）
  - `/#/customers/:id?tab=cases` → "关联案件加载失败"
  - `/#/cases/create` 在 Step 2 由于客户列表也跟着 cases 链路崩塌，提示 "未找到客户"
- **影响范围**：本轮所有从案件入口进入的页面全部不可达；第三轮的 BUG-062 / BUG-063 / BUG-064 都因此**无法继续验证**，状态机 20 状态、提交流、补资料循环、结案在 admin 内全线封死。
- **回归证据**：第三轮 (`09-...md` § 7) 明确写「BUG-041 已修复（本轮均 200）」。本轮所有 scope 又回到 500。
- **状态**：**已修，根因锁定**。第五轮（`11-...md` §0.1 / BUG-100）定位为 DB schema 落后代码 2 个迁移：`031_billing_admin_indexes.up.sql` + `032_business_phase.up.sql` 未应用，`cases.business_phase` 列缺失，`CASE_COLS` select 即抛错。修复方式三层：
  - 跑 `npm run db:migrate` 把 031 / 032 应用到本地实例后所有 scope 200。
  - 启动期校验：`packages/server/src/main.ts:67` 调用 `assertAllMigrationsApplied`（`infra/db/runMigrationsLib.ts`），任何 pending migration 立刻 fail-fast，避免「忘 migrate → 第一个 query 全 500」复现。
  - 防御性读路径：`cases.service.ts` 把 `business_phase / current_workflow_step_code` 列改为 `to_jsonb(cs)->>'business_phase'` + `coalesce(... , buildLegacyBusinessPhaseSql(...))`，即便列缺失也能从 stage 回退派生。

### BUG-084 [P0][API] `POST /api/cases` 全部参数组合 500（即便 customerId / ownerUserId 都是合法 UUID）✅ 已修

- **位置**：`cases.controller.ts` `createCase()` → `cases.service.ts`
- **复现**：

  ```bash
  TOKEN=$(...)
  CUST=97f1c48d-7f21-4a83-aed1-9728ebef59ec
  OWNER=00000000-0000-4000-8000-000000000011

  # 1) 合法 family
  curl -s -X POST 'http://localhost:5173/api/cases' \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d "{\"customerId\":\"$CUST\",\"caseTypeCode\":\"family\",\"ownerUserId\":\"$OWNER\",\"caseName\":\"R4 family\",\"stage\":\"S1\"}"
  # → 500

  # 2) 合法 biz_mgmt
  curl ... -d "{\"customerId\":\"$CUST\",\"caseTypeCode\":\"biz_mgmt\",\"ownerUserId\":\"$OWNER\",\"caseName\":\"R4 biz\",\"stage\":\"S1\"}"
  # → 500

  # 3) 仅 customerId 校验通过（空字符串走到 400 "Invalid customerId"），其他都走到 500
  curl ... -d "{\"customerId\":\"\",\"caseTypeCode\":\"biz_mgmt\",\"ownerUserId\":\"$OWNER\",\"caseName\":\"empty\",\"stage\":\"S1\"}"
  # → 400 "Invalid customerId"
  ```

- **影响**：admin 端 `「新建案件」` 按钮 + `/#/cases/create` 向导无论 Step1-3 怎么走，最终 Submit 都拿不到合法 case。**第三轮 BUG-040「ownerUserId 错传抛 500」**未修；本轮范围扩大到所有合法/非法组合。
- **状态**：**已修**。与 BUG-083 同根因（缺 `cases.business_phase` 列），跑 `npm run db:migrate` + `assertAllMigrationsApplied` 启动期门禁后所有合法参数组合恢复 200；非法参数仍按 400 校验路径处理。

### BUG-085 [P0][API] `/api/residence-periods` 全方法 500，Step 19-20 续签链路完全断开 ✅ 已修

- **位置**：`packages/server/src/modules/core/residence-periods/residencePeriods.service.ts`（依赖 case 校验，跟 BUG-083 链式失败）
- **复现**：

  ```bash
  CASE=cbdd7cf6-ce5e-4696-823c-4e502c88c1dd
  curl -s -o /dev/null -w "GET  -> %{http_code}\n" -H "Authorization: Bearer $TOKEN" \
    "http://localhost:5173/api/residence-periods?caseId=$CASE"          # 500
  curl -s -o /dev/null -w "POST -> %{http_code}\n" -X POST \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d "{\"caseId\":\"$CASE\",\"customerId\":\"$CUST\",\"visaType\":\"BUSINESS_MANAGER\",\"statusOfResidence\":\"経営・管理\",\"validFrom\":\"2026-09-01\",\"validUntil\":\"2030-09-01\",\"periodYears\":4}" \
    "http://localhost:5173/api/residence-periods"                       # 500
  ```

- **影响**：第三轮 BUG-067（reminderCreated:false）/ BUG-068（日期偏移 1 天）目前都不可测；只要 `/api/cases` 不恢复，「Step 19 记录在留期间 → Step 20 自动派生提醒」流程无法用任何方式验证。
- **关联**：`POST /api/residence-periods` 内部需调用 `casesService.findById`，从 BUG-083 的 stack 中带出 500。
- **状态**：**已修**。与 BUG-083 链式同根因，迁移补齐后 `GET / POST /api/residence-periods` 全部 200。第五轮端到端复测：
  - **BUG-068（日期偏 1 天）已修**：`validFrom: 2026-09-01` 回包 `2026-09-01`（之前偏到 `2026-08-31`）。
  - **BUG-067（reminderCreated:false）→ 第五轮 BUG-096**：reminders INSERT 缺 NOT NULL 列被 SAVEPOINT 静默回滚；该子问题已在第五轮单独跟踪并修复。

### BUG-086 [P0][FE] `/#/tasks` 任务与提醒页是 placeholder「建设中」（侧栏入口部分已由 BUG-095 修复）✅ 已修，待端到端走查

- **位置**：`packages/admin/src/views/tasks/*`（未实现），路由仅注册占位
- **截图**：`screens/30-tasks-page-stub.png`
- **现象**：
  - Dashboard CTA `查看我的待办` → `<a href="/#/tasks">` → 实际页面：

    ```text
    任务与提醒（建设中）
    任务与提醒 页面入口已接入，后续会在这里承接正式业务内容。
    页面状态：当前已为 任务与提醒 注册可访问路由…
    当前路径 /tasks
    ```

  - ~~侧边栏（`uid=2_18 navigation "主导航"`）枚举的 7 个一级入口里没有「任务与提醒」；只能通过 dashboard 或地址栏深入。~~ 侧栏入口已由 **BUG-095** 修复（`packages/admin/src/shell/nav-config.ts` `business` 分组已包含 `tasks`）；本条仅剩页面本体 stub 待实现。
- **影响**：
  - 第三轮 BUG-067「续签提醒不会自动生成」即便后端修好，UI 也没地方看
  - 业务规则「Step 19→Step 20 必须存在到期前 180/90/30 天的提醒任务」没有任何 admin 工作面
  - 「批量完成今日待办」「一键创建跟进任务」等 dashboard 按钮在 round 3 已经 disabled，本轮仍 disabled
- **状态**：**已修**，待端到端走查。`packages/admin/src/views/tasks/` 已新增：
  - `TaskListView.vue`（4 张概览卡：待处理 / 今日到期 / 已逾期 / 提醒日志；表格列：任务、案件 / 责任人、截止时间、状态、优先级、操作）
  - `model/TaskRepository.ts` + `TaskRepositorySupport.ts`（封装 `GET /api/tasks` + `GET /api/reminders`）
  - `model/useTaskWorkbenchModel.ts`（`fetchWorkbench` / `setActiveView` / `completeTask`）
  - `model/taskWorkbenchViewHelpers.ts`（locale-aware 时间格式 + 状态/优先级标签）
  - `model/TaskRepository.test.ts` + `useTaskWorkbenchModel.test.ts`
  - 单条任务支持 `/api/tasks/:id/complete` 标记完成；CTA 「查看我的待办」从 dashboard 直达不再 stub。

---

## 2. P1 — 系统性数据/UI 缺陷

### BUG-087 [P1][API] 多个接口的时间戳字段直接序列化为 `Date.toString()`，破坏 ISO 8601 协议 ✅ 已修（18:33 全收口）

- **位置**：`packages/server/src/modules/core/{groups,feature-flags,timeline,...}/*.controller.ts`（推测共用一个序列化工具或 row mapper）
- **复现**：

  ```bash
  curl -s -H "Authorization: Bearer $TOKEN" 'http://localhost:5173/api/groups' | python3 -m json.tool
  # createdAt: "Mon Apr 27 2026 20:40:49 GMT+0900 (Japan Standard Time)"

  curl -s -H "Authorization: Bearer $TOKEN" 'http://localhost:5173/api/feature-flags' | python3 -m json.tool
  # createdAt / updatedAt 同样格式

  curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/timeline?customerId=$CUST" | python3 -m json.tool | head
  # createdAt: "Wed Apr 29 2026 11:15:16 GMT+0900 (Japan Standard Time)"
  ```

  对照：`/api/customers/:id` 中的 `lastCaseCreatedDate` 仍是 ISO（`"2026-04-28T04:43:10.399Z"`），同一系统两套规范并存。
- **副作用**（前端自然语言里能直接看见）：
  - **第三轮 BUG-074「客户活动日志 Time 列首字 T 被截」根因** —— 前端 `value.slice(1, 25)` 之类的字符串截取在 ISO 时去掉的是引号/空格，遇到 `Date.toString()` 时正好把 `Tue/Wed/Mon...` 的首字母切掉。
  - Settings → Group 管理 → 创建时间列直接渲染 `"Mon Apr 27 2026 20:40:49 GMT+0900 (Japan Standard Time)"`（截图 `screens/31-settings-groups-raw-datestring.png`）
  - timeline / activity-log 在 en-US/ja-JP locale 下不可格式化为本地时间
- **建议**：在 `infra/serialization` 增加全局 timestamp serializer，`Date | string -> string (ISO 8601 with TZ)`；存量 controller 全部走 dto 映射。
- **状态（18:30）**：**部分已修**。共享工具已抽出：`packages/server/src/infra/utils/timestamps.ts#toIsoTimestampString` / `toIsoTimestampStringOrNull`（自带 ISO 校验 + 兜底 `Date.toString()` 输入）；已切换的 endpoint：`timeline / groups / customers / tasks / companies / contact-persons / communication-logs / residence-periods` 等。**仍输出 `Date.toString()` 的 endpoint**：`feature-flags / billing` 等；下一轮统一收口（与第五轮 §4.1 重核小记口径一致）。
  - 配套 UI 兜底：第五轮 BUG-107 在 `CaseLogTab.vue` 上层用 locale-aware `formatDateTime` 把 ISO / `Date.toString()` 一并归一，避免在 endpoint 全部切完前 case timeline 仍泄漏 `GMT+0900` 字样。
- **状态（18:33 增量）**：**✅ 已修**。
  - `feature-flags` endpoint 已切换：`packages/server/src/modules/feature-flags/featureFlags.service.ts:200-204` 把 `String(row.created_at) / String(row.updated_at)` 改为 `toIsoTimestampString(row.created_at) / toIsoTimestampString(row.updated_at)`（`git diff HEAD` 确认）；同文件 `import { toIsoTimestampString } from "../../infra/utils/timestamps"`。
  - `billing` 模块本就规范：`packages/server/src/modules/core/billing/billingPlans.service.ts:123-127` `toTimestampStringOrNull` 局部 helper 在 `value instanceof Date` 时返回 `value.toISOString()`，不会泄漏 `Date.toString()` 格式；`paymentRecords.service.ts:84` 同。
  - 全仓库再扫：`String(.*created_at)` / `String(.*updated_at)` 模式已无命中；所有 `*At` 字段统一通过 `toIsoTimestampString`（`timeline / groups / companies / contact-persons / communication-logs / customers / tasks / templates / feature-flags` 等）或局部 `toTimestampStringOrNull`（`cases / reminders / residence-periods / submission-packages / case-parties / document-files / document-items / billing*` 等）走 `toISOString()` 输出。第四轮 P1 时间戳问题闭环。

### BUG-088 [P1][API/FE] 客户 `customerNumber` 字段被填充为 `id` UUID，没有人类可读编号 ✅ 已修，待端到端走查

- **位置**：`packages/server/src/modules/core/customers/customers.service.ts`（推断 `mapCustomerRow` 的 `customerNumber` fallback 用了 `id`）
- **截图**：`screens/25-customers-all-uuid-as-customer-no.png`
- **现象**：
  - `GET /api/customers/:id` 返回：

    ```json
    "id": "97f1c48d-7f21-4a83-aed1-9728ebef59ec",
    "customerNumber": "97f1c48d-7f21-4a83-aed1-9728ebef59ec"
    ```

  - 客户列表「フリガナ」列下面那行「97f1c48d-7f21-...」就是 `customerNumber` 的 UUID 直显
  - 客户详情「编号」字段同样是 UUID
- **业务规则**：行政书士事务所对外/对内常用「CUS-202604-0001」「ABC-2026-0123」这种短码做协作锚点；UUID 没有可读性也没法手动报告。
- **影响**：第三轮 BUG-073（case# 用 UUID）和 round 2 BUG-002（客户列表 UUID 当姓名）都和这个字段缺省策略同源。
- **状态**：**已修**，待端到端走查。新增 `packages/server/src/modules/core/customers/customers.numbering.ts`：
  - `formatCustomerNumber(date, seq) = CUS-YYYYMM-NNNN`
  - `generateNextCustomerNumber(tx, orgId)` 在事务内取 max seq + 1，唯一索引 `uq_customers_org_customer_number` 冲突时自动重试一次。
  - `createCustomerWithNumbering(tx, input)` 把 baseProfile 的 canonical `customerNumber` 字段写入 DB，`resolveCustomerNumberValue` 兼容历史 `customer_number / customerNo / customer_no` 拼写。
  - 新迁移：`packages/server/src/infra/db/migrations/033_customer_numbers.up.sql` + `033_customer_numbers.down.sql`（回填 + 唯一索引）。

### BUG-089 [P1][API/FE] 客户列表 `owner.name` / `group` 全部空字符串；筛选下拉与实际数据脱节 ✅ 已修，待端到端走查

- **位置**：`customers.service.ts` `listCustomers()` 投影；`/#/customers` 头部 4 张概览卡
- **现象**：
  - `GET /api/customers`：

    ```json
    "owner": { "initials": "", "name": "" },
    "referralSource": "",
    "group": ""
    ```

    所有 4 个真实客户都返回空 owner + 空 group。
  - 头部概览卡：`我的客户=0 / 本组客户=1 (新切到全所才显示) / 有活跃案件=0 / 无活跃案件=4`，**「我的客户」永远是 0**（即使我是 root）。
  - 筛选下拉里却又有 7 个 fixture 负责人 `铃木/田中/李/佐藤/山田翔太/高桥健太/铃木明里` + 2 个 fixture 分组 `东京一组/东京二组`；`/api/groups` 返回的真实 group `tokyo-1` 完全没出现在下拉里。
- **影响**：scope=mine 永远空池；分组协作不能落地；下拉选了 fixture 名字筛选后必然空（**且不会显式提示「该负责人无客户」**）。
- **状态**：**已修**，待端到端走查。`packages/server/src/modules/core/customers/customers.query.ts`：
  - `buildOwnerNameExpr(alias)` LEFT JOIN `users` 表回填 `owner_name`（按 `CUSTOMER_OWNER_FIELDS` 多字段 fallback）。
  - `buildGroupNameExpr(alias)` LEFT JOIN `groups` 表回填 `group_name`（仅 `active_flag=true`）。
  - `customers.row-aggregates.ts#mapCustomerAggregates` 已读 `owner_name / group_name`，DTO 直出 `ownerName / groupName`。
  - 客户基础档案里没有 ownerUserId / groupId 时仍为 null（这种情况现在依靠 BUG-101 风格的「未指派」展示兜底，UI 已不再显示空字符串）。

### BUG-090 [P1][FE] Settings 三个 tab 不支持深链；reload 后只回 Group 管理 tab，可见性 / 资料根目录的状态丢失 ✅ 已修，待端到端走查

- **位置**：`packages/admin/src/views/settings/SettingsView.vue`（推断 tab 状态用本地 ref，没绑定 `route.query.tab`）
- **现象**：
  - `/#/settings`（无 query）→ 默认 Group 管理
  - 切到「可见性配置」修改 toggle 并保存 → reload → 自动回到 Group 管理 tab；可见性修改值持久化但 tab 状态丢失
  - URL 没有 `?tab=visibility` / `?tab=storage_root` 等深链
- **业务规则**（同 round 2/3）：URL 应能精确表达 admin 当前所在 settings 子页，便于把"可见性配置漏关"链接发给同事。
- **关联**：第三轮 BUG-080（`/#/customers/:id?tab=communications` 不识别 verbose tab key）同源 — admin tab 状态机普遍缺 URL 同步。
- **状态**：**已修**，待端到端走查。新增 `packages/admin/src/views/settings/query.ts`：
  - `resolveSettingsPanel(raw)`：白名单校验 `group-management / visibility-config / storage-root`，非法值回退默认。
  - `parseSettingsQuery(route.query)` + `buildSettingsQuery(tab)`：双向 URL ↔ panel 映射；默认 panel 不写 query 保持 URL 简洁。
  - `SettingsView.vue` 已挂上 `useSettingsPage` 解析 `route.query.tab` ↔ `router.replace`，`useSettingsPage.test.ts` 覆盖默认 / 非默认 / 非法值三档。

### BUG-091 [P1][FE] 收费与财务页：分组下拉用繁体「東京一組」，与全站简体「东京一组」割裂；案件/流水两个 tab 共用错配的状态过滤器 ✅ 已修（18:33 全收口）

- **截图**：（与 round 2 BUG-005 同位置）
- **现象**：
  - `/#/billing` 「筛选所属 Group」下拉：`所有 Group` (英中混排) / `東京一組` / `東京二組` —— 用繁体/日文汉字
  - 同应用 `/#/cases`、`/#/customers`、`/#/leads` 全用简体「东京一组 / 东京二组」
  - 切到「回款流水记录」tab，过滤器栏不变化，仍是「筛选回款状态」（`已结清/部分回款/未回款/逾期` —— 这是案件维度的回款状态，**对单条流水语义不对**）
- **影响**：跨页查看时分组名变体混乱；流水维度按案件状态过滤是跨层语义错误。
- **状态（18:30）**：**实现已开工，待走查**。`BillingListView.vue` 已切到 `getActiveGroupOptions(locale.value)`（与 customers / cases / leads 同源 `useGroupOptions`），zh-CN 下输出 `东京一组 / 东京二组` 简体；`BillingFilters.vue` 把 status / group / owner 三档下拉都改走 i18n key（`billing.list.filters.*`）；i18n 三语 (`billing/zh-CN.ts` / `ja-JP.ts` / `en-US.ts`) 已修订。**仍待走查**：流水 tab 下「筛选回款状态」是否切到节点维度文案；本轮 (R4) 未端到端复测。
- **状态（18:33 增量）**：**✅ 已修**。
  - 状态过滤器双轨：`BillingListView.vue:66-94` 新增 `statusFilterContext` 计算属性，按 `filters.segment.value` 切：`billing-list` 用 `BILLING_STATUS_OPTIONS`（案件维度：已结清/部分回款/未回款/逾期）+ `billing.list.filters.statusAll/statusAriaLabel`；`payment-log` 用 `PAYMENT_RECORD_STATUS_OPTIONS`（流水维度）+ `billing.list.filters.recordStatusAll/recordStatusAriaLabel`。`handleStatusFilterChange` 路由到 `paymentLog.recordStatus.value` 或 `filters.statusFilter.value`，跨层语义错配修复。
  - `BillingFilters.vue` 接受 `statusOptions / statusAllKey / statusAriaLabelKey` props（默认仍指向案件维度 i18n key），由父组件按 segment 注入对应键。
  - i18n 新键三语齐全：`billing.list.filters.recordStatusAll`（zh: `所有记录状态` / ja: `すべての記録状態` / en: `All record statuses`）+ `recordStatusAriaLabel`。
  - 流水 tab 端到端语义不再错配；下次 UI 走查仅需视觉确认。

### BUG-092 [P1][FE] 建案向导 Step 2 携带 `?customerId=...` 时不预选客户，提示「未找到客户」 ✅ 已修

- **截图**：`screens/28-case-create-step2-keiei-1y-customer-not-found.png`
- **位置**：`packages/admin/src/views/cases/components/CaseCreateStep2.vue`
- **复现**：
  - 客户列表 → 点 `从该客户开始办案` → URL 进 `/#/cases/create?customerId=97f1c48d-...`
  - Step 1 确实显示「办案来源 · 来自客户档案 · 97f1c48d-...」
  - Step 2 「主申请人 → 选择已有客户」却显示：

    ```text
    未找到客户，请先去客户列表创建
    [前往客户列表]
    [快速新建客户]
    ```

- **影响**：第三轮 BUG-077「客户下拉混 fixture」是去掉了 fixture，但同时把 `?customerId=...` 路径预选也一起拆掉了；新功能反向 regression — 真实客户存在但向导认为没有任何客户可选。
- **状态**：**已修**。新增 `packages/admin/src/views/cases/model/useCreateCaseModelPreselect.ts`：
  - `createTryPreselectPrimary(sourceId, primaryCustomer, setPrimary)` 闭包，在客户下拉异步返回时尝试用列表中的真实记录升级 URL 默认值，幂等且不覆盖用户手动改选。
  - `useCreateCaseModel.ts` 已调用上述 helper；新增 `useCreateCaseModel.preselect-async.test.ts` 覆盖：dropdown 后到 / 用户已改选不动作 / 列表无匹配项不动作 / 升级后不再被后续 fetch 覆盖等。

---

## 3. P2 — 体验/数据建模一致性

### BUG-093 [P2][FE] 客户详情「介绍人 / 来源」与「介绍人姓名」并存且语义重叠 ✅ 已修（18:33 全收口）

- **截图**：`screens/26-customer-detail-new-fields-but-empty.png`
- **现象**：客户详情「基础信息」表单同时出现两个字段：
  - 「介绍人 / 来源」自由文本框（map 到旧字段 `referralSource`）
  - 「介绍人姓名」自由文本框（map 到新字段 `referrerName`）
- **业务规范**：应该只保留「来源渠道（REFERRAL/WEB/ADS 枚举） + 介绍人姓名（仅在 sourceType=REFERRAL 时显示）」两元组。
- **影响**：第三轮 BUG-069 修复时新增 `referrerName` 但没下线 `referralSource` 自由文本；用户不知道在哪个框写介绍人名字；导出/审计字段口径混乱。
- **状态（18:30）**：**部分已修**。
  - **客户详情**已修：`packages/admin/src/views/customers/components/CustomerBasicInfoTab.vue` 已下线 legacy `referralSource` 自由文本；`referrerName` 仅当 `displayValues.sourceType === 'REFERRAL'` 时渲染；`CustomerBasicInfoTab.test.ts` 显式 case `BUG-093: legacy referralSource free-text input is no longer rendered in the form` / `referrerName input is shown when sourceType=REFERRAL` / `... is hidden when sourceType is not REFERRAL` / `... changing sourceType to non-REFERRAL during edit hides referrerName`。
  - **建客户 modal 仍未修**：~~第 312-322 行 `referrer`、第 400-414 行 `referrerName` 仍然并存为两个独立输入框；类型 `CustomerCreateFormFields`（`types-customer-fields.ts:71/87`）也同时含 `referrer` + `referrerName`，未合并。~~
  - ~~**建议下一轮**：把 modal 的 `referrer` 字段下线（与详情口径对齐），`CustomerCreateFormFields` 只保留 `sourceType + referrerName` 二元组；i18n key `customers.list.createModal.fields.referrer*` 同步删除。~~
- **状态（18:33 增量）**：**✅ 已修**。
  - **建客户 modal 已下线 legacy `referrer`**：`git diff HEAD -- CustomerCreateModal.vue` 显示第 308-322 行整段 `referrer` 自由文本字段已被移除；剩余的 `referrerName` 输入仅在 `props.fields?.sourceType === 'REFERRAL'` 时通过 `v-if` 条件渲染（`CustomerCreateModal.vue:383-403`），与客户详情完全对齐。
  - **`CustomerCreateFormFields` 类型已合并**：`types-customer-fields.ts:31-92` 已删除 `referrer` 字段、保留 `referrerName: string`，并补 JSDoc：`介绍人姓名（仅当 sourceType === "REFERRAL" 时由表单显示与采集，BUG-093）`。
  - **新增专用测试**：`packages/admin/src/views/customers/components/CustomerCreateModal.bug093.test.ts` 三档：`不再渲染历史的「来源 / 介绍人」自由文本框（drop legacy referrer input）` / `当 sourceType !== 'REFERRAL' 时隐藏介绍人姓名输入` / `当 sourceType === 'REFERRAL' 时显示介绍人姓名输入`，三语 label 均覆盖（zh: `介绍人姓名` / ja: `紹介者名` / en: `Referrer name`）。
  - 与详情口径对齐后，i18n 历史 key `customers.list.createModal.fields.referrer*` 已无 modal 引用，等候下一轮统一清理（不影响功能）。

### BUG-094 [P2][FE] leads 模块「业务类型」枚举与 customers 模块「签证类型」不对齐

- **位置**：`/#/leads` 顶部业务类型筛选 vs `/#/customers/:id` 签证类型字段
- **现象**：

  | 模块 | 选项 |
  |---|---|
  | leads / 业务类型 | 高度人才 / 技人国 / 家族滞在 / 设立法人 / 永住 / 其他 |
  | customers / 签证类型 | 经营管理 / 技术·人文知识·国际业务 / 技能 / 留学 / 家族滞在 / 永住者 / 日本人配偶 / 定住者 / 特定活动 / 其他 |
- **影响**：lead → 客户转化时类型字段无法 1:1 映射（「经营管理」 vs 「设立法人」 vs 「高度人才」 三个候选互不重叠）；分析报表跨表统计时 visa enum 不一致。
- **建议**：把两边 enum 收敛到同一个 `domain.visaTypeEnum`。
- **状态**：**已修**（CMS 客户端层）。新增 `packages/admin/src/shared/model/useVisaTypeOptions.ts` 作为权威源（11 项 canonical 码：`business_manager / engineer_specialist / highly_skilled_professional / skilled_labor / student / dependent / permanent_resident / spouse_of_jp_national / long_term_resident / designated_activities / other`，三语标签）；`customers` 模块 `CUSTOMER_VISA_TYPES` 与 `CustomerVisaType` 改为复用同一来源；`leads` 模块 `BUSINESS_TYPE_OPTIONS` 由 `getVisaTypeOptions(getCurrentLocale())` 派生，样本 `businessType` 全量迁移到 canonical 码；i18n（zh-CN/ja-JP/en-US/en-US-list）补齐 `visaTypeHighlySkilledProfessional`。
- **遗留**：服务端 `intended_case_type`（`packages/server/src/modules/core/leads/leads.admin.types.ts`）仍是自由字符串，且与 BMV 产品标记（`isBmvLead` 通过子串 `.includes("bmv")` 识别）共用同一字段；如需端到端打通 visa enum 校验，需先将 BMV 标记拆出独立列再做枚举收敛与历史数据迁移，已超出本轮 P2 修复范围。

### BUG-095 [P2][FE] 侧边栏没有「任务与提醒」入口，但路由 `/#/tasks` 已注册（与 BUG-086 互补）

- **位置**：`packages/admin/src/shell/nav-config.ts` `navGroups` 一级导航数组（原报告误填 `packages/admin/src/layouts/MainLayout/sidebar.ts`，该路径不存在）
- **现象**：sidebar 只有 `仪表盘 / 咨询与会话 / 客户 / 案件 / 资料中心 / 收费与财务 / 系统设置`，对应路由 `/`/`/leads`/`/customers`/`/cases`/`/documents`/`/billing`/`/settings`；`/#/tasks` 已注册但只能从 dashboard CTA 进入，对新员工不可发现。
- **状态**：**已修**。`packages/admin/src/shell/nav-config.ts` `business` 分组已包含 `{ key: "tasks", label: "任务与提醒", to: "/tasks", icon: "clipboard" }`；三语 i18n（`shell.nav.items.tasks`）补齐为 `任务与提醒 / タスク・リマインド / Tasks & reminders`；现有单测已锁定该入口（`src/shell/nav-config.test.ts` → `includes the tasks route in the business navigation`，`src/shell/SideNav.test.ts` → `renders the tasks entry in the side navigation`、`marks tasks nav item as active on /tasks`，44 用例全部通过）。
- **遗留**：BUG-086 本体（`/#/tasks` 页面仍是 placeholder「建设中」）未在本轮修复，仍待正式实现 reminders/tasks 列表与到期排序。

---

## 4. 第三轮 Bug 修复状态对照

> **2026-04-29 18:30 重核**：表格仍按第四轮当时的快照保留；下方「不可测」行的实际状态请以第五轮 (`11-...md` §4) 的重核结论为准 —— `/api/cases` 全 500 已通过迁移补齐 + 启动期门禁解封（见 BUG-083 状态），原本被链式阻塞的 BUG-063 / 067 / 070 / 071 / 072 / 081 等均已重新可测且大部分修复。

| 第三轮 ID | 类别 | 第四轮状态 | 备注 |
|---|---|---|---|
| BUG-062 状态机 20 状态缺失 | P0 | **未修** | UI / API 仍是 S1-S9 |
| BUG-063 transition 任意跳跃 | P0 | **不可测** | 被 BUG-083 链式阻塞，但 timeline 仍能查到 round 3 残留事件 `{from:S2,to:S9}` |
| BUG-064 case aggregate 500 | P0 | **扩大** | 现 `/api/cases` 全部读路径都 500（BUG-083）|
| BUG-065 模板只 3 个 | P0 | **已修** | 现 10 个模板，覆盖 `family / eng_humanities_intl_*  / biz_mgmt_cert_4m / biz_mgmt_cert_1y / biz_mgmt_renewal / company_setup / intra_company_transfer` 全部 7 场景 |
| BUG-066 资料清单 8-9 项 | P0 | **已修** | 经营管理 1 年模板已 ~22 项；4M 模板 ~17 项；新增「办公场地与在留证明」「公司法定材料」等分组 |
| BUG-067 reminderCreated:false | P0 | **不可测** | `/api/residence-periods` 全部 500（BUG-085）|
| BUG-068 日期偏 1 天 | P0 | **不可测** | 同上 |
| BUG-069 客户缺 location/source/visa | P0 | **已修** | 客户详情已暴露「所在地 / 来源渠道 / 签证类型 / 介绍人姓名」字段（详见 BUG-093 衍生新问题）|
| BUG-070 stage 列展示 S 码 | P1 | 不可测 | 列表 500 |
| BUG-071 owner 列显示 UUID | P1 | 不可测 | 同上；客户列表新表现：`owner.name=""` 全空（BUG-089）|
| BUG-072 risk 列展示 `low` | P1 | 不可测 | 列表 500 |
| BUG-073 case# 用 UUID | P1 | **未修 + 扩大** | 客户「编号」字段也是 UUID（BUG-088）|
| BUG-074 Time 列首字 T 被截 | P1 | **未修** | 根因定位为 BUG-087：API 时间戳全用 `Date.toString()` |
| BUG-075/076 客户摘要 ISO + Type 用 caseTypeCode | P1 | 不可测 | 客户摘要"最近建案"已格式化为 `2026/04/28 13:43`（部分修复）|
| BUG-077 Step 2 客户下拉混 fixture | P1 | **部分修 + 反向 regression** | fixture 已移除，但 `?customerId=` 预选也被一起拆（BUG-092）|
| BUG-078 i18n 章节标题写死中文 | P1 | 部分修 | 本轮主跑 zh-CN locale 未深查 |
| BUG-079 Document Center fixture | P2 | **⚠️ 部分修（18:33 增量）** | `views/documents/model/DocumentRepository.ts` + `useDocumentListModel.ts` 已新增并接入 `/api/document-items + /api/cases?view=summary`；空数组或失败时回退 `SAMPLE_DOCUMENTS` 并 `errorCode` 显式提示。后端 seed 数据齐全后即可走真实链路（截图 `screens/29-document-center-still-fixture.png` 为 18:30 前的状态）|
| BUG-080 `?tab=communications` 不识别 | P2 | 未修 | 与 BUG-090 同源 |
| BUG-081 `/#/cases?stage=S8` URL 不消费 | P2 | 不可测 | 列表 500 |
| BUG-082 Avatar 按钮中文「未选择任何文件」 | P2 | 未修 | 仍可见 `uid=6_93 button "写真 / 头像" value="未选择任何文件"` |

---

## 5. 业务流 ↔ 第四轮可达性矩阵

> **2026-04-29 18:30 重核**：本表保留第四轮当时的可达性快照；最新可达性（应用迁移、新增 phase-transition、reminders NOT NULL 修复后）请见第五轮 §5。Step 7-12 / 13 / 19 已恢复可达，Step 16-18 部分操作字段还在补；Step 20 在第五轮通过 BUG-096 修复 reminders INSERT 后已可端到端跑通。

| 业务节点 | 第三轮可达性 | 第四轮可达性 | 关键 Blocker |
|---|---|---|---|
| Step 1 创建客户 | ✅ | ✅ | — |
| Step 2 基础信息（location/source/visa） | ❌ | ✅ | BUG-069 修复；新衍生 BUG-093 |
| Step 3-5 BMV intake → 报价 → 签约 | ⚠️ | ⚠️ | round 2 BUG-039 仍未修复 |
| Step 6 发资料清单（按 7 场景模板） | ❌ | ✅ | BUG-065/066 修复 |
| Step 7-12 资料 → 制作 → 提交入管 | ⚠️ | ❌ | BUG-083/084 全 500 |
| Step 13 入管反馈（APPROVED/REJECTED/NEED_SUPPLEMENT） | ❌ | ❌ | BUG-062 状态机仍缺；BUG-083 阻塞 |
| Step 14 补资料循环 | ❌ | ❌ | 同上 |
| Step 15 收尾款 | ❌ | ❌ | 状态机 + 案件读 双阻塞 |
| Step 16 发 COE | ❌ | ❌ | 同上 |
| Step 17 海外返签 | ❌ | ❌ | 同上 |
| Step 18 入境结果 SUCCESS / VISA_REJECTED | ❌ | ❌ | 同上 |
| Step 19 记录在留期间 | ⚠️ | ❌ | BUG-085 |
| Step 20 续签提醒任务 | ❌ | ❌ | BUG-085 + BUG-086（页面仍为 placeholder；侧栏入口已由 BUG-095 修复）|

> 第四轮整体：**Step 7~20 全部不可达**（第三轮至少 Step 7-12 能用 `transition` 强行推进；本轮直接断电）

---

## 6. 复现资产（更新版）

### 6.1 准备 token

```bash
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.test","password":"Admin123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
```

### 6.2 验证 BUG-083 / BUG-084 / BUG-085

```bash
# A. cases 列表全 scope 500
for SCOPE in mine group all; do
  curl -s -o /dev/null \
    -w "GET /api/cases?scope=${SCOPE} -> %{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    "http://localhost:5173/api/cases?scope=$SCOPE&page=1&limit=20&view=summary"
done

# B. 单 case + aggregate 500
CASE=cbdd7cf6-ce5e-4696-823c-4e502c88c1dd
curl -s -o /dev/null -w "GET /api/cases/$CASE -> %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/cases/$CASE"
curl -s -o /dev/null -w "GET /api/cases/$CASE/aggregate -> %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/cases/$CASE/aggregate"

# C. POST /api/cases 全 500（哪怕参数完全合法）
CUST=97f1c48d-7f21-4a83-aed1-9728ebef59ec
OWNER=00000000-0000-4000-8000-000000000011
curl -s -o /dev/null -w "POST /api/cases (legal) -> %{http_code}\n" \
  -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"customerId\":\"$CUST\",\"caseTypeCode\":\"biz_mgmt\",\"ownerUserId\":\"$OWNER\",\"caseName\":\"R4 probe\",\"stage\":\"S1\"}" \
  "http://localhost:5173/api/cases"

# D. residence-periods 全 500（链式失败）
curl -s -o /dev/null -w "GET /api/residence-periods -> %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5173/api/residence-periods?caseId=$CASE"
```

### 6.3 验证 BUG-087（Date.toString 序列化）

```bash
curl -s -H "Authorization: Bearer $TOKEN" 'http://localhost:5173/api/groups' | python3 -m json.tool
# "createdAt": "Mon Apr 27 2026 20:40:49 GMT+0900 (Japan Standard Time)"

curl -s -H "Authorization: Bearer $TOKEN" 'http://localhost:5173/api/feature-flags' | python3 -m json.tool
# "createdAt": "Mon Apr 27 2026 15:06:26 GMT+0900 (Japan Standard Time)"

curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5173/api/timeline?customerId=$CUST" | python3 -m json.tool | head -10
# "createdAt": "Wed Apr 29 2026 ... GMT+0900 (Japan Standard Time)"

curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5173/api/customers/$CUST" | python3 -m json.tool | grep Date
# "lastCaseCreatedDate": "2026-04-28T04:43:10.399Z"   ← 同系统两套规范并存
```

### 6.4 验证 BUG-088（customerNumber=UUID）

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5173/api/customers/$CUST" | python3 -m json.tool | grep -E '"id"|customerNumber'
# "id": "97f1c48d-7f21-4a83-aed1-9728ebef59ec",
# "customerNumber": "97f1c48d-7f21-4a83-aed1-9728ebef59ec"
```

### 6.5 验证 BUG-086（任务与提醒页 stub）

```bash
# 浏览器走法
open 'http://localhost:5173/#/tasks'
# 看到的内容：
#   任务与提醒（建设中）
#   当前路径 /tasks
```

---

## 7. 仍未覆盖（建议下一轮走查）

> **2026-04-29 18:30 重核**：本节以「第四轮当时的建议」原貌保留；下方括注本轮重核结论。

- **修复 BUG-083 后立即重测 BUG-062 / BUG-063 / BUG-067 / BUG-068**：状态机 20 状态、transition 顺序守卫、reminder 自动派生、日期时区偏移；这是本轮被链式阻塞的全部 P0。
  - **重核**：第五轮已重测：BUG-062 / 063 / 064 / 068 ✅；BUG-067 拆为第五轮 BUG-096（reminders INSERT NOT NULL）已修；详见 `11-...md` §4。
- **`/#/tasks` 任务与提醒页正式实现**：把 reminders / tasks 两套数据源（不同 API、不同语义）的列表/筛选/到期排序一起做掉（侧边栏入口已由 BUG-095 接入，仅缺页面本体）。
  - **重核**：本条已落地（BUG-086 状态），仍需端到端 UI 复测（特别是 reminders 列在续签链路修好后的真实展示）。
- **timestamp serializer 全局补丁后**：抽 50 个不同 endpoint 做一轮 schema diff，确认所有 `*At / *Date` 字段都是 ISO 8601 + 时区。
  - **重核**：仍待执行；`infra/utils/timestamps.ts` 已抽出但 `feature-flags / billing` 等 endpoint 仍输出 `Date.toString()`（BUG-087 状态）。
- **客户编号生成器**：`CUS-YYYYMM-NNNN` 这种短码生成 + 唯一性约束 + 客户列表/详情列展示。
  - **重核**：服务端已落地（BUG-088 状态：`customers.numbering.ts` + 迁移 033）；列表 / 详情列展示需端到端 UI 复测。
- **owner / group 分配链路**：客户/案件创建时若未指定 owner，自动落到当前登录人；否则要求显式选择。修了之后 dashboard `scope=mine` 才有数据。
  - **重核**：客户列表读路径已修（BUG-089 状态：`buildOwnerNameExpr` / `buildGroupNameExpr` JOIN）；建客户/建案件时的「自动落到当前登录人」默认值策略仍待补。
- **i18n 完整覆盖**：en-US 和 ja-JP 跑一遍全部页面（本轮主测 zh-CN）。
  - **重核**：仍待执行。

---

## 附录 A — 第四轮新增截图

| 文件 | 描述 |
|---|---|
| `screens/23-dashboard-mine-empty.png` | Dashboard scope=mine：4 张概览卡 + 4 个面板全 0；CTA 中包含失效的「查看我的待办」 |
| `screens/24-cases-list-load-failed.png` | `/#/cases` 列表 — 「我的案件 · 共 0 条案件」+ alert "加载案件失败" |
| `screens/25-customers-all-uuid-as-customer-no.png` | `/#/customers` 全所 — 4 位真实客户，编号列展示 UUID，owner/group 全空 |
| `screens/26-customer-detail-new-fields-but-empty.png` | 客户详情 — 新字段 location/sourceType/visaType/referrerName 全部到位但空值；介绍人字段重复 |
| `screens/27-case-create-step2-keiei-4m-checklist-expanded.png` | 经营管理 4M 模板 Step 2 — 资料清单从 9 项扩到 ~17 项 |
| `screens/28-case-create-step2-keiei-1y-customer-not-found.png` | 经营管理 1Y 模板 Step 2 — 「未找到客户」（即便 URL 携带 customerId）|
| `screens/29-document-center-still-fixture.png` | Document Center — 12 条全是 A2026-001/002/003 日文 fixture |
| `screens/30-tasks-page-stub.png` | `/#/tasks` 任务与提醒页 placeholder「建设中」 |
| `screens/31-settings-groups-raw-datestring.png` | Settings → Group 管理 — 创建时间列直接渲染 `Date.toString()` |
| `screens/32-settings-local-doc-root-still-empty.png` | Settings → 本地资料根目录 — 仍提示「根目录未配置」 |

---

## 附录 B — 第三轮 BUG vs 第四轮速查表

> **2026-04-29 18:33 二次重核**：BUG-074 / BUG-079 已分别因 BUG-087 / DocumentRepository 的落地由「未修」迁出，下表已同步刷新。

| 状态 | 数量 | 第三轮 ID |
|---|---|---|
| ✅ 已修 | 3 | BUG-065、BUG-066、BUG-069 |
| ⚠️ 部分修 / 衍生新问题 | 4 | BUG-077（→ BUG-092）、BUG-075/076（→ 部分）、BUG-074（→ BUG-087 18:33 已修）、BUG-079（→ DocumentRepository 18:33 接通） |
| ❌ 未修（同症状） | 4 | BUG-062、BUG-070、BUG-072、BUG-082 |
| 🔥 扩大恶化 | 2 | BUG-064（→ BUG-083 全链路）、BUG-073（→ BUG-088 客户也用 UUID）|
| 🚫 不可测（被 P0 链式阻塞） | 8 | BUG-063、BUG-067、BUG-068、BUG-071、BUG-081 等 |

---

## 附录 C — 第四轮 BUG 重核速查表

### C.1 二次重核（2026-04-29 18:33，最新）

| 状态 | 数量 | 第四轮 ID |
|---|---|---|
| ✅ 已修（含「待端到端复测」） | **13** | BUG-083、BUG-084、BUG-085、BUG-086、BUG-087、BUG-088、BUG-089、BUG-090、BUG-091、BUG-092、BUG-093、BUG-094、BUG-095（其中 BUG-086 / 088 / 089 / 090 待 UI 端到端复测，代码已落地） |
| ⚠️ 部分已修 | 0 | — |
| ❌ 仍未修 | 0 | — |

> 总计 13 条全部 ✅（与 §0.4 总账一一对应）。
>
> 跨轮残留：第三轮 **BUG-079（Document Center）** 由「未修」更新为「⚠️ 部分修」（详见 §4 对照表），不计入第四轮 13 条本身。

### C.2 一次重核（2026-04-29 18:30，存档）

| 状态 | 数量 | 第四轮 ID |
|---|---|---|
| ✅ 已修（含「待端到端复测」） | 10 | BUG-083、BUG-084、BUG-085、BUG-086、BUG-088、BUG-089、BUG-090、BUG-092、BUG-094、BUG-095 |
| ⚠️ 部分已修 | 2 | BUG-087（feature-flags / billing 等 endpoint 仍 `Date.toString()`）、BUG-091（i18n 已修订，待端到端走查） |
| ❌ 仍未修 | 1 | BUG-093（建客户 modal 仍并存 referrer + referrerName，类型未合并） |

> 18:30 → 18:33 增量收口：BUG-087（feature-flags 切到 `toIsoTimestampString`）、BUG-091（流水 tab 状态过滤器拆 `statusFilterContext` + i18n `recordStatusAll/AriaLabel` 三语补齐）、BUG-093（modal 删除 legacy `referrer` + 类型同步 + 专用测试）。

### C.3 修复链路速记

- `npm run db:migrate` 应用 031 / 032 + `assertAllMigrationsApplied` 启动期 fail-fast → 解 BUG-083 / 084 / 085 / 067 / 070~072 / 081 全链。
- `views/tasks/*` + `useTaskWorkbenchModel` → 解 BUG-086（页面本体）+ 配合 BUG-095（侧栏入口）。
- `infra/utils/timestamps.ts#toIsoTimestampString`（18:30 应用主链路 + 18:33 收口 `feature-flags`；`billing` 模块本就用 `toISOString`） → 解 BUG-087。
- `customers.numbering.ts` + 迁移 033 → 解 BUG-088。
- `customers.query.ts#buildOwnerNameExpr / buildGroupNameExpr` → 解 BUG-089。
- `views/settings/query.ts` + `useSettingsPage` → 解 BUG-090。
- `BillingListView.vue` `statusFilterContext` 计算属性 + `BillingFilters.vue` `statusAllKey/AriaLabelKey` props + i18n `billing.list.filters.recordStatus*` 三语 → 解 BUG-091。
- `views/cases/model/useCreateCaseModelPreselect.ts` → 解 BUG-092。
- `CustomerCreateModal.vue` 删除 legacy `referrer` + `types-customer-fields.ts` 类型合并 + `CustomerCreateModal.bug093.test.ts` → 解 BUG-093。
- `shared/model/useVisaTypeOptions.ts`（11 个 canonical 码） → 解 BUG-094。
- `nav-config.ts` `business` 分组 + i18n `shell.nav.items.tasks` → 解 BUG-095。
- `views/documents/model/DocumentRepository.ts` + `useDocumentListModel.ts` → 解 BUG-079（部分修，跨轮残留）。

