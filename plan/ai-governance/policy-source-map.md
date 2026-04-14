# Policy Source Map — 规则来源与权威归属

> 生成日期：2026-04-13
> 配套文件：`policy-index.json`（machine-readable 索引）、`policy-index.schema.json`（字段定义）
> 目的：解释 12 条规则的重复出现位置、canonical 归属、以及与现有脚本的关系。

---

## 1. 背景

仓库中的 agent 行为规则分散在多个文件中，同一条规则经常在 2–4 个位置重复出现（`AGENTS.md`、`.cursor/rules/`、`.cursor/skills/`）。为避免规则分叉，`policy-index.json` 为每条规则指定**唯一 canonical source**，其余出现位置标记为"重复"。

原则：

- **原文继续做权威源**——`policy-index.json` 只是编译结果，不取代来源文件。
- 同一条规则只保留 1 条 canonical 记录；重复来源在本文档中说明。
- canonical source 的选取优先级：`AGENTS.md` > `.cursor/rules/core-operating-rule.mdc` > `.cursor/skills/*/SKILL.md`。

---

## 2. 来源文件角色

| 缩写 | 文件路径 | 角色 |
|------|----------|------|
| SRC-A | `AGENTS.md` | 仓库级门禁与架构边界的最高权威 |
| SRC-B | `.cursor/rules/core-operating-rule.mdc` | 任务路由、交付门禁、架构规则（面向 agent 运行时，与 SRC-A 高度重叠） |
| SRC-C | `.cursor/skills/delivery-guardrail/SKILL.md` | 收尾门禁流程定义（引用 SRC-A） |
| SRC-D | `.cursor/skills/prototype-split-orchestrator/SKILL.md` | 流水线编排（引用 SRC-A 部分规则） |
| SRC-E | `.cursor/skills/requirement-gate/SKILL.md` | 需求编译 contract 流程 |

脚本/命令来源：

| 缩写 | 文件路径 | 说明 |
|------|----------|------|
| SCR-F | `packages/mobile/.dependency-cruiser.js` | mobile 架构门禁规则（dependency-cruiser） |
| SCR-G | `packages/mobile/scripts/checkFeatureBoundaries.cjs` | mobile 跨 feature 依赖检查脚本（211 行） |
| SCR-H | `packages/admin/.dependency-cruiser.js` | admin 架构门禁规则（dependency-cruiser） |
| SCR-I | `packages/server/.dependency-cruiser.cjs` | server 架构门禁规则（dependency-cruiser，分层不同于 mobile/admin） |
| HOOK | `.husky/pre-push` | pre-push hook：guard → fix → guard 重试 |

---

## 3. 逐条 canonical 归属与重复出现

### R01 — `fix` 必须先于 `guard`

| | |
|---|---|
| **canonical** | `AGENTS.md` §必须遵守（门禁）L6 |
| 重复 1 | `.cursor/rules/core-operating-rule.mdc` §Delivery Gates L23 |
| 重复 2 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules L110 / §Workflow Step 4-5（L85-88） |
| 重复 3 | `.cursor/skills/prototype-split-orchestrator/SKILL.md` §Rules L160 |

### R02 — 新增/修改逻辑必须补测试

| | |
|---|---|
| **canonical** | `AGENTS.md` §必须遵守（门禁）L7 |
| 重复 1 | `.cursor/rules/core-operating-rule.mdc` §Delivery Gates L24 |
| 重复 2 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules L111 / §Workflow Step 6（L100-103） |
| 重复 3 | `.cursor/skills/prototype-split-orchestrator/SKILL.md` §Rules L161 |

### R03 — 测试不得发真实网络请求

| | |
|---|---|
| **canonical** | `AGENTS.md` §必须遵守（门禁）L8 |
| 重复 1 | `.cursor/rules/core-operating-rule.mdc` §Delivery Gates L25 |
| 重复 2 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules L112 / §Workflow Step 6（L103） |

### R04 — 仅使用 npm

| | |
|---|---|
| **canonical** | `AGENTS.md` §必须遵守（门禁）L9 |
| 重复 1 | `.cursor/rules/core-operating-rule.mdc` §Delivery Gates L26 |
| 重复 2 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules L113 |

### R05 — feature 不得直接依赖 `data` / `infra`

| | |
|---|---|
| **canonical** | `AGENTS.md` §架构边界（强制）L16 |
| 重复 1 | `.cursor/rules/core-operating-rule.mdc` §Architecture L36 |
| 重复 2 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules L116 / §Workflow Step 3（L83） |

### R06 — feature 不得直接依赖 `tamagui` / `@tamagui/*`

| | |
|---|---|
| **canonical** | `AGENTS.md` §架构边界（强制）L17 |
| 重复 1 | `.cursor/rules/core-operating-rule.mdc` §Architecture L37 |
| 重复 2 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules L116（与 R05 合并表述） |

### R07 — feature 之间不得直接互相依赖

| | |
|---|---|
| **canonical** | `AGENTS.md` §架构边界（强制）L19 |
| 重复 1 | `.cursor/rules/core-operating-rule.mdc` §Architecture L35 |
| 重复 2 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules L117 |

### R08 — `domain` 必须保持纯 TypeScript

| | |
|---|---|
| **canonical** | `AGENTS.md` §架构边界（强制）L14 |
| 重复 1 | `.cursor/rules/core-operating-rule.mdc` §Architecture L33 |
| 重复 2 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules L114 / §Workflow Step 3（L81） |

### R09 — `domain` / `data` 不得依赖 `shared/ui`

