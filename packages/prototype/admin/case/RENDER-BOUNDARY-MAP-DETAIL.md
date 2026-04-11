# Render Boundary Map: `case-detail-page.js`

> Produced by `map-render-boundaries` task.
> Input: `scripts/case-detail-page.js` (3 311 lines, single IIFE) + `AUDIT-GLOBAL-STATE-DETAIL.md`.
> Consumers: `define-runtime-api`, `extract-runtime-file`, `extract-tab-file`, `extract-renderers-core`, `extract-documents-file`, `extract-stage-actions`.

---

## 1 Target File Legend

| File | Shorthand | Responsibility |
|---|---|---|
| `case-detail-runtime.js` | **RT** | DOM helpers, CSS helpers, toast, session/URL, `liveState` R/W, `isMgmtCase`, `syncToListStore`, copy utility |
| `case-detail-tabs.js` | **TAB** | Tab switching, hash sync, More menu, overview/validation/billing/log shortcut navigation |
| `case-detail-renderers.js` | **REN** | All `apply*` / `render*` display functions, log filter, provider toggle, task toggle, messages UI, validation tab UI |
| `case-detail-documents.js` | **DOC** | Document list rendering, sub-renderers, `docActionModal` (5 modals + remind), expand/collapse, inline actions, bulk select, reuse |
| `case-detail-stage-actions.js` | **ACT** | Stage advance (`_advanceMainStage`), S1–S9 named actions, risk modal, billing register, receipt handlers, sub001 legacy, `_refreshActionLabel`, `_getStageActions`, `_showActionMenu` |
| `case-detail-page.js` | **BOOT** | Init sequence, sample-select wiring, mgmt tab/label init, prototype feedback stubs |

---

## 2 Function-Level Boundary Map

### 2.1 RT — `case-detail-runtime.js`

| Function / Symbol | Lines | Signature | Calls (outbound) | Called by (inbound) |
|---|---|---|---|---|
| `setText` | 101–104 | `(id, val) → void` | — | ~35 sites across REN, DOC, ACT, BOOT |
| `setHtml` | 106–109 | `(id, html) → void` | — | ~3 sites in REN |
| `esc` | 111–115 | `(str) → string` | — | ~45 sites across REN, DOC, ACT |
| `avatarBg` | 117–123 | `(style) → string` | — | REN |
| `avatarTextColor` | 125–127 | `(style) → string` | — | REN |
| `severityColor` | 129–134 | `(severity) → string` | — | REN (`applyDeadlines`) |
| `severityBgClass` | 136–141 | `(severity) → string` | — | REN (`applyDeadlines`) |
| `chipClass` | 143–148 | `(color) → string` | — | REN (`applyLogEntries`) |
| `billingBadge` | 150–153 | `(status) → string` | `BILLING_STATUS` | REN (`applyBillingTable`) |
| `CASE_DETAIL_CONTEXT_KEY` | 159 | constant | — | RT, BOOT |
| `CASE_LIST_DRAFTS_KEY` | 160 | constant | — | RT |
| `readSessionJson` | 162–165 | `(key) → object\|null` | — | RT (`resolveUrlCaseContext`, `syncToListStore`) |
| `writeSessionJson` | 167–170 | `(key, val) → void` | — | RT (`syncToListStore`) |
| `resolveUrlCaseContext` | 172–204 | `() → CaseContext\|null` | `CASE_ID_MAP`, `readSessionJson` | BOOT |
| `liveState` | 210 | `{}` (mutable object) | — | all files via namespace |
| `initLiveState` | 212–258 | `(sampleKey) → void` | `DETAIL_SAMPLES` | BOOT |
| `applyCaseOverrides` | 260–290 | `(ctx) → void` | `DETAIL_STAGES`, `setText`, `esc`, `liveState` | BOOT |
| `syncToListStore` | 292–336 | `() → void` | `DETAIL_STAGES`, `POST_APPROVAL_STAGES`, `readSessionJson`, `writeSessionJson`, `liveState` | ACT |
| `showToast` | 1559–1569 | `(title, desc) → void` | — | ~30 sites across ACT, DOC, REN, BOOT |
| `bindCopyBtn` | 2472–2493 | `(btnId, sourceId) → void` | `showToast` | BOOT (L2495–2496) |
| `isMgmtCase` | 2710–2715 | `() → boolean` | `liveState` | REN (`applyMgmtTabs`), ACT (`_refreshActionLabel`, `_getStageActions`) |
| `updateMsgStructuredVisibility` | 2603–2611 | `() → void` | — | REN (messages channel change) |

