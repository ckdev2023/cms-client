# 资料中心现有原型盘点

> 盘点对象：
> - **跨案件入口**：[packages/prototype/admin/documents.html](../documents.html)（1287 行，单文件原型）
> - **案件详情主入口**：[packages/prototype/admin/case/detail.html](../case/detail.html) 中 `#tab-documents` 面板 + [case-detail-page.js](../case/scripts/case-detail-page.js) 中 `applyDocumentItems()`
> - **案件配置数据**：[case-detail-config.js](../case/data/case-detail-config.js) 中 `DETAIL_SAMPLES[*].documents`
>
> 目的：为后续拆分（SPLIT-ARCHITECTURE.md）提供精确的区块定位、已有能力/缺失能力清单、共享壳层复用点、链接审计与热点文件识别。
>
> P0 规格权威：[docs/gyoseishoshi_saas_md/P0/06-页面规格/资料中心.md](../../../../docs/gyoseishoshi_saas_md/P0/06-页面规格/资料中心.md)

---

## 1. 源文件一：documents.html — 行号区块总览

| 行号范围 | 关注点 | 说明 |
|----------|--------|------|
| 1–7 | `<head>` 基础 | DOCTYPE、meta、title、Tailwind CDN |
| 8–651 | 内联 `<style>` | 设计 Token + 壳层布局 + 公共组件 + 资料中心专有样式 |
| 653–654 | Skip Link | `<a href="#main">` |
| 656–744 | 移动端导航 HTML | 侧滑抽屉，包含完整导航项列表 |
| 746–828 | 桌面侧边导航 HTML | `<aside class="side-nav">`，包含完整导航项列表 |
| 830–854 | 顶部工具栏 HTML | 搜索框 + "新建咨询" + "新建案件" 按钮 + 用户头像 |
| 856–920 | **内容区头部 + 侧边栏** | 左侧资料库树 + 案件文件夹 + 标签 |
| 921–955 | **控制栏** | segmented control（6 段）+ 列表/网格视图切换 + 案件类型筛选 + 搜索 |
| 957–962 | **面包屑** | `资料中心 > 已提交待审核资料 (12)` |
| 964–1128 | **列表视图** | `apple-table`，4 条 demo 行 |
| 1130–1175 | **网格视图** | 4 张网格卡片 + 分页 |
| 1180–1210 | **上传弹窗** | 拖拽上传 + 案件关联下拉 |
| 1212–1259 | 内联 `<script>` | 视图切换 + 上传弹窗 + 拖拽反馈 |
| 1261–1282 | 移动端导航 JS | IIFE 导航开关 |

---

## 2. 内联样式拆解（documents.html L8–651）

### 2.1 设计 Token（L11–34）

声明于 `:root`，与 `shared/styles/tokens.css` 比对：

| 变量 | documents.html 值 | shared/tokens.css | 差异 |
|------|-----------------|-------------------|------|
| `--bg` ~ `--radius` | 一致 | 一致 | ✅ 无冲突 |
| `--apple-blue` ~ `--apple-shadow` | 别名映射 | 别名映射 | ✅ 一致 |
| `--success` / `--warning` / `--danger` | **缺失** | 有 | documents.html 未声明 |
| `--shadow-hover` | **缺失** | 有 | documents.html 未声明 |
| `--apple-link` | **缺失** | 有 | documents.html 未声明 |

**结论**：tokens 完全可用 `shared/styles/tokens.css` 替代，无冲突。

### 2.2 壳层布局样式（L35–339）

| 类名 | documents.html | shared 文件 | 差异 |
|------|--------------|-------------|------|
| `body` 字体/基础 | L37–51 | `tokens.css` L34–49 | 一致 |
| `.display-font` | L57–65 | `tokens.css` L60–63 | 一致 |
| `.skip-link` | L67–81 | `shell.css` L1–15 | 一致 |
| `focus-visible` | L83–86 | `shell.css` L17–20 | 一致 |
| `.app-shell` | L88–97 | `shell.css` L22–31 | 一致 |
| `.side-nav` / `.side-nav-inner` | L99–111 | `shell.css` L33–45 | 一致 |
| `.brand` / `.brand-title` | L112–123 | `shell.css` L46–57 | 一致 |
| `.nav-group-title` | L125–132 | `shell.css` L59–66 | 一致 |
| `.nav-item` + hover + `aria-current` | L133–158 | `shell.css` L67–92 | 一致 |
| `.topbar` / `.topbar-inner` | L160–176 | `shell.css` L94–110 | 一致 |
| `.mobile-nav` 全家族 | L304–332 | `shell.css` L112–139 | 一致 |
| `prefers-reduced-motion` | L334–339 | `tokens.css` L65–71 | 一致 |

**结论**：壳层样式完全可用 `shared/styles/shell.css` 替代。

### 2.3 公共组件样式

| 类名 | documents.html 行号 | shared 文件 | 差异 |
|------|-----------------|-------------|------|
| `.icon-btn` | L178–200 | `components.css` L63–85 | 一致 |
| `.search` + input | L202–226 | `components.css` L114–144 | 一致 |
| `.btn-primary` | L228–246, L341–358 | `components.css` L3–20 | ⚠️ 重复定义两次（L341 是精确副本） |
| `.btn-secondary` | L248–264, L360–377 | `components.css` L22–42 | ⚠️ 重复定义两次 |
| `.btn-pill` | L266–283 | `components.css` L44–61 | 一致 |
| `.chip` | L285–295 | `components.css` L89–101 | 微差：shared 多 `white-space: nowrap` |
| `.apple-card` | L297–302, L379–384 | `components.css` L105–110 | ⚠️ 重复定义两次 |

**注意**：documents.html 内存在 `.btn-primary`、`.btn-secondary`、`.apple-card` 的**重复定义**（分别在两个 `<style>` 块中），这是复制粘贴遗留问题。

### 2.4 资料中心专有样式

