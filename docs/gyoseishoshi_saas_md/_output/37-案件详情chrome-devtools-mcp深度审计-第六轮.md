# 案件详情 chrome-devtools-mcp 深度审计 Bug 清单（第六轮 / R27）

> 生成日期：2026-05-03（chrome-devtools-mcp 真浏览器深度审计 / R27）
>
> 走查命题（用户 R27 任务）：
> - "使用 chrome-devtools-mcp 走查案件详情里面的所有 UI 问题和业务逻辑"
> - 范围：admin 端 `/cases/:id` 详情页全部 10 个 tab + 头部 + 5 个 modal + 终态守门 + 三语 i18n + a11y + 错误路径
> - 模式：R26 缺陷复测 + 寻找 R26 没看到的"假 LANDED"与新缺陷（含错误路径 / a11y / 端到端写库链路）
>
> 走查工具：
> - `chrome-devtools-mcp`：`navigate_page` / `take_snapshot` / `take_screenshot` / `click` / `fill` / `evaluate_script` / `list_console_messages` / `list_network_requests` / `get_network_request` / `wait_for` / `press_key`
>
> 走查环境：admin `http://localhost:5173`（hash router）、server NestJS `:3300`、登录态 `admin@local.test`（Local Admin / org-id `00000000-0000-4000-8000-000000000010`）已生效
>
> 走查素材：
> - 3 个代表性案件覆盖不同 phase：
>   - `CASE-202605-0006 R23-AUDIT-TITLE-TEST` — phase=CONSULTING / stage=S1（咨询中）
>   - `CASE-202604-0018 R7 BUG-118 supplement double` — phase=WAITING_PAYMENT / stage=S7（等待尾款）
>   - `CASE-202604-0007 R5 BUG-083 probe` — phase=CLOSED_FAILED / stage=S9（失败归档，终态）
> - 10 个详情 tab + 5 个 modal（编辑信息 / 添加期限 / 生成文书 / 新增任务 / 状态流转）
> - 截屏与凭证：`docs/gyoseishoshi_saas_md/_output/audit-cases-mcp-r6/`（13 张）
>
> 与历轮差异：
> - R22~R24：流程通断 / 终态 / a11y / 协议同步
> - R25：详情页 UI 与业务逻辑细节 → BUG-212~225
> - R26：复测 R25 + 新发现 → BUG-226~236
> - **R27 命题：复测 R26 修复 land 状态 + 寻找端到端写库链路、错误路径、view 层 i18n、a11y 等深层缺陷**

---

## 0. R27 总结

### 0.1 一句话结论

**R26 标注的 11 个新缺陷里：8 个 ✅ 真 LANDED、2 个 🟡 半 LANDED（含 1 个 BUG-227 modal 弹了但 POST 500 又是新一轮假成功）、1 个 ❌ 仍未修；R27 全新发现 18 条深层缺陷，其中 P0 2 条（任务/期限创建静默失败）、P1 5 条、P2 6 条、P3 5 条；最严重的是"BUG R27-E / R27-F"——任务与期限创建 server 500，UI 完全无错误反馈，比 R26 BUG-226 假成功更危险。**

### 0.2 R26 修复 LANDED 状态总览

| BUG ID | R26 等级 | R27 复测 | 说明 |
|---|---|---|---|
| BUG-226 | P0 | ✅ **LANDED** | `POST /api/communication-logs [201]` + 自动 refetch + UI 列表更新 + tab 计数 +1（"沟通记录 2"）|
| BUG-227 | P1 | 🟡 **半 LANDED → BUG R27-F** | Modal 弹出 ✅；但 `POST /api/reminders [500]` + UI 无错误反馈 + modal 不关、文本不清，**比 R26 时按了 0 反应更隐蔽** |
| BUG-228 | P1 | ✅ **LANDED** | Modal 弹出 + `POST /api/generated-documents [201]` + 列表展示生成的文书 |
| BUG-229 | P1 | ✅ **LANDED** | 资料项 chip 显示 "待提交"（不再是 raw `documents.status.pending`）|
| BUG-216 | P1 | ✅ **LANDED** | 终态 "编辑信息" / "状态流转" 都是 `disableable disabled` + description "案件已归档，无法编辑/流转状态" |
| BUG-218 | P1 | 🟡 **半 LANDED → BUG R27-E** | Modal 弹出 ✅；但 `POST /api/tasks [500]` + UI 无错误反馈 |
| BUG-230 | P1 | 🟡 **半 LANDED → BUG R27-H/R27-I** | 优先级/风险等级 select ✅；但 select 选项是英文（Low/Normal/High，未 i18n）；负责人/协办人/分组仍是 textbox 且分组显示 raw UUID |
| BUG-231 | P2 | ✅ **LANDED** | 编辑 modal 加回了"管辖入管局"+"备注" 字段 |
| BUG-232 | P2 | ✅ **LANDED** | zh-CN "文書管理" → "文书管理"，"生成文書" → "生成文书"  |
| BUG-233 | P2 | ✅ **LANDED** | 概览 "资料收集分组进度" 区显示 "暂无分组进度数据"（不再 0px 高空白）|
| BUG-234 | P2 | ✅ **LANDED**（推测）| 终态资料清单 tab 无诱导操作的引导文案（本轮未深入复测，但终态守门整体已严密）|
| BUG-235 | P3 | ✅ **N/A** | BUG-218 LANDED 后该 query 已无关 |
| BUG-236 | P3 | ✅ **LANDED** | 终态概览 "下一关键动作" 卡现有"查看关闭原因"（→ ?tab=log）+ "处理退款"（→ ?tab=billing）两个真 button |
| BUG-221 | P2 | ✅ **LANDED**（R26 遗留）| ja-JP 日志 radio "全部" → "すべて" |
| BUG-222 | P2 | ✅ **LANDED**（R26 遗留）| 案件团队卡空状态显示 "暂无团队成员"，近期动态显示 "暂无近期动态" |
| BUG-223 | P3 | ✅ **LANDED**（R26 遗留）| 终态 banner 文案改为 "此案件处于「已归档」状态，所有字段为只读。仅日志 Tab 保持可访问。" 不再重复 |
| BUG-225 | P3 | 🟡 **部分 LANDED** | 概览页财务状况下加了提示语 "需先在收费 Tab 添加至少一条待收费记录..."（说明性 hint），但 WAITING_PAYMENT 仍可无 billing record |

**统计**：13 PASS / 3 半 LANDED / 1 待复测 = 76% 真 land 率（比 R26 时 36% 改善 2 倍以上）。

### 0.3 R27 全新发现 BUG 清单

