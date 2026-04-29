# 客户/案件模块（admin）— 双层状态机端到端走查 Bug 清单（第五轮）

> 生成日期：2026-04-29
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/10-双层状态机映射.md`（businessPhase 20 状态、phase 转换图、4 类 gate）
> - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md`（业务规则）
> - `docs/事务所流程/在留資格別必要情報一覧Ver2.中文规范版资料清单.md`（资料矩阵）
>
> 走查工具：`chrome-devtools-mcp` + `curl` + `psql`（API/DB 直查）
> 走查环境：`http://localhost:5173/#/`，本地 admin（`admin@local.test` / `Admin123!`）；后端 NestJS `:3300`，Vite 反代 `:5173`
> 截图归档：`docs/gyoseishoshi_saas_md/_output/screens/33~35*.png`
> 与第四轮 (`10-事务所流程驱动走查Bug清单-第四轮.md`) 互为续篇；本轮编号自 BUG-096 起。

> **2026-04-29 18:00 重核**：本轮 12 条新增 Bug（BUG-096~107）已全部完成代码落地，原稿仅在 BUG-096 / BUG-100 小节内文标了"已修"、标题未补 ✅，本次已同步补齐；§4 对照表与附录 C 总账已按代码现状重新分档，剩余仍未修项收敛为 **BUG-079（Document Center fixture）+ BUG-093（介绍人字段重复）** 两条 P2。详见 §4.1 重核小记。
>
> **2026-04-29 18:30 续修**：BUG-079 / BUG-093 已落地代码并通过 `npm run guard`（admin + server 共 2919 个用例 0 失败）。落点：
> - **BUG-079**：新增 `views/documents/model/{DocumentRepository,DocumentAdapter,useDocumentListModel}.ts`，并把 `DocumentListView.vue` 切换到模型层；当前后端无 `/api/documents` 聚合端点，前端通过 `/api/document-items` + `/api/cases?view=summary` 并行拉取并组装。空数据/接口异常时回退到 `SAMPLE_DOCUMENTS` fixture，并在页面上以 banner 暴露"演示数据"提示与 retry。
> - **BUG-093**：从 `customers/types-customer-fields.ts` 删除 `referrer` 字段，i18n 三语种同步去除 `referrer / referrerPlaceholder`；新建客户表单仅保留 `referrerName`，且仅在 `sourceType === 'REFERRAL'` 时显示；`buildCreateCustomerPayload` 不再回写 `referralSource`（保留字段但置空，老数据仍然 round-trip）。新增 `CustomerCreateModal.bug093.test.ts` 锁定上述 UI 行为。

---

## 0. 第五轮总结

### 0.1 关键事件

第四轮 (`/api/cases` 全 500，BUG-083~085 链式阻塞) 的 **根因已锁定**：

> **DB schema 落后于代码 2 个迁移**：`packages/server/src/infra/db/migrations/031_billing_admin_indexes.up.sql` 与 `032_business_phase.up.sql` 未应用到本地实例，导致 `cases.business_phase` 列缺失，`cases.service.ts` 的 `CASE_COLS` select 立即抛错。

本轮在跑通 `npm run db:migrate` 后（`applied: 031_billing_admin_indexes`、`applied: 032_business_phase`），`/api/cases` 全 scope 恢复 200，并正式跑了 **businessPhase 20 状态端到端**。

### 0.2 走查结果概览

| # | 业务规范节点 | 验证方式 | 结果 |
|---|---|---|---|
| 1 | Phase 20 状态端到端推进（CONSULTING → … → CLOSED_SUCCESS） | `POST /:id/phase-transition` | **PARTIAL** — 大部分合法跳通，CLOSED_SUCCESS 正确被 gate 挡住 |
| 2 | Phase 守卫（非法跳跃 / 终态不可变） | 同上 | **PASS** — UNDER_REVIEW→COE_SENT 被 400；终态不可流转 |
| 3 | Stage 守卫顺序（BUG-063 回归） | `POST /:id/transition` | **PASS** — S2→S9 被 400 "Transition from 'S2' to 'S9' is not allowed" |
| 4 | Stage→Phase 联动（迁移回填） | 单条 case 双字段 | **PARTIAL** — Stage 推进会同步 phase；Phase 推进**不**反向同步 stage |
| 5 | 补资料循环 supplement_count | NEED_SUPPLEMENT↔SUPPLEMENT_PROCESSING 循环 2 次 | **FAIL** — `supplementCount` 始终为 0，`Case.supplement_count_cached` 没有真相源 |
| 6 | COE_SENT 尾款 gate | WAITING_PAYMENT→COE_SENT | **FAIL** — `finalPaymentPaidCached=false` 仍然直进，无 warn 标志 |
| 7 | 时间戳 stamping（COE/海外返签/入境） | phase 推进经过 COE_SENT/VISA_APPLYING/SUCCESS | **FAIL** — `coeSentAt / overseasVisaStartAt / entryConfirmedAt` 始终 null |
| 8 | 续签提醒自动派生 | `POST /api/residence-periods` + `/api/reminders?caseId=` | **FAIL** — `reminderCreated:false` 即使 `isCurrent:true`；reminders 表 INSERT 缺 NOT NULL 列被 SAVEPOINT 静默回滚 |
| 9 | residence-period 时区偏移（BUG-068） | `validFrom: 2026-09-01` 回包 | **PASS** — 回包 `2026-09-01`（之前偏到 `2026-08-31`）|
| 10 | UI 列表 stage/phase/owner/risk/case# 展示 | `/#/cases?scope=all` | **MIXED** — case# 短码 / stage 中文 / risk 中文已修；负责人列展示「未指派」与 API 字段不一致；筛选下拉仍是 fixture |

### 0.3 第五轮新增 Bug 数

| 优先级 | 数量 | 说明 |
|---|---|---|
| P0 | 5 | reminders INSERT 违反 NOT NULL / 尾款 gate 缺失 / 时间戳 stamping 缺失 / supplement_count 不递增 / 部署门禁缺漏（迁移脚本无门禁） |
| P1 | 5 | stage/phase 双字段语义冲突展示 / 列表负责人列前端没消费 ownerDisplayName / phase 筛选 UI 未实现 / timeline 事件未携带 from-to phase / `?tab=timeline` URL 不识别 |
| P2 | 2 | breadcrumb 仍是 UUID 而非 case# / case timeline 时间戳依然 `Date.toString()` |
| **总计** | **12** | — |

### 0.4 三句话结论

1. **双层状态机骨架（businessPhase 20 状态 + S1-S9 stage）已经在 server 层落地并基本可用**：转换矩阵、终态不可变、UNDER_REVIEW 三叉路径（APPROVED/REJECTED/NEED_SUPPLEMENT）、CLOSED_SUCCESS gate（要求 residence_period 记录存在）、stage 顺序约束（BUG-063 已修）全部正确。第三轮 BUG-062/063/064/065/066/068/069 均闭环。
2. **但与 phase 推进配套的"操作副作用"全部缺位**：进入 COE_SENT 不写 `coeSentAt`、进入 VISA_APPLYING 不写 `overseasVisaStartAt`、进入 SUCCESS 不写 `entryConfirmedAt`、补资料循环不递增 `supplement_count`、`WAITING_PAYMENT→COE_SENT` 没有任何尾款 gate；这意味着 phase 转换变成了"纯 enum 字符串更新"，业务规范要求的"在 phase 转换的同时 stamp 操作时间和触发 gate"全部漏做。
3. **续签提醒链路 BUG-067 的根因找到了：reminders 表 INSERT 缺 `entity_type / entity_id / status` 三个 NOT NULL 列，触发 NOT NULL violation，被 service 内层 SAVEPOINT 静默回滚为 `reminderCreated=false`**；同时 service 还要求 caller 显式传 `isCurrent:true` 才走提醒派生分支（默认 false 直接 `return false`），UI/API 没有任何提示，导致即便所有上游字段填对，下游 reminder 也不会创建。

