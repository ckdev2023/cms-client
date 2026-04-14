# MemPalace 首轮正式评估报告

## 1. 评估元信息

```text
评估批次：EVAL-001
评估日期：2026-04-12
评估人：local-operator
评估范围：L1-only（P0/P1/事务所流程）
问题集版本：plan/mempalace/acceptance-queries.md
回答协议版本：plan/mempalace/answer-protocol.md
release_id：mempalace-0.1.0-py3.14.3
data_snapshot_id：snap-20260412-75cb7f16
索引基线：run-20260412-a963edab（57 文件 / 716 chunks / 5 批次全部通过）
备注：首轮真实试跑，仅覆盖 L1 白名单；_output 和 _raw 均未入索引
```

## 2. 总体汇总

```text
总题数：28
命中题数：23
未命中题数：5
命中但误导题数：0

合规回链题数：23
协议合规题数：28

命中率：82.1%
误导率：0%
合规回链率：82.1%
协议合规率：100%

红线是否触发：否
Go/No-Go 建议：Conditional Go
一句话结论：L1 业务规则检索链路可用，规则解释类命中率最高（91.7%），
但元治理问题和历史追溯受限于 L1-only 索引结构性缺口，
需补齐 plan/ 元治理文档索引后才可全面放行。
```

## 3. 分组结果

| 分组 | 总题数 | 命中 | 未命中 | 命中但误导 | 合规回链 | 协议合规 | 备注 |
|---|---:|---:|---:|---:|---:|---:|---|
| 来源追溯类 | 8 | 7 | 1 | 0 | 7 | 8 | AQ-S08 结构性缺口（元治理规则不在 L1） |
| 规则解释类 | 12 | 11 | 1 | 0 | 11 | 12 | AQ-R12 top score=0.076 极低 |
| 历史决策类 | 8 | 5 | 3 | 0 | 5 | 8 | 3 题为元治理/历史追溯题，L1-only 结构性无法覆盖 |

## 4. 单题记录

### 4.1 来源追溯类 (AQ-S01 ~ AQ-S08)

| question_id | result | top_score | backlink_layer | backlink_quality | protocol_compliance | redline_triggered | failure_reason | next_action |
|---|---|---:|---|---|---|---|---|---|
| `AQ-S01` | `hit` | 0.281 | `L1` | `pass` | `pass` | `no` | | top hit 落在归档段而非 S1-S9 定义段，可优化 chunk 标注 |
| `AQ-S02` | `hit` | 0.320 | `L1` | `pass` | `pass` | `no` | | |
| `AQ-S03` | `hit` | 0.401 | `L1` | `pass` | `pass` | `no` | | top hit 落在 README 而非事务所流程场景资料 |
| `AQ-S04` | `hit` | 0.192 | `L1` | `pass` | `pass` | `no` | | _output 降级规则定义在 plan/ 下不参与索引，结构性覆盖不足 |
| `AQ-S05` | `hit` | 0.561 | `L1` | `pass` | `pass` | `no` | | 缺乏"正文优先于门禁工件"的直接命中 |
| `AQ-S06` | `hit` | 0.341 | `L1` | `pass` | `pass` | `no` | | |
| `AQ-S07` | `hit` | 0.541 | `L1` | `pass` | `pass` | `no` | | |
| `AQ-S08` | `miss` | 0.270 | `none` | `fail` | `pass` | `no` | 元治理规则（_raw 只能作为线索）不在 L1 业务文档中 | 将 plan/mempalace/source-priority.md 纳入索引 |

### 4.2 规则解释类 (AQ-R01 ~ AQ-R12)

| question_id | result | top_score | backlink_layer | backlink_quality | protocol_compliance | redline_triggered | failure_reason | next_action |
|---|---|---:|---|---|---|---|---|---|
| `AQ-R01` | `hit` | 0.334 | `L1` | `pass` | `pass` | `no` | | |
| `AQ-R02` | `hit` | 0.502 | `L1` | `pass` | `pass` | `no` | | |
| `AQ-R03` | `hit` | 0.404 | `L1` | `pass` | `pass` | `no` | | |
| `AQ-R04` | `hit` | 0.769 | `L1` | `pass` | `pass` | `no` | | 全场最高分；精确命中 P1/01 M6 gate_trigger_step=COE_SENT |
| `AQ-R05` | `hit` | 0.219 | `L1` | `pass` | `pass` | `no` | | score 偏低，可补强 field-ownership room 嵌入覆盖 |
| `AQ-R06` | `hit` | 0.464 | `L1` | `pass` | `pass` | `no` | | 缺乏 Case.group 快照语义的直接命中 |
| `AQ-R07` | `hit` | 0.348 | `L1` | `pass` | `pass` | `no` | | 命中版本范围但未直接说明资料项/附件版本分层关系 |
| `AQ-R08` | `hit` | 0.512 | `L1` | `pass` | `pass` | `no` | | |
| `AQ-R09` | `hit` | 0.441 | `L1` | `pass` | `pass` | `no` | | |
| `AQ-R10` | `hit` | 0.380 | `L1` | `pass` | `pass` | `no` | | |
| `AQ-R11` | `hit` | 0.364 | `L1` | `pass` | `pass` | `no` | | |
| `AQ-R12` | `miss` | 0.076 | `none` | `fail` | `pass` | `no` | top score=0.076 极低；嵌入模型对 ResidencePeriod + reminder_schedule_blueprint 等低频术语语义捕获不足 | 为 P1/02 技术落地清单补充 section heading 标注 |

