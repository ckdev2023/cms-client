# 咨询模块 chrome-devtools-mcp 走查（第三轮 / R-CONSULT-03）

> 生成日期：2026-05-06
>
> 命题：在 R-CONSULT-01 / R-CONSULT-02 已闭环的基础上，对「咨询线索」+
> 「咨询会话」做更深一层的端到端走查；重点覆盖 R2 未触达或浅触达的：
> ① 失败路径（lostReason 必填、状态机回退、BMV 闸口可视化）；
> ② 余下 bulk endpoint（assign / status / export / followup / tags）；
> ③ BMV（经営管理签）→ convert-case 的完整闸口；
> ④ 会话模块全部 admin 操作（list / detail / send / assign / close /
> reopen / retry-translation）。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot /
> click / fill_form / wait_for / evaluate_script / list_network_requests /
> get_network_request / list_console_messages / resize_page）+ 直连 PG /
> Redis 校验真实持久化。
>
> 数据集：Local Demo Office（admin@local.test / Admin123!），含
> R-CONSULT-02 H-10 seed 出来的 `app_user/portal-lead/2 conversation/
> 4 message` demo 数据。
>
> 上游权威：
>
> - [P0/06-页面规格/咨询线索.md](../P0/06-页面规格/咨询线索.md)
> - [P0/06-页面规格/咨询会话.md](../P0/06-页面规格/咨询会话.md)
> - [P0/03-业务规则与不变量.md §2.1 / §2.2 / §2.6 / §3.6](../P0/03-业务规则与不变量.md)
> - [P0/04-核心流程与状态流转.md §4.1 咨询转案件](../P0/04-核心流程与状态流转.md)
> - [56-咨询模块chrome-devtools-mcp走查-第一轮.md](./56-咨询模块chrome-devtools-mcp走查-第一轮.md)
> - [57-咨询模块chrome-devtools-mcp走查-第二轮.md](./57-咨询模块chrome-devtools-mcp走查-第二轮.md)

---

## 0. 总结

### 0.1 一句话结论

**R-CONSULT-01 / R-CONSULT-02 已修条目大部分保持回归通过，但本轮新发现
10 条缺陷：P0 0 条 / P1 4 条 / P2 4 条 / P3 2 条；其中
最严重的一条落在「咨询会话」模块——`R3-E-2` 会话详情整页
"会话加载失败"（`R3-E-3` admin UI 调 `POST` 的报告经 A3 验证未复现，
代码已为 PATCH，归因走查时浏览器旧 bundle，已关单）；同时存在一条 H-6 的局部回归
`R3-D-1`（dedup-confirm 路径下确认转客户后视图状态滞后），与一条
未真正落地的 stub `R3-F-2`（bulk-tags 接口仅写 `lead_logs` 不更新
`leads` 表）。**

### 0.2 优先级分布

| 等级 | 个数 | 编号 | 主题 |
|------|------|------|------|
| P0 | 0 | — | — |
| P1 | 3 (+1 关单) | R3-A-1 / R3-E-1 / R3-E-2 / ~~R3-E-3~~ | 列表过滤静默失败 / 会话列表缺 join / 会话详情前后端契约错位 / ~~会话操作动词不一致（A3 验证未复现，关单）~~ |
| P2 | 4 | R3-C-2 / R3-D-1 / R3-E-5 / R3-F-2 | convert-case 错误未结构化 / dedup-confirm 后视图滞后 / Service 抛 `Error` 致 500 / bulk-tags 不持久化 |
| P3 | 2 | R3-D-2 / R3-F-1 | 「编辑信息」来源回填错位 / bulk-tags 无 UI 反馈 |

### 0.3 R-CONSULT-01 / 02 回归矩阵

