# P1 Downstream Validation Set

> Frozen by `p1-qa-002-02-p1-downstream-validation-set`.
> Any change to P1 adapter outputs, BMV step blueprint, COE gate, residence period,
> reminder schedule, supplement round, closeout checks, or survey/quote/pre-sign gate
> MUST run the downstream validation set and confirm all tests pass.
> Test: `npx vitest run src/views/cases/p1-downstream-validation-set.test.ts`

## Trigger Conditions

Changes to ANY of the following MUST trigger a P1 downstream validation run:

| Trigger                               | Files                                                                                                                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BMV workflow step blueprint           | `constantsBmvSteps.ts` (BMV_WORKFLOW_STEPS, BMV_WORKFLOW_STEP_MAP, getBmvStageGroups)                                                                                                                                    |
| BMV detail adapter fields             | `CaseAdapterDetailAggregate.ts` (buildP1Fields, buildBmvFields, buildWorkflowStepSummary)                                                                                                                                |
| Final payment / COE gate adapter      | `CaseAdapterFinalPaymentGate.ts` (buildFinalPaymentGate)                                                                                                                                                                 |
| Residence / reminder adapter          | `CaseAdapterResidenceReminder.ts` (buildResidencePeriodPanel, buildReminderSchedulePanel, buildSuccessCloseoutInfo)                                                                                                      |
| Supplement / reminder-failure adapter | `CaseAdapterSupplementReminder.ts` (buildSupplementRoundInfo, buildReminderFailureInfo)                                                                                                                                  |
| P1 detail contract fields             | `CaseAdapterDetailContracts.ts` (BMV*CASE_RECORD_CONSUMED_FIELDS, BMV_DETAIL_TARGET_KEYS, FAILURE_CLOSEOUT*_, RESIDENCE*PERIOD*_, SUCCESS*CLOSEOUT*\*)                                                                   |
| P1 detail types                       | `types-detail.ts` (WorkflowStepSummary, FinalPaymentGateInfo, ResidencePeriod, ReminderSchedule, SuccessCloseoutInfo, SupplementRoundInfo, ReminderFailureInfo, FailureCloseoutInfo, SurveyQuoteStatus, PreSignGateInfo) |
| P1 write actions                      | `useCaseDetailWriteActions.ts` (transitionWorkflowStep, advancePostApprovalStage, retryReminderCreation, failureClose, updateCaseFields)                                                                                 |
| Survey / quote / pre-sign gate logic  | `CaseAdapterDetailAggregate.ts` (buildSurveyStatus, buildQuoteStatus, buildPreSignGate)                                                                                                                                  |

## Downstream Consumer Inventory

### 1. BMV Workflow Steps

Consumer files:

- `components/CaseWorkflowStepSection.vue` — renders step progress, current/completed/upcoming states
- `components/CaseProviderProgress.vue` — renders provider progress alongside steps
- `model/CaseAdapterDetailAggregate.ts` — `buildWorkflowStepSummary()` / `buildBmvFields()`
- `constantsBmvSteps.ts` — step blueprint, stage grouping, label/i18n lookup

Validation tests:
| Test file | What it locks |
| --------- | ------------- |
| `constantsBmvSteps.focused.test.ts` | Step ordering invariants, stage grouping, highlighting algorithm, label/i18n fallback |
| `model/CaseAdapterDetailAggregate.bmv-contract.test.ts` | BMV field mapping contract, step summary construction, non-BMV degradation |

### 2. Survey / Quote / Pre-Sign Gate

Consumer files:

- `components/CaseSurveyQuoteSection.vue` — renders survey progress, quote status, pre-sign gate
- `components/CaseCreatePreSignGate.vue` — renders create-flow pre-sign gate with blockers
- `model/CaseAdapterDetailAggregate.ts` — `buildSurveyStatus()` / `buildQuoteStatus()` / `buildPreSignGate()`

Validation tests:
| Test file | What it locks |
| --------- | ------------- |
| `model/CaseAdapterDetailAggregate.survey-quote.test.ts` | Survey/quote status derivation, pre-sign gate blocker logic, non-BMV null return |
| `model/useCreateCaseModel.pre-sign-gate.test.ts` | Create-flow pre-sign gate integration |

### 3. Final Payment / COE Gate

Consumer files:

