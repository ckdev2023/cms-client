# 系统设置页现有原型盘点

> 盘点对象：[packages/prototype/admin/settings.html](../settings.html)（448 行，单文件原型）
>
> 目的：为后续拆分（SPLIT-ARCHITECTURE.md）提供精确的区块定位、交互清单、样式覆盖分析、链接审计与共享候选列表。

---

## 1. 行号区块总览

| 行号范围 | 关注点 | 说明 |
|----------|--------|------|
| 1–7 | `<head>` 基础 | DOCTYPE、meta、title（`Gyosei OS - 系统设置 (Settings)`）、Tailwind CDN |
| 8–144 | 内联 `<style>` | 设计 Token + 壳层布局 + 公共组件 + 设置页专有样式（`.setting-item`） |
| 146–147 | Skip Link | `<a href="#main">` |
| 149–237 | 移动端导航 HTML | 侧滑抽屉，包含完整导航项列表 |
| 239–321 | 桌面侧边导航 HTML | `<aside class="side-nav">`，包含完整导航项列表 |
| 323–345 | 顶部工具栏 HTML | 搜索框 + "新建咨询" + "新建案件" 按钮 + 用户头像 |
| 347–351 | **页面标题区** | `<h1>系统设置</h1>` + 副标题"管理您的账户和事务所偏好设置。" |
| 353–375 | **设置子导航侧边栏** | 5 个入口：个人资料、事务所信息、成员与权限、通知设置、审计日志 |
| 377–417 | **个人资料表单** | 头像、姓名、邮箱、系统语言、保存按钮 |
| 423–443 | 内联 `<script>` | 移动端导航开关（IIFE） |

---

## 2. 内联样式拆解（L8–144）

### 2.1 设计 Token（L11–37）

声明于 `:root`，与 `shared/styles/tokens.css` 高度重复。

| 变量 | settings.html 值 | shared/tokens.css | 差异 |
|------|-----------------|-------------------|------|
| `--bg` | `#f8fafc` | `#f8fafc` | 一致 |
| `--surface` | `#ffffff` | `#ffffff` | 一致 |
| `--surface-2` | `#f1f5f9` | `#f1f5f9` | 一致 |
| `--border` | `#e2e8f0` | `#e2e8f0` | 一致 |
| `--text` | `#0f172a` | `#0f172a` | 一致 |
| `--muted` | `#475569` | `#475569` | 一致 |
| `--muted-2` | `#64748b` | `#64748b` | 一致 |
| `--primary` | `#0369a1` | `#0369a1` | 一致 |
| `--primary-hover` | `#075985` | `#075985` | 一致 |
| `--shadow` | 双层阴影 | 双层阴影 | 一致 |
| `--shadow-hover` | 双层阴影 | 双层阴影 | **微差**：settings 用 `0.10`，shared 用 `0.12` |
| `--radius` | `14px` | `14px` | 一致 |
| `--apple-blue` ~ `--apple-shadow-hover` | 别名映射 | 别名映射 | 一致 |
| `--success` | **缺失** | `#16a34a` | settings.html 未声明 |
| `--warning` | **缺失** | `#f59e0b` | settings.html 未声明 |
| `--danger` | **缺失** | `#dc2626` | settings.html 未声明 |

**结论**：tokens 完全可用 `shared/styles/tokens.css` 替代，无冲突。`--shadow-hover` 微差可忽略（shared 为权威）。

### 2.2 壳层布局样式（L39–133）

| 类名 | settings.html 行号 | shared 文件 | 差异 |
|------|-------------------|-------------|------|
| `body` 字体/基础 | L39–54 | `tokens.css` L34–49 | 一致 |
| `.display-font` | L56 | `tokens.css` L60–63 | 一致（shared 多 `font-family: inherit`） |
| `.text-hero` | L58 | — | **settings 专有**，shared 无此类 |
| `.skip-link` | L60–72 | `shell.css` L1–15 | 一致 |
| `focus-visible` | L74–77 | `shell.css` L17–20 | 一致 |
| `.app-shell` | L79–82 | `shell.css` L22–31 | 一致 |
| `.side-nav` / `.side-nav-inner` | L84–85 | `shell.css` L33–45 | 一致 |
| `.brand` / `.brand-title` | L86–87 | `shell.css` L46–57 | 一致 |
| `.nav-group-title` | L89 | `shell.css` L59–66 | 一致 |
| `.nav-item` + hover + `aria-current` + svg | L90–93 | `shell.css` L67–92 | 一致（shared 拆为多行） |
| `.topbar` / `.topbar-inner` | L95–96 | `shell.css` L94–110 | 一致 |
| `.mobile-nav` 全家族 | L125–129 | `shell.css` L112–139 | 一致 |
| `prefers-reduced-motion` | L131–133 | `tokens.css` L65–71 | 一致 |

