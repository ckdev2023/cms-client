# 案件全流程 chrome-devtools-mcp 深度审计 Bug 清单（第三轮 / R24）

> 生成日期：2026-05-02（chrome-devtools-mcp 真浏览器深度审计）
>
> 走查命题（用户 R24 任务）：
> - "chrome-devtools-mcp 测试案件的所有的流程"
> - 范围：在 R22/R23 已覆盖的主链路之外，**深挖回退分支、终态归档路径、跨模块联动、a11y、i18n、双层状态机一致性、admin↔server 协议同步**
> - 模式：深度审计（bug hunting；不止做回归确认，还要找前两轮没看到的新缺陷）
>
> 走查工具：
> - `chrome-devtools-mcp`：`navigate_page` / `take_snapshot` / `take_screenshot` / `click` / `fill` / `evaluate_script` / `list_console_messages` / `list_network_requests` / `get_network_request` / `wait_for`
>
> 走查环境：admin `http://localhost:5173`（hash router）、server NestJS `:3300`、登录态 `admin@local.test`（Local Admin / org-id `00000000-0000-4000-8000-000000000010`）已生效
>
> 走查素材：
> - 既有数据：23 个案件（含 R22/R23 创建/推进的样本）
> - 走查中推进的案件：`CASE-202604-0018 R7 BUG-118 supplement double` phase 链 NEED_SUPPLEMENT → SUPPLEMENT_PROCESSING → UNDER_REVIEW → APPROVED → WAITING_PAYMENT；stage 同步 S1 → S5 → S5 → S6 → S7
> - 走查中归档的案件：`CASE-202604-0007 R5 BUG-083 probe`（直接 API POST CONSULTING → CLOSED_FAILED 取证 BUG-208）
> - 截屏与凭证落地路径：`docs/gyoseishoshi_saas_md/_output/audit-cases-mcp-r3/`
>
> 与 R22 / R23 的差异：
> - R22 命题：流程通断 + 双层状态机正确性 → 出 BUG-191~205（15 条）
> - R23 命题：R22 修复的 LANDED 验收 → 14/15 PASS、1 CONDITIONAL（BUG-194 dev DB 模板种子缺）
> - R24 命题：**寻找 R22/R23 都没看到的新缺陷**，重点：回退分支（NEED_SUPPLEMENT / SUPPLEMENT_PROCESSING）、终态路径（APPROVED → ...）、admin/server 一致性、i18n 错误码、a11y 全局扫描、历史脏数据 backfill、Tasks/Reminders/Dashboard 工作台联动

---

## 0. R24 总结

### 0.1 流程通断结论（一句话）

**主链路（含回退分支 NEED_SUPPLEMENT → SUPPLEMENT_PROCESSING → UNDER_REVIEW → APPROVED → WAITING_PAYMENT）在新流转中通畅、stage 同步正确；Tasks 工作台 / Reminders / Dashboard 写读联动正常；i18n 三语切换基本完整；但 R22/R23 未发现的 1 条 P0、1 条 P1、1 条 P2、3 条 P3 新缺陷被定位**——其中 BUG-208（admin↔server PHASE_TRANSITIONS 失同步）直接证伪了 R23 BUG-200 的"代码审查 + 单测 PASS = 真实可用"判断：**R22 BUG-200 在 admin UI 上 100% 死路**，11 个非终态 phase 中只有 REJECTED / VISA_REJECTED 这两条 server 单出边的 case 能走到 CLOSED_FAILED，其余 9 条 server 加的 CLOSED_FAILED 出边在 admin UI 上完全不显示。

### 0.2 R24 新发现 BUG 清单

