# 咨询模块 chrome-devtools-mcp 走查（第五轮 / R-CONSULT-05）

> 生成日期：2026-05-07
>
> 命题：在 R4 已修条目（R4-A-1 列表 tags chip 列与过滤、R4-A-2
> 详情线索编号、R4-A-3 来源字段、R4-D-2 发送字段名、R4-E-2 所属组
> dropdown、R4-F-1 dedup 排除自身）已落地的基础上，做一轮端到端
> 回归 + 端到端走查；重点覆盖：
>
> ① R4 修复后是否真正走通会话主路径（读消息 / 发消息 / 关闭重开）；
> ② lead 详情「会话」Tab 是否回填该 lead 关联的 conversations；
> ③ R3-F-1 / R3-F-2 bulk-tags 持久化 + UI toast + 列表 refetch
>     是否端到端闭环；
> ④ convert-customer / convert-case auto-chain 错误结构化是否
>     真到了 dialog；
> ⑤ admin 端 messages bubble 正文是否随 server payload 字段渲染。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot /
> click / fill_form / type_text / press_key / wait_for / evaluate_script /
> list_network_requests / list_console_messages / take_screenshot）+
> 直连 PG 校验真实持久化与 audit。
>
> 数据集：Local Demo Office（admin@local.test / Admin123!），含
> R4 走查留下的 `4 leads / 2 conversations / 7 messages`，本轮新增
> `1 admin happy-path send via UI` + `1 bulk-tags happy-path` →
> 末态 `4 leads / 2 conversations / 8 messages`，demo lead tags 由
> 5 个增长到 6 个，signed lead 8a7b 由 0 个增长到 1 个。
>
> 上游权威：
>
> - [P0/06-页面规格/咨询线索.md](../P0/06-页面规格/咨询线索.md)
> - [P0/03-业务规则与不变量.md §2.1 / §2.2 / §2.6 / §3.6](../P0/03-业务规则与不变量.md)
> - [P0/04-核心流程与状态流转.md §4.1 咨询转案件](../P0/04-核心流程与状态流转.md)
> - [56-咨询模块chrome-devtools-mcp走查-第一轮.md](./56-咨询模块chrome-devtools-mcp走查-第一轮.md)
> - [57-咨询模块chrome-devtools-mcp走查-第二轮.md](./57-咨询模块chrome-devtools-mcp走查-第二轮.md)
> - [58-咨询模块chrome-devtools-mcp走查-第三轮.md](./58-咨询模块chrome-devtools-mcp走查-第三轮.md)
> - [59-咨询模块chrome-devtools-mcp走查-第四轮.md](./59-咨询模块chrome-devtools-mcp走查-第四轮.md)

---

## 0. 总结

### 0.1 一句话结论

**R4 已修 6 条全部回归通过；R3-F-1 / R3-F-2 bulk-tags 端到端闭环
（PG 持久化 + audit + 列表 refetch + chip 折叠 popover）真正走通；
但本轮新发现 **2 条 P1** 重新阻断会话主路径——R5-G-1 服务端
`lm.sender_role` 列名错误导致 `GET /admin/conversations` 整页 500
（同时阻断列表页 + lead 详情会话 Tab），R5-D-1 客户端 mapper 读
`content/translatedContent` 但 server payload 字段是
`originalText/translatedTextJa|Zh|En`，导致所有消息 bubble 正文为空、
仅显示「翻译中…」 hint，即使 R4-D-1 把 messages 拉取链路修好，
admin 仍然看不到任何会话内容。**

> 净效果：会话主路径再次阻断（读 = 500 列表 + 空正文，写 = 单条
> send 可成功 201 但写完仍渲染空气泡）。会话功能整体不可用，
> 优先级与 R4-D-1 / R4-D-2 同级。

### 0.2 优先级分布

| 等级 | 个数 | 编号 | 主题 |
|------|------|------|------|
| P0 | 0 | — | — |
| P1 | 2 | R5-G-1 / R5-D-1 | 会话列表/嵌入会话 Tab 整体 500（`lm.sender_role` 列名错） / 消息 bubble 正文永远为空（client mapper 字段读错） |
| P2 | 2 | R5-D-2 / R5-E-1 | convert auto-chain 错误吞并（已 converted customer 时把错误冒泡为通用 toast） / 多处 owner picker 选项不全（reassign / convert-case / bulk-assign 共同退化） |
| P3 | 5 | R5-A-1 / R5-A-2 / R5-A-3 / R5-A-4 / R5-F-1 | tags 筛选不写回 URL / chip 折叠 button 无 aria-label / lead 详情基础信息 Tab 不渲染 tags / bulk-tags 成功无 toast 反馈 / message send 未落 timeline_logs 审计 |

### 0.3 R3 / R4 修复回归矩阵

