# 客户模块（admin）— 浏览器自动化走查 Bug 清单

> 生成日期：2026-04-27
> 走查依据：`docs/gyoseishoshi_saas_md/_output/06-客户模块浏览器自动化走查脚本.md`
> 走查工具：`chrome-devtools-mcp`（Chromium 自动化）+ `curl`（API 直查）
> 走查环境：`http://localhost:5173/#/`，本地 admin（`admin@local.test` / `Admin123!`），`localStorage.cms-admin-locale = en-US`
> 走查范围：customers / cases / leads / conversations / billing / documents / tasks / settings / dashboard
> 截图归档：`docs/gyoseishoshi_saas_md/_output/screens/`

---

## 0. 走查总结

### 0.1 场景执行结果

| 场景 | 名称 | 结果 | 备注 |
|------|------|------|------|
| CUS-AUTO-001 | 客户列表 smoke | **FAIL** | 列表加载成功但 KPI、Group / Owner 过滤、Customer 列展示 UUID 等多处异常 |
| CUS-AUTO-002 | 普通客户详情 Tab 走查 | **FAIL** | Cases Tab 因 `/api/cases` 500 整体阻塞；Activity log 出现 zh 文案与畸形时间戳 |
| CUS-AUTO-003 | 普通客户 → 单建案 | **FAIL** | Start a case 模板与 application type 全部 zh，自动标题混入 zh |
| CUS-AUTO-004 | 普通客户 → 家族批量建案 | **BLOCKED** | 单建案路径已确认基础规模问题，批量未深入；建议修复 `/api/cases` 后再补 |
| CUS-AUTO-005 | BMV 未签约门禁 | **BLOCKED** | 数据库无 BMV 样本，无法构造 `pre_sign` 状态客户 |
| CUS-AUTO-006 | BMV → 正式案件 | **BLOCKED** | 同上 |
| 补量 | leads / conversations / billing / documents / dashboard / settings / tasks | **FAIL** | 关键 API 401/404/500、整页 fixture、i18n 大面积泄漏 |

### 0.2 Bug 总数

| 优先级 | 数量 | 说明 |
|--------|------|------|
| P0 | 6 | 后端 5xx / 路由缺失 / Token 无法访问业务接口 → 直接阻塞核心动线 |
| P1 | 21 | i18n 大面积泄漏、UI 与数据契约不一致、表单/校验/可访问性 |
| P2 | 7 | 体验 / 数据一致性 / 占位页 |
| P3 | 4 | 文案 / URL / aria-label 等小瑕疵 |
| **总计** | **38** | — |

### 0.3 三句话结论

1. **客户模块脚本里 P0/P1 大半个无法跑完**：核心后端接口（`/api/cases`、`/api/leads`、`/api/conversations`、`/api/billing/case-billings`、`/api/documents`）当前对已认证 admin 不是 500、401 就是 404，不是“数据为空”而是“接口不可用”。
2. **现存可见数据大量来自前端 fixture**：leads / billing / documents / customer-detail Owner 下拉等几乎全部展示中文/日文硬编码样本，与 `cms-admin-locale=en-US` 完全脱节，正常用户视角下会立即产生“产品没做完”的强烈印象。
3. **客户能创建但不可用**：`POST /api/customers` 成功后客户在列表里以 UUID 显示、Owner 为空、KPI 不更新、详情页 Cases Tab 因 API 500 直接红屏；按现有产品规格定义的“客户 → 案件”闭环不可走通。

---

## 1. P0 — 阻塞核心动线（必须修复）

### BUG-001 [P0][API] `GET /api/customers/:id` 收到非 UUID 时返回 500

- **位置**：`packages/server/src/modules/customers/...`，路由 `GET /api/customers/:id`
- **现象**：访问 `http://localhost:5173/#/customers/cust-001`、`/cust-004` 时，前端调用 `/api/customers/cust-001` 直接拿到 `500 Internal Server Error`，前端弹出 “Couldn't load this customer right now.”。
- **期望**：非 UUID 应在 controller 层 `ParseUUIDPipe` 或 DTO 校验拦截为 `400 Bad Request`，前端应展示 “Invalid customer id”。
- **复现**：
  1. 登录后访问 `http://localhost:5173/#/customers/cust-001`
  2. 观察 network → `customers/cust-001` 5xx