| BUG ID | 等级 | 摘要 | 取证截屏 |
|---|---|---|---|
| BUG-208 | **P0** | admin `useCasePhaseTransitionMenu.ts: PHASE_TRANSITIONS` 与 server `businessPhase.ts: PHASE_TRANSITIONS` 失同步——11 个非终态 phase 在 admin UI 上缺 `CLOSED_FAILED` 出边，导致 R22 BUG-200 "中途撤案" 在 admin UI 上 100% 不可触发；server 端却完全接受 CLOSED_FAILED 转换 | `01-bug208-need-supplement-popover-missing-closed-failed.png` / `02-bug208-under-review-popover-3-targets.png` / `05-bug208-waiting-material-no-closed-failed.png` / `06-bug208-server-accepts-closed-failed-archived-list.png` |
| BUG-207 | **P1** | phase→stage backfill 缺失：dev DB 中至少 9 条历史 case 存在 `stage / businessPhase` 字段错位（R22 BUG-191 仅修了 forward 流转 SQL，未补迁移 backfill 脚本），列表与详情头展示 `S1 · 刚开始办案 / 等待资料` / `S1 · 刚开始办案 / 成功` 这种自相矛盾组合 | `04-bug207-historical-stage-mismatch.png` |
| BUG-209 | P2 | phase 流转失败时 server 错误码（如 `CASE_POST_APPROVAL_BILLING_BLOCKED`）直接渲染到 popover error banner，未走 i18n；用户看到原始 ALL_CAPS 英文常量 | `03-bug209-error-code-no-i18n.png` |
| BUG-206 | P3 | a11y form 字段缺 `id/name`：R23 BUG-205 仅修了 `PaymentModal` / `CaseEditModal`；列表 `case-filters__select` x5 + `ui-search__input`、Documents 4 个、Customers 9 个（含 `customer-row__checkbox`）、Leads 3+ 个、Settings 多个 textbox 仍有 issue；DevTools console 在多页面持续报 `[issue] A form field element should have an id or name attribute (count: N)` | `00-case-list.png` (左上 console issues) |
| BUG-210 | P3 | 列表分页文案空状态退化：Leads 0 条时显示 `显示 1 - 0 条，共 0 条`（应隐藏范围或显示"暂无数据"） | （评估，复现 url `/#/leads`） |
| BUG-211 | P3 | 日语 i18n 文案不一致：CaseDetailView 概览的 `次の重要アクション` 卡片显示按钮 `校験実行`，与同页 `検証と提出パッケージを見る` 的"検証"用字不统一（应改为 `検証実行`） | （复现：详情页切 ja-JP） |

### 0.3 R22/R23 修复回归确认（R24 仍 ✅）

| BUG ID | R23 状态 | R24 验证 | 说明 |
|---|---|---|---|
| BUG-191 | ✅ PASS | ✅ PASS | 新流转触发 phase→stage 同步全链路（NEED_SUPPLEMENT→SUPPLEMENT_PROCESSING：S1→S5；SUPPLEMENT_PROCESSING→UNDER_REVIEW：S5→S5；UNDER_REVIEW→APPROVED：S5→S6；APPROVED→WAITING_PAYMENT：S6→S7） |
| BUG-192 | ✅ PASS | ✅ PASS | 连续打开/关闭 popover，header `当前：xxx` 始终随 phase 更新；0 console error |
| BUG-193 | ✅ PASS | ✅ PASS | 列表 search 仍可过滤；网络观察 `?search=B` 透传 server |
| BUG-194 | ⚠️ CONDITIONAL | ⚠️ **STILL CONDITIONAL** | R24 时 dev DB 仍无模板种子数据（`/api/document-items?caseId=<R23-AUDIT-TITLE-TEST>` 仍返回 `{total:0, items:[]}`），R23 后未补 seed |
| BUG-195 | ✅ PASS | ✅ PASS | Tasks 工作台仍正确显示 R23 自动创建的 4 条 task；写操作 `标记完成`：4→3 + toast "任务已完成" |
| BUG-196 | ✅ PASS | ✅ PASS | （未在 R24 重复，依赖 R23 验证） |
| BUG-197 | ✅ PASS | ✅ PASS | （未在 R24 重复） |
| BUG-198 | ✅ PASS | ✅ PASS | （未在 R24 重复） |
| BUG-199 | ✅ PASS | ✅ PASS | popover header 始终带 `当前：xxx`；list item 始终 `xxx → yyy` 箭头 |
| BUG-200 | ✅ PASS（基于代码审查 + 单测） | ❌ **FALSIFIED** | R23 BUG-200 ✅ PASS 是基于"代码审查 + 单测 PASS"，未真实在浏览器跑通；R24 用 chrome-devtools-mcp + popover snapshot 证实 admin UI 上 11 条 CLOSED_FAILED 出边死路（BUG-208 实证） |
| BUG-201 | ✅ PASS | ✅ PASS | （未在 R24 重复） |
| BUG-202 | ✅ PASS | ✅ PASS | `/#/cases?stage=S9&scope=mine` deeplink 仍正确显示 S9 列表 5 条 |
| BUG-203 | ✅ PASS | ✅ PASS | （未在 R24 重复） |
| BUG-204 | ✅ PASS | ✅ PASS | （未在 R24 重复） |
| BUG-205 | ✅ PASS（PaymentModal/CaseEditModal） | ✅ PASS（同范围） | 但 R24 BUG-206 揭示 a11y `id/name` 缺失在更多页面持续存在（列表/客户/资料/咨询/设置）|

