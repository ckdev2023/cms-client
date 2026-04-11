# Audit: `case-detail-page.js` — Global State Inventory

> Produced by `audit-global-state` task.
> Input: `scripts/case-detail-page.js` (3 311 lines, single IIFE).
> Consumers: `map-render-boundaries`, `define-runtime-api`, `extract-runtime-file`.

---

## 1 External Config Globals (read from `window`)

All declared in `data/case-detail-config.js` and loaded **before** the page script.

| Global name | First ref (line) | Type | Read sites | Write sites |
|---|---|---|---|---|
| `DETAIL_TABS` | 27 | `Array<{key,label,icon,primary}>` | `panels` init, `applyMgmtTabs` | — |
| `DETAIL_SAMPLES` | 213 | `Object<sampleKey, SampleData>` | `initLiveState`, `applySample`, `_findDocItem`, `_reRender`, `_recalcProgress`, init block | — |
| `DETAIL_STAGES` | 270 | `Object<code, {code,label,badge}>` | `applyCaseOverrides`, `syncToListStore`, `_advanceMainStage`, `_registerImmigrationResult`, `_updateHeaderDisplay`, `_refreshActionLabel` | — |
| `DETAIL_TOASTS` | 1578 | `Object<key, {title,desc}>` | `exportBtn` handler | — |
| `BILLING_STATUS` | 151 | `Object<code, {label,badge}>` | `billingBadge()` | — |
| `POST_APPROVAL_STAGES` | 295 | `Object<code, {code,label,badge}>` | `applySample`, `syncToListStore`, `_updateHeaderDisplay`, `_refreshActionLabel` | — |
| `RESULT_OUTCOMES` | — | `Object<code, {code,label,badge}>` | not directly consumed in JS (HTML only) | — |
| `CASE_ID_MAP` | 178 | `Object<caseId, {...}>` | `resolveUrlCaseContext()` | — |
| `DETAIL_WAIVE_REASONS` | 2030 | `Object<code, label>` | waive confirm handler | — |
| `DETAIL_REFERENCE_CANDIDATES` | 2179 | `Array<CandidateObj>` | `openReference`, reference confirm handler | — |
| `DETAIL_PATH_RULES` | 2074 | `{forbiddenPatterns,forbiddenLeadingChars,forbiddenCharsRegex}` | `_validatePath()` | — |

---

## 2 IIFE-Level Constants

| Name | Line | Value / Purpose |
|---|---|---|
| `ACTIVE_TAB_CLS` | 20 | `'is-active'` — CSS class toggled on tabs & panels |
| `SECONDARY_TAB_KEYS` | 22 | Hash map of tab keys rendered under "More" menu |
| `CASE_DETAIL_CONTEXT_KEY` | 159 | `'prototype.caseDetailContext'` — sessionStorage key |
| `CASE_LIST_DRAFTS_KEY` | 160 | `'prototype.caseListDrafts'` — sessionStorage key |

---

## 3 Top-Level DOM References

Variables declared at IIFE scope that cache DOM elements.

### 3.1 Tab navigation

| Variable | Line | Selector / ID | Cross-function consumers |
|---|---|---|---|
| `primaryTabs` | 16 | `.detail-tab[data-tab]` | `setActiveTab` |
| `secondaryTabs` | 17 | `.more-tabs-menu-item[data-tab]` | `setActiveTab` |
| `allTabLinks` | 18 | concat of above | click handler (L69) |
| `panels` | 19 | `{key: #tab-{key}}` built from `DETAIL_TABS` | `setActiveTab`, `resolveHashTab`, `applyMgmtTabs` |
| `moreWrapper` | 23 | `#moreTabsWrapper` | trigger click, outside-click dismiss |
| `moreTrigger` | 24 | `#moreTabsTrigger` | click handler, `setActiveTab` |
| `moreMenu` | 25 | `#moreTabsMenu` | declared only (accessed via wrapper) |

### 3.2 Sample switching

| Variable | Line | Selector / ID | Cross-function consumers |
|---|---|---|---|
| `sampleSelect` | 342 | `#caseSampleSelect` | change handler (×2), init block |

### 3.3 Risk confirmation modal

