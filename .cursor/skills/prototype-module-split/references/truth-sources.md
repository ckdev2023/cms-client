# Truth Sources — Field Provenance Classification

Each field in the four pipeline schemas is classified as one of:

| Provenance | Meaning | Verification |
|---|---|---|
| **extracted** | Value obtained from source code static scan or controlled file read. MUST bind `sourceInputs` with SHA-256 fingerprint. | `anti-cheat-check.mjs` verifies symbol/selector exists in source. `drift-check.mjs` verifies fingerprints. |
| **inferred** | Value produced by AI judgment or human reasoning. MUST include `reason` when the field-level `reason` property exists. | Human review gate; no automated ground-truth available. |
| **manual** | Value requiring explicit human input (approvals, waivers, design decisions). Cannot be auto-filled. | `phase-gate.mjs` blocks progression if missing. |

## Rules

1. A field marked **extracted** below MUST have `provenance: "extracted"` and its parent artifact MUST list the scanned file(s) in `sourceInputs` with `sha256`.
2. A field marked **inferred** MUST have `provenance: "inferred"`. If the record schema has a `reason` property, it MUST be non-empty.
3. A field marked **manual** is NOT covered by `provenance` enum — it lives in structures like `unknowns`, `waivers`, or `phase.reviewApproval` that require human write.
4. If an AI cannot determine an extracted field from source, the item MUST go into `unknowns[]` (with `impact: "blocking"` if it affects execute) rather than being silently filled as inferred.
5. `anti-cheat-check.mjs` cross-references extracted claims against source content. Inferred fields are NOT verified by scripts — they rely on the review gate.

---

## audit-manifest.schema.json

### Fields that MUST be `extracted`

| Record type | Fields | How to extract |
|---|---|---|
| `externalGlobals[]` | `name`, `declaredIn`, `firstRefLine`, `readSites`, `writeSites` | Regex scan for `window.X` / top-level `var`/`const`/`let` outside IIFE |
| `iifeConstants[]` | `name`, `line`, `value` | Scan IIFE body for `const`/`let`/`var` declarations |
| `domReferences[]` | `variable`, `line`, `selector`, `consumers` | Scan for `getElementById` / `querySelector` + variable assignments |
| `sessionStorage.keys[]` | `key`, `access`, `writers`, `readers` | Scan for `sessionStorage.getItem` / `setItem` patterns |
| `sessionStorage.urlParams[]` | `param`, `line`, `reader` | Scan for `URLSearchParams` / `searchParams.get` |
| `liveState.fields[]` | `field`, `type`, `mutators` | Scan state init function for property assignments + mutation sites |
| `helperFunctions[]` | `name`, `line`, `signature`, `callSiteCount` | Scan function declarations + count call sites |
| `eventListeners[]` | `event`, `line`, `selector`, `isDelegated` | Scan `addEventListener` / `on*` / delegated event patterns |
| `initSequence[]` | `order`, `call` | Trace `DOMContentLoaded` / init function call order |
| `sourceInputs[]` | `file`, `sha256`, `scannedAt` | File system read + crypto hash |

### Fields that CAN be `inferred`

| Record type | Fields | Why inference is acceptable |
|---|---|---|
| `externalGlobals[]` | `type` | TypeScript-style type requires interpretation of value usage |
| `domReferences[]` | `group` | Functional grouping is a design judgment |
| `helperFunctions[]` | `category` | Category assignment requires understanding function purpose |
| `eventListeners[]` | `domain` | Business domain mapping requires semantic understanding |
| `liveState.fields[]` | `purpose`, `deepCloned` | Purpose is a summary; deepClone detection is heuristic |
| `initSequence[]` | `description`, `dependsOn` | Description is a summary; dependsOn requires control-flow analysis |
| `affinityTags[]` | `tag`, `symbols`, `targetFile`, `reason` | Grouping and file targeting are design decisions |

### Fields that are `manual`

| Location | Fields | Why manual is required |
|---|---|---|
| `unknowns[]` | `id`, `description`, `impact` | Items the AI could not classify — human must triage |
| `waivers[]` | `id`, `description`, `reason`, `approvedBy` | Explicit human exception approval |

---

## boundary-map.schema.json

### Fields that MUST be `extracted`

| Record type | Fields | How to extract |
|---|---|---|
| `functions[]` | `name`, `lines`, `signature` | Scan source for function declarations with line ranges |
| `functions[]` | `callsOutbound`, `calledByInbound` | Static call-graph analysis across function bodies |
| `dependencyEdges[]` | `from`, `to`, `functions` | Derived from `callsOutbound`/`calledByInbound` after target assignment |
| `eventListeners[]` | `event`, `line`, `selector`, `calls` | Same extraction as audit-manifest events |
| `sourceInputs[]` | `file`, `sha256`, `scannedAt` | File system read + crypto hash |

