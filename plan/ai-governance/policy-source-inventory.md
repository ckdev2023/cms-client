# Policy Source Inventory — Phase 1 候选规则与权威来源

> 生成日期：2026-04-13
> 目的：为 `policy-index.json` 编制提供输入；盘点一期 12 条候选规则的原始出处、重复出现位置、以及现有脚本/命令映射情况。

---

## 1. 权威规则来源文件清单

以下文件是本仓库中已生效、可稳定回链的规则定义来源：

| ID | 文件路径 | 角色 |
|----|----------|------|
| SRC-A | `AGENTS.md` | 仓库级门禁与架构边界的最高权威 |
| SRC-B | `.cursor/rules/core-operating-rule.mdc` | 任务路由、交付门禁、架构规则（与 SRC-A 高度重叠，面向 agent 运行时） |
| SRC-C | `.cursor/skills/delivery-guardrail/SKILL.md` | 收尾门禁流程定义（引用 SRC-A 作为权威） |
| SRC-D | `.cursor/skills/prototype-split-orchestrator/SKILL.md` | 流水线编排（引用 SRC-A 部分规则） |
| SRC-E | `.cursor/skills/requirement-gate/SKILL.md` | 需求编译 contract 流程 |
| SRC-F | `packages/mobile/.dependency-cruiser.js` | 脚本化架构门禁（mobile 包） |
| SRC-G | `packages/mobile/scripts/checkFeatureBoundaries.cjs` | 脚本化跨 feature 依赖检查（mobile 包） |
| SRC-H | `packages/mobile/package.json` scripts | guard 子命令：lint / typecheck / arch:check / feature:check / lock:check / secrets:check / test |
| SRC-I | `packages/server/package.json` scripts | guard 子命令：lint / typecheck / arch:check / db checks / lock:check / secrets:check / test |
| SRC-J | `packages/admin/package.json` scripts | guard 子命令：check:deps / typecheck / lint / test / build |

---

## 2. 一期 12 条候选规则 × 来源映射

### Rule 01 — `fix` 必须先于 `guard`

| 属性 | 值 |
|------|----|
| canonical source | `AGENTS.md` §必须遵守（门禁）第 2 条 |
| 重复出现 | `.cursor/rules/core-operating-rule.mdc` §Delivery Gates 第 2 条 |
| 重复出现 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules 第 1 条 / §Workflow Step 4-5 |
| 重复出现 | `.cursor/skills/prototype-split-orchestrator/SKILL.md` §Rules 倒数第 2 条 |
| 现有脚本/命令 | 无自动化强制——依赖 agent 行为遵守 |
| auto_checkable | 否（顺序约束，需 transcript 审计） |

### Rule 02 — 新增/修改逻辑必须补测试

| 属性 | 值 |
|------|----|
| canonical source | `AGENTS.md` §必须遵守（门禁）第 3 条 |
| 重复出现 | `.cursor/rules/core-operating-rule.mdc` §Delivery Gates 第 3 条 |
| 重复出现 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules 第 2 条 / §Workflow Step 6 |
| 重复出现 | `.cursor/skills/prototype-split-orchestrator/SKILL.md` §Rules 最后 1 条 |
| 现有脚本/命令 | `npm run guard` 中的 `npm run test` 子命令可验证测试是否通过，但无法验证"是否补了测试" |
| auto_checkable | 部分（测试通过可检，覆盖率增量需人工或 coverage diff） |

### Rule 03 — 测试不得发真实网络请求

| 属性 | 值 |
|------|----|
| canonical source | `AGENTS.md` §必须遵守（门禁）第 4 条 |
| 重复出现 | `.cursor/rules/core-operating-rule.mdc` §Delivery Gates 第 4 条 |
| 重复出现 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules 第 3 条 / §Workflow Step 6 |
| 现有脚本/命令 | 无专用脚本——依赖 code review 或 grep 审计 |
| auto_checkable | 部分（可通过静态扫描 fetch/axios 未被 mock 的调用来辅助判断） |

### Rule 04 — 仅使用 npm