| Variable | Line | Selector / ID | Cross-function consumers |
|---|---|---|---|
| `riskModal` | 1483 | `#riskConfirmModal` | close handler, `rebindRiskTrigger`, `riskSubmitBtn` handler |
| `riskSubmitBtn` | 1738 | `#riskConfirmSubmit` | click handler (L1740) |

### 3.4 Overview UI toggles

| Variable | Line | Selector / ID | Cross-function consumers |
|---|---|---|---|
| `providerToggle` | 1506 | `#providerToggle` | click handler |
| `providerBody` | 1507 | `#providerProgressBody` | click handler |
| `providerChevron` | 1508 | `#providerChevron` | click handler |
| `openValBtn` | 1524 | `#openValidationTab` | click handler |
| `viewFullLogBtn` | 1547 | `#tab-overview [type="button"]` | declared (delegation used) |

### 3.5 Header action buttons

| Variable | Line | Selector / ID | Cross-function consumers |
|---|---|---|---|
| `exportBtn` | 1575 | `#btnExportZip` | click handler |
| `advanceBtn` | 1583 | `#btnAdvanceStage` | click handler, `_refreshActionLabel` |
| `editBtn` | 1731 | `#btnEditInfo` | click handler |

### 3.6 Log filter

| Variable | Line | Selector / ID | Cross-function consumers |
|---|---|---|---|
| `logFilterBtns` | 1416 | `[data-log-category]` | forEach click handler, `resetLogFilter` |

### 3.7 Submission package (legacy inline)

| Variable | Line | Selector / ID | Cross-function consumers |
|---|---|---|---|
| `sub001ViewContent` | 2378 | `#sub001ViewContent` | click handler |
| `sub001VersionPanel` | 2379 | `#sub001VersionPanel` | click handler |
| `sub001SaveAcceptanceNo` | 2388 | `#sub001SaveAcceptanceNo` | click handler |

### 3.8 Communication record

| Variable | Line | Selector / ID | Cross-function consumers |
|---|---|---|---|
| `msgChannelSelect` | 2600 | `#msgChannelSelect` | change handler, publish handler |
| `msgStructuredFields` | 2601 | `#msgStructuredFields` | visibility toggle |
| `msgPublishBtn` | 2617 | `#msgPublishBtn` | click handler |

### 3.9 Stage action floating menu

| Variable | Line | Purpose |
|---|---|---|
| `_mgmtMenuEl` | 2900 | Holds the dynamically created action menu DOM node |

### 3.10 Document action modal (inside `docActionModal` IIFE, L1821–2315)

| Variable | Line | Selector / ID |
|---|---|---|
| `_docName` | 1822 | (string) currently targeted document name |
| `approveModal` | 1900 | `#docApproveModal` |
| `approveDocNameEl` | 1901 | `#docApproveDocName` |
| `approveConfirmBtn` | 1902 | `#docApproveConfirmBtn` |
| `rejectModal` | 1940 | `#docRejectModal` |
| `rejectDocNameEl` | 1941 | `#docRejectDocName` |
| `rejectReasonText` | 1942 | `#docRejectReasonText` |
| `rejectConfirmBtn` | 1943 | `#docRejectConfirmBtn` |
| `waiveModal` | 1991 | `#docWaiveModal` |
| `waiveDocLabel` | 1992 | `#docWaiveDocLabel` |
| `waiveReasonSelect` | 1993 | `#docWaiveReasonSelect` |
| `waiveNoteWrap` | 1994 | `#docWaiveNoteWrap` |
| `waiveReasonNote` | 1995 | `#docWaiveReasonNote` |
| `waiveConfirmBtn` | 1996 | `#docWaiveConfirmBtn` |
| `registerModal` | 2063 | `#docRegisterModal` |
| `registerItemName` | 2064 | `#docRegisterItemName` |
| `registerPath` | 2065 | `#docRegisterPath` |
| `registerPathHint` | 2066 | `#docRegisterPathHint` |
| `registerPathError` | 2067 | `#docRegisterPathError` |
| `registerFileName` | 2068 | `#docRegisterFileName` |
| `registerVersion` | 2069 | `#docRegisterVersion` |
| `registerConfirmBtn` | 2070 | `#docRegisterConfirmBtn` |
| `referenceModal` | 2171 | `#docReferenceModal` |
| `referenceDocLabel` | 2172 | `#docReferenceDocLabel` |
| `referenceCandidateList` | 2173 | `#docReferenceCandidateList` |
| `referenceCandidateEmpty` | 2174 | `#docReferenceCandidateEmpty` |
| `referenceConfirmBtn` | 2175 | `#docReferenceConfirmBtn` |

