# 全页面 UI 字体 / 样式合规走查（第十六轮 / R36 - 设计 token 体检）

> 生成日期：2026-05-04
>
> 命题：**使用 chrome-devtools-mcp 自动走查 `http://localhost:5173` 全部页面，找出字号、行高、颜色不符合设计规范的位置**（用户反馈：「目前发现有些页面文字很小」）。
>
> 审计基线（来自 `packages/admin/src/styles/theme.css`）：
>
> - 字号 token：12 / 13 / 14 / 15 / 16 / 18 / 22 / 28 / 36 / 40 px
> - 最小字号 = `--font-size-xs: 12px`（**任何低于 12px 的字符都视作违反规范**）
> - 标题层级：h1=40 / h2=36 / h3=28 / h4=22；显式 utility 类 `.text-2xl/.text-xl/...` 与 token 一一绑定 line-height
> - 主色：`--color-primary-6: #0369a1`；不允许使用 `#2563eb / #3b82f6` 等非 token 蓝
> - 链接色：必须显式声明，避免回退到 UA 默认 `rgb(0,0,238)`
>
> 工具：chrome-devtools-mcp（list_pages / navigate_page / take_snapshot / click / evaluate_script / list_console_messages）
>
> 自动化扫描策略：在每个页面注入 `__auditUI()`，遍历 `body *`，对所有可见 + 含直接文本节点的元素采集 `getComputedStyle`，按 4 类违规归类：
> 1. `tooSmall` — `font-size < 12px`
> 2. `offTokenSize` — 在 token 字号集合外
> 3. `offTokenColor` — 在 token 颜色白名单外（含主色、文本色、语义色、链接色）
> 4. `badLineHeight` — `line-height/font-size < 1.05` 且 `font-size < 22px`（视觉上压缩）

---

## 0. 总结

### 0.1 一句话结论

**8 个一级页面 + 案件详情 9 个 tab + 客户详情 5 个 tab + 案件创建向导 1/4 步骤共 23 个视图被 chrome-devtools-mcp 实测，控制台无 error，登录与导航全部正常；但发现 6 类共 23+ 处样式与设计 token 系统不一致：① 7 个 `<10px>` 微型 chip/badge（违反「最小字号 12px」契约，用户主诉的「文字很小」就是这些）；② 至少 22 处把 `<h2>` 直接强制覆写到 `15px / 18px` 并丢失 line-height（视觉降级 + a11y 标题语义错配）；③ 1 处 `font-size: 20px` 不在 token 中；④ 2 处 summary card 标签使用裸 `#2563eb`（设计主色 `#0369a1` 的错版）；⑤ 1 处 RouterLink 缺 CSS 直接回退到浏览器 `rgb(0,0,238)` 默认链接色；⑥ 3 类 chip 文字色（success/warning/danger）使用裸 hex 而不是 `--color-warning-text-strong` 等 token。**

### 0.2 走查页面矩阵