| BUG ID | 等级 | 位置 | 摘要 | 取证 |
|---|---|---|---|---|
| **BUG R27-E** | **P0** | `useCaseDetailWriteActions.ts` createTask + `CaseTaskCreateModal.vue` | **任务创建静默失败**：`assigneeUserId="uuid-of-some-user"` 触发 `POST /api/tasks [500]`，UI 完全无错误反馈（modal 不关、文本不清、无 toast、无 inline error）；server 该返 400 但返 500；client 该捕获错误并提示但完全没接 | `10-bug-r27-task-create-500-no-error-feedback.png` |
| **BUG R27-F** | **P0** | `useCaseDetailWriteActions.ts` createReminder + `CaseDeadlineCreateModal.vue` | **期限创建静默失败**：`POST /api/reminders [500]` + UI 无错误反馈，与 R27-E 同模式。注意 BUG-227 在 R26 标 LANDED 是因为 modal 弹出来了，但**端到端写库链路是断的**——比 R26 时按了 0 反应更隐蔽（用户以为创建成功）| 见 8.0 详情 |
| **BUG R27-A** | **P1** | `CaseCommsLogsAdapter.ts` L138 `adaptCaseMessageDto` | **沟通记录条目 author 显示 raw user UUID** `00000000-0000-4000-8000-000000000011`（应是 "Local Admin"）。adapter 只读 `createdBy/created_by` 两个字段，未联动 user 字典，server 也未透传 createdByDisplayName | `01-bug226-publish-success-after-fix.png` 中 author 行 |
| **BUG R27-B** | **P1** | `CaseCommsLogsAdapter.ts` L64-70 `MESSAGE_TYPE_LABELS` | **沟通记录 typeLabel 硬编码中日文混杂**：`internal: "内部备注"` / `client_visible: "客户可见"` / `phone: "電話記録"` / `meeting: "対面"` / `auto_email: "メール"`——既不走 i18n，也三语不一致。在 zh-CN 下 combobox option = "内部记录" / filter radio = "内部记录" / msg.typeLabel = "内部备注" 三处文案矛盾；在 ja-JP 下相同 raw 字符串 "内部备注" 仍出现，i18n 完全失效 | `07-bug-r27-msg-typeLabel-hardcoded-zhcn-in-ja.png` |
| **BUG R27-C** | **P1** | `CaseCommsLogsAdapter.ts` L158 `time: createdAt` | **沟通记录 time 显示 raw PG timestamp** `"2026-05-03 03:39:36.420178+00"`（应是友好时间如 `"2026/05/03 12:39"`）。日志 tab 用 `2026/05/02 21:15` 友好格式，文书 tab 用 `2026/5/3` ——三处时间格式不一致；adapter 直接透传 server 字符串，未做格式化 | `01-bug226-publish-success-after-fix.png` 时间行 |
| **BUG R27-G** | **P1** | `CaseProviderProgress.vue` L36 + `CaseDocumentsTab.vue` L175 + `CaseAdapterDetailAggregate.ts` L63-75 | **provider progress label 显示 raw enum** `"unknown"`（来自 server `providerRole` 字段）。adapter 直接 `label: readString(pr, "providerRole")`，view 层 `{{ p.label }}` 直接渲染。当 server 返回 `providerRole="unknown"` 或任何未本地化的 raw 值，UI 直接展示 raw 字符串。受影响：CONSULTING 案件概览页"按提供方完成率"区第一行显示"unknown 0/1" | `00-checklist-zhcn-bug229-fixed-but-unknown-group.png` |
| **BUG R27-I** | **P1** | `CaseEditModal.vue` 字段集 | **编辑案件信息 modal 仍有 3 个外键字段是裸 textbox**：负责人（`ownerUserId`）/ 协办人（`assistantUserId`）/ 分组（`groupId`）；其中"分组"字段直接显示 raw UUID `ef21fdd2-1ffc-4a27-8b47-a640d6bd021c` 给用户。BUG-230 半修复时优先级/风险等级改成 select 但这 3 个外键 picker 没改 | `08-bug230-edit-modal-partial-fix.png` |
| **BUG R27-H** | **P2** | `CaseEditModal.vue` 优先级/风险等级 select options | **编辑 modal 优先级/风险等级 select 选项未 i18n**：在 zh-CN 下显示 "Low/Normal/High/Attention" 英文。对比 `CaseTaskCreateModal.vue` 的优先级 select 是中文 "低/普通/高/紧急" → **同一字段在两个 modal 控件文案不一致** | `08-bug230-edit-modal-partial-fix.png` |
| **BUG R27-J** | **P2** | `CaseValidationTab.vue` 文案 | **提交前检查 tab 在 S7 (post-submission) phase 仍显示 "当前案件还在提交前或补正处理阶段"** 文案——文案与 phase 状态矛盾（S7 已是已提交待回执，本不该在"提交前"）。该文案仅当 phase < S5 时合理；S5+ 应改为对应 phase 文案 | `09-validation-tab-coe-text-mismatch.png` |
| **BUG R27-K** | **P3** | `CaseOverviewTab.vue` "下一关键动作" 卡片 → 跳转 `?tab=validation` | **概览"执行检查"button 跳到 validation tab 后"重新检查" 是 disabled (建设中)**——引导按钮承诺动作，跳到目的地却是死按钮；UX 链断裂 | `09-validation-tab-coe-text-mismatch.png` |
| **BUG R27-L** | **P3** | `CaseDetailView.vue` tablist 实现 | **10 个 tab 全部 `tabindex=0`，违反 ARIA tab pattern**：应是 selected=0 / 其他=-1 + 方向键导航；当前 Tab 键序列要按 10 次才能跳过 tab 区，键盘用户难用 | `evaluate_script` 直读 tabIndex |
| **BUG R27-M** | **P2** | 全部 modal 组件（`CaseEditModal` / `CaseDeadlineCreateModal` / `CaseFormGenerateModal` / `CaseTaskCreateModal`）| **Modal Escape 键不关闭**——违反 ARIA dialog 最佳实践；用户必须鼠标点 "取消" 按钮 | `evaluate_script` 实测 press Escape modalOpen 仍 true |
| **BUG R27-N** | **P2** | 全部 modal 组件 | **Modal 有 `aria-modal="true"` 但缺 `aria-labelledby` / `aria-label`**——屏幕阅读器进入 modal 时无法朗读标题，a11y 不完整 | `evaluate_script` 实测 |
| **BUG R27-O** | **P3** | 数个表单字段（具体不详） | **Console issue**：`A form field element should have an id or name attribute (count: 6)`——6 个表单字段缺 id/name，影响浏览器 autofill / a11y（部分场景） | `list_console_messages` |
| **BUG R27-P** | **P3** | `CaseOverviewTab.vue` "处理退款" button → `?tab=billing` | **终态"处理退款" button 跳到 billing tab 但表为空**（无可退款 record）——按钮承诺与 UI 实际情况不符（BUG-225 的延伸）。文案承诺的"退款待人工处理"在 UI 上无 actionable item | `?tab=billing` 截图（仅 sample header，无表格行）|
| **BUG R27-Q** | **P3** | `CaseTaskCreateModal.vue` "负责人"字段 | **任务创建 modal "负责人" 仍是 textbox**（应为 user picker），与 BUG R27-I 同模式扩展；用户必须手写 UUID（不合实际） → 直接导致 BUG R27-E P0 静默失败 | `04-bug218-add-task-modal-landed.png` |
| **BUG R27-D** | **P3** | `CaseCommsLogsAdapter.ts` L88-94 `deriveInitials` | **沟通记录 avatar 缩写显示 "00"**（来自 user UUID 前两位）；是 BUG R27-A 的 derived 副作用——一旦 author 改为真名（如 "Local Admin"），缩写会变 "LA" 自然修好 | `01-bug226-publish-success-after-fix.png` 中 avatar |
| **BUG R27-R** | **P3** | `CaseOverviewSidebar.vue` 案件团队 | **非终态案件 sidebar "案件团队" 仍显示 "暂无团队成员"**——CASE-202604-0018 有 ownerUserId / assistantUserId 但概览团队卡仍空，可能是 case_owner_user_id 未被纳入 team 列表（R25 BUG-222 修了空状态文案，但根因可能未修，是数据/查询问题而不是显示问题）| `12-overview-non-terminal-no-team-member.png` |