### 2.2 TAB — `case-detail-tabs.js`

| Function / Symbol | Lines | Signature | Calls (outbound) | Called by (inbound) |
|---|---|---|---|---|
| `ACTIVE_TAB_CLS` | 20 | constant `'is-active'` | — | TAB |
| `SECONDARY_TAB_KEYS` | 22 | hash map | — | TAB (`setActiveTab`) |
| `primaryTabs` | 16 | DOM cache | — | TAB |
| `secondaryTabs` | 17 | DOM cache | — | TAB |
| `allTabLinks` | 18 | DOM cache | — | TAB |
| `panels` | 19 | DOM cache `{key: Element}` | — | TAB, REN (`applyMgmtTabs`) |
| `moreWrapper` | 23 | DOM ref | — | TAB |
| `moreTrigger` | 24 | DOM ref | — | TAB |
| `moreMenu` | 25 | DOM ref | — | TAB (declared only) |
| `setActiveTab` | 31–46 | `(key) → void` | `primaryTabs`, `secondaryTabs`, `panels`, `moreTrigger` | TAB, ACT (`_saveResidencePeriod`), BOOT |
| `resolveHashTab` | 48–53 | `() → string\|null` | `panels` | TAB, BOOT |
| `setHash` | 55–67 | `(key) → void` | — | TAB |

**Event listener blocks (TAB):**

| Block | Lines | Trigger | Calls |
|---|---|---|---|
| `allTabLinks` click | 69–78 | click on `[data-tab]` | `setActiveTab`, `setHash` |
| `moreTrigger` click | 80–90 | click on trigger / outside | `moreWrapper` toggle |
| `hashchange` | 92–95 | window hashchange | `resolveHashTab`, `setActiveTab` |
| `openValBtn` click | 1524–1529 | `#openValidationTab` click | `setActiveTab('validation')` |
| overview shortcuts | 1531–1545 | `.overview-goto-*` click | `setActiveTab(*)` |
| view full log | 1547–1553 | button `查看完整日志 →` click | `setActiveTab('log')` |
| validation → docs jump | 2553–2593 | `.blocker-jump-doc`, `.blocker-goto-docs`, `.blocker-create-task` | `setActiveTab`, `showToast` (RT) |

### 2.3 REN — `case-detail-renderers.js`

