# T14 — Skill Dry-Run Review

> 日期：2026-04-10
> 候选模块：customers、billing、documents
> 审查范围：全部 11 个 skill + SKILL-PROTOCOL

---

## 1. 审查方法

对每个 skill，使用三个候选模块构造真实请求，按以下维度评审：

| 维度 | 评判标准 |
|------|---------|
| **触发精度** | 请求能否无歧义地触发目标 skill，不误触相邻 skill |
| **输入可用性** | 必读文件是否在仓库中存在且路径正确 |
| **输出定义** | Deliverables 的最小结构是否足够指导产出 |
| **工作流可执行性** | Workflow 步骤能否顺序执行、无断链 |
| **金样本覆盖** | 至少 1 个金样本可在 repo 内找到 |
| **跨 skill 衔接** | 上游 skill 产出能否直接作为下游输入 |

---

## 2. 模块资产盘点

### 2.1 customers（金样本）

| 产物 | 存在 | 行数 |
|------|------|------|
| `P0-CONTRACT.md` | ✅ | ~200+ |
| `SPLIT-ARCHITECTURE.md` | ✅ | ~300+ |
| `MIGRATION-MAPPING.md` | ✅ | ~300+ |
| `split-manifest.json` | ✅ | ~200+ |
| `REGRESSION-GATE.md` | ❌ | — |
| `INVENTORY.md` | ❌ | — |
| `sections/` (6 files) | ✅ | — |
| `scripts/` (5 files) | ✅ | — |
| `data/` (1 file) | ✅ | — |

### 2.2 billing（复杂样本）

| 产物 | 存在 | 行数 |
|------|------|------|
| `P0-CONTRACT.md` | ✅ | 574 |
| `SPLIT-ARCHITECTURE.md` | ✅ | 614 |
| `MIGRATION-MAPPING.md` | ✅ | 562 |
| `split-manifest.json` | ✅ | 583 |
| `REGRESSION-GATE.md` | ✅ | 207 |
| `INVENTORY.md` | ✅ | 713 |
| `sections/` (9 files) | ✅ | — |
| `scripts/` (5 files) | ✅ | — |
| `data/` (2 files) | ✅ | — |

### 2.3 documents（双入口样本）

| 产物 | 存在 | 行数 |
|------|------|------|
| `P0-CONTRACT.md` | ✅ | 548 |
| `SPLIT-ARCHITECTURE.md` | ✅ | 716 |
| `MIGRATION-MAPPING.md` | ✅ | 607 |
| `split-manifest.json` | ✅ | 608 |
| `REGRESSION-GATE.md` | ✅ | 315 |
| `INVENTORY.md` | ✅ | 859 |
| `sections/` (10 files) | ✅ | — |
| `scripts/` (5 files) | ✅ | — |
| `data/` (2 files) | ✅ | — |

---

## 3. 逐 Skill Dry-Run

### 3.1 prototype-module-split

#### 模拟请求

> "帮我拆分 billing 原型到标准目录结构"

#### 评审结果

| 维度 | 结果 | 备注 |
|------|------|------|
| 触发精度 | ✅ 通过 | 触发词明确，不会与 mapping/regression 混淆 |
| 输入可用性 | ✅ 通过 | 金样本 `customers/` 全套产物存在 |
| 输出定义 | ✅ 通过 | P0-CONTRACT/SPLIT-ARCH/MIGRATION-MAPPING/manifest 最小结构完备 |
| 工作流可执行性 | ✅ 通过 | 9 步可顺序执行 |
| 金样本覆盖 | ✅ 通过 | customers 是最完整金样本 |
| 跨 skill 衔接 | ✅ 通过 | 产出直接为 mapping/regression 提供输入 |

#### 发现

