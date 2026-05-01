# admin — 表格列对齐 Guideline（UX-048）

> 生成日期：2026-05-01
> 适用范围：`packages/admin/src/views/**/` 所有 `<table>` 列表
> 关联走查：23-admin-UI视觉规范走查与优化报告-第三轮.md §3.4

---

## 1. 对齐规则

| 列类型 | 对齐方式 | 说明 |
|---|---|---|
| 复选框 | `text-align: center` | 必须配 24×24 命中区（`.ui-checkbox-hit`） |
| 文本标识（姓名/编号/标题） | `text-align: left` | 表默认值，无需额外声明 |
| 状态 / 标签 chip | `text-align: left` | 保持阅读流方向一致 |
| 日期 / 时间 | `text-align: left` | 与文本标识对齐 |
| 数值 / 金额 | `text-align: right` + `font-variant-numeric: tabular-nums` | 让小数点纵向对齐，便于扫描比较 |
| 单按钮 Action | `text-align: center` | 单个图标/按钮视觉居中 |
| 多按钮 Action | `text-align: right` | 靠右收束，避免按钮组在列中漂浮 |
| 链接计数（如案件数） | `text-align: right` | 本质是数值，应遵循数值规则 |

## 2. 当前各表现状与差距

### 2.1 Leads (`LeadTable` / `LeadTableRow`)

| 列 | 当前对齐 | 是否合规 |
|---|---|---|
| 复选框 | center | OK |
| 名前/ふりがな/メール | left（表默认） | OK |
| ステータス | left（表默认） | OK |
| 操作（草稿行） | right | OK |

### 2.2 Customers (`CustomerTable` / `CustomerTableRow`)

| 列 | 当前对齐 | 是否合规 | 备注 |
|---|---|---|---|
| 复选框 | center | OK | |
| 氏名/ふりがな/メール | left | OK | |
| 案件数 (Cases) | **center** | **不合规** | 数值类应 right；TH + TD 都需改 |
| 操作 | right | OK | |

### 2.3 Cases (`CaseTableRow`)

| 列 | 当前对齐 | 是否合规 |
|---|---|---|
| 金額 | right + `tabular-nums` | OK |
| 操作 | right | OK |

### 2.4 Billing (`BillingTable`)

| 列 | 当前对齐 | 是否合规 |
|---|---|---|
| 复选框 | center | OK |
| 金額 | right + `semibold` | OK |
| ステータス | center | center 可接受，left 更优；低优先级 |
| 操作 | — | — |

### 2.5 Documents (`DocumentTable` / `DocumentTableRow`)

| 列 | 当前对齐 | 是否合规 |
|---|---|---|
| 复选框 | center | OK |
| 名称/種類 | left | OK |

### 2.6 Billing — PaymentLogTable

| 列 | 当前对齐 | 是否合规 |
|---|---|---|
| 金額 | right + `semibold` + `tabular-nums` | OK |
| 領収書 | center | OK（单按钮 action） |
| 操作 | right | OK |

### 2.7 Conversations (`ConversationsListView`)

| 列 | 当前对齐 | 是否合规 |
|---|---|---|
| TH 全体 | left | OK |

## 3. 收敛行动项

| # | 页面 | 修改内容 | 优先级 |
|---|---|---|---|
| 1 | CustomerTable + CustomerTableRow | `.customer-table__th-cases` / `.customer-row__cases` → `text-align: right`；`.customer-row__cases-link` 的 `justify-content` → `flex-end` | P2 |
| 2 | BillingTable | `.billing-table__col--status`（如存在 center）评估改 left | P3 |

## 4. 新增表格时的 Checklist

- [ ] 复选框列使用 `.ui-checkbox-hit` wrapper，对齐 center
- [ ] 数值/金额列声明 `text-align: right` + `font-variant-numeric: tabular-nums`
- [ ] 状态/标签列保持 left（勿因 chip 宽度不一而改 center）
- [ ] Action 列：单按钮 center，多按钮 right
- [ ] TH 与 TD 对齐方向必须一致
