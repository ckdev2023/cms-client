# 案件详情 chrome-devtools-mcp 深度审计 Bug 清单（第九轮 / R30）

> 生成日期：2026-05-04（R29 报告后首次真浏览器复测 / R30）
>
> 命题：
> - R29 报告全部 22 条 LANDED 是基于 grep + 文件存在性，本轮用 chrome-devtools-mcp 在 localhost:5173 真实浏览器走查复测
> - 同时挖掘新缺陷，按 P0/P1/P2/P3 排序
>
> 复测覆盖样本：
> - 正常 in-progress 案件：CASE-202605-0005 (S2 资料收集中)
> - 终态案件：CASE-202604-0016 BUG-117 CLOSED_FAILED (S9 已归档)
> - WAITING_PAYMENT：CASE-202604-0018 R7 BUG-118 supplement double (S7)
> - 三种 locale：zh-CN / ja-JP / en-US

---

## 0. 总结

### 0.1 一句话结论

**R29 报告 22 条 LANDED 中至少 4 条实际未生效（含 2 条 P0），新发现 11 条缺陷（含 2 条 P0、4 条 P1、4 条 P2、1 条 P3）。** 根因高度集中：R29 复测仅做 grep 和文件存在性检查，未跑 dev 数据库 migrate，也未真浏览器复跑业务流，导致 migration 041～044 全部未应用、概览 timeline i18n 未渲染等问题被错误标记为 LANDED。

### 0.2 R29 LANDED 复测结果

| R29 BUG ID | R29 状态 | R30 真浏览器复测 | 备注 |
|---|---|---|---|
| R28-A 守门文案 + tab 守门 | LANDED | ✅ 真生效 | banner 文案三语正确，终态 8 个 tab 全 disabled |
| R28-B / R27-O completeTask | LANDED | ✅ 真生效 | POST /api/tasks/:id/complete 201，task 计数实时刷新 |
| R28-C ZIP disabled | LANDED | ✅ 真生效 | description 三语 |
| R28-D writeFeedback | LANDED | ✅ 真生效 | reminder 错误时显示"提醒参数校验失败" banner |
| R28-E CaseCloseReasonModal | LANDED | ⚠️ 部分生效 | modal 打开了，但 closedAt/closeReason/closeNote 未显示（见 R30-N） |
| R28-F WAITING_PAYMENT nextActions | LANDED | ✅ 真生效 | "Register final payment" + "Send collection reminder" 按钮 |
| **R28-G 概览 timeline 渲染** | **LANDED** | ❌ **完全未生效** | **见 R30-A：5 条 timeline 全显示 raw i18n key + ISO timestamp** |
| **R28-H reminders NOT NULL drop** | **LANDED** | ❌ **未真正生效** | **见 R30-H：migration 043 未在 dev DB 应用，POST /api/reminders 仍 400** |
| R27-A 沟通记录 author | LANDED | ✅ 真生效 | 显示 "Local Admin" 而非 UUID |
| R27-B log "other" 类型 i18n | LANDED | ⚠️ 间接失效 | 见 R30-J：所有 internal/client_visible 都被 FE 强制映射成 `channelType="other"`，导致 timeline 显示 "沟通记录追加：其他" |
| R27-C 时间格式化统一 | LANDED | ⚠️ 部分生效 | log tab 已本地化（"2026/05/04 01:08"），但**概览 timeline meta 仍是 ISO**（R30-A 一并） |
| R27-G provider unknown | LANDED | (本轮未测，待 R31) | — |
| R27-H 编辑 modal i18n select | LANDED | ✅ 真生效 | 优先级/风险/分组三语一致 |
| R27-I 编辑 modal 6 props 透传 | LANDED | ⚠️ 部分生效 | 见 R30-K：priority/owner/group 透传成功，但 **target_submission_date / acceptance_date 未回填** |
| R27-J Validation S7 文案 | LANDED | ✅ 真生效 | en-US: "...COE will be dispatched after final payment is cleared." |
| R27-L tab tabindex pattern | LANDED | ✅ 真生效 | 终态 8 个 tab `disableable disabled` |
| R27-M Modal Escape | LANDED | ⚠️ 5 个测试覆盖 modal OK，**新发现"手动添加资料项" modal 不响应 Escape**（R30-E） |
| R27-N Modal aria-labelledby | LANDED | ⚠️ 测试覆盖的 5 个 modal OK，**新发现"手动添加资料项""阶段流转"两个对话框缺 aria-labelledby**（R30-D / R30-L） |
| R27-O 表单字段 id/name | LANDED | (本轮未测，待 R31) | — |
| R27-P 终态退款 button disabled | LANDED | ✅ 真生效 | "处理退款" disabled + description "退款功能建设中" |
| R27-K 概览近期动态 | LANDED | ❌ **完全未生效**（同 R28-G） | — |
| R27-S 顾客名多语言 | LANDED | ⚠️ 实际靠 base_profile JSON 工作，migration 044 未应用 | 见 R30-O |

