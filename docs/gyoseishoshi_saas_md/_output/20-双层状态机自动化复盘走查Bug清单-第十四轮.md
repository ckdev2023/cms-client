# 客户/案件模块（admin）— 双层状态机自动化复盘走查 Bug 清单（第十四轮 / 事务所流程驱动 e2e 走查 + R13 land 验收）

> 生成日期：2026-05-01（同日 chrome-devtools-mcp 复盘走查 + 事务所流程 Step 1-20 全链路驱动覆盖 + R13 §1 BUG-157~164 闭环验收）
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/19-双层状态机自动化复盘走查Bug清单-第十三轮.md` §1 BUG-157 / 158 / 159 / 160 / 161 / 162 / 163 / 164（8 条）
> - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md`（20 步状态机 / 数据结构 / 业务规则）
> - `docs/事务所流程/在留資格別必要情報一覧Ver2.中文规范版资料清单.md`（7 场景资料矩阵；本轮聚焦"经营管理签 4 个月认定"）
>
> 走查工具：`chrome-devtools-mcp`（`navigate_page` / `take_snapshot` / `evaluate_script` / `fill` / `click` / `list_console_messages` / `list_network_requests` / `get_network_request`）+ `curl`（HTTP API）+ 代码审查
> 走查环境：`http://localhost:5173/api`，本地 admin（`admin@local.test` / `Admin123!`）；后端 NestJS `:3300`，Vite 反代 `:5173`，PostgreSQL `cms-client-postgres-1` `:5433`
> 与第十三轮（`19-...md`）互为续篇；本轮**先验 R13 §1 全部 8 条**，再以经管签 4M（BMV-CERT-4M）流程为锚把 admin 全链路从「客户详情 → BMV 承接卡片 → 转正式案件 → Step 1-4 → 案件详情 → Tasks → 收费」走通，统一登记走查中暴露的**新偏差**与**R13 land 项实测验收差异**。
>
> 业务规则 ground 锚点已落在仓库内权威文档（biz-mgmt P1 落地清单 / 经营管理签签约前承接页面规格 / M8 在留期间与续签提醒 / M6 收费与 COE 门禁）；本文不直接陈述业务规则，仅以"产品规则 / 文档锚点"维度引用。

---

## 0. 第十四轮总结

### 0.1 R13 §1 全部 8 条实测验收（chrome-devtools-mcp 实测）

| # | R13 结论 | R14 实测 | 一句话 |
|---|---|---|---|
| BUG-157（侧栏 nav 缺 `Tasks & reminders` 入口） | R13 P2 [FE]（未修） | **✅ PASS** | 三语 sidebar 均渲染 `任务与提醒` / `Tasks & reminders` / `タスクとリマインダー`，`href="#/tasks"`，排在 `cases` 之后；`nav-config.ts:137-139` 注释已删除（zh-CN 取证：`{label:"任务与提醒",href:"#/tasks"}`）。|
| BUG-158（BMV 建案前置门禁数据缺失） | R13 ✅ FIX-LANDED | **✅ PASS** | R6 试探客户详情页 `经营管理签承接` 卡片渲染：`下一步=转正式案件并生成资料清单` / `建案门禁=已完成签约，可以进入正式建案` / `问卷=已回收` / `报价=已确认` / `签约=已签约` / 五个时间戳完整 `2026-04-30 13:11 (UTC)`；`/api/customers` POST 返回顶层 `bmvProfile.intakeStatus = "not_started"` 默认 14 字段齐全；migration 038 backfill 已 land。|
| BUG-159（建案 `cases.group_id` 不持久化） | R13 ✅ FIX-LANDED | **✅ PASS** | `/api/cases?scope=all` 19 行中 10 行 `groupId="ef21fdd2-1ffc-4a27-8b47-a640d6bd021c"`（R6 试探客户全部回填）；9 行 NULL 属于 Tani 无 group 客户；`/api/billing-plans` 3/3 行 `groupId` 非 null；BillingTable `所属 Group` 列三行 = `东京一组 / 东京一组 / 东京一组`（zh-CN）；migration 037 已应用。|
| BUG-160（`POST /api/cases` 500 错误映射） | R13 ✅ FIX-LANDED | **⚠️ PARTIAL** | BMV 门禁返 400 `CASE_BMV_GATE_BLOCKED` + 4 blockers ✅；PG `23503/23505/23514` 已映射 ✅。**但 PG `22P02`（invalid_text_representation）漏了**：admin UI 提交 `ownerUserId="suzuki"` 时仍走入 `console.error` + `InternalServerErrorException` 路径返 500（详见 BUG-173 + BUG-166）。|
| BUG-161（建案向导顶部 source 标签 raw UUID） | R13 P3 [FE/UX]（未修） | **✅ PASS** | en-US / zh-CN 三语下顶部均显示 `From customer profile · CUS-202604-0005 · R6试探客户` / `来自客户档案 · CUS-202604-0005 · R6试探客户`，UUID 已替换为 `customerNumber · displayName`；R13 取证的 `· 825d708f-dec5-443d-b987-63f0a62dae99` 已消失。|
| BUG-162（en-US BMV 缩写/全称语义重复） | R13 P3 [FE]（未修） | **✅ PASS** | en-US BMV-CERT-4M 标题 = `R6 Business Manager (CoE 4-month)`（无 `Certificate of Eligibility` 后缀）；`CoE` 已被识别为 `Certificate of Eligibility` 缩写映射。R13 取证的 `Business Manager (CoE 4-month) Certificate of Eligibility` 不复存在。|
| BUG-163（Tasks → Reminder log 表 raw UUID） | R13 P3 [FE/UX]（未修） | **⚠️ MOSTLY PASS** | Reminder cell 末尾 = `#eefe7803`（reminderId 短哈希）；Details cell `Case CASE-202604-0011` + `Recipient Local Admin` 已 i18n。**仍剩**：Details cell 同行 `Dedupe key residence_period:e00ea5d2-210a-4f65-a205-5d4e0da4cc7d` 直显 raw UUID（详见 BUG-171）。|
| BUG-164（POST/GET `customerNumber` 字段位置不对称） | R13 ✅ FIX-LANDED | **✅ PASS** | `POST /api/customers` 返 201 顶层 `customerNumber:"CUS-202605-0001"` + `baseProfile.customerNumber:"CUS-202605-0001"` 双写；返回体顶层字段集合包含 `id / displayName / legalName / phone / email / group / owner / bmvProfile / customerNumber / archivedCases / activeCases / totalCases / lastContactDate / lastContactChannel / sourceType / referrerName / visaType / nationality / gender / birthDate / referralSource / contacts / orgId / type / createdAt / updatedAt`，与 GET detail 完全对称。|

**统计**：8 条中 **6 条 ✅ PASS**（含 R13 标 ❌/未修但实测已 land 4 条：BUG-157 / 161 / 162 + BUG-137 跨轮 land），**1 条 ⚠️ PARTIAL**（BUG-160 漏 PG 22P02），**1 条 ⚠️ MOSTLY PASS**（BUG-163 dedupe key 漏）。

### 0.2 R13 ❌ FAIL / ⚠️ MOSTLY PASS 项跨轮 land 摘要

R13 §0.4「P1 偏差」唯一一条 BUG-137，R13 §1 与 §2.2 均标记 ❌ FAIL（继承），R14 实测已 land。建议 R13 文档同步更新或在 R14 收口时回灌：

| # | R13 标记 | R14 实测证据 |
|---|---|---|
| BUG-137（empty birthday → 400） | ❌ FAIL（继承） | `POST /api/customers` body `birthday=""` → 201 OK + `customerNumber=CUS-202605-0002` + 顶层 `birthDate=""`；body `birthday=null` → 201 OK + `birthday=null` 透传至 `baseProfile`；不再 400 + i18n key 错误 ✅。|
| BUG-149（zh-CN/ja-JP land，en-US 缩写 leftover） | ⚠️ MOSTLY PASS | en-US BMV-CERT-4M 标题已不含 `Certificate of Eligibility` 后缀（与 BUG-162 同源 land）。|

> **回灌动作**：BUG-137 R13 标 ❌ → R14 ✅；BUG-149 ⚠️ → ✅ 完整闭环（与 BUG-162 一并 land）。

### 0.3 本轮新增偏差（事务所流程 / R13 fix 边界 / case detail i18n 缺漏）

