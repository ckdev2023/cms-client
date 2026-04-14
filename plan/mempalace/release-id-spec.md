# MemPalace Release ID 规范与 runtime/current 切换规则

## 1. 目标

冻结 `release_id` 的命名格式、首个 release 的具体值、`runtime/current` 的切换协议和回退规则，使 runbook、index-baseline、go-no-go 评审中引用的 `release_id` 都有唯一且可执行的定义。

## 2. release_id 命名格式

### 2.1 格式定义

```
release_id = "mempalace-" + <mempalace_version> + "-py" + <python_version>
```

三段含义：

| 段 | 来源 | 示例 |
|---|---|---|
| `mempalace-` | 固定前缀 | `mempalace-` |
| `<mempalace_version>` | sidecar 自身语义化版本（`MAJOR.MINOR.PATCH`） | `0.1.0` |
| `-py<python_version>` | 绑定的 Python 解释器版本 | `-py3.11.11` |

### 2.2 格式约束

1. 只使用 ASCII 小写字母、数字、短横线和点号。
2. 不嵌入时间戳、机器名或随机后缀。
3. 同一组 `(mempalace_version, python_version)` 只能产生唯一的 `release_id`。
4. 若需要区分同一版本的多次安装尝试，通过 runbook 操作记录的 `operation_id` 区分，不修改 `release_id`。

### 2.3 版本号递增规则

| 变更类型 | 版本字段 | 示例 |
|---|---|---|
| 配置变更、bug 修复、脚本调整 | PATCH | `0.1.0` → `0.1.1` |
| 新增索引策略、MCP 工具、切块方式 | MINOR | `0.1.x` → `0.2.0` |
| 数据格式不兼容、Python 大版本跨越 | MAJOR | `0.x.y` → `1.0.0` |

Python 版本变更（如 `3.11.11` → `3.11.12`）本身不影响 `mempalace_version`，但会产生新的 `release_id`（因为 `py` 段变化）。

## 3. 首个 release_id

### 3.1 冻结值

```
release_id = mempalace-0.1.0-py3.11.11
```

### 3.2 对应版本基线

| 字段 | 值 |
|---|---|
| `mempalace_version` | `0.1.0` |
| `python_version` | `3.11.11` |
| `chroma_version` | `1.5.7` |
| `release_id` | `mempalace-0.1.0-py3.11.11` |

### 3.3 目录映射

```
$HOME/.mempalace/cms-client/runtime/releases/mempalace-0.1.0-py3.11.11/
```

## 4. release-manifest.json

每个 release 目录下必须包含一份 `release-manifest.json`，记录该 release 的完整身份信息。

### 4.1 最小字段

```json
{
  "release_id": "mempalace-0.1.0-py3.11.11",
  "mempalace_version": "0.1.0",
  "python_version": "3.11.11",
  "chroma_version": "1.5.7",
  "installed_at": "2026-04-12T10:30:00+09:00",
  "installed_by": "local-operator",
  "status": "active"
}
```

### 4.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `release_id` | string | 是 | 必须与目录名一致 |
| `mempalace_version` | string | 是 | sidecar 自身版本 |
| `python_version` | string | 是 | 精确到 patch 的 Python 版本 |
| `chroma_version` | string | 是 | 精确到 patch 的 Chroma 版本 |
| `installed_at` | string (ISO 8601) | 是 | 安装完成时间 |
| `installed_by` | string | 是 | 操作者标识 |
| `status` | enum | 是 | `active` / `superseded` / `failed` |

### 4.3 status 枚举

| 值 | 含义 |
|---|---|
| `active` | 当前正在使用或可用于切换 |
| `superseded` | 已被更新版本替代，保留用于回退 |
| `failed` | 安装或验证失败，保留用于排障 |

## 5. runtime/current 切换协议

### 5.1 current 的定义

`runtime/current` 是一个符号链接，指向 `runtime/releases/` 下的某个 release 目录。所有 sidecar 启动、健康检查和 MCP 服务均通过 `runtime/current` 解析生效的运行环境。

### 5.2 切换前置条件

执行 current 切换前，必须全部满足以下条件：

1. 目标 release 目录存在于 `runtime/releases/` 下。
2. 目标 release 目录包含有效的 `release-manifest.json`，且 `status != "failed"`。
3. 目标 release 的虚拟环境完整（`.venv/` 存在且 Python 可执行）。
4. 已记录当前 current 指向的旧 release_id（用于回退）。
5. 已完成 `data/` 备份（如果本次切换涉及版本升级）。

### 5.3 切换步骤

```bash
# 1. 记录旧指向
OLD_RELEASE=$(readlink "$HOME/.mempalace/cms-client/runtime/current")

# 2. 验证目标存在
TARGET="$HOME/.mempalace/cms-client/runtime/releases/<new-release-id>"
test -d "$TARGET" || { echo "target release not found"; exit 1; }
test -f "$TARGET/release-manifest.json" || { echo "manifest missing"; exit 1; }

# 3. 原子切换
ln -sfn "$TARGET" "$HOME/.mempalace/cms-client/runtime/current"

# 4. 验证切换结果
readlink "$HOME/.mempalace/cms-client/runtime/current"
```

