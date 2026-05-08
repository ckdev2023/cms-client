# 客户/案件模块（admin）— 双层状态机自动化复盘走查 Bug 清单（第十五轮 / R14 land 复测 + 边界遗漏 + 隐性回归）

> 生成日期：2026-05-01（同日 chrome-devtools-mcp 复盘走查 + R14 §1 BUG-165~173 9 条 land 项实测验收 + R13 §1 BUG-157~164 8 条复测）
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/20-双层状态机自动化复盘走查Bug清单-第十四轮.md` §0.3 BUG-165 / 166 / 167 / 168 / 169 / 170 / 171 / 172 / 173（9 条 ✅ FIX-LANDED）
> - `docs/gyoseishoshi_saas_md/_output/19-双层状态机自动化复盘走查Bug清单-第十三轮.md` §1 BUG-157 / 158 / 159 / 160 / 161 / 162 / 163 / 164（8 条）
> - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md`（20 步状态机 / 数据结构 / 业务规则）
>
> 走查工具：`chrome-devtools-mcp`（`navigate_page` / `take_snapshot` / `evaluate_script` / `fill` / `click` / `list_network_requests` / `get_network_request`）+ 代码审查
> 走查环境：`http://localhost:5173/api`，本地 admin（`admin@local.test` / `Admin123!`）；后端 NestJS `:3300`，Vite 反代 `:5173`，PostgreSQL `cms-client-postgres-1` `:5433`
> 与第十四轮（`20-...md`）互为续篇；本轮**对 R14 标 ✅ FIX-LANDED 9 条逐条实测**，外加**对 R13 §1 8 条 reaffirm**，共 17 条门禁 + 1 条跨轮 land（BUG-137）的复测；统一登记本轮新发现的**边界遗漏**与**隐性回归**。
>
> 业务规则 ground 锚点已落在仓库内权威文档（biz-mgmt P1 落地清单 / M6 收费与 COE 门禁 / M8 在留期间与续签提醒）；本文不直接陈述业务规则，仅以"产品规则 / 文档锚点"维度引用。

---

## 0. 第十五轮总结

### 0.1 R14 §0.3 BUG-165~173（9 条）实测验收

| # | R14 标记 | R15 实测 | 一句话 |
|---|---|---|---|
| BUG-165（owner UUID 对称解析） | ✅ FIX-LANDED | **✅ PASS** | API 三场景全通：`ownerUserId="suzuki"` → 400 `CASE_OWNER_NOT_FOUND`；`="admin@local.test"` → 201 OK + ownerUserId 解析为 `00000000-0000-4000-8000-000000000011`；`="   "` → 201 OK 继承 ctx.userId。admin UI Step 4 选 "Local Admin" 提交成功创建 `CASE-202605-0003`。|
| BUG-166（PG 22P02 → 400） | ✅ FIX-LANDED | **✅ PASS** | `assistantUserId="tanaka"`（走旧 `assertBelongsToOrg` 路径）→ 400 `{"code":"CASE_CREATE_FAILED","detail":{"source":"pg","pgCode":"22P02","pgMessage":"invalid input syntax for type uuid: \"tanaka\""},"message":"Failed to create case: invalid input format"}` ✅ |
| BUG-167（CaseBillingTab i18n） | ✅ FIX-LANDED | **✅ PASS** | en-US Billing tab 全本地化：`Total fees / Collected / Outstanding / DATE / TYPE / AMOUNT / STATUS / ACTIONS / Invoice / Invoice details are not shown in the current prototype.`；CJK 检测仅命中客户名 `试探客户`（合法）。|
| BUG-168（Pre-submission tab i18n） | ✅ FIX-LANDED | **⚠️ PARTIAL** | `CaseValidationSupport.vue`（Double Review / Arrears Risk / Post-Approval 段）已 i18n ✅；但**兄弟容器 `CaseValidationTab.vue` 未抽 i18n**：en-US 下仍裸露 `提交前检查 / 校验通过，无阻断项 / 提交包（历史快照） / 暂无提交包记录`，且代码侧还有 16 处隐性 zh-CN 字面量在含数据案件下会泄漏（→ BUG-174）。|
| BUG-169（Documents tab 空态 i18n） | ✅ FIX-LANDED | **✅ PASS** | en-US 空态：`No documents registered yet` / `This case has no document requirements. Use "Register documents" or "Add manually" ...` + 按钮 `Register documents` / `Add manually`。 |
| BUG-170（Overview group raw slug） | ✅ FIX-LANDED | **✅ PASS 三语** | en `Tokyo Team 1` / zh `东京一组` / ja `東京一組`；en-US 整页正则 `tokyo-1` 零命中。 |
| BUG-171（Reminder log dedupe key UUID） | ✅ FIX-LANDED | **✅ PASS** | dedupe key 由 `residence_period:e00ea5d2-210a-4f65-a205-5d4e0da4cc7d` → `residence_period:e00ea5d2:{180/90/30}`（短哈希 + day-offset），全文 UUID v4 正则零命中。 |
| BUG-172（case 列表 Type 列 Title Case） | ✅ FIX-LANDED | **✅ PASS 三语** | en `BMV (CoE 4-month) / Business Manager Visa / Dependent Visa`（全 Title Case）；ja `経営管理（認定4ヶ月） / 経営管理ビザ / 家族滞在`；zh `经营管理（认定4个月） / 经营管理签 / 家族滞在`。 |
| BUG-173（建案 Step 4 失败 toast detail 透传） | ✅ FIX-LANDED | **✅ PASS（轻噪声）** | UI 失败链路（`Suzuki` slug）：toast 标题 `Failed to create case` + 详情 `... ownerUserId "suzuki" does not match any active user in the organization` + 引导 `The selected owner could not be resolved. Please go back to Step 3 and re-select the owner.` ✅。**轻噪声**：消息文本含 `CASE_OWNER_NOT_FOUND: CASE_OWNER_NOT_FOUND:` 双前缀 → BUG-176。|

**统计**：9 条中 **8 条 ✅ PASS** + **1 条 ⚠️ PARTIAL**（BUG-168 边界遗漏 → 派生 BUG-174）。