| # | 优先级 | 现象（一句话） | 根因（一句话） |
|---|---|---|---|
| **BUG-165** ✅ FIX-LANDED（2026-05-01） | P0 [FE/BE] | admin 建案向导 Step 1-4 全部走通，但 Step 4 点击「开始办案」仍 500：`POST /api/cases` body `ownerUserId="suzuki"` → server PG 报 `invalid input syntax for type uuid: "suzuki"`；admin UI 在 Step 4 toast `Failed to create case`。 | `packages/admin/src/views/cases/constants.ts:412-437` `CASE_OWNER_OPTIONS` 是 `// sample data, to be replaced by API` 静态 catalog（`suzuki`/`tanaka`/`li`/`sato` slug），加 `withCurrentUserOwnerOption` 注入的 `Local Admin` value 为 email；server `cases.service.ts#create` 没有像 `resolveExplicitGroupId` 那样把 `ownerUserId` 归一化为 `users.id` 真实 UUID，直接 SQL insert。 |
| **BUG-166** ✅ FIX-LANDED（2026-05-01） | P2 [BE] | 上述 22P02 错误未被 `wrapCreateError` 视为已知约束，最终走 `InternalServerErrorException` 路径返 500（不是 400）；R13 BUG-160 fix 留下边界缺口。 | `cases.service.ts:1430` `PG_KNOWN_CONSTRAINTS = ["23503", "23505", "23514"]` 漏 `22P02`（invalid_text_representation）；`23502`（not_null_violation）/ `22P02` 这类客户输入类约束都属于 400 范畴，但当前会 fallback 到 500。 |
| **BUG-167** ✅ FIX-LANDED（2026-05-01） | P2 [FE] | `CaseDetailView` Billing tab 内容三语共用中文硬编码：en-US 下整段裸露中文 `总费用 / 已收金额 / 未收金额 / 日期 / 类型 / 金额 / 状态 / 操作 / 发票信息 / 当前原型暂不展示发票详情。` | `packages/admin/src/views/cases/components/CaseBillingTab.vue:72/77/82/93/105/149/151` 直接写中文字面量未走 `t(...)`；`cases.detail.billing.*` i18n key 未注册。 |
| **BUG-168** ✅ FIX-LANDED（2026-05-01） | P2 [FE] | `CaseDetailView` Pre-submission check tab 内容三语共用中文硬编码：en-US 下裸露 `提交前检查校验通过，无阻断项 / 提交包（历史快照）暂无提交包记录 / 双人复核暂无复核记录 / 欠款风险确认记录 / 当前无欠款风险确认 / COE / 海外贴签 / 返签结果 / 当前案件未到该阶段 / 当前案件还在提交前或补正处理阶段，因此这里暂不展示 COE 发送、海外贴签和返签结果。切换到相应样例后可查看完整流程。` | `packages/admin/src/views/cases/components/CaseValidationSupport.vue:40/74/112/128-129/132-133` 多处 zh 硬编码；与 `CaseSubmissionPackages.vue` / `CasePreSubmissionCheck.vue` 同样需要 i18n 化。 |
| **BUG-169** ✅ FIX-LANDED（2026-05-01） | P2 [FE] | `CaseDetailView` Documents tab 空态文案中文硬编码：en-US 下裸露 `暂无资料登记 / 该案件尚未添加任何资料需求。请通过"登记资料"或"手动添加"开始建立资料清单。 / 登记资料 / 手动添加`。 | `packages/admin/src/views/cases/components/CaseDocumentsTab.vue:123/125/141/145/229/246` 直接写中文字面量。 |
| **BUG-170** ✅ FIX-LANDED（2026-05-01） | P3 [FE] | `CaseDetailView` Overview Customer 段第二行直显 group raw slug `tokyo-1`（应展示本地化名 `东京一组` / `Tokyo Team 1` / `東京一組`）；与 `breadcrumb` 处 `CASE-202604-0011` 形成对比反差。 | `CaseCustomerBackLink.vue:38-40` 直接渲染 `groupName`；server `/api/cases/:id` 当前下发的 `groupName` 字段是 raw slug（catalog id），admin 没有走 `resolveGroupLabel(groupName, locale)` 解析。与 BUG-136 / BUG-139 同族但在新位置出现。 |
| **BUG-171** ✅ FIX-LANDED（2026-05-01） | P3 [FE] | Tasks → Reminder log 表格 Details cell 末尾仍直显 `Dedupe key residence_period:e00ea5d2-210a-4f65-a205-5d4e0da4cc7d` raw UUID（reminderId 短哈希 + caseNo + recipientName 已 i18n，但 dedupe key 字段补漏未做）。 | `views/tasks/components/ReminderLogTable.vue` 在渲染 dedupe key 时按 `reminder.dedupeKey` 原样输出；建议把 UUID 部分替换为 caseNo / 在 hover tooltip 中展示原始 dedupe key。 |
| **BUG-172** ✅ FIX-LANDED（2026-05-01） | P3 [FE] | 案件列表 Type 列对未走 BMV 模板的旧 case 显示 `Business manager visa` / `Dependent visa`（visa 全小写）；BMV 模板 case 显示 `BMV (CoE 4-month)` 大写规范。文案大小写不一致。 | `getCaseTypeLabel(typeCode, locale)` 在 fallback 路径上把 `business_manager_visa` / `dependent_visa` 直译为 `Business manager visa` / `Dependent visa` 而非按 i18n catalog 映射；en-US 应统一 Title Case。 |
| **BUG-173** ✅ FIX-LANDED（2026-05-01） | P0 [FE] | admin 建案向导 Step 4 提交失败时，toast 仅显示 `Failed to create case` + `Failed to create case`（无 detail / 无 retry 引导），且失败后 model 仍卡在 Step 4，没有 inline error chip 把 `detail` 字段（`invalid input syntax for type uuid: "suzuki"`）暴露给运营，导致用户无法定位是 owner 字段问题。 | `CaseCreateView.vue:111-113` 在失败分支只取 `model.submitError.value`（来自 `CaseRepository.create` 的 `error.message`），未消费 server 返回的 `body.detail`；同时上游 `useCreateCaseModel.submit` 没把 server 错误结构化（`code` / `detail` 分开）抛上来。 |

### 0.4 总计偏差数

| 优先级 | 计数 | 摘要 |
|---|---|---|
| P0 | 2 | BUG-165 ✅ FIX-LANDED + BUG-173 ✅ FIX-LANDED |
| P1 | 0 | — |
| P2 | 4 | BUG-166 ✅ FIX-LANDED + BUG-167 ✅ FIX-LANDED + BUG-168 ✅ FIX-LANDED + BUG-169 ✅ FIX-LANDED |
| P3 | 3 | BUG-170 ✅ FIX-LANDED + BUG-171 ✅ FIX-LANDED + BUG-172 ✅ FIX-LANDED |
| **本轮新增** | **9** | **全部 ✅ FIX-LANDED（2026-05-01）** |
| **R13 land 出列** | **6** | BUG-157 / 158 / 159 / 161 / 162 / 164 ✅；BUG-137 跨轮 land ✅；BUG-149 ⚠️→✅ |
| **R13 边界遗漏** | **2** | BUG-160 ⚠️ PARTIAL（漏 22P02，→ BUG-166 ✅）；BUG-163 ⚠️ MOSTLY PASS（→ BUG-171 ✅）|

### 0.5 三句话结论

1. **R13 §1 8 条修复整体大幅 land 到位**：`6/8 ✅ PASS`，`2/8 ⚠️ 边界缺漏`（BUG-160 漏 PG 22P02 错误码、BUG-163 漏 dedupe key UUID 字段），`1 条跨轮 land`（R13 标 ❌ FAIL 的 BUG-137 已经在 R14 时返 201）。R13 的 P0 BUG-158 / P2 BUG-159、P2 BUG-160（部分）/ P2 BUG-164 / P2 BUG-157 / P3 BUG-161 / P3 BUG-162 全部经 chrome-devtools-mcp + curl + DB 直查三重验证已 land。
2. **事务所流程 Step 1-20 在 admin UI 端打通到 Step 18（建案向导 Step 4 复核页 + 「所有前提条件已满足，可以建案」）后，被 BUG-165 P0 卡死**——`ownerUserId` 字段在 admin 端是 catalog slug（`suzuki`/`tanaka`/`sato`/`li`）或 email（`admin@local.test`），server 端没有像 R13 v2 给 `groupId` 加的 `resolveExplicitGroupId` 那样补 `resolveExplicitOwnerUserId`，导致 PG 22P02 → BUG-166 又把它映射成 500 而非 400 → BUG-173 admin UI toast 无 actionable detail。三层联动让事务所流程在 R13 修完 BUG-158/159 之后立刻撞到下一道墙，仍然建不出新案件。
3. **三处 case detail tab 内容中文硬编码（BUG-167/168/169）+ 一处建案 owner UUID 解析缺口（BUG-165）+ 一处 PG 错误码漏映射（BUG-166）+ 三处 raw slug/UUID 直显（BUG-170/171/172）**叠加：从权威文档"经营管理签 P1 落地清单 §3.3 收费与 COE 门禁（M6）/§3.4 在留期间与提醒（M8-M9）"维度看，R14 的 P0 让"建立续签案件"到"复核 → 提交 → COE 门禁"这条主链在 admin 仍未端到端跑通；P2 i18n 缺漏在 en-US / ja-JP demo 场景下直接破坏多语合规。

