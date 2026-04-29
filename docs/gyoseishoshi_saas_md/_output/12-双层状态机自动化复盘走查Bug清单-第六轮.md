# 客户/案件模块（admin）— 双层状态机自动化复盘走查 Bug 清单（第六轮）

> 生成日期：2026-04-29 19:50（JST）
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/11-双层状态机端到端走查Bug清单-第五轮.md`（BUG-096~107 修复声明）
> - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md`（业务规则）
> - `docs/gyoseishoshi_saas_md/_output/10-双层状态机映射.md`（businessPhase 20 状态、phase 转换图、4 类 gate）
>
> 走查工具：`curl`（HTTP API）+ `psql`（DB 直查 + schema 校验）+ 代码审查
> 走查环境：`http://localhost:5173/api`，本地 admin（`admin@local.test` / `Admin123!`）；后端 NestJS `:3300`，Vite 反代 `:5173`，PostgreSQL `cms-client-postgres-1` `:5433`
> 与第五轮 (`11-...md`) 互为续篇；本轮编号自 BUG-108 起。
> 注：本轮 chrome-devtools-mcp 在走查前因 profile lock 异常失联，UI 端走查改为代码审查 + API/DB 直查。

---

## 0. 第六轮总结

### 0.1 关键事件

第五轮宣称的 12 条 Bug（BUG-096~107）**全部已落地代码**且单测通过。本轮在重启后端 + 跑 `npm run db:migrate` 应用 `033_customer_numbers` 后，对核心链路重做端到端复盘，**确认 9 条修复在「正确数据前提下」生效**，但发现 **3 条修复在「真实数据缺失」场景下失效**，并新增 **8 条 Bug**（其中 2 条 P0 schema-mismatch 直接导致 Billing 整页 500）。

### 0.2 走查结果概览

| # | 业务规范节点 | 验证方式 | 结果 |
|---|---|---|---|
| 1 | Phase 20 状态端到端推进 | `POST /:id/phase-transition` × 14 phase | **PASS** — 全合法跳通，CONSULTING → CLOSED_SUCCESS 全流程畅通 |
| 2 | Phase 副作用时间戳 stamping（BUG-098 复盘） | 推完 SUCCESS 后查 `coeSentAt / overseasVisaStartAt / entryConfirmedAt` | **PASS** — 三个时间戳全写入，单调递增 |
| 3 | 补资料循环 supplement_count（BUG-099 复盘） | 跑 2 次 `NEED_SUPPLEMENT ↔ SUPPLEMENT_PROCESSING ↔ UNDER_REVIEW` 循环 | **PASS** — 0 → 1 → 2 正确递增 |
| 4 | 续签提醒派生（BUG-096 复盘） | `POST /api/residence-periods { isCurrent: true }` | **PASS** — `reminderCreated:true`，`/api/reminders` 返回 180/90/30 三档 |
| 5 | CLOSED_SUCCESS gate（BUG-070~096 综合） | RENEWAL_REMINDER_SCHEDULED → CLOSED_SUCCESS | **PASS** — gate 放行，phase 落地 |
| 6 | COE_SENT 尾款 gate（BUG-097 复盘） | A/B 分组：无 billing record vs block-mode billing record | **MIXED**（首测）→ **✅ PASS（同日复测）** — `billingGuards.ts:91-98` 已合并 BUG-111 default-deny；A 组无 billing 现返回 400 `Final payment milestone is missing`；B 组 block billing 仍 400 `unpaid (80000)` |
| 7 | Billing 列表 + 收款记录列表 | `GET /api/billing-plans` / `/api/payment-records` | **FAIL**（首测）→ **✅ PASS（同日复测）** — BUG-108/109 schema-mismatch 已修复，两端点均 HTTP 200 |
| 8 | Customer 列表 owner / group 展示（BUG-089 复盘） | `GET /api/customers` | **MIXED** — 新建 case 走完整路径正确；4 条历史数据 owner/group 全空（→ BUG-115） |
| 9 | customerNumber 业务编号（BUG-088 复盘） | `GET /api/customers` | **PASS** — `CUS-YYYYMM-NNNN` 全部命中 |
| 10 | timestamp 全局 ISO 序列化（BUG-087 复盘） | groups / feature-flags / cases 各端点 | **PASS** — 抽查无 `Date.toString()` 残留 |
| 11 | Tasks 工作台页面（BUG-086 复盘） | `GET /api/tasks` + `views/tasks/TaskListView.vue` | **MIXED** — API 路径通；UI 页面整片硬编码中文（→ BUG-112） |
| 12 | Phase 列表筛选（BUG-103 复盘） | `GET /api/cases?phase=CLOSED_SUCCESS&scope=all` | **PASS** — 后端筛选 + 前端下拉皆已落地 |
| 13 | Timeline payload from/to（BUG-104 复盘） | `GET /api/timeline?entityType=case&entityId=` | **PASS** — payload 含 `from / to / coeSentAt / supplementCount` |
| 14 | Detail aggregate `latestReview` 子查询 | `GET /api/cases/:id/aggregate` server log | **FAIL**（首测）→ **✅ PASS（同日复测）** — aggregate HTTP 200；`latestReview=null` 现为数据原因（无 review 记录），不再触发 `column does not exist` |

### 0.3 第六轮新增 Bug 数

| 优先级 | 数量 | 说明 |
|---|---|---|
| P0 | 2 | Billing/PaymentRecord/CaseDetailAggregate SQL 用了不存在的列名 |
| P1 | 3 | Billing test gap（mockTx 不真跑 SQL） / COE 尾款 gate 在无 billing record 时空挡 / Tasks 页未 i18n |
| P2 | 3 | timeline 静默忽略未识别 query / dashboard 文案中文硬编码 / 历史 customer 缺 backfill |
| **总计** | **8** | — |