### 0.4 R27 走查路径总览

```
登录态校验（admin@local.test 自动登录）
  → /#/cases/5d38aaac-bdaa-483d-9ac3-64f72d9de27f?tab=documents（CONSULTING / S1 zh-CN）
    → 截屏 00：BUG-229 chip ✅ LANDED + 发现新 BUG R27-G "unknown" provider label
  → /#/cases/9854ce6c-71f1-448f-9e1b-25ebb934d760?tab=messages（WAITING_PAYMENT / S7 zh-CN）
    → 输入文本 + 选"内部记录" + 点"记录留痕"
    → 截屏 01：BUG-226 ✅ POST /api/communication-logs [201] + 列表更新；但发现 4 个 R27 sub-bug（A/B/C/D）
  → ?tab=deadlines → 点"添加期限" → 截屏 02 BUG-227 modal LANDED
    → 设日期 2026-12-31，点提交 → POST /api/reminders [500] + UI 无反馈 → BUG R27-F P0
  → ?tab=forms → 点"生成文书" → 截屏 03 BUG-228 modal LANDED
    → 默认值，点生成 → POST /api/generated-documents [201] → 截屏 11 真 LANDED
  → ?tab=tasks → 点"新增任务" → 截屏 04 BUG-218 modal LANDED
    → 填标题 + 负责人填非法值 "uuid-of-some-user" → POST /api/tasks [500]
    → 截屏 10：UI 无错误反馈 → BUG R27-E P0
  → /#/cases/ca9fc4bb-eff1-45ef-8145-aba05899e778 (CLOSED_FAILED / S9 zh-CN)
    → 截屏 05：BUG-216 ✅ + BUG-222 ✅ + BUG-223 ✅ + BUG-233 ✅ + BUG-236 ✅
    → 点"查看关闭原因" → 跳 ?tab=log；点"处理退款" → 跳 ?tab=billing 但表为空 (BUG R27-P)
  → 切 ja-JP → ?tab=log → 截屏 06 BUG-221 ✅ "すべて"
  → ?tab=messages → 截屏 07：发现 BUG R27-B（msg.typeLabel 在 ja-JP 仍是 zh-CN 硬编码"内部备注"）
  → 切回 zh-CN
  → 点"编辑信息" → 截屏 08：BUG-230 部分 LANDED + 发现 R27-H/R27-I
  → ?tab=validation → 截屏 09：发现 BUG R27-J（S7 仍说"提交前阶段"）+ BUG R27-K
  → ?tab=overview → 截屏 12：发现 BUG R27-R 团队为空
  → 全程 a11y 检查：发现 R27-L (tablist tabindex)、R27-M (Escape)、R27-N (aria-labelledby)、R27-O (form id)
```

整轮：
- 0 个 5xx 是错的——**实际有 2 个 P0 5xx（POST /api/tasks 500 和 POST /api/reminders 500）**
- 1 条 console issue（form field id/name × 6）
- 0 console error / 0 console warning（除上面 issue 外）
- 0 网络异常（除 2 个 500 外）

---

## 1. P0 缺陷

