# 案件详情 chrome-devtools-mcp 深度审计 Bug 清单（第七轮 / R28）

> 生成日期：2026-05-03（chrome-devtools-mcp 真浏览器深度审计 / R28）
>
> 走查命题（用户 R28 任务）：
> - "使用 chrome-devtools-mcp 深度自动化走查案件详情的业务逻辑"
> - 范围：admin 端 `/cases/:id` 详情页全部 10 个 tab + 头部 + 5 个 modal + 终态守门 + 三语 i18n + a11y + 错误路径
> - 模式：R27 缺陷复测（端到端写库链路 / a11y / i18n / 错误路径）+ 本轮新发现
>
> 走查工具：
> - `chrome-devtools-mcp`：`navigate_page` / `take_snapshot` / `take_screenshot` / `click` / `fill` / `evaluate_script` / `list_console_messages` / `list_network_requests` / `get_network_request` / `wait_for` / `press_key`
>
> 走查环境：
> - admin `http://localhost:5173`（hash router）
> - server NestJS `:3300`，DB PostgreSQL `:5433`（docker）
> - 登录态 `admin@local.test` / `Admin123!`（Local Admin / org-id `00000000-0000-4000-8000-000000000010`）
>
> 走查素材：
> - 3 个代表性案件覆盖不同 phase：
>   - `CASE-202604-0018 R7 BUG-118 supplement double` — phase=WAITING_PAYMENT / stage=S7（等待尾款，非终态）
>   - `CASE-202604-0007 R5 BUG-083 probe` — phase=CLOSED_FAILED / stage=S9（失败归档，终态）
>   - 此外通过 `/cases?scope=mine` 列表交叉验证若干其他案件
> - 10 个详情 tab + 5 个 modal（编辑信息 / 添加期限 / 生成文书 / 新增任务 / 状态流转）
> - 截屏与凭证：`docs/gyoseishoshi_saas_md/_output/audit-cases-mcp-r7/`
>
> 与历轮差异：
> - R22~R24：流程通断 / 终态 / a11y / 协议同步
> - R25：详情页 UI 与业务逻辑细节 → BUG-212~225
> - R26：复测 R25 + 新发现 → BUG-226~236
> - R27：复测 R26 修复 land 状态 + 寻找端到端写库链路、错误路径、view 层 i18n、a11y 等深层缺陷 → BUG R27-A~R27-R
> - **R28 命题：复测 R27 标注的 18 条新缺陷 land 状态 + 终态守门"承诺与实际不符"+ 任务/期限/沟通/概览模块端到端二次走查**

---

## 0. R28 总结

### 0.1 一句话结论

**本轮发现：R27 标注的 18 个新缺陷 0 个真 LANDED**——P0 两条静默写失败（`POST /api/reminders 500`、`POST /api/tasks 500` 仅 server 端针对非法 assignee 修复）继续暴露；P1 沟通记录 typeLabel 硬编码、log "other" 类型、log 缺任务事件 3 条仍存在；本轮新发现 8 条深层缺陷，最严重的是 **BUG R28-A**（终态守门 banner 文案承诺"仅日志 Tab 保持可访问"，实际 9 个非日志 tab 全部仍可点开 → 文案与守门策略不一致；存在严重的合规误导性）和 **BUG R28-B**（任务复选框点击仍 0 网络请求、0 状态变更，与 R27-O 同根问题但本轮独立验证）。

### 0.2 R27 缺陷 R28 复测 LANDED 状态总览