### 0.4 R24 走查路径总览

```
登录态校验
  → /#/cases 列表 console issue (BUG-206 取证)
  → /#/cases/<NEED_SUPPLEMENT case> 详情 (CASE-202604-0018)
    → API aggregate 取得 stage=S1 / phase=NEED_SUPPLEMENT (BUG-207 实证)
    → 状态流转 popover 仅 1 个目标 [SUPPLEMENT_PROCESSING] (BUG-208 取证)
    → POST phase-transition: NEED_SUPPLEMENT → SUPPLEMENT_PROCESSING
        ↳ stage 同步 S1 → S5 (BUG-191 修复仍生效)
    → popover 仅 1 个目标 [UNDER_REVIEW]
    → 提交 SUPPLEMENT_PROCESSING → UNDER_REVIEW (S5→S5)
    → popover 显示 3 个目标 [APPROVED, REJECTED, NEED_SUPPLEMENT] (admin 副本，server 应有 4 个含 CLOSED_FAILED) (BUG-208 取证)
    → 提交 UNDER_REVIEW → APPROVED (S5→S6)
    → 提交 APPROVED → WAITING_PAYMENT (S6→S7)
    → 提交 WAITING_PAYMENT → COE_SENT
        ↳ ❌ 失败：error banner 显示原始 server code "CASE_POST_APPROVAL_BILLING_BLOCKED" (BUG-209)
  → /#/tasks 工作台
    → 显示 4 条 (R23 BUG-195 自动创建)
    → 点 "标记完成" → 4 → 3 + toast (写操作 PASS)
    → "提醒日志" tab 显示 3 条续签提醒 (Reminders PASS)
  → /#/ 仪表盘
    → 今日待办 3 / 已逾期 0 / 待提交 0 / 风险案件 9 (PASS)
  → /#/leads 0 条 → 分页文案 "显示 1 - 0 条" (BUG-210)
  → /#/documents 4 个 form field a11y issue (BUG-206)
  → /#/customers 9 个 form field a11y issue (BUG-206)
  → /#/cases/<CASE-202605-0003> 详情切 ja-JP
    → 详情按钮 "校験実行"（应为 "検証実行"）(BUG-211)
  → /#/settings 三个子页面（分组管理/可见性/本地资料根目录）渲染正常
  → API 直接 PoC 验证 BUG-208：
    → CASE-202604-0007 phase=CONSULTING (admin popover 仅 1 个目标 [CONTRACTED])
    → POST /phase-transition { toPhase: "CLOSED_FAILED", closeReason: ... } → 201 (server 接受)
    → after: stage=S9, businessPhase=CLOSED_FAILED, closeReason 落库, resultOutcome="failure"
    → /#/cases?stage=S9 列表已显示该已归档 case
```

整轮 0 个 5xx / 0 个 console error，唯一 console issue 是 a11y `form field element should have an id or name attribute`。

---

## 1. P0 缺陷