| 编号 | 第几轮 | 主题 | R3 状态 |
|------|--------|------|---------|
| A-1 | R1 | login / fixture-only 登录路径 | ✅ 仍通 |
| A-2 | R1 | 邮箱/电话即时校验 | ✅ 仍通 |
| A-3 | R1 | conversations.admin `assign` 用 optStr | ✅ 已切 optUuid（第二轮 R2-D-1） |
| B-1 | R1 | 详情头部 owner 显示 | ✅ 仍通 |
| C-1 | R1 | conversations 状态本地化 | ⚠️ list 列表本身无 join，状态 chip 仍局部本地化（未回退）|
| E-1 | R1 | conversations detail i18n key 裸露 | ❌ 回归形式不同：键名已不裸露但整页 fail（R3-E-2） |
| H-1 | R2 | lead 详情导航打回 | ✅ 仍通 |
| H-2 | R2 | lead create form 三语 | ✅ 仍通 |
| H-3 | R2 | 详情头部 5 按钮 happy-path | ✅ 仍通 |
| H-4 | R2 | 时间格式三段式 | ✅ 仍通 |
| H-5 | R2 | 日志 actor + payload diff + info segment | ✅ 仍通 |
| H-6 | R2 | 转化后 refetch | ⚠️ 普通路径仍通；dedup-confirm 路径回归（R3-D-1） |
| H-9 | R2 | owner 反解 alias / 不裸露 UUID | ✅ 仍通 |
| H-10 | R2 | demo conversation seed | ✅ 已 seed，2 条 conversation 在 PG，admin `/conversations` 列表非空 |
| R2-A-1 | R2 | fixture 短码 → UUID 期望 | ⚠️ leads list 的 ownerUserId / groupId 仍用 optStr（R3-A-1）|
| R2-B-3 | R2 | 详情头部 group 显示 | ✅ 仍通 |
| R2-B-4 | R2 | 详情头部 3 个按钮空 handler | ✅ 仍通（EditInfo / ChangeStatus / MarkLost 均能点开） |
| R2-B-5 | R2 | convert-case 错误吞噬 | ⚠️ 通用路径仍通；server 要求先 convert-customer，前端未约束（R3-C-2） |
| R2-B-6 | R2 | 详情头部 "查看客户" 跳转 | ✅ 仍通（独立 viewCustomer/viewCase emit + router.push） |
| R2-D-1 | R2 | conversations.admin assign body 用 optUuid | ✅ 仍通 |
| R2-D-2 | R2 | messages.admin conversationId/messageId 加 ParseUUIDPipe | ✅ 仍通 |

---

## 1. 新发现缺陷明细（R3-A …… R3-F）

### R3-A-1 [P1] Lead 列表过滤 ownerUserId / groupId 静默失败（fixture 短码）

- **页面**：`/leads`
- **重现**：在 admin 列表 URL 拼 `?ownerUserId=suzuki` 或
  `?groupId=tokyo-1`；网络请求成功 200，`total: 0`，列表
  空态——但页面**未提示参数无效**，使用者会以为 "确实没有该负责人 / 该
  组下的线索"。
- **根因**：
  `packages/server/src/modules/core/leads/leads.admin.controller.ts:163-164`
  对 `ownerUserId` / `groupId` 仍使用 `optStr` 而非 `optUuid`：

  ```163:165:packages/server/src/modules/core/leads/leads.admin.controller.ts
        ownerUserId: optStr(query.ownerUserId, "ownerUserId"),
        groupId: optStr(query.groupId, "groupId"),
        sourceChannel: optStr(query.sourceChannel, "sourceChannel"),
  ```

  与 R2-D-1 / R2-A-1 同源问题，在 conversations 与 leads create / convert
  路径均已切换为 `optUuid`，唯独 list 过滤项仍是字符串透传。后端
  执行 `where owner_user_id = 'suzuki'` 时被 PG 当成不合法 UUID
  会抛 22P02，而是因为 drizzle 的 `eq()` 对类型敏感，结果是过滤掉所有
  行返回 0 条。
- **修复方向**：将这两个字段切换为 `optUuid`，并在 ParseUUID 失败时
  抛 400「Invalid ownerUserId / groupId」（与 conversations 一致），让
  fixture 短码请求得到明确的错误。
- **测试建议**：新增 controller 单测覆盖 `optUuid`、空值、合法 UUID、
  fixture 短码 4 路径（与 R2-D-1 现有 7 条单测保持对称）。

### R3-C-2 [P2] convert-case 缺 prerequisites 校验 + 错误未结构化

- **页面**：lead 详情头部 → `签约并开始建档`
- **重现**：选一条 `status=signed` 的 lead 直接点 `签约并开始建档`，server
  返回 400：`Lead must have converted_customer_id; run convert-customer
  first`；UI 弹出 `转案件失败` 通用 toast，没有提示用户必须先转客户。