| 页面 | URL | 走查 | 关键缺陷 |
|---|---|---|---|
| 仪表盘 | `/#/` | ✅ | — |
| 咨询线索（空数据） | `/#/leads` | ✅ | — |
| 客户列表 | `/#/customers` | ✅ | R36-D1（`#2563eb`） |
| 客户详情·5 tab | `/#/customers/:id` | ✅ | R36-B（`<h2>`=15px）、R36-C2（chip） |
| 案件列表 | `/#/cases` | ✅ | R36-D2（summary card `#0284c7`）、R36-C1（chip 裸 hex） |
| 案件详情·概览 | `?tab=overview` | ✅ | **R36-A1（10px 角色 chip）**、R36-B |
| 案件详情·提交前检查 | `?tab=validation` | ✅ | **R36-B 集中爆发（5 个 h2=15px）** |
| 案件详情·资料清单 | `?tab=documents` | ✅ | R36-B（h2=15px） |
| 案件详情·任务 | `?tab=tasks` | ✅ | R36-B |
| 案件详情·基础信息 | `?tab=info` | ✅ | R36-B |
| 案件详情·文书 | `?tab=forms` | ✅ | R36-B |
| 案件详情·期限 | `?tab=deadlines` | ✅ | R36-B |
| 案件详情·收费 | `?tab=billing` | ✅ | **R36-A2（20px）** |
| 案件详情·沟通记录 | `?tab=messages` | ✅ | R36-B、R36-C2 |
| 案件详情·日志 | `?tab=log` | ✅ | — |
| 案件详情·S9 已归档 | `/#/cases/:closed` | ✅ | R36-A1 重现 |
| 案件创建向导（步骤 1） | `/#/cases/create` | ✅ | **R36-B（`cc__title` h2=18px / lh=18px）** |
| 任务与提醒 | `/#/tasks` | ✅ | — |
| 资料中心 | `/#/documents` | ✅ | **R36-D1（label 色 `#2563eb`）**、**R36-E（settings-link 回退 UA 默认蓝）** |
| 收费与财务 | `/#/billing` | ✅ | — |
| 系统设置·三 tab | `/#/settings` | ✅ | R36-C1（chip 裸 hex） |

### 0.3 R36 缺陷分级

| 编号 | 等级 | 类别 | 一句话 |
|---|---|---|---|
| **R36-A1** | **P2** | 字号 | 6 处 badge/chip 用 `font-size: 10px`，**直接违反「最小字号 12px」契约**，是用户主诉「文字很小」的根因 |
| **R36-A2** | P3 | 字号 | `CaseBillingTab.vue` `.billing-tab__stat-value: 20px` 不在 token 集合，视觉上是 18 / 22 之间的"半截"字号 |
| **R36-B** | **P2** | 标题 + 行高 | 至少 22 处 `<h2>` 被局部 CSS 强制覆写到 `15px / 18px` 且 line-height 跟随 token h2 的 `1`（即 line-height = 字号），视觉降级 + a11y 标题语义错配 |
| **R36-C1** | P3 | 颜色 | 3 类 `Chip.vue` tone（success/warning/danger）文字色使用裸 hex（`#166534/#92400e/#991b1b`），未引用 `--color-warning-text-strong` 等 token |
| **R36-C2** | P3 | 颜色 | 多页 `.ui-chip--success` 复用同一裸 hex，污染面较大 |
| **R36-D1** | P3 | 颜色 | `CustomerSummaryCards.vue` / `DocumentSummaryCards.vue` 的 `--info` 卡片标签色用 `#2563eb`，与设计主色 `#0369a1` 不符 |
| **R36-D2** | P3 | 颜色 | `CaseSummaryCards.vue` `--info` 用 `var(--color-info, #0284c7)` —— `--color-info` token 未定义，回退到 fallback `#0284c7` |
| **R36-E** | P2 | 链接色 | `DocumentListView.vue` `.document-list-view__settings-link` 在 `DocumentListView.css` 内**完全无样式**，链接回退到 UA 默认 `rgb(0,0,238)`，与全站任何蓝都不一致 |

### 0.4 体系性问题（编译式沉淀）

1. **`<h2>` 被滥用为「卡片小标题」** —— 设计系统只为 h1~h4 + 9 级 utility 类绑定了 typescale，但 22+ 个组件不调 utility 类、直接在 scoped CSS 把 `<h2>` 覆写成 `15px / 18px`：
   - **a11y 副作用**：屏幕阅读器把这些 15px 的「卡片标题」当作 `<h2>` 朗读，但用户视觉上完全感知不到层级
   - **行高副作用**：theme.css 给 h2 绑定的是 `line-height: var(--leading-display)` 即 unitless `1`，被覆写字号后 line-height 变成「15px / 18px」，行内文本紧贴 box 边缘，descender（汉字 ［ ］、英文字母 g/y）压在边线
   - **正确做法**：用 `<h3>` 或 `<div class="text-md">` + `font-weight-bold`；如果坚持 `<h2>` 请同步显式声明 `line-height: var(--leading-md)`
