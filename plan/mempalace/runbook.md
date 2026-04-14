# MemPalace Ops Runbook

## 1. 适用范围

本 runbook 只覆盖 `MemPalace` 第一期 sidecar 的人工值班操作：

- 增量更新
- 全量重建
- 备份
- 回滚
- 故障分级与处置

不覆盖：

- Go/No-Go 决策
- 自动化脚本
- 监控/告警系统设计

## 2. 固定路径与边界

固定按以下路径执行：

| 项 | 路径 |
|---|---|
| sidecar 根目录 | `$HOME/.mempalace/cms-client/` |
| release 目录 | `$HOME/.mempalace/cms-client/runtime/releases/` |
| 当前生效 release | `$HOME/.mempalace/cms-client/runtime/current` |
| 数据目录 | `$HOME/.mempalace/cms-client/data/` |
| 日志目录 | `$HOME/.mempalace/cms-client/logs/` |
| 备份目录 | `$HOME/.mempalace-backups/cms-client/` |

硬边界：

1. 不在 `cms-client` 仓库内写入运行态、索引库、日志、备份和 PID 文件。
2. 不把 sidecar 启停绑进 `npm install`、`npm run dev`、`npm run guard`、git hook 或 CI。
3. sidecar 故障只允许影响检索增强，不得阻塞主仓库开发、构建、测试和文档维护。
4. 若当前 release 没有明确的启动、停止、健康检查入口，立即停止执行并升级为“环境定义缺口”，不要临场猜命令。

## 3. 值班前置条件

执行任何操作前，先确认：

1. 当前值班者知道最近一次稳定 `release_id`。
2. 当前值班者知道最近一次可恢复 `data_snapshot_id`。
3. `runtime/current` 指向一个真实存在的 release 目录。
4. `data/`、`logs/`、`backups/` 路径存在且可写。
5. 本次操作的目标已经明确：`增量更新`、`全量重建`、`备份`、`回滚` 或 `故障处置`。

若以上任一项不满足，先停止，不继续执行。

## 4. 通用记录要求

每次操作至少记录以下字段，可写入值班记录、工单或本地操作日志：

| 字段 | 说明 |
|---|---|
| `operation_id` | 本次操作唯一标识，建议 `op-YYYYMMDD-HHMMSS` |
| `operator` | 操作者 |
| `started_at` | 开始时间 |
| `operation_type` | `backup` / `incremental-update` / `full-rebuild` / `rollback` / `incident` |
| `release_id` | 当前或目标 release |
| `data_snapshot_id` | 本次使用或生成的快照标识 |
| `result` | `completed` / `failed` / `rolled-back` / `stopped` |
| `notes` | 关键现象、失败原因、恢复动作 |

## 5. 停止条件

出现以下任一情况，停止当前 runbook，不继续扩写动作：

1. 运行拓扑、目录边界或环境版本未冻结。
2. 当前 release 没有可执行的启停/健康检查入口。
3. 无法确认最近一次稳定 release 或最近一次可恢复快照。
4. 必须先引入监控、告警、额外服务编排才能继续。
5. 故障已经超出 sidecar 范围，开始影响主仓库正常工作流。

## 6. 故障分类

固定按以下类别处理：

| 分类 | 典型现象 | 首要动作 | 是否优先回滚 |
|---|---|---|---|
| `R1-startup-failure` | sidecar 无法启动、健康检查失败 | 先保留日志，再切回稳定 release | 是 |
| `R2-data-corruption` | 持久化目录不可读、集合缺失、索引损坏 | 先停止写入，再从快照恢复或全量重建 | 是 |
| `R3-quality-gate-failure` | `L1 > L2 > L3` 排序错误、`_raw` 越权、正文/工件主次错误 | 停止推进当前批次，恢复到批前快照 | 是 |
| `R4-input-mismatch` | 读错来源目录、白名单不符、批次越层 | 停止当前批次，修正输入后重跑 | 否 |
| `R5-backup-failure` | 备份包不完整、备份目录不可写、校验失败 | 停止升级/重建/回滚链路 | 否 |
| `R6-environment-gap` | 缺少启动入口、解释器失效、release 目录不完整 | 停止操作并升级人工处理 | 否 |

原则：

1. 先收敛失败，再恢复顺利路径。
2. 能回滚时优先回滚，不在故障现场做原地大修。
3. 任何失败都先保留日志、快照标识和 release 信息，再做破坏性动作。

## 7. 操作前统一检查

所有顺利路径都先执行以下检查：

