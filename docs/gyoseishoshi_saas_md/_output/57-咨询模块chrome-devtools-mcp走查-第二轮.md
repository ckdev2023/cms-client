# 咨询模块 chrome-devtools-mcp 走查（第二轮 / R-CONSULT-02）

> 生成日期：2026-05-06
>
> 命题：在 R-CONSULT-01 缺陷已基本修复的基础上，对「咨询线索」+「咨询会话」做
> 端到端 happy-path 走查，覆盖第一轮被空 DB 阻断的录入/转化/跟进/bulk 流程，
> 并回归 R-CONSULT-01 全部 8 项 P0/P1/P2 修复点。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot /
> click / fill_form / wait_for / evaluate_script /
> list_network_requests / get_network_request / list_console_messages /
> resize_page）
>
> 数据集：Local Demo Office（admin@local.test / Admin123!）；运行时仅 1 个真实
> user（`00000000-…000011` Local Admin）+ 1 个真实 group（`ef21fdd2-…`
> name=`tokyo-1`），无任何 conversation 记录。
>
> 上游权威：
> - [P0/06-页面规格/咨询线索.md](../P0/06-页面规格/咨询线索.md)
> - [P0/03-业务规则与不变量.md §2.1 / §2.2 / §2.6 / §3.6](../P0/03-业务规则与不变量.md)
> - [P0/04-核心流程与状态流转.md §4.1 咨询转案件](../P0/04-核心流程与状态流转.md)
> - [56-咨询模块chrome-devtools-mcp走查-第一轮.md](./56-咨询模块chrome-devtools-mcp走查-第一轮.md)

---

## 0. 总结

### 0.1 一句话结论

**R-CONSULT-01 4 条 P0/P1 已全部修复；R-CONSULT-02 新发现 12 条缺陷中
P0 + P1 + P2 全部闭环、P3 续推 3 条：R2-A-1「前端 fixture 短码 vs
后端 UUID 期望」于 2026-05-06 修复；R2-B-5「convert-case 错误吞噬」
于 2026-05-06 修复；
R2-B-4「详情头部 3 按钮空 handler」于 2026-05-06 修复（落地 EditInfo /
ChangeStatus / MarkLost 三个对话框 + `useLeadDetailModel.update /
transitionStatus / markLost` 三个方法）；R2-B-6「详情头部『查看客户』
错误打开 convert dialog 而非跳转」于 2026-05-06 修复
（`LeadDetailHeader` 拆分 `viewCustomer` / `viewCase` 独立 emit +
`useLeadHeaderNavigation` 调用 `router.push({ name: "customer-detail" |
"case-detail" })` 跳转）；P2 续推 4 条：R2-D-1「conversations.admin
`assign` body `ownerUserId` 仍用 `optStr`」于 2026-05-06 修复
（切换为 `optUuid` 与第一轮 E-1 / R2-A-1 同源加固；新增 7 条
controller 单测覆盖 catalog 短码 / 非 UUID / 非 string / 合法 UUID /
undefined / 空白 / 源码契约）；R2-D-2「messages 控制器 conversationId /
messageId 缺 ParseUUIDPipe」于 2026-05-06 修复
（新增 `ConversationIdParam` / `MessageIdParam` 两个 helper，覆盖
`list / send / retryTranslation` 4 处参数；新增 21 条 controller 单测
覆盖 mount / permission / ParseUUIDPipe 源码契约 / page-limit /
send body / retry forwarding）；H-6「转化成功后页面状态滞后」于
2026-05-06 修复（`useLeadDetailModel.doConvertCustomer` 成功分支
末尾的 `await refs.fetchDetail()` 在 R2-B-5 改造中作为副产品落地，
本次新增 `useLeadDetailModel.convertCustomer-refetch.test.ts` 6 条
单测显式锁定该契约：成功 refetch / dedup-confirm 路径 refetch /
失败不 refetch / dedup 命中短路不 refetch / 失败释放 submitting /
重入保护，避免后续回归再次出现「确认后弹窗关闭、按钮不变、需要
window.location.reload」的体验）；H-10「admin 端无 conversation seed
工具」于 2026-05-06 修复（新增 `scripts/seedDevConversations.ts` 模块
扩展 `db:seed-dev` 增加 4 个 step：1 条 demo `app_user` + 1 条 portal
lead + 2 条 conversation（已分配 owner = Local Admin / 未分配
owner + unread=1 两态）+ 4 条 message（`app_user(zh)` + `staff(ja)`
+ 1 条 `app_user(zh, failed)` + 未分配会话 1 条 `app_user(zh)`，
其中 `failed` 那条专供 admin 端 retry-translation 走查）；新增
5 条 H-10 单测锁定 INSERT 数量 / 全 ON CONFLICT 幂等 / `b000`
命名空间隔离 / 至少一条 failed message 存在 / 至少一条已分配 +
一条未分配 conversation 同时存在；真实 PG 已通过 `SEED_SMOKE=1`
dry-run + 二次执行幂等校验，admin `/conversations` 列表从空态
切换为 2 条非空 demo 记录）；P3 续推 3 条：H-4「跟进/日志时间
显示原始 ISO 字符串」于 2026-05-06 修复（在 `LeadAdapterMappers`
新增私有 helper `readTimestampLabel`，复用既有 `formatUpdatedAtLabel`，
对 followup / log 的 `createdAt` 统一按 locale 输出
`今天 19:24` / `Yesterday 15:30` / `04-01 09:15` 三段式标签；新增
6 条 vitest 覆盖 zh-CN / en-US / ja-JP / >3 天 fallback / 不可解析
原值保留 / 缺失返回空）；H-9「线索列表/详情 owner 字段显示 raw UUID
或 ?」于 2026-05-06 修复（在 `useOwnerOptions` 新增
`resolveOwnerDisplayLabel` / `resolveOwnerDisplayOption` 两个共享
helper，按 `catalog → /api/users 别名表（resolveUserLabel）→
unknown 占位` 优先级链反解；区分 nil UUID `00000000-…000000` 与
未知 UUID 两档 fallback 文案；`LeadTableRow` / `LeadDetailHeader` /
`LeadInfoTab` 三个渲染面同时切入；新增 `leads.list.ownerUnassigned`
+ `leads.list.ownerUnknown` 两条 i18n key 覆盖 zh-CN / ja-JP / en-US；
新增 33 条 vitest（19 helper + 5 LeadTableRow + 3 LeadDetailHeader +
6 LeadInfoTab）锁定 alias 反解 / unknown 占位 / 不裸出 UUID /
locale 多语 / reactive 别名表注册后自动重渲染等契约）；H-5「日志
条目缺 actor / payload diff」于 2026-05-06 修复（server 端 `LeadLog`
新增 `createdByDisplayName` 字段，`LOG_COLS` + `LOG_FROM_WITH_ACTOR`
经 `lead_logs ll left join users u on u.id = ll.created_by` 把
`users.name` 注入到 `getDetail` / `listLogs` 两条查询；前端新增
纯函数 `LeadLogPayloadFormatter` 覆盖 `created` / `field_change` /
`status_change` / `followup_added` / `converted_customer` /
`converted_case` / `owner_assigned` / `tags_updated` / `exported`
9 个 server 真实 logType 的 from/to 派生与 4 大分类归并；
`LeadAdapterMappers.adaptLogEntryDto` 接入 formatter 同时保留
fixture 字段 fallback；`LeadLogTab.vue` 接入 `actorUnknown` i18n
占位 + 新增 `info`「其他」segment + `typeInfo` chip 标签；
`LeadLogType` 扩展为 4 态 `status / owner / group / info`，
`LOG_CATEGORIES` 增至 5 项；3 locale i18n 同步新增 `categoryAll /
typeInfo / actorUnknown` 共 3 个 key；server 新增 4 条 node:test
（`mapLeadLogRow` displayName 透传 / 缺字段 null fallback /
`getDetail` JOIN 契约 / `listLogs` JOIN 契约），前端新增 22 条
vitest（11 条 `LeadLogPayloadFormatter` 全 logType + 优先级 +
legacy 透传，5 条 `LeadAdapterMappers` H-5 suite 覆盖 actor +
status_change diff + field_change owner 派生 + 缺 displayName +
fixture 透传 + converted_case caseId，6 条 `LeadLogTab` 渲染
actor / actorUnknown fallback / info chip 标签 / 5-segment
SegmentedControl 验证）；R2-B-3「group 显示名 fixture 与 DB 不一致」
于 2026-05-06 修复（`useGroupOptions.resolveGroupLabel` /
`getActiveGroupAliasOptions` 调整解析顺序：catalog 直匹配仍走
本地化 label（保留 fixture 演示路径），但 alias 路径以
`/api/groups` 返回的 `name` 为权威显示值，catalog 仅参与
`disabled` 后缀判定，不再用 fixture 本地化覆盖 DB name；
locale 切换不再改变 alias 路径下的显示，"DB 存的是
`tokyo-1`、UI 却显示 `東京一組`" 的 fixture / DB 错位
不复存在；同步刷新 BUG-136 / BUG-139 / BUG-140 / BUG-159
四个回归测试的契约描述与断言（catalog 三语本地化 → DB name
原文 + locale 不变性），新增 1 条「server-side custom name
locale-invariant」断言锁定真实业务命名（如 `営業一課`）路径），
详见 §1 各修复记录。**

整体结论：**模块状态 = R-CONSULT-01 修复 OK / R-CONSULT-02
P0+P1+P2 全部已闭环 / 剩余 0 条 P0 + 0 条 P1 + 0 条 P2 + 1 条 P3**。
R-CONSULT-03 可直接进入剩余 P3（R2-B-2 lead 编号显示 UUID）收尾
与跨模块联调。

### 0.2 R-CONSULT-01 修复回归结果

| ID | 第一轮缺陷 | 修复回归结果 | 证据 |
|---|---|---|---|
| **B-1** | `POST /admin/leads` 404 | ✅ 已修复（endpoint 存在）| `leads.admin.controller.ts:130` `@Post()` 落地；reqid=348 用真实 UUID 返回 201 |
| **B-1'** | `POST /admin/leads/:id/convert` 404 | ✅ 已修复（split 为 2 端点）| `convert-customer` (208) + `convert-case` (228)；reqid=516 转客户 201 |
| **B-2/B-3** | 邮箱/电话格式无校验 | ✅ 已修复 | `useLeadCreateForm.ts:64-65` 引入 `isValidPhone/isValidEmail`；填非法格式按钮 disabled |
| **C-1** | `GET /admin/leads/:id` 非 UUID → 500 | ✅ 已修复 | `UuidParam = Param("id", new ParseUUIDPipe())` (108)；`not-a-uuid` → 400 (reqid=687) |
| **D-1** | `GET /admin/conversations?leadId=...` 非 UUID → 500 | ✅ 已修复 | `optUuid` 引入；非 UUID leadId → 400 (reqid=685/686) |
| **E-1** | conversation `assignOwner("current-user")` 字面量 | ✅ 已修复 | `ConversationDetailView.vue:55` 增加 `showOwnerPicker`；`ConversationOwnerPickerDialog` 落地 |
| **E-2** | 6 条 i18n key 裸露 | ✅ 已修复 | `{{ t(error) }}` (line 129)；fake UUID → 显示 "会话加载失败，请稍后重试。" |
| **E-3** | detail null 时按钮仍渲染 | ✅ 已修复 | `<template v-if="detail" #actions>` (93) gated |
| **B-4** | `LeadToast` 缺 aria-live | ⚠️ 待回归 | 本轮无失败 toast 可触发，未直接验证 |
| **G-1** | client dedup `phone.includes` partial match | ⚠️ 未变（本轮未专测） | 同上 |
| **G-2** | `<input>` 缺 autocomplete | ✅ 部分修复 | 详情/创建表单 textbox 含 `autocomplete="list"`；DevTools issue 数从 3 → 0（无新报告） |

**结论：第一轮 8 条 P0/P1/P2 均已闭环；P3 项部分待补充验证。**

### 0.3 走查矩阵（11 个入口 × 关键节点）

| # | 入口 | URL / API | 关键节点 | R-CONSULT-02 结果 |
|---|---|---|---|---|
| **A** | 咨询线索列表 | `/leads` | tab/筛选/分页/草稿 | ✅ filters 透传 / scope 切换 OK / 草稿保留；移动视口（500px）下 checkbox 不可见（设计） |
| **B** | 新建线索 | `POST /admin/leads` | 12 字段 + dedup + 提交 | ✅ **R2-A-1 P0 已修复**（2026-05-06）：写入路径 owner/group 选项改读 `/api/users` + `/api/groups` 别名表（真实 UUID）；server 端 `optUuid/reqUuid` 双重防御，非法短码返回 400 而非 500 |
| **C** | 线索详情 - 头部 | header 3 buttons | 编辑/调整状态/标记流失 | ✅ **R2-B-4 P1 已修复**（2026-05-06）：落地 `LeadEditInfoDialog` / `LeadChangeStatusDialog` / `LeadMarkLostDialog` 三个对话框；`useLeadDetailModel` 新增 `updateLead` / `transitionStatus` / `markLost` 方法；状态机推进、编辑、流失 UI 端可达 |
| **D** | 线索详情 - 基础信息 | `GET /admin/leads/:id` Tab1 | 字段渲染 | ✅ **H-9 P3 已修复**（2026-05-06）：`useOwnerOptions` 新增 `resolveOwnerDisplayLabel` / `resolveOwnerDisplayOption` 共享 helper，按 `catalog → /api/users 别名 → unknown 占位` 优先级链反解；`LeadTableRow` / `LeadDetailHeader` / `LeadInfoTab` 三处渲染同时切入；区分 nil UUID（「未分配」）vs 未知 UUID（「未知用户」）两档 fallback；新增 33 条 vitest 锁定不裸出 raw UUID 与 reactive 别名注册后自动重渲染契约。✅ **R2-B-3 P3 已修复**（2026-05-06）：`useGroupOptions.resolveGroupLabel` / `getActiveGroupAliasOptions` 调整为「alias 路径以 `/api/groups` 返回的 `name` 为权威显示值」，catalog 仅参与 disabled 后缀判定；fixture catalog 本地化 label 不再覆盖 DB name，详情「所属组」与 `tokyo-1` 一致 |
| **E** | 线索详情 - 跟进记录 | `POST /admin/leads/:id/followups` Tab2 | 4 字段 + 提交 | ✅ POST 201；表单 reset；列表渲染 OK；✅ **H-4 P3 已修复**（2026-05-06）：`LeadAdapterMappers` 新增 `readTimestampLabel` 复用既有 `formatUpdatedAtLabel`，跟进/日志 `time` 字段按 locale 输出 `今天 19:24` / `Yesterday 15:30` / `04-01 09:15` |
| **F** | 线索详情 - 会话 | Tab3（新增）| compact ConversationDetailView 嵌入 | ✅ 空态 "该线索暂无关联会话" 显示正常 |
| **G** | 线索详情 - 转化信息 | `POST /admin/leads/:id/convert-customer` + `convert-case` | 2 个弹窗 + dedup | ✅ convert-customer 201 OK；✅ **R2-B-5 P0 已修复**（2026-05-06）：BMV 闸口结构化 400 现在解析为 `LeadConvertCaseFailure`，弹窗保持打开并 inline 渲染 `BmvGateBlockerList`；其他 4xx/5xx 显示 generic 错误条 + error toast；✅ **R2-B-6 P1 已修复**（2026-05-06）：`LeadDetailHeader` 在 `view-customer` / `view-case` 状态时分别 emit `viewCustomer` / `viewCase`（不再复用 `convertCustomer` / `convertCase`），父组件经 `useLeadHeaderNavigation` 跳转 `customer-detail` / `case-detail` 路由 |
| **H** | 线索详情 - 日志 | Tab4 | 操作日志 + 4 个 filter | ✅ **H-5 P3 已修复**（2026-05-06）：server 端 `LeadLog` 增加 `createdByDisplayName`，`getDetail` / `listLogs` 经 `lead_logs ll left join users u on u.id = ll.created_by` 注入 `users.name`；前端新增 `LeadLogPayloadFormatter` 把 9 种 server logType（`created` / `field_change` / `status_change` / `followup_added` / `converted_customer` / `converted_case` / `owner_assigned` / `tags_updated` / `exported`）映射为 `category + fromValue + toValue + chipClass`，归并到 4 大分类（status / owner / group / info）；`LeadLogTab.vue` 渲染 actor + diff，操作人为空时回退 `actorUnknown` i18n 占位；新增 `info`「其他」segment 让未分类日志可见；时间显示已随 H-4 修复（H-4: 2026-05-06）|
| **I** | 线索详情 - 状态机 | `PATCH /admin/leads/:id/status` | new→following→pending_sign→signed→converted_case | ✅ Server 端 OK（API 直调 200 全过）；✅ **UI 端可达**（R2-B-4 已修复：`LeadChangeStatusDialog` 按 `LEAD_STATUS_TRANSITIONS` 白名单展示可流转状态，`LeadMarkLostDialog` 强制 `lostReason` 必填）；✅ **H-6 P2 已修复**（2026-05-06）：`doConvertCustomer` / `doConvertCase` 成功分支已 `await refs.fetchDetail()`，新增 `useLeadDetailModel.convertCustomer-refetch.test.ts` 6 条单测显式锁定 refetch 契约 |
| **J** | 线索列表 - bulk | `POST /admin/leads/bulk/{assign,status,tags,export,followup}` | 5 个批量动作 | ✅ bulk/status / bulk/export 201 ✅；✅ bulk/assign 已随 R2-A-1 修复（API UUID 选项 + server reqUuid 防御）；其他 3 项未直触发 |
| **K** | 会话列表 | `/conversations` | tab/状态/leadId 筛选 | ✅ 全 happy-path；UUID 校验回归 OK；✅ **H-10 P2 已修复**（2026-05-06）：admin 端虽然仍无创建会话 UI 入口（设计如此），但新增 `scripts/seedDevConversations.ts` 把 demo conversation 注入流程接到 `db:seed-dev`，admin walkthrough 阶段可直接看到「已分配 owner = Local Admin」+「未分配 owner unread=1」两条 demo 会话，4 条 message（含 1 条 failed translation）覆盖 send / assign / close / reopen / retry-translation 全部 e2e 路径|
| **L** | 会话详情 | `/conversations/:id` | 头部 3 按钮 + send/assign/close/reopen | ⚠️ E-1/E-2/E-3 修复回归 ✅；详情/messages 0 条无法 e2e；✅ **R2-D-1 P2 已修复**（2026-05-06）：`@Patch(":id/assign")` body 中 `ownerUserId` 切换为 `optUuid`，与 list query 处理一致；catalog 短码 / 非 UUID 现在直接返回 400 而非 500；新增 7 条 controller 单测覆盖；✅ **R2-D-2 P2 已修复**（2026-05-06）：`messages.admin.controller.ts` 新增 `ConversationIdParam` / `MessageIdParam` 两个 ParseUUIDPipe 包装 helper，`list / send / retryTranslation` 4 处参数全部接入；非法 UUID 现在统一 400（与主 `conversations.admin.controller` C-1/D-1 行为对齐）；新增 21 条 controller 单测覆盖 |

