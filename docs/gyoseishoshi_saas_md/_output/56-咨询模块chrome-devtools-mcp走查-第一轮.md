# 咨询模块 chrome-devtools-mcp 走查（第一轮 / R-CONSULT-01）

> 生成日期：2026-05-06
>
> 命题：本轮覆盖「咨询模块」全部业务逻辑——`咨询线索`（leads）+ `咨询会话`
> （conversations）+ 跨模块联调（lead↔conversation↔customer↔case）。
> 这是该模块首次端到端 chrome-devtools-mcp 走查。
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot /
> click / fill / fill_form / wait_for / evaluate_script /
> list_network_requests / get_network_request / list_console_messages）
>
> 数据集：Local Demo Office（admin@local.test / Admin123!）；DB 中 `leads`
> 与 `conversations` 表均为 0 条（与 P0 规格 §"实施状态対照表" 标记 `⬜
> 待実施` 一致）；前端 UI shell 已完成、API 已部分实现。
>
> 上游权威：
> - [P0/06-页面规格/咨询线索.md](../P0/06-页面规格/咨询线索.md)
> - [P0/03-业务规则与不变量.md §2.1 / §2.2 / §2.6 / §3.6](../P0/03-业务规则与不变量.md)
> - [P0/04-核心流程与状态流转.md §4.1 咨询转案件](../P0/04-核心流程与状态流转.md)

---

## 0. 总结

### 0.1 一句话结论

**咨询模块 P0 端到端断链：前端 UI shell 已就位但服务端关键写入接口缺失，
`POST /admin/leads` 与 `POST /admin/leads/:id/convert` 双双 404，导致
「录入新咨询」「转客户」「转案件」三个核心动作完全不可用；同时
咨询会话详情页存在 P0 级硬编码 owner（`current-user` 字面量）与 P1 级
i18n key 裸露（`conversations.errors.fetchFailed` 直显）两类高暴露 bug。
另发现 2 条服务端 `:id` 路由缺 `ParseUUIDPipe` 校验，非法 UUID 直接 500。**

整体结论：**模块状态 = 走查无法通过基本 happy-path**。规格 §"实施状态対照表"
标记的 ⬜ 待実施 在运行时已被验证为「UI 已落地但与 server 未对齐」。
建议进入 R-CONSULT-02 之前先补 4 条 P0 / P1 阻断项。

### 0.2 走查矩阵（5 个入口 × 关键节点）

| # | 入口 | URL / API | 关键节点 | 走查结果 |
|---|---|---|---|---|
| **A** | 咨询线索列表 | `/leads` | tab 切换 / 5 维筛选 / 重置 | ✅ filters 正确编码到 query string；`status / ownerUserId / groupId / businessType` 透传；`重置` 清空恢复默认；`暂无咨询线索` 空态正常 |
| **B** | 新建咨询弹窗 | `POST /api/admin/leads` | 12 字段表单 + 客户端去重 + 服务端去重 + 提交 + 草稿 | ⚠️ 表单 / 草稿 / 服务端 dedup OK；❌ **POST 404**（B-1 P0）；❌ 邮箱/电话格式无前端校验（B-2/B-3 P3）；❌ Toast 缺 `aria-live`（B-4 P2） |
| **C** | 咨询线索详情 | `/leads/:id` | 4 个 Tab + 头部按钮 + 转化弹窗 | ⚠️ 真实数据 0 条无法直接走查；通过 nil UUID + 非 UUID 旁路：✅ valid UUID 不存在 → 404 → "未找到该线索"；❌ **non-UUID → 500**（C-1 P2，对比 cases R41-B 已修） |
| **D** | 咨询会话列表 | `/conversations` | tab 切换 / 状态筛选 / 仅未读 / leadId 过滤 | ✅ scope 切换 OK；❌ 列表 UI 中**无可见入口**返回详情或转化（库内导航被刻意隐藏，注释见 nav-config.ts:124）；❌ **leadId 非 UUID → 500**（D-1 P2，与 C-1 同源） |
| **E** | 咨询会话详情 | `/conversations/:id` | 头部 3 按钮 + send / assign / close / reopen | ❌ **`assignOwner()` 硬编码 `"current-user"` 字面量**（E-1 P0）；❌ **错误状态展示 raw i18n key**（E-2 P1，6 条错误均受影响）；❌ 头部写入按钮在 detail 为 null 时仍渲染（E-3 P3） |