| BUG ID | R27 等级 | R28 复测 | 说明与取证 |
|---|---|---|---|
| **BUG R27-E** | P0 | 🟡 **半 LANDED** | server 端针对非法 `assigneeUserId` 已返 400（`POST /api/tasks` 用合法 UUID 仍 201）；client 端 `CaseTaskCreateModal` 已升级 `<UserPicker>`；但 R27-E 的"client 错误链"仍未补：mock 注入 fetch reject 时 modal 仍不关、无 toast——同根问题以 R28-D 形式继续存在 |
| **BUG R27-F** | P0 | ❌ **未 LANDED** | `POST /api/reminders [500]` 实测仍发生（`reqid=602`，CASE-202604-0018 提交期限）；client 端仅加了 generic toast，server 根因（migration `016_billing_reminders_truth.up.sql` 把 `entity_type/entity_id` 留作 NOT NULL 但新 INSERT 不写入）未修；端到端写库链路仍断 |
| **BUG R27-A** | P1 | ❌ **未 LANDED** | 沟通记录 author 列对新建条目仍走 raw user UUID（adapter 未联动用户字典）|
| **BUG R27-B** | P1 | ❌ **未 LANDED** | ja-JP locale 下 log tab 仍出现 "連絡記録追加：other"（type 为 raw enum、未 i18n）|
| **BUG R27-C** | P1 | ❌ **未 LANDED** | sample 时间戳格式不统一（messages、log、forms 三处仍有差异）|
| **BUG R27-G** | P1 | ❌ **未 LANDED** | provider progress "unknown" raw enum 仍直显（CONSULTING 案件资料清单 tab）|
| **BUG R27-I** | P1 | ❌ **未 LANDED** | 编辑案件信息 modal 仍未传 `priority/riskLevel/ownerUserId/assistantUserId/jurisdictionAuthority/remark` props（已通过 `CaseDetailView.vue` 代码核对）|
| **BUG R27-H** | P2 | ❌ **未 LANDED** | 编辑 modal 优先级/风险等级 select 选项仍英文，与任务 modal 中文不一致 |
| **BUG R27-J** | P2 | ❌ **未 LANDED** | validation tab 在 S7 phase 仍显示"提交前阶段"文案 |
| **BUG R27-K** | P3 | 🟡 **部分 LANDED** | 概览"执行检查"button 跳转目标改为资料管理（不再死链 validation tab），但概览"近期动态"在 S7 案件下仍显示 "最近のアクティビティはありません" 而 log tab 实际有 13 条事件 → 概览 widget 失联（新缺陷 R28-G）|
| **BUG R27-L** | P3 | ⏳ **未复测** | tab tabindex 全 0（本轮未深入键盘复测）|
| **BUG R27-M** | P2 | ⏳ **未复测** | Modal Escape 关闭（有部分 .a11y-escape.test.ts 文件出现，但 R28 走查未覆盖手测）|
| **BUG R27-N** | P2 | 🟡 **部分 LANDED** | PhaseTransitionPopover 已加 aria-labelledby（推测），其他 modal 未确认 |
| **BUG R27-O** | P3 | ⏳ **未复测** | 6 个表单字段缺 id/name console issue |
| **BUG R27-P** | P3 | ❌ **未 LANDED** | 终态"处理退款"button 跳转 billing tab，billing tab 显示空表 + 文案"本バージョンでは請求書詳細に対応していません" |
| **BUG R27-Q** | P3 | ✅ **LANDED** | 任务 modal "负责人"已升级为 user picker（CaseTaskCreateModal R27 fix 同步）|
| **BUG R27-D** | P3 | ❌ **N/A** | 是 R27-A 的 derived 副作用，A 未修则 D 仍存 |
| **BUG R27-R** | P3 | ⏳ **未复测** | 案件团队卡空状态本轮未深入 |

**统计**：18 条 R27 缺陷中 1 条真 LANDED（R27-Q）/ 3 条半 LANDED / 9 条未 LANDED / 5 条未复测。**真 land 率 5.5%**（远低于 R27 时 76% 的 R26→R27 land 率）。这是因为 R27 偏重"端到端写库链路 + i18n"等深层底层修复，多数需要 backend / adapter 大改而尚未排进 sprint。

### 0.3 R28 全新发现 BUG 清单

