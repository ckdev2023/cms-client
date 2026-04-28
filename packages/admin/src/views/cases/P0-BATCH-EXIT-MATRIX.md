# P0 Batch Exit Command Matrix

> Frozen by `p0-qa-002-01-batch-exit-command-matrix`.
> Every batch/PR MUST pass all three gates before merge.
> Script: `packages/admin/scripts/p0-batch-exit-matrix.sh <batch>`

## Three Gates (mandatory for every batch)

| Gate | Command           | Scope                 | What it checks                                                                                                                                                                                                    |
| ---- | ----------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | `npm run fix`     | root (all workspaces) | `format` + `lint:fix` — auto-fix before validation                                                                                                                                                                |
| 1    | `npm run guard`   | root (all workspaces) | `check:deps` + `typecheck` + `lint` + `test` + `build` (admin); `lint` + `typecheck` + `arch:check` + `db:migrations:check` + `db:drizzle:check` + `lock:check` + `secrets:check` + `test` (server); mobile guard |
| 2    | Incremental tests | batch-specific        | Focused test patterns targeting changed modules and downstream consumers                                                                                                                                          |

## Per-Batch Incremental Test Matrix

### Batch 0: Baseline Freeze

- **Scope**: docs-only — no code changes
- **Incremental tests**: none
- **Exit**: Gate 0 + Gate 1 pass

### Batch 1: P0 Server Main Chain

- **Scope**: `packages/server` — permissions, Gate, contracts, migrations
- **Incremental tests**: `npm run server:guard` (full server pipeline)
- **Exit**: Gate 0 + Gate 1 + server guard pass

### Batch 2: P0 Admin Main Chain

- **Scope**: `packages/admin/src/views/cases` — adapters, repository, composables, query
- **Incremental test patterns** (`vitest run`):

| Layer                     | Test file patterns                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Adapter — list/summary    | `CaseAdapterMappers*`, `CaseAdapterReaders*`                                             |
| Adapter — detail          | `CaseAdapterDetailAggregate*`                                                            |
| Adapter — write           | `CaseAdapterWriteBuilders*`                                                              |
| Adapter — seams           | `CaseAdapterSupportSeams*`                                                               |
| Adapter — mutation        | `CaseAdapterMutationResults*`                                                            |
| Adapter — comms/log       | `CaseCommsLogsAdapter*`                                                                  |
| Repository                | `CaseRepository*`, `repository*`                                                         |
| Contract integration      | `CaseListContractIntegration*`, `CaseListSummaryDownstream*`                             |
| Composables               | `useCaseListModel*`, `useCaseDetailModel*`, `useCreateCaseModel*`, `useCasePartyPicker*` |
| Query / routing           | `query*`, `constants*`, `fixtures*`                                                      |
| i18n                      | `i18n-regression*`, `casesI18n*`                                                         |
| Customer downstream smoke | `CustomerCasesQueryContract*`, `useCustomerCasesModel.focused*`                          |

- **Exit**: Gate 0 + Gate 1 + all patterns above pass

### Batch 3: P0 Cross-Module Closure

- **Scope**: cross-module links, customer → case entry, documents/dashboard/shared panels
- **Incremental test patterns** (`vitest run`):

| Layer                      | Test file patterns                                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cross-module link contract | `query.cross-module-link-contract*`                                                                                                                                         |
| Cross-module link focused  | `query.cross-module-link-focused*`                                                                                                                                          |
| Cross-module regression    | `query.cross-module-regression*`                                                                                                                                            |
| Deep-link regression       | `query.deeplink-regression*`                                                                                                                                                |
| Family entry contract      | `query.family-entry-contract*`                                                                                                                                              |
| Tab schema                 | `query.tab-schema*`                                                                                                                                                         |
| Detail deep-link           | `query.detail-deeplink*`                                                                                                                                                    |
| Customer query contract    | `CustomerCasesQueryContract*`                                                                                                                                               |
| Customer create entry      | `CustomerCreateCaseEntryContract*`, `CustomerCreateCaseEntryRegression*`                                                                                                    |
| Customer cases model       | `useCustomerCasesModel.focused*`, `useCustomerCasesModel.query-contract*`, `useCustomerCasesModel.navigation-contract*`, `useCustomerCasesModel.customer-entry-regression*` |
| Customer detail model      | `useCustomerDetailModel*`                                                                                                                                                   |
| Customer create gate       | `useCustomerCreateCaseGateModel*`                                                                                                                                           |
| Customer cases tab         | `CustomerCasesTab*`                                                                                                                                                         |
| Cases contract integration | `CaseListContractIntegration*`, `CaseListSummaryDownstream*`                                                                                                                |
| Consumer readiness         | `CaseRepository.consumer-readiness*`                                                                                                                                        |
| Case list repository       | `caseListRepository.focused*`                                                                                                                                               |
| Dashboard                  | `QuickActionsPanel*`, `useDashboardModel*`, `workPanelData*`                                                                                                                |
| Documents                  | `src/views/documents/**/*`                                                                                                                                                  |

- **Exit**: Gate 0 + Gate 1 + all patterns above pass + downstream validation set pass (see `P0-DOWNSTREAM-VALIDATION-SET.md`)

### Batch 4: P1-A (Step 1–14)

- **Scope**: server + admin for business-management visa template, questionnaire, pricing, workflow steps
- **Detailed matrix**: see [`P1-BATCH-EXIT-MATRIX.md`](P1-BATCH-EXIT-MATRIX.md) Batch 4 section
- **Script**: `packages/admin/scripts/p1-batch-exit-matrix.sh 4`
- **Exit**: Gate 0 + Gate 1 + P1-A server focused + P1-A admin focused + customer downstream pass

### Batch 5: P1-B (Step 15–20)

- **Scope**: server + admin for COE, overseas re-signing, residence period, auto-reminders, case closure
- **Detailed matrix**: see [`P1-BATCH-EXIT-MATRIX.md`](P1-BATCH-EXIT-MATRIX.md) Batch 5 section
- **Script**: `packages/admin/scripts/p1-batch-exit-matrix.sh 5`
- **Exit**: Gate 0 + Gate 1 + P1-B server focused + P1-B admin focused + cross-module downstream pass

## Execution Order

```
npm run fix          ← Gate 0: auto-fix
npm run guard        ← Gate 1: full pipeline
./packages/admin/scripts/p0-batch-exit-matrix.sh <batch>  ← Gate 2: incremental
```

## Rules

1. **Every batch/PR executes all three gates** — the final batch/phase closeout only does a summary review, it does not substitute for earlier missing gate runs.
2. **Gate 0 and Gate 1 are always full-workspace** — they are not scoped to a single package.
3. **Gate 2 incremental tests are additive** — Batch N includes its own patterns but does NOT re-run Batch N-1 patterns (those were already validated).
4. **Downstream validation** — Batch 2 and Batch 3 include customer downstream smoke tests to catch contract breakage early.
5. **No silent degradation** — if a previously passing test starts failing due to a change in the current batch, the exit matrix fails and the batch cannot merge.