- **影响**：脚本里 CUS-AUTO-002 / 003 / 004 默认使用的 `cust-001` / `cust-004` 直接 500，等同于客户详情页对“坏 ID”全面崩溃。

### BUG-002 [P0][API] `GET /api/cases?customerId=...&view=summary` 持续 500

- **位置**：`packages/server/src/modules/core/cases/cases.controller.ts` `list()` → `casesService.listSummary` / `casesService.list`
- **现象**：客户详情页打开 “Cases” tab 时，`/api/cases?customerId=<uuid>&view=summary` 返回 500；改为不带 `view`、`view=list`、`view=board` 也都 500。
- **期望**：返回 200 + 空数组（无 case 时）或 200 + 摘要 JSON。
- **复现**：
  ```bash
  curl -i -H "Authorization: Bearer <admin-token>" \
       "http://localhost:5173/api/cases?customerId=654cd273-5b6f-43c3-a4f6-3c52a1f728cf&view=summary"
  ```
- **影响**：阻断客户详情 Cases Tab、阻断 Case 列表页面任何按客户筛选的入口；脚本 CUS-AUTO-003 / 004 全部依赖此接口。

### BUG-003 [P0][Auth] 已登录 admin 的 Bearer Token 在 `/api/leads` 上被判 401

- **位置**：`packages/server/src/modules/leads/...` 或全局 AuthGuard 配置
- **现象**：使用 `POST /api/auth/login` 拿到的同一个 `token` 调用 `/api/customers` 工作正常，调用 `/api/leads` 立即返回 `{"message":"Invalid or expired token","error":"Unauthorized","statusCode":401}`，且与时效无关（刚刚登录就重现）。
- **期望**：admin 应被允许访问 `/api/leads`，与 `/api/customers` 行为一致。
- **复现**：
  ```bash
  TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@local.test","password":"Admin123!"}' \
    | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
  curl -i -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/leads
  ```
- **影响**：Leads 列表页只能展示 fixture，无法承载真实数据，整个商机模块在 admin 视角下不可用。

### BUG-004 [P0][Auth] 已登录 admin 的 Bearer Token 在 `/api/conversations` 上被判 401

- **位置**：`packages/server/src/modules/conversations/...` 或全局 AuthGuard
- **现象**：与 BUG-003 相同的 token，调用 `/api/conversations` 返回 401，前端 `/#/conversations` 显示 “Failed to load conversations. Please try again.”。
- **期望**：admin 至少可读所有 conversations。
- **影响**：Conversations 模块整体不可用。

### BUG-005 [P0][Routing] `GET /api/billing/case-billings` 返回 404

- **位置**：`packages/server/src/modules/billing/...`
- **现象**：携带合法 admin token 调用 `/api/billing/case-billings` 直接 404；尝试 `/api/billing/cases`、`/api/case-billings` 也都 404。
- **期望**：路由应在 server 启动时挂载并对 admin 返回 200。
- **影响**：Billing & finance 页面虽然能渲染（来自 fixture），但任何 “保存 / 标记付款” 写动作都会落到不存在的接口上。

### BUG-006 [P0][Routing] `GET /api/documents` 返回 404

- **位置**：`packages/server/src/modules/documents/...`
- **现象**：携带合法 admin token 调用 `/api/documents` 直接 404。
- **期望**：路由应挂载，admin 可读全部文档。
- **影响**：Document center 整页基于 fixture，且任意文档操作（提交 / 退回 / 共享）都将落在不存在的接口上。

---

## 2. P1 — 显著影响可用性

### 2.1 i18n / 本地化泄漏（locale=en-US 时仍出现 zh / ja 文案）

> 共同根因建议：审计 `packages/admin/src/views/**` 中所有未走 `useI18n` / `t()` 的硬编码字符串，重点是来自 `fixtures.ts` 的样本数据。

#### BUG-007 [P1][i18n] 顶部 “Skip to content” 链接显示 “跳到内容”

- **位置**：`packages/admin/src/layouts/...`（页面 banner 内的 skip link）
- **现象**：所有页面都能看到 `link "跳到内容"`，无视当前 locale。
- **期望**：跟随 i18n，英文界面下应为 “Skip to content”。

#### BUG-008 [P1][i18n] 全局面包屑 `aria-label` 永远是 “パンくずリスト”