**结论**：壳层样式完全可用 `shared/styles/shell.css` 替代。

### 2.3 公共组件样式（L98–123）

| 类名 | settings.html 行号 | shared 文件 | 差异 |
|------|-------------------|-------------|------|
| `.icon-btn` | L98–100 | `components.css` L63–85 | 一致 |
| `.search` + input | L102–104 | `components.css` L114–144 | 一致 |
| `.btn-primary` | L106–108 | `components.css` L3–20 | 微差：settings 硬编码 `border-radius: 14px`，shared 用 `var(--radius)` |
| `.btn-pill` | L110–112 | `components.css` L44–61 | 一致 |
| `.chip` | L114 | `components.css` L89–101 | shared 多 `white-space: nowrap; line-height: 1.1` |
| `.apple-card` | L116–123 | `components.css` L105–110 | **差异**：settings 有 `:hover` 效果（shadow + translateY），shared 无 |

**`.apple-card` 差异明细**：

| 属性 | settings.html | shared/components.css |
|------|-------------|----------------------|
| `:hover box-shadow` | `var(--shadow-hover)` | 无 hover 效果 |
| `:hover transform` | `translateY(-2px)` | 无 hover 效果 |
| `transition` | `box-shadow 160ms, transform 160ms` | 无 |

**结论**：大部分公共组件可用 shared 替代。`.apple-card` hover 效果属于 settings 页面自有，但对系统设置的新 P0 设计不一定需要保留。

### 2.4 设置页专有样式（L135–143）