---

## 4 Session Storage & URL Context

### 4.1 SessionStorage keys

| Constant / literal | Key string | R/W | Writer(s) | Reader(s) |
|---|---|---|---|---|
| `CASE_DETAIL_CONTEXT_KEY` | `prototype.caseDetailContext` | R+W | `syncToListStore` (L308–316) | `resolveUrlCaseContext` (L194) |
| `CASE_LIST_DRAFTS_KEY` | `prototype.caseListDrafts` | R+W | `syncToListStore` (L318–331) | `resolveUrlCaseContext` (L197) |
| (literal) | `prototype.caseListOverrides` | R+W | `syncToListStore` (L333–335) | — |

### 4.2 URL parameters

| Parameter | Line | Reader |
|---|---|---|
| `caseId` (query string) | 176 | `resolveUrlCaseContext()` |
| `#hash` (fragment) | 49, 55, 92 | `resolveHashTab()`, `setHash()`, `hashchange` listener |

### 4.3 Session helper functions

| Function | Line | Signature | Purpose |
|---|---|---|---|
| `readSessionJson` | 162 | `(key) → object\|null` | Parse JSON from sessionStorage |
| `writeSessionJson` | 167 | `(key, val) → void` | Stringify + write to sessionStorage |

---

## 5 `liveState` — Mutable Runtime State

### 5.1 Fields initialised by `initLiveState(sampleKey)` (L212–258)

| Field | Type | Deep-cloned | Purpose |
|---|---|---|---|
| `sampleKey` | `string` | — | Current sample identifier |
| `id` | `string` | — | Case ID |
| `title` | `string` | — | Case title |
| `stageCode` | `string` | — | Current main stage code (S1–S9) |
| `stage` | `string` | — | Stage display label |
| `stageMeta` | `string` | — | Stage supplementary text |
| `statusBadge` | `string` | — | CSS badge class |
| `progressPercent` | `number` | — | Document progress % |
| `progressCount` | `string` | — | e.g. "12/18 项已收集" |
| `billing` | `object` | ✓ | `{total,received,outstanding,payments[]}` |
| `logEntries` | `array` | ✓ | Audit log items |
| `riskConfirmationRecord` | `object\|null` | ✓ | Arrears risk confirmation |
| `submissionPackages` | `array` | ✓ | Submission packages list |
| `validation` | `object` | ✓ | `{lastTime,blocking[],warnings[]}` |
| `readonly` | `boolean` | — | S9 read-only flag |
| `isMgmtCase` | `boolean` | — | 経営管理 case type flag |
| `postApprovalStage` | `string\|null` | — | COE flow sub-stage code |
| `resultOutcome` | `string\|null` | — | `approved\|rejected` (S8 only; supplement stays in S7) |
| `applicationFlowType` | `string\|null` | — | e.g. `coe_overseas` |
| `finalPaymentPaid` | `boolean` | — | Final payment gate |
| `riskConfirmedForCoeSend` | `boolean` | — | Risk override flag for COE send |
| `supplementCount` | `number` | — | Supplement round counter (S7 sub-state) |
| `supplementOpen` | `boolean` | — | Whether a supplement request is pending (S7 sub-state) |
| `supplementDeadline` | `string\|null` | — | Supplement deadline ISO date (S7 sub-state) |
| `caseType` | `string` | — | Case category label |
| `residencePeriodRecorded` | `boolean` | — | Entry-success gate |
| `renewalRemindersCreated` | `boolean` | — | Renewal reminder gate |
| `coeIssuedAt` | `string\|null` | — | ISO timestamp |
| `coeExpiryDate` | `string\|null` | — | ISO date |
| `coeSentAt` | `string\|null` | — | ISO timestamp |
| `overseasVisaStartAt` | `string\|null` | — | ISO timestamp |
| `entryConfirmedAt` | `string\|null` | — | ISO timestamp |
| `immigrationResult` | `object\|null` | ✓ | Immigration result data |
| `residencePeriod` | `object\|null` | ✓ | Residence period data |
| `renewalReminders` | `array` | ✓ | Renewal reminder list |