✅ = pass / ⚠️ = 部分 pass 或受阻 / ❌ = 不可用 / blocking

### 0.3 缺陷分布

| 等级 | 数量 | 主要分布 |
|---|---|---|
| **P0** | 3 | B-1 `POST /admin/leads` 404 / B-1' `POST /admin/leads/:id/convert` 404 / E-1 conversation `assignOwner` 硬编码 `current-user` |
| **P1** | 1 | E-2 conversation 详情错误展示 raw i18n key（6 条错误链路）|
| **P2** | 3 | C-1 / D-1 server 路由缺 `ParseUUIDPipe`，非法 UUID 直接 500 / B-4 `LeadToast` 缺 `aria-live` |
| **P3** | 4 | B-2 / B-3 邮箱/电话无格式校验 / E-3 detail null 头部按钮未隐藏 / G-1 客户端 dedup `phone.includes(input)` 部分匹配易误判 |
| **P4** | 1 | G-2 `<input>` 缺 `autocomplete` 浏览器 issue 提示×3 |

### 0.4 体系性观察

1. **「UI 已 P0 完成 / Server 端漏 2 个写入端点」是当前模块的最大不一致**——
   `core/leads/admin.controller.ts` 实现了：
   - `@Get()` list / `@Get("dedup")` / `@Get(":id")` detail
   - `@Patch(":id")` update / `@Patch(":id/status")` transition
   - `@Post(":id/followups")` / `@Get(":id/followups")` / `@Get(":id/logs")`
   - `@Post("bulk/...")` 5 个 bulk 端点

   但 **缺失**：
   - `@Post()` create — 前端 `POST /api/admin/leads` 直接 404
   - `@Post(":id/convert")` — 前端 `useLeadDetailModel.convertCustomer` 调用
     `POST /admin/leads/:id/convert` 也会 404

   `portal/leads/leads.controller.ts` 倒是有 `@Post()` 与 `@Post(":id/convert")`
   两个端点（path = `leads`，给 portal 用户用），但 **admin 走的是 `admin/leads`
   分支**（`LeadRepositorySupport.ts:237` `apiPath = "/api/admin/leads"`），不会
   命中 portal 路由。需要把 portal 的写入逻辑搬到 admin controller，或在
   `LeadsAdminService` 上新增对应方法（推荐后者：admin 与 portal 应共用 service
   但暴露不同入口）。

2. **「错误状态：raw i18n key 直显」是 conversations 详情独有的一致性 bug**——
   `useConversationDetailModel.ts:137 / 163 / 178 / 195 / 208` 全部把 i18n
   **key 字符串**（`"conversations.errors.fetchFailed"` 等 6 条）写入
   `state.error.value`；`ConversationDetailView.vue:116` 用 `{{ error }}`
   裸渲染——**漏了 `t()`**。对比 `ConversationsListView.vue:83` 是
   `error.value = t("conversations.errors.fetchFailed")`，**列表页正确**。
   修复方式两选一：
   - 在 model 里改成存翻译后字符串（model 持有 i18n 实例）
   - 在 view 里 `{{ t(error) }}`（推荐，保持 model pure）

3. **「assign owner 硬编码 `current-user`」属于 UI 占位未替换**——
   `ConversationDetailView.vue:55-57`：
   ```ts
   function assignOwner() {
     assignOwnerModel("current-user");  // ← 字面量 "current-user"
   }
   ```
   `current-user` 不是合法 user UUID，server 接 PATCH `/admin/conversations/
   :id/assign` 后必然 reject。功能上等价于 **"指派负责人" 按钮永远失败**。
   完整修复路径：
   - 增加 owner picker dialog（与 leads 详情头部 `convertCustomer` 弹窗类似）
   - 默认 owner 候选来自 `users` API + `groups` API（前端已加载，见 reqid=329）
   - 把按钮文案从 `assignOwner / reassign` 直接 binding 到 dialog opener