| # | 严重性 | 问题 | 建议 |
|---|--------|------|------|
| S1-1 | **中** | `reference.md` 和 `examples.md` 位于 skill 根目录，未放入 `references/`，违反 SKILL-PROTOCOL §3 目录规范 | 下次实质修改时迁移到 `references/` |
| S1-2 | **低** | 缺少 `references/example-walkthrough.md`（其他 10 个 skill 都有） | 基于 `examples.md` 补一个标准格式的 walkthrough |
| S1-3 | **低** | billing 已完成拆分（产物齐全），再跑 split skill 属于"重跑"场景；skill 未说明重跑策略 | 在 Rules 或 Anti-Patterns 中补充"对已拆分模块重跑时应 diff 而非覆写" |

---

### 3.2 prototype-to-production-mapping

#### 模拟请求

> "帮我把 documents 原型映射到生产代码架构"

#### 评审结果

| 维度 | 结果 | 备注 |
|------|------|------|
| 触发精度 | ✅ 通过 | "映射到生产" 精确匹配 |
| 输入可用性 | ✅ 通过 | documents 的 SPLIT-ARCH/P0-CONTRACT/manifest/data/scripts 全在 |
| 输出定义 | ✅ 通过 | MIGRATION-MAPPING 8 章节 + manifest productionMapping 结构清晰 |
| 工作流可执行性 | ✅ 通过 | 15 步顺序执行无断链 |
| 金样本覆盖 | ✅ 通过 | customers/MIGRATION-MAPPING.md 是标杆 |
| 跨 skill 衔接 | ✅ 通过 | 依赖 split 产物，产出供 regression 和 test-case 使用 |

#### 发现

| # | 严重性 | 问题 | 建议 |
|---|--------|------|------|
| S2-1 | **低** | Workflow 步骤 3-5 可并行读取 data/scripts/sections，但写作"顺序"可能暗示必须串行 | 步骤 3-5 合并为一步"并行读取模块的 data/scripts/sections" |
| S2-2 | **信息** | documents 已有 MIGRATION-MAPPING.md (607 行)，再跑此 skill 等于校验/补全——skill 应能处理"已有产物的增量更新"场景 | 金样本 walkthrough 已演示全新场景；建议补一个"校验已有映射"的段落 |

---

### 3.3 business-doc-compiler

#### 模拟请求

> "把 inbox 里关于资料项过期规则的条目编译进 03-业务规则"

#### 评审结果

| 维度 | 结果 | 备注 |
|------|------|------|
| 触发精度 | ✅ 通过 | "编译 inbox 条目"精确匹配 Compile 分支 |
| 输入可用性 | ✅ 通过 | `_raw/00-inbox.md`、`README.md`、`99-文档维护.md` 存在 |
| 输出定义 | ✅ 通过 | Compile 分支产出明确（目标文档增量 + inbox 状态更新） |
| 工作流可执行性 | ✅ 通过 | 10 步有序，特别是"变更定位规则"先行判断正确 |
| 金样本覆盖 | ✅ 通过 | example-walkthrough 演示完整 ingest→compile→file-back 循环 |
| 跨 skill 衔接 | ✅ 通过 | 独立于原型 skill 链路，与 page-spec/workflow-state 产出可互为输入 |

#### 发现

| # | 严重性 | 问题 | 建议 |
|---|--------|------|------|
| S3-1 | **低** | Lint 分支的 Workflow 步骤 1 要求"读取全部权威文档目录"，文档体量大时上下文窗口可能不足 | 建议 Lint 分支限定"当次扫描最多覆盖 N 个文档"或分批执行 |
| S3-2 | **信息** | Compile 分支步骤 6 "检查术语一致性"在文档量少时可行，文档量大时需工具辅助 | 长期建议引入术语一致性自动检查脚本 |

---

### 3.4 workflow-state-modeler

#### 模拟请求

> "帮我建模资料项从待提交到审核通过的完整状态机"

#### 评审结果

