# Runtime API Contract: `window.CaseDetailPage`

> Produced by `define-runtime-api` task.
> Input: `AUDIT-GLOBAL-STATE-DETAIL.md`, `RENDER-BOUNDARY-MAP-DETAIL.md`.
> Consumers: `extract-runtime-file`, `extract-tab-file`, `extract-renderers-core`, `extract-documents-file`, `extract-stage-actions`, `slim-bootstrap`.

---

## 1 Namespace Convention

All six scripts share a single global facade:

```js
window.CaseDetailPage   // abbreviated as `ns` inside each file
```

Each file **extends** the namespace using the following pattern:

```js
(function () {
  'use strict';
  var ns = window.CaseDetailPage = window.CaseDetailPage || {};

  // — private variables / functions (not exported) —
  var _internalHelper = function () { /* ... */ };

  // — public definitions —
  function myPublicFn() { /* ... */ }

  // — register on namespace —
  ns.myPublicFn = myPublicFn;
})();
```

### 1.1 Rules

| # | Rule |
|---|------|
| R1 | Each file MUST use the extending IIFE pattern above. No file may overwrite `window.CaseDetailPage` with a fresh object. |
| R2 | Cross-file calls MUST go through `ns.*` (or `window.CaseDetailPage.*`). Direct closure-variable access across files is forbidden. |
| R3 | Private symbols (prefixed `_` or non-exported) MUST NOT be accessed from other files. |
| R4 | `liveState` is the single mutable shared-state object. All mutations MUST go through the RT or ACT layer — renderers and tabs MUST treat it as read-only. |
| R5 | External config globals (`DETAIL_TABS`, `DETAIL_SAMPLES`, `DETAIL_STAGES`, etc.) loaded from `data/case-detail-config.js` are read-only for all files. |
| R6 | Event listeners that cross file boundaries (e.g. DOC calling REN's `applyLogEntries`) MUST use namespace references, not hoisted closures. |

---

## 2 Load Order

```html
<script src="data/case-detail-config.js"></script>       <!-- config globals -->
<script src="scripts/case-detail-runtime.js"></script>    <!-- RT  -->
<script src="scripts/case-detail-tabs.js"></script>       <!-- TAB -->
<script src="scripts/case-detail-renderers.js"></script>  <!-- REN -->
<script src="scripts/case-detail-documents.js"></script>  <!-- DOC -->
<script src="scripts/case-detail-stage-actions.js"></script> <!-- ACT -->
<script src="scripts/case-detail-page.js"></script>       <!-- BOOT -->
```

Each file may only **read** namespace members registered by files loaded **before** it. The table below shows what is available at each load step:

| When file loads | Namespace already contains |
|---|---|
| RT | (empty) |
| TAB | RT exports |
| REN | RT + TAB exports |
| DOC | RT + TAB + REN exports |
| ACT | RT + TAB + REN + DOC exports |
| BOOT | all exports |

---

## 3 Per-File API Surface

### 3.1 RT — `case-detail-runtime.js`

Foundation layer: DOM helpers, CSS mappers, toast, session/URL context, `liveState` lifecycle, sync.

#### 3.1.1 Exports

| Symbol | Signature | Purpose |
|---|---|---|
| `setText` | `(id: string, value: any) → void` | Set `textContent` by element ID |
| `setHtml` | `(id: string, html: string) → void` | Set `innerHTML` by element ID |
| `esc` | `(str: string) → string` | HTML-escape a string |
| `avatarBg` | `(style: string) → string` | Avatar background CSS class |
| `avatarTextColor` | `(style: string) → string` | Avatar text color CSS class |
| `severityColor` | `(severity: string) → string` | CSS variable for severity |
| `severityBgClass` | `(severity: string) → string` | Background class for severity |
| `chipClass` | `(color: string) → string` | Chip badge CSS classes |
| `billingBadge` | `(status: string) → string` | Billing status badge CSS class |
| `showToast` | `(title: string, desc: string) → void` | Show toast notification |
| `readSessionJson` | `(key: string) → object\|null` | Read + parse sessionStorage |
| `writeSessionJson` | `(key: string, val: any) → void` | Stringify + write sessionStorage |
| `resolveUrlCaseContext` | `() → CaseContext\|null` | Resolve case from URL + session + `CASE_ID_MAP` |
| `syncToListStore` | `() → void` | Write stage changes back to list-page session stores |
| `liveState` | `object` (mutable) | The single shared mutable state object |
| `initLiveState` | `(sampleKey: string) → void` | Deep-copy sample data into `liveState` |
| `applyCaseOverrides` | `(ctx: CaseContext) → void` | Patch `liveState` + header DOM from list context |
| `isMgmtCase` | `() → boolean` | Check if current case is 経営管理 type |
| `bindCopyBtn` | `(btnId: string, sourceId: string) → void` | Wire a clipboard-copy button |
| `updateMsgStructuredVisibility` | `() → void` | Toggle structured fields for phone/meeting channels |
| `CASE_DETAIL_CONTEXT_KEY` | `string` (constant) | SessionStorage key for detail context |
| `CASE_LIST_DRAFTS_KEY` | `string` (constant) | SessionStorage key for list drafts |

#### 3.1.2 Private (NOT exported)

- `_toastTimer` — toast auto-hide timer handle

#### 3.1.3 External config consumed

`BILLING_STATUS`, `CASE_ID_MAP`, `DETAIL_SAMPLES`, `DETAIL_STAGES`, `POST_APPROVAL_STAGES`

---

### 3.2 TAB — `case-detail-tabs.js`

Tab navigation, hash sync, "More" dropdown menu.

#### 3.2.1 Exports

| Symbol | Signature | Purpose |
|---|---|---|
| `panels` | `object {key: HTMLElement}` | Map of tab-key → panel DOM element |
| `setActiveTab` | `(key: string) → void` | Activate a tab + panel, update "More" button state |
| `resolveHashTab` | `() → string\|null` | Read `#hash` and validate against `panels` |
| `setHash` | `(key: string) → void` | Write `#hash` via `replaceState` |

#### 3.2.2 Private (NOT exported)

- `primaryTabs`, `secondaryTabs`, `allTabLinks` — DOM caches
- `ACTIVE_TAB_CLS` — internal CSS class constant
- `SECONDARY_TAB_KEYS` — hash map of secondary tab keys
- `moreWrapper`, `moreTrigger`, `moreMenu` — DOM refs
- Tab click handlers, hashchange listener, More-menu toggle/dismiss

#### 3.2.3 Self-registered event listeners

| Event | Target | Purpose |
|---|---|---|
| `click` | `allTabLinks` elements | Tab switching + hash update |
| `click` | `moreTrigger` | Toggle "More" dropdown |
| `click` | `document` | Dismiss "More" dropdown on outside click |
| `hashchange` | `window` | Sync tab on browser back/forward |

#### 3.2.4 Namespace dependencies (reads from `ns`)

| Symbol | Source |
|---|---|
| `showToast` | RT (used in validation → docs jump handler) |

#### 3.2.5 Event listeners with cross-file navigation

These listeners live in TAB because they perform `setActiveTab` calls as the primary action:

| Block | Trigger | Navigation target | Also calls |
|---|---|---|---|
| `openValBtn` click | `#openValidationTab` | `setActiveTab('validation')` | — |
| overview shortcuts | `.overview-goto-validation`, `.overview-goto-billing`, `.overview-goto-deadlines` | `setActiveTab(*)` | — |
| view full log | button `查看完整日志 →` | `setActiveTab('log')` | — |
| validation → docs jump | `.blocker-jump-doc`, `.blocker-goto-docs`, `.blocker-create-task` | `setActiveTab('documents')` | `ns.showToast` (RT) |

---

### 3.3 REN — `case-detail-renderers.js`

All `apply*` display functions: read `liveState` + sample data → write DOM.

#### 3.3.1 Exports

| Symbol | Signature | Purpose |
|---|---|---|
| `applySample` | `(key: string) → void` | Master renderer — calls all `apply*` sub-renderers |
| `applyProviderProgress` | `(sample) → void` | Overview: provider progress bars |
| `applyRiskSummary` | `(sample) → void` | Overview: risk summary card |
| `applyOverviewHints` | `(sample) → void` | Overview: next-action + validation hint |
| `applyTimeline` | `(sample) → void` | Overview: timeline |
| `applyTeam` | `(sample) → void` | Overview: team card |
| `applyInfoFields` | `(sample) → void` | Info tab: form field values |
| `applyRelatedParties` | `(sample) → void` | Info tab: related parties |
| `applyDocsProgress` | `(sample) → void` | Documents tab: progress bar |
| `docStatusIcon` | `(status: string) → string` | SVG HTML for doc status |
| `docBadgeClass` | `(status: string) → string` | CSS class for doc status badge |
| `reviewActionLabel` | `(action: string) → string` | Review action display label |
| `reviewActionBadge` | `(action: string) → string` | Review action badge CSS class |
| `taskAvatarColor` | `(color: string) → string` | Task avatar CSS class |
| `taskDueBadge` | `(due, dueColor) → string` | Task due-date badge HTML |
| `applyTasks` | `(sample) → void` | Tasks tab: task list |
| `applyDeadlines` | `(sample) → void` | Deadlines tab: deadline cards |
| `applyValidation` | `(sample) → void` | Validation tab: gates + blocking + warnings |
| `applySubmissionPackages` | `() → void` | Validation tab: submission packages |
| `applyCorrectionPackage` | `(sample) → void` | Validation tab: correction package |
| `applyDoubleReview` | `(sample) → void` | Validation tab: double review records |
| `applyRiskConfirmationRecord` | `() → void` | Validation tab: risk confirmation record |
| `applyBillingSummary` | `() → void` | Billing tab: summary cards |
| `applyBillingTable` | `() → void` | Billing tab: payment table |
| `formatObjectType` | `(entry) → string` | Log entry object-type formatter |
| `applyLogEntries` | `() → void` | Log tab: timeline entries |
| `resetLogFilter` | `() → void` | Log tab: reset category filter to "all" |
| `applyReadonly` | `() → void` | Cross-tab: disable buttons/inputs for S9 |
| `applyMgmtTabs` | `() → void` | 経営管理 tab visibility + content |
| `applyImmigrationResultContent` | `() → void` | Immigration result panel content |
| `applyResidencePeriodContent` | `() → void` | Residence period panel content |

#### 3.3.2 Private (NOT exported)

- `_renderImmigrationOutcomeCard` — internal helper for immigration result rendering
- `logFilterBtns` — DOM cache for log filter buttons
- `providerToggle`, `providerBody`, `providerChevron` — DOM refs for provider collapse
- Event handlers for provider toggle, log filter, task toggle, message channel/publish

#### 3.3.3 Namespace dependencies (reads from `ns`)

| Symbol | Source |
|---|---|
| `setText`, `setHtml`, `esc` | RT |
| `avatarBg`, `avatarTextColor` | RT |
| `severityColor`, `severityBgClass` | RT |
| `chipClass`, `billingBadge` | RT |
| `showToast` | RT |
| `liveState` | RT |
| `isMgmtCase` | RT |
| `updateMsgStructuredVisibility` | RT |
| `panels` | TAB |
| `rebindRiskTrigger` | ACT (late-bound — called from `applyRiskConfirmationRecord`) |

> **Late binding note:** `applyRiskConfirmationRecord` calls `ns.rebindRiskTrigger()` which is registered by ACT (loaded after REN). This works because the call only executes at runtime, not at script-load time. The namespace lookup `ns.rebindRiskTrigger` resolves correctly because ACT has already loaded by the time any renderer runs.

---

### 3.4 DOC — `case-detail-documents.js`

Document list rendering, sub-renderers, action modals, expand/collapse, bulk operations.

#### 3.4.1 Exports

| Symbol | Signature | Purpose |
|---|---|---|
| `applyDocumentItems` | `(sample) → void` | Full document list rebuild |
| `docActionModal` | `object` | Encapsulated modal controller (see §3.4.3) |

#### 3.4.2 `docActionModal` sub-API

| Method | Signature | Purpose |
|---|---|---|
| `docActionModal.openApprove` | `(docName: string) → void` | Show approve-confirmation modal |
| `docActionModal.openReject` | `(docName: string) → void` | Show reject-with-reason modal |
| `docActionModal.openWaive` | `(docName: string) → void` | Show waive-with-reason modal |
| `docActionModal.openRegister` | `(docName: string) → void` | Show register-upload modal |
| `docActionModal.openReference` | `(docName: string) → void` | Show reference-selection modal |
| `docActionModal.doRemind` | `(docName: string) → void` | Direct toast + log (no modal) |

#### 3.4.3 Private (NOT exported)

- `renderVersionTable`, `renderReferenceInfo`, `renderReviewHistory`, `renderReminderHistory`, `renderInlineActions`, `renderDetailPanel`, `itemHasExpandable` — HTML builder sub-renderers
- `_showModal`, `_hideModal`, `_bindClose` — modal plumbing
- `_findDocItem`, `_reRender`, `_recalcProgress`, `_addLogEntry` — state mutation helpers
- `_validatePath`, `_updateRegisterEnabled`, `_updateWaiveEnabled` — form validation
- Expand/collapse handler, waive-btn delegation, inline-action delegation, bulk select/export/reuse handlers

#### 3.4.4 Namespace dependencies (reads from `ns`)

| Symbol | Source |
|---|---|
| `esc`, `setText`, `showToast` | RT |
| `liveState` | RT |
| `applyDocsProgress` | REN |
| `applyLogEntries` | REN |
| `docStatusIcon`, `docBadgeClass` | REN |
| `reviewActionLabel`, `reviewActionBadge` | REN |

#### 3.4.5 External config consumed

`DETAIL_SAMPLES`, `DETAIL_WAIVE_REASONS`, `DETAIL_REFERENCE_CANDIDATES`, `DETAIL_PATH_RULES`

---

### 3.5 ACT — `case-detail-stage-actions.js`

Stage workflow (S1–S9), risk modal, billing register, receipt handlers, advance-button management.

#### 3.5.1 Exports

| Symbol | Signature | Purpose |
|---|---|---|
| `rebindRiskTrigger` | `() → void` | Re-attach risk modal trigger after DOM re-render |
| `_refreshActionLabel` | `() → void` | Update advance-button label for current state |
| `_getStageActions` | `() → Array<Action>` | Build action list for current stage/sub-stage |

> **Naming note:** `_refreshActionLabel` and `_getStageActions` retain the underscore prefix for continuity with the existing codebase. They are namespace-public despite the prefix convention.

#### 3.5.2 Private (NOT exported)

- `_advanceMainStage` — generic stage push
- `_requestMaterials`, `_startReview`, `_runGateA`, `_enterValidation`, `_runGateB`, `_submitInitial` — S1–S7 named actions
- `_registerSupplementNotice`, `_registerImmigrationResult`, `_submitSupplement` — S7 sub-actions
- `_sendCoe`, `_startOverseasVisa`, `_confirmEntry`, `_saveResidencePeriod`, `_rejectOverseasVisa`, `_createRenewalReminders`, `_archiveCase` — S8→S9 post-approval flow
- `_addLog` — shared log-push helper
- `_updateHeaderDisplay` — refresh header badges from `liveState`
- `_showActionMenu` — render floating action menu
- `_mgmtMenuEl` — cached DOM ref for action menu
- `riskModal`, `riskSubmitBtn` — DOM refs
- `advanceBtn`, `editBtn`, `exportBtn` — DOM refs
- Event handlers for risk modal close, advance button, edit button, export button, billing 登記回款, receipt registration, sub001 panel, receipt save/diff

#### 3.5.3 Namespace dependencies (reads from `ns`)

| Symbol | Source |
|---|---|
| `liveState`, `setText`, `esc`, `showToast` | RT |
| `syncToListStore`, `isMgmtCase` | RT |
| `setActiveTab` | TAB |
| `applyLogEntries`, `applySubmissionPackages`, `applyReadonly` | REN |
| `applyBillingSummary`, `applyBillingTable` | REN |
| `applyRiskConfirmationRecord`, `applyImmigrationResultContent` | REN |

#### 3.5.4 External config consumed

`DETAIL_STAGES`, `POST_APPROVAL_STAGES`, `DETAIL_TOASTS`

---

### 3.6 BOOT — `case-detail-page.js` (slim bootstrap)

Init sequence, sample-select wiring, mgmt init, prototype feedback stubs.

#### 3.6.1 Exports

None. BOOT is the terminal consumer — it only reads from the namespace and orchestrates startup.

#### 3.6.2 Init sequence

```
1. caseContext   = ns.resolveUrlCaseContext()
2. initialSample = derive from caseContext or sampleSelect.value
3. ns.applySample(initialSample)
4. ns.initLiveState(initialSample)
5. ns.applyCaseOverrides(caseContext)
6. initialTab    = ns.resolveHashTab() || 'overview'
7. ns.setActiveTab(initialTab)
8. ns.applyMgmtTabs()
9. ns._refreshActionLabel()
```

#### 3.6.3 Namespace dependencies (reads from `ns`)

| Symbol | Source |
|---|---|
| `resolveUrlCaseContext`, `initLiveState`, `applyCaseOverrides` | RT |
| `showToast`, `bindCopyBtn` | RT |
| `CASE_DETAIL_CONTEXT_KEY` | RT |
| `resolveHashTab`, `setActiveTab` | TAB |
| `applySample`, `applyMgmtTabs` | REN |
| `_refreshActionLabel` | ACT |

---

## 4 `liveState` Access Policy

| File | Read | Write |
|---|---|---|
| **RT** | Yes | Yes — `initLiveState`, `applyCaseOverrides` |
| **TAB** | No | No |
| **REN** | Yes (via `ns.liveState`) | No — renderers are read-only consumers |
| **DOC** | Yes (via `ns.liveState`) | Yes — `_recalcProgress`, `_findDocItem` mutate doc-level fields; `_addLogEntry` pushes to `logEntries` |
| **ACT** | Yes (via `ns.liveState`) | Yes — all `_advance*` / action functions mutate stage/billing/log fields |
| **BOOT** | No direct access | No — delegates to `ns.initLiveState` and `ns.applyCaseOverrides` |

### 4.1 Mutation discipline

1. **RT** owns the lifecycle methods (`initLiveState`, `applyCaseOverrides`).
2. **ACT** owns stage-flow mutations (stageCode, postApprovalStage, resultOutcome, billing, etc.).
3. **DOC** owns document-level mutations (doc item status, progress recalc, log entries from doc actions).
4. After any mutation, the mutating file MUST call the appropriate `ns.apply*` renderer to sync the DOM.
5. **REN** and **TAB** MUST NOT write to `liveState`.

---

## 5 Circular Dependency Resolution

Two cross-file cycles exist. Both are resolved by late-bound namespace lookup:

| Cycle | Call path | Resolution |
|---|---|---|
| REN ↔ ACT | `applyRiskConfirmationRecord` (REN) → `ns.rebindRiskTrigger` (ACT) | ACT loads after REN. The call occurs at runtime (never at load time), so `ns.rebindRiskTrigger` is already defined when invoked. |
| REN ↔ DOC | `applySample` (REN) → `ns.applyDocumentItems` (DOC); `_reRender` (DOC) → `ns.applyDocsProgress` (REN) | DOC loads after REN. `applySample` calls `ns.applyDocumentItems` at runtime. `_reRender` calls `ns.applyDocsProgress` also at runtime. Both are defined by the time BOOT triggers the init sequence. |

**Invariant:** No file may call a namespace member from a later-loaded file during its own IIFE execution (script load time). All cross-file calls to later-loaded members must be deferred to runtime event handlers or the BOOT init sequence.

---

## 6 Config Globals Contract

These are window-level globals set by `data/case-detail-config.js`, loaded before all scripts.

| Global | Type | Consumer files |
|---|---|---|
| `DETAIL_TABS` | `Array<{key, label, icon, primary}>` | TAB (panel init), REN (`applyMgmtTabs`) |
| `DETAIL_SAMPLES` | `Object<sampleKey, SampleData>` | RT (`initLiveState`), REN (`applySample`), DOC (`_findDocItem`, `_reRender`, `_recalcProgress`), BOOT |
| `DETAIL_STAGES` | `Object<code, {code, label, badge}>` | RT (`applyCaseOverrides`, `syncToListStore`), ACT (`_advanceMainStage`, `_registerImmigrationResult`, `_updateHeaderDisplay`) |
| `DETAIL_TOASTS` | `Object<key, {title, desc}>` | ACT (`exportBtn` handler) |
| `BILLING_STATUS` | `Object<code, {label, badge}>` | RT (`billingBadge`) |
| `POST_APPROVAL_STAGES` | `Object<code, {code, label, badge}>` | RT (`syncToListStore`), REN (`applySample`), ACT (`_updateHeaderDisplay`) |
| `RESULT_OUTCOMES` | `Object<code, {code, label, badge}>` | HTML only |
| `CASE_ID_MAP` | `Object<caseId, {...}>` | RT (`resolveUrlCaseContext`) |
| `DETAIL_WAIVE_REASONS` | `Object<code, label>` | DOC (waive confirm handler) |
| `DETAIL_REFERENCE_CANDIDATES` | `Array<CandidateObj>` | DOC (`openReference`, reference confirm handler) |
| `DETAIL_PATH_RULES` | `{forbiddenPatterns, forbiddenLeadingChars, forbiddenCharsRegex}` | DOC (`_validatePath`) |

---

## 7 Extending the Namespace

When adding a new function during extraction:

1. Decide which file owns it based on the domain coverage matrix (see `RENDER-BOUNDARY-MAP-DETAIL.md` §4).
2. If it needs cross-file access, add it to the relevant exports table in this document.
3. If it only serves the owning file, keep it private (do NOT export).
4. Update `split-manifest-detail.json` scripts entries if file responsibilities change.

---

## 8 Verification Checklist

After all extraction tasks are complete, verify:

- [ ] Every symbol listed in §3 exports tables is actually registered on `ns` in the corresponding file.
- [ ] No file accesses a symbol from a later-loaded file at IIFE execution time.
- [ ] No file writes to `liveState` in violation of §4 access policy.
- [ ] `detail.html` script tags match the order in §2.
- [ ] All cross-file calls use `ns.*` notation, not closure captures from the old monolithic IIFE.
- [ ] `npm run fix` and `npm run guard` pass.