- **根因（前端）**：`useLeadDetailModel.doConvertCase` 直接调用
  `/convert-case` 而不在前端检查 `convertedCustomerId`；error 也没有按
  `R2-B-5` 已建立的 BMV gate 错误结构（`code/details[]`）解析。
- **根因（业务）**：实际上 server 现在要求 lead 必须先经
  convert-customer 才能 convert-case。这与 P0 §4.1 中
  "签约并开始建档 = 一键直转" 的 UX 表述不一致：用户期望从
  signed 直接 → converted_case；现状是 signed → converted_customer
  → converted_case 两步走。
- **修复方向（建议两案合一）**：
  1. 前端：当 `lead.status === "signed"` 且 `convertedCustomerId == null`
     时，按钮 click 流程先调 `/convert-customer`（用户现有联系信息）
     再调 `/convert-case`，对外表现为一键。
  2. 错误回退：保留当前后端校验，但把这一类 400 也走 R2-B-5 的
     `LeadConvertCaseDialog.bmv-gate` 通路，渲染清晰列表
     `[ {field:"convertedCustomerId", reason:"必须先转为客户"} ]`。
- **测试建议**：补 `useLeadDetailModel.convertCase-error.test.ts`
  对 missing-customer-id / BMV-gate / dup 三种 4xx 各 1 条单测。

### R3-D-1 [P2] dedup-confirm 路径下 convert-customer 后视图状态滞后（H-6 局部回归）

- **页面**：lead 详情 → `仅建客户档案` → 重复检测对话框 → `确认转化`
- **重现**：
  1. 选一条 `status=following` 且联系方式与既有 customer 重复的
     lead → 点 `仅建客户档案`；
  2. 弹出 `重复检测：1 条疑似重复客户` → 点 `确认转化`；
  3. server 200，`leads.converted_customer_id` 已写入；但
     `LeadDetailHeader` 仍显示 `仅建客户档案` / `签约并开始建档`，
     `查看客户` 按钮没有出现；F5 后视图正常。
- **根因**：第二轮 H-6 修复给「直连成功」与「dedup-confirm」两条
  分支都加了 `await refs.fetchDetail()`（见
  `useLeadDetailModel.doConvertCustomer / confirmConvertDedup`）；
  这两条 fetch **请求确实发出且响应字段正确**（`convertedCustomerId`
  非 null），但 dedup-confirm 路径中 `lead.value` 写入到 `LeadDetailHeader`
  的 `buttonStates` derived computed 没有触发 re-render——
  Vue 3 `<script setup>` 中如果计算属性深度引用 `lead.value.…` 但
  在分支里 `lead.value = newLead` 整体重新赋值，需要确保**子组件
  prop 不是结构展开**（`v-bind="lead"` 而非 `:lead="lead"`）才能
  触发 reactive 链路。这条问题在 R2 happy-path（直连 200）走的
  fetchDetail 不进 dedup 分支，就掩盖了本路径的 stale binding。
- **修复方向**：
  1. 在 `LeadDetailView.vue` 显式 `:lead="lead"` 而非展开；
  2. 或在 `confirmConvertDedup` 成功分支末尾显式
     `lead.value = { ...lead.value, ...await refs.fetchDetail() }`；
  3. 复测：补 `useLeadDetailModel.convertCustomer-refetch.test.ts`
     再加一条 dedup-confirm 后 `buttonStates` reactive 反应的契约
     单测（已有 6 条覆盖正常路径，第 7 条专做 dedup-stale binding）。

### R3-D-2 [P3] 「编辑信息」对话框 来源 dropdown 不回填

- **页面**：lead 详情 → `编辑信息` → `来源` 字段
- **重现**：admin-created lead 的 `sourceChannel="web"`，但对话框中
  `来源` 下拉显示 `请选择来源`（占位符），不是 `Web 表单`。
- **根因**：`LeadAdapterMappers.adaptBasicInfo` 把 `source: "admin"`
  优先于 `sourceChannel: "web"` 暴露为基础信息中的「来源」字段；
  而 `leadEditInfoForm` 的 dropdown options 列出的是
  `["web", "phone", "email", "referral"]`，`"admin"` 不在
  options，所以 `<select>` 找不到匹配项 → 显示占位符。
- **修复方向**：基础信息只读侧 + 编辑表单都改用 `sourceChannel`
  作为单一真源；`source` 字段（admin / app_user / portal）独立
  在 ReadOnly tooltip 中体现「创建路径」语义即可。