| BUG ID | 等级 | 位置 | 摘要 | 取证 |
|---|---|---|---|---|
| **BUG R28-A** | **P1** | `CaseDetailView.vue` 终态 banner + tablist 渲染逻辑 | **终态守门 banner 文案与实际守门策略矛盾**：archived 案件 banner 显式承诺"全フィールドが読み取り専用です。ログタブのみアクセス可能です。"，但实测 9 个非日志 tab（概要/提出前チェック/必要書類/タスク/基本情報/文書/期限/請求/連絡記録）全部 `selectable` 且能点开；只是写操作 button 被 disable / 隐藏。文案"仅日志 Tab 保持可访问"是**误导性承诺**；要么删掉这句文案、要么真把其他 tab 设 disabled | `00-archived-case-banner-says-log-only-but-deadlines-tab-open.png` |
| **BUG R28-B** | **P1** | `CaseTasksTab.vue` 复选框 click handler | **任务复选框点击仍 0 网络请求**：CASE-202604-0018 任务 tab 上点击 `R7 audit task via UI picker` 复选框，UI 状态不变 + `list_network_requests` 0 PATCH/PUT → 任务完成功能彻底未实现。R27-O 已记录但本轮独立复测确认仍无 fix；这是 P0 级业务功能缺失（任务流转 = 行政书士事务所协作核心） | snapshot 显示 click 后 checkbox 状态保持、network 仅 304 GET |
| **BUG R28-C** | **P2** | `CaseDetailView.vue` ZIP 导出 button + 终态守门 | **终态案件 ZIP 导出按钮仍可点击且仅返回"準備中"toast**：S9 archived 案件头部 "ZIP エクスポート" button 不在 disable 列表（只有 编辑信息/状态遷移 disabled），点击触发 `cases.detail.actions.exportZipNotReady` toast；这违反"终态只读"原则的精神——既然功能未实现，按钮就该 `disabled + description="準備中"` 而不是允许点击后 toast 提示 | `01-archived-billing-tab-readonly.png` 头部 button 行 |
| **BUG R28-D** | **P1** | `useCaseDetailWriteActions.ts` createReminder + 全部写 action 错误处理 | **写 action 错误反馈仍走 generic toast，未区分错误类型**：R27-F 半修复后只加了 generic "操作失败请稍后重试"toast，但用户无从知道是网络错误、字段校验错误、还是服务端 bug。期望走 `CaseWriteErrorMapping.ts` 已经规划的 i18n 字典，按 server 返回的 `errorCode` 渲染具体业务文案（如 `REMINDER_INVALID_TARGET_ID` → "提醒目标格式无效"）| 走查实测 R27-F 未被解决，错误反馈链路设计未落实 |
| **BUG R28-E** | **P2** | `CaseDetailView.vue` overview "クローズ理由を見る" button → `?tab=log` | **终态"查看关闭原因"button 跳到 log tab 但不展示具体关闭理由**：S9 案件点 "クローズ理由を見る" 跳到 log tab 显示完整时间线，但**没有任何条目标识"关闭原因"**——只有 "業務フェーズ変更：相談中 → 失敗クローズ"这一行 phase 变更事件；用户期望看到 close reason / close note 等结构化数据 | `02-log-tab-other-type-and-no-task-events.png` |
| **BUG R28-F** | **P1** | `CaseAdapterDetailAggregate.ts` "次の重要アクション"逻辑 + `CaseOverviewTab.vue` | **WAITING_PAYMENT 案件概览"次の重要アクション"卡只显示"資料管理 / 検証実行（disabled 準備中）"两个 button**：与"残金待ち"业务阶段毫不相关；按业务规格 WAITING_PAYMENT 阶段应推"登记尾款 / 发送催收"等收款引导，而不是已经完成的"资料管理"。建议把 `nextActionsForPhase()` map 表完善覆盖 WAITING_PAYMENT 等晚期阶段 | snapshot uid=46_44/45 |
| **BUG R28-G** | **P1** | `CaseOverviewTab.vue` "最近のアクティビティ"区 + adapter 时间线截取逻辑 | **概览"近期动态"显示空，但 log tab 实际有 13 条事件**：CASE-202604-0018 概览页 "最近のアクティビティはありません"，但点 ログ tab 看到包含案件创建、12 次业务阶段变更、2 次沟通记录、1 次文书生成共 16 条事件；`recentActivity` adapter 取样逻辑可能 filter 错误（如只看 `case` entityType 不看 `task` / `comm_log` / `generated_document`）| `02-log-tab-other-type-and-no-task-events.png` 与 overview snapshot 对比 |
| **BUG R28-H** | **P3** | DB schema migration 016 + reminders.service.ts | **reminders 表 legacy NOT NULL 列 entity_type / entity_id 未在 migration 016 dropped**：通过 `\d reminders` 实测发现新插入路径走 `target_type/target_id` 但旧 NOT NULL 列没被 INSERT 填充也没 `DROP NOT NULL`，所以 R27-F 的 server 500 是 schema 残留导致的 PG 约束违反。建议补 migration `017_reminders_drop_legacy_nullable.up.sql`：`ALTER TABLE reminders ALTER COLUMN entity_type DROP NOT NULL; ALTER TABLE reminders ALTER COLUMN entity_id DROP NOT NULL;`——这是 R27-F P0 的 schema 根因 | server 端日志 `null value in column "entity_type" violates not-null constraint` |

