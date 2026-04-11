---
name: prototype-split-orchestrator
description: >-
  Orchestrate prototype split pipeline: route between split, spec, regression,
  guardrail skills in fixed phase order with mandatory script gates.
---

# Prototype Split Orchestrator

## Purpose

把现有的 prototype-module-split、page-spec-generator、prototype-regression-checklist、delivery-guardrail 等 skill 串成固定流水线，确保阶段顺序、脚本门禁和人工 review 不被跳过。

本 skill 不替代任何现有 skill 的内部工作流，只负责：
1. 判断当前应调用哪个 skill
2. 在 skill 之间插入脚本门禁和人工检查点
3. 在需要时触发 shared-shell-extractor 或 workflow-state-modeler

## Triggers

当用户请求符合以下任一条件时，触发此 skill：

- 用户要求对一个原型模块执行完整的拆分 → 规格同步 → 回归 → 门禁流水线
- 用户要求按顺序走完拆分各阶段（init / audit / boundary / review / execute / spec / regression / closeout / guardrail）
- 用户不确定当前应该调用哪个 skill，要求编排建议

示例请求：
- 帮我把案件模块走完整套拆分流水线
- case 模块已经做完 boundary，下一步该做什么？
- 帮我编排 billing 模块从拆分到交付的完整流程
- case-detail 审计做完了，下一步走 boundary 还是 review？
- 帮我检查 documents 模块拆分流水线的当前进度

## Required Inputs

执行前必须读取：

- `.cursor/skills/prototype-module-split/SKILL.md` — 拆分 skill 的工作流和脚本门禁定义
- `.cursor/skills/prototype-module-split/data/command-surface.json` — 流水线命令的机器可读定义
- 目标模块目录 `<module-dir>/` 下已有的 manifest 工件（用于判断当前阶段）

需要更多上下文时，再读取：

- `.cursor/skills/page-spec-generator/SKILL.md` — 页面规格生成 skill
- `.cursor/skills/prototype-regression-checklist/SKILL.md` — 回归验收 skill
- `.cursor/skills/delivery-guardrail/SKILL.md` — 交付门禁 skill
- `.cursor/skills/shared-shell-extractor/SKILL.md` — 共享壳层提取 skill
- `.cursor/skills/workflow-state-modeler/SKILL.md` — 状态机建模 skill
- `AGENTS.md` — 仓库分层与门禁规则

## Deliverables

除非用户明确要求轻量输出，否则至少产出：

1. **阶段诊断** — 基于现有 manifest 工件判断当前处于哪个阶段，输出下一步动作
2. **流水线 runbook**（文本）— 当前模块的剩余阶段、每步调用的 skill 和脚本、人工检查点

本 skill 不直接产出 manifest 或代码文件。所有实际工件由下游 skill 产出。

### 阶段诊断最小结构

```text
## 阶段诊断: <module-id>

当前阶段: <phase>
已完成工件: <list>
缺失工件: <list>
下一步动作: <action>
调用 skill: <skill-name>
前置脚本: <script call>
```

### 流水线 runbook 最小结构

```text
## Runbook: <module-id>

### Phase N — <phase-name>
- Skill: <skill-name>
- 前置脚本: <script>
- 产出: <artifacts>
- 人工检查点: <yes/no + what to review>
- Stop conditions: <SC-IDs>
```

## Workflow

### Step 1 — 诊断当前阶段

1. 扫描 `<module-dir>/` 下的 manifest 文件：
   - `split-manifest[-suffix].json` 存在 → init 已完成
   - `audit-manifest[-suffix].json` 存在 → audit 已完成
   - `boundary-map[-suffix].json` 存在 → boundary 已完成
   - `boundary-map.phase.reviewApproval.approved === true` → review 已完成
   - `split-manifest` 中 `sections`/`scripts`/`dataFiles` 非空 → execute 已完成
   - 受影响页面规格已同步 → spec sync 已完成
   - `regression-checklist[-suffix].json` 存在 → regression 已完成
   - `split-manifest.phase.history.closeout.result == "passed"` 或等价 closeout 记录存在 → closeout 已完成
2. 运行 `phase-gate.mjs --target-phase <next-phase>` 验证诊断结论。gate 失败说明前置条件未满足。
3. 输出阶段诊断。

### Step 2 — 路由到正确的 skill

根据诊断结果，按以下路由表调用对应 skill。每行只走一步，不得合并阶段。

| 当前阶段 | 下一步 | 调用 skill | 前置脚本 |
|---|---|---|---|
| 无工件 | init | `prototype-module-split` Phase 1 | `scaffold-split.mjs` + `validate-manifest.mjs` |
| init 完成 | audit | `prototype-module-split` Phase 2 | `phase-gate.mjs --target-phase audit` |
| audit 完成 | boundary | `prototype-module-split` Phase 3 | `phase-gate.mjs --target-phase boundary` |
| boundary 完成 | review | `prototype-module-split` Phase 4 | `phase-gate.mjs --target-phase review` |
| review 通过 | execute | `prototype-module-split` Phase 5 | `phase-gate.mjs --target-phase execute` |
| execute 完成 | spec sync | `page-spec-generator` | — |
| spec 同步完成 | regression | `prototype-regression-checklist` | — |
| regression 完成 | closeout | `prototype-module-split` Phase 6 | `phase-gate.mjs --target-phase closeout` |
| closeout 完成 | guardrail | `delivery-guardrail` | `npm run fix` + `npm run guard` |

