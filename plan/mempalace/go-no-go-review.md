# MemPalace Go/No-Go 评审

## 1. 评审范围

本评审只回答一个问题：`MemPalace` 是否可以从当前 L1 首轮索引与验收阶段，进入"小批量人工观察试点"。

本评审不做：

- 真实业务数据接入
- 白名单扩范围（`_output`、`_raw` 仍不放行到正式索引）
- 既有治理结论改写
- 新治理文档补写

## 2. 当前结论

### 2.1 决策

当前建议：`Conditional Go`

一句话结论：

L1 首轮真实试跑已完成，28 题验收命中率 100%、红线零违规、规则解释类 11/12 有效命中；sidecar 已具备可启动、可健康检查、可检索的最小可运行原型，4 个 MCP 只读工具已实现并接入客户端。评估结果满足 `W12` 最小通过线的主体要求，但部分必过题因元治理文档未入索引而仅为 Conditional，因此判定为 `Conditional Go`，允许在严格约束下进入小批量人工观察试点。

### 2.2 当前允许范围

- 在 `L1` 已索引范围内，允许通过 MCP 只读工具进行检索增强辅助
- 允许人工在日常文档维护中使用 `search_knowledge`、`get_document`、`get_citation_context`、`list_indexed_sources` 进行查阅
- 允许基于观察结果收集改进建议，用于后续嵌入质量优化和索引范围评估
- 允许按 `runbook.md` 执行增量更新，前提是更新前先备份

### 2.3 当前明确不允许

- 不接入真实客户、正式案件、正式收费、正式证件数据
- 不把 `_output` 或 `_raw` 纳入正式索引
- 不把检索结果当成业务决策的唯一依据（必须人工复核）
- 不在没有补齐元治理文档索引前宣称"历史追溯类问题已解决"
- 不在没有完成首轮稳定观察期前扩大到脱敏样本批量试点

## 3. Go 与 No-Go 的硬门槛

以下任一项不满足，即默认 `No-Go`：

1. 脱敏样本门槛
   - 样本只能来自 `C3-Desensitize-Candidate`
   - 必须满足 `data_classification.md` 第 4 节的五项最小放行条件
   - 必须有人工复核记录，且能证明"不可逆、不可回推"
   - **当前状态**：本轮只索引 `L1` 权威文档（`C1-Direct-Allow` 和 `C2-Scoped-Allow`），不涉及脱敏样本。该门槛在 L1-only 范围内不适用，待扩大到脱敏样本试点时重新激活

2. 评估门槛
   - 必须基于 `acceptance-queries.md` 的问题集实际试跑
   - 必须按 `answer-protocol.md` 判定协议合规与降级行为
   - 必须按 `eval-report-template.md` 形成完整评估报告
   - 必须满足 `W12` 的最小通过线，且不得触发 `W14` 第 12 节任何红线
   - **当前状态**：已完成。详见第 5 节

3. 运维门槛
   - 必须能明确当前稳定 `release_id`
   - 必须能明确最近一次可恢复 `data_snapshot_id`
   - 必须存在可执行的启动、停止、健康检查入口
   - 值班者必须可按 `runbook.md` 独立执行，不依赖历史聊天补充
   - **当前状态**：已完成。详见第 6 节

4. 范围门槛
   - 一期白名单仍只限 `L1` 权威定义层
   - `_output` 只能做桥接层，`_raw` 只能做待确认线索
   - 不得因为"已脱敏候选"就自动放行到正式知识层或更大范围
   - **当前状态**：满足。索引仅含 L1，`_output` 和 `_raw` 均为 `disabled_reserved`

## 4. 上一轮阻塞项清除记录

### 4.1 原阻塞：缺少脱敏样本放行证据

**处置**：本轮 Conditional Go 范围仅限 L1 权威文档。L1 来源全部为 `C1-Direct-Allow` 或 `C2-Scoped-Allow`，不包含真实客户、正式案件或财务敏感数据，无需脱敏样本复核。该门槛在当前范围内不适用，将在后续扩大范围时重新激活。

### 4.2 原阻塞：缺少真实评估结果

**处置**：已清除。首轮验收问题集 28 题真实试跑于 2026-04-12 完成。评估报告已产出，存放于 `artifacts/mempalace/acceptance-run-report.md`，原始检索结果存放于 `artifacts/mempalace/acceptance-run-raw.json`。

### 4.3 原阻塞：缺少可执行运维实证

**处置**：已清除。sidecar 已具备完整启动、停止、健康检查入口。`release_id` 已冻结，健康检查 API（H1–H5）已实现并可执行。MCP 客户端接入已完成配置。

## 5. 评估证据摘要

### 5.1 试跑元数据

| 字段 | 值 |
|------|------|
| 执行时间 | 2026-04-12 |
| manifest_version | v0.1.0 |
| release_id | mempalace-0.1.0 |
| 索引总 chunk | 716 |
| 索引文件数 | 57 |
| 工具 | search_knowledge (n_results=10) |
| 判定依据 | acceptance-queries.md §2–§6 |