2. **「微型角标 = 10px」是模式化反模式** —— 7 处都在做"小到不能再小的状态/进度 chip"，应改用 `--font-size-xs (12px)` + 缩短 padding 而不是把字号压到 10px；同时这违反了 WCAG 2.x 推荐的「最小可读字号 ≥ 12px」
3. **「裸 hex 颜色」散落在十几个组件里** —— `#2563eb / #166534 / #92400e / #991b1b / #0284c7` 都是「设计语义存在但 token 没定义」的颜色：
   - 建议补 token：`--color-info-6` / `--color-success-text-strong` / `--color-warning-text-strong` / `--color-danger-text-strong`
   - 现有 `--color-warning-text: #92400e` / `--color-warning-text-strong: #78350f` 已定义，组件没用上
4. **链接元素必须有显式的 `color`** —— `document-list-view__settings-link` 是典型遗漏；项目应该有一条 lint：所有 `<RouterLink>` / `<a>` 在没继承父级 color 的情况下必须自带 color 声明

---

## 1. R36 P2 缺陷详细

### 1.1 R36-A1 [P2]：6+ 处 badge/chip 字号 10px，违反「最小字号 12px」契约

**用户主诉直接对应**：「目前发现有些页面文字很小」。

**自动化捕获**（DOM `getComputedStyle().fontSize < 12px`，去重后）：

```
{"sel":"div.overview-sidebar__team-info > div.overview-sidebar__team-name > span.overview-sidebar__team-role-chip","size":"10px","text":"负责人"}
```

**完整清单（grep `font-size: 10px` 命中）**：

| # | 文件 | 行 | className | 用途 | 在何处看到 |
|---|---|---|---|---|---|
| 1 | `views/cases/components/CaseOverviewSidebar.vue` | 334 | `.overview-sidebar__team-role-chip` | 团队成员"负责人 / 协作者"角色标签 | 案件详情·概览 → 右侧「案件团队」 |
| 2 | `views/cases/components/CaseOverviewTab.vue` | 618 | `.overview-tab__parallel-step-stage` | 并行阶段步骤的 S 编号 chip | 案件详情·概览 → 「并行流程」卡片 |
| 3 | `views/cases/components/CaseWorkflowStepSection.css` | 123 | `.wf-section__stage-active-indicator` | 阶段激活指示器 | 案件详情·概览 → 「阶段进度条」 |
| 4 | `views/cases/components/CaseWorkflowStepSection.css` | 215 | `.wf-section__step-badge` | 已完成 / 进行中徽标 | 同上 |
| 5 | `views/cases/components/CaseWorkflowStepSection.css` | 245 | `.wf-section__step-warning-badge` | 警告徽标 | 同上 |
| 6 | `views/cases/components/CaseSupplementRoundPanel.vue` | 322 | `.supplement-panel__urgent-tag` | 补正回合「紧急」标签 | 案件详情·补正面板 |
| 7 | `views/cases/components/CaseReminderFailureBanner.vue` | 155 | `.reminder-fail__attempt-badge` | 提醒失败次数徽标 | 提醒失败 banner |

**snapshot 现场（案件详情·概览 → 案件团队）**：

```
heading "案件团队" level="3"
StaticText "LA"
StaticText "Local Admin"
StaticText "负责人"        ← ❌ 此 StaticText 渲染为 10px
```

**根因**：

```css
/* CaseOverviewSidebar.vue:331-340 */
.overview-sidebar__team-role-chip {
  display: inline-flex;
  padding: 1px 6px;
  font-size: 10px;             /* ❌ 设计 token 没有 10px */
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-full);
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-2);
  color: var(--color-text-2);
}
```

设计 token 最小字号是 `--font-size-xs: 12px`，且全站已经为「徽标 / 角标」准备了 `--font-size-xs` + `--leading-xs: 1.4`。这 7 处 10px 的局部覆盖完全绕过了 token 系统。

