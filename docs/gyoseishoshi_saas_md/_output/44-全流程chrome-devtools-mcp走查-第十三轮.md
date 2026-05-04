# 全流程 chrome-devtools-mcp 走查（第十三轮 / R32 闭环复测 + 新缺陷扫描）

> 生成日期：2026-05-04（R32 修复闭环后基础上的全流程横向复测 + 新缺陷扫描）
>
> 命题：
> - R32 在 12 条跨模块缺陷上做了一轮修复（git status 体现 80+ 文件变动），本轮要做两件事：
>   1. **闭环验收**：用真浏览器复测 R32 12 条缺陷的修复状态。
>   2. **再扫描**：在 R32 修复面下找新引入的回归与遗漏。
>
> 复测覆盖：
> - 三语言基线：zh-CN（默认）/ en-US / ja-JP
> - 数据集：本地 Local Demo Office / Local Admin / 14 R6试探客户案件 + 9 Tani Keiei Cert4M Test 案件 + 7 收费节点 + 1 回款流水
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot / click / fill / list_network_requests / list_console_messages / evaluate_script）

---

## 0. 总结

### 0.1 一句话结论

**R32 的 12 条缺陷修复闭环良好（10 条全修、2 条部分修复），但 R32-D 修复时引入 1 条 P1 数据库回归缺陷，且案件提交前检查 tab 在 R32-C 修复后又暴露了 i18n key 漏出 / 日文 hard-code 漏出 / 日期未补齐 0 等三条次生 P2/P3 缺陷。建议 R33 优先修 P1 reminders 500，再清整次生 i18n 漏出。**

### 0.2 R32 闭环验收（12/12 已复测）

| 编号 | 缺陷 | R33 验证结果 |
|---|---|---|
| **R32-A** P2 | Dashboard 本组 tab 报错但仍渲染旧数据 | ✅ **已修复**：本组 tab `disabled + tooltip="您未加入任何分组，无法查看本组数据"`；不再发起 400 请求 |
| **R32-B** P2 | 咨询线索 业务类型 缺失「经营管理」 | ✅ **已修复**：list filter 与 modal 同步加入「经营管理」option |
| **R32-C** P2 | 案件提交前检查 tab 4 个核心按钮全 disabled | ✅ **已修复**：「重新检查」「新建提交包」「登记欠款风险确认」均可点击；「发起复核」disabled 但带「事务所未启用双人复核」明确原因 |
| **R32-D** P2 | 任务-提醒日志 内容字段降级到原始 UUID | ⚠️ **修复但回归**：UI 层不再 raw UUID，但 SQL 层引用了 cases 表不存在的 `c.title` 列（详见 R33-D） |
| **R32-E** P2 | 收费-回款流水记录 回款日期显示原始 ISO 字符串 | ✅ **已修复**：显示 `2026/05/02 09:00` |
| **R32-F** P3 | 客户详情 BMV 承接卡片 时间字段全部 `(UTC)` 后缀 | ✅ **已修复**：5 个时间字段统一显示 `2026/04/30 22:11` |
| **R32-G** P3 | 客户详情 沟通记录 时间显示原始 ISO 时间戳 | ✅ **已修复**：显示 `2026/04/30 22:11` |
| **R32-H** P3 | 案件列表 类型字段同时存在两种文案 | ✅ **基本修复**：所有 BMV 案件统一前缀为「经营管理签」，新案件后缀「· 认定 4 个月」；旧 4 条无后缀但前缀已对齐 |
| **R32-I** P3 | CASE-202604-0006 标题字段降级到编号 | ✅ **已修复**：现在显示 `Tani Keiei Cert4M Test · 经营管理签` fallback |
| **R32-J** P3 | 资料中心 KPI「缺件」与列表 状态 列语义模糊 | ✅ **已修复**：KPI label 改为「缺件 / 待登记」 |
| **R32-K** P3 | 系统设置-本地资料根目录 最后更新时间显示 ISO 时间戳 | ✅ **已修复**：显示 `2026/05/02 21:19` |
| **R32-L** P3 | 资料中心 onboarding 阻塞「登记资料」全局 disabled | ⚠️ **部分修复**：alert 内增加了「前往「系统设置」」link 跳转，但「登记资料」仍 disabled，且 deep-link query `?tab=storageRoot` 未生效（详见 R33-E） |

