# P0 Downstream Validation Set

> Frozen by `p0-qa-002-02-downstream-validation-set`.
> Any change to `/api/cases`, case detail deep-links, or cross-module link builders
> MUST run the downstream validation set and confirm all tests pass.
> Test: `npx vitest run src/views/cases/downstream-validation-set.test.ts`

## Trigger Conditions

Changes to ANY of the following MUST trigger a downstream validation run:

| Trigger                     | Files                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| `/api/cases` response shape | `CaseAdapterMappers.ts`, `CaseAdapterTypes.ts`, `CaseAdapterReaders.ts`                           |
| Case detail aggregate DTO   | `CaseAdapterDetailAggregate.ts`, `CaseAdapterTypes.ts`                                            |
| Cross-module link builders  | `query.ts` (buildCaseDetailHref, buildCaseListHref, buildCaseCreateHref, buildCustomerDetailHref) |
| Deep-link protocol          | `query.ts` (parseCaseDetailQuery, resolveDetailTab, CASE_CROSS_MODULE_LINK_CONTRACT)              |
| Customer downstream fields  | `CaseAdapterTypes.ts` (CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS, CUSTOMER_DOWNSTREAM_FIELD_MAP)         |
| Tab schema / constants      | `constants.ts` (CASE_DETAIL_TAB_KEYS), `query.ts` (DEFAULT_CASE_DETAIL_TAB)                       |

## Downstream Consumer Inventory

### 1. `/api/cases` — Customer Related Cases

Consumer files:

- `customers/model/CustomerAdapterMappers.ts` — `adaptCustomerCaseListResult`
- `customers/model/CustomerAdapterTypes.ts` — `CUSTOMER_CASES_QUERY_HTTP_CONTRACT`
- `customers/model/useCustomerCasesModel.ts` — calls `/api/cases?customerId=&view=summary`
- `customers/model/CustomerRepository.ts` — `listRelatedCases()`

Validation tests:
| Test file | What it locks |
| --------- | ------------- |
| `customers/model/CustomerCasesQueryContract.test.ts` | HTTP param alignment, adapter field contract, cross-adapter DTO compatibility |
| `customers/model/useCustomerCasesModel.focused.test.ts` | Shared HTTP param contract, adapter DTO→CustomerCase contract, field set alignment, deep-link navigation, routeTab sync |
| `customers/model/useCustomerCasesModel.query-contract.test.ts` | query-level alignment, adapter reuse boundary |
| `cases/model/CaseListSummaryDownstream.test.ts` | Cross-adapter contract, minimum field preservation, name fallback chain |
| `cases/model/CaseListContractIntegration.test.ts` | Full pipeline: query→searchParams→adapter→summary→customer downstream |

### 2. `/api/cases` — Customer → Case Create Entry

Consumer files:

- `customers/model/CustomerAdapterTypes.ts` — `CUSTOMER_CREATE_CASE_ENTRY_CONTRACT`
- `customers/components/CustomerCasesTab.vue` — create-case buttons
- `customers/components/CustomerTableRow.vue` — inline create-case link

Validation tests:
| Test file | What it locks |
| --------- | ------------- |
| `customers/model/CustomerCreateCaseEntryContract.test.ts` | Contract shape, query params, default key propagation |
| `customers/model/CustomerCreateCaseEntryRegression.test.ts` | Entry→model round-trip, default inheritance, edge cases |
| `customers/model/useCustomerCasesModel.navigation-contract.test.ts` | Known customer entry, synthesized defaults, return links, query round-trips |
| `customers/model/useCustomerCasesModel.customer-entry-regression.test.ts` | Customer-entry regression scenarios |
| `customers/model/useCustomerCreateCaseGateModel.test.ts` | Create-case gate logic from customer detail |
| `cases/query.family-entry-contract.test.ts` | Family-bulk entry query contract |

### 3. Cross-Module Deep-Link Protocol

Consumer files:

- `documents/components/DocumentTableRow.vue` — `buildCaseDetailHref(caseId, 'documents')`
- `documents/components/SharedExpiryRiskPanel.vue` — `buildCaseDetailHref(caseId)`
- `dashboard/QuickActionsPanel.vue` — case create navigation
- `customers/components/CustomerTableRow.vue` — `buildCaseListHref({ customerId })`
- `customers/components/CustomerCasesTab.vue` — `buildCaseDetailRoute(caseId)`

Validation tests:
| Test file | What it locks |
| --------- | ------------- |
| `cases/query.cross-module-link-contract.test.ts` | CASE_CROSS_MODULE_LINK_CONTRACT frozen shape, 14 consumers, builder alignment |
| `cases/query.cross-module-link-focused.test.ts` | All entry navigation round-trips, back-link consistency, tab query preservation |
| `cases/query.cross-module-regression.test.ts` | End-to-end cross-module navigation chains, model integration |
| `cases/query.deeplink-regression.test.ts` | Tab deep-link lifecycle, refresh, shared link, back/forward |
| `cases/query.tab-schema.test.ts` | Tab schema frozen shape |
| `cases/query.detail-deeplink.test.ts` | Detail deep-link builder unit tests |

### 4. Dashboard

Consumer files:

- `dashboard/QuickActionsPanel.vue` — `router.push({ name: 'case-create' })`
- `dashboard/workPanelData.ts` — work panel case links (API-driven)

Validation tests:
| Test file | What it locks |
| --------- | ------------- |
| `dashboard/QuickActionsPanel.test.ts` | Navigation to `/cases/create`, route existence |
| `dashboard/workPanelData.test.ts` | Panel structure (indirect — panel items use API-driven routes) |
| `dashboard/model/useDashboardModel.test.ts` | Dashboard model (indirect — consumes case-related data) |

### 5. Documents

Consumer files:

- `documents/components/DocumentTableRow.vue` — `buildCaseDetailHref(item.caseId, 'documents')`
- `documents/components/SharedExpiryRiskPanel.vue` — `buildCaseDetailHref(caseId)`

Validation tests:
| Test file | What it locks |
| --------- | ------------- |
| (covered by cross-module link tests above) | documentTableRow and sharedExpiryRiskPanel consumers in CASE_CROSS_MODULE_LINK_CONTRACT |

### 6. Cases Internal (Baseline)

Consumer files:

- `cases/CaseListView.vue`, `cases/CaseDetailView.vue`, `cases/CaseCreateView.vue`
- `cases/model/useCaseListModel.ts`, `cases/model/useCaseDetailModel.ts`, `cases/model/useCreateCaseModel.ts`

Validation tests:
| Test file | What it locks |
| --------- | ------------- |
| `cases/model/CaseRepository.consumer-readiness.test.ts` | Adapter/builder/repository base stability for downstream consumers |
| `cases/model/caseListRepository.focused.test.ts` | List repository contract |

## Aggregate Test Command

```bash
npx vitest run src/views/cases/downstream-validation-set.test.ts
```

This meta-test imports and re-exports all downstream validation tests as a single runnable suite.

## Rules

1. **Any PR touching trigger files MUST run the validation set** — do not rely on full `npm run guard` alone; the validation set provides focused, fast feedback.
2. **New downstream consumers MUST be registered** — add the consumer to `CASE_CROSS_MODULE_LINK_CONTRACT` in `query.ts` and add corresponding tests to this set.
3. **Removing a consumer** requires updating both the contract and this document.
4. **Test ownership boundaries still apply** — this set aggregates existing tests, it does not duplicate their coverage. Each test file retains its own ownership header.
