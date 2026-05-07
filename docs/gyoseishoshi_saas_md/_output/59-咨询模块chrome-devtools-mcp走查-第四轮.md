# 咨询模块 chrome-devtools-mcp 走查（第四轮 / R-CONSULT-04）

> 生成日期：2026-05-06
>
> 命题：在 R3 已修条目（R3-A-1 / R3-D-2 / R3-E-1 / R3-E-2 / R3-E-3 /
> R3-E-5 / R3-F-2）以及 R3 在途修复（R3-C-2 auto-chain、R3-D-1
> dedup-confirm、bulk-tags 持久化）的基础上，做一轮端到端回归 +
> 端到端走查；重点覆盖 R3 未触达的：
>
> ① admin 列表 / 详情 UI 是否真正消费了 `tags` 列与过滤；
> ② 会话详情消息列表是否真渲染（R3-E-2 之后下沉的 fetch 链路）；
> ③ admin send 字段契约对齐（content vs originalText / originalLanguage）；
> ④ retry-translation 在前端入口与 server 行为口径；
> ⑤ convert-case BMV-gate 的端到端结构化错误流。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot /
> click / fill_form / wait_for / evaluate_script / list_network_requests /
> list_console_messages）+ 直连 PG 校验真实持久化。
>
> 数据集：Local Demo Office（admin@local.test / Admin123!），含
> R3 走查留下的 `4 leads / 2 conversations / 6 messages（+ 本轮新增
> 1 admin happy-path send）`，本轮 migration `053_leads_tags` 走查中
> 首次落地。
>
> 上游权威：
>
> - [P0/06-页面规格/咨询线索.md](../P0/06-页面规格/咨询线索.md)
> - [P0/06-页面规格/咨询会话.md](../P0/06-页面规格/咨询会话.md)（暂无独立文件，会话规格散落在咨询线索与 03/04 中）
> - [P0/03-业务规则与不变量.md §2.1 / §2.2 / §2.6 / §3.6](../P0/03-业务规则与不变量.md)
> - [P0/04-核心流程与状态流转.md §4.1 咨询转案件](../P0/04-核心流程与状态流转.md)
> - [56-咨询模块chrome-devtools-mcp走查-第一轮.md](./56-咨询模块chrome-devtools-mcp走查-第一轮.md)
> - [57-咨询模块chrome-devtools-mcp走查-第二轮.md](./57-咨询模块chrome-devtools-mcp走查-第二轮.md)
> - [58-咨询模块chrome-devtools-mcp走查-第三轮.md](./58-咨询模块chrome-devtools-mcp走查-第三轮.md)

---

## 0. 总结

### 0.1 一句话结论

**R3 已修 7 条全部回归通过；R3 在途修复（auto-chain / dedup-confirm /
bulk-tags）服务端契约已落地、前端有覆盖测试，但实际 UI 走查暴露
2 条 P1 阻断会话主路径的契约错位（R4-D-1 消息时间线根本未拉取、
R4-D-2 发送字段名不对），1 条 P1 落到列表层（R4-A-1 tags 列与过滤
未渲染，UI 与 P0 §2.1/§2.2 spec 偏离），以及 5 条 P2/P3 的体感与
契约一致性问题。**

### 0.2 优先级分布

| 等级 | 个数 | 编号 | 主题 |
|------|------|------|------|
| P0 | 0 | — | — |
| P1 | 3 | R4-A-1 / R4-D-1 / R4-D-2 | 列表 tags 列与过滤未实现 / 会话详情时间线为空 / 发送字段名错位 |
| P2 | 4 | R4-B-1 / R4-C-1 / R4-E-1 / R4-F-2 | 线索详情会话 tab 永远空 / 列表 lastMessagePreview 永远空串 / convert-case dialog 偶发 ownerUserId 缺失 / customer.name 在 dedup/convert 响应永为 null |
| P3 | 4 | R4-A-2 / R4-A-3 / R4-D-3 / R4-E-2 | 详情基础信息编号字段歧义 / 来源字段重复渲染 / 会话 owner picker 选项少 / convert-case 所属组用 UUID textbox |

### 0.3 R3 修复回归矩阵

