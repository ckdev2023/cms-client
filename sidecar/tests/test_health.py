"""契约健康检查与 PersistentClient 读写验证（healthcheck-contract.md）。"""

from __future__ import annotations

import json
import os
import shutil
from pathlib import Path

import chromadb
import pytest

from mempalace.config import SidecarPaths, resolve_paths, load_release_manifest
from mempalace.healthcheck import run_health_checks
from mempalace.app import cmd_health, cmd_start, cmd_stop, main


@pytest.fixture()
def sidecar_env(tmp_path: Path):
    """构建一个完整的临时 sidecar 目录并写入 release-manifest.json。"""
    root = tmp_path / "mempalace"
    release_id = "mempalace-0.1.0-py3.11.15"
    release_dir = root / "runtime" / "releases" / release_id

    for d in [
        release_dir,
        root / "data" / "chroma",
        root / "data" / "baselines",
        root / "logs" / "service",
        root / "logs" / "index",
    ]:
        d.mkdir(parents=True, exist_ok=True)

    manifest = {
        "release_id": release_id,
        "mempalace_version": "0.1.0",
        "python_version": "3.11.15",
        "chroma_version": chromadb.__version__,
        "installed_at": "2026-04-12T00:00:00+00:00",
        "installed_by": "test",
    }
    (release_dir / "release-manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )

    current_link = root / "runtime" / "current"
    current_link.symlink_to(release_dir)

    old = os.environ.get("MEMPALACE_ROOT")
    os.environ["MEMPALACE_ROOT"] = str(root)
    yield root
    if old is None:
        os.environ.pop("MEMPALACE_ROOT", None)
    else:
        os.environ["MEMPALACE_ROOT"] = old


class TestResolvePaths:
    def test_from_env(self, sidecar_env: Path) -> None:
        paths = resolve_paths()
        assert paths.root == sidecar_env
        assert paths.chroma == sidecar_env / "data" / "chroma"

    def test_override(self, tmp_path: Path) -> None:
        paths = resolve_paths(str(tmp_path / "custom"))
        assert paths.root == tmp_path / "custom"

    def test_load_release_manifest(self, sidecar_env: Path) -> None:
        paths = resolve_paths()
        m = load_release_manifest(paths)
        assert m["release_id"] == "mempalace-0.1.0-py3.11.15"


class TestHealthChecks:
    def test_healthy_env(self, sidecar_env: Path) -> None:
        paths = resolve_paths()
        result = run_health_checks(paths)
        assert result.status == "healthy"
        assert all(v == "pass" for v in result.checks.values())

    def test_missing_chroma_dir(self, sidecar_env: Path) -> None:
        shutil.rmtree(sidecar_env / "data" / "chroma")
        paths = resolve_paths()
        result = run_health_checks(paths)
        assert result.status == "unhealthy"
        assert result.checks["directory_structure"] == "fail"
        assert result.checks["persistent_client"] == "skip"

    def test_missing_manifest(self, sidecar_env: Path) -> None:
        manifest_path = list(
            (sidecar_env / "runtime" / "releases").glob("*/release-manifest.json")
        )[0]
        manifest_path.unlink()
        paths = resolve_paths()
        result = run_health_checks(paths)
        assert result.status == "unhealthy"
        assert result.checks["release_manifest"] == "fail"

    def test_to_dict_has_required_fields(self, sidecar_env: Path) -> None:
        paths = resolve_paths()
        result = run_health_checks(paths)
        d = result.to_dict()
        assert d["command"] == "health"
        assert "checked_at" in d
        assert d["status"] == "healthy"
        assert isinstance(d["checks"], dict)


class TestPersistentClientReadWrite:
    """验证 PersistentClient 在 data/chroma/ 的读写能力。"""

    def test_create_and_query_collection(self, sidecar_env: Path) -> None:
        chroma_path = sidecar_env / "data" / "chroma"
        client = chromadb.PersistentClient(path=str(chroma_path))

        col = client.get_or_create_collection("test_collection")
        col.add(
            ids=["doc1"],
            documents=["行政书士业务测试文档"],
            metadatas=[{"source": "test"}],
        )

        results = col.query(query_texts=["测试"], n_results=1)
        assert results["ids"][0][0] == "doc1"

        client.delete_collection("test_collection")
        names = [c.name for c in client.list_collections()]
        assert "test_collection" not in names

    def test_persistent_data_survives_reopen(self, sidecar_env: Path) -> None:
        chroma_path = sidecar_env / "data" / "chroma"
        client1 = chromadb.PersistentClient(path=str(chroma_path))
        col = client1.get_or_create_collection("persist_test")
        col.add(ids=["a"], documents=["持久化验证"])
        del client1

        client2 = chromadb.PersistentClient(path=str(chroma_path))
        col2 = client2.get_collection("persist_test")
        assert col2.count() == 1
        client2.delete_collection("persist_test")


class TestLifecycle:
    def test_start_ok(self, sidecar_env: Path) -> None:
        paths = resolve_paths()
        code = cmd_start(paths)
        assert code == 0

    def test_stop_ok(self, sidecar_env: Path) -> None:
        paths = resolve_paths()
        code = cmd_stop(paths)
        assert code == 0

    def test_start_unhealthy(self, sidecar_env: Path) -> None:
        shutil.rmtree(sidecar_env / "data" / "chroma")
        paths = resolve_paths()
        code = cmd_start(paths)
        assert code == 1


class TestCLI:
    def test_health_command(self, sidecar_env: Path) -> None:
        code = main(["health"])
        assert code == 0

    def test_start_command(self, sidecar_env: Path) -> None:
        code = main(["start"])
        assert code == 0

    def test_stop_command(self, sidecar_env: Path) -> None:
        code = main(["stop"])
        assert code == 0

    def test_unknown_command(self, sidecar_env: Path) -> None:
        code = main(["bogus"])
        assert code == 1

    def test_help(self) -> None:
        code = main(["--help"])
        assert code == 0


class TestLogOutput:
    def test_health_writes_log(self, sidecar_env: Path) -> None:
        paths = resolve_paths()
        cmd_health(paths)
        log_file = sidecar_env / "logs" / "service" / "mempalace.log"
        assert log_file.exists()
        lines = log_file.read_text().strip().split("\n")
        record = json.loads(lines[-1])
        assert record["event"] == "health_check"
        assert record["level"] == "INFO"

    def test_start_writes_log(self, sidecar_env: Path) -> None:
        paths = resolve_paths()
        cmd_start(paths)
        log_file = sidecar_env / "logs" / "service" / "mempalace.log"
        lines = log_file.read_text().strip().split("\n")
        events = [json.loads(l)["event"] for l in lines]
        assert "start" in events