4. **「server-side `ParseUUIDPipe` 缺失」是跨模块同源 bug**——
   - cases R41-B 已修（`cases.controller.ts:49` 改成 `new ParseUUIDPipe()`）
   - leads `@Get(":id")` / `@Patch(":id")` / `@Patch(":id/status")` /
     `@Post(":id/followups")` 等所有 `:id` 路由 **未加** `ParseUUIDPipe`
   - conversations 同理；并且 `leadId / customerId / caseId` 等 query 参数
     在 `optStr` 里只校验 string，不校验 UUID 格式

   非法 UUID（如 `"not-a-uuid"` 或 `"LEAD-2026-0045"`）走到 SQL 层，
   Postgres `uuid` 列 cast 失败 → 500。建议参照 cases 的 R41-B 范式
   全模块推广。

5. **「空 DB 阻断 happy-path 走查」**——本轮无法对详情页 4 个 tab、转化
   流程、bulk 操作、会话发送/翻译/已读做端到端验证，因为没有任何种子
   `lead` 或 `conversation`。修复 B-1 后可以通过 mcp 自助创建一条种子
   线索补做 R-CONSULT-02。

### 0.5 与规格对比（[06-页面规格/咨询线索.md](../P0/06-页面规格/咨询线索.md)）

| 规格节 | 走查实测 | 一致性 |
|---|---|---|
| §2.1 列表字段 11 字段 | 表头/表行未渲染（0 条），无法核对，但 UI table 模板已具备 | ⚠️ 待数据落地后回归 |
| §2.2 默认筛选 5 维 | status / owner / group / businessType / dateRange 全部下发 query 参数 | ✅ |
| §2.3 批量动作 | DOM 中 `lead-bulk-assignOwner` / `-status` / `-exportFormat` 选择器存在但 0 条时不可见 | ✅ 正确隐藏 |
| §3 Tab1 基础信息 | 详情页代码已完整（`LeadInfoTab.vue`），但无数据走查 | ⚠️ |
| §3 Tab2 跟进记录 | `useFollowupForm` 已实现 `addFollowup` POST | ⚠️ 无数据走查 |
| §3 Tab3 转化信息 | `convertCustomer` 实现，但调用 `POST /:id/convert` → server 404 | ❌ B-1' |
| §3 Tab4 日志 | 模型层已实现 log filter / category，无数据走查 | ⚠️ |
| §4 状态管理 6 态 | UI status select 6 选项与 spec 完全一致（new/following/pending_sign/signed/converted_case/lost）| ✅ |
| §5 去重提示 | client 端 `findDedupeMatches` 用 `phone.includes(input)`（partial match 易误判）；server 端 `GET /admin/leads/dedup` 返回 `{leads, customers}` 正确 | ⚠️ G-1 |
| §6 权限 | 看到 scope=mine/group/all 三档，但本账号 `Local Admin` 是主办人未入组，权限边界未充分覆盖 | ⚠️ |

---

## 1. 详细缺陷清单

### B-1（P0）`POST /api/admin/leads` 404 — 创建线索全链路阻断

**复现路径**：登录 → `/leads` → `新建线索` → 填写 12 字段（姓名 + 电话 +
邮箱 + 来源 + 业务类型 + 分组 + 负责人 + 语言 + 下一步动作 + 下次跟进
时间 + 备注 + 介绍人）→ 点击 `创建线索`。

**实测网络（reqid=337/338/339 三次）**：
```
POST http://localhost:5173/api/admin/leads
Request:  {"name":"MCP-CONSULT-A 张三","phone":"09011112222","email":
          "mcp-consult-a@example.com","sourceChannel":"referral","referrer":
          "MCP walkthrough referrer","intendedCaseType":
          "business-management-visa","groupId":"tokyo-1","ownerUserId":
          "yamada-s","nextAction":"安排首次面谈","nextFollowUpAt":
          "2026-06-15T10:30","language":"zh","note":"MCP walkthrough seed"}
Response: 404 {"message":"Cannot POST /admin/leads","error":"Not Found",
                "statusCode":404}
```