| R3 编号 | 主题 | R4 验证 | 证据 |
|---------|------|---------|------|
| R3-A-1 | leads list ownerUserId/groupId optStr→optUuid | ✅ 已修复 | `?ownerUserId=suzuki` → 400 `ownerUserId must be a valid UUID`；`?groupId=tokyo-1` → 400 `groupId must be a valid UUID` |
| R3-C-2 | convert-case auto-chain + 错误结构化 | ⚠️ 服务端契约已对齐（caseTypeCode=`business_manager_visa` 触发 `code: CASE_BMV_GATE_BLOCKED` + `blockers[]`），单测 `useLeadDetailModel.convertCase-auto-chain.test.ts` 覆盖；UI dialog 仍偶发 400 ownerUserId 缺失（**R4-E-1**） | 直连 API 返回结构化 `{code, blockers[]}`；UI dialog `LeadConvertCaseDialog.vue` 的 `<select v-model="form.ownerUserId">` 在初始 props 为 undefined 的瞬间可能未把 DOM 默认值写回 reactive |
| R3-D-1 | dedup-confirm 后视图状态滞后 | ⚠️ 单测 `useLeadDetailModel.dedup-confirm-buttonStates.test.ts` 在仓库；UI 走查未触发 dedup-confirm（demo lead 自身电话/邮箱仅匹配自己，不会进 dedup 分支） | seed 数据里没有跨 lead/customer 重复联系方式；dedup-confirm UI 走查需补 fixture |
| R3-D-2 | 编辑信息「来源」dropdown 不回填 | ✅ 已修复 | dialog `<select>` value="网站表单"，对应 `sourceChannel: "web"` 正确映射 |
| R3-E-1 | 会话列表缺 join | ✅ 已修复（部分） | `GET /admin/conversations` 返回 `leadName / customerName / ownerDisplayName / appUserName / linkedEntity / ownerLabel`；UI 列表「负责人」「关联对象」不再是 `—`。**但** `lastMessagePreview` 永远是 `""`（**R4-C-1**） |
| R3-E-2 | 会话详情前后端契约错位 | ✅ 已修复（adapter） | 详情 200，页面不再整页 `会话加载失败`；adapter `adaptConversationDetailAggregate` 已读嵌套 `record.conversation`。**但** adapter 写死 `messages: []` 触发新阻断（**R4-D-1**） |
| R3-E-3 | 会话操作动词 PATCH 一致 | ✅ 已修复 | UI 实际请求 `PATCH /:id/assign 200` / `PATCH /:id/close 200` / `PATCH /:id/reopen 200`，与 R3 的 A3 验证一致 |
| R3-E-5 | validateKind/validateVisibleScope 抛 Error→500 | ✅ 已修复 | 直测 `visibleScope: "public"` → `400 Bad Request` `Invalid visibleScope: public` |
| R3-F-1 | bulk-tags 无 UI 反馈 | ⚠️ API 已 201，但 UI 列表无 chip（**R4-A-1**），toast 未在本轮观测到（依赖 R4-A-1 落地） | — |
| R3-F-2 | bulk-tags 仅写 lead_logs 不更新 leads | ✅ 已修复（服务端） | migration 053 已应用：`leads.tags text[] DEFAULT '{}'` + `idx_leads_tags` GIN；写入合并去重；`?tags=R4-walk` 过滤 200 命中 1 条；`audit_log(tags_updated)` 双写。**但**列表 UI 没有 tags 列与 tags 过滤入口（**R4-A-1**） |
| R3-G-1 | followups 裸数组 vs `{items,total}` | ⏸️ 仍裸数组（与 outputs.md 决策一致，留给契约拉通 PR） | `GET /admin/leads/:id/followups` 仍返回 `LeadFollowup[]` |

---

## 1. 新发现缺陷明细（R4-A …… R4-F）

### R4-A-1 [P1] Lead 列表缺 tags 列与 tags 过滤——服务端已落地，UI 未消费

- **页面**：`/leads`
- **重现**：
  1. `POST /admin/leads/bulk/tags` body `{"leadIds":["8a7b…"], "tags":["R4-walk","R4-tag-2"]}` → 201 `{updatedCount:1}`；
  2. PG `select tags from leads where id='8a7b…'` → `{R4-walk,R4-tag-2}` ✅；
  3. `GET /admin/leads?tags=R4-walk` → 200 `total:1`，`items[0].tags=["R4-walk","R4-tag-2"]` ✅；
  4. **UI 列表表头与行均无 tags chip**（实际列：咨询人 / 联系方式 / 当前状态 / 负责人 / 跟进安排 / 最近更新）；筛选器仅有：状态 / 负责人 / 分组 / 业务类型 / 跟进时间——**无 tags 入口**。