- **位置**：`packages/admin/src/...`（统一的 Breadcrumb 组件）
- **现象**：每个页面 main 区域里的 `navigation` 元素 aria-label 是日文，screen reader 体验破裂。
- **期望**：aria-label 走 i18n，英文应为 “Breadcrumb”。

#### BUG-009 [P1][i18n] System Settings 子导航 `aria-label = "設定サブナビゲーション"`

- **位置**：`packages/admin/src/views/settings/...`
- **现象**：英文界面下该 navigation 的 aria-label 仍是日文。
- **期望**：跟随 i18n。

#### BUG-010 [P1][i18n] Customer list Group 单元格直接展示 “東京一組”

- **位置**：`packages/admin/src/views/customers/...`（列表行渲染）+ 后端 group seed
- **现象**：`uid=34_13 StaticText "東京一組"`。Group 名称是后端持久化的日文字符串，没有英文映射。
- **期望**：要么 group 名是固定枚举 + i18n key，要么允许多语言 alias。

#### BUG-011 [P1][i18n] 创建客户失败时显示原始 i18n key

- **现象**：填写客户表单、State 字段缺失时，错误提示直接渲染 `customers.list.createModal.state.validationError`。
- **期望**：`useI18n` 找不到 key 应 fallback，且必须存在该 key 的中 / 英 / 日翻译。

#### BUG-012 [P1][i18n] Document center 整页 zh 化

- **现象**：Document center KPIs（待审核 / 缺件 / 过期 / 共享版本过期风险）、状态值（待提交、已提交待审核、退回补正、无需提供）、Status / Provider / Case names 过滤项几乎全部是中文，且 “过期” / “已过期” 在同一页混用。
- **期望**：所有 status 用枚举 + i18n key；术语统一。
- **截图**：`screens/06-documents-fixture-cn.png`

#### BUG-013 [P1][i18n] Billing & finance 整页 zh 化

- **现象**：Customer Type、付款阶段（首付款 (100%) / 尾款 (50%) / 全款 (100%) / 尾款 (COE下発後)）、状态文案（已逾期 5 天 / 申请获批后 7 天内 / 资料收集齐后 3 天内 / 结果获批后 7 天内）以及案件名都是中文。
- **期望**：所有 stage / status / 提示语都走 i18n；fixture 切换为后端真实数据。
- **截图**：`screens/05-billing-fixture-cn.png`

#### BUG-014 [P1][i18n] Leads 类型 / 过滤项中文硬编码

- **现象**：Lead 类型（高度人才 / 技人国 / 家族滞在 / 设立法人 / 永住 / 其他）和 Owner / Group 下拉部分中文。
- **期望**：常量枚举 + i18n key；Group / Owner 来源应是 server 当前用户和 group。
- **截图**：`screens/04-leads-fixture-jp.png`

#### BUG-015 [P1][i18n] Activity log 事件类型与内容 zh 化

- **位置**：客户详情 → Activity log Tab
- **现象**：事件 Type 列固定为 “信息变更”，描述列出现 “创建客户”，User 列展示 raw UUID。
- **期望**：事件 type 用枚举 + i18n；描述模板走 i18n；User 渲染为人名。

#### BUG-016 [P1][i18n] Start a case 模态 zh 文案 + 自动标题混入 zh

- **位置**：`packages/admin/src/views/cases/...`（创建案件模态）
- **现象**：模板描述、application type（认定 / 变更 / 更新）、自动生成案件标题如 “Tanaka Taro 家族滞在认定” 都包含中文。
- **期望**：application type 是固定枚举映射 i18n；自动标题模板按 locale 拼装。

### 2.2 UI / 数据契约不一致

#### BUG-017 [P1][UI] 客户列表 “Customer” 列把 UUID 当人名展示

- **位置**：`packages/admin/src/views/customers/...`
- **现象**：表格 “Customer” 列展示 `Tanaka Taro` 之外又把 UUID `654cd273-5b6f-43c3-a4f6-3c52a1f728cf` 当作副文本，`customerNumber` 不见踪影。
- **期望**：副文本应展示 `customerNumber`（如 `C-20260427-0001`）；UUID 不应出现在面向用户的列表里。
- **截图**：`screens/02-customers-list-uuid-as-name.png`

#### BUG-018 [P1][Data] 新建客户没有 owner / 群组归属