| Function | Lines | Domain | Calls (outbound) | Called by (inbound) |
|---|---|---|---|---|
| `applySample` | 344–413 | orchestrator | `setText`, `POST_APPROVAL_STAGES`, `applyProviderProgress`, `applyRiskSummary`, `applyOverviewHints`, `applyTimeline`, `applyTeam`, `applyInfoFields`, `applyRelatedParties`, `applyDocsProgress`, `applyDocumentItems` (DOC), `applyTasks`, `applyDeadlines`, `applyValidation`, `applyBillingSummary`, `applyBillingTable`, `applyLogEntries`, `applyRiskConfirmationRecord`, `applyReadonly` | BOOT |
| `applyProviderProgress` | 419–430 | overview | DOM | `applySample` |
| `applyRiskSummary` | 436–472 | overview | `setText`, `esc`, `liveState` (RT) | `applySample` |
| `applyOverviewHints` | 478–481 | overview | `setText` (RT) | `applySample` |
| `applyTimeline` | 487–506 | overview | `esc` (RT) | `applySample` |
| `applyTeam` | 512–545 | overview | `esc` (RT) | `applySample` |
| `applyInfoFields` | 551–583 | info | DOM | `applySample` |
| `applyRelatedParties` | 589–610 | info | `esc` (RT) | `applySample` |
| `applyDocsProgress` | 616–621 | documents | DOM | `applySample`, DOC (`_reRender`) |
| `docStatusIcon` | 623–635 | documents | — | DOC (`applyDocumentItems`) |
| `docBadgeClass` | 637–645 | documents | — | DOC (`applyDocumentItems`) |
| `taskAvatarColor` | 911–916 | tasks | — | REN (`applyTasks`) |
| `taskDueBadge` | 918–924 | tasks | `esc` (RT) | REN (`applyTasks`) |
| `applyTasks` | 926–965 | tasks | `esc`, `taskAvatarColor`, `taskDueBadge` | `applySample` |
| `applyDeadlines` | 971–1007 | deadlines | `severityColor`, `severityBgClass` (RT) | `applySample` |
| `applyValidation` | 1013–1074 | validation | `setText`, `esc` (RT), `applySubmissionPackages`, `applyCorrectionPackage`, `applyDoubleReview` | `applySample` |
| `applySubmissionPackages` | 1080–1157 | validation | `esc` (RT) | `applyValidation`, ACT (`_advanceMainStage`, `_submitSupplement`, receipt handlers) |
| `applyCorrectionPackage` | 1163–1193 | validation | `esc` (RT) | `applyValidation` |
| `applyDoubleReview` | 1199–1238 | validation | `esc` (RT) | `applyValidation` |
| `applyRiskConfirmationRecord` | 1244–1279 | validation | `esc` (RT), `rebindRiskTrigger` (**ACT**) | `applySample`, ACT (`riskSubmitBtn` handler) |
| `applyBillingSummary` | 1285–1290 | billing | `setText` (RT) | `applySample`, ACT (billing handler) |
| `applyBillingTable` | 1292–1346 | billing | `esc`, `billingBadge` (RT) | `applySample`, ACT (billing handler) |
| `formatObjectType` | 1352–1356 | log | `esc` (RT) | REN (`applyLogEntries`) |
| `applyLogEntries` | 1358–1400 | log | `esc`, `chipClass` (RT), `formatObjectType`, `resetLogFilter` | `applySample`, ACT (`_advanceMainStage`, `riskSubmitBtn`, billing handler, receipt handlers, `_addLog`), DOC (`_addLogEntry`) |
| `resetLogFilter` | 1406–1414 | log | DOM | `applyLogEntries` |
| `applyReadonly` | 1438–1477 | cross-tab | DOM | `applySample`, ACT (`_advanceMainStage` → S9) |
| `applyMgmtTabs` | 2720–2739 | mgmt | `isMgmtCase` (RT), `panels` (TAB), `applyImmigrationResultContent`, `applyResidencePeriodContent` | BOOT |
| `applyImmigrationResultContent` | 2746–2757 | mgmt | `liveState` (RT), `_renderImmigrationOutcomeCard` | `applyMgmtTabs`, ACT (`_registerSupplementNotice`, `_registerImmigrationResult`) |
| `_renderImmigrationOutcomeCard` | 2764–2813 | mgmt | `liveState` (RT) | `applyImmigrationResultContent` |
| `applyResidencePeriodContent` | 2818–2828 | mgmt | DOM | `applyMgmtTabs` |
| `reviewActionLabel` | 708–714 | documents | — | DOC (`renderReviewHistory`) |
| `reviewActionBadge` | 716–721 | documents | — | DOC (`renderReviewHistory`) |

**Event listener blocks (REN):**

| Block | Lines | Trigger | Calls |
|---|---|---|---|
| `logFilterBtns` forEach + click | 1416–1432 | `[data-log-category]` click | DOM filter toggle |
| `providerToggle` click | 1506–1518 | `#providerToggle` click | DOM collapse/expand |
| task toggle | 2321–2333 | `.task-toggle` change | DOM style toggle |
| `msgChannelSelect` change | 2613–2614 | `#msgChannelSelect` change | `updateMsgStructuredVisibility` (RT) |
| `msgPublishBtn` click | 2617–2630 | `#msgPublishBtn` click | `showToast` (RT) |

> **Note:** `docStatusIcon`, `docBadgeClass`, `reviewActionLabel`, `reviewActionBadge` are pure CSS/label helpers consumed only by DOC renderers. They live in REN to avoid DOC depending on private helpers but are also valid as DOC-internal. Final decision during extract.

### 2.4 DOC — `case-detail-documents.js`

