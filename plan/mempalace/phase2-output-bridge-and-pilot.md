# MemPalace 第二阶段计划：_output 桥接层与脱敏样本试点

## 1. 目标

在 `Conditional Go` 的前提下，定义从"L1-only 首轮试跑"推进到"L2 桥接层启用 + C3 脱敏样本小批量试点"的分阶段实施计划。

本阶段不做：

- 不接入真实客户数据或正式业务数据
- 不启用 `_raw`（L3）索引
- 不扩展 MCP 工具面（仍保持 4 个只读工具）
- 不改写 Phase 1 已冻结的治理文档

## 2. 前置条件

本计划仅在以下条件全部满足后方可启动：

| # | 前置条件 | 验证方式 | 当前状态 |
|---|---------|---------|---------|
| P1 | Go/No-Go 复判结论为 `Conditional Go` 或更高 | `go-no-go-review.md` §2.1 | 已满足 |
| P2 | 首轮稳定观察期（≥1 周）已完成，无 R1–R3 级故障 | 观察期日志 | 待开始 |
| P3 | 元治理文档索引方案已评估 | 评估记录 | 待评估 |
| P4 | 必过题 Conditional 项有明确改进计划 | 评估报告 `eval-report.md` §11 | 已有改进路线 |
| P5 | B1–B5 批次基线保持 passed | `l1-index-run` 基线记录 | 已满足 |

## 3. 总体分轨

本阶段包含两条平行轨道和一个汇合点：

```text
Track A: _output 桥接层启用
Track B: C3 脱敏样本小批量试点
                ↓
        汇合点: Phase 2 Go/No-Go 复判
```

两轨可并行推进，但 Track B 的"试索引"步骤必须等 Track A 的 B6 批次通过后再执行，因为需要先验证 L2 桥接层的排序和回链机制是否正常。

## 4. Track A：_output 桥接层启用

### 4.1 目标

将 `docs/gyoseishoshi_saas_md/_output/` 从 `disabled_reserved` 推进到 `enabled`，作为 L2 编译结论层接入索引，解决 Phase 1 中 AQ-H01、AQ-H02 等历史追溯类问题的结构性缺口。

### 4.2 前置闸门（B6 放行条件）

依据 `index-baseline-plan.md` §7.1，B6 启用必须满足：

1. B1–B5 全部成功，且无待处理失败
2. 至少四个核心 room 已有来自 L1 的稳定命中：`state-machine`、`field-ownership`、`workflow-gates`、`biz-mgmt`
3. 本次基线记录已证明 P0/P1/事务所流程 的排序符合来源优先级

当前状态：B1–B5 全部 passed（57 文件 / 716 chunks），6 大核心 room 全覆盖。闸门条件已满足。

### 4.3 实施步骤

| 步骤 | 内容 | 产出 | 依赖 |
|------|------|------|------|
| A1 | 审查 `_output/` 现有 5 个文件内容，确认均不含 C4 红线内容 | 内容审查记录 | — |
| A2 | 在 manifest 中将 `compiled-output-buffer` 从 `disabled_reserved` 切换为 `enabled` | manifest 更新 | A1 |
| A3 | 在 taxonomy 中确认 `_output` 的 wing 归属（建议新增 `compiled-output` wing 或归入现有 wing） | taxonomy 更新 | A2 |
| A4 | 执行 B6-output-bridge 批次索引 | B6 批次基线记录 | A3 |
| A5 | 验证 B6 成功条件：`_output` 命中必须能回链到至少一个 L1 文档 | B6 质量门报告 | A4 |
| A6 | 针对 AQ-H01、AQ-H02、AQ-H06 重新试跑，验证历史追溯能力改善 | 补充验收记录 | A5 |
| A7 | 更新 eval-report.md 对应章节 | 评估报告更新 | A6 |

### 4.4 `_output` 索引约束

| 约束 | 说明 |
|------|------|
| `authority_layer` | `L2` |
| `retrieval_weight` | `0.60`（低于所有 L1 条目） |
| 排序不变量 | L1 命中始终排在 L2 之前；L2 不得覆盖 L1 |
| 回链要求 | 每个 `_output` 检索结果必须在 response 中标注对应的 L1 回链路径 |
| 来源标记 | 检索结果中 `source_layer` 标记为 `L2`，客户端必须可见 |