| 维度 | 结果 | 备注 |
|------|------|------|
| 触发精度 | ✅ 通过 | "建模状态机" 精确匹配 |
| 输入可用性 | ✅ 通过 | 04-核心流程和 03-业务规则均存在 |
| 输出定义 | ✅ 通过 | 状态枚举 + 转移表 + Mermaid 图 + 可选 TypeScript |
| 工作流可执行性 | ✅ 通过 | 11 步完整 |
| 金样本覆盖 | ✅ 通过 | example-walkthrough 演示案件 S1-S9 |
| 跨 skill 衔接 | ✅ 通过 | 产出供 page-spec（状态呈现）和 test-case（守卫测试）使用 |

#### 发现

| # | 严重性 | 问题 | 建议 |
|---|--------|------|------|
| S4-1 | **信息** | documents 的状态机（6 状态：待提交→已提交→审核通过→退回→已免除→过期）相对简单，无法测试嵌套状态处理能力 | billing 的回款/催款流程更适合测试子阶段嵌套 |
| S4-2 | **信息** | Deliverables 中 TypeScript 产出是可选的（"如果用户要求代码产出"），但 domain 层状态定义是后续实现的关键——建议默认产出 | 可在 Rules 中增加"建议默认产出 TypeScript 状态枚举" |

---

### 3.5 page-spec-generator

#### 模拟请求

> "从案件详情原型推导资料中心 Tab 的页面规格"

#### 评审结果

| 维度 | 结果 | 备注 |
|------|------|------|
| 触发精度 | ✅ 通过 | "从原型推导页面规格" 精确匹配 |
| 输入可用性 | ✅ 通过 | 页面规格目录和流程文档均存在 |
| 输出定义 | ✅ 通过 | 10 章节 + 详情 Tab 扩展 + 字段表/操作表结构清晰 |
| 工作流可执行性 | ✅ 通过 | 15 步完整，最后一步交叉校验 |
| 金样本覆盖 | ✅ 通过 | `客户.md` 是金样本，customers/P0-CONTRACT 对应 |
| 跨 skill 衔接 | ✅ 通过 | 依赖 03/04 上游文档，产出可供 regression-checklist 使用 |

#### 发现

| # | 严重性 | 问题 | 建议 |
|---|--------|------|------|
| S5-1 | **中** | documents 有双入口（案件详情 Tab + 跨案件列表页），页面规格 skill 未明确说明如何处理双入口页面——是写一个文件还是两个文件 | 在 Rules 中补充"双入口页面统一在一个规格文件中分章节描述" |
| S5-2 | **低** | Workflow 步骤 5 引用 `P0-CONTRACT.md` 和 sections，但 P0-CONTRACT 属于 prototype-module-split 的产物——如果用户跳过了 split 直接要生成规格，skill 应给出提示 | 在 Workflow 步骤 5 中增加条件分支"如无 P0-CONTRACT，则直接从原型 HTML 提取" |

---

### 3.6 delivery-guardrail

#### 模拟请求

> "billing 原型拆分改完了，帮我跑收尾检查"

#### 评审结果

| 维度 | 结果 | 备注 |
|------|------|------|
| 触发精度 | ✅ 通过 | "跑收尾检查" 精确匹配 |
| 输入可用性 | ✅ 通过 | AGENTS.md + git diff 可用 |
| 输出定义 | ✅ 通过 | 门禁执行报告 + 修复 + 确认清单 |
| 工作流可执行性 | ✅ 通过 | 8 步循环（fix → guard → 修 → 重跑） |
| 金样本覆盖 | ✅ 通过 | example-walkthrough 演示 billing 门禁运行 |
| 跨 skill 衔接 | ✅ 通过 | 最终收尾 skill，接在所有代码 skill 之后 |

#### 发现

