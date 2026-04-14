# MemPalace Release ID 规范与 runtime/current 切换规则

## 1. 目标

冻结 `MemPalace` sidecar 的 `release_id` 命名格式、首个 release 基线、`runtime/current` 符号链接切换规则和 release 生命周期管理，作为安装、升级、回滚和 runbook 的唯一 release 管理真源。

## 2. 冻结状态

| 字段 | 值 |
|---|---|
| `strategy_version` | `v1.0.0` |
| `frozen_at` | `2026-04-12` |
| `first_release_id` | `mempalace-0.1.0-py3.11.15` |

## 3. release_id 命名规范

### 3.1 格式

```
mempalace-<mempalace_version>-py<python_version>
```

| 组成部分 | 格式 | 示例 |
|---|---|---|
| 前缀 | 固定 `mempalace-` | `mempalace-` |
| `mempalace_version` | semver：`MAJOR.MINOR.PATCH` | `0.1.0` |
| 分隔符 | 固定 `-py` | `-py` |
| `python_version` | `MAJOR.MINOR.PATCH` | `3.11.15` |

### 3.2 示例

| release_id | MemPalace 版本 | Python 版本 |
|---|---|---|
| `mempalace-0.1.0-py3.11.15` | `0.1.0` | `3.11.15` |
| `mempalace-0.1.1-py3.11.15` | `0.1.1` | `3.11.15` |
| `mempalace-0.2.0-py3.11.16` | `0.2.0` | `3.11.16` |

### 3.3 约束

1. release_id 只使用 ASCII 小写字母、数字、短横线和点号。
2. 一个 release_id 唯一绑定一个 MemPalace 版本和一个 Python 版本。
3. Chroma 版本不编入 release_id，但必须记录在 `release-manifest.json` 中。
4. release_id 一经创建不可修改语义；若需调整版本组合，必须新建 release_id。

### 3.4 为什么不把 Chroma 版本编入 release_id

- release_id 需要用作目录名和符号链接目标，过长会降低可读性。
- Chroma 版本通过 `requirements.txt` 和 `release-manifest.json` 精确锁定，不会漂移。
- 真正需要区分的运行环境维度是"MemPalace 代码版本 + Python 解释器版本"。

## 4. 首个 release 基线

| 字段 | 值 |
|---|---|
| `release_id` | `mempalace-0.1.0-py3.11.15` |
| `mempalace_version` | `0.1.0` |
| `python_version` | `3.11.15` |
| `chroma_version` | `1.5.7` |
| `status` | `planned` |

该 release 对应目录：

```
$HOME/.mempalace/cms-client/runtime/releases/mempalace-0.1.0-py3.11.15/
```

## 5. release-manifest.json 规范

每个 release 目录下必须包含一份 `release-manifest.json`，记录该 release 的完整元数据。

### 5.1 必填字段

```json
{
  "release_id": "mempalace-0.1.0-py3.11.15",
  "mempalace_version": "0.1.0",
  "python_version": "3.11.15",
  "chroma_version": "1.5.7",
  "manifest_version": "v0.1.0",
  "installed_at": "2026-04-12T10:30:00+09:00",
  "installed_by": "local-operator",
  "status": "active",
  "predecessor": null,
  "notes": "首个 release，Phase 1 L1 只读检索"
}
```

### 5.2 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `release_id` | string | 本 release 的唯一标识 |
| `mempalace_version` | string | MemPalace sidecar 代码版本 |
| `python_version` | string | Python 解释器精确版本 |
| `chroma_version` | string | chromadb 包精确版本 |
| `manifest_version` | string | 使用的 ingestion manifest 版本 |
| `installed_at` | string (ISO 8601) | 安装完成时间 |
| `installed_by` | string | 操作者标识 |
| `status` | enum | `planned` / `active` / `superseded` / `failed` / `deprecated` |
| `predecessor` | string \| null | 上一个 release_id（首个为 null） |
| `notes` | string | 备注 |

### 5.3 status 状态流转

```text
planned → active → superseded
planned → failed
active → deprecated（跳过 superseded，直接废弃）
```

| 状态 | 含义 |
|---|---|
| `planned` | 已创建目录和环境，尚未切入 current |
| `active` | 当前 `runtime/current` 指向此 release |
| `superseded` | 已被更新版本替代，保留用于回滚 |
| `failed` | 安装或验证失败，不可使用 |
| `deprecated` | 已确认不再需要，可清理 |

不变量：任何时刻最多只有一个 release 处于 `active` 状态。

