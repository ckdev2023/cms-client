---
name: epic-task-split-planner
description: 用户切到 Cursor plan 模式后按 Epic→原子任务拆需求：plan 模式直接在 chat 出方案+决策清单，approve 后切 agent 落盘 master-plan.md/manifest.json/epics/runbook.md。任务级仅 typecheck+lint，最终 fix+guard。
---

# Epic Task Split Planner

## Purpose

1. 把一次中大型需求拆成 **Epic → 原子任务** 的两层结构，避免扁平任务列表里依赖关系丢失。
2. 与 **Cursor plan 模式**配合：用户自行切到 plan 模式后，agent 直接在 chat 内产出可 review 的拆分草案 + 未决问题清单，**不写文件、不跑写命令**；用户 approve 后由用户切到 agent 模式再落盘文件。
3. 把执行期验证压到最低成本：每个原子任务只跑所属 workspace 的 `typecheck` + `lint`，不跑 `guard`，避免反复跑全量门禁拖慢节奏。
4. 所有原子任务完成、合并到主线后，统一跑 `npm run fix` + `npm run guard` 做最终回归，作为唯一交付门禁。
5. 最终在 agent 模式落盘可被 agent / 人工直接消费的计划包：`master-plan.md` + `manifest.json` + 每个原子任务的执行文档 + 最终回归 `runbook.md`。

## Triggers

当用户请求符合以下任一条件时，触发此 skill：

- 用户当前在 Cursor **plan 模式**，且要求"拆这个需求"、"出拆分方案"、"按 epic 拆"。
- 用户明确要求"先在 plan 模式 review 拆分方案，再切 agent 落盘文件"、"先讨论方案再写计划文档"。
- 用户要求"把这个需求按 epic 拆"、"拆成 epic + 原子任务"、"按 epic 出拆分计划"。
- 用户要求"每个小任务只跑 ts 检查和 lint，不要跑 guard"、"全部完成后再跑 guard"、"分阶段验证"。
- 用户要求"出一个可并行执行的拆分包"、"拆成可分发给多个 agent 的子任务"、"每个任务能独立验证"。

意图路由：

1. **默认路径**：本 skill 假设用户已自行切到 plan 模式；agent 直接进入 § Workflow 的 plan 阶段输出 chat 内方案，**不主动调用 `SwitchMode`**。
2. 用户明确要求"直接出文件不要预览" → 跳过 plan 阶段，直接执行 § Workflow 的 agent 阶段。
3. 用户要求"补充已存在的拆分包"、"在已有 manifest 上加 Epic" → 仍走 plan 阶段，但只针对增量做 review。
4. 用户当前明显未在 plan 模式（agent 工具集仍可写文件）却让"按 epic 拆，先讨论再落盘" → 提醒用户切到 plan 模式后再触发本 skill；不替用户切。

示例请求：

- 我现在在 plan 模式，帮我把这个需求按 epic 拆分，先 review 再写文档。
- 在 plan 模式下出一份 epic + 原子任务方案，列清楚未决问题，approve 后再生成文件。
- 帮我把这个需求按 epic 拆分，每个 epic 下面再拆原子任务。
- 每个原子任务只做 typecheck 和 eslint 检查就行，全部完成后再跑 guard。
- 给我一个 epic + 原子任务的拆分计划，附 manifest 和最终全量检查的 runbook。

## Required Inputs

执行前必须读取：

- `AGENTS.md` — 仓库门禁、架构边界与测试规则的权威来源；最终回归阶段必须以此为准。
- `package.json`（root）— 确认 `fix` 与 `guard` 聚合脚本的实际命令组成。
- `packages/<workspace>/package.json` — 仅读取本次改动涉及的 workspace（如 `@cms/admin`、`server`、`mobile`），用于确认 `typecheck` 与 `lint` 的实际命令。
- `data/workspace-checks.json` — 各 workspace 任务级命令的唯一权威表；任务级命令必须从这里读取。
- `.cursor/skills/_meta/SKILL-PROTOCOL.md` — 本 skill 自身遵循的协议（自审用）。

需要更多上下文时，再读取：