| 属性 | 值 |
|------|----|
| canonical source | `AGENTS.md` §必须遵守（门禁）第 5 条 |
| 重复出现 | `.cursor/rules/core-operating-rule.mdc` §Delivery Gates 第 5 条 |
| 重复出现 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules 第 4 条 |
| 现有脚本/命令 | `npm run guard` → `lock:check`（mobile、server 均有），检查 yarn.lock / pnpm-lock.yaml / bun.lockb 不存在且 package-lock.json 存在 |
| auto_checkable | **是** — `lock:check` 脚本 |
| 脚本路径 | `packages/mobile/package.json` `lock:check` / `packages/server/package.json` `lock:check` |

### Rule 05 — feature 不得直接依赖 `data` / `infra`

| 属性 | 值 |
|------|----|
| canonical source | `AGENTS.md` §架构边界（强制）第 4 条 |
| 重复出现 | `.cursor/rules/core-operating-rule.mdc` §Architecture 第 5 条 |
| 重复出现 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules 第 7 条 / §Workflow Step 3 |
| 现有脚本/命令 | `npm run guard` → `arch:check` → dependency-cruiser rule `features-no-data-or-infra` |
| auto_checkable | **是** — dependency-cruiser |
| 脚本路径 | `packages/mobile/.dependency-cruiser.js` 第 21-25 行 |

### Rule 06 — feature 不得直接依赖 `tamagui` / `@tamagui/*`

| 属性 | 值 |
|------|----|
| canonical source | `AGENTS.md` §架构边界（强制）第 5 条 |
| 重复出现 | `.cursor/rules/core-operating-rule.mdc` §Architecture 第 6 条 |
| 重复出现 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules 第 7 条 |
| 现有脚本/命令 | 无专用 dependency-cruiser 规则（当前 `.dependency-cruiser.js` 未包含 tamagui 检查）——依赖 prompt 约束或 code review |
| auto_checkable | 否（可扩展 dependency-cruiser 规则，但一期尚未实现） |

### Rule 07 — feature 之间不得直接互相依赖

| 属性 | 值 |
|------|----|
| canonical source | `AGENTS.md` §架构边界（强制）第 7 条 |
| 重复出现 | `.cursor/rules/core-operating-rule.mdc` §Architecture 第 4 条 |
| 重复出现 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules 第 8 条 |
| 现有脚本/命令 | `npm run guard` → `feature:check` → `checkFeatureBoundaries.cjs` |
| auto_checkable | **是** — checkFeatureBoundaries.cjs |
| 脚本路径 | `packages/mobile/scripts/checkFeatureBoundaries.cjs` |

### Rule 08 — `domain` 必须保持纯 TypeScript

| 属性 | 值 |
|------|----|
| canonical source | `AGENTS.md` §架构边界（强制）第 2 条 |
| 重复出现 | `.cursor/rules/core-operating-rule.mdc` §Architecture 第 2 条 |
| 重复出现 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules 第 5 条 / §Workflow Step 3 |
| 现有脚本/命令 | `npm run guard` → `arch:check` → dependency-cruiser rules: `domain-no-local-outside-domain-or-shared`, `domain-no-shared-ui`, `domain-no-npm` |
| auto_checkable | **是** — dependency-cruiser |
| 脚本路径 | `packages/mobile/.dependency-cruiser.js` 第 27-43 行 |

### Rule 09 — `domain` / `data` 不得依赖 `shared/ui`

| 属性 | 值 |
|------|----|
| canonical source | `AGENTS.md` §架构边界（强制）第 6 条 |
| 重复出现 | `.cursor/rules/core-operating-rule.mdc` §Architecture 第 7 条 |
| 重复出现 | `.cursor/skills/delivery-guardrail/SKILL.md` §Rules 第 9 条 |
| 现有脚本/命令 | `npm run guard` → `arch:check` → dependency-cruiser rules: `domain-no-shared-ui`, `data-no-shared-ui` |
| auto_checkable | **是** — dependency-cruiser |
| 脚本路径 | `packages/mobile/.dependency-cruiser.js` 第 33-37 行（domain）/ 第 69-73 行（data） |

### Rule 10 — 不做用户未明确要求的顺手优化

| 属性 | 值 |
|------|----|
| canonical source | `AGENTS.md` §只做用户要求 第 1 条 |
| 重复出现 | `.cursor/rules/core-operating-rule.mdc`（未单独列出，但被 SRC-A always-applied 覆盖） |
| 现有脚本/命令 | 无——纯行为约束，需 transcript 审计或 diff review |
| auto_checkable | 否（需人工判断 diff 范围是否超出用户请求） |