- **根因**：R3-F-2 服务端落地（migration 053 + bulk + filter + audit）
  完成；admin 列表 `LeadsListView.vue` / `LeadsListColumns.ts`（或同
  类）未补 tags 列与筛选 chip 输入。
- **与 P0 spec 偏离**：
  - §2.1 列表字段：明确写「标签（tags chip 横排，超出缩略）」；
  - §2.2 默认筛选：明确写「标签（任一命中，`tags && $tags::text[]`）」；
  - 外部 `_output/00-outputs.md`（2026-05-06 R3-F-2 决策条目）回灌
    `状态：已回灌` 但「admin 列表页 tags chip 横排渲染」仅在 spec
    侧落地，前端代码未跟进。
- **修复方向**：
  1. 列表组件加 tags chip 列（horizontal flex, 超出 `+N` 缩略）；
  2. 筛选 area 加 tags 多选 chip 输入（与状态 / 业务类型并列）；
  3. URL query 同步 `?tags=` 多值参数；
  4. 单测：`LeadsListView.test.ts` 渲染含 2 个 tag 的行→断言 chip 出现；
     fixture 加 1 条带 tags 的 lead；
  5. UI 反馈：bulk-tags 成功后 toast `已为 X 条线索打上 N 个标签` 并
     refetch 列表（与 R3-F-1 相互依赖）。

### R4-A-2 [P3] Lead 详情「基础信息」线索编号显示 UUID，与头部「编号」(lead_no) 不一致

- **页面**：lead 详情（任意），如 `/leads/00000000-0000-4000-b000-000000000010`
- **重现**：头部小字 `编号 LEAD-DEV-PORTAL-001`；基础信息 Tab 第一行
  `线索编号 00000000-0000-4000-b000-000000000010`（UUID）。
- **根因**：`LeadInfoTab` 字段拼装时把 lead.id 当作「线索编号」展示，
  没有用 lead.leadNo。
- **修复方向**：基础信息 Tab `线索编号 = lead.leadNo`；UUID 仅在调试或
  「复制 ID」按钮 tooltip 中保留；增 1 条 `LeadInfoTab.test.ts` 断言。

### R4-A-3 [P3] Lead 详情「来源」字段重复渲染：`web (web)` / `web (admin)`

- **页面**：lead 详情 → 基础信息 Tab → 「来源」
- **重现**：
  - demo lead（source=web, sourceChannel=web）：`来源: web (web)`
  - signed lead（source=admin, sourceChannel=web）：`来源: web (admin)`
- **根因**：基础信息组件同时渲染 `sourceChannel` 与 `source`，
  以 `${sourceChannel} (${source})` 拼装；当两者相同时显示重复
  字符串，体感像 bug。
- **修复方向**：
  1. 当 `source === sourceChannel` 时只显示 `sourceChannel` 一次；
  2. 或用本地化 label：`web (来访渠道) · admin (创建路径)`；
  3. 或把 `source` 移到 tooltip / hover-popover，不与 sourceChannel
     混在一行。
- **关联**：与 R3-D-2 的修复方向（基础信息只读侧 + 编辑表单都改用
  `sourceChannel` 作为单一真源）一致；本条是 R3-D-2 在只读侧的残留。

### R4-B-1 [P2] Lead 详情「会话」Tab 永远空态——详情聚合不含 conversations

- **页面**：lead 详情 → 「会话」Tab
- **重现**：
  1. demo lead `00000000-0000-4000-b000-000000000010` 在 PG
     `conversations` 表对应 2 条（id 0020 / 0021，均 `lead_id` 命中）；
  2. UI 「会话」Tab 显示 `该线索暂无关联会话。`；
  3. 进入页面后无任何 `/conversations?leadId=…` 网络请求发起。
- **根因**：`GET /admin/leads/:id` 详情聚合返回字段为
  `{lead, followups, logs, dedupHints, convertedCustomer, convertedCase}`，
  没有 `conversations[]`；前端 `LeadConversationsTab` 只读详情 prop，
  也没有自行调 `/admin/conversations?leadId=...`。
- **修复方向**（二选一）：
  1. 服务端：在 leads detail aggregate 加 `conversations: ConversationListItem[]`
     字段（左 join `conversations` + 顶 5 条排序），同步类型；
  2. 前端：`LeadConversationsTab` 在 mount 时自调
     `repo.listConversations({ leadId: route.params.id })`，与列表
     页 service 对齐契约。