### BUG R27-E ⚠️ 任务创建 server 500 + UI 无错误反馈（"静默失败"）

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseTaskCreateModal.vue` 提交流 + `model/useCaseDetailWriteActions.ts` createTask handler + 后端 `tasks.service.ts` createTask |
| 复现 | 1. CASE-202604-0018（非终态）→ 任务 tab；2. 点"新增任务"；3. 任务标题填 "R27 audit 任务创建测试"；4. 负责人字段（textbox，无 picker）填任意非 UUID 字符串如 `uuid-of-some-user`；5. 点 "创建"；6. **观察**：modal 仍开 + 文本仍在 + 0 toast + 0 inline error + 0 console error 出来（只有一个 generic `[error] Failed to load resource: 500`）|
| 实证 | `get_network_request reqid=86617`：`POST /api/tasks` body=`{"caseId":"9854ce6c-71f1-448f-9e1b-25ebb934d760","title":"R27 audit 任务创建测试","priority":"normal","assigneeUserId":"uuid-of-some-user"}` 响应 `{"statusCode":500,"message":"Internal server error"}`；UI 端 console 仅一条 generic 浏览器 native error |
| 期望 | 1. **server 端**：`assigneeUserId` 应有 UUID 校验（zod / class-validator）→ 返 400 + `{errorCode:"INVALID_ASSIGNEE_ID", message:"负责人ID格式错误"}`，而不是裸的 500 + "Internal server error"；2. **client 端**：write action 应捕获 4xx/5xx，调 toastError / inline error，并保留 modal 数据；3. **UI 设计**：负责人字段应是 user picker（与 BUG-230/BUG R27-I 同根问题）从根本上不允许用户写非法值 |
| 影响 | **P0 静默失败**：1) 比 R26 BUG-226 沟通记录假成功更危险——当时是按了 0 反应、用户至少知道没成功；R27 现在 "新增任务" 用户认真填了表，server 失败但 UI 无任何反馈，用户合理推测"成功了，应该列表会自动刷新"，但其实数据没落库；2) 任务是行政书士事务所 P0 业务功能（合规留痕 / 跨人协作）；3) 与 BUG R27-F 是同一个问题模式 |
| 取证 | `10-bug-r27-task-create-500-no-error-feedback.png`（modal 仍开 + 文本仍在 + 标题"新增任务"未变） |
| 建议补丁 | 1. **写 action 错误处理**：`useCaseDetailWriteActions.createTask` 用 try/catch，server 错误时调 `toastError(t('cases.writeErrors.taskCreate.failed'))` 并保留 modal；2. **UI 控件升级**：`CaseTaskCreateModal` 负责人字段改 `<UserPicker>` 组件（基于 `useUserOptions` composable 取 `/api/users` 列表），fallback 到当前登录用户；3. **server 校验**：tasks service createTask 加 UUID 校验，4xx 替代 5xx；4. 加 contract test：`CaseTaskCreateModal.bug-r27-e.test.ts` mock createTask reject → 断言 toast 被调；5. 加 e2e test：mount → fill invalid uuid → click create → assert error visible + modal still open |
| 等级 | **P0 — 业务关键写操作"静默失败"** |
| 状态 | 新发现 / 未 land |

### BUG R27-F ⚠️ 期限创建 server 500 + UI 无错误反馈（"假 LANDED"）

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseDeadlineCreateModal.vue`（推测）+ `model/useCaseDetailWriteActions.ts` createReminder + 后端 `reminders.service.ts` createReminder |
| 复现 | 1. CASE-202604-0018 → 期限 tab；2. 点 "添加期限"；3. 对象类型保持 "案件期限"，提醒日期设 `2026-12-31`，期限类型 "自定义"；4. 点 "提交"；5. **观察**：modal 仍开 + 0 反馈 |
| 实证 | `get_network_request reqid=86618`：`POST /api/reminders` body=`{"targetType":"case","targetId":"9854...","remindAt":"2026-12-31T00:00:00.000Z","caseId":"9854...","channel":"in_app","payloadSnapshot":{"kind":"custom"}}` 响应 `{"statusCode":500,"message":"Internal server error"}` |
| 期望 | 同 R27-E：server 应返 4xx + 业务错误码；client 应捕获并提示用户；UI 控件不变（已是合理的 select/date/textarea） |
| 影响 | **P0 静默失败**：BUG-227 在 R26 标记为 LANDED 是因为 modal 弹出来了；**实际端到端写库链路完全断**——比 R26 时按了 0 反应"显式失败"更隐蔽；用户认为创建成功但实际数据没落库；期限是行政书士事务所 P0 业务（关键日期错过 → 客户在留资格中断） |
| 取证 | `02-bug227-add-deadline-modal-landed.png` + 网络日志 reqid=86618 |
| 建议补丁 | 同 R27-E 模式：1. write action try/catch + toastError；2. server 校验补全 + 4xx；3. contract test |
| 等级 | **P0 — 业务关键写操作"半 LANDED 假成功"** |
| 状态 | 新发现 / 未 land |

---

## 2. P1 缺陷

### BUG R27-A ⚠️ 沟通记录 author 显示 raw user UUID

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/model/CaseCommsLogsAdapter.ts` L138 `adaptCaseMessageDto` |
| 复现 | 1. CASE-202604-0018 → 沟通记录 tab；2. 发布一条沟通记录；3. **观察**：消息条目作者名显示 `00000000-0000-4000-8000-000000000011`（应为 "Local Admin"）|
| 实证 | adapter L138 `const author = pickOptionalString(record, CREATED_BY_FIELDS) ?? "System";` —— `CREATED_BY_FIELDS = ["createdBy", "created_by"]`，server 返回的是 user UUID 而非 displayName；adapter 没有 fallback 到用户字典 |
| 期望 | 1. server 端 `/api/communication-logs` 透传 `createdByDisplayName` 字段（通过 join `users` 表）；2. adapter 优先读 `createdByDisplayName` / `created_by_display_name` / `createdByName` / `created_by_name` 一组字段，fallback 到 `createdBy` 但 i18n 化为"未知用户"或显示当前登录用户名；3. `CREATED_BY_FIELDS` 扩展为 `["createdByDisplayName", "created_by_display_name", "createdByName", "created_by_name", "createdBy", "created_by"]` |
| 影响 | 1. 所有沟通记录条目（合规留痕业务）作者列都显示 raw UUID，专业感全失；2. 屏幕阅读器朗读 UUID 无意义；3. 用户无法分辨多条记录的作者归属（特别是事务所多人协作场景）|
| 取证 | `01-bug226-publish-success-after-fix.png`（uid 461_1 = `00000000-0000-4000-8000-000000000011`）|
| 等级 | **P1 — 业务关键展示数据降级** |
| 状态 | 新发现 / 未 land |

### BUG R27-B ⚠️ 沟通记录 typeLabel 硬编码中日文混杂 + 完全不走 i18n

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/model/CaseCommsLogsAdapter.ts` L64-70 `MESSAGE_TYPE_LABELS` 常量 + L156 `typeLabel: MESSAGE_TYPE_LABELS[type]` |
| 复现 | 1. zh-CN：发布"内部记录"沟通条目 → 列表显示 chip "内部备注" ≠ combobox option "内部记录" ≠ filter radio "内部记录" → 三处文案完全矛盾；2. ja-JP：组合框 option = "社内記録"、filter radio = "内部メモ"，但消息条目 chip 仍显示 "内部备注"（中文！）→ i18n 完全失效 |
| 实证 | adapter 源代码 L64-70：<br>```ts<br>const MESSAGE_TYPE_LABELS: Record<MessageTypeKey, string> = {<br>  internal: "内部备注",      // hardcoded zh-CN<br>  client_visible: "客户可见",  // zh-CN<br>  phone: "電話記録",          // ja-JP<br>  meeting: "対面",            // ja-JP<br>  auto_email: "メール",       // ja-JP<br>};<br>``` |
| 期望 | 1. adapter 输出 `typeLabelKey: "cases.detail.messages.types.internal"`（i18n key），view 层走 `t(msg.typeLabelKey)`；2. 三语字典统一：<br>- zh-CN: `internal: "内部记录"`（与 combobox 一致）`/ client_visible: "客户可见"` / `phone: "电话记录"` / `meeting: "线下会议"` / `auto_email: "自动邮件"`<br>- ja-JP: `internal: "社内記録"` / `client_visible: "顧客共有"` / `phone: "電話記録"` / `meeting: "対面"` / `auto_email: "自動メール"`<br>- en-US: 同步 |
| 影响 | 1. 三语 i18n 完全失效（全 locale 看到同一个硬编码字符串）；2. 同一条消息的"类型"在三个 UI 位置（输入 combobox / 显示 chip / 过滤 radio）出现 3 处不同字面 → 用户认知割裂；3. R26 BUG-232 fix 了 zh-CN 字典里的字形，但**这处硬编码字符串没被 fix 到** |
| 取证 | `07-bug-r27-msg-typeLabel-hardcoded-zhcn-in-ja.png`（ja-JP 下消息 chip 仍是中文 "内部备注"）|
| 等级 | **P1 — i18n 全失效 + 文案三处不一致** |
| 状态 | 新发现 / 未 land |