### 5.2 Write-points after init (mutations)

| Field | Mutator function(s) | Line(s) |
|---|---|---|
| `stageCode` | `_advanceMainStage`, `_registerImmigrationResult` | 1610, 3085 |
| `stage` | `_advanceMainStage`, `_registerImmigrationResult` | 1611, 3086 |
| `stageMeta` | `_advanceMainStage`, `_registerSupplementNotice`, `_registerImmigrationResult`, `_submitSupplement` | 1612, 3059, 3076, 3117 |
| `statusBadge` | `_advanceMainStage`, `_registerImmigrationResult` | 1613, 3087 |
| `readonly` | `_advanceMainStage` (→ S9) | 1649 |
| `logEntries` | `_advanceMainStage`, `riskSubmitBtn`, billing handler, `docActionModal._addLogEntry`, `_addLog`, receipt/diff handlers | 1621, 1639, 1755, 2432, 2458, 2650, 3251 |
| `submissionPackages` | `_advanceMainStage` (S7 pkg), `_submitSupplement`, receipt handlers | 1633, 3110, 2454, 2641 |
| `billing.payments[i].*` | billing "登记回款" handler | 2416–2427 |
| `billing.received` | billing handler | 2426 |
| `billing.outstanding` | billing handler | 2427 |
| `riskConfirmationRecord` | `riskSubmitBtn` handler | 1747 |
| `resultOutcome` | `_registerImmigrationResult`, `_rejectOverseasVisa`, `_archiveCase` | 3088, 3201, 3239 |
| `postApprovalStage` | `_registerImmigrationResult`, `_sendCoe`, `_startOverseasVisa`, `_confirmEntry`, `_rejectOverseasVisa` | 3091, 3138, 3151, 3164, 3200 |
| `supplementCount` | `_registerSupplementNotice`, `_registerImmigrationResult` | 3056, 3073 |
| `supplementOpen` | `_registerSupplementNotice`, `_registerImmigrationResult`, `_submitSupplement` | — |
| `supplementDeadline` | `_registerSupplementNotice`, `_registerImmigrationResult`, `_submitSupplement` | — |
| `riskConfirmedForCoeSend` | `_sendCoe` | 3134 |
| `residencePeriodRecorded` | `_saveResidencePeriod` | 3187 |
| `renewalRemindersCreated` | `_createRenewalReminders` | 3216 |
| `coeSentAt` | `_sendCoe` | 3139 |
| `overseasVisaStartAt` | `_startOverseasVisa` | 3152 |
| `entryConfirmedAt` | `_confirmEntry` | 3165 |
| `id` | `applyCaseOverrides` | 263 |
| `title` | `applyCaseOverrides` | 267 |

---

## 6 Shared Helper Functions

### 6.1 DOM helpers (pure)

| Function | Line | Signature | Call-site count (approx.) |
|---|---|---|---|
| `setText` | 101 | `(id, value) → void` | ~35 |
| `setHtml` | 106 | `(id, html) → void` | ~3 |
| `esc` | 111 | `(str) → string` | ~45 |

### 6.2 CSS / badge helpers (pure)

| Function | Line | Signature |
|---|---|---|
| `avatarBg` | 117 | `(style) → string` |
| `avatarTextColor` | 125 | `(style) → string` |
| `severityColor` | 129 | `(severity) → string` |
| `severityBgClass` | 136 | `(severity) → string` |
| `chipClass` | 143 | `(color) → string` |
| `billingBadge` | 150 | `(status) → string` |
| `docStatusIcon` | 623 | `(status) → string` (SVG HTML) |
| `docBadgeClass` | 637 | `(status) → string` |
| `taskAvatarColor` | 911 | `(color) → string` |
| `taskDueBadge` | 918 | `(due, dueColor) → string` (HTML) |
| `reviewActionLabel` | 708 | `(action) → string` |
| `reviewActionBadge` | 716 | `(action) → string` |
| `formatObjectType` | 1352 | `(entry) → string` |