1. 记录当前 `release_id`，并确认 `runtime/current` 的实际指向。
2. 确认 `data/`、`logs/`、`backups/` 存在且剩余空间足够。
3. 记录最近一次成功健康检查时间；若当前本就不健康，转入故障处置，不直接做升级或更新。
4. 确认本次操作是否会改动活动 `data/`；只要会改动，就必须先生成新快照。
5. 确认本次操作不需要修改主仓库的 `package.json`、`package-lock.json` 或任一 `npm` 流程。

推荐检查命令：

```bash
readlink "$HOME/.mempalace/cms-client/runtime/current"
du -sh "$HOME/.mempalace/cms-client/data" "$HOME/.mempalace/cms-client/logs" "$HOME/.mempalace-backups/cms-client"
ls -ld "$HOME/.mempalace/cms-client" "$HOME/.mempalace/cms-client/data" "$HOME/.mempalace/cms-client/logs" "$HOME/.mempalace-backups/cms-client"
```

## 8. 备份流程

### 8.1 触发时机

以下动作前必须先备份：

1. 任何 release 切换
2. 任何 `Chroma` / Python / `MemPalace` 版本升级
3. 任何会改写活动 `data/` 的全量重建
4. 任何高风险增量更新补跑
5. 任何手工恢复或回滚

### 8.2 最小备份内容

至少备份：

1. 活动 `data/`
2. `runtime/current` 当前指向的 release 信息
3. 本次操作前已知的版本信息：`mempalace_version`、`python_version`、`chroma_version`

### 8.3 备份步骤

1. 生成 `data_snapshot_id`，建议格式：`backup-YYYYMMDD-HHMMSS-<reason>`。
2. 在 `backups/` 下为该快照创建独立目录。
3. 备份活动 `data/`。
4. 记录当前 `runtime/current` 的实际目标目录。
5. 写入一个最小 manifest，至少包含：
   - `data_snapshot_id`
   - `release_id`
   - `captured_at`
   - `captured_by`
   - `reason`
6. 校验备份包或备份目录确实存在且非空。

参考命令：

```bash
SNAPSHOT_ID="backup-$(date +%Y%m%d-%H%M%S)-prechange"
BACKUP_ROOT="$HOME/.mempalace-backups/cms-client/$SNAPSHOT_ID"
mkdir -p "$BACKUP_ROOT"
cp -a "$HOME/.mempalace/cms-client/data" "$BACKUP_ROOT/data"
readlink "$HOME/.mempalace/cms-client/runtime/current" > "$BACKUP_ROOT/current-release.txt"
```

### 8.4 备份失败处理

若备份失败：

1. 立即停止后续升级、重建、增量更新或回滚动作。
2. 记录失败原因。
3. 只允许在备份成功后重新进入顺利路径。

## 9. 回滚流程

### 9.1 回滚触发条件

满足任一条件就优先回滚：

1. 新 release 无法启动。
2. 健康检查失败且短时间内无法通过配置修正。
3. 新 release 无法读取既有持久化数据。
4. 升级后出现索引损坏、集合缺失或查询结果显著异常。
5. 质量闸门失败且问题来自本次变更，而非历史遗留。

### 9.2 回滚步骤

1. 停止当前失败中的 sidecar 进程。
2. 保留当前 `logs/` 中与本次失败相关的日志，不覆盖、不清空。
3. 记录当前失败 release 与上一已知稳定 release。
4. 将 `runtime/current` 切回上一稳定 release。
5. 若活动 `data/` 已被写坏或可疑，用本次变更前的 `data_snapshot_id` 恢复 `data/`。
6. 用稳定 release 做最小启动和健康检查。
7. 记录回滚结果，标记本次操作 `result = rolled-back`。

参考命令：

```bash
PREV_RELEASE="$HOME/.mempalace/cms-client/runtime/releases/<stable-release-id>"
ln -sfn "$PREV_RELEASE" "$HOME/.mempalace/cms-client/runtime/current"
rm -rf "$HOME/.mempalace/cms-client/data"
cp -a "$HOME/.mempalace-backups/cms-client/<data_snapshot_id>/data" "$HOME/.mempalace/cms-client/data"
```

### 9.3 回滚后要求

1. 未定位根因前，不重复尝试同一路径升级或重建。
2. 失败 release 目录和日志保留，用于后续排障。
3. 回滚完成后，只有健康检查重新通过，才能恢复增量更新或全量重建。

## 10. 增量更新流程

### 10.1 适用条件

增量更新仅在以下条件全部满足时允许执行：

1. 当前 stable release 健康。
2. 本次只涉及有限来源变更，不需要整体重建索引。
3. 已存在可恢复快照。
4. 本次不会越过 `W11` 的层级顺序约束。

### 10.2 增量更新步骤