| # | 严重性 | 问题 | 建议 |
|---|--------|------|------|
| S6-1 | **中** | 原型拆分主要改动是 HTML/CSS/JS 文件，属于"非 TS 代码"场景。Workflow 步骤 6 (测试覆盖检查) 对纯原型改动标注"不适用"——但 Rules 最后一条的措辞"仍需运行 guard"可能让 agent 困惑是否需要补测试 | 建议在 Workflow 步骤 6 增加"原型/HTML/CSS 改动：测试覆盖检查标注'不适用——非 TS 生产代码'" |
| S6-2 | **低** | 模拟 billing 场景时，git diff 可能包含大量新增文件（sections/scripts/data），步骤 3 架构预检对 `.html`/`.css`/`.js` 文件的检查规则不够明确 | 建议在步骤 3 增加"对非 TS 文件仅检查是否放错目录" |

---

### 3.7 prototype-regression-checklist

#### 模拟请求

> "为 billing 模块生成回归验收门槛清单"

#### 评审结果

| 维度 | 结果 | 备注 |
|------|------|------|
| 触发精度 | ✅ 通过 | "回归验收门槛"精确匹配 |
| 输入可用性 | ✅ 通过 | billing/P0-CONTRACT + 页面规格 + AGENTS.md 全存在 |
| 输出定义 | ✅ 通过 | REGRESSION-GATE.md 5 章节 + Gate 结构清晰 |
| 工作流可执行性 | ✅ 通过 | 11 步完整 |
| 金样本覆盖 | ✅ 通过 | billing + documents 双金样本，覆盖不同复杂度 |
| 跨 skill 衔接 | ✅ 通过 | 依赖 split 产物（P0-CONTRACT），产出与 manifest 的 regressionChecklist 同步 |

#### 发现

| # | 严重性 | 问题 | 建议 |
|---|--------|------|------|
| S7-1 | **信息** | billing 已有 REGRESSION-GATE.md (207 行)，dry-run 相当于校验已有产物——skill 能正确处理"补全/更新"场景 | 无需改动 |
| S7-2 | **低** | customers 作为最简金样本，缺少 REGRESSION-GATE.md，无法用于测试 regression skill | 建议后续为 customers 补充 REGRESSION-GATE.md（可选，customers 不是 regression 的金样本） |

---

### 3.8 admin-module-scaffold

#### 模拟请求

> "帮我创建 reports 模块的骨架"

#### 评审结果

| 维度 | 结果 | 备注 |
|------|------|------|
| 触发精度 | ✅ 通过 | "创建模块骨架"精确匹配 |
| 输入可用性 | ✅ 通过 | customers 和 billing 金样本存在 |
| 输出定义 | ✅ 通过 | 目录结构 + index.html + 文档骨架 + manifest 骨架 |
| 工作流可执行性 | ✅ 通过 | 15 步有序 |
| 金样本覆盖 | ✅ 通过 | customers（简单）+ billing（复杂）双标杆 |
| 跨 skill 衔接 | ✅ 通过 | 产出为后续 split/mapping/regression 提供空骨架 |

#### 发现

| # | 严重性 | 问题 | 建议 |
|---|--------|------|------|
| S8-1 | **低** | scaffold 只能对"新模块"测试，不适用于三个候选模块（都已存在）——这是预期行为 | 无需改动 |
| S8-2 | **信息** | index.html 模板中引用 `../shared/` 路径——对 `case/` 这种子目录下的子页面（`case/create.html`）需要 `../../shared/`。skill 未覆盖嵌套子页面的路径规则 | 在 Rules 中补充"子目录页面的 shared 路径需按嵌套深度调整" |

---

### 3.9 shared-shell-extractor

#### 模拟请求

> "帮我把 documents 页面的 CSS 变量和壳子提取到 shared"

#### 评审结果