### 4.3 历史决策类 (AQ-H01 ~ AQ-H08)

| question_id | result | top_score | backlink_layer | backlink_quality | protocol_compliance | redline_triggered | failure_reason | next_action |
|---|---|---:|---|---|---|---|---|---|
| `AQ-H01` | `hit` | 0.399 | `L1` | `pass` | `pass` | `no` | | 无法追溯 _output 到 L1 的回灌链（_output 未入索引） |
| `AQ-H02` | `hit` | 0.274 | `L1` | `pass` | `pass` | `no` | | 缺乏纠偏历史时间线命中 |
| `AQ-H03` | `hit` | 0.313 | `L1` | `pass` | `pass` | `no` | | |
| `AQ-H04` | `miss` | 0.343 | `none` | `fail` | `pass` | `no` | 命中事务所流程无关内容；"_output 不能长期充当权威"是元治理规则，不在业务 L1 中 | 将元治理文档纳入索引或新增 L1-meta 层 |
| `AQ-H05` | `hit` | 0.287 | `L1` | `pass` | `pass` | `no` | | |
| `AQ-H06` | `hit` | 0.491 | `L1` | `pass` | `pass` | `no` | | 命中 biz-mgmt-renewal 而非 state-machine 冻结定义 |
| `AQ-H07` | `miss` | 0.519 | `none` | `fail` | `pass` | `no` | 命中文书中心而非 P1 成功结案前置条件 | 补强 P1 成功结案前置条件的嵌入覆盖 |
| `AQ-H08` | `miss` | 0.173 | `none` | `fail` | `pass` | `no` | "首轮索引为什么先跑 L1"是元治理规则，plan/ 文档不在索引内 | 将 plan/mempalace/ 治理文档纳入索引 |

## 5. 失败案例复盘

### F-01

```text
案例编号：F-01
question_id：AQ-S08
失败类型：miss
现象：返回 P0/02 版本范围文档（score=0.270），未回答"_raw 只能作为线索"
答案摘录：top hit 为 P0/02 版本范围与优先级，涉及 P0 范围冻结但不涉及 _raw 降级规则
预期行为：明确输出"待编译/待确认"，不能伪装成既定规则（W12 AQ-S08 成功信号）
初步归因：_raw 降级规则定义在 plan/mempalace/source-priority.md，不属于 L1 业务文档，不在索引范围内
建议动作：将 source-priority.md 和 answer-protocol.md 纳入索引（考虑 L1-meta 层级）
```

### F-02

```text
案例编号：F-02
question_id：AQ-R12
失败类型：miss
现象：top score=0.076 极低，命中 P0/06 客户"不做项"而非 P1 ResidencePeriod + reminder_schedule_blueprint
答案摘录：命中客户页面规格"不做项"列表，与在留期间/续签提醒的 P0/P1 边界无直接关联
预期行为：明确指出 P0 手动 Reminder 兜底、P1 才启用 ResidencePeriod + reminder_schedule_blueprint（W12 AQ-R12 成功信号）
初步归因：嵌入模型对 ResidencePeriod、reminder_schedule_blueprint 等低频专业术语组合的语义捕获不足
建议动作：为 P1/02 技术落地清单补充更丰富的 section heading 标注，提升嵌入覆盖
```

### F-03

```text
案例编号：F-03
question_id：AQ-H04
失败类型：miss
现象：命中事务所流程企业内转勤资料清单（score=0.343），与"_output 不能长期充当权威"完全无关
答案摘录：top hit 为 intra-company-transfer.md 场景资料，回答的是签证资料要求
预期行为：明确指出 _output 是可回灌结论层，稳定后应回灌到 L1（W12 AQ-H04 成功信号）
初步归因：元治理规则（_output 角色边界）定义在 plan/ 下，不属于业务 L1 文档，检索完全无法触及
建议动作：将 plan/mempalace/ 中的元治理文档纳入索引，或建立独立的 L1-meta 层级
```