### 0.2 R13 §1 BUG-157~164（8 条）reaffirm

| # | R14 标记 | R15 复测 |
|---|---|---|
| BUG-157（sidebar Tasks 入口） | ✅ PASS | **✅ PASS**（zh `任务与提醒` / en `Tasks & reminders` / ja `タスク・リマインド`）|
| BUG-158（BMV 承接 + intake 默认） | ✅ PASS | **✅ PASS**（POST `/api/customers` bmvProfile 14 字段默认；客户详情 BMV intake 卡片三语本地化）|
| BUG-159（cases.group_id + billing groupId） | ✅ PASS | **✅ PASS**（`/api/cases?scope=all` 20 行 / 11 行 groupId 非 null；`/api/billing-plans` 3/3 非 null）|
| BUG-160（PG 错误码映射） | ⚠️ → ✅（→ BUG-166） | **✅ PASS**（见 BUG-166）|
| BUG-161（建案向导 source 标签） | ✅ PASS | **✅ PASS**（`From customer profile · CUS-202604-0005 · R6试探客户`）|
| BUG-162（en-US BMV CoE 缩写） | ✅ PASS | **✅ PASS**（`R6试探客户 Business Manager (CoE 4-month)`，无 CoE 长形后缀）|
| BUG-163（dedupe key UUID） | ⚠️ → ✅（→ BUG-171） | **✅ PASS**（见 BUG-171）|
| BUG-164（POST/GET customerNumber 对称） | ✅ PASS | **✅ PASS**（`POST /api/customers` 顶层 `customerNumber` + `baseProfile.customerNumber` 双写）|

跨轮 land：BUG-137（empty/null birthday → 201）✅ R15 仍 PASS（验证 body `birthday=""` → 201 + `birthDate=""`；body `birthday=null` → 201 + `birthDate=""`）。

### 0.3 本轮新增偏差（R14 边界遗漏 + R14 land 项隐性瑕疵 + 隐性回归）

| # | 优先级 | 现象（一句话） | 根因（一句话） |
|---|---|---|---|
| **BUG-174** | P2 [FE] | R14 BUG-168 fix 边界遗漏：`CaseValidationTab.vue` 仍有 20+ 处 zh-CN 字面量（含 `提交前检查 / 当前卡点 / 重新检查 / 必须先处理 / 修复建议：/ 责任人：/ 截止：/ 建议补强 / 建议处理 / 建议：/ 补充说明 / 仅提示 / 校验通过，无阻断项 / 提交包（历史快照） / 新建提交包 / 已锁定 / 暂无提交包记录 / 补正包 / 补正通知关联 / 关联原提交包：/ 补正截止：/ 补正项：` 22 段），en-US 案件含 blocking/warning/submission packages 时会全部裸露中文。 | R14 §1 BUG-168 fix（commit `c52ced9`）只命中下层 `CaseValidationSupport.vue`；上层 `CaseValidationTab.vue:66/71/90/99..250` 三 Card（提交前检查 / 提交包历史快照 / 补正包）未抽 i18n。R14 §1 BUG-168 修复方向已经写明"另涉及 `CaseSubmissionPackages.vue` / `CasePreSubmissionCheck.vue` 同族文案"，但实际仓库中这两个组件不存在，对应内容内联在 `CaseValidationTab.vue` 中，被忽略。|
| **BUG-175** | P3 [FE/BE] | Tasks → Reminder log 表格在 en-US / zh-CN / ja-JP **任意 locale 下**渲染 reminder 标题前缀均显示 ja-JP 字符串 `経営・管理`（应为 en-US `Business Manager` / zh-CN `经营管理` / ja-JP `経営・管理`）。`statusOfResidence` 直接以 ja-JP 文案存进 `reminders.payload_snapshot`，admin 直读直显，与 BUG-172 同族但发生在 reminder 渠道。| `taskWorkbenchViewHelpers.ts:104-130 reminderTitle()` 直接读 `payloadSnapshot.statusOfResidence` 并 `${statusOfResidence.trim()} · ${days}` 拼接；该字段在 server 写入提醒时以 ja-JP 标签存入（应该存 `business_manager` 等 typeCode 才对）。i18n 链路从未走 `getCaseTypeLabel(typeCode, locale)` 解析。|
| **BUG-176** | P3 [FE] | BUG-173 fix 之后，admin Step 4 失败 toast 详情文案出现 `CASE_OWNER_NOT_FOUND: CASE_OWNER_NOT_FOUND: ownerUserId "suzuki" does not match...` 双前缀（server message 已含 `CASE_OWNER_NOT_FOUND: ` 前缀，admin 又拼接了一次）。 | `useCreateCaseModelSubmit.ts:67-77 normalizeSubmitError`：line 70 `${e.serverErrorCode}: ${e.message}` 无条件前置 `serverErrorCode + ": "`；server 在 R14 BUG-165 fix 中已采用 `BadRequestException("CASE_OWNER_NOT_FOUND: ...")` 把错误码写入 message 文本，导致重复。|
| **BUG-OBS-001** | P0 [FE/BE]（建议升 P1） | admin 建案 Step 4 主链路成功（POST `/api/cases` 201）后，admin 自动 `POST /api/case-parties` 注册主申请人时返 400 `Invalid partyType: applicant. Must be one of: spouse, child, guarantor, representative, other`。case 已落库（CASE-202605-0003）但 `case_parties` 表中没有主申请人行；admin UI 因此可能在「主申请人」相关 reading 路径退化到从 `cases.customer_id` 反推。R14 BUG-165 的 P0 主链路在表面上"已通"，但其实**侧链 P0 数据完整性**仍破。 | server `caseParties.service.ts:60-66` `VALID_PARTY_TYPES = {spouse, child, guarantor, representative, other}`（5 值，无 `applicant`）；admin `CaseAdapterWriteBuilders.case-party.ts:57-67 buildPrimaryCasePartyInput()` 强制把主申请人 `partyType` 写为 `"applicant"`。Schema 双方契约不对齐，且无双向测试覆盖。|

### 0.4 总计偏差数

