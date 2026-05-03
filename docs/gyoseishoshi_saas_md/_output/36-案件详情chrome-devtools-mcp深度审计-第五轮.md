# 案件详情 chrome-devtools-mcp 深度审计 Bug 清单（第五轮 / R26）

> 生成日期：2026-05-03（chrome-devtools-mcp 真浏览器深度审计）
>
> 走查命题（用户 R26 任务）：
> - "使用 chrome-devtools-mcp 走查案件详情里面的所有 UI 问题和业务逻辑"
> - 范围：聚焦 admin 端 `/cases/:id` 详情页，覆盖头部、10 个 tab、3 个 modal、状态流转 popover、三语 i18n 一致性
> - 模式：深度审计 + R25 缺陷回归（必复测 BUG-212~BUG-225 land 状态）
>
> 走查工具：
> - `chrome-devtools-mcp`：`navigate_page` / `take_snapshot` / `take_screenshot` / `click` / `type_text` / `fill` / `evaluate_script` / `list_console_messages` / `list_network_requests` / `wait_for`
>
> 走查环境：admin `http://localhost:5173`（hash router）、server NestJS `:3300`、登录态 `admin@local.test`（Local Admin / org-id `00000000-0000-4000-8000-000000000010`）已生效
>
> 走查素材：
> - 3 个代表性案件覆盖不同 phase：
>   - `CASE-202605-0006 R23-AUDIT-TITLE-TEST` — phase=CONSULTING / stage=S1（咨询中）
>   - `CASE-202604-0018 R7 BUG-118 supplement double` — phase=WAITING_PAYMENT / stage=S7（等待尾款）
>   - `CASE-202604-0007 R5 BUG-083 probe` — phase=CLOSED_FAILED / stage=S9（失败归档，终态）
> - 10 个详情 tab：概览 / 提交前检查 / 资料清单 / 任务 / 基础信息 / 文书 / 期限 / 收费 / 沟通记录 / 日志
> - 截屏与凭证落地路径：`docs/gyoseishoshi_saas_md/_output/audit-cases-mcp-r5/`（23 张）
>
> 与 R22 / R23 / R24 / R25 的差异：
> - R22 命题：流程通断 + 双层状态机正确性 → BUG-191~205
> - R23 命题：R22 修复 LANDED 验收 → 14/15 PASS
> - R24 命题：寻找回退分支 / 终态 / a11y / i18n / 协议同步 → BUG-206~211
> - R25 命题：详情页 UI 与业务逻辑细节 → BUG-212~225（14 条新缺陷）
> - **R26 命题：复测 R25 修复 land 状态 + 寻找 R22~R25 都没看到的"修复假象"与新缺陷**

---

## 0. R26 总结

### 0.1 一句话结论

**案件详情 R25 标注的 14 个缺陷里：5 个 ✅ 真 land、3 个 🟡 半 land（含 3 个最严重的"假修复"模式）、6 个 ❌ 仍未修；此外 R26 全新发现 5 个深层缺陷（含 1 个伪成功的 P0 数据丢失），合计 R26 实证清单 11 条新/未修缺陷，其中 P0 1 条、P1 5 条、P2 3 条、P3 2 条。**

### 0.2 R25 修复 land 状态总览

| BUG ID | R25 等级 | R26 复测 | 说明 |
|---|---|---|---|
| BUG-212 | P1 | ✅ **LANDED** | 4 个 disabled 按钮 title 改为 `shell.topbar.comingSoon`，zh/ja 两种 locale 实测 hover 显示 "建设中" / "準備中" |
| BUG-213 | P1 | ✅ **LANDED** | 基础信息 tab 案件编号显示 `CASE-202604-0018` / 案件类型 "经营管理（认定4个月）" 业务文案 |
| BUG-214 | P1 | 🟡 **半 LANDED** → BUG-228 | CaseFormsTab 已接 `useI18n()` + 加 emit，但 **CaseDetailView 没接 `@open-generate-modal` handler**，"生成文書"按钮点击仍无任何反应 |
| BUG-215 | P1 | 🟡 **半 LANDED** → BUG-227 | CaseDeadlinesTab 同上：emit 接好了，**父级未接 `@open-create-deadline`**，"添加期限"按钮死按钮（点击无 modal、无反应） |
| BUG-216 | P1 | ❌ **仍未修** | 终态案件 (S9 / CLOSED_*) 头部 "编辑信息" / "状态流转" 仍可点 + popover 空 + 编辑 modal 字段全 enabled，与 readonly banner 矛盾 |
| BUG-217 | P1 | 🔴 **假修复 → BUG-226 P0** | CaseMessagesTab emit + form reset 都加了，但 **CaseDetailView 没接 `@publish-message`** —— 用户输入清空了但 0 网络请求，**伪成功** 比 R25 时更危险 |
| BUG-218 | P1 | ❌ **仍未修** | "新增任务"仍跳转 `/#/tasks`（且 `?case=` query 也丢了），任务页 0 条数据 + 无创建入口，死循环 |
| BUG-219 | P2 | ✅ **LANDED** | `case_party.created` → "添加关联人"、`case.created` 也 i18n 化 |
| BUG-220 | P2 | ✅ **LANDED** | 日志 entry "案件创建：经营管理（认定4个月）" — case_type enum 已走字典 |
| BUG-221 | P2 | ❌ **仍未修** | ja-JP `cases.constants.logCategories.all = "全部"` 仍是中文（应 "すべて"）|
| BUG-222 | P2 | ❌ **仍未修** | 概览右侧 "案件团队" / "近期动态" / "资料收集分组进度" 卡片在数据为空时仍是空白 |
| BUG-223 | P3 | ❌ **仍未修** | 终态 banner "此案件已归档（已归档），所有字段为只读" 文案仍重复 |
| BUG-224 | P3 | 🟡 **半 LANDED** → BUG-230 / 231 | 编辑 modal 字段从 3 个扩到 8 个，但**全是普通 textbox 无 picker / 无校验**，且**砍掉了原来的"管辖机构 / 备注"两个字段** |
| BUG-225 | P3 | ❌ **仍未修** | WAITING_PAYMENT phase 仍能没有 billing_records；CASE-202604-0018 概览"财务状况：—" |