| 编号 | 主题 | R5 验证 | 证据 |
|------|------|---------|------|
| R3-A-1 | leads list ownerUserId/groupId UUID guard | ✅ 已修复 | `?ownerUserId=suzuki` → 400 `ownerUserId must be a valid UUID`；`?groupId=tokyo-1` → 400 `groupId must be a valid UUID` |
| R3-D-2 | 编辑信息「来源」dropdown 回填 | ✅ 已修复 | dialog 仍显示 `网站表单 (web)` 正确映射 |
| R3-E-1 | 会话列表 join 字段（leadName / ownerLabel） | ⚠️ **服务端被 R5-G-1 阻断** | `GET /admin/conversations` 整体 500，UI 列表显示「会话加载失败」 |
| R3-E-2 | 会话详情 adapter 不再 crash | ✅ 已修复 | `GET /admin/conversations/:id` 200，UI 不再整页失败 |
| R3-E-3 | 会话动词 PATCH 一致 | ✅ 已修复 | UI 实测 `PATCH /:id/close 200` / `PATCH /:id/reopen 200`，关闭横幅 + 重新开启按钮切换正常 |
| R3-E-5 | validateVisibleScope 抛 Error→500 | ✅ 已修复 | 直测 `visibleScope: "public"` → 400 `Invalid visibleScope: public` |
| R3-F-1 | bulk-tags 无 UI 反馈 | ⚠️ 列表 refetch + chip 渲染 ✅，**toast 仍未触发**（**R5-A-4**） | bulk-tags 成功后批量操作工具栏自动收起，列表 chip 立即增加，但顶部无 toast |
| R3-F-2 | bulk-tags 仅写 lead_logs 不更新 leads | ✅ 已修复（端到端） | UI 触发 → API 201 → PG `leads.tags = {R5-walk,...}`（合并去重）→ `lead_logs(tags_updated)` 落 audit → 列表 refetch chip 渲染 |
| R3-G-1 | followups 裸数组 vs `{items,total}` | ⏸️ 仍裸数组（与 outputs.md 决策一致） | — |
| R4-A-1 | leads 列表 tags 列与 tags 过滤 UI 缺失 | ✅ 已修复 | 列表表头新增「标签」列；行内显示 tags chip + `+N` 折叠 button + click popover；筛选区新增「按标签筛选」textbox，支持 `?tags=朋友` 过滤命中 1 条 |
| R4-A-2 | 详情基础信息 Tab 显示 UUID 当线索编号 | ✅ 已修复 | demo lead 详情基础信息 `线索编号 = LEAD-DEV-PORTAL-001` |
| R4-A-3 | 来源字段 `web (web)` 重复渲染 | ✅ 已修复 | 现在分两段：`web ` + `（创建路径：admin）`，单值 lead 显示 `web` 单一字符串 |
| R4-B-1 | lead 详情会话 Tab 永远空态 | ⚠️ **修复方向 2 已落地，但被 R5-G-1 联合阻断** | UI 现确实调 `GET /admin/conversations?leadId=...&limit=50`，但接口 500，Tab 显示「会话加载失败，请稍后重试。」 |
| R4-C-1 | conversations 列表 `lastMessagePreview` 永远空 | ⚠️ **服务端 `buildLastMessagePreview` 已实现，但被 R5-G-1 阻断在 list 500，UI 无法验证** | service 代码已存在 `LATERAL` 子查询；列表整体 500，无法触达预览渲染 |
| R4-D-1 | 会话详情消息时间线永远为空 | ✅ messages 拉取链路已修，**但 R5-D-1 让正文仍空白** | UI 实际请求 `GET /:id/messages` 200，时间线渲染 6 条 bubble；但 bubble 正文全部为空（仅时间戳 + 「翻译中…」） |
| R4-D-2 | 发送消息字段名错位 | ✅ 已修复 | UI 实测 `POST /messages 201`，PG 落入新 message `R-CONSULT-05 walkthrough send test`；send 后自动 refetch detail + messages |
| R4-D-3 | 会话 owner picker 选项 | ❌ **仍存在**（合并入 **R5-E-1**） | reassign dialog dropdown 仅 1 个选项（当前 owner） |
| R4-E-1 | convert-case dialog ownerUserId 同步 + BMV gate UI | ⚠️ 部分修复：dialog `所属组` 现是 dropdown；`案件负责人` 仍只有 1 选项；BMV gate 4 条 blockers 仍未渲染到 dialog（**R5-D-2** + **R5-E-1**） | UI 点「确认创建案件」→ `POST /convert-customer` 400 `Lead already has a converted customer` → 通用 toast `转案件失败，请稍后重试。`，auto-chain 中断 |
| R4-E-2 | convert-case 所属组 UUID textbox | ✅ 已修复 | dialog `所属组（可选）` 现是 combobox，显示 `tokyo-1` |
| R4-F-1 | dedup 端点 / detail.dedupHints 把自身计入 | ✅ 已修复 | `GET /admin/leads/8a7b…` 返回 `dedupHints: { leads: [], customers: [] }`，转化 Tab 显示「未检测到重复记录」 |
| R4-F-2 | dedup / convert 响应 customer.name 永为 null | ❌ **仍存在** | `GET /admin/leads/8a7b…` 返回 `convertedCustomer: { id: "3a3bbdb3…", name: null }` |

---

## 1. 新发现缺陷明细（R5-A …… R5-G）

### R5-G-1 [P1] 会话列表整体 500——`lm.sender_role` 列名错位（实际列 `sender_type`）

- **页面**：
  - `/conversations`（列表）
  - lead 详情 → `会话` Tab
