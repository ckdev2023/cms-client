"""
Wing / room 分类器 — 把 taxonomy-spec.md 冻结的规则编码为可执行逻辑。

分类链路：
1. validate_wing  — 校验 wing 值是否在冻结集合内
2. classify_room  — 根据 wing、路径、标题和文本片段推断主 room
3. FROZEN_*       — 不可变集合，新增必须先在 taxonomy-spec.md 冻结

分类策略：先按路径特征匹配（高置信度），再按关键词得分排序（覆盖更多情况），
歧义时保守返回 None，遵守 taxonomy-spec.md §8.2 第 4 条。
"""

from __future__ import annotations

import re
from typing import Pattern, Sequence, Union

FROZEN_WINGS: frozenset[str] = frozenset(
    {
        "gyoseishoshi-p0",
        "gyoseishoshi-p1",
        "office-process",
        "admin-prototype",
        "engineering-rules",
    }
)

FROZEN_ROOMS: frozenset[str] = frozenset(
    {
        "state-machine",
        "field-ownership",
        "workflow-gates",
        "biz-mgmt",
        "scenario-materials",
        "submission-audit",
    }
)

_ROOM_PRIMARY_WING: dict[str, str] = {
    "state-machine": "gyoseishoshi-p0",
    "field-ownership": "gyoseishoshi-p0",
    "workflow-gates": "gyoseishoshi-p0",
    "biz-mgmt": "gyoseishoshi-p1",
    "scenario-materials": "office-process",
    "submission-audit": "gyoseishoshi-p0",
}

_ROOM_ALLOWED_WINGS: dict[str, frozenset[str]] = {
    "state-machine": frozenset({"gyoseishoshi-p0", "gyoseishoshi-p1"}),
    "field-ownership": frozenset({"gyoseishoshi-p0", "gyoseishoshi-p1"}),
    "workflow-gates": frozenset({"gyoseishoshi-p0", "gyoseishoshi-p1"}),
    "biz-mgmt": frozenset({"gyoseishoshi-p1", "office-process"}),
    "scenario-materials": frozenset({"office-process", "gyoseishoshi-p1"}),
    "submission-audit": frozenset({"gyoseishoshi-p0", "gyoseishoshi-p1"}),
}


def validate_wing(wing: str | None) -> bool:
    """wing 为 None（disabled_reserved 条目）或属于冻结集合时返回 True。"""
    if wing is None:
        return True
    return wing in FROZEN_WINGS


def validate_room(room: str | None) -> bool:
    """room 为 None（未分类）或属于冻结集合时返回 True。"""
    if room is None:
        return True
    return room in FROZEN_ROOMS


_KW = dict[str, Sequence[Union[str, Pattern[str]]]]

_ROOM_KEYWORDS: dict[str, _KW] = {
    "state-machine": {
        "strong": [
            re.compile(r"Case\.stage", re.IGNORECASE),
            re.compile(r"S[1-9]\b"),
            re.compile(r"CaseWorkflowStep", re.IGNORECASE),
            "UNDER_REVIEW", "COE_SENT", "ENTRY_SUCCESS",
            "状态枚举",
        ],
        "normal": [
            "状态", "阶段", "流转", "推进", "回退", "步骤",
            "stage", "status", "transition",
        ],
    },
    "field-ownership": {
        "strong": [
            re.compile(r"extra_fields", re.IGNORECASE),
            re.compile(r"survey_data", re.IGNORECASE),
            "ResidencePeriod",
            "CaseParty",
        ],
        "normal": [
            "字段", "实体", "归属", "快照", "冗余", "模板专属",
            "Customer", "SubmissionPackage",
            "field", "entity", "ownership",
        ],
    },
    "workflow-gates": {
        "strong": [
            re.compile(r"Gate-[A-Z]"),
            "billing guard",
            "硬阻断",
        ],
        "normal": [
            "Gate", "门禁", "阻断", "软提示", "校验", "前置校验",
            "guard", "阻止", "重新校验",
        ],
    },
    "biz-mgmt": {
        "strong": [
            "经营管理签",
            re.compile(r"经管签"),
            re.compile(r"Step\s+\d{1,2}", re.IGNORECASE),
            re.compile(r"M[1-9]\b"),
            re.compile(r"P1-[AB]"),
        ],
        "normal": [
            "经营管理", "签证扩展", "biz-mgmt",
        ],
    },
    "scenario-materials": {
        "strong": [
            "在留資格",
            re.compile(r"scenarios?/"),
        ],
        "normal": [
            "资料清单", "签证类型", "材料", "场景资料",
            "提交材料", "差异",
        ],
    },
    "submission-audit": {
        "strong": [
            "SubmissionPackage",
            "补正链路",
            "审计事件",
        ],
        "normal": [
            "提交包", "补正", "审计", "锁定", "留痕",
            "敏感动作", "快照锁定",
        ],
    },
}

_STRONG_WEIGHT = 3
_NORMAL_WEIGHT = 1
_MIN_SCORE_THRESHOLD = 2


def _score_text(text: str, kw_group: _KW) -> int:
    score = 0
    for kw in kw_group.get("strong", []):
        if isinstance(kw, re.Pattern):
            if kw.search(text):
                score += _STRONG_WEIGHT
        elif kw in text:
            score += _STRONG_WEIGHT
    for kw in kw_group.get("normal", []):
        if isinstance(kw, re.Pattern):
            if kw.search(text):
                score += _NORMAL_WEIGHT
        elif kw in text:
            score += _NORMAL_WEIGHT
    return score


def _path_hint(source_path: str) -> str | None:
    """高置信度路径特征，直接返回 room；无法判断时返回 None。"""
    lower = source_path.lower()
    if ".scenarios/" in lower or "/scenarios/" in lower:
        return "scenario-materials"
    if "共享阶段模型" in source_path or "shared-stage-model" in lower:
        return "state-machine"
    return None


def classify_room(
    *,
    wing: str | None,
    source_path: str,
    title: str = "",
    section_heading: str = "",
    text: str = "",
) -> str | None:
    """
    为一个 chunk 推断主 room。

    优先级：路径特征 > 关键词得分。
    若无法达到最低置信度阈值则返回 None，遵守 taxonomy-spec.md §8.2 第 4 条
    （"保持在 wing 层，不要为了完整性硬拆新 room"）。
    """
    if wing is None or wing not in FROZEN_WINGS:
        return None

    hint = _path_hint(source_path)
    if hint and wing in _ROOM_ALLOWED_WINGS.get(hint, frozenset()):
        return hint

    combined = f"{title}\n{section_heading}\n{text}"
    scores: list[tuple[str, int]] = []
    for room, kw_group in _ROOM_KEYWORDS.items():
        if wing not in _ROOM_ALLOWED_WINGS.get(room, frozenset()):
            continue
        s = _score_text(combined, kw_group)
        if s >= _MIN_SCORE_THRESHOLD:
            scores.append((room, s))

    if not scores:
        return None

    scores.sort(key=lambda t: t[1], reverse=True)
    top = scores[0]
    if len(scores) > 1 and scores[1][1] == top[1]:
        return None
    return top[0]