**统计**：5 PASS / 3 半 LANDED / 6 仍未修 / 14 总数 = 36% 真 land 率。

### 0.3 R26 新发现 BUG 清单

| BUG ID | 等级 | 位置 | 摘要 | 取证截屏 |
|---|---|---|---|---|
| **BUG-226** | **P0** | `CaseMessagesTab.vue` L31（emit）+ `CaseDetailView.vue` L464-468（缺 `@publish-message`）| **沟通记录"记录留痕"假修复**：子组件 emit 'publish-message' + 清空 textbox，但 `CaseDetailView` 完全没接此事件 → 用户输入文本 + 选类型 + 点提交后看到 textbox 清空（误以为成功），但 `list_network_requests` 0 个 POST 请求，列表仍"暂无沟通记录"。**比 R25 BUG-217 更危险**：当时是按钮无反应、用户至少知道没成功；现在 R26 是"伪成功"，沟通记录这种合规留痕功能完全失效却显示成功 UI | `13-bug-publish-message-no-network.png` |
| **BUG-227** | **P1** | `CaseDeadlinesTab.vue` L80（emit）+ `CaseDetailView.vue`（缺 `@open-create-deadline`）| **"添加期限"假修复**：子组件 emit `open-create-deadline`，但 `CaseDetailView` 没接 → 点击按钮 0 反应、0 modal、0 console error；R25 标 LANDED 但实际只补了 emit 和单测，没补父级 wiring | `20-add-deadline-after-click.png` |
| **BUG-228** | **P1** | `CaseFormsTab.vue` L59（emit）+ `CaseDetailView.vue`（缺 `@open-generate-modal`）| **"生成文書"假修复**：同 BUG-227 模式 — 子组件 emit `open-generate-modal`，父级未接 → 点击 0 反应 | `21-bug-generate-form-no-modal.png` |
| **BUG-229** | **P1** | `CaseDocumentRow.vue` L194 | 资料项状态 chip 直接渲染 `{{ item.statusLabel }}`，但 `item.statusLabel` 是 i18n key 字符串（如 `"documents.status.pending"`），未走 `t()` → R26 走查通过"手动添加"创建一条资料项后，列表 chip 显示 raw key `documents.status.pending` 而非"待提交" | `22-non-terminal-checklist-tab.png` |
| **BUG-230** | **P1** | `CaseEditModal.vue`（新版字段集）| 编辑案件信息 modal 把 `priority` / `riskLevel` / `ownerUserId` / `assistantUserId` / `groupId` 5 个字段全部暴露为普通 `<input type="text">`，没有 picker / select / typeahead / 任何前端校验 → 用户能输入"宇宙第一优先級★★★★★"等任意字符串；`ownerUserId` / `assistantUserId` / `groupId` 字段名暗示要 UUID，但 UI 让用户写自由文本，**写脏数据 / server 拒绝时无前端反馈**。`evaluate_script` 直接读 input 属性确认全是 `type=text` 无 readonly | `04-bug-edit-modal-no-validation.png` |
| **BUG-231** | **P2** | `CaseEditModal.vue` 字段集 | R25 时 modal 含"管辖机构 / 备注"3 个字段 → R26 改版后字段扩到 8 个但**砍掉了原来的"管辖机构 / 备注"**，导致这两个字段虽然在"基础信息" tab 展示（"管辖机构: —"），但**完全无 UI 入口可编辑**；属于 R25 半修复 BUG-224 时引入的回归 | `04-bug-edit-modal-no-validation.png` |
| **BUG-232** | **P2** | `packages/admin/src/i18n/messages/cases/zh-CN.ts` L515-527、L884 | zh-CN 字典 `cases.detail.forms.title = "文書管理"` / `generateAction = "生成文書"` / `empty = "暂无可用文書模板或生成记录"` —— 把日文字形「文書」当作中文用；`cases.detail.log.events.generatedDocumentCreated = "文書生成：{suffix}"` 同病 → zh-CN 用户看到混杂中日文界面 | `00-detail-forms-tab-zhcn.png`（标题/按钮/placeholder 全用「文書」）|
| **BUG-233** | **P2** | `CaseOverviewTab.vue`（"资料收集分组进度"区）| 概览页 "按提供方完成率 / 资料收集分组进度" 标题下方在 `groupProgress = []` 时显示一个 0px 高的空白区域，无空状态文案、无 placeholder，与 BUG-222 同根但**额外暴露**这一区也漏空状态处理（R25 BUG-222 只覆盖了 sidebar 团队/动态卡） | `01-detail-overview-zhcn.png`（中部空白区） |
| **BUG-234** | **P2** | `CaseDocumentsTab.vue` 终态分支 | 终态案件 (CLOSED_*) 资料清单 tab 仍显示 "暂无资料登记 / 该案件尚未添加任何资料需求。请通过『登记资料』或『手动添加』开始建立资料清单" 引导文案 → 与"案件已归档，所有字段为只读" 顶部 banner 矛盾，应改为"案件已归档，无资料登记" | `05-terminal-checklist-tab.png` |
| **BUG-235** | **P3** | `CaseTasksTab.vue` 跳转 url 拼接 | "新增任务"按钮跳转目标 `router.push('/tasks')` 现已**丢失** R25 时还有的 `?case=<id>` query —— 即使后续修复 BUG-218 改为本页 modal，期间 url 信息丢失也已是回归 | `14-bug-add-task-still-redirect.png` |
| BUG-236 | P3 | "下一关键动作"卡片在终态 | 终态案件概览 "下一关键动作" 卡片显示 "已结案（失败），可查看关闭原因 / 退款待人工处理。" — 但**没有"查看关闭原因"或"退款"的可点链接 / 按钮**，文案承诺了功能但 UI 没提供入口 | （评估，参见 `02-bug216-terminal-popover-still-empty.png` 中部）|

