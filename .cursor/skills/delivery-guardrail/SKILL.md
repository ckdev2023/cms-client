---
name: delivery-guardrail
description: >-
  Run npm run fix → npm run guard → test coverage → architecture check as
  close-out for code tasks. Use when finishing changes, running guardrails,
  or verifying delivery readiness.
---

# Delivery Guardrail

## Purpose

把代码任务的收尾验证包装成一个可重复执行的结构化流程——自动修复格式问题、运行全量门禁、校验测试覆盖、检查架构边界，输出明确的通过/不通过结论和修复指引。

优先级：
1. 门禁全绿——`npm run fix` + `npm run guard` 必须通过
2. 测试覆盖——新增/修改的 `model` / `domain` / `data` 逻辑有对应单测
3. 架构合规——改动不违反仓库分层规则
4. 无敏感信息泄露——代码中不含 secrets/tokens/keys

## Triggers

当用户请求符合以下任一条件时，触发此 skill：

- 用户完成代码改动后要求运行收尾检查
- 用户要求运行 `npm run fix` 和/或 `npm run guard`
- 用户要求验证代码是否可以交付（merge-ready / ship-ready）
- 用户要求检查测试覆盖或架构边界合规性
- **流水线触发（原型拆分收尾）**：`prototype-split-orchestrator` 在 regression 阶段完成后路由到此 skill，执行最终的 `npm run fix` + `npm run guard`。此场景下以页面级回归验收为前提——确认 `REGRESSION-GATE.md` 中的 `[原型]` 项已有 verdict 后，再运行门禁收尾。如果拆分只涉及 prototype HTML/CSS/JS（非 TS 生产代码），测试覆盖检查标注"不适用"即可。

示例请求：

- 帮我跑一下收尾检查
- 代码改完了，跑一下 fix 和 guard
- 这个改动能不能通过门禁？
- 帮我检查这次改动的测试覆盖和架构合规
- 我改完了，帮我走一遍交付流程
- 案件模块拆分、规格同步和回归门槛都完成了，跑一下最终门禁

## Required Inputs

执行前必须读取：

- `AGENTS.md` — 门禁规则和架构边界的权威定义
- 最近修改的文件列表（通过 `git diff --name-only`）— 确定检查范围

需要更多上下文时，再读取：

- `package.json`（root）— 确认 `fix` 和 `guard` 脚本定义
- `packages/mobile/package.json` — mobile guard 子命令组成（lint / typecheck / arch:check / feature:check / lock:check / secrets:check / test）
- `packages/server/package.json` — server guard 子命令组成（lint / typecheck / arch:check / db checks / lock:check / secrets:check / test）
- `.cursor/skills/delivery-guardrail/references/guardrail-checklist.md` — 收尾检查清单速查和常见失败修复指引

## Deliverables

除非用户明确要求轻量输出，否则至少产出：

1. **门禁执行报告**（终端输出）— `npm run fix` 和 `npm run guard` 的执行结果
2. **问题修复**（代码改动）— 修复 fix/guard 发现的问题
3. **收尾确认清单**（文本）— 逐项确认结果

### 收尾确认清单结构

```text
## 收尾确认

- [ ] `npm run fix` 通过（lint 自动修复已应用）
- [ ] `npm run guard` 通过（零报错）
- [ ] 新增/修改逻辑已有对应单测
- [ ] 测试不发起真实网络请求（mock / stub）
- [ ] 不违反架构分层（domain 无 UI 依赖、feature 不直接引用 data/infra、feature 不直接引用 tamagui）
- [ ] 未引入新的跨 feature 直接依赖
- [ ] 未引入 secrets / tokens / keys
```

## Workflow

1. 读取 `AGENTS.md`，确认门禁规则和架构边界。
2. 运行 `git diff --name-only` 获取当前改动文件列表。
3. 对改动文件做架构边界预检：
   - `domain/` 文件不 import UI 框架（React Native / tamagui / shared/ui）
   - `data/` 文件不 import `shared/ui`
   - `features/` 文件不直接 import `data/` / `infra/` / `tamagui`
   - 无跨 feature 直接 import
4. 运行 `npm run fix`。
   - 若有自动修复，确认修复内容合理
   - 若有无法自动修复的错误，手动修复
5. 运行 `npm run guard`。
   - 若全部通过，进入步骤 6。
   - 若失败，按失败项修复：
     - **lint 失败** → 检查错误行，手动修复规范问题
     - **typecheck 失败** → 定位类型错误，修复类型定义或导入
     - **arch:check 失败** → 分析 dependency-cruiser 输出，按 AGENTS.md 架构规则消除违规依赖
     - **feature:check 失败** → 分析 checkFeatureBoundaries 输出，消除跨 feature 直接依赖
     - **lock:check 失败** → 删除非 npm 锁文件，确认 `package-lock.json` 存在
     - **secrets:check 失败** → 从代码中移除敏感信息，改用环境变量
     - **db checks 失败**（仅 server）→ 检查 migration 和 drizzle 配置
     - **test 失败** → 定位失败测试，修复逻辑或更新测试断言
   - 修复后回到步骤 4 重新运行 fix + guard
