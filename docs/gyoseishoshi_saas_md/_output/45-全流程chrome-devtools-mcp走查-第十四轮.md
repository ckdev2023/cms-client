# 全流程 chrome-devtools-mcp 走查（第十四轮 / R33 闭环复测 + 新缺陷扫描）

> 生成日期：2026-05-04（R33 修复闭环后基础上的全流程横向复测 + 新缺陷扫描）
>
> 命题：
> - R33 在 5 条跨模块缺陷上做了一轮修复，本轮要做两件事：
>   1. **闭环验收**：用真浏览器复测 R33-A/B/C/D/E 的修复状态。
>   2. **再扫描**：在 R33 修复面下找新引入的回归与遗漏。
>
> 复测覆盖：
> - 三语言基线：zh-CN（默认）/ en-US / ja-JP
> - 数据集：本地 Local Demo Office / Local Admin / 17 进行中案件 + 6 归档/结果待确认 + 7 收费节点 + 1 回款流水 + 5 提醒日志
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot / click / fill / list_network_requests / list_console_messages / evaluate_script）

---

## 0. 总结

### 0.1 一句话结论

**R33 的 5 条缺陷修复已全部闭环（5/5），数据库回归 R33-D 已修复，settings deep-link 已生效，validation tab 文案已对齐。本轮在案件详情「概览」tab 的右侧风险摘要 / 校验提示卡片中发现一组同源的英文文案漏出（4 条 P2/P3，均来自 `CaseAdapterDetailAggregate.ts` 中 hard-code 字符串），另在 dashboard 待办卡片发现 1 条 enum 未翻译的 P3 问题。建议 R34 集中收口 adapter 层的 i18n 漏洞，避免后续每轮都暴露同一类问题。**

### 0.2 R33 闭环验收（5/5 全修）

| 编号 | 缺陷 | R34 验证结果 |
|---|---|---|
| **R33-A** P2 | validation tab 漏出 `cases.validation.lastFailed` i18n key + `1 件の阻断項目` 日文 hard-code | ✅ **已修复**：zh-CN 显示「1 项阻断未处理 / 上次检查有未通过项，请修改后重新检查。」；en-US 显示 `1 blocking items` + 完整描述；ja-JP 仍是 `1 件の阻断項目`（属正常 ja 文案） |
| **R33-B** P3 | validation tab 日期 `2026/5/4` 未补 0 | ✅ **已修复**：现显示 `2026/05/04`（zh/en/ja 一致） |
| **R33-C** P2 | tab badge 文本 `卡点1`、`沟通记录 1` 间距不一致 | ✅ **已修复**：所有 badge 间统一一个空格，`卡点 1`、`资料清单 0/1`、`沟通记录 1` |
| **R33-D** P1 | `/api/reminders` 因 `c.title` 列不存在抛 500 → 任务页 4 chip 全 0 | ✅ **已修复**：`/api/reminders?limit=200`、`/api/reminders?caseId=…` 均 200；任务页 chip 显示 `提醒日志 5`，提醒列表内容、时间、关联案件齐全 |
| **R33-E** P3 | settings 页 `?tab=storageRoot` 未生效 | ✅ **已修复**：链接改为 `?tab=storage-root`，`SettingsView.vue` 正确激活「本地资料根目录」tab（active class 已加） |

**汇总**：5 条全部闭环 ✅。

### 0.3 R34 新发现缺陷分布

| 等级 | 数量 | 主要分布 |
|---|---|---|
| **P2** | 3 | 案件详情 概览 tab 风险摘要 + 校验提示 英文 hard-code |
| **P3** | 2 | 案件详情 概览 tab 截止日期 prefix hardcode / 仪表盘 待办 enum 未翻译 |
| **P4** | 2 | settings 子导航缺 aria-current / form fields 缺 id/name |

### 0.4 体系性问题（编译式沉淀）

1. **adapter 层硬编码英文成为新一轮 i18n 漏洞源头**
   - `CaseAdapterDetailAggregate.ts` 中 4 处直接拼接英文模板字符串：`${count} blocking issues`、`${b} blocking, ${w} warning`、`Due: ${date}`、`lastValidation: status`（直接读 raw status）。
   - **建议**：将 adapter 层禁止任何用户可见字符串硬编码，所有面向 UI 的可读文本必须以 i18n key 形式产出（例如 `riskBlocking: { key: 'cases.detail.overview.riskBlocking', params: { count } }`），由组件层 `t()` 渲染。