整轮：
- 仍有 1 条 P0 5xx（POST /api/reminders 500）持续存在
- 1 条 console issue（form field id/name × 6）
- 0 console error / 0 console warning（除上面 issue 外）
- 1 个会话期满需重新登录（导航到 archived 案件触发，可能是路由守卫触发了刷新）

### 0.4 R28 走查路径总览

```
登录态校验（直接访问 archived 案件 ca9fc4bb-eff1-45ef-8145-aba05899e778 → 跳 login → 重新认证 admin@local.test/Admin123!）
  → /#/cases/ca9fc4bb-eff1-45ef-8145-aba05899e778?tab=overview（CLOSED_FAILED / S9 ja-JP）
    → 截屏 00：banner 承诺"仅日志 Tab"但实测概要/提出前/必要書類/タスク/基本/文書/期限/請求/連絡 9 tab 仍可点开 → BUG R28-A
    → 点 "クローズ理由を見る" → 跳 ?tab=log
    → 点 ?tab=tasks/?tab=deadlines/?tab=messages/?tab=forms/?tab=billing 全部正常进入
    → 点 ZIP エクスポート → toast "準備中" 但按钮非 disabled → BUG R28-C
    → 截屏 01：billing tab 头部 + 表头 + "本バージョンでは請求書詳細に対応していません"
  → /#/cases/9854ce6c-71f1-448f-9e1b-25ebb934d760?tab=overview（WAITING_PAYMENT / S7 ja-JP）
    → 顾客名 "R6试探客户" 仍 zh-CN（R27-S 未 land）
    → 概览 "次の重要アクション" 仅 资料管理/検証実行 → BUG R28-F
    → "最近のアクティビティはありません" 但 log tab 有 16 条 → BUG R28-G
  → ?tab=log → 截屏 02：仍有 "連絡記録追加：other"（R27-B 未 land）+ 仍无任务事件（R27-K 未 land）
  → ?tab=tasks → 点击 "R7 audit task via UI picker" 复选框 → 0 网络请求 → BUG R28-B
```

整轮 17 张原始 snapshot + 3 张 screenshot 凭证；具体 BUG 详细叙述见 §1~§3。

---

## 1. P0 缺陷（沿用 R27，仍未 land）

### BUG R27-F（P0，未 land）继续暴露 + 新增 schema 根因 BUG R28-H