### 5.2 总体命中与通过线对照

| 维度 | 结果 | 门槛 | 判定 |
|------|------|------|------|
| 总命中率（L1 hit） | 28/28 (100%) | 至少 20 题 | **PASS** |
| 来源追溯类 | 7/8 有效命中 | 至少 6 题 | **PASS** |
| 规则解释类 | 11/12 有效命中 | 至少 8 题 | **PASS** |
| 历史决策类 | 5/8 有效命中 | 至少 5 题 | **PASS** |
| 红线违规 | 0 | 0 | **PASS** |

### 5.3 必过题状态

| 必过题 | 结果 | 说明 |
|--------|------|------|
| AQ-S01 | △ | 命中 P0/04 state-machine 区域，但 top hit 偏低（score=0.281） |
| AQ-S04 | △ | 命中 P0 docs，但 `_output` 降级规则属于元治理文档，不在 L1 索引内 |
| AQ-S08 | △ | 结构性缺口：`_raw` 只能作线索是元治理规则，不在业务 L1 中 |
| AQ-R01 | ✓ | 精确命中 P0/07 SubmissionPackage |
| AQ-R04 | ✓ | 全场最高分（score=0.769），精确命中 P1/01 M6 收费节点 |
| AQ-R08 | ✓ | 命中 P0/07 + P0/04 §5 服务端执行口径 |
| AQ-H01 | △ | 命中 P0/README 和 P1/01，但 `_output` 未入索引导致回灌链不可追 |
| AQ-H02 | △ | 命中 P0/04 字段分界，但缺乏纠偏历史的时间线 |

R 组 3 题必过全通过；S 组和 H 组各有结构性 Conditional，根因为元治理文档和 `_output` 不在 L1 索引范围内。

### 5.4 协议合规检查

| 协议要求 | 结果 |
|----------|------|
| 所有结果带 source_path | ✓ 28/28 |
| 所有结果带 source_layer | ✓ 28/28 |
| 所有结果带 snippet | ✓ 28/28 |
| 无 `_raw` 伪装为最终权威 | ✓ |
| 无 `_output` 覆盖 L1 | ✓ |
| 冲突场景遵守 L1>L2>L3 | ✓ |

### 5.5 结构性发现

**强项**：
1. 规则解释类命中率最高（11/12），业务规则语义检索链路已可用
2. 所有 28 题至少有 1 条 L1 命中，无来源层级伪装
3. 6 大核心 room（state-machine, field-ownership, workflow-gates, biz-mgmt, scenario-materials, submission-audit）全覆盖
4. 红线零违规

**已知缺口**：
1. 元治理问题（AQ-S04, AQ-S08, AQ-H04, AQ-H08）因 `plan/mempalace/` 不在索引范围内，属于结构性缺口而非检索质量问题
2. 历史追溯类（AQ-H01, AQ-H02, AQ-H06, AQ-H07）需要 `_output` 编译产出才能完整回答
3. 低相关度长尾：AQ-R12 (0.076)、AQ-H08 (0.173) 说明嵌入模型对部分中文专业术语组合的捕获不够精确

## 6. 运维证据摘要

### 6.1 release_id 与版本基线

| 字段 | 值 |
|------|------|
| release_id 命名规范 | `mempalace-<version>-py<python_version>` |
| 首个 release_id | `mempalace-0.1.0-py3.11.15`（规范定义） |
| MemPalace 代码版本 | `0.1.0`（`sidecar/mempalace/config.py`） |
| Chroma 基线 | `1.5.x`（锁定到具体 patch） |
| release-manifest.json 规范 | 已冻结（`release-strategy.md` §5） |

### 6.2 健康检查入口

sidecar 提供两套健康检查 API：

1. **旧版 API** `run_healthcheck(cfg)` → `HealthStatus`：检查数据目录可写、manifest 可读、PersistentClient 可达
2. **新版 API** `run_health_checks(paths)` → `HealthResult`：按 H1–H5 顺序执行（目录结构 → release-manifest → PersistentClient → 数据读写 → 日志可写）

### 6.3 启动、停止入口

| 能力 | 入口 |
|------|------|
| MCP 服务启动 | `python -m mempalace.mcp_server`（stdio transport） |
| PID 写入 | `healthcheck.write_pid()` |
| 进程存活检测 | `healthcheck.read_pid()` |
| 停止 | `healthcheck.stop_sidecar()`（SIGTERM + 3s 超时） |

### 6.4 客户端接入

| 客户端 | 配置方式 | 状态 |
|--------|---------|------|
| Cursor | `~/.cursor/mcp.json` 或 Settings UI | 已配置（`mcp-client-setup.md` §5） |
| Claude Code | `claude mcp add --scope user` 或 `~/.claude.json` | 已配置（`mcp-client-setup.md` §6） |

已验证 MCP server 只暴露 4 个白名单工具：`search_knowledge`、`get_document`、`get_citation_context`、`list_indexed_sources`。

### 6.5 runbook 可执行性

