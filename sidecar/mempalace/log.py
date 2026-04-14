"""单行 JSON 日志，写入 logs/service/mempalace.log（healthcheck-contract.md §9）。"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from mempalace.config import SidecarPaths


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def append(
    paths: SidecarPaths,
    *,
    level: str,
    event: str,
    release_id: str,
    **extra: object,
) -> None:
    """追加一条日志到 mempalace.log。目录不存在时静默跳过。"""
    log_dir = paths.service_logs
    if not log_dir.is_dir():
        return
    record: dict[str, object] = {
        "ts": _now_iso(),
        "level": level,
        "event": event,
        "release_id": release_id,
        **extra,
    }
    log_file = log_dir / "mempalace.log"
    with log_file.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
