# Example Walkthrough: Customer Domain Test Suggestions

> Hypothetical example based on real repo structures, demonstrating the test-case-suggester skill.
> Target: `domain/customer/` and `features/customer/model/`

---

## Scenario

User request: "我修改了客户模块的去重逻辑和批量操作，帮我看看需要补哪些测试。"

`git diff --name-only` output:

```
packages/mobile/src/domain/customer/CustomerRepository.ts
packages/mobile/src/features/customer/model/useCreateCustomerModal.ts
packages/mobile/src/features/customer/model/useCustomerBulkActions.ts
```

## Step 1 — Classify changed files by layer

| File | Layer | Test priority |
|------|-------|---------------|
| `CustomerRepository.ts` | domain | **必须** — domain 接口变更影响所有下游 |
| `useCreateCustomerModal.ts` | model | **必须** — ViewModel 逻辑变更 |
| `useCustomerBulkActions.ts` | model | **必须** — ViewModel 逻辑变更 |

Rule from `AGENTS.md`: "新增/修改逻辑必须补单测；优先覆盖 model / domain / data"

## Step 2 — Analyze changes and suggest tests

### `CustomerRepository.ts` — interface change

Change: `checkDuplicates` now accepts optional `nationality` parameter.

```typescript
// Before
checkDuplicates(phone?: string, email?: string): Promise<DuplicateCandidate[]>;

// After
checkDuplicates(phone?: string, email?: string, nationality?: string): Promise<DuplicateCandidate[]>;
```

**Suggested tests:**

| # | Test case | Priority | Layer |
|---|-----------|----------|-------|
| 1 | `checkDuplicates` returns matches by phone only | 必须 | domain |
| 2 | `checkDuplicates` returns matches by email only | 必须 | domain |
| 3 | `checkDuplicates` returns matches by phone + nationality | 必须 | domain |
| 4 | `checkDuplicates` returns empty when no match | 必须 | domain |
| 5 | `checkDuplicates` with all params undefined returns empty | 应当 | domain |

### `useCreateCustomerModal.ts` — dedup hint logic change

Change: `updateDedupeHint` now triggers on nationality field change in addition to phone/email.

**Suggested tests:**

| # | Test case | Priority | Layer |
|---|-----------|----------|-------|
| 1 | Dedup hint updates when phone changes | 必须 | model |
| 2 | Dedup hint updates when email changes | 必须 | model |
| 3 | Dedup hint updates when nationality changes | 必须 | model |
| 4 | Dedup hint clears when all trigger fields are empty | 必须 | model |
| 5 | `canCreate` remains false until required fields filled | 应当 | model |
| 6 | Submit calls `customerRepository.createCustomer` with correct input | 必须 | model |

### `useCustomerBulkActions.ts` — bulk group change

Change: `changeGroup` now validates that target group differs from current.

**Suggested tests:**

| # | Test case | Priority | Layer |
|---|-----------|----------|-------|
| 1 | `changeGroup` succeeds when target differs from current | 必须 | model |
| 2 | `changeGroup` rejects when target equals current group | 必须 | model |
| 3 | `changeGroup` clears selection after success | 应当 | model |
| 4 | `assignOwner` still works independently | 应当 | model |
| 5 | `toggleSelectAll` excludes draft rows | 应当 | model |

## Step 3 — Generate test skeleton

```typescript
// useCreateCustomerModal.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('useCreateCustomerModal', () => {
  const mockRepository = {
    checkDuplicates: vi.fn().mockResolvedValue([]),
    createCustomer: vi.fn().mockResolvedValue({ id: 'cust-1' }),
    // ... other methods
  };

  describe('dedup hint', () => {
    it('updates when phone changes', async () => {
      // arrange: render hook with mockRepository
      // act: set phone field value
      // assert: checkDuplicates called with phone
    });

    it('updates when nationality changes', async () => {
      // arrange: render hook with mockRepository
      // act: set nationality field value
      // assert: checkDuplicates called with nationality
    });

    it('clears when all trigger fields empty', async () => {
      // arrange: hook with existing duplicates
      // act: clear phone, email, nationality
      // assert: duplicates list is empty
    });
  });
});
```

## Key patterns

1. **Domain tests** — test interface contracts via mock implementations
2. **Model tests** — inject stub repositories, test state transitions
3. **No real network requests** — all tests use `vi.fn()` or injected stubs (AGENTS.md rule)
4. **Priority labels** — 必须 (must have) / 应当 (should have) guide review focus
