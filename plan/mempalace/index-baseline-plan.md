# MemPalace 首轮全量索引基线方案

## 1. 目标

在 `W01`、`W04`、`W06`、`W08` 已冻结的前提下，定义 `MemPalace` 第一次全量索引的批次顺序、每批成功条件、失败补跑方式与基线记录项，作为后续 sidecar 真正执行全量索引时的统一 runbook 草案。

本文只定义执行方案，不执行真实索引、不生成评估报告，也不展开值班运维流程。

## 2. 固定前提

首轮全量索引必须同时满足以下前提，否则停止执行：

1. 来源优先级冻结为 `L1(P0/P1/事务所流程) > L2(_output) > L3(_raw)`。
2. `ingestion-manifest.md` 已冻结 `source_id`、白名单、黑名单与 `_output/_raw` 预留权重。
3. `taxonomy-spec.md` 已冻结首批 `wing` 与 `room`，至少覆盖 `state-machine`、`field-ownership`、`workflow-gates`、`biz-mgmt`。
4. sidecar 环境、版本、数据目录与备份目录策略已冻结，不与 `cms-client` 的 `npm` 工作流混用。

若以上任一项被回改或未冻结，首轮索引方案失效，必须先回到对应前置任务更新。

## 3. 执行原则

### 3.1 先小后大

- 先跑最小可成基线的 `L1` 权威批次，再决定是否放行 `_output` 与 `_raw`。
- 每一批只绑定一组稳定 `source_id`，不要把不同层级来源混在同一批次里。
- `_raw` 永远排在所有权威与编译结论批次之后，不允许抢跑。

### 3.2 先权威正文，后附属工件

- `P0/P1` 正文先建立权威骨架。
- 门禁工件、导航文档和场景配置作为补充批次进入，不能反过来决定主规则。
- `_output` 只在 `L1` 已稳定后作为桥接层补入。
- `_raw` 只在 `L1` 和 `_output` 都已有稳定基线后，作为低权重线索层补入。

### 3.3 批次失败不跨层前进

- 任一批次失败时，只允许在同批次内补跑。
- 不允许跳过失败批次继续索引后续来源。
- 不允许因为 `_output` 或 `_raw` 可跑，就绕过 `L1` 权威批次。

## 4. 首轮批次顺序

### 4.1 总顺序

固定顺序如下：

`B0 预检 -> B1 P0 正文 -> B2 P0 附属工件 -> B3 P1 正文 -> B4 P1 附属工件 -> B5 事务所流程 -> B6 _output -> B7 _raw`

其中：

- `B1-B5` 是首轮最小必跑基线。
- `B6-B7` 是首轮扩展补全批次，只有在 `B1-B5` 全部成功后才允许放行。

### 4.2 各批次定义

| 批次 | 对应 `source_id` | 层级 | 目的 | 是否首轮必跑 |
|---|---|---|---|---|
| `B0-readiness-check` | 非索引批次 | N/A | 核对 manifest、taxonomy、环境版本和备份点是否齐备 | 是 |
| `B1-p0-core` | `p0-core-md`、`p0-navigation-md` | `L1` | 先建立 `P0` 权威规则和导航骨架 | 是 |
| `B2-p0-artifacts` | `p0-gate-artifacts` | `L1` | 补入页面规格门禁产物，增强结构化命中 | 是 |
| `B3-p1-core` | `p1-core-md` | `L1` | 在不改写 `P0` 的前提下补入 `P1` 扩展定义 | 是 |
| `B4-p1-artifacts` | `p1-gate-artifacts` | `L1` | 补入 `P1` 结构化门禁工件 | 是 |
| `B5-office-process` | `office-process-md`、`office-process-scenarios`、`office-process-config` | `L1` | 补入事务所流程、资料场景和配置映射 | 是 |
| `B6-output-bridge` | `compiled-output-buffer` | `L2` | 在不覆盖 `L1` 的前提下增加编译结论桥接层 | 否，需闸门放行 |
| `B7-raw-buffer` | `raw-input-buffer` | `L3` | 仅增加待编译线索层，不输出权威定案 | 否，需闸门放行 |

### 4.3 为什么采用该顺序

1. `P0` 先于 `P1`，因为 `P0` 是共享底座和最高优先级权威源。
2. 同一来源域内先正文、后工件，避免门禁工件先入导致正文被结构化碎片“抢解释权”。
3. 事务所流程排在 `P0/P1` 之后，确保场景资料只补充业务输入，不倒灌改写产品规则。
4. `_output` 排在全部 `L1` 之后，确保它只做桥接层。
5. `_raw` 最后进入，确保其始终只是低权重线索层。