✅ = pass / ⚠️ = 部分 pass 或受阻 / ❌ = 不可用 / blocking

### 0.4 缺陷分布

| 等级 | 数量 | 主要分布 |
|---|---|---|
| **P0** | 2（剩 0） | ~~R2-A-1 fixture vs UUID~~（已修复 2026-05-06）/ ~~R2-B-5 convert-case 错误吞噬~~（已修复 2026-05-06）|
| **P1** | 2（剩 0） | ~~R2-B-4 头部 3 按钮空 handler~~（已修复 2026-05-06）/ ~~R2-B-6 「查看客户」按钮错误打开 convert dialog~~（已修复 2026-05-06）|
| **P2** | 4（剩 0） | ~~R2-D-1 conversations.assign 缺 optUuid~~（已修复 2026-05-06）/ ~~R2-D-2 messages 缺 ParseUUIDPipe~~（已修复 2026-05-06）/ ~~H-6 转化后 UI 状态滞后~~（已修复 2026-05-06）/ ~~H-10 admin 无 seed 会话工具~~（已修复 2026-05-06）|
| **P3** | 5（剩 1） | ~~R2-B-1/H-9 owner UUID 不解析为名~~（已修复 2026-05-06）/ R2-B-2 lead 编号显示 UUID 而非 leadNo / ~~R2-B-3 group 名不匹配~~（已修复 2026-05-06）/ ~~H-4 时间 raw ISO~~（已修复 2026-05-06）/ ~~H-5 日志缺 actor/diff~~（已修复 2026-05-06）|
| **P4** | 0 | — |

### 0.5 体系性观察

1. **「前端 fixture catalog 与后端 UUID 期望」是当前模块最大的写入侧不一致**——
   `useOwnerOptions.ts` / `useGroupOptions.ts` 内置了 7 个 owner（`suzuki` /
   `tanaka` / `li` / `sato` / `yamada-s` / `takahashi-k` / `suzuki-a`）+
   2 个 group（`tokyo-1` / `tokyo-2`）短码字面量，**完全独立于
   `/api/users` / `/api/groups`** API 数据。运行时 API 仅返回 1 个
   user + 1 个 group，前端却展示 7 个，导致：
   - 创建线索：用户选 `铃木` → 提交 `ownerUserId: "suzuki"` →
     server PG `uuid` 列 cast 失败 → 500
   - bulk-assign：同上
   - LeadDetailView 用同一 catalog 反解 UUID → 找不到 → 显示 "?"
     或裸 UUID

   有趣的对比：`LeadConvertCaseDialog` 用的是 **真实 API users**
   （展示 "Local Admin" 一项，提交真实 UUID）。说明 **开发者已意识到
   并在新增弹窗中纠正，但未回头修 LeadCreateModal / LeadBulkActionBar /
   LeadDetailView 复用的旧 useOwnerOptions**。

   修复路径（推荐分两层）：
   - **P0 紧急止血**：`useLeadCreateActions.runCreate` 在提交前
     用 `useUsersStore.list` / `useGroupsStore.list` 校验
     `ownerUserId / groupId` 是否在 API 返回集合里；不是则
     显示 "请重新选择负责人/分组" inline error，不发请求
   - **架构修正**：废弃 `OWNER_CATALOG / GROUP_CATALOG` 两个
     fixture，让 `useOwnerOptions(locale)` 改为返回
     `useUsersStore.list` 的 view-model（`{value: id, label:
     displayName, initials, avatarClass}`）。同时修
     `LeadDetailView` / `LeadTableRow` 的 owner 反解逻辑

2. **「头部 3 按钮空 handler」已闭环（2026-05-06）**——历史现象：
   `LeadDetailView.vue:94-96` 中
   ```ts
   @mark-lost="() => {}"
   @edit-info="() => {}"
   @change-status="() => {}"
   ```
   3 个 button 仍在渲染但绑定空函数。`LeadDetailHeader` 已发送
   事件，但父组件的 handler 还没接上。等价于 **3 个 P0 业务
   动作（编辑信息 / 调整状态 / 标记流失）UI 完全不可用**——
   而 spec §3 这 3 个动作明确属于 P0 范围。

   修复落地（详见 §1 R2-B-4 修复记录）：
   - 落地 `LeadEditInfoDialog`（参考 `LeadConvertCustomerDialog` 范式）
   - 落地 `LeadChangeStatusDialog`（含 6 态白名单 `LEAD_STATUS_TRANSITIONS`
     + 流失 `lostReason` 必填）
   - 落地 `LeadMarkLostDialog`（`lostReason` 必填 + 备注可选）
   - 抽出 `useLeadHeaderDialogs` 统一管理弹窗可见性 / inline error /
     Confirm 流程；抽出 `useLeadMutationActions` 把 `LeadMutationFailure`
     联合类型化（与 `LeadConvertCaseFailure` 范式一致）
   - 三者均通过 `useLeadDetailModel.updateLead / transitionStatus /
     markLost` 方法，对接 server PATCH `/admin/leads/:id` /
     `/status` / `/lost`

3. **「转化案件错误吞噬」已闭环（2026-05-06）**——历史现象：
   `LeadConvertCaseDialog` confirm handler 无 try/catch，导致
   `LeadDetailView.handleConvertCaseConfirm` 不接服务端 400 BMV
   闸口错误，dialog 直接关闭、用户误以为成功。

   server 已在 R-CONSULT-02 阶段补齐了结构化错误响应：
   ```json
   {
     "code": "CASE_BMV_GATE_BLOCKED",
     "blockers": [
       {"code": "BMV_QUESTIONNAIRE_NOT_RETURNED", ...},
       {"code": "BMV_QUOTE_NOT_CONFIRMED", ...},
       {"code": "BMV_NOT_SIGNED", ...},
       {"code": "BMV_INTAKE_NOT_READY", ...}
     ]
   }
   ```
   这正是规格 §"BMV 案件创建闸口" 的运行时实现，**非常好**。

   修复落地（详见 §1 R2-B-5 修复记录）：
   - 仓库层 `LeadRepositoryError.serverBlockers` 归一化 + 兼容
     `code` / `errorCode` 双字段
   - 新增 `LeadBmvGateBinding`：blocker code → `leads.errors.bmvGate.*`
     i18n key
   - 模型层 `useLeadDetailModel.convertCase` 返回
     `LeadConvertCaseFailure | null`，失败不再 throw / 不再静默
   - 视图层 `LeadConvertCaseDialog` 增加 `error` prop，inline
     渲染 `BmvGateBlockerList`（role="alert" aria-live="assertive"）
     或 generic 错误条；`LeadDetailView` 失败时保活弹窗 + generic
     失败叠加 error toast

4. **「查看客户」按钮路由错误已闭环（2026-05-06）**——历史现象：
   `LeadDetailHeader` 在 `convertedCustomer` 状态时把按钮文案换成
   "查看客户"，但 click 仍 emit `convert-customer` 事件，父组件再次
   打开 `LeadConvertCustomerDialog`。这会让用户**重复创建客户**
   （server 端有 dedup 兜底，但 UX 极差）。同源问题在 `convertedCase`
   状态下的 "查看案件" 按钮也存在。

   修复落地（详见 §1 R2-B-6 修复记录）：
   - `LeadDetailHeader` 新增 `viewCustomer` / `viewCase` 两个独立
     emit；`buttonStates.convertCustomer === "view-customer"` 与
     `buttonStates.convertCase === "view-case"` 两个分支不再复用
     `convertCustomer` / `convertCase` 事件
   - 新增 `useLeadHeaderNavigation` composable：基于 `lead` ref +
     `router` 派生 `handleViewCustomer` / `handleViewCase`，
     `router.push({ name: "customer-detail" | "case-detail",
     params: { id } })` 跳转；`convertedCustomer` / `convertedCase`
     为 null 时静默 no-op，避免误跳转
   - 视图层 `LeadDetailView` 模板补 `@view-customer` / `@view-case`
     绑定到 navigation handler；`LeadConvertCustomerDialog` 与
     `LeadConvertCaseDialog` 路径与原 `convert-*` 事件分离

5. **「日志显示原始字段、缺反解」是详情页的统一短板**（H-4 已闭环
   2026-05-06，剩余子项继续追踪）——
   `LeadInfoTab` / `LeadFollowupsTab` / `LeadLogTab` 都直接
   把 raw 字段渲染到 UI：
   - `ownerUserId` → 显示 UUID 字面量（应该走 `resolveOwnerLabel`，
     仍待 H-9 修复）
   - ~~`groupId` → 显示 fixture catalog name~~（**R2-B-3 已修复
     2026-05-06**：`useGroupOptions.resolveGroupLabel` /
     `getActiveGroupAliasOptions` 调整解析顺序，alias 路径以
     `/api/groups` 返回的 `name` 为权威显示值；catalog 仅参与
     `disabled` 后缀判定，不再覆盖 DB name；locale 切换不再
     改变 alias 路径下的显示）
   - ~~`createdAt / updatedAt` → 显示 ISO 字符串~~（**H-4 已修复**：
     `LeadAdapterMappers.adaptFollowupDto / adaptLogEntryDto` 通过
     新增私有 helper `readTimestampLabel` 复用既有
     `formatUpdatedAtLabel`，输出与列表「最近更新」一致的
     `今天 19:24` / `Yesterday 15:30` / `04-01 09:15` 三段式标签）
   - ~~日志 `payload` 字段→根本没渲染~~（**H-5 已修复**：
     `LeadLogPayloadFormatter` 按 9 种 server logType
     `created / field_change / status_change / followup_added /
     converted_customer / converted_case / owner_assigned /
     tags_updated / exported` 编排 `category + fromValue + toValue +
     chipClass`；server 端 `lead_logs ll left join users u on
     u.id = ll.created_by` 同步注入 `createdByDisplayName`，
     `LeadLogTab` 渲染 actor + diff，操作人为空时回退
     `actorUnknown` i18n 占位）

   **建议**：把 `useResolveOwner / useLeadLogPayloadRenderer` 封装到
   `shared/util` 复用；`formatDateTime` 类时间格式化已有
   `formatUpdatedAtLabel` 模式可直接复用

6. **「H-7 messages 控制器 ParseUUIDPipe 缺失」已闭环（2026-05-06）**——
   历史现象：R-CONSULT-01 修了 `conversations.admin.controller.ts` 主接口，
   但 messages 子接口被遗漏。`/api/admin/conversations/not-a-uuid/messages`
   非法 UUID → 500（reqid=693），与已修的主接口（→ 400, reqid=694）
   行为不一致。**和 R-CONSULT-01 的 C-1/D-1 同性质**。

   修复落地（详见 §1 R2-D-2 修复记录）：
   - `messages.admin.controller.ts` 顶部新增
     `const ConversationIdParam = () => Param("conversationId", new ParseUUIDPipe());`
     与 `MessageIdParam`（同源结构）
   - `list / send / retryTranslation` 共 4 处 `@Param("conversationId" |
     "messageId")` 全部替换为对应 helper（与
     `conversations.admin.controller.ts` 的 `UuidParam` 模式对齐）
   - 新增 21 条 controller 单测：mount path / 3 routes 的
     `@RequirePermission` decorator / `ParseUUIDPipe` 源码契约 /
     missing context UnauthorizedException / page+limit 边界 /
     send body 必填 + trim + forceOriginal 解析 / retry forwarding

7. **「conversations 模块走查阻断」已闭环（2026-05-06）**——历史现象：
   规格上 conversation 由 AppUser 端发起（portal/conversations.controller
   有 `@Post()`，但需要 `AppUserAuthGuard`），admin 端
   `conversations.admin.controller.ts` 仅 GET / PATCH。本轮 walkthrough
   阶段没有 AppUser JWT，无法 seed 一条 conversation 来 e2e 验证：
   - admin 端 send message
   - admin 端 assign owner
   - admin 端 close / reopen
   - admin 端 retry-translation

   修复落地（详见 §1 H-10 修复记录）：
   - 新增 `packages/server/src/scripts/seedDevConversations.ts` 独立模块，
     导出 `seedConversationAppUser` / `seedConversationLead` /
     `seedConversations` / `seedConversationMessages` 4 个 PoolClient
     step（与 `seedDevData.ts` 既有 `seedCustomer` / `seedCases` 范式一致）
   - `seedDevData.ts` 引入 4 个 step 并加入 `buildSeedSteps()`，整体
     step 数 8 → 12；输出文案追加 `1 app_user + 1 portal lead +
     2 conversations + 4 messages (H-10)`
   - 数据形态：1 条 `app_users` + 1 条 portal-side `leads`（关联本地
     org/admin）+ 2 条 `conversations`（已分配 owner = Local Admin /
     未分配 + unread=1）+ 4 条 `messages`（含 1 条 `translation_status=
     'failed'` 用于 admin 端 retry-translation 走查）
   - 拒绝替代方案：`localAdminBootstrap` 内联会污染生产路径；
     dev-only HTTP 端点会增加生产攻击面。最终选 `db:seed-dev` 复用既有
     约定俗成的「按需投放 demo 数据」入口
   - 借助 `cms` / `cms_test` 超级用户 `BYPASSRLS` 绕过 conversations /
     messages / leads FORCE RLS（与 `seedDevData.ts` 中其他 RLS 表同源）

8. **「写入操作成功后必须 refetch detail」是详情页的统一契约**——
   `useLeadDetailModel` 暴露的 7 个 mutate 方法（`submitFollowup` /
   `updateLead` / `transitionStatus` / `markLost` / `convertCustomer` /
   `convertCase` / `confirmConvertDedup`）成功路径**全部**应当
   `await fetchDetail()`，否则 UI 派生状态（`buttonStates` /
   `banner` / `isReadonly` / `conversion`）就会与 server 实际
   状态脱节，等价于 H-6 现象。本轮 H-6 修复后已对齐：

   | 方法 | 成功 refetch | 失败 refetch | 显式单测 |
   |---|---|---|---|
   | `submitFollowup` | ✅ | ✅（catch 后 return null + 不刷新）| ✅ `useLeadDetailModel.test.ts:202` |
   | `updateLead` | ✅ | ❌（不 refetch）| ✅ `mutation.test.ts:46-103` |
   | `transitionStatus` | ✅ | ❌ | ✅ `mutation.test.ts:144-201` |
   | `markLost` | ✅ | ❌ | ✅ `mutation.test.ts:218-273` |
   | `convertCustomer` | ✅ | ❌ | ✅ `convertCustomer-refetch.test.ts`（H-6 新增） |
   | `convertCase` | ✅ | ❌ | ✅ `convertCase-error.test.ts:52-67`（R2-B-5）|
   | `confirmConvertDedup` | ✅（间接经 `doConvertCustomer`）| ❌ | ✅ `convertCustomer-refetch.test.ts:56-90`（H-6 新增）|

   **建议跨模块推广**：在 `useCaseDetailModel` /
   `useCustomerDetailModel` 等 detail-model 实现中按同一矩阵审计，
   并在新增 mutate 方法时强制配套 refetch 契约单测，避免下一轮
   走查再次出现「点击成功但 UI 没变」的同型 bug。

### 0.6 与规格对比