---

## 1. 新增 Bug

### BUG-165 [P0][FE/BE] admin 建案向导 owner UUID 未解析，Step 4 提交永远 500 — ✅ FIX-LANDED（2026-05-01，server 对称补强）

- **优先级**：P0（事务所流程 Step 5 / 17 受阻；admin UI 端建案向导 Step 1-4 全部走通后，最后一步必然失败；R13 BUG-159 v2 修了 `resolveExplicitGroupId` 但没修对称的 `resolveExplicitOwnerUserId`）
- **chrome-devtools-mcp 取证（zh-CN）**：

  ```js
  // 1) navigate_page → /#/customers/825d708f-dec5-443d-b987-63f0a62dae99
  // 2) BMV 承接卡片显示「可建案」+「转正式案件」按钮可点 → click
  // 3) 跳转 /#/cases/create?customerId=825d708f-...&templateId=bmv&...&bmvIntakeStatus=ready_for_case_creation
  // 4) Step 1: 标题 = "R6试探客户 经营管理（认定 4 个月）"，下一步可点
  // 5) Step 2: 客户下拉 = "R6试探客户 / 东京一组" 选中 + Step 3 资料清单 18 项
  // 6) Step 3: Group 继承 = "东京一组" / 负责人默认 = "铃木" / 截止 2026-12-31 / 收费 150,000
  // 7) Step 4: 「签约前门禁」= 所有前提条件已满足，可以建案
  // 8) 点击「开始办案」
  // → toast: "案件创建失败 / Failed to create case"
  // → list_network_requests:
  //   POST /api/cases [500]
  //   request body:
  //   {"customerId":"825d708f-...","caseTypeCode":"biz_mgmt_cert_4m","ownerUserId":"suzuki","groupId":"tokyo-1","stage":"S1","dueAt":"2026-12-31","caseName":"R6试探客户 经营管理（认定 4 个月）","applicationType":"certification","quotePrice":150000}
  //   response body:
  //   {"code":"CASE_CREATE_FAILED","detail":"invalid input syntax for type uuid: \"suzuki\"","message":"Failed to create case"}
  ```

- **DB 直查 / API 反向**：

  ```sql
  -- users 表 username/email 是 UUID + email + name 列；cases.owner_user_id 是 UUID FK
  SELECT id, name, email FROM users WHERE name IN ('Suzuki', 'Tanaka', 'Local Admin') OR email = 'admin@local.test';
  -- → name='Local Admin' email='admin@local.test' id='00000000-0000-4000-8000-000000000011'
  -- → 'Suzuki' / 'Tanaka' / 'Li' / 'Sato' 在 users 表实际不存在（catalog 是前端 fixture）
  ```

- **根因**：
  1. `packages/admin/src/views/cases/constants.ts:412-437` 显式注释 `// sample data, to be replaced by API`，`CASE_OWNER_OPTIONS` value 是 `"suzuki" / "tanaka" / "li" / "sato"` slug；catalog 中 7 项 owner 实际并不存在于 server `users` 表。
  2. `packages/admin/src/shared/model/useOwnerOptions.ts:150-153` `buildCurrentUserOwnerValue` 在登录用户为 `Local Admin (admin@local.test)` 时把 `value` 设为 `email`（`admin@local.test`），同样不是 UUID。
  3. `packages/server/src/modules/core/cases/cases.service.ts#create` 在 `assertCreateRefs` / `insertCaseWithAutoNumber` 中直接把 `input.ownerUserId` 作为 UUID 写入 SQL（与 R13 v2 给 `groupId` 补的 `resolveExplicitGroupId` 双路径 SQL 不对称）。

- **业务对照**（依据 `docs/gyoseishoshi_saas_md/P1/02-经营管理签技术落地清单.md §3.3 收费与 COE 门禁（M6）` 与 `docs/gyoseishoshi_saas_md/P1/04-页面规格-客户经营管理签签约前承接.md §4. 操作列表`）：「转正式案件」是 BMV 承接卡片签约后立即触发的主按钮，"前置条件 = `signStatus = signed` → 跳转 `case/create.html` 并带上经营管理签模板参数"——当前 R14 BUG-165 让这条主链路在最后一步彻底失败；R13 BUG-158 fix 把承接卡片露出来了，但「转」过去之后还是建不出来。

- **修复方向**：
  1. **server 对称补强（首选 / 高优）**：在 `cases.service.ts#create` 的 `assertCreateRefs` 之前增加 `resolveOwnerUserId(tx, orgId, input.ownerUserId)`：双路径 `users.id::text = $2 OR users.email = $2 OR users.name = $2` 归一化为真实 UUID；不存在 → `BadRequestException(OWNER_NOT_FOUND)`；空字符串 / 空白 → 视同缺省（继承当前用户）。完全对齐 R13 v2 给 `resolveExplicitGroupId` 的 fix 模式。
  2. **admin 端补对称解析**：`CASE_OWNER_OPTIONS` 改为从 `/api/users?scope=org` 拉真实数据（value = users.id UUID + label = users.name 本地化）；`withCurrentUserOwnerOption` 注入项 value 改为 `currentUser.id` UUID。
  3. **migration / fixture**：补 `039_seed_owner_catalog_users.up.sql` 把 catalog 7 个 owner（Suzuki/Tanaka/Li/Sato/Yamada/Takahashi/Akari）作为真实 user 写入 `users` 表；或者删除 catalog 改纯动态。
  4. **错误信号**：在前 admin 端 owner dropdown 控件加 `:disabled="!option.userId"`，防止"假" catalog slug 进入提交。

- **测试补强**：
  1. server `cases.service.create.bug165.test.ts`：(a) ownerUserId="<合法 UUID>" → PASS；(b) ownerUserId="<email>" → 通过 email 匹配 → PASS；(c) ownerUserId="<不存在 slug>" → 400 `OWNER_NOT_FOUND`；(d) ownerUserId="" → 视同缺省，继承 `ctx.userId`。
  2. admin `useCreateCaseModel.bug165.test.ts`：mount 时调用 `getOwnerOptions` mock 必须返回带 `userId` UUID 字段的选项；submit 路径下 payload `ownerUserId` 必须是 UUID 而非 catalog slug。
  3. **e2e smoke**（chrome-devtools-mcp）：navigate_page → `/#/customers/<R6>` → click 「开始办案」 → BMV-CERT-4M → Step 1-4 → click 「开始办案」 → expect: `POST /api/cases` 201 + `Location` 头含 case id；失败时 toast 显示 `error.code` + `error.detail` 而非裸 `Failed to create case`（→ BUG-173）。

- **关联**：与 R13 BUG-159 v2 同源（owner 字段对称）；与 BUG-166（PG 22P02 漏映射）+ BUG-173（toast 无 actionable detail）三联动构成 R14 P0 链。