**统计**：
- ✅ 真生效：12 条
- ⚠️ 部分生效 / 间接失效：6 条
- ❌ 完全未生效：2 条（R28-G / R27-K 同根、R28-H）
- 待复测：2 条（R27-G / R27-O）

### 0.3 R30 新发现缺陷（共 11 条）

| BUG ID | 等级 | 一句话描述 | 影响 |
|---|---|---|---|
| **R30-A** | **P0** | 概览"近期动态"timeline 全部显示 raw i18n key + ISO timestamp | 用户看不到任何业务文案 |
| **R30-H** | **P0** | dev DB migration 041～044 全部未应用，导致 reminder 创建失败 + 多语言客户名/billing migrations 全部缺失 | 写入链路阻断 |
| R30-F | P1 | 任务行右侧 avatar 直接显示 assigneeUserId 首字符（如 "0"），未 lookup 用户姓名 | UUID-leak 类似 R27-A 但发生在 task |
| R30-G | P1 | 日期输入控件接受 6 位数字年份（输入 "20261231" 解析为 "202612-03-01"），无 max year 检查 | 用户输入数据被错误接受 |
| R30-J | P1 | FE 把 internal_note / client_visible 都映射成 `channelType="other"`，timeline log 显示 "沟通记录追加：其他" | 沟通记录类型语义丢失 |
| R30-K | P1 | 编辑 modal 的"目标提交日期"/"受理日期"两个 Date 控件未回填案件已有数据 | 用户编辑时看到空值，可能误改 |
| R30-D | P2 | "手动添加资料项" modal 缺 aria-labelledby + aria-modal | a11y 中等 |
| R30-E | P2 | "手动添加资料项" modal 不响应 Escape 键 | a11y 中等 |
| R30-L | P2 | "阶段流转" popover 缺 aria-labelledby；阶段选项是 plain `<li>` 缺 role="button" / 键盘可达 | a11y 中等 |
| R30-N | P2 | "查看关闭原因" modal 显示 "暂无详细结案信息"；closedAt 显示 "—" | E5 LANDED 但数据未回显 |
| R30-M | P3 | 所有 modal 的关闭按钮（X）缺 aria-label/textContent，屏幕阅读器无法识别 | 跨多个 modal 的小问题 |
| R30-P | P3 | en-US locale 下 S7 case validation tab 同时显示矛盾文案：上 "Case has not reached this stage" + 下 "The case has been approved..." | 文案逻辑冲突 |
| R30-O | P3 | migration 044_customers_localized_names 与 base_profile JSON-based 实现重复，044 是 dead code | 维护负担 |

---

## 1. P0 缺陷详细

### 1.1 R30-A：概览近期动态完全未走 i18n / 时间未本地化（P0）

**复测样本**：
- CASE-202605-0005 (S2 zh-CN)
- CASE-202604-0016 CLOSED_FAILED (S9 zh-CN/ja-JP/en-US)
- CASE-202604-0018 (S7 en-US)

**真浏览器观测**：

```
overview-tab__timeline-text → "cases.log.timeline.phaseChange"
overview-tab__timeline-meta → "2026-05-02T11:34:31.026Z"
overview-tab__timeline-text → "cases.log.timeline.commLogCreated"
overview-tab__timeline-meta → "2026-05-03T03:44:24.419Z"
```

跨 zh-CN / ja-JP / en-US 三个 locale 全部一致表现，说明这是渲染层根因。

**根因（精确定位）**：

`packages/admin/src/views/cases/components/CaseOverviewTab.vue:426-427`：
```vue
<div class="overview-tab__timeline-text">{{ entry.text }}</div>
<div class="overview-tab__timeline-meta">{{ entry.meta }}</div>
```