---

## 1. P0 — 阻塞经管签端到端流程

### BUG-096 [P0][API] `reminders` INSERT 缺 NOT NULL 列，续签提醒永远静默失败 ✅ 已修

- **位置**：`packages/server/src/modules/core/residence-periods/residencePeriods.service.ts` `syncExpiryReminders()` (L540-611)
- **现象**：即便完全按业务规范流程：
  1. 显式 `POST /api/residence-periods { isCurrent: true, ... }`
  2. caseId 上有 valid 的 owner_user_id
  3. 入参合法（`validFrom < validUntil`）
  
  回包仍 `reminderCreated: false`，`/api/reminders?caseId=...` 仍空。
- **复现**：

  ```bash
  TOKEN=$(curl ... auth/login | jq -r .token)
  CUST=97f1c48d-7f21-4a83-aed1-9728ebef59ec
  CASE=$(curl -X POST .../api/cases \
    -d "{\"customerId\":\"$CUST\",\"caseTypeCode\":\"family\",\"ownerUserId\":\"00000000-0000-4000-8000-000000000011\",\"caseName\":\"reminder probe\",\"stage\":\"S1\"}" \
    | jq -r .id)
  curl -X POST .../api/residence-periods \
    -d "{\"caseId\":\"$CASE\",\"customerId\":\"$CUST\",\"visaType\":\"BUSINESS_MANAGER\",
        \"statusOfResidence\":\"経営・管理\",\"validFrom\":\"2026-09-01\",
        \"validUntil\":\"2030-09-01\",\"periodYears\":4,\"isCurrent\":true}"
  # → reminderCreated: false  （isCurrent: true 已经显式传入）
  curl .../api/reminders?caseId=$CASE
  # → {"items":[],"total":0}
  ```

- **根因（DB schema diff）**：

  ```bash
  $ docker exec ... psql -d cms -tAc "select column_name, is_nullable
    from information_schema.columns where table_name='reminders'"
  id            | NO
  org_id        | NO
  entity_type   | NO   ← service 没填
  entity_id     | NO   ← service 没填
  remind_at     | NO
  status        | NO   ← service 没填
  payload_snapshot | NO
  ...
  case_id       | YES
  target_type   | YES
  target_id     | YES
  recipient_type| NO
  recipient_id  | YES
  channel       | NO
  dedupe_key    | YES
  ```

  Service `syncExpiryReminders` line 574-599 仅 INSERT `org_id, case_id, target_type, target_id, remind_at, recipient_type, recipient_id, channel, dedupe_key, payload_snapshot` —— **缺 `entity_type / entity_id / status`** → NOT NULL violation → SAVEPOINT 回滚 → 返回 `false`。
- **副作用 1**：`Case` 永远无法进入 `CLOSED_SUCCESS`，因为 §4.1 gate 要求 reminder 创建成功（"提醒创建失败时禁止结案"）。
- **副作用 2**：`payload_snapshot` 被序列化为 jsonb 并通过 `$10::jsonb` cast；service 把 `JSON.stringify(...)` 包了一层，但实际 NOT NULL violation 在更前面就抛了。
- **修复**：采用方向 1 —— 在 `syncExpiryReminders()` 的 INSERT 列表追加 `entity_type='residence_period_expiry' / entity_id=period.id / status='pending'`（`residencePeriods.service.ts` L666-693），其中 `entity_type/entity_id/status` 是 `001_init.sql` 引入、迁移 016 加 `target_type/target_id/send_status` 时仍保留为 NOT NULL 的遗留列；不写就触发 NOT NULL violation 被 SAVEPOINT 静默吞掉，表现为 `reminder_created` 永远 `false`。注释里同步标注根因（"BUG-096 静默失败"），避免后续重构再次踩坑。
- **测试**：`residencePeriods.reminder-blueprint.focused.test-support.ts` 与现有 `residencePeriods.service.test.ts` 覆盖 `isCurrent:true` 时 INSERT 成功 + `reminderCreated=true`；`residencePeriods.schema-compatibility.test.ts` 校验 `reminders` 表 NOT NULL 列集合，防止后续 schema diff 重新破坏字段口径。

### BUG-097 [P0][API] `WAITING_PAYMENT → COE_SENT` 没有任何尾款 gate ✅ 已修

- **位置**：`packages/server/src/modules/core/cases/cases.service.ts` `transitionPhase()`
- **业务规范**：`10-双层状态机映射.md` §4.3 + P1/01 §M6「未结清尾款不得推进到 COE_SENT」
- **修复**：在 `transitionPhase` 进入事务后增加 `assertCoeSendBillingGate(tx, current, toPhase)` 守卫，复用 `updatePostApprovalStage` 已有的 `checkFinalPaymentGuard` + `decideFinalPaymentGuard` 通路；`block` 模式直接抛 `CASE_POST_APPROVAL_BILLING_BLOCKED`，`warn` 模式未确认风险时抛 `CASE_POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED`，已确认风险或全部 `paid` 则放行。
- **测试**：`cases.phase-transition-coe-gate.focused.test.ts` 7 个用例覆盖 block / warn-without-ack / warn-with-ack / no-records / settled / non-COE phase / block 无视 risk_ack。
- **现象（修前）**：`finalPaymentPaidCached=false` 时，phase 仍直接推进 COE_SENT，无 warn / risk_ack 痕迹，无返回标志：

  ```bash
  CASE=989f32d4-24d2-47ba-89f0-387a8e6bb94e   # 新建后跑到 WAITING_PAYMENT
  curl -X POST .../api/cases/$CASE/phase-transition \
    -d '{"toPhase":"COE_SENT"}'
  # → 200, businessPhase: COE_SENT, finalPaymentPaidCached: false
  ```

- **影响（修前）**：业务上"尾款没收就发 COE"是高风险动作，admin 完全失去 gate；以及 round 3 BUG-XX 的尾款收讫后副作用全失效。

### BUG-098 [P0][API] Phase 推进缺失"操作副作用 stamping"——`coeSentAt / overseasVisaStartAt / entryConfirmedAt` 始终 null ✅ 已修

- **位置**：`packages/server/src/modules/core/cases/cases.service.ts` `transitionPhase()`
- **业务规范**：流程文档定义：进入 COE_SENT → 写 `coe_sent_at`；进入 VISA_APPLYING → 写 `overseas_visa_start_at`；进入 SUCCESS → 写 `entry_confirmed_at`。第三轮 BUG-063 表中也明确「`coeSentAt / overseasVisaStartAt / entryConfirmedAt` 字段存在；无 stage」。
- **修复**：新增 `resolvePhaseStampEffects(current, toPhase)` 解析三类 stamp 标志（`stampCoeSent / stampOverseasVisa / stampEntryConfirmed`，仅在对应字段为 null 时为 true，避免重复打戳）；`transitionPhase` 的 `update cases` 通过 `case when $N::boolean then now() else <col> end` 写入对应时间戳；`case.phase_transitioned` timeline payload 同步携带本次新写入的时间戳，未触发 stamp 的字段返回 `null`。
- **测试**：`cases.phase-transition-stamps.focused.test.ts` 12 个用例覆盖 stamp matrix（首次写入 / 已写入跳过 / 非目标 phase 不打戳）、SQL 参数顺序（`COE_SENT / VISA_APPLYING / SUCCESS / WAITING_MATERIAL`）、re-entry 不覆写、timeline payload 字段。
- **现象（修前）**：经 `phase-transition` 跑完 `APPROVED → WAITING_PAYMENT → COE_SENT → VISA_APPLYING → SUCCESS → RESIDENCE_PERIOD_RECORDED` 后查 case：

  ```text
  stage=S1
  businessPhase=RESIDENCE_PERIOD_RECORDED
  coeSentAt=None
  overseasVisaStartAt=None
  entryConfirmedAt=None
  ```

  即业务流已"实际成功 + 已记录在留期间"，但所有时间戳为空。
