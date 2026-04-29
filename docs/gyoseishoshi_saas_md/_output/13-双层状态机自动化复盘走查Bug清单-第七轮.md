# 客户/案件模块（admin）— 双层状态机自动化复盘走查 Bug 清单（第七轮 / 同日复测）

> 生成日期：2026-04-29（同日 spot-check，R6 当晚二次走查）
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/12-双层状态机自动化复盘走查Bug清单-第六轮.md`（首测：BUG-097 ⚠️ MIXED + BUG-108/109 P0 schema-mismatch + BUG-111 default-allow 缺口）
> - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md`（业务规则）
>
> 走查工具：`curl`（HTTP API）+ `psql`（DB 直查）+ 代码审查（`packages/server/src/modules/core/billing/billingGuards.ts` 等）
> 走查环境：`http://localhost:5173/api`，本地 admin（`admin@local.test` / `Admin123!`）；后端 NestJS `:3300`，Vite 反代 `:5173`，PostgreSQL `cms-client-postgres-1` `:5433`
> 与第六轮 (`12-...md`) 互为续篇；本轮**只复测**第六轮已识别的回归项，不开新走查 Bug 编号。

---

## 0. 第七轮总结

### 0.1 关键事件

第六轮在首测条件下识别出 1 条 ⚠️ MIXED（BUG-097）+ 7 条 R6 新增 Bug（BUG-108~115）。本轮在同日下午对**首测受质疑的修复点**重新走查，确认其中 4 条已经合并修复，第五轮 12 条整体回归到「12/12 PASS」状态。

### 0.2 回归结果概览

| # | 复测项 | 首测结论 | 同日复测结论 | 关键证据 |
|---|---|---|---|---|
| 1 | 第五轮 12 条（BUG-096~107）整体 | 11 PASS + 1 MIXED | **✅ 12/12 PASS** | 见 §1 表 |
| 2 | BUG-097 / BUG-111 COE_SENT 尾款 gate | ⚠️ default-allow | **✅ default-deny 已实装** | A 组无 billing：HTTP 400 `Final payment milestone is missing`；B 组 block billing：HTTP 400 `unpaid (80000)` |
| 3 | BUG-108 `/api/billing-plans` schema-mismatch | ❌ 500 | **✅ HTTP 200** | `customers.name` → `coalesce(base_profile->>'displayName',...)` 类修复已落地 |
| 4 | BUG-109 `/api/payment-records` + `aggregate.latestReview` | ❌ 500 / 静默 null（schema） | **✅ HTTP 200** / `latestReview=null`（数据原因）| `users.display_name` → `users.name` 修复已落地；aggregate 子查询不再抛 `column does not exist` |
| 5 | BUG-100 部署门禁 | ✅ PASS | **✅ PASS** | `npm run db:migrations:check:db → ok (db in sync)` |

### 0.3 三句话结论

1. **第五轮 12 条 (BUG-096~107) 在同日复测下全部 PASS**：BUG-097 因 `billingGuards.ts#checkFinalPaymentGuard` 已合并 BUG-111 default-deny（无尾款 milestone 时返回 `reason: 'no_plan'` → 由 `runCoeSendBillingGate` 转译为 `Final payment milestone is missing`），从首测的 ⚠️ MIXED 升级为 ✅ PASS。
2. **R6 新增的 P0 schema-mismatch（BUG-108/109）也已修复**：`/api/billing-plans`、`/api/payment-records`、`/api/cases/:id/aggregate` 均回到 HTTP 200；`aggregate.latestReview` 现为 null 是因为对应 case 没有 review 记录，而非 schema 错误。
3. **R6 §0.4 三句话结论中第 2、3 条因此过期**：BUG-091（Billing 简繁混杂）的 i18n 修复在 admin Billing 列表页已恢复可验证；BUG-097 的尾款 gate「修了等于没修」已不再成立。剩余 R6 新增 P1/P2（BUG-110 test gap / BUG-112 Tasks 未 i18n / BUG-113 timeline 静默忽略 query / BUG-114 dashboard 文案 / BUG-115 customer backfill）本轮未复测，沿用 R6 状态。

---

## 1. 第五轮 12 条 Bug 同日复测对照表

| ID | 优先级 | R6 首测 | 同日复测 | 证据 |
|---|---|---|---|---|
| BUG-096（reminders NOT NULL）| P0 | ✅ PASS | **✅ PASS** | `GET /api/reminders?caseId=df9d1e84` 返回 3 条（2030-03-05 / 06-03 / 08-02 = 180/90/30 档）|
| BUG-097（COE_SENT 尾款 gate）| P0 | ⚠️ MIXED | **✅ PASS** | A 组无 billing 现 400 `Final payment milestone is missing`；`billingGuards.ts:91-98` default-deny `reason: 'no_plan'` 已实装 |
| BUG-098（COE/海外/入境 stamping）| P0 | ✅ PASS | **✅ PASS** | df9d1e84：coeSentAt 10:54:27.045 < overseasVisaStartAt .070 < entryConfirmedAt .095 |
| BUG-099（supplement_count 递增）| P0 | ✅ PASS | **✅ PASS** | df9d1e84.supplementCount=2；timeline 两次 `to=NEED_SUPPLEMENT` 分别带 supplementCount=1 / 2 |
| BUG-100（部署门禁 / migrations）| P0 | ✅ PASS | **✅ PASS** | `npm run db:migrations:check:db → ok (db in sync)` |
| BUG-101（stage/phase 双 chip）| P1 | ✅（代码层）| **✅（代码层）** | `CaseTableRow.vue:101-120` phase 主 chip + `case-row__stage-meta` 元数据 |
| BUG-102（owner 列展示）| P1 | ✅ PASS | **✅ PASS** | `?view=summary` 12/12 `ownerDisplayName="Local Admin"` |
| BUG-103（列表 phase 筛选）| P1 | ✅ PASS | **✅ PASS** | `?phase=CLOSED_SUCCESS` total=3，distinct={CLOSED_SUCCESS} |
| BUG-104（timeline payload from/to）| P1 | ✅ PASS | **✅ PASS** | `case.phase_transitioned` payload keys = {from, to, coeSentAt, overseasVisaStartAt, entryConfirmedAt, supplementCount} |
| BUG-105（`?tab=timeline` 别名）| P1 | ✅（代码层）| **✅（代码层）** | `query.ts:237-300` `CASE_DETAIL_TAB_ALIASES = { timeline: 'log' }` |
| BUG-106（详情面包屑 UUID）| P2 | ✅（代码层）| **✅（代码层）** | `caseIdentity.ts:13-19` `formatCaseIdentity(caseNo, id)` |
| BUG-107（case timeline 时间戳）| P2 | ✅（代码层）| **✅（代码层）** | `CaseLogTab.vue:59-63` `formatEntryTime` 用 `formatDateTime(raw, locale.value)` |

