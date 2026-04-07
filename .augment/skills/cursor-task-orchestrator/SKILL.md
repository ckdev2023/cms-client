---
name: cursor-task-orchestrator
description: generate machine-readable multi-agent execution plans for cursor 3.0 and similar coding agents. use when a user wants to decompose a coding task into atomic tasks, identify real dependencies, prevent ai trap task splits, produce per-task execution docs, manifest files, and runbooks for local worktree or cloud-agent execution with regression checks, result artifacts, and merge review.
---

# Cursor Task Orchestrator

## Overview

Generate a reusable execution package for multi-agent coding workflows.

Do not just split work. Produce a safe, machine-readable task system that an external script or workflow can use to run Cursor 3.0 agents in parallel without relying on hidden shared context.

## Core stance

Treat multi-agent execution as a coordination problem, not a prompting trick.

Optimize in this order:
1. correctness of dependency boundaries
2. explicit task inputs and outputs
3. regression safety
4. parallelism only where safe
5. compact context per task
6. mergeability and reviewability

## What to produce

Unless the user asks for a lighter template-only answer, produce these deliverables:

1. `master-plan.md`
2. `manifest.json`
3. `tasks/T01.md` ... `tasks/T0N.md`
4. `artifacts/result-schema.json`
5. `runbook.md`

When helpful, also include:
- `review/merge-plan-template.md`
- `scripts/run_tasks.py`
- `scripts/merge_review.py`
- `scripts/validate_manifest.py`

## Mandatory workflow

Follow this sequence every time:

1. Read the requirement, repo notes, architecture notes, or design input.
2. Infer the real change surface.
3. Identify dependency edges before splitting.
4. Detect shared hot files and central integration points.
5. Split into atomic tasks only after boundaries are explicit.
6. Produce a machine-readable manifest.
7. Produce one standalone task document per task.
8. Define per-task validation commands and result artifacts.
9. Define merge/review stage and full regression stage.
10. Run the ai-trap checklist before finalizing.

If input is incomplete, make conservative assumptions and label them clearly.

## Hard rules for atomic tasks

A task is atomic only if all are true:
- one primary objective
- narrow and explicit change surface
- can run in a fresh window without previous chat history
- has concrete validation commands
- has stop conditions
- failure can be isolated
- result can be summarized in a small artifact

Reject pseudo-atomic tasks such as:
- finish the whole frontend refactor
- implement user center
- optimize backend and tests
- migrate all usages and clean up everything

Prefer tasks such as:
- extract shared button variants config
- migrate button usages in page modules only
- add unit tests for new button props mapping
- add route-level integration wiring for profile page
- add index for profile lookup query

## AI traps to actively prevent

Check for these traps and correct the plan when any appear:

1. **fake atomicity**  
   one task secretly changes several independent layers

2. **hidden shared files**  
   multiple tasks all need to edit package manifests, routing maps, theme entrypoints, generated type barrels, or shared config

3. **context leakage**  
   a task depends on unstated knowledge from previous tasks or earlier conversation

4. **test slogan instead of test protocol**  
   saying "ensure tests pass" without specific commands

5. **parallelism theater**  
   declaring tasks parallel when they contend on the same source of truth

6. **summary-only handoff**  
   relying on prose summaries instead of machine-readable artifacts

7. **merge-phase omission**  
   assuming N finished tasks can merge safely without integration review

8. **scope creep by prompt wording**  
   vague prompts that invite opportunistic refactor or cleanup

9. **architecture blindness**  
   failing to notice when a requested change actually needs boundary redesign before safe task splitting

10. **runtime illusion**  
   pretending the skill itself executes agents. this skill defines protocol and deliverables; execution is handled by cursor plus an external script or workflow.

When needed, consult `references/ai-traps.md` and `references/task-splitting-checklist.md`.

## Dependency-first planning rules

Before marking tasks as parallel, inspect:
- shared write targets
- shared schema or contract ownership
- route registries
- package manifests and lockfiles
- generated files
- base classes or common hooks used by many modules
- test fixtures used across suites
- deployment/config surfaces

If two tasks touch the same source of truth, do one of these:
- combine them into one task
- extract the shared file change into a separate serial task
- mark one task blocked by the other

Do not claim safe parallelism without explicit reasoning.

## Required output files

### 1) master-plan.md

Use this structure:

# 00-开发总计划

## 目标与交付结果
## 背景与关键假设
## 范围与非范围
## 共享热点文件与冲突风险
## 工作流/阶段划分
## 依赖关系与建议顺序
## 可并行任务与串行任务
## 风险与决策点
## 原子任务清单
## 汇总回归与合并策略