| 规格节 | R-CONSULT-02 实测 | 一致性 |
|---|---|---|
| §2.1 列表字段 11 字段 | 表头 7 列（咨询人/联系/状态/负责人组/跟进/更新+checkbox），缺：业务类型独立列 / 标签 / 创建时间 / 操作菜单 | ⚠️ 部分 |
| §2.2 默认筛选 5 维 | search / status / owner / group / businessType / dateRange 全部 OK | ✅ |
| §2.3 批量动作 5 项 | bulk/status / bulk/export ✅；bulk/assign ✅（R2-A-1 已修复）；bulk/followup / bulk/tags 未触发待 R-CONSULT-03 走查 | ⚠️ 3/5（已触发部分均通过）|
| §3 头部 5 按钮 | edit-info ✅（R2-B-4 已修复）/ change-status ✅（R2-B-4 已修复）/ mark-lost ✅（R2-B-4 已修复）/ convert-customer ✅ / convert-case ✅（R2-B-5 已修复）| ✅ 5/5 |
| §3 Tab1 基础信息 | 字段渲染 OK，但 owner/group 反解失败 | ⚠️ |
| §3 Tab2 跟进 | POST 201 ✅；日期已按 locale 输出（H-4 修复 2026-05-06）| ✅ |
| §3 Tab3 会话（新增）| 嵌入 ConversationDetailView compact 模式，空态 OK | ✅ |
| §3 Tab4 转化 | dedup 弹窗 ✅，customer 路径 ✅，case 路径 ✅（R2-B-5 已修复 BMV 闸口可视化）| ✅ |
| §3 Tab5 日志 | server JOIN users → `createdByDisplayName`；前端 `LeadLogPayloadFormatter` 把 9 种 logType 映射为 from/to + 4 大分类（status / owner / group / info）（H-5 修复 2026-05-06）| ✅ |
| §4 状态机 6 态 | server 端全转换 OK；UI 可达（R2-B-4 已修复 2026-05-06：`LeadChangeStatusDialog` 按 `LEAD_STATUS_TRANSITIONS` 白名单 + `LeadMarkLostDialog` 强制 `lostReason`）| ✅ |
| §5 去重提示 | dedup 200 OK；client `phone.includes` 未改（沿用 R-CONSULT-01 G-1）| ⚠️ |
| §6 BMV 闸口 | server 端结构化 400 ✅；UI 端 `BmvGateBlockerList` 已落地（R2-B-5 修复 2026-05-06）| ✅ |

---

## 1. 详细缺陷清单

### R2-A-1（P0）✅ 已修复（2026-05-06）— `POST /api/admin/leads` 500 / 前端 fixture vs 后端 UUID 不对齐

**复现路径（修复前）**：登录 → `/leads` → `新建线索` → 填 12 字段（含
`负责人=铃木` / `所属组=东京一组`）→ 提交。

**实测网络（reqid=345/346，修复前）**：
```
POST /api/admin/leads
Body: {"name":"MCP-R2-A 赵五","phone":"09055556666",
       "email":"mcp-r2-a@example.com","sourceChannel":"referral",
       "intendedCaseType":"business-management-visa",
       "groupId":"tokyo-1",      ← 短码而非 UUID
       "ownerUserId":"suzuki",   ← 短码而非 UUID
       …}
Response: 500 {"statusCode":500,"message":"Internal server error"}
```

**对照测试**（reqid=348）：用真实 UUID 走 evaluate_script 直接调
API：`groupId="ef21fdd2-1ffc-4a27-8b47-a640d6bd021c"` /
`ownerUserId="00000000-0000-4000-8000-000000000011"` →
**返回 201 + 完整 lead 对象**。

**根因链**：
- `useOwnerOptions.ts:32-87` 内置 7 个静态 fixture owner
- `LeadCreateModalBody.vue` 的 owner dropdown 直接消费
  `ownerOptions` prop（来自 `LeadsListView.vue:9`
  `import { getOwnerOptions } from "../../shared/model/useOwnerOptions"`）
- `useGroupOptions` 同理（仅 `tokyo-1 / tokyo-2`）
- 用户选项 `value` 是 `"suzuki" / "tokyo-1"` 短码，被原样传给 server
- server `LeadsAdminService.create` 用 `ctx.userId, body.ownerUserId, …`
  插入 PG，UUID 列 cast 失败 → 500

**附带 UI 问题**：
- `useLeadCreateActions.runCreate` catch 后只 `return false`
  导致 toast 仅 3 秒一闪而过
- 没有 inline server-error 显示
- LeadDetailView 详情页基础信息 Tab 反向用同一 catalog
  resolve UUID → 找不到 → 显示 raw UUID（H-9，未在本轮修复）

**影响范围（修复前）**：
- B-1 创建线索 happy-path（**P0**）
- bulk-assign（**P0**，验证 reqid=733 同样 500）
- bulk-followup / bulk-tags（同样路径）
- LeadDetailHeader / LeadTableRow 的 owner 反解（**P3** / 留作 H-9 单独跟进）

#### 修复方案（已落地）

**两层防御**（前后端同时收口，避免任一侧再次回归）：

**第一层 · 前端：写入路径切换为 API UUID 来源**
- 新增 `useGroupOptions.getActiveGroupAliasOptions(locale?)`：
  从 `groupAliasesRef`（启动时由 `App.vue` 注入 `/api/groups`
  数据）派生 `{ value: id, label: localizedName }`，excludes
  disabled catalog 项
- 新增 `useOwnerOptions.toApiOwnerOption({ id, displayName })`：
  把 `getActiveUserOptions()` 的 `{ value, label }` 适配为
  `OwnerSelectOption`，自动派生 `initials`（多词取首字母 / 单词
  取前两位）+ `avatarClass`（按 id 哈希稳定染色）
- 新增 `views/leads/model/useLeadCatalogOptions.ts`：
  组合上述两个 helper，导出 `apiOwnerOptions / apiGroupOptions`
  ComputedRef，专供写入路径使用
- `LeadsListView.vue` 把 `LeadCreateModal` / `LeadBulkActionBar`
  的 `ownerOptions / groupOptions` 切到上述 API 派生选项；
  `handleAssignOwner` 的 toast label 查找优先 API 列表
- 筛选区（`LeadFilters` + `useLeadFilters`）继续使用 fixture
  catalog（filter 仅传字符串到 `optStr` 不会 500，且历史测试依赖）

**第二层 · 后端：`optUuid / reqUuid` 防御**
- 新增 `shared/uuid-parsers.reqUuid(v, f)`：必填版本
  （`undefined / 空白 / 非 UUID` 均抛 `BadRequestException`）
- `leads.admin.controller.ts` 写入路径切换：
  - `POST /admin/leads` body：`groupId / ownerUserId` → `optUuid`
  - `PATCH /admin/leads/:id` body：`groupId / ownerUserId` → `optUuid`
  - `POST /admin/leads/:id/convert-case` body：`ownerUserId` →
    `reqUuid`，`groupId` → `optUuid`
  - `POST /admin/leads/:id/convert-customer` body：`customerId`
    → `optUuid`
  - `POST /admin/leads/bulk/assign` body：`ownerUserId` → `reqUuid`
- 列表查询（`GET /admin/leads`）保留 `optStr`（filter 路径不会 500）

#### 修复证据

**新增 / 修改文件**：

前端：
- `packages/admin/src/shared/model/useGroupOptions.ts`
  → `getActiveGroupAliasOptions(locale?)` 新增
- `packages/admin/src/shared/model/useOwnerOptions.ts`
  → `toApiOwnerOption({ id, displayName })` 新增
- `packages/admin/src/views/leads/model/useLeadCatalogOptions.ts`
  → 新文件，组合 API 选项
- `packages/admin/src/views/leads/LeadsListView.vue`
  → 切换 `LeadCreateModal` / `LeadBulkActionBar` 的 owner/group
  options 到 API 派生

后端：
- `packages/server/src/modules/core/shared/uuid-parsers.ts`
  → `reqUuid(v, f)` 新增
- `packages/server/src/modules/core/leads/leads.admin.controller.ts`
  → 5 个写入端点 body 改用 `optUuid / reqUuid`

**新增 / 增补单元测试**（含 R2-A-1 显式回归）：

前端（vitest）：
- `useGroupOptions.test.ts` → +6 cases（`getActiveGroupAliasOptions`
  返回 API UUID、不返回 catalog 短码、按 locale 本地化、disabled
  catalog 排除等）
- `useOwnerOptions.test.ts` → +6 cases（`toApiOwnerOption` 使用
  UUID、不返回 short code、initials 派生、avatarClass 稳定）
- `useLeadCatalogOptions.test.ts` → 新文件，5 cases
  （组合 helper / locale 响应式 / values 不含 short code）

后端（node:test）：
- `shared/uuid-parsers.test.ts` → +7 cases（`reqUuid` 覆盖
  undefined/空白/非 UUID/catalog 短码/正常 UUID）
- `leads/leads.admin.controller.r2-a-1-uuid-guard.test.ts`
  → 新文件，8 cases（create / update / bulk-assign /
  convert-customer 全部覆盖 catalog 短码 → 400 + 真实 UUID
  → 透传成功）
- `leads/leads.admin.convert-case.controller.test.ts`
  → +2 cases（convert-case body 同源 UUID 防御）

**门禁通过情况（2026-05-06）**：
- `npm --workspace @cms/admin run guard` ✅
- `packages/server` 局部检查：`tsc --noEmit` ✅ /
  `eslint src/modules/core/leads src/modules/core/shared` ✅ /
  `arch:check` ✅ / `npm run test`（3909 cases）✅
- 根目录 `lint:i18n` ✅ / `lint:a11y` ✅
- 仓库根 `npm run guard` 因无关 `effective-permissions.service.ts`
  既存 lint 限制（pre-existing，非本次改动引入）暂未整仓收口

**预期 chrome-devtools-mcp 复跑结果（待 R-CONSULT-03 验证）**：
- B-1 新建线索：选择真实用户「Local Admin」+ 真实组「tokyo-1」
  → 提交 → 201 + 列表立刻出现新条目
- bulk-assign：选择真实用户 → 201 + toast 显示真实姓名
- 反例：若前端代码未来回归再次发送 `"suzuki"` 短码，
  server 直接返回 400 `"ownerUserId must be a valid UUID"`（不再 500）

### R2-B-4（P1）✅ 已修复（2026-05-06）— 线索详情头部 3 个按钮全部空 handler

**复现路径（修复前）**：`/leads/:id` → 点击「编辑信息」/「调整状态」/
「标记流失」。

**实测（修复前）**：
- 3 个按钮均 focusable focused
- click 不触发任何 network request
- console 无 warning
- DOM 不变

**根因（修复前）**：`LeadDetailView.vue:94-96`
```vue
@mark-lost="() => {}"
@edit-info="() => {}"
@change-status="() => {}"
```

**业务影响**：
- §3 头部 5 按钮中 3 个不可用 = 状态机推进、信息编辑、流失标记
  全部不可执行
- 线索一旦创建就**几乎只能 list view 删除**或硬走转化路径
- spec §"实施状态対照表" 标记的 P0 范围严重不达标

**修复方案**：

1. 模型层（model）落地三个 mutate 方法
   - 新增 `useLeadMutationActions(leadId, repo, fetchDetail)`：暴露
     `updateLead` / `transitionStatus` / `markLost` 三个方法 +
     对应 `*Submitting` 标志
   - 统一返回 `LeadMutationFailure | null`：失败时 `kind="generic"`
     + `messageKey` + `fallbackMessage`，由调用方做 inline 错误展示与
     toast；成功时返回 `null` 并触发 `fetchDetail()` 刷新
   - 重入保护：进行中再次调用直接 short-circuit

2. UI 层落地 3 个对话框
   - `LeadEditInfoDialog.vue`：基础信息编辑；只提交相对初始值发生
     变化的字段（patch 语义）；owner / group 选项必须使用 API UUID
     （与 R2-A-1 保持一致），通过 `useLeadCatalogOptions` 注入
   - `LeadChangeStatusDialog.vue`：可选目标状态由当前状态 +
     `LEAD_STATUS_TRANSITIONS` 白名单派生，并过滤掉 `lost` /
     `converted_case`（这两个由专用按钮承担）；当当前状态没有可推进
     目标时（如 `signed` / `converted_case`）展示空态提示
   - `LeadMarkLostDialog.vue`：`lostReason` 必填（与 server
     `lost_reason is required` 校验一致），失败时弹窗保持打开 +
     inline 错误条 + error toast

3. 视图层（`LeadDetailView.vue`）
   - 新增 `useLeadHeaderDialogs({t, toast, updateLead,
     transitionStatus, markLost})` 编排：维护 3 个弹窗的可见性 /
     生效错误 / open / close / handleConfirm，集中处理 toast +
     `fetchDetail`
   - `LeadDetailHeader` 上的 3 个 emit 由空函数改为
     `openEditInfoDialog` / `openChangeStatusDialog` /
     `openMarkLostDialog`

4. i18n（zh-CN / ja-JP / en-US）
   - 新增 `leads.detail.editInfoDialog.*` / `changeStatusDialog.*` /
     `markLostDialog.*` 全套 key（标题、字段、占位符、确认按钮）
   - 新增 `leads.toast.updateSuccess` / `transitionSuccess` /
     `markLostSuccess` 与 `leads.errors.updateFailed*` /
     `transitionFailed*` / `markLostFailed*`

**自动化覆盖**：
- `useLeadDetailModel.mutation.test.ts`（13 cases）
  - update / transitionStatus / markLost 各自的 happy path（fetchDetail
    被调用）/ 失败返回 `LeadMutationFailure`（含 server message
    fallback）/ 失败不触发 refetch / submitting 释放 / 重入保护
- `LeadEditInfoDialog.test.ts`（11 cases）：渲染、UUID 预填、
  patch 语义（仅改动的字段进 diff）、null 显式 unset、错误条 aria、
  cancel / backdrop / submitting disable
- `LeadChangeStatusDialog.test.ts`（10 cases）：从 `LEAD_STATUS_TRANSITIONS`
  派生选项、`lost` / `converted_case` 不出现、终态空态、提交携带
  `toStatus`、错误条 aria、cancel / backdrop / submitting disable
- `LeadMarkLostDialog.test.ts`（9 cases）：`lostReason` 必填校验、
  trim、错误条 aria、cancel / backdrop / submitting disable
- 全包 `npm run guard`（admin + server + 集成 PG）：✅ 通过

**关键代码位置**：
- model: `packages/admin/src/views/leads/model/useLeadMutationActions.ts`、
  `model/useLeadHeaderDialogs.ts`、`model/leadEditInfoForm.ts`
- ui: `packages/admin/src/views/leads/components/LeadEditInfoDialog.vue`、
  `LeadChangeStatusDialog.vue`、`LeadMarkLostDialog.vue`
- 视图接通: `packages/admin/src/views/leads/LeadDetailView.vue`
- 状态机白名单: `packages/admin/src/views/leads/types.ts`
  （`LEAD_STATUS_TRANSITIONS` / `getChangeStatusDialogOptions`）

**预期 chrome-devtools-mcp 复跑结果（待 R-CONSULT-03 验证）**：
- 编辑信息：弹窗预填当前值 → 修改 name → 提交 → 200 + 详情刷新
  + success toast；只发送 diff 字段
- 调整状态：`new` → 选 `following` → 提交 → 200 + 详情刷新；
  `signed` 状态打开弹窗看到空态提示，引导用户改用「转客户/转案件」
  或「标记流失」
- 标记流失：lostReason 空时确认按钮 disabled；填写后提交 →
  200 + 详情刷新 + success toast

### R2-B-5（P0）✅ 已修复（2026-05-06）— `POST /admin/leads/:id/convert-case` 400 错误被 UI 吞噬

**复现路径（修复前）**：`/leads/:id`（status=signed）→ 头部「签约并开始建档」
→ 弹窗中确认 → 提交。

**实测网络（reqid=676）**：
```
POST /api/admin/leads/720dc94b-…/convert-case
Body: {"caseTypeCode":"business_manager_visa",
       "ownerUserId":"00000000-0000-4000-8000-000000000011",
       "groupId":"ef21fdd2-1ffc-4a27-8b47-a640d6bd021c"}
Response: 400 {
  "code": "CASE_BMV_GATE_BLOCKED",
  "blockers": [
    {"code":"BMV_QUESTIONNAIRE_NOT_RETURNED", "message":"BMV questionnaire must be returned before case creation"},
    {"code":"BMV_QUOTE_NOT_CONFIRMED",         "message":"BMV quote must be confirmed before case creation"},
    {"code":"BMV_NOT_SIGNED",                  "message":"Customer must sign contract before BMV case creation"},
    {"code":"BMV_INTAKE_NOT_READY",            "message":"BMV intake process must reach ready_for_case_creation status"}
  ]
}
```

**实测 UI**：弹窗直接关闭、无 toast、无 inline error；console 报：
```
[error] Failed to load resource: 400 (Bad Request)
[warn] [Vue warn]: Unhandled error during execution of component event handler
       at <LeadConvertCaseDialog … >
       at <LeadDetailView … >
[error] Uncaught (in promise)
```

**根因**：
- `LeadConvertCaseDialog.confirm` 没 try/catch
- `LeadDetailView.handleConvertCaseConfirm` (lines 76-81) 也没接住
  `convertCase(input)` 抛出的 promise rejection
- LeadAdapter 层未对 `code === "CASE_BMV_GATE_BLOCKED"` 做特殊处理

**业务影响**：
- 用户填了所有字段、点确认 → 弹窗关闭 → 以为创建成功 →
  跳到「案件」列表却找不到 → 困惑
- BMV 闸口的 4 条业务规则**对终端用户完全不可见**，
  无法引导用户去补回问卷/报价/签约/intake

**修复建议（已落地）**：
- **第一层**：`LeadConvertCaseDialog.confirm` try/catch + 把
  error 状态保存到 dialog 内（不立即关闭）
- **第二层**：解析 `error.code === "CASE_BMV_GATE_BLOCKED"` 时
  渲染 `BmvGateBlockerList`（新组件）：
  ```vue
  <section role="alert" aria-live="assertive">
    <h4>{{ t("leads.errors.bmvGate.title") }}</h4>
    <p>{{ t("leads.errors.bmvGate.description") }}</p>
    <ul>
      <li v-for="key in messageKeys" :key="key">{{ t(key) }}</li>
    </ul>
  </section>
  ```
- **第三层**：通用 fallback i18n
  `leads.errors.convertCaseFailed` 既 inline 渲染又
  通过全局 toast（tone=error）触达。

#### 修复方案（已落地）

**双闸防御**（仓库层/视图层共同收口）：