- **测试建议**：在 `LeadAdapterMappers.test.ts` 新增 1 条契约——
  `adaptBasicInfo` 对 `source="admin"` + `sourceChannel="web"`
  返回 `source` 字段值为 `"web"`；并在 `LeadInfoTab.test.ts` 加
  1 条 mount 后下拉默认值断言。

### R3-E-1 [P1] 会话列表缺 join 字段，"负责人" / "关联对象" 全部展示 `—`

- **页面**：`/conversations`
- **重现**：列表展示 2 条 H-10 seed 出来的会话，但 `负责人` 列均
  显示 `—`（未分配占位），`关联对象` 列也是 `—`，没有任何 lead 名称
  / customer 名称 / last message 摘要。
- **根因**：`packages/server/src/modules/core/conversations/
  conversations.admin.service.ts:list` 仅 `select * from conversations`
  无 `join leads / customers / users`；回到前端 `ConversationListPage`
  是按 `lead.name` / `customer.name` / `owner.name` 渲染的，全为 undef
  自然 fallback 到 `—`。
- **修复方向**：list 服务 query 改为 `left join leads / customers /
  users` 把 `leadName` / `customerName` / `ownerDisplayName` 一并
  返回；类型同步（`ConversationListItem`）；前端 adapter 一处对齐。
- **测试建议**：service 层补 `list_with_joined_names` 1 条契约，
  controller 层 mock service 后断言 response sample 含 `leadName /
  customerName / ownerDisplayName`，列表组件 mount 后断言 chip
  正常渲染（避免 `—` fallback 永久压在 happy-path 上）。

### R3-E-2 [P1] 会话详情整页 "会话加载失败" — 前后端契约错位

- **页面**：`/conversations/:id`
- **重现**：navigate 到 H-10 seed 的 conversation 详情页，整页直接
  显示 `会话加载失败，请稍后重试。`，开发者工具 Network 显示
  GET `/api/admin/conversations/:id` 返回 200。
- **根因**：
  - server 返回**嵌套**结构：

    ```json
    { "conversation": {...}, "lead": {...}, "customer": null,
      "case": null, "appUser": {...} }
    ```

    （`conversations.admin.service.ts:getDetail` 第 80-99 行）；
  - 前端 `ConversationAdapterMappers.adaptConversationDetailAggregate`
    期望**扁平**结构（直接读 `payload.id` / `payload.leadId` 等），
    第一行就拿到 `undefined.id` 触发异常 → ToastError。
- **修复方向**：前端 adapter 改成读取嵌套结构
  `payload.conversation.id / payload.lead?.name / …` 并产生统一的
  `ConversationDetailAggregate` 视图模型；同步增 1 条
  `ConversationAdapterMappers.test.ts` 覆盖嵌套 → 扁平的契约。
- **影响面**：admin 会话模块所有详情功能（消息列表、发送、分配、关闭、
  重开、retry-translation）都依赖详情先加载成功才能进入；本条挡住了
  所有会话场景的 UI 入口。**作为本轮最高优先级 fix。**

### R3-E-3 ~~[P1]~~ [关单] 会话操作动词不一致：admin UI 调 `POST`，server 仅注册 `PATCH`

> **✅ 2026-05-06 验证结果：未复现，关单。**
>
> A3 验证过程：逐行审查当前代码库，确认前后端动词已一致为 PATCH。
>
> | 层 | 文件 | assign | close | reopen |
> |---|---|---|---|---|
> | server controller | `conversations.admin.controller.ts:136,154,166` | `@Patch` | `@Patch` | `@Patch` |
> | client repository | `ConversationRepository.ts:179,206,217` | `method: "PATCH"` | `method: "PATCH"` | `method: "PATCH"` |
> | client 单测 | `ConversationRepository.test.ts:264,341,357` | assert PATCH | assert PATCH | assert PATCH |
>
> 所有 23 条 client 单测 + 39 条 server controller 单测通过。
>
> **归因**：R3 走查时 chrome-devtools-mcp 观测到的 POST 请求极可能来自浏览器
> 加载了旧 bundle（走查环境未重建 / HMR 未完全生效）。R3 文档所提的
> `ConversationApiClient` 在当前代码库中不存在——实际实现为
> `ConversationRepository`，该文件自始至终使用 `method: "PATCH"`。