### BUG-208 ⚠️ admin↔server 双层状态机协议失同步（CRITICAL）

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/model/useCasePhaseTransitionMenu.ts` L8-29 (`PHASE_TRANSITIONS` 副本) ↔ `packages/server/src/modules/core/cases/businessPhase.ts` L55-78 (权威 `PHASE_TRANSITIONS`) |
| 复现 | 1. admin UI 任意非终态 phase 案件打开 "状态流转" popover；2. 观察可达目标列表，缺 `CLOSED_FAILED`；3. 直接 `POST /api/cases/<id>/phase-transition { toPhase: "CLOSED_FAILED", closeReason: "..." }` → server 返回 201，phase 真的变为 CLOSED_FAILED + stage=S9 + closeReason 落库 |
| 实证 | API PoC：CASE-202604-0007 phase=CONSULTING，POST `{toPhase: 'CLOSED_FAILED', closeReason: 'R24 audit', resultOutcome: 'failure'}` → 201；before `{stage:S1, businessPhase:CONSULTING}` → after `{stage:S9, businessPhase:CLOSED_FAILED, closeReason:"R24 audit...", resultOutcome:"failure"}`；admin popover **从未渲染该选项** |
| 完整对比表（admin 副本 vs server 权威）| 见 §1.1 |
| 影响 | **R22 BUG-200（中途撤案路径）在 admin UI 上 100% 不可用** —— 11 个非终态 phase（CONSULTING / CONTRACTED / WAITING_MATERIAL / MATERIAL_PREPARING / REVIEWING / APPLYING / UNDER_REVIEW / NEED_SUPPLEMENT / SUPPLEMENT_PROCESSING / WAITING_PAYMENT / COE_SENT / VISA_APPLYING）共 12 个 phase 中只有 REJECTED / VISA_REJECTED 这两条 server 单出边（[CLOSED_FAILED]）的 case 能在 UI 上走到 CLOSED_FAILED；其余 11 个 phase 用户必须靠工程师写脚本 / Postman 才能撤案。R22 BUG-200 ✅ LANDED + R23 ✅ PASS 是被"单测 + 代码审查"伪验证的典型案例 |
| 取证 | `01-bug208-need-supplement-popover-missing-closed-failed.png` (NEED_SUPPLEMENT 弹窗仅 1 目标) / `02-bug208-under-review-popover-3-targets.png` (UNDER_REVIEW 弹窗 3 目标，缺 CLOSED_FAILED) / `05-bug208-waiting-material-no-closed-failed.png` (WAITING_MATERIAL 弹窗 1 目标) / `06-bug208-server-accepts-closed-failed-archived-list.png` (PoC 后归档列表) |
| 现有测试参考 | `packages/admin/src/views/cases/components/PhaseTransitionPopover.bug200.test.ts` 8 tests 全 PASS —— 但所有 test 都是给 popover 直接传 `availableTargets=['CLOSED_FAILED']`，**绕过了** `useCasePhaseTransitionMenu.ts` 的 `getAvailablePhaseTargets()` 真正的 transition map 查询，所以单测无法发现这个问题 |
| 建议补丁 | **核心：消除 admin 自维护副本，单一权威落到 server**。两条路：① 简单：把 `useCasePhaseTransitionMenu.ts` L8-29 整张表改成 `import { PHASE_TRANSITIONS } from '@cms/domain/businessPhase'`（要把 server `businessPhase.ts` 上抬到共享 `packages/domain` 或 `packages/admin/src/domain` 镜像，并加 lint 规则禁止 `useCasePhaseTransitionMenu.ts` 内本地常量）；② 服务端驱动：新增 `GET /api/cases/<id>/transitions/available` 返回 `{ availableTargets: string[], currentPhase: string }`，admin popover 改为远程拉取，彻底消灭副本失同步可能。建议 ②（成本略高但根治），并补 e2e 测试：对每个非终态 phase 都断言 popover 包含 `CLOSED_FAILED`（除已经覆盖的 REJECTED / VISA_REJECTED 外） |
| 等级 | **P0 — 业务关键路径在 UI 上完全不可达** |
| 状态 | ✅ FIX-LANDED（三层防御：SSoT `businessPhaseTransitions.ts` + 跨包一致性测试 + popover 单测真实化 + 全 phase 矩阵断言） |

#### 1.1 完整对比表（admin 副本 vs server 权威）

| from phase | admin `useCasePhaseTransitionMenu.ts` | server `businessPhase.ts` | 差异 |
|---|---|---|---|
| CONSULTING | `[CONTRACTED]` | `[CONTRACTED, CLOSED_FAILED]` | ❌ admin 缺 CLOSED_FAILED |
| CONTRACTED | `[WAITING_MATERIAL]` | `[WAITING_MATERIAL, CLOSED_FAILED]` | ❌ admin 缺 |
| WAITING_MATERIAL | `[MATERIAL_PREPARING]` | `[MATERIAL_PREPARING, CLOSED_FAILED]` | ❌ admin 缺 |
| MATERIAL_PREPARING | `[REVIEWING]` | `[REVIEWING, CLOSED_FAILED]` | ❌ admin 缺 |
| REVIEWING | `[APPLYING]` | `[APPLYING, CLOSED_FAILED]` | ❌ admin 缺 |
| APPLYING | `[UNDER_REVIEW]` | `[UNDER_REVIEW, CLOSED_FAILED]` | ❌ admin 缺 |
| UNDER_REVIEW | `[APPROVED, REJECTED, NEED_SUPPLEMENT]` | `[APPROVED, REJECTED, NEED_SUPPLEMENT, CLOSED_FAILED]` | ❌ admin 缺 |
| NEED_SUPPLEMENT | `[SUPPLEMENT_PROCESSING]` | `[SUPPLEMENT_PROCESSING, CLOSED_FAILED]` | ❌ admin 缺 |
| SUPPLEMENT_PROCESSING | `[UNDER_REVIEW]` | `[UNDER_REVIEW, CLOSED_FAILED]` | ❌ admin 缺 |
| APPROVED | `[WAITING_PAYMENT]` | `[WAITING_PAYMENT]` | ✅ 一致 |
| REJECTED | `[CLOSED_FAILED]` | `[CLOSED_FAILED]` | ✅ 一致 |
| WAITING_PAYMENT | `[COE_SENT]` | `[COE_SENT, CLOSED_FAILED]` | ❌ admin 缺 |
| COE_SENT | `[VISA_APPLYING]` | `[VISA_APPLYING, CLOSED_FAILED]` | ❌ admin 缺 |
| VISA_APPLYING | `[SUCCESS, VISA_REJECTED]` | `[SUCCESS, VISA_REJECTED, CLOSED_FAILED]` | ❌ admin 缺 |
| SUCCESS | `[RESIDENCE_PERIOD_RECORDED]` | `[RESIDENCE_PERIOD_RECORDED]` | ✅ 一致 |
| VISA_REJECTED | `[CLOSED_FAILED]` | `[CLOSED_FAILED]` | ✅ 一致 |
| RESIDENCE_PERIOD_RECORDED | `[RENEWAL_REMINDER_SCHEDULED]` | `[RENEWAL_REMINDER_SCHEDULED]` | ✅ 一致 |
| RENEWAL_REMINDER_SCHEDULED | `[CLOSED_SUCCESS]` | `[CLOSED_SUCCESS]` | ✅ 一致 |

差异统计：12 个非终态 phase 中 11 个 admin 缺 CLOSED_FAILED 出边（占 92%）。

---

## 2. P1 缺陷

### BUG-207 ⚠️ phase→stage backfill 缺失，至少 9 条历史脏数据

| 字段 | 值 |
|---|---|
| 位置 | `packages/server/src/infra/db/migrations/`（缺一条 backfill migration）+ `packages/server/src/modules/core/cases/businessPhase.ts: PHASE_TO_STAGE_DEFAULT` |
| 复现 | 列表 `/#/cases` 观察阶段列展示如 `刚开始办案 / 等待资料`、`刚开始办案 / 成功`、`刚开始办案 / 等待尾款`，stage label 与 phase label 自相矛盾；调 `GET /api/cases?scope=mine&page=1&limit=50&view=summary`，对每条按 `PHASE_TO_STAGE_DEFAULT[businessPhase]` 期望反查 stage，发现 9 条不一致 |
| 实证（dev DB R24 实拉）| 23 条 case 中 9 条 `(stage, businessPhase)` 错位：<br>① CASE-202605-0003 `(S1, WAITING_MATERIAL)` 期望 S2（**R22 BUG-191 触发样本，修了之后 stage 也未 backfill**）<br>② CASE-202604-0019 `(S1, WAITING_PAYMENT)` 期望 S7<br>③ CASE-202604-0017 `(S1, WAITING_PAYMENT)` 期望 S7<br>④ CASE-202604-0015 `(S1, WAITING_PAYMENT)` 期望 S7<br>⑤ CASE-202604-0014 `(S1, WAITING_PAYMENT)` 期望 S7<br>⑥ CASE-202604-0013 `(S1, WAITING_PAYMENT)` 期望 S7<br>⑦ CASE-202604-0012 `(S1, WAITING_PAYMENT)` 期望 S7<br>⑧ CASE-202604-0010 `(S1, SUCCESS)` 期望 S8<br>⑨ CASE-202604-0003 `(S1, RENEWAL_REMINDER_SCHEDULED)` 期望 S8 |
| 期望 | R22 BUG-191 修复时应同时落地一条 `migrationN_phase_stage_backfill` SQL：`UPDATE cases SET stage = case business_phase ... end WHERE stage <> mapped_stage`；或在 detail aggregate response level 做容错（不推荐：会掩盖问题） |
| 影响 | 1) 列表"阶段"列、详情页 header `S1 · 刚开始办案`、概览"当前办案进度"、Customer Detail 案件列表全部显示自相矛盾的组合，破坏运营对状态机的信任；2) `?stage=S1` deeplink 会把 9 条早已推到 S2-S8 的案件错挂到 S1 的桶里；3) 对账报表（按 stage 分布）口径全错 |
| 取证 | `04-bug207-historical-stage-mismatch.png` |
| 建议补丁 | 1. 服务端：新增 migration `04N_backfill_phase_stage_consistency`，按 `PHASE_TO_STAGE_DEFAULT` 反查回填；2. 配套 `cases.bug207-phase-stage-backfill.focused.test.ts` 验证 migration 幂等 + 反向 down.sql 不破坏数据；3. 应对 BUG-200 下游：撤案的 closed reason backfill 也要顺手做（CLOSED_FAILED + close_reason=NULL 的脏数据可能存在） |
| 等级 | **P1** |
| 状态 | ✅ FIX-LANDED（migration 042 + focused test 9 条脏数据归位 + 幂等断言） |

