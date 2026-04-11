# Command Surface — Prototype Split Pipeline

Five project-level commands, each scoped to one pipeline phase.
Every command MUST call its gate script before producing output and MUST NOT proceed if the gate fails.

Machine-readable command definitions live in `data/command-surface.json`, which includes exact parameters, script call sequences, and quantified stop condition IDs. This document is the human-readable companion.

---

## 1. `prototype-split-init`

**Phase**: init
**Purpose**: Create module skeleton — directories, blank manifest, template docs.

### Input

| Parameter | Required | Description |
|---|---|---|
| `--module-dir` | yes | Target module path relative to workspace root |
| `--module-id` | yes | kebab-case module identifier |
| `--module-label` | yes | Human-readable module name |
| `--entry-file` | no | Entry HTML path (defaults to `{module-dir}/index.html`) |

### Mandatory script calls

```bash
node .cursor/skills/prototype-module-split/scripts/scaffold-split.mjs \
  --module-dir <path> --module-id <id> --module-label <label> [--entry-file <file>]
node .cursor/skills/prototype-module-split/scripts/validate-manifest.mjs \
  --manifest <module-dir>/split-manifest.json
```

### Output

- `split-manifest.json` (minimal skeleton)
- `P0-CONTRACT.md`, `SPLIT-ARCHITECTURE.md`, `MIGRATION-MAPPING.md` (templates)
- `sections/`, `scripts/`, `data/` directories created

### Stop conditions (all must be true)

| ID | Check | Quantifier |
|---|---|---|
| SC-INIT-1 | directories_exist | all 3 directories (`sections/`, `scripts/`, `data/`) exist on disk |
| SC-INIT-2 | validate_manifest | `validate-manifest.mjs` exits 0 (zero schema errors) |
| SC-INIT-3 | required_fields | `moduleId`, `moduleLabel`, `moduleDir`, `entryFile` are all non-empty |
| SC-INIT-4 | files_exist | `P0-CONTRACT.md`, `SPLIT-ARCHITECTURE.md`, `MIGRATION-MAPPING.md` exist |
| SC-INIT-5 | no_ai_content | `sections`/`dataFiles`/`scripts` arrays are empty (skeleton only) |

---

## 2. `prototype-split-audit`

**Phase**: audit
**Purpose**: Inventory all globals, DOM refs, state, helpers, events, and init order from the source script.

### Input

| Parameter | Required | Description |
|---|---|---|
| `--module-dir` | yes | Module path |
| `--source-script` | yes | Path to the monolithic source script to audit |
| `--suffix` | no | Manifest suffix for sub-modules (e.g. `detail`) |

### Mandatory script calls (in order)

```bash
# 1. Verify init phase completed
node .cursor/skills/prototype-module-split/scripts/phase-gate.mjs \
  --module-dir <path> --target-phase audit [--suffix <suffix>]
# 2. After producing audit-manifest, validate schema + provenance
node .cursor/skills/prototype-module-split/scripts/validate-manifest.mjs \
  --manifest <module-dir>/audit-manifest[-suffix].json --type audit-manifest --check-provenance
# 3. Verify extracted symbols exist in source
node .cursor/skills/prototype-module-split/scripts/anti-cheat-check.mjs \
  --module-dir <path> [--suffix <suffix>]
```

### Output

- `audit-manifest[-suffix].json` — globals, DOM refs, session keys, liveState, helpers, events, init sequence, affinity tags

### Stop conditions (all must be true)