### 0.4 三句话结论

1. **第五轮的 12 条修复在 happy path 上全部 PASS**：phase 推进副作用、reminder 派生、CLOSED_SUCCESS gate、列表 phase 筛选、timeline payload、case# / owner / phase 主从展示均已落地；BUG-100 的启动期 `assertAllMigrationsApplied` 工作正常（重启后端后被 hint）；BUG-098/099 的 stamping + 计数 SQL 在事务内一次性完成，端到端跑两轮循环都能稳定生效。
2. **但 Billing 子系统有两条致命 schema-mismatch**：`BillingPlansService.list` 用 `cu.name as customer_name`、`PaymentRecordsService.list` 用 `recorded_user.display_name`、`CasesService.queryLatestReview` 用 `u.display_name`，三处都假设 customers / users 表存在那些列，但现网 customers 表只有 `base_profile JSONB`、users 表只有 `name`。导致 `/api/billing-plans` + `/api/payment-records` 全部 500（admin Billing 列表页直接打不开），`/api/cases/:id/aggregate` 的 `latestReview` 子查询被 `Promise.allSettled` 静默降级为 null。BUG-091 的 i18n 修复因此实际不可被验证。
3. **BUG-097 的尾款 gate「修了等于没修」**：`runCoeSendBillingGate` 仅在 case 已有「milestone_name 含『尾款/final/結果』+ gate_effect_mode≠'off'」的 billing_record 时才会触发。本轮 admin UI 没有任何入口创建 billing plan（页面 500），所以走 happy path 创建的 case 永远没有 billing record → gate 永远 pass → 用户从 admin 创建的 case 仍然能"未结清尾款 → COE_SENT → CLOSED_SUCCESS"一路放行。需要补「无 billing plan 时拒绝进入 WAITING_PAYMENT」或「自动创建 default 尾款 milestone」的 gate fallback。
4. **同日复测追加（2026-04-29 二次走查）**：第五轮 12 条 (BUG-096~107) 重测全部 PASS（12/12），其中 BUG-097 因 `billingGuards.ts#checkFinalPaymentGuard` 已并入 BUG-111 default-deny（`reason: 'no_plan'` → "Final payment milestone is missing"），从首测的 ⚠️ MIXED 升级为 ✅ PASS；R6 §1 新增的 P0 schema-mismatch（BUG-108/109）也已修复，`/api/billing-plans`、`/api/payment-records`、`/api/cases/:id/aggregate` 全部回到 HTTP 200。结论：第五轮宣称的"仍未修=0"在二次复测下完全成立。

---

## 1. P0 — Billing 子系统 schema-mismatch（admin 业务度量崩溃）

### BUG-108 [P0][API] `/api/billing-plans` + Billing 子系统 SQL 用 `customers.name`，但 customers 表无 `name` 列 → 全部 500

- **位置**：
  - `packages/server/src/modules/core/billing/billingPlans.service.ts:74-78`（`BILLING_PLAN_LIST_COLS`：`cu.name as customer_name`）
  - `packages/server/src/modules/core/billing/billingPlans.service.ts:118`（搜索 `q` 时 `lower(cu.name) like ...`）
  - `packages/server/src/modules/core/billing/billingSummary.service.ts:129`（同样 `lower(cu.name)`）
  - `packages/server/src/modules/core/billing/paymentRecordHelpers.ts:100`（PaymentRecord list 的 search clause）
- **现象**：
  ```bash
  TOKEN=$(curl ... auth/login | jq -r .token)
  curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" \
    "http://localhost:5173/api/billing-plans"
  # → 500
  curl ... /api/billing-plans?caseId=73057a52-e52e-4b9d-8f1f-5cd097f1a1aa
  # → 500
  ```
- **后端日志**：

  ```text
  [Nest] ERROR [ExceptionsHandler] error: column cu.name does not exist
    at /Users/ck/workplace/cms-client/node_modules/pg/lib/client.js:631:17
    at async BillingPlansService.list (.../billingPlans.service.ts:306:20)
    code: '42703', file: 'parse_relation.c', routine: 'errorMissingColumn'
  ```

- **DB 验证**：

  ```bash
  $ docker exec ... psql -d cms -c "\d customers"
  # 列：id, org_id, type, base_profile (jsonb), contacts, created_at, updated_at
  # 没有 name 列；customer 显示名字段在 base_profile->>'displayName' / base_profile->>'name_cn' 等
  ```

- **影响**：
  - admin Billing 列表页 (`/#/billing`) 直接 500（fixture 兜底失效）
  - 第五轮 BUG-091「Billing 简繁混杂」i18n 修复完全无法验证（页面打不开）
  - 第五轮 BUG-097「COE_SENT 尾款 gate」也间接失效——admin 没有 UI 创建 billing plan，所以 case 永远不会走到 gate（详见 BUG-111）
- **建议修复**：在 `BILLING_PLAN_LIST_COLS` 把 `cu.name as customer_name` 改为 `coalesce(cu.base_profile->>'displayName', cu.base_profile->>'name_cn', cu.base_profile->>'name_en', cu.base_profile->>'name_jp', '') as customer_name`；search clause 同步把 `lower(cu.name)` 改成对 `base_profile->>'displayName'` / `name_cn` 等字段的 like。建议抽出 `customerDisplayNameExpr(alias)` helper 复用，避免再现。
- **测试 gap**：现存 `billingPlans.service.list.test.ts:199` 用 `mockTx` 校验 `cnt.sql.includes("lower(cu.name) like")` —— 单测只断言 SQL 文本，从不真跑 PG，所以 schema 漂移完全测不出来。需要补 `billingPlans.schema-compatibility.test.ts`，与 `residencePeriods.schema-compatibility.test.ts`（BUG-096 引入）等价的真 PG 校验。

