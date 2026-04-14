# MemPalace Python 环境清单与安装方式

## 1. 目标

把 `environment-strategy.md` 中定义的 Python 3.11.x 与 Chroma 固定版本策略落实为可执行的环境清单、依赖锁定文件和安装步骤，作为首个 release 环境搭建的唯一操作真源。

## 2. 冻结状态

| 字段 | 值 |
|---|---|
| `env_spec_version` | `v1.0.0` |
| `frozen_at` | `2026-04-12` |
| `target_release_id` | `mempalace-0.1.0-py3.11.15` |

## 3. 版本锁定清单

### 3.1 运行时版本

| 组件 | 锁定版本 | 锁定方式 | 选型理由 |
|---|---|---|---|
| Python | `3.11.15` | 精确 patch 锁定 | 3.11 线最新安全补丁（2026-03-03 发布），保守稳定，`chromadb` 要求 `>=3.9` |
| chromadb | `1.5.7` | 精确 patch 锁定 | 支持 `PersistentClient(path=...)` 本地持久化，一期不引入远程服务 |

### 3.2 为什么选择这些版本

- **Python 3.11.15**：3.11 线已进入 security-only 阶段（source-only releases），API 稳定不会引入破坏性变更。3.11.15 是截至 2026-04-12 的最新安全补丁，包含 email、HTTP、XML 等安全修复。
- **Chroma 1.5.7**：一期只使用本地持久化用法（`PersistentClient`），不引入远程托管或集群。1.5.7 是当前 PyPI 最新稳定版。
- 不追 Python 3.12/3.13：跨 minor 升级需单独验证任务，不纳入首期。

### 3.3 升级边界

| 升级类型 | 是否允许 | 条件 |
|---|---|---|
| Python `3.11.15` → `3.11.x`（更高 patch） | 允许 | 新建 release 验证后切换 |
| Python `3.11` → `3.12` | 首期禁止 | 需单独验证任务 |
| Chroma `1.5.7` → `1.5.x`（更高 patch） | 允许 | 先备份数据，新建 release 验证 |
| Chroma major 升级 | 首期禁止 | 需兼容性评审 |

## 4. requirements.txt

以下为首个 release 的锁定依赖清单。该文件将放置在 `runtime/releases/mempalace-0.1.0-py3.11.15/requirements.txt`。

```text
# MemPalace sidecar dependencies
# release_id: mempalace-0.1.0-py3.11.15
# frozen_at: 2026-04-12
#
# 安装方式: pip install --no-deps -r requirements.txt
# 然后: pip install -r requirements.txt
# (先 --no-deps 确认版本无冲突，再正常安装拉取传递依赖)

chromadb==1.5.7
```

### 4.1 依赖管理原则

1. 只列出 sidecar 直接依赖，传递依赖由 pip resolver 管理。
2. 所有直接依赖使用 `==` 精确锁定，不使用 `^`、`~=`、`>=`。
3. 若未来引入新的直接依赖（如 embedding 模型包），必须同时添加到此清单并更新 release_id。
4. 此文件属于 sidecar 自身，不属于 `cms-client` 主包管理。

### 4.2 锁定导出

首次安装成功后，必须导出完整锁定状态作为可复现证据：

```bash
pip freeze > requirements-lock.txt
```

`requirements-lock.txt` 保存在同一 release 目录下，记录所有直接和传递依赖的精确版本。

## 5. Python 解释器获取方式

### 5.1 推荐方式：pyenv

```bash
# 安装 pyenv（如尚未安装）
# macOS:
brew install pyenv

# 安装指定 Python 版本
pyenv install 3.11.15

# 获取解释器路径
PYTHON_BIN="$(pyenv prefix 3.11.15)/bin/python"
```

### 5.2 备选方式：python.org 官方安装包

从 https://www.python.org/downloads/release/python-31115/ 下载源码编译或安装包安装。

### 5.3 约束

