# Example Walkthrough: Customer Page Spec Generation

> Real repo example demonstrating the page-spec-generator skill.
> Gold sample: `docs/gyoseishoshi_saas_md/P0/06-页面规格/客户.md`

---

## Scenario

User request: "为客户模块生成页面规格文档。"

Input sources:
- `docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md` — where customers fit in the main flow
- `docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md` — validation rules, dedup rules
- `packages/prototype/admin/customers/` — prototype split artifacts

## Step 1 — Identify the 10 required chapters

Every page spec must have these chapters (derived from the 客户.md gold sample):

| # | Chapter | Purpose |
|---|---------|---------|
| 1 | 列表页必保留字段 | Column definitions with data sources |
| 2 | 列表页搜索与筛选 | Search scope, filter dimensions, segmented control |
| 3 | 列表页批量动作 | Bulk operations with constraints |
| 4 | 新建/编辑弹窗 | Form fields, validation rules, conditional logic |
| 5 | 草稿能力 (if applicable) | Save/restore/delete lifecycle |
| 6 | 状态与异常态 | Empty state, error state, edge cases |
| 7 | Toast 通知 | All feedback scenarios with title/desc |
| 8 | 权限与可见性 | Role × operation matrix |
| 9 | 详情页/子页面 | Tab structure and key entry points |
| 10 | P0 明确不做 | Scope exclusions with rationale |

Plus two structural sections:
- **11. 原型演示专属能力** — demo-only behaviors to preserve but not ship
- **拆分回归清单** — checklist for prototype split verification

## Step 2 — Derive fields from prototype + business rules

### Example: Column definitions (Chapter 1)

Source: `packages/prototype/admin/customers/sections/table.html` + `data/customer-config.js`

```markdown
| # | 列头 | 规格字段 | 原型中的呈现 |
|---|------|---------|-------------|
| 1 | 客户 | 客户名称（识别名/法定名） | 识别名 + 客户编号/电话/邮箱辅助行 |
| 2 | フリガナ | フリガナ | 文本列（md+ 可见） |
| 3 | 累计案件 | 累计案件数 | 数字链接 / 0 灰色 |
| 4 | 活跃案件 | 当前活跃案件数 | 数字链接 / 0 灰色 |
| 5 | 最近联系 | 最近联系时间 | 日期 + 渠道辅助行 |
| 6 | 负责人 | 当前负责人 | 头像缩写 + 姓名 |
| 7 | 介绍人/来源 | 介绍人/来源 | 文本（lg+ 可见） |
| 8 | 所属分组 | 所属分组 | chip（lg+ 可见） |
```

Cross-reference: `customer-config.js` `TABLE_COLUMNS` array confirms these 8 data columns.

### Example: Form fields (Chapter 4)

Source: `sections/create-modal.html` + `customer-config.js` `CREATE_FORM_FIELDS`

```markdown
| # | 字段 | 控件 | 必填 | 备注 |
|---|------|------|------|------|
| 1 | 识别名 | text input | 否 | |
| 2 | 所属 Group | select | **是** | |
| 3 | 姓名（法定） | text input | **是** | |
| ...
| 8 | 电话 | tel input | **条件必填** | 电话/邮箱至少填一项 |
| 9 | 邮箱 | email input | **条件必填** | 电话/邮箱至少填一项 |
```

Validation rule source: `03-业务规则 §2.6 去重规则`

## Step 3 — Derive permissions from business rules

Source: `03-业务规则` role definitions + page prototype segmented control

```markdown
| 角色 | 可见范围 | 可编辑范围 | 可导出 |
|------|---------|-----------|--------|
| 管理员 | 全所客户 | 全部字段 | 需留痕 |
| 主办人 | 本组 + 负责的客户 | 负责客户全部字段 | 需留痕 |
| 助理 | 本组客户 | 基础信息、沟通记录 | 受限 |
| 销售/前台 | 本组客户（基础信息） | 基础信息 | 不可 |
```

## Step 4 — Define scope exclusions

Source: `02-版本范围与优先级.md` P0/P1 boundary

```markdown
| # | 不做项 | 后置到 | 原因 |
|---|--------|-------|------|
| 1 | 企业客户主数据 | P1 | P0 以个人客户为主 |
| 2 | 客户门户关联 | P1 | P0 无客户门户 |
| 3 | 客户合并 | P1 | P0 仅做去重提示 |
| ... |
```

## Step 5 — Generate P0-CONTRACT alignment

The page spec's chapters map directly to P0-CONTRACT sections:

| Page spec chapter | P0-CONTRACT § |
|-------------------|---------------|
| 列表页必保留字段 | §1 |
| 搜索与筛选 | §2 |
| 批量动作 | §3 |
| 新建弹窗 | §4 |
| 草稿能力 | §5 |
| 状态与异常态 | §6 |
| Toast | §7 |
| 权限 | §8 |
| 详情页 | §9 |
| 不做 | §10 |
| 演示能力 | §11 |

## Actual repo output

The customer page spec is at `docs/gyoseishoshi_saas_md/P0/06-页面规格/客户.md` (200+ lines). It serves as the gold sample for all other page specs in the `06-页面规格/` directory:

```
docs/gyoseishoshi_saas_md/P0/06-页面规格/
├── 客户.md          ← Gold sample (most complete)
├── 案件.md          ← Complex (list + create wizard + detail tabs)
├── 收费与财务.md    ← Complex (dual view + modals + risk panel)
├── 资料中心.md
├── 文书中心.md
├── 仪表盘.md
├── 任务与提醒.md
├── 咨询线索.md
└── 系统设置.md
```
