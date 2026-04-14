# MemPalace Environment & Version Strategy

## 1. 目标

冻结 `MemPalace` 第一期 sidecar 的 Python 环境、`Chroma` 依赖和 `MemPalace` 自身版本策略，确保安装、升级、回退都可独立执行，且不污染 `cms-client` 主仓库的 `npm` 工作流。

## 2. 固定前提

- `MemPalace` 是仓库外独立 sidecar，不并入 `cms-client` 的 `package.json`、`node_modules`、`npm install` 或 `npm run guard`。
- Python 环境、向量库依赖和 sidecar 自身版本必须一起管理，不能分别“随手升级”。
- 第一期优先选择保守、可复现、可回退的本地单机方案，不追求自动化平台或多环境编排。
- 升级前必须先生成可恢复点；回退路径必须比升级路径更清晰。

## 3. 版本基线

### 3.1 基线选择

| 组件 | 基线 | 钉住方式 | 说明 |
|---|---|---|---|
| Python | `3.11.x` | 钉到小版本线，例如 `3.11.11` | 采用保守稳定线，独立于业务仓库 Node 版本；不追最新大版本 |
| Chroma | `1.5.x` | 首次落地固定到具体 patch，例如 `1.5.7` | 当前公开安装口径稳定，且支持本地 `PersistentClient(path=...)` 持久化 |
| MemPalace | `0.1.x` | 自身发布号单独递增，例如 `0.1.0`、`0.1.1` | 代表 sidecar 方案/代码本身，不等同于业务仓库版本 |

### 3.2 为什么采用该基线

- Python 基线必须独立于业务仓库包管理；`cms-client` 的前端依赖链不能反向决定 sidecar Python 版本。
- `Chroma` 首期只采用本地持久化用法，不引入远程托管、集群或额外服务编排。
- `MemPalace` 作为内部 sidecar，自身版本要能描述“同一份代码 + 同一组依赖 + 同一组配置模板”的可回放组合。

## 4. 版本钉住规则

### 4.1 Python

- Python 只允许在同一 minor 线内打补丁：`3.11.x -> 3.11.y`。
- 第一期禁止在无实机验证前跨 minor 升级，如 `3.11 -> 3.12`。
- 环境目录与解释器路径必须固定指向 sidecar 自身运行目录，不复用系统 Python 或业务仓库工具链。

### 4.2 Chroma 与 Python 依赖

- `Chroma` 与其直接依赖必须写入 sidecar 自己的 Python 依赖清单，不进入 `package.json`。
- 首期使用“精确 patch 钉住”策略：`chromadb==1.5.7` 这类固定版本，而不是 `^1.5` 或 `>=1.5`。
- 若未来引入嵌入、分词或其他 Python 包，也必须和 `Chroma` 一起写入同一锁定清单，不允许手工逐包漂移。

### 4.3 MemPalace 自身版本

- 每次可发布变更都必须对应一个 `MemPalace` 版本号。
- 一个 `MemPalace` 版本必须唯一绑定：
  - 一条 Python 基线
  - 一组锁定后的 Python 依赖
  - 一套可识别的运行配置模板
- 仅变更文档不需要提升 sidecar 版本；只在影响环境、依赖、运行方式或数据兼容性时提升版本。

## 5. 环境目录策略

延续 `W07` 的仓库外 sidecar 根目录：

`$HOME/.mempalace/cms-client/`

推荐在 `runtime/` 下再分 release 级目录：

```text
$HOME/.mempalace/cms-client/
  runtime/
    releases/
      mempalace-0.1.0-py3.11.11/
      mempalace-0.1.1-py3.11.11/
    current -> releases/mempalace-0.1.0-py3.11.11
  data/
  logs/
  backups/
```

约束：

- `runtime/releases/*` 保存每个 sidecar 版本对应的独立 Python 环境。
- `runtime/current` 只指向当前生效版本，便于切换和回退。
- `data/`、`logs/`、`backups/` 不跟随每次发布重复复制，但升级前必须先生成对应快照。

## 6. 安装策略

### 6.1 首次安装

首次安装按以下顺序执行：

1. 准备独立 Python 解释器，固定到选定的 `3.11.x`。
2. 在 `runtime/releases/<release-id>/` 下创建独立虚拟环境。
3. 仅通过 sidecar 自己的依赖清单安装 `Chroma` 与其他 Python 包。
4. 初始化 `data/`、`logs/`、`backups/` 目录，但不在业务仓库内落运行文件。
5. 记录一份安装清单，至少包含：`MemPalace` 版本、Python 版本、`Chroma` 版本、安装时间、操作者。

### 6.2 依赖清单形式

第一个可执行实现落地时，推荐采用以下思路之一：

- `pyproject.toml` + 独立锁文件
- 或 `requirements.txt` + 锁定导出文件

约束：

- 依赖清单属于 sidecar 自己，不属于 `cms-client` 主包管理。
- 不在业务仓库根目录追加 Python 包安装说明来驱动 sidecar。
- 不依赖开发者全局 Python 包状态作为运行前提。

## 7. 升级策略

### 7.1 允许的升级类型