### BUG-109 [P0][API] `users.display_name` 列不存在 → `/api/payment-records` 500、`getDetailAggregate.latestReview` 静默丢失

- **位置**：
  - `packages/server/src/modules/core/billing/paymentRecordHelpers.ts:38-39`（`PAYMENT_RECORD_LIST_COLS`：`recorded_user.display_name as recorded_by_display_name, voided_user.display_name as voided_by_display_name`）
  - `packages/server/src/modules/core/cases/cases.service.ts:1069`（`queryLatestReview`：`u.display_name as reviewer_display_name`）
- **DB 验证**：

  ```bash
  $ docker exec ... psql -d cms -c "select column_name from information_schema.columns where table_name='users' order by 1"
  # created_at, email, id, name, org_id, password_hash, role, status, updated_at
  # 没有 display_name 列；用户名在 users.name
  ```

- **现象**：

  - `/api/payment-records` 500：

    ```text
    [Nest] ERROR error: column recorded_user.display_name does not exist
      at async PaymentRecordsService.list (.../paymentRecords.service.ts:224:20)
    ```

  - `/api/cases/:id/aggregate` 200，但 server log：

    ```text
    [CasesService.getDetailAggregate] sub-query "latestReview" failed for case 73057a52-e52e-4b9d-8f1f-5cd097f1a1aa: column u.display_name does not exist
    ```

    `Promise.allSettled` 把它降级为 `latestReview: null`（`cases.service.ts:1789`），admin 详情页"最新审查决定"区域永远空。
- **影响**：
  - 第五轮 BUG-064 引入的 `Promise.allSettled` 降级是双刃剑：避免了整个详情 500，但**让真实 schema bug 静默失败**，运维/CI 无法察觉。需要在降级路径上挂个 `metrics.increment('case.detail_aggregate.subquery_failed', { name })`，或者至少把 server-side 错误日志升级为 ERROR 级别并接监控。
  - admin 详情页"最新审查决定"chip 长期为空、但用户感觉不到，因为没有报错。
- **建议修复**：把 3 处 `display_name` 全部改为 `name`，并补充 `users.schema-compatibility.test.ts` 把所有 server-side SQL 跑一遍真 PG。
- **关联**：与 BUG-108 同源（billing 模块 schema 漂移），但本条牵连到 cases 模块的 detail aggregate，影响面更广。

---

## 2. P1 — 修复路径有效但场景失效 / 体验严重缺失

### BUG-110 [P1][Test] Billing/users 模块单测 100% 用 mockTx，schema-mismatch 完全测不出来

- **位置**：
  - `packages/server/src/modules/core/billing/billingPlans.service.list.test.ts:199`：`assert.ok(cnt.sql.includes("lower(cu.name) like"))` — 字符串断言
  - `packages/server/src/modules/core/billing/paymentRecords.service.list.test.ts:284`：同上
  - `packages/server/src/modules/core/billing/billingSummary.service.test.ts:192`：同上
- **现象**：本轮发现的 BUG-108 / BUG-109 在 server 仓库 `npm run guard` 里全部"绿色"，因为 mockTx 不会真去 PG 执行 SQL，单测只断言"我的 SQL 字符串里包含某关键字"。
- **影响**：任何 schema 漂移（列重命名、表拆 JSONB、迁移落后）都不会被 CI 拦住，必然在生产/dev e2e 跑起来才暴露 500。第五轮 BUG-100 的启动期 `assertAllMigrationsApplied` 只校验"迁移应用了"，不校验"代码里的 SQL 跟当前 schema 兼容"。
- **建议修复**：
  1. 引入 `tests/integration-pg/`：每个 module 至少一个 `*.schema-compatibility.test.ts`，连真 PG（docker compose 启动 cms-postgres-test）跑出每个 list/insert/update SQL 一次，确保不抛 `column does not exist`。
  2. `package.json` 加 `test:pg-compat` script，并把它纳入 `npm run guard`。
  3. 备选低成本方案：写一个 `assertSchemaColumns(table, columnList)` 启动期断言，server 启动时校验 `customers.base_profile`、`users.name`、`reminders.entity_type` 等关键列存在，不存在直接 fail-fast。
- **历史相似教训**：BUG-096（reminders 缺 NOT NULL 列）、BUG-100（migration 落后）、BUG-108/109（列名漂移）三条 P0 都是同根：**单测层无 schema 校验**。

### BUG-111 [P1][API] `runCoeSendBillingGate` 在 case 没有 billing record 时直接 pass，admin happy path 仍能"未结清尾款 → CLOSED_SUCCESS"

- **位置**：
  - `packages/server/src/modules/core/billing/billingGuards.ts:72-90`（`checkFinalPaymentGuard`：`result.rows.length === 0 → return null`）
  - `packages/server/src/modules/core/cases/cases.types-final-payment.ts:260-262`（`decideFinalPaymentGuard`：`guardResult === null → decision: pass`）
