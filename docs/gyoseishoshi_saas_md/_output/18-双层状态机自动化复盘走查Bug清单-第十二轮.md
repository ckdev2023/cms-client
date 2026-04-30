# 客户/案件模块（admin）— 双层状态机自动化复盘走查 Bug 清单（第十二轮 / R11 BUG-133~136 land 验收 + 事务所流程驱动 e2e 走查）

> 生成日期：2026-04-30（同日 chrome-devtools-mcp 复盘走查 + 事务所流程 Step 1-20 全链路驱动覆盖 + R11 闭环验收）
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/17-双层状态机自动化复盘走查Bug清单-第十一轮.md` §1 BUG-133 / 134 / 135 / 136
> - `docs/事务所流程/新规经营管理签申请全套流程Markdown文档.md`（20 步状态机 / 数据结构 / 业务规则）
> - `docs/事务所流程/在留資格別必要情報一覧Ver2.中文规范版资料清单.md`（7 场景资料矩阵）
> - `docs/gyoseishoshi_saas_md/_output/10-事务所流程驱动走查Bug清单-第四轮.md` BUG-086 / 088 / 089 / 093 R4 闭环结论
>
> 走查工具：`chrome-devtools-mcp`（`navigate_page` / `take_snapshot` / `evaluate_script` / `take_screenshot` / `fill` / `list_console_messages` / `list_network_requests`） + `curl`（HTTP API） + 代码审查
> 走查环境：`http://localhost:5173/api`，本地 admin（`admin@local.test` / `Admin123!`）；后端 NestJS `:3300`，Vite 反代 `:5173`，PostgreSQL `cms-client-postgres-1` `:5433`
> 与第十一轮（`17-...md`）互为续篇；本轮**先验 R11 §1 四条 bug，再以经管签 4M 流程为锚把 admin 全链路走完**，统一登记走查中暴露的新偏差与 R4/R11 文档闭环回退。

---

## 0. 第十二轮总结

### 0.1 R11 §1 四条 bug 验收（chrome-devtools-mcp 实测）

| # | R11 结论 | R12 实测 | 一句话 |
|---|---|---|---|
| BUG-133（CaseOverviewTab stage 卡未 i18n / 终态硬编码 `"S9"`） | R11 标 ❌ FAIL | **❌ FAIL（继承）** | en-US 下 CASE-202604-0004 (S2/WAITING_MATERIAL) overview value = `资料收集中`（raw zh）；CASE-202604-0011 (S1/CLOSED_SUCCESS terminal) en-US/ja-JP overview value = `S9`（硬编码）。R11 §1 的修复方向尚未 land。|
| BUG-134（BillingListView GROUP filter 模块级 JA 默认） | R11 标 ❌ FAIL | **❌ FAIL（继承）** | en-US 与 zh-CN 下过滤下拉 = `["东京一组（已停用？）" → "東京一組"]` 仍为 JA 字面；ja-JP PASS。R11 §1 修复方向尚未 land。|
| BUG-135（server 8 处 `String(row.created_at)`） | R11 标 ✅ R11 已 land | **✅ PASS** | `/api/groups[].createdAt = "2026-04-27T11:40:49.675Z"` ISO；`/api/feature-flags[].updatedAt` ISO；server 仓库扫无 `String(*_at)` 残留。R11 land 摘要核对相符。但 admin Settings → Group 表格 UI 仍裸显 ISO（详见 §3.1）。|
| BUG-136（CustomerListView group cell 直显 raw UUID） | R11 标 ✅ R11 已 land | **⚠️ PARTIALLY FIXED**（仅 `views/customers` PASS） | Customers 列表 group cell PASS（`东京一组`）；但 `views/cases/CaseCreateStep2.vue` 客户下拉仍透传 UUID 作 `groupLabel`；`views/billing/BillingTable.vue` row group cell 仍空白；详见 §1 BUG-139 / BUG-140。|

### 0.2 R4 闭环回退确认（事务所流程驱动捕获）

R4 §0.4 把以下 4 条 P0/P1/P2 都标 ✅ 已修，本轮在 admin UI 端实测全部出现回退：

| ID | R4 状态 | R12 实测 | 一句话 |
|---|---|---|---|
| BUG-086（`/#/tasks` placeholder） | ✅ 已修 | **❌ REGRESSED → BUG-142** | `/#/tasks` 当前是 "The route for Tasks & reminders is now registered and ready for the full page" 占位页，正文 200+ 字均是 placeholder 描述；Step 19-20 续签提醒链路再次阻塞。|
| BUG-088（`customerNumber` = UUID） | ✅ 已修 | **❌ REGRESSED → BUG-145** | `POST /api/customers` 直接调用接口创建的客户 customerNumber 仍是 UUID（如 `f5caa61e-...`），未走 `customers.numbering.ts`；admin 列表对该客户显示 raw UUID 替代 `CUS-202604-NNNN`。|
| BUG-089（owner / group 全空） | ✅ 已修 | **❌ REGRESSED → BUG-146** | Customers 列表 `负责人` 列在所有客户行（包括 `R6试探客户` / `Tani Keiei Cert4M Test` 等已有真实 case 客户）显示 `—`。|
| BUG-093（介绍人字段重复） | ✅ 已修 | **❌ REGRESSED → BUG-141** | `CustomerCreateModal.vue:310-323` legacy `referrer` 输入框未删；`CustomerCreateModal.vue:398-415` `referrerName` 没有按 `sourceType === 'REFERRAL'` 条件渲染；配套 `CustomerCreateModal.bug093.test.ts:46` 改成 `describe.skip`，BUG-093 测试骨架被关闭，回归契约破裂。|

> 这 4 条均能经 chrome-devtools-mcp 直击复现；R4 二次重核 18:33 的「全部 ✅ 已修」结论需要回灌为「⚠️ 复修后再回退」。

### 0.3 本轮新增偏差（事务所流程驱动）