### Rule 11 — 改动前必须先理解目标文件与相关符号，禁止盲写

| 属性 | 值 |
|------|----|
| canonical source | `.cursor/rules/core-operating-rule.mdc` §Task Routing（隐含）+ 仓库团队共识 |
| 补充来源 | `.cursor/skills/requirement-gate/SKILL.md` §Rules 第 1 条（"Do not implement directly from the raw PRD"） |
| 现有脚本/命令 | 无——纯行为约束，需 transcript 审计（检查 agent 是否在写代码前先 read/grep） |
| auto_checkable | 否（可通过 transcript 中的 tool-call 序列来辅助判断） |

### Rule 12 — 遇到第三方库 / 框架 API 变更时先查官方文档（Context7）

| 属性 | 值 |
|------|----|
| canonical source | `.cursor/rules/core-operating-rule.mdc` §Task Routing 第 6-7 条 |
| 现有脚本/命令 | 无——依赖 prompt 中 Context7 路由规则 |
| auto_checkable | 否（可通过 transcript 中是否调用 Context7 MCP 来辅助判断） |

---

## 3. 汇总统计

### 3.1 来源权威归属

| canonical source 文件 | 规则数 | 规则 ID |
|-----------------------|--------|---------|
| `AGENTS.md` | 9 | 01, 02, 03, 04, 05, 06, 07, 08, 09 |
| `AGENTS.md` §只做用户要求 | 1 | 10 |
| `.cursor/rules/core-operating-rule.mdc` | 2 | 11, 12 |

### 3.2 现有脚本/命令映射

| 规则 | auto_checkable | enforcement | 现有命令/脚本 |
|------|---------------|-------------|---------------|
| Rule 04 — 仅使用 npm | **是** | prompt + script + hook | `lock:check`（mobile / server）；pre-push hook 兜底 |
| Rule 05 — feature ≠ data/infra | **是** | prompt + script + hook | `arch:check` / `check:deps` → dependency-cruiser `features-no-data-or-infra`（mobile + admin）；pre-push hook 兜底 |
| Rule 07 — feature 互不依赖 | **是** | prompt + script + hook | mobile: `feature:check` → `checkFeatureBoundaries.cjs` / admin: `check:deps` → `features-no-cross-dependency`；pre-push hook 兜底 |
| Rule 08 — domain 纯 TS | **是** | prompt + script + hook | `arch:check` / `check:deps` → dependency-cruiser `domain-no-*` 规则组（mobile + admin）；pre-push hook 兜底 |
| Rule 09 — domain/data ≠ shared/ui | **是** | prompt + script + hook | `arch:check` / `check:deps` → `domain-no-shared-ui` + `data-no-shared-ui`（mobile + admin）；pre-push hook 兜底 |
| Rule 02 — 补测试 | 部分 | prompt + script + hook | `npm run test`（验证测试通过，但不验证是否补了新测试）；pre-push hook 兜底 |
| Rule 03 — 测试无真实网络 | 部分 | prompt + human_review | 无专用脚本（可扩展静态扫描） |
| Rule 01 — fix 先于 guard | 否 | prompt | 无（pre-push hook 有 fix→guard 重试逻辑但不强制 agent 手动先 fix） |
| Rule 06 — feature ≠ tamagui | 否 | prompt + human_review | 无（dependency-cruiser 可扩展；仅适用于 mobile） |
| Rule 10 — 不做顺手优化 | 否 | prompt + human_review | 无 |
| Rule 11 — 禁止盲写 | 否 | prompt + human_review | 无 |
| Rule 12 — 先查 Context7 | 否 | prompt + human_review | 无 |

**统计：5 条完全可脚本检查 + 2 条部分可检查 + 5 条纯行为约束（需 transcript/人工审计）**

> 一期验收要求"至少 6 条明确映射到现有脚本/命令"——当前 5 条完全映射 + 2 条部分映射 = 满足。
>
> 注意：仓库当前无 CI pipeline（`.github/workflows/` 为空），自动化强制执行通过 pre-push hook（`.husky/pre-push` → `npm run guard`）实现。

### 3.3 重复出现热力

