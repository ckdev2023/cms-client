"""search_knowledge 测试 — 验证只读检索、结果字段和边界情况。"""

from __future__ import annotations

import json
from pathlib import Path

import chromadb
import pytest

from mempalace.chunker import Chunk, ChunkMetadata
from mempalace.config import CHROMA_COLLECTION, SidecarConfig, SidecarPaths
from mempalace.indexer import _write_to_chroma
from mempalace.search import (
    DEFAULT_N_RESULTS,
    MAX_N_RESULTS,
    SNIPPET_MAX_CHARS,
    SearchHit,
    _truncate_snippet,
    search_knowledge,
)


def _make_paths(tmp_path: Path) -> SidecarPaths:
    paths = SidecarPaths(root=tmp_path)
    paths.chroma.mkdir(parents=True, exist_ok=True)
    paths.baselines.mkdir(parents=True, exist_ok=True)
    paths.logs.mkdir(parents=True, exist_ok=True)
    return paths


def _seed_collection(paths: SidecarPaths) -> chromadb.Collection:
    """向 Chroma 写入测试 chunks 用于检索测试。"""
    client = chromadb.PersistentClient(path=str(paths.chroma))
    col = client.get_or_create_collection(name=CHROMA_COLLECTION)

    chunks = [
        Chunk(
            text="案件阶段 Case.stage 从 S1 推进到 S9 的状态流转规则。",
            metadata=ChunkMetadata(
                chunk_id="chunk-sm-001",
                source_id="p0-core-md",
                source_path="docs/P0/01-overview.md",
                authority_layer="L1",
                classification="C1-Direct-Allow",
                retrieval_weight=1.0,
                wing="gyoseishoshi-p0",
                room="state-machine",
                title="概述",
                section_heading="案件阶段",
                chunk_index=0,
                total_chunks=2,
            ),
        ),
        Chunk(
            text="Customer 实体与 Case 的 extra_fields 字段归属定义。",
            metadata=ChunkMetadata(
                chunk_id="chunk-fo-001",
                source_id="p0-core-md",
                source_path="docs/P0/02-fields.md",
                authority_layer="L1",
                classification="C1-Direct-Allow",
                retrieval_weight=1.0,
                wing="gyoseishoshi-p0",
                room="field-ownership",
                title="字段归属",
                section_heading="实体字段",
                chunk_index=0,
                total_chunks=1,
            ),
        ),
        Chunk(
            text="经营管理签证 Step 1 到 Step 12 的完整签约前流程。",
            metadata=ChunkMetadata(
                chunk_id="chunk-bm-001",
                source_id="p1-core-md",
                source_path="docs/P1/01-biz-mgmt.md",
                authority_layer="L1",
                classification="C1-Direct-Allow",
                retrieval_weight=0.98,
                wing="gyoseishoshi-p1",
                room="biz-mgmt",
                title="经营管理签",
                section_heading="签约前承接",
                chunk_index=0,
                total_chunks=1,
            ),
        ),
    ]
    _write_to_chroma(col, chunks)
    return col


class TestSearchHit:
    def test_to_dict_has_required_fields(self):
        hit = SearchHit(
            source_path="docs/P0/01.md",
            source_layer="L1",
            snippet="test",
            score=0.85,
            wing="gyoseishoshi-p0",
            room="state-machine",
            title="概述",
            section_heading="阶段",
            source_id="p0-core-md",
            chunk_id="abc",
        )
        d = hit.to_dict()
        assert d["source_path"] == "docs/P0/01.md"
        assert d["source_layer"] == "L1"
        assert d["snippet"] == "test"
        assert d["score"] == 0.85


class TestTruncateSnippet:
    def test_short_text_unchanged(self):
        assert _truncate_snippet("hello") == "hello"

    def test_long_text_truncated(self):
        text = "x" * (SNIPPET_MAX_CHARS + 100)
        result = _truncate_snippet(text)
        assert len(result) == SNIPPET_MAX_CHARS + 1
        assert result.endswith("…")


class TestSearchKnowledge:
    def test_returns_hits_with_required_fields(self, tmp_path: Path):
        paths = _make_paths(tmp_path)
        _seed_collection(paths)

        hits = search_knowledge(paths, query="案件阶段")
        assert len(hits) > 0

        first = hits[0]
        assert "source_path" in first
        assert "source_layer" in first
        assert "snippet" in first
        assert first["source_path"] != ""
        assert first["source_layer"] in ("L1", "L2", "L3")
        assert len(first["snippet"]) > 0

    def test_returns_wing_and_room(self, tmp_path: Path):
        paths = _make_paths(tmp_path)
        _seed_collection(paths)

        hits = search_knowledge(paths, query="状态流转")
        assert len(hits) > 0
        first = hits[0]
        assert "wing" in first
        assert "room" in first

    def test_search_biz_mgmt(self, tmp_path: Path):
        paths = _make_paths(tmp_path)
        _seed_collection(paths)

        hits = search_knowledge(paths, query="经营管理签证")
        assert len(hits) > 0
        bm_hits = [h for h in hits if h["room"] == "biz-mgmt"]
        assert len(bm_hits) > 0
        assert bm_hits[0]["source_layer"] == "L1"

    def test_empty_collection_returns_empty(self, tmp_path: Path):
        paths = _make_paths(tmp_path)
        hits = search_knowledge(paths, query="anything")
        assert hits == []

    def test_n_results_clamped(self, tmp_path: Path):
        paths = _make_paths(tmp_path)
        _seed_collection(paths)

        hits = search_knowledge(paths, query="案件", n_results=1)
        assert len(hits) == 1

        hits = search_knowledge(paths, query="案件", n_results=100)
        assert len(hits) <= MAX_N_RESULTS

    def test_where_filter(self, tmp_path: Path):
        paths = _make_paths(tmp_path)
        _seed_collection(paths)

        hits = search_knowledge(
            paths,
            query="字段",
            where={"room": "field-ownership"},
        )
        assert len(hits) > 0
        for h in hits:
            assert h["room"] == "field-ownership"

    def test_score_is_numeric(self, tmp_path: Path):
        paths = _make_paths(tmp_path)
        _seed_collection(paths)

        hits = search_knowledge(paths, query="案件阶段")
        for h in hits:
            assert isinstance(h["score"], (int, float))
