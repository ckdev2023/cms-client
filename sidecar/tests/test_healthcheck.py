"""healthcheck 契约测试 — 不依赖真实 chromadb，全部 mock。"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

from mempalace.config import SidecarConfig
from mempalace.healthcheck import (
    HealthStatus,
    check_data_dir_writable,
    check_manifest_readable,
    check_chroma_reachable,
    read_pid,
    run_healthcheck,
    write_pid,
)


def _make_cfg(tmp_path: Path) -> SidecarConfig:
    manifest = tmp_path / "manifest.json"
    manifest.write_text(json.dumps({"source_entries": []}))
    return SidecarConfig(
        repo_root=tmp_path,
        manifest_path=manifest,
        data_dir=tmp_path / "data",
        logs_dir=tmp_path / "logs",
        backups_dir=tmp_path / "backups",
        runtime_dir=tmp_path / "runtime",
        pid_file=tmp_path / "runtime" / "mempalace.pid",
    )


def test_health_status_defaults():
    s = HealthStatus()
    assert s.healthy is False
    assert s.errors == []


def test_health_status_to_dict():
    s = HealthStatus(healthy=True, collection_doc_count=5)
    d = s.to_dict()
    assert d["healthy"] is True
    assert d["collection_doc_count"] == 5


def test_data_dir_writable(tmp_path: Path):
    data_dir = tmp_path / "data"
    assert check_data_dir_writable(data_dir) is True
    assert data_dir.is_dir()
    assert not (data_dir / ".healthcheck_probe").exists()


def test_data_dir_writable_readonly(tmp_path: Path):
    read_only = tmp_path / "readonly"
    read_only.mkdir()
    read_only.chmod(0o444)
    try:
        result = check_data_dir_writable(read_only / "sub")
        assert result is False
    finally:
        read_only.chmod(0o755)


def test_manifest_readable_valid(tmp_path: Path):
    m = tmp_path / "manifest.json"
    m.write_text(json.dumps({"source_entries": []}))
    assert check_manifest_readable(m) is True


def test_manifest_readable_invalid(tmp_path: Path):
    m = tmp_path / "manifest.json"
    m.write_text("not json")
    assert check_manifest_readable(m) is False


def test_manifest_readable_missing(tmp_path: Path):
    assert check_manifest_readable(tmp_path / "nope.json") is False


def test_chroma_reachable_mock(tmp_path: Path):
    mock_chromadb = MagicMock()
    mock_col = MagicMock()
    mock_col.count.return_value = 3
    mock_client = MagicMock()
    mock_client.get_or_create_collection.return_value = mock_col
    mock_chromadb.PersistentClient.return_value = mock_client

    with patch.dict("sys.modules", {"chromadb": mock_chromadb}):
        ok, count = check_chroma_reachable(tmp_path / "data", "test_col")
        assert ok is True
        assert count == 3


def test_chroma_reachable_failure(tmp_path: Path):
    mock_chromadb = MagicMock()
    mock_chromadb.PersistentClient.side_effect = RuntimeError("no chroma")

    with patch.dict("sys.modules", {"chromadb": mock_chromadb}):
        ok, count = check_chroma_reachable(tmp_path / "data", "test_col")
        assert ok is False
        assert count == 0


def test_run_healthcheck_all_pass(tmp_path: Path):
    cfg = _make_cfg(tmp_path)
    cfg.data_dir.mkdir(parents=True)

    mock_chromadb = MagicMock()
    mock_col = MagicMock()
    mock_col.count.return_value = 0
    mock_client = MagicMock()
    mock_client.get_or_create_collection.return_value = mock_col
    mock_chromadb.PersistentClient.return_value = mock_client

    with patch.dict("sys.modules", {"chromadb": mock_chromadb}):
        status = run_healthcheck(cfg)
        assert status.healthy is True
        assert status.data_dir_writable is True
        assert status.manifest_readable is True
        assert status.chroma_reachable is True


def test_run_healthcheck_chroma_fails(tmp_path: Path):
    cfg = _make_cfg(tmp_path)
    cfg.data_dir.mkdir(parents=True)

    mock_chromadb = MagicMock()
    mock_chromadb.PersistentClient.side_effect = RuntimeError("boom")

    with patch.dict("sys.modules", {"chromadb": mock_chromadb}):
        status = run_healthcheck(cfg)
        assert status.healthy is False
        assert status.chroma_reachable is False
        assert len(status.errors) > 0


def test_pid_roundtrip(tmp_path: Path):
    pid_file = tmp_path / "test.pid"
    write_pid(pid_file)
    pid = read_pid(pid_file)
    assert pid is not None
    assert pid > 0


def test_read_pid_missing(tmp_path: Path):
    assert read_pid(tmp_path / "nope.pid") is None


def test_read_pid_stale(tmp_path: Path):
    pid_file = tmp_path / "stale.pid"
    pid_file.write_text("999999999")
    assert read_pid(pid_file) is None