- **影响面**：admin 在 lead 详情页无法直接看到客户已经发来的会话
  线索，只能跳到全局会话列表反查 leadId；与 P0 §3 「Tab embedded
  conversations」隐式期望不符。
- **关联**：spec 4 个 Tab vs UI 5 个 Tab，spec 漂移，应在 P0
  §3「Tab 排布」补一行『Tab：会话』并明确口径。

### R4-C-1 [P2] 会话列表 `lastMessagePreview` 永远是空串

- **页面**：`/conversations`
- **重现**：
  - server `conversations.admin.service.ts:396` 写死
    `lastMessagePreview: "",`；
  - UI 列表「最新消息」列只渲染 `unreadCountStaffTenant` 的
    `1 条未读` chip，没有任何文本预览。
- **根因**：R3-E-1 修复落到 join 字段（leadName / ownerLabel /
  appUserName / linkedEntity），但 R3 给的两步走「先补名字解锁列表
  可读，再补 lastMessagePreview 给完整体感」第二步未实施，service
  返回值占了字段位置但没填 `select` 子查询。
- **修复方向**：service `list` 用 `LATERAL` 子查询把每条 conversation
  的最近一条 message `original_text` 截断 60 字（按发送方向加前缀
  `客户：…` / `事务所：…`）；列表组件第 2 列同时渲染 preview + unread
  badge（不是二选一）；补 1 条 service 单测确认 `lastMessagePreview` 非空。

### R4-D-1 [P1] 会话详情消息时间线永远为空——前端从未真正拉 `/messages`

- **页面**：`/conversations/:id`
- **重现**：
  1. `GET /admin/conversations/:id` 返回 `{ conversation, lead, customer, case, appUser }` 不含 `messages`；
  2. `adaptConversationDetailAggregate` 在
     `ConversationAdapterMappers.ts:297, :304` 直接写死
     `messages: []`；
  3. `useConversationDetailModel.fetchDetail` 写入
     `state.messages.value = result.messages` —— 永远 `[]`；
     `repo.getMessages(id)` 仅在 `autoMarkRead && status === "open"`
     分支被调用，**且即使被调用，结果也未写回 state**；
  4. `ConversationDetailView.vue` 路由模式默认 `autoMarkRead=false`；
  5. DOM 实测 `.conv-detail__messages` 子节点数 = 0。
- **根因**：R3-E-2 修复让 adapter 不再 crash，但**忘了把 messages
  纳入聚合**——adapter 与 model 两端都把 messages 路径短路了。
- **修复方向**：
  1. `useConversationDetailModel.fetchDetail` 内串行：
     `await repo.getDetail(id)` → `const msgs = await repo.getMessages(id)`，
     最后 `state.messages.value = msgs.items`；
  2. 或 adapter `adaptConversationDetailAggregate` 改为接受
     `Promise.all([detail, messages])` 后的合并对象；
  3. **同步在初始 mount 后开 watcher**——发送 / retry / close /
     reopen 后都要 re-pull 一次 messages（`createSendMessage` /
     `createMutationAction` 末尾追加 `await getMessages` 而不仅是
     `await fetchDetail`）；
  4. 单测：
     - `useConversationDetailModel.test.ts` 加 1 条 `fetchDetail
       calls getMessages and writes to state.messages`；
     - `ConversationDetailView.test.ts` 加 1 条 mount 后渲染 N 条
       MessageBubble。
- **影响面**：admin 端会话功能整体不可用（即使 R3-E-2 让页面不崩，
  但用户看到的永远是空消息流 + 输入框）；本条与 R4-D-2 联合阻断
  会话主路径。**作为本轮最高优先级 fix。**

### R4-D-2 [P1] 发送消息字段名错位：client `{content}` vs server `{originalText, originalLanguage}`

- **页面**：会话详情 → 发送消息
- **重现**：
  1. UI 输入 `R-CONSULT-04 walkthrough test message` → 点击 `发送`；
  2. Network：`POST /messages` → 400 `{message: "originalLanguage is required", error: "Bad Request"}`；
  3. 页面顶部出现 toast `消息发送失败，请稍后重试。`；
  4. 直连 API `body: {originalLanguage:"ja", originalText:"…"}` → 201 ✅。
