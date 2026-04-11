# Example Walkthrough: Guardrail Run for Billing Module

> Hypothetical example based on real repo scripts, demonstrating the delivery-guardrail skill.
> Scripts: `npm run fix` + `npm run guard` defined in `package.json`

---

## Scenario

User request: "我改完了 billing 模块的拆分，帮我跑收尾门禁。"

Changed files (from `git diff --name-only`):

```
packages/prototype/admin/billing/index.html
packages/prototype/admin/billing/sections/billing-table.html
packages/prototype/admin/billing/scripts/billing-page.js
packages/prototype/admin/billing/data/billing-config.js
packages/prototype/admin/shared/styles/components.css
```

## Step 1 — Run `npm run fix`

```bash
$ npm run fix

> cms-client@0.0.0 fix
> npm run fix --workspaces --if-present

... (auto-fixes formatting, trailing whitespace, import order)
```

Purpose: Auto-fix all fixable lint/format issues before the hard gate check.

## Step 2 — Run `npm run guard`

```bash
$ npm run guard

> cms-client@0.0.0 guard
> npm run guard --workspaces --if-present

> @cms/admin@0.0.0 guard
> npm run lint && npm run typecheck && npm run test

✓ lint passed
✓ typecheck passed
✓ 1 test passed (dummy.test.ts)

> @cms/mobile@0.0.0 guard
> npm run lint && npm run typecheck && npm run arch:check && npm run feature:check && npm run lock:check && npm run secrets:check && npm run test

✓ lint passed
✓ typecheck passed
✓ arch:check passed (dependency-cruiser)
✓ feature:check passed
✓ lock:check passed
✓ secrets:check passed
✓ 42 tests passed
```

## Step 3 — Handle common failures

### Failure: arch:check (dependency-cruiser)

```
ERROR: features/customer/model/useCustomerListViewModel.ts
  → imports from data/customer/CustomerApi.ts
  Rule violated: "features must not import data directly"
```

**Fix**: Replace direct import with dependency injection via AppContainer:

```typescript
// Before (violation)
import { CustomerApi } from '../../../data/customer/CustomerApi';

// After (compliant)
import type { CustomerRepository } from '../../../domain/customer/CustomerRepository';
// Injected via container or Hook parameter
```

### Failure: lint (max-lines)

```
ERROR: packages/mobile/src/features/customer/ui/CustomerTable.tsx
  Line count 523 exceeds maximum of 500
```

**Fix**: Extract `CustomerBulkActionBar` into its own file.

### Failure: typecheck

```
ERROR: TS2345 — Argument of type 'string' is not assignable to 'GroupCode'
  at features/customer/model/useCustomerBulkActions.ts:45
```

**Fix**: Add proper type assertion or narrow the type.

### Failure: test (real network request)

```
ERROR: vitest intercepted real fetch to https://api.example.com/customers
  Rule: "禁止在测试里发起真实网络请求"
```

**Fix**: Mock the repository:

```typescript
const mockRepo: CustomerRepository = {
  listCustomers: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  // ...
};
```

## Step 4 — Verify test coverage for changed logic

Check if changed files have corresponding tests:

| Changed file | Test file exists? | Action |
|-------------|-------------------|--------|
| `billing-page.js` | N/A (prototype JS) | No test needed |
| `billing-config.js` | N/A (prototype JS) | No test needed |
| `shared/styles/components.css` | N/A (CSS) | No test needed |

For production code changes, the rule is: model/domain/data changes **must** have tests.

## Step 5 — Final confirmation

```bash
$ npm run fix
# (no changes — already clean)

$ npm run guard
# ✓ All checks passed

$ git status
# Changes staged, ready to commit
```

## Guardrail script composition

For reference, the guard scripts are composed of:

| Package | `npm run guard` includes |
|---------|-------------------------|
| `@cms/admin` | lint → typecheck → test |
| `@cms/mobile` | lint → typecheck → arch:check → feature:check → lock:check → secrets:check → test |
| `@cms/server` | lint → typecheck → arch:check → db:drizzle:check → db:migrations:check → lock:check → secrets:check → test |

Each sub-check has a specific purpose documented in `references/guardrail-checklist.md`.