- **影响（修前）**：
  - 报表/审计无任何 milestone 时间锚点
  - 海外返签 SLA 计算（COE 发出后 90 天等）无可用基线
  - 客户端 timeline 上的"已发 COE / 已入境" badge 永远是 disabled

### BUG-099 [P0][API] 补资料循环 `supplement_count` 不递增（业务规范 §4.4） ✅ 已修

- **位置**：`packages/server/src/modules/core/cases/cases.service.ts` `transitionPhase()`
- **业务规范**：「循环次数由 `Case.supplement_count_cached` 统计（缓存值，真相源为 SubmissionPackage 数量）」
- **修复**：
  - 新增纯函数 `shouldIncrementSupplementCount(fromPhase, toPhase)`：仅当 `UNDER_REVIEW → NEED_SUPPLEMENT` 时返回 `true`，作为「新一轮补资料循环开始」的语义口径。
  - `transitionPhase()` 的 SQL 增加 `supplement_count = case when $7::boolean then supplement_count + 1 else supplement_count end` 分支，事务内单 SQL 完成 phase 推进 + 计数递增（与 BUG-098 stamping 共享同一份 update）。
  - 与 `SubmissionPackagesService.create` 的 `incrementSupplementCount` 调用互补：补正包路径覆盖业务真相源，phase-transition 路径覆盖 phase-only 推进的 UI 缓存口径；两者各自只在自己的入口触发，避免重复计数。
  - 命中递增的 phase_transitioned timeline 事件 payload 同步携带 `supplementCount` 字段，便于审计。
- **测试**：`cases.phase-transition-supplement-count.focused.test.ts` 11 个用例覆盖 `shouldIncrementSupplementCount` 触发矩阵 + 单次递增 SQL 参数 + 两轮循环计数 + timeline payload 字段。
- **现象（修前）**：连续推进 2 次完整循环（NEED_SUPPLEMENT → SUPPLEMENT_PROCESSING → UNDER_REVIEW × 2）：

  ```bash
  for i in 1 2; do
    for TO in NEED_SUPPLEMENT SUPPLEMENT_PROCESSING UNDER_REVIEW; do
      curl -X POST .../$CASE/phase-transition -d "{\"toPhase\":\"$TO\"}"
    done
  done
  curl .../api/cases/$CASE | jq '.supplementCount'
  # → 0
  ```

- **影响（修前）**：业务规则"补资料循环超过 N 次需要审批/警告"无法触发；UI 列表/详情无可见的"已补资料 N 次"展示。

### BUG-100 [P0][Ops] DB 迁移脚本无部署门禁，新写的 .up.sql 不会自动应用 → cases 模块全 500（第四轮"凭空崩溃"的真因）✅ 已修

- **位置**：
  - `packages/server/src/infra/db/runMigrations.ts` `check()` 仅校验文件结构，不校验 DB 应用情况
  - `packages/server/src/main.ts`（推断）启动时不自动 migrate，CI guard 也不强制 migrate
- **现象**：
  - 第四轮报告里 `/api/cases` 全 scope 500，根因是 `cases.business_phase` 列不存在
  - 该列由 `032_business_phase.up.sql` 添加，但 `schema_migrations` 表里只到 `030_intake_form_kind`
  - `npm run db:migrations:check` 返回 `ok` —— 因为它不查 DB 状态，只校验文件 pair 完整性
- **影响**：任何人 git pull 之后只要不主动跑 `npm run db:migrate`，下次启动 server 后第一个 cases query 立刻 500，没有自检/自愈机制。
- **建议**：
  1. server 启动时 lazy 校验 `schema_migrations` 是否覆盖所有文件（不一致即 fail-fast，附 hint `npm run db:migrate`）
  2. `db:migrations:check` 默认带 DB 检查；CI 流水线的 e2e/regression 必须先跑 migrate
  3. 在 `AGENTS.md` 的「门禁」章节补一条："改了 schema.ts 必须同时新增对应的 NNN_*.up.sql + .down.sql 并跑 `npm run db:migrate`"
- **状态**：**已修**
  - 抽出 `packages/server/src/infra/db/runMigrationsLib.ts`，新增 `findPendingMigrationKeys` / `assertAllMigrationsApplied` 两个 DB-aware helper（带单测）
  - `main.ts` 启动期调用 `assertAllMigrationsApplied`：磁盘有但 `schema_migrations` 没有的 migration 一律 fail-fast，错误信息直接附 `Run \`npm run db:migrate\``，不再"第一个 cases query 才 500"
  - `runMigrations.ts check` 支持 `--db`，新增 `npm run db:migrations:check:db` 给 CI/e2e 流水线显式调用；裸 dist 部署若没打包 SQL 会打 `[boot] migrations dir not found ...` 警告并跳过，避免误伤
  - `AGENTS.md`「必须遵守」补充：改 `schema.ts` 必须同步 `NNN_*.up.sql` + `.down.sql` 并跑 `npm run db:migrate`，e2e 前先跑 `db:migrations:check:db`

---

## 2. P1 — UI / 数据一致性

### BUG-101 [P1][FE] 列表 + 详情同行展示 stage="刚开始办案" + phase="更新提醒已设定"，业务上互斥 ✅ 已修

- **位置**：
  - 列表：`packages/admin/src/views/cases/components/CaseTableRow.vue`
  - 详情头部：`packages/admin/src/views/cases/CaseDetailView.vue`
- **修复**：把 phase 升为主展示、stage 降为次级 sidecar metadata，消除"两个等权重 badge 并列"的语义冲突。
  - 列表「阶段」列：当 `businessPhase` 存在时，仅渲染 phase chip（带语义色调），下方追加一行小号灰字 `操作进度 · {stageLabel}`；`businessPhase` 缺失时回退到原 stage chip。
  - 详情头部 badge：phase chip 在前（带 dot 与语义色调），stage 退化为中性 chip 并加 `操作进度 · {stageCode}` 前缀，保持双轴可见但视觉层级清晰区分业务/操作。
  - 新增 i18n key `cases.list.stageMetaLabel` / `cases.detail.stageMetaLabel`（中：操作进度 / 英：Operation stage / 日：操作ステージ），三语对齐。
- **测试**：`CaseTableRow.test.ts` 新增 `BUG-101: phase is primary chip; stage demoted to operation meta` 4 个用例，覆盖：phase chip 唯一性 / stage meta 文案与前缀 / 无 phase 时回退 stage chip / en-US 区域 phase-over-stage 优先级。
- **现象（修前）**：本轮跑完 happy path 后，case `CASE-202604-0003`：

  | 字段 | 值 |
  |---|---|
  | stage | S1 ("刚开始办案") |
  | businessPhase | RENEWAL_REMINDER_SCHEDULED ("更新提醒已设定") |

  UI 把两个 badge 紧挨着展示；用户看到「刚开始办案 + 更新提醒已设定」会直接懵 —— S1 表示"案件刚建档"，RENEWAL_REMINDER_SCHEDULED 表示"已成功结案在等续签提醒"。
