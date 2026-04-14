"""
运行路径与版本常量。

所有运行时产物（data / logs / backups）放在仓库外的
$HOME/.mempalace/cms-client/ 下，仓库内只存代码与文档。
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

_HOME = Path.home()

MEMPALACE_VERSION = "0.1.0"
CHROMA_COLLECTION = "mempalace_l1"

SIDECAR_ROOT = _HOME / ".mempalace" / "cms-client"
DATA_DIR = SIDECAR_ROOT / "data"
LOGS_DIR = SIDECAR_ROOT / "logs"
BACKUPS_DIR = _HOME / ".mempalace-backups" / "cms-client"
RUNTIME_DIR = SIDECAR_ROOT / "runtime"
PID_FILE = RUNTIME_DIR / "mempalace.pid"


def _detect_repo_root() -> Path:
    """从当前文件向上查找包含 plan/mempalace/ 的目录。"""
    candidate = Path(__file__).resolve().parent.parent.parent
    if (candidate / "plan" / "mempalace").is_dir():
        return candidate
    env = os.environ.get("MEMPALACE_REPO_ROOT")
    if env:
        return Path(env)
    return candidate


REPO_ROOT = _detect_repo_root()
MANIFEST_PATH = REPO_ROOT / "plan" / "mempalace" / "manifest.json"


@dataclass(frozen=True)
class SidecarConfig:
    """可注入的 sidecar 运行配置，便于测试时替换路径。"""

    repo_root: Path = field(default_factory=lambda: REPO_ROOT)
    manifest_path: Path = field(default_factory=lambda: MANIFEST_PATH)
    data_dir: Path = field(default_factory=lambda: DATA_DIR)
    logs_dir: Path = field(default_factory=lambda: LOGS_DIR)
    backups_dir: Path = field(default_factory=lambda: BACKUPS_DIR)
    runtime_dir: Path = field(default_factory=lambda: RUNTIME_DIR)
    pid_file: Path = field(default_factory=lambda: PID_FILE)
    collection_name: str = CHROMA_COLLECTION


@dataclass(frozen=True)
class SidecarPaths:
    """sidecar-layout.md §2 冻结的目录树（healthcheck-contract.md §8）。"""

    root: Path
    runtime: Path = field(init=False)
    current_release: Path = field(init=False)
    data: Path = field(init=False)
    chroma: Path = field(init=False)
    baselines: Path = field(init=False)
    logs: Path = field(init=False)
    service_logs: Path = field(init=False)
    index_logs: Path = field(init=False)

    def __post_init__(self) -> None:
        r = self.root
        object.__setattr__(self, "runtime", r / "runtime")
        object.__setattr__(self, "current_release", r / "runtime" / "current")
        object.__setattr__(self, "data", r / "data")
        object.__setattr__(self, "chroma", r / "data" / "chroma")
        object.__setattr__(self, "baselines", r / "data" / "baselines")
        object.__setattr__(self, "logs", r / "logs")
        object.__setattr__(self, "service_logs", r / "logs" / "service")
        object.__setattr__(self, "index_logs", r / "logs" / "index")


def resolve_paths(root_override: str | None = None) -> SidecarPaths:
    """从 MEMPALACE_ROOT 环境变量或显式参数得到路径集。"""
    raw = root_override or os.environ.get("MEMPALACE_ROOT", str(SIDECAR_ROOT))
    return SidecarPaths(root=Path(raw).expanduser().resolve())


def load_release_manifest(paths: SidecarPaths) -> dict[str, Any]:
    """读取当前 release 的 release-manifest.json。"""
    manifest_file = paths.current_release / "release-manifest.json"
    if not manifest_file.exists():
        raise FileNotFoundError(f"release-manifest.json 不存在: {manifest_file}")
    return json.loads(manifest_file.read_text(encoding="utf-8"))