| Function | Lines | Calls (outbound) | Called by (inbound) |
|---|---|---|---|
| `renderVersionTable` | 649–683 | `esc` (RT) | DOC (`renderDetailPanel`) |
| `renderReferenceInfo` | 685–706 | `esc` (RT) | DOC (`renderDetailPanel`) |
| `renderReviewHistory` | 723–746 | `esc`, `reviewActionLabel`, `reviewActionBadge` (REN) | DOC (`renderDetailPanel`) |
| `renderReminderHistory` | 748–766 | `esc` (RT) | DOC (`renderDetailPanel`) |
| `renderInlineActions` | 768–789 | `esc` (RT) | DOC (`renderDetailPanel`) |
| `renderDetailPanel` | 791–801 | `renderReferenceInfo`, `renderVersionTable`, `renderReviewHistory`, `renderReminderHistory`, `renderInlineActions` | DOC (`applyDocumentItems`) |
| `itemHasExpandable` | 803–809 | — (pure) | DOC (`applyDocumentItems`) |
| `applyDocumentItems` | 813–905 | `docStatusIcon`, `docBadgeClass` (REN), `esc` (RT), `itemHasExpandable`, `renderDetailPanel` | REN (`applySample`), DOC (`_reRender`) |
| `docActionModal` (IIFE) | 1821–2315 | (see §2.4.1 below) | event handlers |

**`docActionModal` internal structure (L1821–2315):**

| Internal fn | Lines | Calls (outbound) |
|---|---|---|
| `_showModal` | 1824–1827 | — |
| `_hideModal` | 1828–1831 | — |
| `_bindClose` | 1833–1845 | `_hideModal` |
| `_findDocItem` | 1847–1856 | `DETAIL_SAMPLES` (config), `liveState` (RT) |
| `_reRender` | 1858–1868 | `DETAIL_SAMPLES`, `applyDocumentItems` (DOC), `applyDocsProgress` (REN), `setText` (RT) |
| `_recalcProgress` | 1870–1892 | `DETAIL_SAMPLES`, `liveState` (RT) |
| `_addLogEntry` | 1894–1897 | `liveState` (RT), `applyLogEntries` (REN) |
| `_validatePath` | 2072–2083 | `DETAIL_PATH_RULES` (config) |
| `_updateRegisterEnabled` | 2086–2090 | `_validatePath` |
| `_updateWaiveEnabled` | 2008–2013 | — |
| `openApprove` | 1904–1908 | `_showModal` |
| approve confirm | 1910–1935 | `_findDocItem`, `_addLogEntry`, `_recalcProgress`, `_reRender`, `_hideModal`, `showToast` (RT), `esc` (RT) |
| `openReject` | 1945–1951 | `_showModal` |
| reject confirm | 1959–1986 | `_findDocItem`, `_addLogEntry`, `_recalcProgress`, `_reRender`, `_hideModal`, `showToast` (RT), `esc` (RT) |
| `openWaive` | 1998–2006 | `_showModal` |
| waive confirm | 2026–2058 | `DETAIL_WAIVE_REASONS`, `_findDocItem`, `_addLogEntry`, `_recalcProgress`, `_reRender`, `_hideModal`, `showToast` (RT), `esc` (RT) |
| `openRegister` | 2092–2106 | `_findDocItem`, `_showModal` |
| register confirm | 2125–2166 | `_findDocItem`, `_addLogEntry`, `_recalcProgress`, `_reRender`, `_hideModal`, `showToast` (RT), `esc` (RT) |
| `openReference` | 2177–2217 | `DETAIL_REFERENCE_CANDIDATES`, `esc` (RT), `_showModal` |
| reference confirm | 2227–2281 | `DETAIL_REFERENCE_CANDIDATES`, `_findDocItem`, `_addLogEntry`, `_recalcProgress`, `_reRender`, `_hideModal`, `showToast` (RT), `esc` (RT) |
| `doRemind` | 2286–2305 | `_findDocItem`, `_addLogEntry`, `_reRender`, `showToast` (RT) |

**Event listener blocks (DOC):**

| Block | Lines | Trigger | Calls |
|---|---|---|---|
| waive-btn delegation | 1770–1775 | `[data-waive-item]` click | `docActionModal.openWaive` |
| expand/collapse | 1781–1792 | `.doc-item[data-expandable="1"]` click | DOM toggle |
| inline actions | 1798–1815 | `[data-action][data-doc]` click | `docActionModal.open*` / `doRemind` |
| docsSelectAll | 2502–2515 | `#docsSelectAll` change | DOM toggle |
| docsBulkTask/Export | 2517–2528 | `#docsBulkTaskBtn` / `#docsBulkExportBtn` click | `showToast` (RT) |
| doc-reuse handlers | 2534–2547 | `.doc-reuse-group-btn` / `.doc-reuse-item-btn` click | `showToast` (RT) |

### 2.5 ACT — `case-detail-stage-actions.js`