- **FIX-LANDED 实测（2026-05-01）**：
  - **修复范围**：仅落地"修复方向 #1"（server 对称补强 / 首选 / 高优）。`#2 admin owner 选项动态化` / `#3 catalog seed migration` / `#4 admin disable 假 slug` 留作后续清理项（不阻断 P0 主链）。
  - **代码改动**：
    - `packages/server/src/modules/core/cases/cases.types.ts`：`CASE_WRITE_ERROR_CODES` 新增 `OWNER_NOT_FOUND: "CASE_OWNER_NOT_FOUND"`。
    - `packages/server/src/modules/core/cases/cases.service.ts`：
      1. 新增 private `resolveOwnerUserId(tx, raw, fallbackUserId)`：`undefined/null/空白/current-user:` 前缀 → fallback 到 `ctx.userId`；其它入参走 `select id from users where id::text = $1 or lower(email) = lower($1) or name = $1 limit 1` 三路径归一化为真实 UUID；未命中 → `BadRequestException(CASE_OWNER_NOT_FOUND)`。完全对齐 `resolveExplicitGroupId` 模式。
      2. `create()` 入口在 `tenantDb.transaction` 内最先调用 `resolveOwnerUserId` 把 `input.ownerUserId` 替换为真实 UUID，并将 `inputWithOwner` 透传给 `assertCreateRefs` / `resolveCreateGroup` / `insertCaseWithAutoNumber`。
      3. `assertCreateRefs` 删除冗余的 `assertBelongsToOrg(tx, "users", input.ownerUserId)`（`resolveOwnerUserId` 已校验存在性 + 同 SQL 兼容非 UUID 入参，避免再次触发 PG 22P02）。
  - **测试补强**：新增 `cases.service.bug165-owner-resolve.focused.test.ts`，覆盖 6 个场景（a-f）：
    - (a) ownerUserId = 真实 users.id UUID → 透传写入 cases.owner_user_id
    - (b) ownerUserId = email → 通过 `users.email` 不区分大小写匹配归一化为 UUID
    - (c) ownerUserId = 不存在的 catalog slug `suzuki` → 400 `CASE_OWNER_NOT_FOUND`（不再 500，且错误消息含原始 slug 文本便于运营定位）
    - (d) ownerUserId = `"   "` 空白 → 视同缺省，继承 `ctx.userId`，不触发 SQL 查询
    - (e) ownerUserId = `current-user:Local Admin` 占位 → 视同缺省，继承 `ctx.userId`，不触发 SQL 查询
    - (f) SQL 模式锁定：`id::text = $1` + `lower(email) = lower($1)` + `name = $1` 三条件齐全
  - **回归**：`cases.service.bug159-group-inheritance.focused.test.ts`（6 PASS）+ `cases.service.bug160-create-error-mapping.focused.test.ts`（8 PASS，含 BUG-166 a-h）+ 本轮新增 6 PASS = 共 20 PASS。
  - **效果对照**：
    - 之前：`POST /api/cases body.ownerUserId="suzuki"` → 500 `{"detail":"invalid input syntax for type uuid: \"suzuki\""}`
    - 现在：同请求 → 400 `{"code":"CASE_OWNER_NOT_FOUND","message":"... ownerUserId \"suzuki\" does not match any active user in the organization"}`
    - 实际用户路径（admin UI 选 `Local Admin (admin@local.test)`）：`ownerUserId="admin@local.test"` → 走 email 匹配 → 真实 UUID → 201 OK，Step 4「开始办案」成功。
  - **未覆盖项（留作 followup）**：
    1. assistantUserId 走的仍是旧的 `assertBelongsToOrg("users", ...)`，输入 catalog slug 时仍会触发 PG 22P02 → 现已被 BUG-166 fix 映射成 400 `CASE_CREATE_FAILED + pgCode=22P02`（不再 500），但错误消息不像 owner 那样语义化。可在后续轮次补 `resolveAssistantUserId` 对称解析。
    2. 修复方向 #2/#3/#4（admin 端动态拉真实 users / catalog seed migration / disable 假 slug）未落地：dropdown 选 "Suzuki/Tanaka/Li/Sato/Yamada/Takahashi/Akari" 时仍会得到 400 `CASE_OWNER_NOT_FOUND`，但错误信号清晰、不再 500，符合 R14 BUG-160/166 的 4xx 契约。

---

### BUG-166 [P2][BE] `cases.service.ts#wrapCreateError` 漏 PG `22P02` 错误码（R13 BUG-160 fix 边界缺口） — ✅ FIX-LANDED（2026-05-01）

> ✅ **FIX-LANDED**（2026-05-01）：`PG_KNOWN_CONSTRAINTS` 数组下沉为类静态只读 map `PG_CLIENT_ERROR_REASONS`，覆盖 7 个客户输入类 SQLSTATE：`23503/23505/23514/23502/22P02/22008/22007`。命中即映射为 400 `CASE_CREATE_FAILED`，detail 同时携带 `source/constraint/pgCode/pgMessage`（新增 `pgMessage` 让前端拿到 PG 原始报错文本，便于 BUG-173 后续在 toast 暴露 actionable detail）。`bug160-create-error-mapping.focused.test.ts` 扩展 (f)/(g)/(h) 三个用例分别覆盖 22P02 / 23502 / 22008，全 8 用例 PASS。

- **优先级**：P2（开发/集成路径错误信息回退到 500，破坏 server 错误契约；用户层不可见但与 BUG-165 / BUG-173 联动）
- **API 取证**：

  ```bash
  POST /api/cases
  body: {"customerId":"825d708f-...","ownerUserId":"suzuki",...}
  → 500 {"code":"CASE_CREATE_FAILED","detail":"invalid input syntax for type uuid: \"suzuki\"","message":"Failed to create case"}
  # 应当映射为 400 + {"code":"CASE_CREATE_FAILED","detail":{"source":"pg","pgCode":"22P02","message":"invalid input syntax for type uuid: ..."}}
  ```

- **根因**：

  ```ts
  // packages/server/src/modules/core/cases/cases.service.ts:1430
  const PG_KNOWN_CONSTRAINTS = ["23503", "23505", "23514"];
  // ↑ R13 BUG-160 fix 仅覆盖 FK / unique / check 三种约束
  // 漏 22P02（invalid_text_representation，含 UUID 解析失败）
  // 漏 23502（not_null_violation）
  ```

  PG 错误码 `22P02` 是输入字面量与列类型不匹配（`invalid input syntax for type uuid`），属于客户输入类错误，应该映射为 400 BadRequest。

- **修复方向**：

  ```ts
  // packages/server/src/modules/core/cases/cases.service.ts:1430
  const PG_KNOWN_CONSTRAINTS = [
    "23503", // foreign_key_violation
    "23505", // unique_violation
    "23514", // check_violation
    "23502", // not_null_violation
    "22P02", // invalid_text_representation (e.g. invalid uuid)
    "22008", // datetime_field_overflow
    "22007", // invalid_datetime_format
  ];
  ```

  并扩展错误消息：

  ```ts
  message: `Failed to create case: ${pgCode === "22P02" ? "invalid input format" : ...}`
  ```

- **测试补强**：扩展 `cases.service.bug160-create-error-mapping.focused.test.ts`：
  - (f) PG 22P02（uuid 解析失败）→ 400 `CASE_CREATE_FAILED` + detail.pgCode === "22P02"；
  - (g) PG 23502（not null）→ 400；
  - (h) PG 22008（datetime）→ 400。
- **关联**：BUG-165（实际触发场景）；R13 BUG-160（同源 fix）。

---

### BUG-167 [P2][FE] `CaseDetailView` Billing tab 内容中文硬编码（en-US / ja-JP 裸露） — ✅ FIX-LANDED（2026-05-01）

- **优先级**：P2（en-US / ja-JP 多语合规破坏；任何 archived / billing 案件都中）
- **chrome-devtools-mcp 取证（en-US）**：

  ```js
  // navigate_page → /#/cases/df9d1e84-...?tab=billing ; locale=English
  document.querySelector('main').textContent.match(/[\u4e00-\u9fff]+/g);
  // → ["收费","总费用","已收金额","未收金额","日期","类型","金额","状态","操作","发票信息","当前原型暂不展示发票详情"]
  // 11 段中文裸露
  ```

- **根因**：

  ```vue
  <!-- packages/admin/src/views/cases/components/CaseBillingTab.vue:72,77,82,93,105,149,151 -->
  <div class="billing-tab__stat-label">总费用</div>          <!-- L72 -->
  <div class="billing-tab__stat-label">已收金额</div>        <!-- L77 -->
  <div class="billing-tab__stat-label">未收金额</div>        <!-- L82 -->
  <th>日期</th>                                              <!-- L93 -->
  <th>类型</th> <th>金额</th> <th>状态</th> <th>操作</th>    <!-- L93-105 -->
  <h3 class="billing-tab__invoice-title">发票信息</h3>       <!-- L149 -->
  <p>当前原型暂不展示发票详情。</p>                           <!-- L151 -->
  ```

- **修复方向**：把 7 段文案抽到 `cases.detail.billing.statTotal` / `statCollected` / `statOutstanding` / `tableHeader.{date,type,amount,status,actions}` / `invoice.title` / `invoice.placeholder` 等 i18n key；en-US / ja-JP 同步补 catalog。
- **测试补强**：扩展 `CaseBillingTab.test.ts`：mount with `locale="en-US"` → text 不含 `[\u4e00-\u9fff]+`；mount with `locale="ja-JP"` → 文案为日语等价。
- **关联**：与 BUG-168 / BUG-169 同族（case detail 各 tab 大段中文硬编码）。

- **FIX-LANDED 实测（2026-05-01）**：
  - **commit**：`de68cdf fix(admin/cases): bug-167 i18n CaseBillingTab billing labels`
  - **代码改动**：`CaseBillingTab.vue` 全部中文字面量抽到 `t("cases.detail.billing.*")` key；三语 catalog（`en-US.ts` / `ja-JP.ts` / `zh-CN.ts`）同步补全 `detail.billing.{statTotal,statCollected,statOutstanding,tableHeader.*,invoice.*}` 等 key。
  - **测试补强**：新增 `CaseBillingTab.bug167.test.ts`，三语 mount 断言 `html()` 不含 `[\u4e00-\u9fff]+`（en-US / ja-JP）；zh-CN 验证中文文案存在。
  - **guard**：admin 3242 PASS / server integration 28 PASS / 0 FAIL。

---

