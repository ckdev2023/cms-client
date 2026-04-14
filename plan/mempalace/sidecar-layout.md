# MemPalace Sidecar 目录结构与职责边界（冻结版）

## 1. 目标

把 `deployment-topology.md` 和 `environment-strategy.md` 中"推荐"的 sidecar 目录结构收口为冻结定义，消除歧义，为后续 sidecar 实现、runbook 执行和健康检查提供单一真源。

本文冻结后，任何对 sidecar 目录结构的变更都必须先更新本文并通过审阅，不允许在实现或运维中临时新增目录。

## 2. 冻结的目录树

```text
$HOME/
├── .mempalace/
│   └── cms-client/                         # sidecar 根目录
│       ├── runtime/
│       │   ├── releases/
│       │   │   └── <release-id>/           # 每个 release 的独立 Python 虚拟环境
│       │   │       ├── venv/               # Python 虚拟环境目录
│       │   │       ├── requirements.txt    # 锁定的依赖清单
│       │   │       └── release-manifest.json
│       │   └── current -> releases/<release-id>  # 指向生效 release 的符号链接
│       ├── data/
│       │   ├── chroma/                     # Chroma 持久化数据
│       │   └── baselines/                  # 批次与 run 基线主记录
│       └── logs/
│           ├── index/                      # 索引操作日志
│           └── service/                    # sidecar 服务运行日志
└── .mempalace-backups/
    └── cms-client/                         # 备份根目录
        └── <data_snapshot_id>/             # 每个恢复点独立目录
            ├── data/                       # 活动 data/ 的完整副本
            ├── current-release.txt         # 备份时 runtime/current 的指向
            └── snapshot-manifest.json      # 快照元数据
```

## 3. 各目录的冻结定义

### 3.1 sidecar 根目录

| 属性 | 值 |
|---|---|
| 路径 | `$HOME/.mempalace/cms-client/` |
| 归属 | sidecar 整体 |
| 可否删除重建 | 可以，但 data/ 和 backups/ 需要按恢复流程处理 |

约束：
- 根目录只包含 `runtime/`、`data/`、`logs/` 三个子目录，不允许在根目录下直接放置文件。
- 不允许在根目录下新增未定义的子目录。

### 3.2 runtime/

| 属性 | 值 |
|---|---|
| 路径 | `$HOME/.mempalace/cms-client/runtime/` |
| 归属 | sidecar 运行环境 |
| 可否删除重建 | 可以，整目录可重建 |

子结构：

| 子目录 / 文件 | 用途 |
|---|---|
| `releases/<release-id>/` | 每个 release 版本的独立 Python 虚拟环境和依赖清单 |
| `releases/<release-id>/venv/` | Python 虚拟环境 |
| `releases/<release-id>/requirements.txt` | 该 release 的锁定依赖清单 |
| `releases/<release-id>/release-manifest.json` | 该 release 的版本记录（见 §4） |
| `current` | 符号链接，指向 `releases/` 下当前生效的 release 目录 |

约束：
- 不把知识库数据、日志、备份混放到 `runtime/`。
- 不在旧 release 目录上原地升级；每次升级创建新的 release 目录。
- `current` 只能指向 `releases/` 下的目录，不允许指向外部路径。
- `releases/` 下只保留 `<release-id>/` 形式的子目录，不允许散放文件。

### 3.3 data/

| 属性 | 值 |
|---|---|
| 路径 | `$HOME/.mempalace/cms-client/data/` |
| 归属 | sidecar 索引与检索状态 |
| 可否删除重建 | 可以，删除后需从 backups/ 恢复或全量重建 |

子结构：

| 子目录 | 用途 |
|---|---|
| `chroma/` | Chroma `PersistentClient(path=...)` 的持久化数据目录 |
| `baselines/` | 批次与 run 基线主记录（JSON 格式） |