### 0.4 R26 走查路径总览

```
登录态校验（admin@local.test 自动登录成功）
  → 直达 CASE-202605-0006?tab=forms（自动重定向 redirect）
    → 截屏 00：文書 tab zh-CN（"文書管理"+"生成文書"+「文書」字形 BUG-232）
  → /#/cases/5d38aaac-bdaa-483d-9ac3-64f72d9de27f 概览
    → 截屏 01：概览 zh-CN（4 个 sidebar/中部空白区 BUG-222 + BUG-233）
  → /#/cases/ca9fc4bb-eff1-45ef-8145-aba05899e778 (CLOSED_FAILED, S9) 终态
    → 头部"编辑信息"+"状态流转" 都可点 — BUG-216 仍未修
    → 截屏 02：终态状态流转 popover 空（"业务阶段流转"+"当前：失败归档"+"确认流转 disabled"）
    → 截屏 03：终态编辑信息 modal 字段全部 enabled（与 banner 矛盾）
    → 截屏 04：modal 字段无校验（"宇宙第一优先級★★★★★" 也能输）
    → 终态 9 个 tab 全部走查 → 截屏 05~12（资料清单/期限/沟通记录/收费/基础信息/提交前检查/任务/文书/日志）
    → 期限 tab 隐藏"添加期限"按钮 ✅ 守门 OK
    → 任务 tab 隐藏"新增任务"按钮 ✅ 守门 OK
    → 文书 tab 隐藏"生成文書"按钮 ✅ 守门 OK
    → 沟通记录 tab 隐藏 publish 输入区 ✅ 守门 OK
    → 资料清单 tab 仍显示 "请通过『登记资料』或『手动添加』开始" 引导文案 ❌ BUG-234
    → 终态 banner 文案 "已归档（已归档）" 重复 ❌ BUG-223 仍未修
  → /#/cases/9854ce6c-71f1-448f-9e1b-25ebb934d760 (WAITING_PAYMENT, S7) 沟通记录
    → 输入"R26 audit 测试..."+ 默认"内部记录"+ 点"记录留痕"
    → 截屏 13：textbox 清空 + 列表仍"暂无沟通记录" + network 0 个 POST → BUG-226 P0 假修复
    → 任务 tab 点"新增任务" → 截屏 14：跳 /tasks 0 条数据 + 无创建入口 BUG-218 仍未修
  → CASE-202605-0006 ?tab=info → 案件编号/类型 i18n ✅ BUG-213 LANDED
  → ?tab=log → "添加关联人" + "案件创建：经营管理（认定4个月）" ✅ BUG-219/220 LANDED
  → ja-JP 切换：截屏 15~17（log/forms/billing 三 tab）
    → 截屏 16：日志 radio "全部" 仍是中文 ❌ BUG-221 仍未修
    → 截屏 17：文书 tab "文書管理"+"文書を生成" ✅ ja-JP i18n OK
    → 截屏 19：billing tab 全部 i18n OK
  → en-US 切换：截屏 18 forms tab "Document Management"+"Generate Document" ✅
  → ja-JP 提交前检查 tab：4 个 disabled 按钮 title="準備中" ✅ BUG-212 LANDED
  → zh-CN 提交前检查 tab：4 个 disabled 按钮 title="建设中" ✅ BUG-212 LANDED
  → 期限 tab "添加期限"点击：截屏 20 → 0 反应 BUG-227 假修复
  → 文书 tab "生成文書"点击：截屏 21 → 0 反应 BUG-228 假修复
  → 资料清单 tab "手动添加" → modal 弹出 → 输入 "R26 audit test" + 选"主申请人"+ 点"添加"
  → 截屏 22：列表新增一条，但状态 chip 显示 "documents.status.pending" raw key BUG-229
```

整轮 0 个 5xx / 0 console error / 0 console warning / 0 网络异常。

---

## 1. P0 缺陷