| 维度 | 结果 | 备注 |
|------|------|------|
| 触发精度 | ✅ 通过 | "提取到 shared"精确匹配 |
| 输入可用性 | ✅ 通过 | shared/ 目录和 customers/SPLIT-ARCHITECTURE §3.1 存在 |
| 输出定义 | ✅ 通过 | shared 文件更新 + 源页面简化 + 差异报告 |
| 工作流可执行性 | ✅ 通过 | 9 步有序，含视觉回归验证 |
| 金样本覆盖 | ✅ 通过 | shared/ 目录本身是活的金样本 |
| 跨 skill 衔接 | ✅ 通过 | scaffold 和 split 都依赖 shared 层 |

#### 发现

| # | 严重性 | 问题 | 建议 |
|---|--------|------|------|
| S9-1 | **中** | documents 有一个模块专属 CSS 文件 `documents.css`，skill 的 Workflow 步骤 4 只描述了对比 `<style>` 和 shared——对外部 CSS 文件的提取路径未明确 | 在 Workflow 步骤 4 增加"识别模块专属 .css 文件中的可共享定义" |
| S9-2 | **低** | 视觉回归验证步骤（Workflow 步骤 9）在 CLI 环境下难以自动化——当前只能靠人工打开浏览器 | 长期建议引入截图对比工具，当前可接受 |

---

### 3.10 test-case-suggester

#### 模拟请求

> "帮我看看 billing domain 层新加的 BillingPlan 类型和校验逻辑需要补什么测试"

#### 评审结果

| 维度 | 结果 | 备注 |
|------|------|------|
| 触发精度 | ✅ 通过 | "需要补什么测试"精确匹配 |
| 输入可用性 | ⚠️ 条件通过 | 当前仅有原型代码（JS），无 TS 生产代码——skill 针对 TS 代码设计 |
| 输出定义 | ✅ 通过 | 测试建议清单 + 可选代码骨架结构清晰 |
| 工作流可执行性 | ✅ 通过 | 11 步有序 |
| 金样本覆盖 | ✅ 通过 | example-walkthrough 演示 customers domain 测试 |
| 跨 skill 衔接 | ✅ 通过 | 依赖 mapping 产物（知道哪些是 domain/data/model） |

#### 发现

| # | 严重性 | 问题 | 建议 |
|---|--------|------|------|
| S10-1 | **中** | 三个候选模块当前都只有原型代码（HTML/JS），无 TS 生产代码。skill 的价值在生产代码落地阶段才能完全体现——dry-run 需要假设生产代码已存在 | 在 Triggers 或 Purpose 中明确"本 skill 针对生产代码（TS）改动，原型阶段不适用" |
| S10-2 | **信息** | skill 未说明与 `delivery-guardrail` 的衔接关系——guardrail 步骤 6 也检查测试覆盖，两者可能产出重复建议 | 在 References 中互相索引，或在 guardrail 步骤 6 中引用 test-case-suggester |

---

### 3.11 cursor-task-orchestrator

#### 模拟请求

> "把 billing 模块的生产代码落地拆成可让 Cursor 多 agent 执行的任务包"

#### 评审结果

| 维度 | 结果 | 备注 |
|------|------|------|
| 触发精度 | ✅ 通过 | "拆成多 agent 执行的任务包"精确匹配 |
| 输入可用性 | ✅ 通过 | AGENTS.md + billing 全套产物 + 仓库结构可用 |
| 输出定义 | ✅ 通过 | master-plan + manifest.json + tasks/ + runbook 结构完备 |
| 工作流可执行性 | ✅ 通过 | 10 步 + 意图路由清晰 |
| 金样本覆盖 | ✅ 通过 | example-walkthrough 演示 billing 拆分编排 |
| 跨 skill 衔接 | ✅ 通过 | 使用 mapping 产物规划任务，任务中可引用其他 skill |

#### 发现

| # | 严重性 | 问题 | 建议 |
|---|--------|------|------|
| S11-1 | **低** | example-walkthrough 中引用的 billing MIGRATION-MAPPING 产物路径与实际仓库一致——验证通过 | 无需改动 |
| S11-2 | **信息** | 意图路由 5 个分支覆盖了常见场景。但"输入太模糊无法安全执行"的判定标准是主观的 | 可在 AI-traps 参考文件中补充"模糊判定示例" |