以下样式**不存在于 shared/**，属于设置模块专有：

| 类名 | 行号 | 说明 | 共享候选？ |
|------|------|------|-----------|
| `.text-hero` | L58 | 40px 超大标题，`font-weight: 900` | ⚠️ 潜在共享（仪表盘、其他 hero 区域也可能需要），但 P0 系统设置不需要此级别标题 |
| `.setting-item` | L135–143 | flex 布局 + 分割线 + 最后一项无底线 | 模块专有，但 P0 新规格不使用此结构 |

---

## 3. HTML 区块详情

### 3.1 移动端导航（L149–237）

与 `shared/shell/mobile-nav.html` 内容**结构一致**，但存在以下路径差异：

| 导航项 | settings.html 中的 href | shared 中的 href |
|--------|------------------------|-----------------|
| 客户 | `customers.html` | `customers/index.html` |
| 设置 | `settings.html`（有 `aria-current="page"`） | `settings.html`（无 `aria-current`） |
| 收费与财务 | `billing.html` | `billing/index.html` |
| 资料中心 | `documents/index.html` | `documents/index.html`（一致） |

### 3.2 桌面侧边导航（L239–321）

与 `shared/shell/side-nav.html` 内容**结构一致**，路径差异同上。

**文案差异**：导航项文案为"设置"，P0 规格页面标题为"系统设置"。shared shell 中也写作"设置"。需在拆分时统一口径。

### 3.3 顶部工具栏（L323–345）

与 `shared/shell/topbar.html` **结构一致**，差异：

| 元素 | settings.html | shared/topbar.html |
|------|--------------|-------------------|
| "新建案件" href | `case-create.html` | `case/create.html` |

**路径问题**：`case-create.html` 是旧路径，shared 已更新为 `case/create.html`。

### 3.4 页面标题区（L347–351）

```
┌─────────────────────────────────────────────────────┐
│ 系统设置                                             │
│ 管理您的账户和事务所偏好设置。                          │
└─────────────────────────────────────────────────────┘
```

- `<h1>` 使用 `text-hero` 类（40px 超大标题）
- 副标题：`text-[17px] text-[#86868b] display-font`（使用硬编码灰色而非 token）
- 副标题文案"管理您的账户和事务所偏好设置"偏向个人资料语义，与 P0 规格"管理事务所级基础配置"的定位**不一致**
- **无任何动作按钮**

### 3.5 设置子导航侧边栏（L353–375）

5 个入口，全部使用 `href="#"`（非功能性导航）：

| # | 菜单项 | 活跃态 | P0 是否保留？ |
|---|--------|--------|-------------|
| 1 | 个人资料 | **当前选中**（`bg-gray-100`） | ❌ P0 系统设置不含个人资料 |
| 2 | 事务所信息 | 未选中 | ❌ P0 不含事务所基础信息管理 |
| 3 | 成员与权限 | 未选中 | ❌ P0 不含高级权限管理 |
| 4 | 通知设置 | 未选中 | ❌ P0 不含通知设置 |
| 5 | 审计日志 | 未选中 | ❌ P0 不含审计日志浏览 |

**结论**：现有子导航 5 项**全部不在 P0 范围内**。P0 子导航应替换为：Group 管理、可见性配置、本地资料根目录配置。

- 使用 `.apple-card p-4` 容器 + `<ul>` 列表
- 选中态使用 Tailwind `bg-gray-100`，未选中态使用 `text-[#86868b]` 硬编码色值
- **无 JS 行为**：点击不切换面板

### 3.6 个人资料表单（L377–417）

```
┌──────────────────────────────────┐
│ 个人资料                          │
│                                  │
│  [AD 头像]  [更改头像]             │
│                                  │
│  姓名:  [Admin         ]         │
│  邮箱:  [admin@gyosei.com]       │
│  语言:  [中文 (简体) ▾]           │
│                                  │
│                    [保存更改]      │
└──────────────────────────────────┘
```

- 使用 `.apple-card p-8` 容器
- 头像区：20×20 圆形 `bg-blue-100`、字母缩写 "AD"、"更改头像" `.btn-pill`
- 3 个表单字段：姓名（text）、邮箱（email）、系统语言（select）
- 表单输入使用 Tailwind 原生类 `border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50`，**未使用** shared `.apple-input` / `.apple-label`
- "保存更改" 使用 `.btn-primary`
- **整个表单与 P0 系统设置规格无关**——P0 不涉及个人资料管理

---

## 4. 交互行为清单

| # | 交互 | 实现方式 | 行号 | 功能状态 |
|---|------|---------|------|---------|
| 1 | 移动端导航开关 | IIFE 监听 `data-nav-open` / `data-nav-close` + Escape | L423–443 | ✅ 功能正常 |
| 2 | 子导航切换 | `href="#"` 链接 | L357–373 | ❌ 无 JS，点击不切换面板 |
| 3 | 更改头像按钮 | `.btn-pill`，无事件绑定 | L387 | ❌ 无 JS，点击不生效 |
| 4 | 保存更改按钮 | `.btn-primary`，无事件绑定 | L414 | ❌ 无 JS，点击不生效 |
| 5 | 全局搜索 | 无 JS（未引入 `navigate.js`） | L332–337 | ❌ 无搜索功能 |
| 6 | Topbar "新建咨询" | `onclick → window.location.href` | L340 | ✅ 导航到 leads-messages.html |
| 7 | Topbar "新建案件" | `onclick → window.location.href` | L341 | ✅ 导航到 case-create.html（旧路径） |

**总结**：仅移动端导航和 topbar 按钮有实际交互。页面核心功能（子导航切换、表单提交、头像上传）全部缺失。且全部现有内容为个人资料语义，**P0 系统设置的所有核心功能（Group 管理、可见性配置、根目录配置）完全不存在**。

---

## 5. 脚本依赖

| 脚本 | 来源 | 引入方式 | 说明 |
|------|------|---------|------|
| 移动端导航 IIFE | 内联 `<script>` L423–443 | 直接嵌入 | 与 `shared/scripts/mobile-nav.js` 完全一致 |
| `shared/scripts/navigate.js` | **未引入** | — | 全局搜索弹窗、`⌘K` 快捷键不可用 |

---

## 6. 出站链接审计（settings.html → 其他页面）

### 6.1 导航链接（侧边栏 + 移动端各出现一次）

| 目标页面 | settings.html 中的 href | shared 中的 href | 需修复？ |
|----------|------------------------|-----------------|---------|
| 仪表盘 | `admin-prototype.html` | `admin-prototype.html` | 无需（视 dashboard 迁移情况） |
| 咨询与会话 | `leads-messages.html` | `leads-messages.html` | 无需 |
| 客户 | `customers.html` | `customers/index.html` | **是** |
| 案件 | `cases-list.html` | `cases-list.html` | 无需 |
| 任务与提醒 | `tasks.html` | `tasks.html` | 无需 |
| 资料中心 | `documents/index.html` | `documents/index.html` | 无需 |
| 文书中心 | `forms.html` | `forms.html` | 无需 |
| 收费与财务 | `billing.html` | `billing/index.html` | **是** |
| 报表 | `reports.html` | `reports.html` | 无需 |
| 设置 | `settings.html`（self，`aria-current="page"`） | `settings.html` | 迁移后需更新为 `settings/index.html` |
| 客户门户 | `../src/index.html` | `../src/index.html` | 无需 |

### 6.2 内容链接

settings.html 内容区**无任何出站内容链接**（子导航均为 `href="#"`）。

### 6.3 迁移后路径影响

当 `settings.html` 迁移为 `settings/index.html` 后，使用 shared shell 的模块无需逐个修改导航链接，仅 shared 的 `side-nav.html` / `mobile-nav.html` 需要将 `settings.html` 更新为 `settings/index.html`。仍在使用内联导航的旧页面需要逐个更新。

---

## 7. 入站链接审计（其他页面 → settings.html）

### 7.1 通过 shared shell 引用

| 来源 | 链接路径 |
|------|---------|
| `shared/shell/side-nav.html` | `settings.html` |
| `shared/shell/mobile-nav.html` | `settings.html` |

迁移后只需更新这两个共享片段，所有使用 shared shell 的页面自动生效。

### 7.2 通过内联导航引用

| 来源页面 | 链接路径 |
|----------|---------|
| `admin-prototype.html` | `settings.html`（内联导航） |
| `dashboard/index.html` | 通过 shared shell（已覆盖） |
| `leads-messages.html` | `settings.html`（内联导航） |
| `leads-message/index.html` | 通过 shared shell（已覆盖） |
| `leads-message/detail.html` | 通过 shared shell（已覆盖） |
| `cases-list.html` | `settings.html`（内联导航） |
| `case-detail.html` | `settings.html`（内联导航） |
| `case-create.html` | `settings.html`（内联导航） |
| `case/index.html` | 通过 shared shell（已覆盖） |
| `case/detail.html` | 通过 shared shell（已覆盖） |
| `case/create.html` | 通过 shared shell（已覆盖） |
| `customers/index.html` | 通过 shared shell（已覆盖） |
| `customers/detail.html` | 通过 shared shell（已覆盖） |
| `tasks.html` | `settings.html`（内联导航） |
| `tasks/index.html` | 通过 shared shell（已覆盖） |
| `documents.html` | `settings.html`（内联导航） |
| `documents/index.html` | 通过 shared shell（已覆盖） |
| `forms.html` | `settings.html`（内联导航） |
| `billing.html` | `settings.html`（内联导航） |
| `billing/index.html` | 通过 shared shell（已覆盖） |
| `reports.html` | `settings.html`（内联导航） |

> **迁移影响**：已迁移到 shared shell 的页面只需更新 `shared/shell/side-nav.html` 和 `shared/shell/mobile-nav.html` 即可。仍在使用内联导航的旧页面（`admin-prototype.html`、`leads-messages.html`、`cases-list.html`、`case-detail.html`、`case-create.html`、`tasks.html`、`documents.html`、`forms.html`、`billing.html`、`reports.html`）需要逐个更新。本轮仅记录，不立即修复旧页面中的链接。

---

## 8. 共享候选汇总

### 8.1 可直接替换为 shared 的内容

| 当前内容 | 目标共享文件 | 置信度 |
|----------|------------|--------|
| `:root` CSS Token（L11–37） | `shared/styles/tokens.css` | ✅ 无冲突 |
| `body` 字体 + 基础样式（L39–54） | `shared/styles/tokens.css` | ✅ 无冲突 |
| `.display-font`（L56） | `shared/styles/tokens.css` | ✅ 无冲突 |
| `prefers-reduced-motion`（L131–133） | `shared/styles/tokens.css` | ✅ 无冲突 |
| `.skip-link` + `focus-visible`（L60–77） | `shared/styles/shell.css` | ✅ 无冲突 |
| `.app-shell` 网格（L79–82） | `shared/styles/shell.css` | ✅ 无冲突 |
| `.side-nav` 全家族（L84–93） | `shared/styles/shell.css` | ✅ 无冲突 |
| `.topbar` 全家族（L95–96） | `shared/styles/shell.css` | ✅ 无冲突 |
| `.mobile-nav` 全家族（L125–129） | `shared/styles/shell.css` | ✅ 无冲突 |
| `.icon-btn`（L98–100） | `shared/styles/components.css` | ✅ 无冲突 |
| `.search`（L102–104） | `shared/styles/components.css` | ✅ 无冲突 |
| `.btn-primary`（L106–108） | `shared/styles/components.css` | ✅ 微差可忽略 |
| `.btn-pill`（L110–112） | `shared/styles/components.css` | ✅ 无冲突 |
| `.chip`（L114） | `shared/styles/components.css` | ✅ 微差可忽略 |
| `.apple-card`（L116–123，忽略 hover） | `shared/styles/components.css` | ✅ hover 效果不迁移 |
| 桌面侧边导航 HTML（L239–321） | `shared/shell/side-nav.html` | ✅ 内容一致 |
| 移动端导航 HTML（L149–237） | `shared/shell/mobile-nav.html` | ✅ 内容一致 |
| 顶部工具栏 HTML（L323–345） | `shared/shell/topbar.html` | ✅ 内容一致 |
| 移动端导航 JS（L423–443） | `shared/scripts/mobile-nav.js` | ✅ 完全一致 |

### 8.2 需对齐后替换

| 当前内容 | 目标 | 差异说明 |
|----------|------|---------|
| `.apple-card` hover（L122–123） | `shared/styles/components.css` | shared 无 hover 效果；P0 新设计不需要卡片浮起动效，可直接丢弃 |

### 8.3 设置模块专有（保留在 settings/ 层）

| 类名 | 说明 | P0 是否继续使用？ |
|------|------|-----------------|
| `.text-hero` | 40px 大标题 | ❌ P0 不需要 hero 级标题，对齐其他模块标题规范 |
| `.setting-item` | 个人资料表单行布局 | ❌ P0 不含个人资料，结构废弃 |

### 8.4 潜在新增共享候选

无。settings.html 不含可提升到 shared 的新组件。

---

## 9. 与 P0 规格的差距汇总

对照 [P0 系统设置规格](../../../../docs/gyoseishoshi_saas_md/P0/06-页面规格/系统设置.md) 和 [03-业务规则 §12 Group 治理](../../../../docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md#12-group-治理)：

### 9.1 整体语义偏移

| 维度 | 原型现状 | P0 规格要求 | 差距等级 |
|------|---------|------------|---------|
| 页面定位 | "个人资料页"——管理账户和偏好 | "系统设置"——管理事务所级基础配置 | 🔴 **整体语义偏移** |
| 面向角色 | 未限定，暗示所有用户可见 | 仅管理员可见（主办人/助理/销售/财务不可见） | 🔴 角色边界缺失 |
| 副标题文案 | "管理您的账户和事务所偏好设置" | 应为事务所级配置管理 | 🟡 需重写 |

### 9.2 功能区块缺口

| P0 规格要求 | 原型现状 | 差距等级 |
|------------|---------|---------|
| **Group 管理列表**（名称、状态、创建时间、活跃案件数、成员数）+ 状态筛选 | 完全不存在 | 🔴 完全缺失 |
| **Group 详情**（名称、编号、状态、成员列表、关联统计） | 完全不存在 | 🔴 完全缺失 |
| **Group CRUD**（新建、停用、重命名）+ 停用确认提示 | 完全不存在 | 🔴 完全缺失 |
| **可见性基础配置**（跨组建案开关、负责人查看非本组协作案件开关） | 完全不存在 | 🔴 完全缺失 |
| **本地资料根目录配置**（名称、挂载点、路径策略、预览、更新人/时间） | 完全不存在 | 🔴 完全缺失 |
| **空状态（无 Group）**："创建第一个团队"引导 | 完全不存在 | 🔴 完全缺失 |
| **停用有引用的 Group** 确认提示 | 完全不存在 | 🔴 完全缺失 |
| **根目录未配置**提示（阻止资料中心/案件页绝对路径） | 完全不存在 | 🔴 完全缺失 |
| **权限不足**状态（非管理员不可见） | 完全不存在 | 🔴 完全缺失 |
| Toast / 反馈层 | 完全不存在 | 🔴 完全缺失 |

### 9.3 现有内容与 P0 的关系

| 现有内容 | P0 是否保留？ | 说明 |
|----------|-------------|------|
| 页面标题"系统设置" | ✅ 保留文案 | 标题正确，但副标题需重写 |
| 子导航"个人资料" | ❌ 废弃 | 不在 P0 范围 |
| 子导航"事务所信息" | ❌ 废弃 | 不在 P0 范围 |
| 子导航"成员与权限" | ❌ 废弃 | P0 不含高级权限管理 |
| 子导航"通知设置" | ❌ 废弃 | 不在 P0 范围 |
| 子导航"审计日志" | ❌ 废弃 | 不在 P0 范围 |
| 个人资料表单（头像、姓名、邮箱、语言、保存） | ❌ 废弃 | 不在 P0 范围 |
| 壳层（导航、topbar、移动端导航） | ✅ 复用 shared | 替换为 shared shell 片段 |
| 移动端导航 JS | ✅ 复用 shared | 替换为 `shared/scripts/mobile-nav.js` |

### 9.4 跨模块规则缺口

| 业务规则 | 来源 | 原型覆盖情况 |
|----------|------|-------------|
| Group 定义为"内部归属团队/项目组"，不等同于企业客户、来源渠道、标签 | §12 Group 治理 | ❌ 未体现 |
| P0 单层治理：创建/停用/重命名 | §12 Group 治理 | ❌ 未体现 |
| 被引用的 Group 仅允许停用，不做物理删除 | §12 Group 治理 | ❌ 未体现 |
| 跨组建案/转组必须留痕（操作人、时间、原因） | §12 Group 治理 | ❌ 未体现（此链路在客户/案件/线索域，settings 仅提供开关） |
| 系统设置仅管理员可见 | §10.5 权限矩阵 + 页面规格 §6 | ❌ 未体现 |
| 销售 / 财务对系统设置不可见 | §10.5 权限矩阵 | ❌ 未体现 |
| 本地资料根目录必须在系统设置中配置，业务对象仅保存 `relative_path` | §1.1 冻结口径 | ❌ 未体现 |
| 根目录未配置时，资料中心/案件页"登记资料（本地归档）"应受限 | §2.3 + 页面规格 §5 | ❌ 未体现 |
| 访问控制三维度：角色 + Group + 负责人/协作者 | §10.3 | ❌ 未体现 |
| 可见 ≠ 可导出 | §10.4 | ❌ 未体现（settings 无导出功能，但配置日志导出需留痕） |

---

## 10. 导航文案一致性问题

| 位置 | 当前文案 | P0 规格文案 | 需统一？ |
|------|---------|------------|---------|
| `shared/shell/side-nav.html` L79 | "设置" | "系统设置" | **是** |
| `shared/shell/mobile-nav.html` L86 | "设置" | "系统设置" | **是** |
| settings.html `<title>` | "Gyosei OS - 系统设置 (Settings)" | "系统设置" | ✅ 已正确 |
| settings.html `<h1>` | "系统设置" | "系统设置" | ✅ 已正确 |
| settings.html 侧边栏 nav-item | "设置" | "系统设置" | **是** |

> 建议在 `settings-static-sections` 任务中统一将 shared shell 和新模块中的导航文案从"设置"更正为"系统设置"。

---

## 11. 盘点结论

settings.html 是**全模块中与 P0 规格差距最大的原型页面**。现有内容几乎全部为"个人资料管理"语义，P0 系统设置的全部核心能力（Group 管理、可见性配置、本地资料根目录配置）均为零覆盖。

可从旧文件复用的部分仅有：
1. 壳层结构（导航、topbar、移动端导航）→ 全部替换为 shared shell
2. 页面标题文案"系统设置"→ 保留

其余内容（子导航、个人资料表单、专有样式）在 P0 拆分中全部废弃，不作为迁移来源。旧 `settings.html` 保留为 `migrationSource` 仅用于链接审计和回归对照。