- **根因**：
  - 客户端 `useConversationDetailModel.createSendMessage` 调
    `repo.sendMessage(id, { content: state.messageInput.value })`；
  - `ConversationRepository` send body 透传 `{content}`；
  - server `messages.admin.controller.ts:136-139` 期望 `originalLanguage`
    + `originalText`（皆为 `reqStr`）。
- **修复方向**：
  1. client send 字段对齐：把 `content` 重命名为 `originalText`，
     并默认 `originalLanguage = detail.preferredLanguage ?? 'ja'`；
  2. 同步更新 `ConversationRepository.test.ts` 中 send 单测断言；
  3. **同时**回头看 R4-D-1 的 retry-translation：retry 接口需要
     `messageId` 路径参数 + 空 body，无字段错位风险；但 admin UI
     入口要等 R4-D-1 修复之后消息列表渲染出来，retry 按钮才可见。
- **影响面**：admin 发送消息功能完全不可用，只能借助 API 客户端
  绕过 UI；本条与 R4-D-1 是会话主路径上「读」与「写」的两条
  阻断。

### R4-D-3 [P3] 会话「重新指派」owner picker 仅显示当前 owner

- **页面**：会话详情 → 「重新指派」
- **重现**：reassign dialog 展开 dropdown，仅 1 个 option
  `Local Admin`（当前 owner）；列表页筛选「负责人：全部」下拉
  却有 7 人（铃木 / 田中 / 李 / 佐藤 / 山田翔太 / 高桥健太 /
  铃木明里）。
- **根因**：`ConversationOwnerPickerDialog` 取的不是
  `getActiveUserOptions()` 而是某个限定集合（疑似 fallback 到
  当前 owner）。
- **修复方向**：与 lead 编辑信息中的 owner picker 共用
  `getActiveUserOptions()`；保留搜索框 / 列表过滤；补 1 条
  `ConversationOwnerPickerDialog.test.ts` mount 后 dropdown
  options 数量 = 当前激活用户数。

### R4-E-1 [P2] convert-case dialog：`ownerUserId` 偶发缺失，`转案件失败` 通用 toast

- **页面**：lead 详情 → 「签约并开始建档」
- **重现**：
  1. 选 signed + has-customer 的 lead → 点 `签约并开始建档`；
  2. dialog 默认 caseType=经营管理 / owner=Local Admin / 组=UUID 文本框；
  3. 点击 `确认创建案件` → server 400 `ownerUserId is required`；
  4. **但 DOM 实测 `<select id="convert-case-owner">` 的 value 是
     正确的 UUID**——疑似 v-model 同步 race（首次 props.ownerUserId
     为空时 reactive ownerUserId 初始化为 ""，select 的 disabled-empty
     option 让用户视觉看到 Local Admin 但 form value 实际仍 ""）；
  5. 直连 API 用同样 UUID → 400 `code: CASE_BMV_GATE_BLOCKED`
     带 4 条 `blockers`（QUESTIONNAIRE_NOT_RETURNED /
     QUOTE_NOT_CONFIRMED / NOT_SIGNED / INTAKE_NOT_READY）。
- **根因**：
  - 一阶错位：dialog form.ownerUserId 初始化时 props.ownerUserId
    可能 undefined（依赖父组件传值时机）；
  - 二阶问题：当 form.ownerUserId 在 click 时仍为 ""，UI 应该靠
    `canConfirm` 禁用按钮，但 `canConfirm = caseTypeCode !== "" &&
    ownerUserId !== ""` 看起来工作了，疑似按钮在两个 reactive 状态
    之间存在 single-tick 不一致；
  - 三阶问题：即使把 UUID 送到 server，业务正路径仍被 BMV gate
    挡住——但 R3-C-2 修复只改了 client 端 auto-chain，没改 dialog
    去渲染 `LeadConvertCaseDialog.bmv-gate` 通路。
- **修复方向**：
  1. dialog `form` 改为 `computed` 或在 `watchEffect` 里同步
     props，避免初始化 race；
  2. submit 前在前端再做一次 guard：if `!form.ownerUserId` 直接
     聚焦下拉并提示，不发请求；
  3. **核心**：把 server 的 `code: CASE_BMV_GATE_BLOCKED` 走通到
     dialog 的 `BmvGateBlockerList`（已有 component），把 4 条
     blockers 列出来，让用户知道为什么不能转；
  4. 单测：`LeadConvertCaseDialog.bmv-gate.test.ts` 已存在，扩展
     1 条 `submits with empty ownerUserId is blocked client-side`。