| # | 优先级 | 现象（一句话） | 根因（一句话） |
|---|---|---|---|
| **BUG-137** | P1 [FE] | 个人客户新建表单不填生年月日时，`POST /api/customers` 报 400 "Invalid baseProfile: birthday must be a valid date string"，UI 顶部红条仅显示 raw i18n key `customers.list.createModal.state.validationError`。 | 前端 `CustomerAdapterShared.buildBaseProfile` 把空 birthday 输出为 `''`（而非省略字段）；server `parseBaseProfile` 把 `''` 当作非法日期；前端 `mapCreateFormError` → 'VALIDATION_ERROR' → i18n key 在 zh-CN/ja-JP `messages/customers/*.ts` 未定义 `createModal.state.validationError`（en-US 也只在 `en-US-list.ts` 一处）。 |
| **BUG-138** | P1 [FE/i18n] | `CaseDetailView` 概览页"下一关键动作"区下两个按钮 label 在 zh-CN / en-US / ja-JP 都直接显示 raw key `cases.coach.docManagement` 与 `cases.coach.runValidation`。 | i18n 资源未注册这两个 key；console 实际并未告警，因为 vue-i18n 默认 fallback 行为只在显示 key 时静默；在 R11 doc 已隐含线索（"近期动态" 区域有相关代码 path）。 |
| **BUG-139** | P1 [FE/data] | `CaseCreateStep2.vue` 主申请人下拉 + 选中卡片 + Step 3 "Group 继承自主申请人" 三处都直显 group UUID（`ef21fdd2-1ffc-4a27-8b47-a640d6bd021c`），与 R11 BUG-136 customers 列表修复同根。 | `useCustomerDropdownData.ts:122` `groupLabel: group` 直接把 raw UUID 当 label；R11 注册的 `groupAliasesRef` 别名表只在 `resolveGroupLabel` 路径生效，case 向导 adapter 没消费别名。 |
| **BUG-140** | P1 [FE/data] | `BillingTable.vue` 案件收费列表 Group 列在所有 row（3/3）下显示空白 `—` 或 `""`，与 BUG-139 同根（billing 链路也未消费 group alias）。 | billing row 的 `row.group` 是真实 DB UUID，`BillingTable.vue` 不调用 `resolveGroupLabel(row.group, ..., locale.value)`，落入静态 catalog 未命中→空字符串分支。 |
| **BUG-141** | P1 [FE/UX] | `CustomerCreateModal` 仍并存 legacy `来源 / 介绍人` 自由文本框 + 新 `介绍人姓名` 字段；后者也没按 `sourceType=REFERRAL` 条件渲染。R4 标 ✅ 已修，实际回退。 | `CustomerCreateModal.vue:310-323` 仍渲染 `t("customers.list.createModal.fields.referrer")`；`CustomerCreateModal.vue:398-415` 介绍人姓名无 `v-if`；`CustomerCreateModal.bug093.test.ts:46` `describe.skip("CustomerCreateModal — BUG-093 字段去重", ...)` 整组被 skip，回归契约失效。 |
| **BUG-142** | P0 [FE] | `/#/tasks` 任务与提醒页面退回 placeholder（"This placeholder keeps sidebar navigation valid for Tasks & reminders ... until the full module is implemented here"），Step 19-20 续签提醒链路从 admin 端无法走通。 | R4 BUG-086 land 后被回退；与 reminders INSERT NOT NULL 失败（R5 BUG-096）一并使该 view 重新降级到 stub。 |
| **BUG-143** | P1 [FE/i18n] | 案件列表（`/#/cases`）`类型` 列对所有 19 行显示 raw enum identifier `biz_mgmt_4m` / `biz_mgmt` / `family`（不分 locale）。 | `views/cases/CaseTableRow.vue` 直插 `row.type`，未走 i18n / `templateLabel`；与 BUG-132 / BUG-133 raw 字段透传同根。 |
| **BUG-144** | P1 [FE/i18n] | 建案向导 Step 1（`CaseCreateStep1`）的模板按钮在 en-US 下 8/10 模板的描述仍是 raw zh-CN 字面（"经营管理签总览 — 根据具体场景..." / "技术・人文知识・国际业务认定 — ..." / "集团 / 关联企業内部人事调动 — ..." 等）。仅 `Dependent Visa` 与 `Engineer/Specialist in Humanities/Int'l Services` 两条 description 已译。 | 模板 catalog 内 `description` 字段在 i18n 资源里仅 family / hum 两条 key，剩余 8 条被 fallback 至 zh-CN 源文本。 |
| **BUG-145** | P1 [BE] | `POST /api/customers` 直接调用（验证 BUG-088 是否绑定到 customerNumber 生成）创建的客户，`customerNumber` 仍以 UUID 返回（admin 列表展示也是 UUID）。R4 标 ✅ 已修，实际回退或部分路径未走 numbering。 | `customers.numbering.ts#createCustomerWithNumbering` 未在所有创建路径下被调用；本轮直接 POST 创建的两条客户（`f5caa61e-...` / `2d233e59-...`）均未拿到 `CUS-202604-NNNN`。 |
| **BUG-146** | P1 [FE/data] | Customers 列表（我的 / 全所）所有客户行 `负责人` 列显示 `—`；Customer 详情页 `客户负责人` dropdown 在已存在客户上 unselected。 | `customers.row-aggregates.ts#mapCustomerAggregates` owner_name 解析未生效；与 R4 BUG-089 修复路径出现回退或 query 端 `buildOwnerNameExpr` 与 admin scope=mine 的 join 不一致。 |
| **BUG-147** | P2 [FE/perf] | 填写客户新建表单时，每次 keystroke 都触发 `POST /api/customers/check-duplicates`（共记录 28 次/单次表单填写），缺 debounce 与 batching。 | `useCustomerCreateForm.ts` 内查重 watcher 直接监听字段变化，无 `debounce`；产品场景 1 客户 1 次入库≈ 28 个无效 RPC。 |
| **BUG-148** | P3 [FE/a11y] | `CustomerCreateModal` 21 个 form fields 没有 `id` 或 `name` 属性，16 个字段没有关联的 `<label for>`（chrome devtools issues）。 | `CustomerCreateModal.vue` `<input>` / `<select>` 大量缺少 `id`，导致 a11y / 浏览器 autofill 全部退化。 |
| **BUG-149** | P2 [FE/UX] | 建案向导 Step 1 案件标题自动生成器 + 申请类型双重拼接，结果残留语义重复（"经营管理（认定 4 个月）认定" / "Dependent VisaCertificate of Eligibility"）；en-US 下还缺空格。 | 标题模板硬编码 `${templateName}${applicationType}`，未识别模板名内已包含申请类型，并且未在前后插入分隔符。 |
| **BUG-150** | P2 [FE/UX] | 建案向导 Step 3 owner dropdown 不含当前登录用户 `Local Admin`，导致登录用户无法把案件分给自己。 | staff fixture（`铃木/田中/李/佐藤/山田翔太/高桥健太/铃木明里` 7 人）来自 mock 数据，未把当前 session user 合并入选项。 |
| **BUG-151** | P3 [FE] | 建案向导 Step 4 复核区 `收费金额` cell 直接显示 raw `180000`，无 `¥` 与千分位。 | review 视图直接 `{{ amount }}`，未走 `formatCurrency`/`Intl.NumberFormat`。 |
| **BUG-152** | P3 [FE/i18n] | 建案向导 Step 2 选中客户卡片副本写死 JA 字面 `主申請人`，在 zh-CN/en-US 都不变。 | `useCustomerDropdownData.ts:123` `roleHint: "主申請人"`（JA）硬编码；render 端没走 `t("...")`. |
| **BUG-153** | P2 [FE] | `CaseDetailView` 头部 `phase` chip 在 zh-CN/en-US/ja-JP 均渲染 2 次（"Closed (success)" 出现两次 / "等待资料" 出现两次）。 | header 区域 chip 列表里 phase 同时被 stage chip 后置 + 业务相位单独 chip 重复绑定。 |
| **BUG-154** ✅ | P2 [FE] | 客户详情页 `客户负责人` dropdown 在 `R6试探客户`（已有 10 active cases）上仍 unselected（无 default value）。 | `useCustomerBasicInfoModel.ownerOptions` 只取 catalog 7 项，未把客户已存在但 catalog 外的 `Local Admin` 注入合并选项；与 BUG-146 同根。R12 已修：`ownerOptions` 复用 `withCurrentUserOwnerOption` 注入持久化 owner，select 命中已有姓名。 |
| **BUG-155** | P3 [FE] | 客户列表卡片 `我的客户` = 0 ↔ "我的" tab 列表显示 2 条客户（同 scope=mine）；卡片摘要与列表 count 不一致。 | `customers.summary` API 与 `/api/customers?scope=mine` 列表对 owner 的判定口径不同（前者按 `owner_user_id === currentUser`，后者按 `scope=mine` 含 group / org 兜底）。 |
| **BUG-156** | P3 [FE] | Settings → Group 管理表格 `创建时间` 列直显 `2026-04-27T11:40:49.675Z`（ISO 8601 raw），未走 `formatDate`。 | `GroupListPanel.vue:160` 是 `{{ group.createdAt }}` 裸插值，与 R11 §1 BUG-135 末尾 TODO 一致。 |

### 0.4 总计偏差数

| 优先级 | 计数 | 摘要 |
|---|---|---|
| P0 | 1 | BUG-142（任务页 placeholder 阻塞 Step 19-20）|
| P1 | 9 | BUG-137 / 138 / 139 / 140 / 141 / 143 / 144 / 145 / 146 |
| P2 | 6 | BUG-147 / 149 / 150 / 153 / 154 |
| P3 | 4 | BUG-148 / 151 / 152 / 155 / 156 |
| **本轮新增** | **20** | — |

### 0.5 三句话结论

1. **R11 §1 修复 1.5/4 land**：BUG-135（server 时间戳契约）✅ 已 land；BUG-136（group UUID 直显）只覆盖了 `views/customers` 一个出口，case 建案向导 + 收费列表两条主路径仍直显 UUID（BUG-139 / BUG-140）；BUG-133 / BUG-134 与 R11 §1 写的"待 land"完全相符，目前都仍是 raw zh / JA leftover。
2. **R4 闭环 4 条全部回退**（BUG-086 / 088 / 089 / 093）：分别表现为 admin tasks 页退回 placeholder、新建客户拿不到 `CUS-NNNN` 编号、客户列表 owner 列恢复为 `—`、客户新建 modal 重新并存 legacy + 新介绍人字段；其中 BUG-093 配套测试 `CustomerCreateModal.bug093.test.ts:46` 被改成 `describe.skip`，**回归契约骨架已被关闭**，是最致命的一处。
3. **事务所流程 Step 1-20 当前从 admin UI 端无法走通**：Step 1-2 客户新建被空 birthday 卡死并暴露 raw i18n key（BUG-137）；Step 5-6 建案向导 Step 2/3/4 累计踩 4 处 group UUID / 模板描述 / 类型枚举的 raw-字段透传问题（BUG-139 / 144 / 152 / 153）；Step 7-12 案件状态机推进受 raw enum `biz_mgmt_4m`（BUG-143）+ 概览 stage 卡硬编码"S9"（BUG-133）干扰；Step 19-20 入口页直接是 placeholder（BUG-142）。从用户体验角度，admin 端尚未具备「以经管签 4M 为基准跑通一遍 e2e」的能力。

---

## 1. 新增 Bug

### BUG-137 [P1][FE] `CustomerCreateModal` — 不填生年月日时 server 400 + UI 直显 raw i18n key

- **优先级**：P1（个人客户新建表单 30% 概率命中——多数人不填生日；同时暴露 i18n 资源 gap）
- **chrome-devtools-mcp 取证**：

  ```js
  // navigate_page → /#/customers ; click "添加客户"
  // fill_form: displayName / legalName / kana / phone / email / group / location / sourceType / visaType / referrerName / note
  // birthDate: 留空（未交互日期 spinbutton）
  // click "创建客户"
  //
  // 直接通过 `evaluate_script` 复现：
  await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      type: 'individual',
      baseProfile: {
        displayName: 'R12 keiei probe customer 3',
        legalName: 'Yamada Taro 3',
        // ...省略其它字段...
        birthday: '',          // ← UI 透传出来的就是空字符串
      },
    }),
  });
  // → 400 { message: "Invalid baseProfile: birthday must be a valid date string", error: "Bad Request", statusCode: 400 }
  ```

  UI 顶部红条文案直接渲染 `customers.list.createModal.state.validationError`（DevTools 控制台 warn：`[intlify] Not found 'customers.list.createModal.state.validationError' key in 'zh' locale messages`）。

- **根因**：

  ```183:200:packages/admin/src/views/customers/model/CustomerAdapterShared.ts
  export function buildBaseProfile(input: BaseProfileInput): Record<string, unknown> {
    const baseProfile: Record<string, unknown> = {
      displayName: input.displayName.trim(),
      legalName: input.legalName.trim(),
      // ...
      birthday: input.birthDate.trim(),   // ← 空字符串而不是 undefined
      // ...
    };
    return baseProfile;
  }
  ```

  i18n 资源端：

  ```ts
  // packages/admin/src/i18n/messages/customers/zh-CN.ts:229
  validationError: "此操作当前不可执行，已尝试重新加载最新详情",   // ← 此 key 路径是 .detail.actions.validationError，与 createModal 无关

  // packages/admin/src/i18n/messages/customers/en-US-list.ts:123-147
  // 仅 en-US 有 customers.list.createModal.fields.referrer / referrerName 等；
  // createModal.state.validationError / checkingDuplicates 三语都未定义
  ```

- **修复方向**：
  1. **数据层（推荐先修）**：`buildBaseProfile` 当 `input.birthDate.trim() === ""` 时**省略** `birthday` 字段（不下发空字符串），让 server 走"未提供"分支：

      ```ts
      const trimmedBirthday = input.birthDate.trim();
      if (trimmedBirthday) baseProfile.birthday = trimmedBirthday;
      ```

  2. **i18n 资源**：在 `messages/customers/zh-CN.ts` / `messages/customers/ja-JP.ts` 各补一份 `list.createModal.state` 子树（参考 `en-US-list.ts:160-170` 形态），至少含 `validationError` / `checkingDuplicates` / `submitError` 三键。
  3. **server 收尾**：把 birthday 校验报文改为 i18n-friendly 的 error code（如 `INVALID_BIRTHDAY`），便于 admin 端用专门 toast/i18n 路径而非通用 validationError fallback。