### 4.5 `_output` 现有文件清单与预评估

| 文件 | 主题 | 预期 wing/room | C4 风险 | 预期价值 |
|------|------|---------------|---------|---------|
| `00-outputs.md` | 已编译结论索引（含回灌记录） | compiled-output / state-machine, field-ownership | 无 | 高：提供结论编译链和回灌追踪 |
| `01-经管签流程拆解与可测节点映射.md` | 经管签流程拆解 | compiled-output / biz-mgmt | 无 | 中：补充经管签流程的结构化拆解 |
| `02-原型页面可点击动作映射.md` | 原型页面动作映射 | compiled-output / workflow-gates | 无 | 中：补充原型交互与业务流程的映射 |
| `03-原型可走版逐步测试脚本.md` | 原型走查测试脚本 | compiled-output / workflow-gates | 无 | 中：补充测试场景的检索维度 |
| `04-试点页面迁移顺序建议.md` | 页面迁移顺序建议 | compiled-output / biz-mgmt | 无 | 低：偏工程决策，检索价值有限 |

### 4.6 Track A 成功标准

| 指标 | 门槛 |
|------|------|
| B6 批次 quality_gate | passed |
| `_output` 命中均可回链 L1 | 100% |
| AQ-H01 历史追溯改善 | 从 △ 提升到 ✓ |
| AQ-H02 纠偏时间线改善 | 从 △ 提升到 ✓ |
| 无 L2 覆盖 L1 红线违规 | 0 |

## 5. Track B：C3 脱敏样本小批量试点

### 5.1 目标

制作首批 3 条 C3 脱敏样本，完成人工复核，试索引后评估对检索增强效果的实际贡献。

### 5.2 首批候选

依据 `artifacts/mempalace/c3-desensitized-pilot-pack.md` §4：

| 候选 ID | 类型 | 主题 | 优先级 |
|---------|------|------|--------|
| `C3-PILOT-001` | 教学案例 | 经营管理签新规申请全流程教学案例 | P0 |
| `C3-PILOT-002` | 教学案例 | 经营管理签续签教学案例 | P0 |
| `C3-PILOT-003` | 规则摘要 | 事业计划书常见拒否理由与应对要点 | P0 |

### 5.3 实施步骤

| 步骤 | 内容 | 产出 | 依赖 |
|------|------|------|------|
| B1 | 从已结案经验中提炼 3 条候选样本初稿 | 3 份 Markdown 初稿 | — |
| B2 | 按 `data_classification.md` §4 五项条件逐条脱敏 | 脱敏后样本 | B1 |
| B3 | 按 `c3-desensitized-pilot-pack.md` §5 脱敏检查清单逐项检查 | D1–D7 检查记录 | B2 |
| B4 | 人工复核并填写复核记录表 | 3 份复核记录 | B3 |
| B5 | 在 manifest 中新增 `c3-pilot-samples` source_entry | manifest 更新 | B4 |
| B6 | 在 taxonomy 中新增 `c3-pilot` wing | taxonomy 更新 | B5 |
| B7 | 执行 C3 试索引批次 | 试索引基线记录 | B6 + Track A 的 A5 通过 |
| B8 | 针对场景资料类和规则解释类问题试跑 | 补充验收记录 | B7 |
| B9 | 评估 C3 样本对检索增强的实际贡献 | C3 试点评估报告 | B8 |

### 5.4 C3 索引约束

| 约束 | 说明 |
|------|------|
| `authority_layer` | `L1-pilot`（独立标记，不混入正式 L1） |
| `classification` | `C3-Desensitize-Candidate` |
| `retrieval_weight` | `0.65`（高于 `_output` 的 `0.60`，低于正式 L1） |
| 独立 wing | `c3-pilot` |
| 来源标记 | 检索结果中 `source_layer` 标记为 `L1-pilot` |
| 可撤回 | 任何 C3 样本可随时从索引撤回 |
| 最大数量 | 首批 ≤5 条 |

### 5.5 Track B 成功标准

| 指标 | 门槛 |
|------|------|
| 3 条样本全部通过人工复核 | 3/3 |
| C3 试索引批次 quality_gate | passed |
| C3 命中不覆盖 L1 结论 | 0 违规 |
| 至少 1 条 C3 样本在场景类问题中提供有效补充 | ≥1 |
| 试索引观察期（1 周）无红线违规 | 0 |