| Function | Lines | Calls (outbound) | Called by (inbound) |
|---|---|---|---|
| `_advanceMainStage` | 1602–1655 | `DETAIL_STAGES`, `liveState` (RT), `setText` (RT), `applyLogEntries` (REN), `syncToListStore` (RT), `_refreshActionLabel`, `applySubmissionPackages` (REN), `applyReadonly` (REN), `showToast` (RT) | `_requestMaterials`, `_startReview`, `_runGateA`, `_enterValidation`, `_runGateB`, `_submitInitial`, `_archiveCase`, non-mgmt S7/S8 handlers |
| `_requestMaterials` | 1665–1669 | `_addLog`, `_advanceMainStage` | `_getStageActions` |
| `_startReview` | 1674–1678 | `_addLog`, `_advanceMainStage` | `_getStageActions` |
| `_runGateA` | 1684–1695 | `liveState` (RT), `showToast` (RT), `_addLog`, `_advanceMainStage` | `_getStageActions` |
| `_enterValidation` | 1700–1704 | `_addLog`, `_advanceMainStage` | `_getStageActions` |
| `_runGateB` | 1710–1719 | `liveState` (RT), `showToast` (RT), `_addLog`, `_advanceMainStage` | `_getStageActions` |
| `_submitInitial` | 1725–1729 | `_addLog`, `_advanceMainStage` | `_getStageActions` |
| `_registerSupplementNotice` | 3054–3065 | `liveState` (RT), `_addLog`, `_updateHeaderDisplay`, `setText` (RT), `syncToListStore` (RT), `showToast` (RT), `_refreshActionLabel`, `applyImmigrationResultContent` (REN) | `_getStageActions` |
| `_registerImmigrationResult` | 3069–3103 | `liveState` (RT), `DETAIL_STAGES`, `_addLog`, `_updateHeaderDisplay`, `syncToListStore` (RT), `showToast` (RT), `_refreshActionLabel`, `applyImmigrationResultContent` (REN) | `_getStageActions` |
| `_submitSupplement` | 3107–3121 | `liveState` (RT), `applySubmissionPackages` (REN), `_addLog`, `setText` (RT), `syncToListStore` (RT), `showToast` (RT) | `_getStageActions` |
| `_sendCoe` | 3125–3145 | `liveState` (RT), `showToast` (RT), `_addLog`, `_updateHeaderDisplay`, `syncToListStore` (RT), `_refreshActionLabel` | `_getStageActions` |
| `_startOverseasVisa` | 3149–3158 | `liveState` (RT), `_addLog`, `_updateHeaderDisplay`, `syncToListStore` (RT), `showToast` (RT), `_refreshActionLabel` | `_getStageActions` |
| `_confirmEntry` | 3162–3171 | `liveState` (RT), `_addLog`, `_updateHeaderDisplay`, `syncToListStore` (RT), `showToast` (RT), `_refreshActionLabel` | `_getStageActions` |
| `_saveResidencePeriod` | 3181–3194 | `liveState` (RT), `showToast` (RT), `_addLog`, `_updateHeaderDisplay`, `syncToListStore` (RT), `_refreshActionLabel`, `setActiveTab` (TAB) | `_getStageActions` |
| `_rejectOverseasVisa` | 3198–3207 | `liveState` (RT), `_addLog`, `_updateHeaderDisplay`, `syncToListStore` (RT), `showToast` (RT), `_refreshActionLabel` | `_getStageActions` |
| `_createRenewalReminders` | 3211–3221 | `liveState` (RT), `showToast` (RT), `_addLog`, `syncToListStore` (RT), `_refreshActionLabel` | `_getStageActions` |
| `_archiveCase` | 3225–3245 | `liveState` (RT), `showToast` (RT), `_addLog`, `_advanceMainStage`, `syncToListStore` (RT), `_refreshActionLabel` | `_getStageActions` |
| `_addLog` | 3249–3261 | `liveState` (RT), `applyLogEntries` (REN) | all `_*` action fns |
| `_updateHeaderDisplay` | 3263–3297 | `DETAIL_STAGES`, `POST_APPROVAL_STAGES`, `liveState` (RT), `setText` (RT) | action fns |
| `_refreshActionLabel` | 2843–2898 | `liveState` (RT), `isMgmtCase` (RT) | `_advanceMainStage`, most action fns, BOOT |
| `_getStageActions` | 2948–3044 | `liveState` (RT), `isMgmtCase` (RT), all `_*` action fns | ACT (`advanceBtn` handler) |
| `_showActionMenu` | 2906–2941 | `_mgmtMenuEl` | ACT (`advanceBtn` handler) |
| `_mgmtMenuEl` | 2900 | DOM ref (mutable) | `_showActionMenu` |
| `rebindRiskTrigger` | 1491–1498 | `riskModal` DOM ref | REN (`applyRiskConfirmationRecord`) |