- **测试补强**：
  1. `useCustomerCreateForm.test.ts` 新增 1 用例：mount 表单 → 不填 birthDate → `createCustomer()` → 期望 mock fetch 请求 body `baseProfile.birthday` 字段缺省（`undefined`）。
  2. `CustomerCreateModal.bug137.test.ts` 新增 i18n smoke：mount modal → 触发 submitErrorCode = 'VALIDATION_ERROR' → 顶部错误文案不等于 raw key（不含 `customers.list.createModal.state.`）。

- **关联**：与 BUG-093 R4 闭环回退（BUG-141）共用 modal；建议两条一起修以避免再次出现 modal-level i18n gap。

---

### BUG-138 [P1][FE/i18n] `CaseDetailView` 概览页"下一关键动作"区按钮 i18n key 漏注册

- **优先级**：P1（每个非终态案件详情页第一屏可见；三语均命中；是 R11 BUG-132 / 133 之后又一处明显的"raw key 直显"破坏体验）
- **chrome-devtools-mcp 取证**：

  ```js
  // navigate_page → /#/cases/ea8b75b0-5fb3-48b2-b268-000bf62064ab  (CASE-202604-0004 / S2 / WAITING_MATERIAL)
  // 切到 English
  document.querySelectorAll('button')
    .forEach(b => /cases\.coach\./.test(b.textContent || '') && console.log(b.textContent.trim()));
  // → "cases.coach.docManagement"
  // → "cases.coach.runValidation"
  ```

- **根因**：i18n 资源缺 `cases.coach.docManagement` / `cases.coach.runValidation`（zh-CN / en-US / ja-JP 均未注册），但 view 层确实在 mount 时调用了 `t("cases.coach.docManagement")`。Vue-i18n missingHandler 默认 silent fallback → key 直显。
- **修复方向**：在 `i18n/messages/cases/{zh-CN,en-US,ja-JP}.ts` 的 `coach` 子树补：
  - `docManagement`: `"管理资料 / Manage documents / 資料管理へ"`
  - `runValidation`: `"运行提交前校验 / Run pre-submission check / 提出前チェックを実行"`
- **守门**：admin lint 规则（vue-i18n-parser）禁止 mount 后渲染出 `cases\.|customers\.|leads\.` 前缀的 raw key。
- **关联**：与 BUG-132 / BUG-133 / BUG-143 同属"i18n 资源缺失 / 调用层照常 t()"。

---

### BUG-139 [P1][FE/data] 建案向导 3 处仍直显 group UUID（R11 BUG-136 修复未覆盖 case 链路）

- **优先级**：P1（每位用户从客户列表 / 案件列表入建案，第一屏即命中；R11 已为 customers 列表修了一半）
- **chrome-devtools-mcp 取证（zh-CN）**：

  ```js
  // navigate_page → /#/cases/create?customerId=f5caa61e-...
  // Step 1 选 "经营管理（认定 4 个月）" 模板 → 下一步
  // Step 2 主申请人下拉 options:
  //   "R6试探客户 / ef21fdd2-1ffc-4a27-8b47-a640d6bd021c"   ← 期望 "R6试探客户 / 东京一组"
  //   "Tani Keiei Cert4M Test /"                              ← 期望 "Tani Keiei Cert4M Test / 东京一组"
  //
  // 选择 R6试探客户 后选中卡片：
  //   "R6试探客户 · 主申請人 · ef21fdd2-1ffc-4a27-8b47-a640d6bd021c"   ← UUID 跟在 role 副本后
  //
  // 进 Step 3：
  //   "Group 继承自主申请人： ef21fdd2-1ffc-4a27-8b47-a640d6bd021c"   ← 期望 "东京一组"
  ```

- **根因**：

  ```117:134:packages/admin/src/views/cases/model/useCustomerDropdownData.ts
  function adaptItem(raw: unknown): CaseCreateCustomerOption | null {
    // ...
    const group = readStringField(r.group);
    return {
      id: r.id,
      name,
      kana: readStringField(r.furigana),
      group,
      groupLabel: group,    // ← BUG-139 root：raw UUID 直接当 label
      roleHint: "主申請人",  // ← BUG-152
      // ...
    };
  }
  ```

  R11 BUG-136 在 `App.vue` 注册了 `groupAliasesRef`，并把 `useGroupOptions.resolveGroupLabel` 接成"先查别名→fallback catalog"。但 `useCustomerDropdownData.adaptItem` 完全不调用 `resolveGroupLabel`，对 group 字段是 raw 透传。

- **修复方向**：

  ```ts
  // useCustomerDropdownData.ts
  import { useI18n } from "vue-i18n";
  import { resolveGroupLabel } from "../../../shared/model/groupOptions";

  // adaptItem 接受 locale，并把 groupLabel 走 resolveGroupLabel
  function adaptItem(raw: unknown, locale: string): CaseCreateCustomerOption | null {
    // ...
    const group = readStringField(r.group);
    const groupLabel = group ? resolveGroupLabel(group, undefined, locale) : "";
    return { ...rest, group, groupLabel };
  }
  ```

  Step 2 选中卡片 / Step 3 inherited group display：把 raw `primaryCustomer.value.group` 替换为 `primaryCustomer.value.groupLabel`（已修后即翻译完毕），或在 view 层再调一次 `resolveGroupLabel`。

- **测试补强**：
  1. `useCustomerDropdownData.test.ts` 已有 `groupLabel: "tokyo-1"` 用例（line 70），扩 1 条：注册别名 `{ id: '<uuid>', name: 'tokyo-1' }` → adaptItem 返回的 `groupLabel === '东京一组'`（locale=zh-CN）。
  2. 新增 `CaseCreateStep2.bug139.test.ts`：mount Step2 → 注册 alias → 下拉 option 文本不出现 UUID 字符；选中后卡片不出现 UUID。

- **关联**：与 BUG-136 / BUG-140 一起构成"R11 BUG-136 修复增量遗漏"——任何使用 raw `customer.group` 的 view 都需要走 alias map 翻译。

---

### BUG-140 [P1][FE/data] `BillingTable` row Group cell 在真实 DB Group 下显示空白（BUG-136 修复未覆盖 billing）

- **优先级**：P1（收费列表对所有真实创建客户都中；3/3 行命中）
- **chrome-devtools-mcp 取证（en-US，与 BUG-134 同视图）**：

  ```js
  // navigate_page → /#/billing
  // 切 English
  // tbody 三行（CASE-202604-0015 / 0012 / 0010）的第 4 列（Group）全部 = "—" 或 ""
  ```

- **根因**：`BillingTable.vue` row Group 渲染未走 `resolveGroupLabel`（与 BUG-139 同根 — alias map 没接入 billing 链路）；row.group 是 DB UUID（与 customer.group 一致）→ 静态 catalog 未命中 → 在 R11 修复后落入 disabled-suffix `"—"` 占位分支。
- **修复方向**：
  1. 在 `BillingTable.vue` template 把 `{{ row.group }}` 改成 `{{ resolveGroupLabel(row.group, t('shared.group.disabledSuffix'), locale.value) }}`；
  2. 同步 `useBillingFilters` / `BillingListView.vue:45` 的 `groupOptions` 引用从模块顶层 const 改为 `computed(() => getActiveGroupOptions(locale.value))`（顺手把 R11 BUG-134 一起修）。
- **测试补强**：`BillingTableRow.bug140.test.ts`：mount row 时注册 alias（参考 R11 `CustomerTableRow.bug136.test.ts` 模板）→ Group cell 等于 alias 翻译。
- **关联**：与 BUG-134 / BUG-136 / BUG-139 同属一个 i18n+alias 修复簇，建议合并修。

---

### BUG-141 [P1][FE/UX] `CustomerCreateModal` legacy `referrer` 输入框未删 + `referrerName` 没有按 sourceType 条件渲染（BUG-093 R4 闭环回退）

- **优先级**：P1（每个新建客户都中；R4 §0.4 标 ✅，实测全面回退；测试 skip 后契约骨架失效是最致命）
- **chrome-devtools-mcp 取证**：

  ```js
  // navigate_page → /#/customers ; click 添加客户
  // 表单同时渲染：
  //   uid=16_36 "来源 / 介绍人"  ← legacy referrer
  //   uid=16_37 textbox "例如：推荐 / 介绍人"
  //   uid=16_62 "介绍人姓名"   ← referrerName，但 v-if 缺失
  //   uid=16_63 textbox "例如：田中先生"
  ```

  即 sourceType=`—` / `WEB` / `广告` 时，「介绍人姓名」依然渲染（R4 修复目标 = 仅 sourceType=REFERRAL 时显示）。

- **根因**：

  ```310:415:packages/admin/src/views/customers/components/CustomerCreateModal.vue
  <div class="customer-modal__field">
    <label>{{ t("customers.list.createModal.fields.referrer") }}</label>
    <input ... :value="props.fields?.referrer" .../>
  </div>
  <!-- 若干字段 -->
  <div class="customer-modal__field">
    <label>{{ t("customers.list.createModal.fields.referrerName") }}</label>
    <input ... :value="props.fields?.referrerName" .../>
  </div>
  ```

  - 上半 `referrer`（`fields.referrer`，对应 BUG-093 要求删除的 legacy 字段）仍在；
  - 下半 `referrerName` 没有 `v-if="props.fields?.sourceType === 'REFERRAL'"`。

  配套测试：

  ```46:74:packages/admin/src/views/customers/components/CustomerCreateModal.bug093.test.ts
  // eslint-disable-next-line no-restricted-syntax -- BUG-093 待立项跟踪后再启用
  describe.skip("CustomerCreateModal — BUG-093 字段去重", () => {
    // 三条用例（drop legacy / hide on non-REFERRAL / show on REFERRAL）整组被 skip
  });
  ```

  即 R4 land 时跑过 PASS、之后某次回退把 modal 改回旧形态，并把测试改成 `describe.skip` 让 CI 不再 catch 这一条。