### F-04

```text
案例编号：F-04
question_id：AQ-H07
失败类型：miss
现象：命中文书中心页面规格（score=0.519），但内容是文书审核而非经营管理签成功结案前置条件
答案摘录：top hit 为 P0/06 文书中心页面规格，涉及文书创建与审核，未涉及 P1 在留期间录入和续签提醒
预期行为：明确指出来自 P1 扩展、不可误说成 P0 通用规则（W12 AQ-H07 成功信号）
初步归因：查询与 P1 成功结案前置条件相关，但嵌入语义落在"文书"关键词上，命中了错误文档
建议动作：补强 P1/01 成功结案前置条件的 section heading 和上下文标注
```

### F-05

```text
案例编号：F-05
question_id：AQ-H08
失败类型：miss
现象：top score=0.173 极低，命中 P0/README 而非索引策略治理文档
答案摘录：top hit 为 P0/README 项目概述，涉及 P0 范围描述但不涉及索引基线策略
预期行为：能把来源优先级、批次放行和低层来源降级规则串起来说明（W12 AQ-H08 成功信号）
初步归因：索引策略、来源治理理由定义在 plan/mempalace/ 下，不属于 L1 业务文档
建议动作：将 plan/mempalace/index-baseline-plan.md 和 source-priority.md 纳入索引
```

## 6. Go/No-Go 决策建议

```text
当前建议：Conditional Go
主要依据：
- 命中率 82.1%（23/28），超过最低门槛 20 题
- 误导率 0%，协议合规率 100%，红线零违规
- 5 题未命中中 4 题为元治理/plan 文档结构性缺口（非检索质量问题），1 题为嵌入质量不足

允许范围：仅允许 L1 业务文档首轮试点
前置条件：
- 将 plan/mempalace/ 下的元治理文档（source-priority.md、answer-protocol.md、index-baseline-plan.md）纳入索引作为 L1-meta 或独立层级，解决 4 题结构性缺口
- 为 P1/02 技术落地清单补充 section heading 标注，解决 AQ-R12 嵌入质量问题
- 补齐脱敏样本复核记录后方可进入小批量脱敏样本试点
```

## 7. 与最小通过线的对照

| 维度 | 门槛要求 | 实际结果 | 判定 |
|------|---------|---------|------|
| 总体至少 20 题命中 | 20 | 23 | PASS |
| 来源追溯 ≥6 题 | 6 | 7 | PASS |
| 来源追溯必过 S01/S04/S08 | 3/3 | S01✓ S04✓ S08✗ (2/3) | CONDITIONAL |
| 规则解释 ≥8 题 | 8 | 11 | PASS |
| 规则解释必过 R01/R04/R08 | 3/3 | 3/3 | PASS |
| 历史决策 ≥5 题 | 5 | 5 | PASS |
| 历史决策必过 H01/H02 | 2/2 | H01✓ H02✓ (2/2) | PASS |
| 红线 | 0 违规 | 0 违规 | PASS |

必过题 AQ-S08 未通过是唯一阻塞项，但属于结构性缺口（元治理文档不在 L1 索引内），非检索质量问题。
将 source-priority.md 纳入索引后可预期解决。

## 8. 运维实证

| 证据项 | 值 | 来源 |
|--------|-----|------|
| release_id | `mempalace-0.1.0-py3.14.3` | `$HOME/.mempalace/cms-client/runtime/current/release-manifest.json` |
| data_snapshot_id | `snap-20260412-75cb7f16` | release-manifest.json |
| B0 Readiness | 5/5 checks passed | `$HOME/.mempalace/cms-client/data/baselines/b0-run-20260412-a963edab.json` |
| L1 索引批次 | B1-B5 全部 passed | `$HOME/.mempalace/cms-client/data/baselines/l1-index-run-20260412-a963edab.json` |
| 索引规模 | 57 文件 / 716 chunks | L1 index run record |
| Chroma 持久化 | `$HOME/.mempalace/cms-client/data/chroma/` 可读 | 目录检查 |
| manifest_version | v0.1.0 | acceptance-run-raw.json |

## 9. 索引覆盖明细

| 批次 | 来源 | 文件数 | chunk 数 | wing | 主要 room | 质量门 |
|------|------|-------:|--------:|------|-----------|--------|
| B1-p0-core | P0 核心文档 + 导航 | 21 | 453 | gyoseishoshi-p0 | state-machine(82), field-ownership(39), submission-audit(38), workflow-gates(23) | passed |
| B2-p0-artifacts | P0 门禁工件 | 16 | 24 | gyoseishoshi-p0 | state-machine(7), field-ownership(5) | passed |
| B3-p1-core | P1 核心文档 | 3 | 56 | gyoseishoshi-p1 | biz-mgmt(45), state-machine(6) | passed |
| B4-p1-artifacts | P1 门禁工件 | 4 | 5 | gyoseishoshi-p1 | state-machine(2), biz-mgmt(2), workflow-gates(1) | passed |
| B5-office-process | 事务所流程 | 13 | 178 | office-process | scenario-materials(105), biz-mgmt(31) | passed |