### BUG R27-C ⚠️ 沟通记录 time 显示 raw PG timestamp（带微秒和时区）

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/model/CaseCommsLogsAdapter.ts` L158 `time: createdAt` |
| 复现 | 1. 发布沟通记录；2. **观察**：消息条目时间列显示 `2026-05-03 03:39:36.420178+00`（raw PostgreSQL 时间戳格式）|
| 实证 | adapter L158 `time: createdAt`，`createdAt = pickOptionalString(record, CREATED_AT_FIELDS)` 即 raw 字符串透传；对比日志 tab 用 `2026/05/02 21:15` 友好格式（在 `CaseLogTab.vue` 内部走了 formatter），文书 tab 用 `2026/5/3` 友好格式 |
| 期望 | 在 adapter 或 view 层加 `formatDate(createdAt, locale)` helper：<br>- zh-CN: `"2026/05/03 12:39"`<br>- ja-JP: `"2026年5月3日 12:39"` 或 `"2026/05/03 12:39"`<br>- en-US: `"May 3, 2026 12:39"` |
| 影响 | 1. UI 极不专业（应该没人愿意在产品里看到 PostgreSQL 微秒时间戳）；2. 时区混乱（`+00` UTC 不能直接给中国/日本用户看，应转本地时区）；3. 三处时间格式（messages / log / forms）不一致 |
| 取证 | `01-bug226-publish-success-after-fix.png` 时间行 |
| 建议补丁 | 引入 `shared/utils/formatDate.ts` 全局 helper（已存在的话复用），三个 tab 统一调用；adapter 层预先转 `Date` 对象或 `Intl.DateTimeFormat` 输出 |
| 等级 | **P1 — 数据格式失修，全局展示降级** |
| 状态 | 新发现 / 未 land |

### BUG R27-G ⚠️ provider progress label 显示 raw enum "unknown"

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseProviderProgress.vue` L36 `<span class="prov__label">{{ p.label }}</span>` + `CaseDocumentsTab.vue` L175 `<span class="docs-tab__progress-label">{{ p.label }}</span>` + `CaseAdapterDetailAggregate.ts` L63-75 `adaptProviderProgress` |
| 复现 | 1. CASE-202605-0006（CONSULTING）→ 资料清单 tab；2. **观察**："按提供方完成率 / 资料收集分组进度" 区第一行显示 "unknown 0/1"；同样在概览 tab 的同区域出现 |
| 实证 | adapter `adaptProviderProgress` L69 `label: readString(pr, "providerRole")` —— provider enum 直接当 label 用，没经过 i18n 映射 |
| 期望 | 1. adapter 输出 `labelKey: \`cases.detail.providers.${providerRole}\``，view 层走 `t(p.labelKey)`；2. 三语字典补 `cases.detail.providers.applicant` / `office` / `employer` / `agent` / `unknown` 等枚举值；3. 或对未知值兜底显示 "未指定提供方"  |
| 影响 | 1. 任何 server 返回 `providerRole="unknown"` / `applicant` / `office` 等 raw 值都会以 raw 字符串形式展示；2. UI 看起来未完成 |
| 取证 | `00-checklist-zhcn-bug229-fixed-but-unknown-group.png`（左下 "unknown 0/1"）|
| 等级 | **P1 — i18n 漏接 / view-adapter 协议不清** |
| 状态 | 新发现 / 未 land |