- `.cursor/skills/cursor-task-orchestrator/SKILL.md` — 多 agent 任务编排 skill；当用户额外要求 worktree/run script/merge review 工件时，可叠加引用。
- `.cursor/skills/delivery-guardrail/SKILL.md` — 收尾门禁 skill；最终回归阶段可路由到该 skill 执行。
- 用户提供的需求 / PRD / RFC / Issue 原文 — 用于推导 Epic 划分边界。
- `git ls-files <模块路径>` 输出 — 用于核实"修改范围"是否真实存在、是否会与他人热点冲突；plan 模式只用作只读探索。

## Deliverables

本 skill 产出物按 **mode** 拆为两组。两组缺一不可，但**绝不能在同一 mode 内全部产出**。

### A. Plan 模式内交付（chat 内 markdown / code，不写文件）

用户在 plan 模式触发本 skill 后，agent 在 chat 内**必须并且只能**产出以下 6 项内容，按顺序组织，单条回复一次性给齐：

1. **范围与假设速览**：3–5 行，限定本次拆分覆盖 / 不覆盖什么；同时给出建议 `plan_id`（形如 `<YYYYMMDD>-<kebab-slug>`）供用户在 approve 时确认。
2. **Epic 总览表**（fenced markdown 表格）：列 `Epic ID / 名称 / 目标 / 涉及 workspace / depends_on`。
3. **原子任务总览表**（fenced markdown 表格）：列 `Task ID / Epic / 标题 / Workspace / depends_on / parallel_group`。
4. **共享热点 / 冲突清单**：列出所有可能被多任务竞争的文件，及对应串行前置任务编号；若无热点也必须显式写"无"。
5. **未决问题清单**：编号列表，每条含"问题 / 默认建议 / 影响"，等待用户确认；若没有任何模糊点也必须写"无未决问题"，禁止省略此节。
6. **Handoff 询问**：固定结尾问"以上方案是否 approve？approve 后请切到 agent 模式，我会按方案落盘到 `docs/plans/<plan-id>/`。"

> Plan 模式内**不得**输出 `master-plan.md`、`manifest.json` 全文或写文件操作；任何"写"动作必须延后到 agent 模式。
> 这 6 项 chat 输出顺序固定，不允许重排或合并。

### B. Agent 模式内交付（落盘文件）

仅在用户在 plan 模式 approve 后、并切到 agent 模式后产出：

1. `docs/plans/<plan-id>/master-plan.md` — 总计划：Epic 列表、原子任务清单、依赖关系、执行顺序、最终回归策略。
2. `docs/plans/<plan-id>/manifest.json` — 机器可读的 Epic + 原子任务结构，包含每个任务的 `allowed_paths`、`forbidden_paths`、`per_task_checks`、`final_checks`。
3. `docs/plans/<plan-id>/epics/E<NN>/README.md` — 每个 Epic 的目标、范围、原子任务列表与 Epic 级验收标准。
4. `docs/plans/<plan-id>/epics/E<NN>/tasks/T<NN>-<slug>.md` — 每个原子任务的独立执行文档（可在新会话中独立执行）。
5. `docs/plans/<plan-id>/runbook.md` — 执行手册，区分"原子任务执行"与"最终全量回归"两个阶段。

> `<plan-id>` 默认形式：`<YYYYMMDD>-<kebab-slug>`，如 `20260507-leads-conversion-refactor`，由 plan 模式 § A.1 中确认。

### `master-plan.md` 最小结构

固定章节顺序：

```text
# 00-开发总计划

## 1. 目标与交付结果
## 2. 关键假设与未决事项
## 3. 范围与非范围
## 4. Epic 总览（表格：Epic ID / 名称 / 目标 / 涉及 workspace / 依赖）
## 5. 原子任务总览（表格：Task ID / 所属 Epic / 标题 / 涉及 workspace / depends_on / parallel_group）
## 6. 共享热点与冲突风险
## 7. 执行顺序与并行策略
## 8. 阶段验证策略
   - 8.1 原子任务级（仅 typecheck + lint）
   - 8.2 Epic 级（可选）
   - 8.3 最终全量回归（fix + guard）
## 9. 风险与决策点
## 10. 回滚策略
## 11. Plan 模式 review 记录（approve 时间、未决问题落槌结果）
```