**Event listener blocks (ACT):**

| Block | Lines | Trigger | Calls |
|---|---|---|---|
| risk modal close | 1485–1489 | `[data-close-risk-modal]` click | `riskModal` |
| `exportBtn` click | 1575–1581 | `#btnExportZip` click | `DETAIL_TOASTS`, `showToast` (RT) |
| `advanceBtn` click | 1583–1595 | `#btnAdvanceStage` click | `_getStageActions`, `_showActionMenu` |
| `editBtn` click | 1731–1736 | `#btnEditInfo` click | `setActiveTab('info')` (TAB) |
| `riskSubmitBtn` click | 1738–1763 | `#riskConfirmSubmit` click | `liveState` (RT), `applyRiskConfirmationRecord` (REN), `applyLogEntries` (REN), `showToast` (RT) |
| billing 登记回款 | 2405–2442 | `.row-quick-action` `登记回款` click | `liveState` (RT), `applyBillingSummary` (REN), `applyBillingTable` (REN), `applyLogEntries` (REN), `setText` (RT), `esc` (RT), `showToast` (RT) |
| receipt 登记回执 | 2448–2466 | `[data-receipt-idx]` click | `liveState` (RT), `applySubmissionPackages` (REN), `applyLogEntries` (REN), `esc` (RT), `showToast` (RT) |
| sub001 version panel | 2378–2386 | `#sub001ViewContent` click | DOM toggle |
| sub001 acceptance no | 2388–2399 | `#sub001SaveAcceptanceNo` click | `showToast` (RT) |
| receipt save / diff | 2636–2671 | `[data-save-receipt-idx]` / `[data-diff-idx]` click | `liveState` (RT), `applySubmissionPackages` (REN), `applyLogEntries` (REN), `esc` (RT), `showToast` (RT) |

### 2.6 BOOT — `case-detail-page.js` (slim bootstrap)

| Block | Lines | Calls (outbound) |
|---|---|---|
| `sampleSelect` DOM ref | 342 | — |
| URL context resolve + apply | 2677–2697 | `resolveUrlCaseContext` (RT), `DETAIL_SAMPLES`, `sampleSelect`, `applySample` (REN), `initLiveState` (RT), `applyCaseOverrides` (RT) |
| initial tab | 2699–2700 | `resolveHashTab` (TAB), `setActiveTab` (TAB) |
| mgmt tab + action label init | 3300–3301 | `applyMgmtTabs` (REN), `_refreshActionLabel` (ACT) |
| sample-select change (core) | 2366–2372 | `applySample` (REN), `initLiveState` (RT), `setActiveTab` (TAB) |
| sample-select change (mgmt) | 3304–3309 | `applyMgmtTabs` (REN), `_refreshActionLabel` (ACT) |
| `bindCopyBtn` invocations | 2495–2496 | `bindCopyBtn` (RT) |
| prototype feedback stubs | 2339–2360 | `showToast` (RT) |

---

## 3 Cross-File Dependency Graph

```
     ┌──────┐
     │ BOOT │
     └──┬───┘
        │ calls
  ┌─────┼─────────┐
  ▼     ▼         ▼
┌────┐ ┌────┐  ┌─────┐
│ RT │ │TAB │  │ ACT │
└──┬─┘ └──┬─┘  └──┬──┘
   │      │       │
   │  ┌───┘       │ calls
   │  │   ┌───────┘
   ▼  ▼   ▼
 ┌──────┐
 │ REN  │
 └──┬───┘
    │ calls (docStatusIcon, docBadgeClass,
    │        applyDocsProgress for DOC._reRender)
    ▼
 ┌──────┐
 │ DOC  │
 └──────┘
```

### 3.1 Directed edges (file → file)