**根因**：`packages/server/src/modules/core/leads/leads.admin.controller.ts`
有 `@Get()` / `@Get("dedup")` / `@Get(":id")` 等 11 个端点，**没有
`@Post()`** create handler。`portal/leads/leads.controller.ts:144` 的
`@Post()` 在 `leads` 路径下、给 portal 用户用，admin 走的 `admin/leads` 路径
不会命中。

**附带 UI 问题**：`useLeadCreateActions.ts:131` 把 server error
**catch 后只 `return false`**，导致：
- 没有 console.error（不影响线上日志）
- 没有 inline error 显示（用户感知零）
- `LeadsListView.vue:288 handleCreate` 看到 `ok = false` 走 toast 分支，
  但 toast 只闪 3 秒（`useLeadToast.ts:17 DEFAULT_DURATION = 3000`）
  且无 `role=alert / aria-live`（见 B-4），易被用户错过

**修复建议**：
- 在 `leads.admin.controller.ts` 增加 `@Post() async create(@Req()
  req, @Body() body: CreateLeadBody)`，复用 `LeadsAdminService.create`
  （若不存在则把 `portal/leads/leads.service.ts:create` 提升到共享
  service 层）
- 同理补 `@Post(":id/convert")` 见 B-1'

### B-1'（P0）`POST /api/admin/leads/:id/convert` 404 — 转客户/转案件不可用

**复现路径**：实测无种子 lead 无法触发，但代码路径明确：
- `useLeadDetailModel.ts:242` `repo.convertLead(id)`
- `LeadRepository.ts:367` 构造 URL `${detailPath}/convert` POST
- `leads.admin.controller.ts` 无对应 handler

预期同 404。

### E-1（P0）conversation `assignOwner` 硬编码 `"current-user"` 字面量

**复现路径**：登录 → `/conversations/00000000-0000-4000-8000-000000000000`
→ 点击 `指派负责人`。

**实测网络（reqid=379）**：
```
PATCH http://localhost:5173/api/admin/conversations/00000000-…/assign
Request:  {"ownerUserId":"current-user"}      ← 字面量字符串！
Response: 404 {"message":"Conversation not found",…}
```

> 即使 conversation ID 存在，server 接 `"current-user"` 也无法解析为
> 合法 user UUID，PATCH 必然失败。这是**纯前端**的 bug，server 实现
> 是正确的。

**根因**：`ConversationDetailView.vue:55`
```ts
function assignOwner() {
  assignOwnerModel("current-user");  // 临时占位未替换
}
```
没有 owner picker dialog，按钮直接调 `assignOwnerModel` 时把
`"current-user"` 字面量当 user ID 传进去。

**修复建议**：
- 增加 owner picker dialog（参考 `LeadDetailView.vue:155`
  `lead-detail-view__dedup-dialog` 弹窗范式）
- owner 候选用 `useUsersStore` 已加载的 `users` 列表
- 默认 selected = `currentUser.id`（真实 UUID，不是字面量）

### E-2（P1）conversation 详情错误状态：6 条 raw i18n key 裸露

**复现路径**：登录 → `/conversations/<任意 UUID>` → 任意失败的
fetch / send / assign / close / reopen / retry-translation 均触发。

**实测**：UI 显示文本：
- `conversations.errors.fetchFailed`（detail load 失败）
- `conversations.errors.assignFailed`（assign 失败）
- `conversations.errors.closeFailed`（close 失败）
- `conversations.errors.sendFailed`（send 失败）
- `conversations.errors.reopenFailed`（reopen 失败）
- `conversations.errors.retryTranslationFailed`（retry 失败）

**根因**：`useConversationDetailModel.ts:137 / 163 / 178 / 195 / 208`
**全部存 i18n key 字符串**到 `state.error.value`：
```ts
state.error.value = "conversations.errors.fetchFailed";  // ← key, not text
```
`ConversationDetailView.vue:115-117`：
```vue
<div v-if="error" class="conv-detail__error">
  {{ error }}                       <!-- ← 漏调用 t() -->
</div>
```

对比 `ConversationsListView.vue:83`（**列表页 OK**）：
```ts
error.value = t("conversations.errors.fetchFailed");
```