### `manifest.json` 最小结构

```json
{
  "project": "string",
  "plan_id": "string",
  "base_branch": "string",
  "plan_mode_approved_at": "ISO8601 string",
  "assumptions": ["string"],
  "global_constraints": ["string"],
  "shared_hotspots": ["string"],
  "per_task_checks": {
    "policy": "typecheck-and-lint-only",
    "by_workspace": {
      "@cms/admin": [
        "npm --workspace @cms/admin run typecheck",
        "npm --workspace @cms/admin run lint"
      ],
      "server": [
        "npm --workspace server run typecheck",
        "npm --workspace server run lint"
      ],
      "mobile": [
        "npm --workspace mobile run typecheck",
        "npm --workspace mobile run lint"
      ]
    }
  },
  "final_checks": [
    "npm run fix",
    "npm run guard"
  ],
  "epics": [
    {
      "id": "E01",
      "title": "string",
      "goal": "string",
      "workspaces": ["@cms/admin"],
      "depends_on": [],
      "tasks": [
        {
          "id": "T01",
          "epic": "E01",
          "title": "string",
          "prompt_file": "epics/E01/tasks/T01-<slug>.md",
          "workspaces": ["@cms/admin"],
          "depends_on": [],
          "parallel_group": "string",
          "allowed_paths": ["string"],
          "forbidden_paths": ["string"],
          "per_task_checks": [
            "npm --workspace @cms/admin run typecheck",
            "npm --workspace @cms/admin run lint"
          ],
          "expected_artifacts": ["string"],
          "stop_conditions": ["string"]
        }
      ]
    }
  ]
}
```

字段约束：

- `plan_id` 必填；与 § Deliverables.B 中目录名一致。
- `plan_mode_approved_at` 必填；记录 plan 模式 approve 的时间，用于审计。
- `per_task_checks.policy` 固定为 `"typecheck-and-lint-only"`。
- 任务级 `per_task_checks` 只能是 typecheck / lint 命令，不允许塞入 `guard`、`test`、`build`。
- `final_checks` 固定为 `["npm run fix", "npm run guard"]`，不可省略不可拆。
- 每个任务的 `workspaces` 必须与 `per_task_checks` 中实际跑的 workspace 一一对应。

### Epic README 最小结构

```text
# E<NN> <Epic Title>

## 1. Epic 目标
## 2. 范围与非范围
## 3. 涉及 workspace 与模块
## 4. 原子任务清单（链接到 tasks/T<NN>-*.md）
## 5. 任务依赖图（文字或 mermaid）
## 6. Epic 级验收标准
## 7. 已知风险
```

### 原子任务文档最小结构

每个 `epics/E<NN>/tasks/T<NN>-<slug>.md` 必须包含：

```text
# T<NN>-<slug>

## 1. 所属 Epic
## 2. 任务目标（一句话）
## 3. 背景上下文（仅本任务必需）
## 4. 输入材料（接口 / 模块 / 前置任务结果）
## 5. 修改范围（allowed_paths）
## 6. 禁止改动（forbidden_paths）
## 7. 共享热点检查
## 8. 实施步骤
## 9. 验收标准
## 10. 任务级验证命令（仅 typecheck + lint）
## 11. 结果工件
## 12. 停止条件
## 13. 回滚方案
```

任务级验证命令章节固定声明：

> 本任务只跑所属 workspace 的 `typecheck` 和 `lint`，**不跑** `npm run guard`、`npm test`、`npm run build`。
> 全量回归在所有任务完成后，由 `runbook.md` § 最终全量回归 阶段统一执行。

### `runbook.md` 最小结构

```text
# Runbook

## 1. 前置条件（base branch、worktree、依赖）
## 2. 阶段一：原子任务执行
   - 2.1 单任务执行步骤
   - 2.2 任务级验证命令（typecheck + lint，按 workspace 分组）
   - 2.3 结果工件归档位置
   - 2.4 失败重跑策略
## 3. 阶段二：Epic 内整合（可选）
## 4. 阶段三：最终全量回归
   - 4.1 合并 / 集成顺序
   - 4.2 必跑命令：`npm run fix`，再 `npm run guard`
   - 4.3 失败定位与修复路径
## 5. 交付清单
```