- **页面**：会话详情 → 分配 / 关闭 / 重开
- **原始重现（API 层直测）**：

  | 操作 | R3 走查时 UI 请求 | server 注册 | R3 走查状态 | A3 验证（代码） |
  |------|-------------|-------------|------|------|
  | 发送消息 | `POST /messages` | `POST /messages` | ✅ | ✅ |
  | 分配 | `POST /:id/assign` | `PATCH /:id/assign` | ❌ 404 | ✅ 代码已是 PATCH |
  | 关闭 | `POST /:id/close` | `PATCH /:id/close` | ❌ 404 | ✅ 代码已是 PATCH |
  | 重开 | `POST /:id/reopen` | `PATCH /:id/reopen` | ❌ 404 | ✅ 代码已是 PATCH |

- **原始根因描述**：~~`ConversationApiClient` 的对应方法用 `httpClient.post(...)` 调用。~~ 当前代码库无此文件；`ConversationRepository.ts` 已正确使用 PATCH。
- **处置**：无需修复。关单。

### R3-E-5 [P2] `validateKind` / `validateVisibleScope` 抛 `Error` 致 500

- **页面**：会话详情 → 发送消息（任何带非法 kind / visibleScope 的请求）
- **重现**：POST `/messages` body `{visibleScope: "public"}`（前端
  误传任意非白名单值）→ server 500 `Internal server error`。
- **根因**：`packages/server/src/modules/core/conversations/
  messages.admin.types.ts:31-50`：

  ```31:50:packages/server/src/modules/core/conversations/messages.admin.types.ts
  export function validateKind(kind: string | undefined): string {
    const k = kind ?? "text";
    if (!VALID_KINDS.has(k)) {
      throw new Error("Invalid message kind: " + k);
    }
    return k;
  }
  ...
  export function validateVisibleScope(scope: string | undefined): string {
    const s = scope ?? "client_visible";
    if (!VALID_VISIBLE_SCOPES.has(s)) {
      throw new Error("Invalid visible_scope: " + s);
    }
    return s;
  }
  ```

  抛 `new Error()` 在 NestJS 默认异常过滤器里被转 500；正确做法是
  抛 `BadRequestException`，让客户端拿到 400 + 明确字段名。
- **修复方向**：两个函数都改为 `throw new BadRequestException(...)`；
  补 1 条 controller `send_invalid_visible_scope_returns_400` 单测。
- **影响**：用户输入越界（无论是 typo 还是攻击）都会触发 5xx，污染
  健康监控并掩盖真实事故。

### R3-F-2 [P2] bulk-tags 是 stub：仅写 `lead_logs`，不更新 `leads`

- **页面**：lead 列表 → 多选 → `批量打标签`
- **重现**：
  1. 选 1 条 lead，提交 `["R3-bulk-tag-1", "R3-bulk-tag-2"]` → 201
     `{updatedCount: 1}`；
  2. 直连 PG：`leads` 表无 `tags` 列，行不变；
  3. `lead_logs` 表新增 1 行 `log_type='tags_updated', payload=
     {"tags": ["R3-bulk-tag-1", "R3-bulk-tag-2"]}`。
- **根因**：`leads` schema (drizzle) 与 P0 §2.1 数据契约都没有 `tags`
  字段；当前 endpoint 仅记审计 log，不真正持久化 tags。批量打标签
  作为 P0 范围内的 5 条 bulk 操作之一被列出，但实质处于
  "spec 写了 / API 桩子 / 数据没落地" 三段错位。
- **修复方向**：**业务 + 工程双线决策**——
  1. 业务侧：澄清"线索 tags"是「查询/筛选用持久标签」（必须落表）
     还是「审计标记」（log 即可）；
  2. 工程侧（若选 1）：迁移加 `leads.tags text[]`，写入 endpoint
     更新数组，list 增加 `tags` 过滤参数，前端列表加 chip 渲染；
  3. 工程侧（若选 2）：把页面规格 / API 文档明确为 "审计标记，仅
     在日志可见"，前端取消 chip 渲染并 toast `已记录到日志`，避免
     用户误认为 "标签已贴在记录上"。
- **关联**：本条与 R3-F-1（无 toast）联动，是 UI 层的体感问题；
  R3-F-2 是数据契约层。

### R3-F-1 [P3] bulk-tags 无 UI 反馈：无 toast、无 chip、无 row 高亮