- `components/CaseFinalPaymentCoeGate.vue` — renders payment status, COE advance button, blockers
- `model/CaseAdapterFinalPaymentGate.ts` — `buildFinalPaymentGate()`
- `model/CaseAdapterDetailAggregate.ts` — wires `buildFinalPaymentGate()` into P1 fields

Validation tests:
| Test file | What it locks |
| --------- | ------------- |
| `model/CaseAdapterDetailAggregate.final-payment-gate.test.ts` | COE gate activation conditions, blocker generation, non-BMV null return |

### 4. Residence Period & Reminder Schedule

Consumer files:

- `model/CaseAdapterResidenceReminder.ts` — `buildResidencePeriodPanel()` / `buildReminderSchedulePanel()`
- `model/CaseAdapterDetailAggregate.ts` — wires residence/reminder into P1 fields
- `CaseDetailView.vue` — conditional rendering of residence period panel
- `components/CaseCloseoutChecklist.vue` — reads `successCloseout.preconditions` (RESIDENCE_PERIOD_RECORDED)

Validation tests:
| Test file | What it locks |
| --------- | ------------- |
| `model/CaseAdapterDetailAggregate.residence-reminder.test.ts` | Residence panel construction, reminder schedule generation, null/empty handling |

### 5. Supplement Round & Reminder Failure

Consumer files:

- `components/CaseSupplementRoundPanel.vue` — renders supplement round status, deadline, resubmit action
- `components/CaseReminderFailureBanner.vue` — renders reminder failure reason, retry action
- `model/CaseAdapterSupplementReminder.ts` — `buildSupplementRoundInfo()` / `buildReminderFailureInfo()`

Validation tests:
| Test file | What it locks |
| --------- | ------------- |
| (covered by `CaseAdapterDetailAggregate.bmv-contract.test.ts`) | Supplement round and reminder failure in aggregate pipeline |

### 6. Failure Closeout

Consumer files:

- `components/CaseFailureCloseoutBanner.vue` — renders failure path banner, reason, close action
- `model/CaseAdapterDetailAggregate.ts` — `buildFailureCloseoutInfo()`
- `model/useCaseDetailWriteActions.ts` — `failureClose()` action

Validation tests:
| Test file | What it locks |
| --------- | ------------- |
| `model/CaseAdapterDetailAggregate.bmv-failure-path.test.ts` | Failure closeout info construction, attribution parsing, non-failure null return |

### 7. Success Closeout

Consumer files:

- `components/CaseCloseoutChecklist.vue` — renders success closeout precondition checklist
- `model/CaseAdapterResidenceReminder.ts` — `buildSuccessCloseoutInfo()`
- `model/CaseAdapterDetailAggregate.ts` — wires `buildSuccessCloseoutInfo()` into P1 fields

Validation tests:
| Test file | What it locks |
| --------- | ------------- |
| `model/CaseAdapterDetailAggregate.residence-reminder.test.ts` | Success closeout precondition parsing, allSatisfied flag |

### 8. P1 Write Actions (Aggregate)

Consumer files:

- `model/useCaseDetailWriteActions.ts` — orchestrates all P1 write actions
- `model/useCaseDetailModel.ts` — exposes write actions to views
- `CaseDetailView.vue` — binds write action handlers

Validation tests:
| Test file | What it locks |
| --------- | ------------- |
| `model/useCaseDetailWriteActions.coe-residence-reminder.focused.test.ts` | COE advance, residence period recording, reminder retry write paths |
| `model/useCaseDetailWriteActions.exception-paths.focused.test.ts` | Failure close, gate block feedback, readonly guard |
| `model/useCaseDetailWriteActions.survey-quote.focused.test.ts` | Survey/quote field update write paths |

## Aggregate Test Command

```bash
npx vitest run src/views/cases/p1-downstream-validation-set.test.ts
```

This meta-test validates all P1 downstream entry points as a single runnable suite.

## Rules

1. **Any PR touching trigger files MUST run the P1 validation set** — do not rely on full `npm run guard` alone; the validation set provides focused, fast feedback.
2. **New P1 downstream consumers MUST be registered** — add the consumer to the appropriate section above and add corresponding tests.
3. **Removing a consumer** requires updating both the test file and this document.
4. **Test ownership boundaries still apply** — this set validates integration contracts in-line; each focused test file retains its own ownership header.
5. **P0 downstream validation set remains independent** — changes to P0-only trigger files do not require re-running the P1 set, and vice versa. Changes to shared files (e.g. `CaseAdapterDetailAggregate.ts`, `types-detail.ts`) MUST run both.