- **修复方向**：
  1. 直接删除 `CustomerCreateModal.vue:310-323` 这一段 legacy referrer block；
  2. 给 `CustomerCreateModal.vue:398-415` 的 referrerName field 包 `<template v-if="props.fields?.sourceType === 'REFERRAL'">`；
  3. `CustomerCreateModal.bug093.test.ts:46` 把 `describe.skip` 还原为 `describe`，并删除 eslint-disable 注释；
  4. `useCustomerCreateForm.ts:69-73` 把 `referrer: fields.referrer` 留作下行兼容字段或同步删除（依据 server schema 决定）；同时检查 `CustomerAdapterShared.buildBaseProfile.referralSource` 字段是否还有上下游消费。
- **测试补强**：除上面 3 条恢复，再新增 1 条 `referrerName-only` 数据流（`buildBaseProfile` payload 应不含 `referrer` 字段，仅含 `referrerName`）。
- **关联**：BUG-137（同一 modal 的 i18n 资源缺失，建议一同修）。
- **修复状态（R12 land）**：✅ FIXED
  - `CustomerCreateModal.vue` 删除 legacy `referrer` 输入框（原 310-323 行 block 已移除）；
  - `referrerName` 字段加 `v-if="props.fields?.sourceType === 'REFERRAL'"`，仅在 sourceType=REFERRAL 时渲染；
  - `CustomerCreateModal.bug093.test.ts` 解开 `describe.skip` → `describe`，3 条用例（drop legacy / hide on non-REFERRAL / show on REFERRAL）全部 PASS；
  - `useCustomerCreateForm.ts` 表单 `referrer` 字段保留（server 仍消费 `referralSource`，详见 `customers.dto-mappers.ts:39/218/446`），UI 不再暴露入口，值始终为空。
  - 服务侧 `referralSource` 契约不变；后续如需删除该字段需联动 server `customers.types.ts:238/279` 一并清理。

---

### BUG-142 [P0][FE] `/#/tasks` 任务与提醒页面退回 placeholder（BUG-086 R4 闭环回退）

- **优先级**：P0（Step 19-20 续签提醒链路再次从 admin 端被切断；侧边栏入口仍有，但跳转后是 stub）
- **chrome-devtools-mcp 取证（en-US）**：

  ```js
  // navigate_page → /#/tasks
  document.querySelector('main').textContent.slice(0, 800);
  // → "Tasks & remindersTasks & remindersPlanned
  //    The route for Tasks & reminders is now registered and ready for the full page.
  //    Page status — This placeholder keeps sidebar navigation valid for Tasks & reminders
  //    and removes unmatched route warnings until the full module is implemented here.
  //    Current path /tasks"
  ```

- **根因**：R4 BUG-086 land 时新增的 `views/tasks/TaskListView.vue` + `useTaskWorkbenchModel` + `TaskRepository`，本轮在仓库内仍可见但 `views/tasks/route` mapping 已被替换回 placeholder 组件；与 R5 BUG-096（reminders INSERT NOT NULL 失败）一并触发回退。
- **修复方向**：
  1. 把 router 端 `/tasks` 重新 wire 回 `TaskListView.vue`；
  2. 修 R5 BUG-096（reminders 表 NOT NULL 字段缺省）以让 `/api/reminders` POST 不再 500；
  3. 端到端最小走查：login → 创建任务 → 列表显示 → 完成 → 已归档。
- **守门**：admin smoke 测试加一条 navigate_page → `/tasks` → 期望 main 区不含 `placeholder` / `Page status` / `until the full module is implemented` 等关键词。
- **关联**：R3 BUG-086 → R4 ✅ → R12 ❌ 再次回退；与 BUG-141 / BUG-145 / BUG-146 一并属"R4 闭环回退集"。
- **修复状态（R12 land）**：✅ FIXED（FE 路由 + i18n 串接，BUG-096 reminders NOT NULL 仍待 BE 单独立项）
  - `packages/admin/src/router/index.ts` 把 `/tasks` 从 `placeholderRoutes` 移除，改为 lazy import `views/tasks/TaskListView.vue`，meta 保留 `navKey: tasks` / `groupKey: business` / `titleKey: shell.nav.items.tasks`；`placeholderRoutes` 数组保留为空便于后续模块复用 placeholder 收口路径。
  - `packages/admin/src/i18n/messages/{zh-CN,en-US,ja-JP}.ts` 三处补 `import tasks from "./tasks/<locale>"` 并把 `tasks` 模块挂到根命名空间 —— 此前 `views/tasks/TaskListView.vue` 引用的 `t("tasks.workbench.*")` / `t("tasks.taskStatus.*")` 等 key 在仓库内只存在 `messages/tasks/<locale>.ts` 子模块文件、未被 `messages/<locale>.ts` 聚合，是 placeholder 回退后剩下的"哑文件"。
  - `packages/admin/src/router/tasks-route.bug142.test.ts` 新增 2 条断言：`/tasks` 路由 meta 一致；`/tasks` 的组件 loader 解析为 `views/tasks/TaskListView.vue`、绝不包含 `SectionPlaceholderView` —— 防止下次再被悄悄换回 placeholder。
  - 关联 BUG-096：reminders POST 500 仍属 BE 路径，与本轮 FE 修复解耦；admin /#/tasks 现可正常加载 GET /api/tasks + GET /api/reminders，POST 失败时由 `useTaskWorkbenchModel.error` 接管回显，不再阻塞列表渲染。

---

### BUG-143 [P1][FE/i18n] 案件列表 `类型` 列显示 raw enum identifier（不分 locale）

- **优先级**：P1（admin 主路径案件列表每行都中；与 BUG-132 / 133 / 144 同属 raw 字段透传）
- **chrome-devtools-mcp 取证（zh-CN，全所 19 行）**：

  ```js
  Array.from(document.querySelectorAll('table tbody tr')).map(r => r.querySelectorAll('td')[3]?.textContent?.trim());
  // → ["biz_mgmt_4m","biz_mgmt_4m","biz_mgmt_4m","biz_mgmt_4m","biz_mgmt_4m","biz_mgmt_4m",
  //    "biz_mgmt_4m","biz_mgmt_4m","biz_mgmt_4m","biz_mgmt_4m",
  //    "biz_mgmt","biz_mgmt","biz_mgmt","biz_mgmt","biz_mgmt","biz_mgmt",
  //    "family","family","family"]
  ```

- **根因**：`views/cases/components/CaseTableRow.vue` 类型列直插 `row.type`（DB enum identifier），未走 i18n / `templateLabel` 解析。
- **修复方向**：
  1. 在 `i18n/messages/cases/{zh-CN,en-US,ja-JP}.ts` 补 `cases.type.biz_mgmt / biz_mgmt_4m / biz_mgmt_1y / biz_mgmt_renewal / company_setup / hum / hum_renewal / family / intra_company` 共 9 条 key（覆盖 `views/cases/CaseCreateView.vue` 模板 catalog 全集）；
  2. `CaseTableRow.vue` 渲染 `{{ t("cases.type." + row.type, row.type) }}`，缺失 key 时 fallback 到 raw 让 console 报警。
- **测试补强**：`CaseTableRow.bug143.test.ts` 三 locale × 9 类型 = 27 用例，断言 cell 文本不等于 raw enum。
- **关联**：与 BUG-132 / BUG-133 / BUG-144 同属"raw 字段透传不消费 i18n"族。

---

### BUG-144 [P1][FE/i18n] 建案向导 Step 1 模板按钮 8/10 描述未 i18n（en-US 下显示 raw zh-CN）

- **优先级**：P1（en-US 用户进建案向导首屏可见 8 条不译；ja-JP 部分受同根影响）
- **chrome-devtools-mcp 取证（en-US）**：

  ```js
  // navigate_page → /#/cases/create?customerId=825d708f-... ; locale=English
  Array.from(document.querySelectorAll('main button[class*=template]'))
    .map(b => b.textContent?.trim());
  // 仅前 2 条 description 为英文，后 8 条均为 zh-CN：
  //  ✓ "Dependent Visa Popular Ideal for batch creation of spouse/child cases ..."
  //  ✓ "Engineer/Specialist in Humanities/Int'l Services Popular For employer/position ..."
  //  ❌ "Business Manager Visa Business Manager 经营管理签总览 — 根据具体场景..."
  //  ❌ "Business Manager (CoE 4-month) Business Manager 认定 4 个月 — 重点：..."
  //  ❌ "Business Manager (CoE 1-year) Business Manager 认定 1 年 — ..."
  //  ❌ "Business Manager (Renewal) Business Manager 期间更新 — ..."
  //  ❌ "Company Establishment Business Manager 经营管理签公司设立阶段 — ..."
  //  ❌ "Engineer/Specialist (CoE) Popular 技术・人文知识・国际业务认定 — ..."
  //  ❌ "Engineer/Specialist (Renewal) Popular 技术・人文知识・国际业务期间更新 — ..."
  //  ❌ "Intra-company Transfer P1 template 集团 / 关联企業内部人事调动 — ..."
  ```

- **根因**：模板 catalog（`views/cases/fixtures.ts` 或 `useCaseTemplates.ts`）的 `description` 字段在 i18n 资源里仅维护 family / hum 两条 key，剩余 8 条 fallback 至硬编码 zh-CN 源字面。
- **修复方向**：补 `i18n/messages/cases/{zh-CN,en-US,ja-JP}.ts` 的 `templates.<id>.description` 子树，把 8 条描述全部翻完；同时把 `Application type` 自动拼接逻辑（BUG-149）一并整理。
- **关联**：BUG-149（Step 1 案件标题自动生成器双重拼接）。

---

### BUG-145 [P1][BE] `POST /api/customers` 直接调用不走 numbering，customerNumber=UUID（BUG-088 R4 闭环回退）

- **优先级**：P1（任何脚本 / 第三方 / 集成创建客户都中；admin UI 走的是同一 endpoint 也会回退）
- **chrome-devtools-mcp / API 取证**：

  ```bash
  TOKEN=$(...login...)
  curl -s -X POST http://localhost:5173/api/customers -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{
    "type":"individual",
    "baseProfile":{
      "displayName":"R12 keiei probe customer 2","legalName":"Yamada Taro 2","name_cn":"Yamada Taro 2",
      "furigana":"ヤマダ タロウ","gender":"male","nationality":"中国","group":"tokyo-1",
      "phone":"08099887767","email":"r12.probe2@example.com",
      "location":"OVERSEAS","sourceType":"REFERRAL","visaType":"BIZ_MGMT","referrerName":"Tanaka-san"
    }
  }'
  # → 201 { id: "2d233e59-3af5-4af5-ae2d-7f0ae2eefd3c", ... } —— 没有 customerNumber/CUS-... 字段
  ```

  admin 客户列表第一行（全所）直显 `RR12 keiei probe customer 22d233e59-3af5-4af5-ae2d-7f0ae2eefd3c`：avatar `R` + 名字 + 直接拼接 UUID 作"客户编号"展示。