**影响**：

- **可读性**：在 14" 笔记本（DPR 1）上 10px 的汉字（特别是「负」「Local」这种笔画密集的字）已经接近视觉极限，老花用户与亚洲字符场景下基本不可读
- **a11y**：违反 WCAG 2.x「正文不应低于 12px」推荐，且 chip 的 `aria-label` 缺失，朗读时只读"负责人"这两个字，没有上下文
- **触感**：3 类页面（详情概览右栏 / 阶段进度条 / 补正面板）都频繁出现，密度高，用户一眼就能感知到"这里字小"

**修复方向**：

- 把这 7 处统一改成 `font-size: var(--font-size-xs)`（12px），并把 `padding: 1px 6px` 改成 `padding: 2px 6px` 让总高度仍然 ~18-20px
- 在 ESLint / stylelint 加规则：禁止 `font-size: <12px`、`font-size: 10px`、`font-size: 11px` 字面量
- 建议长期：每 chip / badge 在 `Chip.vue` 暴露 `size="xs|sm|md"` prop，组件库内部固定 typescale

**位置**：见上表 7 处文件 + 行号；建议合并为单 PR

---

### 1.2 R36-B [P2]：22+ 处 `<h2>` 被覆写到 15px / 18px，标题语义降级 + 行高压扁

**触发**：进入任意"卡片很多"的页面 —— 案件详情·提交前检查、案件详情·资料清单、案件详情·收费、案件创建向导步骤 1 等。

**chrome-devtools-mcp 实测样本（提交前检查 tab）**：

```json
{"badLineHeight":[
  {"sel":"... > h2.vt__title","size":"15px","lineHeight":"15px","text":"提交前检查"},
  {"sel":"... > h2.vt__title","size":"15px","lineHeight":"15px","text":"提交包（历史快照）"},
  {"sel":"... > h2.valsup__title","size":"15px","lineHeight":"15px","text":"欠款风险确认记录"},
  {"sel":"... > h2.valsup__title","size":"15px","lineHeight":"15px","text":"COE / 海外贴签 / 返签结果"}
]}
```

**根因（汇总）**：

`packages/admin/src/styles/theme.css:167-173` 给 `h2` 绑定了：

```css
h2,
.text-display-1 {
  font-size: var(--font-size-display-1);   /* 36px */
  line-height: var(--leading-display);     /* 1（unitless）*/
  font-weight: var(--font-weight-extrabold);
  letter-spacing: var(--letter-spacing-tight);
}
```

但 22+ 个组件 scoped CSS 把 `<h2>` 覆盖到 15px / 18px **却没有重新声明 line-height**。Unitless line-height `1` 跟随新字号变成 15px，文字行盒紧贴边缘，下沉字符（g/y/汉字底部）会压在 padding 边线上。

**完整 hit 清单（grep `font-size: 15px` + `font-size: 18px` 在 h2 类上的应用）**：