### R4-E-2 [P3] convert-case dialog「所属组」textbox 显示 UUID，应改为下拉

- **页面**：convert-case dialog
- **重现**：所属组（可选）字段是 `<input type="text">`，默认 value=
  `ef21fdd2-1ffc-4a27-8b47-a640d6bd021c`（UUID 字符串），placeholder
  `所属组（可选）`。
- **修复方向**：复用 lead 编辑信息中的 group dropdown 组件；显示
  `tokyo-1` / `tokyo-2` 等本地化 group 名；保留 UUID 在 hidden
  value；single-source `useOrgGroupOptions`。

### R4-F-1 [P3] dedup 端点 `/admin/leads/dedup` 与 detail.dedupHints 把自身计入命中

- **页面**：lead 详情（signed lead `8a7b…`）→ Tab 转化信息
- **重现**：`GET /admin/leads/8a7b…` 返回
  `dedupHints: { leads: [<self>], customers: [<own customer>] }`；
  即「电话/邮箱命中」一定包含线索自身与已经转化出来的客户。
- **根因**：dedup query 缺 `where id != $self_lead_id` /
  `where customer_id != $self_converted_customer_id`，把自身计入命中。
- **修复方向**：dedup query 排除 self；增 1 条 service 单测
  `dedup_excludes_self`。
- **关联**：当前 detail 页面 `LeadConversionTab` 文案
  `未检测到重复记录` 是因为 customers 里只有自身的 converted_customer，
  view 层做了一次 `customers.length > 0 ? prompt : noDup`，但其实应该
  是「排除自身后 length > 0 才弹 prompt」。当前看似 OK 是因为
  signed lead 的 own customer 又被 view 当成「重复」隐藏在底部
  按钮 disable 状态，而非显式提示——一旦后续给 dedup hint 起 toast，
  会立刻穿帮。

### R4-F-2 [P2] dedup / convert 响应中 `customers[].name` 永远为 null

- **页面**：lead 详情头部「查看客户」按钮（hover tooltip）/ 转化 Tab
- **重现**：
  - `GET /admin/leads/dedup?phone=…` 返回
    `customers: [{id:"…", name: null}]`；
  - `GET /admin/leads/8a7b…` 的 `convertedCustomer: {id:"…", name: null}`；
  - PG `\d customers` 显示 customer 名字其实存在
    `base_profile->>'givenName'` / `'familyName'` jsonb 字段，
    没有顶级 `name` 列。
- **根因**：customer summary 投影只 `select id` 没有从 `base_profile`
  抽 name。
- **修复方向**：
  1. service 投影：`name: customers.base_profile->>'fullName'`
     fallback 到 `concat(familyName, ' ', givenName)`；
  2. 类型 `CustomerSummary.name: string`；
  3. UI 「查看客户」按钮 tooltip 用 name；
  4. 单测：`leads.admin.service.test.ts` 补
     `dedup_returns_customer_name_from_base_profile`。

---

## 2. 走查路径与证据快照

### 2.1 环境基线

| 项 | 值 | 备注 |
|----|-----|------|
| admin URL | `http://127.0.0.1:5173/admin/login` | vite 8.0.8 |
| server URL | `http://127.0.0.1:3300` | NestJS dev |
| PG | `postgres://cms:cms@localhost:5433/cms` | docker `cms-client-postgres-1` |
| 登录账号 | admin@local.test / Admin123! | role=主办人 |
| migrations | applied 053_leads_tags（本轮 fresh apply） | 之前止于 052_leads_app_user_nullable |
| leads | 4 行 | signed×2（有 customer）/ following×1（demo）/ lost×1 |
| conversations | 2 行 | 均 `lead_id=00000000-0000-4000-b000-000000000010`（demo lead） |
| messages | 6 → 7（本轮 +1 admin happy-path send via API） | 1 条 translation_status=`completed`，6 条 `pending`，0 条 `failed` |

### 2.2 lead 列表（A）

| 用例 | 操作 | 结果 |
|------|------|------|
| A-1 | 普通列表 `/leads?scope=mine` | 200 / 4 条 / ✅ |
| A-2 | scope=all 切换 | 200 / 4 条 / ✅ |
| A-3 | `?ownerUserId=suzuki` (fixture 短码) | 400 `ownerUserId must be a valid UUID` / ✅ R3-A-1 已修 |
| A-4 | `?groupId=tokyo-1` (fixture 短码) | 400 `groupId must be a valid UUID` / ✅ R3-A-1 已修 |
| A-5 | `?tags=R4-walk` 过滤 | 200 / 1 条命中 / ✅ R3-F-2 服务端已修 |
| A-6 | UI 列表 tags 列 / 筛选入口 | ❌ 缺失 / **R4-A-1** |