6. 检查测试覆盖：
   - 对每个改动的 `model/` / `domain/` / `data/` 文件，确认存在对应测试
   - 新增逻辑必须有测试；纯类型定义可豁免
   - 测试中不得有真实网络请求（检查 fetch / axios 是否被 mock）
   - 原型/HTML/CSS/JS 改动：测试覆盖检查标注"不适用——非 TS 生产代码"
7. 检查是否引入了 secrets / tokens / keys（扫描改动文件中的敏感模式）。
8. 输出收尾确认清单，逐项标注通过/未通过。

## Rules

- `npm run fix` 必须在 `npm run guard` 之前运行。（来源：AGENTS.md）
- 新增/修改逻辑必须补单测；优先覆盖 `model` / `domain` / `data`。（来源：AGENTS.md）
- 测试中禁止发起真实网络请求（必须 mock 或注入 stub）。（来源：AGENTS.md）
- 仅使用 npm，不引入其他包管理器。（来源：AGENTS.md）
- `domain` 只放纯 TypeScript，不依赖 React Native、导航、网络实现。（来源：AGENTS.md）
- `data` 实现 `domain` 接口；`infra` 不反向依赖业务。（来源：AGENTS.md）
- Feature 层不直接依赖 `data` / `infra` / `tamagui`。（来源：AGENTS.md）
- Feature 之间不直接互相依赖。（来源：AGENTS.md）
- `domain` / `data` 不依赖 `shared/ui`。（来源：AGENTS.md）
- 门禁失败时必须修复后重跑，不允许跳过或注释掉检查。
- 如果改动只涉及 prototype / docs / 配置文件等非 TS 代码，仍需运行 guard 确保未引入副作用，但测试覆盖评估可标注"不适用"。
- fix 阶段产生的格式修改必须包含在最终提交中，不可丢弃。

## Anti-Patterns

- 只运行 `npm run guard` 不运行 `npm run fix` → lint 可自动修复的问题残留，guard 报错数虚高
- 运行 guard 报错后只修复报错行不检查根因 → 头痛医头，下次改动再次触发
- 补测试时对真实 API 发请求 → 测试不稳定、CI 环境无外网、泄露凭据风险
- 认为"只改了类型定义不需要跑门禁" → 类型改动可能导致下游编译失败
- 架构边界检查只看新增文件不看修改文件 → 已有文件中新增的 import 同样可能违规
- fix/guard 通过后继续修改代码不重跑 → 最终提交的代码可能不通过
- 为了通过 arch:check 把代码放错层级（如把 domain 逻辑放进 shared 来避免依赖报错）→ 治标不治本，架构腐化

## References

- [guardrail-checklist.md](references/guardrail-checklist.md) — 收尾检查清单速查和常见失败修复指引
- [AGENTS.md](../../AGENTS.md) — 门禁规则和架构边界的权威定义
- [project-standards.mdc](../../.cursor/rules/project-standards.mdc) — 编码规范补充
- [example-walkthrough.md](references/example-walkthrough.md) — billing 模块门禁运行演练（含常见失败修复）
- [test-case-suggester SKILL.md](../test-case-suggester/SKILL.md) — 测试用例建议 skill（步骤 6 测试覆盖检查的补充，适用于生产 TS 代码）
- [prototype-split-orchestrator SKILL.md](../prototype-split-orchestrator/SKILL.md) — 流水线编排 skill（regression 完成后路由到本 skill 做最终门禁）
- [prototype-regression-checklist SKILL.md](../prototype-regression-checklist/SKILL.md) — 回归验收 skill（原型拆分场景下，本 skill 应在回归 Gate 验收之后执行；`REGRESSION-GATE.md` 中 `[原型]` 项的 verdict 是本 skill 启动的前提）
- [page-spec-generator SKILL.md](../page-spec-generator/SKILL.md) — 页面规格 skill（流水线上游：spec sync 完成后回归项才有可引用的字段和状态定义）
- [SKILL-PROTOCOL.md](../_meta/SKILL-PROTOCOL.md) — 本 skill 遵循的统一协议

## Pipeline Position

本 skill 位于拆分流水线的最终 `guardrail` 阶段。

- **上游依赖**：`prototype-regression-checklist`（回归验收完成，`[原型]` 项已通过）
- **触发方式**：可由 `prototype-split-orchestrator` 路由触发，也可由用户直接调用（不限于拆分流水线）
- **拆分场景特殊处理**：若改动只涉及 `packages/prototype/` 下的 HTML/CSS/JS 文件，测试覆盖检查标注"不适用"；但 `npm run fix` + `npm run guard` 仍需运行

## Completion

完成后逐项确认：

1. `npm run fix` 执行完毕，无残留错误
2. `npm run guard` 执行完毕，零报错
3. 改动中的 `model` / `domain` / `data` 文件有对应测试
4. 测试中无真实网络请求
5. 无架构分层违规（domain/data/feature/shared 边界）
6. 无跨 feature 直接依赖
7. 无 secrets / tokens / keys 引入
8. 收尾确认清单已输出且全部通过

仓库门禁（本 skill 必须包含）：

1. 运行 `npm run fix`
2. 运行 `npm run guard`
3. 新增/修改逻辑已补单测（覆盖 model / domain / data）