2. **服务端 → 前端拼接的中文模板成为未翻译 enum 入口**
   - `dashboard.workItem.ts` `mapTodoItem` 直接 `状态：${row.status} · 优先级：${row.priority}` 注入到 `desc`，并通过 i18n key `todo.statusPriority` 模板渲染。三 locale 都把 `pending`/`normal` 这种 raw 值直接字面输出。
   - **建议**：`descParams` 不应直接传 raw enum，应同时传 `statusKey: 'tasks.status.' + row.status`、`priorityKey: 'tasks.priority.' + row.priority`，由模板用 `@:` 引用（vue-i18n linked messages）。

3. **i18n CI lint（继承自 R33 建议，仍未落地）**
   - 本轮再次发现 4 条同模块的 i18n 漏出（adapter 层）+ 1 条服务端 enum 直出。
   - **建议**：CI 增加扫描，规则：
     a. 禁止 `packages/admin/**/model/**` 中出现 `${...} blocking|warning|due|failed|passed|status|priority` 形式的英文 hard-code；
     b. 禁止 `packages/server/**/dashboard/**` 在 `desc/title/meta` 字段中以 `${row.status}`、`${row.priority}` 方式拼接。

4. **a11y 子项未达 WCAG 基线**
   - settings 子导航 button 没有 `aria-current="page"` / `aria-pressed`，只有 active class。
   - 全站 4 处 form field 缺少 `id`/`name`（chrome devtools 自报 issue）。
   - **建议**：建立 a11y lint baseline，统一在 PageNav / ToolbarTabs / FormField 等 shared/ui 组件中强制要求 a11y 属性。

---

## 1. R34 P2 缺陷详细

### 1.1 R34-A [P2]：案件详情 概览 tab 风险摘要英文 hard-code

**触发**：进入案件详情（任意有 blocking 的案件）→ 「概览」tab → 右侧「阻断与风险摘要」卡片。

**snapshot（zh-CN）**：

```
StaticText "1"                    ← 阻断数量
StaticText "1 blocking issues"    ← ❌ 英文 hard-code
StaticText "有"
StaticText "¥200,000"
StaticText "failed"               ← ❌ raw status
```

**snapshot（en-US）**：

```
StaticText "1 blocking issues"    ← OK in English but 仍属 hard-code
StaticText "Yes"
StaticText "¥200,000"
StaticText "failed"               ← OK in English but raw enum
```

**snapshot（ja-JP）**：与 zh-CN 一致，未翻译。

**根因**：

```ts
// packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts:136
blockingDetail: blockingCount > 0 ? `${blockingCount} blocking issues` : "",
```

```ts
// packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts:142
lastValidation: latestValidation
  ? readString(latestValidation, "status")   // 直接读 raw status，未翻译
  : "",
```

**修复建议**：
- 在 `types-detail.ts` 引入 i18n 字段族（如 `blockingDetailKey: string; blockingDetailParams?: Record<string, unknown>`），adapter 只产出 key + params；
- 组件 `CaseOverviewSidebar.vue` 用 `t(detail.risk.blockingDetailKey, params)` 渲染；
- 三 locale 补：
  - `cases.detail.overview.risk.blockingDetail`：`{count} 项阻断` / `{count} blocking item(s)` / `{count} 件のブロッカー`
  - `cases.detail.overview.risk.lastValidation.failed/passed`：`未通过` / `Failed` / `不合格`

**优先级**：P2（zh-CN 与 ja-JP 用户面前直接漏英文，影响专业感）。

**位置**：`packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts:128-147`

---

### 1.2 R34-B [P2]：案件详情 概览 tab 校验提示英文 hard-code

**触发**：进入案件详情 → 「概览」tab → 右侧底部「提交前校验」卡片。

**snapshot（zh-CN）**：

```
heading "提交前校验"
StaticText "1 blocking, 0 warning"   ← ❌ 英文 hard-code
button "查看校验与提交包"
```

**snapshot（en-US）**：

```
heading "Validation"
StaticText "1 blocking, 0 warning"   ← OK in English but hard-code
button "Open validation"
```

**根因**：

```ts
// packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts:178
function buildValidationHint(blockingCount: number, warningCount: number) {
  if (blockingCount > 0)
    return `${blockingCount} blocking, ${warningCount} warning`;
  if (warningCount > 0) return `${warningCount} warning`;
  return "";
}
```