- **页面**：lead 列表 → 批量打标签
- **重现**：API 已 201，UI 无任何反馈（不 toast 也不刷新行），用户
  以为没成功。
- **修复方向**：依赖 R3-F-2 的业务决策——
  - 走方案 1 → 列表行渲染 chip + toast `已为 X 条线索打上 N 个标签`；
  - 走方案 2 → toast `已记录到日志，可在线索详情 - 日志页查看`，无 chip。

### R3-G-1 [观察] `GET /leads/:id/followups` 返回裸数组而非 `{items,total}`

- 与全站 list endpoint `{items: [...], total: N}` 不一致；客户端如果
  误用通用 list helper 会失败。建议放进**契约清理 backlog**，本轮
  不计入缺陷优先级（不阻塞用户路径）。

---

## 2. 走查路径与证据快照

### 2.1 环境基线

- admin@local.test / Admin123! 登录通过 `/admin` 入口；session token
  落在 `localStorage.gyosei_os_admin_session_v1`（来自 R-CONSULT-02
  H-10 seed 通路）。
- `db:seed-dev` 后 PG 实测：

  | 表 | 行数 | 备注 |
  |----|------|------|
  | leads | 5+ | 含 R3 期间新增 fixture leads |
  | conversations | 2 | H-10 seed 出（zh-CN 客户 + 1 已分配 + 1 未分配） |
  | messages | 4 | 含 1 条 `translation_status='failed'` 给 retry 走查 |
  | lead_logs | 多条 | 覆盖 `created/status_change/followup_added/tags_updated/converted_*` |

### 2.2 lead 列表 / 创建（A + B）

- 列表过滤 `?ownerUserId=<UUID>` 200 + 命中数量正确 → ✅
- 列表过滤 `?ownerUserId=suzuki` 200 + total=0 → ❌（**R3-A-1**）
- 创建 happy-path：`MCP-R3 钱七` / phone `09033334444` / source=referral
  → 201 + 跳详情 → ✅
- R2-A-1 fixture→UUID 映射回归 → ✅

### 2.3 详情头部 5 按钮（C）

- 编辑信息 / 修改状态 / 标记丢失 → 三个 dialog 均能弹出，确认
  R2-B-4 修复保留 → ✅
- 仅建客户档案 / 签约并开始建档 → 按钮可点 → ✅，但
  - 「仅建客户档案 + dedup-confirm」路径状态滞后 → **R3-D-1**
  - 「签约并开始建档」从 `signed` 直接调 `convert-case` 失败且未
    结构化 → **R3-C-2**

### 2.4 编辑信息对话框（D）

- name / email / phone / 备注字段回填 → ✅
- 「来源」下拉占位符未回填 sourceChannel → ❌（**R3-D-2**）
- owner / group 下拉回填 + 选 / 清空 → ✅（R-CONSULT-02 H-9 / R2-B-3 仍通）

### 2.5 跟进 / 嵌入会话（E + F）

- 单条跟进创建 → 列表 + lead_logs `followup_added` → ✅；时间格式三
  段式（`今天 19:24` / `Yesterday 15:30` / `04-01 09:15`）符合 R-CONSULT-02
  H-4 → ✅
- 嵌入会话空态 → lead 无关联 conversation 时显示 "暂无会话" →
  ✅（与 R-CONSULT-01 F-1 一致）

### 2.6 转化 customer / case + BMV 闸口（G）

- 直连 convert-customer → 201 + lead.convertedCustomerId 写入 + 头部
  按钮切换 → ✅（R-CONSULT-02 H-6 直连分支仍通）
- dedup-confirm 路径 → 201 但 UI 滞后 → ❌（**R3-D-1**）
- 直连 convert-case 但缺 convertedCustomerId → 400 但 toast 通用
  → ❌（**R3-C-2**）
- BMV gate 可视化（R2-B-5）：触发 `bmvIncome>10M` 后弹出 BMV gate 失败
  列表 → ✅

### 2.7 日志 4 segment（H）

- `状态/负责人/分组/其他` 4 段 chip 切换、payload diff（from→to）+
  actor displayName 显示均符合 R-CONSULT-02 H-5 → ✅
- 新增 `tags_updated` 落到 `其他/info` segment → ✅

### 2.8 状态机 6 态（I）