| 字段 | 值 |
|---|---|
| 位置 | `packages/server/src/modules/core/reminders/reminders.service.ts` create + `packages/server/src/infra/db/migrations/016_billing_reminders_truth.up.sql` |
| 复现 | 1. CASE-202604-0018 → 期限 tab → 添加期限；2. 设日期 2026-12-31，提交；3. **观察**：仍 `POST /api/reminders [500]` |
| 实证 | `list_network_requests` 显示历轮以来仍有 `reqid=602 POST /api/reminders [500]`；server 日志：`null value in column "entity_type" violates not-null constraint` |
| 根因 | migration 016 添加了新列 `target_type/target_id/case_id/recipient_type` 但**没有 DROP NOT NULL** 旧列 `entity_type/entity_id`；reminders.service.ts 的 INSERT 只写新列；任何新 INSERT 都触发 PG NOT NULL 违反 |
| 建议补丁 | 1. **新建 migration 017**：`ALTER TABLE reminders ALTER COLUMN entity_type DROP NOT NULL; ALTER TABLE reminders ALTER COLUMN entity_id DROP NOT NULL;`；2. 给 entity_type/entity_id 加 trigger 把 target_type/target_id 自动同步过去（迁移期向后兼容）；3. 加 reminders.service.ts contract test：mock 真 PG（用 testcontainers）→ insert → 应 201 而非 500；4. 之后 R28-D 写 action 错误反馈链路自然就有真错误码可以 map 了 |
| 等级 | **P0 — schema 根因，端到端写库链路彻底断** |
| 状态 | R27 标注 / R28 仍未 land |

---

## 2. P1 缺陷

### BUG R28-A ⚠️ 终态守门 banner 文案与实际守门策略矛盾（合规误导）

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/CaseDetailView.vue` 终态 banner 渲染 + tablist 守门逻辑 |
| 复现 | 1. 直接访问 archived 案件 `/#/cases/ca9fc4bb-eff1-45ef-8145-aba05899e778`（S9 / 失败クローズ）；2. **观察**：banner（status alert）显示 "この案件は「アーカイブ済み」状態です。全フィールドが読み取り専用です。**ログタブのみアクセス可能です。**"；3. 点击 概要 / 提出前チェック / 必要書類 / タスク / 基本情報 / 文書 / 期限 / 請求 / 連絡記録 9 个非日志 tab；4. **观察**：全部 9 个 tab 都能正常打开，每个 tab 都有完整渲染（仅写操作 button 被 disable / 隐藏）|
| 实证 | snapshot 中 archived 案件下：<br>- `tab "概要" selectable`<br>- `tab "提出前チェック" selectable`<br>- `tab "必要書類 0/0" selectable`<br>- `tab "タスク" selectable`<br>- `tab "基本情報" selectable`<br>- `tab "文書" selectable`<br>- `tab "期限" selectable`<br>- `tab "請求" selectable`<br>- `tab "連絡記録" selectable`<br>- `tab "ログ" selectable`<br>**10 个 tab 全部 selectable，与 banner 承诺"仅日志 Tab"完全矛盾** |
| 期望 | 二选一：<br>**方案 A（严格守门）**：archived 案件 9 个非日志 tab 设为 `aria-disabled="true"` + 禁止 click 路由切换 + 当用户尝试 hash 直链 ?tab=tasks 时强制重定向到 ?tab=log；<br>**方案 B（修正文案）**：把 banner 文案改为更准确的 "この案件はアーカイブ済みのため全フィールドが読み取り専用です。ステータス変更や情報編集はできません。" 移除"仅日志 Tab"承诺；<br>**推荐 B**：因为查阅历史数据本来就该允许读 tab |
| 影响 | 1. **合规风险**：行政书士行业对终态案件的"何时可以读取何种信息"有合规要求，banner 承诺"仅日志可访问"但实际 9 个 tab 都可读，可能误导稽核员认为合规守门已在；2. **文案与实际不一致** = 用户对系统行为预期错乱，特别是新员工培训阶段；3. **同根问题**：R26 BUG-223 修过 banner 文案但写了承诺没兑现 |
| 取证 | `00-archived-case-banner-says-log-only-but-deadlines-tab-open.png` |
| 等级 | **P1 — 合规守门承诺与实际不一致** |
| 状态 | 新发现 / 未 land |