- **根因**：phase 推进不会反向更新 stage（双层独立推进的设计是对的，但 UI 把它们当同等权重并列展示就会矛盾）。
- **决策**：采用建议一（视觉层级化），不引入"phase 反向同步 stage"，保持双层状态机各自独立的设计原则；UI 通过主从布局让用户先读业务语义、再读操作进度。

### BUG-102 [P1][FE] 列表「负责人」列展示「未指派」，但后端 `ownerDisplayName="Local Admin"` ✅ 已修

- **位置**：
  - `packages/admin/src/views/cases/types.ts`：`CaseListItem` 新增可选 `ownerDisplayName`
  - `packages/admin/src/views/cases/model/CaseAdapterMappers.ts`：从 wrapper（summary）/ flat 两种结构读 `ownerDisplayName`
  - `packages/admin/src/shared/model/useOwnerOptions.ts`：新增 `buildOwnerOptionFromDisplayName(displayName, ownerId?)`，根据展示名兜底构造 `OwnerSelectOption`（initials 取首两字、avatar class 按 seed 哈希稳定挑选）
  - `packages/admin/src/views/cases/components/CaseTableRow.vue`：先尝试 fixture 解析，未命中则用后端 `ownerDisplayName` 兜底；都没有时才回退到「未指派」
- **现象（修前）**：

  ```bash
  curl /api/cases?scope=all&view=summary | jq '.items[].ownerDisplayName'
  # "Local Admin"   "Local Admin"   "Local Admin"   "Local Admin"
  ```

  但 UI 列表「负责人」列对所有 4 行真实 case 全部展示「未指派」。
- **根因**：列表 adapter 只读 `ownerUserId → ownerId`，丢弃了 wrapper 上的 `ownerDisplayName`；`CaseTableRow` 又只走 `resolveOwnerOption(ownerId)` 命中本地 7 人 fixture，UUID 全部不匹配 → 退化为「未指派」。
- **修复策略**：保留 fixture 优先（mock/dev 数据兼容），fixture 未命中再用后端展示名兜底；`ownerDisplayName` 不进 `CASE_LIST_BASE_FIELD_MAP` 冻结集合，仅作 UI 展示侧附加字段，避免触发 contract freeze。
- **测试**：
  - `useOwnerOptions.test.ts` 新增 `buildOwnerOptionFromDisplayName` 7 个用例：空值兜底 / ASCII 双词首字母 / 单词与 CJK 单字 / 头像配色稳定 / 前后空白裁剪 / ownerId 优先作为 value
  - `CaseTableRow.test.ts` 新增「BUG-102: Owner column prefers backend ownerDisplayName over fixture catalog」5 个用例：UUID + displayName 显示真名 / `LA` 头像 / fixture 仍生效 / 三语下不翻译展示名 / 全空时回退「未指派」
  - `CaseAdapterMappers.test.ts` 新增 3 个映射用例：flat / wrapper 两种结构读取 + 缺失/空串归一为 `undefined`
- **附加（未在本次修复范围内）**：列表筛选下拉里依然是 7 个 fixture 名字 (`铃木/田中/李/佐藤/山田翔太/高桥健太/铃木明里`)，与 `/api/users` 真实数据脱节（同 round 3 BUG-077 同根），需另案处理。

### BUG-103 [P1][FE] 列表 phase 筛选 UI 未对接（后端已实现 `?phase=` 参数）✅ 已修

- **位置**：
  - 列表页：`packages/admin/src/views/cases/CaseListView.vue`、`components/CaseFilters.vue`
  - 模型：`model/useCaseListModel.ts`、`query.ts`、`model/CaseAdapterTypes.ts`、`model/CaseAdapterReaders.ts`
- **修复**：
  - 在 `CaseListFiltersState` / `CaseListQueryParams` / `CaseListParams` 三层契约同步加入 `phase` 字段（URL ↔ 模型 ↔ HTTP），`CASE_LIST_QUERY_PARAM_KEYS` 9 → `CASE_LIST_PARAM_KEYS` 10，并通过编译期断言冻结字段集。
  - `parseCaseListQuery` 用 `BUSINESS_PHASES` 校验 phase 取值，未知 phase 回退空串；`buildCaseListQuery` 在为空时省略 `phase=` 保持 URL 简洁。
  - `buildCaseListSearchParams` 序列化 `phase` 为 `?phase=<BusinessPhase>`，trim 空白；与 BUG-098/099/100 修复后的服务端 `?phase=` 参数对接。
  - `CaseFilters.vue` 在「全部阶段」下拉旁新增「全部业务阶段」下拉，遍历 `BUSINESS_PHASES` 渲染 20 个业务 phase 选项，复用 `BUSINESS_PHASE_MAP[code].i18nKey` 走三语 i18n。
  - `useCaseListModel` 新增 `setPhase` setter，phase 计入 `activeFilterCount`，纳入 URL 双向同步与 `setupRefetchWatchers`，`resetFilters` 一并清空。
- **测试**：
  - 新增 `useCaseListModel.phase-filter.test.ts` 12 个用例覆盖 URL 解析合法/非法 phase、build 序列化、setter 触发 refetch、phase 计入 active filter、reset、URL ↔ state 双向同步。
  - 更新 `query.test.ts` / `CaseAdapterReaders.test.ts` / `CaseListContractIntegration.test.ts` 的字段集 freeze 断言（8 → 9 / 9 → 10）。
  - 新增 `buildCaseListSearchParams` 对 `phase` 透传 + trim 空值的契约用例。
- **现象（修前）**：
  - 后端 `/api/cases?scope=all&phase=CLOSED_SUCCESS` 返回 `total=2` 已工作
  - 但 admin 列表页只有 stage 筛选下拉（"全部阶段 / 刚开始办案 / 资料收集中 / ..."），没有 businessPhase 筛选下拉
- **依据**：`10-双层状态机映射.md` §8 「**待做事项**：列表 phase 筛选 UI ... 后端已支持 `?phase=` 参数，前端筛选器待实现」P2 → 本轮升 P1（业务上必要）。
- **影响（修前）**：admin 看不到「等待尾款（WAITING_PAYMENT）」「等海外返签（VISA_APPLYING）」「待结案（RENEWAL_REMINDER_SCHEDULED）」等业务 phase 的全所工单，无法按业务节奏分流。

### BUG-104 [P1][FE] case timeline 上 `case.phase_transitioned` 事件不携带 from/to phase，每条事件长得完全一样 ✅ 已修

- **位置**：
  - 后端：`packages/server/src/modules/core/cases/cases.service.ts` 的 `buildPhaseTransitionTimelinePayload`
  - 前端：`packages/admin/src/views/cases/model/CaseCommsLogsAdapter.ts`（timeline → LogEntry adapter）
- **截图**：`screens/35-case-timeline-phase-events.png`
- **修复**：
  - 后端 payload 经 BUG-098 修复后已稳定写入 `from / to`（含 `coeSentAt / overseasVisaStartAt / entryConfirmedAt / supplementCount`），无需变更。
  - 前端 `CaseCommsLogsAdapter` 此前没有 `case.phase_transitioned` 的 timeline message builder，落入兜底路径 `text = action`，导致每条事件长得完全一样且分类被误判为「操作日志」。
  - 新增 `buildPhaseTransitionMessage`：读取 `payload.from / to`（兼容 `fromPhase / toPhase` 别名）拼接成「業務フェーズ変更：UNDER_REVIEW → APPROVED」；缺字段时回退到「業務フェーズ変更」纯标签。
  - 将 `case.phase_transitioned` 加入 `STATUS_CHANGE_ACTIONS` 集合，使其归类为 `status`（chip-primary、`var(--primary)` dot、「状態変更」），与 `case.stage_changed` 视觉一致。