**汇总**：10 条全修 ✅，2 条部分修复 / 引入回归 ⚠️。

### 0.3 R33 新发现缺陷分布

| 等级 | 数量 | 主要分布 |
|---|---|---|
| **P1** | 1 | reminders endpoint 500 → 任务页 / 案件详情 reminders 完全瘫痪 |
| **P2** | 2 | validation tab 日文 hard-code + i18n key 漏出 / chip badge 文本格式不一致 |
| **P3** | 2 | validation tab 日期 `2026/5/4` 未补齐 0 / settings deep-link query 未生效 |

### 0.4 体系性问题（编译式沉淀）

1. **R32-D 修复未在真 PostgreSQL 上跑**
   - 测试用 `assert.ok(listCall.sql.includes("c.title as case_title"))` 仅断言 SQL 文本，未真跑数据库 → 让一个 schema-incompatible 的 join 通过 guard。
   - **建议**：reminders 模块新增 integration test，使用本地 PostgreSQL 跑 list 查询，确保 SQL 与 schema 真正兼容。

2. **i18n key 与翻译落地双向漏出**
   - 案件 validation tab：同一段渲染中既有「当前卡点」（已翻译）又有 `cases.validation.lastFailed`（未翻译）和 `1 件の阻断項目`（日文 hard-code）。
   - **建议**：建立 i18n CI lint 规则，扫描 `<template>` 中如 `cases\.\w+\.\w+` 形态的 key 直出，以及非当前 locale 字符串泄漏。

3. **日期格式三大变种共存（持续问题）**
   - 短日期：`2026/12/31` ✅（多数模块）
   - 短日期未补 0：`2026/5/4` ❌（validation tab）
   - 短日期 dash：`2026-12-31` ❌（dashboard 风险案件 / 案件详情期限 / 案件列表到期日）
   - **建议**：R33 上述「全局 DateText 组件 + lint」必须落地，否则每轮都有新位置漏出。

4. **deep-link 参数被路由层丢弃**
   - 资料中心 alert 跳转 settings `?tab=storageRoot`，但 settings 页忽略 query 仍打开默认 tab。
   - **建议**：对 settings、cases 详情这类有 sub-tab 的页面统一支持 `?tab=xxx` 入参，并加自动化测试。

---

## 1. R33 P1 缺陷详细

### 1.1 R33-D [P1]：`/api/reminders` 500 → 任务页与案件详情 reminders 完全瘫痪

**触发**：访问 `/tasks` 或访问任意案件详情。

**网络观察**：

```
GET /api/reminders?limit=200 → 500 Internal Server Error
GET /api/reminders?caseId=<uuid> → 500 Internal Server Error
```

**UI 影响**：
- `/tasks` 页面 4 个 chip 全 0：`待处理 0 / 今日到期 0 / 已逾期 0 / 提醒日志 0`
- 顶部错误条「任务与提醒加载失败，请稍后重试。」
- 案件详情顶部多 1 条 console error，但页面降级渲染未崩溃（部分 tab 可用）

**根因**：

```ts
// packages/server/src/modules/core/reminders/reminders.service.ts:138
const REMINDER_LIST_SELECT = `
  r.id, r.org_id, ...
  c.case_no as case_no,
  c.title as case_title,         ← cases 表中没有 title 列
  u.name as recipient_name
`;
```

`cases` 表 schema (`packages/server/src/infra/db/migrations/001_init.sql:40-52`) 只有 `case_no, case_type_code, status, owner_user_id, opened_at, due_at, metadata`，**无 `title` 也无 `name`**。case 的"显示名"在 `metadata.name` 或派生自 `case_no`，并不是直接的 column。

PostgreSQL 直接抛 `column c.title does not exist` → 500。

**测试遗漏**：
```ts
// packages/server/src/modules/core/reminders/reminders.service.test.ts:228
assert.ok(listCall.sql.includes("c.title as case_title"));
```
→ 仅做 SQL 文本字符串断言，未在真 PostgreSQL 上跑。