**第一层 · 仓库错误归一化**：
- `LeadRepositorySupport` 新增 `ServerBlocker` 类型与
  `LeadRepositoryError.serverBlockers` 字段；`buildBadResponseError`
  对 4xx/422 同时读取 `code`（NestJS BadRequestException 结构化 payload
  约定）与 `errorCode`（旧约定），并把 `blockers[]` 数组按结构化形式
  附加到 error 对象上。
- `LeadRepository` re-export `ServerBlocker`，外层模型可直接消费。

**第二层 · 模型层结构化错误**：
- `useLeadDetailModel` 新增 `LeadConvertCaseFailure` 联合类型：
  `{ kind: "bmvGate"; serverErrorCode; blockers }` 或
  `{ kind: "generic"; messageKey; fallbackMessage }`。
- `convertCase()` 改为返回 `Promise<LeadConvertCaseFailure | null>`
  （null 表示成功），失败分支不再 throw、不再静默 console；
  通过 `toConvertCaseFailure()` 把 `LeadRepositoryError`
  按 `isLeadBmvGateError` + 非空 blocker 列表分流，否则归一化为 generic。
- 失败路径**不会触发** `fetchDetail()`，避免在 BMV 闸口阻断时
  重新拉取并掩盖旧状态。

**第三层 · 视图层弹窗保活 + 双重提示**：
- `LeadConvertCaseDialog` 增加 `error?: LeadConvertCaseFailure` prop；
  `bmvGate` 时插入 `BmvGateBlockerList`（自动按 i18n key 去重），
  `generic` 时插入 inline error 块（`role="alert"
  aria-live="assertive"`）。
- `LeadDetailView.handleConvertCaseConfirm` 改为 await `convertCase`
  返回值：成功才关闭弹窗，失败时保存 `convertCaseError`、保持弹窗打开；
  generic 失败额外触发 error toast（`leads.errors.convertCaseFailedToast.title` +
  `leads.errors.convertCaseFailed`）。
- `closeConvertCaseDialog`/`openConvertCaseDialog` 同步清空遗留错误，
  防止下次复用时旧错误残留。

#### 修复证据

**新增 / 修改文件**：

前端：
- `packages/admin/src/views/leads/model/LeadRepositorySupport.ts`
  → 新增 `ServerBlocker` 类型 / `serverBlockers` 字段 /
  `readServerBlockersFromBody` / `buildBadResponseError` 兼容 `code` 字段
- `packages/admin/src/views/leads/model/LeadRepository.ts`
  → re-export `ServerBlocker`
- `packages/admin/src/views/leads/model/LeadBmvGateBinding.ts`
  → **新文件**：常量 `LEAD_BMV_GATE_ERROR_CODE` /
  `LEAD_BMV_GATE_BLOCKER_CODES`；helper `isLeadBmvGateError` /
  `resolveLeadBmvBlockerI18nKey` / `resolveLeadBmvBlockerI18nKeys`
- `packages/admin/src/views/leads/model/useLeadDetailModel.ts`
  → 新增 `LeadConvertCaseFailure` 联合类型 / `toConvertCaseFailure` /
  `doConvertCase` 改为返回结构化错误
- `packages/admin/src/views/leads/components/BmvGateBlockerList.vue`
  → **新文件**：BMV 闸口阻断列表渲染组件
  （`role="alert" aria-live="assertive"`）
- `packages/admin/src/views/leads/components/LeadConvertCaseDialog.vue`
  → 增加 `error` prop / inline 渲染 BMV 列表或 generic 错误条
- `packages/admin/src/views/leads/LeadDetailView.vue`
  → `handleConvertCaseConfirm` 接住返回值 / `convertCaseError`
  状态 / generic 失败触发 error toast
- `packages/admin/src/i18n/messages/leads/{zh-CN,ja-JP,en-US}.ts`
  → `leads.errors.convertCaseFailed` /
  `leads.errors.convertCaseFailedToast.title` /
  `leads.errors.bmvGate.{title,description,questionnaireNotReturned,
  quoteNotConfirmed,notSigned,intakeNotReady,unknown}`

**新增单测**（含 R2-B-5 显式回归）：

前端（vitest）：
- `LeadBmvGateBinding.test.ts` → 12 cases（错误码常量 / 顶层
  `isLeadBmvGateError` / 单码与列表 i18n 解析 / 未知码 fallback /
  同义阻断去重）
- `LeadRepository.bmv-gate-error.test.ts` → 6 cases
  （`code` 字段 + blockers / `errorCode` 兼容 / 无 blockers
  fallback / 畸形 blocker 过滤 / 401 不泄漏 / 请求 URL+body+token 验证）
- `useLeadDetailModel.convertCase-error.test.ts` → 7 cases
  （成功返回 null / BMV gate 返回 `kind=bmvGate` / 空 blockers 退化
  generic / 非 BMV 错误 generic / 未知 throw generic / 失败不刷新
  detail / `convertSubmitting` 释放）
- `LeadConvertCaseDialog.bmv-gate.test.ts` → 6 cases
  （error=null 不渲染 / BMV gate 渲染 4 项 + ARIA / generic 渲染
  inline 错误 / 错误状态下不自动 emit close / cancel 仍可关闭 /
  retry confirm 仍可触发）

**关联回归**（既有套件）：
- `useLeadDetailModel.test.ts` 53 cases 全 pass（convertCase 默认
  路径 BC 保持，旧 `await model.convertCase(input)` 调用仍可用）
- `LeadConvertCaseDialog.test.ts` 13 cases 全 pass（confirm/cancel/
  field default 行为 BC）
- `i18n-contract.test.ts` 11 cases 全 pass（zh-CN / ja-JP / en-US
  键集合保持一致）

**门禁通过情况（2026-05-06）**：
- `npm --workspace @cms/admin run guard` ✅（含 `check:deps` /
  `vue-tsc --noEmit` / `eslint .` / `jsdoc:lang:check` /
  `vitest`（7953 cases，24 skipped）/ `vite build`）
- 根目录 `lint:i18n` ✅ / `lint:a11y` ✅
- 仓库根 `npm run fix` / `npm run guard` 因无关
  `effective-permissions.service.ts` 既存 `max-lines-per-function`
  lint 限制（同 R2-A-1 同源 pre-existing，非本次改动引入）暂未
  整仓收口

**预期 chrome-devtools-mcp 复跑结果（待 R-CONSULT-03 验证）**：
- 在 status=signed 但未完成 BMV intake 的 lead 上点击「签约并开始建档」
  → 弹窗保持打开，顶部显示 4 行黄色阻断提示（QUESTIONNAIRE /
  QUOTE / SIGN / INTAKE，按 server 顺序、按 i18n key 去重）
- 用户可在弹窗内按取消/X 关闭，或修正先决条件后再次提交
- 非 BMV 错误（如 server 临时 500）→ 弹窗内 inline 显示
  「转案件失败，请稍后重试。」+ 屏幕右上角 error toast
- console 无 `Unhandled error` / `Uncaught (in promise)` 噪声

### R2-B-6（P1）✅ 已修复（2026-05-06）— 转化后头部「查看客户」按钮错误打开 convert dialog

**复现路径（修复前）**：lead 已转客户 → reload `/leads/:id` → 头部
按钮变成「查看客户」 → 点击。

**实测（修复前）**：弹出 LeadConvertCustomerDialog（**与点击「仅建
客户档案」完全一样**），而非跳转 `#/customers/${convertedCustomerId}`。
同源问题在 `convertedCase` 状态下的「查看案件」按钮也存在。

**风险（修复前）**：用户填字段确认后会**重新创建一个客户**（dedup
兜底能拦下 phone/email 完全相同的，但如果用户改了字段就会产生
重复）。

**根因**：`LeadDetailHeader` 在 `buttonStates.convertCustomer ===
"view-customer"` / `convertCase === "view-case"` 状态时仅改了按钮
文案，仍 emit `convertCustomer` / `convertCase` 事件；父组件根据
这两个事件打开 convert dialog 而非跳转。

#### 修复方案（已落地）

**两层拆分**（事件契约层 + 路由跳转层）：

**第一层 · 头部组件事件契约**：
- `LeadDetailHeader` `defineEmits` 新增 `viewCustomer: []` / `viewCase: []`
  两个独立事件
- `view-customer` 状态的按钮改为 `@click="$emit('viewCustomer')"`
  （原为 `convertCustomer`）；`view-case` 状态同理改为
  `@click="$emit('viewCase')"`（原为 `convertCase`）
- 其余 `convertCustomer` / `convertCase` 事件契约保持不变（BC 通过）

**第二层 · 详情视图路由跳转**：
- 新增 `views/leads/model/useLeadHeaderNavigation.ts`：以
  `lead: Ref<LeadDetail | null>` + `router: Pick<Router, "push">`
  为依赖，导出 `handleViewCustomer` / `handleViewCase`
- 跳转前置防御：`lead` 为 null（loading / not-found）或
  `conversion.convertedCustomer / convertedCase` 为 null（中间态，
  例如已转 customer 但未转 case）时静默 no-op，避免误打开错误页
- `router.push({ name: "customer-detail" | "case-detail", params: { id } })`
  使用具名路由而非 hash 字符串拼接，与现有路由表
  `/customers/:id` / `/cases/:id` 解耦
- `LeadDetailView` 模板补 `@view-customer="handleViewCustomer"` /
  `@view-case="handleViewCase"` 绑定

#### 修复证据

**新增 / 修改文件**：

前端：
- `packages/admin/src/views/leads/components/LeadDetailHeader.vue`
  → `defineEmits` 新增 `viewCustomer` / `viewCase`；`view-customer` /
  `view-case` 两个分支按钮的 `@click` 切换到新事件
- `packages/admin/src/views/leads/model/useLeadHeaderNavigation.ts`
  → **新文件**：导出 `useLeadHeaderNavigation({ lead, router })`，
  返回 `handleViewCustomer` / `handleViewCase` 两个 navigation handler；
  含 null lead / 未转化中间态防御
- `packages/admin/src/views/leads/LeadDetailView.vue`
  → 引入 `useRouter` + `useLeadHeaderNavigation`；模板新增
  `@view-customer` / `@view-case` 绑定

**新增 / 增补单元测试**（含 R2-B-6 显式回归）：

前端（vitest）：
- `LeadDetailHeader.test.ts` → +3 cases（`HEADER_BUTTON_PRESETS.convertedCustomer`
  下「查看客户」emit `viewCustomer` 而非 `convertCustomer`；
  `convertedCase` 下「查看案件」emit `viewCase` 而非 `convertCase`；
  两按钮共存时事件相互独立）
- `useLeadHeaderNavigation.test.ts` → **新文件**，7 cases（
  `handleViewCustomer` 跳 `customer-detail` + 正确 id；
  lead null / `convertedCustomer` null 各自防御；
  `handleViewCase` 同源 3 cases；两 handler 互不干扰）

**门禁通过情况（2026-05-06）**：
- `npm --workspace @cms/admin run check:deps` ✅
  （1002 modules / 2391 dependencies，零违规；新文件位于 `views/leads/model`
  内未跨边界）
- `npx eslint LeadDetailHeader.vue LeadDetailView.vue
  LeadDetailHeader.test.ts useLeadHeaderNavigation.ts` ✅
  （`max-lines` 通过：抽出 navigation composable 后 `LeadDetailView.vue`
  从临时 514 行回落至 492 行）
- `npx vitest run src/views/leads`（29 个 test files / 323 cases）✅
- `vue-tsc --noEmit` ✅

**预期 chrome-devtools-mcp 复跑结果（待 R-CONSULT-03 验证）**：
- lead status=converted_customer：头部「查看客户」点击 → URL hash
  跳转 `#/customers/<convertedCustomerId>` → 渲染客户详情页
  （不再弹出 LeadConvertCustomerDialog）
- lead status=converted_case：头部「查看客户」/「查看案件」分别
  跳转客户详情 / 案件详情；DevTools Network 面板观察到 Vue
  router 的 push 而非 dialog 创建
- 反例：若 conversion 数据缺失（network race），按钮 click 静默
  no-op（不抛错、不跳错误页）

### R2-D-1（P2）✅ 已修复（2026-05-06）— conversations.admin `assign` body 仍用 `optStr` 而非 `optUuid`

**位置（修复前）**：`packages/server/src/modules/core/conversations/conversations.admin.controller.ts:143`
```ts
return this.svc.assign(requireCtx(req), id, {
  ownerUserId: optStr(body.ownerUserId, "ownerUserId"),  // ← optStr
});
```

**风险（修复前）**：第一轮 E-1 已修了前端的 `"current-user"` 字面量；
**但后端这层防御还没补**。如果未来另一处前端代码
回归发送非 UUID（比如 owner picker dialog 的 default value
被改回字面量），会再次 500 而不是 400。

#### 修复方案（已落地）

**单点最小改动**（与 list query 的 `ownerUserId` 处理对齐，
保持 service 层契约不变）：

- `conversations.admin.controller.ts:143` 把
  `optStr(body.ownerUserId, "ownerUserId")` 替换为
  `optUuid(body.ownerUserId, "ownerUserId")`
- `optUuid` 已在文件顶部导入（line 17），无需新增 import
- `ConversationAssignInput.ownerUserId?: string`（types.ts）保持不变
- service 层「`ownerUserId` 缺省时回退到 lead.owner_user_id」的
  fallback 语义不受影响：`optUuid` 对 `undefined / 空白` 仍返回
  `undefined`，业务逻辑（service.ts:117-128）继续生效

**与 R2-A-1 / E-1 同源闭环**：
- 第一轮 E-1（前端）：`ConversationOwnerPickerDialog` 落地，移除
  `"current-user"` 字面量
- R2-A-1（前后端）：leads 写入路径全切 `optUuid / reqUuid` + 前端
  改读 API UUID
- R2-D-1（后端）：conversations.assign 同源补齐——至此 admin 端
  「`ownerUserId` 透传 PG UUID 列」的全部入口（leads create/update/
  bulk-assign/convert-customer/convert-case + conversations.assign）
  均有 `optUuid / reqUuid` 防御层

#### 修复证据

**修改文件**：

后端：
- `packages/server/src/modules/core/conversations/conversations.admin.controller.ts`
  → assign body `ownerUserId` 切换为 `optUuid`
- `packages/server/src/modules/core/conversations/conversations.admin.controller.test.ts`
  → 新增 R2-D-1 子套件，7 cases：
  - 拒绝 catalog 短码 `"suzuki"`（含 error message 提到 ownerUserId 断言）
  - 拒绝 free text `"not-a-uuid"`
  - 拒绝非 string（数字 `123`）
  - 接受合法 UUID 并透传到 service `assign(ctx, id, input)`
  - 接受 `body = {}`（保留 lead-owner fallback 语义）
  - 接受空白字符串 `"   "` 并归一化为 `undefined`
  - 源码层断言：`return this.svc.assign(...)` 处使用 `optUuid` 且
    不包含 `optStr(body.ownerUserId`

**门禁通过情况（2026-05-06）**：
- `npx tsc --noEmit -p tsconfig.json`（packages/server）✅
- `npx eslint src/modules/core/conversations` ✅（lint 干净）
- `node --import tsx --test src/modules/core/conversations/conversations.admin.controller.test.ts`
  → **38/38 cases pass**（含 R2-D-1 新增 7 条）
- `npx depcruise --config .dependency-cruiser.cjs src/modules/core/conversations --validate`
  ✅（23 modules / 27 deps，零违规）
- 仓库根 `npm run fix` / `npm run guard` 因无关
  `effective-permissions.service.ts` 既存 `max-lines-per-function`
  lint 限制（与 R2-A-1 / R2-B-5 同源 pre-existing，非本次改动引入）
  暂未整仓收口

**预期 chrome-devtools-mcp 复跑结果（待 R-CONSULT-03 验证）**：
- 直调 `PATCH /api/admin/conversations/<uuid>/assign` body
  `{ "ownerUserId": "suzuki" }` → 400
  `"ownerUserId must be a valid UUID"`（不再 500）
- body `{ "ownerUserId": "<合法 UUID>" }` → 200 OK，service 写入 PG
- body `{}` → 200 OK，service 回退到 lead.owner_user_id 的现有逻辑
- body `{ "ownerUserId": 123 }`（非 string）→ 400 `"Invalid ownerUserId"`

### R2-D-2（P2）✅ 已修复（2026-05-06）— messages 控制器 conversationId / messageId 缺 ParseUUIDPipe

**位置（修复前）**：`packages/server/src/modules/core/conversations/messages.admin.controller.ts:104`
```ts
@Param("conversationId") conversationId: string,  // ← 裸 string
```

**实测（修复前）**：
- `/api/admin/conversations/not-a-uuid/messages` → **500**（reqid=693）
- `/api/admin/conversations/not-a-uuid` → **400**（reqid=694，已修）

#### 修复方案（已落地）

**单点最小改动**（与 `conversations.admin.controller.ts` 的
`UuidParam` 模式同源对齐，service 层契约不变）：

- `messages.admin.controller.ts` import 新增 `ParseUUIDPipe`
- 文件顶部声明两个 param helper：
  ```ts
  const ConversationIdParam = () =>
    Param("conversationId", new ParseUUIDPipe());
  const MessageIdParam = () => Param("messageId", new ParseUUIDPipe());
  ```
- 4 处 controller 方法签名替换：
  - `list(... @Param("conversationId") conversationId, ...)` →
    `list(... @ConversationIdParam() conversationId, ...)`
  - `send(... @Param("conversationId") conversationId, ...)` →
    `send(... @ConversationIdParam() conversationId, ...)`
  - `retryTranslation(... @Param("conversationId") conversationId,
    @Param("messageId") messageId)` →
    `retryTranslation(... @ConversationIdParam() conversationId,
    @MessageIdParam() messageId)`