1. 执行统一检查。
2. 先生成 `pre-update` 快照。
3. 明确本次变更命中的 `source_id` 和来源层级。
4. 若本次变更跨多个层级，仍按 `B1 -> B7` 的固定顺序分别执行，不合批。
5. 只对受影响的来源执行增量 ingest 或局部重建。
6. 运行最小健康检查，确认：
   - 可检索到本次更新后的内容
   - `L1 > L2 > L3` 排序未被破坏
   - `_output` 未越权为最终结论
   - `_raw` 仍只表现为待编译线索
7. 记录本次操作及其对应快照。

### 10.3 增量更新失败处理

1. 若属于 `R4-input-mismatch`，修正输入后只重跑当前批次。
2. 若属于 `R1/R2/R3`，立即停止当前批次并恢复到 `pre-update` 快照。
3. 同一批次连续两次失败，则停止本轮增量更新，升级为人工复盘；不得跨层推进。

## 11. 全量重建流程

### 11.1 触发条件

出现以下任一情况，优先考虑全量重建：

1. 首次建立索引基线。
2. 活动 `data/` 已损坏，无法可信恢复到可用状态。
3. manifest、taxonomy 或索引结构发生不兼容变更。
4. 多次增量更新失败，无法确认活动数据仍可信。

### 11.2 全量重建前提

1. 已完成备份。
2. 当前 `release_id` 已冻结。
3. 已确认本次 run 的 `run_id`、`manifest_version`、`data_snapshot_id`。
4. 已准备好按 `B0 -> B7` 分批执行。

### 11.3 全量重建步骤

1. 执行统一检查并生成 `pre-rebuild` 快照。
2. 停止 sidecar 写入。
3. 将当前活动 `data/` 移到隔离目录，避免与新数据混放。
4. 创建新的空 `data/` 目录。
5. 先执行 `B0-readiness-check`。
6. 再按固定顺序执行：`B1 P0 正文 -> B2 P0 工件 -> B3 P1 正文 -> B4 P1 工件 -> B5 事务所流程 -> B6 _output -> B7 _raw`。
7. 每批都必须写入最小基线记录，并确认 `quality_gate = passed` 后才能进入下一批。
8. 任一批失败时，停止全量重建，恢复到本批开始前快照或本次 `pre-rebuild` 快照，不继续推进后续批次。
9. 全部批次成功后，启动当前 stable release 做健康检查。
10. 保留旧数据隔离目录和本次日志，直到至少完成一个观察周期。

参考命令：

```bash
RUN_ID="run-$(date +%Y%m%d-%H%M%S)-full"
mv "$HOME/.mempalace/cms-client/data" "$HOME/.mempalace/cms-client/data.quarantine-$RUN_ID"
mkdir -p "$HOME/.mempalace/cms-client/data"
```

### 11.4 全量重建失败处理

1. 删除或隔离本次失败重建产生的新 `data/`。
2. 从 `pre-rebuild` 快照恢复旧 `data/`。
3. 如失败由新 release 引起，同时切回上一稳定 release。
4. 保留失败批次日志、失败类型和快照标识。

## 12. 健康检查最小要求

每次切换、更新、回滚、重建后，至少检查：

1. sidecar 可以正常启动。
2. 持久化目录可以正常读取。
3. 至少一条 `L1` 权威查询可以命中。
4. 若本次涉及 `_output`，其结果可以回链到 `L1`。
5. 若本次涉及 `_raw`，其结果仍显示为待编译/待确认，而不是最终定案。

若做不到以上五项中的任一项，视为失败，不放行。

## 13. 故障处理顺序

发生故障时，固定按以下顺序处理：

1. 先判定是否影响主仓库；若影响主仓库，先切断 sidecar 影响面。
2. 先保留日志、快照标识、当前 release 信息。
3. 再判定是 `R1-R6` 哪一类。
4. 能回滚时先回滚。
5. 只有在回滚不可用时，才进入恢复或重建。
6. 故障关闭前必须补齐操作记录。

## 14. 值班者最小检查清单

每次结束前，逐项确认：

1. 当前 `runtime/current` 指向正确 release。
2. 当前 `data/` 来自已知快照或本次成功 run。
3. 本次日志已保留在 `logs/`。
4. 本次生成或使用的 `data_snapshot_id` 已记录。
5. 健康检查通过。
6. 若发生回滚，失败 release 和失败日志未被覆盖。

## 15. 直接依据

- `plan/tasks/MP-W15-ops-runbook.md`
- `plan/mempalace/deployment-topology.md`
- `plan/mempalace/environment-strategy.md`
- `plan/mempalace/index-baseline-plan.md`
- `plan/mempalace/source-priority.md`