- **根因**：R4 在 `customers.numbering.ts#createCustomerWithNumbering` 引入了 `CUS-YYYYMM-NNNN` 生成器；本轮回归发现 server `customers.controller.ts:121-128` 的 `create()` 路径**没有调用** `createCustomerWithNumbering`（直接走 `customersService.create(...)`）；因此对外仍以 UUID 作 customer ID 兼 customer number。
- **修复方向**：
  1. `customers.controller.ts#create` 切换到 `createCustomerWithNumbering`（或在 service 层把它作为强制路径）；
  2. 新增 server 单测 `customers.numbering.regression.test.ts`：`POST /api/customers` × 3 次 → 期望各自 `customerNumber` 形如 `CUS-202604-XXXX` 且单调递增；
  3. admin 端 customer table 读 `customerNumber` 字段时把 fallback `id` 改为 `'—'`，避免 UUID 直显（与 BUG-136 同款防御）。
- **关联**：与 BUG-146 / BUG-141 / BUG-142 同属 R4 闭环回退集；建议合并立项做"R4 回归门禁"。
- **修复结果（R12 land 2026-04-30）**：
  - `packages/server/src/modules/core/customers/customers.service.ts#create()` 切换到 `tenantDb.transaction(...)` 包裹的 `createCustomerWithNumbering`；所有 `POST /api/customers` 入口在 service 层强制经过 numbering，无 fallback 旁路。
  - 新增 `packages/server/src/modules/core/customers/customers.numbering.regression.test.ts`：①顺序创建 3 个客户 → 每条 `customerNumber` 形如 `CUS-YYYYMM-NNNN` 且严格 +1 递增；②直接 POST 入口下 `customerNumber !== customer.id` 且不得为 UUID，强制为 `CUS-YYYYMM-0001`。两条用例均通过。
  - admin 端 `CustomerTableRow.vue` / `CustomerDetailHeader.vue` 增加 UUID 形态防御：`customerNumber === id` 或匹配 36 位 UUID 时渲染 `—`，与 BUG-136 同款占位策略；新增 `CustomerTableRow.bug145.test.ts`（4 例：正常号 / UUID 形态 / 等于 id / 空白）全部通过。
  - 并同步修正 `customers.service.test.ts` 的 `create` 用例，从直接 SQL 透传断言改为锁 `customerNumber` pattern + 校验 numbering 流程产物。

---

### BUG-146 [P1][FE/data] Customers 列表 / 详情 owner 列全空（BUG-089 R4 闭环回退） ✅ FIXED

- **优先级**：P1（admin 主路径"客户负责人"信息空白）
- **chrome-devtools-mcp 取证（zh-CN，全所 7 行）**：

  ```js
  Array.from(document.querySelectorAll('table tbody tr'))
    .map(r => r.querySelectorAll('td')[5]?.textContent?.trim());   // 负责人列
  // → ["", "", "", "", "", "", ""]
  ```

  R6试探客户详情页 `客户负责人` dropdown 显示空，但客户在 case 列表上 owner = `Lo Local Admin`（cases owner 列 PASS，customers owner 列 FAIL）。

- **根因**：R4 BUG-089 在 `customers.query.ts#buildOwnerNameExpr` 修了 join；本轮回归发现 customers list `select` 已不再带 `owner_name` 子查询，`mapCustomerAggregates` 也未把 `owner_name` 串到 `CustomerDtoAggregates.ownerName`，导致 `mapCustomerToSummaryDto.resolveOwnerSummary` 永远 fallback 到空字符串。
- **已落地修复**：
  1. `packages/server/src/modules/core/customers/customers.query.ts` 重新引入 `buildOwnerNameExpr(customerAlias)`（按 `CUSTOMER_OWNER_FIELDS = ["owner_user_id","ownerUserId"]` 多字段匹配 `users.id::text`，按 `org_id` 多租户 scope）并加进 `buildCustomerListSelect` → 列表与详情 select 同时回填 `owner_name`。
  2. `packages/server/src/modules/core/customers/customers.types.ts#CustomerQueryRow` 增补 `owner_name?: unknown`。
  3. `packages/server/src/modules/core/customers/customers.row-aggregates.ts#mapCustomerAggregates` 把 `row.owner_name` 串到 `CustomerDtoAggregates.ownerName`，dto-mapper 既有逻辑会把它升到 `CustomerSummaryDto.owner.name`。
  4. admin 端 `CustomerTableRow.vue` `resolveOwnerOption` fallback 链路本就支持任意 server 字面（含 catalog 外的 `Local Admin`），无需改动。
- **测试补强**：
  - `packages/server/src/modules/core/customers/customers.query.bug089-regression.test.ts` × 5 测试：list/detail select 含 `owner_name`、`from users u`、`u.id::text = c.base_profile->>'owner_user_id'`、`u.org_id = c.org_id`；`mapCustomerAggregates` 把 `owner_name=Local Admin` 串到 `ownerName`，对 `null` / 全空白容错为 `null`。
  - `packages/admin/src/views/customers/components/CustomerTableRow.bug146.test.ts` × 4 测试：`Local Admin` 字面在 zh-CN/en-US 双语下均可见、catalog 内 `suzuki` 仍按 locale 本地化、initials 沿用 server 提供值。

---

### BUG-147 [P2][FE/perf] `CustomerCreateModal` 查重 watcher 缺 debounce，单次表单填写触发 28 次 `POST /api/customers/check-duplicates` ✅ FIXED

- **优先级**：P2（性能噪声，但叠加大量并发用户后会冲击 server / observability）
- **chrome-devtools-mcp 取证**：

  ```js
  // 填完客户表单（identifier/legalName/kana/gender/nationality/phone/email/location/sourceType/visaType/referrerName/note）
  // 一次完整 fill_form 期间，list_network_requests 显示：
  // reqid=4685..4727  POST /api/customers/check-duplicates [201]   ×28
  // 最后一条 reqid=4728 POST /api/customers [400]
  ```

- **根因**：`useCustomerCreateForm.ts` 内 watcher 监听 `legalName / phone / email` 三字段，每个 keystroke 都触发 `repository.checkDuplicates({ name, phone, email })`；没有 debounce。28 次 ≈ 主要 3 个文本字段连续 keystroke 数。
- **修复**：在 `useCustomerCreateForm.ts` 内引入 `createDebouncedTrigger` helper（`setTimeout` + `clearTimeout`），把 watcher 节流到 250ms 默认值；deps 暴露 `duplicateCheckDebounceMs` 选项以便测试注入 0；`onScopeDispose` / `resetForm` 清理待发请求。字段白名单维持原有 `legalName / phone / email`（dropdown 类字段已不触发，复核确认）。
- **测试**：
  - `useCustomerCreateForm.bug147.test.ts`：模拟 28 keystrokes → 仅 1 次 fetch；dropdown-only 字段 0 次 fetch；两段停顿 → 2 次 fetch；`resetForm` 取消 pending 请求。
  - 既存 `useCustomerCreateForm.test.ts` 通过 `duplicateCheckDebounceMs: 0` 维持原断言语义。

---

### BUG-148 [P3][FE/a11y] `CustomerCreateModal` 21 个 form fields 缺 `id`/`name`，16 个缺 `<label for>`

- **优先级**：P3（a11y / 浏览器 autofill 全部退化；issues panel 自动汇报）
- **chrome-devtools-mcp 取证**：

  ```text
  list_console_messages →
  msgid=509 [issue] A form field element should have an id or name attribute (count: 21)
  msgid=510 [issue] No label associated with a form field (count: 16)
  ```

- **修复方向**：批量给 modal 内 `<input>` / `<select>` 加 `id` 并把外层 `<label>` 改成 `<label :for="...">`；与 BUG-141 / BUG-137 同时改最划算。
- **修复结果（R12 land 2026-04-30）**：
  - `packages/admin/src/views/customers/components/CustomerCreateModal.vue` 拆出 `CustomerCreateModalFields.vue`（受 500 行 `max-lines` 守门约束）。新组件集中持有 16 字段表单的 `id` / `name` / `label[for]` 绑定（`customer-create-displayName` / `legalName` / `kana` / `gender` / `birthDate` / `nationality` / `phone` / `email` / `location` / `sourceType` / `visaType` / `referrerName` / `avatar` / `note` / `group`），命名直接对齐 `CustomerCreateFormFields` key，方便浏览器 autofill 与 e2e selector。
  - 关闭按钮补 `aria-label="customers.list.createModal.cancel"`，避免仅 SVG 触达点击但无可访问名。
  - 新增 `CustomerCreateModal.bug148.test.ts`（5 例）：①每个 input/select 同时具备非空 id+name；②modal 内 id 唯一；③每个 label[for] 命中真实 input/select；④非 REFERRAL 场景下 `referrerName` 不渲染、其余字段仍合规；⑤关闭按钮提供 `aria-label` 或文本可访问名。
  - 全量回归：`src/views/customers/**` 共 633 测试通过（含 `bug093` / `bug137` / `bug148`）；admin lint + typecheck + build 在 BUG-148 改动文件上全绿。
  - 关联：与 BUG-141 / BUG-137 共修 modal；后续 a11y 守门可再补 `eslint-plugin-vuejs-accessibility` 规则 `vuejs-accessibility/form-control-has-label`、`label-has-for`，把这一类问题前移到 lint。

---

### BUG-149 [P2][FE/UX] 建案向导案件标题自动生成器双重拼接（"…认定 4 个月）认定" / "Dependent VisaCertificate of Eligibility"）✅ R12 已 land