**修复建议**：两选一
- model 改存翻译后字符串：`useConversationDetailModel` 接收
  `t` 函数依赖注入，每处赋值改成 `t("...")`（与 list 一致）
- view 改成 `{{ t(error) }}`（model 保持 pure，更解耦但要求 view 知道
  error 是 key）

推荐**前者**，保持与 `ConversationsListView` 一致。

### C-1 / D-1（P2）server `ParseUUIDPipe` 缺失，非法 UUID → 500

**C-1 复现**：访问 `/leads/not-a-uuid` →
`GET /api/admin/leads/not-a-uuid` 返回 **500 Internal Server Error**
（reqid=371）。UI 一律显示 "未找到该线索"，掩盖了 500。

**D-1 复现**：访问 `/conversations?leadId=LEAD-2026-0045` →
`GET /api/admin/conversations?scope=mine&leadId=LEAD-2026-0045&…` 返回
**500**（reqid=400）。UI 显示翻译后的 "会话加载失败" 但 error code
丢失。

**根因**：
- `leads.admin.controller.ts:197 @Get(":id")` 用裸 `@Param("id") id: string`
- `conversations.admin.controller.ts:100` 把 `query.leadId` 用
  `optStr(query.leadId, "leadId")` 只校验类型不校验 UUID

非法 UUID 走到 SQL 层，Postgres uuid 列 cast 失败抛 `invalid input syntax
for type uuid` → Nest 默认 500。

**修复建议**（参照 cases R41-B 范式）：
- 所有 `:id` 路由加 `new ParseUUIDPipe()`（不限 version，nil UUID v0
  也通过）
- query 中的 UUID 字段用专用 validator：自定义 `OptionalUuid` validator
  替换 `optStr`，非法格式返回 400
- UI 端参考 cases R41-D：增加 `useLeadDetailErrorStatus`
  / `useConversationDetailErrorStatus` 区分 `badRequest` / `notFound`
  / `forbidden` / `serverError` 4 种文案

### B-2 / B-3（P3）邮箱 / 电话无客户端格式校验

**B-2 复现**：`新建线索` 弹窗，邮箱输入 `not-an-email` →
- input 标记 `invalid="true"`（HTML5 native validation）
- "创建线索" 按钮**仍可点击**
- dedup 请求照样发出 `?email=not-an-email`（浪费 server 资源）

**B-3 复现**：电话输入 `abc` → 同样允许提交。

**根因**：`useLeadCreateForm.ts:55-59`：
```ts
const canCreate = computed(
  () =>
    fields.name.trim() !== "" &&
    (fields.phone.trim() !== "" || fields.email.trim() !== ""),
);
```
只校验「非空」，未校验格式。

**修复建议**：在 `canCreate` 加：
- 邮箱：`isValidEmail(fields.email)` 或留空
- 电话：`isValidPhone(fields.phone)` 或留空（日本国内号码 7-11 位
  纯数字 / `+81-…`）
- 同步在 `useLeadCreateActions.runDedupCheck` 跳过非法邮箱/电话的
  请求

### B-4（P2）`LeadToast` 缺 `aria-live` / `role`

**复现**：`新建线索` 失败后 toast 出现 3 秒消失。

**实测 DOM**：
```html
<div class="lead-toast">                    <!-- ← 无 role/aria-live -->
  <div class="lead-toast__card">
    <div class="lead-toast__title">创建失败</div>
    <div class="lead-toast__desc">线索创建失败，请稍后重试。</div>
  </div>
</div>
```

screen reader 不会朗读 toast 内容，accessibility 重大缺失。

**修复建议**：`LeadToast.vue:15` 改为：
```vue
<div v-if="visible" class="lead-toast" role="alert" aria-live="polite">
```

> 顺便检查：customers / cases / billing 等其它模块的 toast 是否也有
> 同问题（按 spec §6 「toast 复用 customers 样式」推断 **likely yes**）。
> 建议提一条跨模块 issue。

### E-3（P3）conversation 详情：detail null 时头部按钮仍渲染

**复现**：`/conversations/00000000-0000-4000-8000-000000000000` 返回 404，
detail = null，但页面顶部仍渲染 `指派负责人` / `关闭会话` 两个按钮。
点击后报错 raw i18n key（与 E-2 叠加）。