## 6. 元治理文档索引（Track A 前置增强）

在启动 Track A 之前，建议先执行元治理文档索引评估，以解决 Phase 1 中 4 题元治理类结构性缺口。

### 6.1 候选元治理文档

| 文档 | 当前状态 | 建议 |
|------|---------|------|
| `plan/mempalace/source-priority.md` | 不在索引 | 纳入索引，解决 AQ-S08 |
| `plan/mempalace/answer-protocol.md` | 不在索引 | 纳入索引，解决 AQ-S04, AQ-H04 |
| `plan/mempalace/index-baseline-plan.md` | 不在索引 | 纳入索引，解决 AQ-H08 |

### 6.2 索引方案

| 字段 | 值 |
|------|------|
| `source_id` | `meta-governance` |
| `phase1_mode` | `enabled` |
| `authority_layer` | `L1-meta` |
| `classification` | `C1-Direct-Allow` |
| `retrieval_weight` | `0.85` |
| `wing` | `meta-governance`（新增） |
| `usage_rule` | 仅回答元治理问题（来源优先级、索引策略、协议规则）；不用于业务规则检索 |

### 6.3 预期效果

| 当前缺口 | 预期改善 |
|---------|---------|
| AQ-S08：`_raw` 只能作为线索 | 从 miss → hit（source-priority.md 精确命中） |
| AQ-S04：`_output` 降级规则 | 从 △ → ✓（answer-protocol.md 精确命中） |
| AQ-H04：`_output` 不能长期充当权威 | 从 miss → hit（source-priority.md §3.2 精确命中） |
| AQ-H08：首轮索引为什么先跑 L1 | 从 miss → hit（index-baseline-plan.md §3 精确命中） |

## 7. 嵌入质量优化（与 Track A/B 并行）

### 7.1 目标

解决 Phase 1 中 AQ-R12（score=0.076）等低相关度长尾问题。

### 7.2 实施步骤

| 步骤 | 内容 | 预期解决 |
|------|------|---------|
| E1 | 为 `P1/02-经营管理签技术落地清单.md` 补充 section heading | AQ-R12：ResidencePeriod + reminder_schedule_blueprint |
| E2 | 确认 P0/07 Case.group 继承链描述是否足够显式 | AQ-R06：Case.group 快照语义 |
| E3 | 补强 P1/01 成功结案前置条件的 section heading | AQ-H07：经管签成功结案前置条件 |
| E4 | 以 E1–E3 涉及文件执行增量索引刷新 | 嵌入覆盖改善 |
| E5 | 重新试跑 AQ-R06, AQ-R12, AQ-H07 | 验证改善效果 |

## 8. 整体里程碑

| 阶段 | 内容 | 预计时间 | 前置 |
|------|------|---------|------|
| M0 | 首轮稳定观察期完成 | 启动后 1 周 | Conditional Go 生效 |
| M1 | 元治理文档索引完成 + AQ-S08/H04/H08 重新验证 | M0 + 2 天 | M0 |
| M2 | 嵌入质量优化完成 + AQ-R12/H07 重新验证 | M0 + 3 天 | M0 |
| M3 | Track A: B6 批次索引完成 + 质量门通过 | M1 + 2 天 | M1 |
| M4 | Track A: 历史追溯验收补充完成 | M3 + 1 天 | M3 |
| M5 | Track B: 3 条 C3 样本脱敏 + 人工复核完成 | M0 + 5 天 | M0 |
| M6 | Track B: C3 试索引 + 1 周观察 | M5 + M3 | M3, M5 |
| M7 | Phase 2 综合评估报告 | M4 + M6 | M4, M6 |
| M8 | Phase 2 Go/No-Go 复判 | M7 + 1 天 | M7 |

关键路径：`M0 → M1 → M3 → M4 → M7 → M8`（Track A 主线）

## 9. Phase 2 Go/No-Go 复判标准

### 9.1 升级到正式 Go 的条件

Phase 2 完成后，若以下条件全部满足，可从 `Conditional Go` 升级为正式 `Go`：