1. 不复用系统 Python（`/usr/bin/python3`），避免系统升级导致环境漂移。
2. 不复用业务仓库 `node_modules` 内的任何 Python 工具链。
3. 解释器路径必须固定指向 sidecar 自身的虚拟环境，不依赖全局 `PATH`。

## 6. 首次安装完整步骤

### 6.1 前提条件

- pyenv 已安装，或已有可用的 Python 3.11.15 解释器
- `sidecar-layout.md` 定义的目录结构已初始化
- 仓库内 `plan/mempalace/` 文档可读

### 6.2 安装脚本

```bash
#!/usr/bin/env bash
set -euo pipefail

# === 配置 ===
RELEASE_ID="mempalace-0.1.0-py3.11.15"
PYTHON_VERSION="3.11.15"
SIDECAR_ROOT="$HOME/.mempalace/cms-client"
RELEASE_DIR="$SIDECAR_ROOT/runtime/releases/$RELEASE_ID"

# === 1. 确认 Python 版本 ===
PYTHON_BIN="$(pyenv prefix "$PYTHON_VERSION" 2>/dev/null)/bin/python" || {
  echo "ERROR: Python $PYTHON_VERSION not found via pyenv. Run: pyenv install $PYTHON_VERSION"
  exit 1
}

ACTUAL_VERSION=$("$PYTHON_BIN" --version 2>&1 | awk '{print $2}')
if [[ "$ACTUAL_VERSION" != "$PYTHON_VERSION" ]]; then
  echo "ERROR: Expected Python $PYTHON_VERSION but got $ACTUAL_VERSION"
  exit 1
fi
echo "Python $ACTUAL_VERSION confirmed."

# === 2. 初始化目录结构 ===
mkdir -p "$SIDECAR_ROOT/runtime/releases"
mkdir -p "$SIDECAR_ROOT/data/chroma"
mkdir -p "$SIDECAR_ROOT/data/baselines"
mkdir -p "$SIDECAR_ROOT/data/meta"
mkdir -p "$SIDECAR_ROOT/logs/service"
mkdir -p "$SIDECAR_ROOT/logs/index"
mkdir -p "$SIDECAR_ROOT/tmp/pid"
mkdir -p "$SIDECAR_ROOT/config"
mkdir -p "$HOME/.mempalace-backups/cms-client"

# === 3. 创建 release 目录 ===
if [[ -d "$RELEASE_DIR" ]]; then
  echo "ERROR: Release directory already exists: $RELEASE_DIR"
  exit 1
fi
mkdir -p "$RELEASE_DIR/src"

# === 4. 创建虚拟环境 ===
"$PYTHON_BIN" -m venv "$RELEASE_DIR/.venv"
source "$RELEASE_DIR/.venv/bin/activate"
pip install --upgrade pip

# === 5. 写入 requirements.txt ===
cat > "$RELEASE_DIR/requirements.txt" << 'REQS'
# MemPalace sidecar dependencies
# release_id: mempalace-0.1.0-py3.11.15
# frozen_at: 2026-04-12
chromadb==1.5.7
REQS

# === 6. 安装依赖 ===
pip install -r "$RELEASE_DIR/requirements.txt"

# === 7. 导出锁定状态 ===
pip freeze > "$RELEASE_DIR/requirements-lock.txt"

# === 8. 验证 chromadb 版本 ===
CHROMA_VERSION=$(python -c "import chromadb; print(chromadb.__version__)")
if [[ "$CHROMA_VERSION" != "1.5.7" ]]; then
  echo "ERROR: Expected chromadb 1.5.7 but got $CHROMA_VERSION"
  deactivate
  exit 1
fi
echo "chromadb $CHROMA_VERSION confirmed."

# === 9. 写入 release-manifest.json ===
cat > "$RELEASE_DIR/release-manifest.json" << MANIFEST
{
  "release_id": "$RELEASE_ID",
  "mempalace_version": "0.1.0",
  "python_version": "$PYTHON_VERSION",
  "chroma_version": "$CHROMA_VERSION",
  "manifest_version": "v0.1.0",
  "installed_at": "$(date -u +%Y-%m-%dT%H:%M:%S+00:00)",
  "installed_by": "$(whoami)",
  "status": "planned",
  "predecessor": null,
  "notes": "首个 release，Phase 1 L1 只读检索"
}
MANIFEST

# === 10. 设置 runtime/current 符号链接 ===
ln -sfn "releases/$RELEASE_ID" "$SIDECAR_ROOT/runtime/current"

# === 11. 更新 status 为 active ===
python -c "
import json, pathlib
p = pathlib.Path('$RELEASE_DIR/release-manifest.json')
m = json.loads(p.read_text())
m['status'] = 'active'
p.write_text(json.dumps(m, indent=2, ensure_ascii=False))
"

deactivate

echo ""
echo "=== Installation complete ==="
echo "  release_id:  $RELEASE_ID"
echo "  python:      $PYTHON_VERSION"
echo "  chromadb:    $CHROMA_VERSION"
echo "  venv:        $RELEASE_DIR/.venv/"
echo "  current:     $SIDECAR_ROOT/runtime/current -> releases/$RELEASE_ID"
```