- **优先级**：P2（每个建案都中；en-US 下还缺空格）
- **chrome-devtools-mcp 取证**：

  - zh-CN 选 "经营管理（认定 4 个月）" 模板 → 案件标题 = "经营管理（认定 4 个月）认定"（"认定" 出现 2 次）
  - en-US 选 "Dependent Visa" 模板 → 案件标题 = "Dependent VisaCertificate of Eligibility"（无空格）

- **根因**：`buildCaseTitle()`（`useCreateCaseModelActions.ts:58-68`）直接 `${templateLabel}${applicationTypeLabel}` 拼接：(1) 没有探测模板标签是否已经包含申请类型字面（zh-CN/ja-JP 下 BMV-CERT-4M / BMV-CERT-1Y / ENG-CERT / BMV-RENEWAL 模板标签自带 "认定"/"認定"/"更新"），(2) 也没有在 Latin 字符边界处补空格。
- **修复**：把拼接抽到 `joinTemplateAndType(templateLabel, applicationTypeLabel)` helper：
  - 当 `templateLabel.includes(applicationTypeLabel)` 为真时直接返回 `templateLabel`，避免双重拼接（zh-CN "经营管理（认定 4 个月）" + "认定" → "经营管理（认定 4 个月）"）。
  - 当模板标签结尾或申请类型起始任一为 `[A-Za-z0-9]` 时插入空格（en-US "Dependent Visa" + "Certificate of Eligibility" → "Dependent Visa Certificate of Eligibility"），CJK 之间维持紧贴（"家族滞在" + "认定" → "家族滞在认定"）。
- **测试**：
  - 新增 `fixtures-create.title-derive.bug149.test.ts`：
    - zh-CN BMV-CERT-4M `"经营管理（认定 4 个月）" + "认定"` → 标题中 "认定" 计数 ≤ 1。
    - ja-JP BMV-CERT-4M `"経営管理（認定4ヶ月）" + "認定"` → 标题中 "認定" 计数 ≤ 1。
    - en-US TMPL_FAMILY `"Dependent Visa" + "Certificate of Eligibility"` → 强校验包含 `Dependent Visa Certificate of Eligibility` 且不再出现黏连子串 "VisaCertificate"。
    - zh-CN TMPL_FAMILY `"家族滞在" + "认定"` → 仍输出 `"家族滞在认定"`（不影响 CJK 现有标题派生）。
    - 全模板 × 全 ApplicationType × 全 locale 矩阵 sentinel：申请类型在标题中出现次数 ≤ 1；Latin 边界不得黏连。
  - 在 `useCreateCaseModel.test.ts buildCaseTitle` 增补三条单测覆盖 zh-CN 去重 + en-US 补空格；同时把"`王浩` + `技人国` + `Certificate of Eligibility`"用例预期由 `"王浩 技人国Certificate of Eligibility"` 修正为 `"王浩 技人国 Certificate of Eligibility"`（原断言锁定的是 BUG-149 的 buggy 行为）。

---

### BUG-150 [P2][FE/UX] 建案向导 Step 3 owner dropdown 不含 `Local Admin`，登录用户无法分案给自己 ✅ FIXED

- **优先级**：P2（自分案场景常用）
- **chrome-devtools-mcp 取证**：dropdown options = `["铃木","田中","李","佐藤","山田翔太","高桥健太","铃木明里"]`（无 Local Admin）。
- **根因**：`packages/admin/src/shared/model/useOwnerOptions.ts#getOwnerOptions` 只输出静态 catalog（7 个 fixture 同事），与 `useAdminSession` 暴露的登录用户完全脱节；`CaseCreateView.vue` 直接消费 `getOwnerOptions(locale)` → Step 3 下拉永远不含 `Local Admin`，登录用户无法把案件分给自己。
- **修复**：
  1. `useOwnerOptions.ts` 新增 `withCurrentUserOwnerOption(options, currentUser)` helper；当 `currentUser.name` 不在静态 catalog 中（按 stable id / 任一 locale label / 首字母同名等多渠道判定）时，把它作为首项注入：`value` 优先使用 email（避免与 catalog slug 碰撞），缺 email 则回落到 `current-user:<name>`；`initials` 优先采用入参，缺省时按多词首字母 / 单词前两字大写推导；`avatarClass` 统一为中性 slate 配色。重名 / 同 value / 同 label 时不重复注入。
  2. `CaseCreateView.vue` 引入 `useAdminSession`，把 `currentUser.value` 喂进 `withCurrentUserOwnerOption(getOwnerOptions(locale.value), currentUser.value)`，不影响既有 `defaultOwner: viewer.ownerId` 逻辑。
- **测试补强**：
  - `packages/admin/src/shared/model/useOwnerOptions.test.ts` × 8 测试：未登录 / 登录但与 catalog 重名（label / stable id / locale 字面） / 缺 email 走 `current-user:` 前缀 / 缺 initials 自动推导多词与单词形态。
  - `packages/admin/src/views/cases/CaseCreateView.bug150.test.ts` × 3 测试：未登录回落静态 catalog、`Local Admin` 注入首项、与 catalog 同名（如 `鈴木`）不重复。

---

### BUG-151 [P3][FE] 建案向导 Step 4 复核区收费金额 cell 显示 raw `180000`

- **优先级**：P3
- **修复方向**：用 `formatCurrency(amount, locale)` / `Intl.NumberFormat`。

---

### BUG-152 [P3][FE/i18n] 建案向导 Step 2 选中客户卡片角色字面写死 `主申請人`（JA）

- **优先级**：P3
- **根因**：`useCustomerDropdownData.ts:123` `roleHint: "主申請人"` 硬编码，render 端直接 `{{ option.roleHint }}`，无 i18n。
- **修复方向**：把 `roleHint` 改成 i18n key（`cases.create.primaryRole`），renderer 走 `{{ t(option.roleHint) }}`；与 BUG-139 一起改。

---

### BUG-153 [P2][FE] `CaseDetailView` 头部 phase chip 渲染 2 次

- **优先级**：P2（视觉重复；三语全中）
- **chrome-devtools-mcp 取证**：

  ```js
  Array.from(document.querySelectorAll('.ui-chip')).slice(0, 4).map(c => c.textContent?.trim());
  // zh-CN ea8b75b0-...: ["资料收集中","等待资料","等待资料"]
  // en-US df9d1e84-...: ["Case opened","Closed (success)","Closed (success)"]
  // ja-JP df9d1e84-...: ["案件開始","成功クローズ","成功クローズ"]
  ```

- **根因（R12 实测修正）**：原推测「header `headerChips` 数组里 phase chip 被绑定两次」不成立——
  `CaseDetailView.vue:178-194` 头部 slot 只渲染 stage / phase / workflow-step 三个 inline `<Chip>`，
  没有数组结构、phase 也只绑定一次；workflow-step chip 仅在 BMV 案件下出现且文本是 `parentStage → stepLabel`。
  真正的重复源在 **`CaseOverviewSidebar.vue:67-76`**：概览 Tab 右侧侧栏顶部一张 "业务阶段 / Business phase / 業務フェーズ"
  独立 Card 内部又包了一个 phase `<Chip>`，与 header 的 phase chip 文本完全相同。
  当案件停留在概览 Tab 时，三处 `.ui-chip` 命中即「stage(header) + phase(header) + phase(sidebar)」——
  恰好对应 chrome-devtools-mcp 取证里 `slice(0, 4)` 的 3 项，且第 2、3 项文案重复。
- **修复结果（R12 land 2026-04-30）**：✅ FIXED
  - `packages/admin/src/views/cases/components/CaseOverviewSidebar.vue` 删除顶部 "业务阶段" 独立 Card（原 67-76 行 block 含 `<Chip>` + `phase-row` 包裹），保留 risk / team / validation 三张 Card；
  - 同步移除 `Chip` / `ChipTone` import、`phaseTone()` / `phaseDisplayLabel()` 两个仅服务于该 Card 的 helper、以及 `getPhaseI18nKey` / `getPhaseBadge` / `BADGE_TONE_MAP` 与 `.overview-sidebar__phase-row` 样式；header chip 已经承担 phase 视觉表达，单一来源不再分裂；
  - `cases.detail.overview.sidebar.phaseTitle` i18n key 暂保留（不清扫文案资源以免影响其他模块走查脚本），但 admin 端不再消费。
- **回归契约**：新增 `packages/admin/src/views/cases/components/CaseOverviewSidebar.bug153.test.ts` × 7 测试：
  - sidebar HTML 不含 `.ui-chip`、不含 `overview-sidebar__phase-row`；
  - zh-CN / en-US / ja-JP 三语下 sidebar HTML 不含 `phaseTitle` 翻译文案；
  - sidebar HTML 不直接展示 phase 业务标签（防止与 header chip 重复 2 次）；
  - sidebar 仍渲染 risk / team / validation 三张 Card（仅删除 phase Card，未误伤其它）。

---

### BUG-154 [P2][FE] 客户详情 `客户负责人` dropdown unselected（已存在 owner 仍未默认） ✅ FIXED

- **优先级**：P2
- **根因（R12 实测修正）**：BUG-146 修复后 server 已经把 `customer.owner.name = "Local Admin"` 透传到详情页，
  `useCustomerBasicInfoModel.snapshotFromCustomer` 也正确把 `owner` 字面回填到 `currentSnapshot.owner = "Local Admin"`。
  问题出在 `useBasicInfoOptions.ownerOptions`：它直接消费 `getOwnerOptions(locale)` 返回的 7 项静态 catalog，
  与 BUG-150（建案向导 owner 下拉）的口径不一致——`Local Admin` 不在 catalog 内，模板 `<option :value="opt.label">`
  没有命中项，`<select :value="displayValues.owner">` 即便快照值正确仍渲染为空（dropdown unselected）。
- **修复结果（R12 land 2026-04-30）**：
  - `packages/admin/src/views/customers/model/useCustomerBasicInfoModel.ts`：
    - `useBasicInfoOptions` 新增 `customer: ComputedRef<CustomerDetail | null>` 入参；
    - `ownerOptions` 改为先取 `getOwnerOptions(locale)`，再用 `withCurrentUserOwnerOption` 把客户当前持久化的 owner
      （即便不在 catalog 内）注入为合并选项，复用 BUG-150 helper 的「不存在则注入 / 存在不重复」语义；
    - 注入项 `{ value: synthesized, label: customer.owner.name, initials, avatarClass }`，与 `<option :value="opt.label">`
      模板绑定一致，select 命中并显示已有 owner。
  - 与 BUG-146 server-side fix 形成闭环：`server.customer.owner.name → snapshot.owner → ownerOptions` 三段一致。