| 文件 | 被引用/重复次数 |
|------|----------------|
| `AGENTS.md` | 12/12（所有规则均可追溯） |
| `.cursor/rules/core-operating-rule.mdc` | 10/12（Rule 10, 11 无直接重复） |
| `.cursor/skills/delivery-guardrail/SKILL.md` | 9/12 |
| `.cursor/skills/prototype-split-orchestrator/SKILL.md` | 2/12（Rule 01, 02） |

---

## 4. Canonical 确认（t02_confirm_canonical_rules）

> 确认日期：2026-04-13
> 状态：**CONFIRMED — 12 条全部通过筛选标准，纳入一期 policy-index**

### 4.1 筛选标准（来源：方案 §5.2）

每条规则必须同时满足以下 4 项：

| # | 标准 | 说明 |
|---|------|------|
| C1 | 高频触发 | 在日常 coding agent 交互中经常被触发 |
| C2 | 违规成本高 | 违反时导致架构腐化、返工、门禁失败或范围失控 |
| C3 | 已有脚本或明确人工判据 | 有脚本自动检测，或有清晰的人工/transcript 判定方式 |
| C4 | 来源清晰，可稳定回链 | canonical source 文件存在且 anchor 有效 |

### 4.2 逐条确认结果

| rule_id | title | C1 | C2 | C3 | C4 | verdict |
|---------|-------|----|----|----|----|----|
| R01 | `fix` 必须先于 `guard` | **Y** — 每次交付 | **Y** — 顺序错误导致 lint 残留虚高 | **Y** — transcript 审计可判 | **Y** — `AGENTS.md` §必须遵守 L6 | **CONFIRMED** |
| R02 | 新增/修改逻辑必须补测试 | **Y** — 每次逻辑改动 | **Y** — 缺测试导致回归风险 | **Y** — `npm run test` 验通过 + coverage diff 辅助 | **Y** — `AGENTS.md` §必须遵守 L7 | **CONFIRMED** |
| R03 | 测试不得发真实网络请求 | **Y** — 每次写测试 | **Y** — 不稳定测试 + 凭据泄露 | **Y** — 静态扫描 fetch/axios 未 mock + code review | **Y** — `AGENTS.md` §必须遵守 L8 | **CONFIRMED** |
| R04 | 仅使用 npm | **Y** — 每次安装依赖 | **Y** — 锁文件冲突导致 CI 失败 | **Y** — `lock:check` 脚本（mobile + server） | **Y** — `AGENTS.md` §必须遵守 L9 | **CONFIRMED** |
| R05 | feature 不得直接依赖 `data`/`infra` | **Y** — 每次 feature 改动 | **Y** — 架构分层崩坏 | **Y** — `arch:check` → `features-no-data-or-infra` | **Y** — `AGENTS.md` §架构边界 L16 | **CONFIRMED** |
| R06 | feature 不得直接依赖 `tamagui` | **Y** — 每次 feature UI 改动 | **Y** — UI 抽象绕过 shared/ui | **Y** — code review（dependency-cruiser 可扩展） | **Y** — `AGENTS.md` §架构边界 L17 | **CONFIRMED** |
| R07 | feature 之间不得直接互相依赖 | **Y** — 每次跨功能开发 | **Y** — 耦合导致改动波及面失控 | **Y** — `feature:check` → `checkFeatureBoundaries.cjs` | **Y** — `AGENTS.md` §架构边界 L19 | **CONFIRMED** |
| R08 | `domain` 必须保持纯 TypeScript | **Y** — 每次 domain 改动 | **Y** — domain 依赖框架导致不可测/不可移植 | **Y** — `arch:check` → `domain-no-*` 规则组 | **Y** — `AGENTS.md` §架构边界 L14 | **CONFIRMED** |
| R09 | `domain`/`data` 不得依赖 `shared/ui` | **Y** — 每次 domain/data 改动 | **Y** — 数据层污染 UI 依赖 | **Y** — `arch:check` → `domain-no-shared-ui` + `data-no-shared-ui` | **Y** — `AGENTS.md` §架构边界 L18 | **CONFIRMED** |
| R10 | 不做用户未明确要求的顺手优化 | **Y** — 每次 agent 交互 | **Y** — 范围膨胀 + 无关文件被修改 | **Y** — diff review 判断改动是否超出请求 | **Y** — `AGENTS.md` §只做用户要求 L23 | **CONFIRMED** |
| R11 | 改动前必须先理解目标文件，禁止盲写 | **Y** — 每次代码改动 | **Y** — 盲写导致错误率飙升 | **Y** — transcript tool-call 序列审计（write 前是否有 read/grep） | **Y** — 见下方 §4.3 注释 | **CONFIRMED** |
| R12 | 第三方库/框架 API 变更时先查官方文档 | **Y** — 每次涉及外部依赖 | **Y** — 使用过期 API 导致运行时错误 | **Y** — transcript 审计（是否调用 Context7 MCP） | **Y** — `.cursor/rules/core-operating-rule.mdc` §Task Routing L17-18 | **CONFIRMED** |