### Fields that CAN be `inferred`

| Record type | Fields | Why inference is acceptable |
|---|---|---|
| `targetFiles[]` | `file`, `shorthand`, `responsibility` | File structure is a design decision |
| `functions[]` | `targetFile`, `domain`, `isNamespaceExport`, `isPure` | Assignment and classification require design judgment |
| `eventListeners[]` | `targetFile` | Assignment to target file is a design decision |
| `namespaceApi[]` | `file`, `symbols` | Which symbols to export is a design decision |
| `loadOrder[]` | (entire array) | Derived from dependency edges but order among independent nodes is a choice |
| `circularDependencies[]` | `cycle`, `path`, `mitigation` | Cycle detection is extracted; mitigation strategy is inferred |
| `domainCoverage` | (entire object) | Derived summary — useful but not ground truth |

### Fields that are `manual`

| Location | Fields | Why manual is required |
|---|---|---|
| `phase.reviewApproval` | `approved`, `approvedBy`, `approvedAt`, `notes`, `disputedItems` | Human review gate — blocks execute if absent |
| `unknowns[]` | all | Human triage required |
| `waivers[]` | all | Human exception approval |

---

## split-manifest.schema.json

### Fields that MUST be `extracted`

| Record type | Fields | How to extract |
|---|---|---|
| `sections[]` | `file`, `sourceAnchors` | File existence check + anchor IDs from HTML scan |
| `dataFiles[]` | `file`, `exports`, `consumers` | File existence + exported symbol scan + consumer grep |
| `scripts[]` | `file`, `domHooks`, `dependsOn` | File existence + DOM selector scan + import/call analysis |
| `sourceInputs[]` | `file`, `sha256`, `scannedAt` | File system read + crypto hash |

### Fields that CAN be `inferred`

| Record type | Fields | Why inference is acceptable |
|---|---|---|
| `sections[]` | `purpose`, `contractRefs`, `productionTarget` | Require understanding of business intent |
| `dataFiles[]` | `purpose`, `demoOnly`, `productionTarget` | demoOnly requires judgment; mapping is design |
| `scripts[]` | `purpose`, `namespace`, `demoOnly`, `productionTarget` | Same reasoning as dataFiles |
| `sharedCandidates` | `styles`, `shell`, `scripts` | Shared extraction is a design decision |
| `productionMapping` | all sub-arrays | Production architecture mapping is a design decision |
| `regressionChecklist` | (entire array) | Derived from contract and spec; summarized |
| `notes` | (entire array) | Free-form commentary |

### Fields that are `manual`

| Location | Fields | Why manual is required |
|---|---|---|
| `unknowns[]` | all | Human triage required |
| `waivers[]` | all | Human exception approval |

---

## regression-checklist.schema.json

### Fields that CAN be `inferred`

| Record type | Fields | Why inference is acceptable |
|---|---|---|
| `gates[]` | `id`, `scenario`, `passRule`, `mustPassIds` | Gate design is a judgment call based on contract |
| `gates[].items[]` | `id`, `description`, `tag`, `contractRef` | Item derivation from spec requires interpretation |

### Fields that are `manual`

| Location | Fields | Why manual is required |
|---|---|---|
| `gates[].items[]` | `verdict`, `testedAt`, `notes` | Test results require human execution |
| `gates[].items[]` | `blockedBy`, `deferredTo` | Blocking/deferral decisions are human |
| `closeoutStatus` | all fields | Closeout is a human sign-off |
| `unknowns[]` | all | Human triage |
| `waivers[]` | all | Human exception approval |

---

## Anti-fabrication safeguards

The primary threat is manifests that are self-consistent with each other but collectively wrong against reality.

### Automated enforcement

| Script | What it catches | When to run |
|---|---|---|
| `validate-manifest.mjs --check-provenance` | Mandatory-extracted fields that are empty or carry wrong provenance class | Every phase |
| `drift-check.mjs` | Phantom entries, undeclared files, stale `sourceInputs` SHA-256 fingerprints | After execute, before closeout |
| `anti-cheat-check.mjs` | Claimed symbols/selectors/exports missing from actual source; moduleId mismatch across manifests | After audit and boundary phases |
| `phase-gate.mjs` | Missing prerequisite artifacts; blocking unknowns; absent review approval | Before each phase transition |

### Specific anti-fabrication rules