**修复建议**：
- 短期：把 `c.title` 改为 `c.metadata->>'name' as case_title` 或者 join 去掉 title，UI 只用 `case_no`。
- 长期：reminders.service.list 增加 integration test，使用本地 PostgreSQL fixture 真跑，避免 schema 漂移。
- 或：补一条 migration 在 cases 表上加 `name text` 列并 backfill。

**优先级**：P1（直接破坏「任务与提醒」核心模块；是 P0 范围内的"提醒/续签"承诺）。

---

## 2. R33 P2 缺陷详细

### 2.1 R33-A [P2]：案件 validation tab 同时漏出日文 hard-code + i18n key

**触发**：案件详情 → 「提交前检查」 tab → 点「重新检查」。

**snapshot（zh-CN）**：

```
StaticText "当前卡点"
button "重新检查"
StaticText "2026/5/4"
StaticText "必须先处理"
StaticText "当前卡点"
StaticText "1 件の阻断項目"        ← 日文 hard-code
StaticText "cases.validation.lastFailed"  ← i18n key 漏出
```

**snapshot（en-US）**：

```
StaticText "Current blocker"
button "Re-check"
StaticText "2026/5/4"
StaticText "MUST BE RESOLVED FIRST"
StaticText "Current blocker"
StaticText "1 件の阻断項目"        ← 仍是日文
StaticText "cases.validation.lastFailed"  ← 仍是 key
```

**问题**：
- `1 件の阻断項目` 看起来是日文模板字符串被当成默认值塞进了组件 props（组件 fallback 用了日文）
- `cases.validation.lastFailed` 是 i18n key 直出（zh/en/ja 三个 locale 都缺这个 key）

**修复建议**：
- 检查 `CaseValidationSupport.vue` / `CaseValidationTab.vue` 中调用 `lastFailed` 的位置，补齐 i18n key
- 把日文 hard-code 改为 `t('cases.validation.lastFailedSummary', { count })` 形式
- 三 locale 同步补 `cases.validation.lastFailed` 与 `cases.validation.lastFailedSummary` key

**测试位置**：admin/src/views/cases/components/CaseValidationSupport.vue + CaseValidationTab.vue + i18n/messages/cases/{zh-CN,en-US,ja-JP}.ts

---

### 2.2 R33-C [P2]：案件 tab badge 文本格式不一致

**触发**：案件详情，对比各 tab 的 badge：

```
tab "概览"
tab "提交前检查 卡点1"        ← 「卡点1」中间无空格
tab "资料清单 0/1"            ← 「0/1」前有空格
tab "任务"
tab "沟通记录 1"              ← 「1」前有空格
```

**问题**：`卡点1` vs `沟通记录 1` vs `资料清单 0/1` —— 同一行的 badge 显示风格不统一，前两者贴着主文本，后一个分开。

**修复建议**：
- 统一在主文本与 badge 之间留一个空格：`提交前检查 卡点 1`
- 或：badge 用独立 chip 视觉，不是 inline text（更通用）

---

## 3. R33 P3 缺陷详细

### 3.1 R33-B [P3]：案件 validation tab 日期 `2026/5/4` 未补齐 0

**触发**：案件详情 → 「提交前检查」 tab → 「当前卡点」时间。

**snapshot**：
```
StaticText "2026/5/4"           ← 单数
```

vs 同页其他模块：`2026/05/04 12:53` ✅

**修复建议**：使用 `yyyy/MM/dd` 而非 `y/M/d` 的 format string。

---

### 3.2 R33-E [P3]：settings 页 deep-link `?tab=storageRoot` 被忽略

**触发**：从资料中心顶部 alert 点「前往「系统设置」」 → URL 变为 `/#/settings?tab=storageRoot` → 但页面打开默认「分组管理」tab。

**问题**：R32-L 修复时增加了 query 形式的 deep-link，但 settings 页的 `useRoute().query.tab` 没有被 wire 进 active tab state。

**修复建议**：
- `SettingsView.vue` 在 setup 中读 `route.query.tab` 并初始化 `activeTab`
- 或：使用 sub-route 形式 `/#/settings/storage-root` 而非 query

---