- service 层 `MessagesAdminService.list / send / retryTranslation` 的
  `(ctx, conversationId, ...)` 签名保持不变（不破坏 BC）

**与 R-CONSULT-01 / R2-D-1 同源闭环**：
- 第一轮 C-1：`leads.admin.controller.ts` `:id` 加 `ParseUUIDPipe`
- 第一轮 D-1：`conversations.admin.controller.ts` query `leadId / customerId
  / caseId / appUserId` 加 `optUuid`
- R2-A-1：leads 写入路径 5 个端点 body `optUuid / reqUuid` 双层防御
- R2-D-1：`conversations.admin.controller.ts` `assign` body `ownerUserId`
  切 `optUuid`
- R2-D-2（本次）：`messages.admin.controller.ts` 子资源 `conversationId
  / messageId` 加 `ParseUUIDPipe` ——至此 admin 端
  「会话子接口非 UUID 路径参数透传 PG UUID 列」的全部入口（主接口
  `:id` + 子资源 `:conversationId / :messageId`）均有 `ParseUUIDPipe`
  防御层，行为统一为 400 而非 500

#### 修复证据

**修改 / 新增文件**：

后端：
- `packages/server/src/modules/core/conversations/messages.admin.controller.ts`
  → 新增 `ParseUUIDPipe` import；新增 `ConversationIdParam` /
  `MessageIdParam` 两个 helper；`list / send / retryTranslation`
  共 4 处 `@Param` 切换
- `packages/server/src/modules/core/conversations/messages.admin.controller.test.ts`
  → **新文件**，21 cases 6 个 suite：
  - `controller mount + permission decorators` — 4 cases：
    `@Controller("admin/conversations/:conversationId/messages")`
    路径契约；`list / send / retryTranslation` 各自的
    `@RequirePermission(PERMISSION_CODES.CASE_EDIT)` decorator
  - `ParseUUIDPipe on :conversationId / :messageId routes (R2-D-2)` —
    7 cases：源码导入 `ParseUUIDPipe` / `ConversationIdParam` 与
    `MessageIdParam` helper 定义 / 3 个方法均使用 `@ConversationIdParam()`
    且不使用裸 `@Param("conversationId")` / `retryTranslation` 使用
    `@MessageIdParam()` 且不使用裸 `@Param("messageId")`
  - `missing context` — 3 cases：3 个方法在缺 `requestContext` 时
    抛 `UnauthorizedException`
  - `list query validation (page/limit)` — 3 cases：非数字 `page` →
    `BadRequestException` / `limit > 200` → `BadRequestException` /
    合法值透传到 service
  - `send body validation` — 3 cases：缺 `originalLanguage` /
    `originalText` → `BadRequestException` / 最小有效 body trim +
    `forceOriginal: "true"` 解析为 boolean true + 透传
  - `retryTranslation forwarding` — 1 case：service 收到正确的
    `(ctx, conversationId, messageId)` 三参

**门禁通过情况（2026-05-06）**：
- `npx tsc --noEmit -p tsconfig.json`（packages/server）✅
- `npx eslint src/modules/core/conversations` ✅（lint 干净）
- `node --import tsx --test src/modules/core/conversations/messages.admin.controller.test.ts`
  → **21/21 cases pass**
- `node --import tsx --test src/modules/core/conversations/conversations.admin.controller.test.ts`
  → **38/38 cases pass**（BC 验证：R2-D-1 既有套件不退化）
- `npx depcruise --config .dependency-cruiser.cjs src/modules/core/conversations --validate`
  ✅（24 modules / 32 deps，零违规）
- 仓库根 `npm run fix` / `npm run guard` 因无关
  `effective-permissions.service.ts` 既存 `max-lines-per-function`
  lint 限制（与 R2-A-1 / R2-B-5 / R2-D-1 同源 pre-existing，
  非本次改动引入）暂未整仓收口

**预期 chrome-devtools-mcp 复跑结果（待 R-CONSULT-03 验证）**：
- `GET /api/admin/conversations/not-a-uuid/messages` → 400
  `"Validation failed (uuid is expected)"`（不再 500，与 reqid=694 行为一致）
- `POST /api/admin/conversations/not-a-uuid/messages` body 合法 → 400
  `"Validation failed (uuid is expected)"`（路径 UUID 在 body 校验之前先抛）
- `POST /api/admin/conversations/<合法 UUID>/messages/not-a-uuid/retry-translation`
  → 400（`messageId` 同源拦截）
- `GET /api/admin/conversations/<合法 UUID>/messages` → 200（happy-path
  保持，page/limit 解析与 service 调用未变）

### H-6（P2）✅ 已修复（2026-05-06）— 转化成功后页面状态滞后

**复现路径（修复前）**：
1. lead status=signed
2. 点击「仅建客户档案」 → 填表 → 确认 → 201 OK
3. 头部按钮**不变**（仍显示「调整状态/标记流失」而非「查看客户」）
4. 必须 `window.location.reload()` 才能看到新按钮

**根因（修复前）**：`useLeadDetailModel.convertCustomer` 成功后没有触发
`fetchDetail()` 重新拉取详情；`buttonStates` computed 只读 `lead.value?.buttons`，
而 `lead.value` 不刷新就一直是旧 preset。

#### 修复方案（已落地）

**单点最小改动 + 单测显式锁定契约**：

**第一层 · 代码（在 R2-B-5 改造中作为副产品落地）**：
- `doConvertCustomer`（`useLeadDetailModel.ts:238-264`）try 块成功分支末尾
  追加 `await refs.fetchDetail();`，与 `doConvertCase` 保持对称
- 失败路径（`repo.convertCustomer` 抛异常）走 finally 释放 `convertSubmitting`，
  **不调用** `fetchDetail()`，避免在阻塞性失败时重新拉取并掩盖旧状态
- dedup 命中分支（`checkDedupForConvert` 返回 false）直接 `return`，
  不进入 try、不会 refetch；后续 `confirmConvertDedup` 触发的二次
  `doConvertCustomer` 走完整成功路径再 refetch

**第二层 · 单测显式锁定 refetch 契约**：
- 新增 `useLeadDetailModel.convertCustomer-refetch.test.ts`（6 cases），
  与 `useLeadDetailModel.convertCase-error.test.ts` 范式对齐
- 覆盖维度：直连成功 refetch / dedup-confirm 路径成功 refetch /
  失败不 refetch / dedup 命中短路不 refetch / 失败释放 `convertSubmitting` /
  重入保护下不重复请求且重入返回不 refetch（仅原始请求 resolve 后才 refetch）

#### 修复证据

**修改 / 新增文件**：

前端：
- `packages/admin/src/views/leads/model/useLeadDetailModel.ts`
  → `doConvertCustomer` 成功分支已含 `await refs.fetchDetail()`（line 260），
  与 `doConvertCase` 行为对称；本次未再修改源码
- `packages/admin/src/views/leads/model/useLeadDetailModel.convertCustomer-refetch.test.ts`
  → **新文件**，6 cases：
  - `refetches detail after a successful direct convertCustomer (no dedup matches)`
  - `refetches detail after the dedup-confirm path succeeds`
  - `does NOT refetch detail when convertCustomer fails`
  - `does NOT refetch detail when convertCustomer is short-circuited by a dedup match`
  - `releases convertSubmitting after a failed convertCustomer`
  - `ignores reentrant calls while a previous convertCustomer is still running`

**关联回归**（既有套件）：
- `useLeadDetailModel.test.ts` 47 cases 全 pass（含 convertCustomer dedup
  既有契约 BC）
- `useLeadDetailModel.convertCase-error.test.ts` 7 cases 全 pass
  （convertCase refetch 契约 BC）
- `useLeadDetailModel.mutation.test.ts` 13 cases 全 pass
  （updateLead / transitionStatus / markLost refetch 契约 BC）
- `src/views/leads` 全包 30 个 test files / 329 cases 全 pass

**门禁通过情况（2026-05-06）**：
- `npm --workspace @cms/admin run typecheck`（vue-tsc --noEmit）✅
- `npm --workspace @cms/admin run check:deps`（depcruise，1003 modules /
  2393 dependencies）✅
- `npx eslint src/views/leads/model/useLeadDetailModel.convertCustomer-refetch.test.ts` ✅
- `npx vitest run src/views/leads`（30 files / 329 cases）✅
- 仓库根 `npm run fix` / `npm run guard` 因无关
  `effective-permissions.service.ts` 既存 `max-lines-per-function`
  lint 限制（与 R2-A-1 / R2-B-5 / R2-D-1 / R2-D-2 同源 pre-existing，
  非本次改动引入）暂未整仓收口

**预期 chrome-devtools-mcp 复跑结果（待 R-CONSULT-03 验证）**：
- lead status=signed → 「仅建客户档案」→ 填表 → 确认 → 201 OK →
  弹窗关闭 → 页面无需刷新自动出现「查看客户」按钮（`lead.value.buttons`
  从 `signedNotConverted` → `convertedCustomer`）
- lead status=converted_customer → 「签约并开始建档」→ 填表 → 确认 → 201 OK
  → 弹窗关闭 → 页面无需刷新自动出现「查看案件」按钮（与 R2-B-5 BMV
  闸口 inline error 保活弹窗的行为不冲突）
- 反例：转客户/转案件 server 失败时弹窗保持打开（R2-B-5）+ 页面状态
  保留为旧 preset（H-6），不会被失败的 refetch 静默替换为残缺数据

### H-9（P3）✅ 已修复（2026-05-06）— 线索列表/详情 owner 字段显示 raw UUID 或 "?"

**实测（修复前）**：
- 列表行 "负责人 / 组" 列显示 `?` （uid=41_55, 41_71）
- 详情基础信息 "负责人" 字段显示 raw UUID
  `00000000-0000-4000-8000-000000000011`

**根因（修复前）**：
- `LeadTableRow.vue:36-42` 只走 `resolveOwnerOption(props.lead.ownerId, locale)`，
  即静态 `OWNER_CATALOG`（fixture 短码 `suzuki / tanaka / li …`）；
  ownerId 是真实 UUID 时 catalog miss → `ownerLabel = "—"` /
  `ownerInitials = "?"`，没有第二档反解链路。
- `LeadAdapterMappers.adaptBasicInfo` 把
  `ownerLabel || ownerDisplayName || ownerUserId` 写入
  `info.owner` —— 当后端响应没带 `ownerLabel` 时，
  raw UUID 直接落地到 Tab1 基础信息字段。
- `LeadDetailHeader.vue:187` 渲染 `<strong>{{ lead.ownerLabel }}</strong>`，
  没有针对空 / UUID 形态的回落兜底。
- 现有 `useOrgUserOptions.resolveUserLabel(id)` 已在 R2-A-1 修复中
  接入了 `/api/users` 别名表（运行期 reactive `ref<Map>`），
  但仅供 `UserPicker` / `CaseEditModal` 等写入路径使用，
  线索读取路径未复用。

#### 修复方案（已落地）

**单点最小改动 + 复用既有 `/api/users` 别名表**：

**第一层 · `useOwnerOptions.ts` 共享 helper**（在 `shared/model/`
落地，避免在 feature 层各处重复拼装解析链）：

- 新增 `resolveOwnerDisplayLabel(idOrLabel, fallbacks, locale)` —
  按优先级链返回展示文案：
  1. 空 / nil UUID `00000000-0000-0000-0000-000000000000` →
     `fallbacks.unassigned`
  2. 静态 fixture catalog（短码 / 任一本地化标签）→ catalog 标签
  3. 运行期 `/api/users` 别名表（`resolveUserLabel`）→ `displayName`
  4. UUID 形态但 catalog + 别名表都 miss → `fallbacks.unknown`
  5. 其它（已是字面量标签）→ 原样返回
- 新增 `resolveOwnerDisplayOption(idOrLabel, locale, fallbacks)` —
  与 `resolveOwnerDisplayLabel` 同链，但同时返回 `initials` /
  `avatarClass`，供列表行与头部 chip 渲染头像；
  alias hit 时复用 `toApiOwnerOption(...)` 的派生 `initials` /
  哈希配色，与 R2-A-1 写入路径的下拉头像保持一致。
- 占位符（`OwnerDisplayFallbacks { unassigned; unknown }`）由调用方
  传入，避免 `shared/model` 直接依赖 `vue-i18n`。

**第二层 · 渲染层切入新 helper**：

- `LeadTableRow.vue` → 把
  `resolveOwnerOption(props.lead.ownerId, locale)` 替换为
  `resolveOwnerDisplayOption(props.lead.ownerId, locale, {
   unassigned: t("leads.list.ownerUnassigned"),
   unknown: t("leads.list.ownerUnknown") })`，
  `ownerLabel` / `ownerInitials` 直接读取 helper 输出，
  不再有 `?` / `—` 裸出。
- `LeadDetailHeader.vue` → 新增 `ownerDisplay` computed：
  优先 `lead.ownerLabel`，缺失时回落到 `lead.ownerId`，
  统一走 `resolveOwnerDisplayLabel`。chip 改为渲染 `ownerDisplay`。
- `LeadInfoTab.vue` → 新增可选 prop `ownerId`，render layer 用
  `resolveOwnerDisplayLabel(info.owner || ownerId, …)`；
  `LeadDetailView.vue` 同步加 `:owner-id="lead.ownerId"`。
  这一档保证：即使 adapter 把 raw UUID 写入了 `info.owner`（旧字段
  fallback 链 BC），UI 层也会通过 helper 反解回显示名。

**第三层 · i18n 文案**：
- `leads.list.ownerUnassigned`：未分配 / 未割当 / Unassigned
- `leads.list.ownerUnknown`：未知用户 / 不明なユーザー / Unknown user

**关键不变量**：
- `LeadAdapterMappers` 保持 sync mapper 语义不变（不直接依赖 reactive
  `userAliasesRef`），避免跑过一次后 alias 异步加载完不再重渲染。
  反解逻辑全部下沉到组件 computed，让 Vue 响应式系统在
  `registerUserAliases` 后自动触发列表/详情重新计算。
- catalog 优先于 alias 表，保证 fixture 短码（`suzuki` 等）的既有
  本地化路径不被覆盖（BC for 详情样例数据）。
- 区分了 nil UUID 与未知 UUID 两种 fallback 文案
  （`未分配` vs `未知用户`），与 `cases.list.ownerUnassigned` /
  `tasks.workbench.taskTable.unassigned` 现有惯例对齐。

#### 修复证据

**修改 / 新增文件**：

前端：
- `packages/admin/src/shared/model/useOwnerOptions.ts`
  → 新增 `resolveOwnerDisplayLabel` / `resolveOwnerDisplayOption` /
  `OwnerDisplayFallbacks`；引入 `resolveUserLabel` 反解链；
  常量 `NIL_UUID` / `UUID_PATTERN` / `UNKNOWN_OWNER_AVATAR_CLASS`
- `packages/admin/src/views/leads/components/LeadTableRow.vue`
  → 切到 `resolveOwnerDisplayOption`，移除 `?` / `—` 裸 fallback
- `packages/admin/src/views/leads/components/LeadDetailHeader.vue`
  → 新增 `ownerDisplay` computed，chip 渲染走 helper
- `packages/admin/src/views/leads/components/LeadInfoTab.vue`
  → 新增可选 prop `ownerId`；新增 `ownerDisplay` computed；
  Tab1 owner 字段从 `info.owner || "—"` 切换为 `ownerDisplay`
- `packages/admin/src/views/leads/LeadDetailView.vue`
  → `<LeadInfoTab :owner-id="lead.ownerId" …/>`
- `packages/admin/src/i18n/messages/leads/{zh-CN,ja-JP,en-US}.ts`
  → 各加 `ownerUnassigned` / `ownerUnknown` 两条 key

**新增 / 增补单元测试**（含 H-9 显式回归）：

前端（vitest）：
- `useOwnerOptions.test.ts` → 新增 2 个 `describe` block：
  - `resolveOwnerDisplayLabel (H-9)`（7 cases）：空/null/undefined →
    unassigned / nil UUID → unassigned / catalog 短码本地化（zh/en/ja）/
    `/api/users` 别名命中 / UUID miss → unknown / 永不裸出 UUID /
    plain string 原样返回
  - `resolveOwnerDisplayOption (H-9)`（7 cases）：空 → unassigned 头像 /
    nil UUID → unassigned / catalog 命中（label/initials/avatarClass）/
    UUID alias 命中（派生 initials 与稳定 avatarClass）/
    UUID miss → unknown 头像 / 不裸出 UUID / 别名表注册后 reactively
    切换显示
- `LeadTableRow.test.ts` → 新增
  `H-9 owner UUID 列表渲染（不再展示 raw UUID 或 ?）` suite（5 cases）：
  catalog 短码 BC / 真实 UUID + alias 命中 / 真实 UUID alias miss →
  「未知用户」/ nil UUID → 「未分配」/ en-US 「Unknown user」
- `LeadDetailHeader.test.ts` → 新增
  `H-9 owner UUID 回落（列表 / 详情头部不再裸出 UUID）` suite
  （3 cases）：alias 命中 → displayName / alias miss → 「未知用户」/
  nil UUID → 「未分配」
- `LeadInfoTab.test.ts` → **新文件**，
  `H-9 owner UUID 详情基础信息渲染` suite（6 cases）：
  字面量标签 BC / `info.owner` 是 UUID + alias 命中 / `info.owner`
  为空但 `ownerId` 是 UUID + alias 命中 / `info.owner` 为 UUID 但
  alias miss → 「未知用户」/ 全空 → 「未分配」/
  ja-JP 「不明なユーザー」