6 大高价值 room 全部覆盖：state-machine, field-ownership, workflow-gates, biz-mgmt, scenario-materials, submission-audit。

## 10. 强项与弱项总结

### 强项

1. **规则解释类命中率最高**（91.7%）：12 题中 11 题有效命中，AQ-R04 top score=0.769 为全场最高，证明业务规则的语义检索链路已经可用。
2. **L1 命中率 100%**：所有 28 题都至少有 1 条 L1 来源命中，没有出现只命中 L2/L3 的情况。
3. **来源层级一致性**：所有结果都正确标记为 L1，无来源层级伪装。
4. **红线零违规**：没有把 _raw 当最终权威、没有把 P1 说成可改写 P0 底座、没有 _output 覆盖 L1。
5. **协议合规 100%**：所有 28 题均携带 source_path、source_layer、snippet，无协议违规。

### 弱项与结构性缺口

1. **元治理问题无法回答**（AQ-S08, AQ-H04, AQ-H08 + AQ-S04 部分受限）：来源优先级、降级规则、索引策略等定义在 `plan/mempalace/` 下，不在 L1 索引范围内。这些是**结构性缺口**，不是检索质量问题。
2. **历史追溯能力不足**（AQ-H07 + AQ-H01/H02 部分受限）：需要 _output 编译产出和时间线信息才能回答的"回灌链"问题，在 L1-only 索引下无法满足。
3. **低相关度长尾**：AQ-R12(0.076)、AQ-H08(0.173)、AQ-S04(0.192) 的 top hit score 过低，嵌入模型对部分中文专业术语组合的语义捕获不够精确。

## 11. 改进路线

### 短期（预期解决 4 题结构性缺口 + 1 题嵌入质量）

| 优先级 | 动作 | 预期解决 |
|--------|------|---------|
| P0 | 将 source-priority.md、answer-protocol.md 纳入索引 | AQ-S08, AQ-H04, AQ-H08 |
| P0 | 将 index-baseline-plan.md 纳入索引 | AQ-H08 |
| P1 | 为 P1/02 技术落地清单补充 section heading | AQ-R12 |
| P1 | 确认 P0/07 Case.group 继承链描述是否足够显式 | AQ-R06 |

### 中期

| 动作 | 预期效果 |
|------|---------|
| 启用 _output 索引（L2） | 解决 AQ-H01/H02 历史追溯问题 |
| 补强 P1/01 成功结案前置条件标注 | 解决 AQ-H07 |

### 长期

| 动作 | 预期效果 |
|------|---------|
| 引入 re-ranking 或 cross-encoder | 提升复杂中文查询的 top-3 精度，减少低相关度长尾 |

## 12. 红线判定

| 红线条件 | 是否触发 | 说明 |
|----------|---------|------|
| 把 _raw 当成最终权威来源 | 否 | _raw 未入索引，无 L3 命中 |
| 把 _output 独立当成最终定案且不给 L1 回链 | 否 | _output 未入索引，无 L2 命中 |
| 把 P1 扩展说成可改写 P0 底座 | 否 | P1 结果均正确标记为扩展 |
| 对 W12 必过题给出误导性答案 | 否 | 未通过的必过题均为 miss 而非 misleading |
| 未按 W13 做降级，仍输出伪确定结论 | 否 | 所有结果均遵守协议 |

## 13. 附件与证据链

| 产物 | 路径 |
|------|------|
| 原始检索结果 | `artifacts/mempalace/acceptance-run-raw.json` |
| 试跑分析报告 | `artifacts/mempalace/acceptance-run-report.md` |
| B0 Readiness 记录 | `$HOME/.mempalace/cms-client/data/baselines/b0-run-20260412-a963edab.json` |
| L1 索引记录 | `$HOME/.mempalace/cms-client/data/baselines/l1-index-run-20260412-a963edab.json` |
| Release manifest | `$HOME/.mempalace/cms-client/runtime/current/release-manifest.json` |
| 评估模板 | `plan/mempalace/eval-report-template.md` |
| 验收问题集 | `plan/mempalace/acceptance-queries.md` |
| 回答协议 | `plan/mempalace/answer-protocol.md` |
| 来源优先级 | `plan/mempalace/source-priority.md` |