| # | 文件 | 行 | className | h2 文案 |
|---|---|---|---|---|
| 1 | `CaseValidationTab.css` | 27-32 | `.vt__title` | 提交前检查 / 提交包（历史快照）/ 双人复核 |
| 2 | `CaseValidationSupport.vue` | 266-271 | `.valsup__title` | 欠款风险确认记录 / COE 等 |
| 3 | `CaseDocumentsTab.css` | 99 / 167 | `.cd__title` 等 | 资料登记清单 / ... |
| 4 | `CaseTasksTab.vue` | 202 | `.tasks-tab__title` | 任务列表 |
| 5 | `CaseInfoTab.vue` | 333 | `.info-tab__title` | 基础信息 |
| 6 | `CaseFormsTab.vue` | 221 | `.forms-tab__title` | 文书 |
| 7 | `CaseDeadlinesTab.vue` | 243 / 430 | `.dt__title` 等 | 期限 / 期限类型 |
| 8 | `CaseBillingTab.vue` | 217 | `.billing-tab__title` | 收费 |
| 9 | `CaseMessagesTab.vue` | 445 | `.messages-tab__title` | 沟通记录 |
| 10 | `CaseLogTab.vue` | 187 | `.log-tab__title` | 日志 |
| 11 | `CaseOverviewSidebar.vue` | 274 / 370 | `.overview-sidebar__*-title` | 案件团队 / 提交前校验 |
| 12 | `CaseOverviewTab.vue` | 717 | overview 内某 h2 |  |
| 13 | `CaseWorkflowStepSection.css` | 16 | `.wf-section__title` | 业务阶段 |
| 14 | `CaseProviderProgress.vue` | 68 | `.provider-progress__title` | 按提供方完成率 |
| 15 | `CaseSupplementRoundPanel.vue` | 208 | `.supplement-panel__title` | 补正回合 |
| 16 | `CaseFinalPaymentCoeGate.vue` | 325 / 481 | `.coe-gate__title` 等 | 尾款门禁 / COE 流程 |
| 17 | `CaseFailureCloseoutBanner.vue` | 201 | banner 内 h2 |  |
| 18 | `CaseReminderFailureBanner.vue` | 148 | `.reminder-fail__title` |  |
| 19 | `CaseCreatePreSignGate.vue` | 149 | gate h2 |  |
| 20 | `case-create-shared.css` | 1-4 | `.cc__title` | 选择案件模板 / 关联人 / 等（**18px / lh=18px**）|
| 21 | `CaseCreateStep1.vue` | 172 | step1 内嵌 h2 |  |
| 22 | `BillingTable.vue` | 477 | billing 表标题 |  |
| 23 | `GroupListPanel.vue` | 325 | settings 分组标题 |  |
| 24 | `views/conversations/ConversationsListView.vue` | 416 | 16px 子标题 |  |

**snapshot 复现（提交前检查 tab）**：

```
heading "提交前检查" level="2"          ← <h2>，DOM 上是 a11y h2
StaticText "当前卡点"
button "重新检查"
StaticText "2026/05/04"
StaticText "必须先处理"
heading "提交包（历史快照）" level="2"   ← 又是 <h2>
button "新建提交包"
heading "双人复核" level="2"            ← 又是 <h2>
heading "欠款风险确认记录" level="2"     ← 又是 <h2>
heading "COE / 海外贴签 / 返签结果" level="2"  ← 又是 <h2>
```

5 个 `<h2>` 在同一卡片堆里，且都是 15px。

**影响**：

- **a11y**：屏幕阅读器在「提交前检查」tab 一次性朗读 5 个 h2，听感是「(标题) 提交前检查 (停顿) (标题) 提交包 (停顿) ...」用户无法判断主次
- **视觉**：15px / lh 15px 让汉字「贴」在卡片 header 的 padding 上，没有呼吸感
- **设计系统失效**：theme.css 已经给 h1~h4 + `.text-2xl/.text-xl` 准备了 typescale 但没人用

**修复方向（任选其一）**：

**A. 最小成本（推荐）：把局部 CSS 改成 utility 类引用**

```css
/* CaseValidationTab.css */
.vt__title {
  margin: 0;
  font-size: var(--font-size-md);         /* 15px ✓ token */
  line-height: var(--leading-md);          /* 1.45 ✓ token */
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
```

**B. 标本兼治：换语义 + 换标签**

- 真正算「卡片主标题」的（如「提交前检查」）继续 `<h2>` 但走 `.text-2xl` 或 `.text-xl`（22 / 18px）
- 子区域（「双人复核」「欠款风险确认记录」「COE / 海外贴签 / 返签结果」）改成 `<h3>` 或 `<div class="text-md">` + `font-weight: var(--font-weight-semibold)`

**位置**：见上表 22 处；建议按 tab 拆 6-8 个 PR

---