### BUG-226 ⚠️ 沟通记录"记录留痕"完全假修复 — 输入清空但 0 网络请求 / 0 落库

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseMessagesTab.vue` L31（`emit("publish-message", ...)`）+ `CaseMessagesTab.vue` L139（`@click="handlePublish"`）+ **`CaseDetailView.vue` L464-468 缺 `@publish-message="..."` 接线** |
| 复现 | 1. CASE-202604-0018（非终态）→ 沟通记录 tab；2. 在 textbox 输入 "R26 audit 测试：内部记录后验证是否落库"；3. combobox 选 "内部记录"（默认）；4. 点 "记录留痕"；5. **观察：textbox 清空 + 列表仍"暂无沟通记录" + `list_network_requests` 0 个 POST + 0 console message + 0 toast** |
| 实证 | ① `Grep '@click\|publish-message'` `CaseMessagesTab.vue` → L19 emit type 声明、L31 emit('publish-message')、L139 button @click="handlePublish"；② `Grep '@publish-message'` `CaseDetailView.vue` → 0 hits；③ `CaseDetailView.vue` L464-468 `<CaseMessagesTab :detail :readonly />` 无任何 event listener；④ 实测 reqid 列表 71 条全是 GET（最后一个写操作 reqid=51631 是 BUG-229 走查时的 POST `/api/document-items`，与 messages 无关）|
| 期望 | ① `CaseDetailView.vue` `<CaseMessagesTab>` 加 `@publish-message="onPublishMessage"`；② model 层 `useCaseDetailViewModel` 暴露 `onPublishMessage(payload)`，调 `caseRepo.createCommunicationLog({ caseId, content, channel, ... })`（`CaseRepository.ts` L249 已有此方法）；③ 成功后调用 model 里的 refetch，让 messages 列表刷新；④ 失败时 toast；⑤ 加 `CaseDetailView.bug226-publish-wiring.test.ts` 断言 mount detail view 后 emit `publish-message` 应触发 repo.createCommunicationLog 调用 |
| 影响 | **P0 — 数据丢失 + 伪成功**：1) 比 R25 BUG-217 更严重，当时按钮无 click handler 用户至少能看出"无反应"；R26 现在 textbox 清空 + 按钮回到 disabled 给了"成功"的视觉反馈，**用户以为已经记录了，实际数据 0 落库**；2) 沟通记录是行政书士事务所合规留痕的 P0 业务（出现纠纷需取证），数据丢失意味着合规风险；3) 此模式（"emit + 单测通过 + 父级未接 = 假 land"）在 R25 BUG-214 / 215 / 217 三处同时出现，是修复模式的系统性缺陷 |
| 取证 | `13-bug-publish-message-no-network.png`（textbox 已清空 + 列表"暂无沟通记录"）|
| 建议补丁 | 1. CaseDetailView.vue `<CaseMessagesTab>` 加 `@publish-message="onPublishMessage"`；2. model `useCaseDetail()` 加 `async function onPublishMessage(payload) { await caseRepo.createCommunicationLog({ caseId, ...payload }); await refetch.communicationLogs(); toastSuccess(...); }`；3. 加端到端测试 `CaseDetailView.bug226-publish-roundtrip.test.ts`：mount → 用 fake repo 验证 createCommunicationLog 被调用且 args 正确；4. **顺带补 BUG-227 / BUG-228** —— 同模式三处一并改 |
| 等级 | **P0 — 业务关键写操作"假成功"导致数据丢失** |
| 状态 | 新发现 / 未 land |

---

## 2. P1 缺陷

### BUG-227 ⚠️ 期限 tab "添加期限" 假修复（同 BUG-226 模式）

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseDeadlinesTab.vue` L16 emit type、L80 `@click="emit('open-create-deadline')"` + **`CaseDetailView.vue` 缺 `@open-create-deadline` 接线** |
| 复现 | 1. 任一非终态案件详情 → 期限 tab；2. 点"添加期限"按钮；3. **0 反应**：无 modal、无 toast、无 network、无 console |
| 实证 | `Grep 'open-create-deadline\|openCreateDeadline\|create-deadline'` 在 `views/cases` → 仅命中 CaseDeadlinesTab.vue 自己的 emit 与 `CaseDeadlinesTab.bug215.test.ts` 单测；CaseDetailView 未引用此事件 |
| 期望 | 同 BUG-226：父级接 + model 提供 handler + 弹 modal（已存在 PaymentModal 模式可参考）+ 调 server `POST /api/case-deadlines`（如 endpoint 未实现需补）|
| 影响 | "添加期限" 是显著主操作按钮，按了完全 0 反应；R25 BUG-215 时只测了 emit、未测 父级 wiring，导致"测试通过 + UI 失效"|
| 取证 | `20-add-deadline-after-click.png` |
| 等级 | **P1 — 主操作死按钮（假修复）** |
| 状态 | 新发现 / 未 land |

### BUG-228 ⚠️ 文书 tab "生成文書" 假修复（同 BUG-226 模式）

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseFormsTab.vue` L16 emit type、L59 `@click="emit('open-generate-modal')"` + **`CaseDetailView.vue` 缺 `@open-generate-modal` 接线** |
| 复现 | 1. 任一非终态案件详情 → 文书 tab；2. 点"生成文書"按钮；3. **0 反应**：无 modal、无 toast、无 network |
| 实证 | `Grep 'open-generate-modal\|openGenerateModal\|generate-form'` 在 `views/cases` → 仅命中 CaseFormsTab.vue 自己的 emit 与 `CaseFormsTab.bug214.test.ts` 单测 |
| 影响 | 同 BUG-227 |
| 取证 | `21-bug-generate-form-no-modal.png` |
| 等级 | **P1 — 主操作死按钮（假修复）** |
| 状态 | 新发现 / 未 land |

### BUG-229 ⚠️ 资料清单 chip 显示原始 i18n key `documents.status.pending`

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseDocumentRow.vue` L194 `<Chip>{{ item.statusLabel }}</Chip>` |
| 复现 | 1. CASE-202605-0006（CONSULTING）→ 资料清单 tab；2. 点"手动添加"开 modal；3. 资料项名称填 "R26 audit test"；4. 提供方选 "主申请人"；5. 点 "添加"；6. modal 关闭、列表新增 1 条，**状态 chip 直接显示 `"documents.status.pending"` 字面字符串**（应是"待提交"）|
| 实证 | ① `evaluate_script` 取 chip outerHTML 确认渲染内容是 `documents.status.pending`；② 字典 `documents/zh-CN.ts` L79 `status.pending = "待提交"` 真存在；③ `CaseDocumentRow.vue` L194 直接 `{{ item.statusLabel }}`，未走 `t()`；④ network reqid=51631 `POST /api/document-items` [201]，资料项确实写库成功，问题只在 view 渲染层 |
| 期望 | `CaseDocumentRow.vue` L194 改 `{{ t(item.statusLabel) }}`；同时审视 `CaseBillingTab.vue` L43 已有的"优先 i18n catalog 否则 fallback row.statusLabel"模式可统一抽 helper |
| 影响 | 1) 任何已存在资料项的案件、所有 phase、所有 locale 都受影响；2) 资料清单是 P0 业务功能；3) raw i18n key 暴露破坏专业感、屏幕阅读器朗读 raw key 无意义 |
| 取证 | `22-non-terminal-checklist-tab.png`（chip 文字 = `documents.status.pending`） |
| 建议补丁 | 1. `CaseDocumentRow.vue` L194 改 `{{ t(item.statusLabel) }}`；2. **顺带审视 adapter 层** — `DocumentDetailItemAdapter` 是否其他类似字段也输出 raw key（其单测显示 `statusLabel = "documents.status.pending"` 设计上就是返 i18n key，view 必须走 `t()`）；3. 加 `CaseDocumentRow.bug229.test.ts` 断言 chip text 经 i18n stub 后能解析为本地化字符串 |
| 等级 | **P1 — i18n 漏走 + 影响所有资料项 chip** |
| 状态 | 新发现 / 未 land |