| 优先级 | 计数 | 摘要 |
|---|---|---|
| P0 | 1 | BUG-OBS-001（建议升级为 BUG-177 P1：建案后主申请人 case_parties 写入失败）|
| P1 | 0 | — |
| P2 | 1 | BUG-174（CaseValidationTab.vue i18n 遗漏 22 段）|
| P3 | 2 | BUG-175 + BUG-176 |
| **本轮新增** | **4** | 全部为 R14 land 项的边界遗漏 / 隐性瑕疵 / 隐性回归 |
| **R14 land 实测 PASS** | **8/9** | BUG-165/166/167/169/170/171/172/173 ✅；BUG-168 ⚠️ PARTIAL → 派生 BUG-174 |
| **R13 land reaffirm** | **8/8** | BUG-157/158/159/160→166/161/162/163→171/164 ✅ |
| **跨轮 land reaffirm** | **1/1** | BUG-137 ✅ |

### 0.5 三句话结论

1. **R14 标 ✅ FIX-LANDED 的 9 条新增 + R13 8 条 land 项 + 跨轮 BUG-137，复测整体通过率 17/18 = 94.4%**：BUG-165/166/167/169/170/171/172/173 全 PASS（BUG-173 含一处轻量化双前缀噪声 → 派生 BUG-176）；BUG-157/158/159/161/162/164 + BUG-160→166 + BUG-163→171 + 跨轮 BUG-137 全 PASS。R14 修复整体质量优秀。
2. **唯一的 i18n 边界遗漏**：BUG-168 在 `CaseValidationSupport.vue` land 之后，**未把上层兄弟容器 `CaseValidationTab.vue` 一并 i18n 化**——这与 R14 §1 BUG-168 修复方向中点名的 `CaseSubmissionPackages.vue` / `CasePreSubmissionCheck.vue` 同族文案提示一致，但仓库中实际并不存在这两个组件，对应内容全部内联在 `CaseValidationTab.vue`，被遗漏。en-US / ja-JP demo 在 detail.validation 含 blocking 项或有 submissionPackages 时仍会裸露 22 段中文（→ BUG-174 P2）。
3. **本轮真正的高优问题是 BUG-OBS-001（建议立项 BUG-177 P1）**：R14 BUG-165 的 P0 owner UUID 链路修了，案件主表落库 OK，但 admin 在建案成功后自动 `POST /api/case-parties partyType="applicant"` 触发 server 400，导致 `case_parties` 表中**没有主申请人行**。这是个跨 R10-R14 都未被发现的隐性 schema 契约不对齐——admin 与 server 各持一份不同的 `partyType` 值集合，且没有双向 contract test 覆盖。看似 case 创建 P0 已通，实则数据完整性仍破。

---

## 1. 新增 Bug

### BUG-174 [P2][FE] `CaseValidationTab.vue` i18n 遗漏 22 段中文（R14 BUG-168 fix 边界缺口）

- **优先级**：P2（en-US / ja-JP 多语合规破坏；任何含 blocking gate / submission package / correction 的案件都中）
- **chrome-devtools-mcp 取证（en-US，CASE-202604-0011，content `?tab=preSubmission`）**：

  ```js
  // /#/cases/df9d1e84-fd62-4687-9297-decd8848412f?tab=preSubmission ; locale=English
  // 点击 [role=tab] "Pre-submission check"
  document.querySelector('main').innerText.match(/[\u4e00-\u9fff]+/g);
  // → ["试探客户","提交前检查","校验通过","无阻断项","提交包","历史快照","暂无提交包记录"]
  // CJK 计数 7（"试探客户" 是合法客户名，其余 6 段是 i18n 漏抽）
  ```

  注：当前 demo 案件 `detail.validation.{blocking, warnings, info}` 与 `detail.submissionPackages` 都为空，所以仅渲染到了 6 段；对含数据案件还会泄漏 16 段（详见根因）。

- **根因**：

  ```vue
  <!-- packages/admin/src/views/cases/components/CaseValidationTab.vue -->
  L66:  <h2 class="vt__title">提交前检查</h2>
  L71:  当前卡点
  L90:  重新检查
  L99:  必须先处理
  L100: 当前卡点
  L111: 修复建议：{{ item.fix }}
  L127: 责任人：{{ item.assignee }}
  L128: 截止：{{ item.deadline }}
  L135: 建议补强
  L136: 建议处理
  L145: 建议：{{ item.note }}
  L152: 补充说明
  L153: 仅提示
  L182: <p>校验通过，无阻断项</p>
  L197: <h2 class="vt__title">提交包（历史快照）</h2>
  L212: 新建提交包
  L227: {{ pkg.locked ? "已锁定" : pkg.status }}
  L232: <div v-else class="vt__empty">暂无提交包记录</div>
  L236: <span class="vt__kicker vt__kicker--warning">补正包</span>
  L237: <h2 class="vt__title">补正通知关联</h2>
  L245: 关联原提交包：{{ detail.correctionPackage.relatedSub }}
  L247: 补正截止：{{ detail.correctionPackage.corrDeadline }}
  L250: 补正项：{{ detail.correctionPackage.items }}
  ```

  共 22 处中文字面量，覆盖三个 Card（提交前检查 / 提交包历史快照 / 补正通知关联）。R14 §1 BUG-168 fix 修复方向曾点名"另涉及 `CaseSubmissionPackages.vue` / `CasePreSubmissionCheck.vue` 同族文案"，但仓库中实际并不存在这两个组件，相关内容全部内联在 `CaseValidationTab.vue`；R14 land 时只覆盖了通过 `<CaseValidationSupport :detail :readonly />` 引入的下层支持区。

- **修复方向**：

  1. 把 22 段抽到 `cases.detail.validation.tab.*` i18n key（与 R14 已抽的 `cases.detail.validation.*` 错开命名空间，避免冲突）：
     - `tab.gateCard.{title,reCheckBtn,currentBlocker,mustHandleFirst,fixSuggestion,assignee,deadline,recommendStrengthen,recommendHandle,suggestion,supplementaryInfo,onlyTip,noBlockers}`
     - `tab.submissionPackages.{title,createBtn,locked,empty}`
     - `tab.correction.{kicker,title,relatedSub,corrDeadline,items}`
  2. en-US / ja-JP catalog 同步补齐。
  3. 为含数据 fixture（`detail.validation.blocking.length > 0` / `detail.submissionPackages.length > 0` / `detail.correctionPackage` 三态）补 i18n 测试。

