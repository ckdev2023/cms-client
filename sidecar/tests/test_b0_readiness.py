"""B0 预检测试 — 验证 manifest/taxonomy/环境/目录检查和报告落盘。"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from mempalace.b0_readiness import (
    B0Report,
    CheckItem,
    _build_release_id,
    _check_directories,
    _check_environment,
    _check_manifest,
    _check_taxonomy,
    _check_wing_source_alignment,
    _generate_run_id,
    run_b0_readiness,
    save_b0_report,
)
from mempalace.config import MEMPALACE_VERSION, SidecarPaths


def _write(path: Path, content: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path


GOOD_MANIFEST = {
    "manifest_version": "v0.1.0",
    "phase": "phase1_internal_knowledge_only",
    "default_policy": "deny_by_default",
    "source_entries": [
        {
            "source_id": "p0-core-md",
            "phase1_mode": "enabled",
            "authority_layer": "L1",
            "classification": "C1-Direct-Allow",
            "include_globs": ["docs/P0/*.md"],
            "include_ext": [".md"],
            "exclude_globs": [],
            "retrieval_weight": 1.0,
            "usage_rule": "test",
            "wing": "gyoseishoshi-p0",
        },
    ],
}


def _paths(tmp_path: Path) -> SidecarPaths:
    return SidecarPaths(root=tmp_path)


def _manifest(tmp_path: Path, data: dict | None = None) -> Path:
    p = tmp_path / "manifest.json"
    _write(p, json.dumps(data or GOOD_MANIFEST))
    return p


class TestCheckManifest:
    def test_good_manifest(self, tmp_path: Path):
        mp = _manifest(tmp_path)
        item = _check_manifest(mp)
        assert item.passed
        assert "v0.1.0" in item.detail

    def test_missing_file(self, tmp_path: Path):
        item = _check_manifest(tmp_path / "nope.json")
        assert not item.passed

    def test_draft_version_fails(self, tmp_path: Path):
        data = {**GOOD_MANIFEST, "manifest_version": "v0-draft"}
        mp = _manifest(tmp_path, data)
        item = _check_manifest(mp)
        assert not item.passed
        assert "草案" in item.detail

    def test_empty_entries_fails(self, tmp_path: Path):
        data = {**GOOD_MANIFEST, "source_entries": []}
        mp = _manifest(tmp_path, data)
        item = _check_manifest(mp)
        assert not item.passed


class TestCheckTaxonomy:
    def test_taxonomy_passes(self):
        item = _check_taxonomy()
        assert item.passed

    def test_taxonomy_reports_counts(self):
        item = _check_taxonomy()
        assert "wings=" in item.detail
        assert "rooms=" in item.detail


class TestCheckWingAlignment:
    def test_aligned(self, tmp_path: Path):
        mp = _manifest(tmp_path)
        item = _check_wing_source_alignment(mp)
        assert item.passed

    def test_unknown_wing_fails(self, tmp_path: Path):
        data = json.loads(json.dumps(GOOD_MANIFEST))
        data["source_entries"][0]["wing"] = "fake-wing"
        mp = _manifest(tmp_path, data)
        item = _check_wing_source_alignment(mp)
        assert not item.passed


class TestCheckDirectories:
    def test_creates_dirs(self, tmp_path: Path):
        paths = _paths(tmp_path)
        item = _check_directories(paths)
        assert item.passed
        assert paths.data.is_dir()
        assert paths.baselines.is_dir()


class TestCheckEnvironment:
    def test_with_chromadb(self):
        item = _check_environment()
        assert item.passed
        assert "mempalace=" in item.detail

    def test_without_chromadb(self):
        with patch.dict("sys.modules", {"chromadb": None}):
            item = _check_environment()
            assert not item.passed


class TestRunId:
    def test_format(self):
        rid = _generate_run_id()
        assert rid.startswith("run-")
        parts = rid.split("-")
        assert len(parts) == 3

    def test_unique(self):
        ids = {_generate_run_id() for _ in range(50)}
        assert len(ids) == 50


class TestReleaseId:
    def test_format(self):
        rid = _build_release_id()
        assert rid.startswith("mempalace-")
        assert MEMPALACE_VERSION in rid
        assert "-py" in rid


class TestRunB0Readiness:
    def test_full_pass(self, tmp_path: Path):
        mp = _manifest(tmp_path)
        paths = _paths(tmp_path)
        report = run_b0_readiness(mp, paths)
        assert report.status == "passed"
        assert report.all_passed
        assert report.run_id.startswith("run-")
        assert report.data_snapshot_id.startswith("snap-")
        assert report.manifest_version == "v0.1.0"

    def test_bad_manifest_fails(self, tmp_path: Path):
        mp = tmp_path / "nope.json"
        paths = _paths(tmp_path)
        report = run_b0_readiness(mp, paths)
        assert report.status == "failed"
        assert not report.all_passed
        assert len(report.errors) > 0

    def test_report_ids_recorded(self, tmp_path: Path):
        mp = _manifest(tmp_path)
        paths = _paths(tmp_path)
        report = run_b0_readiness(mp, paths)
        assert report.release_id.startswith("mempalace-")
        assert report.run_id.startswith("run-")
        assert report.data_snapshot_id.startswith("snap-")
        assert report.manifest_version == "v0.1.0"
        assert report.baseline_plan_version == "w11-v1"


class TestSaveReport:
    def test_saves_json(self, tmp_path: Path):
        report = B0Report(
            run_id="run-20260412-abc12345",
            release_id="mempalace-0.1.0-py3.11.15",
            manifest_version="v0.1.0",
            data_snapshot_id="snap-20260412-def67890",
            started_at="2026-04-12T00:00:00+00:00",
            finished_at="2026-04-12T00:00:01+00:00",
            status="passed",
        )
        out = save_b0_report(report, tmp_path / "baselines")
        assert out.exists()
        data = json.loads(out.read_text())
        assert data["run_id"] == "run-20260412-abc12345"
        assert data["release_id"] == "mempalace-0.1.0-py3.11.15"
        assert data["manifest_version"] == "v0.1.0"
        assert data["data_snapshot_id"] == "snap-20260412-def67890"

    def test_report_to_dict(self):
        report = B0Report(
            run_id="run-test",
            release_id="r-test",
            manifest_version="v0.1.0",
            data_snapshot_id="snap-test",
            checks=[CheckItem("x", True, "ok")],
        )
        d = report.to_dict()
        assert d["checks"][0]["name"] == "x"
        assert d["checks"][0]["passed"] is True