1. **Fingerprint binding**: Every `extracted` field's parent artifact must have `sourceInputs` with `sha256`. `drift-check.mjs` verifies hashes match current file content.
2. **Symbol existence**: `anti-cheat-check.mjs` reads actual source files (not other manifests) and verifies that claimed symbol names, selectors, and exports appear in the text.
3. **Cross-manifest consistency**: `anti-cheat-check.mjs` verifies `moduleId` matches across all manifests in the same module directory.
4. **Unknowns prohibition**: Fields that cannot be verified from source MUST NOT be silently set to `extracted`. They go into `unknowns[]` with an impact assessment (`blocking` or `non-blocking`).
5. **Review gate**: `phase-gate.mjs` requires `phase.reviewApproval.approved === true` in `boundary-map` before allowing execute. This catches inferred-field errors that scripts cannot detect.
6. **Provenance ratio check**: `validate-manifest.mjs --check-provenance` uses `truth-source-registry.json` to verify that mandatory-extracted paths are non-empty and that records marked `inferred` do not claim extracted-only fields.

### What scripts CANNOT catch

- Semantic correctness of `inferred` fields (e.g., wrong `category`, incorrect `targetFile` assignment)
- Business logic errors in `affinityTags` groupings
- Completeness of `unknowns[]` — AI might miss items that should be flagged

These gaps are closed only by human review at the review phase.

## Machine-readable registries

Two complementary registries define the provenance discipline:

### `data/truth-source-registry.json` (record-level)

Used by `validate-manifest.mjs --check-provenance`. Defines:

- `provenanceClasses` — the four classes and their verification methods
- `schemas.<type>.perRecord.<array>.<field>` — required provenance per field
- `schemas.<type>.mandatoryExtractedPaths` — JSON-path list of fields that must be non-empty and extracted
- `schemas.<type>.reviewGatedFields` — fields that block without human approval
- `schemas.<type>.humanApprovalRequired` — fields only humans can fill

### `data/field-provenance-registry.json` (field-path-level, always-on)

Used by both `validate-manifest.mjs` (always-on) and `anti-cheat-check.mjs`. Defines:

- `provenanceLevels` — extracted, inferred, derived, human
- `verificationMethods` — regex-scan, file-exists, line-range, symbol-grep, selector-grep, cross-field, fingerprint, human-review
- `artifacts.<type>.fields.<dotPath>` — required provenance and verification method per field path (e.g. `"externalGlobals[*].name": { "required": "extracted", "verification": "symbol-grep" }`)
- `enforcementRules` — E1–E8 machine-enforceable rules with script assignments

The always-on enforcement (no CLI flag needed) catches:
- Must-extract fields incorrectly marked as `provenance: "inferred"` (blocking error)
- Manifests with extracted fields but no `sourceInputs` with SHA-256 (blocking error)
- Inferred fields without `reason` (warning)

### Relationship between registries

Both registries encode the same classification with different granularity. `truth-source-registry.json` uses nested `perRecord` + `mandatoryExtractedPaths` arrays. `field-provenance-registry.json` uses flat dot-path keys with explicit `verification` methods. Both MUST agree on which fields are extracted vs inferred. If they diverge, `field-provenance-registry.json` takes precedence for runtime enforcement.

## Anti-fabrication checks beyond scripts

The primary threat is manifests that are self-consistent with each other but collectively wrong against reality.

### What scripts catch

| Check | Threat | Script |
|-------|--------|--------|
| Fingerprint binding | Source changed after manifest creation | `drift-check.mjs` |
| Symbol existence | Claimed symbols/selectors don't exist in source | `anti-cheat-check.mjs` |
| Cross-manifest moduleId | Copy-paste fabrication between modules | `anti-cheat-check.mjs` |
| Derived field consistency | dependencyEdges don't match function assignments | `anti-cheat-check.mjs` |
| Suspicious zero unknowns | Complex module (>200 lines) with no unknowns or waivers | `anti-cheat-check.mjs` (warning) |
| Provenance level violation | Must-extract field marked as inferred | `validate-manifest.mjs` |
| Missing sourceInputs | Extracted claims without fingerprint backing | `validate-manifest.mjs` |
| Premature human fields | Review approval set before review phase | `phase-gate.mjs` |

### What scripts CANNOT catch

- Semantic correctness of `inferred` fields (e.g., wrong `category`, incorrect `targetFile` assignment)
- Business logic errors in `affinityTags` groupings
- Completeness of `unknowns[]` — AI might miss items that should be flagged
- Whether a function's `callsOutbound` list is complete (only checks existence, not completeness)

These gaps are closed only by human review at the review phase.