- **测试补强**：
  1. `CaseValidationTab.bug174.test.ts`：构造 fixture 让 blocking + warnings + info + submissionPackages + correctionPackage 全非空，三语 mount 断言 `wrapper.html()` 不含 `[\u4e00-\u9fff]+`（en-US / ja-JP）；zh-CN 验证文案存在。
  2. 加一个 e2e smoke：`?tab=preSubmission` 切换到 en-US 后整页 CJK regex 匹配 ≤ 1（仅允许客户名 `试探客户` 这种合法客户输入）。

- **关联**：与 R14 BUG-167/168/169 同族（case detail 各 tab i18n）；继承 R14 §1 BUG-168 的修复方向描述歧义。

---

### BUG-175 [P3][FE/BE] Tasks → Reminder log `payloadSnapshot.statusOfResidence` 直显 ja-JP，缺 locale 解析

- **优先级**：P3（en-US / zh-CN demo 下显示 ja-JP 字符；UX/i18n 双重问题；与 BUG-172 同族但渠道不同）
- **chrome-devtools-mcp 取证（en-US）**：

  ```js
  // /#/tasks → click [role=tab] "Reminder log" ; locale=English
  Array.from(document.querySelectorAll('main table tbody tr')).slice(0,3).map(tr => tr.innerText.split('\n')[0]);
  // → [
  //   "経営・管理 · Renewal reminder 180 days before expiry",
  //   "経営・管理 · Renewal reminder 90 days before expiry",
  //   "経営・管理 · Renewal reminder 30 days before expiry",
  // ]
  // 即使 UI locale = en-US，前缀仍为 ja-JP "経営・管理"
  // 期望 en-US: "Business Manager · Renewal reminder 180 days before expiry"
  // 期望 zh-CN: "经营管理 · 续签提醒（到期前 180 天）"
  ```

- **根因**：

  ```ts
  // packages/admin/src/views/tasks/model/taskWorkbenchViewHelpers.ts:104-130
  export function reminderTitle(reminder: ReminderRecord, t: TaskI18nT): string {
    const payload = reminder.payloadSnapshot ?? {};
    if (typeof payload.label === "string" && payload.label.trim()) {
      return payload.label.trim();
    }
    const daysBefore = payload.daysBefore;
    const statusOfResidence = payload.statusOfResidence;  // ← 直读 server 写入的 ja-JP 标签
    if (typeof daysBefore === "number") {
      if (typeof statusOfResidence === "string" && statusOfResidence.trim()) {
        return t("tasks.reminderTitle.daysBefore", {
          visa: `${statusOfResidence.trim()} · `,           // ← 直接拼接，缺 locale 解析
          days: daysBefore,
        });
      }
      ...
    }
  }
  ```

  server 在 `reminders.payload_snapshot.statusOfResidence` 写入的是 ja-JP 文案（如 `経営・管理`），admin 没有把它当作 typeCode 走 `getCaseTypeLabel(typeCode, locale)` 解析。

- **修复方向**：
  1. **server（首选）**：`reminders` 表写入 payload 时改存 `statusOfResidenceCode`（如 `business_manager` / `dependent`），admin 读出后走 `getCaseTypeLabel(code, locale)` 解析；migration 040 backfill 历史 ja-JP 文案 → typeCode。
  2. **admin（兜底）**：`taskWorkbenchViewHelpers.reminderTitle` 在拼接前先用 ja-JP 文案 → typeCode 反向映射（仅作为旧数据兼容层），命中后走 i18n catalog；未命中保持原值并 console.warn。
  3. **测试补强**：`taskWorkbenchViewHelpers.bug175.test.ts`：(a) payload `statusOfResidence="経営・管理"` + locale="en-US" → 标题前缀 "Business Manager · ..."；(b) locale="zh-CN" → "经营管理 · ..."；(c) locale="ja-JP" → "経営・管理 · ..."。

- **关联**：BUG-172（同族，case 列表 Type 列 Title Case，但 BUG-172 走的是 `getCaseTypeLabel`）；R14 §0.6 提到的"reminder 渠道未走统一 i18n"在本轮被实证。

---

### BUG-176 [P3][FE] BUG-173 toast 详情文案双前缀 `CASE_OWNER_NOT_FOUND: CASE_OWNER_NOT_FOUND:`

- **优先级**：P3（R14 BUG-173 fix 留下的轻量化噪声；不影响 actionable 性，但显得不专业）
- **chrome-devtools-mcp 取证（en-US，建案 Step 4，owner=Suzuki）**：

  ```text
  toast 标题：Failed to create case
  toast 详情：CASE_OWNER_NOT_FOUND: CASE_OWNER_NOT_FOUND: ownerUserId "suzuki" does not match any active user in the organization
                ↑ admin 拼接的 code 前缀     ↑ server message 内置的 code 前缀（R14 BUG-165 fix）
  toast 引导：The selected owner could not be resolved. Please go back to Step 3 and re-select the owner.
  ```

- **根因**：

  ```ts
  // packages/admin/src/views/cases/model/useCreateCaseModelSubmit.ts:67-77
  export function normalizeSubmitError(e: unknown): SubmitErrorInfo {
    if (e instanceof CaseRepositoryError) {
      const message = e.serverErrorCode
        ? `${e.serverErrorCode}: ${e.message}`     // ← 无条件前置 code + ": "
        : e.message;
      return {
        message,
        code: e.serverErrorCode ?? undefined,
        detail: e.detail ?? undefined,
      };
    }
    ...
  }
  ```

  server R14 BUG-165 fix 中采用 `throw new BadRequestException(\`CASE_OWNER_NOT_FOUND: ownerUserId "...\` ...)` 把错误码写入 message 文本；admin 又拼了一次。