- **回归契约**：新增 `packages/admin/src/views/customers/model/useCustomerBasicInfoModel.bug154.test.ts` × 5 测试：
  - `Local Admin`（catalog 外）作为 owner 时，`ownerOptions` 必须包含 `label === "Local Admin"` 的合并项；
  - `currentSnapshot.owner` 与合并项 `label` 完全一致，确保 `<select :value=label>` 能命中；
  - catalog 内 owner（如 `高橋健太` → `高桥健太`）不重复注入，原 7 项保持稳定；
  - en-US / ja-JP locale 切换后 `Local Admin` 字面与合并项均保留；
  - 客户无 owner（`name === ""`）时不注入空选项，回退到原生 catalog。

---

### BUG-155 [P3][FE] 客户列表卡片 "我的客户" = 0 vs list "我的" tab 显示 2 条

- **优先级**：P3（口径分裂）
- **修复方向**：把 `customers.summary` 与 `customers?scope=mine` query 的 owner 判定合一；或在 admin 端把"我的"列表也按 `owner_user_id === currentUser` 过滤。
- **根因（R12 实测修正）**：`CustomerListView.vue:76` 把 hardcoded fixture
  `CURRENT_VIEWER = { ownerName: "山田翔太", group: "東京一組" }` 喂给
  `deriveCustomerSummaryStats`；同时 `matchesScope` / `deriveCustomerSummaryStats`
  比较 owner / group 时只走 `resolveOwnerValue(a) === resolveOwnerValue(b)`，
  当两侧都不在静态 catalog 时（如 server join 出的 `owner.name = "Local Admin"`
  与 fixture viewer `"山田翔太"`），`null === null` 被误判为相等→ 让任意非
  catalog 客户都被算作"我的"，但 fixture viewer 完全脱离实际登录态，导致摘要
  口径与 server `scope=mine`（按 `owner_user_id === currentUser.userId`）分裂。
- **修复结果（R12 land 2026-04-30）**：✅ FIXED
  - `packages/admin/src/views/customers/model/useCustomerFilters.ts`：抽取
    `viewerNameEquals(customerValue, viewerValue, resolve)`，仅当两侧均
    catalog miss 时才回退到 `trim` 后字面量等值；新增 `matchesViewerOwner` /
    `matchesViewerGroup` 复用至 `matchesScope` 与 `deriveCustomerSummaryStats`，
    彻底封堵"非 catalog 任意名互相相等"的旧 bug。
  - `packages/admin/src/views/customers/CustomerListView.vue`：用
    `useAdminSession().currentUser.value.name` 动态构造 viewer，与服务端
    `scope=mine`（按当前登录用户 userId 过滤、join `users.name` 输出
    `owner.name`）口径完全对齐；session 缺失时回退 fixture viewer，保持原型
    /既有 fixture 测试行为。
- **回归契约**：新增 `packages/admin/src/views/customers/model/useCustomerFilters.bug155.test.ts` × 4 测试：
  - admin 名（catalog 外）vs 同名 owner 客户 → `mine = 列表 length`、`group = ...`；
  - 加入"Random Outside User"客户后，仍然只算 admin 自己的客户为 `mine`（防止
    `null === null` 旧路径回潮）；
  - 既有 catalog 解析路径（"山田翔太" vs `Shota Yamada`）保持等值；
  - `applyFilters(scope=mine)` 输出条数与 `deriveCustomerSummaryStats.mine` 完全一致。

---

### BUG-156 [P3][FE] Settings → Group 管理表格 `创建时间` 列显示 raw ISO `2026-04-27T11:40:49.675Z` ✅ FIXED

- **优先级**：P3（R11 BUG-135 fix 末尾 TODO，server 已修，admin 端格式化未跟）
- **修复方向**：`GroupListPanel.vue:160` 由 `{{ group.createdAt }}` 改为 `{{ formatDate(group.createdAt) }}`。
- **Land 摘要**：
  - `packages/admin/src/views/settings/components/GroupListPanel.vue`：从
    `shared/model/formatDateTime` 引入 locale-aware `formatDateTime`，新增本地
    helper `fmtCreatedAt(iso)`（`formatDateTime(iso, locale.value) || "—"`，
    沿用 `CustomerCasesTab` / `CustomerLogsTab` 既有 fallback 口径），将表格
    第 3 列 `{{ group.createdAt }}` 替换为 `{{ fmtCreatedAt(group.createdAt) }}`，
    locale 切换响应由 `useI18n().locale` 驱动；空字符串/解析失败回退 `—`，与
    settings 既有空态约定一致。
  - 选用 `formatDateTime` 而非 `views/cases/model/CaseAdapterShared.ts` 中
    硬编码 `ja-JP` 的 `formatDate`，理由：Settings 面板需要随 admin 当前 locale
    输出（zh-CN / en-US / ja-JP 三语），且 R11 §1 BUG-135 末尾 TODO 的口径
    本就是"format on display"，应走 shared 层。
- **回归契约**：新增
  `packages/admin/src/views/settings/components/GroupListPanel.bug156.test.ts`
  × 5 测试：
  - 渲染后 DOM 不再含 raw ISO `2026-04-27T11:40:49.675Z`（含部分子串
    `2026-04-27T11:40:49`）；
  - zh-CN / en-US / ja-JP 三语下分别等于 `formatDateTime(ISO, locale)` 的
    输出（且 en-US 输出不再含 `T11:40:49` 字面 ISO 片段）；
  - `createdAt = ""` 行回退 `—` 占位，与 settings 既有空态一致。

---

## 2. R11 §1 BUG-133~136 验收证据（chrome-devtools-mcp 实测）

### 2.1 BUG-133 ❌ FAIL（继承）— `CaseOverviewTab` stage 卡片仍未 i18n / 终态硬编码 `"S9"`

- **走查路径 A（非终态 raw zh）**：`navigate_page → /#/cases/ea8b75b0-5fb3-48b2-b268-000bf62064ab` (CASE-202604-0004 / S2 / WAITING_MATERIAL) × locale=English
- **DOM 取证**：

  ```js
  {
    locale: "en-US",
    headerChips: ["Collecting documents","Awaiting documents","Awaiting documents"],
    overview: { label: "Current stage", value: "资料收集中", meta: "S2" },   // ← BUG-133 raw zh-CN
    coachButtons: ["cases.coach.docManagement","cases.coach.runValidation"], // ← BUG-138
  }
  ```

- **走查路径 B（终态硬编码 S9）**：`navigate_page → /#/cases/df9d1e84-fd62-4687-9297-decd8848412f` (CASE-202604-0011 / S1 / CLOSED_SUCCESS) × locale=English / ja-JP

  ```js
  // en-US:
  { headerChips:["Case opened","Closed (success)","Closed (success)"], overview:{ value:"S9", meta:"Closed" } }
  // ja-JP:
  { headerChips:["案件開始","成功クローズ","成功クローズ"], overview:{ value:"S9", meta:"結案済み" } }
  ```

  与 R11 §1 BUG-133 现象表完全一致。R11 §1「修复方向」（镜像 BUG-132 fix 引入 `stageValue` computed）尚未 land。

### 2.2 BUG-134 ❌ FAIL（继承）— `BillingListView` GROUP 过滤下拉仍 JA 默认

- **走查路径**：`navigate_page → /#/billing` × locale=English / zh-CN
- **DOM 取证**：

  ```js
  // en-US:
  { combo: "Filter group", options: ["All groups","東京一組","東京二組"] }   // ← BUG-134
  // zh-CN:
  { combo: "所属 Group：全部", options: ["所有 Group","東京一組","東京二組"] }   // ← BUG-134
  ```

- **附加观测**：`BillingTable.vue` row Group cell 全部 `—`（BUG-140，详见 §1）。R11 §1「修复方向」（`BillingListView.vue` 改 `computed(getActiveGroupOptions(locale.value))`）尚未 land。

- **修复状态（R12 land）**：✅ FIXED
  - `packages/admin/src/views/billing/fixtures.ts` 删除模块顶层
    `export const GROUP_OPTIONS = getActiveGroupOptions();`，避免再被任何
    模块在 import 期固化为 ja-JP 默认；
  - `packages/admin/src/views/billing/BillingListView.vue` 增加
    `const groupOptions = computed(() => getActiveGroupOptions(locale.value));`，
    并把 `useBillingFilters` 与 `<BillingFilters :group-options>` 全部切到
    locale 反应式选项；
  - 新增 `BillingFilters.bug134.test.ts`（6 条用例）锁定下拉文案与
    `groupAll` 占位文案随 zh-CN / en-US / ja-JP 切换的契约，并加一条回归
    守门：zh-CN / en-US 不得再出现 `東京一組 / 東京二組` 日文字面。

### 2.3 BUG-135 ✅ PASS — server 时间戳契约迁移完毕

- **API 直查（curl + chrome-devtools-mcp evaluate_script via fetch）**：

  ```js
  GET /api/groups?limit=2 → items[0].createdAt = "2026-04-27T11:40:49.675Z"   // ISO 8601 ✅
  GET /api/feature-flags  → flags[0].updatedAt = "2026-04-27T06:06:26.500Z"   // ISO ✅
  ```

  R11 §1 BUG-135 land 摘要（`packages/server/src/modules/core/{groups,customers,communication-logs,contact-persons,tasks,companies}` + `feature-flags` + eslint `no-restricted-syntax`）核对相符。**唯一遗留**：admin Settings → Group 管理表格创建时间列仍裸显 ISO（BUG-156，详见 §1）。

### 2.4 BUG-136 ⚠️ PARTIALLY FIXED — `views/customers` 已 land；`views/cases` / `views/billing` 仍漏

- **PASS 部分**（chrome-devtools-mcp 取证）：

  ```js
  // navigate_page → /#/customers ; locale=zh-CN
  // 第一行 R6试探客户 → 所属分组 cell = "东京一组"   ✅ R11 BUG-136 fix 命中
  ```