---

## 3. P2 缺陷

### BUG-209 phase 流转失败时 server error code 未 i18n

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/PhaseTransitionPopover.vue` L259-266 (`<p class="phase-popover__error">`) + `packages/admin/src/views/cases/model/useCasePhaseTransitionMenu.ts` L112-117 (`extractErrorMessage`) |
| 复现 | 1. 推进 CASE-202604-0018 phase 链至 WAITING_PAYMENT（无任何 billing_records 入金）；2. 选 `等待尾款 → 在留已发送`（COE_SENT）；3. 提交 → server 返回 4xx，error code `CASE_POST_APPROVAL_BILLING_BLOCKED`；4. popover 显示原始字符串 `流转失败: CASE_POST_APPROVAL_BILLING_BLOCKED` |
| 期望 | i18n 化为 `cases.detail.phaseMenu.errors.CASE_POST_APPROVAL_BILLING_BLOCKED = "尚有未结算的尾款，请先在 Billing 页登记入金后再推进。"`（三语补齐）；fallback 仍可显示 raw code 但加 `[code]` 前缀以示这是兜底 |
| 影响 | 用户看到 ALL_CAPS 英文常量，无法理解；与 R22 BUG-194 时同样的问题在不同场景再现 |
| 取证 | `03-bug209-error-code-no-i18n.png` |
| 建议补丁 | 1. server 错误码盘点：`packages/server/src/modules/core/cases/cases.service.ts` 涉及 phase 流转的 `CaseHttpError` 系列（`CLOSE_REASON_REQUIRED` / `CASE_POST_APPROVAL_BILLING_BLOCKED` / `CASE_RISK_ACK_REQUIRED` 等）列出；2. `extractErrorMessage` 改为 `t('cases.detail.phaseMenu.errors.' + code, { fallback: code })`；3. 三语 i18n 补齐；4. 单测 `useCasePhaseTransitionMenu.error-i18n.test.ts` 覆盖 |
| 等级 | **P2 — UX 一致性** |
| 状态 | ✅ FIX-LANDED（`extractErrorCode` + `t()` fallback + 9 错误码三语 key + 单测） |

---

## 4. P3 缺陷

### BUG-206 a11y `form field` `id/name` 缺失 — R23 BUG-205 修复范围不完整

| 字段 | 值 |
|---|---|
| 位置 | 多页面，至少：<br>- `packages/admin/src/views/cases/CaseListView.vue` 5 个 `select.case-filters__select` + `input.ui-search__input`<br>- `packages/admin/src/views/customers/...` 9 个：3 个 filter select + 2 个 bulk-bar select + 1 个 table 全选 checkbox + 2 个 row checkbox + 1 个 search input<br>- `packages/admin/src/views/documents/DocumentsView.vue` 4 个：search + 3 个 select<br>- `packages/admin/src/views/leads/LeadsView.vue` 3+ 个 select / search<br>- `packages/admin/src/views/settings/...` textbox（部分）|
| 复现 | 进入任一页面，DevTools issues panel：`A form field element should have an id or name attribute (count: N)` 持续报；通过 `evaluate_script` 枚举 `document.querySelectorAll('input,select,textarea').filter(f => !f.id && !f.name && f.type !== 'hidden')` 即可重现 |
| 期望 | 所有 form 控件都补 `id` + `name`（可统一前缀，如 `case-filter-stage`、`customer-filter-status`） |
| 影响 | a11y 审计不通过；屏幕阅读器无法定位字段 |
| 建议补丁 | 1. 在 `packages/admin` 加 lint 规则 / 自动化 a11y test 覆盖所有页面 form 字段；2. 各 view 一次性补齐 |
| 等级 | **P3 — a11y 合规** |
| 状态 | ✅ FIX-LANDED（Cases/Customers/Documents/Leads/Settings 6 类页面补齐 + a11y audit test） |

### BUG-210 列表分页文案空状态退化

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/leads/...`（pagination 文案模板）+ 同模板复用的其它列表 |
| 复现 | `/#/leads` 访问空列表（无线索），底部分页提示显示 `显示 1 - 0 条，共 0 条`（`from=1, to=0` 让人困惑） |
| 期望 | 0 条时显示 `暂无数据` 或 `共 0 条`（隐藏 `from-to` 范围）；非 0 条时正常显示 `1 - N 条，共 M 条` |
| 等级 | **P3 — 文案 / 边界鲁棒性** |
| 状态 | ✅ FIX-LANDED（LeadPagination total===0 分支 + 三语 empty key + 单测） |