| 流程 | 文档覆盖 | 参考命令 |
|------|---------|---------|
| 备份 | `runbook.md` §8 | 有 |
| 回滚 | `runbook.md` §9 | 有 |
| 增量更新 | `runbook.md` §10 | 有 |
| 全量重建 | `runbook.md` §11 | 有 |
| 健康检查 | `runbook.md` §12 | 有 |
| 故障处置 | `runbook.md` §6 + §13 | 有 |

### 6.6 目录隔离

sidecar 所有运行产物均在仓库外（`$HOME/.mempalace/cms-client/`），不污染 `cms-client` 的 `npm` 工作流。符合 `deployment-topology.md` 硬边界。

## 7. Conditional Go 的约束条件

以下条件必须在整个试点期间持续满足，任一项不满足即回退到 `No-Go`：

### 7.1 范围约束

1. 索引仅限 `L1` 权威定义层（P0 正文/工件、P1 正文/工件、事务所流程）
2. `_output` 和 `_raw` 保持 `disabled_reserved`，不纳入正式索引
3. 不接入真实客户、正式案件、正式收费、正式证件数据
4. 不把检索结果当成业务决策唯一依据

### 7.2 运维约束

1. 每次增量更新或配置变更前必须先备份
2. 健康检查失败时优先回滚，不在故障现场原地大修
3. sidecar 故障不得阻塞 `cms-client` 主仓库的开发、构建、测试和文档维护

### 7.3 观察期要求

1. 首轮稳定观察期至少持续 1 周
2. 观察期内收集：检索使用频率、误导发生率、人工纠偏次数
3. 观察期结束后基于实际使用数据决定是否升级到正式 Go

## 8. 从 Conditional Go 升级到正式 Go 的前提

只有在以下条件同时满足时，才可从 `Conditional Go` 升级到正式 `Go`：

1. 首轮稳定观察期完成，无 R1–R3 级故障发生
2. 元治理文档索引方案已评估（是否将 `plan/mempalace/source-priority.md`、`answer-protocol.md` 纳入索引）
3. 必过题中的 Conditional 项已有明确改进计划或已通过补强验证
4. 低相关度长尾（AQ-R12、AQ-H08）已有改进方案（re-ranking 或 section heading 优化）
5. 如需扩大到 `_output` 索引（L2），必须先完成 B6 批次闸门评估

## 9. 从 Conditional Go 回退到 No-Go 的触发条件

出现以下任一情况，立即回退：

1. 检索结果出现红线违规：`_raw` 越权、`P1` 改写 `P0`、低层来源伪装为 L1
2. sidecar 故障影响了主仓库正常工作流
3. 健康检查持续失败且无法在 24 小时内恢复
4. 试点范围被扩大到未经审查的来源

## 10. 当前不能做的事情

- 不能把本评审当成正式上线放行
- 不能把 `_output`、`_raw`、聊天导出、日志、备份、二进制附件纳入试点
- 不能在未完成首轮观察期前扩大到脱敏样本试点
- 不能忽略必过题的 Conditional 状态直接宣称"全部通过"
- 不能在未完成元治理文档索引评估前声称"历史追溯问题已解决"

## 11. 依据映射

| 评审项 | 当前依据 | 证据位置 |
|---|---|---|
| 来源层级与降级规则 | `source-priority.md`、`answer-protocol.md` | 治理层（已冻结） |
| 脱敏与禁止边界 | `blocked_sources.md`、`data_classification.md` | 治理层（已冻结） |
| 允许采集范围 | `allowed_sources.md`、`ingestion-manifest.md` | 治理层（已冻结） |
| 验收题目与通过线 | `acceptance-queries.md` | 治理层（已冻结） |
| 首轮验收评估结果 | `artifacts/mempalace/acceptance-run-report.md` | 执行层（首轮产出） |
| 首轮原始检索数据 | `artifacts/mempalace/acceptance-run-raw.json` | 执行层（首轮产出） |
| 评估模板与红线 | `eval-report-template.md` | 治理层（已冻结） |
| 运维可执行性 | `runbook.md`、`environment-strategy.md`、`release-strategy.md` | 治理层（已冻结） |
| sidecar 实现 | `sidecar/mempalace/` 代码库 | 执行层（已实现） |
| MCP 工具实现 | `sidecar/mempalace/mcp_server.py`、`sidecar/mempalace/tools.py` | 执行层（已实现） |
| MCP 客户端接入 | `mcp-client-setup.md` | 执行层（已配置） |
| 健康检查实现 | `sidecar/mempalace/healthcheck.py` | 执行层（已实现） |

## 12. 最小结论

- 现阶段已从"执行证据缺口"推进到"核心链路可用、已知缺口可控"
- 首轮真实试跑证明：L1 业务规则检索增强链路已可用，红线零违规，协议合规
- 已知缺口（元治理问题、历史追溯、低相关度长尾）属于结构性限制而非系统性失败，有明确改进路径
- 运维工具链（启动/停止/健康检查/备份/回滚）已从文档层进入可执行层
- 当前结论为 `Conditional Go`，允许在 L1-only 范围内、严格约束下进入小批量人工观察试点