## 5. 每批成功条件

### 5.1 通用成功条件

任意索引批次都必须同时满足：

1. 批次输入目录与 `source_id` 完全匹配 manifest 白名单。
2. 未命中任何 `C4-Hard-Block` 内容；若命中则该文件被剔除并记入基线。
3. 批次结束后，已生成可追踪的批次基线记录。
4. 批次健康检查通过，至少能返回该批次已索引来源的命中与引用上下文。
5. 本批次失败计数未超过阈值；若超过阈值则停止推进，不进入下一批。

### 5.2 批次级成功条件

| 批次 | 额外成功条件 |
|---|---|
| `B0-readiness-check` | 已确认 `manifest_version`、`taxonomy`、`release_id`、`data_snapshot_id` 和本次 `run_id` 均已记录 |
| `B1-p0-core` | `state-machine`、`field-ownership`、`workflow-gates` 至少各有一个可检索命中来自 `P0` |
| `B2-p0-artifacts` | `P0` 门禁工件仅作为补充层写入，不出现“工件先于正文”的主排序异常 |
| `B3-p1-core` | `biz-mgmt` 至少有一个可检索命中来自 `P1`，且结果仍保留 `P0` 底座优先关系 |
| `B4-p1-artifacts` | `P1` 工件能补充扩展字段或门禁，但不提升为高于 `P1` 正文的解释层 |
| `B5-office-process` | `scenario-materials` 至少有一个可检索命中来自事务所流程，且不会把场景资料排到 `P0/P1` 之前 |
| `B6-output-bridge` | `_output` 命中必须能回链到至少一个 `L1` 文档，不能独立充当最终结论 |
| `B7-raw-buffer` | `_raw` 命中必须明确标记为“待编译/待确认”，且排序低于 `_output` |

## 6. 失败补跑策略

### 6.1 失败分级

把失败分成三类处理：

| 失败类型 | 示例 | 处理方式 |
|---|---|---|
| `F1-input-mismatch` | 路径白名单不符、批次读到了错误来源根 | 立即停止本批次，修正配置后重跑同批，不改动已成功批次 |
| `F2-index-build-failure` | 分块、持久化、写索引或启动健康检查失败 | 回到本批次开始前的恢复点，重跑同批 |
| `F3-quality-gate-failure` | 排序不符合 `L1 > L2 > L3`、`_raw` 结果越权、room 覆盖异常 | 保留失败日志，不推进下一批；修正策略后以同一输入重跑同批 |

### 6.2 补跑规则

固定补跑规则：

1. 每批首次执行前都要记录一个 `pre_batch_snapshot_id`；失败后优先恢复到该快照。
2. 同一批次最多允许两次常规补跑：
   - 第 1 次：修正配置或环境后直接重跑。
   - 第 2 次：恢复快照后重跑，并保留第一次失败日志用于对比。
3. 若同一批次连续两次失败，则本轮全量索引停止，进入人工复盘；禁止继续推进后续批次。
4. 补跑只允许重跑当前失败批次，不允许把后续批次并回当前批次一起重建。
5. 任何补跑都不得覆盖上一已知成功批次的基线记录；只能新增一次 `retry_of` 记录。

### 6.3 不同批次的补跑重点

| 批次类型 | 补跑重点 |
|---|---|
| `L1` 正文批次 | 优先检查 manifest 白名单、切块策略和来源排序是否正确 |
| `L1` 工件批次 | 优先检查正文与工件的排序关系，避免工件抢占主解释权 |
| `_output` 批次 | 优先检查是否缺失对应 `L1` 回链；若缺失则回退并停止启用 `_output` |
| `_raw` 批次 | 优先检查是否误升格为确定结论；一旦发生，立即回退本批并冻结 `_raw` 接入 |

### 6.4 明确禁止的补跑方式

- 不允许直接“全库重建后看结果再说”，必须按批次恢复和重跑。
- 不允许在失败后临时调高 `_output` 或 `_raw` 权重来掩盖 `L1` 命中不足。
- 不允许跳过 `B6` 直接启用 `B7`。
- 不允许把失败样本混入下一批的成功记录。

## 7. 批次放行闸门

### 7.1 `B1-B5` 到 `B6`

只有同时满足以下条件，才允许启用 `_output`：