---

## 2. 业务规则映射（BUG-097 default-deny）

R6 §0.4 第 3 条提出"需要补「无 billing plan 时拒绝进入 WAITING_PAYMENT」或「自动创建 default 尾款 milestone」的 gate fallback"。本轮确认实装方案是**前者**：

- **位置**：`packages/server/src/modules/core/billing/billingGuards.ts:65-98`（`checkFinalPaymentGuard`）
- **行为**：当 case 没有任何 `milestone_name` 含「尾款 / final / 結果」的 billing_records 时，函数返回 `{ settled: false, unpaid: 0, gateEffectMode: 'block', reason: 'no_plan' }`，由 `runCoeSendBillingGate` 转译为 400 `CASE_POST_APPROVAL_BILLING_BLOCKED: Final payment milestone is missing. Please create a final-payment billing record before sending COE.`
- **触发点**：仅在 WAITING_PAYMENT → COE_SENT 转移时调用，与业务规范《步骤 16 未结清尾款不得推进到 COE_SENT》一致。
- **业务规则文档影响**：此 default-deny 是「实现层兜底」，未引入新规则、未改变 `CaseTemplate.billing_gate_mode` 的语义。`P0/03-业务规则与不变量.md §3.5` 维持「收费阻断默认 warn」描述不变；建议后续在 `P0/04-核心流程与状态流转.md §1 主流程` 步骤 16 处加一行脚注，说明实现层在 `milestone_name` 缺失时强制 deny（避免 fixture/seed 漏建尾款节点导致 gate 跳过）。

---

## 3. 复现资产

```bash
# A 组：无 billing record，应被 400 拦截
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.test","password":"Admin123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
NEW=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"customerId":"825d708f-dec5-443d-b987-63f0a62dae99","caseTypeCode":"biz_mgmt_4m","ownerUserId":"00000000-0000-4000-8000-000000000011","caseName":"R7 BUG-111 retest A","stage":"S1"}' \
  http://localhost:5173/api/cases | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
for TO in CONTRACTED WAITING_MATERIAL MATERIAL_PREPARING REVIEWING APPLYING UNDER_REVIEW APPROVED WAITING_PAYMENT COE_SENT; do
  curl -s -o /tmp/r7_$TO.json -w "$TO -> %{http_code}\n" -X POST -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "{\"toPhase\":\"$TO\"}" \
    "http://localhost:5173/api/cases/$NEW/phase-transition"
done
# 期望：CONTRACTED..WAITING_PAYMENT -> 201；COE_SENT -> 400 "Final payment milestone is missing"

# Billing 列表 + payment-records 应回到 200
for P in /api/billing-plans /api/payment-records "/api/cases/df9d1e84-fd62-4687-9297-decd8848412f/aggregate"; do
  curl -s -o /dev/null -w "$P -> %{http_code}\n" -H "Authorization: Bearer $TOKEN" \
    "http://localhost:5173$P"
done
# 期望：三者均 200
```

---

## 4. 仍未覆盖（沿用 R6 §7）

R6 §7 列出的下一轮走查项中，本轮**未触及**以下条目，状态沿用 R6：

- stage / phase 终态联动（产品决策）
- CLOSED_FAILED 路径 + closeReason 入参校验
- BUG-110（`tests/integration-pg/` schema-compatibility 测试体系）— **未引入**，schema 漂移仍只能在端到端走查时暴露
- BUG-112（Tasks 页未 i18n）— 未复测
- BUG-113 / 114 / 115（timeline query / dashboard 文案 / customer backfill）— 未复测
- chrome-devtools-mcp UI 端 screenshot 复盘（BUG-101/102/105/106/107）— 仍仅代码层确认

---

## 附录 — 复用 R6 测试数据

| ID | 类型 | 用途 |
|---|---|---|
| `825d708f-dec5-443d-b987-63f0a62dae99` | customer | A 组建 case 用 |
| `73057a52-e52e-4b9d-8f1f-5cd097f1a1aa` | case (SUCCESS, 无 billing) | 历史 R6 数据 |
| `df9d1e84-fd62-4687-9297-decd8848412f` | case (CLOSED_SUCCESS, supplement=2) | BUG-098 / 099 / 104 / 096 复测主用例 |
| `2f37c5ac-5814-4a29-8a11-8a1e49055711` | case (WAITING_PAYMENT, block billing 80000) | BUG-097 B 组 |
| `90431ceb-a26f-465d-a6eb-453f7c54db21` | case (本轮新建，WAITING_PAYMENT, 无 billing) | BUG-111 A 组同日复测 |