- **现象**：
  - **A 组**（无 billing record）：

    ```bash
    # 跑完整 happy path，全程不创建 billing plan
    CASE=73057a52-...
    for TO in CONTRACTED ... APPROVED WAITING_PAYMENT COE_SENT VISA_APPLYING SUCCESS RESIDENCE_PERIOD_RECORDED RENEWAL_REMINDER_SCHEDULED CLOSED_SUCCESS; do
      curl ... /api/cases/$CASE/phase-transition -d "{\"toPhase\":\"$TO\"}"
    done
    # → 全部 200，CLOSED_SUCCESS 落地，finalPaymentPaidCached=false
    ```

  - **B 组**（已有 block-mode billing plan）：

    ```bash
    # 创建 case + 立刻 POST 一条 milestone_name='尾款' / gateEffectMode='block' 的 billing
    NEW2=2f37c5ac-...
    curl -X POST .../api/billing-plans \
      -d "{\"caseId\":\"$NEW2\",\"milestoneName\":\"尾款\",\"amountDue\":80000,\"gateEffectMode\":\"block\"}"
    for TO in CONTRACTED ... WAITING_PAYMENT; do ... done
    curl -X POST .../api/cases/$NEW2/phase-transition -d '{"toPhase":"COE_SENT"}'
    # → 400 "CASE_POST_APPROVAL_BILLING_BLOCKED: Final payment is still unpaid (80000)..."
    ```

- **业务规范判定**：`docs/事务所流程/...md` 步骤 16「未结清尾款不得推进到 COE_SENT」是无条件的；`runCoeSendBillingGate` 当前的 default-allow（无 billing record → pass）违反规范。
- **第五轮判定**：BUG-097 标题"COE_SENT 尾款 gate"标记 ✅，但 §4 重核小记没有提到 default-allow 路径；fixture/测试 (`cases.phase-transition-coe-gate.focused.test.ts`) 7 个用例只覆盖"有 billing"路径。
- **影响**：admin 创建的 case（除非用户手动 curl POST /api/billing-plans）永远绕过 gate；BUG-097 的修复理论正确，实战失效。
- **建议修复（任一）**：
  1. **default-deny**：`checkFinalPaymentGuard` 在 `result.rows.length === 0` 时返回 `{ settled: false, unpaid: 0, gateEffectMode: 'block' }`，强制要求所有 case 在 WAITING_PAYMENT → COE_SENT 前必须有 final-payment milestone。
  2. **创建期自动派生**：case 创建时根据 `caseTypeCode` 自动生成「定金 + 尾款」两条 billing milestone（fixture/seed 模板）。
  3. **API 入口闭环**：`POST /api/cases/:id/phase-transition` 收到 `toPhase=WAITING_PAYMENT` 时检查 case 是否已有 final 类 billing；没有则 400 提示"请先在收费 tab 创建尾款收费节点"。
- **关联**：BUG-108 让 admin 列表打不开，导致用户哪怕"想"为 case 建尾款 plan 也没有 UI 入口；两 bug 修任一即可缓解，但应该同时修。

### BUG-112 [P1][FE] `views/tasks/TaskListView.vue` 整页面硬编码中文，未走 i18n —— BUG-086 修复"形似神不似"

- **位置**：`packages/admin/src/views/tasks/TaskListView.vue`
- **现象**：本轮代码审查整文件后发现，`<template>` 几乎所有可视文案都是中文字面量，与 admin 其他页面（cases / customers / billing / settings 三语 i18n）形成明显分裂：

  | 行号 | 文案 |
  |---|---|
  | L41-44 | `待处理任务 / 统一查看 pending / in_progress 任务。` |
  | L46-49 | `今日到期 / 优先清掉今天必须收口的动作。` |
  | L51-54 | `已逾期 / 把已超期的催办与补件先拉出来。` |
  | L57-60 | `提醒日志 / 核对续签提醒是否已生成并进入提醒队列。` |
  | L66-71 | `panelTitle = "今日到期任务" / "已逾期任务" / "提醒日志" / "待处理任务"` |
  | L73-78 | `panelCountLabel = "显示 N / M 条"` |
  | L90 | `subtitle="查看任务池与续签提醒日志，承接 Dashboard CTA 与 Step 19-20 的工作面。"` |
  | L103 | `刷新` 按钮 |
  | L123 | `加载异常` 卡片标题 |
  | L126 | `重新加载` 按钮 |
  | L140 | `加载中…` |
  | L146-149 | 表头 `提醒内容 / 提醒时间 / 状态 / 附加信息` |
  | L176-178 | 空状态 `当前没有提醒日志。等续签提醒生成后...` |
  | L188-193 | 表头 `任务 / 案件 / 责任人 / 截止时间 / 状态 / 优先级 / 操作` |
  | L210-211 | `未指派` 兜底文案 |
  | L228 | `标记完成` 按钮 |
  | L234 | 空状态 `当前视图没有命中的任务。可以切换到"提醒日志"...` |

- **影响**：
  - 日语用户（行政书士事务所主用户）打开 `/#/tasks` 看到全中文，与 cases / customers / settings 中文/日文/英文三语切换体验断裂。
  - 第五轮 BUG-086 总账标记"已修，待端到端复测"——本轮复测发现 i18n 完全没做，是「硬编码中文」级别的临时实装。
- **建议修复**：参照 `views/cases/CaseListView.vue` 的 i18n 模式：
  1. 新建 `i18n/messages/tasks/{zh-CN,ja-JP,en-US}.ts`，把上表所有文案抽成 i18n key（`tasks.workbench.cards.pending.title` / `tasks.workbench.table.headers.task` / `tasks.workbench.empty.tasks` 等）。
  2. 在 `i18n/messages/{zh-CN,ja-JP,en-US}.ts` 顶层 import 并合并到 `tasks` 命名空间。
  3. `TaskListView.vue` 把所有 `"中文字面量"` 替换为 `t("tasks.workbench....")`，把 `viewCards` / `panelTitle` / `panelCountLabel` 改为 computed + `t()`。
  4. 同步 `model/taskWorkbenchViewHelpers.ts` 的 `taskStatusLabel / reminderStatusLabel / priorityLabel`（也是中文硬编码）。
- **优先级**：P1（影响日语用户体验）。

---