### 2) manifest.json

Always include at least these fields:

```json
{
  "project": "string",
  "base_branch": "string",
  "assumptions": ["string"],
  "global_constraints": ["string"],
  "shared_hotspots": ["string"],
  "tasks": [
    {
      "id": "T01",
      "title": "string",
      "prompt_file": "tasks/T01.md",
      "depends_on": [],
      "parallel_group": "string",
      "allowed_paths": ["string"],
      "forbidden_paths": ["string"],
      "test_commands": ["string"],
      "expected_artifacts": ["string"],
      "stop_conditions": ["string"]
    }
  ]
}
```

Keep the schema stable and machine-readable. Avoid commentary inside json.

### 3) task documents

Each task document must follow `references/task-template.md` and remain standalone.

### 4) result artifact schema

Define a compact per-task result schema. Use `references/result-schema-template.json` as the default basis.

### 5) runbook.md

Explain:
- required repo assumptions
- how to execute tasks locally with worktrees
- how to collect result artifacts
- how to re-run failed tasks
- how to run final integration checks
- how to hand results to a merge-review agent

## Task document rules

Every task document must include:
- singular goal
- minimal background only
- allowed paths
- forbidden edits
- dependencies
- required outputs
- explicit validation commands
- acceptance criteria
- rollback note
- stop conditions

Never use phrases such as:
- as discussed above
- continue from previous step
- based on earlier context
- do the remaining work

When useful, include the expected branch or worktree naming pattern.

## Output behavior for task docs

Write task docs in Chinese unless the user explicitly asks for another language.

Keep them compact and execution-oriented.

Use precise nouns: modules, folders, endpoints, page names, test commands, config files.

Do not pad with management language.

## Validation protocol rules

Validation must be concrete.

Good examples:
- `pnpm lint`
- `pnpm test --filter button`
- `pnpm typecheck`
- `pytest tests/profile/test_get_profile.py`
- `go test ./internal/profile/...`

Bad examples:
- verify everything works
- ensure tests pass
- run relevant tests

When the repo is unknown, state representative command placeholders clearly and label them as assumptions.

## Merge and review stage

Always define a post-execution stage.

That stage must check:
- failed tasks
- changed-file overlap
- integration gaps between tasks
- full regression commands
- merge order
- blockers needing human decision

Use `references/merge-review-template.md` when creating the review stage deliverable.

## Script generation guidance

When the user asks for runnable helpers, generate lightweight scripts rather than overbuilt platforms.

Default scripts:
- `scripts/run_tasks.py` to schedule tasks from manifest
- `scripts/merge_review.py` to aggregate results
- `scripts/validate_manifest.py` to validate structure

Keep scripts boring and explicit.

Prefer:
- simple json io
- clear exit codes
- deterministic file writes
- low dependency standard library code

Avoid turning the package into a heavy framework.

## Decision tree

1. **User wants only planning output** -> produce plan files and templates.
2. **User wants planning plus runnable helpers** -> also generate scripts.
3. **Input is too vague for safe execution** -> make assumptions explicit and tighten stop conditions.
4. **Architecture risk is high** -> first include an architecture-risk section and reduce unsafe parallelism.
5. **Tasks are not safely parallelizable** -> say so, and prefer serial or staged execution.

## Quality gate

Before finalizing, check every task:
- singular objective
- explicit change surface
- no hidden shared context
- no hidden shared hotspot conflict
- concrete test commands
- clear expected artifact
- rollback note present
- stop conditions present
- merge phase accounted for

If any item fails, revise the split.

## References

- Use `references/task-template.md` for each task document.
- Use `references/task-splitting-checklist.md` before finalizing.
- Use `references/ai-traps.md` when the split looks deceptively parallel.
- Use `references/manifest-template.json` as the default machine-readable layout.
- Use `references/result-schema-template.json` for result artifacts.
- Use `references/merge-review-template.md` for the final review stage.
- Use `references/runbook-template.md` for execution instructions.

## Example triggers

Use this skill for requests like:
- 把这个需求拆成可让 cursor 多 agent 执行的任务包
- 生成适合 cursor 3.0 并行执行的 manifest 和 task 文档
- 帮我把大需求拆成 worktree 并行可跑的原子任务
- 给我一套 cursor agent 执行协议、结果工件和 merge review 模板
- 生成一个多 agent 调度工作流，而不是只给 prompt