### BUG-230 ⚠️ 编辑案件信息 modal 无校验：5 个枚举/外键字段全是裸 textbox

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseEditModal.vue` 字段集 |
| 复现 | 1. 任一案件详情 → 点"编辑信息"；2. 观察 8 个字段：① 案件名称（text）② 目标提交日期（date）③ 受理日期（date）④ **优先级（text，应为 select low/normal/high）** ⑤ **风险等级（text，应为 select normal/attention/high）** ⑥ **负责人（text input name="ownerUserId"，应为 user picker）** ⑦ **协办人（text input name="assistantUserId"）** ⑧ **分组（text input name="groupId"）**；3. 在"优先级"输入 "宇宙第一优先級★★★★★"、"风险等级"输入 "骇人听闻【"、点保存 |
| 实证 | `evaluate_script` 直接读 input 属性返回 `[ {type:"text", name:"priority", value:""}, {type:"text", name:"riskLevel"}, {type:"text", name:"ownerUserId"}, {type:"text", name:"assistantUserId"}, {type:"text", name:"groupId"} ]` 全是 `type=text`、无 readOnly、无 disabled、无 pattern、无 maxlength |
| 期望 | ① `priority` 改 `<select>` 列出 `low/normal/high`（与基础信息 tab 显示口径一致）；② `riskLevel` 改 `<select>` 列出 `normal/attention/high`；③ `ownerUserId` 改 user picker，从 `/api/users` 列出（已有"全部负责人"列表可复用）；④ `assistantUserId` 同上；⑤ `groupId` 改 select 列出 "东京一组/二组" |
| 影响 | 1) 用户能写"自由文本"作为枚举 / UUID，server 校验若不严会落库脏数据；2) 用户也无法看到合法选项（不知道有哪几种 priority），UX 差；3) 字段名 `ownerUserId` 暗示要 UUID，UI 无 typeahead，普通运营无法使用 |
| 取证 | `04-bug-edit-modal-no-validation.png` |
| 建议补丁 | 1. CaseEditModal.vue 改字段控件；2. composable `useUserOptions` / `useGroupOptions` / `usePriorityOptions` / `useRiskLevelOptions`；3. 加 modal 三语 i18n key；4. 加单测 `CaseEditModal.bug230-controls.test.ts` |
| 等级 | **P1 — 数据完整性 / UX 严重缺陷** |
| 状态 | 新发现 / 未 land |

### BUG-216 终态权限失守 — R25 仍未修

| 字段 | 值 |
|---|---|
| 位置 | `CaseDetailView.vue` L278 `@click="editModalOpen = true"`、L318 `@click="phaseMenu.openMenu()"` 两个 header 按钮 |
| 复现 | 1. CASE-202604-0007（CLOSED_FAILED, S9）；2. 点"状态流转"→ popover 弹出但内部空（无目标项、确认按钮 disabled），用户困惑；3. 点"编辑信息"→ modal 全字段可编辑（textbox 全部 enabled） |
| 实证 | `Grep 'isReadonly\|isTerminal' CaseDetailView.vue` 显示 L65/79 已计算、L431-484 子 tab 均传了 `:readonly="isReadonly"`，唯独 L278/318 两个 header 按钮**未受守门** |
| 期望 | ① 加 `:disabled="isReadonly"` + i18n title；② phaseMenu.openMenu 顶部加 `if (isTerminal) return;` 双重守门 |
| 取证 | `02-bug216-terminal-popover-still-empty.png` / `03-bug216-terminal-edit-modal-still-active.png` |
| 等级 | **P1 — 权限失守 + 文案矛盾（R25 未 land）** |
| 状态 | 待 land（R25 已记） |

---

## 3. P2 缺陷

### BUG-231 编辑信息 modal 改版后砍掉了"管辖机构 / 备注"字段

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseEditModal.vue` 新版字段集 |
| 复现 | 1. R25 时 modal 含"案件名称 / 管辖机构 / 备注"3 字段；2. R26 复测显示新字段集为 8 个：案件名称 / 目标提交日期 / 受理日期 / 优先级 / 风险等级 / 负责人 / 协办人 / 分组 — **"管辖机构" 与 "备注" 不见了**；3. 但基础信息 tab 仍显示"管辖机构: —"行 → 用户无法在 UI 内编辑此字段 |
| 期望 | 决策：①"管辖机构" 加回（且改 select 入管局列表）；②"备注" 加回（textarea） |
| 影响 | 半修复 BUG-224 时引入回归 |
| 取证 | `04-bug-edit-modal-no-validation.png` 与 R25 时 `06-edit-modal-only-3-fields.png` 对比 |
| 等级 | **P2 — 字段回归** |
| 状态 | 新发现 / 未 land |