## Workflow

执行序列分两阶段：**Plan 阶段（chat 输出，由用户在 plan 模式触发） → Agent 阶段（落盘文件，由用户切到 agent 模式后触发）**。
模式切换由用户负责；agent **不主动调用 `SwitchMode`**。

> 以下 1–6 步在 plan 模式执行，**禁止任何写文件 / 写命令**。
> 若 agent 在调用工具前发现自己仍能写文件（说明用户尚未切到 plan 模式），必须立刻提示用户先切 plan 模式再触发本 skill，而不是继续往下做。

1. 读取 § Required Inputs 必读列表全部文件；只用 `Read` / `Glob` / `Grep` / `SemanticSearch` 等只读工具，必要时配合只读 shell（如 `git ls-files`、`git status`）。
2. 读取用户提供的需求 / PRD / RFC 原文，识别真实变更面与边界；同时把任何**模糊点**直接落到"未决问题清单"，不在 chat 中默默采纳默认值。
3. 标识共享热点文件（路由表、聚合 i18n、聚合导出、schema、generated barrels 等），登记到"共享热点 / 冲突清单"；无热点时显式写"无"。
4. 按业务能力 / 模块边界划分 Epic：每个 Epic 必须有单一业务目标、可验收、可独立回滚；在 Epic 内拆原子任务，遵守 § Rules 中的"原子任务硬规则"。
5. 显式标注 Epic 之间、任务之间的 `depends_on` 与可并行 `parallel_group`；冲突的写并行直接判定为 split 失败，必须改为串行或拆出独立前置任务。
6. 在 chat 内一次性输出 § Deliverables.A 中规定的 6 项内容（按固定顺序），并以 § A.6 的固定 handoff 询问结尾，等待用户 approve / 修订。
   - 若用户提出修订：在 plan 模式继续修，**不写文件、不切模式**；直到用户明确说 approve。
   - 若用户在未决问题上沉默：必须再次显式询问，不允许默默采纳默认建议。
   - approve 后**不要替用户切到 agent 模式**；只需在回复末尾提示"请切到 agent 模式后再说一次 '落盘'，我会按方案生成文件"。

> 以下 7–10 步在 agent 模式执行；进入前必须确认 § A.6 已获 approve、且本次会话已由用户切到 agent 模式。

7. 记录 `plan_id` 与 `plan_mode_approved_at`（`plan_id` 用 plan 阶段 § A.1 中确认稿；时间用当前 ISO8601）。
8. 在 `docs/plans/<plan-id>/` 下，按已 approve 方案 1:1 落盘 § Deliverables.B 的 5 类文件；任务级命令必须从 `data/workspace-checks.json` 取，不凭印象写。
9. 自检：跑 § Completion 的"Agent 阶段"清单；任何一项不通过必须回到对应步骤修订，不允许跳过。
10. 最终验证：用 `Read` 抽查 `master-plan.md` 的 11 章节、抽查 1 个 Epic README 与 1 个任务文档、对照 `manifest.json` 字段；通过后向用户回报 `plan_id` 与落盘文件清单。

## Rules