- **修复方向**：

  ```ts
  if (e instanceof CaseRepositoryError) {
    const code = e.serverErrorCode;
    const rawMessage = e.message;
    // 避免 "CODE: CODE: ..." 双前缀：仅当 message 不以 "CODE: " 开头时才前置
    const message = code && !rawMessage.startsWith(`${code}: `)
      ? `${code}: ${rawMessage}`
      : rawMessage;
    return { message, code: code ?? undefined, detail: e.detail ?? undefined };
  }
  ```

  另一个等价方案：让 server 不要在 `message` 里写 `CODE: ` 前缀，统一交给 admin 端拼接（更干净，但需要审计所有 throw 点）。

- **测试补强**：扩展 `useCreateCaseModelSubmit.bug173.test.ts`：(d) mock `CaseRepositoryError(serverErrorCode="CASE_OWNER_NOT_FOUND", message="CASE_OWNER_NOT_FOUND: ownerUserId ...")` → `submitError.value.message` 不应出现 `CASE_OWNER_NOT_FOUND: CASE_OWNER_NOT_FOUND:` 双前缀。

- **关联**：与 R14 BUG-173 fix（commit `db99e2c`）同源；与 R14 BUG-165 server fix 协议层错误消息约定不对齐。

---

### BUG-OBS-001（建议升 P1，立项 BUG-177）[P0/P1][FE/BE] 建案成功后主申请人 `case_parties` 写入失败 — admin/server schema 不对齐

> ⚠️ **建议升级**：本项原标 P0 OBS（顺手观测），但因为它**实质性破坏 case_parties 数据完整性 + 无 contract test 覆盖 + 跨 R10-R14 隐藏未发现**，建议作为正式 bug `BUG-177` 立项，优先级 P1（不阻断 case 创建本身，但破坏下游 BMV / 审批流对主申请人的查询）。

- **优先级**：P1（admin 建案 Step 4 主链路 P0 已通过，但侧链 case_parties 数据完整性破；多家 case detail / billing / messages 路径会进入 fallback）
- **chrome-devtools-mcp 取证（en-US，建案 Step 4，owner=Local Admin → 成功）**：

  ```text
  Network requests sequence (after click "Start case"):
    [reqid=638] POST /api/cases [201]
      response.body.id = "a63aa5f0-2268-421d-a912-9e0b69301155"
      response.body.caseNo = "CASE-202605-0003"
    [reqid=639] POST /api/case-parties [400]
      request.body = {"caseId":"a63aa5f0-2268-421d-a912-9e0b69301155","partyType":"applicant","customerId":"825d708f-dec5-443d-b987-63f0a62dae99","isPrimary":true}
      response.body = {"message":"Invalid partyType: applicant. Must be one of: spouse, child, guarantor, representative, other","error":"Bad Request","statusCode":400}
  ```

  即使前端 toast 显示 `Case created successfully`，server `case_parties` 表里 `case_id=a63aa5f0-...` 没有任何主申请人行。

- **根因**：

  ```ts
  // packages/server/src/modules/core/case-parties/caseParties.service.ts:60-66
  const VALID_PARTY_TYPES = new Set([
    "spouse",
    "child",
    "guarantor",
    "representative",
    "other",
  ]);
  // ↑ 5 个值，无 "applicant"

  // packages/admin/src/views/cases/model/CaseAdapterWriteBuilders.case-party.ts:57-67
  export function buildPrimaryCasePartyInput(
    caseId: string,
    customerId: string,
  ): CasePartyCreateInput {
    return {
      caseId,
      partyType: "applicant",       // ← admin 写死 "applicant"
      customerId: customerId || undefined,
      isPrimary: true,
    };
  }
  ```

  Admin 与 server 各持一份不同的 `partyType` 值集合，且没有双向 contract test 覆盖；`useCreateCaseModelSubmit.ts` 把 case-parties 写入设计为 fire-and-forget（失败仅推 `warning`，不阻断），所以 R10-R14 全部走查未发现 — 案件主表落库 OK，问题被掩盖。

- **业务影响**：
  - case detail Overview Customer 段、Billing 段、Messages 段、Tasks 段 reading 路径，凡是基于 `case_parties WHERE is_primary=true AND party_type='applicant'` 的查询都会**返空**；admin 当前可能 fallback 到 `cases.customer_id` 反推。
  - 任何后续 P1 流程（家族批量建案 / supporter 关联 / 报价模板填充）若假设主申请人有 case_parties 行，会出现 NPE / 行级数据缺失。
  - migration 历史数据 audit：`SELECT count(*) FROM cases c LEFT JOIN case_parties cp ON cp.case_id = c.id AND cp.is_primary = true AND cp.party_type = 'applicant' WHERE cp.id IS NULL;` 大概率非零。

- **修复方向**：

  1. **server（首选 / 高优）**：把 `applicant` 加入 `VALID_PARTY_TYPES`：

      ```ts
      const VALID_PARTY_TYPES = new Set([
        "applicant",        // primary applicant（与 admin buildPrimaryCasePartyInput 对齐）
        "spouse",
        "child",
        "guarantor",
        "representative",
        "other",
      ]);
      ```

  2. **migration backfill**：对所有 `case_parties` 缺主申请人行的 cases 补写：

      ```sql
      INSERT INTO case_parties (id, org_id, case_id, party_type, customer_id, is_primary, created_at, updated_at)
      SELECT gen_random_uuid(), c.org_id, c.id, 'applicant', c.customer_id, true, NOW(), NOW()
      FROM cases c
      WHERE NOT EXISTS (
        SELECT 1 FROM case_parties cp
        WHERE cp.case_id = c.id AND cp.is_primary = true AND cp.party_type = 'applicant'
      );
      ```

  3. **contract test（必须）**：
      - server `caseParties.service.contract.test.ts`：枚举 admin 端 `buildPrimaryCasePartyInput` / `buildRelatedCasePartyInput` 出现的所有 partyType 值（`applicant` / `spouse` / `child` / ...），断言 server 全部接受。
      - admin `CaseAdapterWriteBuilders.case-party.contract.test.ts`：从 server 导出的 `VALID_PARTY_TYPES` 类型断言 admin 不会送出未授权的 partyType。
      - 引入 shared types：把 `PartyType` 提到 `packages/server/src/.../caseParties.types.ts` 作为 source of truth，admin 通过 `import type { PartyType }` 引用（结合 OpenAPI / zod schema 同步）。

  4. **错误处理升级**：把 admin `submitPartiesAfterCreate` 中"主申请人写入失败"从 fire-and-forget warning 升级为 case detail page 的 Banner 提示（"主申请人未挂上 case_parties，可能影响后续流程，请重新挂载"），并提供"重新挂载"操作；不阻断建案 toast，但保留可追踪入口。