| ID | Check | Quantifier |
|---|---|---|
| SC-AUDIT-1 | phase_gate | `phase-gate.mjs --target-phase audit` exits 0 |
| SC-AUDIT-2 | validate_manifest | zero schema errors AND zero provenance errors (`--check-provenance`) |
| SC-AUDIT-3 | sourceInputs_present | ≥1 sourceInput with non-empty `sha256` |
| SC-AUDIT-4 | anti_cheat | all `externalGlobals[].name` and `helperFunctions[].name` found in source text |
| SC-AUDIT-5 | unknowns_complete | zero orphan symbols — every audited symbol is in `affinityTags` or `unknowns[]` |
| SC-AUDIT-6 | affinity_coverage | `sum(affinityTags[*].symbols.length) + unknowns.length ≥ helperFunctions.length` |
| SC-AUDIT-7 | anti_cheat_pass | `anti-cheat-check.mjs` exits 0 |

---

## 3. `prototype-split-boundary`

**Phase**: boundary
**Purpose**: Assign every audited symbol to a target file, define dependency edges and load order.

### Input

| Parameter | Required | Description |
|---|---|---|
| `--module-dir` | yes | Module path |
| `--suffix` | no | Manifest suffix |

### Mandatory script calls (in order)

```bash
# 1. Verify audit phase completed
node .cursor/skills/prototype-module-split/scripts/phase-gate.mjs \
  --module-dir <path> --target-phase boundary [--suffix <suffix>]
# 2. After producing boundary-map, validate schema + provenance
node .cursor/skills/prototype-module-split/scripts/validate-manifest.mjs \
  --manifest <module-dir>/boundary-map[-suffix].json --type boundary-map --check-provenance
# 3. Cross-check against source
node .cursor/skills/prototype-module-split/scripts/anti-cheat-check.mjs \
  --module-dir <path> [--suffix <suffix>]
```

### Output

- `boundary-map[-suffix].json` — target files, function assignments, dependency edges, namespace API, load order

### Stop conditions (all must be true)

| ID | Check | Quantifier |
|---|---|---|
| SC-BND-1 | phase_gate | `phase-gate.mjs --target-phase boundary` exits 0 |
| SC-BND-2 | validate_manifest | zero schema errors AND zero provenance errors (`--check-provenance`) |
| SC-BND-3 | symbol_coverage | `boundary-map.functions.length ≥ audit-manifest.helperFunctions.length` (delta in unknowns/waivers) |
| SC-BND-4 | no_unresolved_cycles | `circularDependencies.length == 0` OR every cycle has non-empty `mitigation` |
| SC-BND-5 | topo_sort_valid | `loadOrder` is a valid topological sort — no edge from later to earlier |
| SC-BND-6 | loadOrder_coverage | every `loadOrder` entry matches a `targetFiles[].shorthand` |
| SC-BND-7 | anti_cheat_pass | `anti-cheat-check.mjs` exits 0 |
| SC-BND-8 | no_premature_approval | `phase.reviewApproval` is absent (review is next phase) |

---

## 4. `prototype-split-review`

**Phase**: review
**Purpose**: Human review and approval of audit + boundary artifacts before file execution.

### Input

| Parameter | Required | Description |
|---|---|---|
| `--module-dir` | yes | Module path |
| `--suffix` | no | Manifest suffix |

### Mandatory script calls

```bash
# 1. Verify boundary phase completed
node .cursor/skills/prototype-module-split/scripts/phase-gate.mjs \
  --module-dir <path> --target-phase review [--suffix <suffix>]
```

### Workflow

1. Present `audit-manifest` summary: count of globals, DOM refs, helpers, events, unknowns.
2. Present `boundary-map` summary: target file count, function count, cross-file edges, load order.
3. Highlight all `unknowns[]` and `waivers[]` from both manifests.
4. Highlight all `inferred`-provenance items that affect file boundaries.
5. Request explicit human confirmation for each of:
   - Target file structure is acceptable.
   - Function-to-file assignments are correct.
   - Unknowns are triaged (resolved, waived, or accepted).
   - Load order is verified.
6. Record approval in `boundary-map.phase.reviewApproval`.

### Output

- Updated `boundary-map[-suffix].json` with `phase.reviewApproval` populated:
  - `approved: true` or `approved: false`
  - `approvedBy` (reviewer identifier)
  - `approvedAt` (ISO timestamp)
  - `notes` (optional)
  - `disputedItems` (item IDs that were contested)