| From | To | Functions crossing boundary |
|---|---|---|
| BOOT → RT | `resolveUrlCaseContext`, `initLiveState`, `applyCaseOverrides`, `bindCopyBtn`, `showToast` |
| BOOT → TAB | `resolveHashTab`, `setActiveTab` |
| BOOT → REN | `applySample`, `applyMgmtTabs` |
| BOOT → ACT | `_refreshActionLabel` |
| REN → RT | `setText`, `setHtml`, `esc`, `severityColor`, `severityBgClass`, `chipClass`, `billingBadge`, `showToast`, `liveState`, `isMgmtCase`, `updateMsgStructuredVisibility` |
| REN → TAB | `panels` (read in `applyMgmtTabs` to register new panels) |
| REN → ACT | `rebindRiskTrigger` (called by `applyRiskConfirmationRecord`) |
| DOC → RT | `esc`, `setText`, `showToast`, `liveState`, `DETAIL_SAMPLES`, `DETAIL_WAIVE_REASONS`, `DETAIL_REFERENCE_CANDIDATES`, `DETAIL_PATH_RULES` |
| DOC → REN | `applyDocsProgress`, `applyLogEntries`, `docStatusIcon`, `docBadgeClass`, `reviewActionLabel`, `reviewActionBadge` |
| ACT → RT | `liveState`, `setText`, `esc`, `showToast`, `syncToListStore`, `isMgmtCase`, `DETAIL_STAGES`, `POST_APPROVAL_STAGES`, `DETAIL_TOASTS` |
| ACT → TAB | `setActiveTab` (in `_saveResidencePeriod`, `editBtn` handler) |
| ACT → REN | `applyLogEntries`, `applySubmissionPackages`, `applyReadonly`, `applyBillingSummary`, `applyBillingTable`, `applyRiskConfirmationRecord`, `applyImmigrationResultContent` |
| TAB → RT | `showToast` (validation blocker jump toast) |

### 3.2 Circular dependency alert

| Cycle | Path | Mitigation |
|---|---|---|
| REN ↔ ACT | `applyRiskConfirmationRecord` (REN) → `rebindRiskTrigger` (ACT); ACT → many REN functions | All calls go through `window.CaseDetailPage` namespace. No direct import. Load order: RT → TAB → REN → DOC → ACT → BOOT ensures each file only reads already-defined namespace members. |
| REN ↔ DOC | `applySample` (REN) → `applyDocumentItems` (DOC); DOC `_reRender` → `applyDocsProgress` (REN) | Same namespace resolution. `applyDocumentItems` is registered by DOC before BOOT calls `applySample`. |

---

## 4 Domain Coverage Matrix

Maps each business domain to the functions and the target files they land in.

| Domain | RT | TAB | REN | DOC | ACT | BOOT |
|---|---|---|---|---|---|---|
| **Overview** | — | shortcuts (L1524–1553) | `applyProviderProgress`, `applyRiskSummary`, `applyOverviewHints`, `applyTimeline`, `applyTeam`, providerToggle | — | — | — |
| **Info** | — | — | `applyInfoFields`, `applyRelatedParties` | — | `editBtn` handler | — |
| **Documents** | — | — | `applyDocsProgress`, `docStatusIcon`, `docBadgeClass`, `reviewActionLabel`, `reviewActionBadge` | `applyDocumentItems`, `render*` (6 sub-renderers), `docActionModal`, expand/collapse, bulk, reuse | — | — |
| **Messages** | `updateMsgStructuredVisibility` | — | `msgChannelSelect` change, `msgPublishBtn` click | — | — | — |
| **Tasks** | — | — | `applyTasks`, `taskAvatarColor`, `taskDueBadge`, task toggle | — | — | — |
| **Deadlines** | — | — | `applyDeadlines` | — | — | — |
| **Validation** | — | — | `applyValidation`, `applySubmissionPackages`, `applyCorrectionPackage`, `applyDoubleReview`, `applyRiskConfirmationRecord` | — | `riskSubmitBtn`, risk modal, sub001 handlers, receipt handlers | — |
| **Billing** | `billingBadge` | — | `applyBillingSummary`, `applyBillingTable` | — | billing 登記回款, receipt registration | — |
| **Log** | — | — | `applyLogEntries`, `formatObjectType`, `resetLogFilter`, log filter UI | — | `_addLog` | — |
| **Stage flow** | `syncToListStore` | — | `applyReadonly` | — | `_advanceMainStage`, S1–S9 actions, post-approval actions, `_refreshActionLabel`, `_getStageActions`, `_showActionMenu` | — |
| **Mgmt (経営管理)** | `isMgmtCase` | — | `applyMgmtTabs`, `applyImmigrationResultContent`, `_renderImmigrationOutcomeCard`, `applyResidencePeriodContent` | — | `_registerSupplementNotice`, `_registerImmigrationResult`, `_submitSupplement`, `_sendCoe`, `_startOverseasVisa`, `_confirmEntry`, `_saveResidencePeriod`, `_rejectOverseasVisa`, `_createRenewalReminders`, `_archiveCase` | — |