### BUG-211 日语 i18n 文案"校験 vs 検証"不一致

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/i18n/messages/ja-JP.ts`（`cases.detail.overview.runValidationButton` 或类似 key）|
| 复现 | 任何案件详情切 ja-JP，左下"次の重要アクション"卡片按钮显示 `校験実行`；同页"提出前チェック"卡片按钮 `検証と提出パッケージを見る`使用 `検証` |
| 期望 | 统一为 `検証実行` |
| 等级 | **P3 — i18n 文案一致性** |
| 状态 | ✅ FIX-LANDED（ja-JP 4 处 校験→検証 统一） |

---

## 5. R24 通过项（确认无回归）

- `/#/cases` 23 条案件列表渲染正常；Pagination "上一页 disabled / 1-20 共 23 / 下一页"
- `?stage=S9&scope=mine` deeplink → S9 列表 5 条 (CASE-202604-0011 / 0016 / 0007 / 0008-equiv等)
- 双层状态机新流转 phase→stage 同步：CASE-202604-0018 推进 NEED_SUPPLEMENT(S1)→SUPPLEMENT_PROCESSING(S5)→UNDER_REVIEW(S5)→APPROVED(S6)→WAITING_PAYMENT(S7)，每步 stage 都按 `PHASE_TO_STAGE_DEFAULT` 同步
- popover 选中状态泄漏修复仍有效（连续多次开/关；header `当前：xxx` 始终随 phase 更新）
- popover header 当前→目标对照 仍有效（`当前：补充处理中` + list `补充处理中 → 审查中（入管）`）
- BUG-200 i18n 三语 chip（`MID_CASE_WITHDRAWAL` / `CLIENT_LOST_CONTACT` / `SWITCHED_TO_OTHER_FIRM` / `OTHER`）三语字典齐全 — 但 ❌ admin UI 无法触发这条路径（BUG-208）
- Tasks 工作台：4 条 task 列出 → 标记完成 4→3 + toast；切到"提醒日志"tab 显示 3 条续签提醒
- Dashboard：早上好 / 今日待办 3 / 已逾期 0 / 待提交 0 / 风险案件 9 一致
- i18n 切换（zh-CN ↔ en-US ↔ ja-JP）：sidebar / banner / breadcrumb / tabs / 弹窗 header 全部跟随
- Settings 三个子页面（分组管理 / 可见性配置 / 本地资料根目录）渲染正常；"本地资料根目录未配置"alert 与 BUG-194 dev DB 模板缺数据无相互依赖
- POST `/api/cases/.../phase-transition` server-side 接受 CONSULTING → CLOSED_FAILED + closeReason + resultOutcome（PoC 201）
- 0 个 5xx；0 console error；唯一 console issue 是 a11y `form field id/name`（BUG-206）