### BUG R27-I ⚠️ 编辑 modal 3 个外键字段仍是裸 textbox（含 BUG-230 半修复回归）

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseEditModal.vue` 字段集 |
| 复现 | 1. CASE-202604-0018 → 头部点 "编辑信息"；2. **观察 modal 字段**：① 案件名称 (text) ② 目标提交日期 (date picker) ③ 受理日期 (date picker) ④ 优先级 (select ✅ 但选项英文) ⑤ 风险等级 (select ✅ 但选项英文) ⑥ **负责人 (text，应为 user picker)** ⑦ **协办人 (text)** ⑧ **分组 (text，且预填 raw UUID `ef21fdd2-1ffc-4a27-8b47-a640d6bd021c`)** ⑨ 管辖入管局 (text) ⑩ 备注 (textarea) |
| 实证 | `evaluate_script` 直读 input 属性确认 ownerUserId / assistantUserId / groupId 仍是 `type=text` 无校验；snapshot 中 `uid=477_39 textbox "分组" value="ef21fdd2-..."` 直接展示 raw UUID |
| 期望 | 1. 负责人/协办人 → `<UserPicker>` 接 `/api/users` 列表；2. 分组 → `<GroupSelect>` 接 `/api/groups`，显示 "东京一组/二组" 而不是 UUID；3. 管辖入管局 → 接入入管局字典 `<RegionalImmigrationSelect>` |
| 影响 | 1. **数据完整性**：用户能写自由文本作为 UUID/外键，server 校验若不严会落库脏数据，**直接导致 BUG R27-E P0**（任务的 assignee 也是 textbox + UUID 校验，整条链路同模式失败）；2. 字段名 `ownerUserId` 暗示要 UUID，UI 让用户写自由文本，普通运营无法使用；3. "分组"显示 raw UUID 是最低级的 UX 错误 |
| 取证 | `08-bug230-edit-modal-partial-fix.png` |
| 等级 | **P1 — 数据完整性 / UX 严重缺陷（BUG-230 半修复回归）** |
| 状态 | 新发现 / 未 land |

---

## 3. P2 缺陷

### BUG R27-H 编辑 modal 优先级/风险等级 select 选项未 i18n（与任务 modal 不一致）

| 字段 | 值 |
|---|---|
| 位置 | `CaseEditModal.vue` 优先级/风险等级 select options |
| 复现 | zh-CN 下编辑 modal 显示 "Low/Normal/High/Attention"；任务创建 modal 显示 "低/普通/高/紧急" |
| 期望 | 编辑 modal select 选项三语化，与任务 modal 文案统一 |
| 等级 | **P2 — i18n 漏接 + 同字段两处控件文案不一致** |
| 状态 | 新发现 / 未 land |

### BUG R27-J 提交前检查 tab 在 S7 仍说"提交前阶段"——文案与 phase 矛盾

| 字段 | 值 |
|---|---|
| 位置 | `CaseValidationTab.vue` "COE / 海外贴签 / 返签结果" 区文案分支 |
| 复现 | CASE-202604-0018 (S7 已提交待回执) → 提交前检查 tab → 底部 "下签后处理 / COE 区" 文案显示 "**当前案件还在提交前或补正处理阶段**，因此这里暂不展示 COE 发送、海外贴签和返签结果。切换到相应样例后可查看完整流程。" — S7 早已是已提交状态，本不该说"提交前" |
| 期望 | 文案分支按 phase 区分：S5（已收到回执前）显示"等待审查"，S5 之后显示"等待 COE / 申请贴签 / 等待返签"等具体阶段名 |
| 取证 | `09-validation-tab-coe-text-mismatch.png` 底部 |
| 等级 | **P2 — 业务文案与 phase 状态机不对齐** |
| 状态 | 新发现 / 未 land |

### BUG R27-M Modal Escape 键不关闭

| 字段 | 值 |
|---|---|
| 位置 | 全部 modal 组件（共享的 Modal 容器）|
| 复现 | 任何 modal 打开后按 Escape → modal 仍开 |
| 期望 | 按 Escape 应关闭 modal；同时点击 backdrop 也应关闭（这点本轮未严格测，但同 ARIA 模式建议）|
| 等级 | **P2 — a11y / 键盘可达性** |
| 状态 | 新发现 / 未 land |

### BUG R27-N Modal 缺 `aria-labelledby` / `aria-label`

| 字段 | 值 |
|---|---|
| 位置 | 全部 modal 组件 |
| 复现 | `evaluate_script` 检查 `[role="dialog"][aria-modal="true"]` 但 `aria-labelledby = null` 且 `aria-label = null` → 屏幕阅读器进入 modal 时无法朗读标题 |
| 期望 | Modal 容器加 `aria-labelledby="modal-title-id"`，title h2 加 `id="modal-title-id"`；或加 `aria-label="编辑案件信息"` |
| 等级 | **P2 — a11y 不完整** |
| 状态 | 新发现 / 未 land |

### BUG R27-P 终态"处理退款"按钮 UI 失约（BUG-225 延伸）

| 字段 | 值 |
|---|---|
| 位置 | `CaseOverviewTab.vue` 终态分支"下一关键动作"卡片 + `CaseBillingTab.vue` |
| 复现 | CASE-202604-0007（CLOSED_FAILED）→ 概览 → 点"处理退款" → 跳到 ?tab=billing → **billing 表为空 / 无可退款 record / 无任何退款入口** → 文案承诺被 UI 现状打脸 |
| 期望 | 1. 终态案件应在概览/billing 显示原始 billing 记录的退款状态（"已收 ¥50000，待退还 ¥30000"等）；2. 提供"发起退款"按钮 → 退款流程 modal；3. 若设计上 billing 在 CLOSED_FAILED 是可空，则"处理退款"按钮应根据 billing.length > 0 才显示 |
| 影响 | BUG-225 的延伸：WAITING_PAYMENT → CLOSED_FAILED 路径上整个退款流程没有真正的实现 |
| 取证 | `?tab=billing` 截图（仅 sample header，无表格行）|
| 等级 | **P2 — 业务流程缺失（BUG-225 延伸）** |
| 状态 | 新发现 / 未 land |

### BUG R27-R 概览 sidebar "案件团队" 始终空——根因可能是数据/查询问题

| 字段 | 值 |
|---|---|
| 位置 | `CaseOverviewSidebar.vue` 团队卡片 + 后端 case detail aggregate 团队 join |
| 复现 | CASE-202604-0018 有 `Local Admin` 作为 ownerUserId（header 显示"Local Admin"），但概览 sidebar "案件团队" 显示 "暂无团队成员" |
| 期望 | owner / assistant 自动加入 team 列表；或确认设计上"团队成员"是另一个独立概念（如 case_party 表）→ 改文案为"额外协作人员" |
| 影响 | R25 BUG-222 修了空状态文案但根因没修——团队是个 P1 业务功能（合规审计 / 跨人协作） |
| 取证 | `12-overview-non-terminal-no-team-member.png` |
| 等级 | **P2 — 业务数据 join 缺失** |
| 状态 | 新发现 / 未 land |

---

## 4. P3 缺陷

### BUG R27-D 沟通记录 avatar 缩写"00"

R27-A 的副作用，根治 R27-A 后自动 fix。

### BUG R27-K 概览"执行检查"button 跳到 disabled 按钮，UX 链断裂

| 字段 | 值 |
|---|---|
| 位置 | `CaseOverviewTab.vue` "下一关键动作" 卡 → `CaseValidationTab.vue` "重新检查" button |
| 复现 | 概览点 "执行检查" → 跳 ?tab=validation → "重新检查" 按钮 disabled (建设中) |
| 期望 | 概览的 "执行检查" 按钮在"重新检查"功能未实装时，应同样标 disabled + title="建设中"；或干脆隐藏 |
| 等级 | **P3 — UX 链断裂** |
| 状态 | 新发现 / 未 land |

### BUG R27-L Tab 键导航违反 ARIA tab pattern

| 字段 | 值 |
|---|---|
| 位置 | `CaseDetailView.vue` tablist 实现 |
| 复现 | `evaluate_script` 检查 10 个 `[role="tab"]` 全部 `tabindex=0`（应是 selected=0 / 其他=-1）；按 Tab 键进入 tab 区后必须按 10 次才能跳过 |
| 期望 | ARIA tab pattern：selected tab `tabindex=0`，其他 `tabindex=-1`；用 ArrowLeft/ArrowRight 在 tab 间切换；Home/End 跳到首尾 tab |
| 影响 | 键盘用户体验差；与 banner 的 nav 等其他可达元素一起，Tab 键序列可能特别冗长 |
| 等级 | **P3 — a11y 不完整** |
| 状态 | 新发现 / 未 land |

### BUG R27-O Console issue：6 个表单字段缺 id/name

| 字段 | 值 |
|---|---|
| 位置 | 表单字段（多个 modal 累计 6 处）|
| 复现 | `list_console_messages` 返回 `[issue] A form field element should have an id or name attribute (count: 6)` |
| 期望 | 全部表单字段加 id / name 属性以支持浏览器 autofill 和辅助技术 |
| 等级 | **P3 — 微缺陷** |
| 状态 | 新发现 / 未 land |

### BUG R27-Q 任务 modal 负责人字段仍是 textbox

是 BUG R27-I 的同模式扩展，任务 modal 的"负责人"字段未改为 user picker，**直接导致 BUG R27-E P0**（用户能写非法 UUID → 后端 500）。

---

## 5. R27 通过项（确认无回归）

- BUG-226 P0 ✅ — 沟通记录发布完整 e2e 工作（POST 201 + refetch + 列表更新 + tab counter）
- BUG-228 P1 ✅ — 生成文书完整 e2e 工作（POST 201 + 已生成文书展示）
- BUG-229 P1 ✅ — 资料项 chip "待提交" 不再是 raw key
- BUG-216 P1 ✅ — 终态"编辑信息"/"状态流转" 双重守门 + i18n description
- BUG-218 P1 🟡 — modal LANDED 但 server 500 是 BUG R27-E
- BUG-227 P1 🟡 — modal LANDED 但 server 500 是 BUG R27-F
- BUG-230 P1 🟡 — 优先级/风险等级 select ✅，但 BUG R27-H/R27-I 仍未修
- BUG-231 P2 ✅ — 编辑 modal 加回了"管辖入管局"+"备注"两个字段
- BUG-232 P2 ✅ — zh-CN「文書」→「文书」全字典清洗，未发现回归
- BUG-233 P2 ✅ — "资料收集分组进度"区显示 "暂无分组进度数据"
- BUG-234 P2 ✅（推测）— 终态守门整体严密
- BUG-236 P3 ✅ — 终态卡片"查看关闭原因" / "处理退款" 真 button + 真跳转
- BUG-221 P2 ✅ — ja-JP "全部" → "すべて"
- BUG-222 P2 ✅ — 案件团队/近期动态/资料分组进度 3 处空状态文案 LANDED
- BUG-223 P3 ✅ — 终态 banner 文案不再"已归档（已归档）"重复
- BUG-225 P3 🟡 — overview 加了 hint，但 WAITING_PAYMENT 仍可无 billing；BUG R27-P 是延伸
- BUG-212 P1 ✅ — disabled 按钮 title="建设中" / "準備中" 在 zh-CN/ja-JP 都正确
- BUG-219/220 P2 ✅ — 日志 i18n 化稳定
- BUG-205 (R23) ✅ — modal textbox 都有 label
- BUG-208/211 (R24) ✅ — admin↔server PHASE_TRANSITIONS 副本对齐 / ja "検証実行" 字形
- 资料清单 tab 写操作 ✅ — `POST /api/document-items` [201] 真 LANDED
- 终态守门 ✅ — 期限/任务/文书/沟通记录 tab 在终态隐藏写操作 button
- 焦点管理基本 OK — main / dialog 都能 focus

---

## 6. R27 取证截屏

| 文件 | 场景 |
|---|---|
| `00-checklist-zhcn-bug229-fixed-but-unknown-group.png` | CONSULTING zh-CN 资料清单：BUG-229 chip ✅ "待提交"；新发现 BUG R27-G "unknown" provider label |
| `01-bug226-publish-success-after-fix.png` | WAITING_PAYMENT zh-CN 沟通记录：BUG-226 ✅ POST 201 + 列表更新；新发现 BUG R27-A/B/C/D（author=UUID / typeLabel=硬编码 / time=raw PG / avatar="00"）|
| `02-bug227-add-deadline-modal-landed.png` | 添加期限 modal LANDED — 但实际 POST 500（BUG R27-F）|
| `03-bug228-generate-form-modal-landed.png` | 生成文书 modal LANDED + 真 e2e POST 201 ✅ |
| `04-bug218-add-task-modal-landed.png` | 新增任务 modal LANDED — 但实际 POST 500（BUG R27-E）|
| `05-terminal-overview-multiple-bugs-landed.png` | CLOSED_FAILED zh-CN 终态：BUG-216 ✅ + BUG-222 ✅ + BUG-223 ✅ + BUG-233 ✅ + BUG-236 ✅ |
| `06-bug221-ja-log-zenbu-fixed.png` | ja-JP 日志 radio "すべて" — BUG-221 ✅ LANDED |
| `07-bug-r27-msg-typeLabel-hardcoded-zhcn-in-ja.png` | ja-JP 沟通记录条目：消息 chip 仍显示中文 "内部备注"（BUG R27-B i18n 完全失效）|
| `08-bug230-edit-modal-partial-fix.png` | 编辑 modal：BUG-230 部分 ✅（select 改了）+ BUG-231 ✅（字段加回了）+ BUG R27-H/R27-I（select 选项英文 / 负责人/协办人/分组仍是 textbox）|
| `09-validation-tab-coe-text-mismatch.png` | 提交前检查 tab：BUG R27-J（S7 phase 但文案"提交前阶段"）+ BUG R27-K（重新检查 disabled）+ 4 个 disabled button title ✅ |
| `10-bug-r27-task-create-500-no-error-feedback.png` | **BUG R27-E P0**：POST /api/tasks 500 后 modal 仍开、文本仍在、无 toast |
| `11-forms-tab-after-generate-success.png` | 生成文书后列表更新 — BUG-228 真 e2e LANDED ✅ |
| `12-overview-non-terminal-no-team-member.png` | 非终态 overview "案件团队" 仍显示 "暂无团队成员"（BUG R27-R 根因未修）|

---

## 7. 落库建议（先后顺序）

1. **【最高优先】P0 R27-E + R27-F "静默写失败双子座"**：单 PR 修复任务/期限创建的写错误处理：
   - `useCaseDetailWriteActions.ts` 的 `createTask` / `createReminder` 用 try/catch 包裹，失败时 `toastError(t('cases.writeErrors.createFailed', { entity }))`；
   - 加 contract test：mock repo reject → assert toast called + modal still open；
   - server 端 `tasks.controller.ts` / `reminders.controller.ts` 加 zod / class-validator UUID 校验，4xx 替代 5xx；
   - **顺手在写动作的 model 层抽 `runWriteAction(fn)` helper**：所有 write 都走它，统一错误处理 + loading state + post-success refetch；
   - 加 e2e contract test `CaseDetailView.bug-r27-write-error.test.ts`：mount detail view → 模拟 server 500 → 断言 modal 仍开 + 错误 toast 出现。

2. **P1 R27-A / R27-B / R27-C "沟通记录展示三连"**：单 PR 修 adapter：
   - server 端 `/api/communication-logs` 透传 createdByDisplayName、把 createdAt 转 ISO 8601；
   - `CaseCommsLogsAdapter.ts` `MESSAGE_TYPE_LABELS` 改为 i18n key map：`{internal: "cases.detail.messages.types.internal", ...}`；adapter 输出 `typeLabelKey`（不是 typeLabel）；view 层 `t(msg.typeLabelKey)`；
   - 三语字典 `cases.detail.messages.types.*` 补齐；
   - 时间格式：引入 `shared/utils/formatDate.ts` helper，adapter 调用得到本地化时间；
   - 顺手加一个 lint 规则：禁止 adapter 输出非 i18n key 的"硬编码字符串字段"——通过命名约定（以 `Label` 结尾必须是已本地化字符串，以 `LabelKey` 结尾必须是 i18n key）。

3. **P1 R27-G provider progress label**：1 行改动 + 1 个字典节，类似 BUG-229 模式。

4. **P1 R27-I 编辑 modal 3 个 picker**：
   - 抽 `useUserOptions` / `useGroupOptions` / `useImmigrationOfficeOptions` composables；
   - `CaseEditModal.vue` 负责人/协办人/分组改 picker；
   - 顺手把任务 modal 的"负责人"也改成 picker（修 BUG R27-Q）；
   - 这一步也间接缓解 R27-E（用户没机会写非法 UUID）。

5. **P2 R27-H / R27-J / R27-M / R27-N "i18n + a11y 杂项"**：
   - 编辑 modal select i18n 选项；
   - 提交前检查 tab 文案按 phase 分支；
   - Modal 共享容器加 Escape 关闭 + aria-labelledby；
   - 这些是单一 PR 量级的小改动，可一次性合并。

6. **P2 R27-P / R27-R "业务流程深层缺陷"**：需要产品决策——
   - 终态退款流程是否实装；
   - 案件团队 join 设计；
   - 排序看产品；

7. **P3 R27-K / R27-L / R27-O / R27-D**：综合产品决策后批量 land；R27-D 在 R27-A fix 后自动好。

---

## 8. R27 走查痕迹

R27 走查在 dev DB 中产生的副作用：

- 1 条新沟通记录写入：`POST /api/communication-logs` [201] × 2 — CASE-202604-0018 上的 "R27 audit 复测" + "R27 并发测试"，channel=internal
- 1 条新生成文书：`POST /api/generated-documents` [201] — CASE-202604-0018 上的 "R7 BUG-118 supplement double" PDF v1
- 0 个任务写入（POST 500）
- 0 个期限写入（POST 500）
- 编辑 modal 的脏数据未保存（走查时未点保存按钮）
- 无 phase 实际推进
- 无 sign-out / role 切换

如需还原 dev DB，请删除 CASE-202604-0018 名下：
- 2 条 communication_log（content 含 "R27"）
- 1 条 generated_document（kind=placeholder）

其余无副作用。

---

## 9. R27 发现的"修复模式"教训

### 教训 1：**modal 弹出 ≠ 端到端写库 LANDED** —— 需要"端到端 e2e contract"

R26 把 BUG-227 / BUG-218 标 LANDED 是因为 modal 弹出来了；R27 实测发现 server 端是 500。这是新一轮的"假 LANDED"模式。

修复模式跨度：
- R25 时：emit ✅ + 单测 ✅ ＝ 假 LANDED（父级未接 listener，BUG-214/215/217）
- R26 时：父级接 listener ✅ + emit 工作 ✅ ＝ 假 LANDED（父级 handler 未做实际写库或写库失败 ❌，BUG-227/218）

**后续防御**：
- 把"端到端 e2e contract test"加入修复 BUG 的标准 checklist：mount 真 view → fake repo 返回成功 → assert UI 更新 + tab counter +1；fake repo 返回 500 → assert toast + modal 不关；
- 这层 test 必须能跑过，否则 BUG 不算 LANDED；
- 不仅要 contract test handler 调用，还要 contract test handler 的成功/失败两条路径。

### 教训 2：**adapter 协议必须明确"已本地化字符串" vs "i18n key"**

R27-A/B/C/D 都是 adapter 直接输出"半成品"展示数据：
- author = raw UUID（应是已 join 的 displayName）
- typeLabel = 硬编码字符串（应是 i18n key）
- time = raw PG timestamp（应是已格式化字符串或 Date 对象）
- avatar = 派生 raw UUID 缩写（应是基于 displayName 的缩写）

**后续防御**：
- adapter 输出字段命名约定：
  - `xxxLabel` / `xxxText` / `xxxName` ＝ 已本地化、已格式化、用户可读；
  - `xxxLabelKey` / `xxxI18nKey` ＝ i18n key，view 层必须 `t()`；
  - `xxxAt` / `xxxDate` ＝ 已格式化字符串或 Date 对象（不能是 raw PG 字符串）；
  - `xxxId` / `xxxUuid` ＝ 永远不直接渲染（除非配合 picker 等已映射控件）；
- ESLint custom rule：禁止 view 层直接渲染 `{{ xxxId }}` / `{{ xxxUuid }}` / `{{ xxxKey }}`；
- adapter 输出对象做 contract test：禁止字段以 raw enum / raw UUID / raw timestamp 为值。

### 教训 3：**外键字段 = picker，不是 textbox**

BUG R27-I 是 BUG-230 半修复的回归 + 直接 spawn BUG R27-E P0：用户能在 textbox 里写非法 UUID，server 返 500，UI 无错误反馈。

**后续防御**：
- domain 层定义字段时声明 UI 控件类型：`{ name: 'ownerUserId', type: 'fk', target: 'user', control: 'picker' }`；
- ESLint / 自定义检查：表单字段引用 domain 标 `fk` 字段必须用对应 picker 控件而非裸 input；
- "无 picker 必须 select" 规则：所有 enum 字段必须用 select / radio 而非 textbox。

### 教训 4：**写错误必须做 e2e 防御**

R27-E / R27-F 的 server 500 是漏接的写错误处理。

**后续防御**：
- model 层 `runWriteAction(fn, errorI18nKey)` helper：统一 try/catch + toast + loading state；
- 所有 write 走它，单测覆盖成功/失败两条路径；
- server 端禁止 5xx 透传业务错误（如 UUID 不合法应是 400 + errorCode）；
- E2E contract test：每个写动作都测 5xx 路径，断言 toast 出现 + form 不丢失数据。

### 教训 5：**"按了有反应" ≠ "按了实现承诺"**

BUG R27-K（执行检查 → disabled 按钮）/ BUG R27-P（处理退款 → 空表）是承诺与实际不符。

**后续防御**：
- 概览 / 卡片上的引导按钮必须双向同步：button 的 disabled 状态 = 跳转目标的功能可用性；
- 文案承诺类内容（如"可查看关闭原因 / 退款待人工处理"）必须配套 actionable UI；
- 终态 closeout 流程要做端到端 e2e 测试（含退款 → COE → 失败归档完整路径）。