### 6.3 安装后验证

```bash
# 确认符号链接
readlink "$HOME/.mempalace/cms-client/runtime/current"
# 预期输出: releases/mempalace-0.1.0-py3.11.15

# 确认 Python 版本
"$HOME/.mempalace/cms-client/runtime/current/.venv/bin/python" --version
# 预期输出: Python 3.11.15

# 确认 chromadb 可导入
"$HOME/.mempalace/cms-client/runtime/current/.venv/bin/python" -c "import chromadb; print(chromadb.__version__)"
# 预期输出: 1.5.7

# 确认 Chroma 本地持久化可用
"$HOME/.mempalace/cms-client/runtime/current/.venv/bin/python" -c "
import chromadb
client = chromadb.PersistentClient(path='$HOME/.mempalace/cms-client/data/chroma')
print('collections:', client.list_collections())
print('PersistentClient OK')
"
```

## 7. 环境隔离约束

| # | 规则 |
|---|---|
| 1 | sidecar 的 Python 虚拟环境位于 `runtime/releases/<release_id>/.venv/`，不使用全局 Python |
| 2 | `requirements.txt` 和 `requirements-lock.txt` 属于 sidecar，不属于 `cms-client` |
| 3 | 不在 `cms-client` 仓库根目录追加 `requirements.txt`、`pyproject.toml` 或 `setup.py` |
| 4 | 不依赖开发者全局 `pip install` 状态作为运行前提 |
| 5 | 不把 sidecar Python 依赖安装绑进 `npm install` 或 `npm run guard` |
| 6 | 每个 release 独立虚拟环境，不共享 `.venv/` |

## 8. 环境验证清单

首次安装后，逐项确认：

- [ ] Python 版本 = `3.11.15`
- [ ] chromadb 版本 = `1.5.7`
- [ ] 虚拟环境位于 `runtime/releases/<release_id>/.venv/`
- [ ] `requirements.txt` 存在且 chromadb 精确锁定
- [ ] `requirements-lock.txt` 已导出
- [ ] `release-manifest.json` 已写入且字段完整
- [ ] `runtime/current` 指向正确的 release 目录
- [ ] `PersistentClient` 可在 `data/chroma/` 初始化
- [ ] cms-client 仓库的 `npm run guard` 不受影响

## 9. 直接依据

- `plan/mempalace/environment-strategy.md`（§3 版本基线、§4 版本钉住规则、§6 安装策略）
- `plan/mempalace/release-strategy.md`（§4 首个 release 基线、§5 release-manifest.json）
- `plan/mempalace/sidecar-layout.md`（§3 完整目录树、§4.2 runtime/）
- `plan/mempalace/deployment-topology.md`（§6 与主系统的隔离关系）
- Python 3.11.15 发布公告：https://www.python.org/downloads/release/python-31115/
- chromadb 1.5.7 PyPI：https://pypi.org/project/chromadb/1.5.7/