## 6. runtime/current 切换规则

### 6.1 符号链接定义

`runtime/current` 是一个指向 `runtime/releases/<release_id>/` 的符号链接。

```bash
$HOME/.mempalace/cms-client/runtime/current -> releases/mempalace-0.1.0-py3.11.15
```

### 6.2 切换时机

只有以下操作允许修改 `runtime/current`：

| 操作 | 方向 | 条件 |
|---|---|---|
| 首次安装 | 无 → 新 release | 新 release 通过健康检查 |
| 升级 | 旧 release → 新 release | 新 release 安装完成并通过健康检查 |
| 回滚 | 当前失败 release → 上一稳定 release | 当前 release 健康检查失败或数据损坏 |

### 6.3 切换步骤（升级）

1. 在 `runtime/releases/` 下创建新 release 目录并完成安装。
2. 更新新 release 的 `release-manifest.json`，status 设为 `planned`。
3. 以新 release 环境对现有 `data/` 执行最小健康检查。
4. 健康检查通过后：
   - 将旧 release 的 status 更新为 `superseded`。
   - 将新 release 的 status 更新为 `active`。
   - 更新符号链接：`ln -sfn releases/<new_release_id> runtime/current`。
5. 健康检查失败时：
   - 将新 release 的 status 更新为 `failed`。
   - `runtime/current` 不变。
   - 保留失败 release 目录和日志用于排障。

### 6.4 切换步骤（回滚）

1. 停止当前 sidecar 进程。
2. 确认目标回滚 release 目录存在且完整。
3. 更新符号链接：`ln -sfn releases/<stable_release_id> runtime/current`。
4. 如需恢复数据，从备份快照恢复 `data/`。
5. 用目标 release 环境执行健康检查。
6. 更新两个 release 的 status（当前 → `failed` 或 `deprecated`，目标 → `active`）。

### 6.5 切换禁止事项

1. 不得指向 `runtime/releases/` 之外的目录。
2. 不得指向不存在的 release 目录。
3. 不得在健康检查未通过时切入新 release（首次安装除外，首次无旧环境可对比）。
4. 不得通过直接修改旧 release 内文件来"升级"，必须新建 release。
5. 不得在未备份 `data/` 的情况下执行 release 切换。

## 7. release 清理策略

### 7.1 保留规则

| 状态 | 保留策略 |
|---|---|
| `active` | 永久保留 |
| `superseded` | 至少保留到下一次稳定运行观察周期结束 |
| `failed` | 保留日志和环境用于排障，排障完成后可清理 |
| `deprecated` | 可安全删除 |

### 7.2 清理步骤

1. 确认目标 release 不是 `active` 且不是最近一次 `superseded`。
2. 确认 `runtime/current` 未指向该 release。
3. 删除 `runtime/releases/<release_id>/` 目录。
4. 在操作日志中记录清理动作。

## 8. 版本提升触发规则

| 变更类型 | 提升维度 | 示例 |
|---|---|---|
| 修复 bug、调整配置模板 | MemPalace PATCH | `0.1.0` → `0.1.1` |
| 新增 MCP 工具、变更索引策略 | MemPalace MINOR | `0.1.x` → `0.2.0` |
| 不兼容的数据格式或 API 变更 | MemPalace MAJOR | `0.x.y` → `1.0.0` |
| Python patch 升级 | Python 版本段 | `-py3.11.11` → `-py3.11.12` |
| 仅变更文档 | 不提升 release | 无需新 release |

不变量：每次 release_id 变更，都必须新建 release 目录，不得原地覆盖。

## 9. 与其他文档的关系

| 文档 | 关系 |
|---|---|
| `sidecar-layout.md` | 本文定义的 release 目录位于 `sidecar-layout.md` 冻结的 `runtime/releases/` 下 |
| `environment-strategy.md` | 版本基线、升级/回退策略由该文档定义；本文补齐 release_id 格式和切换操作 |
| `runbook.md` | runbook 中的升级、回滚步骤引用本文的切换规则 |
| `python-env.md` | Python 与 Chroma 版本锁定细节由该文档定义 |

## 10. 直接依据

- `plan/mempalace/environment-strategy.md`（§5 环境目录策略、§9 最小版本记录协议）
- `plan/mempalace/deployment-topology.md`（§4.3 运行目录）
- `plan/mempalace/sidecar-layout.md`（§4.2 runtime/）
- `plan/mempalace/runbook.md`（§9 回滚流程、§7 操作前统一检查）