1. `B1-B5` 全部成功，且无待处理失败。
2. 至少四个核心 `room` 已有来自 `L1` 的稳定命中：`state-machine`、`field-ownership`、`workflow-gates`、`biz-mgmt`。
3. 本次基线记录已证明 `P0/P1/事务所流程` 的排序符合来源优先级。

### 7.2 `B6` 到 `B7`

只有同时满足以下条件，才允许启用 `_raw`：

1. `B6` 成功，且 `_output` 没有独立越权为最终结论。
2. 回答链路已能明确区分“桥接结论”和“原始线索”。
3. 操作者确认 `_raw` 只作为待编译线索层，不用于正式定案。

## 8. 需要记录的基线统计

### 8.1 记录原则

- 只记录后续决策、补跑和回退必需字段。
- 不把每个 chunk 的细粒度调试信息都塞进基线主记录；详细日志留在日志目录。
- 基线记录面向“能否继续下一批”和“失败后如何恢复”两个目标。

### 8.2 最小字段集合

每次全量索引 run 至少记录以下字段：

| 字段 | 说明 |
|---|---|
| `run_id` | 本次全量索引唯一标识 |
| `baseline_plan_version` | 本方案版本，例如 `w11-v1` |
| `manifest_version` | 使用的 ingestion manifest 版本 |
| `release_id` | sidecar 当前生效 release |
| `data_snapshot_id` | 全量索引开始前的数据快照标识 |
| `started_at` / `finished_at` | 本次 run 起止时间 |
| `status` | `running`、`completed`、`stopped`、`failed` |

每个批次至少记录以下字段：

| 字段 | 说明 |
|---|---|
| `batch_id` | 如 `B1-p0-core` |
| `batch_order` | 在本次 run 中的固定顺序号 |
| `source_ids` | 本批次绑定的 manifest 条目 |
| `authority_layer` | `L1` / `L2` / `L3` |
| `source_roots` | 本批次实际扫描的来源根目录 |
| `candidate_file_count` | 命中白名单的候选文件数 |
| `indexed_file_count` | 成功进入索引的文件数 |
| `blocked_file_count` | 因内容红线被剔除的文件数 |
| `skipped_file_count` | 因后缀/黑名单/重复而跳过的文件数 |
| `chunk_count` | 进入索引的 chunk 总数 |
| `wing_coverage` | 每个 `wing` 的命中数量 |
| `room_coverage` | 每个核心 `room` 的命中数量 |
| `quality_gate` | `passed` / `failed` |
| `retry_count` | 当前批次已补跑次数 |
| `retry_of` | 若为补跑，指向上一条失败记录 |
| `error_class` | 失败时记录 `F1/F2/F3` |
| `pre_batch_snapshot_id` | 本批开始前恢复点 |
| `post_batch_snapshot_id` | 本批成功后的恢复点 |

### 8.3 推荐落盘位置

为了与 `W07/W08` 保持一致，推荐：

- 批次与 run 基线主记录：`$HOME/.mempalace/cms-client/data/baselines/`
- 详细索引日志：`$HOME/.mempalace/cms-client/logs/index/`
- 恢复点快照：`$HOME/.mempalace-backups/cms-client/`

仓库内只保留本方案文档，不保留真实运行态基线数据。

## 9. 最小执行模板

后续真实执行时，建议每个批次按以下顺序运行：

1. 读取本次 `run_id`、`release_id`、`manifest_version`。
2. 创建或确认 `pre_batch_snapshot_id`。
3. 只加载当前批次绑定的 `source_id`。
4. 执行采集、分块、索引和最小健康检查。
5. 写入本批次基线记录。
6. 只有当 `quality_gate = passed` 时，才进入下一批。

## 10. 当前收敛结论

- 首轮全量索引的最小必跑集合是 `B1-B5`，只覆盖 `L1` 权威来源。
- `_output` 与 `_raw` 不再视为“天然包含在首轮里”，而是放在权威基线成功后的扩展补全批次。
- 失败补跑以“同批恢复、同批重跑、不跨层推进”为硬规则。
- 基线统计只保留 run、批次、覆盖度、失败类型和恢复点等决策必需字段。

## 11. 直接依据

- `plan/tasks/MP-W11-index-baseline.md`
- `plan/mempalace/source-priority.md`
- `plan/mempalace/ingestion-manifest.md`
- `plan/mempalace/taxonomy-spec.md`
- `plan/mempalace/environment-strategy.md`
- `plan/mempalace/deployment-topology.md`