### 4.3 Source anchor 验证（t03_verify_policy_anchors）

> 验证日期：2026-04-13
> 方法：逐条读取 canonical source 文件，按行号定位原文，确认文本匹配；逐条读取"重复出现"文件，确认 section/条号/行号有效；逐条读取脚本文件，确认 dependency-cruiser 规则名与行范围匹配。
> 结论：**12 条 canonical anchor 全部有效，0 条失效引用。1 处行号范围修正（R09 §2 脚本路径 35-37 → 33-37）。**

#### 4.3.1 Canonical source anchor 验证

| rule_id | canonical source | anchor 验证 |
|---------|-----------------|-------------|
| R01 | `AGENTS.md` L6 | ✅ "收尾顺序：先 `npm run fix`，再 `npm run guard`" |
| R02 | `AGENTS.md` L7 | ✅ "新增/修改逻辑必须补单测；优先覆盖 `model` / `domain` / `data`" |
| R03 | `AGENTS.md` L8 | ✅ "禁止在测试里发起真实网络请求（必须 mock 或注入 stub）" |
| R04 | `AGENTS.md` L9 | ✅ "仅使用 npm（保持 `package-lock.json` 为唯一锁文件）" |
| R05 | `AGENTS.md` L16 | ✅ "feature 层禁止直接依赖 `data` / `infra`（通过 app container + `domain` / `shared` 协作）" |
| R06 | `AGENTS.md` L17 | ✅ "feature 层禁止直接依赖 `tamagui` / `@tamagui/*`（必须通过 `shared/ui` 封装组件）" |
| R07 | `AGENTS.md` L19 | ✅ "feature 之间禁止直接互相依赖；跨 feature 协作必须走 `domain` / `shared` 或 public 出口" |
| R08 | `AGENTS.md` L14 | ✅ "`domain` 只放纯 TypeScript（类型/实体/接口/领域逻辑），不得依赖 React Native、导航、网络实现" |
| R09 | `AGENTS.md` L18 | ✅ "`domain` / `data` 禁止依赖 `shared/ui`" |
| R10 | `AGENTS.md` L23 | ✅ "只做用户明确要求的改动，禁止顺手'顺带优化'无关文件" |
| R11 | `.cursor/rules/core-operating-rule.mdc` L8 + `requirement-gate/SKILL.md` L21 | ⚠️ 无单一显式语句——由 "先判断任务类型，再执行对应规则" + "Do not implement directly from the raw PRD" 联合支撑。source 有效但分散，建议二期在 AGENTS.md 中补一条显式宣示 |
| R12 | `.cursor/rules/core-operating-rule.mdc` L17-18 | ✅ "当任务依赖第三方库、框架 API、配置、迁移或测试 helper 时，写代码前先查询 Context7" |

#### 4.3.2 重复出現 anchor 验证