## 3. P2 — 体验 / 数据建模一致性

### BUG-113 [P2][API] `/api/timeline?caseId=...` 静默忽略未识别 query 参数，返回组织 wide 全部 timeline（潜在数据范围错觉）

- **位置**：`packages/server/src/modules/core/timeline/timeline.controller.ts:53-83`（`parseTimelineListQuery` 只识别 `entityType / entityId / limit`，未识别参数被 NestJS `@Query()` 静默丢弃）
- **现象**：
  ```bash
  curl ... "/api/timeline?caseId=73057a52-..." | jq '. | length'
  # → 50 （组织内全部 timeline，不限制 caseId）
  curl ... "/api/timeline?entityType=case&entityId=73057a52-..." | jq '. | length'
  # → 12 （正确只返回这一 case 的 timeline）
  ```

  虽然 admin 前端 (`CaseCommsLogsAdapter.ts:418`) 实际用对了 `entityType=case&entityId=...`，但 `?caseId=...` 这种"语义化错误参数"被静默忽略，对集成方/调试者非常迷惑。
- **是否安全问题**：**否**。timeline.service 在 `pushTimelineFilter` 之前已通过 `req.requestContext` 强制了 `org_id` 边界，所以不会跨 org 泄漏，仅是查询范围比预期更大。
- **建议修复**：在 `parseTimelineListQuery` 增加未识别 query 参数检查，遇到 `caseId` / `case_id` / `id` 等"看起来像但不是"的字段时返回 400 "Invalid query parameter: caseId. Did you mean entityType=case&entityId=...?"。
- **优先级**：P2（不会泄漏，但会让前端调试 / 运维误判）。

### BUG-114 [P2][API] `/api/dashboard/summary` 风险面板返回中文硬编码 `statusLabel / action / desc / meta`，UI 拿到无法 locale 化

- **位置**：`packages/server/src/modules/core/dashboard/dashboard.service.ts`（推断；未深读）
- **现象**：
  ```bash
  curl ... "/api/dashboard/summary?scope=mine" | jq '.panels.risks[0]'
  ```

  ```json
  {
    "id": "...",
    "title": "R6 BUG-097 retest",
    "meta": ["负责人：Local Admin", "待收：¥80,000"],
    "desc": "待收金额 ¥80,000，需尽快跟进收费。",
    "statusLabel": "收费风险",
    "action": "查看收费",
    "route": "/billing"
  }
  ```

  所有 UI 文案在 server 端拼好，admin 切到 ja-JP / en-US 时这一面板仍是中文。
- **建议修复**：server 只返回结构化字段（`statusKey: 'billing_risk', actionKey: 'view_billing', metaParams: { ownerName, unpaid }`），由 admin `i18n/messages/dashboard/{zh,ja,en}.ts` 拼出文案。或者最低成本方案：admin 接到 statusLabel/action 字段后通过 `dashboard.statusLabels[serverKey]` 字典回译。
- **关联**：与 BUG-091（Billing 简繁混杂）+ BUG-112（Tasks 页未 i18n）同根问题——admin 的 i18n 边界没有彻底贯穿到 server，server 仍然在某些地方"代笔"做 UI 文案。
- **优先级**：P2（不影响功能，影响日语/英语用户体验）。

### BUG-115 [P2][数据] 历史 4 条 customer 记录 `base_profile` 缺 `displayName / ownerUserId / groupId / visaType / sourceType`，列表展示全空白；BUG-089 修复路径已落地但缺 backfill

- **位置**：`packages/server/src/infra/db/migrations/`（缺 `034_*` backfill 迁移）
- **DB 验证**：

  ```bash
  $ docker exec ... psql -d cms -c "select base_profile->>'displayName' as name, base_profile->>'ownerUserId' as owner, base_profile->>'groupId' as group, base_profile->>'sourceType' as src, base_profile->>'visaType' as visa from customers order by 1"

   name        | owner | group | src      | visa
  -------------+-------+-------+----------+------
   (空)        |       |       | REFERRAL |
   (空)        |       |       |          |
   (空)        |       |       |          |
   Tanaka Taro |       |       |          |
  ```

  4 条历史 customer 中只有 1 条有 `displayName`，全部缺 owner/group/visa/sourceType。
- **现象（API 层）**：

  ```bash
  curl ... "/api/customers" | jq '.items[].owner'
  # {"initials":"","name":""}  ← 4 条历史
  # {"initials":"LA","name":"Local Admin"}  ← 本轮新建的
  ```

- **业务影响**：
  - 第五轮 BUG-089 总账标记"已修，待端到端复测"，但 `customers.query.ts#buildOwnerNameExpr` 的修复 + `customers.row-aggregates.ts#mapCustomerAggregates` 的字段映射只是**让能写入 ownerUserId 的新 case 流程跑通**；4 条历史数据的 base_profile 缺字段，列表展示全空白。
  - admin Customers 列表页用户看到 4 行真实客户全部"无负责人 / 无分组"，但实际上系统能写入这些字段（已通过本轮新建客户验证）。
- **建议修复**：
  1. 写迁移 `034_backfill_customer_owner_group.up.sql`：扫描全部 case，按 `cases.owner_user_id` / `cases.group_id` 反向填到对应 customer 的 `base_profile->'ownerUserId'` / `base_profile->'groupId'`，按 case 创建时间最早一条作为权威源。
  2. 同步在 admin Customers 详情页加"补全档案"提示，对 base_profile 缺字段的客户给出"立即补全"CTA。
- **优先级**：P2（修复路径已生效，仅需 backfill；新数据已正确）。

---

## 4. 第五轮 12 条 Bug 复盘对照表

