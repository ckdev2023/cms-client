# Deprecated — Use `.cursor/skills/` Instead

> Date: 2026-04-10

The shared skills in this directory are **stale pre-protocol copies** and should not be relied upon.

## Authoritative Source

All skill definitions live in `.cursor/skills/` and follow the unified SKILL-PROTOCOL:

- Protocol: `.cursor/skills/_meta/SKILL-PROTOCOL.md`
- Skills: 11 active skills (see `.cursor/skills/` directory listing)
- Dry-run review: `.cursor/skills/_meta/dry-run-review.md`
- Mirror decision: `.cursor/skills/_meta/mirror-decision.md`

## What's Wrong with the Shared Copies

- `cursor-task-orchestrator/SKILL.md` — pre-protocol format, missing 10-section structure
- `prototype-module-split/SKILL.md` — pre-protocol format, `reference.md`/`examples.md` in wrong location
- Missing 9 skills created in T03–T11
- Missing `_meta/` directory with protocol and review documents

## Trae-Specific Skills

The following skills are Trae-only and not part of the canonical `.cursor/skills/` set:

- `atomic-task-splitter/` — task decomposition skill, does not follow SKILL-PROTOCOL
- `ui-ux-pro-max/` — UI/UX design intelligence with Python scripts, does not follow SKILL-PROTOCOL

These may continue to be used in Trae but are not maintained under the unified protocol. If valuable, consider promoting them to `.cursor/skills/` with SKILL-PROTOCOL conformance.

## When Will This Be Updated

When multi-editor usage begins and an automated sync mechanism is established. See `.cursor/skills/_meta/mirror-decision.md` for criteria.