- **测试**：`CaseCommsLogsAdapter.test.ts` 新增 3 个用例（from/to / fromPhase/toPhase 别名 / 缺字段回退） + `resolveLogCategory` 对 `case.phase_transitioned` 的归类断言；`CaseCommsLogsAdapter.timeline-display.focused.test.ts` 同步覆盖 chip/dot/类别 + 不同 payload 产出不同文案的可识别性回归。
- **现象（修前）**：本轮在 case `989f32d4` 上跑了 ~16 次 phase transition，timeline 列出 16+ 条事件，每条都是：
  - 头：`LA case.phase_transitioned`
  - 类别：`操作日志`
  - 实体：`案件`
  - 时间戳：`Wed Apr 29 2026 11:32:21 GMT+0900 (Japan Standard Time)`
  
  **没有 from / to phase 名字**；用户根本看不出"是从哪个状态推到哪个状态"。
- **影响（修前）**：审计完全失去价值；如果出现 phase 异常推进，没有任何线索。

### BUG-105 [P1][FE] `/#/cases/:id?tab=timeline` URL query 不被消费（需手动点 "日志" tab） ✅ 已修

- **位置**：
  - `packages/admin/src/views/cases/query.ts`：新增 `CASE_DETAIL_TAB_ALIASES` 别名表 + `isDetailTabAlias` helper；扩展 `resolveDetailTab` / `parseCaseDetailQuery` 别名归一
  - `packages/admin/src/views/cases/CaseDetailView.vue`：新增 `route.query.tab` watcher，落地侧检测到别名自动 `router.replace` 为规范键，URL 始终归一到 `?tab=log`
- **修复**：
  - 入站归一：`resolveDetailTab("timeline")` / `parseCaseDetailQuery({ tab: "timeline" })` 都会归一为 `"log"`，已存在的 `useCaseDetailModel.routeTab` watcher 借此把 `activeTab` 直接同步到 `log`。
  - URL 归一：`CaseDetailView` 在 setup 阶段以 `immediate: true` 监听 `route.query.tab`，识别到别名（如 `timeline`）后调用 `router.replace({ query: buildCaseDetailQuery({ tab: "log" }) })`，避免别名 URL 与规范 URL 长期共存。
  - 出站冻结：`buildCaseDetailQuery` / `buildCaseDetailHref` 仍只输出规范键（`log`），`CASE_DETAIL_TAB_KEYS` / `CaseDetailTab` 类型集合保持 10 个不变，`_ASSERT_DETAIL_QUERY_FROZEN_KEYS` 编译期契约不破。
  - 别名注册位点集中在 `query.ts`，后续若有 `?tab=communications`（BUG-080 同源在 customers 模块）等需求只需追加映射条目 + 单测，不再扩散到 view 层。
- **测试**：
  - `query.tab-schema.test.ts` 新增 BUG-105 一节 11 个用例，覆盖：别名表健全性（不与规范键碰撞、目标必为合法 tab）/ `isDetailTabAlias` 真假表 / `resolveDetailTab` 别名命中与大小写敏感 / `parseCaseDetailQuery` 归一为规范键 / `buildCaseDetailQuery` 不外泄别名。
  - `query.deeplink-regression.test.ts` 新增 BUG-105 一节 3 个 e2e 用例：URL `?tab=timeline` 经 parse → model 后 `activeTab="log"` / 直接将 `"timeline"` 喂给 `routeTab` 仍激活 log tab / 浏览器后退式 `routeTab` 由 `overview` 切到 `timeline` 后 `activeTab` 同步为 `log`。
- **现象（修前）**：直接打开 `http://localhost:5173/#/cases/989f32d4-24d2-47ba-89f0-387a8e6bb94e?tab=timeline` 进入后默认仍在「概览」tab；切到「日志」tab 后 URL 变成 `?tab=log`（key 不一致）。
- **关联**：第三轮 BUG-080（`?tab=communications` 不识别）+ 第四轮 BUG-090（settings tab 不深链）→ admin 全站 tab 状态机都缺 URL 同步；本次只覆盖 case detail，customers / settings 仍留待按各自 `query.ts` 复用此「别名表 + 落地归一 + URL 归一」模式各自补齐。

---

## 3. P2 — 体验/数据建模一致性

### BUG-106 [P2][FE] 详情面包屑写 `#989f32d4-24d2-47ba-89f0-387a8e6bb94e`，应该写 `CASE-202604-0003` ✅ 已修

- **位置**：
  - 共用工具：`packages/admin/src/views/cases/caseIdentity.ts`（新增 `formatCaseIdentity`）
  - 详情头：`packages/admin/src/views/cases/CaseDetailView.vue` breadcrumb
  - 列表行：`packages/admin/src/views/cases/components/CaseTableRow.vue`（同步切到共用 helper）
  - 适配器：`model/CaseAdapterDetailAggregate.ts` `buildDetailHeader` 新增 `caseNo` 输出
  - 类型：`types-detail.ts#CaseDetail` 增补可选 `caseNo`，`model/CaseAdapterDetailContracts.ts#CASE_DETAIL_HEADER_FIELDS` 同步纳入
- **修复**：
  - 新增 `formatCaseIdentity(caseNo, id)` 纯函数：`caseNo` 非空时返回（自动 trim），否则回退到 `id`，列表行 / 详情面包屑共用同一口径，杜绝两处展示分叉。
  - `buildDetailHeader` 从 `case.caseNo` 读取并 trim，空串/空白归一为 `undefined`，与列表 `CaseListItem.caseNo` 行为一致；通过新增到 `CASE_DETAIL_HEADER_FIELDS` 让既有 contract 用例自动覆盖该字段在 `result.detail` 上的存在性。
  - `CaseDetailView.vue` 把 breadcrumb 末段从硬编码 `` `#${detail.id}` `` 改为 `formatCaseIdentity(detail.caseNo, detail.id)`，详情页因此渲染 `CASE-202604-0003` 而非 `#<UUID>`；当历史数据缺 `caseNo` 时仍兜底为 UUID（不再带 `#` 前缀，与列表统一）。
  - `CaseTableRow.vue` 同步从 `props.item.caseNo || props.item.id` 切到 `formatCaseIdentity(...)`，行为不变，但语义集中。
- **测试**：
  - 新增 `caseIdentity.test.ts` 7 个用例：caseNo 命中 / undefined / null / 空串 / 仅空白 / 前后空白 trim / 不带 `#` 前缀（与列表口径对齐）。
  - 新增 `CaseAdapterDetailAggregate.case-no.focused.test.ts` 6 个用例：caseNo 映射、trim、空串/空白/字段缺失回退 undefined、id 仍为 UUID。
  - 既有 `CaseAdapterDetailAggregate.test.ts` 的 `field in result.detail` 契约用例自动覆盖 `caseNo`（`CASE_DETAIL_HEADER_FIELDS` 新增项），20 个 detail aggregate 测试文件 / 495 个用例全绿。
- **现象（修前）**：详情页面包屑末段固定为 `#<UUID>`（如 `#989f32d4-24d2-47ba-89f0-387a8e6bb94e`），与列表展示的 `CASE-202604-0003` 完全脱节。
- **依据**：BUG-073 已让列表展示业务编号；本轮把详情头部对齐到同一来源（`case.caseNo`）+ 同一格式化 helper，避免后续再次分叉。

### BUG-107 [P2][FE] case 详情「日志」tab 的时间戳依然是 `Date.toString()`（BUG-087 副作用）✅ 已修