### BUG-168 [P2][FE] `CaseDetailView` Pre-submission check tab 内容中文硬编码 — ✅ FIX-LANDED（2026-05-01）

- **优先级**：P2（en-US / ja-JP 多语合规破坏；含 7 段长文案）
- **chrome-devtools-mcp 取证（en-US）**：

  ```js
  // /#/cases/df9d1e84-...?tab=preSubmission ; locale=English
  // 主区中文裸露：
  // "提交前检查校验通过，无阻断项"
  // "提交包（历史快照）暂无提交包记录"
  // "双人复核 暂无复核记录"
  // "欠款风险确认记录 当前无欠款风险确认"
  // "下签后处理 COE / 海外贴签 / 返签结果"
  // "当前案件未到该阶段"
  // "当前案件还在提交前或补正处理阶段，因此这里暂不展示 COE 发送、海外贴签和返签结果。切换到相应样例后可查看完整流程。"
  ```

- **根因**：

  ```text
  packages/admin/src/views/cases/components/CaseValidationSupport.vue
    L40:  <h2>双人复核</h2>
    L41:  <Button>发起复核</Button>
    L74:  <h2>欠款风险确认记录</h2>
    L112: <p>当前无欠款风险确认</p>
    L128: <h2>COE / 海外贴签 / 返签结果</h2>
    L129: <Chip>当前案件未到该阶段</Chip>
    L132-133: <p>当前案件还在提交前或补正处理阶段，因此这里暂不展示 COE 发送、海外贴签和返签结果。切换到相应样例后可查看完整流程。</p>
  ```

  另涉及 `CaseSubmissionPackages.vue` / `CasePreSubmissionCheck.vue` 同族文案。

- **修复方向**：
  - 统一抽到 `cases.detail.validation.{title,reviewerHeader,reviewerStartCta,arrearsHeader,arrearsEmpty,postApproval.{title,stagingChip,placeholderBody}}`；
  - `CaseValidationSupport.vue` 改用 `t("...")`；
  - en-US / ja-JP catalog 同步补齐。
- **测试补强**：`CaseValidationSupport.test.ts`：locale=en-US / ja-JP 下断言无中文 hex 范围 `[\u4e00-\u9fff]+`。
- **关联**：BUG-167 / BUG-169 同源。

- **FIX-LANDED 实测（2026-05-01）**：
  - **commit**：`c52ced9 fix(admin/cases): bug-168 i18n CaseValidationSupport pre-submission check tab`
  - **代码改动**：`CaseValidationSupport.vue` 全部中文字面量抽到 `t("cases.detail.validation.*")` key；三语 catalog 同步补全 `detail.validation.{reviewer.*,arrearsRisk.*,postApproval.*}` 等 key。
  - **测试补强**：新增 `CaseValidationSupport.bug168.test.ts`，三语 mount 断言无中文泄漏（en-US / ja-JP）。
  - **guard**：admin 3242 PASS / server integration 28 PASS / 0 FAIL。

---

### BUG-169 [P2][FE] `CaseDetailView` Documents tab 空态文案中文硬编码 — ✅ FIX-LANDED（2026-05-01）

- **优先级**：P2（与 BUG-167 / 168 同族；en-US / ja-JP 多语合规破坏）
- **chrome-devtools-mcp 取证（en-US）**：

  ```js
  // /#/cases/df9d1e84-...?tab=documents ; locale=English
  // 顶部已 i18n："Storage root not configured / The local archive root directory has not been set up..."
  // 但下方空态：
  document.body.textContent.match(/[\u4e00-\u9fff]+/g);
  // → ["试探客户","暂无资料登记","该案件尚未添加任何资料需求","请通过","登记资料","或","手动添加","开始建立资料清单"]
  ```

- **根因**：

  ```text
  packages/admin/src/views/cases/components/CaseDocumentsTab.vue
    L123: <span>暂无资料登记</span>
    L125: <span>该案件尚未添加任何资料需求。请通过"登记资料"或"手动添加"开始建立资料清单。</span>
    L141: <Button>登记资料</Button>
    L145: <Button>手动添加</Button>
    L229: 登记资料
    L246: 手动添加
  ```

- **修复方向**：同 BUG-167，抽 `cases.detail.documents.empty.{title,description,registerCta,addCta}` 到 i18n。
- **关联**：BUG-167 / BUG-168。

- **FIX-LANDED 实测（2026-05-01）**：
  - **commit**：`dd10526 fix(admin/cases): bug-169 i18n CaseDocumentsTab empty state + section labels`
  - **代码改动**：`CaseDocumentsTab.vue` 空态文案 + section 操作按钮全部抽到 `t("cases.detail.documents.*")` key；三语 catalog 同步补全 `detail.documents.{empty.*,section.*}` 等 key。
  - **测试补强**：新增 `CaseDocumentsTab.bug169.test.ts`，`isEmpty=true` 与 `isEmpty=false` 双 fixture，三语断言无中文泄漏。
  - **guard**：admin 3242 PASS / server integration 28 PASS / 0 FAIL。

---

### BUG-170 [P3][FE] `CaseDetailView` Overview Customer 段直显 group raw slug `tokyo-1` — ✅ FIX-LANDED（2026-05-01）

- **优先级**：P3（任何 admin 进 case detail Overview tab 的人都中；UX/i18n 双重问题）
- **chrome-devtools-mcp 取证**：

  ```js
  // /#/cases/df9d1e84-... ; en-US
  // Overview tab Customer 区显示
  document.querySelector('main').textContent.includes('tokyo-1');  // true ❌
  // 期望：en-US "Tokyo Team 1" / zh-CN "东京一组" / ja-JP "東京一組"
  // breadcrumb 仍正确："CASE-202604-0011" ✅
  // case header chips 也正确："Archived" + "Closed (success)" ✅
  ```

- **根因**：
  - `packages/admin/src/views/cases/components/CaseCustomerBackLink.vue:38-40` 直接渲染 prop `groupName`；
  - server `/api/cases/:id` 当前下发的 `groupName` 字段是 raw slug `tokyo-1`（catalog id），admin 没有走 `resolveGroupLabel(groupName, locale)` 解析。
- **修复方向**：
  1. **admin 端**：`CaseOverviewTab.vue:65` 把 `:group-name="resolveGroupLabel(detail.groupName, locale)"` 套上解析；
  2. **server 端（次选）**：`/api/cases/:id` response 直接补 `groupLabel: { 'zh-CN':'东京一组', 'en-US':'Tokyo Team 1', 'ja-JP':'東京一組' }`，admin 直接读 `groupLabel[locale] ?? groupName`。
- **测试补强**：`CaseCustomerBackLink.test.ts`：mount with `groupName="tokyo-1"` + `locale="en-US"` → 渲染 "Tokyo Team 1"；同样验证 ja-JP。
- **关联**：BUG-136 / BUG-139 同族（raw slug / UUID 直显客户引用）。

- **FIX-LANDED 实测（2026-05-01）**：
  - **commit**：`5c07d65 fix(admin/cases): bug-170 overview group slug 走 resolveGroupLabel 本地化`
  - **代码改动**：`CaseOverviewTab.vue` 注入 `useI18n().locale`，`:group-name` prop 改为 `resolveGroupLabel(detail.groupName, undefined, locale)` 解析；复用 `shared/model/groupOptions.ts` 的 `resolveGroupLabel`。
  - **测试补强**：新增 `CaseOverviewTab.bug170.test.ts`，mount with `groupName="tokyo-1"` + `locale="en-US"` → 渲染 `Tokyo Team 1`。
  - **guard**：admin 3242 PASS / server integration 28 PASS / 0 FAIL。

---

### BUG-171 [P3][FE] Tasks → Reminder log Details cell `Dedupe key` 含 raw UUID — ✅ FIX-LANDED（2026-05-01）

- **优先级**：P3（R13 BUG-163 主体已 land：reminderId 短哈希 + caseNo + recipientName，但 dedupe key 字段补漏）
- **chrome-devtools-mcp 取证（en-US）**：

  ```js
  // /#/tasks ; click "Reminder log" tab
  Array.from(document.querySelectorAll('main table tbody tr td:nth-child(4)')).map(td => td.textContent);
  // → [
  //   "Case CASE-202604-0011 · Recipient Local Admin · Dedupe key residence_period:e00ea5d2-210a-4f65-a205-5d4e0da4cc7d",
  //   "Case CASE-202604-0011 · Recipient Local Admin · Dedupe key residence_period:e00ea5d2-210a-4f65-a205-5d4e0da4cc7d",
  //   "Case CASE-202604-0011 · Recipient Local Admin · Dedupe key residence_period:e00ea5d2-210a-4f65-a205-5d4e0da4cc7d",
  // ]
  // 3/3 行 dedupe key 直显 raw UUID
  ```

