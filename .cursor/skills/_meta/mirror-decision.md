# T15 — Mirror Decision

> Date: 2026-04-10 (updated 2026-04-11)
> Prerequisite: T14 dry-run review passed; pipeline cross-references wired (T16)

---

## 1. Decision

**Do NOT mirror now.** Keep `.cursor/skills/` as the single authoritative source. `.augment/skills/` and `.trae/skills/` contain partially-synced copies with known drift. Revisit when multi-editor usage actually begins.

---

## 2. Current State Assessment

### 2.1 `.cursor/skills/` — Authoritative

- 12 skills, all conforming to SKILL-PROTOCOL v1.2
- Skills: `admin-module-scaffold`, `business-doc-compiler`, `cursor-task-orchestrator`, `delivery-guardrail`, `page-spec-generator`, `prototype-module-split`, `prototype-regression-checklist`, `prototype-split-orchestrator`, `prototype-to-production-mapping`, `shared-shell-extractor`, `test-case-suggester`, `workflow-state-modeler`
- `_meta/` with protocol, template, baseline audit, dry-run review, mirror decision
- T14 dry-run: 15 simulated requests, 0 misfires, full billing pipeline verified
- T16: pipeline cross-references and Pipeline Position sections added to 5 pipeline-aware skills

### 2.2 `.augment/skills/` — Partially Synced, Drifted

11 of 12 canonical skills present (`prototype-split-orchestrator` missing). `_meta/` directory present with all 5 files.

| Sync status | Skills |
|-------------|--------|
| **In sync** (5) | `admin-module-scaffold`, `business-doc-compiler`, `cursor-task-orchestrator`, `prototype-to-production-mapping`, `test-case-suggester` |
| **Drifted** (6) | `delivery-guardrail`, `page-spec-generator`, `prototype-module-split`, `prototype-regression-checklist`, `shared-shell-extractor`, `workflow-state-modeler` |
| **Missing** (1) | `prototype-split-orchestrator` |

Drift cause: canonical copies received pipeline cross-references, Pipeline Position sections, and structured artifact annotations that were not propagated.

### 2.3 `.trae/skills/` — Partially Synced, Drifted + Editor-Local Skills

Same 11 canonical skills as `.augment/` with identical drift pattern. `_meta/` directory present.

| Sync status | Skills |
|-------------|--------|
| **In sync** (5) | Same as §2.2 |
| **Drifted** (6) | Same as §2.2 |
| **Missing** (1) | `prototype-split-orchestrator` |
| **Editor-local** (2) | `atomic-task-splitter`, `ui-ux-pro-max` (Trae-only, not in canonical set) |

---

## 3. Rationale

### 3.1 Arguments against mirroring now

| # | Risk | Impact |
|---|------|--------|
| 1 | **Triple maintenance burden** — 12 skills × 3 dirs = 36+ SKILL.md files, plus `_meta/`, references, data, scripts | High: any protocol update or skill revision must be applied 3× manually |
| 2 | **No automated sync mechanism** — manual copy is error-prone; current state already has 6 drifted skills | High: drift is already demonstrated (§2.2), confirming this risk |
| 3 | **Alien skills in `.trae/`** — `atomic-task-splitter` and `ui-ux-pro-max` are Trae-specific and do not follow SKILL-PROTOCOL | Medium: sync must implement whitelist-preserve, not blanket copy |
| 4 | **Only Cursor is actively used** — no evidence of active Augment or Trae usage for this project | High: mirroring to unused directories is pure cost |
| 5 | **Dry-run validated only `.cursor/` skills** — re-validation would be needed post-mirror | Low: identical content should behave identically, but path references in SKILL.md would need updating |
| 6 | **AGENTS.md already serves as cross-editor truth** — rules are centralized; skills don't need the same treatment yet | Low: rules and skills have different discovery mechanisms |

### 3.2 Arguments for mirroring (deferred)

| # | Benefit | When it matters |
|---|---------|----------------|
| 1 | Agents in other editors would get up-to-date skill guidance | When team members actively use Augment or Trae |
| 2 | Consistent behavior across editors | When multi-editor workflow is established |
| 3 | Eliminates stale-copy confusion | Partially addressed by removing stale copies now |

### 3.3 Current drift is contained