### 6.3 Session / URL context

| Function | Line | Signature | Purpose |
|---|---|---|---|
| `readSessionJson` | 162 | `(key) → object\|null` | Read + parse sessionStorage |
| `writeSessionJson` | 167 | `(key, val) → void` | Stringify + write sessionStorage |
| `resolveUrlCaseContext` | 172 | `() → CaseContext\|null` | Resolve case from `?caseId=` + session + `CASE_ID_MAP` |
| `syncToListStore` | 292 | `() → void` | Write stage changes back to list-page session stores |

### 6.4 Tab management

| Function | Line | Signature | Purpose |
|---|---|---|---|
| `setActiveTab` | 31 | `(key) → void` | Toggle tab + panel visibility, update "More" button state |
| `resolveHashTab` | 48 | `() → string\|null` | Read `#hash` and validate against `panels` |
| `setHash` | 55 | `(key) → void` | Write `#hash` via `replaceState` |

### 6.5 Toast

| Function | Line | Signature | Call-site count (approx.) |
|---|---|---|---|
| `showToast` | 1559 | `(title, desc) → void` | ~30 |

### 6.6 Render functions (state → DOM)

| Function | Line | Target domain |
|---|---|---|
| `applySample` | 344 | Orchestrator — calls all `apply*` renderers |
| `applyProviderProgress` | 419 | Overview: provider bars |
| `applyRiskSummary` | 436 | Overview: risk card |
| `applyOverviewHints` | 478 | Overview: next-action + validation hint |
| `applyTimeline` | 487 | Overview: timeline |
| `applyTeam` | 512 | Overview: team card |
| `applyInfoFields` | 551 | Info tab: form field values |
| `applyRelatedParties` | 589 | Info tab: related parties |
| `applyDocsProgress` | 616 | Documents tab: progress bar |
| `applyDocumentItems` | 813 | Documents tab: full list rebuild |
| `applyTasks` | 926 | Tasks tab: task list |
| `applyDeadlines` | 971 | Deadlines tab: 4 deadline cards |
| `applyValidation` | 1013 | Validation tab: gates + blocking + warnings |
| `applySubmissionPackages` | 1080 | Validation tab: submission packages |
| `applyCorrectionPackage` | 1163 | Validation tab: correction package |
| `applyDoubleReview` | 1199 | Validation tab: double review records |
| `applyRiskConfirmationRecord` | 1244 | Validation tab: risk confirmation |
| `applyBillingSummary` | 1285 | Billing tab: summary cards |
| `applyBillingTable` | 1292 | Billing tab: payment table |
| `applyLogEntries` | 1358 | Log tab: timeline entries |
| `applyReadonly` | 1438 | Cross-tab: disable buttons/inputs |
| `applyMgmtTabs` | 2720 | 経営管理 tab visibility |
| `applyImmigrationResultContent` | 2746 | Immigration result panel |
| `applyResidencePeriodContent` | 2818 | Residence period panel |

### 6.7 Document detail sub-renderers (pure HTML builders)

| Function | Line | Returns |
|---|---|---|
| `renderVersionTable` | 649 | HTML string |
| `renderReferenceInfo` | 685 | HTML string |
| `renderReviewHistory` | 723 | HTML string |
| `renderReminderHistory` | 748 | HTML string |
| `renderInlineActions` | 768 | HTML string |
| `renderDetailPanel` | 791 | HTML string |
| `itemHasExpandable` | 803 | boolean |

### 6.8 State management / live-state

| Function | Line | Signature | Purpose |
|---|---|---|---|
| `initLiveState` | 212 | `(sampleKey) → void` | Deep-copy sample into `liveState` |
| `applyCaseOverrides` | 260 | `(ctx) → void` | Patch `liveState` + header DOM from list context |
| `isMgmtCase` | 2710 | `() → boolean` | Check if current case is 経営管理 |
| `rebindRiskTrigger` | 1491 | `() → void` | Re-attach risk modal trigger after DOM re-render |

### 6.9 Stage workflow actions

