"""chunker 测试 — 标准化、切块、metadata 生成。"""

from __future__ import annotations

from pathlib import Path

from mempalace.chunker import (
    MAX_CHUNK_CHARS,
    Chunk,
    NormalizeResult,
    _extract_title,
    _split_long_text,
    _strip_frontmatter,
    chunk_file,
    normalize,
)
from mempalace.enumerator import EnumeratedFile


def _ef(tmp_path: Path, name: str, content: str) -> EnumeratedFile:
    p = tmp_path / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return EnumeratedFile(
        path=p,
        relative=name,
        source_id="test-src",
        authority_layer="L1",
        classification="C1-Direct-Allow",
        retrieval_weight=1.0,
        wing="test",
    )


def test_strip_frontmatter():
    text = "---\ntitle: Test\n---\n# Hello"
    assert _strip_frontmatter(text) == "# Hello"


def test_strip_frontmatter_no_fm():
    text = "# Hello"
    assert _strip_frontmatter(text) == "# Hello"


def test_extract_title():
    assert _extract_title("# My Title\n\nBody") == "My Title"
    assert _extract_title("## Sub\n\nBody") == "Sub"
    assert _extract_title("No heading here") == ""


def test_normalize_basic():
    text = "---\nfoo: bar\n---\n# Doc Title\n\nParagraph 1\n\n## Section A\n\nParagraph A"
    nr = normalize(text)
    assert nr.title == "Doc Title"
    assert len(nr.sections) == 2
    assert nr.sections[0][0] == "Doc Title"
    assert nr.sections[1][0] == "Section A"


def test_normalize_no_heading():
    text = "Just some text without headings."
    nr = normalize(text)
    assert nr.title == ""
    assert len(nr.sections) == 1
    assert nr.sections[0][0] == ""


def test_normalize_preamble():
    text = "Preamble text\n\n# Title\n\nBody"
    nr = normalize(text)
    assert len(nr.sections) == 2
    assert nr.sections[0][0] == ""
    assert "Preamble" in nr.sections[0][1]


def test_split_long_text_short():
    text = "Short text"
    assert _split_long_text(text) == ["Short text"]


def test_split_long_text_large():
    text = "A" * (MAX_CHUNK_CHARS + 500)
    pieces = _split_long_text(text)
    assert len(pieces) >= 2
    assert all(len(p) <= MAX_CHUNK_CHARS for p in pieces)


def test_chunk_file_markdown(tmp_path: Path):
    content = "# Title\n\nIntro paragraph.\n\n## Section 1\n\nContent of section 1.\n\n## Section 2\n\nContent of section 2."
    ef = _ef(tmp_path, "doc.md", content)
    chunks = chunk_file(ef)
    assert len(chunks) >= 2
    assert chunks[0].metadata.source_id == "test-src"
    assert chunks[0].metadata.title == "Title"
    assert chunks[0].metadata.chunk_index == 0
    assert all(c.metadata.total_chunks == len(chunks) for c in chunks)


def test_chunk_file_json(tmp_path: Path):
    content = '{"key": "value"}'
    ef = _ef(tmp_path, "data.json", content)
    chunks = chunk_file(ef)
    assert len(chunks) >= 1
    assert chunks[0].metadata.title == "data"


def test_chunk_file_missing(tmp_path: Path):
    ef = EnumeratedFile(
        path=tmp_path / "missing.md",
        relative="missing.md",
        source_id="x",
        authority_layer="L1",
        classification="C1-Direct-Allow",
        retrieval_weight=1.0,
        wing=None,
    )
    assert chunk_file(ef) == []


def test_chunk_metadata_to_dict(tmp_path: Path):
    ef = _ef(tmp_path, "doc.md", "# T\n\nBody text here for testing.")
    chunks = chunk_file(ef)
    assert len(chunks) >= 1
    d = chunks[0].metadata.to_dict()
    assert isinstance(d["retrieval_weight"], float)
    assert isinstance(d["chunk_id"], str)
    assert len(d["chunk_id"]) == 16
    assert "room" in d


def test_chunk_metadata_null_wing(tmp_path: Path):
    ef = EnumeratedFile(
        path=tmp_path / "doc.md",
        relative="doc.md",
        source_id="x",
        authority_layer="L1",
        classification="C1-Direct-Allow",
        retrieval_weight=0.5,
        wing=None,
    )
    (tmp_path / "doc.md").write_text("# T\n\nBody text here for testing.")
    chunks = chunk_file(ef)
    d = chunks[0].metadata.to_dict()
    assert d["wing"] == ""
    assert d["room"] == ""


def test_chunk_room_classification_flows_through(tmp_path: Path):
    """room 分类应通过 chunk_file 链路写入 metadata。"""
    p = tmp_path / "doc.md"
    content = "# 共享阶段模型\n\nCase.stage 定义了 S1 到 S9 的状态枚举。"
    p.write_text(content, encoding="utf-8")
    ef = EnumeratedFile(
        path=p,
        relative="docs/gyoseishoshi_saas_md/P0/03-共享阶段模型.md",
        source_id="p0-core-md",
        authority_layer="L1",
        classification="C1-Direct-Allow",
        retrieval_weight=1.0,
        wing="gyoseishoshi-p0",
    )
    chunks = chunk_file(ef)
    assert len(chunks) >= 1
    assert chunks[0].metadata.room == "state-machine"


def test_chunk_room_none_for_generic_content(tmp_path: Path):
    """无法分类时 room 应为 None。"""
    ef = _ef(tmp_path, "doc.md", "# Overview\n\n本文档是概览。")
    chunks = chunk_file(ef)
    assert len(chunks) >= 1
    assert chunks[0].metadata.room is None