---

## 6. R24 取证截屏

| 文件 | 场景 |
|---|---|
| `00-case-list.png` | 案件列表（走查起始状态，23 条；console 显示 BUG-206 a11y issue count=6） |
| `01-bug208-need-supplement-popover-missing-closed-failed.png` | NEED_SUPPLEMENT 弹窗仅显示 `补充处理中` 1 个目标，缺 CLOSED_FAILED |
| `02-bug208-under-review-popover-3-targets.png` | UNDER_REVIEW 弹窗 3 个目标（已批准/已拒否/需要补充），缺 CLOSED_FAILED |
| `03-bug209-error-code-no-i18n.png` | 流转失败 popover error banner 显示原始 server code `CASE_POST_APPROVAL_BILLING_BLOCKED` |
| `04-bug207-historical-stage-mismatch.png` | 列表全页截图，多条 case 显示 stage label 与 phase label 自相矛盾的组合 |
| `05-bug208-waiting-material-no-closed-failed.png` | WAITING_MATERIAL 弹窗仅 1 目标，缺 CLOSED_FAILED |
| `06-bug208-server-accepts-closed-failed-archived-list.png` | API PoC 后 `?stage=S9` 列表显示 CASE-202604-0007 已归档 |

---

## 7. 落库建议（先后顺序）