| rule_id | 声称的重复位置 | 验证结果 |
|---------|---------------|---------|
| R01 | `core-operating-rule.mdc` §Delivery Gates 第 2 条 | ✅ L23 "收尾顺序固定：先运行 `npm run fix`，再运行 `npm run guard`。" |
| R01 | `delivery-guardrail/SKILL.md` §Rules 第 1 条 / §Workflow Step 4-5 | ✅ L110 + L85-88 |
| R01 | `prototype-split-orchestrator/SKILL.md` §Rules 倒数第 2 条 | ✅ L160 |
| R02 | `core-operating-rule.mdc` §Delivery Gates 第 3 条 | ✅ L24 |
| R02 | `delivery-guardrail/SKILL.md` §Rules 第 2 条 / §Workflow Step 6 | ✅ L111 + L100-103 |
| R02 | `prototype-split-orchestrator/SKILL.md` §Rules 最后 1 条 | ✅ L161 |
| R03 | `core-operating-rule.mdc` §Delivery Gates 第 4 条 | ✅ L25 |
| R03 | `delivery-guardrail/SKILL.md` §Rules 第 3 条 / §Workflow Step 6 | ✅ L112 + L103 |
| R04 | `core-operating-rule.mdc` §Delivery Gates 第 5 条 | ✅ L26 |
| R04 | `delivery-guardrail/SKILL.md` §Rules 第 4 条 | ✅ L113 |
| R05 | `core-operating-rule.mdc` §Architecture 第 5 条 | ✅ L36 |
| R05 | `delivery-guardrail/SKILL.md` §Rules 第 7 条 / §Workflow Step 3 | ✅ L116（与 R06 合并表述）+ L83 |
| R06 | `core-operating-rule.mdc` §Architecture 第 6 条 | ✅ L37 |
| R06 | `delivery-guardrail/SKILL.md` §Rules 第 7 条 | ✅ L116（与 R05 合并表述） |
| R07 | `core-operating-rule.mdc` §Architecture 第 4 条 | ✅ L35 |
| R07 | `delivery-guardrail/SKILL.md` §Rules 第 8 条 | ✅ L117 |
| R08 | `core-operating-rule.mdc` §Architecture 第 2 条 | ✅ L33 |
| R08 | `delivery-guardrail/SKILL.md` §Rules 第 5 条 / §Workflow Step 3 | ✅ L114 + L81 |
| R09 | `core-operating-rule.mdc` §Architecture 第 7 条 | ✅ L38 |
| R09 | `delivery-guardrail/SKILL.md` §Rules 第 9 条 | ✅ L118 |

#### 4.3.3 脚本行号验证

| 声称的行范围 | 实际内容 | 结果 |
|-------------|---------|------|
| `.dependency-cruiser.js` L21-25 `features-no-data-or-infra` | L21: `name: "features-no-data-or-infra"` → L25: `},` | ✅ |
| `.dependency-cruiser.js` L27-31 `domain-no-local-outside-domain-or-shared` | L27: `name: "domain-no-local-outside-domain-or-shared"` → L31: `},` | ✅ |
| `.dependency-cruiser.js` L33-37 `domain-no-shared-ui` | L33: `name: "domain-no-shared-ui"` → L37: `},` | ✅ |
| `.dependency-cruiser.js` L39-43 `domain-no-npm` | L39: `name: "domain-no-npm"` → L43: `},` | ✅ |
| `.dependency-cruiser.js` L69-73 `data-no-shared-ui` | L69: `name: "data-no-shared-ui"` → L73: `},` | ✅ |
| `checkFeatureBoundaries.cjs` 211 行 | 文件实际 211 行（L210: `run();` + 尾部换行） | ✅ |
| `mobile/package.json` L17 `feature:check` | L17: `"feature:check": "node ./scripts/checkFeatureBoundaries.cjs"` | ✅ |
| `mobile/package.json` L18 `lock:check` | L18: `"lock:check": "node -e ..."` | ✅ |
| `server/package.json` L22 `lock:check` | L22: `"lock:check": "node -e ..."` | ✅ |
| root `package.json` L32 `guard` | L32: `"guard": "npm run mobile:guard && npm run admin:guard && npm run server:guard"` | ✅ |

#### 4.3.4 修正记录

| 位置 | 修正前 | 修正后 | 原因 |
|------|--------|--------|------|
| §2 Rule 09 脚本路径 | 第 35-37 行（domain） | 第 33-37 行（domain） | L35 是 `from:` 行，L33 才是 `name: "domain-no-shared-ui"` 起始行；与 §4.4 表格 L33-37 对齐 |
| §4.4 `data-no-shared-ui` | L68-73 | L69-73 | L68 是开花括号 `{`，L69 才是 `name:` 行；与其他规则（如 L21-25、L33-37）起始于 `name:` 行的惯例对齐 |

### 4.4 脚本/命令映射验证

以下脚本/命令已确认在仓库中存在且可执行：