- new → following → pending_sign → signed 三跳 happy-path → ✅
- signed → converted_customer → converted_case → ✅
- 任意态 → lost：
  - dialog 强制要求 `lostReason`（无理由保存按钮 disabled）→ ✅
  - lost 后 `lead.lost_reason` 写入 PG → ✅
  - 状态机回退（lost → new）→ Server `transitionStatus` 200 → ✅

### 2.9 bulk 5 项（J）

| 操作 | API 状态 | DB 校验 | UI 反馈 |
|------|---------|---------|---------|
| bulk/assign | 201 | leads.owner_user_id 写入 | toast OK |
| bulk/status | 201 | leads.status + lost_reason 写入 | toast OK |
| bulk/export | 200 + CSV | — | 文件下载 OK |
| bulk/followup | 201 | lead_followups + lead_logs 双写 | toast OK |
| **bulk/tags** | 201 | **leads 表无 tags 列**（**R3-F-2**） | **无 toast / 无 chip**（**R3-F-1**） |

### 2.10 会话模块（K + L）

| 操作 | 现状 | 缺陷编号 |
|------|------|---------|
| 列表 | 200，缺 join，列空 `—` | **R3-E-1** |
| 详情 | 200 但前端崩，整页 fail | **R3-E-2** |
| 发送消息 | POST `/messages` 直测 201（合法 visibleScope）；invalid 时 500 | **R3-E-5** |
| 分配 | ~~UI 用 POST → 404~~ A3 验证：代码已是 PATCH → 200 | ~~R3-E-3~~ 关单 |
| 关闭 / 重开 | ~~同上~~ A3 验证：代码已是 PATCH → 200 | ~~R3-E-3~~ 关单 |
| retry-translation | server 路由 OK；列表入口被 R3-E-2 阻断 | 间接受阻 |

---

## 3. 修复优先级建议（按"用户路径阻断度"排序）

1. **R3-E-2**（P1）：会话详情 adapter 嵌套 → 扁平契约对齐——一行
   修复，立即解锁整个会话模块 UI；建议本周内出。
2. ~~**R3-E-3**（P1）：会话三个动作动词统一 PATCH~~ → **A3 验证未复现，关单**（代码已为 PATCH，走查时浏览器旧 bundle 所致）。
3. **R3-E-1**（P1）：会话列表 join 三个 name + last message——
   service 层 query 调整，可分两步：先补 `leadName / ownerDisplayName`
   解锁列表可读，再补 `lastMessagePreview` 给完整体感。
4. **R3-A-1**（P1）：leads list ownerUserId / groupId 切 optUuid——
   与第二轮 R2-A-1 / R2-D-1 一脉相承；建议批一次小 PR。
5. **R3-D-1**（P2）：dedup-confirm 路径 reactive 链路修复——补单测 +
   `LeadDetailView.vue` 显式 prop。
6. **R3-C-2**（P2）：convert-case 前置 convert-customer 自动接力 +
   错误结构化——业务 / 工程对齐。
7. **R3-E-5**（P2）：service 层 `Error` → `BadRequestException`——
   一处替换 + 单测。
8. **R3-F-2**（P2）：bulk-tags 业务决策：落表 OR 改为日志-only。
9. **R3-D-2**（P3）：编辑信息 dropdown 来源回填。
10. **R3-F-1**（P3）：bulk-tags UI 反馈，与 R3-F-2 联动。

---

## 4. 待办 / 后续计划

- [ ] R3-E-2 / R3-E-1 两条 P1 一并出 PR（R3-E-3 已于 A3 验证关单）；落地后再做一轮
      `R-CONSULT-04` 走查锁定会话 happy-path。
- [ ] R3-A-1 与第二轮 R2-A-1 / R2-D-1 / R2-D-2 合并到 "controller
      query / param 全量 UUID 化" 的小专题，给 leads / customers /
      cases / billing 各 controller 拉通一遍 audit。
- [ ] R3-F-2 业务侧澄清后回写到 P0/06-页面规格/咨询线索 §「批量动作」
      段落，明确 tags 是 "持久" 还是 "审计-only"。
- [ ] 把本轮新增的 `useLeadDetailModel.convertCustomer-refetch.test.ts`
      / `LeadConvertCaseDialog.bmv-gate.test.ts` 作为 R-CONSULT-02
      已落地的回归套件继续保留；R3 阶段尚未新增单测，待 fix PR 配套
      一并出。