- **重现**：
  1. 直测 `GET /admin/conversations?limit=10` → **500** `Internal server error`；
  2. 直测 `GET /admin/conversations?leadId=00000000-0000-4000-b000-000000000010&limit=50` → **500**；
  3. UI 走查 `/conversations` 列表页 → 顶部计数 `当前查看：我的 · 0 条` + 空态 `会话加载失败，请稍后重试。`；
  4. UI 走查 `/leads/<demo>/会话` Tab → `会话加载失败，请稍后重试。`（即使 R4-B-1 修复方向 2 已落地）；
  5. PG 直查 `select original_text, sender_role from messages limit 1;` → `ERROR: column "sender_role" does not exist. HINT: Perhaps you meant to reference the column "messages.sender_type".`
- **根因**：
  - `packages/server/src/modules/core/conversations/conversations.admin.types.ts:47` 定义
    ```ts
    export const CONV_LIST_JOIN_COLS = `... lm.original_text as lm_original_text, lm.sender_role as lm_sender_role`;
    ```
  - `packages/server/src/modules/core/conversations/conversations.admin.types.ts:50` `CONV_LIST_JOINS` 中
    `select original_text, sender_role from messages m where m.conversation_id = c.id ...`；
  - PG `messages` 表实际列是 `sender_type`（非 `sender_role`）；
  - 单测路径未覆盖（list 接口可能仅在 service 层走 mock，未触发真实 SQL）。
- **修复方向**：
  1. 把 `CONV_LIST_JOIN_COLS` / `CONV_LIST_JOINS` 中的 `sender_role` 改为 `sender_type`；同步更新 `AdminConversationListRow.lm_sender_role` 字段名为 `lm_sender_type`，以及 `mapAdminConversationListRow` / `buildLastMessagePreview` 的入参；
  2. 加 `conversations.admin.service.test.ts` 一条 e2e 用真实 PG（或 PgLite/SqlMem）跑 list 路径，断言 `sql 不抛`；
  3. 用 server-side controller test 覆盖 `GET /admin/conversations` 列表 200 + items 数；
- **影响面**：
  - admin **会话列表页** + admin **lead 详情会话 Tab**（R4-B-1 修复方向 2）同时阻断；
  - R3-E-1 修复（join 字段）+ R4-C-1 修复（lastMessagePreview）的可见性都被这个一行 SQL bug 整体抹掉；
  - 与 R5-D-1 联合，再次让会话主路径不可用。
- **关联**：
  - 与 R3-E-1 修复直接冲突——R3-E-1 增了 join，本条把 join 写错了字段名；
  - migration 053 引入 `tags` 列时未触及 messages，messages 表 schema 自始至终是 `sender_type`，`sender_role` 是无中生有的命名。

### R5-D-1 [P1] 会话详情消息 bubble 正文永远为空——client mapper 字段错位

- **页面**：`/conversations/:id`
- **重现**：
  1. 直测 `GET /admin/conversations/00000000-0000-4000-b000-000000000020/messages?limit=2` → 200，payload key
     `id / conversationId / orgId / senderType / senderId / originalLanguage / originalText / translatedTextJa / translatedTextZh / translatedTextEn / translationStatus / kind / visibleScope / createdAt`；
  2. UI 进入会话详情 → 渲染 6 条 bubble，每条 bubble 正文为空，仅显示时间戳 + 灰色斜体「翻译中…」 hint；
  3. 即使 message `translationStatus = completed`（如 fixture 0030/0031）正文也是空的，原因是「翻译中…」hint 看 `translationStatus === pending`，正文看 `message.content`（空字符串）；
  4. 实测刚发的 `R-CONSULT-05 walkthrough send test`（pending）也是空 bubble + 翻译中。
- **根因**：
  - `packages/admin/src/views/conversations/model/ConversationAdapterMappers.ts:175,179` `mapMessage` 读：
    ```ts
    content: readString(record, "content"),
    translatedContent: readNullableString(record, "translatedContent"),
    ```
  - server payload 字段是 `originalText` / `translatedTextJa | Zh | En`（按 preferredLanguage 选其一），不存在 `content` / `translatedContent`；
  - 所以 `MessageBubble.body` 渲染 `{{ message.content }}` 永远是空字符串；
  - 类似地 R4-D-2 修复方向已经统一了 send 字段（client `originalText` → server `originalText`），但**读侧未对齐**。
- **修复方向**：
  1. `mapMessage` 改成：
     ```ts
     const preferredLang = ...; // detail.conversation.preferredLanguage
     const translatedContent =
       preferredLang === 'zh' ? record.translatedTextZh :
       preferredLang === 'ja' ? record.translatedTextJa :
       preferredLang === 'en' ? record.translatedTextEn : null;
     return { ..., content: readString(record, 'originalText'), translatedContent };
     ```
  2. 或更彻底：直接把 server payload 透传成 `originalText` / `translatedTextJa | Zh | En`，bubble 组件按 `props.message.originalText` 渲染；
  3. 单测：`ConversationAdapterMappers.test.ts` 加 1 条「mapMessage 把 originalText 写到 content」（用 server-shape fixture，避免再次错位）；
  4. e2e：`useConversationDetailModel.test.ts` mount 后断言 `state.messages.value[0].content` 非空；
- **影响面**：
  - 会话详情页面**整体可读性失败**：admin 看不到客户发了什么、自己回了什么；
  - R4-D-1 修复让 messages 数组真的写到 state，但写进去的 `MessageItem.content === ""`，对用户来说和 R4 时一样——「永远空白」；
  - 与 R5-G-1 联合，admin 会话功能在「读」侧整体阻断（list 500 → 进不了详情；进了详情 → 正文空）；