### BUG-232 zh-CN 字典里 "文書" 用的是日文字形（应为简体"文书"）

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/i18n/messages/cases/zh-CN.ts` L515 / L516 / L518 / L521 / L523 / L525 / L527 / L884 |
| 复现 | 切 zh-CN，任一案件详情 → 文书 tab，标题"文書管理" / 按钮"生成文書" / placeholder "暂无可用文書模板或生成记录" / modal 标题"生成文書" / 字段 "文書模板" / "文書标题" 全部用日文字形「文書」；同样问题 `cases.detail.log.events.generatedDocumentCreated = "文書生成：{suffix}"` |
| 实证 | `Grep '文書\|文书' cases/zh-CN.ts` → 11 处「文書」混 5 处「文书」 |
| 期望 | zh-CN 字典统一改"文书"；ja-JP 保留"文書"；en-US 保留 "Document"；保持三语字形一致性 |
| 影响 | zh-CN 用户看到混杂中日文界面（侧栏导航"文书"、tab 标题"文書管理"）；与 BUG-214 /BUG-228 的"文書管理"截图同源问题 |
| 取证 | `00-detail-forms-tab-zhcn.png`（zh-CN 文书 tab）|
| 建议补丁 | 全局 `sed -i '' 's/文書/文书/g' packages/admin/src/i18n/messages/cases/zh-CN.ts`（或手动 grep + replace 11 处）；加 `i18n-zhcn-no-japanese-glyph.test.ts` 静态扫描断言 zh-CN 字典不含「文書」「書類」等日文专用字形 |
| 等级 | **P2 — 字典字形不一致** |
| 状态 | 新发现 / 未 land |

### BUG-233 概览页 "资料收集分组进度" 区在数据为空时空白

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseOverviewTab.vue`（"按提供方完成率 / 资料收集分组进度"区）|
| 复现 | CASE-202605-0006 概览，"按提供方完成率 / 资料收集分组进度" 标题下方完全空白（0px 高 div），无空状态提示 |
| 期望 | 加 v-if/v-else 兜底：`<div v-if="groupProgress.length === 0" class="empty">{{ t('cases.detail.overview.groupProgressEmpty') }}</div>`（参考 CaseInfoTab 已有的 placeholder）|
| 影响 | 与 R25 BUG-222 同根 |
| 取证 | `01-detail-overview-zhcn.png`（中部空白）|
| 等级 | **P2 — 空状态未处理（R25 BUG-222 范围扩大）** |
| 状态 | 新发现 / 未 land |

### BUG-234 终态资料清单 tab 仍显示"请通过『登记资料』或『手动添加』开始"引导

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseDocumentsTab.vue` 终态分支 |
| 复现 | CASE-202604-0007（CLOSED_FAILED）→ 资料清单 tab → 中央显示 "暂无资料登记 — 该案件尚未添加任何资料需求。请通过『登记资料』或『手动添加』开始建立资料清单。" — 与顶部 banner "案件已归档，所有字段为只读" 矛盾 |
| 期望 | 终态显示 "案件已归档，无资料登记" 等收尾文案，不要诱导操作 |
| 影响 | 文案不一致、UX 困惑 |
| 取证 | `05-terminal-checklist-tab.png` |
| 等级 | **P2 — 终态文案不一致** |
| 状态 | 新发现 / 未 land |

### BUG-221 ja-JP `cases.constants.logCategories.all = "全部"` — R25 仍未修

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/i18n/messages/cases/ja-JP.ts` L715 |
| 复现 | 切 ja-JP → 任一案件详情 → 日志 tab → 顶部 radio "全部 / 操作ログ / 審査ログ / ステータス変更ログ" — "全部"是中文 |
| 实证 | R26 重新 `Grep logCategories` 确认 ja-JP L715 仍 `all: "全部"` |
| 期望 | 改 `all: "すべて"` |
| 取证 | `16-ja-log-zenbu-still-zh.png` |
| 等级 | **P2 — 字典级别明显漏译（R25 未 land）** |
| 状态 | 待 land（R25 已记） |

### BUG-222 概览右侧 "案件团队" / "近期动态" 卡片空白 — R25 仍未修

| 字段 | 值 |
|---|---|
| 位置 | `CaseOverviewSidebar.vue` L113-146（team card）+ `CaseOverviewTab.vue` timeline section |
| 复现 | 同 R25 |
| 取证 | `01-detail-overview-zhcn.png`（右侧 sidebar + 中部"近期动态"）|
| 等级 | **P2 — 空状态未处理（R25 未 land）** |
| 状态 | 待 land（R25 已记） |

---

## 4. P3 缺陷

### BUG-235 "新增任务"跳转 url 丢失 `?case=<id>` query

| 字段 | 值 |
|---|---|
| 位置 | `CaseDetailView.vue` `onOpenCreateTask` handler |
| 复现 | R25 时跳转 `/#/tasks?case=9854ce6c-...`；R26 跳转 `/#/tasks` 已无 query |
| 期望 | 即使 BUG-218 不修，至少应保留 `?case=` query 让任务页能根据 query 高亮过滤 |
| 影响 | 信息丢失（虽然任务页未使用此 query 也是 BUG-218 的一部分） |
| 取证 | `14-bug-add-task-still-redirect.png`（url bar）|
| 等级 | **P3 — 信息丢失（R25 时存在的功能回归）** |
| 状态 | 新发现 / 未 land |

### BUG-236 终态"下一关键动作"卡片承诺文案但缺入口

| 字段 | 值 |
|---|---|
| 位置 | `CaseOverviewTab.vue` "下一关键动作"在终态分支 |
| 复现 | CASE-202604-0007 终态 → 概览页"下一关键动作"卡片显示"已结案（失败），可查看关闭原因 / 退款待人工处理。" 但**没有"查看关闭原因"或"处理退款"任何可点链接 / 按钮** |
| 期望 | 提供 2 个 button：① 跳到 `?tab=log` 高亮失败 closeout 日志 entry；② 跳到 `?tab=billing` 高亮退款 row（或 `/billing?case=...`）|
| 影响 | 文案承诺 → UI 失约 |
| 取证 | `02-bug216-terminal-popover-still-empty.png`（中部"下一关键动作"卡）|
| 等级 | **P3 — 文案与 UI 不一致** |
| 状态 | 新发现 / 未 land |

### BUG-223 终态 banner 文案重复 — R25 仍未修