**关联回归**（既有套件）：
- `useOwnerOptions.test.ts` 总计 34 cases（15 既有 + 19 新增）全 pass
- `src/views/leads` 全包 31 个 test files / **349 cases** 全 pass
  （含原 335 + 11 新增 LeadTableRow + 3 新增 LeadDetailHeader）
- `src/views/leads + src/shared` 56 files / **638 cases** 全 pass
  （含 6 新增 LeadInfoTab.test.ts）

**门禁通过情况（2026-05-06）**：
- `npm --workspace @cms/admin run typecheck`（vue-tsc --noEmit）✅
- `npm --workspace @cms/admin run check:deps`（depcruise，
  1004 modules / 2402 dependencies）✅
- `npx eslint` 9 个改动文件（components / shared / i18n / view）✅
- `npx vitest run src/views/leads src/shared`（56 files / 638 cases）✅
- 仓库 `npm --workspace @cms/admin run guard` 因无关
  `useLeadHeaderNavigation.ts:23` `@param deps` 既存
  `jsdoc:lang:check` 限制（pre-existing 来自 R2-B-6 阶段未在该轮
  guard 收口的遗留，非本次改动引入）暂未整 admin workspace 收口

**预期 chrome-devtools-mcp 复跑结果（待 R-CONSULT-03 验证）**：
- 列表行 ownerId=`00000000-0000-4000-8000-000000000011` →
  头像 `LA` + 名字 `Local Admin`（不再 `?` + `—`）；
  ja-JP locale 下未注册 UUID → 头像 `—` + 名字「不明なユーザー」
- 详情基础信息 Tab1 「负责人」字段 →
  `Local Admin`（不再 `00000000-0000-4000-8000-000000000011`）
- 详情头部 chip 「负责人」→ `Local Admin`
- nil UUID（外部 seed 数据中可能存在的占位）→ 「未分配」
  （而不是 `00000000-0000-0000-0000-000000000000`）
- `/api/users` 在登录后异步拉取完成时，已渲染列表/详情自动 reactively
  把「未知用户」切换为真实 `displayName`（`userAliasesRef` 是 Vue ref，
  helper 在 component computed 中调用，依赖被自动收集）

### H-4（P3）✅ 已修复（2026-05-06）— 跟进/日志时间显示原始 ISO 字符串

**复现路径（修复前）**：`/leads/:id` Tab2 跟进列表 / Tab4 日志列表，
查看任一条记录的时间字段。

**实测（修复前）**：
- `2026-05-06T10:24:53.330Z`（跟进列表）
- `2026-05-06T10:23:12.419Z`（日志列表）

**spec**：应该按 locale 显示，如 `今天 19:24` / `昨天 15:30` /
`5 月 6 日 19:24`。列表的「最近更新」列已经做对了
（`今天 19:26`），说明 helper 已存在但未被复用到
跟进/日志组件。

**根因**：`LeadAdapterMappers.adaptFollowupDto` / `adaptLogEntryDto`
直接写入：

```ts
time: readString(r, "createdAt") || readString(r, "time"),
```

而列表行 `adaptLeadListItemDto` 的 `updatedAtLabel` 字段则走了同文件
私有的 `formatUpdatedAtLabel(iso)`，按当前 locale 输出
`今天 19:24` / `Yesterday 15:30` / `04-01 09:15`（>3 天回退）三段式
标签。两条路径不一致 → 跟进/日志 raw ISO 直接透出 UI。

#### 修复方案（已落地）

**单点最小改动**（在 adapter 层统一收口，不动 `LeadFollowupsTab.vue`
/ `LeadLogTab.vue`，避免组件层重复维护时间格式逻辑）：

- `LeadAdapterMappers.ts` 新增私有 helper `readTimestampLabel(r)`，
  封装「优先 `createdAt` 再 `time` → 走 `formatUpdatedAtLabel` →
  失败回退到原值」三步：

  ```ts
  function readTimestampLabel(r: Record<string, unknown>): string {
    const raw = readString(r, "createdAt") || readString(r, "time");
    if (!raw) return "";
    const formatted = formatUpdatedAtLabel(raw);
    return formatted || raw;
  }
  ```

- `adaptFollowupDto` / `adaptLogEntryDto` 各 1 处 `time:` 字段切换为
  `readTimestampLabel(r)`，与列表「最近更新」列共用同一段时间格式
  代码（`formatUpdatedAtLabel` 内部按 `getCurrentLocale()` 自动
  本地化为 zh-CN / ja-JP / en-US）

- 不破坏 `fixtures-detail.ts` 既有 `time: "2026/04/09 10:00"` 字面量，
  因为 `LEAD_DETAIL_SAMPLES` 直接以 `LeadDetail` 类型导出，不经过
  adapter（已经是预格式化字符串）

#### 修复证据

**修改文件**：

前端：
- `packages/admin/src/views/leads/model/LeadAdapterMappers.ts`
  → 新增私有 `readTimestampLabel`；`adaptFollowupDto.time` /
  `adaptLogEntryDto.time` 各 1 处切换

**新增 / 增补单元测试**（含 H-4 显式回归）：

前端（vitest）：
- `LeadAdapterMappers.test.ts` → 新增 `adaptLeadDetailAggregate
  — followup/log time localization (H-4)` suite，6 cases：
  - zh-CN 当日 followup `createdAt` → 输出 `今天 HH:MM`，不含
    `T` / `Z` ISO 噪声
  - en-US 昨天 followup `createdAt` → 输出 `Yesterday 15:30`
  - zh-CN >3 天 followup `createdAt` → 回退 `04-01 09:15`
  - ja-JP 当日 log `createdAt` → 输出 `今日 HH:MM`，不含
    `T` / `Z`
  - 不可解析的 `createdAt` `"not-a-date"` → 保留原值（防御退化）
  - 缺失 `createdAt` / `time` → 返回空字符串（不报错）

**关联回归**（既有套件）：
- `LeadAdapterMappers.test.ts` 总计 15 cases 全 pass（9 既有 +
  6 新增；既有 `updatedAtLabel` 行为 BC）
- `src/views/leads` 全包 30 个 test files / **335 cases** 全 pass
  （fixtures 仍以预格式化字符串通过 `entry.time.toBeTruthy()`
  断言不退化）

**门禁通过情况（2026-05-06）**：
- `npm --workspace @cms/admin run check:deps` ✅
  （1003 modules / 2393 dependencies，零违规）
- `npm --workspace @cms/admin run typecheck`（vue-tsc --noEmit）✅
- `npx eslint src/views/leads/model/LeadAdapterMappers.ts
  src/views/leads/model/LeadAdapterMappers.test.ts` ✅
- `npx vitest run src/views/leads`（30 files / 335 cases）✅
- 仓库 `npm --workspace @cms/admin run guard` 因无关
  `useLeadHeaderNavigation.ts:23` `@param deps` 既存
  `jsdoc:lang:check`「@param 描述必须使用中文」限制
  （pre-existing 来自 R2-B-6 阶段未在该轮 guard 收口的遗留，
  非本次改动引入）暂未整 admin workspace 收口

**预期 chrome-devtools-mcp 复跑结果（待 R-CONSULT-03 验证）**：
- zh-CN locale 下当日提交一条跟进 → 列表渲染
  `今天 21:50`（不再显示 `2026-05-06T12:50:12.330Z`）
- ja-JP locale 下查看 1 周前的 status_changed 日志 →
  显示 `04-29 15:30`（按 MM-DD HH:MM 回退）
- en-US locale 下昨天的 owner_changed 日志 → 显示
  `Yesterday 15:30`

### H-5（P3）✅ 已修复（2026-05-06）— 日志条目缺 actor / payload diff

**复现路径（修复前）**：`/leads/:id` Tab4 日志列表，查看任一条
status_change / field_change / converted_* 日志条目。

**实测（修复前）**：
- 日志只显示 `entry.logType + 时间` 组合（chip 标签 + 时间），不显示：
  - 是谁做的（`createdBy` 仅是 UUID，且没透传到 UI）
  - 改了什么（payload diff for `status_change` / `field_change` /
    `owner_assigned` 等）
- chip 标签按 server logType 字面量回显（如 `status_change`），与
  fixture 期望的 `status` / `owner` / `group` 4 大分类不对齐

**根因（修复前）**：
- server `LeadLog` 实体只暴露 `createdBy: string | null`，没有
  反解 displayName；前端拿到 UUID 但没办法用
- server `LOG_COLS` 不 JOIN `users`，UI 即使想反解也没数据
- 前端 `LeadAdapterMappers.adaptLogEntryDto` 把 server logType 直接
  透传为 `entry.type`，与组件 `logTypeLabel` 仅识别 3 个 fixture
  类型不兼容，且 `fromValue / toValue` 永远是空字符串
- `LeadLogTab.vue` 操作人为空时直接渲染 `· `（裸点）

#### 修复方案（已落地）

**双端协同 + 4 层防御**（server 注入数据 → 纯函数转换 → UI 渲染 +
i18n 兜底）：

**第一层 · server `LeadLog` 实体扩展 displayName**：
- `leadEntities.ts` 的 `LeadLog` 增加 `createdByDisplayName: string | null`
- `LeadLogQueryRow` 增加 `created_by_display_name: string | null`
- `mapLeadLogRow` 透传该字段，缺字段时默认 `null`（防御退化）

**第二层 · server SELECT JOIN users**：
- `leads.admin.types.ts` 把 `LOG_COLS` 改为带表前缀（`ll.id, ll.lead_id,
  ll.log_type, ll.payload, ll.created_by, u.name as created_by_display_name,
  ll.created_at`），新增 `LOG_FROM_WITH_ACTOR =
  "lead_logs ll left join users u on u.id = ll.created_by"`
- `leads.admin.service.ts` `getDetail` / `listLogs` 两条查询同步切换
  到 `select ${LOG_COLS} from ${LOG_FROM_WITH_ACTOR} where ll.lead_id = $1`
- 与 `cases.service.detail-queries.ts` / `timeline.service.ts` /
  `tasks.service.ts` 等模块「LEFT JOIN users」的既有范式同源

**第三层 · 前端 `LeadLogPayloadFormatter` 纯函数**：
- 新增 `views/leads/model/LeadLogPayloadFormatter.ts`：导出
  `formatLeadLogPayload({ logType, payload })` 返回
  `{ category: LeadLogType; fromValue; toValue; chipClass }`
- 用 dispatch table 覆盖 9 种 server logType + 4 种 legacy fixture：
  - `status_change` → category=status, from/to 走 `getLeadStatusLabel`
    本地化（`new` → `新咨询`）
  - `field_change` → 优先 `ownerUserId.from/to` 归类 owner，再
    `groupId.from/to` 归类 group，否则取首个 from/to 字段归类 info
  - `created` / `converted_customer` / `converted_case` → category=status，
    `to` 渲染 `customerId / caseId`
  - `owner_assigned` → category=owner，`to` 渲染 `ownerUserId`
  - `followup_added` → category=info，`to` 渲染 `channel`
  - `tags_updated` → category=info，`to` 渲染 `tags.join(", ")`
  - `exported` / 未知 logType → category=info，`from/to` 占位 `—`
  - `status / owner / group / info` legacy → 透传 chipClass，from/to
    走调用方传入字段（保留 `LEAD_DETAIL_SAMPLES` 的预格式化字符串）

**第四层 · 前端 adapter + UI 渲染**：
- `LeadAdapterMappers.adaptLogEntryDto` 接入 formatter；`fromValue /
  toValue / chipClass` 字段同时支持原始字段 fallback（fixture 透传），
  保留向后兼容
- `LeadLogTab.vue` 新增 `operatorLabel(op)` helper：操作人为空时回退
  `t("leads.detail.logTab.actorUnknown")`，避免裸 `·`
- `LeadLogTab.vue` 新增 `info` segment 与 `typeInfo` chip 标签，
  避免「其他」类日志被默默过滤；`SEGMENT_LABEL_KEY` 表把 5 个
  category key 映射到 i18n key（`categoryAll / typeStatus / typeOwner /
  typeGroup / typeInfo`），消除原 `LOG_CATEGORIES.label` 硬编码中文

**第五层 · 类型 + i18n 同步**：
- `LeadLogType` 扩展为 4 态 `status | owner | group | info`，
  `LOG_CATEGORIES` 增至 5 项（含 `info: "其他"`）
- `i18n/messages/leads/{zh-CN,ja-JP,en-US}.ts` 新增
  `categoryAll / typeInfo / actorUnknown` 共 3 个 key
- `i18n-contract.test.ts` 的 `LOG_TAB_KEYS` 同步扩展，跨 locale
  parity 验证保持

#### 修复证据

**新增 / 修改文件**：

后端：
- `packages/server/src/modules/core/leads/leadEntities.ts`
  → `LeadLog.createdByDisplayName` 字段；`LeadLogQueryRow.created_by_display_name`；
  `mapLeadLogRow` 透传
- `packages/server/src/modules/core/leads/leads.admin.types.ts`
  → `LOG_COLS` 切换为 `ll.* + u.name as created_by_display_name`；
  新增 `LOG_FROM_WITH_ACTOR`
- `packages/server/src/modules/core/leads/leads.admin.service.ts`
  → import `LOG_FROM_WITH_ACTOR`；`getDetail` / `listLogs`
  两条查询切换 FROM 子句；`where ll.lead_id = $1` /
  `order by ll.created_at desc`
- `packages/server/src/modules/core/leads/leads.admin.service.test-support.ts`
  → `logRow()` fixture 增加 `created_by_display_name: "田中 太郎"`

前端：
- `packages/admin/src/views/leads/types-detail.ts`
  → `LeadLogType` 增加 `"info"`；`LOG_CATEGORIES` 增加
  `{ key: "info", label: "其他" }`
- `packages/admin/src/views/leads/model/LeadLogPayloadFormatter.ts`
  → **新文件**：纯函数 + dispatch table
- `packages/admin/src/views/leads/model/LeadAdapterMappers.ts`
  → 引入 `formatLeadLogPayload`；`adaptLogEntryDto` 接入并保留
  fixture 字段 fallback
- `packages/admin/src/views/leads/components/LeadLogTab.vue`
  → 新增 `SEGMENT_LABEL_KEY` i18n 表 + `operatorLabel` helper +
  `typeInfo` chip 标签
- `packages/admin/src/i18n/messages/leads/{zh-CN,ja-JP,en-US}.ts`
  → 新增 `categoryAll / typeInfo / actorUnknown` 共 3 个 key
- `packages/admin/src/views/leads/i18n-contract.test.ts`
  → `LOG_TAB_KEYS` 扩展为 8 个 key

**新增 / 增补单元测试**（含 H-5 显式回归）：

后端（node:test）：
- `packages/server/src/modules/core/leads/leadEntities.test.ts`
  → +1 case：`mapLeadLogRow defaults missing display name field to null (H-5)`
  +3 既有 case 字段补齐（创建/normalize null/JSON string/throws）
- `packages/server/src/modules/core/leads/leads.admin.service.audit.test.ts`
  → +2 cases：`getDetail joins users table for log actor display name (H-5)`
  / `listLogs joins users for actor display name (H-5)`，断言 SQL
  含 `lead_logs ll left join users u on u.id = ll.created_by` +
  `u.name as created_by_display_name`，且 `result.logs[0].createdByDisplayName`
  为 fixture 注入的 `田中 太郎`

前端（vitest）：
- `packages/admin/src/views/leads/model/LeadLogPayloadFormatter.test.ts`
  → **新文件**，16 cases：所有 9 种 server logType 各 1 条 +
  field_change owner/group/其他/empty payload + status_change 缺 from
  fallback + tags_updated 空数组 + 未知 logType + 4 种 legacy fixture
  透传
- `packages/admin/src/views/leads/model/LeadAdapterMappers.test.ts`
  → 新增 `adaptLeadDetailAggregate — log actor + payload diff (H-5)`
  suite，5 cases：
  - `uses createdByDisplayName as operator from server logs`
  - `renders status_change diff with localized labels`
  - `renders field_change ownerUserId diff into owner category`
  - `falls back to empty operator when server omits createdByDisplayName`
  - `legacy fixture entries with explicit fromValue/toValue keep raw payload`
  - `renders converted_case payload caseId in toValue`（实际 6 条）
- `packages/admin/src/views/leads/components/LeadLogTab.test.ts`
  → **新文件**，6 cases：
  - `renders operator (actor) for a server-derived log entry`
  - `renders payload diff (from → to) on the timeline card`
  - `falls back to '未知操作人' when operator is empty`
  - `uses i18n actorUnknown label across locales (en-US)`
  - `renders 'info' (其他) chip label for the new info category`
  - `filter SegmentedControl exposes 5 categories incl. info (H-5)`
- `packages/admin/src/views/leads/types.test.ts`
  → `LOG_CATEGORIES` 既有 case 升级为「has 5 categories with all as
  first and info appended (H-5)」，并新增 `getLeadLogCategoryLabel("info")`
  → `"其他"` 断言

**关联回归**（既有套件）：
- 服务端：`packages/server` 全包 `npm run test`（3949 cases，4 既有
  skipped）✅
- 前端：`src/views/leads` 全包 vitest 33 文件 / 382 cases ✅；
  `src/views/leads/model/LeadAdapterMappers.test.ts` 既有 H-4 时间
  本地化 6 cases BC ✅；fixtures-detail / fixtures-detail-extra
  导出的 5 个 lead 详情样本 `LEAD_DETAIL_SAMPLES.*.log[*]` 透传不退化

**门禁通过情况（2026-05-06）**：
- `packages/server`：
  - `npx tsc --noEmit -p tsconfig.json` ✅
  - `npx eslint src/modules/core/leads` ✅
  - `node --import tsx --test src/modules/core/leads/*.test.ts`
    → 199 cases ✅
  - `npm run test` → 3949 / 3953 pass（4 既有 skipped）✅