### Step 3 — 调用下游 skill

1. 读取目标 skill 的 SKILL.md。
2. 运行该 skill 定义的前置脚本（如果路由表中有列出）。
3. 按该 skill 的 Workflow 执行。
4. 执行完毕后运行该 skill 的 Completion 检查。

### Step 4 — 返回 orchestrator 判断下一步

1. 重新执行 Step 1（诊断当前阶段）。
2. 如果还有剩余阶段，回到 Step 2。
3. 如果所有阶段完成，输出最终确认。

### Step 5 — 可选 skill 触发

以下 skill 不在主流水线中，按需触发：

| 触发条件 | 调用 skill |
|---|---|
| 模块有重复壳层/样式，且 shared/ 版本缺失或过时 | `shared-shell-extractor` |
| 模块涉及审批、回退、状态流转等业务流程，需要状态机定义 | `workflow-state-modeler` |

触发时机：在 execute 完成后、spec sync 之前最合适，但不强制。

### Step 6 — 最终确认

1. 所有主流水线阶段完成。
2. 页面规格已同步。
3. 回归验收门槛已建立。
4. `npm run fix` + `npm run guard` 通过。

## Rules

- 本 skill 只做路由和诊断，不产出 manifest、代码或拆分文件。所有实际工件由下游 skill 负责。
- 每次路由只前进一步。禁止合并阶段或跳过中间步骤。
- 路由前必须先运行诊断（Step 1），不得凭记忆假设当前阶段。
- 路由到 `prototype-module-split` 时，必须指定具体 Phase（1–6），不得笼统调用。
- 下游 skill 的脚本门禁由下游 skill 自身执行。orchestrator 只负责确认 gate 通过后再前进。
- review 阶段（Phase 4）是人工检查点。orchestrator 必须在此阶段暂停，等待人工确认后才能继续。
- spec sync 阶段：只同步拆分结果影响到的页面规格字段，不重写整份规格文档。
- regression 阶段：回归项必须引用 P0-CONTRACT 的具体章节编号，不凭记忆概括。
- closeout 阶段只做 `split-manifest` / 页面规格 / `regression-checklist` 的收口对齐；不得把 `regression-checklist.json` 的生成或人工 verdict 录入错误地下沉到 closeout。
- `npm run fix` 必须在 `npm run guard` 之前运行。（来源：AGENTS.md）
- 新增/修改逻辑必须补单测。（来源：AGENTS.md）

## Anti-Patterns

- 把所有 skill 的工作流复制到 orchestrator 中 → orchestrator 只路由，不重复定义拆分规则、schema 或文件结构
- 一次性走完全部阶段不做中间检查 → 错误在 review 之前累积，修复成本翻倍
- 诊断时只看文件是否存在不看内容 → `phase-gate.mjs` 会检查内容完整性，orchestrator 应信任 gate 结果
- 跳过 spec sync 直接做 regression → 回归项可能基于过时的规格，与拆分后的实际结构不一致
- 在 regression 之前执行 closeout → closeout 会缺少最终页面规格和回归工件，无法完成收口
- 在 review 阶段不暂停直接写 approved → 人工审批是防止 AI 系统性偏差的最后一道门
- 把可选 skill（shared-shell-extractor、workflow-state-modeler）放进必经流水线 → 只在有需要时触发，不增加无谓开销

## References

- [prototype-module-split SKILL.md](../prototype-module-split/SKILL.md) — 拆分 skill（Phase 1–6 工作流和脚本门禁）
- [page-spec-generator SKILL.md](../page-spec-generator/SKILL.md) — 页面规格生成 skill
- [prototype-regression-checklist SKILL.md](../prototype-regression-checklist/SKILL.md) — 回归验收 skill
- [delivery-guardrail SKILL.md](../delivery-guardrail/SKILL.md) — 交付门禁 skill
- [shared-shell-extractor SKILL.md](../shared-shell-extractor/SKILL.md) — 共享壳层提取 skill（可选）
- [workflow-state-modeler SKILL.md](../workflow-state-modeler/SKILL.md) — 状态机建模 skill（可选）
- [command-surface.json](../prototype-module-split/data/command-surface.json) — 流水线命令的参数、脚本调用序列和 stop conditions
- [command-surface.md](../prototype-module-split/references/command-surface.md) — 流水线命令的人类可读说明
- [phase-gate.mjs](../prototype-module-split/scripts/phase-gate.mjs) — 阶段门禁脚本
- [SKILL-PROTOCOL.md](../_meta/SKILL-PROTOCOL.md) — 本 skill 遵循的统一协议

## Completion

完成后逐项确认：

1. 阶段诊断输出了当前阶段和下一步动作
2. 流水线 runbook 覆盖了所有剩余阶段
3. 每个阶段的 skill 路由正确（对应 routing table）
4. 每个阶段的前置脚本已调用且通过
5. review 阶段有人工确认记录
6. spec sync 阶段已同步受影响的页面规格
7. regression 阶段的 gate items 引用了 P0-CONTRACT 章节编号
8. 最终 `npm run fix` + `npm run guard` 通过（如有代码改动）