| 字段 | 值 |
|---|---|
| 位置 | `CaseDetailView.vue` L353-355 + i18n key `cases.detail.readonlyBanner` |
| 复现 | 终态 banner 仍显示 "此案件已归档（已归档），所有字段为只读" |
| 取证 | `02-bug216-terminal-popover-still-empty.png`（顶部 banner） |
| 等级 | **P3（R25 未 land）** |
| 状态 | 待 land（R25 已记） |

---

## 5. R26 通过项（确认无回归）

- `BUG-212` ✅ — `evaluate_script` 直读 4 个 disabled 按钮 title：zh-CN "建设中" × 4、ja-JP "準備中" × 4
- `BUG-213` ✅ — 基础信息 tab CASE-202604-0018 显示 "案件编号: CASE-202604-0018 / 案件类型: 经营管理（认定4个月）"
- `BUG-219` ✅ — 日志 entry "添加关联人："（替代了 raw `case_party.created`）
- `BUG-220` ✅ — 日志 entry "案件创建：经营管理（认定4个月）" / ja-JP "案件作成：経営管理（認定4ヶ月）" 都 i18n 化
- `BUG-191/192/199`（R22）仍 ✅ — header `S7 · 已提交待回执 / 等待尾款` 双层状态机正常
- `BUG-205`（R23）仍 ✅ — modal textbox 都有 label
- `BUG-208`（R24）仍 ✅ — admin↔server PHASE_TRANSITIONS 副本对齐（CASE-202604-0018 popover 显示 2 个目标含 CLOSED_FAILED）
- `BUG-211`（R24）仍 ✅ — ja-JP "検証実行" 字形正确
- 资料清单 tab 写操作（"手动添加"）✅ 真 land — `POST /api/document-items` [201] 落库成功（虽然 chip 显示有 BUG-229）
- 终态守门部分正确 ✅ — 期限/任务/文书/沟通记录 tab 在终态隐藏主操作按钮
- 收费 tab "入金登录" 按钮在 ja-JP 下 i18n OK；"応収" chip i18n OK；"請求書情報"+ placeholder 全 i18n
- 整轮 0 个 5xx / 0 console error / 0 console warning / 0 abnormal network

---

## 6. R26 取证截屏

| 文件 | 场景 |
|---|---|
| `00-detail-forms-tab-zhcn.png` | 文书 tab zh-CN：标题"文書管理"+按钮"生成文書"+占位「文書」字形 (BUG-232) |
| `01-detail-overview-zhcn.png` | 概览 zh-CN：sidebar 团队/近期动态空白 + 中部分组进度空白 (BUG-222 / BUG-233) |
| `02-bug216-terminal-popover-still-empty.png` | 终态状态流转 popover 内部空（BUG-216 仍未修）+ banner "已归档（已归档）"重复 (BUG-223) |
| `03-bug216-terminal-edit-modal-still-active.png` | 终态编辑信息 modal 字段全部 enabled (BUG-216) |
| `04-bug-edit-modal-no-validation.png` | 编辑 modal 5 个枚举/外键字段全是 textbox 无 picker (BUG-230)；缺管辖机构/备注 (BUG-231) |
| `05-terminal-checklist-tab.png` | 终态资料清单仍显示"请通过『登记资料』..."引导 (BUG-234) |
| `06-terminal-deadlines-tab.png` | 终态期限 tab：无"添加期限"按钮 ✅ 守门 OK |
| `07-terminal-messages-tab.png` | 终态沟通记录 tab：无 publish 输入区 ✅ 守门 OK |
| `08-terminal-billing-tab.png` | 终态收费 tab：表格空 + "本版本暂不支持发票详情" |
| `09-terminal-info-tab.png` | 终态基础信息 tab：caseNo/caseType i18n 化 (BUG-213 ✅ LANDED) |
| `10-terminal-validation-tab.png` | 终态提交前检查 tab：✅ 校验通过 + 无"重新检查"按钮 ✅ 守门 OK |
| `11-terminal-tasks-tab.png` | 终态任务 tab：无"新增任务"按钮 ✅ 守门 OK |
| `12-terminal-forms-tab.png` | 终态文书 tab：无"生成文書"按钮 ✅ 守门 OK |
| `13-bug-publish-message-no-network.png` | **BUG-226 P0**：textbox 已清空但列表仍"暂无沟通记录" + 0 网络请求 |
| `14-bug-add-task-still-redirect.png` | BUG-218 仍未修：跳 /tasks 0 条 + 无创建入口；url 丢 `?case=` (BUG-235) |
| `15-non-terminal-log-tab.png` | 非终态日志 tab zh-CN：phase 变更 i18n 化 ✅ |
| `16-ja-log-zenbu-still-zh.png` | ja-JP 日志 radio "全部" 仍中文 (BUG-221) |
| `17-ja-forms-tab.png` | ja-JP 文书 tab：i18n OK |
| `18-en-forms-tab.png` | en-US 文书 tab：i18n OK |
| `19-ja-billing-tab.png` | ja-JP 收费 tab：全部 i18n OK |
| `20-add-deadline-after-click.png` | "添加期限"点击 0 反应 (BUG-227 假修复) |
| `21-bug-generate-form-no-modal.png` | "生成文書"点击 0 反应 (BUG-228 假修复) |
| `22-non-terminal-checklist-tab.png` | 资料清单 chip 显示 "documents.status.pending" raw key (BUG-229) |

---

## 7. 落库建议（先后顺序）

1. **P0 BUG-226（沟通记录假成功）+ BUG-227（添加期限）+ BUG-228（生成文書）"假修复三连"**：3 处都是同一个模式（emit 接好了，父级 CaseDetailView 没接 listener）。建议**单 PR 一次性补 3 个 listener + 3 个 model handler + 1 个 contract test**：
   - `CaseDetailView.bug226-emit-wiring.test.ts` 用 spy 验证 publish-message → repo.createCommunicationLog；open-create-deadline → openCreateDeadlineModal；open-generate-modal → openGenerateFormModal。
   - **顺手在 lint 规则里加约束**：CaseDetailView.vue 中 `<Case*Tab />` 的 emit type 必须在 template 中接住（Vue SFC 静态扫描即可实现）。