`packages/admin/src/views/cases/model/CaseCommsLogsAdapter.ts:388-393` —— `buildOverviewTimelineFromLog` 输出：
```ts
return top.map((e) => ({
  color: OVERVIEW_TIMELINE_COLOR_MAP[e.type] ?? OVERVIEW_TIMELINE_COLOR_FALLBACK,
  text: e.text,        // ← e.text 是 i18n key 字符串（"cases.log.timeline.phaseChange"）
  meta: e.time,        // ← e.time 是 ISO timestamp（"2026-05-02T11:34:31.026Z"）
}));
```

对比 `CaseLogTab.vue:74-81` 正确处理：
```ts
function resolveTimelineText(entry: LogEntry): string {
  const params = resolveTimelineParams(entry.textParams);
  if (te(entry.text)) return t(entry.text, params);
  ...
}
```

`CaseOverviewTab.vue` 完全没有 i18n / 日期格式化处理。

**测试为何漏掉**：

`packages/admin/src/views/cases/components/CaseOverviewTab.recent-activity.test.ts:174-175`：
```ts
expect(vueSrc).toContain("{{ entry.text }}");
expect(vueSrc).toContain("{{ entry.meta }}");
```

测试在**锁定 bug 行为**——它检查模板是否原样输出 `entry.text`，而不是检查最终渲染结果是否走 i18n。R29 的 D1/D2 LANDED 验证只看了 `buildOverviewTimelineFromLog` 引用是否存在，没看渲染是否对。

**修复建议**（最小改动）：

1. `CaseOverviewTab.vue` 引入 `useI18n`，把模板改为：
```vue
<div class="overview-tab__timeline-text">{{ resolveText(entry) }}</div>
<div class="overview-tab__timeline-meta">{{ formatDateTime(entry.meta, locale) }}</div>
```
2. 复用 `CaseLogTab.resolveTimelineText` 的逻辑（提取到 shared helper）
3. `buildOverviewTimelineFromLog` 输出补 `textParams` 字段透传，避免 i18n 占位符空缺
4. 删除 `recent-activity.test.ts` 中锁定 raw key 的断言，改为渲染断言

**优先级**：P0。每个用户打开案件首屏第一个看到的就是这个 widget 完全是 raw key/timestamp，是破窗级体验。

---

### 1.2 R30-H：dev DB migration 041～044 全部未应用（P0）

**真浏览器观测**：

提交"添加期限"表单后：
```
POST /api/reminders → 400
{
  "errorCode": "REMINDER_VALIDATION_FAILED",
  "detail": { "source": "pg", "pgCode": "23502", "column": "entity_type" },
  "message": "Reminder validation failed: not null violation"
}
```

UI banner 显示"提醒参数校验失败，请检查输入后重试。" — R28-D writeFeedback 链路工作了，但 reminder 写入仍然失败。

**DB 直接验证**：

```sql
$ docker exec cms-client-postgres-1 psql -U cms -d cms -c "SELECT id FROM schema_migrations ORDER BY id DESC LIMIT 5;"
                     id                      
---------------------------------------------
 040_backfill_billing_plans_from_quote_price
 039_backfill_primary_applicant_case_parties
 038_backfill_customer_bmv_profile
 037_backfill_cases_group_id_v2
 036_document_assets_uniqueness
```

041 / 042 / 043 / 044 **全部未应用**。

```sql
$ docker exec cms-client-postgres-1 psql -U cms -d cms -c "\d reminders"
 entity_type      | text  |  | not null |        ← 仍然 NOT NULL
 entity_id        | uuid  |  | not null |        ← 仍然 NOT NULL
 target_type      | text  |  |          |        ← 仍然 nullable
 target_id        | uuid  |  |          |        ← 仍然 nullable
```

```sql
$ docker exec cms-client-postgres-1 psql -U cms -d cms -c "\d customers"
 (没有 name_zh / name_ja / name_en 列；只有 base_profile jsonb)
```

R29 报告 A1 / I1 / I2 全部是基于"文件存在 + grep"标 LANDED，未跑 `npm run db:migrate`。

**影响范围**：

- **041_rename_case_fee_milestone**：未应用 → 影响 billing 相关 enum 命名
- **042_phase_stage_consistency_backfill**：未应用 → phase/stage 一致性回填未生效
- **043_reminders_drop_legacy_nullable**：未应用 → reminder 写入链路全部 400（直接复现）
- **044_customers_localized_names**：未应用，但实际 customers 表的多语言用 `base_profile.name_cn/name_jp/name_en` 实现，migration 044 是 dead code（见 R30-O）