**修复建议**：`ConversationDetailView.vue:113` `<PageHeader>` 整体或
按钮区域加 `v-if="detail"`。

### G-1（P3）客户端 dedup `phone.includes(input)` 部分匹配易误判

**复现路径**：理论 — 用户输入电话 "1234"，已有 lead phone
"0901234567"，`existing.includes("1234")` = true，误报为重复。

**根因**：`useLeadCreateForm.ts:39`：
```ts
if (existing && existing.includes(phone)) return true;
```

**修复建议**：改成精确匹配 `existing === phone`，或归一化后用
`equals`。本地 dedup 应只做"完全匹配"快速反馈，模糊匹配交给
server 端 dedup（已经做了）。

### G-2（P4）`<input>` 缺 `autocomplete` —— Chrome DevTools issue ×3

DevTools 报 `An element doesn't have an autocomplete attribute (count: 3)`，
影响电话/邮箱/姓名输入框。建议在 `LeadCreateModalBody.vue` 给三个
textbox 补 `autocomplete="name" / "tel" / "email"`。

---

## 2. 走查记录附录

### 2.1 网络请求时间线（按 reqid 排序）

| reqid | URL | 状态 | 备注 |
|---|---|---|---|
| 327 | `/api/organizations/current/settings` | 304 | 启动 |
| 328 | `/api/groups` | 304 | 启动 |
| 329 | `/api/users` | 304 | 启动 |
| 330 | `/api/admin/leads?scope=mine&page=1&limit=20` | 304 | 列表 mine |
| 333 | `/api/admin/leads?scope=all&page=1&limit=20` | 304 | 列表 all |
| 334 | `/api/admin/leads/dedup?email=not-an-email` | 200 | dedup（B-2 应阻止） |
| 335 | `/api/admin/leads/dedup?phone=…&email=not-an-email` | 200 | 同上 |
| 336 | `/api/admin/leads/dedup?phone=…&email=…` | 200 | 服务端 dedup OK |
| 337 | `POST /api/admin/leads` | **404** | **B-1** |
| 338 | `POST /api/admin/leads` | **404** | **B-1**（重试） |
| 339 | `POST /api/admin/leads` | **404** | **B-1**（再次） |
| 370 | `GET /api/admin/leads/00000000-…` | 404 | valid UUID 不存在 |
| 371 | `GET /api/admin/leads/not-a-uuid` | **500** | **C-1** |
| 376 | `/api/admin/conversations?scope=mine&…` | 304 | conv 列表 mine |
| 377 | `/api/admin/conversations?scope=all&…` | 200 | conv 列表 all |
| 378 | `GET /api/admin/conversations/00000000-…` | 404 | 详情 404 |
| 379 | `PATCH /api/admin/conversations/…/assign` | 404 | **E-1** payload 含 `current-user` |
| 380 | `PATCH /api/admin/conversations/…/close` | 404 | conversation 不存在 |
| 394 | `/api/dashboard/groups` | 304 | dashboard |
| 395 | `/api/dashboard/summary?scope=mine&timeWindow=7` | 304 | dashboard |
| 397 | `/api/admin/leads?scope=mine&status=new&ownerUserId=suzuki&…` | 200 | 筛选透传 OK |
| 400 | `/api/admin/conversations?scope=mine&leadId=LEAD-2026-0045&…` | **500** | **D-1** |

### 2.2 console 输出

```
[issue] An element doesn't have an autocomplete attribute (count: 3)
[error] Failed to load resource: the server responded with a status of 404 (Not Found)
```

无 JS error / no warning（除 i18n 启动 warning，与本模块无关）。

### 2.3 走查环境

- 浏览器：Chrome 147（macOS 25.4.0）
- 前端：Vite v8.0.8 dev server（`npm run admin:dev` localhost:5173）
- 后端：NestJS（localhost:3300，Vite proxy `/api`）
- 账号：admin@local.test / Admin123!（角色：主办人，未入组）
- locale：zh-CN（启动后通过 localStorage `cms-admin-locale=zh-CN`
  + `window.location.reload()` 切换）

---