| | |
|---|---|
| **canonical** | `AGENTS.md` §架构边界（强制）L18 |
| 重复 1 | `.cursor/rules/core-operating-rule.mdc` §Architecture L38 |
| 重复 2 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules L118 |

### R10 — 不做用户未明确要求的顺手优化

| | |
|---|---|
| **canonical** | `AGENTS.md` §只做用户要求 L23 |
| 重复 1 | `.cursor/rules/core-operating-rule.mdc`（被 SRC-A always-applied 覆盖，未单独列出） |

### R11 — 改动前必须先理解目标文件与相关符号，禁止盲写

| | |
|---|---|
| **canonical** | `.cursor/rules/core-operating-rule.mdc` §Task Routing L8 |
| 补充来源 | `.cursor/skills/requirement-gate/SKILL.md` §Rules L21 |
| 说明 | 无单一显式权威语句；由 "先判断任务类型，再执行对应规则" 与 "Do not implement directly from the raw PRD" 联合支撑。建议二期在 `AGENTS.md` 补显式宣示。 |

### R12 — 第三方库 / 框架 API 变更时先查官方文档（Context7）

| | |
|---|---|
| **canonical** | `.cursor/rules/core-operating-rule.mdc` §Task Routing L17-18 |
| 说明 | 仅在此文件中定义，无重复出现。 |

---

## 4. Canonical 归属汇总

| canonical source | 规则数 | 规则 ID |
|------------------|--------|---------|
| `AGENTS.md` | 10 | R01, R02, R03, R04, R05, R06, R07, R08, R09, R10 |
| `.cursor/rules/core-operating-rule.mdc` | 2 | R11, R12 |

---

## 5. 重复出现热力

下表统计每个文件被多少条规则引用或重复。

| 文件 | 覆盖规则数（/12） | 角色 |
|------|-------------------|------|
| `AGENTS.md` | 12/12 | 所有规则均可追溯到此文件（10 条 canonical + 2 条间接覆盖） |
| `.cursor/rules/core-operating-rule.mdc` | 11/12 | R01-R09 重复 + R11/R12 canonical（R10 无直接对应条目） |
| `.cursor/skills/delivery-guardrail/SKILL.md` | 9/12 | R01-R09 重复（R10-R12 未覆盖） |
| `.cursor/skills/prototype-split-orchestrator/SKILL.md` | 2/12 | R01, R02 |
| `.cursor/skills/requirement-gate/SKILL.md` | 1/12 | R11（补充来源） |

---

## 6. 脚本/命令与规则的映射

### 6.1 `npm run guard` 子命令覆盖

| guard 子命令 | 覆盖规则 | mobile | admin | server |
|--------------|----------|--------|-------|--------|
| `test` | R02（部分） | `jest` | `vitest run --coverage` | `node --test` |
| `lock:check` | R04 | ✅ L18 | ❌ 缺失 | ✅ L22 |
| `arch:check` / `check:deps` | R05, R08, R09 | ✅ dependency-cruiser | ✅ dependency-cruiser | ✅（不同分层） |
| `feature:check` | R07 | ✅ `checkFeatureBoundaries.cjs` | — | — |
| `check:deps`（cross-dep 规则） | R07 | — | ✅ `features-no-cross-dependency` | — |

### 6.2 dependency-cruiser 规则覆盖

| 规则名 | 覆盖 | mobile 行号 | admin 行号 |
|--------|------|------------|-----------|
| `features-no-data-or-infra` | R05 | L21-25 | L21-25 |
| `features-no-cross-dependency` | R07 | —（用 cjs 脚本） | L27-34 |
| `domain-no-local-outside-domain-or-shared` | R08 | L27-31 | L36-40 |
| `domain-no-shared-ui` | R08, R09 | L33-37 | L42-46 |
| `domain-no-npm` | R08 | L39-43（error） | L48-52（warn） |
| `data-no-shared-ui` | R09 | L69-73 | L72-76 |

### 6.3 `pre-push hook`（`.husky/pre-push`）

hook 逻辑：`guard → 若失败 → fix → guard 重试`。覆盖所有通过 guard 子命令检查的规则（R02, R04, R05, R07, R08, R09），作为推送前的最后防线。

---

## 7. 已知缺口（仅登记，不阻塞一期）

| 缺口 | 涉及规则 | 说明 |
|------|----------|------|
| admin 缺少 `lock:check` | R04 | admin guard 未包含锁文件检查；mobile + server 的 lock:check 检查仓库根目录，可间接覆盖 |
| tamagui 无 dependency-cruiser 规则 | R06 | feature → tamagui 依赖检查无自动化脚本；可在二期为 mobile 扩展 dependency-cruiser 规则 |
| admin `domain-no-npm` 为 warn | R08 | mobile 为 error 级别，admin 降级为 warn；admin domain 层可能有合理的 npm 依赖需求 |
| R11 无单一显式权威语句 | R11 | "禁止盲写"由两个文件的隐含语句联合支撑；建议二期在 `AGENTS.md` 补显式宣示 |
| server 分层不同 | R05-R09 | server 采用 NestJS modules/infra/config 分层，不适用 mobile/admin 的 domain/data/features 架构规则 |

---

## 8. 维护指南

1. **修改规则时**：先改 canonical source 文件，再同步更新 `policy-index.json`，最后核对本文档的重复出现位置。
2. **新增规则时**：在 canonical source 中写入规则 → 在 `policy-index.json` 新增条目 → 在本文档 §3 新增归属记录。
3. **规则退役时**：在 `policy-index.json` 中删除条目并在本文档记录退役原因与日期。
4. **定期校验**：每月检查 canonical anchor 是否因源文件重构而偏移；使用 `policy-source-inventory.md` §4.3 中的验证方法。