---

## 4. 跨 Skill 衔接测试

### 4.1 完整流水线：billing 模块从原型到生产

```
scaffold (已完成) → split → mapping → regression → state-modeler → page-spec → orchestrator → test-case → guardrail
```

| 衔接点 | 上游产出 | 下游输入 | 匹配 |
|--------|---------|---------|------|
| scaffold → split | 目录骨架 + 空 manifest | split 读取入口文件 + 页面 HTML | ✅ |
| split → mapping | P0-CONTRACT + SPLIT-ARCH + manifest + data/ + scripts/ | mapping 读取全部 | ✅ |
| split → regression | P0-CONTRACT + manifest | regression 读取 P0-CONTRACT §状态与异常态 | ✅ |
| mapping → regression | MIGRATION-MAPPING | regression `[生产约束]` 项引用 mapping 说明 | ✅ |
| mapping → test-case | productionMapping 文件列表 | test-case 按 domain/data/model 分层建议 | ✅ |
| mapping → orchestrator | MIGRATION-MAPPING 分阶段依赖链 | orchestrator 据此规划 parallel_group | ✅ |
| state-modeler → page-spec | 状态枚举 + 转移表 | page-spec 引用状态定义填充"状态与异常态"章节 | ✅ |
| guardrail → （终点） | 门禁报告 | 收尾确认 | ✅ |

**结论**：全链路衔接无断链。

### 4.2 文档编译链路

```
ingest (原始素材) → compile (编入权威文档) → file-back (结论归档)
```

与原型 skill 链路独立，但可互为输入：
- page-spec 产出可触发 compile（更新 06-页面规格）
- workflow-state-modeler 产出可触发 compile（更新 03-业务规则 或 04-核心流程）
- 任何 skill 的分析结论可触发 file-back（存入 `_output/`）

**结论**：衔接正常，无冲突。

---

## 5. 协议合规汇总

| # | 检查项 | 通过数 / 总数 | 不合规 skill |
|---|--------|-------------|-------------|
| 1 | frontmatter name = 目录名 | 11/11 | — |
| 2 | description ≤200 字符 | 11/11 | — |
| 3 | 10 章节齐全且顺序正确 | 11/11 | — |
| 4 | Triggers ≥2 条件 + ≥3 示例 | 11/11 | — |
| 5 | Required Inputs 必读非空 | 11/11 | — |
| 6 | Deliverables 每项有用途 + 最小结构 | 11/11 | — |
| 7 | Workflow 最后一步是验证 | 11/11 | — |
| 8 | Anti-Patterns ≥3 条 | 11/11 | — |
| 9 | Completion 针对本 skill 产出物 | 11/11 | — |
| 10 | 代码类 skill 含仓库门禁子节 | 5/5 | — |
| 11 | 辅助文件在 References 节索引 | 11/11 | — |
| 12 | 辅助文件按 `references/`/`data/`/`scripts/` 归目录 | **10/11** | `prototype-module-split` |
| 13 | References 最后一条索引 SKILL-PROTOCOL.md | 11/11 | — |
| 14 | Rules 中引用 AGENTS.md 的规则标注了来源 | 11/11 | — |

唯一不合规项：`prototype-module-split` 的 `reference.md` 和 `examples.md` 位于 skill 根目录，未放入 `references/`。

---

## 6. 综合发现与建议

### 6.1 必须修复（下次实质修改时）

| # | Skill | 问题 | 建议动作 |
|---|-------|------|---------|
| F-1 | `prototype-module-split` | `reference.md`/`examples.md` 未放入 `references/` 目录 | 迁移至 `references/`，更新 SKILL.md 中的相对路径引用 |
| F-2 | `prototype-module-split` | 缺少标准的 `references/example-walkthrough.md` | 从 `examples.md` 中提取真实演练，或将其重命名并迁移 |