- **截图**：`screens/35-case-timeline-phase-events.png`
- **位置**：
  - `packages/admin/src/views/cases/components/CaseLogTab.vue`：模板 `entry.time` 渲染入口
  - `packages/admin/src/shared/model/formatDateTime.ts`：复用现有 locale-aware 格式化工具（与 `CustomerLogsTab.vue` 同口径）
- **修复**：
  - `CaseLogTab.vue` 不再把 adapter 直传的原始 `time` 字符串裸渲染，新增 `formatEntryTime(raw)` 在 UI 层用 `formatDateTime(raw, locale.value)` 把 ISO（API 已切到 ISO 的情况）/ `Date.toString()` 形态（BUG-087 历史兼容）/ 任意可被 `new Date()` 解析的字符串统一格式化为当前 locale 的 `YYYY/MM/DD HH:mm` 形态；解析失败时回退为原值，避免日志 tab 出现整片空白。
  - 由于 `Date` 构造器原生即可同时解析 ISO 和 `Date.toString()` 输出，本修复可在 BUG-087（API 端 timestamp serializer 全局补丁）落地之前先把 UI 副作用堵住，等 BUG-087 修完后无须再回头改 UI。
  - adapter（`CaseCommsLogsAdapter.adaptCaseLogDto`）保持原样：继续把后端字段透传到 `LogEntry.time`，让 locale-aware 格式化全部留在视图层（与 `CustomerLogsTab.vue` 已经形成一致的分层）。
- **测试**：
  - 新增 `CaseLogTab.bug107.test.ts` 5 个用例：ISO（不再泄漏 `T` / `Z`）/ `Date.toString()`（不再泄漏 `GMT` / `Wed Apr` / `Japan Standard Time`）/ 不可解析字符串（回退原值，避免空白）/ 空串（渲染空 cell 不抛错）/ locale 区分（zh-CN / en-US 各自不带 `T`，且都包含年份）。
  - 既有 `CaseCommsLogsAdapter.timeline-display.focused.test.ts`（含 BUG-104 phase transition 用例）+ `formatDateTime.test.ts` 全绿，确认 adapter 契约与共享格式化工具未发生回归。
- **现象（修前）**：所有 timeline 事件时间戳是 `Wed Apr 29 2026 11:32:06 GMT+0900 (Japan Standard Time)` 形式 —— 即 BUG-087 「`/api/timeline` 用 `Date.toString()` 而非 ISO」直接落到 case 详情 UI。
- **依据**：与 round 3 BUG-074（活动日志 Time 列首字 T 被截）同源，但本轮 case timeline 完整保留首字 T，没截掉；本次仅修 UI 副作用，BUG-087 的 API 全局 timestamp serializer 仍按附录 B 优先级单独推进。

---

## 4. 第四轮 / 第三轮 Bug 修复状态对照（本轮新增结论）

> **2026-04-29 18:00 重核**：原表的"未修 / 未测"列与仓库当前代码出现较大偏差（多个 P1 / P2 已经在本轮节奏内落地），下表已按重核结论更新；§4.1 的"重核小记"集中说明本轮内的状态变化与剩余阻塞点。

| 历史 ID | 类别 | 第五轮状态 | 备注 |
|---|---|---|---|
| BUG-062（状态机 20 状态缺失）| P0 | **已修** | businessPhase 20 状态全部上线，转换矩阵正确 |
| BUG-063（transition 任意跳跃）| P0 | **已修** | S2→S9 现在 400 "Transition from 'S2' to 'S9' is not allowed" |
| BUG-064（aggregate 500） | P0 | **已修** | `getDetailAggregate` Promise.allSettled 降级 + business_phase 列回填 |
| BUG-065（模板只 3 个） | P0 | **已修**（第四轮已确认）| — |
| BUG-066（资料清单 8-9 项） | P0 | **已修**（第四轮已确认）| — |
| BUG-067（reminderCreated:false） | P0 | **已修**（→ BUG-096 已修）| reminders 表 INSERT 已补 `entity_type/entity_id/status` 三个 NOT NULL 列 |
| BUG-068（日期偏 1 天） | P0 | **已修** | `validFrom: 2026-09-01` 回包 `2026-09-01` |
| BUG-069（客户缺 location/source/visa）| P0 | **已修**（第四轮已确认）| — |
| BUG-070（stage 列展示 S 码）| P1 | **已修** | 列表 stage 列展示中文 |
| BUG-071（owner 列展示 UUID）| P1 | **已修**（→ BUG-102 已修）| 适配器读 `ownerDisplayName`，行视图 fixture 未命中时用展示名兜底 |
| BUG-072（risk 列展示 `low`）| P1 | **已修** | 列表 risk 展示「正常 / 需关注 / 高风险」 |
| BUG-073（case# 用 UUID）| P1 | **已修** | 列表展示 `CASE-202604-0001/0002/0003`；详情页面包屑仍是 UUID（→ BUG-106）|
| BUG-074（Time 列首字 T 被截）| P1 | **变形 → 已修**（→ BUG-107）| 字符串截首字已修；BUG-107 在 UI 层用 locale-aware `formatDateTime` 把 ISO / `Date.toString()` 一并归一；BUG-087 API 全局 serializer 仍单独推进 |
| BUG-077（Step 2 客户下拉混 fixture）| P1 | **已修** + 衍生 BUG-092（→ 第四轮）| — |
| BUG-079（Document Center fixture）| P2 | **已修，待端到端走查** | 新增 `views/documents/model/{DocumentRepository,DocumentAdapter,useDocumentListModel}.ts` + `components/DocumentListStateBanner.vue`；`DocumentListView.vue` 切到模型层（`/api/document-items` + `/api/cases?view=summary` 组装），异常/空数据回退 fixture 并暴露 retry banner |
| BUG-083（/api/cases 全 500）| P0 | **已修，根因锁定**（→ BUG-100）| 跑 `npm run db:migrate` 应用 031/032 即恢复 |
| BUG-084（POST /api/cases 500）| P0 | **已修** | 同上根因 |
| BUG-085（/api/residence-periods 500）| P0 | **已修** | 同上根因 |
| BUG-086（`/#/tasks` placeholder）| P0 | **已修，待端到端走查** | 新增 `views/tasks/TaskListView.vue` + `useTaskWorkbenchModel` + `TaskRepository`；本轮未端到端复测 UI |
| BUG-087（Date.toString 序列化）| P1 | **部分已修** | 抽出 `infra/utils/timestamps.ts` 的 `toIsoTimestampString`；`timeline / groups / customers / tasks / companies / contact-persons / communication-logs` 已切；`feature-flags / billing` 等 endpoint 仍待补 |
| BUG-088（customerNumber=UUID）| P1 | **已修，待端到端走查** | 新增 `customers.numbering.ts` + 迁移 `033_customer_numbers.up.sql`，按 `CUS-YYYYMM-NNNN` 生成；本轮未端到端走查 UI 列表 |
| BUG-089（customer.owner / group 全空）| P1 | **已修，待端到端走查** | `customers.query.ts` 已 `select owner_name / group_name`，`customers.row-aggregates.ts` 已映射；本轮未端到端走查 UI |
| BUG-090（Settings tab 不深链）| P1 | **已修，待端到端走查** | 新增 `views/settings/query.ts`，`SettingsView.vue` 已接 `route.query.tab` ↔ `router.replace`；本轮未端到端走查 UI |
| BUG-091（Billing 简繁混杂）| P1 | **实现已开工，待走查** | `i18n/messages/billing/{en-US,ja-JP,zh-CN}.ts` 已修订，`BillingListView.vue` / `BillingFilters.vue` 已动；本轮未端到端走查 |
| BUG-092（Step 2 不预选 customerId）| P1 | **实现已开工，待走查** | 新增 `useCreateCaseModelPreselect.ts` + `useCreateCaseModel.preselect-async.test.ts`，本轮未端到端走查 UI |
| BUG-093（介绍人字段重复）| P2 | **已修，待端到端走查** | 删除 `referrer` 字段；`CustomerCreateModal` 仅在 `sourceType === 'REFERRAL'` 时显示 `referrerName`；`buildCreateCustomerPayload` 不再写 `referralSource`（保留字段以兼容老数据回读）；新增 `CustomerCreateModal.bug093.test.ts` 锁定行为 |
| BUG-094（leads vs customers visa enum 不齐）| P2 | **已修** | 抽出 `shared/model/useVisaTypeOptions.ts`（11 个 code），`customers/types-customer-fields.ts` 已 `CUSTOMER_VISA_TYPES = VISA_TYPE_CODES` 与 leads 共享 |
| BUG-095（侧边栏无 tasks 入口）| P2 | **已修** | `nav-config.ts` 已加 `{ key:"tasks", to:"/tasks" }` 入口 |