- **现象**：`POST /api/customers` 成功后，列表 Owner 列为 “—”、Group 列为 “東京一組”（来自表单选择），但没有写入“当前 admin 为 owner”，导致 “Mine” Tab 始终为 0。
- **期望**：要么默认 owner = 当前用户，要么强制要求 owner 必填。

#### BUG-019 [P1][Data] 客户列表 KPI 在创建客户后没有同步

- **现象**：成功创建一名客户后，MY CUSTOMERS / TEAM CUSTOMERS / ACTIVE CASES 仍显示 0；只有 NO ACTIVE CASES 在 “All (admin)” Tab 跳到 1。
- **期望**：KPI 应在 `POST /api/customers` 成功后立即重算或拉取。

#### BUG-020 [P1][Data] 客户详情 Owner 下拉是日文 fixture 名

- **现象**：Owner combobox 选项是 “山田翔太” 等日文姓名，与系统真实用户表无关。
- **期望**：Owner 选项必须来自 `/api/users` 当前可分配集合。

#### BUG-021 [P1][UI] Activity log 时间戳格式畸形

- **现象**：时间戳显示为 `Mon Apr 27 2026 14:14:27 GM +0900 (Japan Standard Time)`，疑似 `Date.toString()` 直出且 `GMT` 被截成 `GM`。
- **期望**：使用 `Intl.DateTimeFormat` 或 `dayjs` 按 locale 格式化为 `2026-04-27 14:14:27 (JST)`。

#### BUG-022 [P1][UI] Conversations 页同时展示 “Failed to load” 与 “No conversations” 两个互斥状态

- **位置**：`packages/admin/src/views/conversations/ConversationsListView.vue`
- **现象**：`uid=31_18 "Failed to load conversations. Please try again."` 与 `uid=31_19/20 heading "No conversations" + "No conversations match the current filters."` 同时出现。
- **期望**：错误态与空态互斥，错误态应阻止空态卡片渲染。
- **截图**：`screens/03-conversations-failed-and-empty.png`

#### BUG-023 [P1][UI] 客户不存在时前端给的是 retry 而不是 “not found”

- **现象**：访问合法 UUID 但服务端返回 400 / not found 时，UI 显示 “Couldn't load this customer right now. Retry / Back to list”，让用户以为是网络问题。
- **期望**：区分 4xx / 5xx，4xx 类直接展示 “Customer not found”，禁用 retry。

#### BUG-024 [P1][UI] Cases Tab 与页面头部按钮状态不一致

- **现象**：客户详情 → Cases Tab 内的 “Batch create cases” 与 “Start case” 处于 disabled，但页面顶部一模一样的按钮 enabled，且点击顶部按钮可正常进入流程。
- **期望**：相同 action 的禁用条件统一。

#### BUG-025 [P1][UI] 全局 “Add customer” 按钮文案前置空格

- **位置**：`packages/admin/src/views/customers/...`
- **现象**：snapshot 显示 `button " Add customer"`（前导空格）。
- **期望**：去掉前导空格；同时检查图标 + 文案的间隔是否用 CSS gap 而不是字符串拼接。

#### BUG-026 [P1][UI] 顶部 “New case” 按钮在 admin 登录后默认 disabled

- **位置**：所有页面顶部 `uid=4_12 button "New case" disableable disabled`
- **现象**：admin 用户进站时该按钮直接禁用，没有 tooltip 解释为什么。
- **期望**：要么移除这个全局入口，要么给出禁用原因（“Pick a customer first”）并允许点击进入“先选客户”分支。

### 2.3 表单 / 校验

#### BUG-027 [P1][API] `POST /api/customers` 强制 birthday 必填，但 UI 表单允许为空

- **现象**：未填生日提交时，API 报 `400 Invalid baseProfile: birthday must be a valid date string`，前端却没有标红 birthday 字段，用户不知道哪里错了。
- **期望**：前端将 birthday 标为必填 + 红色错误提示；后端错误信息映射到 birthday 字段。

#### BUG-028 [P1][Perf] `POST /api/customers/check-duplicates` 单次表单交互内被触发 36 次

- **现象**：从打开 “Add customer” 到提交期间，仅在改 phone / email / 姓名 fields 时触发 36 次 duplicate 检查，无防抖。
- **期望**：input 类字段统一加 300–500ms debounce；可考虑只在 blur 触发。