- **关联**：
  - 与 R4-D-2 修复方向同源——R4-D-2 修了 client send 字段名（`{content}` → `{originalText, originalLanguage}`），但读侧 mapper 仍用旧 `{content}`；
  - 此条**应作为 R5 最高优先级 fix**，与 R5-G-1 一起一个 PR 打通会话读取主路径。

### R5-D-2 [P2] convert auto-chain 错误吞并：已 converted customer 时把错误冒泡为通用 toast

- **页面**：lead 详情 → 「签约并开始建档」
- **重现**：
  1. 选 signed + has-customer 的 lead 8a7b → 点「签约并开始建档」；
  2. dialog 默认 caseType=经营管理 / owner=Local Admin / 组=tokyo-1（dropdown）；
  3. 点「确认创建案件」 → 实际触发 client 调 `POST /api/admin/leads/8a7b…/convert-customer` → 400
     `{message: "Lead already has a converted customer", error: "Bad Request"}`；
  4. UI 弹通用 toast `转案件失败` → `转案件失败，请稍后重试。`；
  5. 直测 `POST /api/admin/leads/8a7b…/convert-case` body
     `{caseTypeCode:"business_manager_visa", ownerUserId:"00000000-…11"}` → **结构化** 400
     `{code:"CASE_BMV_GATE_BLOCKED", blockers:[{code:"BMV_QUESTIONNAIRE_NOT_RETURNED",...},{code:"BMV_QUOTE_NOT_CONFIRMED",...},{code:"BMV_NOT_SIGNED",...},{code:"BMV_INTAKE_NOT_READY",...}]}`。
- **根因**：
  - R3-C-2 修复在 `useLeadDetailModel.convertCase` 实现 auto-chain：先 convert-customer，再 convert-case；
  - 当 convert-customer 因「已有 customer」400 时，链路中断、错误冒泡到通用 toast；
  - 没有把「已 converted customer」识别为 *预期分支*（应 swallow + 直接走 convert-case）；
  - 即使 auto-chain 走通了 convert-case，`code: CASE_BMV_GATE_BLOCKED` 4 条 blockers 也没渲染到 `BmvGateBlockerList`。
- **修复方向**：
  1. `useLeadDetailModel.convertCase` 在 auto-chain 中识别 `Lead already has a converted customer`（或 `code: CUSTOMER_ALREADY_CONVERTED`，需要 server 端补 `code`）→ 跳过 convert-customer 直接进 convert-case；
  2. server `LeadsService.convertCustomer` 在已转化时返回结构化 `{code: "CUSTOMER_ALREADY_CONVERTED"}`，不要只返 message；
  3. `LeadConvertCaseDialog` 渲染 `code === "CASE_BMV_GATE_BLOCKED"` 时把 4 条 blockers 列出来（已有 `BmvGateBlockerList` 组件）；
  4. 单测：`useLeadDetailModel.convertCase-auto-chain.test.ts` 加 1 条 `customer-already-converted-skip` 用例（mock convert-customer 返回 already-converted，断言继续调 convert-case）；
- **影响面**：
  - signed + has-customer lead 路径上的「签约建档」点击全部失败（业务上数据本就 ready，但 UI 不让点过去看 BMV gate）；
  - admin 在 UI 上看不到 4 条 blockers，也就无从修「问卷未回 / 报价未确认 / 未签约 / intake 未 ready」；
  - 与 R5-E-1（owner picker 选项不全）联动，让 BMV happy-path 端到端无法在 UI 走通。
- **关联**：
  - 是 R4-E-1 的延续，R4-E-1 修复方向 1（dialog form 改 watchEffect）+ 方向 2（submit guard）已落地；
  - 但方向 3「server CASE_BMV_GATE_BLOCKED 走通到 dialog BmvGateBlockerList」未做，本条把这一未做项独立编号 R5-D-2。

### R5-E-1 [P2] owner picker 选项严重不全（reassign / convert-case / bulk-assign 共同退化）

- **位置**：
  - 会话详情 → 「重新指派」 dialog（R4-D-3 同源）
  - lead 详情 → 「签约并开始建档」 dialog → 案件负责人 combobox
  - leads 列表 → 批量操作工具栏 → 「指派负责人」 combobox
- **重现**：
  - reassign dropdown 仅 1 个 option `Local Admin`（当前 owner）；
  - convert-case dialog 「案件负责人」仅 1 个 option `Local Admin`；
  - 列表批量操作 「指派负责人」仅 1 个 option `Local Admin`（外加 placeholder「选择负责人」）；
  - 同一页面 lead 列表筛选「负责人：全部」却显示 7 人（铃木 / 田中 / 李 / 佐藤 / 山田翔太 / 高桥健太 / 铃木明里）；
  - admin 端 `GET /api/users` 返回这 7 人 + 1 admin 是健全的（304 命中缓存）。
- **根因**：
  - 三个 picker 共享同一个错误源：未走 `useOwnerOptions` / `getActiveUserOptions`，而是 fallback 到 `[currentOwner]` 单元素列表；
  - 在 lead `useOwnerOptions.ts` 中能看到统一 helper 已经存在（已修改/新增），但这三处入口没消费。