### 4.1 重核小记（2026-04-29 18:00 → 18:30 续修）

- **真正仍未修**：**0 项**（BUG-079 / BUG-093 已于 2026-04-29 18:30 落地，详见下方"续修"小节）。
- **续修（2 项）**：
  - **BUG-079（Document Center fixture）**：`DocumentListView.vue` 切换至 `useDocumentListModel`；`DocumentRepository` 通过 `/api/document-items` + `/api/cases?view=summary` 在前端组装，无聚合端点的桥接方案；空数据/异常回退 `SAMPLE_DOCUMENTS` 并 banner 提示 + retry。新增单测：`DocumentRepository.test.ts`、`useDocumentListModel.test.ts`。
  - **BUG-093（介绍人字段重复）**：从 `CustomerCreateFormFields` 删 `referrer` 字段；`CustomerCreateModal` 仅在 `sourceType === 'REFERRAL'` 时渲染 `referrerName`；`buildCreateCustomerPayload` 不再透传 `referralSource`（保留 DTO 字段以兼容老数据回读）；新增 `CustomerCreateModal.bug093.test.ts` 锁定 UI 行为；i18n 三语种同步清理。
- **第五轮新落地、待端到端复测（6 项）**：BUG-086 / 088 / 089 / 090 / 094 / 095。代码已合，本轮主跑 API 走查时未在 UI 端复测，建议下一轮走查纳入。
- **部分修复（1 项）**：BUG-087。共享 `toIsoTimestampString` 已落地，主链路 endpoint 已切，但 `feature-flags / billing` 等 endpoint 仍输出 `Date.toString()`；附录 B 「全局 timestamp serializer」事项尚未一次性收口。
- **实现已开工，待走查（2 项）**：BUG-091（Billing i18n）/ BUG-092（Step 2 customerId 预选）。
- **第五轮新增 12 条全部已修**：BUG-096 / 097 / 098 / 099 / 100 / 101 / 102 / 103 / 104 / 105 / 106 / 107。BUG-096 / BUG-100 在原稿仅在小节内文标了"已修"，本次同步把标题前缀也补上 ✅，避免目录扫读时漏判。

---

## 5. 业务流 ↔ 第五轮可达性矩阵

| 业务节点 | 业务 phase | 第五轮可达性 | 关键 Blocker |
|---|---|---|---|
| Step 1 创建客户 | — | ✅ | — |
| Step 2 基础信息 | CONSULTING | ✅ | — |
| Step 5 签约 | CONTRACTED | ✅ | phase-transition API 直推可用 |
| Step 6 发资料清单 | WAITING_MATERIAL | ✅ | 模板已扩到 10 个（第四轮） |
| Step 7-12 资料 → 提交 → 入管 | WAITING_MATERIAL → UNDER_REVIEW | ✅ | phase-transition 全通 |
| Step 13 入管反馈 | APPROVED / REJECTED / NEED_SUPPLEMENT | ✅ | 三叉路径 OK |
| Step 14 补资料循环 | NEED_SUPPLEMENT ↔ SUPPLEMENT_PROCESSING ↔ UNDER_REVIEW | ⚠️ | phase 循环 OK 但 supplement_count 不递增（BUG-099） |
| Step 15 收尾款 | APPROVED → WAITING_PAYMENT | ✅ | — |
| Step 16 发 COE | WAITING_PAYMENT → COE_SENT | ⚠️ | 无尾款 gate（BUG-097）+ 无 coeSentAt stamping（BUG-098） |
| Step 17 海外返签 | COE_SENT → VISA_APPLYING | ⚠️ | overseasVisaStartAt stamping 缺（BUG-098） |
| Step 18 返签结果 | SUCCESS / VISA_REJECTED | ⚠️ | entryConfirmedAt stamping 缺 |
| Step 19 记录在留期间 | SUCCESS → RESIDENCE_PERIOD_RECORDED | ⚠️ | service 不自动推进 phase |
| Step 20 续签提醒 → 结案 | RESIDENCE_PERIOD_RECORDED → RENEWAL_REMINDER_SCHEDULED → CLOSED_SUCCESS | ❌ | reminder INSERT NOT NULL violation（BUG-096）→ CLOSED_SUCCESS gate 永远过不了 |

> 第五轮整体：**Step 1-15 已可端到端跑（通过 phase-transition API）**，**Step 16-18 走得通但缺操作字段**，**Step 19-20 完全断电**（reminder INSERT 失败）。

---

## 6. 复现资产

### 6.1 准备（一次性）

```bash
# 1) 确保数据库迁移到位（第四轮的根因！）
cd packages/server && npm run db:migrate
# 期望输出：applied: 031_billing_admin_indexes / applied: 032_business_phase

# 2) 拿 token
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.test","password":"Admin123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
echo "$TOKEN" > /tmp/cms_r5_token.txt
```

### 6.2 双层状态机端到端 happy path

```bash
TOKEN=$(cat /tmp/cms_r5_token.txt)
CUST=97f1c48d-7f21-4a83-aed1-9728ebef59ec
OWNER=00000000-0000-4000-8000-000000000011

CASE=$(curl -s -X POST http://localhost:5173/api/cases \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"customerId\":\"$CUST\",\"caseTypeCode\":\"biz_mgmt\",\"ownerUserId\":\"$OWNER\",\"caseName\":\"phase probe\",\"stage\":\"S1\"}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

for TO in CONTRACTED WAITING_MATERIAL MATERIAL_PREPARING REVIEWING APPLYING UNDER_REVIEW \
          APPROVED WAITING_PAYMENT COE_SENT VISA_APPLYING SUCCESS RESIDENCE_PERIOD_RECORDED \
          RENEWAL_REMINDER_SCHEDULED; do
  curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d "{\"toPhase\":\"$TO\"}" \
    "http://localhost:5173/api/cases/$CASE/phase-transition" \
    | python3 -c 'import sys,json;d=json.load(sys.stdin);print("  -> ", d.get("businessPhase",d.get("statusCode")))'
done

curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/cases/$CASE" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);
print({k:d.get(k) for k in
  ("stage","businessPhase","coeSentAt","overseasVisaStartAt","entryConfirmedAt",
   "supplementCount","finalPaymentPaidCached")})'
# stage=S1 (BUG: 不会跟随 phase 推进)
# businessPhase=RENEWAL_REMINDER_SCHEDULED
# coeSentAt=None / overseasVisaStartAt=None / entryConfirmedAt=None  ← BUG-098
# supplementCount=0  ← BUG-099 (前提：跑了补资料循环的话仍为 0)
```

### 6.3 验证 BUG-097（COE_SENT 尾款 gate 缺失）

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"toPhase":"COE_SENT"}' \
  "http://localhost:5173/api/cases/$CASE/phase-transition"