#### BUG-029 [P1][A11y] 17 个表单元素缺少 `id` 或 `name` 属性

- **现象**：审计当前表单时 `evaluate_script` 返回 17 个 input/select/textarea 没有 `id` 也没有 `name`，screen reader / 自动填充均会受影响。
- **期望**：所有表单元素都有稳定 `id` + `for` 关联或 `aria-labelledby`。

#### BUG-030 [P1][A11y] 12 个表单元素缺少关联 label

- **现象**：与上条同源，12 个 input 元素既无 `<label for>` 也无 `aria-label`。
- **期望**：补 label 或 aria-label。

### 2.4 数据来源 / 一致性

#### BUG-031 [P1][Data] Leads “Mine” Tab 在 admin 没有任何分配的情况下展示 8 条

- **现象**：当前 admin (`admin@local.test`) 在 lead fixture 中没有 owner 字段对应记录，但 Leads → Mine 里仍展示 8 条数据。
- **期望**：`/leads?view=mine` 应该按 `owner_id == currentUser.id` 严格过滤。

#### BUG-032 [P1][Data] Group 来源在多个页面不一致

- **现象**：System Settings 中 Group 一共有 3 个（東京一組 / 東京二組 / 大阪組-Disabled），但：
  - Add Customer 弹窗 Group 下拉只看到 “東京一組 / 東京二組”
  - Cases / Customers 列表的 Group 过滤只剩 “Group: All”（无任何选项）
  - Dashboard quick filter / Leads 过滤里又出现 “Osaka Team”
- **期望**：所有 Group 选择器走同一个 `/api/groups?status=active` 数据源，命名（`大阪組` vs `Osaka Team`）也要统一。

---

## 3. P2 — 体验 / 一致性

### BUG-033 [P2][Nav] 侧栏 “Tasks & reminders” 是占位页

- **现象**：`/#/tasks` 页面只有一段 “Planned / The route for Tasks & reminders is now registered and ready for the full page.”，但仍出现在生产侧栏 BUSINESS 区。
- **期望**：未上线模块应通过 `feature flag` 隐藏，或加 “Coming soon” badge。

### BUG-034 [P2][i18n] 同一术语在 Document center 中混用 “过期” 与 “已过期”

- **现象**：KPI 用 “过期 / 共享版本过期风险”，状态值用 “已过期”。
- **期望**：统一用一个术语；理想做法是改成 i18n key 后由翻译保证一致。

### BUG-035 [P2][UX] 创建客户成功后未给出 toast/inline 反馈

- **现象**：表单提交成功后模态关闭、列表自动跳到 “All (admin)” Tab，但没有任何 success toast，用户对“是否成功”靠观察列表数量。
- **期望**：成功 toast “Customer created successfully” + 高亮新建行 5s。

### BUG-036 [P2][UI] 客户列表空态没有 “Add your first customer” CTA

- **现象**：所有 Tab 在 0 条数据时只显示 “Showing 0–0 of 0”，没有空态引导。
- **期望**：empty state 应给行动指引，与 Add customer 按钮联动。

### BUG-037 [P2][UI] Customers 列表 `Group: All` / `Owner: All` 在数据源未加载时仅有一个选项

- **现象**：Mine Tab 下 Group / Owner 下拉只有 “All”，看起来像是没拉到数据；与 Settings 页面里有 3 个 Group 不一致。
- **期望**：要么 lazy-load 时显示 “Loading…”，要么始终把全集 Group / Owner 列出来。

### BUG-038 [P2][Data] 案件创建后 Activity log 写入 User=UUID

- **现象**：创建客户后 Activity log 把 “User” 列写为 raw UUID 而不是 admin 显示名。
- **期望**：写入应解析当前用户 displayName。

### BUG-039 [P2][UX] Dashboard / 顶栏 “New case” 与 “New lead” 视觉权重不对

- **现象**：admin 登录后顶部 “New case” 处于 disabled，但 “New lead” 是 primary 风格按钮 → 视觉上像是在主推 lead 创建。
- **期望**：在 admin 默认视角下要么移除 “New case”，要么调整次级样式，避免视觉误导。

---

## 4. P3 — 文案 / 细节

### BUG-040 [P3][URL] Tasks 页面 breadcrumb Dashboard 链接缺少 `#`