- **修复方向**：
  1. 三个 picker 统一切换到 `useOwnerOptions()`（或 `getActiveUserOptions`）；
  2. 增加单测：
     - `ConversationOwnerPickerDialog.test.ts`（已存在，扩展 1 条 `mount 后 dropdown options.length === activeUsers.length`）；
     - `LeadConvertCaseDialog.test.ts` 1 条 `案件负责人 dropdown options 与 useOwnerOptions 一致`；
     - `LeadBulkActionsBar.test.ts`（如不存在则新建）1 条 `指派负责人 options 与 useOwnerOptions 一致`；
- **影响面**：
  - admin 在三处入口都只能把 owner 设为自己（实际相当于 no-op），无法把会话 / 案件 / 批量 lead 指派给团队其他成员；
  - 业务管理流程实质阻塞：主办人 admin 无法让铃木 / 田中接手；
- **关联**：是 R4-D-3 的扩面，R4 时只看到 reassign 这一处，R5 走查发现 convert-case + bulk-assign 也是同源问题。

### R5-A-1 [P3] tags 筛选不写回 URL —— 刷新即丢失筛选

- **页面**：`/leads`
- **重现**：
  1. 在「按标签筛选」textbox 输入 `朋友` → Enter；
  2. 列表过滤为 1 条；网络请求 `GET /admin/leads?scope=mine&tags=%E6%9C%8B%E5%8F%8B&page=1&limit=20` 200；
  3. 此时 `window.location.href` 仍是 `http://localhost:5173/admin/login#/leads`，hash 后没有 `?tags=朋友`；
  4. 刷新页面，筛选丢失。
- **根因**：admin 用 hash router，`useLeadFilters` 把筛选写到 reactive store，但没把 tags 写回 router query / hash。其他筛选（status / owner / group / businessType）应该有同源问题，需要回归。
- **修复方向**：
  1. `useLeadFilters` watch tags → `router.replace({ query: { ..., tags: tags.join(',') }})`；
  2. 单测：`useLeadFilters.test.ts` 加一条 `tags 写回 router query`；
  3. 顺手回归 status / owner / group / businessType 的 URL sync。
- **影响面**：tags 筛选无法分享链接，刷新丢失 ux 体感。

### R5-A-2 [P3] tags chip 折叠 button 无 aria-label，accessible name 为 chip 文本逗号拼接

- **页面**：`/leads`
- **重现**：
  - demo lead 行 chip 折叠 `+2` 按钮的 aria 名称是 `VIP, 優先`（chip 文本逗号拼接），不是「显示其余 2 个标签」之类的语义化标签；
  - bulk-tags 后变成 `面談済, VIP, 優先`（折叠 +3）。
- **根因**：`LeadTableRow` 折叠按钮没设 `aria-label`，accessible name 来自 hidden chip 文本节点。
- **修复方向**：
  1. button 加 `:aria-label="t('leads.list.tagsRest', { count: hiddenCount })"`；
  2. button 内可视文本仍保留 `+N`；
  3. i18n key `leads.list.tagsRest`：`'其余 {count} 个标签'` / `'+{count} more tags'` / `'残り {count} 件'`。
- **影响面**：屏幕阅读器读出来不直观，但视觉用户不受影响。

### R5-A-3 [P3] lead 详情基础信息 Tab 不渲染 tags

- **页面**：lead 详情（demo lead 有 6 个 tag） → 基础信息 Tab
- **重现**：基础信息 Tab 字段：线索编号 / 姓名 / 电话 / 邮箱 / 来源 / 介绍人 / 意向业务类型 / 所属组 / 负责人 / 首选语言 / 备注；**没有「标签」字段**，即使列表行 chip 已经显示 6 个 tag。
- **根因**：`LeadInfoTab.vue` 字段映射缺 tags。
- **修复方向**：
  1. 加一行「标签」chip 横排 + 「编辑」按钮（chip 化 dialog 编辑）；
  2. 编辑 dialog 复用 `LeadEditInfoDialog` 或独立 `LeadTagsEditDialog`；
  3. 单测：`LeadInfoTab.test.ts` mount fixture 含 tags 后断言 chip 渲染。
- **影响面**：详情页面与列表页面的信息密度不一致（列表显示 chip，详情看不到）。

### R5-A-4 [P3] bulk-tags 成功无 toast 反馈（R3-F-1 残留）

- **页面**：leads 列表 → 批量操作工具栏 → 标签 textbox + 应用
- **重现**：
  1. 选 2 条 lead，输入 `R5-walk` → 点「应用」；
  2. 列表自动 refetch，被选行 chip 立即增加；
  3. 批量操作工具栏自动收起；
  4. **但页面顶部没有 toast 通知**（如 `已为 2 条线索打上 1 个标签`）。
- **根因**：`useLeadBulkActions.bulkApplyTags` success 分支没调 `useToast.show`。
- **修复方向**：
  1. success 分支调 toast `'已为 {count} 条线索打上 {tagsCount} 个标签'`；
  2. 单测：`useLeadBulkActions.test.ts` mock toast → 断言 success 调用。
- **影响面**：体感反馈缺失，用户不确定操作是否生效（虽然列表 chip 已变化）。

### R5-F-1 [P3] message send 未落 timeline_logs 审计