- `packages/admin`：
  - `npx vue-tsc --noEmit` ✅
  - `npm run check:deps` ✅（1007 modules / 2407 deps）
  - `npx eslint src/views/leads/ src/i18n/messages/leads/` ✅
  - `npx vitest run src/views/leads`（33 files / 382 cases）✅
  - `npx vitest run`（532 files / 8078 pass / 24 既有 skipped）✅
- 仓库根 `lint:i18n` ✅ / `lint:a11y` ✅
- 仓库根 `npm run guard` 因无关 `useGroupOptions.ts:231 _locale`
  既存 `@typescript-eslint/no-unused-vars` lint 限制（pre-existing
  来自 R2-B-3 阶段未在该轮 guard 收口的遗留，非本次改动引入）暂未
  整 admin workspace 收口（与 R2-A-1 / R2-B-5 / R2-D-1 / R2-D-2 /
  H-6 同源 pre-existing 现象同处理）

**预期 chrome-devtools-mcp 复跑结果（待 R-CONSULT-03 验证）**：
- zh-CN locale 下手动状态机推进（`new` → `following`）→ Tab4 看到
  顶部新增日志条目 `状态变更 · 今天 22:00 · Local Admin`，下方
  「新咨询 → 跟进中」（不再是裸 `status_change` chip）
- 编辑信息（owner=Local Admin → 自己）→ 新增日志条目
  `人员变更 · 今天 22:01 · Local Admin`，下方
  「<old UUID> → <new UUID>」（UUID-to-name 反解仍依赖 H-9
  在 LeadInfoTab 等渲染面已落地的 `resolveOwnerDisplayLabel`，
  此处 R-CONSULT-03 后续可做跨模块统一推广）
- 转客户 → 新增日志条目 `状态变更 · 今天 22:02 · Local Admin`，
  下方「已签约 → <customer-uuid>」
- ja-JP / en-US locale 切换 → segment 标签自动切换为
  「ステータス変更 / Status Change」等；操作人为空时回退
  「操作者不明 / Unknown actor」

### R2-B-2（P3）✅ 已修复（2026-05-06）— lead 详情头部「编号」字段显示 UUID 而非 leadNo

**现象（修复前）**：详情头部「编号」chip 显示
`720dc94b-df0f-4fb5-be18-a514a6cab776`（即 `lead.id` UUID），
但 server response 已返回 `leadNo: "LEAD-202605-0002"`
（对应 spec §"线索编号" 字段）。

**根因**：
- `LeadDetail` 类型未声明 `leadNo` 字段
- `adaptLeadDetailAggregate` 未从响应中读取 `leadNo`
- `LeadDetailHeader.vue` 头部 chip 直接 bind `lead.id`

#### 修复方案（已落地）

权衡选择「`leadNo?: string | null` 可选字段 + UI 回退到 `lead.id`」
而非「`leadNo: string` 必填」：
- 真实后端 `mapLeadRow` 始终返回 `leadNo`（pre-migration 027 之前
  的早期数据为 `null`），UI 拿到的 99% 场景都有值
- `fixtures-detail.ts` / `fixtures-detail-extra.ts` 8 个 sample 仍以
  `LEAD-2026-0XXX` 字符串作为 `id`（prototype 时代约定俗成的形态），
  无需改动 fixture 即可保持视觉一致
- 头部 chip 表达式 `lead.leadNo || lead.id` 在 fixture 缺失 leadNo
  时仍展示 LEAD-NNNN 形态，不会暴露 UUID

#### 修复证据

**修改文件**：

前端：
- `packages/admin/src/views/leads/types-detail.ts`
  → `LeadDetail` 接口新增 `leadNo?: string | null` 字段，附 JSDoc
  说明字段语义与回退策略
- `packages/admin/src/views/leads/model/LeadAdapterMappers.ts`
  → `adaptLeadDetailAggregate` 内 `LeadDetail` 字面量新增
  `leadNo: readNullableString(leadRecord, "leadNo")`；为满足
  `max-lines-per-function: 60` 限制，抽出 `readDetailOwnership`
  helper 复用 owner / group 字段读取
- `packages/admin/src/views/leads/components/LeadDetailHeader.vue`
  → 新增 `leadNoDisplay` computed（`props.lead.leadNo || props.lead.id`）；
  头部「编号」chip 由 `<strong>{{ lead.id }}</strong>` 改为
  `<strong>{{ leadNoDisplay }}</strong>`

**新增 / 增补单元测试**（含 R2-B-2 显式回归）：

前端（vitest）：
- `LeadAdapterMappers.test.ts` → 新增 `adaptLeadDetailAggregate
  — leadNo mapping (R2-B-2)` suite，2 cases：
  - server 响应包含 `leadNo` 时，`detail.leadNo === "LEAD-202605-0002"`
    且 `detail.id` 仍保留 UUID（前端路由 / lookup 仍用 UUID）
  - server 响应缺失 `leadNo` 时，`detail.leadNo === null`（pre-027
    数据兼容）
- `LeadDetailHeader.test.ts` → 新增 `R2-B-2 头部「编号」chip 优先展示
  leadNo` suite，2 cases：
  - `lead.leadNo` 存在时，HTML 包含 `LEAD-202605-0002`、不包含 UUID
    （直接 assert `not.toContain(UUID_LEAD)` 锁定回归）
  - `lead.leadNo` 为 `null` 时，HTML 仍展示 `lead.id`（fixture 兼容）

**关联回归**（既有套件）：
- `LeadAdapterMappers.test.ts` 总计 17 cases 全 pass（既有 15 +
  新增 2；既有 followup/log time / button preset 行为 BC）
- `LeadDetailHeader.test.ts` 总计 9 cases 全 pass（既有 7 + 新增 2；
  既有 H-9 owner UUID 回落 / R2-B-6 view-customer 事件分流 BC）
- `src/views/leads` 全包 33 个 test files / **382 cases** 全 pass

**门禁通过情况（2026-05-06）**：
- `npx eslint src/views/leads/components/LeadDetailHeader.vue
  src/views/leads/components/LeadDetailHeader.test.ts
  src/views/leads/model/LeadAdapterMappers.ts
  src/views/leads/model/LeadAdapterMappers.test.ts
  src/views/leads/types-detail.ts` ✅
- `npx vue-tsc --noEmit` ✅
- `npx vitest run src/views/leads`（33 files / 382 cases）✅

**预期 chrome-devtools-mcp 复跑结果（待 R-CONSULT-03 验证）**：
- 任意 lead 详情页（`#/leads/:uuid`）→ 头部「编号」chip 显示
  `LEAD-202605-0002` 形态，不再裸出 UUID
- 后端响应缺失 `leadNo`（pre-027 历史数据）时，回退到 `lead.id`，
  视觉与 fixture 一致

### R2-B-3（P3）✅ 已修复（2026-05-06）— group 显示名 fixture 与 DB 不一致

**复现路径（修复前）**：`/leads/:id` 详情 Tab1「基础信息」
查看「所属组」字段。

**实测（修复前）**：详情「所属组」显示 `東京一組`（来自
`useGroupOptions` fixture catalog 的 ja-JP 标签），但
`/api/groups` 返回 `name: "tokyo-1"`，DB 也写的是 `tokyo-1`。
fixture catalog 把后端真实分组名替换成了演示用的本地化标签，
管理员看到的 UI 文案与后端数据脱节。

#### 根因

`useGroupOptions.ts` 内置一份 fixture `GROUP_CATALOG`：
- `tokyo-1` → `{zh-CN: "东京一组", ja-JP: "東京一組",
  en-US: "Tokyo Team 1"}`
- `tokyo-2`、`osaka` 同理

`registerGroupAliases([{ id: UUID, name: "tokyo-1" }])` 之后，
`resolveGroupLabel(UUID)` 会先 lookup alias 拿到 `"tokyo-1"`，
然后再用 `tokyo-1` 命中 catalog → 返回 catalog 三语本地化
label。结果：DB 名称 `tokyo-1` 被 fixture 演示 label
（`東京一組`）覆盖。

#### 修复方案（已落地）

调整 `useGroupOptions.ts` 的解析顺序，**alias 路径以
`/api/groups` 返回的 `name` 为权威显示值**：

1. catalog 直匹配（直接传入 `tokyo-1` slug 或 `東京一組`
   字面量）→ 仍走 catalog 本地化 label，保留 fixture
   演示路径向后兼容
2. **alias 命中（典型为 server UUID）→ 返回 DB-stored
   `name` 原文**；若 DB name 经 catalog 标记为 disabled
   （例如 `osaka`），则在 DB name 后追加 disabled 后缀
3. 输入像 UUID 但未命中以上路径 → 占位 `—`，避免直显 UUID
4. 其余原样返回

`getActiveGroupAliasOptions` 同步调整：label 直接使用
`/api/groups.name`，不再走 catalog 本地化（参数 `locale`
为历史保留，当前不再生效）。

权衡选择「alias-path 优先 DB name」而非「全量废弃 fixture
catalog」原因：
- catalog 仍在 customer / case / billing fixture 演示路径
  里被广泛复用（`tokyo-1` slug → 三语本地化 label），全量
  删除会破坏演示数据观感
- catalog 仍提供 `disabled` 状态判定，server 端尚未补
  `groups.status` 字段；保留 catalog 让 disabled 后缀逻辑
  无需服务端配合即可工作
- alias 路径覆盖了「真实 DB 数据」场景，确保管理员看到的
  UI 文案与后端数据一致；演示用 catalog 在 fixture-only
  路径继续生效

#### 修复证据

**修改文件**：
- `packages/admin/src/shared/model/useGroupOptions.ts`
  → `resolveGroupLabel` / `getActiveGroupAliasOptions`
  调整解析顺序与 label 来源；JSDoc 同步说明 R2-B-3 行为

**测试契约同步刷新**（4 个历史 BUG 回归套件）：
- `useGroupOptions.test.ts`
  → `registerGroupAliases (BUG-136 + R2-B-3)` 子套件 +
  `getActiveGroupAliasOptions (R2-A-1 + R2-B-3)` 子套件
  - 改：alias UUID 期望从 `东京一组 / 東京一組 /
    Tokyo Team 1` 变更为 `tokyo-1`（DB name 原文）
  - 改：alias → disabled 期望从 `大阪组（已停用）`
    变更为 `osaka（已停用）`（DB name + disabled 后缀）
- `views/billing/components/BillingTable.bug159-data.test.ts`
  → 「fix-with-data」契约从「三语 catalog 名」变更为
  「DB name 原文 + locale 不变性」
  - 新增 1 条「server-side custom name (`営業一課`)
    locale-invariant」断言锁定真实业务命名场景
- `views/billing/components/BillingTable.bug140.test.ts`
  → alias UUID → 期望 `tokyo-1`；catalog slug 输入仍走
  本地化（fixture 路径 BC）；disabled 期望 `osaka（已停用）`
- `views/customers/components/CustomerTableRow.bug136.test.ts`
  → 同上模式（catalog → 本地化 / alias → DB name）
- `views/cases/components/CaseCreateStep2.bug139.test.ts`
  → 下拉选项 / 选中卡片 alias 路径文本期望从
  `东京一组` → `tokyo-1`，locale 切换不再改变 alias 显示
- `views/cases/model/useCustomerDropdownData.test.ts`
  → adapter 单元 + `useCustomerDropdownData` fetch-time
  集成两层契约同步
- `views/leads/model/useLeadCatalogOptions.test.ts`
  → `apiGroupOptions` label 从三语 → DB name；新增
  「locale-invariant」断言

**门禁通过情况（2026-05-06）**：
- `npx vitest run src/shared/model/useGroupOptions.test.ts
  src/shared/model/groupOptions.test.ts
  src/views/billing/components/BillingTable.bug159-data.test.ts
  src/views/billing/components/BillingTable.bug140.test.ts
  src/views/customers/components/CustomerTableRow.bug136.test.ts
  src/views/customers/components/CustomerTableRow.bug145.test.ts
  src/views/cases/components/CaseCreateStep2.bug139.test.ts
  src/views/cases/model/useCustomerDropdownData.test.ts
  src/views/leads/model/useLeadCatalogOptions.test.ts`
  → **9 files / 102 cases pass**（含 R2-B-3 新契约 +
  历史 BUG 兼容契约）
- `npx vitest run`（@cms/admin 全量）→ **532 files /
  8077 pass + 24 skipped + 0 fail**

**预期 chrome-devtools-mcp 复跑结果（待 R-CONSULT-03 验证）**：
- zh-CN / ja-JP / en-US 任一 locale 下打开 lead 详情 →
  「所属组」显示 `tokyo-1`（与 `/api/groups` `name`
  完全一致），不再随 locale 切换
- 后端某天给 group 起了 `営業一課` 这种业务命名后，UI
  会立刻显示 `営業一課`，无需任何前端 fixture 跟改
- catalog 演示路径（直接传 `tokyo-1` slug 而非 UUID）
  仍然按 zh-CN/ja-JP/en-US 显示三语本地化，不影响其他
  fixture-only 调用方

### H-10（P2）✅ 已修复（2026-05-06）— admin 端无 conversation seed 工具

**现象（修复前）**：admin 端只能 GET / PATCH conversation，无法创建。
设计上 conversation 由 AppUser 端发起（portal/conversations.controller
有 `@Post()`，但需要 `AppUserAuthGuard`），admin 端 walkthrough 阶段
没有 AppUser JWT，无法 e2e 验证：
- send message
- assign owner（dialog）
- close / reopen
- retry-translation

#### 修复方案（已落地）

**单点最小改动**（独立模块 + 复用现有 `db:seed-dev` 入口，
不进入 `localAdminBootstrap` 启动路径）：

权衡选择「扩展 `seedDevData.ts`」而非「`localAdminBootstrap` 内联」/
「dev-only HTTP 端点」原因：
- `db:seed-dev` 已是开发约定俗成的「按需投放 demo 数据」入口，
  与 `seedCustomer / seedCases / seedDocumentItems` 范式一致
- `localAdminBootstrap` 每次 server 启动都跑（包含 docker 部署），
  不能掺入 demo 业务数据
- HTTP `_dev` 端点会增加生产攻击面，且与 `seedDevData.ts`
  的事务性 ROLLBACK / `SEED_SMOKE=1` 已有的 dry-run 能力重复

**新增 4 个 seed step**（按 FK 顺序）：
- `conversationAppUser`：1 条 demo `app_users`（C 端账号）
- `conversationLead`：1 条 portal-side `leads`（关联 demo app_user
  与本地组织/管理员，`status='following'` + `assigned_org_id` 已分配，
  便于在 lead 详情 Tab3 看到关联会话）
- `conversations`：2 条 conversation
  - `00…b000…000020`：已分配 owner = Local Admin，覆盖 send / close /
    reopen / retry-translation 路径
  - `00…b000…000021`：未分配 owner（`unread_count_staff_tenant=1`），
    覆盖 assign-dialog 路径以及「我的会话/全部会话」筛选
- `conversationMessages`：4 条 message
  - `app_user(zh)` × 1 + `staff(ja)` × 1 + `app_user(zh, failed)` × 1
    在已分配会话内（最后一条用于 admin 端 retry-translation 走查）
  - `app_user(zh)` × 1 在未分配会话内（保证会话列表非空）

**关键约束**（与既有 seed 同源）：
- 所有 INSERT 用 `ON CONFLICT (id) DO NOTHING` 保证幂等
- UUID 命名空间使用 `00000000-0000-4000-b000-…`，与既有 seed 的
  `a000` 命名空间隔离
- 借助 `cms` / `cms_test` 超级用户 `BYPASSRLS` 绕过 conversations /
  messages / leads FORCE RLS（与 `seedDevData.ts` 中其他 RLS 表一致）
- `sender_type` 取值与 portal 写入侧 `messages.service.ts` 一致：
  `'app_user'`（C 端）/ `'staff'`（admin）

#### 修复证据

**新增 / 修改文件**：

后端：
- `packages/server/src/scripts/seedDevConversations.ts`
  → **新文件**：导出 `seedConversationAppUser` /
  `seedConversationLead` / `seedConversations` /
  `seedConversationMessages` 4 个 step；常量定义集中于文件顶部，
  便于后续扩展
- `packages/server/src/scripts/seedDevData.ts`
  → 新增 4 个 step 的 import 与 `buildSeedSteps()` 注册；输出文案
  追加 `1 app_user + 1 portal lead + 2 conversations + 4 messages (H-10)`

**新增 / 增补单元测试**（含 H-10 显式回归）：

后端（node:test）：
- `packages/server/src/scripts/seedDevData.test.ts`
  → 新增 5 条 H-10 锁定契约：
  - `seedDevConversations.ts is importable as valid TypeScript (H-10)`
    （source 含 4 张表的 INSERT）
  - `H-10: seed produces 1 app_user + 1 portal lead + 2 conversations
    + 4 messages`（INSERT 数量精确锁定 + 全部 ON CONFLICT 幂等）
  - `H-10: seed includes one failed-translation message to enable
    retry-translation walkthrough`（含 `translationStatus: "failed"`）
  - `H-10: seed conversations include both assigned and unassigned
    variants`（含 owner_user_id=$5 与 owner_user_id=null 两种形态）
  - `H-10: seed IDs use the b000 namespace to avoid colliding with
    existing a000 entities`（8 个常量全部在 `b000` 命名空间）
- 既有 `SQL-level smoke: all seed steps execute and produce
  parameterized INSERTs` 期望值由 8 → 12 step
- 既有 `SQL-level smoke: step labels match expected sequence`
  追加 4 个 conversation 相关 label