---

## 5 Namespace API Surface (proposed)

Functions that must be exposed on `window.CaseDetailPage` for cross-file access.

### 5.1 RT exports

```
setText, setHtml, esc, avatarBg, avatarTextColor,
severityColor, severityBgClass, chipClass, billingBadge,
readSessionJson, writeSessionJson, resolveUrlCaseContext,
liveState, initLiveState, applyCaseOverrides, syncToListStore,
showToast, bindCopyBtn, isMgmtCase, updateMsgStructuredVisibility
```

### 5.2 TAB exports

```
panels, setActiveTab, resolveHashTab, setHash
```

### 5.3 REN exports

```
applySample, applyProviderProgress, applyRiskSummary,
applyOverviewHints, applyTimeline, applyTeam,
applyInfoFields, applyRelatedParties, applyDocsProgress,
docStatusIcon, docBadgeClass, reviewActionLabel, reviewActionBadge,
taskAvatarColor, taskDueBadge,
applyTasks, applyDeadlines, applyValidation,
applySubmissionPackages, applyCorrectionPackage, applyDoubleReview,
applyRiskConfirmationRecord,
applyBillingSummary, applyBillingTable,
formatObjectType, applyLogEntries, resetLogFilter,
applyReadonly, applyMgmtTabs,
applyImmigrationResultContent, applyResidencePeriodContent
```

### 5.4 DOC exports

```
applyDocumentItems, docActionModal
```

### 5.5 ACT exports

```
rebindRiskTrigger, _refreshActionLabel, _getStageActions
```

---

## 6 Testable Pure Functions

Functions with no side effects beyond return value (candidates for unit testing):

| Function | File | Signature | Notes |
|---|---|---|---|
| `esc` | RT | `(str) → string` | HTML entity escaping |
| `avatarBg` | RT | `(style) → string` | CSS class mapper |
| `avatarTextColor` | RT | `(style) → string` | CSS class mapper |
| `severityColor` | RT | `(severity) → string` | CSS variable mapper |
| `severityBgClass` | RT | `(severity) → string` | CSS class mapper |
| `chipClass` | RT | `(color) → string` | CSS class mapper |
| `billingBadge` | RT | `(status) → string` | Reads `BILLING_STATUS` config |
| `docStatusIcon` | REN | `(status) → string` | SVG HTML builder |
| `docBadgeClass` | REN | `(status) → string` | CSS class mapper |
| `taskAvatarColor` | REN | `(color) → string` | CSS class mapper |
| `reviewActionLabel` | REN | `(action) → string` | Label mapper |
| `reviewActionBadge` | REN | `(action) → string` | CSS class mapper |
| `formatObjectType` | REN | `(entry) → string` | Text formatter |
| `itemHasExpandable` | DOC | `(item) → boolean` | Predicate |
| `_validatePath` | DOC | `(val) → boolean` | Path validation (reads `DETAIL_PATH_RULES`) |
| `_recalcProgress` | DOC | `(side-effect on sample)` | Progress calculation logic can be extracted to pure fn |

---

## 7 Load Order Contract

```html
<!-- data (already exists) -->
<script src="data/case-detail-config.js"></script>

<!-- new split files -->
<script src="scripts/case-detail-runtime.js"></script>
<script src="scripts/case-detail-tabs.js"></script>
<script src="scripts/case-detail-renderers.js"></script>
<script src="scripts/case-detail-documents.js"></script>
<script src="scripts/case-detail-stage-actions.js"></script>
<script src="scripts/case-detail-page.js"></script>

<!-- existing shared scripts (after) -->
```

Each file wraps its code in an extending pattern:

```js
(function () {
  var ns = window.CaseDetailPage = window.CaseDetailPage || {};
  // ... define functions ...
  ns.setText = setText;
  // ...
})();
```

Later files read from `ns.*` to access earlier-defined functions.
