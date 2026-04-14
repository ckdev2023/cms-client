# MemPalace Deployment Topology

## 1. 目标

冻结 `MemPalace` 第一期 sidecar 运行拓扑，明确其与 `cms-client` 主仓库的隔离边界，以及运行、数据、日志、备份目录的归属方式。

## 2. 总体原则

- `MemPalace` 作为 sidecar 独立运行，不并入 `cms-client` 的 `npm` 主工作流。
- `cms-client` 仓库只提供只读知识源，不承担 sidecar 的运行时状态。
- 运行目录、数据目录、日志目录、备份目录相互分离，便于故障定位和恢复。
- sidecar 故障只能影响检索增强能力，不能阻塞主系统开发、构建、测试或页面运行。

## 3. 拓扑概览

### 3.1 逻辑关系

```text
cms-client repo (source of truth for documents)
  ├─ docs/gyoseishoshi_saas_md/P0/
  ├─ docs/gyoseishoshi_saas_md/P1/
  ├─ docs/事务所流程/
  └─ plan/mempalace/*.md
            │
            │ read-only ingest / re-index
            ▼
MemPalace sidecar
  ├─ runtime/
  ├─ data/
  ├─ logs/
  └─ backups/
```

### 3.2 边界定义

- 业务仓库：保存需求、流程、计划和未来接入说明，不保存 sidecar 运行状态。
- Sidecar：独立负责索引、检索、本地服务进程和恢复流程。
- 客户端或 AI 侧：未来通过只读接入使用检索结果，但不反向依赖主仓库的 `npm` 生命周期。

## 4. 推荐目录布局

### 4.1 仓库内目录

仓库内只保留方案和接入文档：

- `plan/mempalace/`：治理、taxonomy、环境、runbook 等权威规划文档。
- 不在仓库内新建 sidecar 运行数据目录。
- 不在仓库内落日志、索引数据库、备份包和 PID 文件。

### 4.2 仓库外 sidecar 根目录

推荐以仓库为单位使用独立 sidecar 根目录：

`$HOME/.mempalace/cms-client/`

该目录下只放 sidecar 自身的可重建产物和运行产物。

### 4.3 运行目录

推荐路径：

`$HOME/.mempalace/cms-client/runtime/`

用途：

- sidecar 可执行环境或虚拟环境
- 启动配置副本或生成配置
- 临时文件、锁文件、PID 文件

约束：

- 运行目录可整体重建，不视为长期资产。
- 不把知识库数据和日志混放到 `runtime/`。

### 4.4 数据目录

推荐路径：

`$HOME/.mempalace/cms-client/data/`

用途：

- 向量库、索引元数据、分片、增量状态
- 与首轮和后续补跑相关的 sidecar 持久化数据

约束：

- 数据目录不进入 git，不挂入 `npm` 产物链。
- 数据目录只接受 sidecar 写入，不接受业务主系统写入。
- 数据损坏时允许通过备份恢复或全量重建替换。

### 4.5 日志目录

推荐路径：

`$HOME/.mempalace/cms-client/logs/`

用途：

- sidecar 启动日志
- 全量索引、增量更新、检索服务日志
- 恢复与回滚操作日志

约束：

- 日志与数据分离，避免清理日志时误删索引数据。
- 日志轮转或清理只影响排障，不影响主系统运行。

### 4.6 备份目录

推荐路径：

`$HOME/.mempalace-backups/cms-client/`

用途：

- 数据目录快照
- 环境与配置快照
- 恢复点清单

约束：

- 备份目录与活动数据目录分离，避免单点删除同时损坏运行态和备份态。
- 备份目录优先设计为可迁移、可复制、可离机保存。

## 5. 目录归属与责任

| 目录 | 推荐位置 | 责任归属 | 可否删除重建 |
|---|---|---|---|
| 运行目录 | `$HOME/.mempalace/cms-client/runtime/` | sidecar 运行环境 | 可以 |
| 数据目录 | `$HOME/.mempalace/cms-client/data/` | sidecar 索引与检索状态 | 可以，删除后需重建或恢复 |
| 日志目录 | `$HOME/.mempalace/cms-client/logs/` | sidecar 排障与操作记录 | 可以，按策略清理 |
| 备份目录 | `$HOME/.mempalace-backups/cms-client/` | sidecar 恢复点 | 不应与运行目录一起删除 |

## 6. 与主系统的隔离关系

必须保持以下硬边界：

1. 不修改仓库根 `package.json` 来承载 sidecar 启停。
2. 不要求 `npm install`、`npm run dev`、`npm run guard` 依赖 sidecar 正常运行。
3. 不把 sidecar 运行状态写回业务文档目录。
4. 主系统页面、构建链和测试链不能因 sidecar 宕机而失败。
5. sidecar 只能读取知识源目录，不进入真实客户正式业务数据目录。

## 7. 最小故障隔离原则

### 7.1 进程故障

- sidecar 进程退出时，只丢失检索增强能力。
- `cms-client` 的前端开发、测试、文档维护和 git 工作流继续可用。

### 7.2 数据故障

- 索引损坏只影响 `data/`，恢复动作优先从 `backups/` 执行。
- 如无法恢复，允许删除 `data/` 后按后续 runbook 执行全量重建。

### 7.3 日志故障

- 日志膨胀或轮转失败只影响排障能力，不应拖垮业务仓库或主系统命令链。

### 7.4 仓库变更故障

- 仓库中文档更新可能触发重建需求，但不会直接破坏 sidecar 目录结构。
- sidecar 不应通过自动钩子绑进仓库的每次 `npm` 或 git 动作。

## 8. 第一期允许的最小落地方式

- 源目录从仓库中只读读取：`P0/`、`P1/`、`docs/事务所流程/`。
- sidecar 独立手动启动或由独立脚本启动。
- 运行、数据、日志、备份全部放在仓库外。

## 9. 当前结论

- `MemPalace` 采用“仓库内存文档，仓库外跑 sidecar”的拓扑。
- 数据目录归属于 sidecar，不归属业务主系统。
- 备份目录独立于活动数据目录，确保可恢复且不污染主仓库。
- 第一期任何 sidecar 故障都不应阻塞 `cms-client` 主流程。