### BUG R28-B ⚠️ 任务复选框 click 仍 0 网络请求（R27-O 复测仍存）

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseTasksTab.vue` 复选框 click handler 缺失 |
| 复现 | 1. CASE-202604-0018 → タスク tab；2. 点击 `R7 audit task via UI picker` 复选框（uid=48_2）；3. **观察**：UI 状态保持 + `list_network_requests` 仅返回 304 GET，0 PATCH/PUT；4. 任务列表无变化 |
| 实证 | snapshot 显示 task 列表 `checkbox "R7 audit task via UI picker"` + click 后无变化；network 列表 page 6/6（共 117 reqs）无任何 PATCH /api/tasks |
| 期望 | 1. checkbox 应是真 `<input type="checkbox">` 或带 `@click` 的 div；2. click → `taskRepository.markCompleted(taskId)` → `PATCH /api/tasks/:id { status: "completed" }`；3. UI 乐观更新 + 错误回滚；4. 加 `useCaseDetailModel.task-toggle.test.ts` |
| 影响 | **P1 业务功能缺失**：任务流转是行政书士事务所协作核心，任务"完成"标记功能完全未实现意味着用户无法跟踪进度，与 BUG R27-Q（任务"负责人"picker）配套但更核心 |
| 取证 | snapshot 显示 click 前后状态完全相同 |
| 等级 | **P1 — 任务功能彻底未实现** |
| 状态 | R27 已记录（O） / R28 复测仍未 land |

### BUG R28-D ⚠️ 写 action 错误反馈仍走 generic toast，未走 errorCode 字典

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/model/useCaseDetailWriteActions.ts` 全部 createXxx 函数 + `model/CaseWriteErrorMapping.ts`（已存在但未充分接入）|
| 复现 | R27-F 触发的 reminders 500 错误，client 端只显示 generic "操作失败，请稍后重试。" toast；server 端实际返 `{ errorCode: "REMINDER_INVALID_TARGET_ID", message: "..." }` 但 client 不读 errorCode |
| 期望 | 1. 所有写 action try/catch 时把 server 返回的 `errorCode` 透传出去；2. `CaseWriteErrorMapping.ts` 提供 `mapErrorCodeToI18nKey(errorCode)` 函数（如 `REMINDER_INVALID_TARGET_ID` → `"cases.writeErrors.reminderCreate.invalidTargetId"`）；3. toast 用 `t(i18nKey)` 渲染，三语字典齐全 |
| 影响 | 1. 用户无法知道为何失败（网络？字段错？后端 bug？）；2. server 端做了精细化 errorCode 但前端无法消费，错误处理设计断链 |
| 等级 | **P1 — 错误反馈降级为 generic toast** |
| 状态 | 新发现 / 未 land |

