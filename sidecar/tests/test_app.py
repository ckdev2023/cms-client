"""app 骨架测试 — 验证目录创建、release 记录和 PersistentClient 连通性（mock）。"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

from mempalace.config import SidecarConfig


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


def test_ensure_directories(tmp_path: Path):
    from mempalace.app import ensure_directories

    cfg = _make_cfg(tmp_path)
    ensure_directories(cfg)
    assert cfg.data_dir.is_dir()
    assert cfg.logs_dir.is_dir()
    assert cfg.runtime_dir.is_dir()
    assert cfg.backups_dir.is_dir()
    assert (cfg.data_dir / "chroma").is_dir()


def test_write_release_record(tmp_path: Path):
    from mempalace.app import _write_release_record

    cfg = _make_cfg(tmp_path)
    cfg.runtime_dir.mkdir(parents=True, exist_ok=True)
    _write_release_record(cfg)
    record_path = cfg.runtime_dir / "release-record.json"
    assert record_path.exists()
    record = json.loads(record_path.read_text())
    assert record["mempalace_version"] == "0.1.0"
    assert "python_version" in record
    assert "release_id" in record


def test_cmd_healthcheck_legacy(tmp_path: Path, capsys):
    """旧版 cmd_healthcheck_legacy 输出 JSON。"""
    from mempalace.app import cmd_healthcheck_legacy

    cfg = _make_cfg(tmp_path)
    cfg.data_dir.mkdir(parents=True)

    mock_chromadb = MagicMock()
    mock_col = MagicMock()
    mock_col.count.return_value = 0
    mock_client = MagicMock()
    mock_client.get_or_create_collection.return_value = mock_col
    mock_chromadb.PersistentClient.return_value = mock_client

    with patch.dict("sys.modules", {"chromadb": mock_chromadb}):
        code = cmd_healthcheck_legacy(cfg)
    output = capsys.readouterr().out
    parsed = json.loads(output)
    assert "healthy" in parsed
    assert code in (0, 1)


def test_create_client_uses_data_chroma(tmp_path: Path):
    from mempalace.app import create_client

    cfg = _make_cfg(tmp_path)

    mock_client = MagicMock()
    with patch("mempalace.app.chromadb") as mock_chromadb:
        mock_chromadb.PersistentClient.return_value = mock_client
        client = create_client(cfg)
        mock_chromadb.PersistentClient.assert_called_once_with(
            path=str(cfg.data_dir / "chroma")
        )
        assert client is mock_client


def test_cmd_route_outputs_route_json(capsys):
    from mempalace.app import cmd_route
    from mempalace.config import resolve_paths

    with patch("sys.argv", ["mempalace", "route", "经营管理签", "P1"]):
        code = cmd_route(resolve_paths())

    output = json.loads(capsys.readouterr().out)
    assert code == 0
    assert output["intent"] == "biz-mgmt"


def test_cmd_ground_returns_blocked_when_no_hits(capsys, tmp_path: Path):
    from mempalace.app import cmd_ground
    from mempalace.config import resolve_paths

    cfg = _make_cfg(tmp_path)
    cfg.data_dir.mkdir(parents=True, exist_ok=True)
    (cfg.data_dir / "chroma").mkdir(parents=True, exist_ok=True)

    mock_collection = MagicMock()
    mock_collection.count.return_value = 0
    mock_client = MagicMock()
    mock_client.get_or_create_collection.return_value = mock_collection

    with patch("mempalace.app.chromadb.PersistentClient", return_value=mock_client):
        with patch("sys.argv", ["mempalace", "ground", "P0", "状态"]):
            code = cmd_ground(resolve_paths(str(tmp_path)))

    output = json.loads(capsys.readouterr().out)
    assert code == 1
    assert output["status"] == "blocked"