- **现象**：`/#/tasks` 的 breadcrumb 里 `Dashboard` 跳到 `http://localhost:5173/`，而其它页面是 `http://localhost:5173/#/`。
- **期望**：所有路由内链接统一使用 hash 路由格式。

### BUG-041 [P3][i18n] Cases / Customer 详情下拉 placeholder 仍含日文

- **现象**：在英文 locale 下，部分下拉 placeholder（如 “选择…”）仍是中文，未做兜底。
- **期望**：placeholder 走 i18n。

### BUG-042 [P3][UI] 顶部 LA avatar 没有 aria-label / tooltip

- **现象**：右上角圆形 avatar `LA` 看不出是谁，hover 不出现用户信息。
- **期望**：补 `aria-label="Local Admin (admin@local.test)"`、点击展开账户菜单。

### BUG-043 [P3][UI] Skip to content 链接 visually hidden 但 tab focusable 顺序异常

- **现象**：page tab 顺序里 `"跳到内容"` 始终最先 focus，但视觉上用户看不到，影响键盘可达性体验。
- **期望**：focus 时用 visible 样式弹出。

---

## 5. 复现指引（给后续研发）

### 5.1 启动环境

```bash
# Terminal 1
cd /Users/ck/workplace/cms-client
npm --prefix packages/server run start:dev

# Terminal 2
cd /Users/ck/workplace/cms-client
npm --prefix packages/admin run dev    # 监听 5173
```

### 5.2 拿到管理员 Token

```bash
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.test","password":"Admin123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
echo $TOKEN
```

### 5.3 一键检查 P0 接口健康度

```bash
for path in /api/customers /api/cases /api/leads /api/conversations /api/billing/case-billings /api/documents; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:5173$path")
  echo "$code  $path"
done
```

预期产出（修复前实测）：

```
200  /api/customers
500  /api/cases
401  /api/leads
401  /api/conversations
404  /api/billing/case-billings
404  /api/documents
```

### 5.4 浏览器侧最小复现

```js
localStorage.setItem('cms-admin-locale', 'en-US');
location.hash = '#/customers';
```

随后即可观察 BUG-007 / 008 / 017 / 018 / 019 / 025 / 026 等 UI 类问题。

---

## 6. 建议修复顺序

1. **P0 优先**：BUG-002（`/api/cases` 500）、BUG-003 / 004（admin token 401）、BUG-005 / 006（404 路由缺失）。这五个是其它走查的前置。
2. **数据契约**：BUG-001 / 023 / 027 一起修，把 “非法 ID / 不存在 / 字段缺失” 三类错误码全部从 5xx 拉到 4xx，前端再做错误态分支。
3. **i18n / fixture 清扫**：BUG-007 ~ 016 + BUG-031 ~ 032 应作为一个独立 epic，统一审计 `views/**/fixtures.ts` 与组件中硬编码字符串。
4. **客户主流程闭环**：BUG-017 / 018 / 019 一起修，把 customerNumber、Owner、KPI 三件事补齐，然后才能跑 CUS-AUTO-002 ~ 004。
5. **辅助清理**：剩余 P2 / P3 在主流程稳定后批处理。

---

## 7. 仍未覆盖（建议下一轮走查）

- CUS-AUTO-005 / 006 BMV 流程：需要先 seed 一个处于 `pre_sign` 与 `signed` 状态的 BMV 客户，再 toggle `bmv` feature flag。
- 家族批量建案：依赖 `/api/cases` 修好。
- Dashboard 各 widget 的真数据回归（当前数据全是 0，无法判断聚合是否正确）。
- Settings → Visibility Settings / Local Document Root 子页面（本轮未点开）。
- 日文 / 中文 locale 反向走查（确认英文 locale 修复后，其他语言是否回归正确）。

---

## 附录 A — 截图

| 文件 | 描述 |
|------|------|
| `screens/01-settings-groups-jp-aria.png` | Settings → Groups，aria-label 仍是日文 |
| `screens/02-customers-list-uuid-as-name.png` | Customer 列下方副文本显示 UUID |
| `screens/03-conversations-failed-and-empty.png` | Conversations 同时展示错误态与空态 |
| `screens/04-leads-fixture-jp.png` | Leads 列表 fixture，日 / 中 文混杂 |
| `screens/05-billing-fixture-cn.png` | Billing & finance 整页中文 fixture |
| `screens/06-documents-fixture-cn.png` | Document center 整页中文 fixture |