**修复建议**：
- 同 R34-A，把字段拆成 `validationHintKey + validationHintParams`；
- 三 locale 补：
  - `cases.detail.overview.validationHint.blockingWarning`：`阻断 {b} 项 · 警告 {w} 项` / `{b} blocking, {w} warning` / `ブロッカー {b} 件 · 警告 {w} 件`
  - `cases.detail.overview.validationHint.warningOnly`：`{w} 项警告` / `{w} warning` / `警告 {w} 件`

**位置**：`packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts:178-183`

---

### 1.3 R34-C [P2]：案件详情 概览 tab 截止日期 `Due:` 前缀英文 hard-code

**触发**：进入案件详情 → 「概览」tab → 上方 stat 卡「预计截止日期」下的副文本。

**snapshot（zh-CN）**：

```
StaticText "预计截止日期"
StaticText "2026/12/31"
StaticText "Due: 2026/12/31"   ← ❌ 英文前缀
```

**snapshot（en-US）**：`Due: 2026/12/31` ✅
**snapshot（ja-JP）**：`Due: 2026/12/31` ❌（应为 `期限：2026/12/31`）

**根因**：

```ts
// packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts:314
deadlineMeta: dueAt ? `Due: ${formatDate(dueAt)}` : "",
```

**修复建议**：
- adapter 改为只输出 `deadlineMetaDate: formatDate(dueAt)`；
- 组件用 `t('cases.detail.overview.deadlineMeta', { date: detail.deadlineMetaDate })`；
- 三 locale 补：
  - `cases.detail.overview.deadlineMeta`：`期限：{date}` / `Due: {date}` / `期限：{date}`

**注意**：相关测试 `CaseAdapterDetailAggregate.focused.test.ts:169`、`overview-info-focused.test.ts:138`、`main-chain.test.ts:241` 都断言 `expect(result.detail.deadlineMeta).toContain("Due:")` —— 修复时要同步改成断言 i18n key 而非英文文本。

**位置**：`packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts:314`

---

## 2. R34 P3 缺陷详细

### 2.1 R34-D [P3]：案件详情 概览 风险摘要 `failed` 等 raw enum 未翻译

详见 R34-A，已合并。`failed` 这一条的修复独立成一条，单独列出便于跟踪：

- 数据来源：`validation_runs.status`（raw enum 值 `failed`/`passed`/`pending`）
- 当前 UI：直接字面输出 raw 值
- 修复方向：adapter 输出 `lastValidationStatusKey: 'cases.detail.overview.validationStatus.' + status`，组件 `t()` 渲染

---

### 2.2 R34-E [P3]：仪表盘 待办卡片 enum 未翻译

**触发**：登录后默认仪表盘 → 「今日待办」section → 单个任务卡片的 `desc` 文本。

**snapshot（zh-CN）**：

```
heading "R7 audit task valid"
StaticText "案件：R7 BUG-118 supplement double"
StaticText "执行人：Local Admin"
StaticText "进行中"
StaticText "状态：pending · 优先级：normal"   ← ❌ raw enum
```

**snapshot（en-US）**：

```
StaticText "Status: pending · Priority: normal"   ← raw enum 字面输出
```

**snapshot（ja-JP）**：

```
StaticText "ステータス：pending · 優先度：normal"   ← raw enum
```

**对比**：`/tasks` 页面同一任务的状态/优先级列正确显示 `待处理 / 普通`、`Pending / Normal`、`未対応 / 通常`。

**根因**：

```ts
// packages/server/src/modules/core/dashboard/dashboard.workItem.ts:132-139
desc: `状态：${row.status} · 优先级：${row.priority}`,
status: tone,
statusLabel: TODO_STATUS_LABEL[tone],
action: row.case_id ? "查看案件" : "查看任务",
route: row.case_id ? `/cases/${row.case_id}` : "/tasks",
statusLabelKey: TODO_STATUS_LABEL_KEY[tone],
descKey: "todo.statusPriority",
descParams: { status: row.status, priority: row.priority },   ← raw enum
```

i18n 模板：
```
zh-CN: "状态：{status} · 优先级：{priority}"
en-US: "Status: {status} · Priority: {priority}"
ja-JP: "ステータス：{status} · 優先度：{priority}"
```