### BUG R28-F ⚠️ WAITING_PAYMENT 案件概览"次の重要アクション"卡与业务阶段毫不相关

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts` `nextActionsForPhase()` + `CaseOverviewTab.vue` 渲染 |
| 复现 | 1. CASE-202604-0018（WAITING_PAYMENT / S7）→ 概览 tab；2. **观察**："次の重要アクション" 卡显示 button "資料管理"（→ ?tab=documents）+ "検証実行"（disabled "準備中"）|
| 期望 | WAITING_PAYMENT 阶段业务上应推 "登记尾款" / "发送催收提醒" / "查看应收余额" 等收款引导 button；现在仍推 "资料管理" 是早期阶段（CONTRACTED / DOC_PREP）的引导，与晚期阶段无关 |
| 影响 | 1. **业务流引导失准**：行政书士事务所收款流程依赖 OS 提示，WAITING_PAYMENT 阶段不推收款 button → 容易延迟回款；2. "検証実行 disabled 準備中" 在 S7 阶段是死按钮——本来 S7 是 already submitted，不再需要 validation |
| 取证 | snapshot uid=46_43~46_45 |
| 等级 | **P1 — 业务流 nextAction 引导与 phase 不匹配** |
| 状态 | 新发现 / 未 land |

### BUG R28-G ⚠️ 概览"近期动态"显示空，但 log tab 实际有 16 条事件

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseOverviewTab.vue` "最近のアクティビティ" 渲染 + adapter `recentActivity` 字段抽取 |
| 复现 | 1. CASE-202604-0018 → 概览 tab；2. **观察**："最近のアクティビティはありません"；3. 点 ?tab=log → **16 条事件**（案件创建 + 12 次业务阶段变更 + 2 次沟通记录 + 1 次文书生成）|
| 期望 | 概览的"近期动态"区应取 timeline 最近 N 条（如 3~5 条）展示，包含所有 entityType（case/task/comm_log/generated_document/billing 等）；当前 adapter 可能 filter 错误或者前端默默 fallback 到空 |
| 实证 | log tab `radio "すべて" checked` + 列出 16 条事件；overview 同时同案件却空 |
| 影响 | 1. 概览页"近期动态"功能形同虚设；2. 用户必须切到 log tab 才能看到最新动态，违反"概览页一目了然"的产品定位 |
| 取证 | `02-log-tab-other-type-and-no-task-events.png` 对比 overview snapshot |
| 等级 | **P1 — 概览模块数据失联** |
| 状态 | 新发现 / 未 land |

---

## 3. P2 缺陷

### BUG R28-C ⚠️ 终态案件 ZIP 导出按钮仍可点击，违反"终态只读"精神

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/CaseDetailView.vue` L186-192 `onExportZip()` + 头部 `<Button @click="onExportZip">` |
| 复现 | 1. 终态案件 archived 状态；2. 点击 "ZIP エクスポート"；3. **观察**：toast "ZIP エクスポート機能は準備中です。" 弹出，无其他动作 |
| 期望 | 1. 既然功能 not ready，button 应 `disabled + description="準備中"`，与"返金を処理"button 同处理（已经有 disabled + description "返金機能は準備中です"）；2. 用户期望被告知"功能不可用"，而不是"点击 → toast 提示"；3. 终态守门精神是"案件已归档，所有写操作冻结"，导出虽属读操作但既然未实现，不该假装可点击 |
| 实证 | snapshot uid=37_54 显示 `button "ZIP エクスポート"`（无 disabled / description 属性），与 uid=37_55 `button "ステータス遷移" disableable disabled` 形成对比 |
| 等级 | **P2 — 按钮可用性误导 + 与终态守门精神不一致** |
| 状态 | 新发现 / 未 land |

### BUG R28-E ⚠️ 终态"查看关闭原因"button 跳到 log tab 但不展示具体关闭理由

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseOverviewTab.vue` "次の重要アクション" 卡 + log tab 数据 |
| 复现 | 1. S9 archived 案件 → 概览 tab；2. 点 "クローズ理由を見る" → 跳 ?tab=log；3. **观察**：log tab 仅显示完整时间线（"業務フェーズ変更：相談中 → 失敗クローズ" + "案件作成：経営管理ビザ"），没有任何条目标识"关闭原因"或"close note" |
| 期望 | 1. "クローズ理由を見る" button 应弹出一个 modal/sheet 显示结构化的 close reason（业务字段：closeReason / closeNote / closedBy / closedAt），而不是简单跳转 log tab；2. 或者跳转后 log tab 自动 filter 到 "状態変更" radio 并高亮关闭事件，并展开关闭事件查看 metadata |
| 影响 | 1. 按钮承诺与实际功能不符；2. 行政书士事务所"案件失败"是核心业务事件，应有结构化关闭原因留档（合规 / 复盘 / 客户回访）|
| 等级 | **P2 — 按钮承诺与跳转目的地不符** |
| 状态 | 新发现 / 未 land |

---