### 2.3 lead 详情头部按钮（B）

| 用例 | lead | 头部按钮 | 结果 |
|------|------|----------|------|
| B-1 | demo（following） | 编辑信息 / 调整状态 / 标记流失 / 仅建客户档案 | ✅（注意不见「调整状态」回归 ok） |
| B-2 | signed + has-customer (8a7b) | 编辑信息 / 查看客户 / 签约并开始建档 | ⚠️ 缺 `调整状态` `标记流失`（spec ambiguous），按钮总数与 R2 H-3 不同 |

### 2.4 编辑信息 dialog（C）

| 用例 | 结果 |
|------|------|
| C-1 | 「来源」dropdown 回填 `网站表单`（web） | ✅ R3-D-2 已修 |
| C-2 | 业务类型 / 分组 / 负责人 dropdown 回填 | ✅ |
| C-3 | 「保存修改」按钮在未改时 disabled | ✅ |
| C-4 | 关闭对话框 | ✅ |

### 2.5 嵌入会话 / 转化 Tab（D）

| 用例 | 结果 |
|------|------|
| D-1 | 「会话」Tab 渲染该 lead 已有的 2 条会话 | ❌ 显示「该线索暂无关联会话」 / **R4-B-1** |
| D-2 | 「转化信息」Tab 显示 `未检测到重复记录` + 两个按钮 | ✅ |
| D-3 | following lead `签约并开始建档` 按钮 disabled | ✅（防止在非 signed 状态点击） |

### 2.6 bulk-tags 持久化 + audit（E）

| 用例 | 结果 |
|------|------|
| E-1 | `POST /bulk/tags` body `{leadIds:["8a7b…"], tags:["R4-walk","R4-tag-2"]}` | 201 `{updatedCount:1}` |
| E-2 | PG `select tags from leads where id='8a7b…'` | `{R4-walk,R4-tag-2}` ✅ |
| E-3 | PG `select * from lead_logs where log_type='tags_updated'` | 1 条 + payload `{tags:[R4-walk,R4-tag-2]}` ✅ |
| E-4 | 二次写入相同 tags → 是否合并去重 | 已对该路径直测，`array_agg(distinct unnest)` 工作正常 |

### 2.7 convert-customer / convert-case + BMV gate（F）

| 用例 | 结果 |
|------|------|
| F-1 | UI 直连 `convert-case`（lead 已有 customer + 默认表单） | 400 `ownerUserId is required` / **R4-E-1** |
| F-2 | 直测 API `caseTypeCode:business_manager_visa, ownerUserId:<UUID>` | 400 `code: CASE_BMV_GATE_BLOCKED` + 4 blockers ✅ |
| F-3 | 直测 API `convert-customer`（lead 已有 customer） | 400 `Lead already has a converted customer` ✅（错误结构化但 UI 未走 dialog 渲染） |
| F-4 | dedup `phone=09099990001` | 200，含自身 + own customer / **R4-F-1** |

### 2.8 会话列表（G）

| 用例 | 结果 |
|------|------|
| G-1 | `/conversations` 列表 200 + 2 条 | ✅ |
| G-2 | 列「负责人」`Local Admin` | ✅ R3-E-1 已修 |
| G-3 | 列「关联对象」`デモ依頼者 — 王 小明` | ✅ R3-E-1 已修 |
| G-4 | 列「最新消息」preview | ❌ `lastMessagePreview=""` / **R4-C-1** |
| G-5 | 列「最新消息」未读 chip `1 条未读` | ✅ 单元化的 unread 渲染 |

### 2.9 会话详情（H）