- **测试补强**：
  1. server `caseParties.service.bug-obs-001.focused.test.ts`：(a) `partyType="applicant"` + `isPrimary=true` → 201 + 行落库；(b) `partyType="applicant"` 与 `isPrimary=true` 同 case 已存在 → 409 `A primary applicant already exists for this case`。
  2. admin `useCreateCaseModelSubmit.bug-obs-001.test.ts`：mock `repo.createCaseParty(buildPrimaryCasePartyInput(...))` 返 201，断言不进入 warning 分支；mock 返 400 时断言 warning 内容含 `caseId` + `partyType="applicant"` 便于运营排查。

- **关联**：与 R14 BUG-165（建案 Step 4 主链路）同 PR 收口或紧邻 PR 收口；建议在同一个 sprint 一并 land，避免下一轮走查再次撞上。

---

## 2. R14 §0.3 BUG-165~173 实测验收逐条证据

> 与 §0.1 总表互为详证；以 chrome-devtools-mcp + 网络抓包 + curl 为锚。

### 2.1 ✅ PASS 8 条

#### BUG-165 ✅→✅ reaffirm（owner UUID 对称解析）

```js
// API 三场景
const baseBody = {
  customerId: '825d708f-dec5-443d-b987-63f0a62dae99',
  caseTypeCode: 'biz_mgmt_cert_4m',
  groupId: 'tokyo-1',
  stage: 'S1',
  dueAt: '2026-12-31',
  applicationType: 'certification',
  quotePrice: 150000,
};

POST /api/cases body={...baseBody, ownerUserId:"suzuki"}
→ 400 {"message":"CASE_OWNER_NOT_FOUND: ownerUserId \"suzuki\" does not match any active user in the organization","error":"Bad Request","statusCode":400}   ✅

POST /api/cases body={...baseBody, ownerUserId:"admin@local.test"}
→ 201 ownerUserId="00000000-0000-4000-8000-000000000011"   ✅ email-resolve

POST /api/cases body={...baseBody, ownerUserId:"   "}
→ 201 ownerUserId="00000000-0000-4000-8000-000000000011"   ✅ blank → fallback ctx.userId
```

UI 链路：navigate → 客户详情 → 「Create formal case」→ Step 1-4 → owner = "Local Admin" → 「Start case」→ POST `/api/cases` 201 → 创建 `CASE-202605-0003` → 跳成功页（「View case detail / Back to case list」）。

#### BUG-166 ✅→✅ reaffirm（PG 22P02 → 400）

```bash
POST /api/cases body={...baseBody, ownerUserId:"admin@local.test", assistantUserId:"tanaka"}
→ 400 {
  "code": "CASE_CREATE_FAILED",
  "detail": {
    "source": "pg",
    "constraint": null,
    "pgCode": "22P02",
    "pgMessage": "invalid input syntax for type uuid: \"tanaka\""
  },
  "message": "Failed to create case: invalid input format"
}   ✅
```

#### BUG-167 ✅→✅ reaffirm（CaseBillingTab i18n）

```js
// /#/cases/df9d1e84-fd62-4687-9297-decd8848412f?tab=billing ; locale=English
document.querySelector('main').innerText.match(/[\u4e00-\u9fff]+/g);
// → ["试探客户"]   仅命中客户名（合法）
// 模板 i18n: Total fees / Collected / Outstanding / DATE / TYPE / AMOUNT / STATUS / ACTIONS / Invoice / Invoice details are not shown in the current prototype.   ✅
```

#### BUG-169 ✅→✅ reaffirm（Documents tab 空态 i18n）

```js
// /#/cases/<fresh case>?tab=documents ; locale=English
document.querySelector('main').innerText.includes("No documents registered yet");      // true ✅
document.querySelector('main').innerText.includes("Register documents");                // true ✅
document.querySelector('main').innerText.includes("Add manually");                      // true ✅
```

#### BUG-170 ✅→✅ reaffirm（Overview group raw slug 三语）

```js
// /#/cases/<id>?tab=overview
locale=English  → Customer 段含 "Tokyo Team 1"，整页 /tokyo-1/ 零命中 ✅
locale=zh-CN    → "东京一组" ✅
locale=ja-JP    → "東京一組" ✅
```

#### BUG-171 ✅→✅ reaffirm（Reminder log dedupe key UUID）

```js
// /#/tasks → click "Reminder log"
[
  "Dedupe key residence_period:e00ea5d2:180",
  "Dedupe key residence_period:e00ea5d2:90",
  "Dedupe key residence_period:e00ea5d2:30",
]
// 全文 UUID v4 正则 [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12} 零命中  ✅
```

#### BUG-172 ✅→✅ reaffirm（case 列表 Type 列 Title Case 三语）

```text
en-US:  ["BMV (CoE 4-month)", "Business Manager Visa", "Dependent Visa"]   ✅ 全 Title Case
ja-JP:  ["経営管理（認定4ヶ月）", "経営管理ビザ", "家族滞在"]                ✅
zh-CN:  ["经营管理（认定4个月）", "经营管理签", "家族滞在"]                  ✅
```

#### BUG-173 ✅→✅ reaffirm（建案 Step 4 失败 toast detail 透传，含 BUG-176 噪声）

```text
toast 标题：Failed to create case
toast 详情：CASE_OWNER_NOT_FOUND: CASE_OWNER_NOT_FOUND: ownerUserId "suzuki" does not match...
toast 引导：The selected owner could not be resolved. Please go back to Step 3 and re-select the owner.
inline error chip：Step 4 顶部 owner 字段附近渲染 chip ✅
```

(双前缀 → BUG-176)

### 2.2 ⚠️ PARTIAL 1 条

#### BUG-168 ✅→⚠️ PARTIAL（CaseValidationTab.vue 未抽 i18n）

