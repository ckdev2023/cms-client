# Example Walkthrough: Customers Module Production Mapping

> Real repo example demonstrating the prototype-to-production-mapping skill.
> Gold sample: `packages/prototype/admin/customers/MIGRATION-MAPPING.md`

---

## Scenario

User request: "为客户模块生成从原型到生产代码的迁移映射。"

Input artifacts (from prototype-module-split):
- `packages/prototype/admin/customers/SPLIT-ARCHITECTURE.md`
- `packages/prototype/admin/customers/split-manifest.json`
- `packages/prototype/admin/customers/data/customer-config.js`
- `packages/prototype/admin/customers/scripts/*.js`

## Step 1 — Identify prototype source artifacts

From `split-manifest.json`, extract the mapping-relevant entries:

| Artifact type | Prototype file | Purpose |
|---------------|----------------|---------|
| Config | `data/customer-config.js` | Column defs, filter options, form schema, toast presets, storage key |
| Script | `scripts/customer-page.js` | Page init, hash routing, toast orchestration |
| Script | `scripts/customer-modal.js` | Modal open/close, validation, dedup hint |
| Script | `scripts/customer-drafts.js` | localStorage draft CRUD |
| Script | `scripts/customer-bulk-actions.js` | Select-all/single, bulk assign/group |
| Section | `sections/table.html` | Table structure with implicit entity shape |

## Step 2 — Map to four production layers

### Domain layer (`domain/customer/`)

Extract **types** from implicit HTML structures and config:

```
Prototype source               → Production target
───────────────────────────────────────────────────
Table row columns (table.html) → CustomerSummary type
FORM_FIELDS (config.js)        → CreateCustomerInput type
Draft localStorage shape       → CustomerDraft type
Dedup hint card                → DuplicateCandidate type
GROUPS / OWNERS (config.js)    → GroupCode / enum constants
```

Extract **repository interfaces** from script behaviors:

```
customer-page.js list+filter   → CustomerRepository.listCustomers()
customer-modal.js create       → CustomerRepository.createCustomer()
customer-modal.js dedup        → CustomerRepository.checkDuplicates()
customer-bulk-actions.js       → CustomerRepository.bulkAssignOwner() / bulkChangeGroup()
customer-drafts.js CRUD        → CustomerDraftRepository (separate interface)
```

### Data layer (`data/customer/`)

```
Static HTML rows    → CustomerApi.ts (HTTP calls)
localStorage ops    → CustomerDraftStorage.ts (implements CustomerDraftRepository)
Combined            → createCustomerRepository.ts (implements CustomerRepository)
```

### Model layer (`features/customer/model/`)

One script → one ViewModel Hook:

```
customer-page.js          → useCustomerListViewModel.ts
customer-modal.js         → useCreateCustomerModal.ts
customer-drafts.js        → useCustomerDrafts.ts
customer-bulk-actions.js  → useCustomerBulkActions.ts
```

### UI layer (`features/customer/ui/`)

One section → one component:

```
sections/header.html       → CustomerListHeader.tsx
sections/filters.html      → CustomerListFilters.tsx
sections/table.html        → CustomerTable.tsx + CustomerBulkActionBar.tsx
sections/pagination.html   → Pagination.tsx (shared/ui)
sections/create-modal.html → CreateCustomerModal.tsx
sections/toast.html        → Toast.tsx (shared/ui)
index.html (assembly)      → CustomerListScreen.tsx
```

## Step 3 — Write productionMapping in split-manifest.json

The mapping is codified in `split-manifest.json` under `productionMapping`:

```json
{
  "productionMapping": {
    "domain": [
      "packages/mobile/src/domain/customer/Customer.ts",
      "packages/mobile/src/domain/customer/CustomerRepository.ts",
      "packages/mobile/src/domain/customer/CustomerDraftRepository.ts",
      "packages/mobile/src/domain/customer/customerConstants.ts"
    ],
    "data": [
      "packages/mobile/src/data/customer/CustomerApi.ts",
      "packages/mobile/src/data/customer/createCustomerRepository.ts",
      "packages/mobile/src/data/customer/CustomerDraftStorage.ts"
    ],
    "model": [
      "packages/mobile/src/features/customer/model/useCustomerListViewModel.ts",
      "packages/mobile/src/features/customer/model/useCreateCustomerModal.ts",
      "packages/mobile/src/features/customer/model/useCustomerDrafts.ts",
      "packages/mobile/src/features/customer/model/useCustomerBulkActions.ts"
    ],
    "ui": [
      "packages/mobile/src/features/customer/ui/CustomerListScreen.tsx",
      "packages/mobile/src/features/customer/ui/CustomerListHeader.tsx",
      "packages/mobile/src/features/customer/ui/CustomerListFilters.tsx",
      "packages/mobile/src/features/customer/ui/CustomerTable.tsx",
      "packages/mobile/src/features/customer/ui/CustomerBulkActionBar.tsx",
      "packages/mobile/src/features/customer/ui/CreateCustomerModal.tsx"
    ],
    "shared": [
      "packages/mobile/src/shared/ui/AppShell.tsx",
      "packages/mobile/src/shared/ui/Pagination.tsx",
      "packages/mobile/src/shared/ui/Toast.tsx"
    ]
  }
}
```

## Step 4 — Write MIGRATION-MAPPING.md

The full output is at `packages/prototype/admin/customers/MIGRATION-MAPPING.md` (451 lines). Key sections:

| Section | Content |
|---------|---------|
| §1 Domain 层映射 | Entity types with TypeScript code, repository interfaces, constants table |
| §2 Data 层映射 | API implementation files, AppContainer registration |
| §3 Features model 层映射 | Script-to-Hook mapping with `原型函数 → Hook 暴露` tables |
| §4 Features UI 层映射 | Section-to-component mapping with Props derivation |
| §5 Shared 层映射 | Shell components, shared hooks, design token migration |
| §6 完整文件树 | Tree diagram of production directory structure |
| §7 迁移顺序建议 | M1→M6 phased migration with dependencies |
| §8 差异备忘 | Prototype vs production behavioral differences |

## Key pattern: Script function → Hook exposure table

This is the most reusable pattern. For each script, a table maps every prototype function to its Hook counterpart:

```
原型函数/行为                       → Hook 暴露
─────────────────────────────────────────────────
DOMContentLoaded 初始化              → useEffect 首次加载
showToast(title, desc)              → toast state + show/dismiss
modal.setup()                       → useCreateCustomerModal() 组合
#new hash → openModal               → 路由 query 参数检测
```

This table structure should be replicated for every module's MIGRATION-MAPPING.md.

## Verification

After generating the mapping, verify against `references/mapping-rules.md`:
- [ ] Every prototype script has a production Hook target
- [ ] Every prototype section has a production component target
- [ ] Domain layer contains only pure TypeScript (no UI framework imports)
- [ ] Features layer does not import from data/infra directly
- [ ] Shared candidates are identified and routed to shared/ui
- [ ] `layer-schema.json` validates the directory structure