2. **P1 BUG-229（资料清单 chip raw i18n key）**：1 行改动 (`{{ t(item.statusLabel) }}`) + 1 条单测；最便宜 ROI 高。
3. **P1 BUG-216（终态权限失守）**：R25 已记，1 行改动加 `:disabled="isReadonly"` + i18n title。
4. **P1 BUG-230（编辑 modal 无校验）+ BUG-231（缺管辖机构/备注）**：CaseEditModal 重构，把 5 个 textbox 改 select / picker，并加回 2 个砍掉的字段。
5. **P2 BUG-232（zh-CN 字典「文書」字形）**：sed 全局替换 + 加 i18n 静态扫描断言；可与 BUG-221 一并维护。
6. **P2 BUG-221 / BUG-222 / BUG-233 / BUG-234（i18n + 空状态 + 终态文案）**：可并入"详情页 i18n + 空状态 + 终态收尾"小 PR。
7. **P3 BUG-218（跳转死循环）+ BUG-235（query 丢失）+ BUG-236（终态卡片缺入口）+ BUG-223（banner 文案）+ BUG-225（WAITING_PAYMENT 缺 billing）**：综合产品决策后批量 land；优先级排序看产品。

---

## 8. 走查痕迹

R26 走查在 dev DB 中产生的副作用：

- 1 个新资料项写入：`POST /api/document-items` [201] 创建 1 条 R26 audit test 资料项（绑定到 CASE-202605-0006，主申请人，状态 pending）
- 沟通记录 0 写入（BUG-226 假修复，textbox 文本"R26 audit 测试..."未触发任何 API 调用）
- 编辑案件信息 modal 的脏数据未保存（BUG-230 走查时未点保存按钮）
- 期限 / 文书写操作 0 触发（BUG-227 / BUG-228 假修复）
- 无 phase 实际推进
- 无 sign-out / role 切换

如需还原 dev DB，请删除 CASE-202605-0006 名下名为 "R26 audit test"、提供方=主申请人、status=pending 的资料项即可（其余无副作用）。

---

## 9. R26 发现的"修复模式"教训

R25 把 4 个死按钮（BUG-214 / 215 / 217 / 218）标为 P1，R26 重测发现：

### 教训 1：**emit 修复 != 真修复** —— 需要"父子 wiring contract"

R25 BUG-214 / 215 / 217 三个修复都同模式：
1. 子组件加 `useI18n()` ✅
2. 子组件 emit 'event-x' ✅
3. 子组件单测断言 emit 触发 ✅
4. **父级 CaseDetailView 接 emit 的 listener — 漏 ❌**

结果：CI 通过、修复"看起来 land 了"，但用户实际点按钮 0 反应。BUG-226（沟通记录"伪成功"）甚至比未修前更危险。

**后续防御**：
- 子组件单测之外，**必加 contract test**：`mount(CaseDetailView)` → trigger 子组件 button click → 断言 model layer 的 handler 被调用。
- Lint 规则：CaseDetailView.vue template 中所有 `<Case*Tab />` 上，子组件 emit 类型集合必须 ⊆ 父级 listener 集合（Vue SFC AST 静态分析）。

### 教训 2：**字段控件类型与字段语义错配**

BUG-230 的 `priority` / `riskLevel` 是枚举、`ownerUserId` / `assistantUserId` / `groupId` 是外键 UUID，但全用 `<input type="text">` —— 这是**领域类型与 UI 控件未挂钩**的典型问题。

**后续防御**：
- 在 domain 层定义字段时同时声明 UI 提示：`{ name: 'priority', type: 'enum', values: ['low','normal','high'], control: 'select' }`
- ESLint 规则 / 自定义检查：CaseEditModal 字段集如果引用了 domain 里标 `enum` 或 `fk` 的字段，必须用对应控件而非裸 `<input>`。

### 教训 3：**字典字形未做静态校验**

BUG-232 zh-CN 字典里把日文「文書」当中文用、BUG-221 ja-JP 字典里把"全部"误填中文 —— 都是肉眼很难审出的 bug。

**后续防御**：
- `i18n-zhcn-no-japanese-glyph.test.ts`：扫描 zh-CN 字典 value 不允许含「文書 / 書類 / 関連 / 検証 / 経営」等仅日文写法；
- `i18n-jajp-no-chinese-glyph.test.ts`：扫描 ja-JP 字典 value 不允许含「全部 / 关联 / 检查 / 经营」等仅简体写法；
- 三语 key 集合一致性：每个 namespace 下 zh/ja/en 字典 key 集合必须完全相等，缺 key 直接 fail（防 vue-i18n 默认 fallback 到 zh-CN 不报错）。

### 教训 4：**i18n key 在 view 层"裸渲染"**

BUG-229 因为 view 层 `{{ item.statusLabel }}` 直接渲染 adapter 输出的 i18n key 字符串，未走 `t()` —— 这是 view / adapter 协议不清晰。

**后续防御**：
- 约定 adapter 输出字段命名：以 `Label` 结尾的字段必须是已本地化字符串（adapter 内部走 `t()`）；如果是 i18n key 则字段命名为 `LabelKey` 或 `LabelI18nKey`，view 层必须 `t()` 之；
- `Chip` 等通用组件加 prop `:i18n-key`，避免 view 层手写 `{{ t(...) }}`。

### 教训 5：**终态守门散布在多处**（R25 BUG-216 教训重申）

R25 已记，R26 仍未 land。建议抽 `useCaseDetailGuard(detail)` composable 一次性提供 `{ isReadonly, isTerminal, canEdit, canTransition, canAddTask, canPublishMessage, canEditField(name) }`，header / body / modal 三处统一引用。