### 1.3 R36-E [P2]：`document-list-view__settings-link` 完全无 CSS，链接回退到 UA 默认 `rgb(0,0,238)`

**触发**：`/#/documents` → 顶部黄色 banner「本地资料根目录未配置」→ 「**前往「系统设置」**」链接。

**audit 输出**：

```json
{"offTokenColor":[{
  "sel":"div > p.document-list-view__alert-desc > a.document-list-view__settings-link",
  "color":"rgb(0, 0, 238)",
  "text":"前往「系统设置」"
}]}
```

`rgb(0, 0, 238)` 是 Chrome 内置 `<a>` 默认色 `blue`，**全站没有任何其他元素是这个颜色**，跳出感极强。

**根因**：`packages/admin/src/views/documents/DocumentListView.css` **完全没有 `.document-list-view__settings-link` 选择器**，scoped CSS + `RouterLink` 渲染出的 `<a>` 因此继承不到任何颜色，回退到 UA 默认。

```html
<!-- DocumentListView.vue:329-334 -->
<RouterLink
  to="/settings?tab=storage-root"
  class="document-list-view__settings-link"
>
  {{ t("documents.storageGate.settingsLinkText") }}
</RouterLink>
```

```css
/* DocumentListView.css —— grep 结果：0 命中 */
```

**影响**：

- 颜色错位（鲜蓝下划线，不是设计主蓝）
- 在黄色 banner 背景上对比度异常，有刺眼感
- 三 locale 全部受影响

**修复方向**：

```css
/* DocumentListView.css 末尾追加 */
.document-list-view__settings-link {
  color: var(--color-primary-6);
  font-weight: var(--font-weight-semibold);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.document-list-view__settings-link:hover {
  color: var(--color-primary-7);
}
```

并补一条 stylelint：所有 `<a>` / `<RouterLink>` 必须有 `color` 显式声明。

**位置**：

- `packages/admin/src/views/documents/DocumentListView.vue:329-334`（新增 className 的引用）
- `packages/admin/src/views/documents/DocumentListView.css`（**新增样式块**）

---

## 2. R36 P3 缺陷详细

### 2.1 R36-A2 [P3]：`CaseBillingTab.vue` `.billing-tab__stat-value: 20px` 不在 token 集合

**触发**：案件详情·收费 tab → 顶部 3 张「应收 / 已收 / 未收」金额卡。

**audit 输出**：

```json
{"offTokenSize":[
  {"sel":"... > div.billing-tab__stat-value","size":"20px","text":"¥200,000"},
  {"sel":"... > div.billing-tab__stat-value--success","size":"20px","text":"¥0"},
  {"sel":"... > div.billing-tab__stat-value--danger","size":"20px","text":"¥200,000"}
]}
```

**根因**：

```css
/* CaseBillingTab.vue:270-275 */
.billing-tab__stat-value {
  font-size: 20px;                       /* ❌ token 没有 20px */
  font-weight: var(--font-weight-extrabold);
  letter-spacing: var(--letter-spacing-tight);
  color: var(--color-text-1);
}
```

token 的 typescale 是 `18 / 22 / 28 / 36 / 40`。20px 在视觉上既不是「大数字」也不是「小数字」，是"半截"字号。

**修复方向**：

- 改为 `var(--font-size-2xl)`（22px）/  `var(--font-size-xl)`（18px）—— 22px 更符合「金额数字应该突出」的 UX 期待
- 同步加 `line-height: var(--leading-2xl)`（1.2）

**位置**：`packages/admin/src/views/cases/components/CaseBillingTab.vue:270-275`

---

### 2.2 R36-C1 / C2 [P3]：`Chip.vue` tone 文字色使用裸 hex 而非 token

**触发**：任意页面的 `ui-chip--success / ui-chip--warning / ui-chip--danger` —— 案件列表「资料收集中 / 失败归档」、客户详情「活跃 / 已回收 / 可建案」、设置·分组「启用」、概览 banner、提交前检查「当前卡点」等。