The 6 drifted skills in `.augment/` and `.trae/` are not pre-protocol—they follow SKILL-PROTOCOL but lack pipeline cross-references and Pipeline Position sections added in the latest round. An agent in Augment or Trae would get functionally correct skill guidance but miss bidirectional pipeline links. The `DEPRECATED.md` files in both directories warn agents to prefer `.cursor/skills/`. This drift is low-risk as long as only Cursor is actively used.

---

## 4. Action Items

### 4.1 Completed

1. ~~Add `DEPRECATED.md` to `.augment/skills/` and `.trae/skills/`~~ — Done (2026-04-10)
2. ~~Keep existing `.augment/` and `.trae/` skill files as-is~~ — Done; 11 skills + `_meta/` are present in both
3. ~~Design mirror strategy (§6)~~ — Done (2026-04-11); canonical source, mirror set, whitelist, drift protection, sync spec all defined

### 4.2 When multi-editor usage begins (future trigger)

1. Create `scripts/check-skill-drift.mjs` per §6.4 spec
2. Create `scripts/sync-skills.sh` per §6.5 spec
3. Execute §6.6 Activation Checklist

### 4.3 Trae-specific skills disposition

`atomic-task-splitter` and `ui-ux-pro-max` are Trae-only. If they are valuable:
- Evaluate for promotion to `.cursor/skills/` (requires SKILL-PROTOCOL conformance)
- Or keep as editor-local skills outside the canonical set — currently whitelisted in §6.3

---

## 5. Decision Criteria for Future Reversal

Mirror when **all** of the following are true:

1. At least one team member actively uses Augment or Trae for this project
2. An automated sync script exists and is tested
3. A drift-detection mechanism is in place (CI or pre-commit)
4. The SKILL-PROTOCOL is stable (no breaking changes planned)

---

## 6. Mirror Strategy Design (ready-to-execute when trigger fires)

The following subsections define the concrete spec for mirroring. They are designed ahead of time so activation is mechanical, not a design exercise.

### 6.1 Canonical Source

| Property | Value |
|----------|-------|
| Authority | `.cursor/skills/` |
| Reason | Protocol, `_meta/`, references, data, scripts most complete here; dry-run validated |
| Edit rule | All skill edits MUST land in `.cursor/skills/` first; mirror targets are read-only copies |
| Version tracking | `_meta/SKILL-PROTOCOL.md` version field is the protocol clock; skill-level changes tracked via git |

### 6.2 Mirror Minimum Set

Not every file in `.cursor/skills/` needs mirroring. The minimum set ensures agents in other editors get correct guidance without bloating those directories.

| File category | Mirror? | Reason |
|---------------|---------|--------|
| `<skill>/SKILL.md` | **Yes** | Core skill definition — agents need this to function |
| `<skill>/references/*.md` | **Yes** | Referenced by SKILL.md for rules, examples, walkthroughs |
| `<skill>/data/*.json` | **Yes** | Schema and registry files referenced by scripts and SKILL.md |
| `<skill>/scripts/*.mjs` | **Yes** | Gate scripts invoked during pipeline — must be discoverable |
| `_meta/SKILL-PROTOCOL.md` | **Yes** | Protocol definition referenced by every SKILL.md |
| `_meta/SKILL-TEMPLATE.md` | **Yes** | Template for new skills |
| `_meta/baseline-audit.md` | No | Audit record, Cursor-specific |
| `_meta/dry-run-review.md` | No | Review record, Cursor-specific |
| `_meta/mirror-decision.md` | No | This document, Cursor-specific |

**Summary**: mirror `SKILL.md` + `references/` + `data/` + `scripts/` per skill (currently 12 canonical skills), plus `_meta/SKILL-PROTOCOL.md` and `_meta/SKILL-TEMPLATE.md`. Exclude audit/review/decision records.

**Canonical skill inventory** (as of 2026-04-11): `admin-module-scaffold`, `business-doc-compiler`, `cursor-task-orchestrator`, `delivery-guardrail`, `page-spec-generator`, `prototype-module-split`, `prototype-regression-checklist`, `prototype-split-orchestrator`, `prototype-to-production-mapping`, `shared-shell-extractor`, `test-case-suggester`, `workflow-state-modeler`.

### 6.3 Editor-Local Whitelist

Files in mirror targets that are NOT in the canonical set and must be preserved (not overwritten or deleted) during sync.