### 3.3 已知遗留：日期 dash 格式仍存在（沿袭自 R32 但未列入 12 条）

**dashboard 风险案件**：

```
StaticText "期限：2026-12-31"   ← dash 格式
```

**对比**：仪表盘最近建案 `2026/05/02 20:36`（slash 格式）

**说明**：这是 R32 之外的遗留格式漂移，三语言下均一致显示 dash。建议合并到「日期格式漂移」专项一次性修。

---

## 4. 已确认 PASS 的关键流程（R32 后复测）

| 流程 | 验证 | 备注 |
|---|---|---|
| 登录 → 默认进入 dashboard | ✅ | LocalAdmin admin@local.test / Admin123! |
| Dashboard 「我的」/「全所」tab | ✅ | scope=mine / scope=all 都返回 200/304 |
| Dashboard 「本组」tab disabled + tooltip | ✅ R32-A 修复 |
| 客户列表 + 筛选 + 详情(5 个 tab) | ✅ |
| 客户详情 BMV 承接卡片 时间格式统一 | ✅ R32-F 修复 |
| 客户详情 沟通记录 时间格式统一 | ✅ R32-G 修复 |
| 案件列表 + 23 条记录 + filter | ✅ |
| 案件 CASE-202604-0006 fallback name | ✅ R32-I 修复 |
| 案件详情 validation tab 4 按钮 | ✅ R32-C 修复（仅文案有 R33-A 小问题） |
| 案件详情 欠款风险确认 modal | ✅ 完整表单 |
| 咨询线索 业务类型 含「经营管理」 | ✅ R32-B 修复（list + modal 都修） |
| 资料中心 KPI 改为「缺件 / 待登记」 | ✅ R32-J 修复 |
| 资料中心 onboarding alert 含 link | ✅ R32-L 部分修复 |
| 收费 案件列表 7 条 + 金额加总 | ✅ |
| 收费 回款流水记录 时间格式统一 | ✅ R32-E 修复 |
| 系统设置 资料根目录 时间格式统一 | ✅ R32-K 修复 |
| 三语言完整切换 (zh-CN/en-US/ja-JP) | ✅ |

---

## 5. 工程改进建议（编译式回灌）

1. **真 PostgreSQL 集成测试基线**
   - 现状：reminders.service.test.ts 用字符串断言，让 schema 不兼容的 SQL 通过
   - 建议：每个 service 至少 1 个 integration test 用 `pg` 真跑（容器化或本地 dev DB），重点覆盖 list / get / create

2. **i18n CI lint**
   - 检测 `<template>` 中如 `cases\.\w+\.\w+` 形态的 key 直出
   - 检测在 zh-CN snapshot 中出现日文 unicode 块（U+3040–U+30FF）的 hard-code 文本
   - 检测 i18n message 文件 zh-CN/en-US/ja-JP 三 key 集是否一致

3. **DateText 全局组件（R32 已建议，仍待落地）**
   - `<DateText :value :format="'short'|'datetime'|'iso'" />`
   - 全局禁用 `{{ raw.toISOString() }}`、`y/M/d` 等不规范用法
   - lint 规则在 R33 一并交付

4. **deep-link 子标签自动化测试**
   - settings、cases 详情、customers 详情都有 sub-tab，建议补一组 e2e/playwright case：访问 `?tab=xxx` 后断言对应 tab `aria-selected=true`

---

## 6. 下一步行动

按 P 等级分批：

1. **R33-D（P1）**：本周内闭环。reminders SQL 改为不依赖 `c.title`，并增加 integration test。
2. **R33-A（P2）**：补 `cases.validation.lastFailed` 三 locale + 替换日文 hard-code 字符串。
3. **R33-C（P2）**：tab badge 格式统一。
4. **R33-B/E（P3）**：日期 format 与 settings deep-link 在同一 PR 中处理。
5. **工程改进**：integration test 基线 + i18n lint，可以与 R33 闭环 PR 一起提。

---

**报告生成完毕。R32 的 12 条修复中 10 条全修、2 条部分修复；同时新发现 5 条缺陷（P1 × 1 / P2 × 2 / P3 × 2），其中 R33-D 是 R32-D 修复时引入的回归，建议 R33 优先攻坚。**