- **期望**：要么把 UUID 替换为 caseNo（`Dedupe key residence_period:CASE-202604-0011-180d`），要么把整段 dedupe key 折叠为 `<details>` / hover tooltip，主行只显示标记 `Dedupe key reset`（避免运营误读 UUID）。
- **根因**：`views/tasks/components/ReminderLogTable.vue` 渲染 `reminder.dedupeKey` 原值；R13 fix 仅替换了 reminderId / caseId / recipientId 三处。
- **修复方向**：
  1. server `/api/reminders` 在 list response 上补 `dedupeKeyDisplay` 字段：把 UUID 部分替换为短哈希或 caseNo + day-offset；
  2. admin `ReminderLogTable.vue` 渲染走 `reminder.dedupeKeyDisplay ?? reminder.dedupeKey.replace(uuidRegex, '<UUID-redacted>')`。
- **关联**：BUG-163（同源）；BUG-136 / BUG-161 / BUG-170（raw UUID 直显族）。

- **FIX-LANDED 实测（2026-05-01）**：
  - **commit**：`1eaf3dd fix(admin/tasks): bug-171 mask UUID in reminderMeta dedupeKey display`
  - **代码改动**：`taskWorkbenchViewHelpers.ts` 新增 `maskDedupeKeyUuid(key)` helper，把 UUID v4 子串替换为 `toShortUuid` 短哈希输出（保留业务语义前缀 `residence_period:` 等）；`reminderMeta` 调用 `maskDedupeKeyUuid(reminder.dedupeKey)` 渲染。
  - **测试补强**：扩展 `taskWorkbenchViewHelpers.bug163.test.ts`，输入 `residence_period:e00ea5d2-210a-4f65-a205-5d4e0da4cc7d` → 输出 `residence_period:e00ea5d2`。
  - **guard**：admin 3242 PASS / server integration 28 PASS / 0 FAIL。

---

### BUG-172 [P3][FE] 案件列表 Type 列大小写不统一 — ✅ FIX-LANDED（2026-05-01）

- **优先级**：P3（en-US 下 BMV 模板 case 与旧 case 显示不一致；UX 视觉一致性问题）
- **chrome-devtools-mcp 取证（en-US）**：

  ```js
  // /#/cases?scope=mine ; locale=English
  Array.from(document.querySelectorAll('main table tbody tr td:nth-child(4)')).map(td => td.textContent.trim());
  // → [
  //   "BMV (CoE 4-month)",   // ✅ Title Case
  //   "BMV (CoE 4-month)",
  //   ...
  //   "Business manager visa", // ❌ "visa" 全小写
  //   "Business manager visa",
  //   "Dependent visa",        // ❌ "visa" 全小写
  // ]
  // 19 行中后 8 行（CASE-202604-0001~0009）显示 "* visa" 小写，前 11 行（BMV-CERT-4M）正常 Title Case
  ```

- **根因**：`getCaseTypeLabel(typeCode, locale)` 在 fallback 路径上把 `business_manager_visa` / `dependent_visa` 等 v1 的 visaType code 直接 `splitWords(typeCode)` 之后只首字母大写（"Business manager visa"），而 BMV 子模板 `biz_mgmt_4m` 走 i18n catalog（"BMV (CoE 4-month)"）。
- **修复方向**：把 `business_manager_visa` / `dependent_visa` / `engineer_visa` 等旧 v1 code 也补到 i18n catalog（`cases.types.businessManagerVisa.label = "Business Manager Visa"` 等），统一 Title Case；en-US 三语 catalog 校稿。
- **测试补强**：`getCaseTypeLabel.bug172.test.ts`：所有已知 typeCode 在 en-US 下的 label 必须满足 `/[A-Z][a-z]+( [A-Z][a-z]+)+/`（Title Case 正则）。
- **关联**：与 R12 BUG-143 同族（type 列 i18n）；R13 标 ✅ PASS 但仅覆盖 BMV 子类型。

- **FIX-LANDED 实测（2026-05-01）**：
  - **commit**：`1adc5b0 fix(admin/cases): bug-172 caseTypes catalog v1 visa code aliases + en-US Title Case`
  - **代码改动**：三语 i18n catalog 补全 v1 visa code 别名（`business_manager_visa` → `Business Manager Visa` / `経営管理ビザ` / `经营管理签`；`dependent_visa` → `Dependent Visa` / `家族滞在` / `家族滞在`；`engineer_visa` / `engineer_humanities_intl_visa` 同源补齐）；en-US 全部 `caseTypes.*` 统一 Title Case。
  - **测试补强**：扩展 `CaseTableRow.bug143.test.ts`，加入 v1 visa code 行校验 Title Case。
  - **guard**：admin 3242 PASS / server integration 28 PASS / 0 FAIL。

---

### BUG-173 [P0][FE] 建案向导 Step 4 失败 toast 缺 actionable detail — ✅ FIX-LANDED（2026-05-01）

- **优先级**：P0（R14 走查时把 P0 BUG-165 的根因隐藏；本身也是 UX 问题）
- **chrome-devtools-mcp 取证**：

  ```js
  // Step 4 提交后
  // toast: 标题 = "Failed to create case"，正文 = "Failed to create case"
  // 而 server response body:
  // {"code":"CASE_CREATE_FAILED","detail":"invalid input syntax for type uuid: \"suzuki\"","message":"Failed to create case"}
  // detail 字段被丢失，运营无法定位 owner 字段问题
  ```

- **根因**：
  - `CaseCreateView.vue:111-113` 在失败分支只取 `model.submitError.value`（来自 `CaseRepository.create` 的 `error.message`），未消费 server 返回的 `body.detail` / `body.code`；
  - `useCreateCaseModel.submit` 把 server 错误结构化后丢给 `submitError` 时只保留 `message`。
- **修复方向**：
  1. **admin 端**：`CaseRepository.create` 在 fetch 错误分支保留 `{code, detail, message}` 结构；
  2. `useCreateCaseModel.submit` 把这个结构化 error 通过 `submitError` 暴露；
  3. `CaseCreateView.handleSubmit` 失败分支：toast 标题 = `t("cases.create.toast.createFailed")`，正文 = `error.detail ?? error.message`，并在 Step 4 顶部加 inline error chip 高亮 owner 字段（如果 detail.includes("uuid")）。
- **测试补强**：`useCreateCaseModel.bug173.test.ts`：mock fetch 返 `{code:"CASE_CREATE_FAILED", detail:"...", message:"..."}` → `submitError.value.detail` 必须保留；不再仅 `message`。
- **关联**：BUG-165（同 PR 收口）；BUG-166（错误码层级）。

- **FIX-LANDED 实测（2026-05-01）**：
  - **commit**：`db99e2c fix(admin/cases): bug-173 server detail 透传到建案失败 toast 与 inline error chip`
  - **代码改动**：
    - `repositoryRuntime.ts`：`RepositoryError` 新增只读 `detail?: string` 字段，`buildBadResponseError` 从 response body 读取 `detail` 并透传。
    - `useCreateCaseModelSubmit.ts`：`normalizeSubmitError` 改返结构 `{ message, code?, detail? }`；`submitError` 类型从 `string | null` → `{ message; code?; detail? } | null`。
    - `CaseCreateView.vue`：失败分支 toast 正文改为 `error.detail ?? error.message`。
    - `CaseCreateStep4.vue`：当 `submitError.code === "CASE_OWNER_NOT_FOUND"` 或 `detail` 含 `"uuid"` 时渲染 inline error chip 高亮 owner 字段。
  - **测试补强**：新增 `useCreateCaseModelSubmit.bug173.test.ts`，mock fetch 返 `{code, detail, message}` → `submitError.value.detail` 必须保留。
  - **guard**：admin 3242 PASS / server integration 28 PASS / 0 FAIL。

---

## 2. R13 §1 BUG-157~164 实测验收逐条证据

> 与 §0.1 总表互为详证；以 chrome-devtools-mcp `navigate_page` / `evaluate_script` / API 直查为锚。

### 2.1 ✅ PASS 6 条

#### BUG-157 ❌→✅（sidebar 缺 Tasks）

```js
// /#/ ; locale=简体中文
const navLinks = Array.from(document.querySelectorAll('aside a, nav a'));
const businessNav = navLinks.filter(a => /\/(leads|customers|cases|tasks)/.test(a.getAttribute('href')||''));
businessNav.map(a => ({label: a.textContent.trim(), href: a.getAttribute('href')}));
// → [
//   {label:"咨询与会话", href:"#/leads"},
//   {label:"客户",       href:"#/customers"},
//   {label:"案件",       href:"#/cases"},
//   {label:"任务与提醒", href:"#/tasks"},   ← R13 缺，R14 已恢复
// ]
```

#### BUG-158 ✅→✅ reaffirm（BMV 承接卡片 + intake）

