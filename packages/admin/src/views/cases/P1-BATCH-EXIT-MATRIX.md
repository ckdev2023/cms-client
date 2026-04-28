# P1 Batch Exit Command Matrix

> Frozen by `p1-qa-002-01-p1-batch-exit-command-matrix`.
> Every P1 batch/PR MUST pass all three gates before merge.
> Script: `packages/admin/scripts/p1-batch-exit-matrix.sh <batch>`

## Three Gates (mandatory for every P1 batch)

| Gate | Command           | Scope                 | What it checks                                                                                                                                                                                                    |
| ---- | ----------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | `npm run fix`     | root (all workspaces) | `format` + `lint:fix` — auto-fix before validation                                                                                                                                                                |
| 1    | `npm run guard`   | root (all workspaces) | `check:deps` + `typecheck` + `lint` + `test` + `build` (admin); `lint` + `typecheck` + `arch:check` + `db:migrations:check` + `db:drizzle:check` + `lock:check` + `secrets:check` + `test` (server); mobile guard |
| 2    | Incremental tests | batch-specific        | Focused test patterns targeting P1 modules and downstream consumers                                                                                                                                               |

## Per-Batch Incremental Test Matrix

### Batch 4: P1-A — 经营管理签 Step 1–14

- **Scope**: server (template, questionnaire, workflow-step, pre-sign gate, BMV submission cycle) + admin (BMV steps, survey/quote, workflow-step, pre-sign gate, write actions)
- **Exit**: Gate 0 + Gate 1 + all patterns below pass + BMV source-of-truth / questionnaire / pricing / workflow-step read-write paths consistent

#### Server Incremental Patterns

| Layer                       | Test file patterns                                                   |
| --------------------------- | -------------------------------------------------------------------- |
| Template foundation         | `cases.template-foundation.focused*`                                 |
| Template BMV                | `cases.template-bmv*`, `bmvTemplateConfig*`                          |
| Template blueprints         | `cases.types-template-blueprints*`                                   |
| BMV gate types              | `cases.types-bmv-gate*`                                              |
| Survey / visa / quote types | `cases.types-survey-visa-quote*`                                     |
| Questionnaire / docs        | `cases.questionnaire-docs.focused*`                                  |
| Pre-sign gate               | `cases.pre-sign-gate.focused*`                                       |
| Workflow step               | `cases.workflow-step.focused*`, `cases.workflow-step-integration*`   |
| BMV submission cycle        | `cases.bmv-submission-cycle.focused*`                                |
| P1-A regression             | `cases.regression-p1-questionnaire-supplement*`                      |
| Portal (intake/leads)       | `intake.service*`, `intake.types*`, `leads.service*`, `leads.types*` |

#### Admin Incremental Patterns

| Layer                       | Test file patterns                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| BMV steps constants         | `constantsBmvSteps*`                                                                                |
| BMV contract adapter        | `CaseAdapterDetailAggregate.bmv-contract*`                                                          |
| Survey/quote adapter        | `CaseAdapterDetailAggregate.survey-quote*`                                                          |
| Pre-sign gate model         | `useCreateCaseModel.pre-sign-gate*`                                                                 |
| Create flow                 | `useCreateCaseModel.create-flow*`, `useCreateCaseModel.focused*`                                    |
| Survey/quote write actions  | `useCaseDetailWriteActions.survey-quote.focused*`                                                   |
| P1 QA — step mapping        | `p1-qa-step-mapping-adapter.focused*`                                                               |
| P1 QA — button guard matrix | `p1-qa-button-guard-matrix.focused*`                                                                |
| P1 QA — write error mapping | `p1-qa-write-actions-error-mapping.focused*`                                                        |
| Overview/info contract      | `CaseAdapterDetailAggregate.overview-contract*`, `CaseAdapterDetailAggregate.info-contract*`        |
| Validation/billing seam     | `CaseAdapterSupportSeams.validation-billing-focused*`                                               |
| Customer downstream smoke   | `CustomerCasesQueryContract*`, `CustomerCreateCaseEntryContract*`, `useCustomerCasesModel.focused*` |

### Batch 5: P1-B — 经营管理签 Step 15–20

- **Scope**: server (final payment, COE gate, overseas branching, visa outcome, residence closeout, failure closeout, success closeout, residence-periods, reminders, billing) + admin (final-payment gate, COE/residence/reminder, closeout, failure path, exception paths)
- **Exit**: Gate 0 + Gate 1 + all patterns below pass + P1 downstream validation set pass (see `P1-DOWNSTREAM-VALIDATION-SET.md`) + residence-periods / reminders / closeout rules end-to-end verified

#### Server Incremental Patterns