**修复建议**：

1. 在 dev 环境跑 `npm --workspace=server run db:migrate` 应用 041～044
2. 验证 reminder 创建链路恢复
3. 如果 044 不需要，删除文件（与 R30-O 关联）
4. 增加 CI guard：`npm run guard` 中加入 migration drift 检测——比对 `schema_migrations` 表与 src/infra/db/migrations/ 目录文件列表，drift 时 fail
5. R29 报告应该撤销 R28-H / I1 / I2 的 LANDED 标签

**优先级**：P0。这是工程纪律严重缺失，导致 R29 多个 LANDED 是虚假承诺。

---

## 2. P1 缺陷详细

### 2.1 R30-F：任务行 avatar 显示 assigneeUserId 首字符（P1）

**真浏览器观测**：

CASE-202605-0005 任务行 DOM：
```html
<span class="tasks-tab__avatar">0</span>     ← 显示 "0"
<span class="tasks-tab__avatar">0</span>     ← 显示 "0"
```

**根因**：

`packages/admin/src/views/cases/model/CaseAdapterSupportSeams.ts:378`：
```ts
assignee: assigneeUserId ? assigneeUserId.charAt(0).toUpperCase() : "—",
```

UUID 首字符如果是数字（`0xxxxx-xxxx-...`）就显示 "0"。

**对比 R27-A 修复**：沟通记录 author 已改为 lookup `createdByDisplayName` 三语回退，task 没改。

**修复建议**：

类似 R27-A 的 createdByDisplayName，TaskItem 增加 `assigneeUserId` lookup 到用户表：
```ts
assignee: deriveAvatarLabel(lookupUserDisplayName(assigneeUserId, userIndex), assigneeUserId),
```

---

### 2.2 R30-G：日期输入控件无 max year 限制（P1）

**真浏览器观测**：

在 "添加期限" modal 的日期 input 中 `type_text "20261231"` 后：
```
Date "提醒日期" value="202612-03-01"   ← 年=202612, 月=3, 日=1
```

**根因**：

HTML5 `<input type="date">` 默认接受 valuemax="275760" 年份。控件没有自动 routing 4位年→2位月→2位日 的输入逻辑，全部 8 位数字消费成年份和月日。

**修复建议**：

1. 短期：在 input 上加 `max="9999-12-31"` 属性
2. 中期：自定义 date input 组件做 keystroke routing（4位后自动跳到月）
3. 或改用 popover date picker（更可靠）

---

### 2.3 R30-J：FE 把 internal/client_visible 错误映射成 channelType="other"（P1）

**真浏览器观测**：

通过 UI 选择"内部记录"创建沟通记录后，DB 实际写入：
```sql
$ SELECT channel_type FROM communication_logs ORDER BY created_at DESC LIMIT 1;
 channel_type 
--------------
 other
```

Timeline 显示："沟通记录追加：其他"

**根因**：

`packages/admin/src/views/cases/model/CaseAdapterMessageWriteBuilders.ts:46-50`：
```ts
const CHANNEL_MAP: Record<MessageChannelChoice, { channelType: string; visibleToClient: boolean }> = {
  internal:       { channelType: "other", visibleToClient: false },   // ← 错
  client_visible: { channelType: "other", visibleToClient: true },    // ← 错
  phone:          { channelType: "phone", visibleToClient: false },
  meeting:        { channelType: "meeting", visibleToClient: false },
};
```

FE 把 4 选 1 退化成 2 选 1 + visibleToClient boolean。导致：
- timeline 只能显示"沟通记录追加：其他"，无法区分内部/客户可见
- log tab 类型 chip 无法区分

**修复建议**：

DB schema 没有 channel_type CHECK constraint，可以扩展 enum：
```ts
internal:       { channelType: "internal_note", visibleToClient: false },
client_visible: { channelType: "client_note",   visibleToClient: true },
```

并在 `CaseCommsLogsAdapter.MESSAGE_TYPE_I18N_KEYS` / `CaseCommsTimelineBuilders.COMM_LOG_CHANNEL_I18N` 中补 `internal_note` / `client_note` 的 i18n key。

---

### 2.4 R30-K：编辑 modal 日期字段未回填案件已有数据（P1）

**真浏览器观测**：

CASE-202605-0005 概览显示"目标提交日期：2026/12/31"，但点击"编辑信息"后 modal 中：
```
Date "目标提交日期"   value=""    年=0 月=0 日=0
Date "受理日期"       value=""    年=0 月=0 日=0
```