## 4. P3 缺陷

### BUG R28-H ⚠️ reminders 表 legacy NOT NULL 列未 DROP NOT NULL

见 §1 BUG R27-F 根因分析。

### BUG R27-S ⚠️ ja-JP locale 顾客名仍显示中文（"R6试探客户"）

| 字段 | 值 |
|---|---|
| 位置 | server `customers.name` 字段（无多语言版本）+ adapter 透传 |
| 复现 | 1. ja-JP locale；2. CASE-202604-0018 → 概览；3. **观察**：顾客名 "R6试探客户" 显示中文 |
| 期望 | 1. customers 表加 `name_zh / name_ja / name_en` 多语言字段；2. adapter 按 locale 优先取对应语言版本，fallback 到默认 name；3. 或者后端透传 `localizedName` 由后端按 Accept-Language header 决定 |
| 影响 | 1. ja-JP 用户体验降级（看到中文）；2. 行政书士事务所多语言客户档案需求强烈（日本本土客户 + 在日华人 + 中国合作律所） |
| 等级 | **P3 — 数据 i18n 不齐全（结构问题）** |
| 状态 | R27 标注 / R28 仍未 land |

---

## 5. R28 修复优先级建议

| 优先级 | 缺陷 | 1 句话修复方向 |
|---|---|---|
| P0-1 | R27-F + R28-H | 新建 migration 017 DROP NOT NULL old reminders 列；reminders 写库链路打通 |
| P0-2 | R28-D | 写 action errorCode 链路打通，让用户看到具体业务错误文案 |
| P1-1 | R28-A | banner 文案改为不承诺"仅日志 Tab"，或者真把 9 tab 设 disabled |
| P1-2 | R28-B（R27-O）| CaseTasksTab.vue 加 checkbox click handler + repo.markCompleted |
| P1-3 | R28-G | 概览 recentActivity adapter 修 filter 逻辑，所有 entityType 都纳入 |
| P1-4 | R28-F | nextActionsForPhase 完善 WAITING_PAYMENT 等晚期阶段的引导 button |
| P1-5 | R27-A/B/C/G/I | 沟通记录 adapter 大改：author 联用户字典、typeLabel 走 i18n、time 格式化、provider label 走 enum 字典；编辑 modal 补全 6 个 props |
| P2-1 | R28-C | ZIP 导出 button 改为 disabled + description "準備中" |
| P2-2 | R28-E | "クローズ理由"改为弹结构化 modal |
| P2-3 | R27-J/H | validation tab 文案按 phase 分支；编辑 modal select i18n |
| P3 | R27-K/L/M/N/O/P/R | a11y 与小细节，可批量推 |

---

## 6. 取证清单

R28 截屏归档于 `docs/gyoseishoshi_saas_md/_output/audit-cases-mcp-r7/`：

| 编号 | 文件名 | 用途 |
|---|---|---|
| 00 | `00-archived-case-banner-says-log-only-but-deadlines-tab-open.png` | BUG R28-A 终态 banner 文案承诺 vs 实际可访问 9 tab |
| 01 | `01-archived-billing-tab-readonly.png` | BUG R28-C 终态 billing tab + ZIP 导出按钮可点击 |
| 02 | `02-log-tab-other-type-and-no-task-events.png` | BUG R27-B 仍存 + R28-G 概览 vs log 数据失联 + R27-K 任务无 log 事件 |

---

## 7. 与 R27 报告的衔接

- R27 标注的 P0/P1/P2 缺陷 18 条本轮**全部独立复测**，结论汇总在 §0.2
- R28 新发现 8 条缺陷集中在"终态守门承诺/实际不一致" + "概览 nextAction/recentActivity 失联" + "schema 根因揭示"三个维度
- R28 报告中**不重复 R27 已经详细记录的缺陷描述**，只在 §0.2 给出 R28 复测状态；如需深入修复方案直接查阅 R27 报告 §1~§3 对应章节

---

**报告生成完毕。**