| 升级类型 | 是否允许 | 条件 |
|---|---|---|
| Python patch 升级（`3.11.x -> 3.11.y`） | 允许 | 先备份、先在新 release 环境验证、失败可切回旧环境 |
| Python minor 升级（`3.11 -> 3.12`） | 暂不默认允许 | 需要单独验证任务，不纳入首期常规升级 |
| Chroma patch/minor within frozen line（`1.5.x -> 1.5.y`） | 允许 | 需要先备份数据并验证持久化目录可正常重启读取 |
| Chroma major 升级 | 暂不默认允许 | 需要单独兼容性评审和回滚演练 |
| MemPalace patch 升级（`0.1.0 -> 0.1.1`） | 允许 | 不破坏数据目录结构和回退路径 |
| MemPalace minor 升级（`0.1.x -> 0.2.0`） | 谨慎允许 | 必须明确兼容范围、备份点和回退说明 |

### 7.2 升级步骤

每次升级固定按以下顺序：

1. 冻结当前版本信息：记录当前 `MemPalace` / Python / `Chroma` 版本。
2. 生成恢复点：备份 `data/`，必要时附带运行配置快照。
3. 新建一个新的 `runtime/releases/<new-release-id>/`，不要原地覆盖旧环境。
4. 在新环境安装目标 Python 依赖版本。
5. 以同一份 `data/` 做最小启动验证：能启动、能读取持久化目录、能执行基本健康检查。
6. 仅在验证通过后，将 `runtime/current` 切到新 release。
7. 保留旧 release，直到至少完成一次稳定运行观察周期后再清理。

### 7.3 升级时禁止事项

- 不允许在原有虚拟环境里直接 `pip install -U` 后继续运行。
- 不允许升级前不备份 `data/` 就迁移 `Chroma` 版本。
- 不允许把 sidecar 升级绑进 `npm install`、git hooks、CI 或主系统启动链。
- 不允许一次同时跨越 Python minor、`Chroma` major 和 `MemPalace` minor，多变量同时变化会破坏回退可读性。

## 8. 回退策略

### 8.1 回退触发条件

出现以下任一情况，应优先执行回退而不是继续修补：

- sidecar 无法正常启动或健康检查失败
- 新版本无法读取既有持久化数据
- 升级后出现索引损坏、集合不可见或持久化目录异常
- 检索结果质量明显劣化，且可定位为本次版本升级引入
- 运行日志出现持续性错误，短时间内无法通过配置修正收敛

### 8.2 回退步骤

1. 停止当前新版本 sidecar。
2. 将 `runtime/current` 切回上一已知稳定 release。
3. 如新版本已写坏活动数据目录，则用升级前备份恢复 `data/`。
4. 保留失败版本的日志与环境目录，供后续排障，不直接覆盖。
5. 记录本次回退原因、时间、影响范围和恢复点标识。

### 8.3 回退后的处理

- 回退成功后，禁止在同一问题未定位前重复升级。
- 若问题来自数据兼容性，应优先冻结在旧版本线，等待单独验证任务。
- 若问题来自 `MemPalace` 自身变更，应发布新的修复版本，而不是覆盖失败版本标签。

## 9. 最小版本记录协议

每个活动 release 至少记录以下信息：

| 字段 | 示例 |
|---|---|
| `mempalace_version` | `0.1.0` |
| `python_version` | `3.11.11` |
| `chroma_version` | `1.5.7` |
| `release_id` | `mempalace-0.1.0-py3.11.11` |
| `data_snapshot_id` | `backup-2026-04-12-initial` |
| `installed_at` | `2026-04-12T10:30:00+09:00` |
| `installed_by` | `local-operator` |

这份记录可以是后续 runbook 中的 release manifest，但不得混入业务仓库主包管理文件。

## 10. 与业务仓库的隔离要求

必须保持以下硬边界：

1. 不修改仓库根 `package.json`、`package-lock.json` 来安装或升级 sidecar Python 依赖。
2. 不要求开发者先完成 sidecar 安装，才能执行 `cms-client` 的前端开发、测试和 guard。
3. sidecar 的 Python 依赖清单与锁文件只服务 sidecar 自身，不服务业务仓库。
4. sidecar 的升级、回退、备份和恢复操作只影响仓库外目录，不回写业务文档目录。

## 11. 第一期收敛结论

- 第一期采用“独立 Python 3.11.x 环境 + 固定 `Chroma 1.5.x` patch + `MemPalace 0.1.x` 自身版本”的保守策略。
- 安装使用 release 目录方式，不在旧环境上原地升级。
- 升级先备份、先验活，再切换；失败优先回退，不现场硬修。
- sidecar 版本管理独立于 `cms-client` 的 `npm` 依赖管理。

## 12. 直接依据

- `plan/tasks/MP-W08-environment-strategy.md`
- `plan/mempalace/deployment-topology.md`
- `plan/mempalace/source-priority.md`
- Chroma 当前公开安装与本地持久化口径：`pip install chromadb` / `uv pip install chromadb` / `chromadb.PersistentClient(path=...)`
- 当前公开 Python 包元数据口径：`chromadb` 现行为 `Python >=3.9`，因此首期采用更保守的 `3.11.x` 固定线
