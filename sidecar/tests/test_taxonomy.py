"""taxonomy 测试 — wing 校验、room 推断、冻结集合完整性。"""

from __future__ import annotations

from mempalace.taxonomy import (
    FROZEN_ROOMS,
    FROZEN_WINGS,
    _ROOM_ALLOWED_WINGS,
    _ROOM_PRIMARY_WING,
    _score_text,
    _ROOM_KEYWORDS,
    classify_room,
    validate_room,
    validate_wing,
)


class TestValidateWing:
    def test_valid_p0(self):
        assert validate_wing("gyoseishoshi-p0")

    def test_valid_p1(self):
        assert validate_wing("gyoseishoshi-p1")

    def test_valid_office(self):
        assert validate_wing("office-process")

    def test_none_wing_always_valid(self):
        assert validate_wing(None)

    def test_unknown_wing(self):
        assert not validate_wing("nonexistent-wing")


class TestValidateRoom:
    def test_valid_room(self):
        assert validate_room("state-machine")
        assert validate_room("biz-mgmt")

    def test_none_room_valid(self):
        assert validate_room(None)

    def test_unknown_room(self):
        assert not validate_room("fake-room")


class TestClassifyRoom:
    def test_state_machine_from_heading(self):
        room = classify_room(
            wing="gyoseishoshi-p0",
            source_path="docs/gyoseishoshi_saas_md/P0/03.md",
            section_heading="共享阶段模型与状态流转",
            text="Case.stage S1-S9 的合法流转说明。",
        )
        assert room == "state-machine"

    def test_field_ownership_from_body(self):
        room = classify_room(
            wing="gyoseishoshi-p0",
            source_path="docs/gyoseishoshi_saas_md/P0/07.md",
            text="Customer 实体的字段归属与 CaseParty 关系。extra_fields schema 定义。",
        )
        assert room == "field-ownership"

    def test_workflow_gates(self):
        room = classify_room(
            wing="gyoseishoshi-p0",
            source_path="docs/gyoseishoshi_saas_md/P0/03.md",
            text="Gate-A 硬阻断条件：必须通过校验才能推进。Gate-B 软提示。",
        )
        assert room == "workflow-gates"

    def test_biz_mgmt(self):
        room = classify_room(
            wing="gyoseishoshi-p1",
            source_path="docs/gyoseishoshi_saas_md/P1/01.md",
            text="经营管理签扩展步骤 Step 15 至 Step 20 的模块拆分",
        )
        assert room == "biz-mgmt"

    def test_scenario_materials_by_path(self):
        room = classify_room(
            wing="office-process",
            source_path="docs/事务所流程/visa.scenarios/biz-mgmt-cert-1y.md",
            text="签证申请材料",
        )
        assert room == "scenario-materials"

    def test_submission_audit(self):
        room = classify_room(
            wing="gyoseishoshi-p0",
            source_path="docs/gyoseishoshi_saas_md/P0/04.md",
            text="SubmissionPackage 锁定后的补正链路和审计事件留痕说明",
        )
        assert room == "submission-audit"

    def test_no_match_returns_none(self):
        room = classify_room(
            wing="gyoseishoshi-p0",
            source_path="docs/gyoseishoshi_saas_md/P0/99.md",
            text="普通文本内容，没有特征词",
        )
        assert room is None

    def test_none_wing_returns_none(self):
        room = classify_room(
            wing=None,
            source_path="docs/_output/notes.md",
            text="状态流转与 Gate-A 阻断",
        )
        assert room is None

    def test_wing_room_scope_respected(self):
        room = classify_room(
            wing="office-process",
            source_path="docs/事务所流程/flow.md",
            text="Gate-A 硬阻断条件",
        )
        assert room != "workflow-gates" or room is None

    def test_path_hint_shared_stage_model(self):
        room = classify_room(
            wing="gyoseishoshi-p0",
            source_path="docs/gyoseishoshi_saas_md/P0/03-共享阶段模型.md",
            text="概述",
        )
        assert room == "state-machine"


class TestScoreText:
    def test_empty_text(self):
        for room, kw_group in _ROOM_KEYWORDS.items():
            assert _score_text("", kw_group) == 0

    def test_strong_keyword(self):
        score = _score_text("Gate-A 条件", _ROOM_KEYWORDS["workflow-gates"])
        assert score >= 3

    def test_normal_keyword(self):
        score = _score_text("门禁", _ROOM_KEYWORDS["workflow-gates"])
        assert score >= 1


class TestFrozenSets:
    def test_five_wings(self):
        assert len(FROZEN_WINGS) == 5

    def test_six_rooms(self):
        assert len(FROZEN_ROOMS) == 6

    def test_no_wing_room_overlap(self):
        assert FROZEN_ROOMS.isdisjoint(FROZEN_WINGS)

    def test_all_rooms_have_primary_wing(self):
        for room in FROZEN_ROOMS:
            assert room in _ROOM_PRIMARY_WING

    def test_all_rooms_have_allowed_wings(self):
        for room in FROZEN_ROOMS:
            allowed = _ROOM_ALLOWED_WINGS.get(room, frozenset())
            assert len(allowed) >= 1
            assert _ROOM_PRIMARY_WING[room] in allowed

    def test_primary_wing_in_frozen(self):
        for room, wing in _ROOM_PRIMARY_WING.items():
            assert wing in FROZEN_WINGS