1. 首轮稳定观察期完成，无 R1–R3 级故障
2. 元治理文档已纳入索引，AQ-S08/S04/H04/H08 全部从 miss/△ 提升到 ✓
3. `_output` 桥接层索引成功，AQ-H01/H02 历史追溯能力改善
4. 低相关度长尾问题有改善（AQ-R12 score 提升到 ≥0.2）
5. C3 脱敏样本试索引无红线违规
6. 评估报告总命中率 ≥90%（目前 82.1%）
7. 必过题 Conditional 项全部转为 PASS

### 9.2 维持 Conditional Go 的条件

若部分条件未满足但以下底线保持：

1. 无红线违规
2. 命中率未下降（≥82.1%）
3. Track A 或 Track B 至少一条轨道成功
4. 有明确的改进路线

### 9.3 回退到 No-Go 的触发条件

沿用 `go-no-go-review.md` §9，加上：

1. `_output` 索引后出现 L2 覆盖 L1 的红线违规
2. C3 样本索引后发现脱敏不彻底
3. 新增索引内容导致原有 L1 命中退化

## 10. 风险控制

| 风险 | 概率 | 应对 |
|------|------|------|
| `_output` 桥接层导致排序异常 | 中 | B6 质量门严格检查 L1>L2 排序；异常时立即回退 B6 |
| C3 脱敏不彻底 | 低 | D1–D7 检查 + 人工复核双重把关；任何存疑项退回 |
| 元治理文档索引导致非预期命中 | 低 | 独立 wing + 受限 usage_rule；非元治理问题不触发 |
| 嵌入质量优化导致已有命中退化 | 低 | 增量刷新后重跑全量 28 题验收，对比退化项 |
| 观察期内发现 Phase 1 问题 | 中 | 优先修复 Phase 1 问题，Phase 2 暂缓 |

## 11. 不做清单

- 不启用 `_raw`（L3）索引（留待 Phase 3 评估）
- 不扩展 MCP 工具面（仍保持 4 个只读工具）
- 不接入真实客户数据
- 不改写 Phase 1 已冻结的治理文档
- 不在 Phase 2 完成前扩大 C3 样本超过 5 条
- 不引入 re-ranking / cross-encoder（留待 Phase 3 评估）
- 不把 sidecar 接入 `npm` 主工作流

## 12. 交付物

| 产物 | 路径 | 轨道 |
|------|------|------|
| 元治理文档索引记录 | `$HOME/.mempalace/cms-client/data/baselines/` | 前置 |
| B6 批次基线记录 | `$HOME/.mempalace/cms-client/data/baselines/` | Track A |
| 历史追溯补充验收记录 | `artifacts/mempalace/` | Track A |
| 3 份 C3 脱敏样本 | `artifacts/mempalace/c3-samples/` | Track B |
| 3 份人工复核记录 | `artifacts/mempalace/c3-desensitized-pilot-pack.md` §7 | Track B |
| C3 试索引基线记录 | `$HOME/.mempalace/cms-client/data/baselines/` | Track B |
| Phase 2 综合评估报告 | `artifacts/mempalace/phase2-eval-report.md` | 汇合点 |
| Phase 2 Go/No-Go 复判结论 | `plan/mempalace/go-no-go-review.md`（更新） | 汇合点 |

## 13. 直接依据

- `plan/mempalace/go-no-go-review.md`（Phase 1 Conditional Go 结论与约束条件）
- `plan/mempalace/index-baseline-plan.md`（B6/B7 批次定义与放行闸门）
- `plan/mempalace/ingestion-manifest.md`（`compiled-output-buffer` 预留定义）
- `plan/mempalace/source-priority.md`（L1>L2>L3 优先级）
- `plan/mempalace/data_classification.md`（C3 最小放行条件）
- `plan/mempalace/blocked_sources.md`（脱敏候选类型与最小脱敏原则）
- `plan/mempalace/taxonomy-spec.md`（wing 与 room 定义）
- `plan/mempalace/mcp-readonly-scope.md`（MCP 工具面冻结）
- `artifacts/mempalace/eval-report.md`（Phase 1 评估结果与改进路线）
- `artifacts/mempalace/acceptance-run-report.md`（Phase 1 验收报告）
- `artifacts/mempalace/c3-desensitized-pilot-pack.md`（C3 脱敏样本试点准备包）