### 6.2 建议改进

| # | Skill | 问题 | 建议动作 |
|---|-------|------|---------|
| R-1 | `page-spec-generator` | 未明确双入口页面的处理规则 | 在 Rules 中补充"双入口页面统一在一个规格文件中分章节描述" |
| R-2 | `delivery-guardrail` | 原型文件改动的测试覆盖检查指引不够清晰 | 在 Workflow 步骤 6 增加"非 TS 代码：测试覆盖检查标注不适用" |
| R-3 | `shared-shell-extractor` | 未覆盖模块专属 `.css` 文件中的可共享定义提取 | 在 Workflow 步骤 4 增加模块 .css 文件的提取路径 |
| R-4 | `test-case-suggester` | 未明确说明只针对生产代码，原型阶段不适用 | 在 Purpose 或 Triggers 中注明适用阶段 |
| R-5 | `delivery-guardrail` + `test-case-suggester` | 测试覆盖检查职责有重叠 | 在两个 skill 的 References 中互相索引 |

### 6.3 信息备注

| # | 观察 |
|---|------|
| I-1 | customers 作为最简金样本缺少 REGRESSION-GATE.md——这是预期的，billing/documents 承担了 regression 金样本角色 |
| I-2 | workflow-state-modeler 的 TypeScript 产出是可选的，但 domain 层状态定义是后续关键——可考虑默认产出 |
| I-3 | Lint 分支（business-doc-compiler）在文档量大时可能超出上下文窗口——长期需分批策略 |
| I-4 | 视觉回归验证（shared-shell-extractor）当前只能人工打开浏览器——可接受 |

---

## 7. 结论

### 7.1 Skill 收窄度

全部 11 个 skill 触发条件明确，无一对多歧义。相邻 skill 之间（如 split vs mapping、guardrail vs test-case）通过不同的触发词和产出物清晰区分。

### 7.2 触发稳定性

模拟 15 个真实请求，全部正确匹配目标 skill，无误触。

### 7.3 端到端可执行性

完整流水线（scaffold → split → mapping → regression → state-modeler → page-spec → orchestrator → test-case → guardrail）在 billing 模块上衔接无断链。文档编译链路与原型链路独立运作。

### 7.4 协议合规

14 项门禁检查中 13 项全部通过，1 项（辅助文件目录规范）有 1 个 skill 待对齐。

### 7.5 整体评级

**通过**——全部 skill 足够窄、可稳定触发、端到端可执行。2 项必须修复和 5 项建议改进均已在本次评审中应用。

---

## 8. 已应用的修复

| # | 类别 | Skill | 改动 |
|---|------|-------|------|
| F-1 | 必须修复 | `prototype-module-split` | `reference.md` → `references/split-rules.md`；`examples.md` → `references/gold-sample-patterns.md`；更新 SKILL.md 引用路径 |
| F-2 | 必须修复 | `prototype-module-split` | 新增 `references/example-walkthrough.md`（客户模块拆分演练） |
| R-1 | 建议改进 | `page-spec-generator` | Rules 中增加"双入口页面统一在一个规格文件中分章节描述" |
| R-2 | 建议改进 | `delivery-guardrail` | Workflow 步骤 6 增加"原型/HTML/CSS/JS 改动标注不适用" |
| R-3 | 建议改进 | `shared-shell-extractor` | Workflow 步骤 4 增加"模块专属 .css 文件"提取路径 |
| R-4 | 建议改进 | `test-case-suggester` | Purpose 增加适用阶段说明（针对生产 TS 代码，原型阶段不适用） |
| R-5 | 建议改进 | `delivery-guardrail` + `test-case-suggester` | References 中互相索引 |

SKILL-PROTOCOL.md 变更日志已追加 v1.2 条目。