```js
// /#/customers/825d708f-...
// CustomerBmvIntakeCard 区域结构：
//   intakeStatus="可建案"
//   下一步="转正式案件并生成资料清单"
//   建案门禁="已完成签约，可以进入正式建案"
//   stages={问卷:"已回收", 报价:"已确认", 签约:"已签约"}
//   actions=[发送问卷(disabled, "客户已签约"), 生成报价(disabled, "客户已签约"), 记录签约(disabled, "客户已签约"), 转正式案件(可点)]
//   timestamps={问卷发送, 问卷回收, 报价生成, 报价确认, 签约时间} 全部 = "2026-04-30 13:11 (UTC)"
// POST /api/customers 默认 bmvProfile 14 字段：
fetch('/api/customers',{method:'POST',headers,body:JSON.stringify({type:'individual',baseProfile:{name_cn:'probe'}})})
// → 201 + bmvProfile.intakeStatus="not_started" 默认 ✅
```

#### BUG-159 ✅→✅ reaffirm（cases.group_id 持久化 + migration 037）

```bash
GET /api/cases?scope=all → 19 行
# 10/19 groupId="ef21fdd2-1ffc-4a27-8b47-a640d6bd021c" (R6试探客户)
# 9/19 groupId=null (Tani Keiei Cert4M Test 无 group)
GET /api/billing-plans → 3/3 行 groupId 非 null
# /#/billing zh-CN: 所属 Group 列三行 = ["东京一组","东京一组","东京一组"] ✅
```

#### BUG-161 ❌→✅（建案向导 source 标签 raw UUID）

```js
// /#/cases/create?customerId=825d708f-... ; zh-CN
document.body.textContent.match(/来自客户档案 · ([0-9a-f-]+ ?· ?[\u4e00-\u9fff]+|[A-Z]{3}-\d+-\d+ · [^\s]+)/)?.[0];
// → "来自客户档案 · CUS-202604-0005 · R6试探客户"   ✅
// R13 取证 "From customer profile · 825d708f-dec5-443d-b987-63f0a62dae99" 已消失
```

#### BUG-162 ❌→✅（en-US BMV CoE 缩写映射）

```js
// /#/cases/create?customerId=825d708f-...&templateId=bmv ; locale=English
document.querySelector('input[type=text]').value;
// R13 取证: "Business Manager (CoE 4-month) Certificate of Eligibility"
// R14 实测: "R6 Business Manager (CoE 4-month)"   ✅
// CoE 已被识别为 Certificate of Eligibility 缩写
```

#### BUG-164 ✅→✅ reaffirm（POST/GET customerNumber 对称）

```bash
POST /api/customers
→ 201 { id, customerNumber:"CUS-202605-0001", displayName, legalName, phone, email,
        group, owner, bmvProfile{14 fields}, archivedCases, activeCases, totalCases,
        baseProfile{name_cn,...,customerNumber:"CUS-202605-0001"}, contacts[], type, ... }
# 顶层 customerNumber + baseProfile.customerNumber 双写 ✅
# 顶层字段集合与 GET /api/customers/<id> 完全对称 ✅
```

### 2.2 ⚠️ 边界缺漏 2 条

#### BUG-160 ✅→⚠️ PARTIAL（PG 22P02 漏映射）

```bash
# 场景 A: BMV 门禁 → ✅ 400 PASS
POST /api/cases (caseTypeCode=biz_mgmt_4m，未签约客户)
→ 400 {"code":"CASE_BMV_GATE_BLOCKED","blockers":[4 items]}   ✅

# 场景 B: PG 22P02 → ❌ 仍 500
POST /api/cases (ownerUserId="suzuki" 非 UUID)
→ 500 {"code":"CASE_CREATE_FAILED","detail":"invalid input syntax for type uuid: \"suzuki\""}
# 应当 → 400（BUG-166）
```

#### BUG-163 ✅→⚠️ MOSTLY PASS（dedupe key 漏）

```js
// /#/tasks → Reminder log
// 原 R13 取证 reminderId / caseId / recipientId 三处 raw UUID 已修：
//   "Renewal reminder 180 days before expiry #eefe7803"  ← reminderId 短哈希 ✅
//   "Case CASE-202604-0011"                              ← caseNo ✅
//   "Recipient Local Admin"                              ← recipientName ✅
// 但 details cell 末尾仍含：
//   "Dedupe key residence_period:e00ea5d2-210a-4f65-a205-5d4e0da4cc7d"
//                                ↑ 38 字节 raw UUID 直显   → BUG-171
```

---

## 3. 顺手补充观测（不立 bug，但建议跟踪）

### 3.1 console issue 7 个 form field 缺 id/name + 7 个 missing label

```js
list_console_messages
// → [issue] No label associated with a form field (count: 7)
//   [issue] A form field element should have an id or name attribute (count: 7)
```

R13 §0.1 BUG-148 已 ✅ FIXED 客户新建 modal 14 字段 a11y，但全局 admin 仍有 7 处 form 字段缺 id/name + missing label。建议下一轮抓取根因（猜测在 case detail 编辑模式或 settings 页）。

### 3.2 case 列表 owner 列重复显示 initials + 名称

```js
// /#/cases ; en-US ; row 1
td:nth-child(5).textContent === "Lo" + "Local Admin"
//                              ↑ avatar initials       ↑ display name
// 视觉上看起来像 "LoLocal Admin"；建议 avatar 与名字之间加空格或视觉间距
```

不立 bug，UI 微调。

### 3.3 zh-CN 下 case header chips "已归档成功归档"

```js
// CASE-202604-0011 (Closed success) ; zh-CN
chips = ["已归档","成功归档"]
// 字面上 "已归档" + "成功归档" 都含 "归档"，重复感强
// en-US: ["Archived","Closed (success)"] 用 Closed 区分阶段与结案
// ja-JP: ["案件開始","成功クローズ"]
// 建议 zh-CN: ["已归档","成功结案"] 或 ["归档","成功"]
```

不立 bug，文案微调。

### 3.4 stage / phase 失配持续存在（R12-R13 → R14 reaffirm）

```bash
GET /api/cases?scope=all → 19 行
# stage 分布：S1 × 14, "Collecting documents" × 1, "Archived" × 4
# phase 分布：远期 phase（Awaiting final payment / Closed / Renewal reminder set / Archived）× 多数
```

R10-R13 已记录此项为「stage / phase 终态联动」未决项；R14 仍不立 bug，等产品决策。

### 3.5 全局搜索仍 disabled（"Coming soon" / "建设中"）

R10-R13 一致；放在产品 backlog。

### 3.6 BUG-167/168/169 之外，case detail 还可能有未抓 i18n 漏

R14 仅深入 `?tab=billing|preSubmission|documents|tasks` 四 tab；`?tab=basicInfo|forms|deadlines|messages|log` 五 tab 仅扫了 tab 标签 i18n（PASS）但未深入内容。建议下一轮逐 tab 扫一次中文 hex 范围 `[\u4e00-\u9fff]+`。

---

## 4. 仍未覆盖 / 待立项

本轮**未触及**（沿用 R12-R13 状态）：

- BUG-110（`tests/integration-pg/` schema-compatibility 测试体系）
- BUG-113 / 114 / 115（timeline query alias / dashboard 文案 / customer backfill）
- stage / phase 终态联动（产品决策；本轮 §3.4 再次出证）
- CLOSED_FAILED 路径 + closeReason 入参校验
- a11y `[role=tab]` ↔ `[role=tabpanel]` 关联（R10 §3.4 / R11 §3.2）

本轮**新增 9 条全部 ✅ FIX-LANDED（2026-05-01）**：

- **BUG-165 P0** ✅：server `resolveOwnerUserId` 对称补强（`de68cdf` 之前已 land）。
- **BUG-166 P2** ✅：`PG_CLIENT_ERROR_REASONS` 覆盖 7 个 SQLSTATE（`de68cdf` 之前已 land）。
- **BUG-167 P2** ✅：`CaseBillingTab.vue` i18n 化（commit `de68cdf`）。
- **BUG-168 P2** ✅：`CaseValidationSupport.vue` i18n 化（commit `c52ced9`）。
- **BUG-169 P2** ✅：`CaseDocumentsTab.vue` i18n 化（commit `dd10526`）。
- **BUG-170 P3** ✅：`CaseOverviewTab.vue` 走 `resolveGroupLabel`（commit `5c07d65`）。
- **BUG-171 P3** ✅：`maskDedupeKeyUuid` 短哈希替换（commit `1eaf3dd`）。
- **BUG-172 P3** ✅：v1 visa code catalog 补齐 + Title Case 统一（commit `1adc5b0`）。
- **BUG-173 P0** ✅：`RepositoryError.detail` 透传 + inline error chip（commit `db99e2c`）。