以下样式 **不存在于 shared/**，属于资料中心专有或潜在共享候选：

| 类名 | 行号 | 说明 | 共享候选？ |
|------|------|------|-----------|
| `.segmented-control` / `.segment-btn` | L386–407 | Apple 风格分段控件 | ⚠️ tasks/billing 也有同类定义；需对齐到 shared 版本 |
| `.apple-table` | L409–431 | 表格样式（th/td） | ⚠️ billing 也有；列宽和间距存在差异 |
| `.link-apple` | L432–437 | 蓝色链接样式 | ⚠️ 可共享 |
| `.search-input` | L441–455 | Apple 风格搜索框（独立样式） | 模块专有 |
| `.icon-doc` / `.icon-pdf` / `.icon-img` / `.icon-folder` | L457–476 | 文件类型图标色彩 | 模块专有 |
| `.sidebar` / `.sidebar-item` | L478–516 | 资料库左侧树 | 模块专有 |
| `.grid-view` / `.grid-item` / `.grid-icon` / `.grid-title` / `.grid-subtitle` | L518–570 | 网格视图 | 模块专有 |
| `.view-toggle` / `.view-toggle-btn` | L572–604 | 列表/网格切换 | ⚠️ 可共享（其他列表页也可能需要） |
| `.modal-backdrop` / `.modal-content` / `.drop-zone` | L606–651 | 上传弹窗 + 拖拽区 | 模块专有（P0 不做真实上传） |

---

## 3. HTML 区块详情（documents.html）

### 3.1 移动端导航（L656–744）

与 `shared/shell/mobile-nav.html` 内容 **结构一致**，但存在路径差异：

| 导航项 | documents.html 中的 href | shared 中的 href |
|--------|------------------------|-----------------|
| 客户 | `customers.html` | `customers/index.html` |
| 案件 | `cases-list.html` | `cases-list.html` |
| 任务与提醒 | `tasks.html` | `tasks.html` |
| 资料中心 | `documents.html`（有 `aria-current="page"`） | `documents.html`（无 `aria-current`） |
| 收费与财务 | `billing.html` | `billing/index.html` |

### 3.2 桌面侧边导航（L746–828）

与 `shared/shell/side-nav.html` 内容 **结构一致**，路径差异同上。

### 3.3 顶部工具栏（L830–854）

与 `shared/shell/topbar.html` **结构一致**，差异：

| 元素 | documents.html | shared/topbar.html |
|------|--------------|-------------------|
| "新建案件" href | `case-create.html` | `case/create.html` |

**路径问题**：`case-create.html` 是旧路径。

### 3.4 内容区侧边栏（L859–900）

资料库左侧树，含 3 个分区：

| 分区 | 内容 | 交互 |
|------|------|------|
| 文件库 | 全部资料（active）/ 最近访问 / 星标文件 | **无 JS**——点击不生效 |
| 案件文件夹 | 3 个案件文件夹（硬编码名称） | **无 JS**——点击不生效 |
| 标签 | 紧急 / 模板 / 已提交待审核（3 个彩色标签） | **无 JS**——hover 有样式但点击不生效 |

**P0 规格对照**：侧边栏概念在 P0 规格中**不存在**。P0 次级入口以扁平表格 + 筛选为主，不采用文件管理器形态。此侧边栏应在迁移时移除或作为 demo-only 标注。

### 3.5 控制栏（L921–955）

#### Segmented Control（L924–933）

| 段 | 文本 | 状态 | P0 对应 |
|----|------|------|---------|
| 1 | 全部资料 | `active` | ✅ 默认视图 |
| 2 | 已提交待审核 | 默认（含红点动画） | ✅ P0 状态筛选 |
| 3 | 缺件资料 | 默认 | ✅ P0 状态筛选 |
| 4 | 即将过期 | 默认 | ✅ P0 状态筛选 |
| 5 | 已过期 | 默认 | ✅ P0 状态筛选 |
| 6 | 资料模板 | 默认 | ❌ P0 不做模板管理 |

- **"资料模板"** 应在迁移时标注为 P1 或移除
- **无 JS 行为**：点击不切换视图

#### 视图切换 + 筛选（L935–954）

| 控件 | 类型 | 功能状态 |
|------|------|---------|
| 列表/网格切换 | `.view-toggle` 按钮组 | ✅ JS 功能正常（`switchView()`） |
| 案件类型下拉 | `<select>` | ❌ 无 JS 联动 |
| 搜索输入框 | `.search-input` | ❌ 无 JS 联动 |

### 3.6 列表视图（L964–1128）

`<table class="apple-table">` 包含 4 条 demo 行：

#### 表头列（6 列）

| # | 列名 | 宽度 | P0 规格 §2.1 | 差距 |
|---|------|------|-------------|------|
| 1 | 资料名称 | 3/12 | ✅ 资料项名称 | 对齐 |
| 2 | 关联案件/客户 | 2/12 | ✅ 所属案件 | 对齐 |
| 3 | 类型/完成率 | 2/12 | ❌ 规格无"类型/完成率"列 | 🟡 概念混淆——"类型"（客户上传/模板要求）与案件完成率进度条混在同一列 |
| 4 | 状态 | 2/12 | ✅ 状态 | 对齐但枚举不一致（见下） |
| 5 | 更新时间 | 2/12 | ❌ 规格无更新时间，有截止日和最近催办 | 🟡 需替换为截止日 + 催办时间 |
| 6 | 操作 | 1/12 | 规格为行内动作 | 对齐 |

**P0 规格要求但缺失的列**：

| 缺失列 | P0 规格位置 |
|--------|-----------|
| 提供方 | §2.1 |
| 截止日 | §2.1 |
| 最近催办时间 | §2.1 |
| 本地归档相对路径（`relative_path`） | §2.1 |

#### Demo 数据行

| # | 资料名称 | 状态 tag | 关联案件 | P0 场景覆盖 |
|---|---------|---------|---------|-----------|
| 1 | 在留卡正面\_扫描件.jpg | 已提交待审核（黄色） | 永住许可申请 (张伟) | ✅ 待审核 |
| 2 | 护照复印件\_王强.pdf | 不合格（红色） | Tech Innovators | ✅ 退回补正 |
| 3 | 课税证明书\_李明 | 即将过期（橙色） | 家族滞在 (李明) | ✅ 即将过期 |
| 4 | 高度人才积分表(IT) | 待上传 (缺件)（灰色） | 高度专门职 (陈某) | ✅ 缺件 |

#### 状态枚举对齐分析

| documents.html 状态 | P0 规格 §5 状态 | case-detail-config.js | 对齐度 |
|---------------------|----------------|----------------------|--------|
| 已提交待审核 | `uploaded_reviewing` | `submitted` | ⚠️ 命名不一致 |
| 不合格 | `rejected`（退回补正） | `rejected` | ⚠️ documents.html 用"不合格"，规格用"退回补正" |
| 即将过期 | `expired` | `expired` | ⚠️ "即将过期"是额外状态提示，不是独立状态 |
| 待上传 (缺件) | `pending`（待提交） | `pending` / `idle` | ⚠️ "缺件"是业务语义，不是独立状态 |
| — | `approved`（通过） | `reviewed` / `done` | 🔴 缺失 |
| — | `waived` | `waived` | 🔴 缺失 |

### 3.7 网格视图（L1130–1175）

4 张卡片，与列表视图的 4 条数据对应。展示简化信息（图标 + 名称 + 大小/状态）。

- **P0 规格未要求网格视图**。迁移时可保留为 demo-only 标注或移除。

### 3.8 上传弹窗（L1180–1210）

拖拽上传弹窗，包含：
- 拖拽区（`.drop-zone`）
- 关联案件下拉（3 个硬编码选项）
- "取消"/"开始上传"按钮

**P0 规格对照**：P0 明确不做真实文件上传。P0 的"登记资料"动作是记录 `relative_path` + 版本元数据，不涉及文件上传 UI。此弹窗应在迁移时**替换**为本地归档登记弹窗（录入 `relative_path`、文件名、描述等）。

---

## 4. 交互行为清单（documents.html）

| # | 交互 | 实现方式 | 行号 | 功能状态 |
|---|------|---------|------|---------|
| 1 | 移动端导航开关 | IIFE 监听 `data-nav-open/close` + Escape | L1261–1282 | ✅ 功能正常 |
| 2 | 列表/网格视图切换 | `switchView()` 函数 | L1213–1223 | ✅ 功能正常 |
| 3 | 上传弹窗开关 | `openUploadModal()` / `closeUploadModal()` | L1225–1231 | ✅ 功能正常 |
| 4 | 拖拽区高亮 | dragenter/dragover/dragleave/drop 事件 | L1234–1258 | ✅ 功能正常 |
| 5 | Segmented control 切换 | 仅 CSS `.active` 静态标记 | L924–933 | ❌ 无 JS |
| 6 | 案件类型筛选 | 原生 `<select>` | L944–949 | ❌ 无 JS 联动 |
| 7 | 搜索输入框 | 原生 `<input>` | L950–953 | ❌ 无 JS 联动 |
| 8 | 侧边栏视图切换 | 仅 CSS `.active` 静态标记 | L859–900 | ❌ 无 JS |
| 9 | "案件模板生成" 按钮 | 无事件绑定 | L911–913 | ❌ 无 JS + **P1 泄漏** |
| 10 | "审核" / "催办" / "重新索要" / "发送提醒" 按钮 | 无事件绑定 | 行内操作列 | ❌ 无 JS |
| 11 | 案件链接跳转 | `<a href="case/detail.html">` | L990,1065,1100 | ✅ 静态导航 |
| 12 | Topbar "新建咨询" | `onclick → window.location.href` | L847 | ✅ 导航 |
| 13 | Topbar "新建案件" | `onclick → window.location.href` | L848 | ✅ 导航（旧路径） |
| 14 | 全局搜索 | 无 JS（未引入 `navigate.js`） | L839–844 | ❌ 无搜索功能 |

**总结**：仅移动端导航、视图切换（列表/网格）、上传弹窗和案件链接有实际交互。资料中心核心功能（状态筛选、搜索、审核/退回/waived/催办动作、批量操作）全部缺失。

---

## 5. 源文件二：case/detail.html `#tab-documents` — 案件详情资料清单 Tab

### 5.1 HTML 结构（detail.html L1105–1340+）

案件详情中 `#tab-documents` 面板位于 `detail.html` 的 `<div id="tab-documents" class="tab-panel">` 内：

| 区块 | 行号范围 | 说明 |
|------|---------|------|
| 文档头部 | L1109–1130 | 标题"资料清单" + 进度条 + "登记资料"+"手动添加"按钮 |
| 主申请人分组 | L1132–1185 | 5 项资料：护照、在留卡、履歴書、纳税証明書、证件照 |
| 扶養者/保証人分组 | L1187–1222 | 3 项资料：身元保証書、住民票、課税証明書（waived） |
| 雇主/所属機構分组 | L1224– | 5 项资料：法人登記簿、決算書、在職証明書、雇用契約書、源泉徴収票 |
| 事務所内部分组 | — | 3 项资料：委任状、申請理由書、質問書 |

### 5.2 已有能力（案件详情资料 Tab）

| 能力 | 实现方式 | 数据驱动？ | P0 对齐 |
|------|---------|----------|---------|
| 按提供方分组显示 | `<div class="section-kicker">` 手工分组 | ✅ 由 `case-detail-config.js` 驱动 | ✅ |
| 资料项名称 + 元信息 | 每项含名称、版本号、催办时间 | ✅ 由 config `documents[].items[]` 驱动 | ✅ |
| 状态 badge | `.status-badge` + 颜色类 | ✅ `docBadgeClass()` 函数映射 | ✅ |
| 状态图标 | SVG 图标按状态变化 | ✅ `docStatusIcon()` 函数映射 | ✅ |
| 进度条 | `.progress-track` / `.progress-fill` | ✅ `applyDocsProgress()` 函数 | ✅ |
| waived 项（删除线 + 灰色）| `.is-waived` + `line-through` | ✅ 有 CSS 类 + JS 支持 | ✅ |
| 标记无需提供（waived）| `data-waive-item` 按钮 + toast | ✅ 有 JS 行为 | ✅ |
| 6 个 demo 场景 | `DETAIL_SAMPLES` 的 6 个 key | ✅ 每场景含完整 documents 数据 | ✅ |
| "登记资料"按钮 | `data-navigate="../documents.html"` | ⚠️ 跳转到旧资料中心页 | 🟡 需改为弹窗或内联操作 |
| "手动添加"按钮 | prototype 反馈 toast | ⚠️ 仅 toast 提示"已添加" | 🟡 demo-only |

### 5.3 缺失能力（案件详情资料 Tab）

| P0 规格要求 | 当前状态 | 差距等级 |
|------------|---------|---------|
| 附件版本列表（每次登记一个版本） | 仅展示最新版本号在 meta 中（如 "v2"） | 🔴 完全缺失 |
| 已引用版本来源标记（本案登记/复用自其他） | 无 | 🔴 完全缺失 |
| 多案件引用数 + 过期影响提示 | 无 | 🔴 完全缺失 |
| 审核记录（通过/退回 + 原因 + 操作人） | 仅在 meta 中有审核意见片段（如源泉徴収票的退回意见），无独立审核记录列表 | 🔴 完全缺失 |
| 催办记录时间线 | 仅在 meta 中显示"催办：日期"，无催办历史列表 | 🔴 完全缺失 |
| 审核通过动作 | 无按钮和 JS | 🔴 完全缺失 |
| 退回补正动作（需填写原因） | 无 | 🔴 完全缺失 |
| 催办动作（发送 + 留痕） | 无 | 🔴 完全缺失 |
| 引用既有版本动作 | 无 | 🔴 完全缺失 |
| 登记资料弹窗（`relative_path` 录入） | "登记资料"按钮指向旧页面，无弹窗 | 🔴 完全缺失 |
| `relative_path` 展示与一键复制 | 无 | 🔴 完全缺失 |
| 说明与样例（每项的上传说明） | 无 | 🟡 缺失 |
| 空状态（无资料清单引导） | 无 | 🟡 缺失 |

---

## 6. case-detail-config.js 资料数据结构分析

`DETAIL_SAMPLES` 中每个场景的 `documents` 字段采用以下结构：

```
documents: [
  {
    group: '主申请人提供',
    count: '3/5',
    items: [
      {
        name: '护照复印件',
        meta: 'passport_copy.pdf · v2 · 催办：—',
        status: 'submitted',     // idle | pending | submitted | reviewed | done | expired | rejected | waived
        statusLabel: '已提交',
        canWaive: true,          // 可选
      },
      ...
    ]
  },
  ...
]
```

### 6.1 状态枚举（case-detail-config.js → documents）

| status 值 | statusLabel | 图标 | badge 类 |
|-----------|------------|------|---------|
| `idle` | 未开始 | 灰色问号 | — |
| `pending` | 待提供 | 黄色感叹号 | `badge-orange` |
| `submitted` | 已提交 | 绿色勾 | `badge-green` |
| `reviewed` | 已审核 | 绿色勾 | `badge-green` |
| `done` | 已完成 | 绿色勾 | `badge-green` |
| `expired` | 逾期 | 红色三角 | `badge-red` |
| `rejected` | 已退回 / 补正中 | 红色三角 | `badge-red` |
| `waived` | 无需提供 | 灰色禁止 | `badge-gray` |

**与 P0 规格 §5 状态对比**：

| P0 规格状态 | case-detail status | 对齐 |
|------------|-------------------|------|
| 待提交 `pending` | `pending` / `idle` | ⚠️ case-detail 拆为两个值 |
| 已提交待审核 `uploaded_reviewing` | `submitted` | ⚠️ 命名不一致 |
| 通过 `approved` | `reviewed` / `done` | ⚠️ case-detail 拆为两个值 |
| 退回补正 `rejected` | `rejected` | ✅ 一致 |
| 过期 `expired` | `expired` | ✅ 一致 |
| waived | `waived` | ✅ 一致 |

### 6.2 demo 场景覆盖度

| 场景 | sample key | documents 分组数 | 总项数 | 特色覆盖 |
|------|-----------|----------------|-------|---------|
| 技人国更新 | `work` | 4 | 16 | submitted/reviewed/pending/expired/rejected/waived/idle 全状态 |
| 家族滞在认定 | `family` | 3 | 20 | 大量 pending/idle + 催办中 |
| 特定技能认定 | `gate-fail` | 3 | 16 | Gate-A 阻断项关联资料 |
| 经营管理更新 | `arrears` | 3 | 16 | 高完成率 + 欠款场景 |
| 家族滞在更新（补正） | `correction` | 3 | 16 | 补正中退回项 |
| 已归档只读 | `archived` | 3 | 16 | 全部 reviewed/done |

---

## 7. 脚本依赖

### 7.1 documents.html

| 脚本 | 来源 | 引入方式 | 说明 |
|------|------|---------|------|
| 移动端导航 IIFE | 内联 `<script>` L1261–1282 | 直接嵌入 | 与 `shared/scripts/mobile-nav.js` 完全一致 |
| 视图切换 | 内联 `<script>` L1213–1223 | 直接嵌入 | `switchView(viewType)` |
| 上传弹窗 | 内联 `<script>` L1225–1258 | 直接嵌入 | `openUploadModal()` / `closeUploadModal()` + 拖拽事件 |
| `shared/scripts/navigate.js` | **未引入** | — | 全局搜索不可用 |
| `shared/scripts/mobile-nav.js` | **未引入** | — | 使用内联副本 |

### 7.2 case/detail.html（资料相关）

| 脚本 | 来源 | 说明 |
|------|------|------|
| `case-detail-config.js` | `<script src="data/case-detail-config.js">` | 声明 `DETAIL_SAMPLES[*].documents` |
| `case-detail-page.js` | `<script src="scripts/case-detail-page.js">` | `applyDocumentItems()` + `applyDocsProgress()` + `docStatusIcon()` + `docBadgeClass()` + waive 逻辑 |

---

## 8. 出站链接审计（documents.html → 其他页面）

### 8.1 导航链接（侧边栏 + 移动端各出现一次）

| 目标页面 | documents.html 中的 href | 最新正确路径 | 需修复？ |
|----------|------------------------|-------------|---------|
| 仪表盘 | `admin-prototype.html` | `admin-prototype.html` | ⚠️ 视情况 |
| 咨询与会话 | `leads-messages.html` | `leads-messages.html` | 无需 |
| 客户 | `customers.html` | `customers/index.html` | **是** |
| 案件 | `cases-list.html` | `cases-list.html` | 无需 |
| 任务与提醒 | `tasks.html` | `tasks.html` | 无需 |
| 资料中心 | `documents.html`（self, `aria-current="page"`） | `documents/index.html`（迁移后） | **是** |
| 文书中心 | `forms.html` | `forms.html` | 无需 |
| 收费与财务 | `billing.html` | `billing/index.html` | **是** |
| 报表 | `reports.html` | `reports.html` | 无需 |
| 设置 | `settings.html` | `settings.html` | 无需 |
| 客户门户 | `../src/index.html` | `../src/index.html` | 无需 |

### 8.2 内容链接

| 目标 | documents.html 中的 href | 需修复？ |
|------|------------------------|---------|
| 案件详情（表格行 ×3） | `case/detail.html` | 无需（迁移到 `documents/` 后需加 `../`） |
| 客户列表（表格行 ×1） | `customers.html` | **是**（→ `customers/index.html`；迁移后 `../customers/index.html`） |
| 新建咨询（topbar） | `leads-messages.html` | 无需（迁移后需加 `../`） |
| 新建案件（topbar） | `case-create.html` | **是**（→ `case/create.html`；迁移后 `../case/create.html`） |

### 8.3 迁移后路径影响

当 `documents.html` 迁移为 `documents/index.html` 后，所有 admin 根级相对路径需要加 `../` 前缀。使用 shared shell 后，导航链接由共享片段统一管理，仅内容区链接需要关注。

---

## 9. 入站链接审计（其他页面 → documents.html）

### 9.1 导航入口

| 来源页面 | 链接路径 |
|----------|---------|
| `shared/shell/side-nav.html` L48 | `documents.html` |
| `shared/shell/mobile-nav.html` L55 | `documents.html` |
| 所有使用内联导航的旧页面 | `documents.html` |

### 9.2 业务入口

| 来源 | 链接路径 | 说明 |
|------|---------|------|
| `case/detail.html` 资料清单 Tab "登记资料"按钮 | `data-navigate="../documents.html"` | 从案件详情跳转到跨案件资料中心 |
| `dashboard/index.html` 仪表盘 | 工作列表中"缺件"/"待审核"引用 | 文案级关联，无直接链接到资料中心 |

### 9.3 迁移影响

采用与 billing 相同的**两阶段重定向迁移**策略：

1. Phase 1：更新 shared shell 导航 → `documents/index.html`；创建 `documents/index.html` 反向重定向占位
2. Phase 2：`documents/index.html` 替换为模块骨架；`documents.html` 替换为前向重定向桩

---

## 10. 共享候选汇总

### 10.1 可直接替换为 shared 的内容

| 当前内容 | 目标共享文件 | 置信度 |
|----------|------------|--------|
| `:root` CSS Token（L11–34） | `shared/styles/tokens.css` | ✅ 无冲突 |
| `body` 字体 + 基础样式 | `shared/styles/tokens.css` | ✅ 无冲突 |
| `.display-font` | `shared/styles/tokens.css` | ✅ 无冲突 |
| `prefers-reduced-motion` | `shared/styles/tokens.css` | ✅ 无冲突 |
| `.skip-link` + `focus-visible` | `shared/styles/shell.css` | ✅ 无冲突 |
| `.app-shell` 网格 | `shared/styles/shell.css` | ✅ 无冲突 |
| `.side-nav` 全家族 | `shared/styles/shell.css` | ✅ 无冲突 |
| `.topbar` 全家族 | `shared/styles/shell.css` | ✅ 无冲突 |
| `.mobile-nav` 全家族 | `shared/styles/shell.css` | ✅ 无冲突 |
| `.icon-btn` | `shared/styles/components.css` | ✅ 无冲突 |
| `.search` + input | `shared/styles/components.css` | ✅ 无冲突 |
| `.btn-primary`（含重复定义） | `shared/styles/components.css` | ✅ 微差可忽略 |
| `.btn-secondary`（含重复定义） | `shared/styles/components.css` | ✅ 微差可忽略 |
| `.btn-pill` | `shared/styles/components.css` | ✅ 微差可忽略 |
| `.chip` | `shared/styles/components.css` | ✅ 微差可忽略 |
| `.apple-card`（含重复定义） | `shared/styles/components.css` | ✅ 微差可忽略 |
| 桌面侧边导航 HTML（L746–828） | `shared/shell/side-nav.html` | ✅ 内容一致 |
| 移动端导航 HTML（L656–744） | `shared/shell/mobile-nav.html` | ✅ 内容一致 |
| 顶部工具栏 HTML（L830–854） | `shared/shell/topbar.html` | ✅ 内容一致 |
| 移动端导航 JS（L1261–1282） | `shared/scripts/mobile-nav.js` | ✅ 完全一致 |

### 10.2 需对齐后替换

| 当前内容 | 目标 | 差异说明 |
|----------|------|---------|
| `.segmented-control` / `.segment-btn`（L386–407） | `shared/styles/components.css` | 与 tasks/billing 均存在差异；需统一基准 |
| `.apple-table`（L409–431） | `shared/styles/components.css` | 与 billing 类似差异；迁移后统一 |

### 10.3 资料中心模块专有（保留在 documents/ 层）

| 样式/结构 | 说明 |
|----------|------|
| `.icon-doc` / `.icon-pdf` / `.icon-img` / `.icon-folder` | 文件类型图标色彩 |
| `.sidebar` / `.sidebar-item` | 资料库树（P0 可移除或 demo-only） |
| `.grid-view` / `.grid-item` / `.grid-icon` | 网格视图（P0 可移除或 demo-only） |
| `.view-toggle` / `.view-toggle-btn` | 视图切换控件 |
| `.search-input` | Apple 风格独立搜索框 |
| `.modal-backdrop` / `.modal-content` / `.drop-zone` | 弹窗基础（需改造为登记资料弹窗） |

### 10.4 可从 case-detail-page.js 复用的逻辑

| 函数 | 所在位置 | 复用方式 |
|------|---------|---------|
| `docStatusIcon(status)` | case-detail-page.js L521–531 | 提取为 `documents-config.js` 的 icon 映射 |
| `docBadgeClass(status)` | case-detail-page.js L533–539 | 提取为 `documents-config.js` 的 badge 映射 |
| `applyDocumentItems(docs)` | case-detail-page.js L541–593 | 改造为 `documents-page.js` 的渲染函数 |
| waive 逻辑 | case-detail-page.js L1269–1290 | 提取为 `documents-bulk-actions.js` |

---

## 11. 与 P0 规格的差距汇总

### 11.1 跨案件资料中心（次级入口）

对照 [资料中心.md §2](../../../../docs/gyoseishoshi_saas_md/P0/06-页面规格/资料中心.md)：

| 规格要求 | 原型现状 | 差距等级 |
|----------|---------|---------|
| 7 列字段（名称、案件、提供方、状态、截止日、催办、`relative_path`） | 仅有 6 列，缺提供方/截止日/催办/relative_path；多了类型/完成率/更新时间 | 🔴 列定义大幅不匹配 |
| 3 个筛选器（状态、所属案件、提供方）+ 搜索 + 重置 | 仅有案件类型下拉 + 搜索框（均无 JS） | 🔴 筛选几乎缺失 |
| 批量动作（催办、审核通过、waived） | 无 | 🔴 完全缺失 |
| 审核通过/退回补正/waived 动作 | 行内有"审核"文字但无 JS | 🔴 完全缺失 |
| 登记资料（`relative_path` 录入） | 有上传弹窗但设计不匹配（拖拽上传 vs. 路径录入） | 🔴 需要替换 |
| 共享版本过期风险聚合 | 无 | 🔴 完全缺失 |
| 状态摘要卡（待审核/缺件/过期/共享过期风险） | 无 | 🔴 完全缺失 |
| 状态枚举一致（6 状态） | 4 种 tag 且命名不一致 | 🟡 需对齐 |
| toast 反馈 | 无 | 🔴 完全缺失 |
| 分页 | 网格视图有静态分页；列表视图无 | 🟡 需补 |
| `navigate.js` 全局搜索 | 未引入 | 🟡 需补引入 |
| 侧边栏文件树 | 有（3 分区） | ⚠️ P0 规格不要求；标注 demo-only 或移除 |
| 网格视图 | 有 | ⚠️ P0 规格不要求；标注 demo-only 或移除 |
| "案件模板生成"按钮 | 有 | ⚠️ P1 泄漏 |
| "资料模板" segmented tab | 有 | ⚠️ P1 泄漏 |

### 11.2 案件详情资料清单 Tab

对照 [资料中心.md §3](../../../../docs/gyoseishoshi_saas_md/P0/06-页面规格/资料中心.md)：

| 规格要求 | 原型现状 | 差距等级 |
|----------|---------|---------|
| 按提供方分组的资料项列表 | ✅ 已实现，数据驱动 | ✅ |
| 每项：名称 + 状态 + 说明/样例 | 部分——有名称和状态，缺说明/样例 | 🟡 |
| 附件版本列表（历史保留） | 仅显示最新版号在 meta 中 | 🔴 |
| 引用版本来源标记 | 无 | 🔴 |
| 多案件引用数 + 过期影响提示 | 无 | 🔴 |
| 审核记录（通过/退回 + 原因 + 操作人） | 无独立审核记录 | 🔴 |
| 催办记录时间线 | 仅有最近一次催办日期 | 🔴 |
| 审核通过动作 | 无 | 🔴 |
| 退回补正动作（需原因） | 无 | 🔴 |
| 标记 waived | ✅ 有按钮 + toast | ✅ |
| 新增资料项 | ⚠️ "手动添加"按钮仅 toast 提示 | 🟡 demo-only |
| 引用既有版本 | 无 | 🔴 |
| 登记资料弹窗（`relative_path` + 版本元数据） | "登记资料"跳转旧页面 | 🔴 |

---

## 12. P1 泄漏项识别

| # | 泄漏项 | 所在文件 | P0 规格判定 | 处理建议 |
|---|-------|---------|-----------|---------|
| 1 | "案件模板生成" 按钮 | documents.html L911–913 | P0 不做模板管理 | 移除或 `[P1]` 标注 + `aria-disabled` |
| 2 | "资料模板" segmented tab | documents.html L931 | P0 不做模板管理 | 移除该 tab |
| 3 | 文件上传弹窗（拖拽上传） | documents.html L1180–1210 | P0 不做真实上传 | 替换为本地归档登记弹窗 |
| 4 | 侧边栏"星标文件"/"最近访问" | documents.html L866–873 | P0 不做文件管理器形态 | 移除或 demo-only |
| 5 | 网格视图 | documents.html L1130–1175 | P0 未要求 | 可保留为 demo-only |

---

## 13. 热点文件与冲突风险

以下文件是资料中心拆分任务的冲突热点，建议始终串行归口：

| 文件 | 修改方 | 冲突原因 |
|------|-------|---------|
| `packages/prototype/admin/documents/index.html` | T07, T08, T10, T13 | 模块入口，多任务均需组装 |
| `packages/prototype/admin/documents/split-manifest.json` | T06, T14 | 验收清单 |
| `packages/prototype/admin/case/detail.html` | T11, T12 | 资料清单 Tab 结构回填 |
| `packages/prototype/admin/case/scripts/case-detail-page.js` | T12 | 资料 Tab 交互逻辑 |
| `packages/prototype/admin/case/data/case-detail-config.js` | T09, T12 | 状态枚举需跨双入口对齐 |
| `packages/prototype/admin/shared/shell/side-nav.html` | T07（导航路径更新） | 全局导航 |
| `packages/prototype/admin/shared/shell/mobile-nav.html` | T07（导航路径更新） | 全局导航 |

---

## 14. 跨模块口径一致性

### 14.1 状态枚举

资料项状态在三个来源中存在命名不一致，需在 `documents-config.js` 中统一定义：

| 概念 | P0 规格 | case-detail-config.js | documents.html | 建议统一值 |
|------|---------|----------------------|--------------|----------|
| 待提交 | `pending` | `pending` / `idle` | 待上传(缺件) | `pending` |
| 已上传待审核 | `uploaded_reviewing` | `submitted` | 已提交待审核 | `uploaded_reviewing` |
| 通过 | `approved` | `reviewed` / `done` | — | `approved` |
| 退回补正 | `rejected` | `rejected` | 不合格 | `rejected` |
| 过期 | `expired` | `expired` | 已过期/即将过期 | `expired` |
| waived | `waived` | `waived` | — | `waived` |

### 14.2 仪表盘关联

`dashboard-config.js` 中的 worklist 有"缺件资料"和"待审核"入口，指向资料中心。迁移后需确保仪表盘入口能正确跳转到 `documents/index.html`。

### 14.3 任务模块关联

催办动作生成的任务应在 `tasks-demo-data.js` 中体现来源为"资料催办"的任务条目。当前 tasks 模块无此类数据。

---

## 15. 旧入口兼容策略

采用与 billing 模块一致的**两阶段重定向迁移**策略：

| 阶段 | 变更 | 文件 |
|------|------|------|
| Phase 1 | 创建 `documents/index.html` 反向重定向占位；更新 shared shell 导航 href → `documents/index.html` | `documents/index.html`（新建）、`shared/shell/side-nav.html`、`shared/shell/mobile-nav.html` |
| Phase 2 | `documents/index.html` 替换为模块骨架；`documents.html` 替换为前向重定向桩 | `documents/index.html`、`documents.html` |
| Phase 3（可选） | 全仓内联链接清理 | 约 20+ 旧页面 |

### Phase 2 重定向桩模板

```html
<!DOCTYPE html>
<!--
  documents.html — Legacy entry redirect

  The canonical documents module now lives at documents/index.html.
  Do NOT add content here.  Edit documents/index.html instead.
-->
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=documents/index.html">
  <title>资料中心 - Gyosei OS</title>
</head>
<body>
  <p>正在跳转到<a href="documents/index.html">资料中心</a>…</p>
</body>
</html>
```

---

## 16. 总结与下一步

### 可复用资产

| 资产 | 来源 | 复用方式 |
|------|------|---------|
| 共享壳层（CSS + HTML + JS） | `shared/` | 直接引入，替换全部内联 |
| 资料项渲染逻辑 | `case-detail-page.js` | 提取 `docStatusIcon` / `docBadgeClass` 等为配置 |
| 6 套 demo 场景数据 | `case-detail-config.js` | 提取为 `documents-demo-data.js` 的跨案件聚合视图 |
| 视图切换 JS | documents.html | 可保留为 demo-only 或升级 |

### 需要从零构建的能力

| 能力 | 优先级 |
|------|-------|
| 跨案件摘要卡（待审核/缺件/过期/共享过期风险） | P0 必做 |
| 跨案件表格（7 列 + 筛选 + 搜索 + 重置） | P0 必做 |
| 批量动作（催办/审核/waived） | P0 必做 |
| 审核/退回/waived 弹窗或面板 | P0 必做 |
| 登记资料弹窗（`relative_path` 录入 + 校验） | P0 必做 |
| 共享版本过期风险面板 | P0 必做 |
| toast 反馈（7+ 场景） | P0 必做 |
| 案件详情内：版本列表、审核记录、催办时间线 | P0 必做 |
| 案件详情内：审核通过/退回/催办/引用既有版本动作 | P0 必做 |

---

## 17. 页面级设计系统结论（UI/UX Design Pass）

> 基线来源：[design/gyosei-os-admin/DESIGN.md](../../../../design/gyosei-os-admin/DESIGN.md)
>
> 本节将 DESIGN.md 中的通用规范收敛为资料中心双入口的页面级设计约束，确保实施时不临时发散。所有视觉判定以 DESIGN.md 为硬基线，不引入新的设计语言。

### 17.1 页面定位与信息架构

资料中心有两个入口，视觉层级与信息密度不同：

| 入口 | 类比 | 信息密度 | 主 CTA |
|------|------|---------|--------|
| 案件详情「资料清单」Tab（主入口） | 案件上下文内的"清单面板" | 中等——按提供方分组，每组 3–8 项 | 登记资料、审核通过、退回补正 |
| 跨案件资料中心（次级入口） | 全局"工作台表格"，类似任务/收费列表 | 高——跨案件聚合，预期 50–200 行 | 批量催办、批量审核、登记资料 |

#### 信息架构决策

```
跨案件资料中心（次级入口）
├── 摘要卡 × 4（待审核、缺件、过期、共享版本过期风险）
├── 筛选工具栏（状态、所属案件、提供方、搜索、重置）
├── 资料表格（7 列 + checkbox + 行内动作）
├── 审核/退回/waived 侧面板或模态框
├── 登记资料（本地归档）模态框
├── 共享版本过期风险面板
└── Toast 反馈

案件详情「资料清单」Tab（主入口）
├── 进度条与进度文本
├── 按提供方分组的资料项列表
│   └── 每项：状态图标 + 名称 + meta + badge + 行内动作
├── 附件版本列表（展开/折叠）
├── 审核记录与催办时间线（每项内联）
├── 行内动作（登记、审核、退回、waived、引用既有版本）
└── Toast 反馈
```

### 17.2 颜色与状态语义映射

严格复用 DESIGN.md §2 的 token 体系。不引入新颜色变量。

#### 资料项状态 → 颜色映射

| 状态码 | 中文标签 | badge 色 | 图标色 | Tailwind 类 |
|--------|---------|----------|--------|------------|
| `pending` | 待提交 | `--warning` 橙 | `var(--warning)` | `bg-amber-50 text-amber-700 border-amber-200` |
| `uploaded_reviewing` | 已提交待审核 | `--primary` 蓝 | `var(--primary)` | `bg-blue-50 text-blue-700 border-blue-200` |
| `approved` | 已审核通过 | `--success` 绿 | `var(--success)` | `bg-green-50 text-green-700 border-green-200` |
| `rejected` | 退回补正 | `--danger` 红 | `var(--danger)` | `bg-red-50 text-red-700 border-red-200` |
| `expired` | 过期 | `--danger` 红 | `var(--danger)` | `bg-red-50 text-red-700 border-red-200` |
| `waived` | 无需提供 | `--muted-2` 灰 | `var(--muted-2)` | `bg-gray-100 text-gray-600 border-gray-200` |
| `idle` | 未开始 | 无色 | `var(--muted-2)` | `bg-gray-50 text-gray-500` |

#### 摘要卡颜色规则

| 摘要卡 | 默认边框 | 强调条件 | 强调样式 |
|--------|---------|---------|---------|
| 待审核 | `var(--border)` | 计数 > 0 | 左侧 3px `var(--primary)` 色条 |
| 缺件 | `var(--border)` | 计数 > 0 | 左侧 3px `var(--warning)` 色条 |
| 过期 | `var(--border)` | 计数 > 0 | 左侧 3px `var(--danger)` 色条 + 红色数字 |
| 共享版本过期风险 | `var(--border)` | 计数 > 0 | 左侧 3px `var(--danger)` 色条 + 红色淡背景 |

### 17.3 排版层级

沿用 DESIGN.md §3 的排版体系：

| 元素 | 样式 | 对应 DESIGN.md 层级 |
|------|------|-------------------|
| 跨案件页面标题「资料中心」 | 34px / 900 / lh 1.08 / tracking -0.03em | Hero 标题（同 billing/tasks） |
| 页面副标题 | 15px / 600 / `var(--muted)` | 辅助说明 |
| 摘要卡标题 | 12px / 900 / uppercase / tracking 0.06em / `var(--muted-2)` | 分组标题 |
| 摘要卡数值 | 28px / 900 / `var(--text)` | 大数字（同 billing 摘要卡） |
| 表格表头 | 12px / 700 / uppercase / tracking 0.02em / `var(--muted-2)` | 表格列名（shared apple-table） |
| 表格正文 | 14px / 400–600 / `var(--muted)` | 表格正文 |
| 案件详情内提供方分组标题 | 12px / 900 / uppercase / tracking 0.08em / `var(--primary)` | `.section-kicker`（已在 case detail 使用） |
| 案件详情内资料项名称 | 14px / 600 / `var(--text)` | 标准列表项 |
| 案件详情内资料项 meta | 12px / 400 / `var(--muted-2)` | 辅助信息 |

### 17.4 组件规范

#### 表格（跨案件资料中心）

- 使用 shared `.apple-table` 样式，不自定义表头/行样式
- 必须包含 checkbox 列（使用 shared `.table-checkbox`）
- 行 hover 使用 `#fbfbfd` 背景（shared 默认）
- 行内快捷动作使用 `.row-quick-action`（hover 显示）
- 过期行使用浅红背景高亮：`bg-[rgba(220,38,38,0.04)]`（同 billing 逾期行）
- `relative_path` 列使用 `font-family: monospace; font-size: 12px` + 一键复制图标按钮

#### 筛选工具栏

- 使用 shared `.search-input` 作为搜索框
- 下拉筛选使用 `<select>` + shared 样式（同 billing/tasks 模式）
- "重置" 使用 `.btn-pill` 文字按钮
- 工具栏与表格之间间距 16px

#### 摘要卡

- 使用 shared `.apple-card` 作为容器
- 4 卡网格：`grid-cols-1 md:grid-cols-2 xl:grid-cols-4`
- 每卡内部：上方分组标题 + 下方大数字 + 底部辅助说明
- 左侧 3px 色条使用 `border-left: 3px solid var(--xxx)` 实现

#### 资料项列表（案件详情 Tab）

- 延续现有 `case/detail.html` 的资料清单样式（`.doc-item`、`.section-kicker`）
- 新增附件版本列表：折叠面板，使用 `border-l-2 border-[var(--border)]` 左侧时间线
- 审核记录使用小型时间线：dot + 文本 + 时间（同 overview timeline 样式，缩小版）
- `relative_path` 使用 monospace 字体 + 复制按钮

#### 模态框

- 审核/退回/waived 使用 shared `.modal-backdrop` + `.apple-modal` 样式
- 登记资料模态框使用相同容器，字段布局遵循 shared `.apple-input` + `.apple-label`
- `relative_path` 输入使用 monospace 字体 + 实时校验提示（禁止 `..`、前导 `~`、空白控制字符）

#### Toast

- 使用与 case-detail 相同的 toast 模式（固定底部右侧，3s 自动消失）
- 颜色跟随动作语义：审核通过→绿色、退回→红色、催办→蓝色、waived→灰色

### 17.5 交互模式

| 交互 | 模式 | 参考 |
|------|------|------|
| 审核通过/退回/waived | 侧面板或模态框，含原因输入（退回/waived 必填） | billing 登记回款模态框 |
| 登记资料（本地归档） | 模态框，含 `relative_path` 输入 + 校验 | 新建案件弹窗布局 |
| 批量催办 | checkbox 全选 → 顶部操作栏出现 → 确认弹窗 | tasks 批量操作模式 |
| 筛选联动 | 即时筛选（无需点"搜索"按钮），重置恢复默认 | 现有 tasks/billing 模式 |
| 摘要卡点击 | 点击卡片 → 筛选器切换到对应状态 | billing 卡片联动模式 |
| `relative_path` 复制 | 点击复制图标 → toast "路径已复制" | 标准复制反馈 |
| 版本列表展开 | 点击展开/折叠 → 平滑动画 | provider progress 折叠面板 |

### 17.6 响应式策略

| 断点 | 布局 | 说明 |
|------|------|------|
| < 768px | 摘要卡 1 列、表格水平滚动、筛选器折叠为"筛选"按钮 | 移动端 |
| 768px–1023px | 摘要卡 2 列、表格完整、筛选器可见 | 平板 |
| ≥ 1024px | 侧边导航 + 摘要卡 4 列 + 表格完整 | 桌面端 |

案件详情资料 Tab 不需要独立响应式策略，继承 case detail 的布局。

### 17.7 视觉禁用项（MUST NOT）

以下是资料中心模块 **明确禁止** 的视觉决策：

| # | 禁用项 | 原因 |
|---|-------|------|
| 1 | 不引入新颜色变量 | DESIGN.md token 体系已覆盖所有状态语义 |
| 2 | 不使用 Finder/macOS 风格文件浏览器 UI | P0 是"工作台表格"，不是文件管理器 |
| 3 | 不使用拖拽上传区域 | P0 不做真实文件上传 |
| 4 | 不使用网格/缩略图视图 | P0 核心为表格视图，网格视图后置 P1 |
| 5 | 不使用 Kanban 看板视图 | 资料项状态流转由表格 + 行内操作驱动 |
| 6 | 不使用进度环/进度饼图 | 进度用水平条（同案件详情概览卡） |
| 7 | 不使用深色/暗黑模式 | 当前原型仅 Light 模式 |
| 8 | 不使用文件预览面板 | P0 不托管文件，无预览能力 |
| 9 | 不使用树形文件目录侧边栏 | P0 跨案件入口使用筛选器 + 表格 |
| 10 | 不使用星标/收藏/标签系统 | P0 不做个人化文件管理 |
| 11 | 不使用 Apple Blue `#0071e3` 作为主色 | 统一使用 `var(--primary)` (#0369a1)；案件详情内 Tab 样式保持现有固定色值不变 |
| 12 | 不在 `relative_path` 字段使用等宽字体以外的字体 | 路径必须使用 monospace 确保可读性 |

### 17.8 视觉必做项（MUST）

| # | 必做项 | 对齐依据 |
|---|-------|---------|
| 1 | 页面标题使用 34px/900/Hero 层级 | DESIGN.md §3 + billing/tasks 一致 |
| 2 | 摘要卡使用 `.apple-card` + 左侧色条 | billing 模式 |
| 3 | 表格使用 shared `.apple-table` | 全局一致 |
| 4 | 状态 badge 使用 §17.2 的 7 种映射 | 双入口一致 |
| 5 | 操作按钮遵循 Primary/Secondary/Pill 三级权重 | DESIGN.md §6 按钮规范 |
| 6 | 模态框使用 shared `.apple-modal` | 全局一致 |
| 7 | Toast 使用固定底部右侧 3s 自动消失模式 | case-detail 模式 |
| 8 | waived 项在列表中保持可见但灰化（line-through + muted 色） | 现有 case-detail 行为 |
| 9 | 过期行使用浅红背景高亮 | billing 逾期行模式 |
| 10 | `relative_path` 使用 monospace + 一键复制 | P0 规格 §4.1 |
| 11 | 导航高亮使用 `aria-current="page"` | DESIGN.md §6 导航规范 |
| 12 | 跨案件页面与案件详情 Tab 的状态文案、badge 颜色必须一致 | 双入口一致性 |

### 17.9 与现有已拆分模块的视觉一致性清单

| 对齐维度 | 参考模块 | 资料中心应遵循 |
|---------|---------|--------------|
| 页面标题 + 副标题 + 主 CTA 布局 | `billing/sections/page-header.html` | 相同结构 |
| 摘要卡网格 | `billing/sections/summary-cards.html` | 相同 4 卡网格 + 色条 |
| 筛选工具栏 | `billing/sections/filters-toolbar.html`、`tasks/sections/filters-toolbar.html` | 相同布局 |
| 表格 + checkbox + 行内动作 | `billing/sections/billing-table.html` | 相同结构 |
| 模态框 | `billing/scripts/billing-payment-modal.js` | 相同 `.apple-modal` 容器 |
| Toast | `billing/sections/collection-result-toast.html`、`tasks/sections/toast.html` | 相同定位和动画 |
| 批量操作栏 | `tasks/scripts/tasks-bulk-actions.js` | 相同全选/indeterminate/操作栏模式 |

### 17.10 demo-only 标注规则

以下交互在原型中实现但必须在文档和 UI 中明确标注为 demo-only：

| 交互 | 标注方式 |
|------|---------|
| 审核通过/退回补正结果 | toast 消息带 `（示例）` 后缀 |
| 批量催办执行结果 | toast 消息带 `（示例）` 后缀 |
| 登记资料写入 | toast 消息带 `（示例）` 后缀 |
| 搜索/筛选 | 仅对 demo 数据生效，无真实后端 |
| `relative_path` 校验 | 前端正则校验，无服务端校验 |
| 共享版本过期联动 | 使用 demo 数据模拟，无真实跨案件查询 |