priority="普通" / owner="Local Admin" / group="东京一组" 等都正确回填了。

**根因（需进一步定位）**：

可能原因：
1. CaseEditModal props 接收了 `targetSubmissionDate` 但没绑定到 `<input type="date">` 的 value
2. 或者日期格式不匹配（ISO ↔ YYYY-MM-DD）

**修复建议**：

打开 `packages/admin/src/views/cases/components/CaseEditModal.vue` 检查 date input 的 `:value` 绑定，确认从 props 转换为 `YYYY-MM-DD` 格式后绑到 input。补 unit test 覆盖回填。

---

## 3. P2 缺陷详细

### 3.1 R30-D：手动添加资料项 modal 缺 aria-labelledby + aria-modal（P2）

**真浏览器观测**：
```js
{
  ariaLabelledby: null,   // ← 应该指向 h3 的 id
  ariaModal: null,        // ← 应该是 "true"
  ariaLabel: "手动添加资料项",  // 从 sibling 推断的
  closeBtnAria: null      // X 按钮无 aria-label
}
```

**修复建议**：参考 `CaseFormGenerateModal.vue` 的 `aria-labelledby="case-form-generate-title"` 模式。

---

### 3.2 R30-E：手动添加资料项 modal 不响应 Escape（P2）

**真浏览器观测**：modal 打开后按 Escape 不关闭。

**修复建议**：参考 `useEscapeClose` 或 `PhaseTransitionPopover.a11y-escape.test.ts` 已经覆盖的模式，给该 modal 也接入 `@keydown.esc`。

---

### 3.3 R30-L：阶段流转 popover 缺 aria-labelledby + 选项缺 role/键盘可达（P2）

**真浏览器观测**：
```js
{
  ariaLabelledby: null,
  ariaModal: "true",
  ariaLabel: null,
  itemHTML: '<li class="phase-popover__item" data-testid="phase-target-item">等待资料 → 资料准备中</li>'
}
```

阶段选项是 plain `<li>`，无 `role="button"` / `tabindex="0"`，键盘用户无法选择。

**修复建议**：

1. 给 dialog 加 `aria-labelledby="phase-popover-title"` 链接到 h3
2. 把选项改为 `<button class="phase-popover__item">` 或加 `role="radio"` + `tabindex="0"` + 键盘 handler
3. 给 X 关闭按钮加 `aria-label="t('common.close')"`

---

### 3.4 R30-N：CaseCloseReasonModal 显示空数据（P2）

**真浏览器观测**：

CASE-202604-0016 (CLOSED_FAILED) 点击"查看关闭原因" modal：
```
归档时间：—
操作人：Local Admin
暂无详细结案信息。
```

但 case 实际已 closed（S9 状态），DB 应该有 closeReason / closeNote / closedAt。

**修复建议**：

1. 检查 server `/api/cases/:id/aggregate` 是否返回 close reason 字段
2. 检查 adapter 是否读取 close reason
3. 如果数据本来就没填，UI 文案改为"未记录关闭原因"更准确

---

### 3.5 R30-M：所有 modal 关闭按钮（X）缺 aria-label（P2 跨多 modal）

**真浏览器观测**：

跨 4 个 modal 测试结果：
```js
// 手动添加资料项 modal
allBtns: [{text: "", aria: null}, {text: "取消", ...}, {text: "添加", ...}]

// CaseFormGenerateModal
closeBtn: [{text: "", aria: null}, {text: "取消", ...}, {text: "生成", ...}]

// CaseEditModal
button uid=66_4 无 label

// CaseDeadlineCreateModal
button uid=59_4 无 label
```

X 按钮的 `<button>` 既无文本子节点也无 `aria-label`，屏幕阅读器朗读为空按钮。

**修复建议**：

跨所有 modal 的 X 按钮加 `aria-label="t('common.close')"`，或在按钮内放 `<span class="sr-only">{{ t('common.close') }}</span>`。一次 PR 全部修复。

---

## 4. P3 缺陷详细

### 4.1 R30-P：S7 validation tab 文案矛盾（P3）

**真浏览器观测**（en-US, CASE-202604-0018, S7）：

```
COE / Overseas Visa / Re-entry Result
Case has not reached this stage                                                  ← 矛盾
The case has been approved. COE will be dispatched after final payment is cleared.   ← 正确
```