- **位置**：`POST /api/admin/conversations/:id/messages`
- **重现**：
  1. 走查中通过 UI 发了 1 条新 message（`R-CONSULT-05 walkthrough send test`）；
  2. PG `select entity_type, action, count(*) from timeline_logs group by entity_type, action;` → conversation 系 `assigned/closed/reassigned/reopened` 都有计数；
  3. **没有 `conversation.message_sent` 或 `message.created` 类似事件**；
  4. 但 messages 表本身落库 OK（PG `select count(*) from messages where conversation_id='...'` 增加 1）。
- **根因**：`messages.admin.service.send` 没调 `timelineService.append('conversation', conversationId, 'message_sent', payload)`。
- **修复方向**：
  1. send 流程末尾追加 `timelineService.append('conversation', conversationId, 'message_sent', { messageId, senderType, kind, visibleScope })`；
  2. 单测：`messages.admin.service.test.ts` send 后断言 timeline 一条；
  3. 同步看 `retry-translation` 是否也漏了 timeline。
- **影响面**：
  - 审计链不完整：admin 在某会话上发了哪些消息，无法仅靠 timeline 还原；
  - 与 P0 §3.6 「会话操作可审计」轻度偏差（spec 是否要求消息 send 落 timeline 待 confirm，可能是 P3）。

---

## 2. 走查路径与证据快照

### 2.1 环境基线

| 项 | 值 | 备注 |
|----|-----|------|
| admin URL | `http://localhost:5173/admin/login` | vite dev（5173 IPv6 only，`127.0.0.1` 不可达） |
| server URL | `http://localhost:3300` | NestJS dev |
| PG | `postgres://cms:cms@localhost:5433/cms` | docker `cms-client-postgres-1` |
| 登录账号 | admin@local.test / Admin123! | role=主办人 |
| migrations | applied 053_leads_tags（与 R4 一致） | — |
| leads | 4 行（与 R4 一致） | demo（following，6 tags）/ 8a7b（signed，1 tag）/ 720d（signed，0 tag）/ 7c13（lost，0 tag） |
| conversations | 2 行（均挂 demo lead） | 0020 + 0021 |
| messages | 7 → 8（本轮 +1 admin happy-path send via UI） | 030 / 031 / 033 completed；032 / a6a5 / c892 / 2fc5 / 3b62（new）pending |

### 2.2 lead 列表（A）

| 用例 | 操作 | 结果 |
|------|------|------|
| A-1 | 普通列表 `/leads?scope=mine` | 200 / 4 条 + 1 草稿 / ✅ |
| A-2 | UI 列表 tags 列 / 筛选入口 | ✅ 已落地（R4-A-1） |
| A-3 | tags 筛选 textbox 输入「朋友」+ Enter | ✅ 列表过滤为 1 条 + API `?tags=%E6%9C%8B%E5%8F%8B` 200 |
| A-4 | tags 筛选写回 URL hash | ❌ 未写回（**R5-A-1**） |
| A-5 | tags chip 折叠 +N click | ✅ 弹 `lead-row__tags-popover` 显示余下 chip |
| A-6 | tags chip 折叠 button aria-label | ❌ 仅 chip 文本拼接（**R5-A-2**） |
| A-7 | 表格 a11y | ✅ 真 `<table><thead><th>` 8 列 |
| A-8 | 批量勾选 → 批量操作工具栏 | ✅ region `批量操作` 显示 `已选择 N 条`，含指派 / 跟进时间 / 状态 / 标签 / 导出 |
| A-9 | 批量操作 → 标签输入 `R5-walk` → 应用 | ✅ API 201，列表 refetch，chip 增加；**toast 缺失（R5-A-4）** |
| A-10 | `?ownerUserId=suzuki` UUID guard | ✅ 400 R3-A-1 |
| A-11 | `?groupId=tokyo-1` UUID guard | ✅ 400 R3-A-1 |
| A-12 | 批量操作 → 指派负责人 dropdown | ❌ 仅 1 选项 Local Admin（**R5-E-1**） |

### 2.3 lead 详情头部 + 基础信息（B）

| 用例 | lead | 结果 |
|------|------|------|
| B-1 | demo（following） | 编辑信息 / 调整状态 / 标记流失 / 仅建客户档案 ✅ |
| B-2 | signed + has-customer (8a7b) | 编辑信息 / 查看客户 / 签约并开始建档 ✅ |
| B-3 | 基础信息 Tab 线索编号 = lead_no | ✅ R4-A-2 已修 |
| B-4 | 基础信息 Tab 来源单值 demo | ✅ R4-A-3 已修（显示 `web`，无重复） |
| B-5 | 基础信息 Tab 来源 8a7b | ✅ 显示 `web ` + `（创建路径：admin）` |
| B-6 | 基础信息 Tab tags 字段 | ❌ 不渲染（**R5-A-3**） |

### 2.4 嵌入会话 / 转化 Tab（C）

| 用例 | 结果 |
|------|------|
| C-1 | 「会话」Tab 调 `GET /admin/conversations?leadId=…&limit=50` | ✅ 修复方向 2 已落地（R4-B-1 部分修复） |
| C-2 | 实际响应 200 + 渲染 demo lead 的 2 条会话 | ❌ 接口 500 → UI 「会话加载失败」（**R5-G-1**） |
| C-3 | 「转化信息」Tab 显示「未检测到重复记录」 | ✅ R4-F-1 已修 |
| C-4 | following lead 「签约并开始建档」按钮 disabled | ✅（demo lead 此按钮在头部不显示，符合 spec） |