> 本表只列第五轮 (`11-...md`) BUG-096~107。第三轮 / 第四轮残留项见 `11-...md` §4 表，本轮未单独复盘。

| ID | 优先级 | 第五轮声明 | 本轮验证 | 备注 |
|---|---|---|---|---|
| BUG-096（reminders NOT NULL）| P0 | ✅ 已修 | **✅ PASS** | `POST /api/residence-periods { isCurrent: true }` 回包 `reminderCreated:true`；`/api/reminders?caseId=` 返回 180/90/30 三档 |
| BUG-097（COE_SENT 尾款 gate）| P0 | ✅ 已修 | **⚠️ MIXED → ✅ 同日复测 PASS** | 首测：有 billing 时 400 正确；无 billing 时 pass → 升级为 BUG-111。同日复测：A 组无 billing 现返回 400 `Final payment milestone is missing`，`billingGuards.ts:91-98` 已合并 BUG-111 default-deny（`reason: 'no_plan'`）|
| BUG-098（COE/海外/入境时间戳 stamping）| P0 | ✅ 已修 | **✅ PASS** | 跑完 `APPROVED → ... → SUCCESS` 后三个时间戳依次写入，单调递增 |
| BUG-099（supplement_count 不递增）| P0 | ✅ 已修 | **✅ PASS** | 跑 2 轮 `NEED_SUPPLEMENT ↔ SUPPLEMENT_PROCESSING ↔ UNDER_REVIEW`，count 0 → 1 → 2 |
| BUG-100（部署门禁 / migrations）| P0 | ✅ 已修 | **✅ PASS** | 重启后端时 `assertAllMigrationsApplied` 工作，本轮跑 `npm run db:migrate` 应用 `033_customer_numbers` 后才能正常启动 |
| BUG-101（stage/phase 双 badge 矛盾）| P1 | ✅ 已修 | **✅ PASS（代码层）** | `CaseTableRow.vue` phase 主 chip + stage 元数据；`CaseDetailView.vue` 同款主从布局；UI 端走查因 chrome-devtools 失联未能 take screenshot |
| BUG-102（owner 列展示「未指派」）| P1 | ✅ 已修 | **✅ PASS** | `useOwnerOptions.ts` `buildOwnerOptionFromDisplayName` + `CaseTableRow.vue` fixture-fallback-displayName 链路完整 |
| BUG-103（列表 phase 筛选 UI）| P1 | ✅ 已修 | **✅ PASS** | `CaseFilters.vue:129-144` 渲染 20 个 BUSINESS_PHASES；`/api/cases?phase=CLOSED_SUCCESS` 返回正确（本轮验证 total=2）|
| BUG-104（timeline payload from/to）| P1 | ✅ 已修 | **✅ PASS** | `payload.from / to / coeSentAt / overseasVisaStartAt / entryConfirmedAt` 全部含；`CaseCommsLogsAdapter.buildPhaseTransitionMessage` 已落地 |
| BUG-105（`?tab=timeline` 别名）| P1 | ✅ 已修 | **✅ PASS（代码层）** | `query.ts#CASE_DETAIL_TAB_ALIASES` + `CaseDetailView.vue` watch route.query.tab → router.replace 已落地 |
| BUG-106（详情面包屑 UUID）| P2 | ✅ 已修 | **✅ PASS（代码层）** | `caseIdentity.ts#formatCaseIdentity` + `CaseDetailView.vue` 已切换 |
| BUG-107（case timeline 时间戳）| P2 | ✅ 已修 | **✅ PASS（代码层）** | `CaseLogTab.vue#formatEntryTime` 用 `formatDateTime(raw, locale)` 兜底 |

### 4.1 重核小记

- **首测（2026-04-29 19:50）受质疑的修复**：仅 1 条（BUG-097：default-allow 缺口 → BUG-111）。
- **其余 11 条**：在首测条件下全部 PASS（其中 BUG-101/102/105/106/107 因 chrome-devtools-mcp 不可用未做 UI 端 screenshot 复盘，但代码路径完整，单测齐全）。
- **同日复测（2026-04-29 二次）**：12 条全部 PASS。BUG-097 因 `billingGuards.ts#checkFinalPaymentGuard` 已合并 BUG-111 default-deny（无 billing record 时返回 `reason: 'no_plan'`），首测的 ⚠️ MIXED 升级为 ✅ PASS。
- **第五轮总账："仍未修=0"** 在同日复测下完全成立。

---

## 5. 业务流 ↔ 第六轮可达性矩阵

| 业务节点 | 业务 phase | 第五轮可达性 | 第六轮可达性 | 关键 Blocker |
|---|---|---|---|---|
| Step 1-15 创建/资料/审/收尾款 | CONSULTING ~ WAITING_PAYMENT | ✅ | ✅ | — |
| Step 16 发 COE | WAITING_PAYMENT → COE_SENT | ⚠️ | **⚠️ default-allow** | BUG-111：无 billing record 时 gate 失效；有 billing record + block 时正常拦截 |
| Step 17-18 海外返签 / 结果 | COE_SENT → VISA_APPLYING → SUCCESS | ⚠️ stamping 缺 | ✅ | BUG-098 已修 |
| Step 19 记录在留期间 | SUCCESS → RESIDENCE_PERIOD_RECORDED | ⚠️ | ✅ | service 现可推 |
| Step 20 续签提醒 → 结案 | RESIDENCE_PERIOD_RECORDED → RENEWAL_REMINDER_SCHEDULED → CLOSED_SUCCESS | ❌ reminder 失败 | ✅ | BUG-096 已修，gate 正确放行 |
| Billing 子系统（admin 列表 / 收款记录） | — | （未走查）| **❌ 全 500** | BUG-108 / 109 schema-mismatch |
| Tasks 工作台 | — | ⚠️ stub | **⚠️ 未 i18n** | BUG-112 |