| 用例 | 结果 |
|------|------|
| H-1 | 进入详情 200，渲染头部 + 关联线索链接 | ✅ R3-E-2 已修（adapter） |
| H-2 | 消息时间线渲染 5 条历史消息 | ❌ `.conv-detail__messages` 子节点 0 / **R4-D-1** |
| H-3 | 输入文本 + 发送 | ❌ `POST /messages` 400 `originalLanguage is required` / **R4-D-2** |
| H-4 | 重新指派 | ✅ `PATCH /:id/assign 200` / R3-E-3 已修 |
| H-5 | 关闭会话 | ✅ `PATCH /:id/close 200` / R3-E-3 已修；UI 切到「重新开启」按钮 + 关闭横幅 |
| H-6 | 重新开启 | ✅ `PATCH /:id/reopen 200` / R3-E-3 已修 |
| H-7 | retry-translation（pending 消息） | 400 `Only failed or partial translations can be retried` ✅（受 H-2 阻断 UI 入口） |
| H-8 | invalid `visibleScope` | 400 `Invalid visibleScope: public` / ✅ R3-E-5 已修 |
| H-9 | owner picker 选项数 | ❌ 仅当前 owner / **R4-D-3** |

### 2.10 console / 网络异常

- console: 1 条 `Failed to load resource: 400` × 4 次（来自 R4-D-2 send
  失败 + R4-E-1 convert-case 失败），无未捕获异常。
- network: 全程 36 条请求，所有 4xx 均结构化 JSON（无 5xx）。

---

## 3. 修复优先级建议（按"会话/咨询主路径阻断度"排序）

| 序号 | 编号 | 等级 | 主题 | 备注 |
|------|------|------|------|------|
| 1 | R4-D-2 | P1 | 发送消息字段名对齐 | 1 行 client 改名 + 1 条单测；不解锁 UI 但解除 send 阻断 |
| 2 | R4-D-1 | P1 | 会话详情消息时间线拉取链路 | adapter + model 两端协同；需要 1 个 detail+messages 串行；**最高优先级** |
| 3 | R4-A-1 | P1 | 列表 tags 列 + 筛选 + bulk-tags toast | UI 端补齐 R3-F-2 服务端落地；解决 P0 §2.1/§2.2 spec drift |
| 4 | R4-C-1 | P2 | 列表 lastMessagePreview 真填充 | service LATERAL subquery + 列表组件 preview chunk |
| 5 | R4-B-1 | P2 | lead 详情 会话 Tab 真渲染 | server 加 `conversations` 字段 OR 前端单独拉 list |
| 6 | R4-F-2 | P2 | customer.name 在 dedup/convert 响应中真返回 | service projection 抽 base_profile |
| 7 | R4-E-1 | P2 | convert-case dialog ownerUserId 同步 + BMV-gate UI | dialog form 改 watchEffect / submit guard + bmv 渲染 |
| 8 | R4-D-3 | P3 | conversation owner picker 选项 | 复用 `getActiveUserOptions()` |
| 9 | R4-E-2 | P3 | convert-case 所属组改 dropdown | 复用 group options |
| 10 | R4-A-2 | P3 | 详情线索编号显示 lead_no 非 UUID | 简单字段切换 |
| 11 | R4-A-3 | P3 | 来源字段重复渲染 | 视觉清理 |
| 12 | R4-F-1 | P3 | dedup 排除自身 | service where id != $self |

---

## 4. 待办 / 后续计划

- [ ] R4-D-1 + R4-D-2 一起出 PR，目标：admin 用户在会话详情可读
      历史消息 + 可成功发送新消息（**会话主路径解锁**）；落地后做
      R-CONSULT-05 锁定 happy-path。
- [ ] R4-A-1 单独出 1 个 PR，把 R3-F-2 的「admin UI tags chip + 筛选」
      段落真正落地；同时回归 R3-F-1 toast 反馈（与 R4-A-1 联动）。
- [ ] R4-B-1 / R4-C-1 / R4-F-2 三条「join / projection 缺失」可合并
      到 1 个「conversations & customers projection 补全」PR；同时
      把 R3-G-1 的 followups / logs 裸数组在同一 PR 推平到
      `{items, total}`。
- [ ] R4-E-1 修复后回到 R3-C-2，加一条 `LeadConvertCaseDialog.bmv-gate`
      e2e 用例（chrome-devtools-mcp）：选 signed lead → 点签约
      → dialog inline 渲染 4 条 blockers。
- [ ] 把 R3-D-1 dedup-confirm 路径补 fixture：seed 1 条 customer 与
      1 条新 lead 的电话/邮箱重叠，使 dedup-confirm 在 UI 走查
      可触发；目前只有 unit 覆盖，e2e 不可能从空 seed 走出来。
- [ ] 在 P0 §3 「Tab 排布」补一行『Tab 3: 会话（聚合该 lead 的会话
      列表）』，把 R4-B-1 的 spec drift 收口；同时把『线索编号字段』
      规则统一为「永远显示 lead_no」。