### 2.5 convert-customer / convert-case + BMV gate（D）

| 用例 | 结果 |
|------|------|
| D-1 | UI 点「确认创建案件」 (8a7b) → 触发 client `POST /convert-customer` 400 already converted → 通用 toast | ❌ auto-chain 错误吞并（**R5-D-2**） |
| D-2 | 直测 `POST /convert-customer` (8a7b) | 400 `Lead already has a converted customer`（无 `code`） |
| D-3 | 直测 `POST /convert-case` `caseTypeCode:business_manager_visa, ownerUserId:<UUID>` | 400 `code: CASE_BMV_GATE_BLOCKED` + 4 blockers ✅ 服务端结构化 |
| D-4 | dialog 「案件负责人」选项 | ❌ 仅 1 选项（**R5-E-1**） |
| D-5 | dialog 「所属组（可选）」 | ✅ R4-E-2 已修（dropdown） |
| D-6 | dialog BMV gate inline 渲染 4 条 blockers | ❌ 未渲染（**R5-D-2** 关联） |

### 2.6 conversations 列表（E）

| 用例 | 结果 |
|------|------|
| E-1 | `GET /admin/conversations?scope=mine&page=1&limit=20` | ❌ 500（**R5-G-1**） |
| E-2 | `GET /admin/conversations?leadId=...&limit=50` | ❌ 500（**R5-G-1**） |
| E-3 | UI 列表显示 | `当前查看：我的 · 0 条` + 「会话加载失败，请稍后重试。」 |
| E-4 | `lastMessagePreview` 渲染 | ⏸️ 服务端代码已有 `buildLastMessagePreview` 但被 list 500 阻断（R4-C-1 待 R5-G-1 修复后回归） |

### 2.7 conversation 详情（F）

| 用例 | 结果 |
|------|------|
| F-1 | `GET /admin/conversations/0020` 200 | ✅ |
| F-2 | `GET /admin/conversations/0020/messages` 200 | ✅ |
| F-3 | UI 渲染 6 条 message bubble | ✅（R4-D-1 修） |
| F-4 | message bubble 正文 | ❌ 全部空白（**R5-D-1**） |
| F-5 | message bubble pending hint「翻译中…」 | ✅ |
| F-6 | UI send `R-CONSULT-05 walkthrough send test` | ✅ `POST /messages 201`（R4-D-2），refetch detail + messages |
| F-7 | UI 关闭会话 | ✅ `PATCH /:id/close 200`（R3-E-3），关闭横幅 + 重新开启按钮 |
| F-8 | UI 重新开启 | ✅ `PATCH /:id/reopen 200`（R3-E-3），按钮回到「重新指派」/「关闭会话」 |
| F-9 | reassign owner picker | ❌ 仅 1 选项（**R5-E-1**） |
| F-10 | retry-translation pending message | ✅ 400「Only failed or partial translations can be retried」 |
| F-11 | retry-translation failed message | ✅ 201（手工把一条 message 改 failed → retry → 201 → 改回 pending） |
| F-12 | `visibleScope: "public"` | ✅ 400 `Invalid visibleScope: public`（R3-E-5） |
| F-13 | message send timeline_logs 落地 | ❌ 未落（**R5-F-1**） |

### 2.8 PG / audit 验证（G）

| 用例 | 结果 |
|------|------|
| G-1 | demo lead.tags（bulk 后） | `{R5-walk,朋友,测试,面談済,VIP,優先}` ✅ |
| G-2 | 8a7b lead.tags（bulk 后） | `{R5-walk}` ✅ |
| G-3 | lead_logs(tags_updated) 末两条 | `{tags:[R5-walk]}` × 2（每条 lead 一条） ✅ |
| G-4 | timeline_logs 各 entity 各 action 计数 | conversation.assigned 1 / closed 4 / reassigned 2 / reopened 4 / lead.tags_updated 4（per leads，共 4）/ lead.followup_added 3 / **conversation.message_sent 0** ❌（R5-F-1） |
| G-5 | messages 8 行 | 03x×4 + a6a5 + c892 + 2fc5（R4） + 3b62（R5 new）✅ |
| G-6 | leads.dedup 排除 self | ✅（R4-F-1 修） |
| G-7 | leads detail.convertedCustomer.name | ❌ 仍 null（**R4-F-2 未修，回归**） |

### 2.9 console / 网络异常

- console: `<no console messages found>` — ✅ 全程无未捕获异常（R5-D-2 / R5-G-1 都走结构化 4xx/5xx）；
- network: 全程 30 条请求；其中 4xx：3 次 R5-D-2 convert-customer 400 + 1 次预期 401（unauthenticated probe）；5xx：4 次 R5-G-1 conversations list / leadId list / authless probe；其余 200/201/304。

---

## 3. 修复优先级建议（按"会话/咨询主路径阻断度"排序）