> 第六轮整体：**双层状态机 phase 推进端到端可达**（含 Step 1-15 + Step 17-20）；**Step 16 仅有 billing plan 时强一致**；**Billing 子系统列表整片崩溃**。

---

## 6. 复现资产

### 6.1 准备（一次性）

```bash
cd packages/server && npm run db:migrate
# applied: 033_customer_numbers (本轮发现已是最新)
npm run dev   # 后端 :3300

TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.test","password":"Admin123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
echo "$TOKEN" > /tmp/cms_r6_token.txt
```

### 6.2 验证 BUG-108（Billing 列表 500 / customers.name 列不存在）

```bash
TOKEN=$(cat /tmp/cms_r6_token.txt)
for P in /api/billing-plans /api/payment-records "/api/billing-plans?caseId=$(uuidgen)"; do
  curl -s -o /dev/null -w "$P -> HTTP %{http_code}\n" -H "Authorization: Bearer $TOKEN" \
    "http://localhost:5173$P"
done
# /api/billing-plans -> HTTP 500
# /api/payment-records -> HTTP 500
# /api/billing-plans?caseId=... -> HTTP 500

# DB 直查证实 customers 无 name 列
docker exec -e PGPASSWORD=cms cms-client-postgres-1 \
  psql -U cms -d cms -tAc "select column_name from information_schema.columns where table_name='customers'"
# id / org_id / type / base_profile / contacts / created_at / updated_at
```

### 6.3 验证 BUG-109（users.display_name 列不存在 → latestReview 静默丢失）

```bash
# 必须先有 case，本轮已有 73057a52-...
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5173/api/cases/73057a52-e52e-4b9d-8f1f-5cd097f1a1aa/aggregate" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("latestReview=",d.get("latestReview"))'
# → latestReview= None  （应该是 review 信息，但子查询 SQL 失败被降级为 null）

# server 日志同时看到：
# [CasesService.getDetailAggregate] sub-query "latestReview" failed for case ...:
#   column u.display_name does not exist
```

### 6.4 验证 BUG-111（COE_SENT 尾款 gate default-allow）

```bash
# A 组：无 billing record 直推 COE_SENT
TOKEN=$(cat /tmp/cms_r6_token.txt)
NEW=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"customerId":"825d708f-dec5-443d-b987-63f0a62dae99","caseTypeCode":"biz_mgmt_4m","ownerUserId":"00000000-0000-4000-8000-000000000011","caseName":"BUG-111 A","stage":"S1"}' \
  http://localhost:5173/api/cases | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
for TO in CONTRACTED WAITING_MATERIAL MATERIAL_PREPARING REVIEWING APPLYING UNDER_REVIEW APPROVED WAITING_PAYMENT COE_SENT; do
  curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d "{\"toPhase\":\"$TO\"}" "http://localhost:5173/api/cases/$NEW/phase-transition" >/dev/null
done
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/cases/$NEW" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("phase=",d.get("businessPhase"),"finalPaid=",d.get("finalPaymentPaidCached"))'
# → phase=COE_SENT finalPaid=False  （应该 400 阻止）

# B 组：有 block-mode billing record 时正确拦截
NEW2=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"customerId":"825d708f-dec5-443d-b987-63f0a62dae99","caseTypeCode":"biz_mgmt_4m","ownerUserId":"00000000-0000-4000-8000-000000000011","caseName":"BUG-111 B","stage":"S1"}' \
  http://localhost:5173/api/cases | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"caseId\":\"$NEW2\",\"milestoneName\":\"尾款\",\"amountDue\":80000,\"dueDate\":\"2026-12-31\",\"gateEffectMode\":\"block\"}" \
  http://localhost:5173/api/billing-plans
for TO in CONTRACTED WAITING_MATERIAL MATERIAL_PREPARING REVIEWING APPLYING UNDER_REVIEW APPROVED WAITING_PAYMENT; do
  curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d "{\"toPhase\":\"$TO\"}" "http://localhost:5173/api/cases/$NEW2/phase-transition" >/dev/null
done
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"toPhase":"COE_SENT"}' "http://localhost:5173/api/cases/$NEW2/phase-transition"
# → 400 "CASE_POST_APPROVAL_BILLING_BLOCKED: Final payment is still unpaid (80000)..."
```

### 6.5 验证 BUG-112（Tasks 页未 i18n）

打开 `/Users/ck/workplace/cms-client/packages/admin/src/views/tasks/TaskListView.vue`，搜 `t("` 与中文字面量比例：模板里只在 `PageHeader` 的 `:title` / `:breadcrumbs` 走了 i18n，其余卡片标题/表头/按钮/空状态全是中文字面量。

### 6.6 验证 BUG-115（历史 customer 缺 backfill）

```bash
docker exec -e PGPASSWORD=cms cms-client-postgres-1 \
  psql -U cms -d cms -c "select base_profile->>'customerNumber' as no, base_profile->>'displayName' as name, base_profile->>'ownerUserId' as owner, base_profile->>'groupId' as group from customers order by 1 desc"
#       no       |    name     | owner | group
# CUS-202604-0005 | R6试探客户  | 0000-...0011 | ef21fdd2-...   ← 本轮新建（owner/group 完整）
# CUS-202604-0004 |             |       |               ← 历史数据（owner/group 全空）
# CUS-202604-0003 |             |       |
# CUS-202604-0002 |             |       |
# CUS-202604-0001 | Tanaka Taro |       |
```

---

## 7. 仍未覆盖（建议下一轮走查）