**仍留后续清理项**（不阻断 P0 主链）：
- BUG-165 修复方向 #2/#3/#4（admin 端动态拉真实 users / catalog seed migration / disable 假 slug）。
- BUG-165 未覆盖项：`assistantUserId` 走旧 `assertBelongsToOrg`，输入 slug 时仍触发 400 `CASE_CREATE_FAILED + pgCode=22P02`（不再 500）。
- **R14 守门补强**（建议下轮落地）：
  - admin lint 自定义规则：`views/cases/components/**/*.vue` 模板内不允许出现 `[\u4e00-\u9fff]+` 字面量（必须走 `t(...)`）；
  - admin `ownerOptions` 必须有 `userId` UUID 字段，否则 build 时报错。

---

## 附录 — 关键证据快照

### A. chrome-devtools-mcp 走查清单（按事务所流程顺序）

| 流程步骤 | URL | R14 实测结论 | 证据 |
|---|---|---|---|
| Step 1（接洽） | `/#/leads` | 路径可达；本轮未深入。 | navigate_page OK |
| Step 2（客户新建） | `/#/customers` → "Add customer" | R13 BUG-137 跨轮 land：empty/null birthday 都 201 OK；POST 顶层 customerNumber + bmvProfile 默认 14 字段（BUG-164 ✅ + BUG-158 server 侧 ✅）。 | §1 BUG-137（已解禁）+ BUG-164 |
| Step 3-4（承接） | `/#/customers/<id>` → BMV 承接卡片 | R13 BUG-158 ✅ FIX-LANDED reaffirm：CustomerBmvIntakeCard 完整渲染 stage/actions/timestamps；「转正式案件」按钮可点。 | §1 BUG-158 |
| Step 5（建案启动） | `/#/cases/create?customerId=...` | Step 1-3 全部 PASS：i18n 完整（BUG-161/162/139/152）+ group 继承（BUG-159 R13 v2 + 037 migration）；Step 4 「所有前提条件已满足」。 | §1 BUG-159/161/162 |
| Step 17（点击「开始办案」） | 同上 Step 4 提交 | **❌ BUG-165 P0**：POST /api/cases 500 + detail "invalid input syntax for type uuid: \"suzuki\""；admin UI toast "Failed to create case" 无 actionable detail（→ BUG-173）；server PG 22P02 漏映射（→ BUG-166）。 | §1 BUG-165/166/173 |
| Step 7-12（案件状态推进） | `/#/cases/<id>` | header chip / overview tab 全 i18n ✅；但 Overview Customer 段直显 group raw slug `tokyo-1`（→ BUG-170）；Pre-submission tab / Billing tab / Documents tab 内容大段中文硬编码（en-US 裸露，→ BUG-167/168/169）。 | §1 BUG-167/168/169/170 |
| Step 14（收费） | `/#/billing` | R13 BUG-140 + BUG-159 双重闭环 reaffirm：filter dropdown 三语 i18n + Group cell 本地化（zh-CN 东京一组 × 3）。 | §2.1 BUG-159 |
| Step 19-20（续签提醒） | `/#/tasks` | sidebar nav ✅（R13 BUG-157 fix-landed）；Reminder log 3 行（180/90/30 days before expiry, queued）；reminderId/caseNo/recipientName ✅（BUG-163 主体 land），但 dedupe key 仍含 raw UUID（→ BUG-171）。 | §1 BUG-157/171 |

### B. R13 §1 实测验收一图速查

```text
R13 §1 BUG-157..164 (8 条)
├── ✅ PASS         × 6   (157, 158, 159, 161, 162, 164)
├── ⚠️ PARTIAL     × 1   (160 → 漏 PG 22P02 → BUG-166)
└── ⚠️ MOSTLY PASS × 1   (163 → dedupe key 漏 → BUG-171)
跨轮 land：BUG-137 R13 ❌→R14 ✅；BUG-149 ⚠️→✅
```

### C. 一键复现脚本（chrome-devtools-mcp 化的 e2e）

```text
# 0) 登录
navigate_page → /#/login ; fill admin@local.test / Admin123! ; click 登录

# 1) BUG-157 reaffirm（sidebar Tasks）
evaluate_script: navLinks.find(a => /\/tasks/.test(a.href))?.textContent  → "任务与提醒" / "Tasks & reminders" ✅

# 2) BUG-158 + 164 reaffirm（POST /api/customers 顶层 customerNumber + bmvProfile 默认）
curl -X POST /api/customers -d '{"type":"individual","baseProfile":{"name_cn":"R14 probe"}}'
# → 201 + customerNumber=CUS-202605-NNNN + bmvProfile.intakeStatus="not_started" 默认 14 字段 ✅

# 3) BUG-137 cross-round land（empty birthday → 201）
curl -X POST /api/customers -d '{...,"birthday":""}' → 201 ✅
curl -X POST /api/customers -d '{...,"birthday":null}' → 201 ✅

# 4) BUG-159 reaffirm（cases.group_id 持久化）
curl /api/cases?scope=all → 10/19 groupId 非 null ✅
curl /api/billing-plans → 3/3 groupId 非 null ✅

# 5) BUG-161 / 162 reaffirm（建案向导 i18n）
navigate_page → /#/cases/create?customerId=825d708f-...&templateId=bmv ; locale=English
$('main').textContent.includes('CUS-202604-0005 · R6试探客户')          → true ✅
$('input[type=text]').value === 'R6 Business Manager (CoE 4-month)'    ✅ 不再有 Certificate of Eligibility 后缀

# 6) BUG-160 PARTIAL（PG 22P02 仍 500）
curl -X POST /api/cases -d '{"customerId":"...","caseTypeCode":"biz_mgmt_cert_4m","ownerUserId":"suzuki","groupId":"tokyo-1","stage":"S1","applicationType":"certification","caseName":"R14 probe","quotePrice":150000}'
# → 500 {"code":"CASE_CREATE_FAILED","detail":"invalid input syntax for type uuid: \"suzuki\""}  ❌ 应 400

# 7) BUG-165 P0（admin UI 建案 Step 4 失败链路）
navigate_page → /#/customers/825d708f-... ; click "转正式案件"
→ /#/cases/create?customerId=...&templateId=bmv (Step 1)
click 下一步 → Step 2 → 下一步 → Step 3
fill 截止日期=2026-12-31, 收费金额=150000
click 下一步 → Step 4
click 开始办案
→ toast "案件创建失败" + list_network_requests POST /api/cases [500]

# 8) BUG-167/168/169（case detail i18n）
navigate_page → /#/cases/df9d1e84-...?tab=billing ; locale=English
evaluate_script: main.textContent.match(/[\u4e00-\u9fff]+/g)
# → ["收费","总费用","已收金额","未收金额","日期","类型","金额","状态","操作","发票信息","当前原型暂不展示发票详情"]  ❌

navigate_page → ...?tab=preSubmission
# → ["提交前检查校验通过","双人复核","欠款风险确认记录","COE","海外贴签","返签结果",...]  ❌

navigate_page → ...?tab=documents
# → ["暂无资料登记","该案件尚未添加任何资料需求",...]  ❌

# 9) BUG-170（Overview group raw slug）
navigate_page → /#/cases/df9d1e84-... ; locale=English
evaluate_script: main.textContent.includes('tokyo-1')   → true ❌

# 10) BUG-171（Reminder log dedupe key UUID）
navigate_page → /#/tasks ; click "Reminder log"
evaluate_script: main.textContent.match(/Dedupe key [\w_]+:[0-9a-f-]{36}/)?.[0]
# → "Dedupe key residence_period:e00ea5d2-210a-4f65-a205-5d4e0da4cc7d"  ❌

# 11) BUG-172（case type 列大小写）
navigate_page → /#/cases ; locale=English
evaluate_script: rows[10..18].td:nth-child(4).text → "Business manager visa" / "Dependent visa"  ❌
```

### D. 网络与 console 噪声基线

- 详情页一次完整加载：≈ 11 个聚合接口（与 R10-R13 一致，无新接口）。
- 客户新建 modal：单次完整填写触发 3 次 `POST /api/customers/check-duplicates` + 1 次 `POST /api/customers`（与 R13 一致）。
- console：R14 复测期间未观测到新的 i18n missing key warn；7 个 form field id/name 缺失 issue + 7 个 missing label issue 仍存在（R12 BUG-148 已修客户新建 modal，但全局其他位置仍有；详见 §3.1）。
- API：~~BUG-160 PG 22P02~~ → BUG-166 待修；BMV intake `PATCH /api/customers/<id>/bmv-intake`（缺 endpoint，404）是 R13-R14 持续的 server-side 缺口。
- 关键 bug 触发：admin UI Step 4 → POST /api/cases [500]，response detail = "invalid input syntax for type uuid: \"suzuki\""（BUG-165 P0 触发链路）。