约束：
- 只接受 sidecar 进程写入，不接受主仓库或手动直接写入。
- 不把日志、备份、运行环境混放到 `data/`。
- 数据损坏时允许通过 backups/ 恢复或全量重建替换。
- 不进入 git，不挂入 `npm` 产物链。

### 3.4 logs/

| 属性 | 值 |
|---|---|
| 路径 | `$HOME/.mempalace/cms-client/logs/` |
| 归属 | sidecar 排障与操作记录 |
| 可否删除重建 | 可以，按策略清理 |

子结构：

| 子目录 | 用途 |
|---|---|
| `index/` | 全量索引、增量更新、批次执行的操作日志 |
| `service/` | sidecar 进程启动、健康检查、检索服务运行日志 |

约束：
- 日志与数据分离，清理日志不得误删索引数据。
- 日志膨胀或轮转失败只影响排障能力，不阻塞主系统。
- 回滚时保留失败日志，不覆盖、不清空。

### 3.5 备份根目录

| 属性 | 值 |
|---|---|
| 路径 | `$HOME/.mempalace-backups/cms-client/` |
| 归属 | sidecar 恢复点 |
| 可否删除重建 | 不应与活动数据目录一起删除 |

子结构：

| 子目录 / 文件 | 用途 |
|---|---|
| `<data_snapshot_id>/` | 每个恢复点独立目录 |
| `<data_snapshot_id>/data/` | 活动 `data/` 的完整副本 |
| `<data_snapshot_id>/current-release.txt` | 备份时 `runtime/current` 实际指向的 release 路径 |
| `<data_snapshot_id>/snapshot-manifest.json` | 快照元数据（见 §4） |

约束：
- 备份目录与活动数据目录物理分离（不同的一级隐藏目录），避免单点删除同时损坏运行态和备份态。
- 备份目录只存放恢复点，不存放运行态文件。
- 每个 `<data_snapshot_id>/` 必须自包含，可独立移走或恢复。

## 4. 冻结的元数据文件格式

### 4.1 release-manifest.json

每个 release 目录下必须包含该文件，最小字段：

```json
{
  "release_id": "mempalace-0.1.0-py3.11.11",
  "mempalace_version": "0.1.0",
  "python_version": "3.11.11",
  "chroma_version": "1.5.7",
  "installed_at": "2026-04-12T10:30:00+09:00",
  "installed_by": "local-operator"
}
```

### 4.2 snapshot-manifest.json

每个备份恢复点目录下必须包含该文件，最小字段：

```json
{
  "data_snapshot_id": "backup-20260412-103000-prechange",
  "release_id": "mempalace-0.1.0-py3.11.11",
  "captured_at": "2026-04-12T10:30:00+09:00",
  "captured_by": "local-operator",
  "reason": "pre-upgrade"
}
```

## 5. release-id 命名规则

格式：`mempalace-<mempalace_version>-py<python_version>`

示例：`mempalace-0.1.0-py3.11.11`

约束：
- 只使用 ASCII 小写字母、数字、短横线和点号。
- mempalace_version 和 python_version 必须与 `environment-strategy.md` 基线一致。
- 一个 release-id 唯一绑定一组 mempalace_version + python_version + 锁定的 Python 依赖。

## 6. data_snapshot_id 命名规则

格式：`backup-<YYYYMMDD>-<HHMMSS>-<reason>`

示例：`backup-20260412-103000-prechange`

约束：
- reason 使用 `kebab-case`，限制在 32 字符以内。
- 允许的 reason 枚举：`prechange`、`pre-upgrade`、`pre-rebuild`、`pre-update`、`pre-rollback`、`manual`。

## 7. 职责边界矩阵

