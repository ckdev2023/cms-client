# ADR-007: 同领域 Action Builder 不允许双份并存

| 属性     | 值                                  |
| -------- | ----------------------------------- |
| 状态     | 已采纳                              |
| 决策日期 | 2026-05-05                          |
| 触发缺陷 | R39-C（P1）                         |
| 影响范围 | admin / model 层 timeline builders  |

## 背景

`packages/admin/src/views/cases/model/` 下曾同时存在两个 timeline builder 文件：

- `CaseTimelineBuilders.ts` — 早期实现，包含 `formatColonSuffix` 及 `generated_document.*` 的 `colonSuffix` 逻辑。
- `CaseCommsTimelineBuilders.ts` — 后续重构产物，承载了大部分 timeline 构建逻辑。

两份文件覆盖相同 action key（如 `generated_document.finalized`），但实现细节不一致。R39-C 的缺陷根因是：server 端修复 payload 的落点是 `CaseCommsTimelineBuilders.ts`，而 `CaseTimelineBuilders.ts` 中的旧实现仍被部分链路引用，导致 timeline title 渲染丢失。

## 决策

### 规则 1：同一领域的 action builder 必须唯一

- 同一个业务领域（如 case timeline）内，action builder 只允许存在一份源文件。
- 新增 action key 必须在该领域唯一的 builder 文件内添加，不得另建同名映射文件。
- 若因重构需要拆分，必须按子领域（如 `comms` / `task` / `document`）明确划分，且 action key 不得重叠。

### 规则 2：ESLint 禁止 import 已废弃的 builder 路径

- `packages/admin/eslint.config.js` 中通过 `no-restricted-imports` 规则禁止 import 已删除或已废弃的 builder 模块路径。
- 任何尝试恢复旧文件的 PR 会被 lint 拦截。

### 规则 3：合并流程

当发现双份 builder 并存时，执行以下合并流程：

1. 确定生产基线文件（被最多消费者 import 的那个）。
2. 将另一份中独有的逻辑（helper、action key 映射）合并到基线文件。
3. 迁移测试用例到基线文件的 `.test.ts`。
4. 删除冗余文件并更新 ESLint 禁止规则。
5. 确认 `npm run guard` 全绿。

## 检查清单

| 检查项                                | 通过条件                                                  |
| ------------------------------------- | --------------------------------------------------------- |
| 同领域 builder 文件数                 | = 1（或按子领域拆分且 key 不重叠）                        |
| 新增 action key                       | 仅在唯一 builder 文件内添加                               |
| ESLint `no-restricted-imports`        | 已配置禁止旧路径                                          |
| 测试覆盖                              | 合并后的 builder 测试覆盖所有 action key 的输入输出       |

## 后果

- 消除了因双份 builder 导致的修复落点漂移风险。
- 开发者在新增 timeline action 时有明确的唯一落点。
- CI lint 阶段即可拦截误恢复旧文件的 import。
