# Example Walkthrough: Customers Module Prototype Split

> Real repo example demonstrating the prototype-module-split skill.
> Gold sample: `packages/prototype/admin/customers/`

---

## Scenario

User request: "帮我拆分 customers 原型到标准目录结构"

Input: a ~1500-line monolithic `customers/index.html` mixing tokens, shared components, shell/nav, mobile nav, top bar, page sections, and business script.

## Step 1 — Locate entry file and spec docs

| Source | Path |
|--------|------|
| Entry file | `packages/prototype/admin/customers/index.html` |
| Page spec | `docs/gyoseishoshi_saas_md/P0/06-页面规格/客户.md` |

## Step 2 — Inventory UI sections, configs, scripts, shared candidates

From scanning `index.html` line ranges:

| Line range | Concern | Destination |
|-----------|---------|-------------|
| CSS variables `:root` | Design tokens | `shared/styles/tokens.css` (already exists, skip) |
| Shell layout styles | Shell CSS | `shared/styles/shell.css` (already exists, skip) |
| Component styles | Button/chip/table | `shared/styles/components.css` (already exists, skip) |
| Side nav HTML | Desktop nav | `shared/shell/side-nav.html` (already exists, skip) |
| Mobile nav HTML | Mobile drawer | `shared/shell/mobile-nav.html` (already exists, skip) |
| Top bar HTML | Topbar | `shared/shell/topbar.html` (already exists, skip) |
| Page header | Title + "添加客户" | `sections/header.html` |
| Filters toolbar | Scope/search/filter | `sections/filters.html` |
| Table + bulk bar | Customer list | `sections/table.html` |
| Pagination | Page controls | `sections/pagination.html` |
| Create modal | New customer form | `sections/create-modal.html` |
| Toast container | Feedback messages | `sections/toast.html` |
| Config object | Columns/filters/form | `data/customer-config.js` |
| Page init script | Bootstrap + toast | `scripts/customer-page.js` |
| Modal script | Open/close/validate | `scripts/customer-modal.js` |
| Draft script | localStorage CRUD | `scripts/customer-drafts.js` |
| Bulk actions script | Select/assign/group | `scripts/customer-bulk-actions.js` |

## Step 3 — Determine shared vs module-page boundary

Apply the rule: "delete the module name and see if it still holds."

| Item | Module-specific? | Decision |
|------|-----------------|----------|
| `:root` CSS variables | No | `shared/` — already extracted |
| `.btn-primary`, `.chip` | No | `shared/` — already extracted |
| Side nav, topbar | No | `shared/` — already extracted |
| Customer table columns | Yes (customer fields) | Module page layer |
| Customer form schema | Yes (customer fields) | Module page layer |
| localStorage draft key | Yes ("customer-draft") | Module page layer |
| Mobile nav toggle | No | `shared/scripts/mobile-nav.js` — already extracted |

## Step 4 — Build sections/scripts/data structure

Create the target directory:

```
customers/
├── index.html                 ← slimmed entry (shared refs + section includes + script refs)
├── sections/
│   ├── header.html
│   ├── filters.html
│   ├── table.html
│   ├── pagination.html
│   ├── create-modal.html
│   └── toast.html
├── scripts/
│   ├── customer-page.js
│   ├── customer-modal.js
│   ├── customer-drafts.js
│   └── customer-bulk-actions.js
└── data/
    └── customer-config.js
```

## Step 5 — Write P0-CONTRACT.md

From the page spec, extract the P0 acceptance baseline:

- **§1 必保留列定义**: 8 columns (客户, フリガナ, 累计案件, 活跃案件, 最近联系, 负责人, 介绍人/来源, 所属分组)
- **§2 列表搜索与筛选**: scope tabs, keyword search, status filter, group filter
- **§3 操作与交互**: 添加客户, 批量指派, 批量调组
- **§4 状态与异常态**: empty state, draft recovery, dedup hint, permission denied
- **§5 Demo 能力标注**: localStorage persistence, hardcoded demo data, static toast text

## Step 6 — Write SPLIT-ARCHITECTURE.md

Define the target directory structure, each layer's responsibilities, the shared/page boundary, and recommended split sequence (Step 1: extract shared → Step 2: create sections → Step 3: create data → Step 4: create scripts → Step 5: slim index.html).

## Step 7 — Write MIGRATION-MAPPING.md

Map each prototype artifact to the four production layers:

| Prototype | Production target |
|-----------|------------------|
| `data/customer-config.js` → columns/filters | `domain/customer/Customer.ts` types + constants |
| `data/customer-config.js` → form schema | `domain/customer/Customer.ts` `CreateCustomerInput` |
| `scripts/customer-page.js` | `features/customer/model/useCustomerListViewModel.ts` |
| `scripts/customer-modal.js` | `features/customer/model/useCreateCustomerModal.ts` |
| `scripts/customer-drafts.js` | `features/customer/model/useCustomerDrafts.ts` |
| `scripts/customer-bulk-actions.js` | `features/customer/model/useCustomerBulkActions.ts` |
| `sections/table.html` | `features/customer/ui/CustomerListScreen.tsx` |
| `sections/create-modal.html` | `features/customer/ui/CreateCustomerModal.tsx` |

## Step 8 — Generate split-manifest.json

Fill in all required keys: `module`, `entryFile`, `sections`, `dataFiles`, `scripts`, `sharedCandidates`, `referenceDocs`, `productionMapping`, `regressionChecklist`.

## Step 9 — Validate

- [ ] demo-only capabilities identified (localStorage, hardcoded data)
- [ ] out-of-scope items listed (P1 features)
- [ ] regression checklist covers all visible behaviors
- [ ] manifest required keys all present
- [ ] file naming is kebab-case throughout
