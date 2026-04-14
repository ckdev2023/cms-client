"""
Sidecar 启动、停止、健康检查契约（healthcheck-contract.md）。

两套 API 共存：
- 旧版 run_healthcheck(cfg) → HealthStatus   (保持向后兼容)
- 新版 run_health_checks(paths) → HealthResult (契约 §7，H1–H5)
"""

from __future__ import annotations

import json
import os
import signal
import time
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from mempalace.config import (
    MEMPALACE_VERSION,
    SidecarConfig,
    SidecarPaths,
    load_release_manifest,
)

_PASS = "pass"
_FAIL = "fail"
_SKIP = "skip"
_TEMP_COLLECTION_PREFIX = "hc-probe-"


# ---------------------------------------------------------------------------
# 旧版 API（向后兼容）
# ---------------------------------------------------------------------------

@dataclass
class HealthStatus:
    """一次健康检查的完整快照（旧版）。"""

    healthy: bool = False
    mempalace_version: str = MEMPALACE_VERSION
    chroma_reachable: bool = False
    data_dir_writable: bool = False
    manifest_readable: bool = False
    collection_doc_count: int = 0
    pid: Optional[int] = None
    uptime_seconds: float = 0.0
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def check_data_dir_writable(data_dir: Path) -> bool:
    """验证数据目录可创建且可写入。"""
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
        probe = data_dir / ".healthcheck_probe"
        probe.write_text("ok")
        probe.unlink()
        return True
    except OSError:
        return False


def check_manifest_readable(manifest_path: Path) -> bool:
    """验证 manifest.json 可读且为合法 JSON。"""
    try:
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
        return isinstance(data.get("source_entries"), list)
    except (OSError, json.JSONDecodeError, KeyError):
        return False


def check_chroma_reachable(data_dir: Path, collection_name: str) -> tuple[bool, int]:
    """验证 PersistentClient 可达且 collection 可访问。返回 (可达, 文档数)。"""
    try:
        import chromadb
        client = chromadb.PersistentClient(path=str(data_dir / "chroma"))
        col = client.get_or_create_collection(name=collection_name)
        return True, col.count()
    except Exception:
        return False, 0


def run_healthcheck(cfg: SidecarConfig | None = None) -> HealthStatus:
    """执行一次完整健康检查（旧版 API）。"""
    cfg = cfg or SidecarConfig()
    status = HealthStatus(pid=os.getpid())

    status.data_dir_writable = check_data_dir_writable(cfg.data_dir)
    if not status.data_dir_writable:
        status.errors.append(f"数据目录不可写: {cfg.data_dir}")

    status.manifest_readable = check_manifest_readable(cfg.manifest_path)
    if not status.manifest_readable:
        status.errors.append(f"manifest 不可读: {cfg.manifest_path}")

    reachable, count = check_chroma_reachable(cfg.data_dir, cfg.collection_name)
    status.chroma_reachable = reachable
    status.collection_doc_count = count
    if not reachable:
        status.errors.append("PersistentClient 不可达")

    status.healthy = (
        status.data_dir_writable
        and status.manifest_readable
        and status.chroma_reachable
    )
    return status


# ---------------------------------------------------------------------------
# PID 管理
# ---------------------------------------------------------------------------

def write_pid(pid_file: Path) -> None:
    """写入 PID 文件，用于停止时定位进程。"""
    pid_file.parent.mkdir(parents=True, exist_ok=True)
    pid_file.write_text(str(os.getpid()))


def read_pid(pid_file: Path) -> Optional[int]:
    """读取 PID 文件并验证进程是否存活。"""
    try:
        pid = int(pid_file.read_text().strip())
        os.kill(pid, 0)
        return pid
    except (OSError, ValueError):
        return None


def stop_sidecar(pid_file: Path) -> bool:
    """向 sidecar 进程发送 SIGTERM，返回是否成功。"""
    pid = read_pid(pid_file)
    if pid is None:
        return False
    try:
        os.kill(pid, signal.SIGTERM)
        for _ in range(30):
            time.sleep(0.1)
            try:
                os.kill(pid, 0)
            except OSError:
                pid_file.unlink(missing_ok=True)
                return True
        return False
    except OSError:
        return False


# ---------------------------------------------------------------------------
# 新版 API（healthcheck-contract.md §7，H1–H5）
# ---------------------------------------------------------------------------

@dataclass
class HealthResult:
    """契约定义的结构化健康检查结果。"""

    status: str
    release_id: str
    checks: dict[str, str]
    first_failure: str | None = None
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "command": "health",
            "status": self.status,
            "release_id": self.release_id,
            "checks": self.checks,
        }
        if self.first_failure:
            d["first_failure"] = self.first_failure
        if self.error:
            d["error"] = self.error
        d["checked_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        return d


def run_health_checks(paths: SidecarPaths) -> HealthResult:
    """按 H1→H5 顺序执行健康检查。"""
    import chromadb

    checks: dict[str, str] = {}
    first_failure: str | None = None
    error_msg: str | None = None
    release_id = "unknown"

    def _fail(name: str, msg: str) -> None:
        nonlocal first_failure, error_msg
        checks[name] = _FAIL
        if first_failure is None:
            first_failure = name
            error_msg = msg

    def _skip(name: str) -> None:
        checks[name] = _SKIP

    # H1 — 目录结构
    required_dirs = [
        paths.current_release,
        paths.chroma,
        paths.baselines,
        paths.logs,
    ]
    missing = [str(d) for d in required_dirs if not d.exists()]
    if missing:
        _fail("directory_structure", f"缺少目录: {', '.join(missing)}")
    else:
        checks["directory_structure"] = _PASS

    # H2 — release-manifest
    if checks.get("directory_structure") != _PASS:
        _skip("release_manifest")
    else:
        try:
            manifest = load_release_manifest(paths)
            release_id = manifest.get("release_id", "unknown")
            checks["release_manifest"] = _PASS
        except Exception as exc:
            _fail("release_manifest", f"release-manifest.json 读取失败: {exc}")

    # H3 — PersistentClient
    client: chromadb.ClientAPI | None = None
    if checks.get("release_manifest") != _PASS:
        _skip("persistent_client")
    else:
        try:
            client = chromadb.PersistentClient(path=str(paths.chroma))
            client.list_collections()
            checks["persistent_client"] = _PASS
        except Exception as exc:
            _fail("persistent_client", f"PersistentClient 初始化失败: {exc}")

    # H4 — 数据读写
    if checks.get("persistent_client") != _PASS or client is None:
        _skip("data_readwrite")
    else:
        tmp_name = f"{_TEMP_COLLECTION_PREFIX}{uuid.uuid4().hex[:8]}"
        try:
            client.create_collection(name=tmp_name)
            client.delete_collection(name=tmp_name)
            checks["data_readwrite"] = _PASS
        except Exception as exc:
            _fail("data_readwrite", f"数据读写测试失败: {exc}")
            try:
                client.delete_collection(name=tmp_name)
            except Exception:
                pass

    # H5 — 日志目录可写
    if checks.get("directory_structure") != _PASS:
        _skip("log_writable")
    else:
        probe = paths.service_logs / ".healthcheck_probe"
        try:
            paths.service_logs.mkdir(parents=True, exist_ok=True)
            probe.write_text("ok", encoding="utf-8")
            probe.unlink()
            checks["log_writable"] = _PASS
        except Exception as exc:
            _fail("log_writable", f"日志目录不可写: {exc}")

    status = "unhealthy" if first_failure else "healthy"
    return HealthResult(
        status=status,
        release_id=release_id,
        checks=checks,
        first_failure=first_failure,
        error=error_msg,
    )
