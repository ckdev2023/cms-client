"""
文档标准化、切块和 metadata 生成。

流程：
1. 读取 Markdown / JSON / YAML / TXT 文本
2. 标准化：提取标题、去除 frontmatter、统一换行
3. 按 heading 或固定大小切块
4. 为每个 chunk 生成 metadata（source_id、路径、标题、层级、权重等）
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from mempalace.enumerator import EnumeratedFile
from mempalace.taxonomy import classify_room

MAX_CHUNK_CHARS = 1500
MIN_CHUNK_CHARS = 100
OVERLAP_CHARS = 150


@dataclass(frozen=True)
class ChunkMetadata:
    """每个 chunk 附带的 metadata，写入向量库时作为 document metadata。"""

    chunk_id: str
    source_id: str
    source_path: str
    authority_layer: str
    classification: str
    retrieval_weight: float
    wing: str | None
    room: str | None
    title: str
    section_heading: str
    chunk_index: int
    total_chunks: int

    def to_dict(self) -> dict:
        d = asdict(self)
        d["retrieval_weight"] = float(d["retrieval_weight"])
        if d["wing"] is None:
            d["wing"] = ""
        if d["room"] is None:
            d["room"] = ""
        return d


@dataclass
class Chunk:
    """一个文档切块。"""

    text: str
    metadata: ChunkMetadata


@dataclass
class NormalizeResult:
    """标准化后的文档。"""

    title: str
    body: str
    sections: list[tuple[str, str]] = field(default_factory=list)


_FRONTMATTER_RE = re.compile(r"\A---\s*\n.*?\n---\s*\n", re.DOTALL)
_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)


def _extract_title(text: str) -> str:
    """从第一个 heading 提取标题，找不到则用空字符串。"""
    m = _HEADING_RE.search(text)
    return m.group(2).strip() if m else ""


def _strip_frontmatter(text: str) -> str:
    return _FRONTMATTER_RE.sub("", text)


def normalize(text: str) -> NormalizeResult:
    """标准化 Markdown 文本：去 frontmatter、提取标题和段落。"""
    body = _strip_frontmatter(text).strip()
    body = body.replace("\r\n", "\n").replace("\r", "\n")
    title = _extract_title(body)

    sections: list[tuple[str, str]] = []
    positions = [(m.start(), m.group(2).strip()) for m in _HEADING_RE.finditer(body)]

    if not positions:
        sections.append(("", body))
    else:
        if positions[0][0] > 0:
            preamble = body[: positions[0][0]].strip()
            if preamble:
                sections.append(("", preamble))
        for i, (pos, heading) in enumerate(positions):
            end = positions[i + 1][0] if i + 1 < len(positions) else len(body)
            section_text = body[pos:end].strip()
            sections.append((heading, section_text))

    return NormalizeResult(title=title, body=body, sections=sections)


def _make_chunk_id(source_path: str, chunk_index: int) -> str:
    """生成稳定的 chunk ID：基于路径和索引的 hash。"""
    raw = f"{source_path}::{chunk_index}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _split_long_text(text: str) -> list[str]:
    """将超长文本按 MAX_CHUNK_CHARS 切分，保留 overlap。"""
    if len(text) <= MAX_CHUNK_CHARS:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + MAX_CHUNK_CHARS
        if end < len(text):
            split_at = text.rfind("\n", start, end)
            if split_at <= start:
                split_at = text.rfind(" ", start, end)
            if split_at > start:
                end = split_at
        chunks.append(text[start:end].strip())
        start = end - OVERLAP_CHARS if end < len(text) else end

    return [c for c in chunks if len(c) >= MIN_CHUNK_CHARS]


def chunk_file(ef: EnumeratedFile) -> list[Chunk]:
    """读取、标准化并切块一个文件，返回 Chunk 列表。"""
    try:
        raw = ef.path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return []

    suffix = ef.path.suffix.lower()
    if suffix in (".json", ".yaml", ".txt"):
        return _chunk_structured(raw, ef)

    return _chunk_markdown(raw, ef)


def _chunk_markdown(raw: str, ef: EnumeratedFile) -> list[Chunk]:
    """Markdown 文件按 heading 段落切块。"""
    nr = normalize(raw)
    all_pieces: list[tuple[str, str]] = []

    for heading, section_text in nr.sections:
        for piece in _split_long_text(section_text):
            all_pieces.append((heading, piece))

    total = len(all_pieces)
    return [
        Chunk(
            text=piece,
            metadata=ChunkMetadata(
                chunk_id=_make_chunk_id(ef.relative, i),
                source_id=ef.source_id,
                source_path=ef.relative,
                authority_layer=ef.authority_layer,
                classification=ef.classification,
                retrieval_weight=ef.retrieval_weight,
                wing=ef.wing,
                room=classify_room(
                    wing=ef.wing,
                    source_path=ef.relative,
                    title=nr.title,
                    section_heading=heading,
                    text=piece,
                ),
                title=nr.title,
                section_heading=heading,
                chunk_index=i,
                total_chunks=total,
            ),
        )
        for i, (heading, piece) in enumerate(all_pieces)
    ]


def _chunk_structured(raw: str, ef: EnumeratedFile) -> list[Chunk]:
    """JSON / YAML / TXT 整体作为一个或多个 chunk。"""
    pieces = _split_long_text(raw.strip())
    total = len(pieces)
    title = ef.path.stem

    return [
        Chunk(
            text=piece,
            metadata=ChunkMetadata(
                chunk_id=_make_chunk_id(ef.relative, i),
                source_id=ef.source_id,
                source_path=ef.relative,
                authority_layer=ef.authority_layer,
                classification=ef.classification,
                retrieval_weight=ef.retrieval_weight,
                wing=ef.wing,
                room=classify_room(
                    wing=ef.wing,
                    source_path=ef.relative,
                    title=title,
                    section_heading="",
                    text=piece,
                ),
                title=title,
                section_heading="",
                chunk_index=i,
                total_chunks=total,
            ),
        )
        for i, piece in enumerate(pieces)
    ]