- **拆分层级固定为 Epic → 原子任务两层**，禁止出现"子 Epic"、"任务组"等中间层。
- **原子任务硬规则**：单一目标、显式 allowed_paths、能在新会话中独立执行、有可客观判定的验收、有停止条件、有回滚方案。
- **任务级验证只允许** `typecheck` 与 `lint`；禁止把 `npm run guard`、`npm test`、`npm run build`、`db:migrations:check` 等放进任务级 `per_task_checks`。
- **最终全量回归只能是** `npm run fix` 然后 `npm run guard`，顺序固定，不允许调换、省略、替换为子命令。（来源：AGENTS.md）
- **Plan 模式硬规则**：plan 模式内不得调用任何写文件工具（`Write` / `StrReplace` / `Delete` / `EditNotebook`），不得调用任何写命令（`npm install` / `npm run *` / `git commit` 等）；只允许 `Read` / `Glob` / `Grep` / `SemanticSearch` / 只读 shell（如 `git ls-files`、`git status`）。
- **Plan 模式输出形式**：所有结构化方案必须以 chat 内 fenced markdown / code 呈现；不得把"输出"伪装成读临时文件再写。
- **Mode 切换由用户负责**：本 skill 的两阶段切换（plan ↔ agent）一律由用户主动触发；agent **不得主动调用 `SwitchMode`**，也不能"假装已切模式"继续写文件。
- **Approve 前不得落盘**：未取得用户对 § Deliverables.A.6 的明确 approve 时，不得在 agent 模式落盘任何 `docs/plans/<plan-id>/` 文件。
- **Agent 模式不得修改方案**：agent 模式只做"按 plan 模式确认稿落盘"，不得偷偷调整 Epic / 任务划分；如发现问题必须停下并请用户切回 plan 模式重新 review。
- 任务级命令必须按所属 workspace 拼出实际可执行命令，例如 `npm --workspace @cms/admin run typecheck`，禁止写"跑一下 typecheck"等模糊指令。
- 涉及多 workspace 的原子任务必须拆分；一个原子任务最多触达一个 workspace 的代码（共享热点单独立任务除外）。
- 共享热点必须有独立的串行前置任务承载，不允许多个并行任务同时写。
- 单元测试 / 集成测试的新增或修改可以放入原子任务的 § 实施步骤；但任务级验证不强制跑 `npm test`，由最终回归阶段的 `guard` 统一覆盖。
- 不允许在原子任务里"顺手优化无关文件"。（来源：AGENTS.md）
- 最终回归阶段必须遵守仓库门禁顺序：先 `fix` 再 `guard`，全绿才算交付。（来源：AGENTS.md）
- 架构边界检查（domain / data / features / shared 不互相越界）虽属 `guard` 范畴，但拆分时即应在 `forbidden_paths` 里预先约束，避免最终回归大面积返工。（来源：AGENTS.md）
- 落盘目录默认 `docs/plans/<plan-id>/`，不允许直接污染仓库根；若用户明确指定其它路径，需在 plan 模式 approve 时显式记录。

## Anti-Patterns

- 在 plan 模式直接调用 `Write` / `StrReplace` 创建 `master-plan.md` → 违反 plan 模式只读约束，且跳过用户 review。
- 在 plan 模式给出完整 manifest.json 全文（数百行）灌进 chat → chat 噪音过大、阻碍 review；plan 模式只输出表格 + 摘要。
- 没有"未决问题清单"就要求用户 approve / 切 agent 模式 → 把模糊点偷偷转嫁给执行阶段，违反 plan 模式协作意图。
- agent 主动调用 `SwitchMode` 替用户切到 plan 或 agent 模式 → 违反"模式切换由用户负责"硬规则；只能提示用户自行切。
- 用户尚未 approve 就在 agent 模式落盘 `docs/plans/<plan-id>/...` → 违反 approve 门禁；agent 阶段必须以 plan 阶段确认稿为前置。
- agent 模式落盘时擅自调整任务划分、新增 / 删除 Epic → 与 plan 模式 review 过的方案不一致，事后无审计。
- 用户在未决问题上沉默时默默采纳默认建议 → 必须再次显式询问。
- 把"完成整个用户中心 epic"写成一个原子任务 → 不是原子，应继续拆。
- 一个原子任务同时改 `packages/admin` 和 `packages/server` → 跨 workspace 不算原子，必须拆成两个并显式 `depends_on`。
- 任务级 `per_task_checks` 写成 `["npm run guard"]` → 违背本 skill 核心目标（"小任务不跑 guard"），直接判定 split 失败。
- 多个并行任务都修改 `packages/admin/src/router.ts` 或聚合 i18n 文件却没标记冲突 → "并行剧场"，必须改为串行或拆出独立前置任务。
- 最终回归阶段只跑 `npm run guard` 不跑 `npm run fix` → 违反 AGENTS.md 顺序，会造成 lint 自动修复内容未提交。
- 任务文档里写"参考前一个任务的实现"、"接着上一步继续做" → 任务无法在新会话独立执行，违反原子性。
- 把 `npm run build` 拆进每个任务作为"快速验证" → 显著拖慢节奏，且与 `guard` 重复，禁止。
- 原子任务的 `allowed_paths` 写成模块根目录如 `packages/admin/src/views/` → 范围过宽容易越界，必须缩到具体子目录或文件级。
- 在 plan 模式跑 `npm --workspace ... run typecheck` 验证拆分 → plan 模式不应执行写命令；任务级命令在 agent 阶段由执行者跑。