| Editor | File/Directory | Disposition |
|--------|----------------|-------------|
| `.augment/skills/` | `DEPRECATED.md` | Keep — sync script must not delete |
| `.augment/rules/` | `project-rules.md` | Editor-local rule — never touched by sync |
| `.trae/skills/` | `DEPRECATED.md` | Keep |
| `.trae/skills/atomic-task-splitter/` | Entire directory | Trae-only skill, not in canonical set — preserve |
| `.trae/skills/ui-ux-pro-max/` | Entire directory (if re-added) | Trae-only, preserve |
| `.trae/rules/` | `project_rules.md` | Editor-local rule — never touched by sync |

The sync script must implement a **whitelist-preserve** strategy: only overwrite files that exist in the canonical set; never delete files not in the canonical set.

### 6.4 Drift Protection

Three layers of drift protection, ordered by when they fire:

| Layer | Mechanism | Fires when | What it catches |
|-------|-----------|------------|-----------------|
| **L1 — Lint-time** | `scripts/check-skill-drift.mjs` (to be created) | `npm run guard` or standalone | Content hash mismatch between `.cursor/skills/<file>` and mirror targets; files in canonical set missing from mirrors |
| **L2 — Pre-commit** | Husky hook calling L1 script | `git commit` | Prevents committing drifted mirrors |
| **L3 — CI** | Same L1 script in CI pipeline | PR / push | Catches drift that bypassed local hooks |

**L1 script spec** (`scripts/check-skill-drift.mjs`):

```
Input: --canonical .cursor/skills --mirrors .augment/skills,.trae/skills
Behavior:
  1. For each file in the mirror minimum set (§6.2):
     a. Compute SHA-256 of canonical file
     b. Compute SHA-256 of corresponding mirror file (if exists)
     c. If mismatch → report as DRIFT error (exit 1)
     d. If mirror file missing → report as MISSING warning (exit 0 with warning)
  2. For each file in mirror target NOT in canonical set:
     a. If file is in editor-local whitelist (§6.3) → skip
     b. Else → report as ORPHAN warning
  3. Exit 0 if no DRIFT errors, else exit 1
```

### 6.5 Sync Script Spec

`scripts/sync-skills.sh` (to be created when trigger fires):

```
Input: none (hardcoded source/target paths)
Behavior:
  1. Source: .cursor/skills/
  2. Targets: .augment/skills/, .trae/skills/
  3. For each file in mirror minimum set (§6.2):
     a. Copy from source to each target, creating directories as needed
     b. Skip files in editor-local whitelist (§6.3)
  4. Do NOT delete any file in targets not present in source
  5. Run check-skill-drift.mjs to verify zero drift post-sync
  6. Report: files copied, files skipped (whitelist), orphans detected
```

No path rewriting is needed: all three directories use the same relative structure (`skills/<name>/SKILL.md`), and SKILL.md references use relative paths (`../` patterns) that are identical across directories.

### 6.6 Activation Checklist

When the decision criteria in §5 are met, execute in order:

1. [ ] Create `scripts/check-skill-drift.mjs` per §6.4 spec
2. [ ] Create `scripts/sync-skills.sh` per §6.5 spec
3. [ ] Run `sync-skills.sh` once to populate mirrors
4. [ ] Run `check-skill-drift.mjs` to confirm zero drift
5. [ ] Add L1 to `npm run guard` script chain
6. [ ] Add L2 husky hook
7. [ ] Add L3 CI step
8. [ ] Remove `DEPRECATED.md` from `.augment/skills/` and `.trae/skills/`
9. [ ] Re-run dry-run review on mirrored copies (spot-check 3 skills minimum)

---

## 7. Summary

| Question | Answer |
|----------|--------|
| Mirror now? | **No** |
| Canonical source | `.cursor/skills/` (12 skills) |
| Current drift | 6 of 11 shared skills drifted; `prototype-split-orchestrator` missing from mirrors |
| Mirror minimum set | `SKILL.md` + `references/` + `data/` + `scripts/` per skill + 2 `_meta` files |
| Editor-local whitelist | `.trae/atomic-task-splitter`, `.trae/ui-ux-pro-max`, `DEPRECATED.md`, editor rule files |
| Drift protection | 3-layer: lint-time script → pre-commit hook → CI (§6.4) |
| Sync mechanism | `sync-skills.sh` with whitelist-preserve strategy (§6.5) |
| When to revisit? | When multi-editor usage begins |
| Prerequisite for mirroring | Automated sync + drift detection (§6.6 activation checklist) |