两条文案同时显示，前者应该被覆盖。

**修复建议**：

`CaseValidationSupport.vue` 的 `coeNoteKeySuffix` 已根据 phase 分支正确生成 noteAwaitingCoe 文案，但顶部"Case has not reached this stage"是另一处独立文案——应当根据 `coeNoteKeySuffix` 的取值条件性渲染。

### 4.2 R30-O：migration 044 是 dead code（P3）

R29 报告 I1～I4 标记 LANDED 的"customers 多语言列"实际未应用，但 admin UI 在 ja-JP locale 下确实正确显示了 "R6試験顧客"。原因是：

```sql
$ SELECT base_profile FROM customers WHERE id = '...';
{
  "name_cn": "R6试探客户",
  "name_jp": "R6試験顧客",
  "name_en": "R6 Probe",
  ...
}
```

实际实现走的是 `base_profile.name_cn/name_jp/name_en` JSON fallback，与 044 migration 的 column-based 设计冲突。

**修复建议**：

1. 选定一个统一方案（推荐 base_profile JSON，avoid breaking 现有数据）
2. 删除 044_customers_localized_names.up/down.sql + customers.localized-names.ts 等 dead code
3. 或决定保留 column-based 实现，跑 migration 并迁移 base_profile JSON 数据到列

---

## 5. 关键产物 / 修复清单

| 优先级 | BUG | 涉及文件（核心） |
|---|---|---|
| P0 | R30-A | `CaseOverviewTab.vue`、`CaseCommsLogsAdapter.ts` (buildOverviewTimelineFromLog), `CaseOverviewTab.recent-activity.test.ts` |
| P0 | R30-H | dev DB run migrate；`schema_migrations` 表、CI guard |
| P1 | R30-F | `CaseAdapterSupportSeams.ts:378` adaptTaskDto |
| P1 | R30-G | `CaseDeadlineCreateModal.vue`、`CaseEditModal.vue` 等所有 date input |
| P1 | R30-J | `CaseAdapterMessageWriteBuilders.ts` CHANNEL_MAP；`MESSAGE_TYPE_I18N_KEYS`、`COMM_LOG_CHANNEL_I18N` |
| P1 | R30-K | `CaseEditModal.vue` date input 回填 |
| P2 | R30-D / E | "手动添加资料项" modal（CaseDocItemAddModal 或类似）|
| P2 | R30-L | `PhaseTransitionPopover.vue` (or PhasePopover) |
| P2 | R30-N | `CaseCloseReasonModal.vue` + server aggregate DTO |
| P2 | R30-M | 跨所有 modal 的 X 按钮 |
| P3 | R30-P | `CaseValidationSupport.vue` 顶部文案条件渲染 |
| P3 | R30-O | 删除 044 migration + customers.localized-names.ts |

---

## 6. R29 复测方法学反思

R29 报告基于"代码 grep + 文件存在 + 测试文件存在"标 LANDED，跳过：

1. **真浏览器渲染断言**：导致 R28-G 的 timeline 未本地化未被发现
2. **dev DB migration 状态**：导致 041～044 未应用未被发现
3. **业务流端到端复跑**：导致 R30-J 沟通记录类型映射 bug 一直没暴露

**R31 起改进建议**：

- 引入 chrome-devtools-mcp / playwright 强制复测，覆盖每条 LANDED 缺陷的真实交互
- `npm run guard` 增加 migration drift 检测
- `npm run guard` 增加 i18n 渲染断言（snapshot timeline 不能含 `cases.log.timeline.*` raw key）
- LANDED 状态改为 3 档：`code-landed`（grep 通过）/ `unit-tested`（vitest 通过）/ `e2e-verified`（真浏览器走查通过）；只有 `e2e-verified` 才算最终交付

---

## 7. 取证补充

- 网络请求 evidence：POST `/api/reminders` × 3 全部 400，pgCode 23502（R30-H）
- DB 状态 evidence：`schema_migrations` 最新 `040_*`（R30-H）；customers 无 name_zh/ja/en 列（R30-O）
- 截图 evidence：`/tmp/r30-overview-d993.png`（R30-A 概览 timeline 截图）

---

**报告生成完毕。R29 22 条 LANDED 中实测 ≥4 条（含 2 条 P0）实际未生效；R30 新发现 11 条缺陷（含 2 条 P0 / 4 条 P1 / 4 条 P2 / 3 条 P3）。**