| 路径 | 谁创建 | 谁写入 | 谁读取 | 谁删除 |
|---|---|---|---|---|
| `runtime/releases/<id>/` | sidecar 安装流程 | sidecar 安装流程 | sidecar 进程 | 人工清理（观察周期后） |
| `runtime/current` | sidecar 安装/切换流程 | sidecar 安装/切换/回滚流程 | sidecar 进程、runbook 检查 | 不删除，只切换指向 |
| `data/chroma/` | sidecar 索引流程 | sidecar 索引/检索进程 | sidecar 检索进程 | 全量重建或恢复时替换 |
| `data/baselines/` | sidecar 索引流程 | sidecar 索引流程 | sidecar、人工审阅 | 不主动删除 |
| `logs/index/` | sidecar 索引流程 | sidecar 索引流程 | 人工排障 | 按轮转策略清理 |
| `logs/service/` | sidecar 服务进程 | sidecar 服务进程 | 人工排障 | 按轮转策略清理 |
| `backups/<id>/` | runbook 备份流程 | runbook 备份流程 | runbook 恢复流程 | 人工清理（保留至少最近 2 个） |

## 8. 与主仓库的硬边界

以下约束从 `deployment-topology.md` §6 继承并冻结：

1. 不修改仓库根 `package.json` 来承载 sidecar 启停。
2. 不要求 `npm install`、`npm run dev`、`npm run guard` 依赖 sidecar 正常运行。
3. 不把 sidecar 运行状态写回业务文档目录。
4. 主系统页面、构建链和测试链不能因 sidecar 宕机而失败。
5. sidecar 只读取知识源目录（`P0/`、`P1/`、`docs/事务所流程/`），不进入真实客户正式业务数据目录。
6. 仓库内只保留方案和接入文档（`plan/mempalace/`），不保留 sidecar 运行数据、日志、备份和 PID 文件。

## 9. 目录存在性检查脚本

以下命令可用于验证 sidecar 目录结构是否符合冻结定义：

```bash
SIDECAR_ROOT="$HOME/.mempalace/cms-client"
BACKUP_ROOT="$HOME/.mempalace-backups/cms-client"

check_dir() { [ -d "$1" ] && echo "OK: $1" || echo "MISSING: $1"; }
check_link() { [ -L "$1" ] && echo "OK: $1 -> $(readlink "$1")" || echo "MISSING/NOT-LINK: $1"; }

check_dir "$SIDECAR_ROOT/runtime/releases"
check_link "$SIDECAR_ROOT/runtime/current"
check_dir "$SIDECAR_ROOT/data/chroma"
check_dir "$SIDECAR_ROOT/data/baselines"
check_dir "$SIDECAR_ROOT/logs/index"
check_dir "$SIDECAR_ROOT/logs/service"
check_dir "$BACKUP_ROOT"

CURRENT_RELEASE="$(readlink "$SIDECAR_ROOT/runtime/current" 2>/dev/null)"
if [ -n "$CURRENT_RELEASE" ] && [ -f "$CURRENT_RELEASE/release-manifest.json" ]; then
  echo "OK: release-manifest.json exists"
else
  echo "MISSING: release-manifest.json in current release"
fi
```

## 10. 不变量

1. sidecar 根目录恒定为 `$HOME/.mempalace/cms-client/`。
2. 备份根目录恒定为 `$HOME/.mempalace-backups/cms-client/`。
3. `runtime/current` 在任何时刻只指向 `runtime/releases/` 下的一个 release 目录。
4. 每个 release 目录必须包含 `release-manifest.json`。
5. 每个备份恢复点目录必须包含 `snapshot-manifest.json`。
6. `data/` 只接受 sidecar 进程写入。
7. `logs/` 与 `data/` 不混放。
8. 活动目录（`.mempalace/`）与备份目录（`.mempalace-backups/`）物理分离。
9. 仓库内（`plan/mempalace/`）不保留任何 sidecar 运行态产物。

## 11. 直接依据

- `plan/mempalace/deployment-topology.md`
- `plan/mempalace/environment-strategy.md`
- `plan/mempalace/runbook.md`
- `plan/mempalace/index-baseline-plan.md`