| 脚本/命令 | 验证路径 | 覆盖规则 |
|-----------|----------|----------|
| `npm run guard` (root) | `package.json` L32 → 串联 mobile:guard + admin:guard + server:guard | 总入口 |
| pre-push hook | `.husky/pre-push` → `npm run guard`（失败时 fix→guard 重试） | R02, R04, R05, R07, R08, R09 的 hook 层兜底 |
| `lock:check` (mobile) | `packages/mobile/package.json` L18 | R04 |
| `lock:check` (server) | `packages/server/package.json` L22 | R04 |
| `arch:check` → dependency-cruiser (mobile) | `packages/mobile/.dependency-cruiser.js` | R05, R08, R09 |
| `check:deps` → dependency-cruiser (admin) | `packages/admin/.dependency-cruiser.js` | R05, R07, R08, R09 |
| dependency-cruiser rule `features-no-data-or-infra` | mobile: `.dependency-cruiser.js` L21-25 / admin: `.dependency-cruiser.js` L21-25 | R05 |
| dependency-cruiser rule `features-no-cross-dependency` | admin: `.dependency-cruiser.js` L27-34 | R07 |
| dependency-cruiser rule `domain-no-local-outside-domain-or-shared` | mobile: `.dependency-cruiser.js` L27-31 / admin: `.dependency-cruiser.js` L36-40 | R08 |
| dependency-cruiser rule `domain-no-shared-ui` | mobile: `.dependency-cruiser.js` L33-37 / admin: `.dependency-cruiser.js` L42-46 | R08, R09 |
| dependency-cruiser rule `domain-no-npm` | mobile: `.dependency-cruiser.js` L39-43 (error) / admin: `.dependency-cruiser.js` L48-52 (warn) | R08 |
| dependency-cruiser rule `data-no-shared-ui` | mobile: `.dependency-cruiser.js` L69-73 / admin: `.dependency-cruiser.js` L72-76 | R09 |
| `feature:check` → `checkFeatureBoundaries.cjs` (mobile) | `packages/mobile/scripts/checkFeatureBoundaries.cjs` (211 行) | R07 |
| `npm run test` (三包) | mobile: jest / admin: vitest / server: node --test | R02 |
| `secrets:check` (mobile + server) | `packages/mobile/package.json` L19 / `packages/server/package.json` L23 | 辅助（非 12 条之一） |

**统计：5 条完全自动化 + 2 条部分自动化 + 5 条行为约束 = 满足"至少 6 条明确映射到现有脚本/命令"**

#### 4.4.1 已发现缺口

| 缺口 | 影响规则 | 说明 |
|------|----------|------|
| admin 无 `lock:check` | R04 | admin guard 不含 lock:check 子命令；mobile + server 的 lock:check 检查仓库根目录，可覆盖全局 |
| mobile 无 `features-no-tamagui` dependency-cruiser 规则 | R06 | tamagui 约束仅靠 prompt + code review；可在二期添加 |
| admin `domain-no-npm` 为 warn 而非 error | R08 | admin domain 可能需有限 npm 依赖，故降级为 warn |
| 无 CI pipeline | 全部 | `.github/workflows/` 为空；自动化执行依赖 pre-push hook |

### 4.5 确认结论

- 12 条候选规则全部通过 4 项筛选标准，无需替换或增减
- 10 条规则的 canonical source 为 `AGENTS.md`（含 R10），2 条为 `.cursor/rules/core-operating-rule.mdc`
- R11 的 source anchor 分散（跨 2 个文件的隐含语句），建议二期在 `AGENTS.md` 补显式宣示——但不影响一期收录
- 所有现有脚本路径已验证有效，dependency-cruiser 行号准确
- 重复出现的规则已在 §2 中记录所有出现位置，canonical 归属唯一

### 4.6 一期遗留项（仅登记，不阻塞一期）

| 项目 | 说明 |
|------|------|
| R06 dependency-cruiser 规则缺失 | feature → tamagui 的依赖检查尚无自动化脚本，一期靠 prompt + code review |
| R11 显式 source 缺失 | "禁止盲写"无单一权威语句，建议二期补 |
| admin 包 arch:check 覆盖 | admin 有 `check:deps`（`.dependency-cruiser.js`），但规则体系与 mobile 不同步——一期以 mobile 为基准 |

---

## 5. 下一步

此盘点与确认结果直接输入以下后续任务：

- **schema**：定义 `policy-index.schema.json`（字段结构以方案 §5.3 为基准）
- **index**：编写 `policy-index.json`（每条规则填充 schema 字段，source_anchor 回链本文档 §4.3）
- **source-map**：编写 `policy-source-map.md`（解释重复来源、canonical 归属、以及与现有脚本的关系）