**修复建议**：
- 把 `descParams` 改成传 i18n key 引用，并在前端使用 vue-i18n linked message：
  ```ts
  descParams: {
    status: row.status,
    priority: row.priority,
    statusLabel: t('tasks.status.' + row.status),
    priorityLabel: t('tasks.priority.' + row.priority),
  }
  ```
- 或在前端 `WorkPanelSection.vue` 里二次 `t()`：
  ```vue
  {{ t('dashboard.workItem.desc.todo.statusPriority', {
        status: t('tasks.status.' + item.descParams.status),
        priority: t('tasks.priority.' + item.descParams.priority),
     }) }}
  ```
- 优先用前端方案，避免 server 引入 i18n 依赖。

**位置**：
- 服务端：`packages/server/src/modules/core/dashboard/dashboard.workItem.ts:122-148`
- 前端 i18n 模板：`packages/admin/src/i18n/messages/dashboard-work-item/{zh-CN,en-US,ja-JP}.ts:23`

---

## 3. R34 P4 缺陷详细（a11y / 体验）

### 3.1 R34-F [P4]：settings 子导航缺 aria-current

**触发**：访问 `/#/settings?tab=storage-root`。

**evaluate_script 输出**：

```json
[
  {"text":"分组管理","classes":"settings-view__subnav-btn","ariaCurrent":null,"ariaSelected":null},
  {"text":"可见性配置","classes":"settings-view__subnav-btn","ariaCurrent":null,"ariaSelected":null},
  {"text":"本地资料根目录","classes":"...subnav-btn--active","ariaCurrent":null,"ariaSelected":null}
]
```

**问题**：active class 已加，但缺 `aria-current="page"` 或 `aria-pressed="true"` —— 屏幕阅读器无法识别当前激活 tab。

**修复建议**：`SettingsView.vue` 子导航 button 增加：

```vue
<button
  :class="[..., { '--active': active }]"
  :aria-current="active ? 'page' : undefined"
>
```

---

### 3.2 R34-G [P4]：表单字段缺 id/name（console issue × 4）

**控制台**：

```
[issue] A form field element should have an id or name attribute (count: 4)
```

**说明**：累计 4 处 input/select 缺少 `id` 或 `name` 属性，无法被屏幕阅读器与浏览器自动填充正确识别。位置未在本轮定位（chrome devtools issues panel 才能精确给出）。

**修复建议**：执行 axe-core 扫描或 chrome devtools 的 Issues panel 取出具体节点，对应 `<input>` / `<select>` 加 `id={...}`。一并补 `<label for="...">` 关联。

---

## 4. 已确认 PASS 的关键流程（R33 闭环后复测）

| 流程 | 验证 | 备注 |
|---|---|---|
| 登录 → 默认进入 dashboard | ✅ | LocalAdmin admin@local.test / Admin123!（已保留 session） |
| Dashboard 「我的」/「全所」tab + 7 天 / 30 天 切换 | ✅ | scope/timeWindow 都返回 200/304 |
| Dashboard 「本组」tab disabled + tooltip | ✅ | R32-A 累计闭环 |
| Dashboard 风险案件 期限格式 `2026/12/31` | ✅ | 之前 R33 余留的 dash 格式已统一为 slash |
| 任务与提醒 4 chip 数量 | ✅ | 待处理 1 / 今日到期 0 / 已逾期 0 / 提醒日志 5 |
| 任务与提醒 提醒日志 5 条 | ✅ R33-D | 内容、时间、关联案件齐全 |
| 案件列表 + 23 条记录 + 6 类 filter | ✅ | 类型列前缀 `经营管理签` 一致；旧 4 条无 4 个月 后缀（R32-H 部分） |
| 案件详情 9 个 tab + tab badge 间距 | ✅ R33-C | `卡点 1`、`资料清单 0/1`、`沟通记录 1` 间距统一 |
| 案件详情 提交前检查 tab 4 按钮 + 文案 | ✅ R32-C / R33-A | 「重新检查」「新建提交包」「登记欠款风险确认」可点；「发起复核」disabled 且提示明确；i18n 漏出已清 |
| 案件详情 验证日期 `2026/05/04` | ✅ R33-B | zh/en/ja 一致 |
| 客户列表 我的 2 位 + KPI | ✅ |
| 客户详情 5 tab + 沟通记录 时间格式 | ✅ R32-G | `2026/04/30 22:11` 等格式正确 |
| 客户详情 BMV 承接卡片 | ✅ R32-F | 时间字段统一 `yyyy/MM/dd HH:mm` |
| 资料中心 KPI 「缺件 / 待登记 1」 | ✅ R32-J |
| 资料中心 onboarding alert + 「前往「系统设置」」link | ✅ R32-L 部分 + R33-E | 链接 `?tab=storage-root` 正确激活 settings 子 tab |
| 收费 案件列表 7 条 + 摘要总额加总 | ✅ | 应收 ¥860,000 / 已收 ¥100,000 / 待收 ¥760,000 一致 |
| 收费 回款流水 1 条 时间格式 | ✅ R32-E | `2026/05/02 09:00` |
| 系统设置 资料根目录 时间格式 | ✅ R32-K | `2026/05/02 21:19` |
| 系统设置 deep-link `?tab=storage-root` | ✅ R33-E | 直接跳到「本地资料根目录」tab |
| 三语言完整切换 | ✅ | zh-CN / en-US / ja-JP 全 menu/breadcrumb/breadcrumbs 对齐 |
| 整页网络请求 | ✅ | 31 条 fetch/xhr 全部 200/304，无 5xx/4xx |
| 整页 console error | ✅ | 0 console error；仅 1 条 a11y issue（form fields × 4） |