1. **P0 BUG-208** 拆 admin↔server PHASE_TRANSITIONS 副本：① 短平快路径：admin `useCasePhaseTransitionMenu.ts` PHASE_TRANSITIONS 直接抄齐 server 11 条 CLOSED_FAILED 出边 + 单测覆盖每个非终态 phase 的目标列表（含 CLOSED_FAILED）；② 根治：抽 `packages/domain/businessPhase` 共享包给 admin / server / 未来 mobile 复用；建议先 ① 再排 ②。修完后 R23 BUG-200 ✅ PASS 也才真正能在 UI 上点出来。 ✅ LANDED（三层防御：SSoT `businessPhaseTransitions.ts` + 跨包一致性测试 + popover 单测真实化 + 全 phase 矩阵断言）
2. **P1 BUG-207** 加 `04N_backfill_phase_stage_consistency.up.sql/.down.sql` migration + focused test 覆盖 9 条脏数据回填；上线时跑迁移自动修复 dev/staging/prod。 ✅ LANDED（migration 042 + focused test 9 条脏数据归位 + 幂等断言）
3. **P2 BUG-209** phase 流转 server 错误码三语 i18n 化；同时盘点其它 server error code 在 UI 直接渲染处。 ✅ LANDED（`extractErrorCode` + `t()` fallback + 9 错误码三语 key + 单测）
4. **P3 BUG-206** 多页面 form 字段补 `id/name`；考虑加 a11y lint。 ✅ LANDED（Cases/Customers/Documents/Leads/Settings 6 类页面补齐 + a11y audit test）
5. **P3 BUG-210/211** 文案修复（leads 分页空态、ja-JP "校験"→"検証"）。 ✅ LANDED（LeadPagination total===0 分支 + 三语 empty key + ja-JP 4 处 校験→検証）
6. **BUG-194 still CONDITIONAL**：在 dev DB seed 脚本里补经営管理（认定 4 个月）模板的 `document_checklist` 数据，让 R23 已修代码可以在浏览器里看到非空 document_items。 ✅ LANDED（seedDevData.ts 补齐模板种子）

---

## 8. 走查痕迹（清理建议）

R24 走查在 dev DB 中产生了如下副作用（需要时手工回退）：

- `CASE-202604-0018 R7 BUG-118 supplement double` phase 推进至 `WAITING_PAYMENT`（stage S7）；4 条 phase-transition timeline 已落库；R24 终态停在 `等待尾款`
- `CASE-202604-0007 R5 BUG-083 probe` 被 API PoC 直接归档为 `CLOSED_FAILED`（stage S9）；`closeReason="R24 audit: BUG-208 server-accepts-but-admin-ui-cannot-trigger"`；`resultOutcome="failure"`
- `CASE-202604-0018` 任务列表中 R23 自动创建的 1 条 task 被点 "标记完成"（4 → 3）

如果需要还原数据，需手工把对应 case stage / phase 改回；或者 reset dev DB。

---

## 9. R24 发现的"测试盲区"教训

R23 把 BUG-200 标为 ✅ PASS 是基于"PhaseTransitionPopover.bug200.test.ts 8 tests + cases.bug200-mid-cancel.focused.test.ts 3 tests 全 PASS + 代码审查"。R24 用真实浏览器走查在 1 分钟内证伪了这个判断。

**根因**：
- 8 个 admin 单测全部直接给 popover 注入 `availableTargets=['CLOSED_FAILED']`，**绕过了** `useCasePhaseTransitionMenu` 的 `getAvailablePhaseTargets()` 真正查询 `PHASE_TRANSITIONS` 副本的过程
- 3 个 server 测试只验证 server-side `assertPhaseTransition` + cases.service phase change SQL，没有任何端到端测试覆盖 "admin UI popover 在某个 phase 上是否真的渲染 CLOSED_FAILED 选项"

**后续防御**：
- ① 任何"前端展示约束 + 后端业务规则"双重约束的数据，必须有一条端到端测试断言两边一致（比如 `expect(adminAvailableTargets).toEqual(serverPhaseTransitions[from])`）
- ② R23 类回归走查应优先用 chrome-devtools-mcp 走真实 UI，不允许靠"代码审查 + 单测"二次确认 LANDED 的结论
- ③ 抽公共 `businessPhase` 模块给前后端共用，从结构上消除"两套副本"的可能