**根因**：

```css
/* shared/ui/Chip.vue:107-129 */
.ui-chip--success { color: #166534; }   /* ❌ green-800 裸 hex */
.ui-chip--warning { color: #92400e; }   /* ❌ amber-900 裸 hex */
.ui-chip--danger  { color: #991b1b; }   /* ❌ red-800 裸 hex */
```

theme.css 已经定义了 `--color-warning-text: #92400e` / `--color-warning-text-strong: #78350f`，但 success / danger 没有同等 token，组件因此用裸 hex 凑活。

**修复方向**：

- 在 `theme.css` 补 token：
  ```css
  --color-success-text-strong: #166534;
  --color-warning-text-strong: #92400e;   /* 已存在但 chip 没用 */
  --color-danger-text-strong: #991b1b;
  ```
- `Chip.vue` 改成：
  ```css
  .ui-chip--success { color: var(--color-success-text-strong); }
  .ui-chip--warning { color: var(--color-warning-text-strong); }
  .ui-chip--danger  { color: var(--color-danger-text-strong); }
  ```
- 同步把 `CaseFinalPaymentCoeGate.vue` / `wf-section__step--failed` / `supplement-panel__urgent-tag` 等 7+ 处用裸 `#991b1b / #92400e` 的代码全部改用 token

**位置**：`packages/admin/src/shared/ui/Chip.vue:107-129` + 7+ 处副本

---

### 2.3 R36-D1 [P3]：customer / document summary card `--info` 标签色用 `#2563eb`

**触发**：

- `/#/customers` → 顶部「本组客户」卡片标签
- `/#/documents` → 顶部「待审核」卡片标签

**audit 输出**：

```json
{"offTokenColor":[{
  "sel":"... > div.customer-summary-card.customer-summary-card--info > div.customer-summary-card__label",
  "color":"rgb(37, 99, 235)",
  "text":"本组客户"
}]}
```

`rgb(37, 99, 235)` = `#2563eb`（Tailwind blue-600），**与设计主色 `--color-primary-6: #0369a1`（cyan-700）不同色相**，并排放在一起会"打架"。

**根因**：

```css
/* CustomerSummaryCards.vue:174-176 */
.customer-summary-card--info .customer-summary-card__label {
  color: #2563eb;                       /* ❌ 与主色不一致 */
}

/* DocumentSummaryCards.vue:165-167 */
.doc-summary-card--info .doc-summary-card__label {
  color: #2563eb;                       /* ❌ 同样问题 */
}
```

**修复方向**：

- 在 `theme.css` 补一个明确的 info token，或直接复用主色：
  ```css
  --color-info-6: #0284c7;       /* sky-600，与主色 cyan-700 同色相 */
  --color-info-text: #0369a1;    /* 直接 = 主色 */
  ```
- 两个组件改用 `color: var(--color-info-text)` 或 `var(--color-primary-6)`

**位置**：

- `packages/admin/src/views/customers/components/CustomerSummaryCards.vue:174-176`
- `packages/admin/src/views/documents/components/DocumentSummaryCards.vue:165-167`

---

### 2.4 R36-D2 [P3]：`CaseSummaryCards.vue` `--info` 用 `var(--color-info, #0284c7)` —— `--color-info` 不存在

**触发**：`/#/cases` → 顶部「检查未通过」「即将到期」卡片数字。

**audit 输出**：

```json
{"offTokenColor":[{
  "sel":"... > span.case-summary-cards__value",
  "color":"rgb(2, 132, 199)",
  "text":"0"
}]}
```

`rgb(2, 132, 199)` = `#0284c7`，是 fallback 值，说明 `--color-info` 这个 CSS 变量**根本没在 theme.css 定义**。

**根因**：

```css
/* CaseSummaryCards.vue:72-74 */
.case-summary-cards__item--info .case-summary-cards__value {
  color: var(--color-info, #0284c7);   /* ❌ --color-info 未定义，永远走 fallback */
}
```