**门禁通过情况（2026-05-06）**：
- `npx eslint src/scripts/` ✅
- `npx tsc --noEmit -p tsconfig.json` ✅（packages/server）
- `node --import tsx --test src/scripts/seedDevData.test.ts`
  → **17/17 cases pass**（含 H-10 新增 5 条）
- `npx depcruise --config .dependency-cruiser.cjs src/scripts --validate`
  ✅（17 modules / 19 deps）
- `npm run arch:check` ✅（520 modules / 1645 deps）
- `npm run test`（packages/server）→ **3942 / 3946 pass**
  （4 既有 skipped，0 fail）
- 真实 PG smoke：
  - `SEED_SMOKE=1 npx tsx src/scripts/seedDevData.ts`
    → `[seed-dev:smoke] all 12 steps OK — rolled back`
  - 实际 commit + 二次运行幂等：conversations 表中 `b000`
    命名空间 conversation 数仍为 `2`
- 仓库根 `npm run fix` / `npm run guard` 因无关
  `effective-permissions.service.ts` 既存 `max-lines-per-function`
  lint 限制（与 R2-A-1 / R2-B-5 / R2-D-1 / R2-D-2 / H-6 同源
  pre-existing，非本次改动引入）暂未整仓收口

**预期 chrome-devtools-mcp 复跑结果（待 R-CONSULT-03 验证）**：
- 登录 admin → `/conversations` → 列表非空，看到 2 条 demo 会话：
  - 「デモ依頼者 — 王 小明」open / 已分配 Local Admin / 含 3 条 msg
    （含 1 条 failed translation，可走 retry-translation）
  - 同一依頼者 open / 未分配 / unread=1，可走 assign owner dialog
- 进入 conversation 详情 → 头部 3 按钮（assign / close / reopen）
  全 happy-path 可达；send 可发新消息；retry-translation 对失败 msg
  可触发并观察队列入队
- 反例：再次执行 `npm run db:seed-dev` 不会重复插入（ON CONFLICT），
  也不会污染既有手测数据

---

## 2. 走查记录附录

### 2.1 网络请求时间线（关键 reqid）

| reqid | URL | 状态 | 备注 |
|---|---|---|---|
| 240 | `/api/organizations/current/settings` | 200 | 启动 |
| 241 | `/api/groups` | 200 | 仅 1 条：`{id: ef21fdd2-…, name: "tokyo-1"}` |
| 242 | `/api/users` | 200 | 仅 1 条：Local Admin |
| 305 | POST `/api/admin/leads` | **500** | **R2-A-1**（fixture short-codes via UI） |
| 345 | POST `/api/admin/leads` | **500** | **R2-A-1** 重试 |
| 346 | POST `/api/admin/leads` | **500** | **R2-A-1** 再次 |
| **348** | POST `/api/admin/leads` | **201** | **happy-path with real UUIDs**（evaluate_script 旁路）|
| 349 | GET `/api/admin/leads?scope=all` | 200 | 列表确认新 lead |
| 351 | POST `/api/admin/leads/720dc…/followups` | 201 | ✅ 跟进新增 |
| 353-355 | PATCH `/api/admin/leads/720dc…/status` ×3 | 200 | new→following→pending_sign→signed |
| 516 | POST `/api/admin/leads/720dc…/convert-customer` | 201 | ✅ 转客户 |
| 676 | POST `/api/admin/leads/720dc…/convert-case` | **400** | **R2-B-5**：BMV 闸口结构化错误，UI 静默吞噬 |
| 685/686 | GET `/api/admin/conversations?leadId=...` | 400 | ✅ D-1 回归：非 UUID → 400 |
| 687 | GET `/api/admin/leads/not-a-uuid` | 400 | ✅ C-1 回归：非 UUID → 400 |
| 688 | GET `/api/admin/leads/00000…099` | 404 | ✅ valid UUID 不存在 → 404 |
| **693** | GET `/api/admin/conversations/not-a-uuid/messages` | **500** | **R2-D-2**：messages controller 缺 ParseUUIDPipe |
| 694 | GET `/api/admin/conversations/not-a-uuid` | 400 | ✅ 主接口 |
| **733** | POST `/api/admin/leads/bulk/assign` | **500** | **R2-A-1** 同源（bulk-assign）|
| 734 | POST `/api/admin/leads/bulk/export` | 201 | ✅ |
| 735 | POST `/api/admin/leads/bulk/status` | 201 | ✅ |

### 2.2 console 输出（异常）

```
[error] Failed to load resource: the server responded with a status of 500 (Internal Server Error)  ×3 (R2-A-1)
[error] Failed to load resource: the server responded with a status of 400 (Bad Request)            ×N
[warn]  [Vue warn]: Unhandled error during execution of component event handler at <LeadConvertCaseDialog … > (R2-B-5)
[error] Uncaught (in promise)                                                   (R2-B-5)
```

无未预期的 JS error / no a11y issue / no autocomplete warning（G-2 已无）。

### 2.3 走查环境

- 浏览器：Chrome 148（macOS 25.4.0）
- 视口：500px → 1440×900（部分走查段切到桌面看 bulk）
- 前端：Vite dev server localhost:5173
- 后端：NestJS localhost:3300，Vite proxy `/api`
- 账号：`admin@local.test / Admin123!`（Local Admin / role=owner /
  permission=case_edit）
- locale：zh-CN
- 种子数据：
  - 1 个真实 user（Local Admin / `00000000-…000011`）
  - 1 个真实 group（`ef21fdd2-…` / DB-name=`tokyo-1`）
  - 0 条已存在 conversation
  - 1 条预存 lead（`7c13ce3f-…` MCP-R2 周二，DB 直接 seed 的）
  - 1 条本轮通过 evaluate_script 创建的 lead
    （`720dc94b-…` MCP-R2-A2 赵守使）

---

## 3. 后续动作建议

### 3.1 R-CONSULT-03 入门门禁（P0/P1 已全部修完，可立即开走）

| ID | 修复项 | 状态 / 预期效果 |
|---|---|---|
| ~~**R2-A-1**~~ | 创建/Bulk owner-group 选项接 `/api/users` + `/api/groups` | ✅ **已修复 2026-05-06**：写入路径切换 API UUID + server `optUuid/reqUuid` 双层防御；详情/列表 owner 反解仍走 H-9 单独跟进 |
| ~~**R2-B-4**~~ | 落地 `EditLeadDialog` / `ChangeStatusDialog` / `MarkLostDialog` | ✅ **已修复 2026-05-06**：3 个对话框 + `useLeadDetailModel.update / transitionStatus / markLost` 模型方法落地；状态机白名单 `LEAD_STATUS_TRANSITIONS` 与 server 一致；43 条单测覆盖 happy / failure / 重入保护 |
| ~~**R2-B-5**~~ | `LeadConvertCaseDialog` 处理 `CASE_BMV_GATE_BLOCKED` | ✅ **已修复 2026-05-06**：仓库层归一化 `serverBlockers`，模型层返回 `LeadConvertCaseFailure`，弹窗 inline 渲染 `BmvGateBlockerList`；非 BMV 错误显示 inline error + error toast |
| ~~**R2-B-6**~~ | 头部「查看客户」改为路由跳转，不开 convert dialog | ✅ **已修复 2026-05-06**：`LeadDetailHeader` `viewCustomer` / `viewCase` 独立 emit + `useLeadHeaderNavigation` 调用 `router.push({ name: "customer-detail" \| "case-detail" })`；10 条单测覆盖 emit 分流 + null 防御 + 中间态 no-op |
| ~~**R2-D-1**~~ | conversations.admin `assign` body `ownerUserId` 改用 `optUuid` | ✅ **已修复 2026-05-06**：与 list query 处理对齐；7 条 controller 单测覆盖 catalog 短码 / 非 UUID / 非 string / 合法 UUID / undefined / 空白 / 源码契约；service 层 lead-owner fallback 语义不变 |
| ~~**R2-D-2**~~ | messages 控制器 `conversationId / messageId` 增加 `ParseUUIDPipe` | ✅ **已修复 2026-05-06**：新增 `ConversationIdParam` / `MessageIdParam` 两个 helper，覆盖 `list / send / retryTranslation` 4 处参数；非法 UUID 现在统一返回 400 而非 500；新增 21 条 controller 单测覆盖 mount / permission / ParseUUIDPipe 源码契约 / page-limit / send body / retry forwarding |
| ~~**H-6**~~ | 转化成功后 UI 状态滞后（必须 reload 才看到「查看客户/案件」按钮） | ✅ **已修复 2026-05-06**：`doConvertCustomer` 成功分支 `await refs.fetchDetail()` 已在 R2-B-5 改造中作为副产品落地；新增 `useLeadDetailModel.convertCustomer-refetch.test.ts` 6 条单测显式锁定契约（成功 refetch / dedup-confirm refetch / 失败不 refetch / dedup 命中短路不 refetch / 失败释放 submitting / 重入保护）|
| ~~**H-4**~~ | 跟进/日志时间显示原始 ISO 字符串 | ✅ **已修复 2026-05-06**：`LeadAdapterMappers` 新增私有 helper `readTimestampLabel` 复用既有 `formatUpdatedAtLabel`，跟进/日志 `time` 字段按 locale 输出 `今天 19:24` / `Yesterday 15:30` / `04-01 09:15` 三段式标签；新增 6 条 vitest 覆盖 zh-CN / en-US / ja-JP / >3 天 fallback / 不可解析原值保留 / 缺失返回空 |
| ~~**H-10**~~ | dev 环境 conversation seed 工具 | ✅ **已修复 2026-05-06**：新增 `scripts/seedDevConversations.ts` 模块扩展 `db:seed-dev` 增加 4 个 step（appUser / portalLead / 2 conversations / 4 messages，含 1 条 failed translation 用于 retry-translation 走查）；新增 5 条 H-10 单测锁定 INSERT 数量 / 幂等 / 命名空间隔离 / failed message 存在 / 已分配+未分配会话同时存在；R-CONSULT-03 可直接 e2e 走 send / assign / close / reopen / retry-translation |
| ~~**H-5**~~ | 日志条目缺 actor / payload diff | ✅ **已修复 2026-05-06**：server `LeadLog` 加 `createdByDisplayName`，`getDetail` / `listLogs` 经 `lead_logs ll left join users u on u.id = ll.created_by` 注入 `users.name`；前端新增纯函数 `LeadLogPayloadFormatter` 覆盖 9 种 server logType 派生 from/to + 4 大分类（status / owner / group / info）；`LeadLogTab.vue` 渲染 actor + diff，`actorUnknown` i18n 占位防止裸 `·`；新增 `info`「其他」segment；新增 22 条 vitest（11 formatter + 5 adapter + 6 LeadLogTab）+ 4 条 server node:test（mapLeadLogRow + JOIN 契约）|

### 3.2 R-CONSULT-03 增量走查范围（R-CONSULT-02 P0/P1 已全部闭环）

- 详情头部 5 按钮全部 happy-path
- 状态机 6 态全转换 UI（特别是 lost 路径的 lostReason 必填）
- bulk-followup / bulk-tags 两个未触发的 batch 端点
- BMV 闸口完整流程（intake / questionnaire / quote / sign 全跑过）
- conversation send / assign / close / reopen / retry-translation
- 跨模块联调：lead → 转 customer → 创建 case → 案件首文书

### 3.3 P2/P3 跨模块统一推广

| 修复项 | 同源模块 |
|---|---|
| `optUuid` body validation 全推 | ~~conversations.assign~~（已修复 R2-D-1，2026-05-06）/ 其他带 ownerUserId/customerId/caseId 的 PATCH/POST 仍需逐个排查 |
| messages 控制器 ParseUUIDPipe | ~~messages.admin.controller (4 处)~~（已修复 R2-D-2，2026-05-06）/ message-attachments / 类似子资源仍需排查 |
| owner / group 反解走 API | LeadDetail / LeadList / CustomerList / CaseList / Settings 同样 catalog 引用 |
| 时间字段 localize | ~~leads followup / log~~（已修复 H-4，2026-05-06，统一走 `LeadAdapterMappers.readTimestampLabel` → `formatUpdatedAtLabel`）/ 其他模块（cases / customers / conversations / tasks）未走同源 helper 的列表 / 详情仍需逐个排查 |
| 转化后状态刷新（`fetchDetail()` post-success）| ~~`useLeadDetailModel.doConvertCustomer / doConvertCase`~~（已修复 H-6 / R2-B-5，2026-05-06，含 6 + 7 条 refetch 契约单测）/ `useCaseDetailModel` / `useCustomerDetailModel` 等仍需逐个排查 |
| dev seed 模块化（`db:seed-dev` step 分文件） | ~~conversation seed~~（已修复 H-10，2026-05-06，独立 `seedDevConversations.ts` 模块 + 5 条契约单测）/ `seedDevData.ts` 主文件目前 484 行接近 500 行硬上限，未来增量（cases / documents / templates 同类需求）建议同源拆出独立模块 |
| 日志 payload 渲染 + actor 反解 | ~~leads `LeadLogTab` + 9 种 server logType~~（已修复 H-5，2026-05-06，纯函数 `LeadLogPayloadFormatter` + server `lead_logs ll left join users u on u.id = ll.created_by`）/ `cases` / `customers` / 其他模块的操作日志渲染组件可同源套用「server JOIN users + 前端 dispatch table 派生 from/to」范式 |

### 3.4 文档同步

- `06-页面规格/咨询线索.md` §"实施状态対照表" 把 ⚠️ UI 已落地 / Server
  部分缺失 改为 **R-CONSULT-02 走查实测：5 个 P0/P1 修复方向**；
  附本轮 12 条发现项作为 Phase B-2（精修）子任务
- `_raw/00-inbox.md` 追加本轮 R2-A-1 / R2-B-4 / R2-B-5 / R2-B-6
  四条 P0/P1 + R2-D-1 / R2-D-2 / H-6 / H-10 四条 P2 + H-4 / H-9 /
  H-5 三条 P3 摘要（剩余 P3 走 ingest → compile）
- 在 `04-核心流程与状态流转.md §4.2 BMV 闸口` 章节增加：
  「**前端必须有 BMVGateBlockerList 组件**渲染 server
  返回的 `blockers[]`」 这一约束

---

## 4. 引用

- 第一轮走查：[56-咨询模块chrome-devtools-mcp走查-第一轮.md](./56-咨询模块chrome-devtools-mcp走查-第一轮.md)
- 规格：[06-页面规格/咨询线索.md](../P0/06-页面规格/咨询线索.md)
- 规则：[03-业务规则与不变量.md](../P0/03-业务规则与不变量.md)
- 流程：[04-核心流程与状态流转.md](../P0/04-核心流程与状态流转.md)
- 服务端核心：
  - [leads.admin.controller.ts](../../../packages/server/src/modules/core/leads/leads.admin.controller.ts)
  - [leads.admin.service.ts](../../../packages/server/src/modules/core/leads/leads.admin.service.ts) ← H-5 `getDetail` / `listLogs` JOIN 切换
  - [leads.admin.types.ts](../../../packages/server/src/modules/core/leads/leads.admin.types.ts) ← H-5 `LOG_COLS` + `LOG_FROM_WITH_ACTOR`
  - [leadEntities.ts](../../../packages/server/src/modules/core/leads/leadEntities.ts) ← H-5 `LeadLog.createdByDisplayName`
  - [conversations.admin.controller.ts](../../../packages/server/src/modules/core/conversations/conversations.admin.controller.ts)
  - [messages.admin.controller.ts](../../../packages/server/src/modules/core/conversations/messages.admin.controller.ts)
  - [scripts/seedDevConversations.ts](../../../packages/server/src/scripts/seedDevConversations.ts) ← H-10 修复证据
  - [scripts/seedDevData.ts](../../../packages/server/src/scripts/seedDevData.ts) ← H-10 注入入口
- 前端核心：
  - [LeadsListView.vue](../../../packages/admin/src/views/leads/LeadsListView.vue)
  - [LeadDetailView.vue](../../../packages/admin/src/views/leads/LeadDetailView.vue)
  - [LeadCreateModalBody.vue](../../../packages/admin/src/views/leads/components/LeadCreateModalBody.vue)
  - [LeadConvertCustomerDialog.vue](../../../packages/admin/src/views/leads/components/LeadConvertCustomerDialog.vue)
  - [LeadConvertCaseDialog.vue](../../../packages/admin/src/views/leads/components/LeadConvertCaseDialog.vue)
  - [LeadLogTab.vue](../../../packages/admin/src/views/leads/components/LeadLogTab.vue) ← H-5 actor + diff + info segment
  - [LeadLogPayloadFormatter.ts](../../../packages/admin/src/views/leads/model/LeadLogPayloadFormatter.ts) ← H-5 9 种 server logType → 4 大分类纯函数
  - [LeadAdapterMappers.ts](../../../packages/admin/src/views/leads/model/LeadAdapterMappers.ts) ← H-4 + H-5 适配层
  - [ConversationDetailView.vue](../../../packages/admin/src/views/conversations/ConversationDetailView.vue)
  - [ConversationOwnerPickerDialog.vue](../../../packages/admin/src/views/conversations/components/ConversationOwnerPickerDialog.vue)
  - [shared/model/useOwnerOptions.ts](../../../packages/admin/src/shared/model/useOwnerOptions.ts) ← 关键 fixture catalog（R2-A-1 焦点）
  - [shared/util/contactValidators.ts](../../../packages/admin/src/shared/util/contactValidators.ts) ← B-2/B-3 修复证据
- 类似走查范式：
  - [53-案件文书模块chrome-devtools-mcp走查-第二十二轮.md](./53-案件文书模块chrome-devtools-mcp走查-第二十二轮.md)