## References

- [epic-template.md](references/epic-template.md) — Epic README 模板（agent 阶段落盘用）
- [atomic-task-template.md](references/atomic-task-template.md) — 原子任务文档模板（含任务级验证只跑 typecheck + lint 的固定声明）
- [manifest-template.json](references/manifest-template.json) — manifest.json 默认骨架（含 `plan_id`、`per_task_checks.policy = typecheck-and-lint-only` 与 `final_checks`）
- [final-check-runbook.md](references/final-check-runbook.md) — 最终全量回归的执行手册片段
- [workspace-checks.json](data/workspace-checks.json) — 各 workspace 对应的 typecheck / lint 实际命令查表（任务级命令唯一权威来源）
- [cursor-task-orchestrator SKILL.md](../cursor-task-orchestrator/SKILL.md) — 通用多 agent 拆分 skill；本 skill 是其"按 Epic 分层 + 任务级轻验证 + plan 模式协作"的特化变体
- [delivery-guardrail SKILL.md](../delivery-guardrail/SKILL.md) — 最终回归阶段路由到的收尾门禁 skill
- [AGENTS.md](../../../AGENTS.md) — 仓库门禁与架构边界的权威来源
- [SKILL-PROTOCOL.md](../_meta/SKILL-PROTOCOL.md) — 本 skill 遵循的统一协议

## Completion

完成后逐项确认。**Plan 阶段** 与 **Agent 阶段** 各有独立检查清单。

### Plan 阶段（用户 approve 之前必须全部满足）

1. 触发时假设用户已自行切到 plan 模式；agent **未**调用过 `SwitchMode`。
2. Chat 内已按固定顺序输出 § Deliverables.A 的 6 项内容：范围速览（含建议 `plan_id`）/ Epic 表 / 原子任务表 / 共享热点 / 未决问题清单 / handoff 询问。
3. Chat 内**未**出现完整 master-plan.md 或完整 manifest.json 全文。
4. **未**调用过任何写文件工具与写命令。
5. 所有未决问题都已经显式抛给用户；用户已就每条 approve 或修订（不允许沉默通过）。
6. 共享热点登记完整，且没有任何并行任务竞争同一热点。

### Agent 阶段（落盘后核对）

7. 用户已切到 agent 模式并明确指示"落盘"；`plan_id` 与 `plan_mode_approved_at` 已记录。
8. `master-plan.md` 11 个章节齐全，含"Plan 模式 review 记录"章节。
9. `manifest.json` 含 `plan_id`、`plan_mode_approved_at`、`per_task_checks.policy = "typecheck-and-lint-only"` 和 `final_checks = ["npm run fix", "npm run guard"]`。
10. 每个 Epic 至少 2 个原子任务；任意原子任务通过"原子性硬规则"复核。
11. 每个原子任务文档显式声明"只跑 typecheck + lint，不跑 guard"，且任务级命令是实际可执行的 `npm --workspace ... run typecheck/lint`，并与 `data/workspace-checks.json` 一致。
12. `runbook.md` 明确两阶段策略，最终回归阶段固定为先 `fix` 再 `guard`。
13. 跨 workspace 的需求已经按 workspace 拆成独立原子任务并标 `depends_on`。
14. 落盘目录为 `docs/plans/<plan-id>/`（或用户在 plan 模式 approve 时显式指定的其他路径）。
15. agent 阶段落盘内容与 plan 阶段 approve 稿一致；无未通报的方案改动。
16. 自检通过 § Anti-Patterns 全部条目。

> 本 skill 只产出**计划文档**，不直接产生代码改动；因此不强制执行仓库门禁子节。最终交付阶段的 `npm run fix` + `npm run guard` 由 `runbook.md` 阶段三 + `delivery-guardrail` skill 负责执行。