详见 §1 BUG-174。

---

## 3. 顺手补充观测

### 3.1 案件列表 Reminder log 表头与列结构（BUG-175 之外）

```text
表头：（无显式表头）
列：标题（含前缀 + 「#shortHash」短哈希）| 计划时间 | 状态 | 详情（caseNo + recipient + dedupeKey）
3 行（180 / 90 / 30 days before expiry），均 `Queued` 状态。
```

整页 UUID v4 正则零命中（→ BUG-171 PASS）；前缀 `経営・管理` 三语共用 ja-JP（→ BUG-175）。

### 3.2 console issue 7 个 form field 缺 id/name + 7 个 missing label（R14 §3.1 reaffirm）

R15 未深入定位；继承 R12-R14 backlog。

### 3.3 stage / phase 失配持续存在（R12-R14 → R15 reaffirm）

R10-R14 已记录此项为「stage / phase 终态联动」未决项；R15 仍不立 bug，等产品决策。

### 3.4 全局搜索仍 disabled（"Coming soon" / "建设中"）

R10-R14 一致；放在产品 backlog。

### 3.5 BMV intake `PATCH /api/customers/<id>/bmv-intake` 仍缺 endpoint 404（R13-R14 持续）

继承未修。

---

## 4. 仍未覆盖 / 待立项

本轮**未触及**（沿用 R12-R14 状态）：

- BUG-110（`tests/integration-pg/` schema-compatibility 测试体系）
- BUG-113 / 114 / 115（timeline query alias / dashboard 文案 / customer backfill）
- stage / phase 终态联动（产品决策；本轮 §3.3 再次出证）
- CLOSED_FAILED 路径 + closeReason 入参校验
- a11y `[role=tab]` ↔ `[role=tabpanel]` 关联（R10 §3.4 / R11 §3.2）
- case detail `?tab=basicInfo|forms|deadlines|messages|log` 五 tab 内容深度 i18n 扫（R14 §3.6 已建议）

本轮新增 4 条（BUG-174 / 175 / 176 + BUG-OBS-001）全部**待修复**：

- **BUG-174 P2** ✅ FIX-LANDED：`CaseValidationTab.vue` i18n 抽 22 段中文 + 三语 catalog 补齐 + 含数据 fixture i18n 测试。
- **BUG-175 P3** ✅ FIX-LANDED：server payload 改存 typeCode / admin reminderTitle 走 i18n catalog；migration 040 backfill 历史 ja-JP 文案。
- **BUG-176 P3** ✅ FIX-LANDED：`normalizeSubmitError` 防双前缀；扩展 BUG-173 测试。
- **BUG-OBS-001 / BUG-177 P1** ✅ FIX-LANDED：server `VALID_PARTY_TYPES` 加 `applicant` + migration 039 backfill 主申请人 case_parties 行 + 双向 contract test。

**R15 守门补强建议**：

- admin lint 自定义规则：`views/cases/components/**/*.vue` + `views/tasks/components/**/*.vue` 模板内不允许出现 `[\u4e00-\u9fff]+` 字面量（必须走 `t(...)`），覆盖 BUG-167/168/169/174/175 同族风险。
- shared types：把 server 端 `VALID_PARTY_TYPES` 提为 source of truth，admin 通过 `import type { PartyType }` 引用，避免 BUG-OBS-001 复发。
- e2e smoke：建案 Step 4 成功路径必须验证 `POST /api/case-parties` 也是 201（不是 400），否则 fail。

---

## 附录 — 关键证据快照

### A. chrome-devtools-mcp 走查清单（按 R14 §0.3 顺序）

| R14 BUG | URL / 操作 | R15 实测结论 | 证据 |
|---|---|---|---|
| BUG-165 | navigate `/#/customers/825d708f-...` → 「Create formal case」→ Step 1-4 → owner="Local Admin" → 「Start case」 | ✅ POST `/api/cases` 201 + `CASE-202605-0003` | reqid 638 |
| BUG-166 | curl POST `/api/cases` body.assistantUserId="tanaka" | ✅ 400 + detail.pgCode="22P02" + detail.pgMessage 完整 | API |
| BUG-167 | navigate `?tab=billing` ; locale=en-US | ✅ CJK 仅命中客户名 | evaluate_script |
| BUG-168 | navigate `?tab=preSubmission` ; locale=en-US ; click [role=tab] "Pre-submission check" | ⚠️ CJK 命中 6 段（→ BUG-174） | evaluate_script + 代码扫描 |
| BUG-169 | navigate `<fresh case>?tab=documents` ; locale=en-US | ✅ 空态 + 按钮全本地化 | evaluate_script |
| BUG-170 | navigate `?tab=overview` ; locale=en-US/zh-CN/ja-JP | ✅ 三语本地化，无 raw slug | evaluate_script |
| BUG-171 | navigate `/#/tasks` ; click [role=tab] "Reminder log" | ✅ dedupe key UUID 已短哈希 | evaluate_script |
| BUG-172 | navigate `/#/cases?scope=all` ; locale=en-US/zh-CN/ja-JP | ✅ 三语 Title Case | evaluate_script |
| BUG-173 | Step 4 owner="Suzuki" → 「Start case」 | ✅ toast detail + inline chip 出现（含 BUG-176 双前缀噪声） | reqid 637 + take_snapshot |
| **侧链** | reqid 638 之后的 reqid 639 | ⚠️ POST `/api/case-parties` 400（→ BUG-OBS-001） | reqid 639 |

### B. R14 §0.3 实测验收一图速查

```text
R14 §0.3 BUG-165..173 (9 条 ✅ FIX-LANDED)
├── ✅ PASS         × 8   (165, 166, 167, 169, 170, 171, 172, 173)
└── ⚠️ PARTIAL      × 1   (168 → CaseValidationTab.vue 漏 22 段中文 → BUG-174)

派生 / 隐性瑕疵：
├── BUG-174 P2 (BUG-168 边界遗漏)
├── BUG-175 P3 (与 BUG-172 同族，reminder 渠道)
├── BUG-176 P3 (BUG-173 双前缀噪声)
└── BUG-OBS-001 → 建议 BUG-177 P1 (隐性回归，case_parties 写入失败)

跨轮 land：BUG-137（empty/null birthday → 201）✅ R15 仍 PASS
R13 §1 reaffirm：8/8 ✅
```