- **FAIL 部分**（详见 §1 BUG-139 / BUG-140）：
  - 建案向导 Step 2 客户下拉 / 选中卡片 / Step 3 inherited group display 三处均直显 `ef21fdd2-1ffc-4a27-8b47-a640d6bd021c`；
  - 收费列表 row Group cell 在 3/3 行均空白。

---

## 3. 顺手补充观测（不立 bug，但建议跟踪）

### 3.1 Settings → Group 管理 `创建时间` 列裸显 ISO（已抓为 BUG-156）

详见 §1。R11 §1 BUG-135 末尾 TODO 即此项；建议与 BUG-135 land 之后的同 PR 合并。

### 3.2 `customer.group = ""` 留空显示

- BUG-136 echo：第二行客户 `Tani Keiei Cert4M Test` 的 group cell 完全空（无 chip、无 `—`）。视觉上让用户误以为"所属分组"列对该行不适用。建议用 `t("shared.group.unassigned")` 显式占位（与 R11 §3.1 一致）。

### 3.3 `"主申請人"` JA 字面 hardcoded（已抓为 BUG-152）

详见 §1。

### 3.4 收费表 `下一收款节点` cell 直显 zh-CN `尾款`（all locale）

- 与 R11 §3.4 一致，沿用"业务里程碑命名通常是 admin 录入文案"结论暂不立 bug。若要支持多语言，server 应返回 `i18nKey` + `name` 两字段。

### 3.5 stage / phase 失配（CASE-202604-0011 等）

- `/api/cases?scope=all` 19 行里有 14 行 stage=S1 但 phase 是 WAITING_PAYMENT / CLOSED_SUCCESS / RENEWAL_REMINDER_SCHEDULED 等远期阶段；只有 CASE-202604-0004 (S2/WAITING_MATERIAL) 与 0001/0002 (S9/CLOSED_SUCCESS) 是合理对齐。这是 R10 §4 / R11 §3.5「stage / phase 终态联动」未决项的进一步证据，但 R12 仍不立 bug，等产品决策。

### 3.6 全局搜索 / Global search 仍 disabled（"建设中" / "Coming soon"）

- 与 R11 一致；放在产品 backlog。

### 3.7 zh-CN 下"フリガナ"未本地化

- 沿用 R11 §3.3：可能是产品有意保留 JA 业务术语；不立 bug，但跟 BMV 等术语一并请产品确认。

---

## 4. 仍未覆盖 / 待立项

本轮**未触及**（沿用 R11 §4 状态）：

- BUG-110（`tests/integration-pg/` schema-compatibility 测试体系）
- BUG-112（Tasks 页未 i18n —— 现已升级为 BUG-142 P0 placeholder 回退）
- BUG-113 / 114 / 115（timeline query alias / dashboard 文案 / customer backfill）
- stage / phase 终态联动（产品决策；本轮 §3.5 再次出证）
- CLOSED_FAILED 路径 + closeReason 入参校验
- a11y `[role=tab]` ↔ `[role=tabpanel]` 关联（R10 §3.4 / R11 §3.2）

本轮**新增待立项**：

- 13 条 P1 / P2 / P3 详见 §0.4 与 §1 全表。
- **BUG-142 P0**：`/#/tasks` 退回 placeholder（最高优先级）。
- **R4 闭环回退治理**：BUG-141 / 142 / 145 / 146 共同暴露 R4 「✅ 已修」结论已被回退；建议在 `git log` 中定位 4 条回退 PR，添加 PR-level guardrail（`describe.skip` 禁止 + 关键 view 端到端 smoke）。
- **i18n 守门补强（与 R11 §4 同步增量）**：admin lint 自定义规则禁止 `views/**` 直接渲染 `^cases\.|^customers\.|^leads\.` 前缀的 raw key；vue-i18n missingHandler 改为 throw / log error 而非 silent fallback；强制为模板 catalog 的 description / type 字段补 i18n 资源。
- **数据 join 守门**：admin shell 启动时 `/api/groups` prefetch 机制（R11 BUG-136 已建立）必须扩展到 `views/cases` 与 `views/billing` —— 只在 `views/customers` 单一 view 应用 alias map 不够。
- **R4 customer numbering 守门**：server lint 规则 `customers/**.controller.ts` 内 `create*` 路径必须经过 `createCustomerWithNumbering` helper（当前直接调用 `customersService.create` 是关键回归点）。

---

## 附录 — 关键证据快照

### A. chrome-devtools-mcp 截图

| 文件 | 内容 | 对应 Bug |
|---|---|---|
| `/Users/ck/r12_bug133_terminal_en.png` | CASE-202604-0011 en-US 概览，chip `Case opened` / overview value `S9` | BUG-133 ❌（终态硬编码）|
| `/Users/ck/r12_bug133_overview_raw_zh_en.png` | CASE-202604-0004 en-US 概览，chip `Collecting documents` / overview value `资料收集中` / coach buttons `cases.coach.docManagement` `cases.coach.runValidation` | BUG-133 ❌ + BUG-138 ❌ |
| `/Users/ck/r12_bug134_billing_filter_en.png` | 收费列表 en-US，过滤下拉 `東京一組` / `東京二組` JA 残留 + row Group 列空白 | BUG-134 ❌ + BUG-140 ❌ |
| `/Users/ck/r12_bug144_template_descriptions_en.png` | 建案向导 Step 1 en-US，10 模板按钮中 8 条描述仍为 zh-CN 字面 | BUG-144 ❌ + BUG-149 ❌（标题双重拼接）|
| `/Users/ck/r12_bug142_tasks_placeholder_en.png` | `/#/tasks` 显示 "This placeholder keeps sidebar navigation valid for Tasks & reminders ..." | BUG-142 ❌（P0）|

### B. API 直查证据

```bash
# 0) 取 token
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.test","password":"Admin123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

# BUG-135 ✅：/api/groups 已切到 ISO 8601
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/groups \
  | python3 -c 'import sys,json;print("createdAt:", json.load(sys.stdin)["items"][0]["createdAt"])'
# → createdAt: 2026-04-27T11:40:49.675Z

# BUG-137 复现：empty birthday → 400
curl -s -X POST http://localhost:5173/api/customers \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"type":"individual","baseProfile":{
    "displayName":"R12 birthday probe","legalName":"X","name_cn":"X","furigana":"X",
    "phone":"08099999999","email":"r12.bday@example.com","group":"tokyo-1","birthday":""
  }}'
# → {"message":"Invalid baseProfile: birthday must be a valid date string","statusCode":400}

# BUG-145 复现：客户 customerNumber=UUID
curl -s -X POST http://localhost:5173/api/customers \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"type":"individual","baseProfile":{
    "displayName":"R12 number probe","legalName":"X","name_cn":"X","furigana":"X",
    "phone":"08099999898","email":"r12.num@example.com","group":"tokyo-1"
  }}' | python3 -c 'import sys,json;b=json.load(sys.stdin);print("id=",b["id"],"customerNumber=",b.get("customerNumber"))'
# → id= <uuid>  customerNumber= None      # 期望 "CUS-202604-NNNN"
```

### C. 一键复现脚本（chrome-devtools-mcp 化的 e2e）

```text
# 0) 登录
navigate_page → /#/login ; fill admin@local.test / Admin123! ; click 登录

# 1) BUG-141 / 137 / 147 / 148 验证（一次走完客户新建 modal）
navigate_page → /#/customers ; click "添加客户"
fill_form 13 fields；不填 birthDate
list_console_messages       → 期望含 [issue] form field id/name 缺失（21 个）
                               + [warn] [intlify] missing customers.list.createModal.state.checkingDuplicates
list_network_requests        → 期望 check-duplicates POST 数 ≤ 4（实测 28 ❌）
click "创建客户"
wait_for "已创建" / "成功"   → 实测被 customers.list.createModal.state.validationError 卡住

# 2) BUG-139 / 152 验证（建案向导 Step 2/3）
navigate_page → /#/cases/create?customerId=<existing>
click 经营管理（认定 4 个月） ; click 下一步
take_snapshot             → Step 2 dropdown options 应**不**含 UUID 字符串
select 第一个客户 ; take_snapshot → 选中卡片"主申請人"右侧应**不**是 UUID
click 下一步              → Step 3 "Group 继承自主申请人" 后应是 i18n group label

# 3) BUG-133 / 138 / 153 / 143 验证（案件详情 + 列表）
navigate_page → /#/cases ; locale=English
evaluate_script: tbody td:nth-child(4) → 期望**不**为 "biz_mgmt_4m"
navigate_page → /#/cases/df9d1e84-fd62-4687-9297-decd8848412f ; locale=English
evaluate_script: [data-testid=overview-card-stage] .overview-tab__stat-value → 期望**不**为 "S9"
evaluate_script: button[textContent ~= ^cases\.coach\.] → 期望计数 = 0
evaluate_script: .ui-chip → 期望长度 = 2（实测 = 3 ❌ phase chip 重复）

# 4) BUG-134 / 140 验证（收费列表）
navigate_page → /#/billing ; locale=English
evaluate_script: combo "Filter group" options → 期望含 "Tokyo Team 1"（实测 "東京一組" ❌）
evaluate_script: tbody td:nth-child(4) → 期望含真实 group label（实测全部 "" ❌）

# 5) BUG-142 验证（任务页 placeholder）
navigate_page → /#/tasks
evaluate_script: main.textContent → 期望**不**含 "placeholder" / "Page status" / "until the full module"

# 6) BUG-156 验证（Settings → Group 创建时间）
navigate_page → /#/settings?tab=groups
evaluate_script: tbody tr:nth-child(1) td:nth-child(3) → 期望非 ISO 字面（实测 "2026-04-27T11:40:49.675Z" ❌）
```

### D. 网络与 console 噪声基线

- 详情页一次完整加载：≈ 11 个聚合接口（与 R10 / R11 一致，无新接口）。
- 客户新建 modal：单次完整填写触发 28 次 `POST /api/customers/check-duplicates` + 1 次 `POST /api/customers`；其中 28 次完全可省（BUG-147）。
- console：除上述 BUG-138 / 137 i18n missing key warn 与 BUG-148 a11y issue 外，无新错误回归。