- **stage / phase 终态联动**：本轮推完 phase=CLOSED_SUCCESS 后 stage 仍 S1，BUG-101 的 UI 主从布局缓解了视觉混淆，但数据层"S1=刚开始办案 + CLOSED_SUCCESS=已结案"组合仍可达；建议产品决策：终态 phase 时是否强制 stage→S9（或反之），否则筛选/统计时双轴口径冲突。
- **CLOSED_FAILED 路径**：本轮只跑了 happy path，拒签 → CLOSED_FAILED + closeReason 入参校验 + 部分退款 billing 联动未走查（第三/四/五轮均建议、未做）。
- **Billing UI 修复后端到端**：BUG-108/109 修完后，需要重新跑 BUG-091（i18n）、BUG-097（gate UX）、BUG-111（default-deny）三条联动复测。
- **SubmissionPackage / supplement_count 真相源对账**：BUG-099 修了 phase-only 路径递增 supplement_count，但 `SubmissionPackagesService.create.incrementSupplementCount` 路径与 phase-only 路径在用户混合操作下是否会双计数，本轮未做。
- **Dashboard 数据 + 文案 i18n**：BUG-114 修后，需要切到 ja-JP / en-US 验证全 4 张面板（todo / deadlines / submissions / risks）文案是否都被替换。
- **chrome-devtools-mcp UI 端走查**：本轮 mcp 工具异常，未做 UI 端 screenshot；BUG-101/102/105/106/107 仅代码层确认，下一轮 UI 端复测建议主跑这五条。
- **Test gap 整改**：BUG-110 提的 `tests/integration-pg/` 体系是否引入，决定下一轮 schema 漂移是否仍只能在端到端走查时发现。

---

## 附录 A — 本轮新建测试数据

| ID | 类型 | 关键字段 | 用途 |
|---|---|---|---|
| `825d708f-dec5-443d-b987-63f0a62dae99` | customer | `CUS-202604-0005`, ownerUserId+groupId+visaType+sourceType+location 完整 | BUG-089 / 088 / 115 复盘 |
| `73057a52-e52e-4b9d-8f1f-5cd097f1a1aa` | case | `CASE-202604-0010`, phase=SUCCESS, 无 billing | BUG-111 A 组 / 098 / 099 / 109 |
| `df9d1e84-fd62-4687-9297-decd8848412f` | case | `CASE-202604-0011`, phase=CLOSED_SUCCESS, supplementCount=2, 有 reminder | BUG-099 / 096 全链路 |
| `2f37c5ac-5814-4a29-8a11-8a1e49055711` | case | `CASE-202604-0012`, phase=WAITING_PAYMENT, 有 block billing | BUG-111 B 组（gate 正确 400） |
| `dce333a3-516c-49e4-9e3c-928b8b8a1eab` | billing_record | caseId=73057a52, 尾款 ¥50000, gate=block | 验证 case 73057a52 在加 billing 后 list 仍 500（→ BUG-108） |

---

## 附录 B — 修复链路推荐（按 ROI 排序）

| # | Bug | 修复成本 | 业务收益 | 优先级 |
|---|---|---|---|---|
| 1 | BUG-108（customers.name 不存在）| 低（4 处 SQL 字符串替换 + 抽 helper）| 解封 admin Billing 列表整页 | **立刻** |
| 2 | BUG-109（users.display_name 不存在）| 低（3 处 SQL 字符串替换）| 解封 PaymentRecords list + 让 case detail latestReview 真返数据 | **立刻** |
| 3 | BUG-110（schema-compatibility test gap）| 中（引入 integration-pg 测试目录 + CI script）| 一次性堵住未来所有 schema 漂移 | 高 |
| 4 | BUG-111（COE_SENT default-allow）| 低（`checkFinalPaymentGuard` 改默认 deny）或 中（创建期自动派生 billing milestone）| 让业务规范"未结清尾款不得发 COE"真生效 | 高 |
| 5 | BUG-112（Tasks 未 i18n）| 中（25+ 处文案抽 i18n）| 日语用户体验闭环 | 中 |
| 6 | BUG-115（customer backfill）| 低（一条 backfill migration）| 客户列表展示完整 | 中 |
| 7 | BUG-114（dashboard 文案中文硬编码）| 中（结构化 server response + admin i18n 拼装）| 三语用户都能看 dashboard | 中 |
| 8 | BUG-113（timeline 静默忽略 caseId）| 极低（query 校验加白名单）| 减少调试/集成误判 | 低 |

---

## 附录 C — 与第五轮总账（结案统计）

| 类别 | 数量 | 第五/第六轮 ID |
|---|---|---|
| ✅ 第五轮 12 条新增（happy path 已 PASS）| 11 | BUG-096 / 098 / 099 / 100 / 101 / 102 / 103 / 104 / 105 / 106 / 107 |
| ⚠️ 第五轮宣称已修但仍有场景缺口 | 1 | BUG-097 → BUG-111 |
| 🆕 第六轮新增 P0（schema-mismatch）| 2 | BUG-108 / 109 |
| 🆕 第六轮新增 P1 | 3 | BUG-110（test gap）/ 111（gate default-allow）/ 112（Tasks 未 i18n）|
| 🆕 第六轮新增 P2 | 3 | BUG-113 / 114 / 115 |
| **本轮总账** | **8 新增 Bug + 1 Bug 升级** | — |

> **下一轮入口**：先收口 BUG-108 / 109，admin Billing 列表恢复后立即复盘 BUG-091 + 触发 BUG-111 default-deny；Tasks i18n（BUG-112）+ Dashboard i18n（BUG-114）+ customer backfill（BUG-115）三条可并行处理。BUG-110 的 schema-compatibility 测试体系一旦落地，预计能拦住 80% 未来 schema 漂移类 bug。