### Stop conditions (all must be true)

| ID | Check | Quantifier |
|---|---|---|
| SC-REV-1 | phase_gate | `phase-gate.mjs --target-phase review` exits 0 |
| SC-REV-2 | approval_recorded | `boundary-map.phase.reviewApproval.approved` is explicitly `true` or `false` |
| SC-REV-3 | approver_identified | `approvedBy` is non-empty string |
| SC-REV-4 | blocking_unknowns_resolved | zero blocking unknowns without waiver in both audit-manifest and boundary-map |
| SC-REV-5 | rejection_blocks | if `approved == false`, pipeline MUST NOT proceed to execute |

---

## 5. `prototype-split-execute`

**Phase**: execute
**Purpose**: Create the actual `sections/`, `scripts/`, `data/` files according to the approved boundary map.

### Input

| Parameter | Required | Description |
|---|---|---|
| `--module-dir` | yes | Module path |
| `--suffix` | no | Manifest suffix |

### Mandatory script calls (in order)

```bash
# 1. Verify review approval exists
node .cursor/skills/prototype-module-split/scripts/phase-gate.mjs \
  --module-dir <path> --target-phase execute [--suffix <suffix>]

# 2. After creating files, validate split-manifest + provenance
node .cursor/skills/prototype-module-split/scripts/validate-manifest.mjs \
  --manifest <module-dir>/split-manifest[-suffix].json --check-provenance

# 3. Check filesystem sync
node .cursor/skills/prototype-module-split/scripts/drift-check.mjs \
  --manifest <module-dir>/split-manifest[-suffix].json

# 4. Verify source integrity
node .cursor/skills/prototype-module-split/scripts/anti-cheat-check.mjs \
  --module-dir <path> [--suffix <suffix>]
```

### Output

- `sections/*.html` files
- `scripts/*.js` files
- `data/*.js` files
- Updated `split-manifest.json` with full section/script/data records
- Updated `P0-CONTRACT.md`, `SPLIT-ARCHITECTURE.md`, `MIGRATION-MAPPING.md` with actual content

### Stop conditions (all must be true)

| ID | Check | Quantifier |
|---|---|---|
| SC-EXEC-1 | phase_gate | `phase-gate.mjs --target-phase execute` exits 0 (review approval is `true`) |
| SC-EXEC-2 | all_declared_exist | 100% of `split-manifest` `sections`/`dataFiles`/`scripts` files exist on disk |
| SC-EXEC-3 | no_undeclared_files | zero files in `sections/`, `scripts/`, `data/` that are not in manifest |
| SC-EXEC-4 | drift_check_pass | `drift-check.mjs` exits 0 (zero phantom, undeclared, stale, missing-ref issues) |
| SC-EXEC-5 | anti_cheat_pass | `anti-cheat-check.mjs` exits 0 (exports, domHooks exist in file content) |
| SC-EXEC-6 | fingerprints_current | all `sourceInputs[].sha256` match current file hashes |
| SC-EXEC-7 | no_new_blocking_unknowns | zero new blocking unknowns introduced during execution |

---

## Command-to-script mapping summary

| Command | Phase | Gate script | Validate | Drift | Anti-cheat |
|---|---|---|---|---|---|
| `prototype-split-init` | init | — | split-manifest | — | — |
| `prototype-split-audit` | audit | audit gate | audit-manifest | — | yes |
| `prototype-split-boundary` | boundary | boundary gate | boundary-map | — | yes |
| `prototype-split-review` | review | review gate | — | — | — |
| `prototype-split-execute` | execute | execute gate | split-manifest | yes | yes |

A sixth command, `prototype-split-closeout`, may be added when regression-checklist workflows are finalized. It would run `phase-gate --target-phase closeout`, produce `regression-checklist.json`, and verify all `mustPassIds` items have verdicts.