## 3. 后续动作建议

### 3.1 R-CONSULT-02 入门门禁（4 条 P0/P1 修完后再走）

| ID | 修复项 | 预期效果 |
|---|---|---|
| **B-1** | server 补 `@Post()` create on `LeadsAdminController` | 新建线索 happy-path 跑通 |
| **B-1'** | server 补 `@Post(":id/convert")` on `LeadsAdminController` | 转客户 / 转案件 跑通 |
| **E-1** | 前端补 owner picker dialog，去掉 `"current-user"` 字面量 | 指派负责人功能可用 |
| **E-2** | `useConversationDetailModel` 错误存翻译后字符串（与 list 对齐）| 6 条错误正常显示 |

### 3.2 R-CONSULT-02 增量走查范围

修完 B-1 后，可通过 mcp 创建 1-2 条种子 lead，走：
- 详情 Tab1 编辑保存（`PATCH /admin/leads/:id`）
- 详情 Tab2 添加跟进（`POST /admin/leads/:id/followups`）
- 详情 Tab3 转客户 / 去重弹窗确认
- 详情 Tab4 status / owner / group 变更后日志显示
- 列表 bulk 操作 5 个（assign / followup / status / tags / export）
- conversations 创建 / send / mark-read / 翻译重试（依赖 server seed）
- 跨模块联调：lead → 转 customer → 创建 case 全链路

### 3.3 P2 / P3 跨模块统一推广

| 修复项 | 同源模块 |
|---|---|
| `ParseUUIDPipe` 全 `:id` 路由覆盖 | leads / conversations / customers / billing 等 |
| `optStr` → `optUuid` query 校验 | conversations.controller / 其他带 leadId/customerId/caseId 的列表端点 |
| Toast 加 `role=alert / aria-live=polite` | LeadToast / CustomerToast / TaskToast / DocumentToast 等 |
| 邮箱 / 电话格式 client validation 工具复用 | leads / customers / appUsers 等所有联系信息表单 |

### 3.4 文档同步

- `06-页面规格/咨询线索.md` §"实施状态対照表" 把 ⬜ 待実施 改成
  ⚠️ UI 已落地 / Server 部分缺失，并补 5 条本走查发现项作为
  Phase B（admin 接口）的子任务。
- 在 `_raw/00-inbox.md` 追加本轮走查的 4 条 P0/P1 摘要，进 ingest
  → compile 流程。

---

## 4. 引用

- 规格：[06-页面规格/咨询线索.md](../P0/06-页面规格/咨询线索.md)
- 服务端：
  - [leads.admin.controller.ts](../../../packages/server/src/modules/core/leads/leads.admin.controller.ts)
  - [conversations.admin.controller.ts](../../../packages/server/src/modules/core/conversations/conversations.admin.controller.ts)
  - [portal/leads/leads.controller.ts](../../../packages/server/src/modules/portal/leads/leads.controller.ts)
- 前端：
  - [LeadsListView.vue](../../../packages/admin/src/views/leads/LeadsListView.vue)
  - [LeadDetailView.vue](../../../packages/admin/src/views/leads/LeadDetailView.vue)
  - [useLeadCreateForm.ts](../../../packages/admin/src/views/leads/model/useLeadCreateForm.ts)
  - [useLeadCreateActions.ts](../../../packages/admin/src/views/leads/model/useLeadCreateActions.ts)
  - [useLeadDetailModel.ts](../../../packages/admin/src/views/leads/model/useLeadDetailModel.ts)
  - [LeadToast.vue](../../../packages/admin/src/views/leads/components/LeadToast.vue)
  - [ConversationDetailView.vue](../../../packages/admin/src/views/conversations/ConversationDetailView.vue)
  - [useConversationDetailModel.ts](../../../packages/admin/src/views/conversations/model/useConversationDetailModel.ts)
  - [shell/nav-config.ts](../../../packages/admin/src/shell/nav-config.ts)
- 类似走查范式：
  - [53-案件文书模块chrome-devtools-mcp走查-第二十二轮.md](./53-案件文书模块chrome-devtools-mcp走查-第二十二轮.md)（本轮的 R41-B / R41-D 范式参照）