| Function | Line | Guard |
|---|---|---|
| `_advanceMainStage` | 1602 | `(nextCode) → void` — generic stage push |
| `_requestMaterials` | 1665 | S1 → S2 |
| `_startReview` | 1674 | S2 → S3 |
| `_runGateA` | 1684 | S3 → S4 (blocks on Gate-A) |
| `_enterValidation` | 1700 | S4 → S5 |
| `_runGateB` | 1710 | S5 → S6 (blocks on blocking items) |
| `_submitInitial` | 1725 | S6 → S7 |
| `_registerSupplementNotice` | 3054 | S7 stay (supplement) |
| `_registerImmigrationResult` | 3069 | S7 → S8 |
| `_submitSupplement` | 3107 | S7 stay (supplement pkg) |
| `_sendCoe` | 3125 | S8 + waiting_final_payment |
| `_startOverseasVisa` | 3149 | S8 + coe_sent |
| `_confirmEntry` | 3162 | S8 + overseas_visa_applying |
| `_saveResidencePeriod` | 3181 | S8 + entry_success |
| `_rejectOverseasVisa` | 3198 | S8 + overseas_visa_applying |
| `_createRenewalReminders` | 3211 | S8 + entry_success + recorded |
| `_archiveCase` | 3225 | S8 → S9 |
| `_addLog` | 3249 | Shared log-push helper |
| `_updateHeaderDisplay` | 3263 | Refresh header badges from `liveState` |
| `_refreshActionLabel` | 2843 | Update advance button text |
| `_getStageActions` | 2948 | Build action list for current state |
| `_showActionMenu` | 2906 | Render floating action menu |

### 6.10 Document action modal (encapsulated IIFE → `docActionModal`)

Exposed API:

| Method | Purpose |
|---|---|
| `openApprove(docName)` | Show approve modal |
| `openReject(docName)` | Show reject modal |
| `openWaive(docName)` | Show waive modal |
| `openRegister(docName)` | Show register modal |
| `openReference(docName)` | Show reference modal |
| `doRemind(docName)` | Direct toast + log (no modal) |

Internal helpers: `_showModal`, `_hideModal`, `_bindClose`, `_findDocItem`, `_reRender`, `_recalcProgress`, `_addLogEntry`, `_validatePath`, `_updateRegisterEnabled`, `_updateWaiveEnabled`.

### 6.11 Misc utility

| Function | Line | Purpose |
|---|---|---|
| `bindCopyBtn` | 2472 | Clipboard copy button wiring |
| `updateMsgStructuredVisibility` | 2603 | Toggle structured fields for phone/meeting channels |
| `resetLogFilter` | 1406 | Reset log category filter to "all" |

---

## 7 Delegated Event Listeners (document-level)

These use `document.addEventListener` and cannot be trivially moved without ensuring the target file is loaded.

| Event | Line | Delegation selector | Domain |
|---|---|---|---|
| `click` | 85 | outside `moreWrapper` | tabs |
| `hashchange` | 92 | — | tabs |
| `click` | 1485 | `[data-close-risk-modal]` | risk modal |
| `click` | 1532 | `.overview-goto-validation`, `.overview-goto-billing`, `.overview-goto-deadlines` | overview shortcuts |
| `click` | 1548 | button text `查看完整日志 →` | overview → log |
| `click` | 1770 | `[data-waive-item]` | documents |
| `click` | 1781 | `.doc-item[data-expandable="1"]` | documents expand |
| `click` | 1798 | `[data-action]` with `[data-doc]` | documents inline actions |
| `change` | 2321 | `.task-toggle` | tasks |
| `click` | 2339 | button text matching (生成文書/发布记录/手动添加/add-task-btn) | prototype feedback |
| `change` | 2502 | `#docsSelectAll` | documents bulk select |
| `click` | 2517 | `#docsBulkTaskBtn`, `#docsBulkExportBtn` | documents bulk actions |
| `click` | 2534 | `.doc-reuse-group-btn`, `.doc-reuse-item-btn` | documents reuse |
| `click` | 2553 | `.blocker-jump-doc`, `.blocker-goto-docs`, `.blocker-create-task` | validation → documents jump |
| `click` | 2405 | `.row-quick-action` text `登记回款` | billing |
| `click` | 2448 | `[data-receipt-idx]` | receipt registration |
| `click` | 2636 | `[data-save-receipt-idx]`, `[data-diff-idx]` | receipt save / version diff |

