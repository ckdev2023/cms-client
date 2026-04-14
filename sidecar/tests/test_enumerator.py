"""enumerator 测试 — 使用 tmp_path 模拟仓库文件系统，不依赖真实文档。"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from mempalace.config import SidecarConfig
from mempalace.enumerator import (
    EnumeratedFile,
    EnumerationResult,
    SourceEntry,
    _GLOBAL_EXCLUDE_EXTS,
    enumerate_sources,
    load_manifest,
    parse_source_entries,
)


def _write(path: Path, content: str = "") -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path


MINIMAL_MANIFEST = {
    "manifest_version": "v0.1.0",
    "phase": "phase1_internal_knowledge_only",
    "default_policy": "deny_by_default",
    "enabled_scope": ["docs/P0/"],
    "reserved_scope": [],
    "source_entries": [
        {
            "source_id": "p0-core",
            "phase1_mode": "enabled",
            "authority_layer": "L1",
            "classification": "C1-Direct-Allow",
            "include_globs": ["docs/P0/*.md", "docs/P0/**/*.md"],
            "include_ext": [".md"],
            "exclude_globs": ["docs/P0/excluded/*.md"],
            "retrieval_weight": 1.0,
            "usage_rule": "P0 权威正文",
            "wing": "gyoseishoshi-p0",
        },
        {
            "source_id": "reserved-entry",
            "phase1_mode": "disabled_reserved",
            "authority_layer": "L2",
            "classification": "C2-Scoped-Allow",
            "include_globs": ["docs/_output/**/*.md"],
            "include_ext": [".md"],
            "exclude_globs": [],
            "retrieval_weight": 0.6,
            "usage_rule": "reserved",
            "wing": None,
        },
    ],
}


def _make_cfg(repo: Path) -> SidecarConfig:
    manifest = repo / "manifest.json"
    manifest.write_text(json.dumps(MINIMAL_MANIFEST), encoding="utf-8")
    return SidecarConfig(
        repo_root=repo,
        manifest_path=manifest,
        data_dir=repo / "data",
        logs_dir=repo / "logs",
        backups_dir=repo / "backups",
        runtime_dir=repo / "runtime",
        pid_file=repo / "runtime" / "mempalace.pid",
    )


@pytest.fixture()
def repo(tmp_path: Path) -> Path:
    _write(tmp_path / "docs" / "P0" / "01-overview.md", "# Overview")
    _write(tmp_path / "docs" / "P0" / "02-scope.md", "# Scope")
    _write(tmp_path / "docs" / "P0" / "sub" / "deep.md", "# Deep")
    _write(tmp_path / "docs" / "P0" / "excluded" / "skip.md", "# Excluded")
    _write(tmp_path / "docs" / "P0" / "image.png", "binary")
    _write(tmp_path / "docs" / "P0" / "data.xlsx", "binary")
    _write(tmp_path / "docs" / "_output" / "notes.md", "# Reserved")
    return tmp_path


# --- load_manifest ---


class TestLoadManifest:
    def test_loads_json(self, repo: Path):
        cfg = _make_cfg(repo)
        m = load_manifest(cfg.manifest_path)
        assert m["manifest_version"] == "v0.1.0"

    def test_raises_on_missing(self, tmp_path: Path):
        with pytest.raises(Exception):
            load_manifest(tmp_path / "nope.json")


# --- parse_source_entries ---


class TestParseSourceEntries:
    def test_returns_all_entries(self):
        entries = parse_source_entries(MINIMAL_MANIFEST)
        assert len(entries) == 2

    def test_entry_fields(self):
        entries = parse_source_entries(MINIMAL_MANIFEST)
        p0 = next(e for e in entries if e.source_id == "p0-core")
        assert p0.enabled is True
        assert p0.authority_layer == "L1"
        assert p0.retrieval_weight == 1.0


# --- enumerate_sources ---


class TestEnumerateSources:
    def test_basic_enumeration(self, repo: Path):
        cfg = _make_cfg(repo)
        result = enumerate_sources(cfg)
        paths = {f.path.name for f in result.files}
        assert "01-overview.md" in paths
        assert "02-scope.md" in paths
        assert "deep.md" in paths

    def test_excludes_by_entry_glob(self, repo: Path):
        cfg = _make_cfg(repo)
        result = enumerate_sources(cfg)
        paths = {f.path.name for f in result.files}
        assert "skip.md" not in paths
        assert result.skipped_by_exclude > 0

    def test_excludes_binary_extensions(self, repo: Path):
        cfg = _make_cfg(repo)
        result = enumerate_sources(cfg)
        paths = {f.path.name for f in result.files}
        assert "image.png" not in paths
        assert "data.xlsx" not in paths

    def test_excludes_disabled_reserved(self, repo: Path):
        cfg = _make_cfg(repo)
        result = enumerate_sources(cfg)
        ids = {f.source_id for f in result.files}
        assert "reserved-entry" not in ids
        assert result.skipped_disabled > 0

    def test_dedup_across_globs(self, repo: Path):
        """docs/P0/*.md 和 docs/P0/**/*.md 可能重叠，结果不应重复。"""
        cfg = _make_cfg(repo)
        result = enumerate_sources(cfg)
        paths = [f.path for f in result.files]
        assert len(paths) == len(set(paths))

    def test_file_metadata(self, repo: Path):
        cfg = _make_cfg(repo)
        result = enumerate_sources(cfg)
        assert len(result.files) > 0
        f = result.files[0]
        assert f.source_id == "p0-core"
        assert f.authority_layer == "L1"
        assert f.classification == "C1-Direct-Allow"
        assert f.retrieval_weight == 1.0
        assert f.wing == "gyoseishoshi-p0"

    def test_ext_filter(self, repo: Path, tmp_path: Path):
        """只有 include_ext 中列出的后缀才会被采集。"""
        _write(repo / "docs" / "P0" / "config.json", "{}")
        cfg = _make_cfg(repo)
        result = enumerate_sources(cfg)
        json_files = [f for f in result.files if f.path.suffix == ".json"]
        assert len(json_files) == 0

    def test_enumeration_result_counts(self, repo: Path):
        cfg = _make_cfg(repo)
        result = enumerate_sources(cfg)
        total_accounted = (
            len(result.files)
            + result.skipped_by_ext
            + result.skipped_by_exclude
            + result.skipped_by_global
        )
        assert total_accounted > len(result.files)


# --- GLOBAL_EXCLUDE_EXTS ---


class TestGlobalExcludeExts:
    def test_covers_all_documented_types(self):
        documented = {
            ".xlsx", ".xls", ".docx", ".pdf",
            ".png", ".jpg", ".jpeg", ".gif", ".webp",
            ".zip", ".7z", ".tar", ".gz",
            ".csv", ".sql", ".dump", ".bak", ".log", ".jsonl",
        }
        assert documented.issubset(_GLOBAL_EXCLUDE_EXTS)
