# T15 — Mirror Decision

> Date: 2026-04-10
> Prerequisite: T14 dry-run review passed (all 11 skills stable, narrowly scoped, end-to-end pipeline verified)

---

## 1. Decision

**Do NOT mirror now.** Keep `.cursor/skills/` as the single authoritative source. Remove stale pre-protocol skills from `.augment/skills/` and `.trae/skills/` to prevent misleading agents. Revisit when multi-editor usage actually begins.

---

## 2. Current State Assessment

### 2.1 `.cursor/skills/` — Authoritative

- 11 skills, all conforming to SKILL-PROTOCOL v1.2
- `_meta/` with protocol, template, baseline audit, dry-run review
- T14 dry-run: 15 simulated requests, 0 misfires, full billing pipeline verified
- Protocol compliance: 13/14 gates passed (1 item already fixed during T14)

### 2.2 `.augment/skills/` — Stale

| Skill | Lines | Protocol | Delta vs `.cursor/` |
|-------|-------|----------|---------------------|
| `cursor-task-orchestrator` | 329 | Pre-protocol | Missing 10-section structure, no SKILL-PROTOCOL ref, no example-walkthrough |
| `prototype-module-split` | 124 | Pre-protocol | `reference.md`/`examples.md` in root (not `references/`), outdated paths |

Missing: 9 skills from T03–T11, `_meta/` directory, all reference/example-walkthrough files.

### 2.3 `.trae/skills/` — Stale + Alien Content

| Skill | Lines | Protocol | Notes |
|-------|-------|----------|-------|
| `cursor-task-orchestrator` | 329 | Pre-protocol | Same stale copy as `.augment/` |
| `prototype-module-split` | 124 | Pre-protocol | Same stale copy as `.augment/` |
| `atomic-task-splitter` | 132 | None | Trae-only skill, not in canonical set |
| `ui-ux-pro-max` | 293 | None | Trae-only skill with Python scripts and CSV data |

Missing: 9 skills from T03–T11, `_meta/` directory.

---

## 3. Rationale

### 3.1 Arguments against mirroring now

| # | Risk | Impact |
|---|------|--------|
| 1 | **Triple maintenance burden** — 11 skills × 3 dirs = 33+ SKILL.md files, plus `_meta/`, references, data, scripts | High: any protocol update or skill revision must be applied 3× manually |
| 2 | **No automated sync mechanism** — manual copy is error-prone and creates silent drift | High: stale copies are worse than no copies |
| 3 | **Alien skills in `.trae/`** — `atomic-task-splitter` and `ui-ux-pro-max` are Trae-specific and do not follow SKILL-PROTOCOL | Medium: mirroring would overwrite or conflict with these |
| 4 | **Only Cursor is actively used** — no evidence of active Augment or Trae usage for this project | High: mirroring to unused directories is pure cost |
| 5 | **Dry-run validated only `.cursor/` skills** — re-validation would be needed post-mirror | Low: identical content should behave identically, but path references in SKILL.md would need updating |
| 6 | **AGENTS.md already serves as cross-editor truth** — rules are centralized; skills don't need the same treatment yet | Low: rules and skills have different discovery mechanisms |

### 3.2 Arguments for mirroring (deferred)

| # | Benefit | When it matters |
|---|---------|----------------|
| 1 | Agents in other editors would get up-to-date skill guidance | When team members actively use Augment or Trae |
| 2 | Consistent behavior across editors | When multi-editor workflow is established |
| 3 | Eliminates stale-copy confusion | Partially addressed by removing stale copies now |

### 3.3 Why removing stale copies is better than mirroring

The stale pre-protocol skills in `.augment/` and `.trae/` actively harm: an Augment or Trae agent loading `prototype-module-split` would get outdated workflow steps, wrong file paths, and no awareness of the protocol. Removing them is strictly better than leaving them, and cheaper than mirroring 11 skills.

---

## 4. Action Items

### 4.1 Immediate (this task)

1. Add `DEPRECATED.md` to `.augment/skills/` and `.trae/skills/` explaining that `.cursor/skills/` is the authority
2. Keep existing `.augment/` and `.trae/` skill files as-is (do not delete untracked files owned by other editor setups)

### 4.2 When multi-editor usage begins (future trigger)

1. Create `scripts/sync-skills.sh` that copies `.cursor/skills/` → `.augment/skills/` and `.trae/skills/`
2. The sync script must:
   - Preserve editor-specific skills (e.g., `ui-ux-pro-max` in `.trae/`)
   - Update relative paths in SKILL.md if directory structure differs
   - Run the SKILL-PROTOCOL quality gate post-sync
3. Add a pre-commit hook or CI check to detect drift between directories
4. Re-run dry-run review for mirrored copies

### 4.3 Trae-specific skills disposition

`atomic-task-splitter` and `ui-ux-pro-max` are Trae-only. If they are valuable:
- Evaluate for promotion to `.cursor/skills/` (requires SKILL-PROTOCOL conformance)
- Or keep as editor-local skills outside the canonical set

---

## 5. Decision Criteria for Future Reversal

Mirror when **all** of the following are true:

1. At least one team member actively uses Augment or Trae for this project
2. An automated sync script exists and is tested
3. A drift-detection mechanism is in place (CI or pre-commit)
4. The SKILL-PROTOCOL is stable (no breaking changes planned)

---

## 6. Summary

| Question | Answer |
|----------|--------|
| Mirror now? | **No** |
| Remove stale copies? | **No** (not our files to delete, but mark as deprecated) |
| When to revisit? | When multi-editor usage begins |
| Prerequisite for mirroring | Automated sync + drift detection |