### C. 一键复现脚本（chrome-devtools-mcp 化的 e2e）

```text
# 0) 登录（沿用浏览器 session）
navigate_page → /#/login ; fill admin@local.test / Admin123! ; click 登录
# 取出 token：localStorage.getItem('gyosei_os_admin_session_v1') → JSON.parse → .token

# 1) BUG-165 reaffirm（API 三场景）
curl -X POST /api/cases -H "Authorization: Bearer $TOKEN" -d '{"customerId":"825d708f-...","caseTypeCode":"biz_mgmt_cert_4m","groupId":"tokyo-1","stage":"S1","dueAt":"2026-12-31","applicationType":"certification","quotePrice":150000,"ownerUserId":"suzuki"}'
# → 400 CASE_OWNER_NOT_FOUND ✅

curl ... -d '{"...","ownerUserId":"admin@local.test"}'
# → 201 ownerUserId="00000000-0000-4000-8000-000000000011" ✅

# 2) BUG-166 reaffirm（PG 22P02 → 400）
curl ... -d '{"...","ownerUserId":"admin@local.test","assistantUserId":"tanaka"}'
# → 400 detail.pgCode="22P02" ✅

# 3) BUG-167/168/169/170（case detail i18n 三语）
navigate_page → /#/cases/df9d1e84-...?tab=billing ; switch locale=English
evaluate_script: main.innerText.match(/[\u4e00-\u9fff]+/g)
# → ["试探客户"]  仅客户名 ✅

navigate_page → /#/cases/df9d1e84-...?tab=preSubmission ; click [role=tab] "Pre-submission check"
evaluate_script: main.innerText.match(/[\u4e00-\u9fff]+/g)
# → ["试探客户","提交前检查","校验通过","无阻断项","提交包","历史快照","暂无提交包记录"]
# 中文泄漏 6 段 ❌ → BUG-174

navigate_page → /#/cases/<fresh>?tab=documents
# 空态 + 按钮全本地化 ✅

navigate_page → /#/cases/<id>?tab=overview ; locale=en-US/zh-CN/ja-JP
# 三语 group label 本地化，无 tokyo-1 直显 ✅

# 4) BUG-171 reaffirm（dedupe key 短哈希）
navigate_page → /#/tasks ; click [role=tab] "Reminder log"
evaluate_script: main.innerText.match(/Dedupe key [\w_]+:[0-9a-f-]{36}/)
# → null （UUID 已被 maskDedupeKeyUuid 截短为 8 位）✅

# 5) BUG-172 reaffirm（case 列表 Type 列三语 Title Case）
navigate_page → /#/cases?scope=all ; locale=en-US/ja-JP/zh-CN
evaluate_script: 拿 td:nth-child(4) distinct
# en: BMV (CoE 4-month) / Business Manager Visa / Dependent Visa ✅

# 6) BUG-173 reaffirm（含 BUG-176 双前缀）
建案 Step 4 owner="Suzuki" → 「Start case」
# toast: "CASE_OWNER_NOT_FOUND: CASE_OWNER_NOT_FOUND: ownerUserId..."  ❌ 双前缀 → BUG-176

# 7) BUG-OBS-001（建案成功后 case-parties 400）
建案 Step 4 owner="Local Admin" → 「Start case」 → 成功 toast
list_network_requests:
  POST /api/cases [201]    ← 主链路 OK
  POST /api/case-parties [400]    ← 主申请人 partyType="applicant" 被 server 拒绝 ❌ → BUG-OBS-001

# 8) BUG-175（reminder log 在任意 locale 下 ja-JP 字符泄漏）
navigate_page → /#/tasks ; click [role=tab] "Reminder log" ; locale=en-US
evaluate_script: rows[0].innerText.startsWith('経営・管理 · Renewal')
# → true ❌ → BUG-175
```

### D. 网络与 console 噪声基线

- 详情页一次完整加载：≈ 11 个聚合接口（与 R10-R14 一致，无新接口）。
- 客户新建 modal：单次完整填写触发 3 次 `POST /api/customers/check-duplicates` + 1 次 `POST /api/customers`（与 R13-R14 一致）。
- 建案 Step 4 一次完整提交：1 次 `POST /api/cases` + N 次 `POST /api/case-parties`（其中主申请人那次 400 被 admin 静默处理，→ BUG-OBS-001）。
- console：R15 复测期间未观测到新的 i18n missing key warn；7 个 form field id/name 缺失 issue + 7 个 missing label issue 仍存在（继承 R12-R14）。
- API：BMV intake `PATCH /api/customers/<id>/bmv-intake`（缺 endpoint，404）是 R13-R15 持续的 server-side 缺口。
- 关键 bug 触发：admin Step 4 → POST /api/case-parties [400] response.body = `Invalid partyType: applicant. Must be one of: spouse, child, guarantor, representative, other`（BUG-OBS-001 触发链路）。

---

## E. 给 R16 的 backlog（按优先级 + ROI 排序）

1. **BUG-OBS-001 / BUG-177 P1**（先做）：server `VALID_PARTY_TYPES` 补 `applicant` + migration backfill 主申请人 case_parties 行 + 双向 contract test。一次性修复跨 R10-R14 隐藏的隐性回归，ROI 最高。
2. **BUG-174 P2**：`CaseValidationTab.vue` i18n 抽 22 段 + 三语 catalog + 含数据 fixture 测试。覆盖含 blocking gate / submission package 的 demo 案件 i18n 合规。
3. **BUG-175 P3**：server payload 改存 typeCode + admin `reminderTitle` 走 i18n catalog + migration backfill。与 BUG-172 形成完整收口，覆盖 reminder 渠道。
4. **BUG-176 P3**：`normalizeSubmitError` 防双前缀。低 ROI 但高可见度（toast 噪声）。
5. **R15 守门补强**：admin lint 规则禁中文字面量 + shared `PartyType` 类型 + e2e smoke 验证 case_parties 也 201。