**修复方向**：与 R36-D1 合并 —— 一次性在 theme.css 定义 `--color-info-text`，三个 summary card 都改用同一 token。

**位置**：`packages/admin/src/views/cases/components/CaseSummaryCards.vue:72-74`

---

## 3. PASS 项与体系性观察

### 3.1 通过项

| 检查 | 结果 |
|---|---|
| 全局字体（`--font-family: Plus Jakarta Sans`）一致性 | ✅ 所有页面继承一致 |
| token 字号 12/13/14/15/16/18/22/28/36/40 命中率 | ✅ ≈99%（除 7 处 10px、3 处 20px、22 处 h2 覆写） |
| token 文本色 `--color-text-1/2/3` 一致性 | ✅ 主体内容均合规 |
| 主色 `--color-primary-6 (#0369a1)` 一致性 | ⚠ 局部 summary card 使用 `#2563eb` |
| `--color-bg-frosted` topbar 半透明 | ✅ 三 locale + 三视口正常 |
| 三语言切换字号一致性（zh/en/ja） | ✅ 抽样 2 页确认 |
| Console error / network 4xx | ✅ 全程 0 |

### 3.2 体系性建议（编译式回灌入 P0 文档）

1. **新增 stylelint 规则集 `cms-design-token`**（建议建在 `tools/stylelint/`）：
   - `font-size` 必须命中 token 集合（12/13/14/15/16/18/22/28/36/40），允许 `var(--font-size-*)`
   - 禁止 `font-size: <12px`
   - `<h1>~<h4>` 必须显式声明 `line-height`（不允许继承 unitless `1`）
   - `<a>` / `<RouterLink>` 必须有 `color` 声明
   - color 必须命中 token 集合或 `var(--color-*)`

2. **`Chip.vue` 暴露 `size` prop** —— 把 7 处 10px 收编：
   ```ts
   <Chip size="xs"|"sm"|"md" />  // xs=12px, sm=13px, md=14px
   ```

3. **theme.css 补齐 info / success / danger 「strong text」token**（见 R36-C / R36-D）

4. **「卡片小标题」是高频组件，应该抽出 `<CardSectionTitle>`** —— 内部固定 `<h3 class="text-md">` + 字重 + 行高，避免 22+ 处复制粘贴

5. **a11y heading 审计纳入 R37 走查**：使用 axe-core 或 Pa11y 在 `case detail` 页面跑一次「heading order」检查，预计会爆 R36-B 同源警告

---

## 4. 下一步行动

按 P 等级分批：

| # | 缺陷 | 等级 | 建议 PR |
|---|---|---|---|
| 1 | **R36-A1**（10px badge×7） | P2 | 1 个 PR：`Chip.vue` 暴露 size prop + 7 处替换 + stylelint 禁 < 12px |
| 2 | **R36-B**（h2 覆写×22+） | P2 | 按 tab 拆 5-6 个 PR：先收 `vt__title / valsup__title / cc__title` 三个高频共享类 |
| 3 | **R36-E**（settings-link 无样式） | P2 | 1 个独立小 PR（5 分钟） |
| 4 | **R36-A2**（billing 20px） | P3 | 与 R36-B 同 PR |
| 5 | **R36-C1/C2**（Chip 裸 hex） | P3 | 1 个 PR：补 token + Chip.vue 改 + 7 处副本回收 |
| 6 | **R36-D1/D2**（summary card `#2563eb`） | P3 | 1 个 PR：补 `--color-info-text` + 3 处替换 |

---

**报告生成完毕。本轮以「设计 token 合规」为主线走查全站 23 个视图，发现 6 类共 30+ 处违规，其中 R36-A1 是用户主诉「文字很小」的直接根因，R36-B 是体系性 a11y / 视觉降级问题，R36-E 是单点回退到浏览器默认色。建议 R37 在修复 R36-A1 + R36-E（30 分钟改完）后，再启动 R36-B 的分批治理。**