| 序号 | 编号 | 等级 | 主题 | 备注 |
|------|------|------|------|------|
| 1 | R5-G-1 | P1 | conversations.admin.types.ts `lm.sender_role` → `lm.sender_type` | 一行 SQL 修复 + 类型字段 rename + 1 条 e2e 单测；解锁会话列表 + lead 详情会话 Tab |
| 2 | R5-D-1 | P1 | ConversationAdapterMappers `mapMessage` 字段对齐 server payload | mapper 改 `originalText/translatedTextJa\|Zh\|En` + 单测；解锁会话详情正文 |
| 3 | R5-E-1 | P2 | reassign / convert-case / bulk-assign owner picker 统一 useOwnerOptions | 1 个 PR 同时修 3 处入口 + 3 条单测 |
| 4 | R5-D-2 | P2 | convert auto-chain 错误吞并 + BMV gate UI 渲染 | client auto-chain 识别 already-converted skip + dialog 渲染 BmvGateBlockerList + server convertCustomer 加 `code` |
| 5 | R4-F-2 | P2 | customers.name 在 dedup/convert 响应永为 null | service projection 抽 `base_profile->>'fullName'`；继续待修 |
| 6 | R5-A-1 | P3 | tags 筛选写回 URL hash 同步 | useLeadFilters watch + router.replace |
| 7 | R5-A-2 | P3 | tags chip 折叠 button aria-label | 1 行 i18n key + button aria-label |
| 8 | R5-A-3 | P3 | lead 详情基础信息 Tab 加 tags chip 行 | LeadInfoTab + i18n + 1 条单测 |
| 9 | R5-A-4 | P3 | bulk-tags toast 反馈 | useLeadBulkActions success 分支调 toast + 1 条单测 |
| 10 | R5-F-1 | P3 | message send timeline_logs 审计 | service 末尾 append + 1 条单测 |

---

## 4. 待办 / 后续计划

- [ ] **R5-G-1 + R5-D-1 一起出 PR**，目标：admin 在 `/conversations` 列表能看到 2 条会话 + 在 `/conversations/0020` 详情能看到所有历史消息正文（**会话主路径再次解锁**）；落地后做 R-CONSULT-06 锁定 happy-path read 闭环。建议同 PR 顺手补 R5-F-1 timeline 审计。
- [ ] **R5-E-1 单独出 1 个 PR**，把 3 处 owner picker 共同退化收口；单测覆盖三处 dropdown options.length；落地后 R5-D-2 的 dialog ownerUserId 指派 → BMV gate happy-path 才能真正在 UI 走通。
- [ ] **R5-D-2 + R4-F-2 + R5-A-3 合并到 1 个「conversion + projection 补全」PR**：
  - server `convertCustomer` 加 `code: CUSTOMER_ALREADY_CONVERTED`；
  - server customer summary 投影 `base_profile->>'fullName'` fallback；
  - client auto-chain skip already-converted；
  - client `LeadConvertCaseDialog` 渲染 4 条 BMV blockers；
  - client lead 详情基础信息 Tab 加 tags chip 行。
- [ ] **R5-A-1 + R5-A-2 + R5-A-4 合并到 1 个「leads list UX 收尾」PR**：
  - useLeadFilters watch tags → router.replace；
  - LeadTableRow chip 折叠 button aria-label；
  - useLeadBulkActions success toast。
- [ ] 在 P0 §3 「Tab 排布」 R-CONSULT-04 已建议补一行『Tab 3: 会话』，本轮验证「Tab 已存在」但被 R5-G-1 阻断；继续保留待 spec 收口。
- [ ] R3-D-1 dedup-confirm fixture 仍未补 — 需要 seed 一条与 demo lead 联系方式重叠的客户/线索，让 dedup-confirm UI 走查可触发；目前只有 unit 覆盖。

---

## 5. R5 缺陷与 R3/R4 修复关系图

```
R3-E-1 conversations list join 字段       ──┐
                                              │ 被 R5-G-1 一行 SQL bug 联合阻断
R4-C-1 lastMessagePreview LATERAL          ──┘ （sender_role → sender_type）

R4-B-1 lead 详情会话 Tab 修复方向 2        ──── 实现 ✅，但调的是 R5-G-1 同款 500 接口

R3-E-2 会话详情 adapter 不再 crash         ──┐
                                              │ R4-D-1 让 messages 数组真的写到 state，
R4-D-1 useConversationDetailModel 写回 state ─┤ 但写进的 MessageItem.content 全是 ""
                                              │ ↓
R5-D-1 client mapper 字段错位             ──── 让 R4-D-1 的修复在视觉上等于没修

R3-C-2 convert-case auto-chain          ──┐
                                            │ R4-E-1 修了 form race + submit guard，
R4-E-1 convert-case dialog reactive race  ─┤ 但没把已 converted customer 当成 skip 分支
                                            │ ↓
R5-D-2 auto-chain 错误吞并             ──── 让 signed + has-customer happy-path 始终失败
```

> 命题：R3 / R4 修复都集中在「让 SQL 跑通 / 让 adapter 不 crash /
> 让端到端字段不再错位」的契约层；R5 暴露的两条 P1 都是「契约
> *已*修复但又在新地方错位」——R5-G-1 是新加 join 写错列名，
> R5-D-1 是写侧字段统一了但读侧 mapper 没跟上。这说明会话模块
> 在 client / server 的字段映射层 **缺一个统一的契约 fixture +
> shared types**。建议下一轮 R-CONSULT-06 起把
> `MessageDto`（server output）↔ `MessageItem`（client input）的
> 字段映射，提到 server `messages.admin.types.ts` 与 client
> `views/conversations/types.ts` 共享的 zod / ts 类型层做单一数据源。