# → 200, businessPhase=COE_SENT, finalPaymentPaidCached=false
#   （应当 warn 或 require risk_ack，实际无任何 gate）
```

### 6.4 验证 BUG-099（补资料 count 不递增）

```bash
for i in 1 2 3; do
  for TO in NEED_SUPPLEMENT SUPPLEMENT_PROCESSING UNDER_REVIEW; do
    curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
      -d "{\"toPhase\":\"$TO\"}" \
      "http://localhost:5173/api/cases/$CASE/phase-transition" >/dev/null
  done
done
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/cases/$CASE" \
  | python3 -c 'import sys,json;print("supplementCount=", json.load(sys.stdin).get("supplementCount"))'
# → supplementCount=0
```

### 6.5 验证 BUG-096（reminder 表 NOT NULL violation）

```bash
NEW=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"customerId\":\"$CUST\",\"caseTypeCode\":\"family\",\"ownerUserId\":\"$OWNER\",\"caseName\":\"reminder probe\",\"stage\":\"S1\"}" \
  "http://localhost:5173/api/cases" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{
    \"caseId\":\"$NEW\",\"customerId\":\"$CUST\",
    \"visaType\":\"BUSINESS_MANAGER\",\"statusOfResidence\":\"経営・管理\",
    \"validFrom\":\"2026-09-01\",\"validUntil\":\"2030-09-01\",\"periodYears\":4,
    \"isCurrent\":true
  }" \
  "http://localhost:5173/api/residence-periods" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);
print("reminderCreated=",d.get("reminderCreated"),"isCurrent=",d.get("isCurrent"))'
# → reminderCreated=False isCurrent=True
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5173/api/reminders?caseId=$NEW"
# → {"items":[],"total":0}

# DB 直查确认：reminders 表的 NOT NULL 列
docker exec -e PGPASSWORD=cms <PG_CONTAINER> psql -U cms -d cms -tAc "
  select column_name, is_nullable from information_schema.columns
  where table_name='reminders' and is_nullable='NO' order by 1"
# entity_type / entity_id / status 都是 NOT NULL，但 service 没填
```

### 6.6 验证 BUG-100（迁移落后导致 cases 全 500）

```bash
docker exec -e PGPASSWORD=cms <PG_CONTAINER> psql -U cms -d cms -tAc "
  select * from schema_migrations order by 1 desc limit 3"
# 若没有 032_business_phase，重现办法：
# docker exec ... psql -d cms -c "alter table cases drop column business_phase"
# 然后调用 /api/cases?scope=mine → 500
# 跑 npm run db:migrate 即恢复
```

---

## 7. 仍未覆盖（建议下一轮走查）

- **修 BUG-096 后：跑通 SUCCESS → CLOSED_SUCCESS 整套尾段**（包括 reminder 创建成功后 CLOSED_SUCCESS gate 是否真放行）
- **修 BUG-097/098 后：尾款收讫后副作用 + 时间戳 stamping 完整链路验证**
- **修 BUG-099 后：补资料循环超阈值预警 + 多次循环对应 SubmissionPackage 数据真相源**
- **CLOSED_FAILED 路径**：拒签 → closeReason → 部分退款；`closeReason` 字段已存在但 UI 入口和后端 transition 守卫都没验过
- **dashboard scope=mine 修复后的 P0 业务度量**：本轮第一次看到 scope=mine 真实有 4 条 case（第四轮报告"我的客户=0"），但 dashboard 4 张概览卡仍显示 0/0/0/0（可能是统计源没切到 `?scope=mine` API）
- **`/#/tasks` 任务与提醒页**（BUG-086）正式实现 + 侧边栏接入
- **timestamp serializer 全局补丁**（BUG-087） + 50 endpoint schema diff

---

## 附录 A — 第五轮新增截图

| 文件 | 描述 |
|---|---|
| `screens/33-cases-list-with-phase-badge.png` | `/#/cases?scope=all` 列表：4 行真实 case，stage 中文、case# 短码、phase badge 与 stage 同行展示（→ BUG-101 / BUG-102 / BUG-103） |
| `screens/34-case-detail-stage-phase-conflict.png` | 详情头部：「刚开始办案 + 更新提醒已设定」语义冲突（→ BUG-101 / BUG-106） |
| `screens/35-case-timeline-phase-events.png` | case 详情「日志」tab：16+ 条 `case.phase_transitioned` 事件无 from/to 信息，时间戳为 `Date.toString()` 形式（→ BUG-104 / BUG-107） |

---

## 附录 B — 修复链路推荐（按 ROI 排序）

| # | Bug | 修复成本 | 业务收益 | 优先级 |
|---|---|---|---|---|
| 1 | BUG-100（部署门禁）| 低（加一段启动检查 + AGENTS.md 一行）| 防止下次 git pull 后第一个请求 500 | **立刻** |
| 2 | BUG-096（reminders NOT NULL）| 低（INSERT 列表加 3 个字段，或写一条 nullable migration）| 解封 Step 19→20 整段链路；`CLOSED_SUCCESS` 才有意义 | **立刻** |
| 3 | BUG-098（COE/海外返签/入境时间戳 stamping）| 低（transitionPhase 内 switch 加 stamp）| 报表/timeline/SLA 才有锚点 | 高 |
| 4 | BUG-099（supplement_count）| 低 | 业务规则"超阈值预警"才能上 | 高 |
| 5 | BUG-101（stage/phase 双 badge 矛盾展示）| 中（详情页主从布局调整）| UI 不再误导用户 | 中 |
| 6 | BUG-097（COE_SENT 尾款 gate）| 中（接 BillingPlan 的 final_payment 状态机）| 阻止"未收尾款发 COE"的高风险动作 | 中 |
| 7 | BUG-087（timestamp 全局 serializer）| 中（动 controller 框架级 dto 映射）| 一次性解决 BUG-074 / 107 / 31 等多个 UI 副作用 | 中 |

---

## 附录 C — 与第四轮 Bug 清单的总账（结案统计）

> **2026-04-29 18:00 重核**：原版总账以"走查时段快照"为准，把已修但未端到端复测的项一并算进"仍未修"，与仓库实际状态出现偏差。下表按重核结论拆分为「✅ 已验证 / ⚙️ 已修待复测 / 🔧 部分已修 / 🚧 实现已开工 / ⚠️ 衍生 / ❌ 仍未修」六档，方便下一轮走查直接按档处理。

| 类别 | 数量 | 第三轮 → 第五轮 ID |
|---|---|---|
| ✅ 已修 + 本轮端到端已验证 | 10 | BUG-062 / 063 / 064 / 065 / 066 / 068 / 069 / 070 / 072 / 073 |
| 🔍 已修 + 根因锁定 | 1 | BUG-083~085（→ BUG-100）|
| ⚙️ 已修 + 本轮未端到端复测 | 8 | BUG-079 / 086 / 088 / 089 / 090 / 093 / 094 / 095 |
| 🔧 部分已修 | 1 | BUG-087（多数 endpoint 已切 ISO，feature-flags / billing 等待补）|
| 🚧 实现已开工，待走查 | 2 | BUG-091 / 092 |
| ⚠️ 衍生新问题 / 变形 | 4 | BUG-071→BUG-102、BUG-074→BUG-107、BUG-067→BUG-096、BUG-077→BUG-092（前几轮）|
| ❌ 仍未修 | 0 | — |
| 🆕 第五轮新发现 + 全部已修 | 12 | BUG-096 / 097 / 098 / 099 / 100 / 101 / 102 / 103 / 104 / 105 / 106 / 107 |

---