---

## 8 Initialisation Sequence (L2674–3309)

```text
1. caseContext   = resolveUrlCaseContext()       // URL + session
2. initialSample = derive from caseContext or sampleSelect.value
3. applySample(initialSample)                    // full render pass
4. initLiveState(initialSample)                  // populate liveState
5. applyCaseOverrides(caseContext)                // patch from list context
6. initialTab = resolveHashTab() || 'overview'
7. setActiveTab(initialTab)                      // show first tab
8. applyMgmtTabs()                               // mgmt tab visibility
9. _refreshActionLabel()                         // set advance button label
```

---

## 9 Proposed Split Affinity Tags

Pre-classification for the next task (`map-render-boundaries`).

| Tag | Scope |
|---|---|
| **runtime** | `setText`, `setHtml`, `esc`, `avatarBg`, `avatarTextColor`, `severityColor`, `severityBgClass`, `chipClass`, `billingBadge`, `showToast`, `readSessionJson`, `writeSessionJson`, `resolveUrlCaseContext`, `syncToListStore`, `liveState` object, `initLiveState`, `applyCaseOverrides`, `isMgmtCase`, `ACTIVE_TAB_CLS`, `CASE_DETAIL_CONTEXT_KEY`, `CASE_LIST_DRAFTS_KEY`, `bindCopyBtn` |
| **tabs** | `primaryTabs`, `secondaryTabs`, `allTabLinks`, `panels`, `moreWrapper`, `moreTrigger`, `moreMenu`, `SECONDARY_TAB_KEYS`, `setActiveTab`, `resolveHashTab`, `setHash`, tab click/hash handlers |
| **renderers** | `applySample`, `applyProviderProgress`, `applyRiskSummary`, `applyOverviewHints`, `applyTimeline`, `applyTeam`, `applyInfoFields`, `applyRelatedParties`, `applyDocsProgress`, `applyTasks`, `applyDeadlines`, `applyValidation`, `applySubmissionPackages`, `applyCorrectionPackage`, `applyDoubleReview`, `applyRiskConfirmationRecord`, `applyBillingSummary`, `applyBillingTable`, `applyLogEntries`, `resetLogFilter`, `applyReadonly`, `applyMgmtTabs`, `applyImmigrationResultContent`, `applyResidencePeriodContent`, `_renderImmigrationOutcomeCard`, `formatObjectType`, related CSS helpers (`docStatusIcon`, `docBadgeClass`, `taskAvatarColor`, `taskDueBadge`, `reviewActionLabel`, `reviewActionBadge`) |
| **documents** | `applyDocumentItems`, `renderVersionTable`, `renderReferenceInfo`, `renderReviewHistory`, `renderReminderHistory`, `renderInlineActions`, `renderDetailPanel`, `itemHasExpandable`, `docActionModal` (all 5 modals + remind), expand/collapse handler, waive-btn handler, inline action handler, reuse handlers, bulk select/export, `_recalcProgress`, `_reRender`, `_validatePath` |
| **stage-actions** | `_advanceMainStage`, `_requestMaterials`, `_startReview`, `_runGateA`, `_enterValidation`, `_runGateB`, `_submitInitial`, `_registerSupplementNotice`, `_registerImmigrationResult`, `_submitSupplement`, `_sendCoe`, `_startOverseasVisa`, `_confirmEntry`, `_saveResidencePeriod`, `_rejectOverseasVisa`, `_createRenewalReminders`, `_archiveCase`, `_addLog`, `_updateHeaderDisplay`, `_refreshActionLabel`, `_getStageActions`, `_showActionMenu`, `_mgmtMenuEl`, `rebindRiskTrigger`, risk modal handlers, advance button handler, billing handler, receipt handlers |
| **boot** | init sequence (L2674–2701), sample-select change wiring (L2366–2372 + L3304–3308), `applyMgmtTabs()` + `_refreshActionLabel()` calls at L3300–3301 |