| Layer                      | Test file patterns                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Final payment types        | `cases.types-final-payment*`                                                                                                   |
| Final payment / COE guard  | `cases.final-payment-coe-guard.focused*`, `cases.coe-block-guard.focused*`                                                     |
| Overseas step types        | `cases.types-overseas-step*`                                                                                                   |
| Overseas step branching    | `cases.overseas-step-branching.focused*`, `cases.overseas-step-stamps.focused*`                                                |
| Visa outcome               | `cases.visa-outcome.focused*`                                                                                                  |
| Residence closeout types   | `cases.types-residence-closeout*`                                                                                              |
| Failure closeout types     | `cases.types-failure-closeout*`                                                                                                |
| Closeout rules             | `cases.closeout-rules.focused*`, `cases.success-closeout-gate.focused*`                                                        |
| P1-B regression — COE/visa | `cases.regression-p1-coe-visa-residence*`                                                                                      |
| P1-B regression — reminder | `cases.regression-p1-reminder-closeout*`                                                                                       |
| Residence periods module   | `residencePeriods.service*`, `residencePeriods.focused*`, `residencePeriods.reminder-blueprint*`, `reminderBlueprintContract*` |
| Reminders module           | `reminders.service*`                                                                                                           |
| Billing module             | `billingPlans.service*`, `paymentRecords.service*`                                                                             |

#### Admin Incremental Patterns

| Layer                        | Test file patterns                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Final payment gate adapter   | `CaseAdapterDetailAggregate.final-payment-gate*`                                                                                  |
| Residence/reminder adapter   | `CaseAdapterDetailAggregate.residence-reminder*`                                                                                  |
| BMV failure path adapter     | `CaseAdapterDetailAggregate.bmv-failure-path*`                                                                                    |
| COE/residence write actions  | `useCaseDetailWriteActions.coe-residence-reminder.focused*`                                                                       |
| Exception path write actions | `useCaseDetailWriteActions.exception-paths.focused*`                                                                              |
| Closeout model               | `useCaseDetailCloseout.focused*`                                                                                                  |
| Overview/info contract       | `CaseAdapterDetailAggregate.overview-contract*`, `CaseAdapterDetailAggregate.info-contract*`                                      |
| P1 QA (full suite)           | `p1-qa-step-mapping-adapter.focused*`, `p1-qa-button-guard-matrix.focused*`, `p1-qa-write-actions-error-mapping.focused*`         |
| Customer downstream full     | `CustomerCasesQueryContract*`, `CustomerCreateCaseEntryContract*`, `CustomerCreateCaseEntryRegression*`, `useCustomerCasesModel*` |
| P1 downstream validation set | `p1-downstream-validation-set*`                                                                                                   |
| Documents downstream         | `src/views/documents/**/*`                                                                                                        |
| Dashboard downstream         | `QuickActionsPanel*`, `useDashboardModel*`, `workPanelData*`                                                                      |

## Execution

### Full exit (before merge)

```bash
# Option A: dedicated P1 script
./packages/admin/scripts/p1-batch-exit-matrix.sh 4     # P1-A
./packages/admin/scripts/p1-batch-exit-matrix.sh 5     # P1-B

# Option B: root unified script
scripts/batch-exit-matrix.sh b4                         # P1-A
scripts/batch-exit-matrix.sh b5                         # P1-B
```

### Incremental only (fast iteration)

```bash
# Option A: dedicated P1 script
./packages/admin/scripts/p1-batch-exit-matrix.sh 4 --inc
./packages/admin/scripts/p1-batch-exit-matrix.sh 5 --inc

# Option B: root unified script
scripts/batch-exit-matrix.sh b4 --inc
scripts/batch-exit-matrix.sh b5 --inc
```

### Dry run (inspect commands)

```bash
./packages/admin/scripts/p1-batch-exit-matrix.sh 4 --dry-run
./packages/admin/scripts/p1-batch-exit-matrix.sh 5 --dry-run
```

## Rules

1. **Every P1 batch/PR executes all three gates** — the final batch/phase closeout only does a summary review, it does not substitute for earlier missing gate runs.
2. **Gate 0 and Gate 1 are always full-workspace** — they are not scoped to a single package.
3. **Gate 2 incremental tests are additive** — Batch 5 includes its own patterns but does NOT re-run Batch 4 patterns (those were already validated).
4. **P0 baseline must be stable** — P1 batches assume P0 (Batch 0–3) exit matrices already passed. If P0 patterns regress, fix P0 first.
5. **Downstream validation** — Batch 4 includes customer downstream smoke; Batch 5 extends to full customer/documents/dashboard downstream.
6. **No silent degradation** — if a previously passing test starts failing due to a change in the current batch, the exit matrix fails and the batch cannot merge.
7. **BMV source-of-truth consistency** — Batch 4 must confirm no drift between `customer` / `case` / `CaseTemplate` / `CaseWorkflowStep` for BMV fields before merge.