关键约束：

- 使用 `ln -sfn` 实现原子替换，不先删除再创建。
- 切换后立即验证 current 实际指向。
- 切换操作本身不启动/停止 sidecar 进程；启停由独立步骤负责。

### 5.4 切换后验证

切换 current 后，必须执行以下最小验证：

1. `readlink runtime/current` 返回预期目标。
2. `runtime/current/.venv/bin/python --version` 返回预期 Python 版本。
3. `runtime/current/release-manifest.json` 中 `release_id` 与目标一致。
4. 若 sidecar 已启动，执行健康检查确认可正常响应。

### 5.5 切换场景分类

| 场景 | 前置动作 | 切换方向 | 是否需要备份 data/ |
|---|---|---|---|
| 首次安装 | 安装 release → current 初始指向 | 无旧值 → 新 release | 否（data/ 为空） |
| 版本升级 | 安装新 release + 验证 | 旧 release → 新 release | 是 |
| 回退 | 确认旧稳定 release 仍存在 | 当前失败 release → 旧稳定 release | 视 data/ 是否被写坏 |
| 同版本重装 | 删除损坏目录 + 重新安装 | current → 同名新目录 | 是 |

## 6. 回退规则

### 6.1 触发条件

满足任一条件即应回退 current：

1. 新 release 无法启动。
2. 健康检查失败且无法通过配置修正。
3. 新 release 无法读取既有 `data/`。
4. 索引或检索结果出现显著异常，可定位为本次切换引入。

### 6.2 回退步骤

1. 停止当前 sidecar 进程。
2. 记录失败 release_id 和失败原因。
3. 将失败 release 的 `release-manifest.json` 中 `status` 改为 `"failed"`。
4. `ln -sfn` 将 current 切回上一已知稳定 release。
5. 若 data/ 被写坏，从切换前备份恢复。
6. 以稳定 release 执行健康检查。
7. 记录回退结果到 runbook 操作日志。

### 6.3 回退后约束

- 未定位根因前不重复尝试同一版本升级。
- 失败 release 目录和日志保留，不删除。
- 只有健康检查通过后才可恢复增量更新或全量重建。

## 7. Release 生命周期

```text
 安装      验证通过     新版本替代       清理
  │          │            │              │
  ▼          ▼            ▼              ▼
[创建] → [active] → [superseded] → [可删除]
                 ╲
             验证失败
                  ╲
                   → [failed] → [保留排障]
```

### 7.1 状态转换规则

| 当前状态 | 目标状态 | 触发条件 |
|---|---|---|
| (新建) | `active` | 安装完成且验证通过 |
| (新建) | `failed` | 安装或验证失败 |
| `active` | `superseded` | 新版本验证通过并切换 current |
| `active` | `failed` | 运行中发现不可修复问题并回退 |
| `superseded` | `active` | 回退到此版本（重新激活） |
| `superseded` | (删除) | 至少经过一个稳定观察周期且不再需要回退 |
| `failed` | (保留) | 始终保留直到排障完成，不自动删除 |

### 7.2 保留策略

- 当前 active release：永远保留。
- 上一个 superseded release：至少保留一个完整观察周期。
- 更旧的 superseded release：可在确认不再需要后清理。
- failed release：保留到排障完成并记录结论后才可清理。

## 8. 与其他文档的关系

| 引用方 | 引用字段 | 本文提供的定义 |
|---|---|---|
| `runbook.md` §2、§3 | `release_id`、`runtime/current` | 命名格式、切换步骤 |
| `index-baseline-plan.md` §8 | `release_id` | 命名格式 |
| `go-no-go-review.md` §3.3 | 稳定 `release_id` | 命名格式 + 状态判定 |
| `environment-strategy.md` §5、§9 | release 目录和版本记录 | 目录路径 + manifest 字段 |
| `sidecar-layout.md` §3.2、§3.3 | release 目录结构、current 指向 | 完整目录规范 |

## 9. 不变量

1. `release_id` 格式恒定为 `mempalace-<M.m.p>-py<X.Y.Z>`。
2. 同一 `(mempalace_version, python_version)` 对应唯一 `release_id`。
3. `runtime/current` 只指向 `runtime/releases/` 下 `status != "failed"` 的 release 目录。
4. 切换 current 必须使用 `ln -sfn` 原子操作，不先删后建。
5. 每个 release 目录必须包含 `release-manifest.json`。
6. 首个冻结的 release_id 为 `mempalace-0.1.0-py3.11.11`。

## 10. 直接依据

- `plan/mempalace/environment-strategy.md`
- `plan/mempalace/deployment-topology.md`
- `plan/mempalace/sidecar-layout.md`
- `plan/mempalace/runbook.md`
- `plan/mempalace/go-no-go-review.md`