---

## 5. 工程改进建议（编译式回灌）

1. **adapter 层 i18n 边界硬约束**
   - 现状：`CaseAdapterDetailAggregate.ts` 中 4 处 hard-code 字符串直接漏到三语 UI
   - 建议：
     - 给 `types-detail.ts` 增加 `LocalizableText = { key: string; params?: Record<string, unknown> }` 类型
     - 所有 `risk.*Detail / risk.lastValidation / validationHint / deadlineMeta` 这类字段从 `string` 改为 `LocalizableText`
     - lint 规则：`packages/admin/src/**/model/**` 下，禁止 `:string` 类型字段在 return 中拼接英文 hard-code 字符串

2. **服务端 enum 透传问题**
   - 现状：`dashboard.workItem.ts` 把 `pending`/`normal` enum 直接拼进 desc 模板
   - 建议：服务端只传 raw enum，前端 model 层做一次 i18n key 转换；`descParams` 不再透传 raw enum

3. **i18n CI lint（沿用 R33 建议）**
   - 检测 `<template>` 中 `cases\.\w+\.\w+` 形态的 key 直出
   - 检测 zh-CN/ja-JP 渲染中出现裸英文单词的 hard-code（如 `blocking`、`warning`、`failed`、`pending`、`Due:`、`Status:`）
   - 三 locale message 文件 key 集自动对齐校验

4. **a11y baseline**
   - settings、cases 详情、tasks 等所有 sub-tab/sub-nav 强制要求 `aria-current` 或 `role=tab + aria-selected`
   - 所有 input/select 强制 `id` 或 `name`，并配 `<label for="">`

5. **真 PostgreSQL 集成测试基线（沿用 R33-D 教训）**
   - 已在 R33-D 修复中体现（reminders 改为 `c.metadata->>'name' as case_title`），但仅靠字符串 SQL 断言不够
   - 建议每个 service 至少 1 个 integration test 用 `pg` 真跑，重点覆盖 list / get

---

## 6. 下一步行动

按 P 等级分批：

1. **R34-A/B/C（P2 同源）**：在 1 个 PR 内一次性把 `CaseAdapterDetailAggregate.ts` 的 4 处 hard-code 改为 i18n key，对应改测试与 i18n 字典。
2. **R34-D（P3）**：与 A/B/C 合并修复（同源）。
3. **R34-E（P3）**：服务端不传中文模板，前端 model 层做 enum → i18n key 转换。
4. **R34-F/G（P4）**：a11y 改进可单独成一个 PR；同时把 axe-core 加入 CI。
5. **工程改进**：adapter i18n 边界类型 + i18n CI lint，可与 R34 闭环 PR 一起提。

---

**报告生成完毕。R33 的 5 条修复全部闭环；本轮新发现 7 条缺陷（P2 × 3 / P3 × 2 / P4 × 2），其中 R34-A/B/C/D 同源于 `CaseAdapterDetailAggregate.ts` 中 hard-code 英文模板，R34-E 同源于 dashboard 服务端 enum 透传问题，建议 R34 一次性收口 adapter 层 i18n 漏洞。**
