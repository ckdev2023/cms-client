# Example Walkthrough: Billing Module Scaffold

> Real repo example demonstrating the admin-module-scaffold skill.
> Comparison: `customers/` (simplest) vs `billing/` (complex)

---

## Scenario

User request: "为收费模块创建 admin 模块骨架。"

## Step 1 — Determine module structure from page spec

From `docs/gyoseishoshi_saas_md/P0/06-页面规格/收费与财务.md`:

- Has a list page with summary cards
- Has multiple view modes (案件收费列表 / 回款流水)
- Has modals (登记回款, 收费计划面板)
- Has bulk actions (批量催款)
- Has risk acknowledgment panel
- Has a filter toolbar

## Step 2 — Scaffold directory from gold sample

Using `customers/` as the structural template:

```
packages/prototype/admin/billing/
├── index.html                    ← 入口（组装 shared + sections + scripts）
├── P0-CONTRACT.md                ← 空壳（后续填充）
├── SPLIT-ARCHITECTURE.md         ← 空壳
├── MIGRATION-MAPPING.md          ← 空壳
├── split-manifest.json           ← 最小有效 manifest
├── sections/
│   ├── page-header.html          ← 标题 + 主按钮
│   ├── summary-cards.html        ← 摘要统计卡
│   ├── filters-toolbar.html      ← 筛选与搜索
│   └── billing-table.html        ← 列表结构
├── data/
│   └── billing-config.js         ← 声明式配置
└── scripts/
    └── billing-page.js           ← 页面初始化
```

## Step 3 — Minimum viable split-manifest.json

```json
{
  "artifactVersion": 1,
  "moduleId": "billing",
  "moduleLabel": "收费与财务",
  "moduleDir": "packages/prototype/admin/billing",
  "entryFile": "packages/prototype/admin/billing/index.html",
  "referenceDocs": [
    "packages/prototype/admin/billing/P0-CONTRACT.md",
    "packages/prototype/admin/billing/SPLIT-ARCHITECTURE.md",
    "packages/prototype/admin/billing/MIGRATION-MAPPING.md",
    "docs/gyoseishoshi_saas_md/P0/06-页面规格/收费与财务.md"
  ],
  "sharedCandidates": {
    "styles": [
      "packages/prototype/admin/shared/styles/tokens.css",
      "packages/prototype/admin/shared/styles/components.css",
      "packages/prototype/admin/shared/styles/shell.css"
    ],
    "shell": [
      "packages/prototype/admin/shared/shell/side-nav.html",
      "packages/prototype/admin/shared/shell/topbar.html",
      "packages/prototype/admin/shared/shell/mobile-nav.html"
    ],
    "scripts": [
      "packages/prototype/admin/shared/scripts/mobile-nav.js",
      "packages/prototype/admin/shared/scripts/navigate.js"
    ]
  },
  "sections": [],
  "dataFiles": [],
  "scripts": [],
  "productionMapping": {},
  "regressionChecklist": [],
  "notes": []
}
```

## Comparison: Simple vs Complex module scaffolds

### customers/ (simple — 1 list page + 1 modal)

```
sections/: 6 files (header, filters, table, pagination, create-modal, toast)
scripts/:  4 files (page, modal, drafts, bulk-actions)
data/:     1 file  (customer-config.js)
```

### billing/ (complex — 2 view modes + multiple panels + modals)

```
sections/: 9 files (page-header, summary-cards, filters-toolbar,
                     billing-table, billing-plan-panel, payment-modal,
                     payment-log-table, risk-ack-panel, collection-result-toast)
scripts/:  5 files (billing-page, billing-filters, billing-bulk-actions,
                     billing-payment-modal, billing-risk-log)
data/:     2 files (billing-config.js, billing-demo-data.js)
```

### Key differences

| Aspect | customers | billing |
|--------|-----------|---------|
| View modes | 1 (list) | 2 (案件收费 / 回款流水) |
| Sections | 6 | 9 |
| Scripts | 4 | 5 |
| Data files | 1 | 2 (config + demo data split) |
| Extra docs | — | INVENTORY.md, REGRESSION-GATE.md |
| Styles | Uses shared only | shared + `styles/billing.css` (module-specific) |

## Step 4 — Verify scaffold with checklist

From `references/scaffold-checklist.md`:

- [x] `index.html` references shared styles via `<link>`
- [x] `index.html` includes shared shell (side-nav, topbar, mobile-nav)
- [x] `aria-current="page"` on the module's nav item
- [x] `split-manifest.json` has valid `artifactVersion` and `moduleId`
- [x] `P0-CONTRACT.md` skeleton created
- [x] Navigation paths use `../` prefix for admin-root files
- [x] `shared/scripts/mobile-nav.js` included via `<script src>`
